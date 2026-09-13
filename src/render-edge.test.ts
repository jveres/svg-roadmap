import { expect, test } from "vitest";
import { decodeXml } from "./core/xml.ts";
import { generateRoadmap, renderRoadmapSvg } from "./index.ts";
import { applyDocumentTags, createTheme, lightTheme } from "./theme.ts";
import type { CardTheme, LayoutConnector } from "./types.ts";

const source = `# Custom theme

A floating note with ~~removed~~ ==highlighted== ++inserted++ H~2~O and x^2^.

* Chapter
*An italic description.*
  + Column
    * Parent [custom]
      > A detail note.
      * Nested
  + Another
    * Second
`;

test.each(["rounded", "chamfered", "capsule", "organic", "cameo", "petal"] as const)(
	"custom %s cards render their frames and inset details safely",
	(shape) => {
		const card = { shape, detailInset: 2, shadow: true } satisfies Partial<CardTheme>;
		const theme = createTheme({
			chapter: card,
			note: card,
			floatingNote: card,
			topic: card,
			nestedTopic: card,
			topicHeader: card,
			noteMarker: { shape: "notch", size: 6, color: "#456789", opacity: 0.5 },
			badges: {
				tags: {
					custom: {
						label: "Custom",
						badges: [{ icon: "star", background: "#ffffff", foreground: "#000000" }],
					},
				},
			},
		});
		const { svg } = generateRoadmap(source, { theme, render: { noteMarkers: true } });
		expect(
			decodeXml(svg.replace(/^<svg\b/u, "<document").replace(/<\/svg>$/u, "</document>")).name,
		).toBe("document");
		expect(svg).toContain(`data-roadmap-shape="${shape}"`);
		expect(svg).toContain('class="roadmap__note-marker"');
		if (shape !== "organic") expect(svg).toContain('class="roadmap__frame-detail');
		expect(svg).not.toMatch(/(?:NaN|Infinity)/u);
	},
);

test("board radius survives theme composition and controls rounded hulls", () => {
	const theme = createTheme({ boards: { topic: { shape: "rounded", radius: 17 } } });
	expect(theme.boards.topic.radius).toBe(17);
	expect(createTheme({}, theme).boards.topic.radius).toBe(17);
	const { svg } = generateRoadmap(source, { theme });
	expect(svg).toMatch(/roadmap__group[^>]*d="[^"]*Q/u);
});

test("partial theme overrides preserve zero values and ignore incomplete accent slots", () => {
	const theme = createTheme({
		cssVariables: { untouched: undefined, zero: 0 },
		chapter: { gradient: { start: "red" }, shadowOpacity: 0, detailInset: 0 },
		connectors: { spine: { gradient: [] } },
		badges: {
			accents: {
				incomplete: { background: "red" },
				complete: { background: "blue", foreground: "white" },
			},
			tags: { empty: { badges: [] } },
		},
	});
	expect(theme.cssVariables).not.toHaveProperty("untouched");
	expect(theme.cssVariables.zero).toBe(0);
	expect(theme.chapter.shadowOpacity).toBe(0);
	expect(theme.chapter.gradient).toBeUndefined();
	expect(theme.connectors.spine.gradient).toBeUndefined();
	expect(theme.badges.accents).not.toHaveProperty("incomplete");
	expect(theme.badges.accents?.complete).toEqual({ background: "blue", foreground: "white" });
	expect(theme.badges.tags.empty?.badges).toEqual(theme.badges.unknown.badges);
});

test("tags without theme fallback badges still get usable paints and icons", () => {
	const base = {
		...lightTheme,
		badges: { ...lightTheme.badges, unknown: { label: "Unknown", badges: [] } },
	};
	const theme = applyDocumentTags(base, {
		raw: {},
		missing: { icon: ":not-registered:" },
		bright: { icon: "heart", accent: "#ffffff" },
		named: { accent: "rebeccapurple" },
	});
	expect(theme.badges.tags.raw?.badges).toEqual([
		{ icon: "question", background: "#777982", foreground: "#ffffff", token: "tag-raw" },
	]);
	expect(theme.badges.tags.missing?.badges[0]?.icon).toBe("question");
	expect(theme.badges.tags.bright?.badges[0]?.foreground).toBe("#22242a");
	expect(theme.badges.tags.named?.badges[0]?.background).toBe("rebeccapurple");
});

test.each(["arrow", "circle", "diamond", "dot"] as const)(
	"%s markers handle detached joins and zero-length routes",
	(endShape) => {
		const { layout } = generateRoadmap("* C\n  * T\n");
		for (const routing of ["straight", "curved", "orthogonal"] as const) {
			const connectors: LayoutConnector[] = [
				{ id: "zero", kind: "chapterToTopics", from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, depth: 0 },
				{
					id: "vertical",
					kind: "topicToChildren",
					from: { x: 20, y: 0 },
					to: { x: 20, y: 100 },
					depth: 1,
				},
			];
			const theme = createTheme({
				connectors: {
					chapterToTopics: { routing, endShape, endShapeJoin: "detached" },
					topicToChildren: { routing, endShape, endShapeJoin: "detached" },
				},
			});
			const svg = renderRoadmapSvg({ ...layout, connectors }, theme, { idPrefix: "edge" });
			expect(svg).toContain("marker-end=");
			expect(svg).not.toMatch(/NaN|Infinity/u);
			expect(svg).toContain('id="edge-zero"');
		}
	},
);

test("plain copyright inherits prose typography while explicit copyright emoji remains artwork", () => {
	const { svg, layout } = generateRoadmap("_© Author_\n\n:copyright:");
	const prose = layout.elements.find(
		(node) =>
			node.kind === "note" &&
			node.text.lines.some((line) =>
				line.segments.some((segment) => segment.text.includes("Author")),
			),
	);
	if (prose?.kind !== "note") throw new Error("Missing prose");
	expect(
		prose.text.lines
			.flatMap((line) => line.segments)
			.some(
				(segment) =>
					segment.text.includes("©") &&
					segment.shortcode === undefined &&
					segment.marks.includes("emphasis"),
			),
	).toBe(true);
	expect(
		layout.elements
			.flatMap((node) =>
				node.kind === "note" ? node.text.lines.flatMap((line) => line.segments) : [],
			)
			.filter((segment) => segment.shortcode === "copyright"),
	).toHaveLength(1);
	expect(svg).toContain("©");
});
