/**
 * `<roadmap-preview>` — a framework-free custom element wrapping the viewer:
 * it renders a parsed document artifact into a themed, zoomable, optionally
 * interactive chart with its own viewer chrome, like a PDF reader — a header
 * bar carrying the chart's title plus every control: theme,
 * color mode, interactivity, spotlight, zoom, and download. Importing this
 * module defines the element; a bare embed gets all features instantly, and
 * hosts trim the chrome with the `controls` attribute or hide it entirely
 * with `chromeless`.
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
	type GeneratedRoadmap,
	openRoadmapDocument,
	type RoadmapColorMode,
	type RoadmapDocument,
	renderRoadmapDocument,
} from "./viewer.ts";

const zoomLevels = { min: 0.25, max: 4, step: 1.25 };

const previewStyles = `
:host { display: flex; flex-direction: column; position: relative; }
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
.header {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 12px;
	border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent);
	background: color-mix(in srgb, currentColor 4%, transparent);
	font: 12px/1.2 system-ui, sans-serif;
}
.header[hidden] { display: none; }
.title {
	overflow: hidden;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	text-overflow: ellipsis;
}
.controls {
	display: flex;
	align-items: center;
	/* Controls keep one line; the title truncates instead of pushing them
	   into a second row on narrow screens. */
	flex: none;
	gap: 6px;
	margin-left: auto;
}
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
.menu-wrap { position: relative; }
.menu-toggle, .zoom-step { width: 22px; padding: 0; text-align: center; line-height: 1; }
.menu {
	position: absolute;
	top: calc(100% + 4px);
	right: 0;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 190px;
	padding: 6px;
	border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
	border-radius: 8px;
	background: canvas;
	box-shadow: 0 8px 24px color-mix(in srgb, currentColor 22%, transparent);
}
.menu[hidden] { display: none; }
.menu-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	min-height: 26px;
	padding: 2px 0 2px 8px;
	border: 0;
	border-radius: 5px;
	background: none;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
	white-space: nowrap;
}
.menu-item[hidden] { display: none; }
div.menu-item { cursor: default; }
button.menu-item:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
.menu-item .check { width: 28px; text-align: center; opacity: 0; }
.menu-item[aria-checked="true"] .check { opacity: 1; }
.menu-item select { max-width: 110px; }
.mode-cycle { display: inline-flex; align-items: center; justify-content: center; width: 28px; padding: 0; }
.mode-cycle svg { display: block; }
.canvas { flex: 1; min-height: 0; overflow: auto; }
/* An offscreen or hidden chart pauses its ambient animations — they repaint
   the SVG continuously, so an invisible chart must not heat the machine. */
.canvas--asleep svg *,
.canvas--asleep .chart-artifact-layer svg { animation-play-state: paused !important; }
.chart-stage {
	position: relative;
	width: fit-content;
	margin: 0 auto;
	border-radius: var(--roadmap-preview-chart-radius, 0);
	box-shadow: var(--roadmap-preview-chart-shadow, none);
}
.chart-stage > svg { display: block; border-radius: inherit; }
/* Lifted mode: animated background artifacts leave the svg (which would
   repaint on the CPU every frame in engines without composited SVG
   animation) and run as GPU-composited layers behind a transparent-canvas
   chart. The svg keeps its own copies for standalone downloads; here they
   just stop painting. */
