import { canonicalShortcode, emojiArtwork } from "./core/emoji-artwork.ts";
import { generateFunBackgroundArtifacts } from "./themes/fun/background-artifacts.ts";
import type {
	BadgeAccent,
	BadgeIcon,
	BadgeStyle,
	BoardTheme,
	CardTheme,
	ConnectorTheme,
	DeepPartial,
	LegendTheme,
	RoadmapTagSetting,
	RoadmapTheme,
	RoadmapThemePresetWithModes,
	TagStyle,
	TypographyTheme,
} from "./types.ts";

const fontFamily = "Arial, Helvetica, sans-serif";

const check: BadgeStyle = { icon: "check", background: "#53d068", foreground: "#ffffff" };
const heart: BadgeStyle = { icon: "heart", background: "#c75c5c", foreground: "#ffffff" };
const star: BadgeStyle = { icon: "star", background: "#f5a100", foreground: "#ffffff" };
const x: BadgeStyle = { icon: "x", background: "#777982", foreground: "#ffffff" };
const question: BadgeStyle = {
	icon: "question",
	background: "#748ffc",
	foreground: "#ffffff",
};
const cloud: BadgeStyle = { icon: "cloud", background: "#77b3d4", foreground: "#ffffff" };
const warning: BadgeStyle = {
	icon: "warning",
	background: "#ffd54f",
	foreground: "#3f3f3f",
};

/**
 * Accent slots offered to document-defined tags. Documents reference these by
 * name (`accent: violet`) instead of literal colors, so a taxonomy adapts to
 * every theme and mode; themes may override slots with their own palette.
 */
const accents: Readonly<Record<string, BadgeAccent>> = {
	green: { background: "#76c479", foreground: "#ffffff" },
	red: { background: "#c75c5c", foreground: "#ffffff" },
	amber: { background: "#f5a100", foreground: "#ffffff" },
	blue: { background: "#748ffc", foreground: "#ffffff" },
	violet: { background: "#8a75e5", foreground: "#ffffff" },
	neutral: { background: "#777982", foreground: "#ffffff" },
};

const tags: Readonly<Record<string, TagStyle>> = {
	"personal recommendation": {
		label: "Personal recommendation",
		badges: [heart, check],
	},
	"personal favourite": { label: "Personal favourite", badges: [heart] },
	recommended: { label: "Recommended", badges: [check] },
	"not recommended": { label: "Not recommended", badges: [x] },
	insightful: { label: "Insightful", badges: [star] },
	"cloud service": { label: "Cloud service", badges: [cloud] },
	warning: { label: "Warning", badges: [warning] },
};

