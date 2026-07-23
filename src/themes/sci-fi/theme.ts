import { createTheme, lightTheme } from "../../theme.ts";
import type { RoadmapTheme, RoadmapThemePresetWithModes } from "../../types.ts";
import { generateSciFiBackgroundArtifacts } from "./background-artifacts.ts";

const fontFamily = "Inter, ui-sans-serif, system-ui, sans-serif";

export const sciFiLightTheme: RoadmapTheme = createTheme(
	{
		name: "sci-fi",
		mode: "light",
		cssVariables: {
			"chapter-gradient-start": "#d8fbff",
			"chapter-gradient-end": "#dcd8ff",
			"topic-header-gradient-start": "#e4fbff",
			"topic-header-gradient-end": "#eeeaff",
			"board-hatch-stroke-width": 1,
		},
		canvas: { background: "#f6fbff" },
		heading: {
			title: { color: "#10263d", fontFamily, fontWeight: 700 },
			section: { color: "#173a55", fontFamily, fontWeight: 500 },
			minor: { color: "#31536c", fontFamily },
		},
		legend: { color: "#31536c", fontFamily },
		chapter: {
			shape: "chamfered",
			stroke: "#45cfe5",
			strokeWidth: 1.5,
			radius: 14,
			shadow: true,
			typography: {
				color: "#10263d",
				fontFamily,
				fontWeight: 600,
				renderScaleX: 1,
			},
		},
		note: {
			shape: "capsule",
			fill: "#edfaff",
			stroke: "#8dddeb",
			strokeWidth: 1,
			radius: 30,
			typography: { color: "#27465e", fontFamily },
		},
		floatingNote: {
			shape: "capsule",
			fill: "#fafdff",
			pattern: "grid",
			hatch: "#66cce0",
			hatchOpacity: 0.14,
			stroke: "#82d8e8",
			radius: 30,
			typography: { color: "#27465e", fontFamily },
		},
		topic: {
			shape: "chamfered",
			fill: "#f9fdff",
			stroke: "#78b8d4",
			radius: 8,
			typography: { color: "#17364d", fontFamily },
		},
		nestedTopic: {
			shape: "capsule",
			fill: "#f9fdff",
			stroke: "#9b91df",
			radius: 8,
			typography: { color: "#17364d", fontFamily },
		},
		topicHeader: {
			shape: "chamfered",
			stroke: "#7f8ce1",
			radius: 10,
			typography: { color: "#17364d", fontFamily, fontWeight: 600 },
		},
		boards: {
			topic: {
				shape: "chamfered",
				pattern: "grid",
				background: "#effaff",
				hatch: "#66cce0",
				hatchOpacity: 0.18,
			},
			nested: {
				shape: "chamfered",
				pattern: "dots",
				background: "#f4f1ff",
				hatch: "#9e91e4",
				hatchOpacity: 0.18,
			},
			legend: {
				shape: "chamfered",
				pattern: "grid",
				background: "#f1fbff",
				hatch: "#66cce0",
				hatchOpacity: 0.18,
			},
		},
		connectors: {
			spine: { routing: "straight", color: "#7ccbd8", width: 4, opacity: 0.55 },
			chapterToTopics: {
				routing: "orthogonal",
				color: "#7c8dde",
				width: 2,
				dash: "3 8",
				opacity: 0.7,
			},
			topicToChildren: {
				routing: "orthogonal",
				laneSpacing: 8,
				color: "#56bdd2",
				width: 2,
				dash: "3 7",
				opacity: 0.65,
			},
		},
		inline: {
			link: "#087da4",
			highlight: "#a9f3da",
			insertUnderline: "#8e7ee7",
			codeBackground: "#e5f5fb",
			abbreviation: "#4c7188",
		},
		shadow: {
			color: "#4abbd0",
			opacity: 0.18,
			offsetX: 2,
			offsetY: 3,
			softBlur: 2.5,
			softOffsetX: 0,
			softOffsetY: 2,
			softSaturation: 1.3,
		},
		backgroundArtifacts: {
			cssVariables: {
				"sci-fi-artifact-cyan": "#4ccbe4",
				"sci-fi-artifact-violet": "#8b7ee8",
				"sci-fi-artifact-mint": "#55d8bd",
				"sci-fi-artifact-stroke-width": 1.4,
				"background-artifact-opacity": 0.32,
			},
			generate: generateSciFiBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#657d98", foreground: "#ffffff" }] },
			tags: {
				recommended: { badges: [{ background: "#26bfa2", foreground: "#ffffff" }] },
				insightful: { badges: [{ background: "#8a75e5", foreground: "#ffffff" }] },
			},
		},
	},
	lightTheme,
);

export const sciFiDarkTheme: RoadmapTheme = createTheme(
	{
		mode: "dark",
		cssVariables: {
			"chapter-gradient-start": "#113951",
			"chapter-gradient-end": "#29275b",
			"topic-header-gradient-start": "#102f48",
			"topic-header-gradient-end": "#24234e",
		},
		canvas: { background: "#07111f" },
		heading: {
			title: { color: "#eaffff" },
			section: { color: "#d8f8ff" },
			minor: { color: "#b9dce8" },
		},
		legend: { color: "#b9dce8" },
		chapter: { stroke: "#54e1f3", typography: { color: "#efffff" } },
		note: { fill: "#0d2235", stroke: "#377d98", typography: { color: "#d6f1f7" } },
		floatingNote: {
			fill: "#0b1c2c",
			hatch: "#35b8d1",
			hatchOpacity: 0.16,
			stroke: "#3a8aa4",
			typography: { color: "#d6f1f7" },
		},
		topic: { fill: "#0d2031", stroke: "#3f718d", typography: { color: "#e5faff" } },
		nestedTopic: { fill: "#111d35", stroke: "#625aaa", typography: { color: "#e5faff" } },
		topicHeader: { stroke: "#786dde", typography: { color: "#f0eeff" } },
		boards: {
			topic: { background: "#091827", hatch: "#35b8d1", hatchOpacity: 0.22 },
			nested: { background: "#11162c", hatch: "#786dde", hatchOpacity: 0.22 },
			legend: { background: "#091827", hatch: "#35b8d1", hatchOpacity: 0.22 },
		},
		connectors: {
			spine: { color: "#3c7485", opacity: 0.72 },
			chapterToTopics: { color: "#786dde", opacity: 0.75 },
			topicToChildren: { color: "#35b8d1", opacity: 0.7 },
		},
		inline: {
			link: "#63dcff",
			highlight: "#227866",
			insertUnderline: "#a99aff",
			codeBackground: "#13283a",
			abbreviation: "#83aaba",
		},
		shadow: { color: "#38d5f2", opacity: 0.22 },
		backgroundArtifacts: {
			cssVariables: {
				"sci-fi-artifact-cyan": "#58e1f5",
				"sci-fi-artifact-violet": "#a99aff",
				"sci-fi-artifact-mint": "#6ce9c9",
				"sci-fi-artifact-stroke-width": 1.4,
				"background-artifact-opacity": 0.38,
			},
			generate: generateSciFiBackgroundArtifacts,
		},
	},
	sciFiLightTheme,
);

export const sciFiTheme = {
	name: "sci-fi",
	modes: { light: sciFiLightTheme, dark: sciFiDarkTheme },
	light: sciFiLightTheme,
	dark: sciFiDarkTheme,
} as const satisfies RoadmapThemePresetWithModes;
