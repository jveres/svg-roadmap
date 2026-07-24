import { createSeededRandom } from "./core/background-artifacts.ts";
import { twemojiArtwork } from "./core/emoji-artwork.ts";
import { fittedCapsuleFrame, noteBlobGeometry, paintedTextLines } from "./core/frames.ts";
import {
	blobPath,
	bundledCurvePath,
	organicBlobPath,
	rectBottom,
	rectCenter,
	rectRight,
	verticalBumpPath,
} from "./core/geometry.ts";
import { measureText } from "./core/inline.ts";
import { escapeXml, hashString, safeId, safeLinkDestination } from "./core/strings.ts";
import type {
	BadgeStyle,
	BoardTheme,
	CardTheme,
	ConnectorTheme,
	LayoutBackgroundArtifact,
	LayoutConnector,
	LayoutElement,
	LayoutGroup,
	LayoutLegend,
	LayoutNode,
	Rect,
	RoadmapLayout,
	RoadmapRenderOptions,
	RoadmapTheme,
	TagStyle,
	TextLine,
	TextLineSegment,
} from "./types.ts";

function scopedPaint(value: string, prefix: string): string {
	return value
		.replace("url(#chapter-gradient)", `url(#${prefix}-chapter-gradient)`)
		.replace("url(#topic-gradient)", `url(#${prefix}-topic-gradient)`);
}

function escapeStyleText(value: string): string {
	return value.replaceAll("&", "\\26 ").replaceAll("<", "\\3c ");
}

function cssToken(name: string): string {
	return `var(--roadmap-${name})`;
}

function kebabToken(value: string): string {
	return value.replaceAll(/([a-z])([A-Z])/gu, "$1-$2").toLowerCase();
}

/** End-shape markers size in user units so hairline connectors stay legible. */
function connectorMarkerSize(strokeWidth: number): number {
	return Math.min(18, Math.max(7, strokeWidth * 4.5));
}

/**
 * Marker anchoring per shape and join mode, in tenths of the marker size.
 * With `overlap` the stroke runs under the marker and only the leading edge
 * is compensated; with `detached` the reference point sits at the shape's
 * rear edge and the trim moves the whole marker ahead of the stroke, with
 * its front landing on the original endpoint.
 */
function markerAnchor(
	endShape: NonNullable<ConnectorTheme["endShape"]>,
	join: NonNullable<ConnectorTheme["endShapeJoin"]>,
): { readonly refX: number; readonly trimFactor: number } {
	if (join === "detached") {
		if (endShape === "arrow") return { refX: 0, trimFactor: 0.8 };
		if (endShape === "circle") return { refX: 0.6, trimFactor: 0.88 };
		if (endShape === "diamond") return { refX: 1, trimFactor: 0.8 };
		return { refX: 1, trimFactor: 0.78 };
	}
	if (endShape === "arrow") return { refX: 5, trimFactor: 0.3 };
	if (endShape === "diamond") return { refX: 9, trimFactor: 0.25 };
	return { refX: 8.7, trimFactor: 0.25 };
}

/**
 * Shortens a connector so its stroke ends under the arrow body: the arrow tip
 * overshoots its reference point by three tenths of the marker size, which
 * puts the tip back on the original endpoint while the line's round cap stays
 * hidden behind the arrow. Orthogonal routes trim along their final segment's
 * axis; other routes trim toward the source.
 */
function trimConnectorEnd(
	connector: LayoutConnector,
	trim: number,
	routing: ConnectorTheme["routing"],
): LayoutConnector {
	const { from, to } = connector;
	if (routing === "orthogonal") {
		if (connector.kind === "topicToChildren") {
			const sign = Math.sign(to.x - from.x) || 1;
			return { ...connector, to: { x: to.x - sign * trim, y: to.y } };
		}
		const sign = Math.sign(to.y - from.y) || 1;
		return { ...connector, to: { x: to.x, y: to.y - sign * trim } };
	}
	const deltaX = to.x - from.x;
	const deltaY = to.y - from.y;
	const length = Math.hypot(deltaX, deltaY) || 1;
	return {
		...connector,
		to: { x: to.x - (deltaX / length) * trim, y: to.y - (deltaY / length) * trim },
	};
}

function boardOutline(board: BoardTheme): string {
	return board.stroke ? ` stroke="${board.stroke}" stroke-width="${board.strokeWidth ?? 1}"` : "";
}

function cardTokenPrefix(node: LayoutNode): string {
	return node.role;
}

function themeCards(theme: RoadmapTheme): readonly (readonly [string, CardTheme])[] {
	return [
		["chapter", theme.chapter],
		["chapter-description", theme.note],
		["floating-note", theme.floatingNote],
		["topic", theme.topic],
		["nested-topic", theme.nestedTopic],
		["topic-header", theme.topicHeader],
	] as const;
}

/** Note cards that paint a repeating pattern over their fill, keyed by token. */
function patternedCards(theme: RoadmapTheme): readonly (readonly [string, CardTheme])[] {
	return (
		[
			["chapter-description", theme.note],
			["floating-note", theme.floatingNote],
		] as const
	).filter(([, card]) => card.pattern !== undefined && card.pattern !== "none");
}

/** Cards with a generic gradient fill, keyed by token. */
function gradientCards(theme: RoadmapTheme): readonly (readonly [string, CardTheme])[] {
	return themeCards(theme).filter(([, card]) => card.gradient !== undefined);
}

function textToken(node: LayoutNode): string {
	if (node.role === "heading") {
		return node.depth === 0
			? "heading-title-text"
			: node.depth === 1
				? "heading-section-text"
				: "heading-minor-text";
	}
	return `${cardTokenPrefix(node)}-text`;
}

function themeCssVariables(theme: RoadmapTheme, prefix: string): string {
	const variables: [string, string | number][] = [
		["canvas-background", theme.canvas.background],
		["heading-title-text", theme.heading.title.color],
		["heading-section-text", theme.heading.section.color],
		["heading-minor-text", theme.heading.minor.color],
		["legend-text", theme.legend.color],
		["inline-link", theme.inline.link],
		["inline-highlight-background", theme.inline.highlight],
		["inline-insert-underline", theme.inline.insertUnderline],
		["inline-code-background", theme.inline.codeBackground],
		["inline-abbreviation-underline", theme.inline.abbreviation],
		["shadow-color", theme.shadow.color],
		["shadow-opacity", theme.shadow.opacity],
		["shadow-offset-x", `${theme.shadow.offsetX}px`],
		["shadow-offset-y", `${theme.shadow.offsetY}px`],
		["soft-shadow-blur", theme.shadow.softBlur],
		["soft-shadow-offset-x", theme.shadow.softOffsetX],
		["soft-shadow-offset-y", theme.shadow.softOffsetY],
		["soft-shadow-saturation", theme.shadow.softSaturation],
	];
	for (const [name, value] of Object.entries(theme.cssVariables)) {
		variables.push([name, value]);
	}
	if (theme.backgroundArtifacts) {
		for (const [name, value] of Object.entries(theme.backgroundArtifacts.cssVariables)) {
			variables.push([name, value]);
		}
	}
	const cards = [
		["chapter", theme.chapter],
		["chapter-description", theme.note],
		["floating-note", theme.floatingNote],
		["topic", theme.topic],
		["nested-topic", theme.nestedTopic],
		["topic-header", theme.topicHeader],
	] as const;
	for (const [name, card] of cards) {
		variables.push(
			[`${name}-background`, scopedPaint(card.fill, prefix)],
			[`${name}-border`, card.stroke],
			[`${name}-border-width`, card.strokeWidth],
			[`${name}-corner-radius`, card.radius],
			[`${name}-text`, card.typography.color],
		);
		if (card.shadowColor !== undefined) variables.push([`${name}-shadow-color`, card.shadowColor]);
		if (card.shadowOpacity !== undefined) {
			variables.push([`${name}-shadow-opacity`, card.shadowOpacity]);
		}
		if (card.gradient) {
			variables.push(
				[`${name}-card-gradient-start`, card.gradient.start],
				[`${name}-card-gradient-end`, card.gradient.end],
			);
		}
	}
	const boards = [
		["topic", theme.boards.topic],
		["nested-topic", theme.boards.nested],
		["legend", theme.boards.legend],
	] as const;
	for (const [name, board] of boards) {
		variables.push(
			[`${name}-board-background`, board.background],
			[`${name}-board-hatch`, board.hatch],
			[`${name}-board-hatch-opacity`, board.hatchOpacity],
		);
	}
	for (const [name, card] of patternedCards(theme)) {
		variables.push(
			[`${name}-board-background`, card.fill],
			[`${name}-board-hatch`, card.hatch ?? card.fill],
			[`${name}-board-hatch-opacity`, card.hatchOpacity ?? 1],
		);
	}
	for (const [name, connector] of Object.entries(theme.connectors)) {
		const token = kebabToken(name);
		variables.push(
			[`connector-${token}-color`, connector.color],
			[`connector-${token}-width`, connector.width],
			[`connector-${token}-opacity`, connector.opacity],
			[`connector-${token}-dash`, connector.dash || "none"],
		);
	}
	const badgeStyles = [theme.badges.unknown, ...Object.values(theme.badges.tags)];
	for (const style of badgeStyles) {
		for (const badge of style.badges) {
			variables.push(
				[`badge-${badge.icon}-background`, badge.background],
				[`badge-${badge.icon}-foreground`, badge.foreground],
			);
		}
	}
	const declarations = variables
		.map(([name, value]) => `--roadmap-${name}:${escapeStyleText(String(value))}`)
		.join(";");
	return `.roadmap[data-roadmap-instance="${prefix}"]{${declarations}}`;
}

function defaultIdPrefix(
	layout: RoadmapLayout,
	theme: RoadmapTheme,
	title: string,
	description: string,
): string {
	const identity = JSON.stringify({ layout, theme, title, description }) ?? "";
	return `roadmap-${hashString(identity)}`;
}

function cardTheme(node: LayoutNode, theme: RoadmapTheme): CardTheme | undefined {
	switch (node.role) {
		case "chapter":
			return theme.chapter;
		case "floating-note":
			return theme.floatingNote;
		case "chapter-description":
			return theme.note;
		case "topic-header":
			return theme.topicHeader;
		case "nested-topic":
			return theme.nestedTopic;
		case "topic":
			return theme.topic;
		case "heading":
			return undefined;
	}
}

function elementRole(node: LayoutNode): string {
	return node.role === "floating-note" ? "note" : node.role;
}

function badgeStyleForTag(tag: string, theme: RoadmapTheme): TagStyle {
	return theme.badges.tags[tag] ?? { ...theme.badges.unknown, label: tag };
}

