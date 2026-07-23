import { createTheme, lightTheme } from "../../theme.ts";
import type { RoadmapTheme, RoadmapThemePreset } from "../../types.ts";

const bodyFontFamily =
	'"SF Pro Text", "Segoe UI", system-ui, "Helvetica Neue", "Liberation Sans", sans-serif';
const monoFontFamily =
	'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace';

const slate = "#1f242b";
const slateMuted = "#5a6472";
const steel = "#2e628f";

const { backgroundArtifacts: _funBackgroundArtifacts, ...artifactFreeBaseTheme } = lightTheme;

export const proLightTheme: RoadmapTheme = createTheme(
	{
		name: "pro",
		mode: "light",
		cssVariables: {
			"chapter-gradient-start": "#28313d",
			"chapter-gradient-end": "#1f2731",
			"topic-header-gradient-start": "#e9eff5",
			"topic-header-gradient-end": "#e2e9f1",
			"board-hatch-stroke-width": 1,
		},
		canvas: { background: "#f7f8fa" },
		heading: {
			title: {
				color: slate,
				fontFamily: monoFontFamily,
				fontSize: 24,
				fontWeight: 600,
			},
			section: {
				color: slate,
				fontFamily: monoFontFamily,
				fontWeight: 600,
			},
			minor: { color: slateMuted, fontFamily: bodyFontFamily, fontWeight: 500 },
		},
		legend: {
			color: slateMuted,
			fontFamily: bodyFontFamily,
			fontStyle: "normal",
		},
		chapter: {
			shape: "rounded",
			stroke: "#1a2028",
			strokeWidth: 1,
			radius: 4,
			shadow: true,
			paddingX: 16,
			paddingY: 8,
			typography: {
				color: "#f2f5f8",
				fontFamily: monoFontFamily,
				fontWeight: 600,
			},
		},
		note: {
			shape: "rounded",
			fill: "#edf2f7",
			stroke: "#ccd6e0",
			strokeWidth: 1,
			radius: 4,
			shadow: false,
			typography: { color: "#3c4654", fontFamily: bodyFontFamily },
		},
		floatingNote: {
			shape: "rounded",
			fill: "#ffffff",
			stroke: "#b9c6d4",
			strokeWidth: 1,
			radius: 4,
			shadow: true,
			typography: { color: "#3c4654", fontFamily: bodyFontFamily },
		},
		topic: {
			shape: "rounded",
			fill: "#ffffff",
			stroke: "#cfd6de",
			strokeWidth: 1,
			radius: 4,
			shadow: true,
			typography: { color: "#242b34", fontFamily: bodyFontFamily, fontWeight: 500 },
		},
		nestedTopic: {
			shape: "rounded",
			fill: "#f1f4f7",
			stroke: "#ccd4dc",
			strokeWidth: 1,
			radius: 4,
			shadow: false,
			typography: { color: "#333c47", fontFamily: bodyFontFamily, fontWeight: 500 },
		},
		topicHeader: {
			shape: "rounded",
			stroke: "#b3c1cf",
			strokeWidth: 1,
			radius: 4,
			shadow: true,
			paddingX: 15,
			typography: {
				color: "#243242",
				fontFamily: monoFontFamily,
				fontWeight: 600,
			},
		},
		boards: {
			topic: {
				shape: "rounded",
				pattern: "grid",
				background: "#eef1f5",
				hatch: "#c3ccd6",
				hatchOpacity: 0.35,
				padding: 14,
			},
			nested: {
				shape: "rounded",
				pattern: "dots",
				background: "#e8ecf1",
				hatch: "#b9c3cf",
				hatchOpacity: 0.4,
				padding: 10,
			},
			legend: {
				shape: "rounded",
				pattern: "grid",
				background: "#eef1f5",
				hatch: "#c3ccd6",
				hatchOpacity: 0.3,
				padding: 7,
			},
		},
		connectors: {
			spine: {
				routing: "straight",
				color: "#7e8b9b",
				width: 2,
				dash: "",
				opacity: 0.65,
			},
			chapterToTopics: {
				routing: "orthogonal",
				color: "#8794a3",
				width: 1.25,
				dash: "",
				opacity: 0.7,
			},
			topicToChildren: {
				routing: "orthogonal",
				laneSpacing: 10,
				color: "#96a2b0",
				width: 1,
				dash: "",
				opacity: 0.75,
			},
		},
		inline: {
			link: steel,
			highlight: "#f6e3a5",
			insertUnderline: steel,
			codeBackground: "#e9edf2",
			abbreviation: "#66707e",
		},
		shadow: {
			color: "#1c2530",
			opacity: 0.09,
			softBlur: 2,
			softOffsetX: 0,
			softOffsetY: 1.5,
			softSaturation: 0,
		},
		badges: {
			unknown: { badges: [{ background: "#78828e", foreground: "#ffffff" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: "#a04b3c", foreground: "#ffffff" },
						{ background: "#4e7d5e", foreground: "#ffffff" },
					],
				},
				"personal favourite": {
					badges: [{ background: "#a04b3c", foreground: "#ffffff" }],
				},
				recommended: {
					badges: [{ background: "#4e7d5e", foreground: "#ffffff" }],
				},
				"not recommended": {
					badges: [{ background: "#78828e", foreground: "#ffffff" }],
				},
				insightful: { badges: [{ background: "#b58a3a", foreground: "#ffffff" }] },
				"cloud service": {
					badges: [{ background: "#46748f", foreground: "#ffffff" }],
				},
				warning: { badges: [{ background: "#d1a545", foreground: "#1f242b" }] },
			},
		},
	},
	artifactFreeBaseTheme,
);

