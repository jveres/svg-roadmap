import { artifactFreeLightTheme, createTheme } from "../../theme.ts";
import type { RoadmapTheme, RoadmapThemePresetWithModes } from "../../types.ts";
import { generateRetroBackgroundArtifacts } from "./background-artifacts.ts";

const bodyFontFamily = 'Futura, "Century Gothic", "Trebuchet MS", Verdana, sans-serif';
const displayFontFamily =
	'"Arial Rounded MT Bold", "Cooper Black", "Chalkboard SE", Futura, sans-serif';

const cocoa = "#4a3527";
const cocoaMuted = "#7a5f45";
const burntOrange = "#b3502d";

export const retroLightTheme: RoadmapTheme = createTheme(
	{
		name: "retro",
		mode: "light",
		cssVariables: {
			"chapter-gradient-start": "#e07a3f",
			"chapter-gradient-end": "#c95f2a",
			"topic-header-gradient-start": "#f2cf63",
			"topic-header-gradient-end": "#e3b33c",
			"board-hatch-stroke-width": 2,
			"frame-detail-width": 0.9,
			"frame-detail-opacity": 0.55,
		},
		canvas: { background: "#f7edda" },
		heading: {
			title: {
				color: "#53381f",
				fontFamily: displayFontFamily,
				fontSize: 26,
				fontWeight: 700,
				letterSpacing: 0.5,
			},
			section: {
				color: "#5f4429",
				fontFamily: displayFontFamily,
				fontWeight: 700,
			},
			minor: { color: cocoaMuted, fontFamily: bodyFontFamily, fontWeight: 500 },
		},
		legend: {
			color: cocoaMuted,
			fontFamily: bodyFontFamily,
			fontStyle: "normal",
		},
		chapter: {
			shape: "capsule",
			stroke: "#8a4520",
			strokeWidth: 2,
			radius: 22,
			shadow: true,
			shadowColor: "#8a3c1a",
			shadowOpacity: 0.38,
			detailInset: 3,
			paddingX: 22,
			paddingY: 8,
			typography: {
				color: "#fdf3e0",
				fontFamily: displayFontFamily,
				fontWeight: 700,
				letterSpacing: 0.4,
			},
		},
		note: {
			shape: "rounded",
			fill: "#f0dfc0",
			stroke: "#c9a86e",
			strokeWidth: 1.5,
			radius: 16,
			shadow: false,
			typography: { color: "#5c4630", fontFamily: bodyFontFamily },
		},
		floatingNote: {
			shape: "rounded",
			fill: "#fdf6e7",
			pattern: "dots",
			hatch: "#cf7b45",
			hatchOpacity: 0.28,
			stroke: "#c9a86e",
			strokeWidth: 1.5,
			radius: 16,
			shadow: true,
			typography: { color: "#5c4630", fontFamily: bodyFontFamily },
		},
		topic: {
			shape: "rounded",
			fill: "#fdf6e7",
			stroke: "#b08c5f",
			strokeWidth: 1.5,
			radius: 10,
			shadow: true,
			typography: { color: cocoa, fontFamily: bodyFontFamily, fontWeight: 500 },
		},
		nestedTopic: {
			shape: "rounded",
			fill: "#f4e6c8",
			gradient: { start: "#f8ecd2", end: "#eeddba" },
			stroke: "#ba9a64",
			strokeWidth: 1.5,
			radius: 14,
			shadow: false,
			typography: { color: "#54402c", fontFamily: bodyFontFamily, fontWeight: 500 },
		},
		topicHeader: {
			shape: "capsule",
			stroke: "#a8802f",
			strokeWidth: 1.5,
			radius: 18,
			shadow: true,
			detailInset: 2.5,
			paddingX: 18,
			typography: {
				color: "#53381f",
				fontFamily: displayFontFamily,
				fontWeight: 700,
				letterSpacing: 0.6,
				textTransform: "uppercase",
			},
		},
		boards: {
			topic: {
				shape: "rounded",
				pattern: "halftone",
				background: "#f1e3c4",
				hatch: "#c9a15f",
				hatchOpacity: 0.32,
				padding: 15,
			},
			nested: {
				shape: "rounded",
				pattern: "waves",
				background: "#ecdcb8",
				hatch: "#bb914d",
				hatchOpacity: 0.4,
				padding: 11,
			},
			legend: {
				shape: "rounded",
				pattern: "waves",
				background: "#f1e3c4",
				hatch: "#c9a15f",
				hatchOpacity: 0.32,
				padding: 7,
			},
		},
		connectors: {
			spine: {
				routing: "braided",
				laneSpacing: 6,
				color: "#c98a4e",
				width: 3,
				dash: "",
				opacity: 0.55,
			},
			chapterToTopics: {
				routing: "curved",
				color: "#b3854f",
				width: 3,
				dash: "0.1 8",
				opacity: 0.75,
			},
			topicToChildren: {
				routing: "curved",
				color: "#bb9464",
				width: 2.5,
				dash: "0.1 7",
				opacity: 0.8,
			},
		},
		inline: {
			link: burntOrange,
			highlight: "#f5d76e",
			insertUnderline: "#cf7b45",
			codeBackground: "#efe2c2",
			abbreviation: cocoaMuted,
		},
		shadow: {
			color: "#59422e",
			opacity: 0.3,
			offsetX: 3,
			offsetY: 3,
			softBlur: 0.6,
			softOffsetX: 2,
			softOffsetY: 2,
			softSaturation: 0.6,
		},
		backgroundArtifacts: {
			cssVariables: {
				"retro-artifact-orange": "#d4763f",
				"retro-artifact-mustard": "#c99b2e",
				"retro-artifact-avocado": "#8a9a4a",
				"retro-artifact-teal": "#4f8d84",
				"retro-artifact-brick": "#b3502d",
				"retro-artifact-stroke-width": 1.9,
				"background-artifact-opacity": 0.4,
			},
			generate: generateRetroBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#8f7a5f", foreground: "#ffffff" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: "#cf5b2e", foreground: "#ffffff" },
						{ background: "#7d9048", foreground: "#ffffff" },
					],
				},
				"personal favourite": {
					badges: [{ background: "#cf5b2e", foreground: "#ffffff" }],
				},
				recommended: {
					badges: [{ background: "#7d9048", foreground: "#ffffff" }],
				},
				"not recommended": {
					badges: [{ background: "#8f7a5f", foreground: "#ffffff" }],
				},
				insightful: { badges: [{ background: "#c8992e", foreground: "#ffffff" }] },
				"cloud service": {
					badges: [{ background: "#3d7a72", foreground: "#ffffff" }],
				},
				warning: { badges: [{ background: "#dfb03a", foreground: "#4a3527" }] },
			},
		},
	},
	artifactFreeLightTheme,
);