function badgesForTags(tags: readonly string[], theme: RoadmapTheme): BadgeStyle[] {
	const seen = new Set<string>();
	const badges: BadgeStyle[] = [];
	for (const tag of tags) {
		for (const badge of badgeStyleForTag(tag, theme).badges) {
			const key = `${badge.icon}:${badge.background}:${badge.foreground}`;
			if (seen.has(key)) continue;
			seen.add(key);
			badges.push(badge);
		}
	}
	return badges;
}

function badgeSize(node: LayoutNode, theme: RoadmapTheme): number {
	switch (node.role) {
		case "chapter":
			return theme.badges.sizes.chapter;
		case "topic-header":
			return theme.badges.sizes.gridHeader;
		case "nested-topic":
			return theme.badges.sizes.nestedTopic;
		case "topic":
			return node.placement === "grid-topic"
				? theme.badges.sizes.gridItem
				: theme.badges.sizes.treeTopic;
		default:
			return theme.badges.sizes.treeTopic;
	}
}

function renderBadge(
	badge: BadgeStyle,
	x: number,
	y: number,
	size: number,
	prefix: string,
): string {
	return `<g class="roadmap__badge roadmap__badge--${escapeXml(badge.icon)}" transform="translate(${x} ${y})" data-roadmap-element="badge"><use href="#${prefix}-icon-${escapeXml(badge.icon)}" x="0" y="0" width="${size}" height="${size}" fill="${cssToken(`badge-${badge.icon}-background`)}" color="${cssToken(`badge-${badge.icon}-foreground`)}"/></g>`;
}

function renderNodeBadges(node: LayoutNode, theme: RoadmapTheme, prefix: string): string {
	const badges = badgesForTags(node.tags, theme);
	if (badges.length === 0) return "";
	const size = badgeSize(node, theme);
	const advance = size * 0.75 + theme.badges.gap;
	const startX = rectRight(node) - size * 0.5;
	const y = node.y - size * 0.5;
	return badges
		.map((badge, index) => renderBadge(badge, startX - index * advance, y, size, prefix))
		.join("");
}

function markAttributes(segment: TextLineSegment, node: LayoutNode, fontSize: number): string {
	const attributes: string[] = [];
	const classes: string[] = [];
	const marks = new Set(segment.marks);
	if (marks.has("strong")) attributes.push('font-weight="700"');
	if (marks.has("emphasis")) attributes.push('font-style="italic"');
	if (marks.has("code"))
		attributes.push('font-family="ui-monospace, SFMono-Regular, Menlo, monospace"');
	if (marks.has("highlight")) classes.push("roadmap__inline", "roadmap__inline--highlight");
	if (marks.has("insert")) classes.push("roadmap__inline", "roadmap__inline--insert");
	const decorations: string[] = [];
	if (marks.has("strikethrough")) decorations.push("line-through");
	if (segment.destination && !segment.abbreviationIndicator) {
		decorations.push("underline");
	}
	if (decorations.length > 0) attributes.push(`text-decoration="${decorations.join(" ")}"`);
	if (segment.destination) attributes.push(`fill="${cssToken("inline-link")}"`);
	else attributes.push(`fill="${cssToken(textToken(node))}"`);
	if (segment.abbreviation && !segment.destination && !segment.abbreviationIndicator) {
		classes.push("roadmap__inline", "roadmap__inline--abbreviation");
	}
	if (segment.abbreviationIndicator) {
		classes.push("roadmap__inline", "roadmap__inline--abbreviation-indicator");
		attributes.push(`font-size="${fontSize}"`);
	} else if (marks.has("superscript") || marks.has("subscript")) {
		attributes.push(`font-size="${fontSize * 0.75}"`);
	}
	if (classes.length > 0) {
		attributes.unshift(`class="${[...new Set(classes)].join(" ")}"`);
	}
	return attributes.join(" ");
}

function segmentBackground(
	segment: TextLineSegment,
	node: LayoutNode,
	x: number,
	baseline: number,
	fontSize: number,
	width: number,
): string {
	if (segment.marks.includes("highlight")) {
		return `<rect class="roadmap__highlight" x="${x - 1}" y="${baseline - fontSize * 0.8}" width="${width + 2}" height="${fontSize * 0.96}" rx="1" fill="${cssToken("inline-highlight-background")}"/>`;
	}
	if (segment.marks.includes("insert")) {
		if (node.kind === "heading") {
			const thickness = node.depth === 0 ? 1 : 2;
			const offset = node.depth === 0 ? 2 : 1;
			return `<rect class="roadmap__insert-underline" x="${x}" y="${baseline + offset}" width="${width}" height="${thickness}" fill="${cssToken("inline-insert-underline")}"/>`;
		}
		return `<rect class="roadmap__insert-underline" x="${x}" y="${baseline + 1}" width="${width}" height="${fontSize * 0.15}" fill="${cssToken("inline-insert-underline")}"/>`;
	}
	if (segment.marks.includes("code")) {
		return `<rect class="roadmap__code-background" x="${x - 2}" y="${baseline - fontSize * 0.82}" width="${width + 4}" height="${fontSize}" rx="2" fill="${cssToken("inline-code-background")}"/>`;
	}
	if (segment.abbreviation && !segment.destination && !segment.abbreviationIndicator) {
		// Defined terms get a painted dotted rule (browsers do not reliably
		// honor text-decoration-style on SVG text), so they read as
		// definitions rather than links.
		const y = baseline + 2.5;
		return `<line class="roadmap__abbreviation-underline" x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="${cssToken("inline-abbreviation-underline")}" stroke-width="1" stroke-dasharray="1.5 2.5" stroke-linecap="round"/>`;
	}
	return "";
}

interface ShortcodeEmojiGeometry {
	readonly widthEm: number;
	readonly heightEm: number;
	readonly baselineInset: number;
	readonly xOffsetEm?: number;
}

const shortcodeEmojiGeometry: Readonly<Record<string, ShortcodeEmojiGeometry>> = {
	soap: { widthEm: 1, heightEm: 1.1, baselineInset: 4.5 },
	boom: { widthEm: 1, heightEm: 1, baselineInset: 0.5 },
	beginner: { widthEm: 0.73, heightEm: 1, baselineInset: 2.75 },
	one: { widthEm: 1.125, heightEm: 1.0625, baselineInset: 2.5 },
	two: { widthEm: 1.125, heightEm: 1.0625, baselineInset: 2.9 },
	three: { widthEm: 1.125, heightEm: 1.125, baselineInset: 2.5 },
	recycle: { widthEm: 1.125, heightEm: 1, baselineInset: 1.5 },
	telescope: { widthEm: 0.96, heightEm: 0.88, baselineInset: 1.18, xOffsetEm: -0.08 },
	four: { widthEm: 1.125, heightEm: 1.0625, baselineInset: 2.5 },
	five: { widthEm: 1.125, heightEm: 1.0625, baselineInset: 2.5 },
	six: { widthEm: 1.125, heightEm: 1.0625, baselineInset: 2.5 },
	seven: { widthEm: 1.125, heightEm: 1.0625, baselineInset: 2.5 },
	eight: { widthEm: 1.125, heightEm: 1.0625, baselineInset: 2.5 },
	nine: { widthEm: 1.125, heightEm: 1.0625, baselineInset: 2.5 },
	keycap_ten: { widthEm: 1.125, heightEm: 1.0625, baselineInset: 2.5 },
	"100": { widthEm: 1.1, heightEm: 1.1, baselineInset: 2.2 },
	poop: { widthEm: 1.1, heightEm: 1.1, baselineInset: 2.2 },
	tada: { widthEm: 1.1, heightEm: 1.1, baselineInset: 2.2 },
	cloud: { widthEm: 1.1, heightEm: 1.1, baselineInset: 2.2 },
	star: { widthEm: 1.1, heightEm: 1.1, baselineInset: 2.2 },
	sparkles: { widthEm: 1.1, heightEm: 1.1, baselineInset: 2.2 },
	robot: { widthEm: 1.1, heightEm: 1.1, baselineInset: 2.2 },
	rocket: { widthEm: 1.1, heightEm: 1.1, baselineInset: 2.2 },
};

function renderShortcodeEmoji(
	segment: TextLineSegment,
	x: number,
	baseline: number,
	segmentWidth: number,
	fontSize: number,
	prefix: string,
): string | undefined {
	if (!segment.shortcode) return undefined;
	const geometry = shortcodeEmojiGeometry[segment.shortcode];
	if (!geometry) return undefined;
	const width = fontSize * geometry.widthEm;
	const height = fontSize * geometry.heightEm;
	const emojiX = x + (segmentWidth - width) / 2 + fontSize * (geometry.xOffsetEm ?? 0);
	const emojiY = baseline - height + geometry.baselineInset;
	return `<g class="roadmap__emoji roadmap__emoji--${safeId(segment.shortcode)}" data-shortcode="${escapeXml(segment.shortcode)}" role="img" aria-label="${escapeXml(segment.text)}"><use href="#${prefix}-emoji-${safeId(segment.shortcode)}" x="${emojiX}" y="${emojiY}" width="${width}" height="${height}"/></g>`;
}

function segmentBaselineShift(segment: TextLineSegment, fontSize: number): number {
	if (segment.abbreviationIndicator) return fontSize * 0.37;
	if (segment.marks.includes("superscript")) return fontSize * 0.34;
	if (segment.marks.includes("subscript")) return -fontSize * 0.22;
	return 0;
}

function segmentTitle(segment: TextLineSegment): string {
	const title =
		segment.abbreviation && (!segment.destination || segment.abbreviationIndicator)
			? segment.abbreviation
			: segment.linkTitle;
	return title ? `<title>${escapeXml(title)}</title>` : "";
}

