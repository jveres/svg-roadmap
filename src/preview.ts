/**
 * `<roadmap-preview>` — a framework-free custom element wrapping the viewer:
 * it renders a parsed document artifact into a themed, zoomable, optionally
 * interactive chart, with a small toolbar for theme, mode, zoom, and
 * download. Importing this module defines the element.
 *
 * The element consumes the generator's output only — a versioned document
 * artifact (see `packRoadmapDocument`) supplied via the `src` URL attribute,
 * an inline `<script type="application/roadmap+json">` child, or the
 * `artifact` property. No Markdown parser and no WebAssembly are involved;
 * theme and mode switches re-render locally from the same artifact.
 *
 * Static fallback: a pre-rendered `<svg>` placed in the element's light DOM
 * shows before JavaScript runs and is hidden once the element upgrades.
 */

import {
	attachRoadmapInteractivity,
	attachRoadmapSpotlight,
	type RoadmapInteractivityHandle,
	type RoadmapTopicDetail,
} from "./interactive.ts";
import {
	builtInThemes,
	openRoadmapDocument,
	type RoadmapColorMode,
	type RoadmapDocument,
	renderRoadmapDocument,
} from "./viewer.ts";

const zoomLevels = { min: 0.25, max: 4, step: 1.25 };

const previewStyles = `
:host { display: block; position: relative; }
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
.toolbar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 6px;
	padding: 6px 8px;
	font: 12px/1.2 system-ui, sans-serif;
}
.toolbar[hidden] { display: none; }
button, select {
	height: 22px;
	padding: 0 7px;
	border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
	border-radius: 6px;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: pointer;
}
button:hover, select:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
.zoom-level { min-width: 46px; font-variant-numeric: tabular-nums; }
.canvas { overflow: auto; }
.canvas svg { display: block; }
`;

/** Tokens accepted by the `controls` attribute, in toolbar order. */
const controlTokens = ["theme", "mode", "zoom", "download"] as const;
type ControlToken = (typeof controlTokens)[number];

export class RoadmapPreviewElement extends HTMLElement {
	static observedAttributes = [
		"src",
		"theme",
		"mode",
		"controls",
		"storage-key",
		"interactive",
		"spotlight",
	];

	#artifact: RoadmapDocument | undefined;
	#interactivity: RoadmapInteractivityHandle | undefined;
	#detachSpotlight: (() => void) | undefined;
	#zoom = 1;
	#systemMode: MediaQueryList | undefined;
	#renderQueued = false;
	#loadToken = 0;
	#renderNote: ((markdown: string) => Node | string) | undefined;
	readonly #root: ShadowRoot;
	readonly #toolbar: HTMLElement;
	readonly #canvas: HTMLElement;
	readonly #themeSelect: HTMLSelectElement;
	readonly #modeSelect: HTMLSelectElement;
	readonly #zoomLevel: HTMLButtonElement;