export const lightTheme: RoadmapTheme = {
	name: "fun",
	mode: "light",
	cssVariables: {
		"chapter-gradient-start": "#fff5ca",
		"chapter-gradient-end": "#ffeb90",
		"topic-header-gradient-start": "#eeecff",
		"topic-header-gradient-end": "#dddaff",
		"board-hatch-stroke-width": 2,
	},
	canvas: { background: "#ffffff" },
	heading: {
		title: {
			color: "#565561",
			fontFamily,
			fontSize: 21,
			fontWeight: 700,
			fontStyle: "normal",
			lineHeight: 1.2,
			renderScaleX: 1.007,
			baselineRatio: 0.96,
		},
		section: {
			color: "#565561",
			fontFamily,
			fontSize: 18,
			fontWeight: 400,
			fontStyle: "normal",
			lineHeight: 1.25,
			baselineRatio: 0.96,
		},
		minor: {
			color: "#565561",
			fontFamily,
			fontSize: 16,
			fontWeight: 400,
			fontStyle: "normal",
			lineHeight: 1.25,
			baselineRatio: 0.96,
		},
	},
	legend: {
		color: "#565561",
		fontFamily,
		fontSize: 10.5,
		fontWeight: 400,
		fontStyle: "italic",
		lineHeight: 1.2,
		rowGap: 0,
	},
	chapter: {
		shape: "rounded",
		fill: "url(#chapter-gradient)",
		stroke: "#000000",
		strokeWidth: 1,
		radius: 4,
		shadow: true,
		paddingX: 12,
		paddingY: 7,
		minWidth: 80,
		maxWidth: 300,
		typography: {
			color: "#111218",
			fontFamily,
			fontSize: 16,
			fontWeight: 400,
			fontStyle: "normal",
			lineHeight: 1.2,
			renderScaleX: 0.995,
			baselineRatio: 0.92,
		},
	},
	note: {
		shape: "organic",
		fill: "#efeefa",
		stroke: "none",
		strokeWidth: 0,
		radius: 42,
		shadow: false,
		// The consolidated comment-card contract: every theme inherits these
		// two tokens; shapes add clearance (blob bulge, capsule ends) on top.
		paddingX: 12,
		paddingY: 9,
		minWidth: 0,
		// Content width stays 400 (maxWidth - 2 * paddingX), the wrap width
		// comments have always had.
		maxWidth: 424,
		typography: {
			color: "#565561",
			fontFamily,
			fontSize: 16,
			fontWeight: 400,
			fontStyle: "normal",
			lineHeight: 1.15,
			renderScale: 0.875,
			renderScaleX: 0.99,
			// Same optical baseline as floatingNote: the line box reserves a
			// descender row that mostly reads as air, so the baseline sits low
			// in the box to keep the glyph band visually centered. 0.815 here
			// made chapter descriptions read ~1px higher than floating notes.
			baselineRatio: 0.945,
		},
	},
	floatingNote: {
		shape: "organic",
		fill: "#ffffff",
		pattern: "crosshatch",
		hatch: "#d8d4f4",
		hatchOpacity: 80 / 255,
		stroke: "none",
		strokeWidth: 0,
		radius: 42,
		shadow: false,
		paddingX: 12,
		paddingY: 9,
		minWidth: 0,
		maxWidth: 424,
		typography: {
			color: "#565561",
			fontFamily,
			fontSize: 16,
			fontWeight: 400,
			fontStyle: "normal",
			lineHeight: 1.15,
			renderScale: 0.875,
			renderScaleX: 1.004,
			baselineRatio: 0.945,
		},
	},
	topic: {
		shape: "rounded",
		fill: "#ffffff",
		stroke: "#000000",
		strokeWidth: 1,
		radius: 3,
		shadow: true,
		paddingX: 12,
		paddingY: 6,
		minWidth: 50,
		maxWidth: 300,
		typography: {
			color: "#222227",
			fontFamily,
			fontSize: 12.5,
			fontWeight: 400,
			fontStyle: "normal",
			lineHeight: 1.2,
			renderScaleX: 0.985,
			renderScaleY: 0.96,
			baselineRatio: 0.9,
		},
	},
	nestedTopic: {
		shape: "rounded",
		fill: "#ffffff",
		stroke: "#000000",
		strokeWidth: 1,
		radius: 3,
		shadow: true,
		paddingX: 11,
		paddingY: 6,
		minWidth: 40,
		maxWidth: 300,
		typography: {
			color: "#222227",
			fontFamily,
			fontSize: 12.5,
			fontWeight: 400,
			fontStyle: "normal",
			lineHeight: 1.2,
			renderScaleX: 0.98,
			renderScaleY: 0.98,
			baselineRatio: 0.9,
		},
	},
	topicHeader: {
		shape: "rounded",
		fill: "url(#topic-gradient)",
		stroke: "#000000",
		strokeWidth: 1,
		radius: 3,
		shadow: true,
		paddingX: 14,
		paddingY: 6,
		minWidth: 50,
		maxWidth: 300,
		typography: {
			color: "#565561",
			fontFamily,
			fontSize: 12.5,
			fontWeight: 700,
			fontStyle: "normal",
			lineHeight: 1.2,
			renderScaleX: 0.99,
			renderScaleY: 0.95,
			baselineRatio: 0.9,
		},
	},
	boards: {
		topic: {
			shape: "organic",
			pattern: "crosshatch",
			background: "#ffffff",
			hatch: "#d8d4f4",
			hatchOpacity: 80 / 255,
			padding: 15,
		},
		nested: {
			shape: "organic",
			pattern: "crosshatch",
			background: "#ffffff",
			hatch: "#fbf4de",
			hatchOpacity: 1,
			padding: 10,
		},
		legend: {
			shape: "organic",
			pattern: "crosshatch",
			background: "#ffffff",
			hatch: "#fbf4de",
			hatchOpacity: 1,
			padding: 5,
		},
	},
	connectors: {
		spine: {
			routing: "curved",
			laneSpacing: 0,
			color: "#c0c0c0",
			width: 6,
			dash: "",
			opacity: 1,
		},
		chapterToTopics: {
			routing: "curved",
			laneSpacing: 0,
			color: "#adaac3",
			width: 4,
			dash: "10 10",
			opacity: 144 / 255,
		},
		topicToChildren: {
			routing: "curved",
			laneSpacing: 0,
			color: "#adaac3",
			width: 3,
			dash: "10 10",
			opacity: 144 / 255,
		},
	},
	inline: {
		link: "#2563eb",
		highlight: "#fffe04",
		insertUnderline: "#ffdf4c",
		codeBackground: "#f1f2f6",
		abbreviation: "#44454d",
		abbreviationIndicatorSize: 7.5,
	},
	shadow: {
		color: "#000000",
		opacity: 0.3,
		offsetX: 3,
		offsetY: 3,
		softBlur: 1.8,
		softOffsetX: 1,
		softOffsetY: 1,
		softSaturation: 2.1,
	},
	backgroundArtifacts: {
		cssVariables: {
			"background-artifact-primary": "#968daa",
			"background-artifact-secondary": "#829da3",
			"background-artifact-accent": "#aa9274",
			"background-artifact-coral": "#aa888a",
			"background-artifact-opacity": 0.48,
			"background-artifact-stroke-width": 2,
		},
		generate: generateFunBackgroundArtifacts,
	},
	badges: {
		size: 16,
		gap: 0,
		sizes: {
			chapter: 16,
			gridHeader: 16,
			gridItem: 14,
			treeTopic: 14,
			nestedTopic: 12,
			legend: 14,
		},
		unknown: { label: "Other", badges: [question] },
		tags,
		accents,
	},
};

