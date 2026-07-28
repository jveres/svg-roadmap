import { artifactFreeLightTheme, createTheme } from "../../theme.ts";
import type { RoadmapTheme, RoadmapThemePresetWithModes } from "../../types.ts";
import { generateAsciiBackgroundArtifacts } from "./background-artifacts.ts";

const monoFontFamily =
	'"Berkeley Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace';

// Monospace diagram-zine styling: double-ruled boxes, halftone block shadows,
// and solid arrowed rules. Light mode prints on warm paper; dark mode is the
// midnight-navy original.
const paper = "#fbf8f1";
const ink = "#1c1a15";
const inkMuted = "#6b6559";
const rule = "#2e2b24";

export const asciiLightTheme: RoadmapTheme = createTheme(
	{
		name: "ascii",
		mode: "light",
		cssVariables: {
			"chapter-gradient-start": paper,
			"chapter-gradient-end": paper,
			"topic-header-gradient-start": paper,
			"topic-header-gradient-end": paper,
			"board-hatch-stroke-width": 0,
			"frame-detail-width": 1.2,
			"frame-detail-opacity": 0.95,
		},
		canvas: { background: paper },
		heading: {
			title: {
				color: ink,
				fontFamily: monoFontFamily,
				fontSize: 22,
				fontWeight: 700,
				letterSpacing: 1.2,
				textTransform: "uppercase",
			},
			section: {
				color: ink,
				fontFamily: monoFontFamily,
				fontWeight: 700,
				letterSpacing: 1,
				textTransform: "uppercase",
			},
			minor: { color: inkMuted, fontFamily: monoFontFamily, fontWeight: 500 },
		},
		legend: {
			color: inkMuted,
			fontFamily: monoFontFamily,
			fontStyle: "normal",
			fontSize: 9.5,
			letterSpacing: 0.8,
			textTransform: "uppercase",
		},
		chapter: {
			shape: "rounded",
			stroke: ink,
			strokeWidth: 1.5,
			radius: 0,
			shadow: true,
			detailInset: 3.5,
			paddingX: 18,
			paddingY: 9,
			typography: {
				color: ink,
				fontFamily: monoFontFamily,
				fontWeight: 700,
				letterSpacing: 1,
				textTransform: "uppercase",
			},
		},
		note: {
			shape: "rounded",
			fill: paper,
			stroke: "#8a8474",
			strokeWidth: 1.25,
			radius: 0,
			shadow: false,
			typography: { color: "#3d3a32", fontFamily: monoFontFamily },
		},
		floatingNote: {
			shape: "rounded",
			fill: paper,
			pattern: "none",
			stroke: rule,
			strokeWidth: 1.5,
			radius: 0,
			shadow: true,
			detailInset: 3,
			typography: { color: "#3d3a32", fontFamily: monoFontFamily },
		},
		topic: {
			shape: "rounded",
			fill: paper,
			stroke: rule,
			strokeWidth: 1.5,
			radius: 0,
			shadow: true,
			typography: {
				color: ink,
				fontFamily: monoFontFamily,
				fontWeight: 500,
				renderScaleX: 1,
				renderScaleY: 1,
			},
		},
		nestedTopic: {
			shape: "rounded",
			fill: paper,
			stroke: "#57534a",
			strokeWidth: 1.25,
			radius: 0,
			shadow: false,
			typography: { color: "#33302a", fontFamily: monoFontFamily, fontWeight: 500 },
		},
		topicHeader: {
			shape: "rounded",
			stroke: ink,
			strokeWidth: 1.5,
			radius: 0,
			shadow: true,
			detailInset: 3,
			paddingX: 14,
			// The double border eats the inset on both sides; extra vertical
			// padding keeps the text from crowding the inner rule.
			paddingY: 9,
			typography: {
				color: ink,
				fontFamily: monoFontFamily,
				fontSize: 11.5,
				fontWeight: 700,
				letterSpacing: 1,
				textTransform: "uppercase",
				renderScaleX: 1,
				renderScaleY: 1,
			},
		},
		boards: {
			topic: {
				shape: "stepped",
				pattern: "none",
				background: paper,
				hatch: paper,
				hatchOpacity: 0,
				stroke: rule,
				strokeWidth: 1.25,
				radius: 0,
				padding: 16,
			},
			nested: {
				shape: "rounded",
				pattern: "none",
				background: paper,
				hatch: paper,
				hatchOpacity: 0,
				stroke: "#8a8474",
				strokeWidth: 1,
				radius: 0,
				padding: 12,
			},
			legend: {
				shape: "rounded",
				pattern: "none",
				background: paper,
				hatch: paper,
				hatchOpacity: 0,
				stroke: "#8a8474",
				strokeWidth: 1,
				radius: 0,
				padding: 8,
			},
		},
		connectors: {
			spine: {
				routing: "straight",
				color: "#8a8474",
				width: 1.5,
				dash: "",
				opacity: 0.9,
			},
			chapterToTopics: {
				routing: "orthogonal",
				color: "#4a463c",
				width: 1.5,
				dash: "",
				opacity: 0.95,
				endShape: "arrow",
				endShapeJoin: "detached",
			},
			topicToChildren: {
				routing: "orthogonal",
				laneSpacing: 10,
				color: "#4a463c",
				width: 1.5,
				dash: "",
				opacity: 0.95,
				endShape: "arrow",
				endShapeJoin: "detached",
			},
		},
		inline: {
			link: ink,
			highlight: "#f2e3af",
			insertUnderline: "#8a8474",
			codeBackground: "#efeadd",
			abbreviation: inkMuted,
		},
		shadow: {
			color: ink,
			opacity: 0.5,
			pattern: "halftone",
			offsetX: 4,
			offsetY: 4,
			softBlur: 0.5,
			softOffsetX: 1,
			softOffsetY: 1,
			softSaturation: 0,
		},
		backgroundArtifacts: {
			cssVariables: {
				"ascii-artifact-ink": "#6b6559",
				"ascii-artifact-faint": "#a39c8b",
				"ascii-artifact-stroke-width": 1.4,
				"background-artifact-opacity": 0.5,
			},
			generate: generateAsciiBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#a39c8b", foreground: "#fbf8f1" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: rule, foreground: "#fbf8f1" },
						{ background: inkMuted, foreground: "#fbf8f1" },
					],
				},
				"personal favourite": {
					badges: [{ background: rule, foreground: "#fbf8f1" }],
				},
				recommended: {
					badges: [{ background: inkMuted, foreground: "#fbf8f1" }],
				},
				"not recommended": {
					badges: [{ background: "#c4bdac", foreground: ink }],
				},
				insightful: { badges: [{ background: "#4a463c", foreground: "#fbf8f1" }] },
				"cloud service": {
					badges: [{ background: "#8a8474", foreground: "#fbf8f1" }],
				},
				warning: { badges: [{ background: "#e3d6ae", foreground: ink }] },
			},
		},
	},
	artifactFreeLightTheme,
);

