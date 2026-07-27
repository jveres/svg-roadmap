import { createTheme, lightTheme } from "../../theme.ts";
import type { RoadmapTheme, RoadmapThemePresetWithModes } from "../../types.ts";
import { generateRoseBackgroundArtifacts } from "./background-artifacts.ts";

// Rose Atlas: an antique botanical plate. Warm parchment, engraved sepia
// hairlines, madder and old-rose accents with sage stems — the rose as a
// specimen in a garden folio, not as candy.
const displayFontFamily =
	'"Didot", "Bodoni 72", "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif';
const bodyFontFamily =
	'"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';

const parchment = "#faf5ec";
const ink = "#43302f";
const inkMuted = "#85706c";
const madder = "#8e3b52";
const oldRose = "#b06f76";
const sage = "#75855f";

export const roseLightTheme: RoadmapTheme = createTheme(
	{
		name: "rose",
		mode: "light",
		// Display serifs need natural shaping and tracking, so lines paint as
		// one flowing run wherever no decoration forces exact positioning.
		textPainting: "flowing",
		// A sharp paper fold fights the engraved plate; a small old-rose dot
		// reads as a printer's mark instead.
		noteMarker: { shape: "dot", size: 5, inset: 8, color: oldRose, opacity: 0.6 },
		cssVariables: {
			"chapter-gradient-start": "#fdf9f0",
			"chapter-gradient-end": "#f5e7dc",
			"topic-header-gradient-start": "#fcf6ea",
			"topic-header-gradient-end": "#f1e5d2",
			"board-hatch-stroke-width": 1,
			"frame-detail-width": 0.7,
			"frame-detail-opacity": 0.5,
		},
		canvas: { background: parchment },
		heading: {
			title: {
				color: "#6d2f42",
				fontFamily: displayFontFamily,
				fontWeight: 700,
				letterSpacing: 0.5,
			},
			section: {
				color: madder,
				fontFamily: displayFontFamily,
				fontWeight: 600,
				letterSpacing: 0.4,
			},
			minor: { color: inkMuted, fontFamily: bodyFontFamily, fontStyle: "italic" },
		},
		legend: { color: inkMuted, fontFamily: bodyFontFamily, fontStyle: "italic" },
		chapter: {
			shape: "capsule",
			stroke: madder,
			strokeWidth: 1.4,
			radius: 22,
			shadow: true,
			detailInset: 3,
			paddingX: 20,
			paddingY: 9,
			typography: {
				color: "#5d2638",
				fontFamily: displayFontFamily,
				fontWeight: 700,
				letterSpacing: 0.6,
			},
		},
		note: {
			shape: "rounded",
			fill: "#fffdf6",
			stroke: "#cbb3a4",
			strokeWidth: 1,
			radius: 3,
			typography: { color: "#5d4a47", fontFamily: bodyFontFamily, fontStyle: "italic" },
		},
		floatingNote: {
			shape: "rounded",
			fill: "#fffdf6",
			pattern: "lace",
			hatch: oldRose,
			hatchOpacity: 0.1,
			stroke: oldRose,
			strokeWidth: 1,
			radius: 3,
			shadow: true,
			detailInset: 2.5,
			typography: { color: "#5d4a47", fontFamily: bodyFontFamily, fontStyle: "italic" },
		},
		topic: {
			shape: "rounded",
			fill: "#fffdf6",
			stroke: "#c1988f",
			strokeWidth: 1,
			radius: 3,
			shadow: true,
			paddingX: 15,
			typography: { color: ink, fontFamily: bodyFontFamily, renderScaleX: 1, renderScaleY: 1 },
		},
		nestedTopic: {
			shape: "rounded",
			fill: "#fdfaf1",
			stroke: "#a8ad8e",
			strokeWidth: 1,
			radius: 3,
			shadow: false,
			typography: { color: "#414432", fontFamily: bodyFontFamily },
		},
		topicHeader: {
			shape: "capsule",
			stroke: oldRose,
			strokeWidth: 1.2,
			radius: 18,
			shadow: true,
			detailInset: 2.5,
			paddingX: 18,
			paddingY: 7,
			typography: {
				color: madder,
				fontFamily: displayFontFamily,
				fontWeight: 700,
				letterSpacing: 0.8,
				renderScaleX: 1,
				renderScaleY: 1,
			},
		},
		boards: {
			topic: {
				shape: "rounded",
				pattern: "none",
				background: "#f6efe2",
				hatch: "#f6efe2",
				hatchOpacity: 0,
				stroke: "#d9c5b2",
				strokeWidth: 0.9,
				padding: 17,
			},
			nested: {
				shape: "rounded",
				pattern: "none",
				background: "#f4f1e3",
				hatch: "#f4f1e3",
				hatchOpacity: 0,
				stroke: "#c5c8ab",
				strokeWidth: 0.8,
				padding: 12,
			},
			legend: {
				shape: "rounded",
				pattern: "none",
				background: "#f7f1e5",
				hatch: "#f7f1e5",
				hatchOpacity: 0,
				stroke: "#d9c5b2",
				strokeWidth: 0.8,
				padding: 7,
			},
		},
		connectors: {
			// The spine climbs like a stem; the branches are engraved hairlines
			// budding into rose-hip dots.
			spine: {
				routing: "braided",
				laneSpacing: 6,
				color: "#8f9c7c",
				width: 1.6,
				opacity: 0.55,
			},
			chapterToTopics: {
				routing: "curved",
				color: oldRose,
				width: 1.4,
				dash: "",
				opacity: 0.75,
				endShape: "dot",
				endShapeJoin: "detached",
			},
			topicToChildren: {
				routing: "curved",
				color: "#8b9878",
				width: 1.2,
				dash: "",
				opacity: 0.7,
				endShape: "dot",
				endShapeJoin: "detached",
			},
		},
		inline: {
			link: madder,
			highlight: "#f3e2bd",
			insertUnderline: oldRose,
			codeBackground: "#f1e9d8",
			abbreviation: "#7c666b",
		},
		shadow: {
			color: "#6d4c44",
			opacity: 0.16,
			offsetX: 1.5,
			offsetY: 2,
			softBlur: 2,
			softOffsetX: 1,
			softOffsetY: 1.5,
			softSaturation: 1,
		},
		backgroundArtifacts: {
			cssVariables: {
				"rose-artifact-ink": "#8a7263",
				"rose-artifact-madder": "#a05c6c",
				"rose-artifact-bloom": "#d9a8ab",
				"rose-artifact-sage": "#8a9a76",
				"rose-artifact-moss": "#6c7d59",
				"rose-artifact-cream": "#efe2c9",
				"rose-artifact-stroke-width": 1.25,
				"background-artifact-opacity": 0.55,
			},
			generate: generateRoseBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#a08d7f", foreground: parchment }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: madder, foreground: parchment },
						{ background: sage, foreground: parchment },
					],
				},
				"personal favourite": {
					badges: [{ background: madder, foreground: parchment }],
				},
				recommended: { badges: [{ background: sage, foreground: parchment }] },
				"not recommended": {
					badges: [{ background: "#b3a394", foreground: "#453b33" }],
				},
				insightful: { badges: [{ background: "#6f5470", foreground: parchment }] },
				"cloud service": { badges: [{ background: "#7f8a96", foreground: parchment }] },
				warning: { badges: [{ background: "#d3ab52", foreground: "#453b33" }] },
			},
		},
	},
	lightTheme,
);