export const darkTheme: RoadmapTheme = {
	...lightTheme,
	mode: "dark",
	cssVariables: {
		...lightTheme.cssVariables,
		"chapter-gradient-start": "#6b5722",
		"chapter-gradient-end": "#6b5722",
		"topic-header-gradient-start": "#403d62",
		"topic-header-gradient-end": "#403d62",
	},
	canvas: { background: "#15161d" },
	heading: {
		title: { ...lightTheme.heading.title, color: "#f1f0f8" },
		section: { ...lightTheme.heading.section, color: "#e6e4ef" },
		minor: { ...lightTheme.heading.minor, color: "#d7d5e0" },
	},
	legend: { ...lightTheme.legend, color: "#d7d5e0" },
	chapter: {
		...lightTheme.chapter,
		fill: "#6b5722",
		stroke: "#f2d77b",
		typography: { ...lightTheme.chapter.typography, color: "#fff8df" },
	},
	note: {
		...lightTheme.note,
		fill: "#29283b",
		stroke: "#77739c",
		strokeWidth: 1,
		typography: { ...lightTheme.note.typography, color: "#e1dfed" },
	},
	floatingNote: {
		...lightTheme.floatingNote,
		fill: "#242630",
		hatch: "#7d76aa",
		hatchOpacity: 0.38,
		stroke: "none",
		typography: { ...lightTheme.floatingNote.typography, color: "#e1dfed" },
	},
	topic: {
		...lightTheme.topic,
		fill: "#242630",
		stroke: "#9295a5",
		typography: { ...lightTheme.topic.typography, color: "#ececf2" },
	},
	nestedTopic: {
		...lightTheme.nestedTopic,
		fill: "#242630",
		stroke: "#9295a5",
		typography: { ...lightTheme.nestedTopic.typography, color: "#ececf2" },
	},
	topicHeader: {
		...lightTheme.topicHeader,
		fill: "#403d62",
		stroke: "#a6a1d0",
		typography: { ...lightTheme.topicHeader.typography, color: "#f2f0ff" },
	},
	boards: {
		topic: {
			...lightTheme.boards.topic,
			background: "#1d1e27",
			hatch: "#7d76aa",
			hatchOpacity: 0.38,
		},
		nested: {
			...lightTheme.boards.nested,
			background: "#211f1a",
			hatch: "#8f7941",
			hatchOpacity: 0.42,
		},
		legend: {
			...lightTheme.boards.legend,
			background: "#211f1a",
			hatch: "#8f7941",
			hatchOpacity: 0.42,
			padding: 7,
		},
	},
	connectors: {
		spine: { ...lightTheme.connectors.spine, color: "#696b75" },
		chapterToTopics: { ...lightTheme.connectors.chapterToTopics, color: "#928eae", opacity: 0.75 },
		topicToChildren: {
			...lightTheme.connectors.topicToChildren,
			color: "#928eae",
			opacity: 0.75,
		},
	},
	inline: {
		link: "#78a9ff",
		highlight: "#c9a91d",
		insertUnderline: "#e0b62b",
		codeBackground: "#343641",
		abbreviation: "#c8c6d2",
		abbreviationIndicatorSize: 7.5,
	},
	shadow: { ...lightTheme.shadow, color: "#000000", opacity: 0.55 },
	backgroundArtifacts: {
		cssVariables: {
			"background-artifact-primary": "#a9a1b9",
			"background-artifact-secondary": "#91a9ae",
			"background-artifact-accent": "#b8a386",
			"background-artifact-coral": "#b79a9d",
			"background-artifact-opacity": 0.52,
			"background-artifact-stroke-width": 2,
		},
		generate: generateFunBackgroundArtifacts,
	},
};

