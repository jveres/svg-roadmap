import { describe, expect, test } from "vitest";
import type { InlineNode, TypographyTheme } from "../types.ts";
import { applyAbbreviations, inlineToPlainText, measureText, wrapInline } from "./inline.ts";

const typography: TypographyTheme = {
	color: "#000000",
	fontFamily: "Arial, Helvetica, sans-serif",
	fontSize: 16,
	fontWeight: 400,
	fontStyle: "normal",
	lineHeight: 1.2,
};

function abbreviationValues(nodes: readonly InlineNode[]): string[] {
	const values: string[] = [];
	const pending = [...nodes].reverse();
	while (pending.length > 0) {
		const node = pending.pop();
		if (!node) continue;
		if (node.type === "abbreviation") values.push(inlineToPlainText(node.children));
		if ("children" in node) pending.push(...[...node.children].reverse());
	}
	return values;
}

describe("inline abbreviations", () => {
	test("matches complete terms without annotating word substrings", () => {
		const source = "Rapid API, APIs, api-driven, and GRAPHQL.";
		const result = applyAbbreviations([{ type: "text", value: source }], {
			API: "Application programming interface",
			GraphQL: "Graph query language",
		});

		expect(inlineToPlainText(result)).toBe(source);
		expect(abbreviationValues(result)).toEqual(["API", "api", "GRAPHQL"]);
	});

	test("does not match a term beside Unicode letters or combining marks", () => {
		const result = applyAbbreviations([{ type: "text", value: "préAPI API API\u0301" }], {
			API: "Application programming interface",
		});

		expect(abbreviationValues(result)).toEqual(["API"]);
	});
});

describe("inline wrapping", () => {
	test("measures repeated text consistently across font categories", () => {
		const inputs = [
			["Arial, Helvetica, sans-serif", measureText("Repeated metric", 16)],
			["Georgia, serif", measureText("Repeated metric", 16, [], 400, "Georgia, serif")],
			["Courier, monospace", measureText("Repeated metric", 16, [], 400, "Courier, monospace")],
		] as const;

		for (const [fontFamily, expected] of inputs) {
			expect(measureText("Repeated metric", 16, [], 400, fontFamily)).toBe(expected);
		}
		expect(new Set(inputs.map(([, width]) => width)).size).toBe(3);
	});

	test("keeps terminal punctuation with a linked word", () => {
		const content: InlineNode[] = [
			{ type: "text", value: "Using " },
			{
				type: "link",
				destination: "https://12factor.net/",
				children: [{ type: "text", value: "12factors" }],
			},
			{ type: "text", value: "." },
		];
		const lines = wrapInline(content, measureText("Using 12factors", 16), typography);

		expect(lines.map((line) => line.segments.map((segment) => segment.text).join(""))).toEqual([
			"Using ",
			"12factors.",
		]);
		expect(lines[1]?.segments[0]?.destination).toBe("https://12factor.net/");
	});
});
