/**
 * The light half of the split pipeline: everything needed to turn a parsed
 * {@link RoadmapDocument} into a themed, interactive chart — layout, render,
 * themes, measurement — with **no Markdown parser and no WebAssembly**.
 *
 * The heavy half (`svg-roadmap`) parses Markdown with comrak-wasm, on a
 * server, in a build step, or in an editor, and hands its output over as a
 * plain-JSON document artifact. This module consumes that artifact: it can
 * re-render it in any theme, mode, or option set locally, in milliseconds.
 * A bundler pulling only `svg-roadmap/viewer` ships no wasm at all — a
 * guard test pins that boundary.
 */

import { documentLayoutOptions, layoutRoadmap } from "./layout.ts";
import { renderRoadmapSvg } from "./render.ts";
import { applyDocumentTags } from "./theme.ts";
import { resolveTheme } from "./themes/catalog.ts";
import type {
	GeneratedRoadmap,
	RoadmapDocument,
	SynchronousGenerateRoadmapOptions,
} from "./types.ts";

export {
	createDomMeasurementProvider,
	type DomMeasurementHandle,
	type InstallDomMeasurementOptions,
	installDomMeasurement,
} from "./core/dom-measurement.ts";
export type { EmojiArtwork } from "./core/emoji-artwork.ts";
export { registerEmojiArtwork } from "./core/emoji-artwork.ts";
export {
	type MeasurementProvider,
	setMeasurementProvider,
	type TextMeasurementStyle,
} from "./core/inline.ts";
export { documentLayoutOptions, layoutRoadmap } from "./layout.ts";
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

/**
 * Renders a parsed document into a themed chart — the document-in half of
 * `generateRoadmap`, without the parsing. Document-authored settings (theme,
 * layout intent, legend, note markers, footnotes) resolve first; explicit
 * options always win.
 */
export function renderRoadmapDocument(
	document: RoadmapDocument,
	options: SynchronousGenerateRoadmapOptions = {},
): GeneratedRoadmap {
	const documentTheme = document.settings.theme.mode
		? { preset: document.settings.theme.preset, mode: document.settings.theme.mode }
		: { preset: document.settings.theme.preset };
	const resolved = resolveTheme(options.theme ?? documentTheme, options.themes);
	// Document-defined tags extend the theme's taxonomy; identity is
	// preserved when the front matter declares none.
	const theme = applyDocumentTags(resolved, document.settings.tags);
	// Document-authored layout intent (width, columns, spacing) resolves
	// first; explicit API options still win, legend included.
	const layout = layoutRoadmap(document, theme, {
		showLegend: document.settings.legend,
		showFootnotes: document.settings.footnotes,
		...documentLayoutOptions(document.settings.layout),
		...options.layout,
	});
	const animatedBackground =
		options.render?.animatedBackground ?? document.settings.background.animated;
	const gradients = options.render?.gradients ?? document.settings.theme.gradients;
	const noteMarkers = options.render?.noteMarkers ?? document.settings.noteMarkers;
	const title = options.render?.title ?? document.settings.title;
	const description = options.render?.description ?? document.settings.description;
	const svg = renderRoadmapSvg(layout, theme, {
		...options.render,
		...(animatedBackground !== undefined ? { animatedBackground } : {}),
		...(gradients !== undefined ? { gradients } : {}),
		...(noteMarkers ? { noteMarkers } : {}),
		...(title !== undefined ? { title } : {}),
		...(description !== undefined ? { description } : {}),
	});
	return { document, layout, svg, theme };
}

/**
 * The document artifact's wire format version. Bumped when the document
 * model changes shape incompatibly; {@link openRoadmapDocument} refuses
 * artifacts from a different major format instead of mis-rendering them.
 */
export const roadmapDocumentFormat = 1;

/** A versioned, JSON-serializable envelope around a parsed document. */
export interface RoadmapDocumentEnvelope {
	readonly svgRoadmap: number;
	readonly document: RoadmapDocument;
}

/** Wraps a parsed document for transport (`JSON.stringify` the result). */
export function packRoadmapDocument(document: RoadmapDocument): RoadmapDocumentEnvelope {
	return { svgRoadmap: roadmapDocumentFormat, document };
}

export class RoadmapDocumentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RoadmapDocumentError";
	}
}

/**
 * Validates and unwraps a document envelope produced by
 * {@link packRoadmapDocument} — typically after `JSON.parse` on the viewer
 * side. Shape checks are structural, not exhaustive: the goal is a clear
 * error for wrong or incompatible artifacts, not schema validation.
 */
export function openRoadmapDocument(envelope: unknown): RoadmapDocument {
	if (typeof envelope !== "object" || envelope === null) {
		throw new RoadmapDocumentError("The roadmap artifact must be an object.");
	}
	const candidate = envelope as Partial<RoadmapDocumentEnvelope>;
	if (candidate.svgRoadmap !== roadmapDocumentFormat) {
		throw new RoadmapDocumentError(
			`Unsupported roadmap artifact format ${String(candidate.svgRoadmap)}; this viewer reads format ${roadmapDocumentFormat}.`,
		);
	}
	const document = candidate.document;
	if (
		typeof document !== "object" ||
		document === null ||
		document.type !== "roadmap" ||
		!Array.isArray(document.steps) ||
		typeof document.settings !== "object"
	) {
		throw new RoadmapDocumentError("The roadmap artifact does not carry a parsed document.");
	}
	return document;
}