export const funTheme = {
	name: "fun",
	modes: { light: lightTheme, dark: darkTheme },
	light: lightTheme,
	dark: darkTheme,
} as const satisfies RoadmapThemePresetWithModes;

const { backgroundArtifacts: _lightThemeArtifacts, ...artifactFreeLightThemeData } = lightTheme;

/**
 * The Fun light theme without its background-artifact capability. Use as the
 * `createTheme` base for presets that must not inherit background artifacts.
 */
export const artifactFreeLightTheme: RoadmapTheme = artifactFreeLightThemeData;

function mergeTypography(
	base: TypographyTheme,
	override: DeepPartial<TypographyTheme> | undefined,
): TypographyTheme {
	const renderScale = override?.renderScale ?? base.renderScale;
	const renderScaleX = override?.renderScaleX ?? base.renderScaleX;
	const renderScaleY = override?.renderScaleY ?? base.renderScaleY;
	const baselineRatio = override?.baselineRatio ?? base.baselineRatio;
	const letterSpacing = override?.letterSpacing ?? base.letterSpacing;
	const textTransform = override?.textTransform ?? base.textTransform;
	return {
		color: override?.color ?? base.color,
		fontFamily: override?.fontFamily ?? base.fontFamily,
		fontSize: override?.fontSize ?? base.fontSize,
		fontWeight: override?.fontWeight ?? base.fontWeight,
		fontStyle: override?.fontStyle ?? base.fontStyle,
		lineHeight: override?.lineHeight ?? base.lineHeight,
		...(letterSpacing !== undefined ? { letterSpacing } : {}),
		...(textTransform !== undefined ? { textTransform } : {}),
		...(renderScale !== undefined ? { renderScale } : {}),
		...(renderScaleX !== undefined ? { renderScaleX } : {}),
		...(renderScaleY !== undefined ? { renderScaleY } : {}),
		...(baselineRatio !== undefined ? { baselineRatio } : {}),
	};
}

function mergeCssVariables(
	base: Readonly<Record<string, string | number>>,
	override: Readonly<Record<string, string | number | undefined>> | undefined,
): Readonly<Record<string, string | number>> {
	const merged: Record<string, string | number> = { ...base };
	if (!override) return merged;
	for (const [name, value] of Object.entries(override)) {
		if (value !== undefined) merged[name] = value;
	}
	return merged;
}

function mergeLegend(
	base: LegendTheme,
	override: DeepPartial<LegendTheme> | undefined,
): LegendTheme {
	return {
		...mergeTypography(base, override),
		rowGap: override?.rowGap ?? base.rowGap,
	};
}

