import { layoutRoadmap } from "./layout.ts";
import { initializeRoadmapMarkdown, parseRoadmapMarkdown, RoadmapParser } from "./markdown.ts";
import { renderRoadmapSvg } from "./render.ts";
import { resolveTheme } from "./themes/catalog.ts";
import type {
	CreateRoadmapGeneratorOptions,
	GeneratedRoadmap,
	GenerateRoadmapOptions,
	RoadmapDocument,
	SynchronousGenerateRoadmapOptions,
} from "./types.ts";

export type { ComrakOptions, InitInput, SyncInitInput } from "comrak-wasm";
export * from "./core/geometry.ts";
export { layoutRoadmap } from "./layout.ts";
export {
	createMarkdownOptions,
	initializeRoadmapMarkdown,
	initializeRoadmapMarkdownSync,
	parseRoadmapMarkdown,
	RoadmapMarkdownError,
	RoadmapParser,
} from "./markdown.ts";
export { renderRoadmapSvg } from "./render.ts";
export {
	createTheme,
	darkTheme,
	funTheme,
	lightTheme,
} from "./theme.ts";
export { builtInThemes, resolveTheme } from "./themes/catalog.ts";
export { sciFiDarkTheme, sciFiLightTheme, sciFiTheme } from "./themes/sci-fi/theme.ts";
export type * from "./types.ts";

function generateFromDocument(
	document: RoadmapDocument,
	options: SynchronousGenerateRoadmapOptions,
): GeneratedRoadmap {
	const documentTheme = document.settings.theme.mode
		? { preset: document.settings.theme.preset, mode: document.settings.theme.mode }
		: { preset: document.settings.theme.preset };
	const theme = resolveTheme(options.theme ?? documentTheme, options.themes);
	const layout = layoutRoadmap(document, theme, options.layout);
	const svg = renderRoadmapSvg(layout, theme, options.render);
	return { document, layout, svg, theme };
}

export function generateRoadmap(
	markdown: string,
	options: GenerateRoadmapOptions = {},
): GeneratedRoadmap {
	const document = parseRoadmapMarkdown(markdown, {
		...(options.markdown ? { markdown: options.markdown } : {}),
	});
	return generateFromDocument(document, options);
}

export class RoadmapGenerator implements Disposable {
	readonly #parser: RoadmapParser;

	constructor(options: Pick<CreateRoadmapGeneratorOptions, "markdown"> = {}) {
		this.#parser = new RoadmapParser(options.markdown);
	}

	generate(markdown: string, options: SynchronousGenerateRoadmapOptions = {}): GeneratedRoadmap {
		return generateFromDocument(this.#parser.parse(markdown), options);
	}

	generateSvg(markdown: string, options: SynchronousGenerateRoadmapOptions = {}): string {
		return this.generate(markdown, options).svg;
	}

	dispose(): void {
		this.#parser.dispose();
	}

	[Symbol.dispose](): void {
		this.dispose();
	}
}

export async function createRoadmapGenerator(
	options: CreateRoadmapGeneratorOptions = {},
): Promise<RoadmapGenerator> {
	await initializeRoadmapMarkdown(options.wasm);
	return new RoadmapGenerator(options);
}

export function generateRoadmapSvgSync(
	markdown: string,
	options: GenerateRoadmapOptions = {},
): string {
	return generateRoadmap(markdown, options).svg;
}

export async function generateRoadmapSvg(
	markdown: string,
	options: GenerateRoadmapOptions = {},
): Promise<string> {
	await initializeRoadmapMarkdown(options.wasm);
	return generateRoadmapSvgSync(markdown, options);
}