function renderPositionedText(node: LayoutNode, prefix: string): string {
	const scale = node.text.renderScale;
	const renderScaleX = node.text.renderScaleX ?? 1;
	const renderScaleY = node.text.renderScaleY ?? 1;
	const fontSize = node.text.fontSize * scale;
	const paintedLines = paintedTextLines(node);
	const backgrounds: string[] = [];
	const text: string[] = [];

	for (const [lineIndex, line] of node.text.lines.entries()) {
		const paintedLine = paintedLines[lineIndex];
		if (!paintedLine) continue;
		const baseline = paintedLine.baseline;
		let x = paintedLine.x;
		for (const segment of line.segments) {
			const segmentWidth = segment.width * scale * renderScaleX;
			backgrounds.push(segmentBackground(segment, node, x, baseline, fontSize, segmentWidth));
			const segmentFontSize = segment.abbreviationIndicator
				? node.text.abbreviationIndicatorSize * scale
				: fontSize;
			const y = segment.abbreviationIndicator
				? baseline - fontSize * 0.37
				: segment.marks.includes("superscript")
					? baseline - fontSize * 0.34
					: segment.marks.includes("subscript")
						? baseline + fontSize * 0.22
						: baseline;
			const title = segmentTitle(segment);
			const segmentScaleY = renderScaleY;
			const segmentCenterX = x + segmentWidth / 2;
			const paintTransform =
				renderScaleX === 1 && segmentScaleY === 1
					? ""
					: `matrix(${renderScaleX} 0 0 ${segmentScaleY} ${x * (1 - renderScaleX)} ${y * (1 - segmentScaleY)})`;
			const emojiTransform =
				segment.marks.includes("emoji") && node.role === "chapter"
					? `translate(${segmentCenterX} ${node.y + node.height / 2}) scale(0.8) translate(${-segmentCenterX} ${-node.y - node.height / 2})`
					: "";
			const transforms = [paintTransform, emojiTransform].filter(Boolean).join(" ");
			const transform = transforms ? ` transform="${transforms}"` : "";
			const emoji = renderShortcodeEmoji(segment, x, y, segmentWidth, segmentFontSize, prefix);
			const fittedTextLength = segment.width * scale;
			// Emoji glyphs must keep their natural proportions: fitting them with
			// textLength or a non-uniform paint scale visibly distorts them.
			const emojiGlyphTransform = emojiTransform ? ` transform="${emojiTransform}"` : "";
			const content = emoji
				? `${title}${emoji}`
				: segment.marks.includes("emoji")
					? `${title}<text x="${segmentCenterX}" y="${y}" text-anchor="middle" letter-spacing="0" xml:space="preserve"${emojiGlyphTransform} ${markAttributes(segment, node, segmentFontSize)}>${escapeXml(segment.text)}</text>`
					: `${title}<text x="${x}" y="${y}" textLength="${fittedTextLength}" lengthAdjust="spacingAndGlyphs" xml:space="preserve"${transform} ${markAttributes(segment, node, segmentFontSize)}>${escapeXml(segment.text)}</text>`;
			const destination = segment.destination
				? safeLinkDestination(segment.destination)
				: undefined;
			text.push(
				destination
					? `<a class="roadmap__link" href="${escapeXml(destination)}" target="_blank" rel="noopener noreferrer">${content}</a>`
					: `<g>${content}</g>`,
			);
			x += segmentWidth;
		}
	}
	return `<g class="roadmap__text" font-family="${escapeXml(node.text.fontFamily)}" font-size="${fontSize}" font-weight="${node.text.fontWeight}" font-style="${node.text.fontStyle}"${letterSpacingAttribute(node)}>${backgrounds.join("")}${text.join("")}</g>`;
}

/**
 * Tracking is part of the measured segment widths; declaring it on the text
 * group keeps the natural advance in step with the measurement so textLength
 * only corrects rounding instead of stretching glyphs to fill the tracking.
 */
function letterSpacingAttribute(node: LayoutNode): string {
	const spacing = (node.text.letterSpacing ?? 0) * node.text.renderScale;
	return spacing === 0 ? "" : ` letter-spacing="${Math.round(spacing * 100) / 100}"`;
}

interface FlowingTextOptions {
	readonly nativeHighlight?: boolean;
	readonly nativeInsert?: boolean;
}

function renderFlowingText(node: LayoutNode, options: FlowingTextOptions = {}): string {
	const scale = node.text.renderScale;
	const renderScaleX = node.text.renderScaleX ?? 1;
	const renderScaleY = node.text.renderScaleY ?? 1;
	const fontSize = node.text.fontSize * scale;
	const paintedLines = paintedTextLines(node);
	const backgrounds: string[] = [];
	const text: string[] = [];

	for (const [lineIndex, line] of node.text.lines.entries()) {
		const paintedLine = paintedLines[lineIndex];
		if (!paintedLine) continue;
		const lineCenterY = paintedLine.y + paintedLine.height / 2;
		const baseline = lineCenterY + fontSize * 0.35;
		let backgroundX = paintedLine.x;
		for (const segment of line.segments) {
			const segmentWidth = segment.width * scale * renderScaleX;
			const decorationIsNative =
				(options.nativeHighlight && segment.marks.includes("highlight")) ||
				(options.nativeInsert && segment.marks.includes("insert"));
			if (!decorationIsNative) {
				backgrounds.push(
					segmentBackground(segment, node, backgroundX, baseline, fontSize, segmentWidth),
				);
			}
			backgroundX += segmentWidth;
		}

		const centerX = node.x + node.width / 2;
		const transform =
			renderScaleX === 1 && renderScaleY === 1
				? ""
				: ` transform="matrix(${renderScaleX} 0 0 ${renderScaleY} ${centerX * (1 - renderScaleX)} ${baseline * (1 - renderScaleY)})"`;
		const segments = line.segments
			.map((segment) => {
				const segmentFontSize = segment.abbreviationIndicator
					? node.text.abbreviationIndicatorSize * scale
					: fontSize;
				const baselineShift = segmentBaselineShift(segment, fontSize);
				const shift = baselineShift === 0 ? "" : ` baseline-shift="${baselineShift}"`;
				const tspan = `<tspan${shift} ${markAttributes(segment, node, segmentFontSize)}>${segmentTitle(segment)}${escapeXml(segment.text)}</tspan>`;
				const destination = segment.destination
					? safeLinkDestination(segment.destination)
					: undefined;
				return destination
					? `<a class="roadmap__link" href="${escapeXml(destination)}" target="_blank" rel="noopener noreferrer">${tspan}</a>`
					: tspan;
			})
			.join("");
		const fittedLength = ` textLength="${line.width * scale}" lengthAdjust="spacingAndGlyphs"`;
		text.push(
			`<text class="roadmap__flow-line" x="${centerX}" y="${baseline}" text-anchor="middle"${fittedLength} xml:space="preserve"${transform}>${segments}</text>`,
		);
	}

	return `<g class="roadmap__text" font-family="${escapeXml(node.text.fontFamily)}" font-size="${fontSize}" font-weight="${node.text.fontWeight}" font-style="${node.text.fontStyle}"${letterSpacingAttribute(node)}>${backgrounds.join("")}${text.join("")}</g>`;
}

function renderText(node: LayoutNode, theme: RoadmapTheme, prefix: string): string {
	if (theme.name !== "rose" && theme.name !== "sci-fi") return renderPositionedText(node, prefix);
	const nativeDecorations = theme.name === "rose";
	const flowingOptions: FlowingTextOptions = nativeDecorations
		? { nativeHighlight: true, nativeInsert: true }
		: {};
	// Painted decoration rects must line up with glyphs exactly. WebKit
	// distributes textLength across a flowing line differently from other
	// engines, so lines with painted decorations render positioned instead.
	const requiresPositionedText = (line: TextLine): boolean =>
		line.segments.some(
			(segment) =>
				(segment.shortcode && shortcodeEmojiGeometry[segment.shortcode] !== undefined) ||
				segment.marks.includes("code") ||
				(segment.abbreviation !== undefined &&
					!segment.destination &&
					!segment.abbreviationIndicator) ||
				(!nativeDecorations &&
					(segment.marks.includes("highlight") || segment.marks.includes("insert"))),
		);
	if (!node.text.lines.some(requiresPositionedText)) return renderFlowingText(node, flowingOptions);

	const paintedLines = paintedTextLines(node);
	return node.text.lines
		.map((line, index) => {
			const paintedLine = paintedLines[index];
			if (!paintedLine) return "";
			const lineNode: LayoutNode = {
				...node,
				y: paintedLine.y,
				height: paintedLine.height,
				text: { ...node.text, lines: [line] },
			};
			return requiresPositionedText(line)
				? renderPositionedText(lineNode, prefix)
				: renderFlowingText(lineNode, flowingOptions);
		})
		.join("");
}

function renderCardFrame(
	node: LayoutNode,
	card: CardTheme,
	prefix: string,
	shadowPattern: "solid" | "halftone" = "solid",
): string {
	const token = cardTokenPrefix(node);
	const fill =
		card.pattern !== undefined && card.pattern !== "none"
			? `url(#${prefix}-${token}-hatch)`
			: card.gradient
				? `url(#${prefix}-${token}-card-gradient)`
				: cssToken(`${token}-background`);
	const attributes = `class="roadmap__frame" data-roadmap-shape="${card.shape}" fill="${fill}" stroke="${cssToken(`${token}-border`)}" stroke-width="${cssToken(`${token}-border-width`)}"`;
	// The halftone shadow pattern paints with the global shadow color; per-card
	// shadow color overrides only apply to solid shadows.
	const shadowFill =
		shadowPattern === "halftone"
			? `url(#${prefix}-shadow-halftone)`
			: `var(--roadmap-${token}-shadow-color, ${cssToken("shadow-color")})`;
	const shadowAttributes = `class="roadmap__frame-shadow" fill="${shadowFill}" fill-opacity="var(--roadmap-${token}-shadow-opacity, ${cssToken("shadow-opacity")})" stroke="none"`;
	const height = node.kind === "chapter" ? node.height - 1 : node.height;
	const rectangle =
		node.kind === "note" && (card.shape === "organic" || card.shape === "petal")
			? noteBlobGeometry(node).frame
			: { ...node, height };
	const renderShape = (paint: string): string => {
		if (card.shape === "chamfered") {
			return `<path ${paint} d="${chamferedRectanglePath(rectangle, card.radius)}"/>`;
		}
		if (card.shape === "cameo") {
			return `<path ${paint} d="${cameoCardPath(rectangle)}"/>`;
		}
		if (card.shape === "petal") {
			return `<path ${paint} d="${petalCardPath(rectangle)}"/>`;
		}
		if (card.shape === "capsule") {
			const capsule = node.kind === "note" ? fittedCapsuleFrame(node) : rectangle;
			return `<rect ${paint} x="${capsule.x}" y="${capsule.y}" width="${capsule.width}" height="${capsule.height}" rx="${capsule.height / 2}"/>`;
		}
		if (card.shape !== "organic" || node.kind !== "note") {
			return `<rect ${paint} x="${node.x}" y="${node.y}" width="${node.width}" height="${height}" rx="${cssToken(`${token}-corner-radius`)}"/>`;
		}

		const geometry = noteBlobGeometry(node);
		const path = organicBlobPath(
			geometry.frame,
			geometry.lowerInset,
			geometry.upperInset,
			geometry.upperShoulderInset,
			geometry.upperShoulderRatio,
		);
		return `<path ${paint} d="${path}"/>`;
	};

	const detail =
		card.shape === "cameo"
			? `<path class="roadmap__frame-detail roadmap__frame-detail--cameo" d="${cameoCardPath(insetRectangle(rectangle, Math.max(2, rectangle.height * 0.14)))}" fill="none" stroke="${cssToken(`${token}-border`)}" stroke-width="var(--roadmap-frame-detail-width,0.7)" stroke-opacity="var(--roadmap-frame-detail-opacity,0.45)" pointer-events="none"/>`
			: "";
	const insetKeyline = (): string => {
		if (card.detailInset === undefined || card.shape === "cameo" || card.shape === "organic") {
			return "";
		}
		const inner = insetRectangle(rectangle, card.detailInset);
		const paint = `class="roadmap__frame-detail" fill="none" stroke="${cssToken(`${token}-border`)}" stroke-width="var(--roadmap-frame-detail-width,0.7)" stroke-opacity="var(--roadmap-frame-detail-opacity,0.45)" pointer-events="none"`;
		if (card.shape === "chamfered") {
			return `<path ${paint} d="${chamferedRectanglePath(inner, Math.max(0, card.radius - card.detailInset))}"/>`;
		}
		if (card.shape === "petal") return `<path ${paint} d="${petalCardPath(inner)}"/>`;
		if (card.shape === "capsule") {
			return `<rect ${paint} x="${inner.x}" y="${inner.y}" width="${inner.width}" height="${inner.height}" rx="${inner.height / 2}"/>`;
		}
		return `<rect ${paint} x="${inner.x}" y="${inner.y}" width="${inner.width}" height="${inner.height}" rx="${Math.max(0, card.radius - card.detailInset)}"/>`;
	};
	return `${card.shadow ? renderShape(shadowAttributes) : ""}${renderShape(attributes)}${detail}${insetKeyline()}`;
}