export const proDarkTheme: RoadmapTheme = createTheme(
	{
		mode: "dark",
		cssVariables: {
			"chapter-gradient-start": "#33608c",
			"chapter-gradient-end": "#284b6f",
			"topic-header-gradient-start": "#1d2733",
			"topic-header-gradient-end": "#19222d",
		},
		canvas: { background: "#0f1319" },
		heading: {
			title: { color: "#e3e8ee" },
			section: { color: "#d3dae2" },
			minor: { color: "#98a3b0" },
		},
		legend: { color: "#98a3b0" },
		chapter: { stroke: "#4a7099", typography: { color: "#eef4fa" } },
		note: {
			fill: "#151c25",
			stroke: "#2d3947",
			typography: { color: "#b4bec9" },
		},
		floatingNote: {
			fill: "#171d26",
			stroke: "#3d4b5c",
			typography: { color: "#b4bec9" },
		},
		topic: { fill: "#171d26", stroke: "#394656", typography: { color: "#dde3ea" } },
		nestedTopic: {
			fill: "#1c232e",
			stroke: "#394656",
			typography: { color: "#ccd4dd" },
		},
		topicHeader: { stroke: "#4a5a6e", typography: { color: "#dfe7ef" } },
		boards: {
			topic: { background: "#141a22", hatch: "#2e3a49", hatchOpacity: 0.45 },
			nested: { background: "#171e28", hatch: "#37455a", hatchOpacity: 0.5 },
			legend: { background: "#141a22", hatch: "#2e3a49", hatchOpacity: 0.4 },
		},
		connectors: {
			spine: { color: "#5d6b7d", opacity: 0.75 },
			chapterToTopics: { color: "#566577", opacity: 0.8 },
			topicToChildren: { color: "#4d5b6c", opacity: 0.85 },
		},
		inline: {
			link: "#6ea8dc",
			highlight: "#705c1f",
			insertUnderline: "#6ea8dc",
			codeBackground: "#1f2733",
			abbreviation: "#8e99a7",
		},
		shadow: { color: "#000000", opacity: 0.4 },
		badges: {
			unknown: { badges: [{ background: "#78828e", foreground: "#ffffff" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: "#b45c4a", foreground: "#ffffff" },
						{ background: "#5c8f6e", foreground: "#ffffff" },
					],
				},
				"personal favourite": {
					badges: [{ background: "#b45c4a", foreground: "#ffffff" }],
				},
				recommended: {
					badges: [{ background: "#5c8f6e", foreground: "#ffffff" }],
				},
				insightful: { badges: [{ background: "#c39a48", foreground: "#131820" }] },
				"cloud service": {
					badges: [{ background: "#5586a5", foreground: "#ffffff" }],
				},
				warning: { badges: [{ background: "#d1ae56", foreground: "#131820" }] },
			},
		},
	},
	proLightTheme,
);

export const proTheme = {
	name: "pro",
	modes: { light: proLightTheme, dark: proDarkTheme },
	light: proLightTheme,
	dark: proDarkTheme,
} as const satisfies RoadmapThemePreset & {
	readonly light: RoadmapTheme;
	readonly dark: RoadmapTheme;
};
