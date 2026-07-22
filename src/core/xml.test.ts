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