function mergeCard(base: CardTheme, override: DeepPartial<CardTheme> | undefined): CardTheme {
	const pattern = override?.pattern ?? base.pattern;
	const hatch = override?.hatch ?? base.hatch;
	const hatchOpacity = override?.hatchOpacity ?? base.hatchOpacity;
	const gradientStart = override?.gradient?.start ?? base.gradient?.start;
	const gradientEnd = override?.gradient?.end ?? base.gradient?.end;
	const detailInset = override?.detailInset ?? base.detailInset;
	const shadowColor = override?.shadowColor ?? base.shadowColor;
	const shadowOpacity = override?.shadowOpacity ?? base.shadowOpacity;
	return {
		shape: override?.shape ?? base.shape,
		fill: override?.fill ?? base.fill,
		...(pattern !== undefined ? { pattern } : {}),
		...(hatch !== undefined ? { hatch } : {}),
		...(hatchOpacity !== undefined ? { hatchOpacity } : {}),
		...(gradientStart !== undefined && gradientEnd !== undefined
			? { gradient: { start: gradientStart, end: gradientEnd } }
			: {}),
		...(detailInset !== undefined ? { detailInset } : {}),
		...(shadowColor !== undefined ? { shadowColor } : {}),
		...(shadowOpacity !== undefined ? { shadowOpacity } : {}),
		stroke: override?.stroke ?? base.stroke,
		strokeWidth: override?.strokeWidth ?? base.strokeWidth,
		radius: override?.radius ?? base.radius,
		shadow: override?.shadow ?? base.shadow,
		paddingX: override?.paddingX ?? base.paddingX,
		paddingY: override?.paddingY ?? base.paddingY,
		minWidth: override?.minWidth ?? base.minWidth,
		maxWidth: override?.maxWidth ?? base.maxWidth,
		typography: mergeTypography(base.typography, override?.typography),
	};
}

function mergeBoard(base: BoardTheme, override: DeepPartial<BoardTheme> | undefined): BoardTheme {
	const stroke = override?.stroke ?? base.stroke;
	const strokeWidth = override?.strokeWidth ?? base.strokeWidth;
	return {
		shape: override?.shape ?? base.shape,
		pattern: override?.pattern ?? base.pattern,
		background: override?.background ?? base.background,
		hatch: override?.hatch ?? base.hatch,
		hatchOpacity: override?.hatchOpacity ?? base.hatchOpacity,
		...(stroke !== undefined ? { stroke } : {}),
		...(strokeWidth !== undefined ? { strokeWidth } : {}),
		padding: override?.padding ?? base.padding,
	};
}

function mergeConnector(
	base: ConnectorTheme,
	override: DeepPartial<ConnectorTheme> | undefined,
): ConnectorTheme {
	const endShape = override?.endShape ?? base.endShape;
	const endShapeJoin = override?.endShapeJoin ?? base.endShapeJoin;
	return {
		routing: override?.routing ?? base.routing,
		laneSpacing: override?.laneSpacing ?? base.laneSpacing,
		color: override?.color ?? base.color,
		width: override?.width ?? base.width,
		dash: override?.dash ?? base.dash,
		opacity: override?.opacity ?? base.opacity,
		...(endShape !== undefined ? { endShape } : {}),
		...(endShapeJoin !== undefined ? { endShapeJoin } : {}),
	};
}

function mergeBadge(base: BadgeStyle, override: DeepPartial<BadgeStyle> | undefined): BadgeStyle {
	const icon = override?.icon ?? base.icon;
	const emoji = override?.emoji ?? base.emoji;
	const token = override?.token ?? base.token;
	return {
		...(icon !== undefined ? { icon } : {}),
		...(emoji !== undefined ? { emoji } : {}),
		...(token !== undefined ? { token } : {}),
		background: override?.background ?? base.background,
		foreground: override?.foreground ?? base.foreground,
	};
}

function mergeTag(base: TagStyle, override: DeepPartial<TagStyle> | undefined): TagStyle {
	const badges =
		override?.badges && override.badges.length > 0
			? override.badges.map((badge, index) =>
					mergeBadge(base.badges[index] ?? base.badges[0] ?? question, badge),
				)
			: base.badges;
	const legend = override?.legend ?? base.legend;
	return {
		label: override?.label ?? base.label,
		badges,
		...(legend !== undefined ? { legend } : {}),
	};
}

