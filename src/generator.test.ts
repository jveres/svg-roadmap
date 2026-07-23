import { describe, expect, test } from "vitest";
import { noteLayoutRectangle, paintedNodeFrameRectangle } from "./core/frames.ts";
import { rectanglesOverlap } from "./core/geometry.ts";
import {
	builtInThemes,
	createRoadmapGenerator,
	generateRoadmap,
	generateRoadmapSvg,
	generateRoadmapSvgSync,
} from "./index.ts";
import { createTheme, darkTheme, lightTheme } from "./theme.ts";
import { generateFunBackgroundArtifacts } from "./themes/fun/background-artifacts.ts";
import { generateRoseBackgroundArtifacts } from "./themes/rose/background-artifacts.ts";
import { generateSciFiBackgroundArtifacts } from "./themes/sci-fi/background-artifacts.ts";
import type { LayoutGroup, LayoutNode, RoadmapTheme, RoadmapThemePreset } from "./types.ts";

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
		expect(first).toContain("<title");
		expect(first).not.toContain("foreignObject");
		expect(first).not.toContain("<script");
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

# Utopian systems

* Explore
  * Discover
    * Align`;

		const generated = generateRoadmap(source);

		expect(Object.keys(builtInThemes)).toEqual(["fun", "sci-fi", "rose"]);
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

# Growing together

* Discover
  * Listen
    * Learn`);

		expect(generated.theme).toBe(builtInThemes.rose?.modes.dark);
		expect(generated.theme.name).toBe("rose");
		expect(generated.theme.mode).toBe("dark");
		expect(generated.theme.chapter.shape).toBe("ribbon");
		expect(generated.theme.note.shape).toBe("petal");
		expect(generated.theme.topic.shape).toBe("petal");
		expect(generated.theme.nestedTopic.shape).toBe("petal");
		expect(generated.theme.topicHeader.shape).toBe("ribbon");
		expect(generated.theme.boards.topic.shape).toBe("scalloped");
		expect(generated.theme.boards.topic.pattern).toBe("lace");
		expect(generated.theme.boards.nested.pattern).toBe("lace");
		expect(generated.theme.connectors.spine.routing).toBe("braided");
		expect(generated.theme.connectors.topicToChildren.routing).toBe("curved");
		expect(generated.svg).toContain('data-roadmap-theme="rose"');
		expect(generated.svg).toContain('data-roadmap-shape="ribbon"');
		expect(generated.svg).toContain('data-roadmap-shape="petal"');
		expect(generated.svg).toContain('data-roadmap-shape="scalloped"');
		expect(generated.svg).toContain('data-roadmap-pattern="lace"');
		expect(generated.svg).toContain('data-roadmap-routing="braided"');
		expect(generated.svg).toContain("--roadmap-rose-artifact-blush:#d982aa");
		expect(generated.svg).not.toContain("--roadmap-sci-fi-artifact-cyan:");
		const chapter = generated.layout.elements.find(
			(element): element is LayoutNode => element.kind === "chapter",
		);
		if (!chapter) throw new Error("Rose chapter fixture was not generated");
		const ribbonPath = generated.svg.match(
			/roadmap__node--chapter[^>]*>.*?<path class="roadmap__frame" data-roadmap-shape="ribbon"[^>]* d="([^"]+)"/u,
		)?.[1];
		const chapterHeight = chapter.height - 1;
		const tail = Math.min(chapterHeight * 0.28, chapter.width * 0.09);
		expect(ribbonPath?.startsWith(`M ${chapter.x + tail} ${chapter.y} H `)).toBe(true);
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
		const { backgroundArtifacts: _lightArtifacts, ...plainLight } = lightTheme;
		const { backgroundArtifacts: _darkArtifacts, ...plainDark } = darkTheme;
		const light: RoadmapTheme = { ...plainLight, name: "plain" };
		const dark: RoadmapTheme = { ...plainDark, name: "plain" };
		const plain: RoadmapThemePreset = {
			name: "plain",
			modes: { light, dark },
		};
		const generated = generateRoadmap(
			`---
roadmap:
  theme: plain
  background: true
---

# No decorations`,
			{ themes: { plain } },
		);

		expect(generated.theme.name).toBe("plain");
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
		expect(generated.layout.width).toBeGreaterThanOrEqual(1184);
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

			expect(frame.width).toBe(description.width);
			expect(frame.width).toBeLessThan(120);
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
		const reserved = noteLayoutRectangle(note);
		expect(reserved).toEqual(paintedNodeFrameRectangle(note));
	});
});