.chart-stage--lifted > svg { position: relative; z-index: 1; }
.chart-stage--lifted > svg .roadmap__background-artifact { display: none; }
.chart-stage--lifted > svg .roadmap__canvas { fill: transparent; }
.chart-artifact-layer {
	position: absolute;
	inset: 0;
	overflow: hidden;
	border-radius: inherit;
	pointer-events: none;
}
.chart-artifact-layer svg { position: absolute; overflow: visible; }
`;

/** Icon-only appearance states; clicking the button cycles through them. */
const modeIcons = {
	system:
		'<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.5"/><path d="M5.5 14h5M8 11.5V14"/></svg>',
	light:
		'<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 0.8v2M8 13.2v2M0.8 8h2M13.2 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4"/></svg>',
	dark: '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M13.4 9.9A5.6 5.6 0 0 1 6.1 2.6a5.7 5.7 0 1 0 7.3 7.3z"/></svg>',
} as const;

/** Tokens accepted by the `controls` attribute; all are on by default. */
const controlTokens = ["theme", "mode", "interactive", "spotlight", "zoom", "download"] as const;
type ControlToken = (typeof controlTokens)[number];
const menuTokens: readonly ControlToken[] = [
	"theme",
	"mode",
	"interactive",
	"spotlight",
	"download",
];

export class RoadmapPreviewElement extends HTMLElement {
	static observedAttributes = [
		"src",
		"theme",
		"mode",
		"controls",
		"chromeless",
		"storage-key",
		"interactive",
		"spotlight",
	];

	#artifact: RoadmapDocument | undefined;
	#defaultsSeeded = false;
	#interactivity: RoadmapInteractivityHandle | undefined;
	#detachSpotlight: (() => void) | undefined;
	#zoom = 1;
	#systemMode: MediaQueryList | undefined;
	#renderQueued = false;
	#loadToken = 0;
	#renderNote: ((markdown: string) => Node | string) | undefined;
	#generated: GeneratedRoadmap | undefined;
	readonly #root: ShadowRoot;
	readonly #header: HTMLElement;
	readonly #title: HTMLElement;
	readonly #controls: HTMLElement;
	readonly #canvas: HTMLElement;
	readonly #themeSelect: HTMLSelectElement;
	readonly #menuButton: HTMLButtonElement;
	readonly #menu: HTMLElement;
	readonly #themeItem: HTMLElement;
	readonly #modeCycle: HTMLButtonElement;
	readonly #appearanceItem: HTMLElement;
	readonly #interactiveItem: HTMLButtonElement;
	readonly #spotlightItem: HTMLButtonElement;
	readonly #downloadItem: HTMLButtonElement;
	readonly #zoomLevel: HTMLButtonElement;

	constructor() {
		super();
		this.#root = this.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = previewStyles;
		// The header is viewer chrome, like a PDF reader's bar: title on the
		// left, a slot for host extras, every control on the right.
		// `chromeless` hides the whole bar.
		this.#header = document.createElement("div");
		this.#header.className = "header";
		this.#header.setAttribute("part", "header");
		this.#title = document.createElement("span");
		this.#title.className = "title";
		this.#title.setAttribute("part", "title");
		const headerSlot = document.createElement("slot");
		headerSlot.name = "header";
		this.#controls = document.createElement("div");
		this.#controls.className = "controls";
		this.#controls.setAttribute("part", "controls");
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
		const zoomOut = document.createElement("button");
		zoomOut.className = "zoom-step";
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
		zoomIn.className = "zoom-step";
		zoomIn.setAttribute("part", "zoom-in");
		zoomIn.setAttribute("aria-label", "Zoom in");
		zoomIn.textContent = "+";
		zoomIn.addEventListener("click", () => this.#setZoom(this.#zoom * zoomLevels.step));
		// Everything that is a setting lives behind one "…" menu, PDF-viewer
		// style: appearance (icon cycles light → dark → system), theme,
		// interactive, spotlight, and the SVG download.
		const menuWrap = document.createElement("div");
		menuWrap.className = "menu-wrap";
		this.#menuButton = document.createElement("button");
		this.#menuButton.setAttribute("part", "menu-button");
		this.#menuButton.setAttribute("aria-haspopup", "menu");
		this.#menuButton.setAttribute("aria-expanded", "false");
		this.#menuButton.setAttribute("aria-label", "Roadmap options");
		this.#menuButton.className = "menu-toggle";
		this.#menuButton.textContent = "…";
		this.#menuButton.addEventListener("click", () => this.#toggleMenu());
		this.#menu = document.createElement("div");
		this.#menu.className = "menu";
		this.#menu.setAttribute("part", "menu");
		this.#menu.setAttribute("role", "menu");
		this.#menu.hidden = true;
		const menuRow = (label: string): HTMLElement => {
			const row = document.createElement("div");
			row.className = "menu-item";
			const text = document.createElement("span");
			text.textContent = label;
			row.append(text);
			return row;
		};
		this.#appearanceItem = menuRow("Appearance");
		this.#appearanceItem.setAttribute("part", "appearance-item");
		this.#modeCycle = document.createElement("button");
		this.#modeCycle.className = "mode-cycle";
		this.#modeCycle.setAttribute("part", "mode-cycle");
		this.#modeCycle.addEventListener("click", () => {
			const order = ["system", "light", "dark"] as const;
			const current = this.getAttribute("mode") ?? "system";
			const next = order[(order.indexOf(current as (typeof order)[number]) + 1) % order.length];
			this.setAttribute("mode", next ?? "system");
		});
		this.#appearanceItem.append(this.#modeCycle);
		this.#themeItem = menuRow("Theme");
		this.#themeItem.setAttribute("part", "theme-item");
		this.#themeItem.append(this.#themeSelect);
		const checkItem = (label: string, attribute: string, part: string): HTMLButtonElement => {
			const item = document.createElement("button");
			item.className = "menu-item";
			item.setAttribute("part", part);
			item.setAttribute("role", "menuitemcheckbox");
			const text = document.createElement("span");
			text.textContent = label;
			const check = document.createElement("span");
			check.className = "check";
			check.textContent = "✓";
			item.append(text, check);
			item.addEventListener("click", () => this.toggleAttribute(attribute));
			return item;
		};
		this.#interactiveItem = checkItem("Interactive", "interactive", "interactive-item");
		this.#spotlightItem = checkItem("Spotlight", "spotlight", "spotlight-item");
		this.#downloadItem = document.createElement("button");
		this.#downloadItem.className = "menu-item";
		this.#downloadItem.setAttribute("part", "download-item");
		this.#downloadItem.setAttribute("role", "menuitem");
		this.#downloadItem.textContent = "Download SVG";
		this.#downloadItem.addEventListener("click", () => {
			this.#closeMenu();
			this.#download();
		});
		this.#menu.append(
			this.#appearanceItem,
			this.#themeItem,
			this.#interactiveItem,
			this.#spotlightItem,
			this.#downloadItem,
		);
		menuWrap.append(this.#menuButton, this.#menu);
		this.#controls.append(zoomOut, this.#zoomLevel, zoomIn, menuWrap);
		this.#header.append(this.#title, headerSlot, this.#controls);
		this.#canvas = document.createElement("div");
		this.#canvas.className = "canvas";
		this.#canvas.setAttribute("part", "canvas");
		this.#root.append(style, this.#header, this.#canvas);
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

	/** The last render's document, layout, theme, and SVG. */
	get generated(): GeneratedRoadmap | undefined {
		return this.#generated;
	}

	/** Re-renders the current artifact (fonts loaded, emoji registered…). */
	refresh(): void {
		this.#queueRender();
	}

	// Ambient chart animations pause while the element is offscreen or the
	// document is hidden; they repaint the SVG subtree continuously, so an
	// invisible chart should cost nothing.
	#visible = true;
	#sleepObserver: IntersectionObserver | undefined;

	readonly #syncSleep = (): void => {
		const awake = this.#visible && !this.ownerDocument.hidden;
		this.#canvas.classList.toggle("canvas--asleep", !awake);
	};

	connectedCallback(): void {
		// Interactive defaults on and spotlight defaults off: a bare embed gets
		// clickable topics with zero attributes. Only the first connect seeds the
		// default so a menu opt-out survives re-parenting.
		if (!this.#defaultsSeeded) {
			this.#defaultsSeeded = true;
			if (!this.hasAttribute("interactive")) this.setAttribute("interactive", "");
		}
		const inline = this.querySelector('script[type="application/roadmap+json"]');
		if (inline?.textContent && this.#artifact === undefined) {
			this.artifact = JSON.parse(inline.textContent);
		}
		if (this.hasAttribute("src")) void this.#load(this.getAttribute("src") ?? "");
		this.#zoom = this.#storedZoom() ?? 1;
		if (typeof IntersectionObserver === "function") {
			this.#sleepObserver = new IntersectionObserver((entries) => {
				this.#visible = entries.at(-1)?.isIntersecting ?? true;
				this.#syncSleep();
			});
			this.#sleepObserver.observe(this);
		}
		this.ownerDocument.addEventListener("visibilitychange", this.#syncSleep);
		this.#queueRender();
	}

	disconnectedCallback(): void {
		this.#closeMenu();
		this.#sleepObserver?.disconnect();
		this.#sleepObserver = undefined;
		this.ownerDocument.removeEventListener("visibilitychange", this.#syncSleep);
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

	#enabledControls(): ReadonlySet<ControlToken> {
		const attribute = this.getAttribute("controls");
		// Default chrome carries everything: a bare embed is fully featured.
		if (attribute === null) return new Set(controlTokens);
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
		const svg = this.#chartSvg();
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

	#toggleMenu(): void {
		if (this.#menu.hidden) this.#openMenu();
		else this.#closeMenu();
	}

	#openMenu(): void {
		this.#menu.hidden = false;
		this.#menuButton.setAttribute("aria-expanded", "true");
		document.addEventListener("pointerdown", this.#onOutsidePointer, true);
		document.addEventListener("keydown", this.#onMenuKey, true);
		// Any scroll dismisses an open menu, as popups conventionally do.
		// Scroll events do not cross the shadow boundary, so the canvas pane
		// needs its own listener beside the document-level one.
		document.addEventListener("scroll", this.#onAnyScroll, true);
		this.#canvas.addEventListener("scroll", this.#onAnyScroll, true);
	}

	#closeMenu(): void {
		if (this.#menu.hidden) return;
		this.#menu.hidden = true;
		this.#menuButton.setAttribute("aria-expanded", "false");
		document.removeEventListener("pointerdown", this.#onOutsidePointer, true);
		document.removeEventListener("keydown", this.#onMenuKey, true);
		document.removeEventListener("scroll", this.#onAnyScroll, true);
		this.#canvas.removeEventListener("scroll", this.#onAnyScroll, true);
	}

	readonly #onOutsidePointer = (event: Event): void => {
		const path = event.composedPath();
		if (path.includes(this.#menu) || path.includes(this.#menuButton)) return;
		this.#closeMenu();
	};

	readonly #onMenuKey = (event: KeyboardEvent): void => {
		if (event.key === "Escape") this.#closeMenu();
	};

	readonly #onAnyScroll = (): void => {
		this.#closeMenu();
	};

	#syncModeIcon(): void {
		const attribute = this.getAttribute("mode");
		const mode = attribute === "light" || attribute === "dark" ? attribute : "system";
		this.#modeCycle.innerHTML = modeIcons[mode];
		const label = `Appearance: ${mode}`;
		this.#modeCycle.title = label;
		this.#modeCycle.setAttribute("aria-label", label);
	}

	#chartSvg(): SVGSVGElement | null {
		return this.#canvas.querySelector(".chart-stage > svg");
	}

	/**
	 * Moves animated background artifacts onto GPU-composited layers. Inside
	 * the svg, an animated transform repaints the subtree on the CPU every
	 * frame in engines without composited SVG animation (Safari's shipping
	 * engine) — measured at most of a core for ambient drift. As positioned
	 * HTML-context elements, the same artifacts rasterize once and move on
	 * the compositor for free. The svg keeps its own animated copies (hidden
	 * here by stylesheet) so a downloaded chart is unchanged.
	 */
	#liftAnimatedArtifacts(stage: HTMLElement): void {
		const svg = stage.querySelector(":scope > svg");
		if (!svg) return;
		const artifacts = [...svg.querySelectorAll("g.roadmap__background-artifact")];
		if (artifacts.length === 0 || !svg.querySelector(".roadmap__background-artifact-motion")) {
			return;
		}
		const chartRect = svg.getBoundingClientRect();
		const measurable =
			chartRect.width > 0 &&
			typeof (artifacts[0] as SVGGraphicsElement).getBBox === "function" &&
			typeof globalThis.requestAnimationFrame === "function";
		if (!measurable) return; // headless DOMs keep the in-svg animation
		const layer = this.ownerDocument.createElement("div");
		layer.className = "chart-artifact-layer";
		layer.setAttribute("aria-hidden", "true");
		const namespace = "http://www.w3.org/2000/svg";
		for (const artifact of artifacts) {
			const graphic = artifact as SVGGraphicsElement;
			const rect = graphic.getBoundingClientRect();
			if (!(rect.width > 0) || !(rect.height > 0)) continue;
			let box: DOMRect;
			try {
				box = graphic.getBBox();
			} catch {
				continue;
			}
			const mini = this.ownerDocument.createElementNS(namespace, "svg");
			mini.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
			const clone = graphic.cloneNode(true) as SVGGElement;
			// The placement transform is expressed by the layer position; the
			// motion moves to the mini root, where the compositor animates it.
			clone.removeAttribute("transform");
			// Artifact paints are var(--roadmap-…) tokens scoped to the chart
			// svg; outside it they would collapse to black. Stamp the resolved
			// paints from the in-chart originals onto the clone.
			const view = this.ownerDocument.defaultView;
			if (view) {
				const originals = [graphic, ...graphic.querySelectorAll("*")];
				const clones = [clone, ...clone.querySelectorAll("*")];
				originals.forEach((original, index) => {
					const target = clones[index];
					if (!target) return;
					const computed = view.getComputedStyle(original);
					if (original.hasAttribute("fill")) target.setAttribute("fill", computed.fill);
					if (original.hasAttribute("stroke")) target.setAttribute("stroke", computed.stroke);
					for (const property of ["opacity", "fill-opacity", "stroke-opacity"] as const) {
						if (original.hasAttribute(property)) {
							target.setAttribute(property, computed.getPropertyValue(property));
						}
					}
				});
				// Class-driven opacity on the artifact group travels as an
				// attribute, since the class rules stay behind in the svg.
				const rootOpacity = view.getComputedStyle(graphic).opacity;
				if (rootOpacity !== "1") clone.setAttribute("opacity", rootOpacity);
			}
			const motion = clone.querySelector(".roadmap__background-artifact-motion");
			if (motion instanceof SVGElement) {
				mini.setAttribute("class", "roadmap__background-artifact-motion");
				mini.setAttribute("style", motion.getAttribute("style") ?? "");
				motion.removeAttribute("class");
				motion.removeAttribute("style");
			}
			mini.style.left = `${((rect.left - chartRect.left) / chartRect.width) * 100}%`;
			mini.style.top = `${((rect.top - chartRect.top) / chartRect.height) * 100}%`;
			mini.style.width = `${(rect.width / chartRect.width) * 100}%`;
			mini.style.height = `${(rect.height / chartRect.height) * 100}%`;
			mini.append(clone);
			layer.append(mini);
		}
		if (!layer.childElementCount) return;
		// The layer sits behind the chart; the chart's canvas rect goes
		// transparent and the stage supplies the color underneath.
		const canvasColor = this.ownerDocument.defaultView
			?.getComputedStyle(svg)
			.getPropertyValue("--roadmap-canvas-background")
			.trim();
		if (canvasColor) stage.style.background = canvasColor;
		stage.classList.add("chart-stage--lifted");
		stage.insertBefore(layer, svg);
	}

	#download(): void {
		const svg = this.#chartSvg();
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
		const controls = this.#enabledControls();
		this.#themeItem.hidden = !controls.has("theme");
		this.#appearanceItem.hidden = !controls.has("mode");
		this.#interactiveItem.hidden = !controls.has("interactive");
		this.#spotlightItem.hidden = !controls.has("spotlight");
		this.#downloadItem.hidden = !controls.has("download");
		this.#menuButton.hidden = !menuTokens.some((token) => controls.has(token));
		if (this.#menuButton.hidden) this.#closeMenu();
		for (const element of this.#controls.querySelectorAll("[part^='zoom']")) {
			(element as HTMLElement).hidden = !controls.has("zoom");
		}
		this.#interactiveItem.setAttribute(
			"aria-checked",
			this.hasAttribute("interactive") ? "true" : "false",
		);
		this.#spotlightItem.setAttribute(
			"aria-checked",
			this.hasAttribute("spotlight") ? "true" : "false",
		);
		this.#syncModeIcon();
		this.#header.hidden = this.hasAttribute("chromeless");
		if (!this.#artifact) return;

		const preset = this.getAttribute("theme") ?? this.#artifact.settings.theme.preset;
		const mode = this.#mode();
		this.#themeSelect.value = preset;
		this.#teardown();
		const idPrefix = (this.getAttribute("storage-key") ?? "roadmap-preview").replaceAll(
			/[^A-Za-z0-9_-]+/gu,
			"-",
		);
		const generated = renderRoadmapDocument(this.#artifact, {
			theme: { preset, mode },
			render: { idPrefix },
		});
		this.#generated = generated;
		// Mount through the XML parser: it is strict about the SVG namespace
		// and immune to HTML-parser quirks (happy-dom drops SVG children on
		// innerHTML, and browsers apply HTML parsing rules there).
		const parsed = new DOMParser().parseFromString(generated.svg, "image/svg+xml");
		const stage = document.createElement("div");
		stage.className = "chart-stage";
		stage.append(document.importNode(parsed.documentElement, true));
		this.#canvas.replaceChildren(stage);
		this.#liftAnimatedArtifacts(stage);
		this.#suppressRootTooltip();
		this.#title.textContent = generated.layout.title;
		this.#applyZoom();

		const svg = this.#chartSvg();
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
		this.dispatchEvent(
			new CustomEvent("roadmap-render", {
				detail: {
					theme: preset,
					mode,
					width: generated.layout.width,
					height: generated.layout.height,
				},
			}),
		);
	}

	/**
	 * The chart's accessible root `<title>` doubles as a hover tooltip over
	 * the whole SVG in browsers; move it onto aria attributes so assistive
	 * tech keeps the name without the tooltip following the pointer.
	 */
	#suppressRootTooltip(): void {
		const svg = this.#canvas.querySelector("svg");
		const title = svg?.querySelector(":scope > title");
		if (!svg || !title) return;
		const label = title.textContent?.trim();
		if (label) svg.setAttribute("aria-label", label);
		const description = svg.querySelector(":scope > desc");
		if (description?.id) svg.setAttribute("aria-describedby", description.id);
		svg.removeAttribute("aria-labelledby");
		title.remove();
	}
}

if (typeof customElements !== "undefined" && !customElements.get("roadmap-preview")) {
	customElements.define("roadmap-preview", RoadmapPreviewElement);
}
