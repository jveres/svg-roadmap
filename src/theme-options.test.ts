import { describe, expect, test } from "vitest";
import { wrapInline } from "./core/inline.ts";
import { generateRoadmap } from "./index.ts";
import { lightTheme } from "./theme.ts";
import type { TypographyTheme } from "./types.ts";

const source = "# Title\n\n* Chapter\n  * Topic [recommended]\n    * Child\n";

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

	test("connector end shapes render as color-inheriting markers", () => {
		const generated = generateRoadmap(source, {
			theme: { connectors: { topicToChildren: { endShape: "arrow" } } },
			render: { idPrefix: "marker-end" },
		});
		expect(generated.svg).toContain(
			'<marker id="marker-end-marker-topic-to-children-arrow"',
		);
		expect(generated.svg).toContain('marker-end="url(#marker-end-marker-topic-to-children-arrow)"');
		expect(generated.svg).toContain(
			'fill="var(--roadmap-connector-topic-to-children-color)"',
		);
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

* Chapter
  * Topic
`;
		const animated = generateRoadmap(animatedSource);
		expect(animated.layout.backgroundArtifacts.length).toBeGreaterThan(0);
		expect(animated.svg).toContain("@keyframes roadmap-artifact-drift");
		expect(animated.svg).toContain('class="roadmap__background-artifact-motion"');
		expect(animated.svg).toContain("prefers-reduced-motion");
		expect(animated.svg).toMatch(/animation-duration:\d+\.\d+s;animation-delay:-\d+(?:\.\d+)?s/u);
		expect(animated.svg).toBe(generateRoadmap(animatedSource).svg);
		expect(animated.svg).not.toContain("<script");

		const still = generateRoadmap(animatedSource.replace("    animated: true\n", ""));
		expect(still.svg).not.toContain("@keyframes roadmap-artifact-drift");
		expect(still.svg).not.toContain("roadmap__background-artifact-motion");

		// Four shared wandering variants; intensity rescales their amplitudes.
		expect(animated.svg.match(/@keyframes roadmap-artifact-drift-\d/gu)).toHaveLength(4);
		expect(animated.svg).toMatch(/animation-name:roadmap-artifact-drift-\d/u);
		const intense = generateRoadmap(
			animatedSource.replace("    animated: true\n", "    animated: 2\n"),
		);
		const keyframesOf = (svg: string): string =>
			svg.match(/@keyframes roadmap-artifact-drift-0\{[^}]*\}/u)?.[0] ?? "";
		expect(keyframesOf(intense.svg)).not.toBe(keyframesOf(animated.svg));
		expect(generateRoadmap(animatedSource.replace("    animated: true\n", "    animated: 0\n")).svg)
			.not.toContain("@keyframes roadmap-artifact-drift");
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