// The midnight-navy original: light rules and halftone dust on deep blue-black.
const midnight = "#10141d";
const inkDark = "#d8dbe2";

export const asciiDarkTheme: RoadmapTheme = createTheme(
	{
		mode: "dark",
		cssVariables: {
			"chapter-gradient-start": midnight,
			"chapter-gradient-end": midnight,
			"topic-header-gradient-start": midnight,
			"topic-header-gradient-end": midnight,
		},
		canvas: { background: midnight },
		heading: {
			title: { color: inkDark },
			section: { color: "#c6cad3" },
			minor: { color: "#8d93a1" },
		},
		legend: { color: "#8d93a1" },
		chapter: { stroke: inkDark, typography: { color: inkDark } },
		note: {
			fill: midnight,
			stroke: "#5d6371",
			typography: { color: "#aeb4c2" },
		},
		floatingNote: {
			fill: midnight,
			stroke: "#c6cad3",
			typography: { color: "#aeb4c2" },
		},
		topic: { fill: midnight, stroke: "#c6cad3", typography: { color: inkDark } },
		nestedTopic: {
			fill: midnight,
			stroke: "#8d93a1",
			typography: { color: "#c6cad3" },
		},
		topicHeader: { stroke: inkDark, typography: { color: inkDark } },
		boards: {
			topic: { background: midnight, hatch: midnight, stroke: "#c6cad3" },
			nested: { background: midnight, hatch: midnight, stroke: "#5d6371" },
			legend: { background: midnight, hatch: midnight, stroke: "#5d6371" },
		},
		connectors: {
			spine: { color: "#5d6371", opacity: 0.9 },
			chapterToTopics: { color: "#c6cad3", opacity: 0.95 },
			topicToChildren: { color: "#c6cad3", opacity: 0.95 },
		},
		inline: {
			link: "#eef0f4",
			highlight: "#3a4157",
			insertUnderline: "#8d93a1",
			codeBackground: "#1b2130",
			abbreviation: "#8d93a1",
		},
		shadow: { color: "#aeb4c2", opacity: 0.5 },
		backgroundArtifacts: {
			cssVariables: {
				"ascii-artifact-ink": "#8d93a1",
				"ascii-artifact-faint": "#5d6371",
				"ascii-artifact-stroke-width": 1.4,
				"background-artifact-opacity": 0.5,
			},
			generate: generateAsciiBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#5d6371", foreground: midnight }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: inkDark, foreground: midnight },
						{ background: "#8d93a1", foreground: midnight },
					],
				},
				"personal favourite": {
					badges: [{ background: inkDark, foreground: midnight }],
				},
				recommended: {
					badges: [{ background: "#8d93a1", foreground: midnight }],
				},
				"not recommended": {
					badges: [{ background: "#3a4157", foreground: inkDark }],
				},
				insightful: { badges: [{ background: "#c6cad3", foreground: midnight }] },
				"cloud service": {
					badges: [{ background: "#5d6371", foreground: inkDark }],
				},
				warning: { badges: [{ background: "#d9d29a", foreground: midnight }] },
			},
		},
	},
	asciiLightTheme,
);

export const asciiTheme = {
	name: "ascii",
	modes: { light: asciiLightTheme, dark: asciiDarkTheme },
	light: asciiLightTheme,
	dark: asciiDarkTheme,
} as const satisfies RoadmapThemePresetWithModes;
