import { createTheme, lightTheme } from "../../theme.ts";
import type { RoadmapTheme, RoadmapThemePreset } from "../../types.ts";
import { generateRoseBackgroundArtifacts } from "./background-artifacts.ts";

const fontFamily = 'ui-rounded, "Avenir Next", "Nunito", system-ui, sans-serif';
const displayFontFamily = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif';

export const roseLightTheme: RoadmapTheme = createTheme(
	{
		name: "rose",
		mode: "light",
		cssVariables: {
			"chapter-gradient-start": "#ffd9e8",
			"chapter-gradient-end": "#f7c4dc",
			"topic-header-gradient-start": "#fce8f3",
			"topic-header-gradient-end": "#eadcf8",
			"board-hatch-stroke-width": 1.4,
			"frame-detail-width": 0.55,
			"frame-detail-opacity": 0.34,
		},
		canvas: { background: "#fff8fb" },
		heading: {
			title: { color: "#5b2944", fontFamily: displayFontFamily, fontWeight: 700 },
			section: { color: "#74405d", fontFamily: displayFontFamily, fontWeight: 600 },
			minor: { color: "#82546c", fontFamily },
		},
		legend: { color: "#82546c", fontFamily },
		chapter: {
			shape: "cameo",
			stroke: "#d96b9b",
			strokeWidth: 1.5,
			radius: 24,
			shadow: true,
			paddingX: 22,
			typography: {
				color: "#592640",
				fontFamily: displayFontFamily,
				fontWeight: 600,
			},
		},
		note: {
			shape: "petal",
			fill: "#fcecf4",
			stroke: "#e6a0bd",
			strokeWidth: 1,
			typography: { color: "#70415a", fontFamily },
		},
		floatingNote: {
			shape: "petal",
			fill: "#fffafd",
			stroke: "#d982aa",
			strokeWidth: 1,
			shadow: true,
			typography: { color: "#70415a", fontFamily },
		},
		topic: {
			shape: "petal",
			fill: "#fffafd",
			stroke: "#d98eae",
			strokeWidth: 1,
			radius: 11,
			shadow: true,
			paddingX: 15,
			typography: { color: "#5f314a", fontFamily },
		},
		nestedTopic: {
			shape: "petal",
			fill: "#fff8fc",
			stroke: "#bfa0dc",
			strokeWidth: 1,
			radius: 18,
			shadow: true,
			typography: { color: "#633753", fontFamily },
		},
		topicHeader: {
			shape: "cameo",
			stroke: "#b878a7",
			strokeWidth: 1.25,
			radius: 18,
			shadow: true,
			paddingX: 22,
			typography: {
				color: "#65334f",
				fontFamily: displayFontFamily,
				fontWeight: 700,
			},
		},
		boards: {
			topic: {
				shape: "scalloped",
				pattern: "floral-lace",
				background: "#fff3f8",
				hatch: "#e6a4c0",
				hatchOpacity: 0.22,
				padding: 17,
			},
			nested: {
				shape: "scalloped",
				pattern: "pearls",
				background: "#faf2ff",
				hatch: "#bc9bda",
				hatchOpacity: 0.24,
				padding: 12,
			},
			legend: {
				shape: "scalloped",
				pattern: "bows",
				background: "#fff5f9",
				hatch: "#d993b4",
				hatchOpacity: 0.22,
				padding: 7,
			},
		},
		connectors: {
			spine: {
				routing: "braided",
				laneSpacing: 7,
				color: "#d08eac",
				width: 2,
				opacity: 0.58,
			},
			chapterToTopics: {
				routing: "curved",
				color: "#c58aaf",
				width: 3,
				dash: "8 8",
				opacity: 0.62,
			},
			topicToChildren: {
				routing: "curved",
				color: "#b99acb",
				width: 2.5,
				dash: "6 7",
				opacity: 0.62,
			},
		},
		inline: {
			link: "#b72f72",
			highlight: "#ffd59f",
			insertUnderline: "#df82ae",
			codeBackground: "#f8e8f1",
			abbreviation: "#8a5670",
		},
		shadow: {
			color: "#9d4770",
			opacity: 0.2,
			offsetX: 2,
			offsetY: 3,
			softBlur: 2.2,
			softOffsetX: 1,
			softOffsetY: 2,
			softSaturation: 1.4,
		},
		backgroundArtifacts: {
			cssVariables: {
				"rose-artifact-blush": "#dc8daf",
				"rose-artifact-berry": "#b9658d",
				"rose-artifact-lavender": "#ab91c8",
				"rose-artifact-pearl": "#e9b7c9",
				"rose-artifact-apricot": "#d9a07f",
				"rose-artifact-mint": "#85b7a8",
				"rose-artifact-sky": "#86aeca",
				"rose-artifact-stroke-width": 1.7,
				"background-artifact-opacity": 0.34,
			},
			generate: generateRoseBackgroundArtifacts,
		},
		badges: {
			unknown: { badges: [{ background: "#aa7792", foreground: "#ffffff" }] },
			tags: {
				"personal recommendation": {
					badges: [
						{ background: "#c95f8d", foreground: "#ffffff" },
						{ background: "#65bfa7", foreground: "#ffffff" },
					],
				},
				"personal favourite": {
					badges: [{ background: "#c95f8d", foreground: "#ffffff" }],
				},
				recommended: { badges: [{ background: "#65bfa7", foreground: "#ffffff" }] },
				insightful: { badges: [{ background: "#a878cf", foreground: "#ffffff" }] },
			},
		},
	},
	lightTheme,
);

