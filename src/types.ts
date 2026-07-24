import type { ComrakOptions, InitInput } from "comrak-wasm";

export interface SourcePoint {
	readonly line: number;
	readonly column: number;
}

export interface SourceRange {
	readonly start: SourcePoint;
	readonly end: SourcePoint;
}

export interface TextInline {
	readonly type: "text";
	readonly value: string;
}

export interface CodeInline {
	readonly type: "code";
	readonly value: string;
}

export interface ContainerInline {
	readonly type:
		| "strong"
		| "emphasis"
		| "emoji"
		| "strikethrough"
		| "insert"
		| "highlight"
		| "superscript"
		| "subscript";
	readonly children: readonly InlineNode[];
	readonly shortcode?: string;
}

export interface LinkInline {
	readonly type: "link";
	readonly destination: string;
	readonly title?: string;
	readonly children: readonly InlineNode[];
}

export interface AbbreviationInline {
	readonly type: "abbreviation";
	readonly title: string;
	readonly children: readonly InlineNode[];
}

export interface BreakInline {
	readonly type: "softBreak" | "lineBreak";
}

export interface FootnoteReferenceInline {
	readonly type: "footnoteReference";
	readonly label: string;
}

export type InlineNode =
	| TextInline
	| CodeInline
	| ContainerInline
	| LinkInline
	| AbbreviationInline
	| BreakInline
	| FootnoteReferenceInline;

export interface RoadmapHeading {
	readonly type: "heading";
	readonly id: string;
	readonly level: number;
	readonly content: readonly InlineNode[];
	readonly sourceRange?: SourceRange;
}

export interface RoadmapNote {
	readonly type: "note";
	readonly id: string;
	readonly content: readonly InlineNode[];
	readonly sourceRange?: SourceRange;
}

export interface RoadmapTopic {
	readonly type: "topic";
	readonly id: string;
	readonly depth: number;
	readonly marker: "*" | "+" | "-" | "ordered";
	readonly content: readonly InlineNode[];
	readonly description: readonly InlineNode[];
	readonly tags: readonly string[];
	readonly children: readonly RoadmapTopic[];
	readonly sourceRange?: SourceRange;
}

export interface RoadmapTopicGroup {
	readonly id: string;
	readonly layout: "grid" | "tree";
	readonly topics: readonly RoadmapTopic[];
}

export interface RoadmapChapter {
	readonly type: "chapter";
	readonly id: string;
	readonly content: readonly InlineNode[];
	readonly description: readonly InlineNode[];
	readonly tags: readonly string[];
	readonly groups: readonly RoadmapTopicGroup[];
	readonly sourceRange?: SourceRange;
}

export type RoadmapStep = RoadmapHeading | RoadmapNote | RoadmapChapter;

export interface FootnoteDefinition {
	readonly label: string;
	readonly content: readonly InlineNode[];
}

export type RoadmapColorMode = "light" | "dark";

export interface RoadmapThemeSettings {
	readonly preset: string;
	readonly mode?: RoadmapColorMode;
}

export interface RoadmapBackgroundSettings {
	readonly enabled: boolean;
	readonly seed: string;
	readonly density: number;
	readonly size: number;
	/**
	 * Animate the artifacts with a deterministic drift loop. `true` uses the
	 * default intensity of `1`; a number from `0` to `4` scales the motion.
	 */
	readonly animated?: boolean | number;
}

export interface RoadmapSettings {
	readonly theme: RoadmapThemeSettings;
	readonly background: RoadmapBackgroundSettings;
}

export interface RoadmapDocument {
	readonly type: "roadmap";
	readonly source: string;
	readonly settings: RoadmapSettings;
	readonly steps: readonly RoadmapStep[];
	readonly abbreviations: Readonly<Record<string, string>>;
	readonly footnotes: readonly FootnoteDefinition[];
	readonly stats: {
		readonly chapters: number;
		readonly topics: number;
		readonly maxDepth: number;
	};
}

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export type LayoutElementKind = "heading" | "note" | "chapter" | "topic" | "group" | "legend";

export interface TextLineSegment {
	readonly text: string;
	readonly width: number;
	readonly marks: readonly InlineMark[];
	readonly destination?: string;
	readonly linkTitle?: string;
	readonly abbreviation?: string;
	readonly abbreviationIndicator?: boolean;
	readonly shortcode?: string;
}

