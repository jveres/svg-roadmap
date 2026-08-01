import { describe, expect, test } from "vitest";
import { paintedNodeFrameRectangle } from "./core/frames.ts";
import { rectanglesOverlap } from "./core/geometry.ts";
import {
	builtInThemes,
	createRoadmapGenerator,
	generateRoadmap,
	generateRoadmapSvg,
	generateRoadmapSvgSync,
} from "./index.ts";
import { createTheme, darkTheme, lightTheme } from "./theme.ts";
import { generateArcadeBackgroundArtifacts } from "./themes/arcade/background-artifacts.ts";
import { generateAsciiBackgroundArtifacts } from "./themes/ascii/background-artifacts.ts";
import { generateFunBackgroundArtifacts } from "./themes/fun/background-artifacts.ts";
import { generateRetroBackgroundArtifacts } from "./themes/retro/background-artifacts.ts";
import { generateRoseBackgroundArtifacts } from "./themes/rose/background-artifacts.ts";
import { generateSciFiBackgroundArtifacts } from "./themes/sci-fi/background-artifacts.ts";
import type {
	LayoutGroup,
	LayoutNode,
	Point,
	Rect,
	RoadmapTheme,
	RoadmapThemePreset,
} from "./types.ts";

const markdown = `# Platform **Roadmap**

An accessible _overview_.

* 1️⃣ Build [recommended]
*Start with a [safe link](https://example.com).*
  + Discover
    * Interview
      * Synthesize
        * Prioritize
  * Design [personal recommendation]
    * Prototype

* 2️⃣ Ship
  * Release
    * Observe

## Improve`;

