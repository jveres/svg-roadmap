import { paintedNodeFrameRectangle } from "./core/frames.ts";
import {
	inflateRectangle,
	rectanglesOverlap,
	rectBottom,
	rectCenter,
	rectRight,
	unionRectangles,
} from "./core/geometry.ts";
import { inlineToPlainText, measureTrackedText, wrapInline } from "./core/inline.ts";
import { lightTheme } from "./theme.ts";
import type {
	CardTheme,
	InlineNode,
	LayoutConnector,
	LayoutElement,
	LayoutGroup,
	LayoutLegend,
	LayoutLegendMetrics,
	LayoutNode,
	LayoutText,
	Point,
	Rect,
	RoadmapChapter,
	RoadmapDocument,
	RoadmapLayout,
	RoadmapLayoutOptions,
	RoadmapLayoutSettings,
	RoadmapSpacing,
	RoadmapTheme,
	RoadmapTopic,
	RoadmapTopicGroup,
	SourceRange,
	TagStyle,
	TextLine,
	TypographyTheme,
} from "./types.ts";

interface RequiredLayoutOptions {
	readonly width: number;
	readonly minHeight: number;
	readonly padding: number;
	readonly endPaddingX: number;
	readonly endPaddingY: number;
	readonly stepGap: number;
	readonly noteStepGap: number;
	readonly gridStepGap: number;
	readonly treeStepGap: number;
	readonly chapterContentGap: number;
	readonly chapterDescriptionGap: number;
	readonly treeDescriptionGap: number;
	readonly commentGap: number;
	readonly groupGap: number;
	readonly groupOutsetLeft: number;
	readonly groupOutsetRight: number;
	readonly itemGap: number;
	readonly gridItemGap: number;
	readonly branchGap: number;
	readonly branchGapLeftOuter: number;
	readonly branchGapLeftInner: number;
	readonly branchGapRightOuter: number;
	readonly branchGapRightInner: number;
	readonly overlapPadding: number;
	readonly spineClearance: number;
	readonly maxGridColumns: number;
	/**
	 * Columns of topic boxes inside tree clusters: `1` (the classic column)
	 * or `2`. Two is the ceiling by design — every cluster must keep a clean
	 * left or right edge for its subtopic clusters to attach to. Nested
	 * (subtopic) clusters always stay single-column, and box width stays
	 * governed by the widest topic either way.
	 */
	readonly clusterColumns: 1 | 2;
	/** Grows the cropped canvas; the chart centers in the extra room. */
	readonly canvasScale: number;
	readonly showLegend: boolean;
}

const defaults: RequiredLayoutOptions = {
	width: 1184,
	minHeight: 240,
	padding: 24,
	endPaddingX: 18,
	endPaddingY: 13,
	stepGap: 43,
	noteStepGap: 46,
	gridStepGap: 50,
	treeStepGap: 27,
	chapterContentGap: 71,
	// Roomy enough for the interactive layer's station roundel (16px) to
	// sit centered between a chapter capsule and its description.
	chapterDescriptionGap: 26,
	treeDescriptionGap: 48,
	commentGap: 24,
	groupGap: 176,
	groupOutsetLeft: 9,
	groupOutsetRight: 23,
	itemGap: 10,
	gridItemGap: 8,
	branchGap: 40,
	branchGapLeftOuter: 47,
	branchGapLeftInner: 54,
	branchGapRightOuter: 58,
	branchGapRightInner: 25,
	overlapPadding: 10,
	spineClearance: 12,
	maxGridColumns: Number.MAX_SAFE_INTEGER,
	clusterColumns: 1,
	canvasScale: 1,
	showLegend: true,
};

/** The gaps a document's `spacing` setting scales — vertical rhythm and
 * clustering air. Solver clearances (overlap padding, spine clearance,
 * branch gaps) stay fixed so density can never produce a broken chart. */
const spacingScaledGaps = [
	"stepGap",
	"noteStepGap",
	"gridStepGap",
	"treeStepGap",
	"chapterContentGap",
	"chapterDescriptionGap",
	"treeDescriptionGap",
	"commentGap",
	"itemGap",
	"gridItemGap",
] as const satisfies readonly (keyof RequiredLayoutOptions)[];

const spacingFactors: Readonly<Record<RoadmapSpacing, number>> = {
	compact: 0.8,
	cozy: 1,
	roomy: 1.25,
};

/**
 * Translates a document's curated layout settings into layout options.
 * Explicit API options merge after these, so the host always wins.
 */
export function documentLayoutOptions(settings: RoadmapLayoutSettings): RoadmapLayoutOptions {
	const scaled: { -readonly [K in keyof RoadmapLayoutOptions]?: RoadmapLayoutOptions[K] } = {};
	const factor = spacingFactors[settings.spacing ?? "cozy"];
	if (factor !== 1) {
		for (const gap of spacingScaledGaps) {
			scaled[gap] = Math.round(defaults[gap] * factor);
		}
	}
	return {
		...scaled,
		...(settings.canvas !== undefined ? { canvasScale: settings.canvas } : {}),
		...(settings.clusterColumns !== undefined ? { clusterColumns: settings.clusterColumns } : {}),
		...(settings.columns !== undefined ? { maxGridColumns: settings.columns } : {}),
	};
}

function layoutOptions(options?: RoadmapLayoutOptions): RequiredLayoutOptions {
	const resolved: RequiredLayoutOptions = { ...defaults, ...options };
	if (options?.branchGap !== undefined) {
		Object.assign(resolved, {
			branchGapLeftOuter: options.branchGapLeftOuter ?? options.branchGap,
			branchGapLeftInner: options.branchGapLeftInner ?? options.branchGap,
			branchGapRightOuter: options.branchGapRightOuter ?? options.branchGap,
			branchGapRightInner: options.branchGapRightInner ?? options.branchGap,
		});
	}
	// Non-finite numbers (NaN, Infinity) would hang placement and artifact
	// loops; a broken knob falls back to its default instead of spinning.
	const sanitized = resolved as Record<keyof RequiredLayoutOptions, number | boolean>;
	for (const key of Object.keys(defaults) as (keyof RequiredLayoutOptions)[]) {
		const value = sanitized[key];
		const fallback = defaults[key];
		if (typeof fallback !== "number") continue;
		if (typeof value !== "number" || !Number.isFinite(value)) sanitized[key] = fallback;
	}
	if (resolved.clusterColumns !== 1 && resolved.clusterColumns !== 2) {
		Object.assign(resolved, { clusterColumns: 1 });
	}
	// canvasScale multiplies the finished canvas; cap it so an absurd host
	// value cannot allocate a practically unbounded artifact field.
	Object.assign(resolved, {
		canvasScale: Math.min(10, Math.max(1, resolved.canvasScale)),
		maxGridColumns: Math.max(1, resolved.maxGridColumns),
	});
	return resolved;
}

/** The side opposite `side`; keeps alternation off unchecked arithmetic. */
function oppositeSide(side: -1 | 1): -1 | 1 {
	return side < 0 ? 1 : -1;
}

function layoutText(
	lines: readonly TextLine[],
	typography: TypographyTheme,
	abbreviationIndicatorSize: number,
): LayoutText {
	return {
		lines,
		fontSize: typography.fontSize,
		lineHeight: typography.fontSize * typography.lineHeight,
		fontFamily: typography.fontFamily,
		fontWeight: typography.fontWeight,
		fontStyle: typography.fontStyle,
		color: typography.color,
		renderScale: typography.renderScale ?? 1,
		renderScaleX: typography.renderScaleX ?? 1,
		renderScaleY: typography.renderScaleY ?? 1,
		baselineRatio: typography.baselineRatio ?? 0.9,
		abbreviationIndicatorSize,
		...(typography.letterSpacing !== undefined ? { letterSpacing: typography.letterSpacing } : {}),
	};
}

