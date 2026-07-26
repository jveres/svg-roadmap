import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { measureText, wrapInline } from "./core/inline.ts";
import { escapeXml } from "./core/strings.ts";
import { nextProgressState, type RoadmapProgressState } from "./interactive.ts";
import type { InlineNode, TypographyTheme } from "./types.ts";

const typography = {
	color: "#000",
	fontFamily: "Arial",
	fontSize: 16,
	fontWeight: 400,
	fontStyle: "normal",
	lineHeight: 1.2,
} as unknown as TypographyTheme;

const segmenter =
	typeof Intl !== "undefined" && "Segmenter" in Intl
		? new Intl.Segmenter(undefined, { granularity: "grapheme" })
		: undefined;

function graphemes(text: string): string[] {
	if (!segmenter) return Array.from(text);
	return [...segmenter.segment(text)].map((entry) => entry.segment);
}

describe("property: XML escaping", () => {
	test("escaped text never contains active markup characters", () => {
		fc.assert(
			fc.property(fc.string({ unit: "binary" }), (value) => {
				const escaped = escapeXml(value);
				expect(escaped).not.toMatch(/[<>"]/u);
				expect(escaped).not.toMatch(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/u);
			}),
		);
	});

	test("escaping is injective on markup-relevant content", () => {
		fc.assert(
			fc.property(fc.string(), fc.string(), (left, right) => {
				if (escapeXml(left) === escapeXml(right)) expect(left).toBe(right);
			}),
		);
	});
});

describe("property: wrapping", () => {
	const emoji = ["👩‍👩‍👧‍👦", "👍🏽", "🇭🇺", "é", "🎉", "x", "wide-word"];
	const emojiText = fc
		.array(fc.constantFrom(...emoji), { minLength: 1, maxLength: 30 })
		.map((parts) => parts.join(""));

	test("no wrap ever splits a grapheme cluster", () => {
		fc.assert(
			fc.property(emojiText, fc.integer({ min: 24, max: 200 }), (text, width) => {
				const content: InlineNode[] = [{ type: "text", value: text }];
				const lines = wrapInline(content, width, typography, 12);
				const rejoined = lines
					.flatMap((line) => line.segments.map((segment) => segment.text))
					.join("");
				// Rejoining the wrapped output grapheme-by-grapheme must yield
				// the original grapheme sequence (whitespace-insensitive).
				expect(graphemes(rejoined.replaceAll(/\s+/gu, ""))).toEqual(
					graphemes(text.replaceAll(/\s+/gu, "")),
				);
			}),
		);
	});

	test("measured width is monotonic under concatenation", () => {
		fc.assert(
			fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (left, right) => {
				const whole = measureText(left + right, 16, [], 400, "Arial");
				const first = measureText(left, 16, [], 400, "Arial");
				expect(whole).toBeGreaterThanOrEqual(first - 0.001);
			}),
		);
	});
});

describe("property: progress cycle", () => {
	test("the cycle is closed and returns to unset in four steps", () => {
		fc.assert(
			fc.property(
				fc.constantFrom<RoadmapProgressState | undefined>(
					undefined,
					"in-progress",
					"done",
					"skipped",
				),
				(start) => {
					let state = start;
					const seen = new Set<string>();
					for (let step = 0; step < 4; step += 1) {
						seen.add(state ?? "unset");
						state = nextProgressState(state);
					}
					expect(state).toBe(start);
					expect(seen.size).toBe(4);
				},
			),
		);
	});
});
