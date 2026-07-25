import { describe, expect, test } from "vitest";
import { inlineToPlainText } from "./core/inline.ts";
import {
	createMarkdownOptions,
	parseRoadmapMarkdown,
	RoadmapMarkdownError,
	RoadmapParser,
} from "./markdown.ts";

describe("roadmap Markdown parser", () => {
	test("parses extensible roadmap settings from front matter", () => {
		const document = parseRoadmapMarkdown(`---
roadmap:
  theme:
    preset: fun
    mode: dark
  background:
    enabled: true
    seed: stable-demo
    density: 0.7
    size: 1.4
---

# Configured roadmap`);

		expect(document.settings).toEqual({
			theme: { preset: "fun", mode: "dark" },
			background: {
				enabled: true,
				seed: "stable-demo",
				density: 0.7,
				size: 1.4,
				animated: false,
			},
			tags: {},
			legend: true,
		});
		expect(document.steps).toHaveLength(1);
	});

	test.each([0, 0.24, 3.01, 4])("rejects an out-of-range background size of %s", (size) => {
		expect(() =>
			parseRoadmapMarkdown(`---
roadmap:
  background:
    size: ${size}
---

# Invalid size`),
		).toThrow("The background size must be between 0.25 and 3.");
	});

	test("accepts future theme names without coupling the Markdown parser to a catalog", () => {
		const document = parseRoadmapMarkdown(`---
roadmap:
  theme: geometric
---

# Future theme`);

		expect(document.settings.theme).toEqual({ preset: "geometric" });
	});

	test("maps legacy syntax to recursive chapters and groups", () => {
		const markdown = `# Engineering _map_ :soap:

* 1️⃣ Foundations [personal recommendation]
*A **short** [description](https://example.com).*
  + Design [recommended]
    * Discovery
      * Research ==deeply==
        * Validate
  * Delivery

  * Operations [insightful]

## Keep ++learning++ :recycle:

*[Research]: Investigate a question systematically.`;

		const document = parseRoadmapMarkdown(markdown);
		const chapter = document.steps.find((step) => step.type === "chapter");

		expect(document.stats).toEqual({ chapters: 1, topics: 6, maxDepth: 4 });
		expect(document.steps).toHaveLength(3);
		const title = document.steps[0];
		expect(title?.type).toBe("heading");
		if (title?.type !== "heading") throw new Error("heading was not parsed");
		const soap = title.content.find((node) => node.type === "emoji");
		expect(soap?.type === "emoji" ? soap.shortcode : undefined).toBe("soap");
		expect(chapter?.type).toBe("chapter");
		if (chapter?.type !== "chapter") throw new Error("chapter was not parsed");
		expect(inlineToPlainText(chapter.content)).toBe("1️⃣ Foundations");
		expect(inlineToPlainText(chapter.description)).toBe("A short description.");
		expect(chapter.tags).toEqual(["personal recommendation"]);
		expect(chapter.groups.map((group) => group.layout)).toEqual(["grid", "tree"]);
		expect(chapter.groups[0]?.topics[0]?.children[0]?.children[0]?.children[0]?.depth).toBe(4);
		expect(JSON.stringify(chapter)).toContain("Investigate a question systematically.");
		expect(document.abbreviations).toEqual({
			Research: "Investigate a question systematically.",
		});
	});

	test("has no application-level topic depth limit", () => {
		const nested = Array.from({ length: 128 }, (_, index) => {
			const indentation = "  ".repeat(index + 1);
			return `${indentation}* Level ${index + 1}`;
		}).join("\n");
		const markdown = `* Chapter\n${nested}`;

		const document = parseRoadmapMarkdown(markdown);

		expect(document.stats.maxDepth).toBe(128);
		expect(document.stats.topics).toBe(128);
	});

	test("parses representative roadmap-next semantics", () => {
		const markdown = `# Roadmap

* Chapter One
*Description.*
  + Grid topic
    * Nested topic

* Chapter Two
  - Tree topic
    * Nested topic

### Keep improving`;

		const document = parseRoadmapMarkdown(markdown);
		const chapters = document.steps.filter((step) => step.type === "chapter");

		expect(chapters).toHaveLength(2);
		expect(document.stats.maxDepth).toBe(2);
		expect(chapters[0]?.groups[0]?.layout).toBe("grid");
		expect(chapters[1]?.groups[0]?.layout).toBe("tree");
		expect(document.steps.at(-1)?.type).toBe("heading");
	});

	test("supports a reusable prepared parser", () => {
		const parser = new RoadmapParser();

		const first = parser.parse("# One");
		const second = parser.parse("# Two");
		parser.dispose();

		expect(inlineToPlainText(first.steps[0]?.content ?? [])).toBe("One");
		expect(inlineToPlainText(second.steps[0]?.content ?? [])).toBe("Two");
		expect(() => parser.parse("# Three")).toThrow("disposed");
	});

	test("blockquotes under a topic become its detail note, not card content", () => {
		const document = parseRoadmapMarkdown(
			"* Chapter\n  * Topic one *desc*\n    > Why it matters: depth for the panel.\n    > Second note paragraph.\n",
		);
		const chapter = document.steps.find((step) => step.type === "chapter");
		if (chapter?.type !== "chapter") throw new Error("chapter was not parsed");
		const topic = chapter.groups[0]?.topics[0];
		expect(inlineToPlainText(topic?.content ?? [])).toBe("Topic one");
		expect(inlineToPlainText(topic?.description ?? [])).toBe("desc");
		expect(topic?.note).toBe("Why it matters: depth for the panel.\nSecond note paragraph.");
	});

	test("uses Unicode source columns when recognizing star comments", () => {
		const document = parseRoadmapMarkdown("* Chapter\n  * Topic 😀 *comment*");
		const chapter = document.steps.find((step) => step.type === "chapter");
		if (chapter?.type !== "chapter") throw new Error("chapter was not parsed");
		const topic = chapter.groups[0]?.topics[0];

		expect(inlineToPlainText(topic?.content ?? [])).toBe("Topic 😀");
		expect(inlineToPlainText(topic?.description ?? [])).toBe("comment");
	});

	test("maps Comrak task items to chapters and recursive topics", () => {
		const document = parseRoadmapMarkdown("* [ ] Chapter\n  * [x] Topic", {
			markdown: { extension: { tasklist: true } },
		});
		const chapter = document.steps[0];
		if (chapter?.type !== "chapter") throw new Error("task chapter was not parsed");

		expect(document.stats).toEqual({ chapters: 1, topics: 1, maxDepth: 1 });
		expect(inlineToPlainText(chapter.content)).toBe("Chapter");
		expect(inlineToPlainText(chapter.groups[0]?.topics[0]?.content ?? [])).toBe("Topic");
	});

	test("preserves separators between description and footnote paragraphs", () => {
		const markdown = `* Chapter

  Chapter paragraph one.

  Chapter paragraph two.
  * Topic

    Topic paragraph one.

    Topic paragraph two.

Reference[^note]

[^note]: Footnote paragraph one.

    Footnote paragraph two.`;
		const document = parseRoadmapMarkdown(markdown);
		const chapter = document.steps.find((step) => step.type === "chapter");
		if (chapter?.type !== "chapter") throw new Error("chapter was not parsed");
		const topic = chapter.groups[0]?.topics[0];
		const footnote = document.footnotes[0];

		expect(inlineToPlainText(chapter.description)).toBe(
			"Chapter paragraph one. Chapter paragraph two.",
		);
		expect(chapter.description.some((node) => node.type === "softBreak")).toBe(true);
		expect(inlineToPlainText(topic?.description ?? [])).toBe(
			"Topic paragraph one. Topic paragraph two.",
		);
		expect(inlineToPlainText(footnote?.content ?? [])).toBe(
			"Footnote paragraph one. Footnote paragraph two.",
		);
	});

	test("retains the exact caller source while removing abbreviation definitions for parsing", () => {
		const markdown = "* Chapter\n  * API\n\n*[API]: Application programming interface.\n";
		const document = parseRoadmapMarkdown(markdown);

		expect(document.source).toBe(markdown);
		expect(document.abbreviations).toEqual({
			API: "Application programming interface.",
		});
	});

	test("enforces source-position invariants and leaves description lists disabled by default", () => {
		const options = createMarkdownOptions({
			parse: { sourceposChars: false },
			render: { sourcepos: false },
		});

		expect(options.parse?.sourceposChars).toBe(true);
		expect(options.render?.sourcepos).toBe(true);
		expect(options.extension?.descriptionLists).toBeUndefined();
	});

	test.each([
		["backtick", '```typescript"unsafe\ncode\n```', 1],
		["tilde", "~~~typescript&unsafe\ncode\n~~~", 1],
		["blockquote", "> ```typescript<unsafe\n> code\n> ```", 1],
		["list container", "- ~~~typescript>unsafe\n  code\n  ~~~", 1],
		["nested list container", "- Parent\n    - ```typescript&unsafe\n      code\n      ```", 2],
	])("rejects unsafe %s fence info before Comrak emits invalid XML", (_name, markdown, line) => {
		expect(() => parseRoadmapMarkdown(markdown)).toThrow(RoadmapMarkdownError);
		expect(() => parseRoadmapMarkdown(markdown)).toThrow(`line ${line}`);
	});

	test("accepts safe backtick and tilde code fences", () => {
		const markdown = "```typescript\nconst one = 1;\n```\n\n~~~text\ntwo\n~~~";
		const document = parseRoadmapMarkdown(markdown);

		expect(document.steps).toHaveLength(2);
		expect(document.steps.every((step) => step.type === "note")).toBe(true);
	});
});
