import { createTheme, lightTheme } from "../../theme.ts";
import type { RoadmapTheme, RoadmapThemePreset } from "../../types.ts";

const bodyFontFamily =
	'"Avenir Next", Avenir, Seravek, "Gill Sans", "Segoe UI", "Helvetica Neue", sans-serif';
const displayFontFamily =
	'ui-serif, "New York", "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif';

const paper = "#fbfaf6";
const ink = "#1b1a17";
const inkMuted = "#57534b";
const hairline = "#d8d4ca";
const crimson = "#9c392c";

const { backgroundArtifacts: _funBackgroundArtifacts, ...artifactFreeBaseTheme } = lightTheme;

export const printLightTheme: RoadmapTheme = createTheme(
	{
		name: "print",
		mode: "light",
		cssVariables: {
			"chapter-gradient-start": ink,
			"chapter-gradient-end": ink,
			"topic-header-gradient-start": "#ffffff",
			"topic-header-gradient-end": "#ffffff",
			"board-hatch-stroke-width": 0,
		},
		canvas: { background: paper },
		heading: {
			title: {
				color: ink,
				fontFamily: displayFontFamily,
				fontSize: 27,
				fontWeight: 600,
			},
			section: {
				color: ink,
				fontFamily: displayFontFamily,
				fontWeight: 600,
			},
			minor: { color: inkMuted, fontFamily: bodyFontFamily, fontWeight: 500 },
		},
		legend: {
			color: inkMuted,
			fontFamily: bodyFontFamily,
			fontStyle: "normal",
		},
		chapter: {
			shape: "rounded",
			stroke: ink,
			strokeWidth: 1,
			radius: 0,
			shadow: false,
			paddingX: 18,
			paddingY: 8,
			typography: {
				color: "#f7f5ef",
				fontFamily: displayFontFamily,
				fontWeight: 600,
			},
		},
		note: {
			shape: "rounded",
			fill: paper,
			stroke: "none",
			strokeWidth: 0,
			radius: 0,
			shadow: false,
			typography: {
				color: "#48443d",
				fontFamily: displayFontFamily,
				fontStyle: "italic",
			},
		},
		floatingNote: {
			shape: "rounded",
			fill: "#ffffff",
			stroke: hairline,
			strokeWidth: 1,
			radius: 0,
			shadow: false,
			paddingX: 10,
			typography: {
				color: "#48443d",
				fontFamily: displayFontFamily,
				fontStyle: "italic",
			},
		},
		topic: {
			shape: "rounded",
			fill: "#ffffff",
			stroke: "#cbc7bd",
			strokeWidth: 0.75,
			radius: 0,
			shadow: false,
			typography: { color: "#26241f", fontFamily: bodyFontFamily, fontWeight: 500 },
		},
		nestedTopic: {
			shape: "rounded",
			fill: "#f5f3ec",
			stroke: "#cfcbc1",
			strokeWidth: 0.75,
			radius: 0,
			shadow: false,
			typography: { color: "#33302a", fontFamily: bodyFontFamily, fontWeight: 500 },
		},
		topicHeader: {
			shape: "rounded",
			stroke: ink,
			strokeWidth: 1,
			radius: 0,
			shadow: false,
			paddingX: 16,
			typography: {
				color: ink,
				fontFamily: displayFontFamily,
				fontWeight: 600,
			},
		},
		boards: {
			topic: {
				shape: "rounded",
				pattern: "none",
				background: "#f2f0e9",
				hatch: "#f2f0e9",
				hatchOpacity: 0,
				padding: 14,
			},
			nested: {
				shape: "rounded",
				pattern: "none",
				background: "#ebe9e1",
				hatch: "#ebe9e1",
				hatchOpacity: 0,
				padding: 10,
			},
			legend: {
				shape: "rounded",
				pattern: "none",
				background: "#f2f0e9",
				hatch: "#f2f0e9",
				hatchOpacity: 0,
				padding: 7,
			},
		},
		connectors: {
			spine: {
				routing: "straight",
				color: "#8f8a80",
				width: 1.5,
				dash: "",
				opacity: 0.7,
			},
			chapterToTopics: {
				routing: "straight",
				color: "#9c978d",
				width: 1,
				dash: "",
				opacity: 0.75,
			},
			topicToChildren: {
				routing: "curved",
				color: "#aaa59a",
				width: 0.75,
				dash: "",
				opacity: 0.8,
			},
		},
		inline: {
			link: "#3d3a33",
			highlight: "#f0e0a8",
			insertUnderline: crimson,
			codeBackground: "#eeece4",
			abbreviation: "#6e6a61",
		},
		shadow: {
			color: ink,
			opacity: 0.08,
			softBlur: 1.5,
			softOffsetX: 0,
			softOffsetY: 1,
			softSaturation: 0,
		},
		badges: {
			unknown: { badges: [{ background: "#79756c", foreground: "#ffffff" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: crimson, foreground: "#ffffff" },
						{ background: "#5e7355", foreground: "#ffffff" },
					],
				},
				"personal favourite": {
					badges: [{ background: crimson, foreground: "#ffffff" }],
				},
				recommended: {
					badges: [{ background: "#5e7355", foreground: "#ffffff" }],
				},
				"not recommended": {
					badges: [{ background: "#79756c", foreground: "#ffffff" }],
				},
				insightful: { badges: [{ background: "#a07f39", foreground: "#ffffff" }] },
				"cloud service": {
					badges: [{ background: "#54707f", foreground: "#ffffff" }],
				},
				warning: { badges: [{ background: "#c0a45a", foreground: ink }] },
			},
		},
	},
	artifactFreeBaseTheme,
);