	constructor() {
		super();
		this.#root = this.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = previewStyles;
		this.#toolbar = document.createElement("div");
		this.#toolbar.className = "toolbar";
		this.#toolbar.setAttribute("part", "toolbar");
		this.#themeSelect = document.createElement("select");
		this.#themeSelect.setAttribute("part", "theme-select");
		this.#themeSelect.setAttribute("aria-label", "Theme");
		for (const name of Object.keys(builtInThemes)) {
			const option = document.createElement("option");
			option.value = name;
			option.textContent = name;
			this.#themeSelect.append(option);
		}
		this.#themeSelect.addEventListener("change", () => {
			this.setAttribute("theme", this.#themeSelect.value);
		});
		this.#modeSelect = document.createElement("select");
		this.#modeSelect.setAttribute("part", "mode-select");
		this.#modeSelect.setAttribute("aria-label", "Color mode");
		for (const value of ["system", "light", "dark"]) {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = value;
			this.#modeSelect.append(option);
		}
		this.#modeSelect.addEventListener("change", () => {
			this.setAttribute("mode", this.#modeSelect.value);
		});
		const zoomOut = document.createElement("button");
		zoomOut.setAttribute("part", "zoom-out");
		zoomOut.setAttribute("aria-label", "Zoom out");
		zoomOut.textContent = "−";
		zoomOut.addEventListener("click", () => this.#setZoom(this.#zoom / zoomLevels.step));
		this.#zoomLevel = document.createElement("button");
		this.#zoomLevel.setAttribute("part", "zoom-reset");
		this.#zoomLevel.className = "zoom-level";
		this.#zoomLevel.title = "Reset zoom";
		this.#zoomLevel.textContent = "100%";
		this.#zoomLevel.addEventListener("click", () => this.#setZoom(1));
		const zoomIn = document.createElement("button");
		zoomIn.setAttribute("part", "zoom-in");
		zoomIn.setAttribute("aria-label", "Zoom in");
		zoomIn.textContent = "+";
		zoomIn.addEventListener("click", () => this.#setZoom(this.#zoom * zoomLevels.step));
		const download = document.createElement("button");
		download.setAttribute("part", "download");
		download.textContent = "SVG";
		download.title = "Download SVG";
		download.addEventListener("click", () => this.#download());
		this.#toolbar.append(
			this.#themeSelect,
			this.#modeSelect,
			zoomOut,
			this.#zoomLevel,
			zoomIn,
			download,
		);
		this.#canvas = document.createElement("div");
		this.#canvas.className = "canvas";
		this.#canvas.setAttribute("part", "canvas");
		this.#root.append(style, this.#toolbar, this.#canvas);
	}

	/** The parsed document (or a packed envelope) to display. */
	get artifact(): RoadmapDocument | undefined {
		return this.#artifact;
	}

	set artifact(value: unknown) {
		this.#artifact =
			value !== null && typeof value === "object" && "svgRoadmap" in (value as object)
				? openRoadmapDocument(value)
				: (value as RoadmapDocument | undefined);
		this.#queueRender();
	}

	/** Host hook rendering note Markdown for the interactive detail panel. */
	get renderNote(): ((markdown: string) => Node | string) | undefined {
		return this.#renderNote;
	}

	set renderNote(value: ((markdown: string) => Node | string) | undefined) {
		this.#renderNote = value;
		this.#queueRender();
	}

	/** The interactive handle, when the `interactive` attribute is set. */
	get interactivity(): RoadmapInteractivityHandle | undefined {
		return this.#interactivity;
	}

	connectedCallback(): void {
		const inline = this.querySelector('script[type="application/roadmap+json"]');
		if (inline?.textContent && this.#artifact === undefined) {
			this.artifact = JSON.parse(inline.textContent);
		}
		if (this.hasAttribute("src")) void this.#load(this.getAttribute("src") ?? "");
		this.#zoom = this.#storedZoom() ?? 1;
		this.#queueRender();
	}

	disconnectedCallback(): void {
		this.#teardown();
		this.#systemMode?.removeEventListener("change", this.#onSystemMode);
		this.#systemMode = undefined;
	}

	attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
		if (previous === next) return;
		if (name === "src" && next !== null && this.isConnected) {
			void this.#load(next);
			return;
		}
		this.#queueRender();
	}

	readonly #onSystemMode = (): void => {
		this.#queueRender();
	};

	async #load(src: string): Promise<void> {
		const token = ++this.#loadToken;
		try {
			const response = await fetch(src);
			if (!response.ok) throw new Error(`Fetching the roadmap artifact failed: ${response.status}`);
			const envelope: unknown = await response.json();
			if (token !== this.#loadToken) return;
			this.artifact = openRoadmapDocument(envelope);
		} catch (error) {
			if (token !== this.#loadToken) return;
			this.dispatchEvent(new CustomEvent("roadmap-error", { detail: { error } }));
		}
	}

	#controls(): ReadonlySet<ControlToken> {
		const attribute = this.getAttribute("controls");
		if (attribute === null) return new Set(["zoom"] as const);
		return new Set(
			attribute
				.split(/\s+/u)
				.filter((token): token is ControlToken =>
					(controlTokens as readonly string[]).includes(token),
				),
		);
	}

	#mode(): RoadmapColorMode {
		const attribute = this.getAttribute("mode");
		if (attribute === "light" || attribute === "dark") return attribute;
		if (typeof matchMedia === "function") {
			this.#systemMode ??= matchMedia("(prefers-color-scheme: dark)");
			this.#systemMode.addEventListener("change", this.#onSystemMode);
			return this.#systemMode.matches ? "dark" : "light";
		}
		return "light";
	}

	#storageKey(suffix: string): string | undefined {
		const key = this.getAttribute("storage-key");
		return key ? `${key}:${suffix}` : undefined;
	}

	#storedZoom(): number | undefined {
		const key = this.#storageKey("zoom");
		if (!key) return undefined;
		try {
			const value = Number(localStorage.getItem(key));
			return Number.isFinite(value) && value >= zoomLevels.min && value <= zoomLevels.max
				? value
				: undefined;
		} catch {
			return undefined;
		}
	}

	#setZoom(value: number): void {
		this.#zoom = Math.min(zoomLevels.max, Math.max(zoomLevels.min, Math.round(value * 100) / 100));
		const key = this.#storageKey("zoom");
		if (key) {
			try {
				localStorage.setItem(key, String(this.#zoom));
			} catch {
				// Zoom simply does not persist without storage.
			}
		}
		this.#applyZoom();
	}

	#applyZoom(): void {
		this.#zoomLevel.textContent = `${Math.round(this.#zoom * 100)}%`;
		const svg = this.#canvas.querySelector("svg");
		if (!svg) return;
		if (this.#zoom === 1) {
			svg.style.maxWidth = "100%";
			svg.style.width = "";
			svg.style.height = "auto";
			return;
		}
		// Zoom multiplies the fitted display size (natural width capped by the
		// pane), never the pane width itself.
		const natural = Number(svg.getAttribute("width")) || 800;
		const pane = this.#canvas.clientWidth || natural;
		const base = Math.min(natural, Math.max(100, pane));
		svg.style.maxWidth = "none";
		svg.style.width = `${Math.round(base * this.#zoom)}px`;
		svg.style.height = "auto";
	}

	#download(): void {
		const svg = this.#canvas.querySelector("svg");
		if (!svg) return;
		const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = "roadmap.svg";
		link.click();
		URL.revokeObjectURL(link.href);
	}

	#queueRender(): void {
		if (this.#renderQueued || !this.isConnected) return;
		this.#renderQueued = true;
		queueMicrotask(() => {
			this.#renderQueued = false;
			this.#render();
		});
	}

	#teardown(): void {
		this.#interactivity?.dispose();
		this.#interactivity = undefined;
		this.#detachSpotlight?.();
		this.#detachSpotlight = undefined;
	}

	#render(): void {
		const controls = this.#controls();
		this.#themeSelect.hidden = !controls.has("theme");
		this.#modeSelect.hidden = !controls.has("mode");
		for (const element of this.#toolbar.querySelectorAll("[part^='zoom']")) {
			(element as HTMLElement).hidden = !controls.has("zoom");
		}
		const downloadButton = this.#toolbar.querySelector("[part='download']") as HTMLElement | null;
		if (downloadButton) downloadButton.hidden = !controls.has("download");
		this.#toolbar.hidden = controls.size === 0;
		if (!this.#artifact) return;

		const preset = this.getAttribute("theme") ?? this.#artifact.settings.theme.preset;
		const mode = this.#mode();
		this.#themeSelect.value = preset;
		this.#modeSelect.value = this.getAttribute("mode") ?? "system";
		this.#teardown();
		const generated = renderRoadmapDocument(this.#artifact, {
			theme: { preset, mode },
			render: { idPrefix: this.getAttribute("storage-key") ?? "roadmap-preview" },
		});
		// Mount through the XML parser: it is strict about the SVG namespace
		// and immune to HTML-parser quirks (happy-dom drops SVG children on
		// innerHTML, and browsers apply HTML parsing rules there).
		const parsed = new DOMParser().parseFromString(generated.svg, "image/svg+xml");
		this.#canvas.replaceChildren(document.importNode(parsed.documentElement, true));
		this.#applyZoom();

		const svg = this.#canvas.querySelector("svg");
		if (svg && this.hasAttribute("interactive")) {
			const progressKey = this.#storageKey("progress");
			this.#interactivity = attachRoadmapInteractivity(svg, {
				...(progressKey !== undefined ? { storageKey: progressKey } : {}),
				...(this.#renderNote ? { renderNote: this.#renderNote } : {}),
				onSelect: (detail: RoadmapTopicDetail | undefined) => {
					this.dispatchEvent(new CustomEvent("roadmap-select", { detail }));
				},
				onChange: (detail: RoadmapTopicDetail) => {
					this.dispatchEvent(new CustomEvent("roadmap-change", { detail }));
				},
			});
		}
		if (svg && this.hasAttribute("spotlight")) {
			this.#detachSpotlight = attachRoadmapSpotlight(svg);
		}
		this.dispatchEvent(new CustomEvent("roadmap-render", { detail: { theme: preset, mode } }));
	}
}

if (typeof customElements !== "undefined" && !customElements.get("roadmap-preview")) {
	customElements.define("roadmap-preview", RoadmapPreviewElement);
}
