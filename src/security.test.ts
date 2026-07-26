import { describe, expect, test } from "vitest";
import { generateRoadmap } from "./index.ts";

const source = "# Title\n\n* Chapter\n  * Topic [recommended]\n";

describe("output encoding and input hardening", () => {
	test("theme board stroke cannot break out of its attribute", () => {
		const generated = generateRoadmap(source, {
			theme: {
				boards: { topic: { stroke: '"><script>alert(1)</script><g x="' } },
			},
		});
		expect(generated.svg).not.toContain("<script");
		expect(generated.svg).toContain("&quot;&gt;&lt;script&gt;");
	});

	test("theme CSS variable values cannot escape the style rule", () => {
		const generated = generateRoadmap(source, {
			theme: {
				cssVariables: {
					"evil-value": "red}</style><script>alert(1)</script>",
				},
			},
		});
		expect(generated.svg).not.toContain("<script");
		expect(generated.svg).not.toContain("red}");
		// Braces and angle brackets arrive CSS-escaped inside the declaration.
		expect(generated.svg).toContain("red\\7d \\3c ");
	});

	test("CSS variable names that are not identifiers are dropped", () => {
		const generated = generateRoadmap(source, {
			theme: {
				cssVariables: { "bad name:red;--x": "blue" },
			},
		});
		expect(generated.svg).not.toContain("bad name");
	});

	test("document tag colors reject markup-capable strings", () => {
		expect(() =>
			generateRoadmap(
				`---\nroadmap:\n  tags:\n    evil:\n      background: "</style><script>x"\n---\n${source} [evil]\n`,
			),
		).toThrowError(/plain CSS color/u);
	});

	test("non-finite layout options fall back to defaults instead of hanging", () => {
		const generated = generateRoadmap(source, {
			layout: {
				canvasScale: Number.POSITIVE_INFINITY,
				stepGap: Number.NaN,
				width: Number.NEGATIVE_INFINITY,
				groupGap: Number.POSITIVE_INFINITY,
			},
		});
		expect(Number.isFinite(generated.layout.width)).toBe(true);
		expect(Number.isFinite(generated.layout.height)).toBe(true);
		expect(generated.layout.width).toBeGreaterThan(0);
		expect(generated.layout.height).toBeGreaterThan(0);
	});

	test("an absurd canvasScale is capped instead of exploding the canvas", () => {
		const generated = generateRoadmap(source, { layout: { canvasScale: 1e6 } });
		expect(generated.layout.width).toBeLessThan(100_000);
	});
});