export const roseDarkTheme: RoadmapTheme = createTheme(
	{
		mode: "dark",
		cssVariables: {
			"chapter-gradient-start": "#71314e",
			"chapter-gradient-end": "#542941",
			"topic-header-gradient-start": "#593049",
			"topic-header-gradient-end": "#443054",
		},
		canvas: { background: "#1a1017" },
		heading: {
			title: { color: "#ffeaf3" },
			section: { color: "#f6d6e4" },
			minor: { color: "#ddb9ca" },
		},
		legend: { color: "#ddb9ca" },
		chapter: { stroke: "#ef91b9", typography: { color: "#fff2f7" } },
		note: { fill: "#351f2c", stroke: "#91546f", typography: { color: "#f3dce6" } },
		floatingNote: {
			fill: "#2b1a25",
			stroke: "#a86383",
			typography: { color: "#f3dce6" },
		},
		topic: { fill: "#2d1c27", stroke: "#955a75", typography: { color: "#f9e7ef" } },
		nestedTopic: {
			fill: "#2a2033",
			stroke: "#80649d",
			typography: { color: "#f6e8f2" },
		},
		topicHeader: { stroke: "#b8769a", typography: { color: "#fff0f7" } },
		boards: {
			topic: { background: "#241721", hatch: "#a95e7e", hatchOpacity: 0.28 },
			nested: { background: "#241b2d", hatch: "#8366a2", hatchOpacity: 0.3 },
			legend: { background: "#261820", hatch: "#a95e7e", hatchOpacity: 0.26 },
		},
		connectors: {
			spine: { color: "#80566b", opacity: 0.72 },
			chapterToTopics: { color: "#a56789", opacity: 0.75 },
			topicToChildren: { color: "#876b9d", opacity: 0.72 },
		},
		inline: {
			link: "#ff9aca",
			highlight: "#915a31",
			insertUnderline: "#ed91bb",
			codeBackground: "#422536",
			abbreviation: "#d7a7bd",
		},
		shadow: { color: "#080306", opacity: 0.48 },
		backgroundArtifacts: {
			cssVariables: {
				"rose-artifact-blush": "#d982aa",
				"rose-artifact-berry": "#c26a94",
				"rose-artifact-lavender": "#a487c4",
				"rose-artifact-pearl": "#d6a5b9",
				"rose-artifact-apricot": "#c58d70",
				"rose-artifact-mint": "#78a99c",
				"rose-artifact-sky": "#789db8",
				"rose-artifact-stroke-width": 1.7,
				"background-artifact-opacity": 0.38,
			},
			generate: generateRoseBackgroundArtifacts,
		},
	},
	roseLightTheme,
);

export const roseTheme = {
	name: "rose",
	modes: { light: roseLightTheme, dark: roseDarkTheme },
	light: roseLightTheme,
	dark: roseDarkTheme,
} as const satisfies RoadmapThemePreset & {
	readonly light: RoadmapTheme;
	readonly dark: RoadmapTheme;
};
