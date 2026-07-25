import { type MeasurementProvider, setMeasurementProvider } from "./inline.ts";

/**
 * Hidden-DOM measurement oracle: measures text with the browser's real font
 * resolution instead of the built-in metric tables. Layout then reflects the
 * generating browser's fonts exactly — including scripts the tables cannot
 * cover — while `textLength` still pins the geometry for every other viewer.
 */

export interface DomMeasurementHandle {
	readonly provider: MeasurementProvider;
	/** Removes the hidden measuring element. */
	dispose(): void;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * Creates a provider backed by a hidden SVG `<text>` element. Measuring in
 * SVG — not an HTML div — is load-bearing: Safari resolves generic font
 * families differently for SVG text than for HTML, so an HTML-measured width
 * can be several percent wide and `textLength` then visibly stretches the
 * glyphs. `getComputedTextLength()` reads the same advances the rendered
 * roadmap will use, and is independent of ancestor transforms, so no
 * calibration pass is needed. The host is `visibility: hidden` (never
 * `display: none`, which measures zero), attached to `document.body`, and
 * shielded from page CSS; `xml:space="preserve"` keeps segment whitespace.
 */
export function createDomMeasurementProvider(targetDocument?: Document): DomMeasurementHandle {
	const hostDocument = targetDocument ?? globalThis.document;
	if (!hostDocument?.body) {
		throw new Error("DOM measurement needs a document with a body; run in a browser or pass one.");
	}
	const host = hostDocument.createElementNS(SVG_NAMESPACE, "svg");
	host.setAttribute("width", "0");
	host.setAttribute("height", "0");
	host.setAttribute("aria-hidden", "true");
	host.style.position = "absolute";
	host.style.top = "0";
	host.style.left = "-99999px";
	host.style.visibility = "hidden";
	host.style.overflow = "hidden";
	host.style.pointerEvents = "none";
	hostDocument.body.appendChild(host);

	const text = hostDocument.createElementNS(SVG_NAMESPACE, "text") as SVGTextElement;
	text.setAttribute("x", "0");
	text.setAttribute("y", "0");
	text.setAttribute("xml:space", "preserve");
	// Tracking is added by the caller per character; page CSS must not leak in.
	text.style.letterSpacing = "0";
	text.style.whiteSpace = "pre";
	text.style.direction = "ltr";
	host.appendChild(text);
	let currentFont = "";

	const provider: MeasurementProvider = (value, style) => {
		const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
		if (font !== currentFont) {
			text.style.font = font;
			currentFont = font;
		}
		text.textContent = value;
		return text.getComputedTextLength();
	};

	return {
		provider,
		dispose: () => {
			host.remove();
		},
	};
}

export interface InstallDomMeasurementOptions {
	readonly document?: Document;
	/**
	 * CSS font descriptors to load before measuring, e.g. `'600 16px "Didot"'`.
	 * `document.fonts.ready` alone is a trap: a face is only requested when
	 * first used, so the measuring element itself can be the first user and
	 * silently measure the fallback font. Explicit loads close that gap.
	 */
	readonly fonts?: readonly string[];
	/**
	 * Called when fonts finish loading after installation. Late loads change
	 * advances, so regenerate and swap the SVG here; cached widths are already
	 * flushed when this fires.
	 */
	readonly onFontsChanged?: () => void;
}

/**
 * Creates the hidden-DOM provider, waits for fonts, and installs it as the
 * measurement oracle. Returns an uninstall function that restores the metric
 * tables and removes the measuring element.
 */
export async function installDomMeasurement(
	options: InstallDomMeasurementOptions = {},
): Promise<() => void> {
	const hostDocument = options.document ?? globalThis.document;
	if (!hostDocument) {
		throw new Error("DOM measurement needs a document; run in a browser or pass one.");
	}
	const fontFaceSet = hostDocument.fonts;
	if (fontFaceSet) {
		await Promise.allSettled(
			(options.fonts ?? []).map((descriptor) => fontFaceSet.load(descriptor)),
		);
		await fontFaceSet.ready;
	}
	const handle = createDomMeasurementProvider(hostDocument);
	setMeasurementProvider(handle.provider);
	const handleLoadingDone = (): void => {
		// Re-installing the same provider flushes the measurement cache.
		setMeasurementProvider(handle.provider);
		options.onFontsChanged?.();
	};
	fontFaceSet?.addEventListener("loadingdone", handleLoadingDone);
	return () => {
		fontFaceSet?.removeEventListener("loadingdone", handleLoadingDone);
		setMeasurementProvider(undefined);
		handle.dispose();
	};
}
