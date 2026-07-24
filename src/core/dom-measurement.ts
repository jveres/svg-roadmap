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

/**
 * Creates a provider backed by a hidden measuring element. The element is
 * `visibility: hidden` (never `display: none`, which measures zero), attached
 * to `document.body` so no transformed or hidden ancestor distorts its rects,
 * shielded from page CSS with `all: initial`, and set to `white-space: pre`
 * so segment whitespace keeps its width. Widths come from
 * `getBoundingClientRect` for sub-pixel precision, corrected by a one-time
 * calibration probe in case an ancestor still scales the page.
 */
export function createDomMeasurementProvider(targetDocument?: Document): DomMeasurementHandle {
	const hostDocument = targetDocument ?? globalThis.document;
	if (!hostDocument?.body) {
		throw new Error("DOM measurement needs a document with a body; run in a browser or pass one.");
	}
	const host = hostDocument.createElement("div");
	host.style.all = "initial";
	host.style.position = "absolute";
	host.style.top = "0";
	host.style.left = "-99999px";
	host.style.visibility = "hidden";
	host.style.whiteSpace = "pre";
	host.style.pointerEvents = "none";
	host.style.direction = "ltr";
	host.style.letterSpacing = "0";
	host.style.setProperty("-webkit-text-size-adjust", "none");
	host.setAttribute("aria-hidden", "true");
	hostDocument.body.appendChild(host);

	const probe = hostDocument.createElement("div");
	probe.style.width = "100px";
	host.appendChild(probe);
	const probeWidth = probe.getBoundingClientRect().width;
	const calibration = probeWidth > 0 ? 100 / probeWidth : 1;
	host.removeChild(probe);

	const span = hostDocument.createElement("span");
	host.appendChild(span);
	let currentFont = "";

	const provider: MeasurementProvider = (text, style) => {
		const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
		if (font !== currentFont) {
			span.style.font = font;
			currentFont = font;
		}
		span.textContent = text;
		return span.getBoundingClientRect().width * calibration;
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
