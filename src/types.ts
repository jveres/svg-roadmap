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

/**
 * A `[name]` reference to a document-defined tag inside prose, painted as an
 * inline chip: the tag's badge disc plus its name in the accent color. The
 * children carry the plain name so text extraction reads naturally.
 */
export interface TagChipInline {
	readonly type: "tagChip";
	readonly tag: string;
	readonly children: readonly InlineNode[];
}

export type InlineNode =
	| TextInline
	| CodeInline
	| ContainerInline
	| LinkInline
	| AbbreviationInline
	| BreakInline
	| FootnoteReferenceInline
	| TagChipInline;

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
	/**
	 * Detail note from blockquotes under the topic, as raw Markdown exactly
	 * as authored: learning depth surfaced by hosts (a detail panel), never
	 * drawn on the chart itself.
	 */
	readonly note?: string;
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
	/**
	 * Renders the theme's gradient capabilities (spine journey ramp, hull
	 * outlines) when the theme defines them. Off by default.
	 */
	readonly gradients?: boolean;
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

/**
 * A document-defined tag from front matter. The document owns the taxonomy
 * (name, meaning, legend label); the theme owns the palette, referenced
 * through an abstract accent slot so the tag adapts to every theme and mode.
 */
export interface RoadmapTagSetting {
	/** Built-in badge icon name or an emoji shortcode such as `":rocket:"`. */
	readonly icon?: string;
	/** Theme accent slot supplying the badge colors. */
	readonly accent?: string;
	/** Legend text; defaults to the humanized tag name. */
	readonly label?: string;
	/** Set to `false` to keep the tag out of the legend. */
	readonly legend?: boolean;
	/** Explicit colors; escape hatch that does not adapt to themes or modes. */
	readonly background?: string;
	readonly foreground?: string;
}

/** How dense the chart's vertical rhythm is; `cozy` is the default. */
export type RoadmapSpacing = "compact" | "cozy" | "roomy";

/**
 * Document-authored layout intent. Deliberately curated: real authoring
 * decisions only (canvas proportion, grid width, overall density) — never
 * raw solver gaps, which would let a document lay out a broken chart.
 */
export interface RoadmapLayoutSettings {
	/**
	 * Grows the final canvas — both dimensions — by this factor (default
	 * `1`): the chart stays centered and the extra room becomes breathing
	 * space, and territory for the theme's background artifacts.
	 */
	readonly canvas?: number;
	/**
	 * Topic columns inside tree clusters: `1` (default) or `2`. Two is the
	 * ceiling by design — clusters keep a clean edge for their subtopics.
	 */
	readonly clusterColumns?: 1 | 2;
	/** Maximum grid columns per row before the grid wraps into chunks. */
	readonly columns?: number;
	/** Scales the rhythm gaps coherently; solver clearances stay fixed. */
	readonly spacing?: RoadmapSpacing;
}

export interface RoadmapSettings {
	readonly theme: RoadmapThemeSettings;
	readonly background: RoadmapBackgroundSettings;
	readonly tags: Readonly<Record<string, RoadmapTagSetting>>;
	/** Whether the tag legend renders. Defaults to `true`. */
	readonly legend: boolean;
	/**
	 * Paint a folded-corner mark on nodes that carry a detail note, so the
	 * content behind a click is discoverable. Defaults to `false`.
	 */
	readonly noteMarkers: boolean;
	readonly layout: RoadmapLayoutSettings;
	/** Accessible chart title; defaults to the document's H1. */
	readonly title?: string;
	/** Accessible chart description. */
	readonly description?: string;
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
	/** Document tag painted as an inline chip instead of plain text. */
	readonly tag?: string;
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
	readonly letterSpacing?: number;
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
	/**
	 * Structural owner emitted as `data-parent`: a nested topic points at its
	 * parent topic, a grid topic at its column, a column header and top-level
	 * topic at their chapter. Hosts walk this to scope whole subtrees
	 * (spotlight, column progress) without re-parsing the Markdown.
	 * Mutable: chapter ownership is backfilled after chapter layout.
	 */
	parentId?: string;
	/**
	 * Tree-group membership emitted as `data-group`, pairing top-level tree
	 * topics with their chapter connector so hosts can dim inactive paths.
	 * Mutable: stamped after the cluster is packed.
	 */
	groupId?: string;
	/** Detail-note Markdown, emitted verbatim as `data-roadmap-note`. */
	readonly note?: string;
	/**
	 * The card's padding tokens, the single source of truth for content air.
	 * Shape fitting (capsule ends, blob bulge) adds clearance on top of
	 * these, never substitutes its own constants.
	 */
	readonly paddingX?: number;
	readonly paddingY?: number;
	/** The theme card shape this node is painted with; drives frame fitting. */
	readonly frameShape?: "rounded" | "chamfered" | "capsule" | "organic" | "cameo" | "petal";
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
	/** Icon or emoji-shortcode name of each badge, for sizing and styling. */
	readonly icons: readonly string[];
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
	/** Tree group this connector serves, matching its member nodes' `data-group`. */
	readonly groupId?: string;
	/**
	 * `elbow` routes vertical-then-horizontal into the target's side — the
	 * tree-gutter look grid nesting uses. Elbow connectors skip lane solving.
	 */
	readonly shape?: "elbow";
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
	/** Built-in glyph; ignored when `emoji` is set. */
	readonly icon?: BadgeIcon;
	/** Canonical emoji shortcode painted on a colored disc instead of a glyph. */
	readonly emoji?: string;
	readonly background: string;
	readonly foreground: string;
	/**
	 * CSS token key for this badge's paint. Theme badges default to their icon
	 * name (`--roadmap-badge-check-background`); document-defined tags carry a
	 * per-tag token (`--roadmap-badge-tag-advanced-background`) so tags that
	 * share an icon keep independent colors.
	 */
	readonly token?: string;
}

