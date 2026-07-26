import { describe, expect, it } from "vitest";
import { noteBlobGeometry, paintedNodeFrameRectangle, paintedTextLines } from "./core/frames.ts";
import { organicBlobPolygon, pointInPolygon } from "./core/geometry.ts";
import {
	generateRoadmap,
	generateRoadmapSvgSync,
	lightTheme,
	renderRoadmapSvg,
	sciFiLightTheme,
} from "./index.ts";
import { orthogonalConnectorPath, orthogonalLaneOffsets } from "./render.ts";
import type {
	LayoutConnector,
	LayoutLegend,
	LayoutNode,
	RoadmapLayout,
	TextLine,
} from "./types.ts";

function svgPrefix(svg: string): string {
	const prefix = svg.match(/<title id="([^"]+)-title">/u)?.[1];
	if (!prefix) throw new Error("SVG title prefix was not found");
	return prefix;
}

function attributeValues(svg: string, attribute: string): string[] {
	const expression = new RegExp(`\\b${attribute}="([^"]+)"`, "gu");
	return [...svg.matchAll(expression)].map((match) => match[1] ?? "");
}

function textElement(svg: string, text: string): string {
	const escapedText = text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
	const element = svg.match(new RegExp(`<text\\b[^>]*>${escapedText}</text>`, "u"))?.[0];
	if (!element) throw new Error(`SVG text element was not found: ${text}`);
	return element;
}

function textX(svg: string, text: string): number {
	const value = textElement(svg, text).match(/\bx="([^"]+)"/u)?.[1];
	if (!value) throw new Error(`SVG text x position was not found: ${text}`);
	return Number(value);
}

function textY(svg: string, text: string): number {
	const value = textElement(svg, text).match(/\by="([^"]+)"/u)?.[1];
	if (!value) throw new Error(`SVG text y position was not found: ${text}`);
	return Number(value);
}

function shortcodeUseY(svg: string, shortcode: string): number {
	const value = svg.match(
		new RegExp(
			`<g class="roadmap__emoji roadmap__emoji--${shortcode}"[^>]*>.*?<use\\b[^>]*\\by="([^"]+)"`,
			"u",
		),
	)?.[1];
	if (!value) throw new Error(`SVG shortcode y position was not found: ${shortcode}`);
	return Number(value);
}

function layoutNode(
	id: string,
	lines: readonly TextLine[],
	options: {
		readonly fontFamily?: string;
		readonly kind?: LayoutNode["kind"];
		readonly placement?: LayoutNode["placement"];
		readonly role?: LayoutNode["role"];
		readonly baselineRatio?: number;
		readonly renderScaleX?: number;
	} = {},
): LayoutNode {
	const kind = options.kind ?? "topic";
	const placement = options.placement ?? "grid-topic";
	const role =
		options.role ??
		(kind === "heading"
			? "heading"
			: kind === "chapter"
				? "chapter"
				: kind === "note"
					? placement === "floating-note"
						? "floating-note"
						: "chapter-description"
					: placement === "nested-topic"
						? "nested-topic"
						: "topic");
	return {
		kind,
		role,
		placement,
		id,
		depth: 1,
		x: 10,
		y: 10,
		width: 180,
		height: 42,
		text: {
			lines,
			fontSize: 10,
			lineHeight: 12,
			fontFamily: options.fontFamily ?? "Arial, Helvetica, sans-serif",
			fontWeight: 400,
			fontStyle: "normal",
			color: "#222227",
			renderScale: 1,
			renderScaleX: options.renderScaleX ?? 1,
			renderScaleY: 1,
			baselineRatio:
				options.baselineRatio ??
				(options.kind === "heading"
					? 0.96
					: options.kind === "chapter"
						? 0.92
						: options.kind === "note" && options.placement === "floating-note"
							? 0.945
							: options.kind === "note"
								? 0.815
								: 0.9),
			abbreviationIndicatorSize: 7.5,
		},
		tags: [],
	};
}

function renderNodes(nodes: readonly LayoutNode[]): string {
	const layout: RoadmapLayout = {
		width: 200,
		height: 80,
		elements: nodes,
		connectors: [],
		backgroundArtifacts: [],
		title: "Renderer behavior",
		maxDepth: 1,
	};
	return renderRoadmapSvg(layout, lightTheme, { idPrefix: "renderer-test" });
}