function topicNote(topic: RoadmapTopic): string | undefined {
	return topic.note?.trim() ? topic.note : undefined;
}

function contentWithDescription(topic: RoadmapTopic): InlineNode[] {
	if (topic.description.length === 0) return [...topic.content];
	return [
		...topic.content,
		{ type: "lineBreak" },
		{ type: "emphasis", children: topic.description },
	];
}

function naturalContentWidth(
	content: readonly InlineNode[],
	typography: TypographyTheme,
	abbreviationIndicatorSize: number,
): number {
	return Math.max(
		1,
		...wrapInline(content, Number.MAX_SAFE_INTEGER, typography, abbreviationIndicatorSize).map(
			(line) => line.width,
		),
	);
}

function createCardNode(
	kind: LayoutNode["kind"],
	role: LayoutNode["role"],
	placement: LayoutNode["placement"],
	id: string,
	depth: number,
	content: readonly InlineNode[],
	tags: readonly string[],
	card: CardTheme,
	sourceRange?: SourceRange,
	abbreviationIndicatorSize = card.typography.fontSize * 0.75,
	note?: string,
	parentId?: string,
): LayoutNode {
	const maxContentWidth = Math.max(16, card.maxWidth - card.paddingX * 2);
	const minContentWidth = Math.max(16, card.minWidth - card.paddingX * 2);
	const targetWidth = Math.min(
		maxContentWidth,
		Math.max(
			minContentWidth,
			naturalContentWidth(content, card.typography, abbreviationIndicatorSize) + 0.5,
		),
	);
	const lines = wrapInline(content, targetWidth, card.typography, abbreviationIndicatorSize);
	const measuredWidth = Math.max(minContentWidth, ...lines.map((line) => line.width));
	const text = layoutText(lines, card.typography, abbreviationIndicatorSize);
	// Notes wrap at the typography's nominal size but paint at renderScale;
	// their box hugs the painted text, otherwise the scale slack (~12% of the
	// text width) piles up as horizontal padding far beyond the vertical.
	const paintScaleX = kind === "note" ? text.renderScale * (text.renderScaleX ?? 1) : 1;
	const paintScaleY = kind === "note" ? text.renderScale : 1;
	return {
		kind,
		role,
		placement,
		id,
		depth,
		x: 0,
		y: 0,
		width: Math.ceil(Math.min(maxContentWidth, measuredWidth) * paintScaleX + card.paddingX * 2),
		height: Math.ceil(
			Math.max(1, lines.length) * text.lineHeight * paintScaleY + card.paddingY * 2,
		),
		text,
		tags,
		frameShape: card.shape,
		paddingX: card.paddingX,
		paddingY: card.paddingY,
		...(note ? { note } : {}),
		...(parentId ? { parentId } : {}),
		...(sourceRange ? { sourceRange } : {}),
	};
}

function createHeadingNode(
	id: string,
	level: number,
	content: readonly InlineNode[],
	typography: TypographyTheme,
	sourceRange?: SourceRange,
	abbreviationIndicatorSize = typography.fontSize * 0.75,
): LayoutNode {
	const lines = wrapInline(content, 500, typography, abbreviationIndicatorSize);
	const text = layoutText(lines, typography, abbreviationIndicatorSize);
	return {
		kind: "heading",
		role: "heading",
		placement: "standalone",
		id,
		depth: Math.max(0, level - 1),
		x: 0,
		y: 0,
		width: Math.ceil(Math.max(1, ...lines.map((line) => line.width)) + 8),
		height: Math.ceil(Math.max(1, lines.length) * text.lineHeight + 4),
		text,
		tags: [],
		...(sourceRange ? { sourceRange } : {}),
	};
}

function headingTypography(level: number, theme: RoadmapTheme): TypographyTheme {
	if (level === 1) return theme.heading.title;
	if (level === 2) return theme.heading.section;
	return theme.heading.minor;
}

interface PackedCluster {
	readonly group: LayoutGroup;
	readonly nodes: LayoutNode[];
	readonly byTopic: ReadonlyMap<string, LayoutNode>;
}

function packCluster(
	topics: readonly RoadmapTopic[],
	id: string,
	depth: number,
	layout: "tree" | "nested",
	theme: RoadmapTheme,
	options: RequiredLayoutOptions,
	parentId?: string,
): PackedCluster {
	const nested = layout === "nested";
	const padding = nested ? theme.boards.nested.padding : theme.boards.topic.padding;
	const nodes = topics.map((topic) =>
		createCardNode(
			"topic",
			nested ? "nested-topic" : "topic",
			nested ? "nested-topic" : "tree-topic",
			topic.id,
			topic.depth,
			contentWithDescription(topic),
			topic.tags,
			nested ? theme.nestedTopic : theme.topic,
			topic.sourceRange,
			theme.inline.abbreviationIndicatorSize,
			topicNote(topic),
			parentId,
		),
	);
	// The reference algorithm: the widest topic sets the box width for the
	// whole cluster; narrow boxes may merge into a shared row, but nothing
	// ever extends beyond that width. At two columns the same box width
	// simply tiles twice per row.
	const widest = Math.max(1, ...nodes.map((node) => node.width));
	// A two-topic cluster keeps the classic column: one row of two reads as
	// a headerless fragment, not a cluster.
	const twoColumn = !nested && options.clusterColumns === 2 && nodes.length > 2;
	let y = padding;
	if (twoColumn) {
		for (let index = 0; index < nodes.length; index += 2) {
			const left = nodes[index];
			const right = nodes[index + 1];
			if (!left) continue;
			const rowHeight = Math.max(left.height, right?.height ?? 0);
			left.x = padding;
			left.y = y;
			left.width = widest;
			left.height = rowHeight;
			if (right) {
				right.x = padding + widest + options.itemGap;
				right.y = y;
				right.width = widest;
				right.height = rowHeight;
			}
			y += rowHeight + options.itemGap;
		}
	} else {
		for (let index = 0; index < nodes.length; index += 1) {
			const node = nodes[index];
			if (!node) continue;
			const next = nodes[index + 1];
			const canPair =
				index > 0 && next !== undefined && node.width + options.itemGap + next.width <= widest;
			if (canPair && next) {
				const spareWidth = widest - node.width - next.width - options.itemGap;
				const leftShare = spareWidth / 2;
				const rowHeight = Math.max(node.height, next.height);
				node.x = padding;
				node.y = y;
				node.width += leftShare;
				next.x = padding + node.width + options.itemGap;
				next.y = y;
				next.width += spareWidth - leftShare;
				node.height = rowHeight;
				next.height = rowHeight;
				y += rowHeight + options.itemGap;
				index += 1;
			} else {
				node.x = padding;
				node.y = y;
				node.width = widest;
				y += node.height + options.itemGap;
			}
		}
	}
	const clusterWidth = twoColumn ? widest * 2 + options.itemGap : widest;
	const group: LayoutGroup = {
		kind: "group",
		id,
		depth,
		layout,
		memberIds: nodes.map((node) => node.id),
		x: 0,
		y: 0,
		width: clusterWidth + padding * 2,
		height: Math.max(padding * 2, y - options.itemGap + padding),
	};
	return {
		group,
		nodes,
		byTopic: new Map(
			topics.flatMap((topic, index) => {
				const node = nodes[index];
				return node ? [[topic.id, node] as const] : [];
			}),
		),
	};
}

