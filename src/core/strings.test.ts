import fc from "fast-check";
import { expect, test } from "vitest";
import { escapeXml, hashNumber, hashString, safeId, safeLinkDestination } from "./strings.ts";
import { decodeXml, xmlText } from "./xml.ts";

test("property: XML escaping round-trips text through the decoder", () => {
	fc.assert(
		fc.property(fc.string({ maxLength: 100 }), (value) => {
			expect(xmlText(decodeXml(`<document><text>${escapeXml(value)}</text></document>`))).toBe(
				value,
			);
		}),
	);
});

test("property: identifier normalization is idempotent", () => {
	fc.assert(
		fc.property(fc.string(), (value) => {
			const id = safeId(value);
			expect(safeId(id)).toBe(id);
			expect(id).toMatch(/^[A-Za-z0-9_-]+$/u);
		}),
	);
});

test("property: incremental hashing equals hashing joined chunks", () => {
	fc.assert(
		fc.property(fc.string(), fc.string(), (left, right) => {
			expect(hashNumber(right, hashNumber(left))).toBe(hashNumber(left + right));
			expect(hashString(left)).toBe(hashNumber(left).toString(36));
		}),
	);
});

test.each([
	["  ", undefined],
	["#section", "#section"],
	["/relative", "/relative"],
	[" mailto:test@example.com ", "mailto:test@example.com"],
	["https://example.com/path", "https://example.com/path"],
	["relative/path", "relative/path"],
	["http://[", undefined],
	["javascript:alert(1)", undefined],
	["data:text/html,unsafe", undefined],
])("normalizes or rejects a link destination %j", (input, expected) => {
	expect(safeLinkDestination(input)).toBe(expected);
});