export function createTheme(
	override: DeepPartial<RoadmapTheme>,
	base: RoadmapTheme = lightTheme,
): RoadmapTheme {
	const overrideArtifacts = override.backgroundArtifacts;
	const baseArtifacts = base.backgroundArtifacts;
	const replacesArtifactCapability =
		overrideArtifacts?.generate !== undefined &&
		overrideArtifacts.generate !== baseArtifacts?.generate;
	const backgroundArtifacts = overrideArtifacts
		? {
				cssVariables: mergeCssVariables(
					replacesArtifactCapability ? {} : (baseArtifacts?.cssVariables ?? {}),
					overrideArtifacts.cssVariables,
				),
				generate: overrideArtifacts.generate ?? baseArtifacts?.generate,
			}
		: baseArtifacts;
	const shadowPattern = override.shadow?.pattern ?? base.shadow.pattern;
	const textPainting = override.textPainting ?? base.textPainting;
	const unknown = mergeTag(base.badges.unknown, override.badges?.unknown);
	const mergedAccents = mergeAccents(base.badges.accents, override.badges?.accents);
	const tagNames = new Set([
		...Object.keys(base.badges.tags),
		...Object.keys(override.badges?.tags ?? {}),
	]);
	const normalizedTags: Record<string, TagStyle> = {};
	for (const tag of tagNames) {
		const baseStyle = base.badges.tags[tag] ?? { label: tag, badges: unknown.badges };
		normalizedTags[tag] = mergeTag(baseStyle, override.badges?.tags?.[tag]);
	}
	return {
		name: override.name ?? base.name,
		mode: override.mode ?? base.mode,
		...(textPainting !== undefined ? { textPainting } : {}),
		cssVariables: mergeCssVariables(base.cssVariables, override.cssVariables),
		canvas: { background: override.canvas?.background ?? base.canvas.background },
		heading: {
			title: mergeTypography(base.heading.title, override.heading?.title),
			section: mergeTypography(base.heading.section, override.heading?.section),
			minor: mergeTypography(base.heading.minor, override.heading?.minor),
		},
		legend: mergeLegend(base.legend, override.legend),
		chapter: mergeCard(base.chapter, override.chapter),
		note: mergeCard(base.note, override.note),
		floatingNote: mergeCard(base.floatingNote, override.floatingNote),
		topic: mergeCard(base.topic, override.topic),
		nestedTopic: mergeCard(base.nestedTopic, override.nestedTopic),
		topicHeader: mergeCard(base.topicHeader, override.topicHeader),
		boards: {
			topic: mergeBoard(base.boards.topic, override.boards?.topic),
			nested: mergeBoard(base.boards.nested, override.boards?.nested),
			legend: mergeBoard(base.boards.legend, override.boards?.legend),
		},
		connectors: {
			spine: mergeConnector(base.connectors.spine, override.connectors?.spine),
			chapterToTopics: mergeConnector(
				base.connectors.chapterToTopics,
				override.connectors?.chapterToTopics,
			),
			topicToChildren: mergeConnector(
				base.connectors.topicToChildren,
				override.connectors?.topicToChildren,
			),
		},
		inline: {
			link: override.inline?.link ?? base.inline.link,
			highlight: override.inline?.highlight ?? base.inline.highlight,
			insertUnderline: override.inline?.insertUnderline ?? base.inline.insertUnderline,
			codeBackground: override.inline?.codeBackground ?? base.inline.codeBackground,
			abbreviation: override.inline?.abbreviation ?? base.inline.abbreviation,
			abbreviationIndicatorSize:
				override.inline?.abbreviationIndicatorSize ?? base.inline.abbreviationIndicatorSize,
		},
		shadow: {
			color: override.shadow?.color ?? base.shadow.color,
			opacity: override.shadow?.opacity ?? base.shadow.opacity,
			...(shadowPattern !== undefined ? { pattern: shadowPattern } : {}),
			offsetX: override.shadow?.offsetX ?? base.shadow.offsetX,
			offsetY: override.shadow?.offsetY ?? base.shadow.offsetY,
			softBlur: override.shadow?.softBlur ?? base.shadow.softBlur,
			softOffsetX: override.shadow?.softOffsetX ?? base.shadow.softOffsetX,
			softOffsetY: override.shadow?.softOffsetY ?? base.shadow.softOffsetY,
			softSaturation: override.shadow?.softSaturation ?? base.shadow.softSaturation,
		},
		...(backgroundArtifacts?.generate
			? {
					backgroundArtifacts: {
						cssVariables: backgroundArtifacts.cssVariables,
						generate: backgroundArtifacts.generate,
					},
				}
			: {}),
		badges: {
			size: override.badges?.size ?? base.badges.size,
			gap: override.badges?.gap ?? base.badges.gap,
			sizes: {
				chapter: override.badges?.sizes?.chapter ?? base.badges.sizes.chapter,
				gridHeader: override.badges?.sizes?.gridHeader ?? base.badges.sizes.gridHeader,
				gridItem: override.badges?.sizes?.gridItem ?? base.badges.sizes.gridItem,
				treeTopic: override.badges?.sizes?.treeTopic ?? base.badges.sizes.treeTopic,
				nestedTopic: override.badges?.sizes?.nestedTopic ?? base.badges.sizes.nestedTopic,
				legend: override.badges?.sizes?.legend ?? base.badges.sizes.legend,
			},
			unknown,
			tags: normalizedTags,
			...(mergedAccents !== undefined ? { accents: mergedAccents } : {}),
		},
	};
}