function moveCluster(cluster: PackedCluster, x: number, y: number): void {
	const dx = x - cluster.group.x;
	const dy = y - cluster.group.y;
	cluster.group.x += dx;
	cluster.group.y += dy;
	for (const node of cluster.nodes) {
		node.x += dx;
		node.y += dy;
	}
}

function moveElements(elements: readonly LayoutElement[], dx: number, dy: number): void {
	for (const element of elements) {
		element.x += dx;
		element.y += dy;
	}
}

function moveConnector(
	connector: LayoutConnector,
	dx: number,
	dy: number,
	moveFrom = true,
): LayoutConnector {
	return {
		...connector,
		from: moveFrom ? { x: connector.from.x + dx, y: connector.from.y + dy } : connector.from,
		to: { x: connector.to.x + dx, y: connector.to.y + dy },
	};
}

function overlapping(rectangle: Rect, occupied: readonly Rect[], padding: number): Rect[] {
	return occupied.filter((other) => rectanglesOverlap(rectangle, other, padding));
}

interface Candidate {
	readonly rect: Rect;
	readonly side: -1 | 1;
	readonly displacement: number;
}

function branchGapForSide(
	containerSide: -1 | 1,
	candidateSide: -1 | 1,
	options: RequiredLayoutOptions,
): number {
	if (containerSide < 0) {
		return candidateSide < 0 ? options.branchGapLeftOuter : options.branchGapLeftInner;
	}
	return candidateSide > 0 ? options.branchGapRightOuter : options.branchGapRightInner;
}

function openCandidate(
	base: Rect,
	container: Rect,
	preferredSide: -1 | 1,
	occupied: readonly Rect[],
	options: RequiredLayoutOptions,
	containerSide: -1 | 1,
	lockPreferredSide = false,
	fixedObstacles: readonly Rect[] = [],
): Candidate {
	const create = (side: -1 | 1): Rect => ({
		...base,
		x:
			side < 0
				? container.x - branchGapForSide(containerSide, side, options) - base.width
				: rectRight(container) + branchGapForSide(containerSide, side, options),
	});
	const preferred = create(preferredSide);
	const isOpen = (candidate: Rect): boolean =>
		overlapping(candidate, occupied, options.overlapPadding).length === 0 &&
		overlapping(candidate, fixedObstacles, options.overlapPadding).length === 0;
	if (isOpen(preferred)) {
		return { rect: preferred, side: preferredSide, displacement: 0 };
	}
	const alternateSide = oppositeSide(preferredSide);
	const alternate = create(alternateSide);
	if (!lockPreferredSide && isOpen(alternate)) {
		return { rect: alternate, side: alternateSide, displacement: 0 };
	}

	const shifted = (candidate: Rect, side: -1 | 1): Candidate => {
		let result = { ...candidate };
		let displacement = 0;
		for (let pass = 0; pass < occupied.length + 1; pass += 1) {
			if (overlapping(result, fixedObstacles, options.overlapPadding).length > 0) {
				return { rect: result, side, displacement: Number.POSITIVE_INFINITY };
			}
			const collisions = overlapping(result, occupied, options.overlapPadding);
			if (collisions.length === 0) break;
			const y = Math.max(
				...collisions.map((rectangle) => rectBottom(rectangle) + options.overlapPadding),
			);
			displacement += Math.max(0, y - result.y);
			result = { ...result, y };
		}
		return { rect: result, side, displacement };
	};
	const first = shifted(preferred, preferredSide);
	const second = shifted(alternate, alternateSide);
	if (lockPreferredSide && Number.isFinite(first.displacement)) return first;
	if (!Number.isFinite(first.displacement)) return second;
	if (!Number.isFinite(second.displacement)) return first;
	return first.displacement <= second.displacement + options.itemGap ? first : second;
}

interface ChapterLayoutContext {
	readonly elements: LayoutElement[];
	readonly connectors: LayoutConnector[];
	readonly occupied: Rect[];
	readonly theme: RoadmapTheme;
	readonly options: RequiredLayoutOptions;
	readonly spineObstacle: Rect;
}

function attachTopicChildren(
	topic: RoadmapTopic,
	parentNode: LayoutNode,
	container: LayoutGroup,
	preferredSide: -1 | 1,
	containerSide: -1 | 1,
	outsideRank: number,
	context: ChapterLayoutContext,
	lockPreferredSide = false,
): number {
	if (topic.children.length === 0) return rectBottom(container);
	const cluster = packCluster(
		topic.children,
		`${topic.id}-children`,
		topic.depth + 1,
		"nested",
		context.theme,
		context.options,
		topic.id,
	);
	// Like the reference renderer, children never avoid the spine corridor:
	// blocking it would force every full-width topic's children onto one side
	// instead of alternating at their parent's row.
	const candidate = openCandidate(
		{
			...cluster.group,
			y: parentNode.y - (topic.children.length >= 3 ? 14 : 0),
		},
		container,
		preferredSide,
		context.occupied,
		context.options,
		containerSide,
		lockPreferredSide,
	);
	const rightHullOvershoot = Math.max(0, (cluster.group.width - 52) / 16);
	const horizontalCorrection =
		candidate.side > 0
			? rightHullOvershoot
			: candidate.side === containerSide
				? outsideRank === 0
					? 5
					: 2
				: 0;
	moveCluster(
		cluster,
		candidate.rect.x + horizontalCorrection,
		Math.max(candidate.rect.y, container.y),
	);
	context.elements.push(cluster.group, ...cluster.nodes);
	// Organic hulls paint up to ~8px beyond the group rect; siblings must
	// clear the painted bulge, not just the box, or adjacent child clusters
	// visually overlap.
	context.occupied.push(inflateRectangle(cluster.group, 6));
	// The reference renderer leaves a small gap so links never touch the
	// parent topic card.
	const linkGap = 4;
	const from: Point = {
		x: candidate.side < 0 ? parentNode.x - linkGap : rectRight(parentNode) + linkGap,
		y: parentNode.y + parentNode.height / 2,
	};
	const to: Point = {
		x: candidate.side < 0 ? rectRight(cluster.group) : cluster.group.x,
		y: cluster.group.y + cluster.group.height / 2,
	};
	context.connectors.push({
		id: `${topic.id}-children-link`,
		kind: "topicToChildren",
		from,
		to,
		depth: topic.depth,
	});

	let bottom = rectBottom(cluster.group);
	for (const child of topic.children) {
		const childNode = cluster.byTopic.get(child.id);
		if (!childNode) continue;
		bottom = Math.max(
			bottom,
			attachTopicChildren(
				child,
				childNode,
				cluster.group,
				candidate.side,
				candidate.side,
				0,
				context,
			),
		);
	}
	return bottom;
}

interface GridEntry {
	readonly topic: RoadmapTopic;
	readonly parentId?: string;
	readonly relativeDepth: number;
	readonly node: LayoutNode;
}