export interface TextLine {
	readonly width: number;
	readonly segments: readonly TextLineSegment[];
}

export type InlineMark =
	| "strong"
	| "emphasis"
	| "emoji"
	| "strikethrough"
	| "insert"
	| "highlight"
	| "code"
	| "superscript"
	| "subscript";

export interface LayoutText {
	readonly lines: readonly TextLine[];
	readonly fontSize: number;
	readonly lineHeight: number;
	readonly fontFamily: string;
	readonly fontWeight: number;
	readonly fontStyle: "normal" | "italic";
	readonly color: string;
	readonly renderScale: number;
	readonly renderScaleX?: number;
	readonly renderScaleY?: number;
	readonly baselineRatio: number;
	readonly abbreviationIndicatorSize: number;
}

export type LayoutNodeRole =
	| "heading"
	| "floating-note"
	| "chapter"
	| "chapter-description"
	| "topic-header"
	| "topic"
	| "nested-topic";

export interface LayoutNode extends Rect {
	readonly kind: "heading" | "note" | "chapter" | "topic";
	readonly role: LayoutNodeRole;
	readonly placement:
		| "standalone"
		| "floating-note"
		| "chapter"
		| "grid-description"
		| "tree-description"
		| "grid-topic"
		| "tree-topic"
		| "nested-topic";
	readonly id: string;
	readonly depth: number;
	readonly text: LayoutText;
	readonly tags: readonly string[];
	readonly sourceRange?: SourceRange;
}

export interface LayoutGroup extends Rect {
	readonly kind: "group";
	readonly id: string;
	readonly depth: number;
	readonly layout: "grid" | "tree" | "nested";
	readonly memberIds: readonly string[];
}

export interface LayoutLegendItem {
	readonly tag: string;
	readonly label: string;
	readonly icons: readonly BadgeIcon[];
}

export interface LayoutLegendMetrics {
	readonly letterSpacing: number;
	readonly rowHeight: number;
	readonly rowGap: number;
	readonly badgeSize: number;
	readonly badgeCellSize: number;
	readonly badgeAdvance: number;
	readonly iconColumnWidth: number;
	readonly color: string;
	readonly fontFamily: string;
	readonly fontSize: number;
	readonly fontWeight: number;
	readonly fontStyle: "normal" | "italic";
	readonly renderScale: number;
	readonly renderScaleX: number;
	readonly renderScaleY: number;
}

export interface LayoutLegend extends Rect {
	readonly kind: "legend";
	readonly id: string;
	readonly items: readonly LayoutLegendItem[];
	readonly metrics: LayoutLegendMetrics;
}

export type LayoutElement = LayoutNode | LayoutGroup | LayoutLegend;

export interface LayoutConnector {
	readonly id: string;
	readonly kind: "spine" | "chapterToTopics" | "topicToChildren";
	readonly from: Point;
	readonly to: Point;
	readonly depth: number;
}

export interface LayoutBackgroundArtifact {
	readonly id: string;
	readonly bounds: Rect;
	readonly transform?: string;
	readonly shapes: readonly LayoutBackgroundArtifactShape[];
}

export type LayoutBackgroundArtifactShape =
	| {
			readonly kind: "circle";
			readonly cx: number;
			readonly cy: number;
			readonly radius: number;
			readonly fill?: string;
			readonly stroke?: string;
			readonly strokeWidth?: string | number;
			/** Optional animation applied when the background is animated. */
			readonly animation?: "blink";
	  }
	| {
			readonly kind: "path";
			readonly d: string;
			readonly fill?: string;
			readonly stroke?: string;
			readonly strokeWidth?: string | number;
			/** Optional animation applied when the background is animated. */
			readonly animation?: "blink";
	  };

export interface RoadmapLayout {
	readonly width: number;
	readonly height: number;
	readonly elements: readonly LayoutElement[];
	readonly connectors: readonly LayoutConnector[];
	readonly backgroundArtifacts: readonly LayoutBackgroundArtifact[];
	readonly title: string;
	readonly maxDepth: number;
}

export type BadgeIcon = "check" | "heart" | "star" | "x" | "question" | "cloud" | "warning";

export interface BadgeStyle {
	readonly icon: BadgeIcon;
	readonly background: string;
	readonly foreground: string;
}

export interface TagStyle {
	readonly label: string;
	readonly badges: readonly BadgeStyle[];
}