// Wine-dark folio: the same plate seen at dusk — aubergine paper, cream ink,
// madder and sage lifted to keep their character against the dark ground.
const midnightParchment = "#211519";
const creamInk = "#eadfcd";

export const roseDarkTheme: RoadmapTheme = createTheme(
	{
		mode: "dark",
		cssVariables: {
			"chapter-gradient-start": "#33222a",
			"chapter-gradient-end": "#27181f",
			"topic-header-gradient-start": "#2e2027",
			"topic-header-gradient-end": "#241820",
		},
		canvas: { background: midnightParchment },
		heading: {
			title: { color: "#f2d9da" },
			section: { color: "#dda3ac" },
			minor: { color: "#a89087" },
		},
		legend: { color: "#a89087" },
		chapter: { stroke: "#c67287", typography: { color: "#f6e3e0" } },
		note: {
			fill: "#2b2024",
			stroke: "#6e5a51",
			typography: { color: "#d9c8b8" },
		},
		floatingNote: {
			fill: "#2b2024",
			hatch: "#b07b83",
			hatchOpacity: 0.12,
			stroke: "#a06e76",
			typography: { color: "#d9c8b8" },
		},
		topic: { fill: "#2b2024", stroke: "#8d6a66", typography: { color: creamInk } },
		nestedTopic: {
			fill: "#272620",
			stroke: "#79805f",
			typography: { color: "#d6d5be" },
		},
		topicHeader: { stroke: "#b07b83", typography: { color: "#e9b7c0" } },
		boards: {
			topic: {
				background: "#291d21",
				hatch: "#291d21",
				stroke: "#55413c",
			},
			nested: {
				background: "#26251e",
				hatch: "#26251e",
				stroke: "#4e5340",
			},
			legend: {
				background: "#291d21",
				hatch: "#291d21",
				stroke: "#55413c",
			},
		},
		connectors: {
			spine: { color: "#77855f", opacity: 0.6 },
			chapterToTopics: { color: "#bd8189", opacity: 0.8 },
			topicToChildren: { color: "#8d9a74", opacity: 0.72 },
		},
		inline: {
			link: "#e39aa9",
			highlight: "#6b5426",
			insertUnderline: "#bd8189",
			codeBackground: "#332a26",
			abbreviation: "#b39a90",
		},
		shadow: { color: "#0a0507", opacity: 0.5 },
		backgroundArtifacts: {
			cssVariables: {
				"rose-artifact-ink": "#93826f",
				"rose-artifact-madder": "#b57682",
				"rose-artifact-bloom": "#8d5d64",
				"rose-artifact-sage": "#7f9068",
				"rose-artifact-moss": "#66774f",
				"rose-artifact-cream": "#4d4335",
				"rose-artifact-stroke-width": 1.25,
				"background-artifact-opacity": 0.5,
			},
			generate: generateRoseBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#7d6c5c", foreground: creamInk }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: "#a75a6d", foreground: "#f6e3e0" },
						{ background: "#6f8256", foreground: "#eef0dd" },
					],
				},
				"personal favourite": {
					badges: [{ background: "#a75a6d", foreground: "#f6e3e0" }],
				},
				recommended: { badges: [{ background: "#6f8256", foreground: "#eef0dd" }] },
				"not recommended": {
					badges: [{ background: "#6a5c4d", foreground: "#e5d9c5" }],
				},
				insightful: { badges: [{ background: "#846184", foreground: "#f2e6f0" }] },
				"cloud service": { badges: [{ background: "#5f6b78", foreground: "#dfe6ee" }] },
				warning: { badges: [{ background: "#b6903c", foreground: "#241d12" }] },
			},
		},
	},
	roseLightTheme,
);

export const roseTheme = {
	name: "rose",
	modes: { light: roseLightTheme, dark: roseDarkTheme },
	light: roseLightTheme,
	dark: roseDarkTheme,
} as const satisfies RoadmapThemePresetWithModes;