function insetRectangle(rectangle: Rect, inset: number): Rect {
	return {
		x: rectangle.x + inset,
		y: rectangle.y + inset,
		width: Math.max(1, rectangle.width - inset * 2),
		height: Math.max(1, rectangle.height - inset * 2),
	};
}

function cameoCardPath(rectangle: Rect): string {
	const { x, y, width, height } = rectangle;
	const right = x + width;
	const bottom = y + height;
	return [
		`M ${x + width * 0.16} ${y}`,
		`C ${x + width * 0.34} ${y} ${x + width * 0.66} ${y} ${x + width * 0.84} ${y}`,
		`C ${x + width * 0.94} ${y} ${right} ${y + height * 0.18} ${right} ${y + height * 0.5}`,
		`C ${right} ${y + height * 0.82} ${x + width * 0.94} ${bottom} ${x + width * 0.84} ${bottom}`,
		`C ${x + width * 0.65} ${bottom} ${x + width * 0.35} ${bottom} ${x + width * 0.16} ${bottom}`,
		`C ${x + width * 0.06} ${bottom} ${x} ${y + height * 0.82} ${x} ${y + height * 0.5}`,
		`C ${x} ${y + height * 0.18} ${x + width * 0.06} ${y} ${x + width * 0.16} ${y}`,
		"Z",
	].join(" ");
}

function petalCardPath(rectangle: Rect): string {
	const { x, y, width, height } = rectangle;
	const right = x + width;
	const bottom = y + height;
	const centerY = y + height / 2;
	const shoulder = Math.min(height * 0.34, width * 0.12);
	return `M ${x + shoulder} ${y} H ${right - shoulder} Q ${right} ${y} ${right} ${y + shoulder} C ${right - 2} ${centerY - shoulder * 0.45} ${right - 2} ${centerY + shoulder * 0.45} ${right} ${bottom - shoulder} Q ${right} ${bottom} ${right - shoulder} ${bottom} H ${x + shoulder} Q ${x} ${bottom} ${x} ${bottom - shoulder} C ${x + 2} ${centerY + shoulder * 0.45} ${x + 2} ${centerY - shoulder * 0.45} ${x} ${y + shoulder} Q ${x} ${y} ${x + shoulder} ${y} Z`;
}

function chamferedRectanglePath(rectangle: Rect, requestedCut: number): string {
	const { x, y, width, height } = rectangle;
	const right = x + width;
	const bottom = y + height;
	const cut = Math.max(2, Math.min(requestedCut, width / 4, height / 3));
	return `M ${x + cut} ${y} H ${right - cut} L ${right} ${y + cut} V ${bottom - cut} L ${right - cut} ${bottom} H ${x + cut} L ${x} ${bottom - cut} V ${y + cut} Z`;
}

function roundedBoardRadius(board: BoardTheme): number {
	return Math.min(4, board.padding / 3);
}

function roundedRectanglePath(rectangle: Rect, requestedRadius: number): string {
	const radius = Math.max(0, Math.min(requestedRadius, rectangle.width / 2, rectangle.height / 2));
	const right = rectRight(rectangle);
	const bottom = rectBottom(rectangle);
	return [
		`M ${rectangle.x + radius} ${rectangle.y}`,
		`H ${right - radius}`,
		`Q ${right} ${rectangle.y} ${right} ${rectangle.y + radius}`,
		`V ${bottom - radius}`,
		`Q ${right} ${bottom} ${right - radius} ${bottom}`,
		`H ${rectangle.x + radius}`,
		`Q ${rectangle.x} ${bottom} ${rectangle.x} ${bottom - radius}`,
		`V ${rectangle.y + radius}`,
		`Q ${rectangle.x} ${rectangle.y} ${rectangle.x + radius} ${rectangle.y}`,
		"Z",
	].join(" ");
}

function scallopedRectanglePath(rectangle: Rect, requestedInset: number): string {
	const { x, y, width, height } = rectangle;
	const right = x + width;
	const bottom = y + height;
	const inset = Math.max(3, Math.min(requestedInset * 0.35, height / 8, width / 16));
	const corner = Math.max(8, Math.min(requestedInset, height / 3, width / 8));
	const quarter = width / 4;
	return [
		`M ${x + corner} ${y + inset}`,
		`Q ${x + quarter} ${y - inset} ${x + quarter * 2} ${y + inset}`,
		`Q ${x + quarter * 3} ${y - inset} ${right - corner} ${y + inset}`,
		`Q ${right} ${y + inset} ${right} ${y + corner}`,
		`Q ${right - inset} ${y + height * 0.5} ${right} ${bottom - corner}`,
		`Q ${right} ${bottom - inset} ${right - corner} ${bottom - inset}`,
		`Q ${x + quarter * 3} ${bottom + inset} ${x + quarter * 2} ${bottom - inset}`,
		`Q ${x + quarter} ${bottom + inset} ${x + corner} ${bottom - inset}`,
		`Q ${x} ${bottom - inset} ${x} ${bottom - corner}`,
		`Q ${x + inset} ${y + height * 0.5} ${x} ${y + corner}`,
		`Q ${x} ${y + inset} ${x + corner} ${y + inset}`,
		"Z",
	].join(" ");
}

function enclosingRectangle(rectangles: readonly Rect[], padding: number): Rect {
	const left = Math.min(...rectangles.map((rectangle) => rectangle.x)) - padding;
	const top = Math.min(...rectangles.map((rectangle) => rectangle.y)) - padding;
	const right = Math.max(...rectangles.map(rectRight)) + padding;
	const bottom = Math.max(...rectangles.map(rectBottom)) + padding;
	return { x: left, y: top, width: right - left, height: bottom - top };
}

function renderNode(node: LayoutNode, theme: RoadmapTheme, prefix: string): string {
	const role = elementRole(node);
	const tags = node.tags.join(",");
	const source = node.sourceRange
		? `${node.sourceRange.start.line}:${node.sourceRange.start.column}-${node.sourceRange.end.line}:${node.sourceRange.end.column}`
		: "";
	const card = cardTheme(node, theme);
	const frame = card ? renderCardFrame(node, card, prefix, theme.shadow.pattern ?? "solid") : "";
	const headingBackdrop =
		node.kind === "heading"
			? `<rect class="roadmap__heading-backdrop" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="${cssToken("canvas-background")}"/>`
			: "";
	return `<g id="${prefix}-${safeId(node.id)}" class="roadmap__node roadmap__node--${role}" data-roadmap-element="${role}" data-placement="${node.placement}" data-depth="${node.depth}" data-tags="${escapeXml(tags)}"${source ? ` data-sourcepos="${source}"` : ""}>${frame}${headingBackdrop}${renderText(node, theme, prefix)}${renderNodeBadges(node, theme, prefix)}</g>`;
}

function memberNodes(group: LayoutGroup, elements: readonly LayoutElement[]): LayoutNode[] {
	const memberIds = new Set(group.memberIds);
	return elements.filter((element): element is LayoutNode => {
		if (element.kind === "group" || element.kind === "legend") return false;
		return memberIds.has(element.id);
	});
}

function renderGroup(
	group: LayoutGroup,
	elements: readonly LayoutElement[],
	theme: RoadmapTheme,
	prefix: string,
): string {
	const nested = group.layout === "nested";
	const board = nested ? theme.boards.nested : theme.boards.topic;
	const members = memberNodes(group, elements);
	const enclosure = enclosingRectangle(members.length > 0 ? members : [group], board.padding);
	const path =
		board.shape === "chamfered"
			? chamferedRectanglePath(enclosure, Math.max(8, board.padding))
			: board.shape === "rounded"
				? roundedRectanglePath(enclosure, roundedBoardRadius(board))
				: board.shape === "scalloped"
					? scallopedRectanglePath(enclosure, board.padding)
					: members.length > 0
						? blobPath(members, board.padding)
						: blobPath([group], 0);
	const pattern = nested ? `${prefix}-nested-hatch` : `${prefix}-topic-hatch`;
	const bottom = Math.max(...members.map(rectBottom));
	const bottomMembers = members.filter((member) => bottom - rectBottom(member) < 1);
	const bottomCenter =
		bottomMembers.reduce((sum, member) => sum + rectCenter(member).x, 0) /
		Math.max(1, bottomMembers.length);
	const isGrid = group.layout === "grid";
	const isAsymmetricGrid = isGrid && bottomCenter > group.x + group.width * 0.65;
	const isSymmetricTopicGrid = isGrid && !isAsymmetricGrid;
	const isTreeTopicGroup = group.layout === "tree";
	const isCompactSingle = nested && members.length === 1 && group.width <= 61;
	const isNonCompactNested = nested && !isCompactSingle;
	const scaleX = isAsymmetricGrid
		? 0.988
		: isSymmetricTopicGrid
			? 0.995
			: isCompactSingle
				? 0.985
				: isNonCompactNested
					? 1.005
					: 1;
	const scaleY = isTreeTopicGroup ? 1.005 : isCompactSingle ? 0.98 : 1;
	const centerX = group.x + group.width / 2;
	const anchorX = isCompactSingle ? group.x : centerX;
	const translateX = anchorX * (1 - scaleX) + (isAsymmetricGrid ? 2.2 : 0);
	const anchorY = isTreeTopicGroup ? group.y + group.height / 2 : rectBottom(group);
	const translateY = anchorY * (1 - scaleY);
	const transform =
		board.shape === "chamfered" || board.shape === "rounded"
			? ""
			: scaleX === 1 && scaleY === 1
				? ""
				: ` transform="matrix(${scaleX} 0 0 ${scaleY} ${translateX} ${translateY})"`;
	const role = nested ? "nested" : "topic";
	const outline = boardOutline(board);
	return `<path id="${prefix}-${safeId(group.id)}" class="roadmap__group roadmap__group--${role}" data-roadmap-element="${role}-group" data-roadmap-shape="${board.shape}" data-depth="${group.depth}" d="${path}"${transform} fill="url(#${pattern})"${outline}/>`;
}