export interface TagStyle {
	readonly label: string;
	readonly badges: readonly BadgeStyle[];
	/** Set to `false` to keep the tag out of the legend. Defaults to `true`. */
	readonly legend?: boolean;
}

/** Accent color slot a theme offers to document-defined tags. */
export interface BadgeAccent {
	readonly background: string;
	readonly foreground: string;
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
	/**
	 * Outline the hull with a connector kind's journey gradient instead of a
	 * plain stroke. The gradient lives in user space, so every hull picks up
	 * the ramp color at its own elevation — clusters read as color-coded by
	 * their position along the journey. Subtle by default (hairline, 70%).
	 */
	readonly strokeGradient?: {
		readonly connector: "spine" | "chapterToTopics" | "topicToChildren";
		readonly width?: number;
		readonly opacity?: number;
	};
	readonly hatch: string;
	readonly hatchOpacity: number;
	/** Optional ruled outline around the board; boards are borderless by default. */
	readonly stroke?: string;
	readonly strokeWidth?: number;
	readonly padding: number;
}

/** One stop of a connector stroke gradient; offsets run 0..1. */
export interface ConnectorGradientStop {
	readonly offset: number;
	readonly color: string;
}

export interface ConnectorTheme {
	readonly routing: "curved" | "orthogonal" | "straight" | "braided";
	readonly laneSpacing: number;
	readonly color: string;
	/**
	 * Optional multi-stop stroke gradient, drawn top-to-bottom across the
	 * connector kind's full vertical extent in user space — the spine wears
	 * it as a color journey from the chart's start to its end. When set, it
	 * replaces `color` for the stroke; `color` remains the fallback for
	 * consumers that need a single value.
	 */
	readonly gradient?: readonly ConnectorGradientStop[];
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

/**
 * How a card's text is painted. `positioned` gives every segment its own
 * `<text>` at a measured origin — exact, and the only way painted decorations
 * line up with glyphs. `flowing` emits one centered `<text>` per line, which
 * keeps tracking and shaping natural for display faces but leaves WebKit free
 * to distribute `textLength` its own way; lines that carry decorations,
 * emoji artwork, or code spans fall back to `positioned` individually.
 */
export type TextPainting = "positioned" | "flowing";

/**
 * Optional theme styling for the note dog-ear, so the mark adapts to the
 * theme's box geometry. Paint defaults to the node's text color at low
 * opacity; a custom color is exposed as `--roadmap-note-marker-color`.
 */
export interface NoteMarkerTheme {
	/**
	 * `fold` (default) tucks a triangle inside the corner; `dot` suits
	 * curved frames; `notch` sets a wedge along a chamfered card's cut so
	 * the mark shares the frame geometry (non-chamfered cards fall back to
	 * the fold).
	 */
	readonly shape?: "fold" | "dot" | "notch";
	/** Mark size in px; the fold defaults to scale with the node height. */
	readonly size?: number;
	/** Distance from the frame's corner; defaults follow the card radius. */
	readonly inset?: number;
	readonly color?: string;
	readonly opacity?: number;
}

export interface RoadmapTheme {
	readonly name: string;
	readonly mode: RoadmapColorMode;
	/** Defaults to `positioned`. */
	readonly textPainting?: TextPainting;
	/** Styling for the opt-in note markers; omitted uses the built-in fold. */
	readonly noteMarker?: NoteMarkerTheme;
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
		/**
		 * Named color slots offered to document-defined tags. Documents bind
		 * tags to slots (`accent: violet`) instead of literal colors, so a
		 * taxonomy keeps working across themes and modes.
		 */
		readonly accents?: Readonly<Record<string, BadgeAccent>>;
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
	/** Topic columns inside tree clusters: 1 (default) or 2. */
	readonly clusterColumns?: 1 | 2;
	/** Final-canvas growth factor; the chart centers in the extra room. */
	readonly canvasScale?: number;
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
	/**
	 * Render the theme's gradient capabilities (spine journey ramp, hull
	 * outlines). Defaults to the document's `theme.gradients` setting.
	 */
	readonly gradients?: boolean;
	/**
	 * Paint a folded-corner mark on nodes carrying a detail note. Defaults
	 * to the document's `noteMarkers` setting.
	 */
	readonly noteMarkers?: boolean;
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
