import { describe, expect, it } from "vitest";
import { createRoadmapGenerator, generateRoadmapSvg, generateRoadmapSvgNode } from "./node.ts";

describe("Node entry point", () => {
	it("should initialize WASM automatically through the primary SVG API", async () => {
		const svg = await generateRoadmapSvg("# Node-safe API");
		const legacyAliasSvg = await generateRoadmapSvgNode("# Node-safe API");

		expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/u);
		expect(legacyAliasSvg).toBe(svg);
	});

	it("should create an initialized reusable generator", async () => {
		const generator = await createRoadmapGenerator();
		try {
			expect(generator.generateSvg("# Reusable Node API")).toContain("Reusable Node API");
		} finally {
			generator.dispose();
		}
	});
});
