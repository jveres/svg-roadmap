import { noteLayoutRectangle } from "./core/frames.ts";
import {
	inflateRectangle,
	rectanglesOverlap,
	rectBottom,
	rectCenter,
	rectRight,
	unionRectangles,
} from "./core/geometry.ts";
import { inlineToPlainText, measureText, wrapInline } from "./core/inline.ts";
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
	Point,
	Rect,
	RoadmapChapter,
	RoadmapDocument,
	RoadmapLayout,
	RoadmapLayoutOptions,
	RoadmapTheme,
	RoadmapTopic,
	RoadmapTopicGroup,
	SourceRange,
	TagStyle,
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
	chapterDescriptionGap: 18,
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
	maxGridColumns: 5,
	showLegend: true,
};

function layoutOptions(options?: RoadmapLayoutOptions): RequiredLayoutOptions {
	const resolved = { ...defaults, ...options };
	if (options?.branchGap !== undefined) {
		return {
			...resolved,
			branchGapLeftOuter: options.branchGapLeftOuter ?? options.branchGap,
			branchGapLeftInner: options.branchGapLeftInner ?? options.branchGap,
			branchGapRightOuter: options.branchGapRightOuter ?? options.branchGap,
			branchGapRightInner: options.branchGapRightInner ?? options.branchGap,
		};
	}
	return resolved;
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
	const lineHeight = card.typography.fontSize * card.typography.lineHeight;
	return {
		kind,
		role,
		placement,
		id,
		depth,
		x: 0,
		y: 0,
		width: Math.ceil(Math.min(maxContentWidth, measuredWidth) + card.paddingX * 2),
		height: Math.ceil(Math.max(1, lines.length) * lineHeight + card.paddingY * 2),
		text: {
			lines,
			fontSize: card.typography.fontSize,
			lineHeight,
			fontFamily: card.typography.fontFamily,
			fontWeight: card.typography.fontWeight,
			fontStyle: card.typography.fontStyle,
			color: card.typography.color,
			renderScale: card.typography.renderScale ?? 1,
			renderScaleX: card.typography.renderScaleX ?? 1,
			renderScaleY: card.typography.renderScaleY ?? 1,
			baselineRatio: card.typography.baselineRatio ?? 0.9,
			abbreviationIndicatorSize,
		},
		tags,
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
	const lineHeight = typography.fontSize * typography.lineHeight;
	return {
		kind: "heading",
		role: "heading",
		placement: "standalone",
		id,
		depth: Math.max(0, level - 1),
		x: 0,
		y: 0,
		width: Math.ceil(Math.max(1, ...lines.map((line) => line.width)) + 8),
		height: Math.ceil(Math.max(1, lines.length) * lineHeight + 4),
		text: {
			lines,
			fontSize: typography.fontSize,
			lineHeight,
			fontFamily: typography.fontFamily,
			fontWeight: typography.fontWeight,
			fontStyle: typography.fontStyle,
			color: typography.color,
			renderScale: typography.renderScale ?? 1,
			renderScaleX: typography.renderScaleX ?? 1,
			renderScaleY: typography.renderScaleY ?? 1,
			baselineRatio: typography.baselineRatio ?? 0.9,
			abbreviationIndicatorSize,
		},
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
		),
	);
	const widest = Math.max(1, ...nodes.map((node) => node.width));
	let y = padding;
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
	const group: LayoutGroup = {
		kind: "group",
		id,
		depth,
		layout,
		memberIds: nodes.map((node) => node.id),
		x: 0,
		y: 0,
		width: widest + padding * 2,
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
	const alternateSide = (preferredSide * -1) as -1 | 1;
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
	);
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
		[context.spineObstacle],
	);
	const outsideStackOffset =
		candidate.side === containerSide ? outsideRank * (containerSide > 0 ? 12 : 8) : 0;
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
		candidate.rect.y + outsideStackOffset,
	);
	context.elements.push(cluster.group, ...cluster.nodes);
	context.occupied.push(inflateRectangle(cluster.group, 1));
	const from: Point = {
		x: candidate.side < 0 ? parentNode.x : rectRight(parentNode),
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
		),
	};
	return [
		entry,
		...topic.children.flatMap((child) => flattenGridTopic(child, theme, topic.id, rootDepth)),
	];
}

interface GridChunk {
	readonly columns: readonly GridEntry[][];
	readonly width: number;
}

