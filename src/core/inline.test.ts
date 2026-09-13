import { describe, expect, test } from "vitest";
import type { InlineNode, TypographyTheme } from "../types.ts";
import {
	applyAbbreviations,
	flattenInline,
	inlineToPlainText,
	measureText,
	shortcodeToEmoji,
	wrapInline,
} from "./inline.ts";

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

describe("raw emoji shortcode tagging", () => {
	test("tags raw Unicode emoji with their canonical shortcodes", () => {
		const runs = flattenInline([{ type: "text", value: "Play 1\ufe0f\u20e3 now \u{1f680}" }]);
		expect(runs).toEqual([
			{ text: "Play ", marks: [] },
			{ text: "1\ufe0f\u20e3", marks: [], shortcode: "one" },
			{ text: " now ", marks: [] },
			{ text: "\u{1f680}", marks: [], shortcode: "rocket" },
		]);
	});

	test("resolves aliases to canonical shortcodes and keeps FE0F-less keycaps", () => {
		// U+0031 U+20E3 — a keycap missing its variation selector still maps.
		const runs = flattenInline([{ type: "text", value: "1\u20e3" }]);
		expect(runs).toEqual([{ text: "1\u20e3", marks: [], shortcode: "one" }]);
	});

	test("keeps code spans and unmapped pictographs literal", () => {
		expect(flattenInline([{ type: "code", value: "1\ufe0f\u20e3" }])).toEqual([
			{ text: "1\ufe0f\u20e3", marks: ["code"] },
		]);
		// A lone combining keycap has no base character and maps to nothing.
		expect(flattenInline([{ type: "text", value: "\u20e3" }])).toEqual([
			{ text: "\u20e3", marks: [] },
		]);
	});

	test("emoji inside links keep their destination", () => {
		const runs = flattenInline([
			{
				type: "link",
				destination: "https://example.com",
				children: [{ type: "text", value: "\u{1f3c1} finish" }],
			},
		]);
		expect(runs[0]).toEqual({
			text: "\u{1f3c1}",
			marks: [],
			shortcode: "checkered_flag",
			destination: "https://example.com",
		});
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

test.each(["a", "e\u0301", "👩🏽‍💻"])(
	"wraps long tokens without dropping or splitting graphemes: %s",
	(grapheme) => {
		const value = grapheme.repeat(512);
		const lines = wrapInline([{ type: "code", value }], 180, typography);
		const segments = lines.flatMap((line) => line.segments);

		expect(segments.map((segment) => segment.text).join("")).toBe(value);
		for (const line of lines) {
			expect(line.width).toBeLessThanOrEqual(180);
			for (const segment of line.segments) {
				expect(segment.text.length % grapheme.length).toBe(0);
				expect(segment.marks).toEqual(["code"]);
			}
		}
	},
);

test("wraps long linked tokens against each shaped line budget", () => {
	const value = "abcdefghij".repeat(30);
	const widths = [25, 60, 100];
	const lines = wrapInline(
		[{ type: "link", destination: "https://example.com", children: [{ type: "text", value }] }],
		180,
		typography,
		undefined,
		widths,
	);

	expect(
		lines
			.flatMap((line) => line.segments)
			.map((segment) => segment.text)
			.join(""),
	).toBe(value);
	for (const [index, line] of lines.entries()) {
		expect(line.width).toBeLessThanOrEqual(widths[index] ?? 180);
		for (const segment of line.segments) expect(segment.destination).toBe("https://example.com");
	}
});

test.each(["©", "®", "™", "♥", "☀", "©\ufe0e", "🚀\ufe0e"])(
	"text presentation %s stays in the text font",
	(text) => {
		expect(
			flattenInline([{ type: "emphasis", children: [{ type: "text", value: text }] }]),
		).toEqual([{ text, marks: ["emphasis"] }]);
		expect(measureText(text, 16)).not.toBe(16 * 1.05);
	},
);

test.each([
	["©\ufe0f", "copyright"],
	["®\ufe0f", "registered"],
	["™\ufe0f", "tm"],
	["♥\ufe0f", "hearts"],
])("explicit emoji presentation %s retains artwork", (text, shortcode) => {
	if (!text) throw new Error("Missing fixture");
	expect(flattenInline([{ type: "text", value: text }])).toEqual([{ text, marks: [], shortcode }]);
	expect(measureText(text, 16)).toBe(16.8);
});

test("long linked abbreviations retain tooltips, destinations and indicators across wraps", () => {
	const nodes: InlineNode[] = [
		{
			type: "link",
			destination: "https://example.com",
			title: "Resource",
			children: [
				{
					type: "abbreviation",
					title: "Definition",
					children: [{ type: "text", value: "LongToken" }],
				},
			],
		},
	];
	const lines = wrapInline(nodes, 10, typography, 30);
	expect(lines.length).toBeGreaterThan(1);
	const segments = lines.flatMap((line) => line.segments);
	expect(segments.map((segment) => segment.text).join("")).toBe("LongToken?");
	for (const segment of segments)
		expect(segment).toMatchObject({
			destination: "https://example.com",
			linkTitle: "Resource",
			abbreviation: "Definition",
		});
	expect(segments.at(-1)?.abbreviationIndicator).toBe(true);
});

test("atomic tag chips wrap as a whole even when wider than the available line", () => {
	const tag: InlineNode = {
		type: "tagChip",
		tag: "recommended",
		children: [{ type: "text", value: "recommended" }],
	};
	const lines = wrapInline([{ type: "text", value: "Hello " }, tag], 30, typography);
	expect(lines).toHaveLength(3);
	expect(lines.at(-1)?.segments).toHaveLength(1);
	expect(lines.at(-1)?.segments[0]).toMatchObject({ tag: "recommended", text: "recommended" });
	expect(wrapInline([tag], 0, typography)).toHaveLength(1);
});

test("breaks, script marks and uppercase preserve content at zero width", () => {
	const nodes: InlineNode[] = [
		{ type: "lineBreak" },
		{ type: "text", value: "a" },
		{ type: "lineBreak" },
		{ type: "lineBreak" },
		{ type: "subscript", children: [{ type: "text", value: "b" }] },
	];
	const lines = wrapInline(nodes, 0, { ...typography, textTransform: "uppercase" });
	expect(lines.map((line) => line.segments.map((segment) => segment.text).join(""))).toEqual([
		"A",
		"B",
	]);
	expect(lines[1]?.segments[0]?.marks).toEqual(["subscript"]);
	expect(
		inlineToPlainText([
			{ type: "softBreak" },
			{ type: "lineBreak" },
			{ type: "footnoteReference", label: "note" },
		]),
	).toContain("note");
	expect(
		flattenInline([
			{ type: "footnoteReference", label: "__inline_7" },
			{ type: "footnoteReference", label: "custom" },
		]).map((run) => run.text),
	).toEqual(["7", "[custom]"]);
});

test("unknown shortcodes and empty abbreviation definitions preserve authored text", () => {
	expect(shortcodeToEmoji("unknown-shortcode")).toBe(":unknown-shortcode:");
	expect(applyAbbreviations([{ type: "text", value: "API" }], { API: "" })).toEqual([
		{ type: "text", value: "API" },
	]);
	expect(applyAbbreviations([{ type: "text", value: "" }], { API: "definition" })).toEqual([
		{ type: "text", value: "" },
	]);
	expect(measureText("\u2003", 10)).toBe(2.78);
});

test("flag emoji and adjacent text-presentation symbols retain separate rendering modes", () => {
	const runs = flattenInline([{ type: "text", value: "🇺🇸 ©\ufe0e 🚀" }]);
	expect(runs).toEqual([
		{ text: "🇺🇸", marks: [], shortcode: "us" },
		{ text: " ©\ufe0e ", marks: [] },
		{ text: "🚀", marks: [], shortcode: "rocket" },
	]);
});