describe("SVG rendering boundaries", () => {
	it("steps a subtopic connector once at its horizontal midpoint", () => {
		const connector: LayoutConnector = {
			id: "aligned-subtopic",
			kind: "topicToChildren",
			from: { x: 100, y: 40 },
			to: { x: 20, y: 60 },
			depth: 2,
		};

		const path = orthogonalConnectorPath(connector);

		expect(path).toBe("M 100 40 L 60 40 L 60 60 L 20 60");
	});

	it("keeps lanes clear of forbidden vertical rules while preserving lane gaps", () => {
		const connector = (id: string, sourceY: number): LayoutConnector => ({
			id,
			kind: "topicToChildren",
			from: { x: 100, y: sourceY },
			to: { x: 200, y: sourceY + 20 },
			depth: 2,
		});
		const connectors = [connector("first", 40), connector("second", 80)];

		// Natural lanes would sit at 144 and 156; a rule at 145 forces the
		// first lane away without collapsing the gap to the second.
		const offsets = orthogonalLaneOffsets(connectors, 12, [145]);
		const lanes = connectors.map(
			(entry) => (entry.from.x + entry.to.x) / 2 + (offsets.get(entry.id) ?? 0),
		);

		for (const lane of lanes) {
			expect(Math.abs(lane - 145)).toBeGreaterThanOrEqual(6);
		}
		expect((lanes[1] ?? 0) - (lanes[0] ?? 0)).toBeGreaterThanOrEqual(4);
	});

	it("distributes nearby subtopic connectors across separate lanes", () => {
		const connector = (id: string, sourceY: number): LayoutConnector => ({
			id,
			kind: "topicToChildren",
			from: { x: 100, y: sourceY },
			to: { x: 200, y: sourceY + 20 },
			depth: 2,
		});
		const connectors = [connector("first", 40), connector("second", 80), connector("third", 120)];

		const offsets = orthogonalLaneOffsets(connectors, 12);

		expect([...offsets.entries()]).toEqual([
			["first", -12],
			["second", 0],
			["third", 12],
		]);
	});

	it("should preserve measured spacing while scaling mixed inline runs", () => {
		const lines: readonly TextLine[] = [
			{
				width: 100,
				segments: [
					{ text: "alpha ", width: 40, marks: [] },
					{ text: "beta", width: 60, marks: ["strong"] },
				],
			},
		];

		const svg = renderNodes([layoutNode("mixed-runs", lines, { renderScaleX: 1.2 })]);

		expect(textX(svg, "alpha ")).toBe(40);
		expect(textX(svg, "beta")).toBe(88);
		expect(textX(svg, "beta") - textX(svg, "alpha ")).toBe(48);
		expect(textY(svg, "alpha ")).toBe(34);
		expect(textY(svg, "beta")).toBe(34);
		const headingSvg = renderNodes([
			layoutNode("free-heading", lines, { kind: "heading", placement: "standalone" }),
		]);
		expect(textY(headingSvg, "alpha ")).toBe(34.6);
		const noteSvg = renderNodes([
			layoutNode("floating-note", lines, { kind: "note", placement: "floating-note" }),
		]);
		expect(textY(noteSvg, "alpha ")).toBe(34.45);
		const chapterSvg = renderNodes([
			layoutNode("chapter", lines, { kind: "chapter", placement: "chapter" }),
		]);
		expect(textY(chapterSvg, "alpha ")).toBe(34.2);
	});

	it("should fit adjacent sci-fi inline runs as one browser-independent line", () => {
		const lines: readonly TextLine[] = [
			{
				width: 100,
				segments: [
					{ text: "competencies cover ", width: 70, marks: [] },
					{ text: "end to end", width: 30, marks: ["strong"] },
				],
			},
		];
		const layout: RoadmapLayout = {
			width: 200,
			height: 80,
			elements: [layoutNode("sci-fi-mixed-runs", lines)],
			connectors: [],
			backgroundArtifacts: [],
			title: "Sci-fi inline flow",
			maxDepth: 1,
		};

		const svg = renderRoadmapSvg(layout, sciFiLightTheme, { idPrefix: "sci-fi-flow" });

		expect(svg).toContain('text-anchor="middle"');
		expect(svg).toContain('class="roadmap__flow-line" x="100" y="34"');
		expect(svg).toContain(">competencies cover </tspan>");
		expect(svg).toMatch(/<tspan\b[^>]*font-weight="700"[^>]*>end to end<\/tspan>/u);
		expect(svg).toContain('textLength="100" lengthAdjust="spacingAndGlyphs"');
	});

	it("should fit sci-fi capsule notes symmetrically around painted text", () => {
		const lines: readonly TextLine[] = [
			{ width: 80, segments: [{ text: "Chapter description", width: 80, marks: [] }] },
		];
		const layout: RoadmapLayout = {
			width: 200,
			height: 80,
			elements: [
				layoutNode("sci-fi-note", lines, {
					kind: "note",
					placement: "tree-description",
				}),
			],
			connectors: [],
			backgroundArtifacts: [],
			title: "Sci-fi capsule geometry",
			maxDepth: 1,
		};

		const svg = renderRoadmapSvg(layout, sciFiLightTheme, { idPrefix: "sci-fi-capsule" });
		const frame = svg.match(
			/<rect class="roadmap__frame"[^>]* x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" rx="([^"]+)"\/>/u,
		);
		if (!frame) throw new Error("Sci-fi capsule frame was not rendered");
		const [, xValue, yValue, widthValue, heightValue, radiusValue] = frame;
		const x = Number(xValue);
		const y = Number(yValue);
		const width = Number(widthValue);
		const height = Number(heightValue);
		const radius = Number(radiusValue);

		expect(x + width / 2).toBe(100);
		// The capsule centers on the cap-height band (cap top to baseline), so
		// its center sits slightly above the line-box center of 31.
		expect(y + height / 2).toBeCloseTo(29.55, 2);
		expect(width).toBeGreaterThanOrEqual(84);
		expect(width).toBeLessThanOrEqual(100);
		expect(height).toBeLessThan(42);
		expect(radius).toBe(height / 2);
		expect(svg).toContain('textLength="80" lengthAdjust="spacingAndGlyphs"');
	});

	it("should limit sci-fi custom emoji positioning to the line that contains the emoji", () => {
		const lines: readonly TextLine[] = [
			{
				width: 70,
				segments: [
					{ text: "🔰", width: 12, marks: ["emoji"], shortcode: "beginner" },
					{ text: " Description", width: 58, marks: [] },
				],
			},
			{
				width: 100,
				segments: [
					{ text: "key people. ", width: 50, marks: [] },
					{
						text: "Product Owners",
						width: 50,
						marks: [],
						destination: "https://example.com/product-owner",
					},
				],
			},
		];
		const layout: RoadmapLayout = {
			width: 200,
			height: 100,
			elements: [
				layoutNode("sci-fi-emoji-note", lines, {
					kind: "note",
					placement: "tree-description",
				}),
			],
			connectors: [],
			backgroundArtifacts: [],
			title: "Sci-fi emoji line isolation",
			maxDepth: 1,
		};

		const svg = renderRoadmapSvg(layout, sciFiLightTheme, { idPrefix: "sci-fi-emoji-line" });

		expect(svg).toContain('class="roadmap__emoji roadmap__emoji--beginner"');
		expect(svg).toContain('textLength="58" lengthAdjust="spacingAndGlyphs"');
		// The link line renders positioned (its underline is a painted rect),
		// each segment fitted to its own measured width.
		expect(svg).toMatch(
			/<a class="roadmap__link"[^>]*href="https:\/\/example\.com\/product-owner"[^>]*><rect[^>]*pointer-events="all"\/><text[^>]*textLength="50"[^>]*>Product Owners<\/text><\/a>/u,
		);
		expect(svg).toContain('class="roadmap__link-underline"');
	});

	it("should preserve natural link proportions across lines", () => {
		const destination = "https://example.com";
		const lines: readonly TextLine[] = [
			{
				width: 120,
				segments: [
					{
						text: "Visual Communication",
						width: 120,
						marks: [],
						destination,
					},
				],
			},
			{
				width: 110,
				segments: [{ text: "Capability mapping", width: 110, marks: [], destination }],
			},
		];

		const svg = renderNodes([layoutNode("link-decoration", lines)]);

		// Underlines are painted rects, never text-decoration: WebKit segments
		// decorations per glyph and Firefox paints them over the glyphs.
		expect(textElement(svg, "Visual Communication")).not.toContain("text-decoration");
		expect(textElement(svg, "Capability mapping")).not.toContain("text-decoration");
		expect(svg.match(/class="roadmap__link-underline"/gu)).toHaveLength(2);
		expect(textElement(svg, "Visual Communication")).not.toContain("transform=");
		expect(textElement(svg, "Capability mapping")).not.toContain("transform=");
	});

	it("should render custom-font links without content-sensitive fitting", () => {
		const lines: readonly TextLine[] = [
			{
				width: 120,
				segments: [
					{
						text: "Visual Communication",
						width: 120,
						marks: [],
						destination: "https://example.com",
					},
				],
			},
		];

		const customFontSvg = renderNodes([
			layoutNode("custom-font-link", lines, {
				fontFamily: "Georgia, serif",
			}),
		]);

		expect(customFontSvg).toContain('class="roadmap__link-underline"');
		expect(textElement(customFontSvg, "Visual Communication")).not.toContain("transform=");
	});

	it("should paint abbreviation indicators as measured superscripts", () => {
		const lines: readonly TextLine[] = [
			{
				width: 28,
				segments: [
					{ text: "DoD", width: 22, marks: [] },
					{
						text: "?",
						width: 6,
						marks: [],
						destination: "https://example.com/definition",
						abbreviation: "Definition of Done",
						abbreviationIndicator: true,
					},
				],
			},
		];
		const svg = renderNodes([layoutNode("abbreviation", lines)]);

		expect(textY(svg, "DoD")).toBe(34);
		expect(textY(svg, "?")).toBeCloseTo(30.3, 8);
		expect(textElement(svg, "?")).toContain('font-size="7.5"');
		expect(textElement(svg, "?")).toContain(
			'class="roadmap__inline roadmap__inline--abbreviation-indicator"',
		);
		expect(textElement(svg, "?")).not.toContain("text-decoration=");
		expect(svg).toContain("<title>Definition of Done</title>");
		expect(svg).toContain(".roadmap__inline--abbreviation-indicator{cursor:help}");
	});

	it("should optically align chapter shortcode emoji with its label", () => {
		const lines: readonly TextLine[] = [
			{
				width: 36,
				segments: [
					{ text: "2", width: 12, marks: ["emoji"], shortcode: "two" },
					{ text: " Chapter", width: 24, marks: [] },
				],
			},
		];
		const svg = renderNodes([
			layoutNode("chapter-shortcode", lines, { kind: "chapter", placement: "chapter" }),
		]);

		expect(textY(svg, " Chapter")).toBe(34.2);
		expect(shortcodeUseY(svg, "two")).toBeCloseTo(26.475, 8);
	});

	it("should use scoped legacy gradients and detailed badge symbols", () => {
		const svg = generateRoadmapSvgSync("* Chapter [personal recommendation]\n  * Risk [warning]", {
			render: { idPrefix: "paint-details" },
		});

		expect(svg).toContain("--roadmap-chapter-background:url(#paint-details-chapter-gradient)");
		expect(svg).toContain("--roadmap-chapter-gradient-end:#ffeb90");
		expect(svg).toContain('id="paint-details-icon-check" viewBox="0 0 512 512"');
		expect(svg).toContain("M256 512c141.4 0 256-114.6");
		expect(svg).toContain('id="paint-details-icon-warning" viewBox="0 0 24 24"');
		expect(svg).toContain("--roadmap-badge-warning-background:#ffd54f");
		expect(svg).toContain('stdDeviation="var(--roadmap-soft-shadow-blur)"');
		expect(svg).toContain('values="var(--roadmap-soft-shadow-saturation)"');
		expect(svg).toContain(
			".roadmap__node,.roadmap__group,.roadmap__legend{vector-effect:non-scaling-stroke}",
		);
		expect(svg).not.toContain(".roadmap__connector{vector-effect:non-scaling-stroke}");
	});

	it("should paint Fun card shadows as cross-browser SVG geometry", () => {
		const svg = generateRoadmapSvgSync("* Chapter\n  * Topic", {
			render: { idPrefix: "fun-shadow" },
		});

		expect(svg).toContain(
			'class="roadmap__frame-shadow" fill="var(--roadmap-topic-shadow-color, var(--roadmap-shadow-color))" fill-opacity="var(--roadmap-topic-shadow-opacity, var(--roadmap-shadow-opacity))" stroke="none"',
		);
		expect(svg).toContain("--roadmap-shadow-offset-x:3px");
		expect(svg).toContain("--roadmap-shadow-offset-y:3px");
		expect(svg).toContain(
			".roadmap__frame-shadow{transform:translate(var(--roadmap-shadow-offset-x),var(--roadmap-shadow-offset-y));pointer-events:none}",
		);
		expect(svg).not.toContain('id="fun-shadow-shadow"');
	});

	it("should preserve legacy legend paint with shared default metrics", () => {
		const generated = generateRoadmap(
			"* Chapter\n  * Topic [personal recommendation]\n  * Other [recommended]",
			{ render: { idPrefix: "legend-default" } },
		);
		const legend = generated.layout.elements.find(
			(element): element is LayoutLegend => element.kind === "legend",
		);

		expect(legend).toBeDefined();
		if (!legend) throw new Error("Legend layout was not generated");
		expect(legend.metrics).toEqual({
			letterSpacing: 0,
			rowHeight: 16,
			rowGap: 0,
			badgeSize: 14,
			badgeCellSize: 16,
			badgeAdvance: 12,
			iconColumnWidth: 28,
			color: "#565561",
			fontFamily: "Arial, Helvetica, sans-serif",
			fontSize: 10.5,
			fontWeight: 400,
			fontStyle: "italic",
			renderScale: 1,
			renderScaleX: 1,
			renderScaleY: 1,
		});
		expect({ width: legend.width, height: legend.height }).toEqual({ width: 175, height: 42 });
		expect(generated.svg).toContain(
			'<path d="M 32.46 15.46 C 46.77 12.21 189.74 13.59 204.09 15.46 C 218.43 17.34 209.09 34.59 204.58 37.96 C 200.07 41.34 164.28 54.56 149.94 55.94 C 135.6 57.32 42.25 57.91 32.46 54.54 C 22.67 51.16 18.16 18.72 32.46 15.46 Z"',
		);
		expect(generated.svg).toContain('transform="matrix(1.01 0 0 1 -1.12 1.5)"');
		expect(textElement(generated.svg, "Personal recommendation")).toBe(
			'<text class="roadmap__legend-label" x="71" y="30.78" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="400" font-style="italic" fill="var(--roadmap-legend-text)">Personal recommendation</text>',
		);
		expect(generated.svg).toContain('roadmap__badge--heart" transform="translate(36 20)"');
		expect(generated.svg).toContain('roadmap__badge--check" transform="translate(48 20)"');
	});

	it("should apply themed legend spacing, badge cells, and optical text scale consistently", () => {
		const generated = generateRoadmap(
			"* Chapter\n  * Topic [personal recommendation]\n  * Other [recommended]",
			{
				theme: {
					legend: {
						fontSize: 10,
						renderScale: 0.8,
						renderScaleX: 1.25,
						renderScaleY: 0.9,
						rowGap: 5,
					},
					badges: { size: 20, gap: 2, sizes: { legend: 18 } },
				},
				render: { idPrefix: "legend-custom" },
			},
		);
		const legend = generated.layout.elements.find(
			(element): element is LayoutLegend => element.kind === "legend",
		);

		expect(legend).toBeDefined();
		if (!legend) throw new Error("Legend layout was not generated");
		expect(legend.metrics).toMatchObject({
			letterSpacing: 0,
			rowHeight: 20,
			rowGap: 5,
			badgeSize: 18,
			badgeCellSize: 20,
			badgeAdvance: 17,
			iconColumnWidth: 37,
			fontSize: 10,
			renderScale: 0.8,
			renderScaleX: 1.25,
			renderScaleY: 0.9,
		});
		expect({ width: legend.width, height: legend.height }).toEqual({ width: 178, height: 55 });
		expect(textX(generated.svg, "Personal recommendation")).toBe(80);
		expect(
			textY(generated.svg, "Recommended") - textY(generated.svg, "Personal recommendation"),
		).toBe(25);
		expect(textElement(generated.svg, "Personal recommendation")).toContain('font-size="8"');
		expect(textElement(generated.svg, "Personal recommendation")).toContain(
			'transform="matrix(1.25 0 0 0.9',
		);
		expect(generated.svg).toContain('roadmap__badge--check" transform="translate(53 20)"');
		expect(generated.svg).toContain('roadmap__badge--check" transform="translate(36 45)"');
	});

	it("should embed topic notes once, as their authored Markdown", () => {
		const svg = generateRoadmapSvgSync(
			"# T\n\n* Chapter\n  * Noted\n    > Depth & **more**.\n  * Plain\n",
			{
				render: { idPrefix: "note-md" },
			},
		);
		// The note rides on the topic group as data-roadmap-note only — raw
		// Markdown, escaped; no <desc> copy; noteless topics stay bare.
		expect(svg).toMatch(
			/<g id="note-md-topic-\d+-noted"[^>]*data-roadmap-note="Depth &amp; \*\*more\*\*\."/u,
		);
		expect(svg).not.toMatch(/<g id="note-md-topic-\d+-noted"[^>]*><desc>/u);
		expect(svg).not.toMatch(/plain"[^>]*data-roadmap-note/u);
	});

	it("should scope insert thickness to heading level", () => {
		const svg = generateRoadmapSvgSync("# ++Title++\n\n## Keep ++going++", {
			render: { idPrefix: "insert-levels" },
		});
		const inserts = [...svg.matchAll(/class="roadmap__insert-underline"[^>]+/gu)].map(
			(match) => match[0],
		);

		expect(inserts).toHaveLength(2);
		// Thickness scales with the text size (~0.1em, floored at 1px) so the
		// same mark carries the same relative weight in titles and body text.
		expect(inserts[0]).toContain('height="2"');
		expect(inserts[1]).toContain('height="2"');
	});

	it("should paint an opaque theme-matched backdrop behind headings", () => {
		const source = "### :point_left: Edit the text to see how the chart changes.";
		const light = generateRoadmapSvgSync(source, {
			render: { idPrefix: "heading-backdrop-light" },
		});
		const dark = generateRoadmapSvgSync(source, {
			theme: "dark",
			render: { idPrefix: "heading-backdrop-dark" },
		});

		expect(light).toMatch(
			/data-roadmap-element="heading"[^>]*><rect class="roadmap__heading-backdrop"[^>]+fill="var\(--roadmap-canvas-background\)"/u,
		);
		expect(light).toContain("--roadmap-canvas-background:#ffffff");
		expect(dark).toContain("--roadmap-canvas-background:#15161d");
	});

	it("should size short floating-note frames without minimum dimensions", () => {
		const frames = [1, 2, 3].map((lineCount) => {
			const lines = Array.from(
				{ length: lineCount },
				(_, index): TextLine => ({
					width: 100,
					segments: [{ text: `Line ${index + 1}`, width: 100, marks: [] }],
				}),
			);
			const node = layoutNode(`floating-note-${lineCount}`, lines, {
				kind: "note",
				placement: "floating-note",
			});

			return paintedNodeFrameRectangle(node);
		});

		expect(frames.map((frame) => frame.height)).toStrictEqual(
			frames.map((frame) => frame.height).toSorted((left, right) => left - right),
		);
		expect(new Set(frames.map((frame) => frame.height)).size).toBe(3);

		const generatedNotes = ["Tiny", "A considerably longer floating note"].map((source) => {
			const generated = generateRoadmap(source);
			const note = generated.layout.elements.find(
				(element): element is LayoutNode =>
					element.kind === "note" && element.placement === "floating-note",
			);
			if (!note) throw new Error("Floating note was not generated");
			return { frame: paintedNodeFrameRectangle(note), note };
		});
		const [tiny, longer] = generatedNotes;
		expect(tiny).toBeDefined();
		expect(longer).toBeDefined();
		if (!tiny || !longer) throw new Error("Generated note fixtures were not created");
		expect(tiny.note.width).toBeLessThan(120);
		// The frame adds side-wave allowance so the hull's inward waves never
		// eat the standard horizontal padding at the fattest line.
		const sideAllowance = (note: LayoutNode): number => (note.text.fontSize / 16) * 8;
		expect(tiny.frame.width).toBe(tiny.note.width + sideAllowance(tiny.note));
		expect(longer.frame.width).toBe(longer.note.width + sideAllowance(longer.note));
		expect(tiny.frame.width).toBeLessThan(longer.frame.width);

		const svg = generateRoadmap("A short floating note").svg;
		const floatingNotePath = (svg: string): string =>
			svg.match(/data-placement="floating-note"[^>]*><path[^>]+d="([^"]+)"/u)?.[1] ?? "";

		expect(floatingNotePath(svg)).not.toBe("");
	});

	it("should keep cached fitted frames aligned after layout movement and resizing", () => {
		const note = layoutNode(
			"moving-floating-note",
			[{ width: 100, segments: [{ text: "Moving note", width: 100, marks: [] }] }],
			{ kind: "note", placement: "floating-note" },
		);
		const initial = paintedNodeFrameRectangle(note);

		note.x += 17;
		note.y += 9;
		const moved = paintedNodeFrameRectangle(note);
		expect(moved).toEqual({
			...initial,
			x: initial.x + 17,
			y: initial.y + 9,
		});

		note.width += 20;
		const resized = paintedNodeFrameRectangle(note);
		expect(resized.width).toBe(moved.width + 20);
		expect(resized.x + resized.width / 2).toBe(note.x + note.width / 2);
	});

	it.each([
		{
			// Shaped bubble wrapping narrows the first and last lines, so this
			// block settles one line taller than a flat wrap would.
			label: "five-line rich text",
			expectedLines: 5,
			source:
				"This is a ==prototype== of a simple collaborative tool for generating **roadmap chart (tm)** from [markdown](https://commonmark.org) text. Text styles: _italic_, **bold**, ~sub~, ^sup^, etc. All [GitHub emojis](https://github.com) supported: :poop: :tada: :boom: :100: and [shortcuts](https://example.com): 8-) :-@ +-",
		},
		{
			// The source's newline is a soft break, so the prose flows through
			// it instead of forcing a fresh line.
			label: "seven-line note with a wide first line",
			expectedLines: 7,
			source: [
				"This is a ==prototype== of a simple collaborative toodfdkjhdf sldjkfhlsdkjfhslkdfj sdlfjkhsldkjfhsdlkjfhsdjkfhlskdjfllskdjfhsldkjfhsldflsdkjfhsldkfjhdsfds",
				"fsdf l for generating **roadmap chart (tm)** from [markdown](https://www.markdownguide.org/) text. Text styles: _italic_, **bold**, ~sub~, ^sup^ etc. All [GitHub emojis](https://github.com/ikatyang/emoji-cheat-sheet/blob/master/README.md) supported: :poop: :tada: :boom: :100: and [shortcuts](https://github.com/markdown-it/markdown-it-emoji/blob/master/lib/data/shortcuts.js): 8-) :-@ +-",
			].join("\n"),
		},
	])(
		"should contour a wrapped floating note around its paint: $label",
		({ source, expectedLines }) => {
			const generated = generateRoadmap(source);
			const note = generated.layout.elements.find(
				(element): element is LayoutNode =>
					element.kind === "note" && element.placement === "floating-note",
			);

			expect(note).toBeDefined();
			if (!note) throw new Error("Floating note was not generated");

			const contentFrame = paintedNodeFrameRectangle(note);
			const scale = note.text.fontSize / 16;
			const polygon = organicBlobPolygon(contentFrame, 4 * scale, scale, 0.98 * scale, 0.1);
			expect(note.text.lines).toHaveLength(expectedLines);
			// The layout box hugs the painted text; the blob's bulge and side
			// waves extend beyond it. Coverage below is the real contract.
			expect(contentFrame.width).toBe(note.width + (note.text.fontSize / 16) * 8);
			for (const line of paintedTextLines(note)) {
				for (const point of [
					{ x: line.x - 2 * scale, y: line.y - 2 * scale },
					{ x: line.x + line.width + 2 * scale, y: line.y - 2 * scale },
					{ x: line.x + line.width + 2 * scale, y: line.y + line.height + 2 * scale },
					{ x: line.x - 2 * scale, y: line.y + line.height + 2 * scale },
				]) {
					expect(pointInPolygon(polygon, point)).toBe(true);
				}
			}
		},
	);

	it("should fit chapter descriptions with the shared comment-bubble geometry", () => {
		const generated = generateRoadmap(`* :two: Wrangling
*:beginner: Data wrangling is the process of discovering and understanding the data, cleaning and validating it, structuring for usability, enriching, and in some cases aggregating and transforming.*`);
		const note = generated.layout.elements.find(
			(element): element is LayoutNode =>
				element.kind === "note" && element.role === "chapter-description",
		);

		expect(note).toBeDefined();
		if (!note) throw new Error("Description fixture was not generated");
		const geometry = noteBlobGeometry(note);
		const frame = geometry.frame;
		const scale = note.text.fontSize / 16;
		const polygon = organicBlobPolygon(
			frame,
			geometry.lowerInset,
			geometry.upperInset,
			geometry.upperShoulderInset,
			geometry.upperShoulderRatio,
		);
		const safety = 2 * scale;
		expect(frame.width).toBe(note.width + scale * 8);
		for (const line of paintedTextLines(note)) {
			for (const point of [
				{ x: line.x - safety, y: line.y - safety },
				{ x: line.x + line.width + safety, y: line.y - safety },
				{ x: line.x + line.width + safety, y: line.y + line.height + safety },
				{ x: line.x - safety, y: line.y + line.height + safety },
			]) {
				expect(pointInPolygon(polygon, point)).toBe(true);
			}
		}
	});

	it("should render preserved shortcodes with deterministic scoped SVG symbols", () => {
		const svg = generateRoadmapSvgSync(
			"# Map :soap:\n\n:boom: Learn.\n\n* :one: Chapter\n* :two: Second\n* :three: Third\n\n## Keep :recycle:",
			{ render: { idPrefix: "emoji-map" } },
		);

		expect(svg.match(/data-shortcode=/gu)).toHaveLength(6);
		expect(svg).toContain('id="emoji-map-emoji-soap" viewBox="0 0 24 24"');
		expect(svg).toContain('<path fill="#ea5a6e"');
		expect(svg).toContain('href="#emoji-map-emoji-soap"');
		expect(svg).toContain('href="#emoji-map-emoji-boom"');
		expect(svg).toContain('href="#emoji-map-emoji-one"');
		expect(svg).toMatch(/data-shortcode="one"[^>]*><use[^>]*width="18" height="17"/u);
		expect(svg).toMatch(/data-shortcode="two"[^>]*><use[^>]*width="18" height="17"/u);
		expect(svg).toMatch(/data-shortcode="three"[^>]*><use[^>]*width="18" height="18"/u);
		expect(svg).toContain('href="#emoji-map-emoji-recycle"');
		expect(svg).not.toMatch(/<text\b[^>]*>🧼<\/text>/u);
	});

	it("should scope every generated ID and internal reference to the requested prefix", () => {
		const svg = generateRoadmapSvgSync(
			"# Scoped\n\n* Chapter [recommended]\n  * Topic\n    * Child",
			{ render: { idPrefix: "embedded chart" } },
		);
		const ids = attributeValues(svg, "id");
		const idSet = new Set(ids);
		const connectorIds = [...svg.matchAll(/<path id="([^"]+)" class="roadmap__connector/gu)].map(
			(match) => match[1] ?? "",
		);
		const fragmentReferences = [
			...attributeValues(svg, "href")
				.filter((value) => value.startsWith("#"))
				.map((value) => value.slice(1)),
			...[...svg.matchAll(/url\(#([^)]+)\)/gu)].map((match) => match[1] ?? ""),
			...attributeValues(svg, "aria-labelledby").flatMap((value) => value.split(/\s+/u)),
		];

		expect(ids.length).toBeGreaterThan(10);
		expect(idSet.size).toBe(ids.length);
		expect(ids.every((id) => id.startsWith("embedded-chart-"))).toBe(true);
		expect(connectorIds.length).toBeGreaterThan(0);
		expect(connectorIds.every((id) => id.startsWith("embedded-chart-"))).toBe(true);
		expect(fragmentReferences.every((reference) => idSet.has(reference))).toBe(true);
	});

	it("should derive different default prefixes from content and theme", () => {
		const alpha = generateRoadmap("# Shared\n\nalpha.");
		const bravo = generateRoadmap("# Shared\n\nbravo.");
		const dark = generateRoadmap("# Shared\n\nalpha.", { theme: "dark" });

		expect(alpha.layout.width).toBe(bravo.layout.width);
		expect(alpha.layout.height).toBe(bravo.layout.height);
		expect(new Set([svgPrefix(alpha.svg), svgPrefix(bravo.svg), svgPrefix(dark.svg)]).size).toBe(3);
	});

	it("should prevent custom CSS and theme values from breaking out of the style element", () => {
		const breakout = '</style><script data-breakout="true">alert(1)</script><style>';
		const svg = generateRoadmapSvgSync("# Safe styles", {
			theme: { canvas: { background: `#fff${breakout}` } },
			render: { css: `.roadmap { --payload: "${breakout}&"; }` },
		});

		expect(svg.match(/<style>/gu)).toHaveLength(1);
		expect(svg.match(/<\/style>/gu)).toHaveLength(1);
		expect(svg).not.toContain("<script");
		expect(svg).not.toContain(breakout);
		expect(svg).toContain("\\3c /style>");
		expect(svg).toContain("\\26 ");
		expect(svg.match(/\\3c \/style>/gu)).toHaveLength(2);
	});
});