const paperDark = "#171613";
const inkDark = "#ebe8df";

export const printDarkTheme: RoadmapTheme = createTheme(
	{
		mode: "dark",
		cssVariables: {
			"chapter-gradient-start": inkDark,
			"chapter-gradient-end": inkDark,
			"topic-header-gradient-start": "#1e1d1a",
			"topic-header-gradient-end": "#1e1d1a",
		},
		canvas: { background: paperDark },
		heading: {
			title: { color: inkDark },
			section: { color: "#ddd9cf" },
			minor: { color: "#a8a49a" },
		},
		legend: { color: "#a8a49a" },
		chapter: { stroke: inkDark, typography: { color: "#191815" } },
		note: {
			fill: paperDark,
			stroke: "none",
			typography: { color: "#b6b2a8" },
		},
		floatingNote: {
			fill: "#1e1d1a",
			stroke: "#43403a",
			typography: { color: "#b6b2a8" },
		},
		topic: { fill: "#1e1d1a", stroke: "#4b4841", typography: { color: "#e4e1d8" } },
		nestedTopic: {
			fill: "#252420",
			stroke: "#4b4841",
			typography: { color: "#d8d5cc" },
		},
		topicHeader: { stroke: "#b3afa4", typography: { color: inkDark } },
		boards: {
			topic: { background: "#1c1b18", hatch: "#1c1b18" },
			nested: { background: "#21201c", hatch: "#21201c" },
			legend: { background: "#1c1b18", hatch: "#1c1b18" },
		},
		connectors: {
			spine: { color: "#767168", opacity: 0.75 },
			chapterToTopics: { color: "#6b675f", opacity: 0.8 },
			topicToChildren: { color: "#5f5b53", opacity: 0.85 },
		},
		inline: {
			link: "#cfcabe",
			highlight: "#6b5a26",
			insertUnderline: "#d98a74",
			codeBackground: "#2b2a25",
			abbreviation: "#9d998f",
		},
		shadow: { color: "#000000", opacity: 0.35 },
		badges: {
			unknown: { badges: [{ background: "#79756c", foreground: "#ffffff" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: "#b3543f", foreground: "#ffffff" },
						{ background: "#6d8562", foreground: "#ffffff" },
					],
				},
				"personal favourite": {
					badges: [{ background: "#b3543f", foreground: "#ffffff" }],
				},
				recommended: {
					badges: [{ background: "#6d8562", foreground: "#ffffff" }],
				},
				insightful: { badges: [{ background: "#b0904c", foreground: "#191815" }] },
				warning: { badges: [{ background: "#bfa45e", foreground: "#191815" }] },
			},
		},
	},
	printLightTheme,
);

export const printTheme = {
	name: "print",
	modes: { light: printLightTheme, dark: printDarkTheme },
	light: printLightTheme,
	dark: printDarkTheme,
} as const satisfies RoadmapThemePreset & {
	readonly light: RoadmapTheme;
	readonly dark: RoadmapTheme;
};
