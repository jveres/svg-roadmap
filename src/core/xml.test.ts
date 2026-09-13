import { describe, expect, test } from "vitest";
import { decodeXml, XmlDecodeError, xmlText } from "./xml.ts";

describe("XML decoder", () => {
	test("decodes the Comrak envelope without a DOM implementation", () => {
		const source = `<?xml version="1.0"?><!DOCTYPE document SYSTEM "CommonMark.dtd"><document xmlns="urn:test"><paragraph><text xml:space="preserve">A &amp; &#x1F680;</text><softbreak /></paragraph></document>`;

		const document = decodeXml(source);
		const paragraph = document.children.find(
			(child) => child.type === "element" && child.name === "paragraph",
		);

		expect(document.name).toBe("document");
		expect(paragraph?.type).toBe("element");
		if (paragraph?.type !== "element") throw new Error("paragraph was not decoded");
		expect(xmlText(paragraph)).toBe("A & 🚀");
	});

	test("rejects unbalanced input", () => {
		expect(() => decodeXml("<document><text>broken</document>")).toThrow(XmlDecodeError);
	});
});

test.each([
	['<?xml version="1.0"', "Unterminated XML declaration"],
	['<!DOCTYPE document [<!ENTITY example "value">', "Unterminated doctype"],
	["<document><!-- missing", "Unterminated XML comment"],
	["<document><![CDATA[missing", "Unterminated CDATA section"],
	["<![CDATA[outside]]><document/>", "CDATA outside the root"],
	["<document></document", "Unterminated closing tag"],
	["<document><></document>", "Element name is missing"],
	['<document @="invalid"/>', "Invalid attribute name"],
	["<document key/>", "has no value"],
	["<document key=unquoted/>", "is not quoted"],
	['<document key="unfinished/>', "Unterminated attribute"],
	["<document>text", "Unclosed element"],
	["<document/><document/>", "Expected one"],
	["<other/>", "Expected one"],
	["", "Expected one"],
])("rejects malformed XML %j", (source, message) => {
	expect(() => decodeXml(source)).toThrow(message);
});

test("handles comments, internal declarations, CDATA, and nested text", () => {
	const parsed = decodeXml(
		`<!DOCTYPE document [<!ENTITY note "a > b"><!ENTITY other 'x'>]><!-- comment --><document><paragraph><![CDATA[<literal>&raw;]]><strong><text>deep</text></strong><text> </text><code> </code></paragraph></document>`,
	);
	expect(xmlText(parsed)).toBe("<literal>&raw;deep  ");
});

test("preserves unknown and out-of-range entities and decodes valid numeric entities", () => {
	const parsed = decodeXml(
		"<document><text>&#65; &#x1F680; &unknown; &#1114112; &#x110000; &apos;&quot;&lt;&gt;</text></document>",
	);
	expect(xmlText(parsed)).toBe("A 🚀 &unknown; &#1114112; &#x110000; '\"<>");
});

test("does not treat inherited object names as XML entities or lose attribute names", () => {
	const parsed = decodeXml('<document __proto__="literal"><text>&constructor;</text></document>');
	expect(xmlText(parsed)).toBe("&constructor;");
	expect(Object.getOwnPropertyDescriptor(parsed.attributes, "__proto__")?.value).toBe("literal");
});
