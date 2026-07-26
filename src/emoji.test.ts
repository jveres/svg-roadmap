import { describe, expect, test } from "vitest";
import { githubEmojiArtwork } from "./core/emoji/artwork-github.ts";
import { registerEmojiArtwork } from "./core/emoji-artwork.ts";
import { generateRoadmap } from "./index.ts";

const document = (line: string): string => `# Emoji\n\n* Chapter ${line}\n  * Topic\n`;

describe("emoji tiers", () => {
	test("artwork registered under an alias is reachable via its canonical name", () => {
		registerEmojiArtwork({
			poop: { viewBox: "0 0 16 16", content: '<circle cx="8" cy="8" r="8" fill="#654321"/>' },
		});
		// :hankey: is the canonical shortcode; :poop: is the alias the pack
		// registered under — both must resolve to the registered artwork.
		const viaAlias = generateRoadmap(document(":poop:"));
		const viaCanonical = generateRoadmap(document(":hankey:"));
		expect(viaAlias.svg).toContain("#654321");
		expect(viaCanonical.svg).toContain("#654321");
	});

	test("core-pack shortcodes render as vendored symbols", () => {
		const generated = generateRoadmap(document(":rocket:"));
		expect(generated.svg).toContain('<symbol id="');
		expect(generated.svg).toMatch(/<use href="#[^"]*-emoji-rocket"/u);
		expect(generated.svg).not.toContain(":rocket:");
	});

	test("defs only include symbols for shortcodes the document uses", () => {
		const generated = generateRoadmap(document(":rocket:"));
		expect(generated.svg).toContain("-emoji-rocket");
		// Other core-pack artwork stays out of the defs.
		expect(generated.svg).not.toContain("-emoji-unicorn");
		expect(generated.svg).not.toContain("-emoji-tada");
	});

	test("aliases resolve to one canonical symbol", () => {
		const generated = generateRoadmap(document(":thumbsup: and :+1:"));
		const symbols = generated.svg.match(/<symbol id="[^"]*-emoji-[^"]*"/gu) ?? [];
		expect(symbols).toHaveLength(1);
		const uses = generated.svg.match(/<use href="#[^"]*-emoji-[^"]*"/gu) ?? [];
		expect(uses).toHaveLength(2);
	});

	test("github-set shortcodes fall back to platform glyphs until the pack is registered", () => {
		const before = generateRoadmap(document(":mango:"));
		// Valid gemoji name: the unicode glyph appears, no literal shortcode,
		// and no vendored symbol.
		expect(before.svg).toContain("🥭");
		expect(before.svg).not.toContain(":mango:");
		expect(before.svg).not.toContain("-emoji-mango");

		registerEmojiArtwork(githubEmojiArtwork);
		const after = generateRoadmap(document(":mango:"));
		expect(after.svg).toMatch(/<use href="#[^"]*-emoji-mango"/u);
	});

	test("unknown shortcodes stay literal text", () => {
		const generated = generateRoadmap(document(":definitely_not_an_emoji:"));
		expect(generated.svg).toContain(":definitely_not_an_emoji:");
	});
});