function flattenGridTopic(
	topic: RoadmapTopic,
	theme: RoadmapTheme,
	parentId?: string,
	rootDepth = topic.depth,
): GridEntry[] {
	const entry: GridEntry = {
		topic,
		...(parentId ? { parentId } : {}),
		relativeDepth: topic.depth - rootDepth,
		node: createCardNode(
			"topic",
			parentId ? "topic" : "topic-header",
			"grid-topic",
			topic.id,
			topic.depth,
			contentWithDescription(topic),
			topic.tags,
			parentId ? theme.topic : theme.topicHeader,
			topic.sourceRange,
			theme.inline.abbreviationIndicatorSize,
			topicNote(topic),
			parentId,
		),
	};
	return [
		entry,
		...topic.children.flatMap((child) => flattenGridTopic(child, theme, topic.id, rootDepth)),
	];
}

interface GridChunk {
	readonly columns: readonly GridColumn[];
	readonly width: number;
}

interface GridColumn {
	readonly rows: readonly (readonly GridEntry[])[];
	readonly width: number;
}

/** Tree-line indent per nesting level inside a grid column; uncapped, so a
 * column nests as deep as the author writes — each level costs one gutter. */
function gridIndent(relativeDepth: number): number {
	return Math.max(0, relativeDepth - 1) * 16;
}

function packGridColumn(entries: readonly GridEntry[], itemGap: number): GridColumn {
	// The column must fit every entry at its natural width plus its indent;
	// shrinking cards to make room would overflow their measured text.
	const width = Math.max(
		1,
		...entries.map((entry) => entry.node.width + gridIndent(entry.relativeDepth)),
	);
	const rows: GridEntry[][] = [];
	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		if (!entry) continue;
		const next = entries[index + 1];
		const canPair =
			index > 0 &&
			next !== undefined &&
			entry.relativeDepth === 1 &&
			next.relativeDepth === 1 &&
			entry.parentId === next.parentId &&
			entry.node.width + itemGap + next.node.width <= width;
		if (canPair && next) {
			rows.push([entry, next]);
			index += 1;
		} else {
			rows.push([entry]);
		}
	}
	return { rows, width };
}

function splitGridColumns(
	columns: readonly GridColumn[],
	options: RequiredLayoutOptions,
	padding: number,
): GridChunk[] {
	const chunks: GridChunk[] = [];
	let current: GridColumn[] = [];
	let width = padding * 2;
	for (const column of columns) {
		if (current.length > 0 && current.length >= options.maxGridColumns) {
			chunks.push({ columns: current, width });
			current = [];
			width = padding * 2;
		}
		width += (current.length > 0 ? options.gridItemGap : 0) + column.width;
		current.push(column);
	}
	if (current.length > 0) chunks.push({ columns: current, width });
	return chunks;
}

function layoutGridGroup(
	group: RoadmapTopicGroup,
	centerX: number,
	startY: number,
	context: ChapterLayoutContext,
): { bottom: number; anchors: Point[] } {
	const padding = context.theme.boards.topic.padding;
	const columns = group.topics.map((topic) => {
		const entries = flattenGridTopic(topic, context.theme);
		for (const entry of entries) entry.node.groupId = group.id;
		return packGridColumn(entries, context.options.gridItemGap);
	});
	const chunks = splitGridColumns(columns, context.options, padding);
	let y = startY;
	const anchors: Point[] = [];

	for (const [chunkIndex, chunk] of chunks.entries()) {
		const rowCount = Math.max(0, ...chunk.columns.map((column) => column.rows.length));
		const rowHeights = Array.from({ length: rowCount }, (_, row) =>
			Math.max(
				0,
				...chunk.columns.flatMap((column) =>
					(column.rows[row] ?? []).map((entry) => entry.node.height),
				),
			),
		);
		const rowY: number[] = [];
		let contentY = y + padding;
		for (const height of rowHeights) {
			rowY.push(contentY);
			contentY += height + context.options.itemGap;
		}
		const height = Math.max(padding * 2, contentY - context.options.itemGap - y + padding);
		const grid: LayoutGroup = {
			kind: "group",
			id: `${group.id}-grid-${chunkIndex + 1}`,
			depth: 1,
			layout: "grid",
			memberIds: chunk.columns.flatMap((column) =>
				column.rows.flatMap((row) => row.map((entry) => entry.node.id)),
			),
			x: centerX - chunk.width / 2,
			y,
			width: chunk.width,
			height,
		};
		let x =
			grid.x +
			padding +
			((context.options.itemGap - context.options.gridItemGap) *
				Math.max(0, chunk.columns.length - 1)) /
				2;
		const byId = new Map<string, LayoutNode>();
		// The first nested child's list marker picks the tree-line side for its
		// siblings — `-` mirrors lines and indent to the right, `*` keeps the
		// default left — the same document-level trick `+` uses for grids.
		const treeSide = new Map<string, -1 | 1>();
		for (const column of chunk.columns) {
			for (const entry of column.rows.flat()) {
				if (!entry.parentId || entry.relativeDepth < 2) continue;
				if (!treeSide.has(entry.parentId)) {
					treeSide.set(entry.parentId, entry.topic.marker === "-" ? 1 : -1);
				}
			}
		}
		for (const column of chunk.columns) {
			for (const [rowIndex, entries] of column.rows.entries()) {
				const pairedExtra =
					entries.length === 2
						? (column.width -
								entries.reduce((total, entry) => total + entry.node.width, 0) -
								context.options.gridItemGap) /
							2
						: 0;
				let entryX = x;
				for (const entry of entries) {
					// Nested rows give up their left edge to the tree-line
					// gutter and stay flush with the column's right edge, so
					// the hierarchy reads as an indented outline rather than a
					// floating box. The depth cap keeps grids one honest
					// nesting level — deeper trees belong in tree groups.
					const indent = gridIndent(entry.relativeDepth);
					const side = entry.parentId ? (treeSide.get(entry.parentId) ?? -1) : -1;
					const width = entries.length === 2 ? entry.node.width + pairedExtra : column.width;
					entry.node.x = entryX + (side < 0 ? indent : 0);
					entry.node.y = rowY[rowIndex] ?? grid.y + padding;
					entry.node.width = Math.max(32, width - indent);
					entry.node.height = rowHeights[rowIndex] ?? entry.node.height;
					byId.set(entry.topic.id, entry.node);
					context.elements.push(entry.node);
					entryX += width + context.options.gridItemGap;
				}
			}
			x += column.width + context.options.gridItemGap;
		}
		context.elements.push(grid);
		context.occupied.push(inflateRectangle(grid, 1));
		for (const column of chunk.columns) {
			// Tree-gutter links: a stem drops from the parent through the
			// indent gutter and elbows into each child's left edge, so nesting
			// reads as a file-tree hierarchy without widening the balanced
			// column. Each sibling's stem continues from where the previous
			// tick branched off — translucent strokes double-darken wherever a
			// segment is drawn twice.
			const stemBottom = new Map<string, number>();
			for (const entry of column.rows.flat()) {
				if (!entry.parentId || entry.relativeDepth < 2) continue;
				const parent = byId.get(entry.parentId);
				if (!parent) continue;
				const side = treeSide.get(entry.parentId) ?? -1;
				const gutterX = side < 0 ? entry.node.x - 8 : rectRight(entry.node) + 8;
				const anchorY = rectCenter(entry.node).y;
				// Rail and stub are separate paths so a host can light the
				// vertical run to an active child without also lighting the
				// T-junction stubs into its dimmed siblings.
				context.connectors.push(
					{
						id: `${entry.topic.id}-grid-rail`,
						kind: "topicToChildren",
						shape: "elbow",
						from: { x: gutterX, y: stemBottom.get(entry.parentId) ?? rectBottom(parent) },
						to: { x: gutterX, y: anchorY },
						depth: entry.topic.depth,
					},
					{
						id: `${entry.topic.id}-grid-link`,
						kind: "topicToChildren",
						shape: "elbow",
						from: { x: gutterX, y: anchorY },
						to: { x: side < 0 ? entry.node.x : rectRight(entry.node), y: anchorY },
						depth: entry.topic.depth,
					},
				);
				stemBottom.set(entry.parentId, anchorY);
			}
		}
		anchors.push({ x: centerX, y: grid.y });
		y = rectBottom(grid) + context.options.commentGap;
	}
	return { bottom: y - context.options.commentGap, anchors };
}