describe("roadmap generation", () => {
	test("produces deterministic standalone SVG", () => {
		const first = generateRoadmapSvgSync(markdown);
		const second = generateRoadmapSvgSync(markdown);

		expect(first).toBe(second);
		expect(first).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/u);
		expect(first).toContain('data-roadmap-element="chapter"');
		expect(first).toContain('data-depth="4"');
		expect(first).toContain('aria-label="');
		expect(first).not.toContain("foreignObject");
		expect(first).not.toContain("<script");
	});

	test("canvasScale takes the axis union — number scales both, {x}/{y} one", () => {
		const dims = (svg: string): [number, number] => {
			const m = /width="(\d+)" height="(\d+)"/u.exec(svg);
			if (!m) throw new Error("no dims");
			return [Number(m[1]), Number(m[2])];
		};
		const [w, h] = dims(generateRoadmapSvgSync(markdown));
		const [w2, h2] = dims(generateRoadmapSvgSync(markdown, { layout: { canvasScale: 2 } }));
		expect(w2).toBe(Math.ceil(w * 2));
		expect(h2).toBe(Math.ceil(h * 2));
		const [wx, hx] = dims(generateRoadmapSvgSync(markdown, { layout: { canvasScale: { x: 2 } } }));
		expect(wx).toBe(Math.ceil(w * 2));
		expect(hx).toBe(h); // the other axis untouched
		const [wy, hy] = dims(generateRoadmapSvgSync(markdown, { layout: { canvasScale: { y: 2 } } }));
		expect(wy).toBe(w);
		expect(hy).toBe(Math.ceil(h * 2));
		// The clamp holds per axis (an absurd factor cannot allocate
		// an unbounded artifact field).
		const [wc] = dims(generateRoadmapSvgSync(markdown, { layout: { canvasScale: { x: 99 } } }));
		expect(wc).toBe(Math.ceil(w * 10));
	});

	test("API layout.background enables artifacts without frontmatter", () => {
		// The document's background defaults to disabled; a HOST (an
		// embedder's knob) can enable the theme's artifacts through
		// the layout options — merged over the document's settings.
		const plain = generateRoadmapSvgSync(markdown);
		expect(plain).not.toContain('class="roadmap__background-artifact"');
		const enabled = generateRoadmapSvgSync(markdown, {
			layout: { background: { enabled: true } },
		});
		expect(enabled).toContain('class="roadmap__background-artifact"');
		// And the render option animates them, same as frontmatter.
		const animated = generateRoadmapSvgSync(markdown, {
			layout: { background: { enabled: true } },
			render: { animatedBackground: true },
		});
		expect(animated).toContain('class="roadmap__background-artifact-motion"');
	});

	test("keeps Fun background artifacts seeded and stable", () => {
		const source = (seed: string) => `---
roadmap:
  background:
    enabled: true
    seed: ${seed}
    density: 1
    size: 1
---

# Seeded background

* Chapter
  * Topic`;
		const first = generateRoadmap(source("alpha"));
		const repeated = generateRoadmap(source("alpha"));
		const changed = generateRoadmap(source("bravo"));

		expect(first.layout.backgroundArtifacts.length).toBeGreaterThan(0);
		expect(repeated.layout.backgroundArtifacts).toEqual(first.layout.backgroundArtifacts);
		expect(changed.layout.backgroundArtifacts).not.toEqual(first.layout.backgroundArtifacts);
		expect(
			first.layout.backgroundArtifacts.every((artifact) =>
				first.layout.elements.every((element) => !rectanglesOverlap(artifact.bounds, element)),
			),
		).toBe(true);
		expect(first.svg).toContain('class="roadmap__background-artifacts" aria-hidden="true"');
		expect(first.svg).toContain("--roadmap-background-artifact-primary:");
	});

	test("scales Fun background geometry with the size setting", () => {
		const generate = (size: number) =>
			generateFunBackgroundArtifacts({
				width: 900,
				height: 600,
				avoid: [],
				settings: { enabled: true, seed: "size-scale", density: 1, size },
			});
		const small = generate(0.5);
		const large = generate(2);
		const smallById = new Map(small.map((artifact) => [artifact.id, artifact]));
		const common = large.filter((artifact) => smallById.has(artifact.id));
		const scale = (transform: string | undefined): number => {
			const value = transform?.match(/scale\(([^)]+)\)/u)?.[1];
			if (!value) throw new Error("Artifact scale was not generated");
			return Number(value);
		};

		expect(common.length).toBeGreaterThan(0);
		for (const artifact of common) {
			expect(scale(artifact.transform)).toBeCloseTo(
				scale(smallById.get(artifact.id)?.transform) * 4,
				1,
			);
		}
	});

	test("places Fun artifacts outside the content envelope", () => {
		const content = { x: 260, y: 0, width: 380, height: 600 };
		const artifacts = generateFunBackgroundArtifacts({
			width: 900,
			height: 600,
			avoid: [content],
			settings: { enabled: true, seed: "outer-voids", density: 1, size: 0.8 },
		});

		expect(artifacts.length).toBeGreaterThan(0);
		expect(
			artifacts.every(
				(artifact) =>
					artifact.bounds.x + artifact.bounds.width <= content.x ||
					artifact.bounds.x >= content.x + content.width,
			),
		).toBe(true);
	});

	test("builds Fun motifs from layered strokes and halftone dots", () => {
		const artifacts = generateFunBackgroundArtifacts({
			width: 1_200,
			height: 900,
			avoid: [],
			settings: { enabled: true, seed: "fun-motifs", density: 1, size: 1 },
		});
		const shapes = artifacts.flatMap((artifact) => artifact.shapes);
		const structures = new Set(
			artifacts.map((artifact) =>
				JSON.stringify(artifact.shapes.map((shape) => [shape.kind, shape])),
			),
		);

		expect(artifacts.some((artifact) => artifact.shapes.length > 2)).toBe(true);
		expect(shapes.some((shape) => shape.kind === "circle")).toBe(true);
		expect(shapes.some((shape) => shape.kind === "path")).toBe(true);
		expect(structures.size).toBeGreaterThanOrEqual(6);
	});

	test("resolves Sci-fi as an isolated built-in theme", () => {
		const source = `---
roadmap:
  theme:
    preset: sci-fi
    mode: dark
  background:
    enabled: true
    seed: orbital-garden
    density: 1
---

# Utopian ==systems==

* Explore
  * Discover
    * Align`;

		const generated = generateRoadmap(source);

		expect(Object.keys(builtInThemes)).toEqual([
			"fun",
			"sci-fi",
			"rose",
			"print",
			"pro",
			"retro",
			"arcade",
			"ascii",
		]);
		expect(generated.theme).toBe(builtInThemes["sci-fi"]?.modes.dark);
		expect(generated.theme.name).toBe("sci-fi");
		expect(generated.theme.mode).toBe("dark");
		expect(generated.theme.chapter.shape).toBe("chamfered");
		expect(generated.theme.note.shape).toBe("capsule");
		expect(generated.theme.boards.topic.shape).toBe("chamfered");
		expect(generated.theme.boards.topic.pattern).toBe("grid");
		expect(generated.theme.boards.nested.pattern).toBe("dots");
		expect(generated.theme.connectors.spine.routing).toBe("straight");
		expect(generated.theme.connectors.chapterToTopics.routing).toBe("orthogonal");
		expect(generated.theme.connectors.topicToChildren.laneSpacing).toBe(8);
		expect(generated.svg).toContain('data-roadmap-theme="sci-fi"');
		expect(generated.svg).toContain('data-roadmap-pattern="grid"');
		expect(generated.svg).toContain('data-roadmap-pattern="dots"');
		expect(generated.svg).toMatch(
			/roadmap__node--chapter[^>]*><path class="roadmap__frame-shadow"[^>]*\/><path class="roadmap__frame"/u,
		);
		expect(generated.svg).toMatch(/roadmap__connector--chapterToTopics[^>]* d="M [^"]* L /u);
		const spinePath = generated.svg.match(/roadmap__connector--spine[^>]* d="([^"]+)"/u)?.[1];
		expect(spinePath?.split(" L ")).toHaveLength(2);
		expect(generated.svg).toContain("--roadmap-sci-fi-artifact-cyan:#58e1f5");
		expect(generated.svg).not.toContain("--roadmap-background-artifact-coral:");
		expect(generated.svg).toContain('<rect class="roadmap__highlight"');
		expect(generated.svg).toContain("roadmap__inline--highlight");
		expect(generated.svg).not.toContain(
			'.roadmap[data-roadmap-theme="sci-fi"] .roadmap__inline--highlight',
		);
		expect(generated.theme.chapter.typography.renderScaleX).toBe(1);
		expect(
			generated.layout.backgroundArtifacts.every((artifact) =>
				artifact.id.startsWith("sci-fi-background-"),
			),
		).toBe(true);
	});

	test("resolves Rose as an isolated built-in theme", () => {
		const generated = generateRoadmap(`---
roadmap:
  theme:
    preset: rose
    mode: dark
  background:
    enabled: true
    seed: rose-garden
    density: 1
---

# Software Engineering ++_Hygiene_++ :soap:

Product **discovery** with [Product Owners](https://example.com) and ==highlights==.

* Discover
  * Listen
    * Learn`);

		expect(generated.theme).toBe(builtInThemes.rose?.modes.dark);
		expect(generated.theme.name).toBe("rose");
		expect(generated.theme.mode).toBe("dark");
		expect(generated.theme.chapter.shape).toBe("capsule");
		expect(generated.theme.note.shape).toBe("rounded");
		expect(generated.theme.topic.shape).toBe("rounded");
		expect(generated.theme.nestedTopic.shape).toBe("rounded");
		expect(generated.theme.topicHeader.shape).toBe("capsule");
		expect(generated.theme.boards.topic.shape).toBe("rounded");
		expect(generated.theme.boards.topic.pattern).toBe("none");
		expect(generated.theme.floatingNote.pattern).toBe("lace");
		expect(generated.theme.connectors.spine.routing).toBe("braided");
		expect(generated.theme.connectors.topicToChildren.routing).toBe("curved");
		expect(generated.svg).toContain('data-roadmap-theme="rose"');
		expect(generated.svg).toContain('data-roadmap-shape="capsule"');
		expect(generated.svg).toContain('data-roadmap-shape="rounded"');
		expect(generated.svg).toContain('data-roadmap-pattern="lace"');
		expect(generated.svg).toContain('data-roadmap-routing="braided"');
		expect(generated.svg).toContain("--roadmap-rose-artifact-madder:#b57682");
		expect(generated.svg).not.toContain("--roadmap-sci-fi-artifact-cyan:");
		// The chapter medallion is a stadium with an engraved inner keyline.
		const capsuleFrame = generated.svg.match(
			/roadmap__node--chapter[^>]*>.*?<rect class="roadmap__frame" data-roadmap-shape="capsule"[^>]* rx="([\d.]+)"/u,
		);
		// String.match returns null on a miss, which toBeDefined would let
		// through; assert the capture actually exists and is a real radius.
		expect(capsuleFrame).not.toBeNull();
		expect(Number(capsuleFrame?.[1])).toBeGreaterThan(0);
		expect(generated.svg).toContain('class="roadmap__frame-detail"');
		expect(generated.svg).toContain("--roadmap-frame-detail-width:0.7");
		expect(generated.theme.chapter.typography.fontFamily).toContain("Iowan Old Style");
		// The title line contains a shortcode emoji, so it renders positioned
		// with the platform-independent SVG symbol instead of a font glyph.
		expect(generated.svg).toMatch(
			/class="roadmap__emoji roadmap__emoji--soap"[^>]*>.*?<use href="#[^"]*-emoji-soap"/u,
		);
		expect(generated.svg).not.toMatch(/<tspan[^>]*>🧼<\/tspan>/u);
		// Undecorated lines still flow; the link line renders positioned with
		// its underline painted as a rect.
		expect(generated.svg).toMatch(/<text class="roadmap__flow-line"/u);
		// The rect gives the anchor a continuous hit area: SVG hit-testing on
		// text alone is per glyph and the pointer flickers between characters.
		expect(generated.svg).toMatch(
			/<a class="roadmap__link"[^>]*><rect[^>]*pointer-events="all"\/><text[^>]*>Product Owners<\/text><\/a>/u,
		);
		expect(generated.svg).toContain('class="roadmap__link-underline"');
		// Highlights and inserts always paint rects behind the glyphs: SVG
		// text-decoration paint order is not interoperable (Firefox draws
		// decorations over the text).
		expect(generated.svg).toContain('<rect class="roadmap__highlight"');
		expect(generated.svg).toContain('<rect class="roadmap__insert-underline"');
		expect(generated.svg).not.toContain("text-decoration-thickness");
	});

	test("resolves Print as an artifact-free editorial theme", () => {
		const generated = generateRoadmap(`---
roadmap:
  theme:
    preset: print
    mode: dark
  background:
    enabled: true
    seed: ignored-by-print
---

# Editorial roadmap

An intentionally restrained introduction.

* Publish
  + Sections
    * Review [recommended]
    * Release
`);

		expect(generated.theme).toBe(builtInThemes.print?.modes.dark);
		expect(generated.theme.name).toBe("print");
		expect(generated.theme.mode).toBe("dark");
		expect(generated.theme.backgroundArtifacts).toBeUndefined();
		expect(generated.layout.backgroundArtifacts).toEqual([]);
		expect(generated.theme.heading.title.fontFamily).toContain("Iowan Old Style");
		expect(generated.theme.chapter.shape).toBe("rounded");
		expect(generated.theme.note.shape).toBe("rounded");
		expect(generated.theme.boards.topic.shape).toBe("rounded");
		expect(generated.theme.boards.topic.pattern).toBe("none");
		expect(generated.theme.connectors.spine.routing).toBe("straight");
		expect(generated.theme.connectors.chapterToTopics.routing).toBe("straight");
		expect(generated.svg).toContain('data-roadmap-theme="print"');
		expect(generated.svg).toContain('data-roadmap-shape="rounded"');
		expect(generated.svg).toContain('data-roadmap-pattern="none"');
		expect(generated.svg).not.toContain('<g class="roadmap__background-artifact ');
		expect(generated.svg).not.toMatch(/<(?:path|rect) class="roadmap__frame-shadow"/u);
	});

	test("keeps chapter connectors clear of tall tree descriptions", () => {
		const filler = Array.from({ length: 30 }, (_, index) => `filler${index}`).join(" ");
		const generated = generateRoadmap(`# Roadmap

* Chapter one
  * Alpha
    * Nested
  * Beta

* Chapter two
*A very long chapter description ${filler} that wraps onto many lines.*
  * Gamma
    * Nested
  * Delta
`);
		const descriptions = generated.layout.elements.filter(
			(element): element is LayoutNode =>
				"role" in element && element.role === "chapter-description",
		);
		expect(descriptions.length).toBeGreaterThan(0);
		const hitsRectangle = (from: Point, to: Point, rect: Rect): boolean => {
			for (let step = 0; step <= 200; step += 1) {
				const t = step / 200;
				const x = from.x + (to.x - from.x) * t;
				const y = from.y + (to.y - from.y) * t;
				if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
					return true;
				}
			}
			return false;
		};
		for (const connector of generated.layout.connectors) {
			if (connector.kind !== "chapterToTopics") continue;
			for (const description of descriptions) {
				expect(
					hitsRectangle(connector.from, connector.to, paintedNodeFrameRectangle(description)),
				).toBe(false);
			}
		}
	});

	test("keeps Rose artifact geometry deterministic and outside content", () => {
		const content = { x: 260, y: 0, width: 380, height: 600 };
		const context = {
			width: 900,
			height: 600,
			avoid: [content],
			settings: { enabled: true, seed: "rose-garden", density: 1, size: 1 },
		} as const;

		const first = generateRoseBackgroundArtifacts(context);
		const repeated = generateRoseBackgroundArtifacts(context);
		const changed = generateRoseBackgroundArtifacts({
			...context,
			settings: { ...context.settings, seed: "peony-garden" },
		});

		expect(first.length).toBeGreaterThan(0);
		expect(repeated).toEqual(first);
		expect(changed).not.toEqual(first);
		expect(first.every((artifact) => !rectanglesOverlap(artifact.bounds, content))).toBe(true);
		expect(first.every((artifact) => artifact.id.startsWith("rose-background-"))).toBe(true);
	});

	test("keeps Arcade artifact geometry deterministic and outside content", () => {
		const content = { x: 260, y: 0, width: 380, height: 600 };
		const context = {
			width: 900,
			height: 600,
			avoid: [content],
			settings: { enabled: true, seed: "high-score", density: 1, size: 1 },
		} as const;

		const first = generateArcadeBackgroundArtifacts(context);
		const repeated = generateArcadeBackgroundArtifacts(context);
		const changed = generateArcadeBackgroundArtifacts({
			...context,
			settings: { ...context.settings, seed: "game-over" },
		});

		expect(first.length).toBeGreaterThan(0);
		expect(repeated).toEqual(first);
		expect(changed).not.toEqual(first);
		expect(first.every((artifact) => !rectanglesOverlap(artifact.bounds, content))).toBe(true);
		expect(first.every((artifact) => artifact.id.startsWith("arcade-background-"))).toBe(true);
	});

	test("keeps ASCII artifact geometry deterministic and outside content", () => {
		const content = { x: 260, y: 0, width: 380, height: 600 };
		const context = {
			width: 900,
			height: 600,
			avoid: [content],
			settings: { enabled: true, seed: "blinking-cursor", density: 1, size: 1 },
		} as const;

		const first = generateAsciiBackgroundArtifacts(context);
		const repeated = generateAsciiBackgroundArtifacts(context);
		const changed = generateAsciiBackgroundArtifacts({
			...context,
			settings: { ...context.settings, seed: "steady-cursor" },
		});

		expect(first.length).toBeGreaterThan(0);
		expect(repeated).toEqual(first);
		expect(changed).not.toEqual(first);
		expect(first.every((artifact) => !rectanglesOverlap(artifact.bounds, content))).toBe(true);
		expect(first.every((artifact) => artifact.id.startsWith("ascii-background-"))).toBe(true);
	});

	test("keeps Retro artifact geometry deterministic and outside content", () => {
		const content = { x: 260, y: 0, width: 380, height: 600 };
		const context = {
			width: 900,
			height: 600,
			avoid: [content],
			settings: { enabled: true, seed: "groovy-garden", density: 1, size: 1 },
		} as const;

		const first = generateRetroBackgroundArtifacts(context);
		const repeated = generateRetroBackgroundArtifacts(context);
		const changed = generateRetroBackgroundArtifacts({
			...context,
			settings: { ...context.settings, seed: "disco-garden" },
		});

		expect(first.length).toBeGreaterThan(0);
		expect(repeated).toEqual(first);
		expect(changed).not.toEqual(first);
		expect(first.every((artifact) => !rectanglesOverlap(artifact.bounds, content))).toBe(true);
		expect(first.every((artifact) => artifact.id.startsWith("retro-background-"))).toBe(true);
	});

	test("keeps Sci-fi artifact geometry deterministic and outside content", () => {
		const content = { x: 260, y: 0, width: 380, height: 600 };
		const context = {
			width: 900,
			height: 600,
			avoid: [content],
			settings: { enabled: true, seed: "orbital-garden", density: 1, size: 1 },
		} as const;

		const first = generateSciFiBackgroundArtifacts(context);
		const repeated = generateSciFiBackgroundArtifacts(context);
		const changed = generateSciFiBackgroundArtifacts({
			...context,
			settings: { ...context.settings, seed: "solar-garden" },
		});

		expect(first.length).toBeGreaterThan(0);
		expect(repeated).toEqual(first);
		expect(changed).not.toEqual(first);
		expect(
			first.every(
				(artifact) =>
					artifact.bounds.x + artifact.bounds.width <= content.x ||
					artifact.bounds.x >= content.x + content.width,
			),
		).toBe(true);
		expect(
			first.flatMap((artifact) => artifact.shapes).some((shape) => shape.kind === "path"),
		).toBe(true);
	});

	test("lets an isolated theme omit background artifacts", () => {
		const { backgroundArtifacts: _lightArtifacts, ...customLight } = lightTheme;
		const { backgroundArtifacts: _darkArtifacts, ...customDark } = darkTheme;
		const light: RoadmapTheme = { ...customLight, name: "custom" };
		const dark: RoadmapTheme = { ...customDark, name: "custom" };
		const custom: RoadmapThemePreset = {
			name: "custom",
			modes: { light, dark },
		};
		const generated = generateRoadmap(
			`---
roadmap:
  theme: custom
  background: true
---

# No decorations`,
			{ themes: { custom } },
		);

		expect(generated.theme.name).toBe("custom");
		expect(generated.layout.backgroundArtifacts).toEqual([]);
		expect(generated.svg).not.toContain("--roadmap-background-artifact-primary:");
	});

	test("exposes explicit node roles and group layout types", () => {
		const generated = generateRoadmap(`# Roles

Standalone note.

* Grid chapter
*Grid description.*
  + Grid root
    * Grid child

* Tree chapter
  * Tree root
    * Nested child`);
		const roles = generated.layout.elements.flatMap((element) =>
			element.kind === "group" || element.kind === "legend" ? [] : [element.role],
		);
		const groupLayouts = generated.layout.elements.flatMap((element) =>
			element.kind === "group" ? [element.layout] : [],
		);

		expect(roles).toEqual(
			expect.arrayContaining([
				"heading",
				"floating-note",
				"chapter",
				"chapter-description",
				"topic-header",
				"topic",
				"nested-topic",
			]),
		);
		expect(groupLayouts).toEqual(expect.arrayContaining(["grid", "tree", "nested"]));
	});

	test("lays out topic cards without unintended overlap", () => {
		const generated = generateRoadmap(markdown);
		const topics = generated.layout.elements.filter(
			(element): element is LayoutNode => element.kind === "topic",
		);

		const overlaps: string[] = [];
		for (let left = 0; left < topics.length; left += 1) {
			for (let right = left + 1; right < topics.length; right += 1) {
				const first = topics[left];
				const second = topics[right];
				if (first && second && rectanglesOverlap(first, second, 1)) {
					overlaps.push(`${first.id}:${second.id}`);
				}
			}
		}

		expect(overlaps).toEqual([]);
		// The canvas crops to content, so width reflects the chart, not the
		// working corridor.
		expect(generated.layout.width).toBeGreaterThan(300);
		expect(generated.layout.height).toBeGreaterThan(400);
	});

	test("distributes spare row width across paired topic cards", () => {
		const generated = generateRoadmap(`* Chapter
  * A deliberately wide first topic
  * Left
  * Right`);
		const topics = generated.layout.elements.filter(
			(element): element is LayoutNode => element.kind === "topic",
		);
		const [wide, left, right] = topics;

		expect(topics).toHaveLength(3);
		expect(wide).toBeDefined();
		expect(left).toBeDefined();
		expect(right).toBeDefined();
		if (!wide || !left || !right) return;

		expect(right.x - (left.x + left.width)).toBe(10);
		expect(left.width + 10 + right.width).toBe(wide.width);
	});

	test("packs intrinsic grid columns and pairs child cells that fit the widest cell", () => {
		const generated = generateRoadmap(`* 1️⃣ Collection
  + Techniques
    * Data scraping
    * Batch processing
    * Streaming
    * ELT vs ETL
  * Concepts
    * OLAP vs OLTP
    * Data lake
    * Data warehouse
    * Data lakehouse
    * Object storage
    * CDC
  * Languages
    * Python
    * SQL
    * NoSQL
    * GraphQL
    * Scripting
  * Cloud-based tools
    * ELK
    * Databricks
    * Azure Data Services
    * Google Cloud Smart Analytics
    * AWS Analytics Services
  * Open source tools
    * Spark
    * Beam
    * Flink
    * Kafka
    * Debezium
    * Airflow
    * Hudi
    * Iceberg
    * Delta Lake
  * Quality risks
    * Selection criteria
    * Schema versioning
    * Compliance
    * Access control
	    * Backup and restore`);
		const nodes = generated.layout.elements.filter(
			(element): element is LayoutNode => element.kind !== "group" && element.kind !== "legend",
		);
		const findNode = (label: string): LayoutNode => {
			const node = nodes.find(
				(candidate) =>
					candidate.text.lines
						.flatMap((line) => line.segments.map((segment) => segment.text))
						.join("") === label,
			);
			if (!node) throw new Error(`Grid node was not found: ${label}`);
			return node;
		};
		const headers = [
			"Techniques",
			"Concepts",
			"Languages",
			"Cloud-based tools",
			"Open source tools",
			"Quality risks",
		].map(findNode);
		const spark = findNode("Spark");
		const beam = findNode("Beam");
		const airflow = findNode("Airflow");
		const hudi = findNode("Hudi");
		const openSource = findNode("Open source tools");
		const gridGroups = generated.layout.elements.filter(
			(element): element is LayoutGroup => element.kind === "group" && element.layout === "grid",
		);

		expect(gridGroups).toHaveLength(1);
		expect(new Set(headers.map((header) => header.y)).size).toBe(1);
		expect(spark.y).toBe(beam.y);
		expect(airflow.y).toBe(hudi.y);
		expect(beam.x + beam.width).toBe(openSource.x + openSource.width);
		expect(hudi.x + hudi.width).toBe(openSource.x + openSource.width);
	});

	test("footnotes number by first reference and render as a block below the chart", () => {
		const markdown = `A note referencing twice[^beta] and inline.^[Inline text wins order two.]

* Chapter
  * Topic[^beta]

[^beta]: The named footnote, referenced first.
`;
		const generated = generateRoadmap(markdown);
		// First reference order: [^beta] is 1, the inline footnote is 2.
		const beta = generated.document.footnotes.find((note) => note.label === "beta");
		expect(beta?.ordinal).toBe(1);
		const block = generated.layout.elements.find(
			(element) => "text" in element && element.placement === "footnotes",
		);
		expect(block).toBeDefined();
		expect(generated.svg).toContain('data-roadmap-element="footnotes"');
		expect(generated.svg).toContain("roadmap__footnotes-board");
		// The hull is TRANSPARENT (review, Aug 1, twice: the hatch
		// read as decoration, the board background as a white slab —
		// footnotes sit directly on the canvas).
		const boardTag = generated.svg.match(
			/<path class="roadmap__footnotes-board"[^>]*>/,
		)?.[0];
		expect(boardTag).toContain('fill="none"');
		expect(boardTag).not.toContain("legend-hatch");
		expect(boardTag).not.toContain("filter=");
		expect(generated.svg).toContain("The named footnote, referenced first.");
		expect(generated.svg).toContain("Inline text wins order two.");
		// References paint bare ordinals, not machine labels.
		expect(generated.svg).not.toContain("__inline_");
		expect(generated.svg).not.toContain("[beta]");
		// The block is opt-out and absent without footnotes.
		expect(
			generateRoadmapSvgSync(`---\nroadmap:\n  footnotes: false\n---\n\n${markdown}`),
		).not.toContain("roadmap__footnotes-board");
		expect(generateRoadmapSvgSync("* Chapter\n  * Topic")).not.toContain(
			"roadmap__footnotes-board",
		);
	});

	test("milestones render as spine stations with labels beside them", () => {
		const generated = generateRoadmap(`* Chapter one
  * Topic

---
*:checkered_flag: Halfway there.*

* Chapter two
  * Later topic
`);

		const milestones = generated.layout.milestones ?? [];
		expect(milestones).toHaveLength(1);
		const station = milestones[0];
		if (!station) throw new Error("Milestone station was not generated");
		expect(station.title).toBe("🏁 Halfway there.");
		// The spine polyline bends through the station: one segment ends on it
		// and the next leaves from it.
		const spine = generated.layout.connectors.filter((connector) => connector.kind === "spine");
		expect(spine.some((s) => s.to.x === station.x && s.to.y === station.y)).toBe(true);
		expect(spine.some((s) => s.from.x === station.x && s.from.y === station.y)).toBe(true);
		// The label paints as a floating comment beside the station.
		const label = generated.layout.elements.find(
			(element) => "text" in element && element.id === `${station.id}-label`,
		);
		expect(label).toBeDefined();
		// The SVG carries the station with its metadata for hosts.
		expect(generated.svg).toContain('data-roadmap-element="milestone"');
		expect(generated.svg).toContain('data-title="🏁 Halfway there."');
		expect(generated.svg).toMatch(/roadmap__milestone-core/u);
		// Unlabeled documents render no milestone layer at all.
		expect(generateRoadmapSvgSync("* Chapter\n  * Topic")).not.toContain("roadmap__milestones");
	});

	test("note markers are opt-in and only mark noted nodes", () => {
		const markdown = (frontmatter: string) => `${frontmatter}* Chapter
  * Noted topic
    > A detail note behind the click.
  * Plain topic
`;
		// Default: off, even when notes exist.
		expect(generateRoadmapSvgSync(markdown(""))).not.toContain("roadmap__note-marker");
		// Front matter turns it on; only the noted topic is marked.
		const enabled = generateRoadmapSvgSync(markdown("---\nroadmap:\n  noteMarkers: true\n---\n\n"));
		expect(enabled.match(/roadmap__note-marker/gu)).toHaveLength(1);
		expect(enabled).toMatch(
			/data-roadmap-note="[^"]+"[^>]*>.*?<path class="roadmap__note-marker"/u,
		);
		// The render option overrides the document in both directions.
		expect(generateRoadmapSvgSync(markdown(""), { render: { noteMarkers: true } })).toContain(
			"roadmap__note-marker",
		);
		expect(
			generateRoadmapSvgSync(markdown("---\nroadmap:\n  noteMarkers: true\n---\n\n"), {
				render: { noteMarkers: false },
			}),
		).not.toContain("roadmap__note-marker");
		// Themes may restyle the mark: rose trades the fold for a printer's dot.
		const rose = generateRoadmapSvgSync(
			markdown("---\nroadmap:\n  noteMarkers: true\n  theme: rose\n---\n\n"),
		);
		expect(rose).toContain('<circle class="roadmap__note-marker"');
		expect(rose).toContain("--roadmap-note-marker-color:#b06f76");
	});

	test("heading levels keep shrinking through h6", () => {
		const generated = generateRoadmap(
			["# One", "## Two", "### Three", "#### Four", "##### Five", "###### Six"].join("\n\n"),
		);
		const sizes = generated.layout.elements
			.filter((element): element is LayoutNode => element.kind === "heading")
			.map((element) => element.text.fontSize);
		expect(sizes).toHaveLength(6);
		for (let index = 1; index < sizes.length; index += 1) {
			expect(sizes[index] ?? 0).toBeLessThan(sizes[index - 1] ?? 0);
		}
	});

	test("keeps a grid parent on its own row so its child rail starts under it", () => {
		const generated = generateRoadmap(`* 1️⃣ Operations
  + Reliability
    * SRE
    * SLOs
      * SLIs
      * Error budgets
    * Capacity engineering
    * Self-healing`);
		const nodes = generated.layout.elements.filter(
			(element): element is LayoutNode => element.kind !== "group" && element.kind !== "legend",
		);
		const findNode = (label: string): LayoutNode => {
			const node = nodes.find(
				(candidate) =>
					candidate.text.lines
						.flatMap((line) => line.segments.map((segment) => segment.text))
						.join("") === label,
			);
			if (!node) throw new Error(`Grid node was not found: ${label}`);
			return node;
		};
		const sre = findNode("SRE");
		const slos = findNode("SLOs");
		// SRE and SLOs are narrow enough to pair, but SLOs owns nested
		// children: pairing would put it in the right cell while its
		// children's tree rail drops through the left gutter — under SRE.
		expect(slos.y).toBeGreaterThan(sre.y);
		// The rail's gutter must sit within the parent's horizontal span.
		const rail = generated.layout.connectors.find((connector) =>
			connector.id.endsWith("slis-grid-rail"),
		);
		if (!rail) throw new Error("SLIs grid rail was not generated");
		expect(rail.from.x).toBeGreaterThanOrEqual(slos.x);
		expect(rail.from.x).toBeLessThanOrEqual(slos.x + slos.width);
	});

	test("keeps optical text fitting scoped by note placement", () => {
		const generated = generateRoadmap(
			"* Chapter\n*An [Software Craftsmanship](https://example.com) description.*",
		);
		const note = generated.layout.elements.find(
			(element): element is LayoutNode => element.kind === "note",
		);

		expect(note).toBeDefined();
		expect(note?.text.renderScaleX).toBe(0.99);
	});

	test("keeps measured tree descriptions disjoint from chapters on both sides", () => {
		const generated = generateRoadmap(`* Chapter One
*Brief.*
  - Topic One

* Chapter Two
*Small.*
  - Topic Two`);
		const chapters = generated.layout.elements.filter(
			(element): element is LayoutNode => element.kind === "chapter",
		);
		const descriptions = generated.layout.elements.filter(
			(element): element is LayoutNode =>
				element.kind === "note" && element.placement === "tree-description",
		);

		expect(chapters).toHaveLength(2);
		expect(descriptions).toHaveLength(2);
		for (const [index, description] of descriptions.entries()) {
			const chapter = chapters[index];
			expect(chapter).toBeDefined();
			if (!chapter) throw new Error("Chapter fixture was not generated");
			const frame = paintedNodeFrameRectangle(description);

			expect(frame.width).toBe(description.width + (description.text.fontSize / 16) * 8);
			expect(frame.width).toBeLessThan(130);
			expect(rectanglesOverlap(chapter, frame, 1)).toBe(false);
		}
	});

	test("keeps tree and nested group hulls outside the main spine corridor", () => {
		const generated = generateRoadmap(`# Roadmap

* Chapter
  - Platform
    * Versioning
    * Data lineage
  - Exploration
    * Data quality
    * Test coverage
    * Labeling quality

### Continue`);
		const groups = generated.layout.elements.filter(
			(element): element is LayoutGroup => element.kind === "group",
		);
		const spine = generated.layout.connectors.filter((connector) => connector.kind === "spine");
		const spinePoints = spine.flatMap((connector) => [connector.from, connector.to]);
		const minX = Math.min(...spinePoints.map((point) => point.x));
		const maxX = Math.max(...spinePoints.map((point) => point.x));
		const minY = Math.min(...spinePoints.map((point) => point.y));
		const maxY = Math.max(...spinePoints.map((point) => point.y));
		const clearance = 12;
		const corridor = {
			x: minX - clearance,
			y: minY,
			width: maxX - minX + clearance * 2,
			height: maxY - minY,
		};

		expect(groups.length).toBeGreaterThan(2);
		expect(groups.filter((group) => rectanglesOverlap(group, corridor))).toStrictEqual([]);
	});

	test("ships distinct light and dark presets plus deep overrides", () => {
		const light = generateRoadmapSvgSync("# Theme", { theme: "light" });
		const dark = generateRoadmapSvgSync("# Theme", { theme: "dark" });
		const custom = createTheme({ chapter: { fill: "#ff00ff" } }, darkTheme);
		const themed = generateRoadmap("* Custom", { theme: custom }).svg;

		expect(light).toContain(`--roadmap-canvas-background:${lightTheme.canvas.background}`);
		expect(dark).toContain(`--roadmap-canvas-background:${darkTheme.canvas.background}`);
		expect(dark).not.toBe(light);
		expect(themed).toContain("--roadmap-chapter-background:#ff00ff");
		expect(custom.chapter.typography.fontSize).toBe(darkTheme.chapter.typography.fontSize);
		expect(lightTheme.connectors.topicToChildren).toMatchObject({
			color: lightTheme.connectors.chapterToTopics.color,
			opacity: lightTheme.connectors.chapterToTopics.opacity,
		});
		expect(darkTheme.connectors.topicToChildren).toMatchObject({
			color: darkTheme.connectors.chapterToTopics.color,
			opacity: darkTheme.connectors.chapterToTopics.opacity,
		});
	});

	test("carries custom optical baselines from themes into layout text", () => {
		const generated = generateRoadmap("* Custom baseline", {
			theme: { chapter: { typography: { baselineRatio: 0.75 } } },
		});
		const chapter = generated.layout.elements.find(
			(element): element is LayoutNode => element.kind === "chapter",
		);

		expect(chapter?.text.baselineRatio).toBe(0.75);
	});

	test("completes partial custom tag styles from the unknown-tag fallback", () => {
		const custom = createTheme({ badges: { tags: { custom: { label: "Custom" } } } });
		const generated = generateRoadmapSvgSync("* Chapter\n  * Topic [custom]", {
			theme: custom,
		});

		expect(custom.badges.tags.custom).toEqual({
			label: "Custom",
			badges: lightTheme.badges.unknown.badges,
		});
		expect(generated).toContain("Custom");
		expect(generated).toContain('data-roadmap-element="badge"');
	});

	test("keeps badge styles complete for partial known and unknown overrides", () => {
		const custom = createTheme({
			badges: {
				unknown: { badges: [{ background: "#0000ff" }] },
				tags: { recommended: { badges: [{ background: "#ff0000" }] } },
			},
		});
		const generated = generateRoadmapSvgSync(
			"* Chapter\n  * Known [recommended]\n  * Other [custom]",
			{
				theme: custom,
			},
		);

		expect(custom.badges.tags.recommended?.badges).toEqual([
			{ icon: "check", background: "#ff0000", foreground: "#ffffff" },
		]);
		expect(custom.badges.unknown.badges).toEqual([
			{ icon: "question", background: "#0000ff", foreground: "#ffffff" },
		]);
		expect(generated).toContain("--roadmap-badge-check-background:#ff0000");
		expect(generated).toContain("--roadmap-badge-question-background:#0000ff");
	});

	test("uses the configured font family when estimating layout", () => {
		const source = "* iiiiiiiiiiiiiiiiiiiiiiii";
		const arial = generateRoadmap(source);
		const courier = generateRoadmap(source, {
			theme: { chapter: { typography: { fontFamily: "Courier New, monospace" } } },
		});

		expect(courier.layout.elements[0]?.width).not.toBe(arial.layout.elements[0]?.width);
	});

	test("parses, lays out, and renders deeply recursive topic trees", () => {
		const nested = Array.from(
			{ length: 128 },
			(_, index) => `${"  ".repeat(index + 1)}* Level ${index + 1}`,
		).join("\n");

		const generated = generateRoadmap(`* Chapter\n${nested}`);

		expect(generated.document.stats).toEqual({ chapters: 1, topics: 128, maxDepth: 128 });
		expect(generated.layout.maxDepth).toBe(128);
		expect(generated.svg).toContain('data-depth="128"');
		const topicIds = new Set(
			generated.layout.elements
				.filter((element): element is LayoutNode => element.kind === "topic")
				.map((topic) => topic.id),
		);
		const groups = generated.layout.elements.filter(
			(element): element is LayoutGroup => element.kind === "group",
		);
		expect(groups.length).toBeGreaterThan(100);
		expect(groups.every((group) => group.memberIds.length > 0)).toBe(true);
		expect(groups.every((group) => group.memberIds.every((id) => topicIds.has(id)))).toBe(true);
	});

	test("drops unsafe link destinations and escapes text", () => {
		const svg = generateRoadmapSvgSync(
			"# Escape <script>alert(1)</script>\n\n* Chapter\n  * [unsafe](javascript:alert(1)) & safe",
		);

		expect(svg).not.toContain("javascript:");
		expect(svg).not.toContain("<script>");
		expect(svg).toContain("&amp;");
		expect(svg).toContain("&amp; safe</text>");
	});

	test("creates a reusable initialized synchronous generator", async () => {
		const generator = await createRoadmapGenerator();
		try {
			const first = generator.generate("* Reusable", { theme: "light" });
			const second = generator.generateSvg("* Reusable", { theme: "light" });

			expect(second).toBe(first.svg);
		} finally {
			generator[Symbol.dispose]();
		}
		expect(() => generator.generateSvg("* Disposed")).toThrow(/disposed/u);
	});

	test("keeps the asynchronous one-shot browser API available", async () => {
		await expect(generateRoadmapSvg("# Asynchronous API")).resolves.toContain("Asynchronous API");
	});

	test("uses the fitted note frame as the sole layout reservation", () => {
		const generated = generateRoadmap(`* Chapter
*A description deliberately shaped to exercise fitted shoulder clearance across wrapped lines.*`);
		const note = generated.layout.elements.find(
			(element): element is LayoutNode => element.kind === "note",
		);

		expect(note).toBeDefined();
		if (!note) throw new Error("Description fixture was not generated");
		const reserved = paintedNodeFrameRectangle(note);
		// The painted bubble spans the note's box and is anchored to it — a
		// real oracle, not the function compared with itself.
		expect(reserved.width).toBe(note.width + (note.text.fontSize / 16) * 8);
		expect(reserved.height).toBeGreaterThan(0);
		expect(reserved.y).toBeLessThanOrEqual(note.y + note.height);
		expect(reserved.y + reserved.height).toBeGreaterThanOrEqual(note.y);
	});
});

describe("standalone and spine-mounted grids", () => {
	const grid = "+ Alpha\n  * A one\n+ Beta\n  * B one\n";

	test("a grid-only document renders standalone: no spine, no pill", () => {
		const generated = generateRoadmap(grid);
		expect(generated.layout.connectors.filter((c) => c.kind === "spine")).toHaveLength(0);
		expect(generated.layout.elements.filter((e) => e.kind === "chapter")).toHaveLength(0);
		// The first column header names the chart.
		expect(generated.layout.title).toBe("Alpha");
		expect(generated.svg).toContain('aria-label="Alpha"');
	});

	test("with an H1 and other chapters the grid mounts on the spine", () => {
		const generated = generateRoadmap(`# Title\n\n* Intro\n  * Topic\n\n${grid}`);
		expect(generated.layout.connectors.filter((c) => c.kind === "spine").length).toBeGreaterThan(0);
		// Only the headed chapter draws a pill; the grid step stays headless.
		expect(generated.layout.elements.filter((e) => e.kind === "chapter")).toHaveLength(1);
		expect(generated.layout.title).toBe("Title");
	});
});