export function orthogonalConnectorPath(connector: LayoutConnector, laneOffset = 0): string {
	const middleY = (connector.from.y + connector.to.y) / 2;
	const middleX = (connector.from.x + connector.to.x) / 2 + laneOffset;
	return connector.kind === "topicToChildren"
		? `M ${connector.from.x} ${connector.from.y} L ${middleX} ${connector.from.y} L ${middleX} ${connector.to.y} L ${connector.to.x} ${connector.to.y}`
		: `M ${connector.from.x} ${connector.from.y} L ${connector.from.x} ${middleY} L ${connector.to.x} ${middleY} L ${connector.to.x} ${connector.to.y}`;
}

export function orthogonalLaneOffsets(
	connectors: readonly LayoutConnector[],
	laneSpacing: number,
	avoidX: readonly number[] = [],
): ReadonlyMap<string, number> {
	const offsets = new Map<string, number>();
	if (laneSpacing <= 0) return offsets;
	// Lanes must not run along vertical rules such as outlined board edges:
	// clearing iterates because a nudge can land within clearance of another
	// forbidden line.
	const laneClearance = 6;
	const clearedLane = (lane: number): number => {
		let value = lane;
		for (let pass = 0; pass < 4; pass += 1) {
			const hit = avoidX.find((forbidden) => Math.abs(value - forbidden) < laneClearance);
			if (hit === undefined) break;
			value = hit + (value >= hit ? laneClearance : -laneClearance);
		}
		return value;
	};
	const sides = new Map<number, LayoutConnector[]>();
	for (const connector of connectors) {
		if (connector.kind !== "topicToChildren") continue;
		const side = Math.sign(connector.to.x - connector.from.x);
		const group = sides.get(side) ?? [];
		group.push(connector);
		sides.set(side, group);
	}
	for (const [side, sideConnectors] of sides) {
		sideConnectors.sort((left, right) => left.from.x - right.from.x);
		const clusters: LayoutConnector[][] = [];
		for (const connector of sideConnectors) {
			const cluster = clusters.at(-1);
			const previous = cluster?.at(-1);
			if (!cluster || !previous || Math.abs(connector.from.x - previous.from.x) > laneSpacing * 3) {
				clusters.push([connector]);
			} else {
				cluster.push(connector);
			}
		}
		for (const cluster of clusters) {
			cluster.sort((left, right) => left.from.y - right.from.y || left.id.localeCompare(right.id));
			const sourceEdge =
				side > 0
					? Math.max(...cluster.map((connector) => connector.from.x))
					: Math.min(...cluster.map((connector) => connector.from.x));
			const targetEdge =
				side > 0
					? Math.min(...cluster.map((connector) => connector.to.x))
					: Math.max(...cluster.map((connector) => connector.to.x));
			const low = Math.min(sourceEdge, targetEdge);
			const high = Math.max(sourceEdge, targetEdge);
			const gap = high - low;
			const effectiveSpacing = Math.min(laneSpacing, gap / (cluster.length + 1));
			const laneSpan = effectiveSpacing * Math.max(0, cluster.length - 1);
			const firstLane = low + (gap - laneSpan) / 2;
			// Clearing can squeeze neighbouring lanes together, so restore a
			// minimum lane-to-lane gap before assigning offsets.
			const minLaneGap = Math.min(4, Math.max(1, effectiveSpacing));
			const lanes = cluster.map((_, index) => clearedLane(firstLane + index * effectiveSpacing));
			for (let index = 1; index < lanes.length; index += 1) {
				const previous = lanes[index - 1] ?? 0;
				if ((lanes[index] ?? 0) - previous < minLaneGap) {
					lanes[index] = clearedLane(previous + minLaneGap);
				}
			}
			for (const [index, connector] of cluster.entries()) {
				const laneX = lanes[index] ?? (connector.from.x + connector.to.x) / 2;
				const naturalMiddleX = (connector.from.x + connector.to.x) / 2;
				offsets.set(connector.id, laneX - naturalMiddleX);
			}
		}
	}
	return offsets;
}

function renderConnector(
	connector: LayoutConnector,
	theme: RoadmapTheme,
	prefix: string,
	laneOffset: number,
): string {
	const token = kebabToken(connector.kind);
	const connectorTheme = theme.connectors[connector.kind];
	const endShape = connectorTheme.endShape ?? "none";
	const trim =
		endShape !== "none" && connectorTheme.routing !== "braided"
			? connectorMarkerSize(connectorTheme.width) *
				markerAnchor(endShape, connectorTheme.endShapeJoin ?? "overlap").trimFactor
			: 0;
	const routed = trim > 0 ? trimConnectorEnd(connector, trim, connectorTheme.routing) : connector;
	// Lane offsets are solved against the untrimmed midpoint; re-anchor them
	// to the trimmed geometry so the lane stays exactly where clearing put it.
	const laneAnchorShift =
		(connector.from.x + connector.to.x) / 2 - (routed.from.x + routed.to.x) / 2;
	const path =
		connectorTheme.routing === "orthogonal"
			? orthogonalConnectorPath(routed, laneOffset + laneAnchorShift)
			: connectorTheme.routing === "straight"
				? `M ${routed.from.x} ${routed.from.y} L ${routed.to.x} ${routed.to.y}`
				: routed.kind === "topicToChildren"
					? bundledCurvePath(routed.from, routed.to)
					: verticalBumpPath(routed.from, routed.to);
	const marker =
		endShape !== "none" && connectorTheme.routing !== "braided"
			? ` marker-end="url(#${prefix}-marker-${token}-${endShape})"`
			: "";
	const attributes = `class="roadmap__connector roadmap__connector--${connector.kind}" data-roadmap-element="${connector.kind}-connector" data-depth="${connector.depth}" d="${path}" fill="none" stroke="${cssToken(`connector-${token}-color`)}" stroke-width="${cssToken(`connector-${token}-width`)}" stroke-opacity="${cssToken(`connector-${token}-opacity`)}" stroke-dasharray="${cssToken(`connector-${token}-dash`)}" stroke-dashoffset="12" stroke-linecap="round"${marker}`;
	if (connectorTheme.routing !== "braided") {
		return `<path id="${prefix}-${safeId(connector.id)}" ${attributes}/>`;
	}
	const offset = Math.max(1.5, connectorTheme.laneSpacing / 2);
	return `<g id="${prefix}-${safeId(connector.id)}" class="roadmap__connector-braid" data-roadmap-routing="braided"><path ${attributes} transform="translate(${-offset} 0)"/><path ${attributes} transform="translate(${offset} 0)"/></g>`;
}

function renderLegend(legend: LayoutLegend, theme: RoadmapTheme, prefix: string): string {
	const board = theme.boards.legend;
	const metrics = legend.metrics;
	const fontSize = metrics.fontSize * metrics.renderScale;
	const rowRectangles = legend.items.flatMap((item, row) => {
		const y = legend.y + board.padding + 2 + row * (metrics.rowHeight + metrics.rowGap);
		const labelWidth =
			measureText(item.label, fontSize, [], metrics.fontWeight, metrics.fontFamily) *
			metrics.renderScaleX;
		return [
			{
				x: legend.x + board.padding + 7,
				y,
				width: metrics.badgeCellSize + Math.max(0, item.icons.length - 1) * metrics.badgeAdvance,
				height: metrics.rowHeight,
			},
			{
				x: legend.x + board.padding + metrics.iconColumnWidth + 10,
				y,
				width: labelWidth + 11,
				height: metrics.rowHeight,
			},
		];
	});
	const path =
		board.shape === "chamfered"
			? chamferedRectanglePath(enclosingRectangle(rowRectangles, board.padding), board.padding)
			: board.shape === "rounded"
				? roundedRectanglePath(
						enclosingRectangle(rowRectangles, board.padding),
						roundedBoardRadius(board),
					)
				: board.shape === "scalloped"
					? scallopedRectanglePath(enclosingRectangle(rowRectangles, board.padding), board.padding)
					: blobPath(rowRectangles, board.padding);
	const rows = legend.items
		.map((item, row) => {
			const tagStyle = badgeStyleForTag(item.tag, theme);
			const y =
				legend.y +
				board.padding +
				2 +
				row * (metrics.rowHeight + metrics.rowGap) +
				(metrics.rowHeight - metrics.badgeSize) / 2;
			const badges = tagStyle.badges
				.map((badge, index) =>
					renderBadge(
						badge,
						legend.x + board.padding + 7 + index * metrics.badgeAdvance,
						y,
						metrics.badgeSize,
						prefix,
					),
				)
				.join("");
			const textX = legend.x + board.padding + metrics.iconColumnWidth + 14;
			const baseline = y + metrics.badgeSize * 0.77;
			const transform =
				metrics.renderScaleX === 1 && metrics.renderScaleY === 1
					? ""
					: ` transform="matrix(${metrics.renderScaleX} 0 0 ${metrics.renderScaleY} ${textX * (1 - metrics.renderScaleX)} ${baseline * (1 - metrics.renderScaleY)})"`;
			const spacing =
				metrics.letterSpacing === 0 ? "" : ` letter-spacing="${metrics.letterSpacing}"`;
			return `${badges}<text class="roadmap__legend-label" x="${textX}" y="${baseline}"${transform}${spacing} font-family="${escapeXml(metrics.fontFamily)}" font-size="${fontSize}" font-weight="${metrics.fontWeight}" font-style="${metrics.fontStyle}" fill="${cssToken("legend-text")}">${escapeXml(item.label)}</text>`;
		})
		.join("");
	const pathScaleX = 1.01;
	const pathTranslateX = Math.round((legend.x + legend.width / 2) * (1 - pathScaleX) * 100) / 100;
	const outline = boardOutline(board);
	return `<g id="${prefix}-legend" class="roadmap__legend" data-roadmap-element="legend"><path d="${path}" transform="matrix(${pathScaleX} 0 0 1 ${pathTranslateX} 1.5)" fill="url(#${prefix}-legend-hatch)" filter="url(#${prefix}-soft-shadow)"${outline}/>${rows}</g>`;
}