interface PlacedCompound {
	readonly side: -1 | 1;
	readonly elements: readonly LayoutElement[];
	readonly rootConnectorIndex: number;
	readonly childConnectorStart: number;
	readonly childConnectorEnd: number;
	readonly occupiedIndexes: readonly number[];
}

function translatePlacedCompound(
	compound: PlacedCompound,
	dx: number,
	dy: number,
	context: ChapterLayoutContext,
): void {
	if (dx === 0 && dy === 0) return;
	moveElements(compound.elements, dx, dy);
	const rootConnector = context.connectors[compound.rootConnectorIndex];
	if (rootConnector) {
		context.connectors[compound.rootConnectorIndex] = moveConnector(rootConnector, dx, dy, false);
	}
	for (let index = compound.childConnectorStart; index < compound.childConnectorEnd; index += 1) {
		const connector = context.connectors[index];
		if (connector) context.connectors[index] = moveConnector(connector, dx, dy);
	}
	for (const index of compound.occupiedIndexes) {
		const rectangle = context.occupied[index];
		if (rectangle) {
			rectangle.x += dx;
			rectangle.y += dy;
		}
	}
}

function segmentIntersectsRectangle(from: Point, to: Point, rectangle: Rect): boolean {
	const deltaX = to.x - from.x;
	const deltaY = to.y - from.y;
	let entry = 0;
	let exit = 1;
	const clip = (direction: number, distance: number): boolean => {
		if (direction === 0) return distance >= 0;
		const ratio = distance / direction;
		if (direction < 0) {
			if (ratio > exit) return false;
			if (ratio > entry) entry = ratio;
		} else {
			if (ratio < entry) return false;
			if (ratio < exit) exit = ratio;
		}
		return true;
	};
	return (
		clip(-deltaX, from.x - rectangle.x) &&
		clip(deltaX, rectRight(rectangle) - from.x) &&
		clip(-deltaY, from.y - rectangle.y) &&
		clip(deltaY, rectBottom(rectangle) - from.y) &&
		entry <= exit
	);
}

/**
 * The vertical push required for a chapter-to-topics connector to pass beside
 * an obstacle (the chapter description note): lowering the target steepens the
 * straight connector until it exits on the chapter's side of the obstacle.
 */
function treeConnectorClearance(from: Point, to: Point, obstacle: Rect): number {
	if (!segmentIntersectsRectangle(from, to, obstacle)) return 0;
	const bottom = rectBottom(obstacle);
	const clearedX = from.x >= rectRight(obstacle) ? rectRight(obstacle) : obstacle.x;
	if (from.x > obstacle.x && from.x < rectRight(obstacle)) return 0;
	const clearedY = from.y + ((bottom - from.y) * (from.x - to.x)) / (from.x - clearedX);
	return Number.isFinite(clearedY) ? Math.max(0, clearedY - to.y) : 0;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
	return Math.min(startA, endA) <= endB && Math.max(startA, endA) >= startB;
}

/**
 * Orthogonal chapter connectors run two verticals joined by a horizontal at
 * mid-height, so the straight-chord test does not describe them. Lowering the
 * target moves the horizontal run below the obstacle, after which both
 * verticals descend past it on their own columns.
 */
function orthogonalConnectorClearance(from: Point, to: Point, obstacle: Rect): number {
	const middleY = (from.y + to.y) / 2;
	const bottom = rectBottom(obstacle);
	const right = rectRight(obstacle);
	const verticalHit = (x: number, yStart: number, yEnd: number): boolean =>
		x >= obstacle.x && x <= right && rangesOverlap(yStart, yEnd, obstacle.y, bottom);
	const horizontalHit =
		middleY >= obstacle.y && middleY <= bottom && rangesOverlap(from.x, to.x, obstacle.x, right);
	const intersects =
		horizontalHit || verticalHit(from.x, from.y, middleY) || verticalHit(to.x, middleY, to.y);
	if (!intersects) return 0;
	// The source vertical is fixed at the chapter's column; if the obstacle
	// spans that column, lowering the target cannot clear it.
	if (from.x >= obstacle.x && from.x <= right) return 0;
	// Push the target until the horizontal run clears the obstacle's bottom.
	// The margin also covers the renderer's marker trim, which shortens the
	// target vertical and thereby lifts the mid-run back up by half the trim
	// (at most half of an 18px marker).
	return Math.max(0, 2 * (bottom + 10) - from.y - to.y);
}

