import { describe, expect, test } from "vitest";
import { wrapInline } from "./core/inline.ts";
import { generateRoadmap } from "./index.ts";
import { lightTheme } from "./theme.ts";
import { generateAsciiBackgroundArtifacts } from "./themes/ascii/background-artifacts.ts";
import type { TypographyTheme } from "./types.ts";

const source = "# Title\n\n* Chapter\n  * Topic [recommended]\n    * Child\n";

describe("connector gradients", () => {
	test("gradients are a capability: nothing renders without the opt-in", () => {
		const generated = generateRoadmap(source, { render: { idPrefix: "off" } });
		expect(generated.svg).not.toContain("off-connector-spine-gradient");
		expect(generated.svg).toMatch(
			/roadmap__connector--spine[^>]*stroke="var\(--roadmap-connector-spine-color\)"/u,
		);
	});

	test("the fun spine wears the reference rainbow as a user-space gradient", () => {
		const generated = generateRoadmap(source, {
			render: { idPrefix: "grad", gradients: true },
		});
		expect(generated.svg).toContain(
			'<linearGradient id="grad-connector-spine-gradient" gradientUnits="userSpaceOnUse"',
		);
		expect(generated.svg).toMatch(
			/roadmap__connector--spine[^>]*stroke="url\(#grad-connector-spine-gradient\)"/u,
		);
		expect(generated.svg).toContain('stop-color="#8ed246"');
	});

	test("fun hulls outline in the journey ramp, subtle by default", () => {
		const generated = generateRoadmap(source, {
			render: { idPrefix: "hull", gradients: true },
		});
		expect(generated.svg).toMatch(
			/roadmap__group--topic[^>]*stroke="url\(#hull-connector-spine-gradient\)"[^>]*stroke-width="1.5"[^>]*stroke-opacity="0.7"/u,
		);
	});

	test("the document can opt in through theme.gradients front matter", () => {
		const generated = generateRoadmap(
			`---\nroadmap:\n  theme:\n    preset: fun\n    gradients: true\n---\n${source}`,
			{ render: { idPrefix: "doc" } },
		);
		expect(generated.svg).toContain("doc-connector-spine-gradient");
	});

	test("themes without a gradient keep the plain color stroke", () => {
		const generated = generateRoadmap(source, {
			theme: { preset: "sci-fi" },
			render: { idPrefix: "plain", gradients: true },
		});
		expect(generated.svg).not.toContain("plain-connector-spine-gradient");
		expect(generated.svg).toMatch(
			/roadmap__connector--spine[^>]*stroke="var\(--roadmap-connector-spine-color\)"/u,
		);
	});

	test("gradient stop colors are escaped in the def", () => {
		const generated = generateRoadmap(source, {
			render: { gradients: true },
			theme: {
				connectors: {
					spine: {
						gradient: [
							{ offset: 0, color: '"><script>x</script>' },
							{ offset: 1, color: "#00a586" },
						],
					},
				},
			},
		});
		expect(generated.svg).not.toContain("<script");
	});
});

describe("theme merging fidelity", () => {
	test("TagStyle.legend survives theme merging", () => {
		const generated = generateRoadmap(
			`${source.replace("[recommended]", "[hidden] [recommended]")}`,
			{
				theme: {
					badges: {
						tags: {
							hidden: { label: "Hidden", badges: [{ icon: "x" }], legend: false },
						},
					},
				},
			},
		);
		const legend = generated.layout.elements.find((element) => element.kind === "legend");
		const rows = legend && "items" in legend ? legend.items.map((item) => item.tag) : [];
		expect(rows).not.toContain("hidden");
		expect(rows).toContain("recommended");
	});

	test("partial accent overrides merge with the base accent", () => {
		const generated = generateRoadmap(
			`---\nroadmap:\n  tags:\n    custom:\n      accent: green\n---\n${source.replace("[recommended]", "[custom]")}`,
			{
				theme: {
					badges: { accents: { green: { background: "#123456" } } },
				},
			},
		);
		// The base green accent supplies the foreground; the override only
		// replaced the background — the accent still resolves.
		expect(generated.svg).toContain("#123456");
	});
});