function renderBoardPattern(id: string, token: string, board: BoardTheme): string {
	if (board.pattern === "crosshatch") {
		return `<pattern id="${id}" data-roadmap-pattern="crosshatch" patternUnits="userSpaceOnUse" width="10" height="10"><rect width="10" height="10" fill="${cssToken(`${token}-board-background`)}"/><path d="M 0 7.5 L 10 2.5 M 0 2.5 L 10 -2.5 M 0 12.5 L 10 7.5" fill="none" stroke="${cssToken(`${token}-board-hatch`)}" stroke-opacity="${cssToken(`${token}-board-hatch-opacity`)}" stroke-width="${cssToken("board-hatch-stroke-width")}" stroke-linecap="square"/><path d="M -2.5 0 L 2.5 10 M 2.5 0 L 7.5 10 M 7.5 0 L 12.5 10" fill="none" stroke="${cssToken(`${token}-board-hatch`)}" stroke-opacity="${cssToken(`${token}-board-hatch-opacity`)}" stroke-width="${cssToken("board-hatch-stroke-width")}" stroke-linecap="square"/></pattern>`;
	}
	const background = `<rect width="12" height="12" fill="${cssToken(`${token}-board-background`)}"/>`;
	const paint = `stroke="${cssToken(`${token}-board-hatch`)}" stroke-opacity="${cssToken(`${token}-board-hatch-opacity`)}" stroke-width="${cssToken("board-hatch-stroke-width")}"`;
	let decoration = "";
	if (board.pattern === "grid") {
		decoration = `<path d="M 0 0 H 12 M 0 0 V 12" fill="none" ${paint}/>`;
	} else if (board.pattern === "dots") {
		decoration = `<circle cx="6" cy="6" r="1.25" fill="${cssToken(`${token}-board-hatch`)}" fill-opacity="${cssToken(`${token}-board-hatch-opacity`)}"/>`;
	} else if (board.pattern === "halftone") {
		decoration = `<g fill="${cssToken(`${token}-board-hatch`)}" fill-opacity="${cssToken(`${token}-board-hatch-opacity`)}"><circle cx="3" cy="3" r="1.7"/><circle cx="9" cy="9" r="1.7"/><circle cx="9" cy="3" r="0.9"/><circle cx="3" cy="9" r="0.9"/></g>`;
	} else if (board.pattern === "waves") {
		decoration = `<path d="M 0 3.5 Q 3 0.5 6 3.5 T 12 3.5 M 0 9.5 Q 3 6.5 6 9.5 T 12 9.5" fill="none" ${paint} stroke-linecap="round"/>`;
	} else if (board.pattern === "lace") {
		decoration = `<path d="M -4 7 Q 0 1 4 7 T 12 7 T 20 7" fill="none" ${paint}/><circle cx="4" cy="7" r="1.15" fill="${cssToken(`${token}-board-hatch`)}" fill-opacity="${cssToken(`${token}-board-hatch-opacity`)}"/>`;
	} else if (board.pattern === "floral-lace") {
		return `<pattern id="${id}" data-roadmap-pattern="floral-lace" patternUnits="userSpaceOnUse" width="18" height="18"><rect width="18" height="18" fill="${cssToken(`${token}-board-background`)}"/><path d="M 9 0 L 18 9 L 9 18 L 0 9 Z" fill="none" ${paint}/><g fill="${cssToken(`${token}-board-hatch`)}" fill-opacity="${cssToken(`${token}-board-hatch-opacity`)}"><ellipse cx="9" cy="6.4" rx="1.15" ry="2.1"/><ellipse cx="11.6" cy="9" rx="2.1" ry="1.15"/><ellipse cx="9" cy="11.6" rx="1.15" ry="2.1"/><ellipse cx="6.4" cy="9" rx="2.1" ry="1.15"/><circle cx="9" cy="9" r="1.05"/></g></pattern>`;
	} else if (board.pattern === "pearls") {
		return `<pattern id="${id}" data-roadmap-pattern="pearls" patternUnits="userSpaceOnUse" width="16" height="16"><rect width="16" height="16" fill="${cssToken(`${token}-board-background`)}"/><path d="M -4 4 Q 0 11 4 4 T 12 4 T 20 4" fill="none" ${paint}/><g fill="${cssToken(`${token}-board-hatch`)}" fill-opacity="${cssToken(`${token}-board-hatch-opacity`)}"><circle cx="0" cy="4" r="1.25"/><circle cx="4" cy="8" r="1.05"/><circle cx="8" cy="4" r="1.25"/><circle cx="12" cy="8" r="1.05"/><circle cx="16" cy="4" r="1.25"/></g></pattern>`;
	} else if (board.pattern === "bows") {
		return `<pattern id="${id}" data-roadmap-pattern="bows" patternUnits="userSpaceOnUse" width="24" height="18"><rect width="24" height="18" fill="${cssToken(`${token}-board-background`)}"/><path d="M 12 8 C 7 3 3 5 5 9 C 7 12 10 10 12 8 C 14 10 17 12 19 9 C 21 5 17 3 12 8 Z M 11 9 L 8 15 L 12 12 L 16 15 L 13 9" fill="none" ${paint}/><circle cx="12" cy="8.5" r="1.35" fill="${cssToken(`${token}-board-hatch`)}" fill-opacity="${cssToken(`${token}-board-hatch-opacity`)}"/></pattern>`;
	}
	return `<pattern id="${id}" data-roadmap-pattern="${board.pattern}" patternUnits="userSpaceOnUse" width="12" height="12">${background}${decoration}</pattern>`;
}