export const retroDarkTheme: RoadmapTheme = createTheme(
	{
		mode: "dark",
		cssVariables: {
			"chapter-gradient-start": "#c25f2c",
			"chapter-gradient-end": "#9c4a1f",
			"topic-header-gradient-start": "#9c7c2a",
			"topic-header-gradient-end": "#7f6218",
		},
		canvas: { background: "#241a10" },
		heading: {
			title: { color: "#f4e7cd" },
			section: { color: "#e8d7b6" },
			minor: { color: "#c0a988" },
		},
		legend: { color: "#c0a988" },
		chapter: { stroke: "#e08a52", typography: { color: "#fdf3e0" } },
		note: {
			fill: "#2e2214",
			stroke: "#6d543a",
			typography: { color: "#e2d2b3" },
		},
		floatingNote: {
			fill: "#33261a",
			hatch: "#b3663a",
			hatchOpacity: 0.3,
			stroke: "#7a5f3f",
			typography: { color: "#e2d2b3" },
		},
		topic: { fill: "#33261a", stroke: "#7a5f3f", typography: { color: "#f0e2c6" } },
		nestedTopic: {
			fill: "#3a2c1e",
			gradient: { start: "#40311f", end: "#332616" },
			stroke: "#7a5f3f",
			typography: { color: "#e6d6b8" },
		},
		topicHeader: { stroke: "#b8913b", typography: { color: "#f7ecd2" } },
		boards: {
			topic: { background: "#2b2013", hatch: "#8a6f45", hatchOpacity: 0.4 },
			nested: { background: "#322517", hatch: "#96793f", hatchOpacity: 0.45 },
			legend: { background: "#2b2013", hatch: "#8a6f45", hatchOpacity: 0.35 },
		},
		connectors: {
			spine: { color: "#8a6a4a", opacity: 0.65 },
			chapterToTopics: { color: "#94734b", opacity: 0.75 },
			topicToChildren: { color: "#87693f", opacity: 0.8 },
		},
		inline: {
			link: "#e89a5f",
			highlight: "#7a5c20",
			insertUnderline: "#d98a54",
			codeBackground: "#3a2c1c",
			abbreviation: "#b39877",
		},
		shadow: { color: "#0d0803", opacity: 0.5 },
		backgroundArtifacts: {
			cssVariables: {
				"retro-artifact-orange": "#e08a52",
				"retro-artifact-mustard": "#d9ab3f",
				"retro-artifact-avocado": "#9aa85e",
				"retro-artifact-teal": "#5f9d93",
				"retro-artifact-brick": "#c86a41",
				"retro-artifact-stroke-width": 1.9,
				"background-artifact-opacity": 0.42,
			},
			generate: generateRetroBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#8f7a5f", foreground: "#ffffff" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: "#dd7040", foreground: "#ffffff" },
						{ background: "#8fa25a", foreground: "#ffffff" },
					],
				},
				"personal favourite": {
					badges: [{ background: "#dd7040", foreground: "#ffffff" }],
				},
				recommended: {
					badges: [{ background: "#8fa25a", foreground: "#ffffff" }],
				},
				insightful: { badges: [{ background: "#d9ab3f", foreground: "#241a10" }] },
				"cloud service": {
					badges: [{ background: "#4f938a", foreground: "#ffffff" }],
				},
				warning: { badges: [{ background: "#e3ba4c", foreground: "#241a10" }] },
			},
		},
	},
	retroLightTheme,
);

export const retroTheme = {
	name: "retro",
	modes: { light: retroLightTheme, dark: retroDarkTheme },
	light: retroLightTheme,
	dark: retroDarkTheme,
} as const satisfies RoadmapThemePresetWithModes;