function layoutTreeGroups(
	chapter: RoadmapChapter,
	groups: readonly RoadmapTopicGroup[],
	centerX: number,
	startY: number,
	initialSide: -1 | 1,
	chapterNode: LayoutNode,
	context: ChapterLayoutContext,
	descriptionObstacle?: Rect,
): number {
	const localGroupGap = Math.min(80, context.options.groupGap);
	const clusters: {
		cluster: PackedCluster;
		group: RoadmapTopicGroup;
		side: -1 | 1;
		occupiedIndex: number;
		connectorIndex: number;
	}[] = [];
	const placedCompounds: PlacedCompound[] = [];
	const sideBottom = new Map<-1 | 1, number>([
		[-1, startY],
		[1, startY],
	]);

	for (const [index, group] of groups.entries()) {
		const side = index % 2 === 0 ? initialSide : oppositeSide(initialSide);
		const cluster = packCluster(group.topics, group.id, 1, "tree", context.theme, context.options);
		for (const node of cluster.nodes) node.groupId = group.id;
		const y = sideBottom.get(side) ?? startY;
		const x =
			side < 0
				? Math.min(
						centerX - localGroupGap - cluster.group.width,
						context.spineObstacle.x - context.options.overlapPadding - cluster.group.width,
					)
				: Math.max(
						centerX + localGroupGap,
						rectRight(context.spineObstacle) + context.options.overlapPadding,
					);
		// The cluster moves to its final horizontal position before any child
		// attaches: children solve collisions against the chart's real
		// geometry. (Placing children first and translating the compound
		// afterwards made them dodge obstacles — the chapter description, the
		// opposite group — at temporary coordinates, leaving inexplicable
		// gaps once the branch moved away.) The old left-edge clamp is gone
		// with it: the canvas crops to content, so there is no edge to guard.
		const outwardDx =
			side *
				Math.max(
					0,
					context.options.groupGap +
						(side < 0 ? context.options.groupOutsetLeft : 0) -
						localGroupGap,
				) +
			(side > 0 ? context.options.groupOutsetRight : 0);
		moveCluster(cluster, x + outwardDx, y);
		sideBottom.set(side, rectBottom(cluster.group) + context.options.commentGap * 2);
		context.elements.push(cluster.group, ...cluster.nodes);
		const occupiedIndex = context.occupied.length;
		context.occupied.push(inflateRectangle(cluster.group, 1));
		const connectorIndex = context.connectors.length;
		context.connectors.push({
			id: `${chapter.id}-${group.id}-link`,
			kind: "chapterToTopics",
			groupId: group.id,
			from: {
				x: chapterNode.x + chapterNode.width * (side < 0 ? 0.25 : 0.75),
				y: rectBottom(chapterNode),
			},
			to: { x: rectCenter(cluster.group).x, y: cluster.group.y },
			depth: 0,
		});
		clusters.push({ cluster, group, side, occupiedIndex, connectorIndex });
	}

	let bottom = startY;
	for (const { cluster, group, side, occupiedIndex, connectorIndex } of clusters) {
		const childElementStart = context.elements.length;
		const childConnectorStart = context.connectors.length;
		const childOccupiedStart = context.occupied.length;
		bottom = Math.max(bottom, rectBottom(cluster.group));
		// Children follow their parent's column: topics sharing a row send
		// their children to their own column's side (locked, overlaps push
		// down), while full-width topics prefer the cluster's chapter side.
		const clusterCenterX = cluster.group.x + cluster.group.width / 2;
		const clusterNodes = [...cluster.byTopic.values()];
		let branchIndex = 0;
		for (const topic of group.topics) {
			const node = cluster.byTopic.get(topic.id);
			if (!node) continue;
			const sharesRow = clusterNodes.some(
				(other) => other !== node && Math.abs(other.y - node.y) < 1,
			);
			const columnSide: -1 | 1 = node.x + node.width / 2 < clusterCenterX ? -1 : 1;
			const preferredSide = sharesRow ? columnSide : side;
			bottom = Math.max(
				bottom,
				attachTopicChildren(
					topic,
					node,
					cluster.group,
					preferredSide,
					side,
					branchIndex,
					context,
					sharesRow,
				),
			);
			if (topic.children.length > 0) branchIndex += 1;
		}

		// The branch is already at its final horizontal position; the compound
		// exists for the later whole-branch adjustments (spine clearance,
		// description avoidance).
		const compoundElements = [
			cluster.group,
			...cluster.nodes,
			...context.elements.slice(childElementStart),
		];
		const occupiedIndexes = [
			occupiedIndex,
			...Array.from(
				{ length: context.occupied.length - childOccupiedStart },
				(_, offset) => childOccupiedStart + offset,
			),
		];
		const compound: PlacedCompound = {
			side,
			elements: compoundElements,
			rootConnectorIndex: connectorIndex,
			childConnectorStart,
			childConnectorEnd: context.connectors.length,
			occupiedIndexes,
		};
		placedCompounds.push(compound);
	}

	// Children may use the spine corridor, but never cover the spine itself:
	// when one would, the whole branch moves away from the spine instead.
	const spineClearance = context.options.overlapPadding;
	for (const compound of placedCompounds) {
		let dx = 0;
		for (const element of compound.elements) {
			if (!rectanglesOverlap(element, context.spineObstacle)) continue;
			dx =
				compound.side < 0
					? Math.min(dx, context.spineObstacle.x - spineClearance - rectRight(element))
					: Math.max(dx, rectRight(context.spineObstacle) + spineClearance - element.x);
		}
		if (dx !== 0) translatePlacedCompound(compound, dx, 0, context);
	}

	if (descriptionObstacle) {
		const carriedShift = new Map<-1 | 1, number>([
			[-1, 0],
			[1, 0],
		]);
		for (const compound of placedCompounds) {
			let dy = carriedShift.get(compound.side) ?? 0;
			const rootConnector = context.connectors[compound.rootConnectorIndex];
			if (rootConnector) {
				const to = { x: rootConnector.to.x, y: rootConnector.to.y + dy };
				dy +=
					context.theme.connectors.chapterToTopics.routing === "orthogonal"
						? orthogonalConnectorClearance(rootConnector.from, to, descriptionObstacle)
						: treeConnectorClearance(rootConnector.from, to, descriptionObstacle);
			}
			translatePlacedCompound(compound, 0, dy, context);
			carriedShift.set(compound.side, dy);
			for (const element of compound.elements) {
				bottom = Math.max(bottom, rectBottom(element));
			}
		}
	}
	return bottom;
}

function usedTagStyles(document: RoadmapDocument, theme: RoadmapTheme): [string, TagStyle][] {
	const used = new Set<string>();
	for (const step of document.steps) {
		if (step.type !== "chapter") continue;
		for (const tag of step.tags) used.add(tag);
		const pending = step.groups.flatMap((group) => [...group.topics]);
		while (pending.length > 0) {
			const topic = pending.pop();
			if (!topic) continue;
			for (const tag of topic.tags) used.add(tag);
			pending.push(...topic.children);
		}
	}
	const known = Object.entries(theme.badges.tags).filter(
		([tag, style]) => used.has(tag) && style.legend !== false,
	);
	const unknown = [...used]
		.filter((tag) => !theme.badges.tags[tag])
		.map((tag): [string, TagStyle] => [tag, { ...theme.badges.unknown, label: tag }]);
	return [...known, ...unknown].sort((left, right) => right[1].label.length - left[1].label.length);
}

function createLegend(
	document: RoadmapDocument,
	theme: RoadmapTheme,
	options: RequiredLayoutOptions,
): LayoutLegend | undefined {
	const styles = usedTagStyles(document, theme);
	if (!options.showLegend || styles.length === 0) return undefined;
	const renderScale = theme.legend.renderScale ?? 1;
	const renderScaleX = theme.legend.renderScaleX ?? 1;
	const renderScaleY = theme.legend.renderScaleY ?? 1;
	const badgeSize = theme.badges.sizes.legend;
	const badgeCellSize = theme.badges.size;
	const badgeAdvance = badgeCellSize * 0.75 + theme.badges.gap;
	const iconColumnWidth = Math.max(
		0,
		...styles.map(
			([, style]) => badgeCellSize + Math.max(0, style.badges.length - 1) * badgeAdvance,
		),
	);
	const paintedFontSize = theme.legend.fontSize * renderScale;
	const rowHeight = Math.max(
		badgeCellSize,
		badgeSize,
		paintedFontSize * theme.legend.lineHeight * renderScaleY,
	);
	const metrics: LayoutLegendMetrics = {
		rowHeight,
		rowGap: theme.legend.rowGap,
		badgeSize,
		badgeCellSize,
		badgeAdvance,
		letterSpacing: theme.legend.letterSpacing ?? 0,
		iconColumnWidth,
		color: theme.legend.color,
		fontFamily: theme.legend.fontFamily,
		fontSize: theme.legend.fontSize,
		fontWeight: theme.legend.fontWeight,
		fontStyle: theme.legend.fontStyle,
		renderScale,
		renderScaleX,
		renderScaleY,
	};
	const legendLabel = (label: string): string =>
		theme.legend.textTransform === "uppercase" ? label.toUpperCase() : label;
	const labelWidth =
		Math.max(
			...styles.map(([, style]) =>
				measureTrackedText(
					legendLabel(style.label),
					paintedFontSize,
					theme.legend.fontWeight,
					theme.legend.fontFamily,
					metrics.letterSpacing,
				),
			),
		) * renderScaleX;
	const padding = theme.boards.legend.padding;
	return {
		kind: "legend",
		id: "roadmap-legend",
		x: options.padding,
		y: Math.max(10, options.padding / 2),
		width: Math.ceil(padding * 2 + iconColumnWidth + 14 + labelWidth),
		height: Math.ceil(
			padding * 2 + styles.length * rowHeight + Math.max(0, styles.length - 1) * metrics.rowGap,
		),
		items: styles.map(([tag, style]) => ({
			tag,
			label: legendLabel(style.label),
			icons: style.badges.map((badge) => badge.emoji ?? badge.icon ?? "question"),
		})),
		metrics,
	};
}