function mergeAccents(
	base: Readonly<Record<string, BadgeAccent>> | undefined,
	override: DeepPartial<Readonly<Record<string, BadgeAccent>>> | undefined,
): Readonly<Record<string, BadgeAccent>> | undefined {
	if (base === undefined && override === undefined) return undefined;
	const merged: Record<string, BadgeAccent> = { ...base };
	for (const [name, accent] of Object.entries(override ?? {})) {
		// Partial overrides merge with the base accent; a brand-new accent
		// still needs both colors to be usable.
		const fallback = merged[name];
		const background = accent?.background ?? fallback?.background;
		const foreground = accent?.foreground ?? fallback?.foreground;
		if (background !== undefined && foreground !== undefined) {
			merged[name] = { background, foreground };
		}
	}
	return merged;
}

const builtInBadgeIcons: readonly BadgeIcon[] = [
	"check",
	"heart",
	"star",
	"x",
	"question",
	"cloud",
	"warning",
];

/** A literal-color accent; hex colors derive a readable foreground. */
function colorAccent(value: string): BadgeAccent {
	const hex = value.match(/^#([0-9a-f]{6})$/iu)?.[1];
	if (!hex) return { background: value, foreground: "#ffffff" };
	const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
	const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
	const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
	const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	return { background: value, foreground: luminance > 0.62 ? "#22242a" : "#ffffff" };
}

function humanizeTagName(tag: string): string {
	const spaced = tag.replaceAll("-", " ");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function documentTagStyle(tag: string, setting: RoadmapTagSetting, theme: RoadmapTheme): TagStyle {
	const fallback = theme.badges.unknown.badges[0];
	// Named slots win, so `accent: green` means the theme's green in every
	// mode; anything else color-like is used literally.
	const slot = setting.accent ? theme.badges.accents?.[setting.accent] : undefined;
	const literal = !slot && setting.accent ? colorAccent(setting.accent) : undefined;
	const accent = slot ?? literal;
	const background = setting.background ?? accent?.background ?? fallback?.background ?? "#777982";
	const foreground = setting.foreground ?? accent?.foreground ?? fallback?.foreground ?? "#ffffff";
	// Per-tag paint token: tags sharing an icon keep independent colors, and
	// CSS overrides get a semantic handle (--roadmap-badge-tag-<name>-…).
	const token = `tag-${tag}`;
	let badge: BadgeStyle;
	if (setting.icon?.startsWith(":")) {
		const shortcode = setting.icon.slice(1, -1);
		badge = emojiArtwork(shortcode)
			? { emoji: canonicalShortcode(shortcode), background, foreground, token }
			: { icon: fallback?.icon ?? "question", background, foreground, token };
	} else {
		const icon = builtInBadgeIcons.find((name) => name === setting.icon);
		badge = { icon: icon ?? fallback?.icon ?? "question", background, foreground, token };
	}
	return {
		label: setting.label ?? humanizeTagName(tag),
		badges: [badge],
		...(setting.legend !== undefined ? { legend: setting.legend } : {}),
	};
}

/**
 * Extends a theme's tag styles with the document-defined tags from front
 * matter. Returns the theme unchanged when the document declares none, so
 * theme identity is preserved for the common case.
 */
export function applyDocumentTags(
	theme: RoadmapTheme,
	tags: Readonly<Record<string, RoadmapTagSetting>>,
): RoadmapTheme {
	const entries = Object.entries(tags);
	if (entries.length === 0) return theme;
	const resolved: Record<string, TagStyle> = {};
	for (const [tag, setting] of entries) {
		resolved[tag] = documentTagStyle(tag, setting, theme);
	}
	return {
		...theme,
		badges: { ...theme.badges, tags: { ...theme.badges.tags, ...resolved } },
	};
}