function splitGridColumns(
	columns: readonly GridEntry[][],
	availableWidth: number,
	options: RequiredLayoutOptions,
	padding: number,
): GridChunk[] {
	const chunks: GridChunk[] = [];
	let current: GridEntry[][] = [];
	let width = padding * 2;
	for (const column of columns) {
		const columnWidth = Math.max(1, ...column.map((entry) => entry.node.width));
		const nextWidth = width + (current.length > 0 ? options.gridItemGap : 0) + columnWidth;
		if (
			current.length > 0 &&
			(nextWidth > availableWidth || current.length >= options.maxGridColumns)
		) {
			chunks.push({ columns: current, width });
			current = [];
			width = padding * 2;
		}
		width += (current.length > 0 ? options.gridItemGap : 0) + columnWidth;
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
	const columns = group.topics.map((topic) => flattenGridTopic(topic, context.theme));
	const chunks = splitGridColumns(
		columns,
		context.options.width - context.options.padding * 2,
		context.options,
		padding,
	);
	let y = startY;
	const anchors: Point[] = [];

	for (const [chunkIndex, chunk] of chunks.entries()) {
		const rowCount = Math.max(0, ...chunk.columns.map((column) => column.length));
		const rowHeights = Array.from({ length: rowCount }, (_, row) =>
			Math.max(0, ...chunk.columns.map((column) => column[row]?.node.height ?? 0)),
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
			memberIds: chunk.columns.flatMap((column) => column.map((entry) => entry.node.id)),
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
		for (const column of chunk.columns) {
			const columnWidth = Math.max(1, ...column.map((entry) => entry.node.width));
			for (const [row, entry] of column.entries()) {
				const indent = Math.min(20, Math.max(0, entry.relativeDepth - 1) * 7);
				entry.node.x = x + indent;
				entry.node.y = rowY[row] ?? grid.y + padding;
				entry.node.width = Math.max(32, columnWidth - indent);
				entry.node.height = rowHeights[row] ?? entry.node.height;
				byId.set(entry.topic.id, entry.node);
				context.elements.push(entry.node);
			}
			x += columnWidth + context.options.gridItemGap;
		}
		context.elements.push(grid);
		context.occupied.push(inflateRectangle(grid, 1));
		for (const column of chunk.columns) {
			for (const entry of column) {
				if (!entry.parentId || entry.relativeDepth < 2) continue;
				const parent = byId.get(entry.parentId);
				if (!parent) continue;
				context.connectors.push({
					id: `${entry.topic.id}-grid-link`,
					kind: "topicToChildren",
					from: { x: rectCenter(parent).x, y: rectBottom(parent) },
					to: { x: rectCenter(entry.node).x, y: entry.node.y },
					depth: entry.topic.depth,
				});
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
	context: ChapterLayoutContext,
): void {
	if (dx === 0) return;
	moveElements(compound.elements, dx, 0);
	const rootConnector = context.connectors[compound.rootConnectorIndex];
	if (rootConnector) {
		context.connectors[compound.rootConnectorIndex] = moveConnector(rootConnector, dx, 0, false);
	}
	for (let index = compound.childConnectorStart; index < compound.childConnectorEnd; index += 1) {
		const connector = context.connectors[index];
		if (connector) context.connectors[index] = moveConnector(connector, dx, 0);
	}
	for (const index of compound.occupiedIndexes) {
		const rectangle = context.occupied[index];
		if (rectangle) rectangle.x += dx;
	}
}

function layoutTreeGroups(
	chapter: RoadmapChapter,
	groups: readonly RoadmapTopicGroup[],
	centerX: number,
	startY: number,
	initialSide: -1 | 1,
	chapterNode: LayoutNode,
	context: ChapterLayoutContext,
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
		const side = (index % 2 === 0 ? initialSide : initialSide * -1) as -1 | 1;
		const cluster = packCluster(group.topics, group.id, 1, "tree", context.theme, context.options);
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
		moveCluster(cluster, x, y);
		sideBottom.set(side, rectBottom(cluster.group) + context.options.commentGap * 2);
		context.elements.push(cluster.group, ...cluster.nodes);
		const occupiedIndex = context.occupied.length;
		context.occupied.push(inflateRectangle(cluster.group, 1));
		const connectorIndex = context.connectors.length;
		context.connectors.push({
			id: `${chapter.id}-${group.id}-link`,
			kind: "chapterToTopics",
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
		let branchIndex = 0;
		for (const topic of group.topics) {
			const node = cluster.byTopic.get(topic.id);
			if (!node) continue;
			const preferredSide = side > 0 && branchIndex % 2 === 1 ? ((side * -1) as -1 | 1) : side;
			bottom = Math.max(
				bottom,
				attachTopicChildren(
					topic,
					node,
					cluster.group,
					preferredSide,
					side,
					side > 0 ? Math.floor(branchIndex / 2) : branchIndex,
					context,
					side > 0,
				),
			);
			if (topic.children.length > 0) branchIndex += 1;
		}

		// Preserve local collision decisions, then move the completed branch as a
		// rigid compound to the wider position used by the reference renderer.
		const compoundElements = [
			cluster.group,
			...cluster.nodes,
			...context.elements.slice(childElementStart),
		];
		const baselineOutset = side < 0 ? context.options.groupOutsetLeft : 0;
		const requestedDx =
			side * Math.max(0, context.options.groupGap + baselineOutset - localGroupGap);
		const dx =
			side < 0
				? Math.max(requestedDx, context.options.padding - unionRectangles(compoundElements).x)
				: requestedDx;
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
		translatePlacedCompound(compound, dx, context);
		placedCompounds.push(compound);
	}

	for (const compound of placedCompounds) {
		const dx = compound.side < 0 ? 0 : context.options.groupOutsetRight;
		translatePlacedCompound(compound, dx, context);
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
	const known = Object.entries(theme.badges.tags).filter(([tag]) => used.has(tag));
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
	const labelWidth =
		Math.max(
			...styles.map(([, style]) =>
				measureText(
					style.label,
					paintedFontSize,
					[],
					theme.legend.fontWeight,
					theme.legend.fontFamily,
				),
			),
		) * renderScaleX;
	const padding = theme.boards.legend.padding;
	return {
		kind: "legend",
		id: "roadmap-legend",
		x: options.padding,
		y: Math.max(10, options.padding / 2),
		width: Math.ceil(padding * 2 + iconColumnWidth + 6 + labelWidth),
		height: Math.ceil(
			padding * 2 + styles.length * rowHeight + Math.max(0, styles.length - 1) * metrics.rowGap,
		),
		items: styles.map(([tag, style]) => ({
			tag,
			label: style.label,
			icons: style.badges.map((badge) => badge.icon),
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
		const side = (stepIndex % 2 === 0 ? 1 : -1) as -1 | 1;
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
		const chapterSide = (chapterIndex % 2 === 1 ? 1 : -1) as -1 | 1;
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
				descriptionNode.x =
					chapterSide < 0
						? chapterNode.x - options.treeDescriptionGap - descriptionNode.width
						: rectRight(chapterNode) + options.treeDescriptionGap;
				descriptionNode.y = chapterNode.y + (chapterNode.height - descriptionNode.height) / 2;
			} else {
				descriptionNode.x = centerX - descriptionNode.width / 2;
				descriptionNode.y = rectBottom(chapterNode) + options.chapterDescriptionGap;
			}
			elements.push(descriptionNode);
			occupied.push(inflateRectangle(noteLayoutRectangle(descriptionNode), options.overlapPadding));
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
			descriptionNode ? rectBottom(noteLayoutRectangle(descriptionNode)) : 0,
		);
		let contentY =
			treeGroups.length > 0
				? rectBottom(chapterNode) + options.chapterContentGap
				: (descriptionNode
						? rectBottom(noteLayoutRectangle(descriptionNode))
						: rectBottom(chapterNode)) + options.commentGap;

		for (const group of gridGroups) {
			const grid = layoutGridGroup(group, centerX, contentY, chapterContext);
			bottom = Math.max(bottom, grid.bottom);
			spineAnchors.push(...grid.anchors);
			contentY = grid.bottom + options.commentGap * 2;
		}
		if (treeGroups.length > 0) {
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
				),
			);
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
	if (legend) elements.push(legend);
	const bounds = unionRectangles(
		elements.map((element) => (element.kind === "note" ? noteLayoutRectangle(element) : element)),
	);
	const dx = bounds.x < options.padding ? options.padding - bounds.x : 0;
	const dy = bounds.y < options.padding / 2 ? options.padding / 2 - bounds.y : 0;
	if (dx || dy) moveAll(elements, connectors, dx, dy);
	const movedBounds = unionRectangles(
		elements.map((element) => (element.kind === "note" ? noteLayoutRectangle(element) : element)),
	);
	const width = Math.ceil(Math.max(options.width, rectRight(movedBounds) + options.endPaddingX));
	const height = Math.ceil(
		Math.max(options.minHeight, rectBottom(movedBounds) + options.endPaddingY),
	);
	const titleStep = document.steps.find((step) => step.type === "heading" && step.level === 1);
	const title = titleStep ? inlineToPlainText(titleStep.content) : "Roadmap";
	const artifactAvoidance = [
		...elements.map((element) =>
			inflateRectangle(element.kind === "note" ? noteLayoutRectangle(element) : element, 36),
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
