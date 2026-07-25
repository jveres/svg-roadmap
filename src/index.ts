import { layoutRoadmap } from "./layout.ts";
import { initializeRoadmapMarkdown, parseRoadmapMarkdown, RoadmapParser } from "./markdown.ts";
import { renderRoadmapSvg } from "./render.ts";
import { applyDocumentTags } from "./theme.ts";
import { resolveTheme } from "./themes/catalog.ts";
import type {
	CreateRoadmapGeneratorOptions,
	GeneratedRoadmap,
	GenerateRoadmapOptions,
	RoadmapDocument,
	SynchronousGenerateRoadmapOptions,
} from "./types.ts";

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

function generateFromDocument(
	document: RoadmapDocument,
	options: SynchronousGenerateRoadmapOptions,
): GeneratedRoadmap {
	const documentTheme = document.settings.theme.mode
		? { preset: document.settings.theme.preset, mode: document.settings.theme.mode }
		: { preset: document.settings.theme.preset };
	const resolved = resolveTheme(options.theme ?? documentTheme, options.themes);
	// Document-defined tags extend the theme's taxonomy; identity is
	// preserved when the front matter declares none.
	const theme = applyDocumentTags(resolved, document.settings.tags);
	// The document can hide the legend; an explicit API option still wins.
	const layout = layoutRoadmap(document, theme, {
		showLegend: document.settings.legend,
		...options.layout,
	});
	const animatedBackground =
		options.render?.animatedBackground ?? document.settings.background.animated;
	const scale = options.render?.scale ?? document.settings.scale;
	const svg = renderRoadmapSvg(layout, theme, {
		...options.render,
		...(animatedBackground !== undefined ? { animatedBackground } : {}),
		scale,
	});
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