export interface TypographyTheme {
	readonly color: string;
	readonly fontFamily: string;
	readonly fontSize: number;
	readonly fontWeight: number;
	readonly fontStyle: "normal" | "italic";
	readonly lineHeight: number;
	/** Additional advance per character in pixels at the given font size. */
	readonly letterSpacing?: number;
	readonly textTransform?: "none" | "uppercase";
	readonly renderScale?: number;
	readonly renderScaleX?: number;
	readonly renderScaleY?: number;
	readonly baselineRatio?: number;
}

export interface LegendTheme extends TypographyTheme {
	readonly rowGap: number;
}

export interface CardTheme {
	readonly shape: "rounded" | "chamfered" | "capsule" | "organic" | "cameo" | "petal";
	readonly fill: string;
	/** Optional repeating pattern painted over the fill; the fill is the pattern base. */
	readonly pattern?: BoardTheme["pattern"];
	readonly hatch?: string;
	readonly hatchOpacity?: number;
	/** Optional gradient fill; takes effect when no pattern is set. */
	readonly gradient?: { readonly start: string; readonly end: string };
	/** Inner keyline outline inset by this many pixels (sticker look). */
	readonly detailInset?: number;
	/** Overrides for the global shadow paint on this card only. */
	readonly shadowColor?: string;
	readonly shadowOpacity?: number;
	readonly stroke: string;
	readonly strokeWidth: number;
	readonly radius: number;
	readonly shadow: boolean;
	readonly paddingX: number;
	readonly paddingY: number;
	readonly minWidth: number;
	readonly maxWidth: number;
	readonly typography: TypographyTheme;
}

export interface BoardTheme {
	readonly shape: "organic" | "rounded" | "chamfered" | "scalloped";
	readonly pattern:
		| "crosshatch"
		| "grid"
		| "dots"
		| "lace"
		| "floral-lace"
		| "pearls"
		| "bows"
		| "waves"
		| "halftone"
		| "none";
	readonly background: string;
	readonly hatch: string;
	readonly hatchOpacity: number;
	/** Optional ruled outline around the board; boards are borderless by default. */
	readonly stroke?: string;
	readonly strokeWidth?: number;
	readonly padding: number;
}

export interface ConnectorTheme {
	readonly routing: "curved" | "orthogonal" | "straight" | "braided";
	readonly laneSpacing: number;
	readonly color: string;
	readonly width: number;
	readonly dash: string;
	readonly opacity: number;
	/** Marker drawn at the target end of the connector; braided spines ignore it. */
	readonly endShape?: "none" | "arrow" | "dot" | "circle" | "diamond";
	/**
	 * How the stroke meets the end shape: `overlap` runs the stroke under the
	 * marker (right for opaque markers); `detached` ends the stroke at the
	 * marker's rear edge so translucent markers never composite over the line.
	 */
	readonly endShapeJoin?: "overlap" | "detached";
}

export interface BackgroundArtifactContext {
	readonly width: number;
	readonly height: number;
	readonly settings: RoadmapBackgroundSettings;
	readonly avoid: readonly Rect[];
}

export interface BackgroundArtifactTheme {
	readonly cssVariables: Readonly<Record<string, string | number>>;
	readonly generate: (context: BackgroundArtifactContext) => readonly LayoutBackgroundArtifact[];
}

export interface RoadmapTheme {
	readonly name: string;
	readonly mode: RoadmapColorMode;
	readonly cssVariables: Readonly<Record<string, string | number>>;
	readonly canvas: {
		readonly background: string;
	};
	readonly heading: {
		readonly title: TypographyTheme;
		readonly section: TypographyTheme;
		readonly minor: TypographyTheme;
	};
	readonly legend: LegendTheme;
	readonly chapter: CardTheme;
	readonly note: CardTheme;
	readonly floatingNote: CardTheme;
	readonly topic: CardTheme;
	readonly nestedTopic: CardTheme;
	readonly topicHeader: CardTheme;
	readonly boards: {
		readonly topic: BoardTheme;
		readonly nested: BoardTheme;
		readonly legend: BoardTheme;
	};
	readonly connectors: {
		readonly spine: ConnectorTheme;
		readonly chapterToTopics: ConnectorTheme;
		readonly topicToChildren: ConnectorTheme;
	};
	readonly inline: {
		readonly link: string;
		readonly highlight: string;
		readonly insertUnderline: string;
		readonly codeBackground: string;
		readonly abbreviation: string;
		readonly abbreviationIndicatorSize: number;
	};
	readonly shadow: {
		readonly color: string;
		readonly opacity: number;
		/** Hard offset shadows paint solid by default; halftone uses a dot grid. */
		readonly pattern?: "solid" | "halftone";
		readonly offsetX: number;
		readonly offsetY: number;
		readonly softBlur: number;
		readonly softOffsetX: number;
		readonly softOffsetY: number;
		readonly softSaturation: number;
	};
	readonly backgroundArtifacts?: BackgroundArtifactTheme;
	readonly badges: {
		readonly size: number;
		readonly gap: number;
		readonly sizes: {
			readonly chapter: number;
			readonly gridHeader: number;
			readonly gridItem: number;
			readonly treeTopic: number;
			readonly nestedTopic: number;
			readonly legend: number;
		};
		readonly unknown: TagStyle;
		readonly tags: Readonly<Record<string, TagStyle>>;
	};
}