describe("grapheme integrity", () => {
	const typography = {
		color: "#000",
		fontFamily: "Arial",
		fontSize: 16,
		fontWeight: 400,
		fontStyle: "normal",
		lineHeight: 1.2,
	} as unknown as TypographyTheme;

	test("source-line soft breaks flow as spaces, not forced line breaks", () => {
		const generated = generateRoadmap(
			"# T\n\nGroups practices by maturity: start with\n[foundation], adopt later.\n\n* Chapter\n  * Topic\n",
		);
		const note = generated.layout.elements.find(
			(element) => element.kind === "note" && "text" in element,
		);
		const lines =
			note && "text" in note
				? note.text.lines.map((line) => line.segments.map((segment) => segment.text).join(""))
				: [];
		// The source newline sits between "with" and "[foundation]"; flowing
		// prose keeps them on one line at this width.
		expect(lines.some((line) => /with \[foundation\]/u.test(line))).toBe(true);
	});

	test("ZWJ emoji survive hard wrapping as a single grapheme", () => {
		const family = "\u{1F469}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}";
		const content = [{ type: "text" as const, value: family.repeat(6) }];
		// A width narrow enough to force hard splits inside the run.
		const lines = wrapInline(content, 40, typography, 12);
		for (const line of lines) {
			for (const segment of line.segments) {
				// Every split point respects grapheme boundaries: each piece
				// contains only whole family sequences.
				const text = segment.text.trim();
				if (!text) continue;
				expect(text.length % family.length).toBe(0);
			}
		}
	});
});

describe("document layout settings", () => {
	const grid =
		"# T\n\n* Chapter\n  + Col one\n    * A\n  * Col two\n    * B\n  * Col three\n    * C\n";

	test("the canvas crops to content on both axes", () => {
		const generated = generateRoadmap(source);
		const contentRight = Math.max(
			...generated.layout.elements.map((element) => element.x + element.width),
		);
		const contentLeft = Math.min(...generated.layout.elements.map((element) => element.x));
		// No dead bands: content starts at the padding and the canvas ends
		// just past the rightmost element, regardless of the working width.
		expect(contentLeft).toBeLessThan(60);
		expect(generated.layout.width - contentRight).toBeLessThan(60);
	});

	test("canvas factor grows both dimensions around a centered chart", () => {
		const tight = generateRoadmap(source);
		const grown = generateRoadmap(`---\nroadmap:\n  layout:\n    canvas: 1.5\n---\n${source}`);
		expect(grown.layout.width).toBe(Math.ceil(tight.layout.width * 1.5));
		expect(grown.layout.height).toBe(Math.ceil(tight.layout.height * 1.5));
		const heading = (layout: typeof tight.layout) =>
			layout.elements.find((element) => element.kind === "heading");
		const dx = (grown.layout.width - tight.layout.width) / 2;
		const dy = (grown.layout.height - tight.layout.height) / 2;
		expect(heading(grown.layout)?.x).toBeCloseTo((heading(tight.layout)?.x ?? 0) + dx, 5);
		expect(heading(grown.layout)?.y).toBeCloseTo((heading(tight.layout)?.y ?? 0) + dy, 5);
	});

	test("two-column clusters widen and shorten the chart; API knobs win", () => {
		const busy = [
			"# T",
			"",
			"* Chapter",
			...[1, 2, 3, 4].flatMap((n) => [
				`  * Topic number ${n} with a label`,
				...[1, 2, 3].map((child) => `    * Child ${n}.${child} content`),
			]),
		].join("\n");
		const cozy = generateRoadmap(busy);
		const wide = generateRoadmap(`---\nroadmap:\n  layout:\n    clusterColumns: 2\n---\n${busy}`);
		// Clusters tile their uniform box in two columns: wider, shorter.
		expect(wide.layout.width).toBeGreaterThan(cozy.layout.width);
		expect(wide.layout.height).toBeLessThan(cozy.layout.height);
		// Explicit API knobs override the document's setting.
		const apiWins = generateRoadmap(
			`---\nroadmap:\n  layout:\n    clusterColumns: 2\n---\n${busy}`,
			{ layout: { clusterColumns: 1 } },
		);
		expect(apiWins.layout.width).toBeLessThan(wide.layout.width);
	});

	test("layout columns wraps grids into chunks", () => {
		const unlimited = generateRoadmap(grid);
		const wrapped = generateRoadmap(`---\nroadmap:\n  layout:\n    columns: 1\n---\n${grid}`);
		expect(wrapped.layout.height).toBeGreaterThan(unlimited.layout.height);
	});

	test("spacing scales the rhythm coherently", () => {
		const compact = generateRoadmap(
			`---\nroadmap:\n  layout:\n    spacing: compact\n---\n${source}`,
		);
		const cozy = generateRoadmap(source);
		const roomy = generateRoadmap(`---\nroadmap:\n  layout:\n    spacing: roomy\n---\n${source}`);
		expect(compact.layout.height).toBeLessThan(cozy.layout.height);
		expect(cozy.layout.height).toBeLessThan(roomy.layout.height);
	});

	test("title and description reach the accessible SVG; API wins", () => {
		const fromDocument = generateRoadmap(
			`---\nroadmap:\n  title: Authored title\n  description: Authored description\n---\n${source}`,
		);
		expect(fromDocument.svg).toContain(">Authored title</title>");
		expect(fromDocument.svg).toContain(">Authored description</desc>");
		const apiWins = generateRoadmap(`---\nroadmap:\n  title: Authored title\n---\n${source}`, {
			render: { title: "Host title" },
		});
		expect(apiWins.svg).toContain(">Host title</title>");
	});

	test("invalid layout values fail with helpful messages", () => {
		expect(() =>
			generateRoadmap(`---\nroadmap:\n  layout:\n    canvas: 0.5\n---\n${source}`),
		).toThrowError(/canvas must be a number between 1 and 3/u);
		expect(() =>
			generateRoadmap(`---\nroadmap:\n  layout:\n    clusterColumns: 3\n---\n${source}`),
		).toThrowError(/clusterColumns must be 1 or 2/u);
		expect(() =>
			generateRoadmap(`---\nroadmap:\n  layout:\n    spacing: dense\n---\n${source}`),
		).toThrowError(/spacing must be "compact", "cozy", or "roomy"/u);
		expect(() =>
			generateRoadmap(`---\nroadmap:\n  layout:\n    colums: 2\n---\n${source}`),
		).toThrowError(/colums/u);
	});
});

