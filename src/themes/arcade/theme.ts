import { artifactFreeLightTheme, createTheme } from "../../theme.ts";
import type { RoadmapTheme, RoadmapThemePresetWithModes } from "../../types.ts";
import { generateArcadeBackgroundArtifacts } from "./background-artifacts.ts";

const displayFontFamily = 'Impact, "Arial Black", "Franklin Gothic Bold", sans-serif';
const monoFontFamily = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const inkViolet = "#2a1b4d";
const neonPink = "#e0187e";
const neonCyan = "#0f9fba";

export const arcadeLightTheme: RoadmapTheme = createTheme(
	{
		name: "arcade",
		mode: "light",
		// An insert-coin corner: the chamfered boxes take a neon-pink wedge
		// along the cut, like a lit cabinet bezel.
		noteMarker: { shape: "notch", color: neonPink, opacity: 0.75 },
		cssVariables: {
			"chapter-gradient-start": "#ff2d78",
			"chapter-gradient-end": "#7b2ff7",
			"topic-header-gradient-start": "#c9f3fa",
			"topic-header-gradient-end": "#a7e7f5",
			"board-hatch-stroke-width": 1.2,
			"frame-detail-width": 0.8,
			"frame-detail-opacity": 0.5,
		},
		canvas: { background: "#f5f2fc" },
		heading: {
			title: {
				color: inkViolet,
				fontFamily: displayFontFamily,
				fontSize: 27,
				fontWeight: 400,
				letterSpacing: 1.5,
				textTransform: "uppercase",
			},
			section: {
				color: "#3b2a66",
				fontFamily: displayFontFamily,
				fontWeight: 400,
				letterSpacing: 1,
				textTransform: "uppercase",
			},
			minor: { color: "#6d5f96", fontFamily: monoFontFamily, fontWeight: 500 },
		},
		legend: {
			color: "#6d5f96",
			fontFamily: monoFontFamily,
			fontStyle: "normal",
			fontSize: 9.5,
			letterSpacing: 0.6,
			textTransform: "uppercase",
		},
		chapter: {
			shape: "chamfered",
			stroke: "#b1145e",
			strokeWidth: 2,
			radius: 10,
			shadow: true,
			shadowColor: neonPink,
			shadowOpacity: 0.3,
			detailInset: 2.5,
			paddingX: 20,
			paddingY: 8,
			typography: {
				color: "#ffffff",
				fontFamily: displayFontFamily,
				fontWeight: 400,
				letterSpacing: 1,
				textTransform: "uppercase",
			},
		},
		note: {
			shape: "rounded",
			fill: "#ece7f8",
			stroke: "#b9a9e8",
			strokeWidth: 1.5,
			radius: 8,
			shadow: false,
			typography: { color: "#3b2f5e", fontFamily: monoFontFamily },
		},
		floatingNote: {
			shape: "rounded",
			fill: "#ffffff",
			pattern: "grid",
			hatch: neonPink,
			hatchOpacity: 0.14,
			stroke: "#b9a9e8",
			strokeWidth: 1.5,
			radius: 8,
			shadow: true,
			typography: { color: "#3b2f5e", fontFamily: monoFontFamily },
		},
		topic: {
			shape: "chamfered",
			fill: "#ffffff",
			stroke: "#8f7bd8",
			strokeWidth: 1.5,
			radius: 7,
			shadow: true,
			typography: { color: "#241740", fontFamily: monoFontFamily, fontWeight: 500 },
		},
		nestedTopic: {
			shape: "chamfered",
			fill: "#f2edfd",
			stroke: "#a58fe3",
			strokeWidth: 1.5,
			radius: 7,
			shadow: false,
			typography: { color: "#33245c", fontFamily: monoFontFamily, fontWeight: 500 },
		},
		topicHeader: {
			shape: "chamfered",
			stroke: neonCyan,
			strokeWidth: 2,
			radius: 8,
			shadow: true,
			shadowColor: neonCyan,
			shadowOpacity: 0.25,
			detailInset: 2,
			paddingX: 16,
			// The smaller header face would leave headers shorter than their
			// cells; this padding lands headers at exactly the cell height
			// (11.5 × 1.2 + 2 × 6.6 = 27, matching the cells' 15 + 12).
			paddingY: 6.6,
			typography: {
				color: "#0b4b58",
				fontFamily: monoFontFamily,
				fontSize: 11.5,
				fontWeight: 700,
				letterSpacing: 0.8,
				textTransform: "uppercase",
			},
		},
		boards: {
			topic: {
				shape: "chamfered",
				pattern: "grid",
				background: "#efeafa",
				hatch: "#b39ae0",
				hatchOpacity: 0.4,
				padding: 15,
			},
			nested: {
				shape: "chamfered",
				pattern: "dots",
				background: "#e9e2f7",
				hatch: "#9d81d9",
				hatchOpacity: 0.45,
				padding: 11,
			},
			legend: {
				shape: "chamfered",
				pattern: "grid",
				background: "#efeafa",
				hatch: "#b39ae0",
				hatchOpacity: 0.35,
				padding: 7,
			},
		},
		connectors: {
			spine: {
				routing: "straight",
				color: "#a08cd8",
				width: 3,
				dash: "",
				opacity: 0.6,
			},
			chapterToTopics: {
				routing: "orthogonal",
				color: "#c05dab",
				width: 2,
				dash: "",
				opacity: 0.7,
			},
			topicToChildren: {
				routing: "orthogonal",
				laneSpacing: 10,
				color: "#b06fc9",
				width: 2.5,
				dash: "0.1 8",
				opacity: 0.85,
				endShape: "dot",
				endShapeJoin: "detached",
			},
		},
		inline: {
			link: "#d61f7c",
			highlight: "#ffe95c",
			insertUnderline: "#16c8e0",
			codeBackground: "#ece7f8",
			abbreviation: "#6d5f96",
		},
		shadow: {
			color: inkViolet,
			opacity: 0.22,
			offsetX: 3,
			offsetY: 3,
			softBlur: 1.2,
			softOffsetX: 1,
			softOffsetY: 2,
			softSaturation: 1,
		},
		backgroundArtifacts: {
			cssVariables: {
				"arcade-artifact-yellow": "#dfae12",
				"arcade-artifact-pink": "#e0187e",
				"arcade-artifact-cyan": "#0f9fba",
				"arcade-artifact-purple": "#7b2ff7",
				"arcade-artifact-white": "#ffffff",
				"background-artifact-opacity": 0.38,
			},
			generate: generateArcadeBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#8579ab", foreground: "#ffffff" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: neonPink, foreground: "#ffffff" },
						{ background: "#14a06b", foreground: "#ffffff" },
					],
				},
				"personal favourite": {
					badges: [{ background: neonPink, foreground: "#ffffff" }],
				},
				recommended: {
					badges: [{ background: "#14a06b", foreground: "#ffffff" }],
				},
				"not recommended": {
					badges: [{ background: "#8579ab", foreground: "#ffffff" }],
				},
				insightful: { badges: [{ background: "#d9a900", foreground: "#241740" }] },
				"cloud service": {
					badges: [{ background: neonCyan, foreground: "#ffffff" }],
				},
				warning: { badges: [{ background: "#ffd23f", foreground: "#241740" }] },
			},
		},
	},
	artifactFreeLightTheme,
);