export type DeepPartial<T> = T extends (...arguments_: never[]) => unknown
	? T
	: T extends readonly (infer Item)[]
		? readonly DeepPartial<Item>[]
		: T extends object
			? { readonly [Key in keyof T]?: DeepPartial<T[Key]> }
			: T;

export interface RoadmapLayoutOptions {
	readonly width?: number;
	readonly minHeight?: number;
	readonly padding?: number;
	readonly endPaddingX?: number;
	readonly endPaddingY?: number;
	readonly stepGap?: number;
	readonly noteStepGap?: number;
	readonly gridStepGap?: number;
	readonly treeStepGap?: number;
	readonly chapterContentGap?: number;
	readonly chapterDescriptionGap?: number;
	readonly treeDescriptionGap?: number;
	readonly commentGap?: number;
	readonly groupGap?: number;
	readonly groupOutsetLeft?: number;
	readonly groupOutsetRight?: number;
	readonly itemGap?: number;
	readonly gridItemGap?: number;
	readonly branchGap?: number;
	readonly branchGapLeftOuter?: number;
	readonly branchGapLeftInner?: number;
	readonly branchGapRightOuter?: number;
	readonly branchGapRightInner?: number;
	readonly overlapPadding?: number;
	readonly spineClearance?: number;
	readonly maxGridColumns?: number;
	readonly showLegend?: boolean;
}

export interface RoadmapRenderOptions {
	readonly idPrefix?: string;
	readonly className?: string;
	readonly css?: string;
	readonly responsive?: boolean;
	readonly title?: string;
	readonly description?: string;
	/**
	 * Animate background artifacts; numbers scale the motion intensity.
	 * Defaults to the document's background setting.
	 */
	readonly animatedBackground?: boolean | number;
}

export interface RoadmapThemeSelection {
	readonly preset: string;
	readonly mode?: RoadmapColorMode;
}

export interface RoadmapThemePreset {
	readonly name: string;
	readonly modes: Readonly<Record<RoadmapColorMode, RoadmapTheme>>;
}

export interface RoadmapThemePresetWithModes extends RoadmapThemePreset {
	readonly light: RoadmapTheme;
	readonly dark: RoadmapTheme;
}

export type RoadmapThemeCatalog = Readonly<Record<string, RoadmapThemePreset>>;

export type ThemeInput = RoadmapColorMode | RoadmapThemeSelection | DeepPartial<RoadmapTheme>;

export interface GenerateRoadmapOptions {
	readonly theme?: ThemeInput;
	readonly themes?: RoadmapThemeCatalog;
	readonly layout?: RoadmapLayoutOptions;
	readonly render?: RoadmapRenderOptions;
	readonly markdown?: ComrakOptions;
	readonly wasm?: InitInput | Promise<InitInput>;
}

export interface SynchronousGenerateRoadmapOptions {
	readonly theme?: ThemeInput;
	readonly themes?: RoadmapThemeCatalog;
	readonly layout?: RoadmapLayoutOptions;
	readonly render?: RoadmapRenderOptions;
}

export interface CreateRoadmapGeneratorOptions {
	readonly markdown?: ComrakOptions;
	readonly wasm?: InitInput | Promise<InitInput>;
}

export interface GeneratedRoadmap {
	readonly document: RoadmapDocument;
	readonly layout: RoadmapLayout;
	readonly svg: string;
	readonly theme: RoadmapTheme;
}

export interface ParseRoadmapOptions {
	readonly markdown?: ComrakOptions;
}