function renderDefinitions(prefix: string, theme: RoadmapTheme): string {
	const symbol = (id: string, viewBox: string, content: string): string =>
		`<symbol id="${prefix}-icon-${id}" viewBox="${viewBox}">${content}</symbol>`;
	const emojiSymbol = (id: string, viewBox: string, content: string): string =>
		`<symbol id="${prefix}-emoji-${id}" viewBox="${viewBox}">${content}</symbol>`;
	return `<defs>
		<linearGradient id="${prefix}-chapter-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cssToken("chapter-gradient-start")}"/><stop offset="0.7" stop-color="${cssToken("chapter-gradient-end")}"/><stop offset="1" stop-color="${cssToken("chapter-gradient-end")}"/></linearGradient>
		<linearGradient id="${prefix}-topic-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cssToken("topic-header-gradient-start")}"/><stop offset="0.7" stop-color="${cssToken("topic-header-gradient-end")}"/><stop offset="1" stop-color="${cssToken("topic-header-gradient-end")}"/></linearGradient>
		${
			theme.shadow.pattern === "halftone"
				? `<pattern id="${prefix}-shadow-halftone" patternUnits="userSpaceOnUse" width="2" height="2"><rect width="1" height="1" fill="${cssToken("shadow-color")}"/><rect x="1" y="1" width="1" height="1" fill="${cssToken("shadow-color")}"/></pattern>`
				: ""
		}
		${renderBoardPattern(`${prefix}-topic-hatch`, "topic", theme.boards.topic)}
		${renderBoardPattern(`${prefix}-nested-hatch`, "nested-topic", theme.boards.nested)}
		${renderBoardPattern(`${prefix}-legend-hatch`, "legend", theme.boards.legend)}
		${patternedCards(theme)
			.map(([token, card]) =>
				renderBoardPattern(`${prefix}-${token}-hatch`, token, {
					...theme.boards.topic,
					pattern: card.pattern ?? "none",
				}),
			)
			.join("\n\t\t")}
		${gradientCards(theme)
			.map(
				([token]) =>
					`<linearGradient id="${prefix}-${token}-card-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cssToken(`${token}-card-gradient-start`)}"/><stop offset="1" stop-color="${cssToken(`${token}-card-gradient-end`)}"/></linearGradient>`,
			)
			.join("\n\t\t")}
		${Object.entries(theme.connectors)
			.map(([kind, connector]) => {
				const endShape = connector.endShape ?? "none";
				if (endShape === "none" || connector.routing === "braided") return "";
				const token = kebabToken(kind);
				const paint = `fill="${cssToken(`connector-${token}-color`)}" fill-opacity="${cssToken(`connector-${token}-opacity`)}"`;
				// The ring is filled with the canvas color so the connector line
				// underneath does not show through its center.
				const outline = `fill="${cssToken("canvas-background")}" stroke="${cssToken(`connector-${token}-color`)}" stroke-opacity="${cssToken(`connector-${token}-opacity`)}" stroke-width="1.6"`;
				const content =
					endShape === "arrow"
						? `<path d="M 0 0 L 8 5 L 0 10 Z" ${paint}/>`
						: endShape === "diamond"
							? `<path d="M 5 1 L 9 5 L 5 9 L 1 5 Z" ${paint}/>`
							: endShape === "circle"
								? `<circle cx="5" cy="5" r="3" ${outline}/>`
								: `<circle cx="5" cy="5" r="3.2" ${paint}/>`;
				// userSpaceOnUse keeps end shapes legible on hairline connectors,
				// scaled from the stroke width with a floor. The reference point
				// sits at the leading edge of each shape so markers rest against
				// the target instead of straddling its edge, where boards and
				// badges would occlude half of them.
				const size = connectorMarkerSize(connector.width);
				// Anchoring depends on the join mode: overlapped markers cover
				// the stroke's round cap with their body, detached markers sit
				// wholly ahead of the trimmed stroke.
				const { refX } = markerAnchor(endShape, connector.endShapeJoin ?? "overlap");
				return `<marker id="${prefix}-marker-${token}-${endShape}" viewBox="0 0 10 10" refX="${refX}" refY="5" markerWidth="${size}" markerHeight="${size}" markerUnits="userSpaceOnUse" orient="auto-start-reverse">${content}</marker>`;
			})
			.filter(Boolean)
			.join("\n\t\t")}
		<filter id="${prefix}-soft-shadow" x="-30%" y="-30%" width="180%" height="180%"><feGaussianBlur in="SourceGraphic" stdDeviation="${cssToken("soft-shadow-blur")}" result="soft-offset"/><feOffset in="soft-offset" dx="${cssToken("soft-shadow-offset-x")}" dy="${cssToken("soft-shadow-offset-y")}" result="soft-offset"/><feColorMatrix type="saturate" in="soft-offset" values="${cssToken("soft-shadow-saturation")}"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
		${symbol("check", "0 0 512 512", '<circle cx="50%" cy="50%" r="40%" fill="currentColor"/><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM369 209 241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/>')}
		${symbol("heart", "0 0 64 64", '<circle cx="32" cy="32" r="32"/><path fill="#231f20" d="M50 31c-.1-5.5-4.6-10.4-10.1-10.4-3.2 0-6 1.7-7.9 4.1-1.9-2.5-4.7-4.1-7.9-4.1-5.5 0-10 4.9-10.1 10.4v.6c.5 14.1 17.8 19.8 17.8 19.8S49.4 45.7 50 31.6V31z" opacity=".2"/><path fill="currentColor" d="M50 29c-.1-5.5-4.6-10.4-10.1-10.4-3.2 0-6 1.7-7.9 4.1-1.9-2.5-4.7-4.1-7.9-4.1-5.5 0-10 4.9-10.1 10.4v.6c.5 14.1 17.8 19.8 17.8 19.8S49.4 43.7 50 29.6V29z"/>')}
		${symbol("star", "0 0 64 64", '<circle cx="32" cy="32" r="32"/><path fill="#231f20" d="M52.9 28.1c-.3-1-1.1-1.6-2.1-1.8l-11.3-1.6-5.1-10.3c-.4-.9-1.4-1.5-2.4-1.5s-1.9.6-2.4 1.5l-5.1 10.3-11.3 1.6c-1 .1-1.8.8-2.1 1.8s-.1 2 .7 2.7l8.2 8L18.1 50c-.2 1 .2 2 1 2.6.5.3 1 .5 1.5.5.4 0 .8-.1 1.2-.3L32 47.5l10.1 5.3c.4.2.8.3 1.2.3.5 0 1.1-.2 1.5-.5.8-.6 1.2-1.6 1-2.6L44 38.7l8.2-8c.7-.6 1-1.7.7-2.6z" opacity=".2"/><path fill="currentColor" d="M52.9 26.1c-.3-1-1.1-1.6-2.1-1.8l-11.3-1.6-5.1-10.3c-.4-.9-1.4-1.5-2.4-1.5s-1.9.6-2.4 1.5l-5.1 10.3-11.3 1.6c-1 .1-1.8.8-2.1 1.8s-.1 2 .7 2.7l8.2 8L18.1 48c-.2 1 .2 2 1 2.6.5.3 1 .5 1.5.5.4 0 .8-.1 1.2-.3L32 45.5l10.1 5.3c.4.2.8.3 1.2.3.5 0 1.1-.2 1.5-.5.8-.6 1.2-1.6 1-2.6L44 36.7l8.2-8c.7-.6 1-1.7.7-2.6z"/>')}
		${symbol("x", "0 0 512 512", '<circle cx="50%" cy="50%" r="40%" fill="currentColor"/><path d="M256 0C113.6 0 0 113.6 0 256s113.6 256 256 256 256-113.6 256-256S398.4 0 256 0zm128.5 348.2-35.4 35.4-93.1-92.2-92.2 92.2-36.3-35.4 92.2-92.2-92.2-92.2 36.3-35.4 92.2 92.2 92.2-92.2 35.4 35.4-92.2 92.2z"/>')}
		${symbol("question", "0 0 416.979 416.979", '<circle cx="50%" cy="50%" r="40%" fill="currentColor"/><path d="M356.004 61.156C274.634-20.314 142.627-20.395 61.156 60.974c-81.47 81.371-81.552 213.379-.181 294.85 81.369 81.47 213.378 81.551 294.849.181 81.469-81.369 81.551-213.379.18-294.849zM208.554 334.794c-11.028 0-19.968-8.939-19.968-19.968s8.939-19.969 19.968-19.969 19.968 8.939 19.968 19.969c-.001 11.028-8.94 19.968-19.968 19.968zm32.464-120.228c-11.406 6.668-12.381 14.871-12.43 38.508l-.017 4.726c-.071 11.172-9.147 20.18-20.304 20.18h-.131c-11.215-.071-20.248-9.22-20.178-20.436l.016-4.552c.05-24.293.111-54.524 32.547-73.484 26.026-15.214 29.306-25.208 26.254-38.322-3.586-15.404-17.653-19.396-28.63-18.141-3.686.423-22.069 3.456-22.069 21.642 0 11.213-9.092 20.306-20.307 20.306s-20.306-9.093-20.306-20.306c0-32.574 23.87-58.065 58.048-61.989 35.2-4.038 65.125 16.226 72.816 49.282 11.497 49.381-29.772 73.505-45.309 82.586z"/>')}
		${symbol("cloud", "0 0 64 64", '<circle cx="32" cy="32" r="32"/><path fill="#231f20" opacity=".2" d="M48 32c0-8.8-7.2-16-16-16-7.5 0-13.8 5.2-15.5 12.1C11.7 28.9 8 33 8 38c0 5.5 4.5 10 10 10h30c4.4 0 8-3.6 8-8s-3.6-8-8-8z"/><path fill="currentColor" d="M48 30c0-8.8-7.2-16-16-16-7.5 0-13.8 5.2-15.5 12.1C11.7 26.9 8 31 8 36c0 5.5 4.5 10 10 10h30c4.4 0 8-3.6 8-8s-3.6-8-8-8z"/>')}
		${symbol("warning", "0 0 24 24", '<path d="M12 2.25 22 20.75H2z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><path d="M12 7v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1" fill="currentColor"/>')}
		${emojiSymbol("soap", "0 0 24 24", '<path fill="#ea5a6e" d="M4.5 7.8A3.8 3.8 0 0 1 8.3 4h7.4a3.8 3.8 0 0 1 3.8 3.8v9.5c0 1.1-.5 2.1-1.4 2.7l-3 2.2c-.6.5-1.4.7-2.2.7H8.3a3.8 3.8 0 0 1-3.8-3.8Z"/><path fill="#f4abba" d="M4.5 15.4c0 2.7 2.2 4.9 4.9 4.9h3.5c.8 0 1.6-.3 2.2-.7l4.4-3.2v1c0 1.1-.5 2-1.4 2.6l-3 2.2c-.6.5-1.4.7-2.2.7H8.3a3.8 3.8 0 0 1-3.8-3.8Z"/><path fill="#ffccd6" d="M5.2 7.7a3 3 0 0 1 3-3h7.5a3 3 0 0 1 3 3v7.5c0 1-.5 1.9-1.3 2.5l-2.8 2c-.5.4-1.2.6-1.9.6H9a3.8 3.8 0 0 1-3.8-3.8Z"/><g fill="#f5f8fa" stroke="#dae2e6" stroke-width=".55"><circle cx="3.5" cy="4.7" r="1.7"/><circle cx="6.7" cy="3.2" r="2"/><circle cx="9.3" cy="5.1" r="2.2"/><circle cx="6" cy="8.1" r="2.1"/><circle cx="19.4" cy="16.5" r="1.8"/><circle cx="21.1" cy="19.2" r="1.7"/><circle cx="18.2" cy="21.1" r="1.5"/></g>')}
		${emojiSymbol("boom", "0 0 14 14", '<path fill="#e09ba1" d="M6.2 0 8 3.2l2.5-2 .1 3.4 3.4-.2-2.7 2.4 2.6 2-3.6.1.8 4.8-3-3.2L7 14l-1.3-3.6-2.4 2 .7-3.5-4 .3 3.2-2.4L.1 5l4.2.2-1.2-4L6 4.1Z"/><path fill="#bb1934" d="m6 2 1.2 3 2-2-.3 2.9 3-.2-2.1 1.6 2.1 1.5-3 .1.5 3-2.1-2L6 12l-1-2.7-2 1.5.7-2.7-3 .3L3.3 7 1.5 5.8l3 .1L4 3.2l2 2Z"/><path fill="#fcab40" d="m4.2 5.2 2.7-.8 2.8 1.1 1 2.8-1.8 2.3H5.6L3.7 8.5Z"/><path fill="#fff" d="M6.4 5.5h1.5v3.8H6.4z"/>')}
		${emojiSymbol("beginner", "0 0 11 14", '<path fill="#cfd1dd" d="M0 1.2 1.5 0l4 3.4L9.5 0 11 1.2v8.4L5.5 14 0 9.6Z"/><path fill="#63898f" d="M1 1 5.5 4.8 10 1v8.1l-4.5 3.8L1 9.1Z"/><path fill="#fffe87" d="M1.8 2.1 5 4.9v6.4L1.8 8.6Z"/><path fill="#48ded4" d="m9.2 2.1-3.2 2.8v6.4l3.2-2.7Z"/>')}
		${emojiSymbol("one", "0 0 18 18", '<rect x=".5" y=".5" width="17" height="17" rx="2.2" fill="#3a88c3" stroke="#adc8dd"/><path fill="#fff" d="M8 4 5.7 5.5v2.1l2-1.2V14h2.4V4Z"/>')}
		${emojiSymbol("two", "0 0 18 18", '<rect x=".5" y=".5" width="17" height="17" rx="2.2" fill="#3a88c3" stroke="#adc8dd"/><path fill="#fff" d="M5.2 7.1c.1-2 1.4-3.2 3.5-3.2s3.5 1.2 3.5 3c0 1.3-.7 2.3-2.5 3.6l-1.9 1.4h4.6V14H5.1v-1.8l3.3-2.5c1.2-.9 1.6-1.5 1.6-2.3 0-.9-.5-1.5-1.4-1.5s-1.4.6-1.5 1.5Z"/>')}
		${emojiSymbol("three", "0 0 18 18", '<rect x=".5" y=".5" width="17" height="17" rx="2.2" fill="#3a88c3" stroke="#adc8dd"/><path fill="#fff" d="M7 7.9h1.4c1 0 1.6-.4 1.6-1.1s-.6-1.1-1.5-1.1S7 6.2 7 7H5c.1-1.9 1.5-3.1 3.6-3.1 2.2 0 3.5 1.1 3.5 2.8 0 1-.6 1.8-1.6 2.1 1.2.3 1.9 1.2 1.9 2.4 0 1.9-1.5 3.1-3.8 3.1S5 13.1 4.9 11.1H7c.1.9.7 1.4 1.7 1.4s1.6-.5 1.6-1.3-.7-1.3-1.8-1.3H7Z"/>')}
		${emojiSymbol("recycle", "0 0 24 24", '<g fill="none" stroke="#4f8a3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 7.196 9.5 3.1 10.598"/><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/><path d="m13.378 9.633 4.096 1.098 1.097-4.096"/></g>')}
		${emojiSymbol("telescope", "0 0 12 12", '<path fill="#e7eaed" d="M4.2 5.1h2.9v2.1H4.2z"/><path fill="#9aaab4" d="M4.7 6.3h1.8l-.2 1.6 3.1 3H7.5L5.6 9.4 4.1 12H2.3l2.4-4Z"/><path fill="#282f33" d="m.1 1.2 2.7 1.4-1.2 2.2L0 4Z"/><path fill="#da2f47" d="m2.2 2 1.1-2 8.3 4.7-1.1 2Z"/><path fill="#e5707b" d="m2.7 1.1.6-1.1 8.3 4.7-.5.9Z"/><path fill="#9d0d26" d="m10.1 3.9 1.5.8-1.1 2-1.5-.8Z"/>')}
		${Object.entries(twemojiArtwork)
			.map(([id, artwork]) => emojiSymbol(id, artwork.viewBox, artwork.content))
			.join("\n\t\t")}
	</defs>`;
}

