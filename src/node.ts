import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { InitInput } from "comrak-wasm";
import { generateRoadmapSvgSync, initializeRoadmapMarkdown, RoadmapGenerator } from "./index.ts";
import type { CreateRoadmapGeneratorOptions, GenerateRoadmapOptions } from "./types.ts";

export * from "./index.ts";
export { generateRoadmapSvg as generateRoadmapSvgBrowser } from "./index.ts";

let nodeInitialization: Promise<void> | undefined;

export function initializeRoadmapNode(input?: InitInput | Promise<InitInput>): Promise<void> {
	if (input !== undefined) return initializeRoadmapMarkdown(input);
	if (!nodeInitialization) {
		const require = createRequire(import.meta.url);
		const wasmPath = require.resolve("comrak-wasm/comrak.wasm");
		nodeInitialization = readFile(wasmPath)
			.then((bytes) => initializeRoadmapMarkdown(bytes))
			.catch((error: unknown) => {
				nodeInitialization = undefined;
				throw error;
			});
	}
	return nodeInitialization;
}

export async function generateRoadmapSvg(
	markdown: string,
	options: GenerateRoadmapOptions = {},
): Promise<string> {
	await initializeRoadmapNode(options.wasm);
	return generateRoadmapSvgSync(markdown, options);
}

export async function createRoadmapGenerator(
	options: CreateRoadmapGeneratorOptions = {},
): Promise<RoadmapGenerator> {
	await initializeRoadmapNode(options.wasm);
	return new RoadmapGenerator(options);
}

export const generateRoadmapSvgNode = generateRoadmapSvg;
