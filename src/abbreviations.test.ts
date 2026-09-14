import { expect, test } from "vitest";
import { measureText } from "./core/inline.ts";
import { createTheme, generateRoadmap, renderRoadmapSvg } from "./index.ts";
import type { LayoutNode } from "./types.ts";

const source = `# AAD

AAD overview.[^details]

* AAD chapter
*AAD description.*
  * AAD topic
    * AAD nested

* Grid
  + AAD header
    * AAD cell

---
*AAD milestone*

## AAD section

### AAD minor heading

[^details]: AAD footnote.
*[AAD]: Agent-Assisted Development
`;

const presets = ["fun", "sci-fi", "rose", "print", "pro", "retro", "arcade", "ascii"] as const;

test.each(presets)("%s abbreviation markers scale with every text tier", (preset) => {
	for (const mode of ["light", "dark"] as const) {
		const result = generateRoadmap(source, { theme: { preset, mode } });
		const nodes = result.layout.elements.filter(
			(element): element is LayoutNode =>
				"text" in element &&
				element.text.lines.some((line) =>
					line.segments.some((segment) => segment.abbreviationIndicator),
				),
		);
		expect(nodes).toHaveLength(12);
		expect(nodes.map((node) => node.placement)).toContain("footnotes");
		expect(nodes.map((node) => node.placement)).toContain("milestone-label");
		for (const node of nodes) {
			const size = node.text.fontSize * 0.75;
			expect(node.text.abbreviationIndicatorSize).toBe(size);
			const markers = node.text.lines.flatMap((line) =>
				line.segments.filter((segment) => segment.abbreviationIndicator),
			);
			for (const marker of markers) {
				expect(marker.width).toBeCloseTo(
					measureText(
						"?",
						size,
						marker.marks,
						node.text.fontWeight,
						node.text.fontFamily,
						node.text.fontStyle,
					) + (node.text.letterSpacing ?? 0),
					8,
				);
			}
			const svg = renderRoadmapSvg(
				{ ...result.layout, elements: [node], connectors: [] },
				result.theme,
			);
			const markerTag = svg.match(
				/<(?:text|tspan)\b[^>]*class="roadmap__inline roadmap__inline--abbreviation-indicator"[^>]*>/u,
			)?.[0];
			expect(markerTag).toContain(`font-size="${size * node.text.renderScale}"`);
		}
	}
});

test("explicit marker sizes survive theme inheritance and overrides", () => {
	const base = createTheme({ inline: { abbreviationIndicatorSize: 8 } });
	const inherited = createTheme({ heading: { title: { fontSize: 32 } } }, base);
	const overridden = createTheme({ inline: { abbreviationIndicatorSize: 10 } }, inherited);
	for (const [theme, size] of [
		[inherited, 8],
		[overridden, 10],
	] as const) {
		const result = generateRoadmap(source, { theme });
		const nodes = result.layout.elements.filter((element) => "text" in element);
		expect(nodes.length).toBeGreaterThan(0);
		for (const node of nodes) expect(node.text.abbreviationIndicatorSize).toBe(size);
	}
});
