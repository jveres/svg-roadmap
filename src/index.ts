import { initializeRoadmapMarkdown, parseRoadmapMarkdown, RoadmapParser } from "./markdown.ts";
import type {
	CreateRoadmapGeneratorOptions,
	GeneratedRoadmap,
	GenerateRoadmapOptions,
	SynchronousGenerateRoadmapOptions,
} from "./types.ts";
import { renderRoadmapDocument } from "./viewer.ts";

export type { ComrakOptions, InitInput, SyncInitInput } from "comrak-wasm";
export {
	createDomMeasurementProvider,
	type DomMeasurementHandle,
	type InstallDomMeasurementOptions,
	installDomMeasurement,
} from "./core/dom-measurement.ts";
export type { EmojiArtwork } from "./core/emoji-artwork.ts";
export { registerEmojiArtwork } from "./core/emoji-artwork.ts";
export * from "./core/geometry.ts";
export {
	type MeasurementProvider,
	setMeasurementProvider,
	type TextMeasurementStyle,
} from "./core/inline.ts";
export { documentLayoutOptions, layoutRoadmap } from "./layout.ts";
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
	applyDocumentTags,
	createTheme,
	darkTheme,
	funTheme,
	lightTheme,
} from "./theme.ts";
export { arcadeDarkTheme, arcadeLightTheme, arcadeTheme } from "./themes/arcade/theme.ts";
export { asciiDarkTheme, asciiLightTheme, asciiTheme } from "./themes/ascii/theme.ts";
export { builtInThemes, resolveTheme } from "./themes/catalog.ts";
export { printDarkTheme, printLightTheme, printTheme } from "./themes/print/theme.ts";
export { proDarkTheme, proLightTheme, proTheme } from "./themes/pro/theme.ts";
export { retroDarkTheme, retroLightTheme, retroTheme } from "./themes/retro/theme.ts";
export { roseDarkTheme, roseLightTheme, roseTheme } from "./themes/rose/theme.ts";
export { sciFiDarkTheme, sciFiLightTheme, sciFiTheme } from "./themes/sci-fi/theme.ts";
export type * from "./types.ts";
export {
	openRoadmapDocument,
	packRoadmapDocument,
	type RoadmapDocumentEnvelope,
	RoadmapDocumentError,
	renderRoadmapDocument,
	roadmapDocumentFormat,
} from "./viewer.ts";

export function generateRoadmap(
	markdown: string,
	options: GenerateRoadmapOptions = {},
): GeneratedRoadmap {
	const document = parseRoadmapMarkdown(markdown, {
		...(options.markdown ? { markdown: options.markdown } : {}),
	});
	return renderRoadmapDocument(document, options);
}

export class RoadmapGenerator implements Disposable {
	readonly #parser: RoadmapParser;

	constructor(options: Pick<CreateRoadmapGeneratorOptions, "markdown"> = {}) {
		this.#parser = new RoadmapParser(options.markdown);
	}

	generate(markdown: string, options: SynchronousGenerateRoadmapOptions = {}): GeneratedRoadmap {
		return renderRoadmapDocument(this.#parser.parse(markdown), options);
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