function moveAll(
	elements: LayoutElement[],
	connectors: LayoutConnector[],
	dx: number,
	dy: number,
): void {
	for (const element of elements) {
		element.x += dx;
		element.y += dy;
	}
	for (let index = 0; index < connectors.length; index += 1) {
		const connector = connectors[index];
		if (!connector) continue;
		connectors[index] = {
			...connector,
			from: { x: connector.from.x + dx, y: connector.from.y + dy },
			to: { x: connector.to.x + dx, y: connector.to.y + dy },
		};
	}
}

/**
 * Places a tree chapter's side description beside its chapter. Stays centered
 * on the chapter whenever that spot is open; when earlier content blocks it,
 * takes the collision-free vertical position closest to centered that still
 * keeps the description beside the chapter, and steps outward horizontally
 * only when no such position exists. Falls back to the band below the chapter
 * top, which the step cursor guarantees open.
 */
function placeTreeDescription(
	descriptionNode: LayoutNode,
	chapterNode: LayoutNode,
	chapterSide: -1 | 1,
	occupied: readonly Rect[],
	options: RequiredLayoutOptions,
): void {
	const frameAt = (x: number, y: number): Rect => {
		descriptionNode.x = x;
		descriptionNode.y = y;
		return paintedNodeFrameRectangle(descriptionNode);
	};
	// The painted frame can extend past the node rect (capsule ends), so the
	// chapter gap is kept between the chapter and the frame, not the node.
	const probe = frameAt(0, 0);
	const baseX =
		chapterSide < 0
			? chapterNode.x - options.treeDescriptionGap - (probe.x + probe.width)
			: rectRight(chapterNode) + options.treeDescriptionGap - probe.x;
	const centeredY = chapterNode.y + (chapterNode.height - descriptionNode.height) / 2;
	// A vertical placement must keep the description beside its chapter: the
	// painted frame has to overlap the chapter's vertical span by at least this.
	const minOverlap = Math.min(chapterNode.height, 24);
	const clearance = options.overlapPadding + 1;

	const columnBlockers = (frame: Rect): Rect[] =>
		overlapping(
			{
				x: frame.x,
				y: chapterNode.y + minOverlap - frame.height,
				width: frame.width,
				height: chapterNode.height + 2 * (frame.height - minOverlap),
			},
			occupied,
			options.overlapPadding,
		);

	const verticalFit = (x: number): number | undefined => {
		const frame = frameAt(x, centeredY);
		const offsetY = frame.y - centeredY;
		const candidates = [centeredY];
		for (const blocker of columnBlockers(frame)) {
			candidates.push(rectBottom(blocker) + clearance - offsetY);
			candidates.push(blocker.y - clearance - frame.height - offsetY);
		}
		let best: number | undefined;
		for (const y of candidates) {
			const top = y + offsetY;
			if (top + frame.height < chapterNode.y + minOverlap) continue;
			if (top > rectBottom(chapterNode) - minOverlap) continue;
			if (overlapping(frameAt(x, y), occupied, options.overlapPadding).length > 0) continue;
			if (best === undefined || Math.abs(y - centeredY) < Math.abs(best - centeredY)) best = y;
		}
		return best;
	};

	let x = baseX;
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const fit = verticalFit(x);
		if (fit !== undefined) {
			descriptionNode.x = x;
			descriptionNode.y = fit;
			return;
		}
		// The whole column is blocked; step outward past everything the swept
		// band touches and try the next column.
		const frame = frameAt(x, centeredY);
		const blockers = columnBlockers(frame);
		if (blockers.length === 0) break;
		const margin = options.overlapPadding * 2;
		x +=
			chapterSide < 0
				? Math.min(...blockers.map((rect) => rect.x)) - margin - rectRight(frame)
				: Math.max(...blockers.map((rect) => rectRight(rect))) + margin - frame.x;
		if (
			x + probe.x < options.padding ||
			x + probe.x + probe.width > options.width - options.padding
		) {
			break;
		}
	}

	// Guaranteed-open fallback: the step cursor keeps everything from earlier
	// steps above chapterNode.y, so a description starting there is clear; the
	// caller pushes the chapter's content below it.
	descriptionNode.x = baseX;
	descriptionNode.y = Math.max(centeredY, chapterNode.y);
}

