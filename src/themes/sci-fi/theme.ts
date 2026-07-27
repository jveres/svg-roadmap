import { createTheme, lightTheme } from "../../theme.ts";
import type { RoadmapTheme, RoadmapThemePresetWithModes } from "../../types.ts";
import { generateSciFiBackgroundArtifacts } from "./background-artifacts.ts";

// No ui-sans-serif/system-ui: Safari resolves those to the system font whose
// advance widths change with the effective on-screen size (SF optical
// tracking), so a scaled or zoomed SVG drifts from every measured width.
// Named faces keep one set of metrics at every scale.
// Prose tier: Seravek's rounded geometry reads mission-briefing without
// Futura's near-black bold cut, and its full weight range keeps strong runs
// proportionate. Trebuchet is the closest widely-available fallback.
const fontFamily = 'Seravek, "Trebuchet MS", "Helvetica Neue", Helvetica, sans-serif';
// Control-panel display type: DIN Alternate on macOS, Bahnschrift on Windows
// (both engineering DIN faces), then geometric fallbacks. The face ships
// bold-only on macOS, so display text always requests heavy weights.
const displayFontFamily =
	'"DIN Alternate", Bahnschrift, "Franklin Gothic Medium", Futura, "Arial Narrow", sans-serif';

export const sciFiLightTheme: RoadmapTheme = createTheme(
	{
		name: "sci-fi",
		mode: "light",
		// Wide-tracked display type shapes better as one flowing run; lines
		// carrying decorations still fall back to positioned painting.
		textPainting: "flowing",
		// A HUD indicator: the chamfer's cut corner fills in signal cyan, so
		// the mark is part of the frame geometry rather than a sticker on it.
		noteMarker: { shape: "notch", color: "#4ccbe4", opacity: 0.85 },
		cssVariables: {
			"chapter-gradient-start": "#d8fbff",
			"chapter-gradient-end": "#dcd8ff",
			"topic-header-gradient-start": "#e4fbff",
			"topic-header-gradient-end": "#eeeaff",
			"board-hatch-stroke-width": 1,
			"frame-detail-width": 0.6,
			"frame-detail-opacity": 0.5,
		},
		canvas: { background: "#f6fbff" },
		heading: {
			title: {
				color: "#10263d",
				fontFamily: displayFontFamily,
				fontWeight: 700,
				letterSpacing: 0.6,
			},
			section: {
				color: "#173a55",
				fontFamily: displayFontFamily,
				fontWeight: 700,
				letterSpacing: 0.5,
			},
			minor: { color: "#31536c", fontFamily: displayFontFamily, letterSpacing: 0.5 },
		},
		legend: { color: "#31536c", fontFamily, fontStyle: "normal", letterSpacing: 0.4 },
		chapter: {
			shape: "chamfered",
			stroke: "#45cfe5",
			strokeWidth: 1.5,
			radius: 14,
			shadow: true,
			detailInset: 2.5,
			typography: {
				color: "#10263d",
				fontFamily: displayFontFamily,
				fontWeight: 700,
				letterSpacing: 0.8,
				renderScaleX: 1,
			},
		},
		note: {
			shape: "capsule",
			fill: "#edfaff",
			stroke: "#8dddeb",
			strokeWidth: 1,
			radius: 30,
			// Painted at 12.5px to match the topic text size.
			typography: { color: "#27465e", fontFamily, fontSize: 12.5, renderScale: 1 },
		},
		floatingNote: {
			shape: "capsule",
			fill: "#fafdff",
			pattern: "grid",
			hatch: "#66cce0",
			hatchOpacity: 0.14,
			stroke: "#82d8e8",
			radius: 30,
			typography: { color: "#27465e", fontFamily, fontSize: 12.5, renderScale: 1 },
		},
		topic: {
			shape: "chamfered",
			fill: "#f9fdff",
			stroke: "#78b8d4",
			radius: 8,
			typography: {
				color: "#17364d",
				fontFamily: displayFontFamily,
				letterSpacing: 0.3,
				renderScaleX: 1,
				renderScaleY: 1,
			},
		},
		nestedTopic: {
			shape: "capsule",
			fill: "#f9fdff",
			stroke: "#9b91df",
			radius: 8,
			typography: { color: "#17364d", fontFamily: displayFontFamily, letterSpacing: 0.3 },
		},
		topicHeader: {
			shape: "chamfered",
			stroke: "#7f8ce1",
			radius: 10,
			detailInset: 2,
			shadowColor: "#8b7ee8",
			shadowOpacity: 0.2,
			typography: {
				color: "#17364d",
				fontFamily: displayFontFamily,
				fontWeight: 700,
				letterSpacing: 1.2,
				textTransform: "uppercase",
				renderScaleX: 1,
				renderScaleY: 1,
			},
		},
		boards: {
			topic: {
				shape: "chamfered",
				pattern: "grid",
				background: "#effaff",
				hatch: "#66cce0",
				hatchOpacity: 0.18,
				stroke: "#7fd4e5",
				strokeWidth: 0.75,
			},
			nested: {
				shape: "chamfered",
				pattern: "dots",
				background: "#f4f1ff",
				hatch: "#9e91e4",
				hatchOpacity: 0.18,
				stroke: "#ab9fe8",
				strokeWidth: 0.75,
			},
			legend: {
				shape: "chamfered",
				pattern: "grid",
				background: "#f1fbff",
				hatch: "#66cce0",
				hatchOpacity: 0.18,
				stroke: "#7fd4e5",
				strokeWidth: 0.75,
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
				endShape: "circle",
			},
			topicToChildren: {
				routing: "orthogonal",
				laneSpacing: 8,
				color: "#56bdd2",
				width: 2,
				dash: "3 7",
				opacity: 0.65,
				endShape: "circle",
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
		noteMarker: { color: "#58e1f5" },
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
			topic: { background: "#091827", hatch: "#35b8d1", hatchOpacity: 0.22, stroke: "#2b7f95" },
			nested: { background: "#11162c", hatch: "#786dde", hatchOpacity: 0.22, stroke: "#544d9e" },
			legend: { background: "#091827", hatch: "#35b8d1", hatchOpacity: 0.22, stroke: "#2b7f95" },
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