export const arcadeDarkTheme: RoadmapTheme = createTheme(
	{
		mode: "dark",
		noteMarker: { color: "#ff4d94", opacity: 0.85 },
		cssVariables: {
			"chapter-gradient-start": "#ff2d78",
			"chapter-gradient-end": "#7b2ff7",
			"topic-header-gradient-start": "#0d3a46",
			"topic-header-gradient-end": "#14204f",
		},
		canvas: { background: "#0b0616" },
		heading: {
			title: { color: "#ff4d94" },
			section: { color: "#c9b8ff" },
			minor: { color: "#a08cd8" },
		},
		legend: { color: "#a08cd8" },
		chapter: { stroke: "#ff7ab0", typography: { color: "#ffffff" } },
		note: {
			fill: "#140b24",
			stroke: "#4b3585",
			typography: { color: "#cabfe8" },
		},
		floatingNote: {
			fill: "#150c26",
			hatch: "#ff2d78",
			hatchOpacity: 0.22,
			stroke: "#6a4bbf",
			typography: { color: "#cabfe8" },
		},
		topic: { fill: "#150c26", stroke: "#6a4bbf", typography: { color: "#e6dcff" } },
		nestedTopic: {
			fill: "#1b1133",
			stroke: "#7a5ad0",
			typography: { color: "#d9cdf6" },
		},
		topicHeader: {
			stroke: "#29d3ef",
			shadowColor: "#29d3ef",
			shadowOpacity: 0.3,
			typography: { color: "#9ff0ff" },
		},
		boards: {
			topic: { background: "#100822", hatch: "#5b3f9e", hatchOpacity: 0.5 },
			nested: { background: "#160d2c", hatch: "#6d4fc2", hatchOpacity: 0.5 },
			legend: { background: "#100822", hatch: "#5b3f9e", hatchOpacity: 0.45 },
		},
		connectors: {
			spine: { color: "#7d63c4", opacity: 0.7 },
			chapterToTopics: { color: "#c05dab", opacity: 0.8 },
			topicToChildren: { color: "#ffd23f", opacity: 0.9 },
		},
		inline: {
			link: "#29d3ef",
			highlight: "#6b5b12",
			insertUnderline: "#ff4d94",
			codeBackground: "#221340",
			abbreviation: "#a08cd8",
		},
		shadow: { color: "#ff2d78", opacity: 0.3 },
		backgroundArtifacts: {
			cssVariables: {
				"arcade-artifact-yellow": "#ffd23f",
				"arcade-artifact-pink": "#ff4d94",
				"arcade-artifact-cyan": "#29d3ef",
				"arcade-artifact-purple": "#9d6bff",
				"arcade-artifact-white": "#ffffff",
				"background-artifact-opacity": 0.45,
			},
			generate: generateArcadeBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#8579ab", foreground: "#ffffff" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: "#ff4d94", foreground: "#ffffff" },
						{ background: "#1fc487", foreground: "#0b0616" },
					],
				},
				"personal favourite": {
					badges: [{ background: "#ff4d94", foreground: "#ffffff" }],
				},
				recommended: {
					badges: [{ background: "#1fc487", foreground: "#0b0616" }],
				},
				insightful: { badges: [{ background: "#ffd23f", foreground: "#0b0616" }] },
				"cloud service": {
					badges: [{ background: "#29d3ef", foreground: "#0b0616" }],
				},
				warning: { badges: [{ background: "#ffd23f", foreground: "#0b0616" }] },
			},
		},
	},
	arcadeLightTheme,
);

export const arcadeTheme = {
	name: "arcade",
	modes: { light: arcadeLightTheme, dark: arcadeDarkTheme },
	light: arcadeLightTheme,
	dark: arcadeDarkTheme,
} as const satisfies RoadmapThemePresetWithModes;