export function layoutRoadmap(
	document: RoadmapDocument,
	theme: RoadmapTheme = lightTheme,
	inputOptions?: RoadmapLayoutOptions,
): RoadmapLayout {
	const options = layoutOptions(inputOptions);
	const elements: LayoutElement[] = [];
	const connectors: LayoutConnector[] = [];
	const occupied: Rect[] = [];
	const spineAnchors: Point[] = [];
	const baseCenter = options.width / 2;
	const spineObstacle: Rect = {
		x: baseCenter - 4 - options.spineClearance,
		y: 0,
		width: 52 + options.spineClearance * 2,
		height: Number.MAX_SAFE_INTEGER,
	};
	let y = options.padding + 36;
	let chapterIndex = 0;

	for (const [stepIndex, step] of document.steps.entries()) {
		const side: -1 | 1 = stepIndex % 2 === 0 ? 1 : -1;
		if (step.type === "heading") {
			const node = createHeadingNode(
				step.id,
				step.level,
				step.content,
				headingTypography(step.level, theme),
				step.sourceRange,
				theme.inline.abbreviationIndicatorSize,
			);
			const swing = step.level === 1 ? 22 : side * 5;
			node.x = baseCenter + swing - node.width / 2;
			node.y = y;
			elements.push(node);
			occupied.push(inflateRectangle(node, options.overlapPadding));
			spineAnchors.push({ x: rectCenter(node).x, y: step.level === 1 ? rectBottom(node) : node.y });
			y = rectBottom(node) + options.stepGap;
			continue;
		}

		if (step.type === "note") {
			const node = createCardNode(
				"note",
				"floating-note",
				"floating-note",
				step.id,
				0,
				step.content,
				[],
				theme.floatingNote,
				step.sourceRange,
				theme.inline.abbreviationIndicatorSize,
			);
			node.x = baseCenter + 14 - node.width / 2;
			node.y = y;
			elements.push(node);
			occupied.push(inflateRectangle(node, options.overlapPadding));
			spineAnchors.push(rectCenter(node));
			y = rectBottom(node) + options.noteStepGap;
			continue;
		}

		chapterIndex += 1;
		const chapterSide: -1 | 1 = chapterIndex % 2 === 1 ? 1 : -1;
		const centerX = baseCenter + (chapterSide > 0 ? 48 : -4);
		const chapterNode = createCardNode(
			"chapter",
			"chapter",
			"chapter",
			step.id,
			0,
			step.content,
			step.tags,
			theme.chapter,
			step.sourceRange,
			theme.inline.abbreviationIndicatorSize,
		);
		chapterNode.x = centerX - chapterNode.width / 2;
		chapterNode.y = y;
		elements.push(chapterNode);
		const chapterElementsStart = elements.length;
		occupied.push(inflateRectangle(chapterNode, options.overlapPadding));
		spineAnchors.push(rectCenter(chapterNode));

		const gridGroups = step.groups.filter((group) => group.layout === "grid");
		const treeGroups = step.groups.filter((group) => group.layout === "tree");
		let descriptionNode: LayoutNode | undefined;
		if (step.description.length > 0) {
			descriptionNode = createCardNode(
				"note",
				"chapter-description",
				treeGroups.length > 0 && gridGroups.length === 0 ? "tree-description" : "grid-description",
				`${step.id}-description`,
				0,
				step.description,
				[],
				theme.note,
				step.sourceRange,
				theme.inline.abbreviationIndicatorSize,
			);
			if (treeGroups.length > 0 && gridGroups.length === 0) {
				placeTreeDescription(descriptionNode, chapterNode, chapterSide, occupied, options);
			} else {
				descriptionNode.x = centerX - descriptionNode.width / 2;
				descriptionNode.y = rectBottom(chapterNode) + options.chapterDescriptionGap;
				// The painted bubble can bulge above the layout box; the gap is
				// promised to the visible frame, not the box.
				const bulge = descriptionNode.y - paintedNodeFrameRectangle(descriptionNode).y;
				if (bulge > 0) descriptionNode.y += bulge;
			}
			elements.push(descriptionNode);
			occupied.push(
				inflateRectangle(paintedNodeFrameRectangle(descriptionNode), options.overlapPadding),
			);
		}

		const chapterContext: ChapterLayoutContext = {
			elements,
			connectors,
			occupied,
			theme,
			options,
			spineObstacle,
		};
		let bottom = Math.max(
			rectBottom(chapterNode),
			descriptionNode ? rectBottom(paintedNodeFrameRectangle(descriptionNode)) : 0,
		);
		// Tree content starts below both the chapter and its side description,
		// so a tall description can neither overlap the clusters nor leave the
		// chapter connectors' horizontal runs crossing it.
		let contentY =
			treeGroups.length > 0
				? Math.max(
						rectBottom(chapterNode),
						descriptionNode && descriptionNode.placement === "tree-description"
							? rectBottom(paintedNodeFrameRectangle(descriptionNode))
							: 0,
					) + options.chapterContentGap
				: (descriptionNode
						? rectBottom(paintedNodeFrameRectangle(descriptionNode))
						: rectBottom(chapterNode)) + options.commentGap;

		for (const group of gridGroups) {
			const grid = layoutGridGroup(group, centerX, contentY, chapterContext);
			bottom = Math.max(bottom, grid.bottom);
			spineAnchors.push(...grid.anchors);
			contentY = grid.bottom + options.commentGap * 2;
		}
		if (treeGroups.length > 0) {
			const descriptionObstacle =
				descriptionNode && descriptionNode.placement === "tree-description"
					? inflateRectangle(paintedNodeFrameRectangle(descriptionNode), options.overlapPadding)
					: undefined;
			bottom = Math.max(
				bottom,
				layoutTreeGroups(
					step,
					treeGroups,
					centerX,
					contentY,
					chapterSide,
					chapterNode,
					chapterContext,
					descriptionObstacle,
				),
			);
		}
		// Everything the chapter placed that has no closer structural owner —
		// column headers, top-level tree topics, the description — belongs to
		// the chapter itself.
		for (const element of elements.slice(chapterElementsStart)) {
			if ("role" in element && element.role !== "chapter" && !element.parentId) {
				element.parentId = step.id;
			}
		}
		y =
			bottom +
			(gridGroups.length > 0
				? options.gridStepGap
				: treeGroups.length > 0
					? options.treeStepGap
					: options.stepGap);
	}

	for (let index = 1; index < spineAnchors.length; index += 1) {
		const from = spineAnchors[index - 1];
		const to = spineAnchors[index];
		if (!from || !to) continue;
		connectors.push({ id: `spine-${index}`, kind: "spine", from, to, depth: 0 });
	}

	const legend = createLegend(document, theme, options);
	if (legend) {
		// The legend anchors to the chart's own top-left corner, not to the
		// working corridor: a wide-spread chart crops to its content, and a
		// corner pinned at an absolute x would drag the canvas edge with it,
		// pushing the whole chart off-center. When content already occupies
		// the corner (tall legends, top-left clusters), the legend backs off
		// leftward just far enough to stay clear.
		const chartBounds = unionRectangles(
			elements.map((element) =>
				element.kind === "note" ? paintedNodeFrameRectangle(element) : element,
			),
		);
		const cornerBand = elements
			.map((element) => (element.kind === "note" ? paintedNodeFrameRectangle(element) : element))
			.filter(
				(rect) =>
					rect.y < legend.y + legend.height + options.overlapPadding &&
					rectBottom(rect) > legend.y - options.overlapPadding,
			);
		const bandLeft = Math.min(Number.POSITIVE_INFINITY, ...cornerBand.map((rect) => rect.x));
		legend.x = Math.min(chartBounds.x, bandLeft - options.overlapPadding * 2 - legend.width);
		elements.push(legend);
	}
	// Board hulls paint around their member cards with curve overshoot
	// (organic bulge, scallops) that the group's layout rect knows nothing
	// about; without this bleed a cropped canvas trims the hull edge.
	const boardPaintBleed = 12;
	const paintedBounds = (): Rect =>
		unionRectangles(
			elements.map((element) => {
				if (element.kind === "note") return paintedNodeFrameRectangle(element);
				if (element.kind === "group") return inflateRectangle(element, boardPaintBleed);
				return element;
			}),
		);
	const bounds = paintedBounds();
	// The canvas crops to content on both axes: `width` is only the working
	// corridor the solver spreads into, never a promise about the final
	// canvas — the SVG hugs the chart exactly as it always has vertically.
	const dx = options.padding - bounds.x;
	const dy = bounds.y < options.padding / 2 ? options.padding / 2 - bounds.y : 0;
	if (dx || dy) moveAll(elements, connectors, dx, dy);
	const movedBounds = paintedBounds();
	let width = Math.ceil(rectRight(movedBounds) + options.endPaddingX);
	let height = Math.ceil(
		Math.max(options.minHeight, rectBottom(movedBounds) + options.endPaddingY),
	);
	if (options.canvasScale > 1) {
		// The canvas grows around the finished chart in both dimensions:
		// content re-centers and the margins become open ground (the themes'
		// background artifacts settle there). The chart itself is unchanged.
		const grownWidth = Math.ceil(width * options.canvasScale);
		const grownHeight = Math.ceil(height * options.canvasScale);
		moveAll(elements, connectors, (grownWidth - width) / 2, (grownHeight - height) / 2);
		width = grownWidth;
		height = grownHeight;
	}
	const titleStep = document.steps.find((step) => step.type === "heading" && step.level === 1);
	const title = titleStep ? inlineToPlainText(titleStep.content) : "Roadmap";
	const artifactAvoidance = [
		...elements.map((element) =>
			inflateRectangle(element.kind === "note" ? paintedNodeFrameRectangle(element) : element, 36),
		),
		...connectors.map((connector) => {
			const x = Math.min(connector.from.x, connector.to.x);
			const y = Math.min(connector.from.y, connector.to.y);
			return inflateRectangle(
				{
					x,
					y,
					width: Math.max(1, Math.abs(connector.to.x - connector.from.x)),
					height: Math.max(1, Math.abs(connector.to.y - connector.from.y)),
				},
				24,
			);
		}),
	];

	return {
		width,
		height,
		elements,
		connectors,
		backgroundArtifacts:
			theme.backgroundArtifacts?.generate({
				width,
				height,
				settings: document.settings.background,
				avoid: artifactAvoidance,
			}) ?? [],
		title,
		maxDepth: document.stats.maxDepth,
	};
}