function baseStyles(): string {
	return `.roadmap__node,.roadmap__group,.roadmap__legend{vector-effect:non-scaling-stroke}
	.roadmap__background-artifacts{pointer-events:none}
	.roadmap__background-artifact{opacity:var(--roadmap-background-artifact-opacity,1)}
	.roadmap__background-artifact *{vector-effect:non-scaling-stroke}
	.roadmap__frame-shadow{transform:translate(var(--roadmap-shadow-offset-x),var(--roadmap-shadow-offset-y));pointer-events:none}
	.roadmap__text text{dominant-baseline:auto}
	.roadmap__link{text-decoration:none}
	.roadmap__inline--abbreviation-indicator{cursor:help}
	.roadmap[data-roadmap-theme="rose"] .roadmap__inline--highlight{text-decoration-line:underline;text-decoration-color:var(--roadmap-inline-highlight-background);text-decoration-thickness:.96em;text-underline-offset:-.4em;text-decoration-skip-ink:none}
	.roadmap[data-roadmap-theme="rose"] .roadmap__inline--insert{text-decoration-line:underline;text-decoration-color:var(--roadmap-inline-insert-underline);text-decoration-thickness:.09em;text-underline-offset:.12em;text-decoration-skip-ink:none}
	.roadmap__node--heading .roadmap__frame{display:none}`;
}

const artifactMotionVariants = 4;

interface MotionHarmonic {
	readonly amplitude: number;
	readonly frequency: number;
	readonly phase: number;
}

interface MotionAxes {
	readonly x: readonly MotionHarmonic[];
	readonly y: readonly MotionHarmonic[];
	readonly rotate: readonly MotionHarmonic[];
	readonly scale: readonly MotionHarmonic[];
}

/**
 * The wandering-motion harmonic tables are constants: each axis layers two
 * sine harmonics with integer frequencies (so the loop closes seamlessly)
 * whose amplitudes and phases come from fixed seeds. Layering keeps the drift
 * from ever reading as a pendulum.
 */
const artifactMotionAxes: readonly MotionAxes[] = Array.from(
	{ length: artifactMotionVariants },
	(_, variant) => {
		const random = createSeededRandom(`artifact-motion:${variant}`);
		const harmonic = (base: number, spread: number, frequency: number): MotionHarmonic => ({
			amplitude: base + random() * spread,
			frequency,
			phase: random(),
		});
		return {
			x: [harmonic(1.4, 1.4, 1), harmonic(0.5, 0.9, 3)],
			y: [harmonic(2, 1.8, 1), harmonic(0.8, 1, 2)],
			rotate: [harmonic(1.8, 2, 1), harmonic(0.9, 1.1, 2)],
			scale: [harmonic(0.022, 0.02, 1), harmonic(0.009, 0.011, 3)],
		};
	},
);

/**
 * Samples the harmonic tables into shared CSS keyframe variants; twelve
 * linear steps preserve the curve without per-artifact keyframe bloat.
 */
function artifactMotionKeyframes(intensity: number): string {
	const steps = 12;
	const sample = (harmonics: readonly MotionHarmonic[], t: number): number =>
		harmonics.reduce(
			(sum, harmonic) =>
				sum +
				harmonic.amplitude * Math.sin(2 * Math.PI * (harmonic.frequency * t + harmonic.phase)),
			0,
		);
	const round = (value: number): number => Math.round(value * 100) / 100;
	return artifactMotionAxes
		.map((axes, variant) => {
			const stops: string[] = [];
			for (let step = 0; step <= steps; step += 1) {
				const t = step / steps;
				const x = (sample(axes.x, t) * intensity).toFixed(2);
				const y = (sample(axes.y, t) * intensity).toFixed(2);
				const rotate = (sample(axes.rotate, t) * intensity).toFixed(2);
				const scale = (1 + sample(axes.scale, t) * intensity).toFixed(3);
				stops.push(
					`${round(t * 100)}%{transform:translate(${x}px,${y}px) rotate(${rotate}deg) scale(${scale})}`,
				);
			}
			return `@keyframes roadmap-artifact-drift-${variant}{${stops.join("")}}`;
		})
		.join("\n\t");
}

function renderBackgroundArtifact(
	artifact: LayoutBackgroundArtifact,
	prefix: string,
	animated = false,
): string {
	const shapes = artifact.shapes
		.map((shape) => {
			const blink =
				animated && shape.animation === "blink" ? ` class="roadmap__artifact-blink"` : "";
			const paint = `${blink}${shape.fill ? ` fill="${escapeXml(shape.fill)}"` : ""}${shape.stroke ? ` stroke="${escapeXml(shape.stroke)}"` : ""}${shape.strokeWidth === undefined ? "" : ` stroke-width="${shape.strokeWidth}"`}`;
			return shape.kind === "circle"
				? `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.radius}"${paint}/>`
				: `<path d="${escapeXml(shape.d)}"${paint}/>`;
		})
		.join("");
	const transform = artifact.transform ? ` transform="${escapeXml(artifact.transform)}"` : "";
	// Motion lives on an inner group so the artifact's placement transform is
	// untouched; the variant, tempo, and phase derive from the artifact id to
	// stay deterministic.
	const seed = Number.parseInt(hashString(artifact.id), 36) >>> 0;
	const content = animated
		? `<g class="roadmap__background-artifact-motion" style="animation-name:roadmap-artifact-drift-${seed % artifactMotionVariants};animation-duration:${(7 + (seed % 50) / 10).toFixed(1)}s;animation-delay:-${((seed >>> 4) % 90) / 10}s">${shapes}</g>`
		: shapes;
	return `<g id="${prefix}-${safeId(artifact.id)}" class="roadmap__background-artifact"${transform}>${content}</g>`;
}

export function renderRoadmapSvg(
	layout: RoadmapLayout,
	theme: RoadmapTheme,
	options: RoadmapRenderOptions = {},
): string {
	const title = options.title ?? layout.title;
	const description =
		options.description ?? `A visual roadmap with topic depth ${layout.maxDepth}.`;
	const prefix = safeId(options.idPrefix ?? defaultIdPrefix(layout, theme, title, description));
	const titleId = `${prefix}-title`;
	const descriptionId = `${prefix}-description`;
	const className = ["roadmap", options.className].filter(Boolean).join(" ");
	const sortedConnectors = [...layout.connectors].sort((left, right) => {
		const order = { spine: 0, chapterToTopics: 1, topicToChildren: 2 } as const;
		return order[left.kind] - order[right.kind];
	});
	const boardEdges = layout.elements
		.filter((element) => element.kind === "group")
		.flatMap((group) => [group.x, group.x + group.width]);
	const laneOffsets = orthogonalLaneOffsets(
		sortedConnectors,
		theme.connectors.topicToChildren.laneSpacing,
		boardEdges,
	);
	const renderedConnector = (connector: LayoutConnector): string =>
		renderConnector(connector, theme, prefix, laneOffsets.get(connector.id) ?? 0);
	// Spine and chapter connectors stay under the boards; topic-to-children
	// links paint above them so they visibly reach their parent topic card.
	const underlayConnectors = sortedConnectors
		.filter((connector) => connector.kind !== "topicToChildren")
		.map(renderedConnector)
		.join("");
	const overlayConnectors = sortedConnectors
		.filter((connector) => connector.kind === "topicToChildren")
		.map(renderedConnector)
		.join("");
	const rawIntensity =
		typeof options.animatedBackground === "number"
			? options.animatedBackground
			: options.animatedBackground
				? 1
				: 0;
	const intensity = Math.min(4, Math.max(0, rawIntensity));
	const animatedBackground = intensity > 0 && layout.backgroundArtifacts.length > 0;
	const backgroundArtifacts = layout.backgroundArtifacts
		.map((artifact) => renderBackgroundArtifact(artifact, prefix, animatedBackground))
		.join("");
	const animationStyles = animatedBackground
		? `\n\t.roadmap__background-artifact-motion{animation-timing-function:linear;animation-iteration-count:infinite}
	.roadmap__artifact-blink{animation:roadmap-artifact-blink 1.1s linear infinite}
	${artifactMotionKeyframes(intensity)}
	@keyframes roadmap-artifact-blink{0%,49%{opacity:1}50%,99%{opacity:0}100%{opacity:1}}
	@media (prefers-reduced-motion:reduce){.roadmap__background-artifact-motion,.roadmap__artifact-blink{animation:none}}`
		: "";
	const groups = layout.elements
		.filter((element): element is LayoutGroup => element.kind === "group")
		.map((group) => renderGroup(group, layout.elements, theme, prefix))
		.join("");
	const nodes = layout.elements
		.filter(
			(element): element is LayoutNode => element.kind !== "group" && element.kind !== "legend",
		)
		.map((node) => renderNode(node, theme, prefix))
		.join("");
	const legends = layout.elements
		.filter((element): element is LayoutLegend => element.kind === "legend")
		.map((legend) => renderLegend(legend, theme, prefix))
		.join("");
	const responsiveStyle = options.responsive === false ? "" : ' style="max-width:100%;height:auto"';
	const userCss = options.css ? `\n${escapeStyleText(options.css)}` : "";

	return `<svg xmlns="http://www.w3.org/2000/svg" class="${escapeXml(className)}" data-roadmap-instance="${prefix}" data-roadmap-theme="${escapeXml(theme.name)}" data-roadmap-mode="${theme.mode}" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="xMidYMin meet" role="img" aria-labelledby="${titleId} ${descriptionId}"${responsiveStyle}>
	<title id="${titleId}">${escapeXml(title)}</title>
	<desc id="${descriptionId}">${escapeXml(description)}</desc>
	<style>${themeCssVariables(theme, prefix)}${baseStyles()}${animationStyles}${userCss}</style>
	${renderDefinitions(prefix, theme)}
	<rect class="roadmap__canvas" data-roadmap-element="canvas" x="0" y="0" width="${layout.width}" height="${layout.height}" fill="${cssToken("canvas-background")}"/>
	<g class="roadmap__background-artifacts" aria-hidden="true">${backgroundArtifacts}</g>
	<g class="roadmap__connectors">${underlayConnectors}</g>
	<g class="roadmap__groups">${groups}</g>
	<g class="roadmap__connectors roadmap__connectors--children">${overlayConnectors}</g>
	<g class="roadmap__nodes">${nodes}</g>
	<g class="roadmap__legends">${legends}</g>
</svg>`;
}