describe("theme customization options", () => {
	test("halftone board pattern renders staggered dots", () => {
		const generated = generateRoadmap(source, {
			theme: { boards: { topic: { pattern: "halftone" } } },
		});
		expect(generated.svg).toContain('data-roadmap-pattern="halftone"');
	});

	test("card gradients emit scoped definitions and fill the frame", () => {
		const generated = generateRoadmap(source, {
			theme: { topic: { gradient: { start: "#ff0000", end: "#0000ff" } } },
			render: { idPrefix: "gradient-card" },
		});
		expect(generated.svg).toContain('<linearGradient id="gradient-card-topic-card-gradient"');
		expect(generated.svg).toContain("--roadmap-topic-card-gradient-start:#ff0000");
		expect(generated.svg).toContain('fill="url(#gradient-card-topic-card-gradient)"');
	});

	test("detail insets draw a sticker keyline inside the frame", () => {
		const generated = generateRoadmap(source, {
			theme: { topic: { detailInset: 3 } },
		});
		expect(generated.svg).toMatch(
			/<rect class="roadmap__frame-detail" fill="none" stroke="var\(--roadmap-topic-border\)"/u,
		);
	});

	test("per-card shadows override the global shadow paint", () => {
		const generated = generateRoadmap(source, {
			theme: { chapter: { shadowColor: "#123456", shadowOpacity: 0.5 } },
		});
		expect(generated.svg).toContain("--roadmap-chapter-shadow-color:#123456");
		expect(generated.svg).toContain(
			'fill="var(--roadmap-chapter-shadow-color, var(--roadmap-shadow-color))"',
		);
	});

	test("uppercase transform and letter spacing shape wrapped text", () => {
		const typography: TypographyTheme = {
			...lightTheme.topic.typography,
			letterSpacing: 0,
		};
		const plain = wrapInline([{ type: "text", value: "groovy times" }], 1000, typography);
		const spaced = wrapInline([{ type: "text", value: "groovy times" }], 1000, {
			...typography,
			letterSpacing: 2,
		});
		const upper = wrapInline([{ type: "text", value: "groovy times" }], 1000, {
			...typography,
			textTransform: "uppercase",
		});
		expect(spaced[0]?.width).toBeCloseTo((plain[0]?.width ?? 0) + 2 * "groovy times".length, 5);
		expect(upper[0]?.segments[0]?.text).toBe("GROOVY TIMES");
		expect(upper[0]?.width ?? 0).toBeGreaterThan(plain[0]?.width ?? 0);
	});

	test("detached end shapes keep the stroke clear of translucent markers", () => {
		const overlap = generateRoadmap(source, {
			theme: { connectors: { topicToChildren: { endShape: "dot" } } },
			render: { idPrefix: "join-overlap" },
		});
		const detached = generateRoadmap(source, {
			theme: {
				connectors: { topicToChildren: { endShape: "dot", endShapeJoin: "detached" } },
			},
			render: { idPrefix: "join-detached" },
		});
		const refX = (svg: string): string =>
			svg.match(/-marker-topic-to-children-dot"[^>]*\brefX="([^"]+)"/u)?.[1] ?? "";
		expect(refX(overlap.svg)).toBe("6.8");
		expect(refX(detached.svg)).toBe("1");
		const pathEndX = (svg: string): number =>
			Number(
				svg.match(/topicToChildren[^"]*"[^>]* d="[^"]* (-?[\d.]+) -?[\d.]+"/u)?.[1] ?? Number.NaN,
			);
		// The detached stroke ends further from the endpoint than the
		// overlapped one, leaving the marker fully ahead of the line.
		expect(pathEndX(detached.svg)).not.toBe(pathEndX(overlap.svg));
	});

	test("connector end shapes render as color-inheriting markers", () => {
		const generated = generateRoadmap(source, {
			theme: { connectors: { topicToChildren: { endShape: "arrow" } } },
			render: { idPrefix: "marker-end" },
		});
		expect(generated.svg).toContain('<marker id="marker-end-marker-topic-to-children-arrow"');
		expect(generated.svg).toContain('marker-end="url(#marker-end-marker-topic-to-children-arrow)"');
		expect(generated.svg).toContain('fill="var(--roadmap-connector-topic-to-children-color)"');
	});

	test("animated backgrounds emit a deterministic drift loop on request", () => {
		const animatedSource = `---
roadmap:
  background:
    enabled: true
    seed: motion
    animated: true
---

# Motion

* Chapter one
  * A reasonably wide topic label
  * Another topic beside it
  * A third topic for body

* Chapter two
  * More content to give the canvas room
  * Where background artifacts can settle
`;
		const animated = generateRoadmap(animatedSource);
		expect(animated.layout.backgroundArtifacts.length).toBeGreaterThan(0);
		expect(animated.svg).toContain("@keyframes roadmap-artifact-drift");
		expect(animated.svg).toContain('class="roadmap__background-artifact-motion"');
		expect(animated.svg).toContain("prefers-reduced-motion");
		expect(animated.svg).toMatch(/animation-duration:\d+\.\d+s;animation-delay:-\d+(?:\.\d+)?s/u);
		expect(animated.svg).toBe(generateRoadmap(animatedSource).svg);
		expect(animated.svg).not.toContain("<script");

		// The ASCII cursor block declares a blink, active only when animated.
		const asciiAnimated = generateRoadmap(animatedSource, {
			theme: { preset: "ascii", mode: "light" },
		});
		expect(asciiAnimated.svg).toContain("@keyframes roadmap-artifact-blink");
		const asciiArtifacts = generateAsciiBackgroundArtifacts({
			width: 1600,
			height: 1200,
			avoid: [],
			settings: { enabled: true, seed: "motion", density: 1, size: 1 },
		});
		expect(
			asciiArtifacts.some((artifact) =>
				artifact.shapes.some((shape) => shape.animation === "blink"),
			),
		).toBe(true);

		const still = generateRoadmap(animatedSource.replace("    animated: true\n", ""));
		expect(still.svg).not.toContain("@keyframes roadmap-artifact-drift");
		expect(still.svg).not.toContain("roadmap__background-artifact-motion");
		const asciiStill = generateRoadmap(animatedSource.replace("    animated: true\n", ""), {
			theme: { preset: "ascii", mode: "light" },
		});
		expect(asciiStill.svg).not.toContain("roadmap__artifact-blink");

		// Four shared wandering variants; intensity rescales their amplitudes.
		expect(animated.svg.match(/@keyframes roadmap-artifact-drift-\d/gu)).toHaveLength(4);
		expect(animated.svg).toMatch(/animation-name:roadmap-artifact-drift-\d/u);
		const intense = generateRoadmap(
			animatedSource.replace("    animated: true\n", "    animated: 2\n"),
		);
		const keyframesOf = (svg: string): string =>
			svg.match(/@keyframes roadmap-artifact-drift-0\{[^}]*\}/u)?.[0] ?? "";
		expect(keyframesOf(intense.svg)).not.toBe(keyframesOf(animated.svg));
		expect(
			generateRoadmap(animatedSource.replace("    animated: true\n", "    animated: 0\n")).svg,
		).not.toContain("@keyframes roadmap-artifact-drift");
	});

	test("legend uppercase and letter spacing carry into layout and markup", () => {
		const generated = generateRoadmap(source, {
			theme: { legend: { letterSpacing: 1.5, textTransform: "uppercase" } },
		});
		const legend = generated.layout.elements.find((element) => element.kind === "legend");
		expect(legend && "items" in legend && legend.items[0]?.label).toBe("RECOMMENDED");
		expect(generated.svg).toContain('letter-spacing="1.5"');
	});
});

describe("document-defined tags", () => {
	const taggedSource = `---
roadmap:
  tags:
    advanced:
      icon: star
      accent: violet
      label: Advanced topic
    experimental:
      icon: ":rocket:"
      accent: amber
    internal:
      icon: x
      legend: false
    branded:
      background: "#123456"
      foreground: "#fedcba"
---

# Title

* Chapter
  * Deep topic [advanced]
  * Rocket topic [experimental]
  * Hidden topic [internal]
  * Brand topic [branded]
`;

	test("front matter declares tags with accents, labels, and icons", () => {
		const generated = generateRoadmap(taggedSource);
		// Accent slots resolve through the theme palette.
		expect(generated.svg).toContain("--roadmap-badge-tag-advanced-background:#8a75e5");
		expect(generated.svg).toContain('href="#');
		expect(generated.svg).toContain("roadmap__badge--tag-advanced");
		const legend = generated.layout.elements.find((element) => element.kind === "legend");
		if (!legend || !("items" in legend)) throw new Error("legend missing");
		const labels = legend.items.map((item) => item.label);
		expect(labels).toContain("Advanced topic");
		// Default label humanizes the tag name.
		expect(labels).toContain("Experimental");
		// legend: false keeps the tag off the legend but the badge renders.
		expect(labels).not.toContain("Internal");
		expect(generated.svg).toContain("roadmap__badge--tag-internal");
	});

	test("emoji shortcode icons paint artwork on a colored disc", () => {
		const generated = generateRoadmap(taggedSource);
		expect(generated.svg).toMatch(/roadmap__badge--tag-experimental[^>]*>[\s\S]*?-emoji-rocket"/u);
		// The rocket artwork is emitted even though no text uses the shortcode.
		expect(generated.svg).toContain('-emoji-rocket" viewBox');
	});

	test("a color-valued accent is used literally with a derived foreground", () => {
		const generated = generateRoadmap(
			'---\nroadmap:\n  tags:\n    hot:\n      accent: "#ffe066"\n---\n\n# T\n\n* C\n  * Topic [hot]\n',
		);
		expect(generated.svg).toContain("--roadmap-badge-tag-hot-background:#ffe066");
		// Light backgrounds get a dark foreground automatically.
		expect(generated.svg).toContain("--roadmap-badge-tag-hot-foreground:#22242a");
	});

	test("explicit colors pass through as an escape hatch", () => {
		const generated = generateRoadmap(taggedSource);
		expect(generated.svg).toContain("--roadmap-badge-tag-branded-background:#123456");
		expect(generated.svg).toContain("--roadmap-badge-tag-branded-foreground:#fedcba");
	});

	test("an icon list stacks one badge per entry with positional accents", () => {
		const generated = generateRoadmap(
			"---\nroadmap:\n  tags:\n    certified:\n      icon: [heart, check, star]\n      accent: [red, green]\n---\n\n# T\n\n* C\n  * Topic [certified]\n",
		);
		// One paint token per badge — shared tokens would collide in CSS.
		expect(generated.svg).toContain("--roadmap-badge-tag-certified-background:#c75c5c");
		expect(generated.svg).toContain("--roadmap-badge-tag-certified-2-background:#76c479");
		// A shorter accent list repeats its last entry for remaining icons.
		expect(generated.svg).toContain("--roadmap-badge-tag-certified-3-background:#76c479");
		const badges = generated.svg.match(/roadmap__badge--tag-certified(?:-\d)?/gu) ?? [];
		expect(new Set(badges).size).toBe(3);
	});

	test("more accents than icons is a front-matter error", () => {
		expect(() =>
			generateRoadmap(
				"---\nroadmap:\n  tags:\n    odd:\n      icon: [heart]\n      accent: [red, green]\n---\n\n# T\n\n* C\n  * A\n",
			),
		).toThrow(/more accents than icons/u);
	});

	test("a malformed icon list is a front-matter error", () => {
		expect(() =>
			generateRoadmap(
				"---\nroadmap:\n  tags:\n    odd:\n      icon: [heart, sparkles-bad-name]\n---\n\n# T\n\n* C\n  * A\n",
			),
		).toThrow(/icon must be one of/u);
	});

	test("theme identity is preserved when no document tags are declared", () => {
		const generated = generateRoadmap(source);
		expect(generated.theme).toBe(lightTheme);
	});

	test("the legend can be disabled from front matter", () => {
		const withLegend = generateRoadmap(taggedSource);
		const without = generateRoadmap(taggedSource.replace("roadmap:", "roadmap:\n  legend: false"));
		expect(withLegend.layout.elements.some((element) => element.kind === "legend")).toBe(true);
		expect(without.layout.elements.some((element) => element.kind === "legend")).toBe(false);
	});

	test("grid nesting draws side-selected hairline tree lines", () => {
		const generated = generateRoadmap(
			"# T\n\n* Chapter\n  + Head\n    * Parent\n      * Left child\n        * Grand child\n  * Head two\n    * Parent two\n      - Right child\n",
		);
		const elbows = generated.layout.connectors.filter((connector) => connector.shape === "elbow");
		// Each nested child draws a vertical rail plus a horizontal stub, so
		// hosts can light a gutter path without its siblings' T-junctions.
		expect(elbows.filter((connector) => connector.id.endsWith("-grid-rail"))).toHaveLength(3);
		const stubs = elbows.filter((connector) => connector.id.endsWith("-grid-link"));
		expect(stubs).toHaveLength(3);
		const bySide = (sign: number) =>
			stubs.filter((connector) => Math.sign(connector.to.x - connector.from.x) === sign);
		// Left-side default enters the child's left edge; `-` mirrors right.
		expect(bySide(1)).toHaveLength(2);
		expect(bySide(-1)).toHaveLength(1);
		// Tree lines render as unmarked hairlines, not themed branch routes.
		expect(generated.svg).toContain('data-roadmap-element="tree-line"');
		expect(generated.svg).toMatch(/tree-line[^>]*stroke-width="1"[^>]*stroke-linecap="butt"/u);
		expect(generated.svg).not.toMatch(/tree-line[^>]*marker-end/u);
	});

	test("misplaced roadmap-level keys and inline comments are handled helpfully", () => {
		expect(() =>
			generateRoadmap(
				"---\nroadmap:\n  background:\n    enabled: true\n    legend: false\n---\n\n# T\n",
			),
		).toThrow(/put it directly under "roadmap:" with a two-space indent/u);
		expect(() =>
			generateRoadmap("---\nroadmap:\n  theme:\n    preset: fun\n    legend: false\n---\n\n# T\n"),
		).toThrow(/put it directly under "roadmap:" with a two-space indent/u);
		// Plain unknown keys list what the block supports.
		expect(() =>
			generateRoadmap("---\nroadmap:\n  background:\n    speed: 2\n---\n\n# T\n"),
		).toThrow(/Supported: enabled, seed, density, size, animated/u);
		// Inline comments after a value parse like YAML.
		const commented = generateRoadmap(
			"---\nroadmap:\n  legend: false # hide it\n---\n\n# T\n\n* C\n  * Topic [recommended]\n",
		);
		expect(commented.layout.elements.some((element) => element.kind === "legend")).toBe(false);
	});

	test("invalid tag settings fail with descriptive errors", () => {
		expect(() =>
			generateRoadmap("---\nroadmap:\n  tags:\n    bad:\n      icon: nonsense\n---\n\n# T\n"),
		).toThrow(/icon must be one of/u);
		expect(() =>
			generateRoadmap(
				'---\nroadmap:\n  tags:\n    bad:\n      background: "url(javascript:x)"\n---\n\n# T\n',
			),
		).toThrow(/plain CSS color/u);
	});
});
