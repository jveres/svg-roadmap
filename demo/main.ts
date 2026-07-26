import { mdToHtml } from "comrak-wasm";
import {
	builtInThemes,
	createRoadmapGenerator,
	installDomMeasurement,
	type RoadmapColorMode,
	type RoadmapGenerator,
	type RoadmapThemeSelection,
	registerEmojiArtwork,
} from "../src/index.ts";
import {
	attachRoadmapInteractivity,
	attachRoadmapSpotlight,
	type RoadmapInteractivityHandle,
} from "../src/interactive.ts";
import aiArchitect from "./ai-architect.md?raw";
import elektromosGitar from "./elektromos-gitar.md?raw";
import featureTour from "./feature-tour.md?raw";
import linearFunctions from "./linear-functions.md?raw";
import sweep10 from "./sweep-1.0.md?raw";
import sweep from "./sweep-1.1.md?raw";
import "./style.css";

interface WorkbenchSample {
	readonly label: string;
	readonly source: string;
	readonly preset: string;
}

const samples: Readonly<Record<string, WorkbenchSample>> = {
	"sweep-1.0": {
		label: "Sweep 1.0",
		source: sweep10,
		preset: "fun",
	},
	sweep: {
		label: "Sweep 1.1",
		source: sweep,
		preset: "fun",
	},
	"ai-architect": {
		label: "AI Architect",
		source: aiArchitect,
		preset: "pro",
	},
	"linear-functions": {
		label: "Linear Functions",
		source: linearFunctions,
		preset: "fun",
	},
	"elektromos-gitar": {
		label: "Elektromos gitár",
		source: elektromosGitar,
		preset: "fun",
	},
	"feature-tour": {
		label: "Feature Tour",
		source: featureTour,
		preset: "sci-fi",
	},
};

const defaultSampleId = "sweep-1.0";
const fallbackPreset = "fun";

/** Preset labels for the picker; anything unlisted falls back to its id. */
const presetLabels: Readonly<Record<string, string>> = {
	fun: "Fun",
	"sci-fi": "Sci-fi",
	rose: "Rose",
	print: "Print",
	pro: "Pro",
	retro: "Retro",
	arcade: "Arcade",
	ascii: "ASCII",
};

const presetIds = Object.keys(builtInThemes);

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("The demo root element is missing.");

app.innerHTML = `
	<header class="toolbar">
		<div>
			<p class="eyebrow">SVG Roadmap</p>
			<h1>Roadmap workbench</h1>
		</div>
		<div class="actions">
			<label class="theme-picker">Roadmap
				<select id="sample">
					${Object.entries(samples)
						.map(
							([id, sample]) =>
								`<option value="${id}"${id === defaultSampleId ? " selected" : ""}>${sample.label}</option>`,
						)
						.join("")}
				</select>
			</label>
			<label class="theme-picker">Theme
				<select id="theme-preset">
					${presetIds
						.map(
							(id) =>
								`<option value="${id}"${id === fallbackPreset ? " selected" : ""}>${presetLabels[id] ?? id}</option>`,
						)
						.join("")}
				</select>
			</label>
			<label class="theme-picker">Mode
				<select id="color-mode">
					<option value="system" selected>System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</label>
			<label class="theme-picker interact-toggle">Interactive
				<input id="interactive" type="checkbox" />
			</label>
			<label class="theme-picker interact-toggle">Spotlight
				<input id="spotlight" type="checkbox" />
			</label>
			<button id="download" type="button">Download SVG</button>
		</div>
	</header>
	<main id="workbench" class="workbench">
		<section id="editor-panel" class="editor-panel" aria-labelledby="editor-title">
			<div class="panel-heading">
				<button
					id="toggle-editor"
					class="panel-toggle"
					type="button"
					aria-controls="source"
					aria-expanded="true"
				>
					<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8 10 12.5"/></svg>
				</button>
				<h2 id="editor-title">Markdown<sup id="editor-dirty" hidden aria-label="modified">*</sup></h2>
				<button id="reset-source" class="panel-reset" type="button" hidden
					title="Discard edits and restore the sample">reset</button>
				<span id="stats">Loading parser…</span>
			</div>
			<textarea id="source" spellcheck="false" aria-label="Roadmap Markdown"></textarea>
		</section>
		<section class="preview-panel" aria-labelledby="preview-title">
			<div class="panel-heading">
				<h2 id="preview-title">SVG preview</h2>
				<span id="dimensions"></span>
			</div>
			<div id="preview" class="preview" aria-live="polite"></div>
		</section>
	</main>
`;

function requiredElement<ElementType extends Element>(selector: string): ElementType {
	const element = document.querySelector<ElementType>(selector);
	if (!element) throw new Error(`The demo control ${selector} is missing.`);
	return element;
}

const source = requiredElement<HTMLTextAreaElement>("#source");
const editorDirty = requiredElement<HTMLElement>("#editor-dirty");
const resetSource = requiredElement<HTMLButtonElement>("#reset-source");
const sampleSelect = requiredElement<HTMLSelectElement>("#sample");
const themePresetSelect = requiredElement<HTMLSelectElement>("#theme-preset");
const colorModeSelect = requiredElement<HTMLSelectElement>("#color-mode");
const preview = requiredElement<HTMLDivElement>("#preview");
const stats = requiredElement<HTMLSpanElement>("#stats");
const dimensions = requiredElement<HTMLSpanElement>("#dimensions");
const download = requiredElement<HTMLButtonElement>("#download");
const workbench = requiredElement<HTMLElement>("#workbench");
const interactiveToggle = requiredElement<HTMLInputElement>("#interactive");
const spotlightToggle = requiredElement<HTMLInputElement>("#spotlight");
const toggleEditor = requiredElement<HTMLButtonElement>("#toggle-editor");
const previewOnlyClass = "workbench--preview-only";
let editorHidden = false;

const draftStorageKey = (id: string): string => `roadmap-workbench-draft:${id}`;

function syncDirtyState(): void {
	const sample = samples[sampleSelect.value];
	const dirty = sample !== undefined && source.value !== sample.source;
	editorDirty.hidden = !dirty;
	resetSource.hidden = !dirty;
}

/** User edits survive reloads and sample switches, per sample. */
function saveDraft(): void {
	const sample = samples[sampleSelect.value];
	if (!sample) return;
	try {
		if (source.value === sample.source)
			localStorage.removeItem(draftStorageKey(sampleSelect.value));
		else localStorage.setItem(draftStorageKey(sampleSelect.value), source.value);
	} catch {
		// Storage may be unavailable; edits just do not persist.
	}
	syncDirtyState();
}

function loadSample(id: string): void {
	const sample = samples[id];
	if (!sample) return;
	let draft: string | null = null;
	try {
		draft = localStorage.getItem(draftStorageKey(id));
	} catch {
		// Fall through to the pristine sample.
	}
	source.value = draft ?? sample.source;
	if ([...themePresetSelect.options].some((option) => option.value === sample.preset)) {
		themePresetSelect.value = sample.preset;
	}
	syncDirtyState();
}

const settingsStorageKey = "roadmap-workbench-settings";

interface WorkbenchSettings {
	readonly sample?: string;
	readonly theme?: string;
	readonly mode?: string;
	readonly editorHidden?: boolean;
	readonly interactive?: boolean;
	readonly spotlight?: boolean;
}

function loadStoredSettings(): WorkbenchSettings {
	try {
		return JSON.parse(localStorage.getItem(settingsStorageKey) ?? "{}") as WorkbenchSettings;
	} catch {
		return {};
	}
}

function saveSettings(): void {
	try {
		localStorage.setItem(
			settingsStorageKey,
			JSON.stringify({
				sample: sampleSelect.value,
				theme: themePresetSelect.value,
				mode: colorModeSelect.value,
				editorHidden,
				interactive: interactiveToggle.checked,
				spotlight: spotlightToggle.checked,
			} satisfies WorkbenchSettings),
		);
	} catch {
		// Storage may be unavailable (private browsing); settings just do not persist.
	}
}

function applyStoredValue(select: HTMLSelectElement, value: string | undefined): void {
	if (value && [...select.options].some((option) => option.value === value)) {
		select.value = value;
	}
}

/**
 * Collapses the Markdown editor so the preview spans the full window. The
 * panel keeps a narrow rail carrying its chevron and title, so the control
 * that collapsed it is still where the reader left it. The label lives on
 * aria-label rather than in the button, whose content is the chevron.
 */
function setEditorHidden(hidden: boolean): void {
	editorHidden = hidden;
	const label = hidden ? "Show Markdown editor" : "Hide Markdown editor";
	workbench.classList.toggle(previewOnlyClass, hidden);
	toggleEditor.setAttribute("aria-expanded", hidden ? "false" : "true");
	toggleEditor.setAttribute("aria-label", label);
	toggleEditor.title = label;
}

const storedSettings = loadStoredSettings();
applyStoredValue(sampleSelect, storedSettings.sample);
loadSample(sampleSelect.value);
applyStoredValue(themePresetSelect, storedSettings.theme);
applyStoredValue(colorModeSelect, storedSettings.mode);
setEditorHidden(storedSettings.editorHidden === true);
interactiveToggle.checked = storedSettings.interactive === true;
spotlightToggle.checked = storedSettings.spotlight === true;
let svg = "";
let renderTimer: number | undefined;
let generator: RoadmapGenerator | undefined;
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

function selectedMode(): RoadmapColorMode {
	if (colorModeSelect.value === "system") return systemTheme.matches ? "dark" : "light";
	return colorModeSelect.value === "dark" ? "dark" : "light";
}

function selectedTheme(): RoadmapThemeSelection {
	const preset = themePresetSelect.value;
	return {
		preset: presetIds.includes(preset) ? preset : fallbackPreset,
		mode: selectedMode(),
	};
}

function suppressPreviewTitleTooltip(): void {
	const previewSvg = preview.querySelector<SVGSVGElement>(":scope > svg");
	const title = previewSvg?.querySelector<SVGTitleElement>(":scope > title");
	if (!previewSvg || !title) return;

	const label = title.textContent?.trim();
	if (label) previewSvg.setAttribute("aria-label", label);
	const description = previewSvg.querySelector<SVGDescElement>(":scope > desc");
	if (description?.id) previewSvg.setAttribute("aria-describedby", description.id);
	previewSvg.removeAttribute("aria-labelledby");
	title.remove();
}

let interactivity: RoadmapInteractivityHandle | undefined;
let detachSpotlight: (() => void) | undefined;

function syncSpotlight(): void {
	detachSpotlight?.();
	detachSpotlight = undefined;
	if (!spotlightToggle.checked) return;
	const previewSvg = preview.querySelector<SVGSVGElement>(":scope > svg");
	if (previewSvg) detachSpotlight = attachRoadmapSpotlight(previewSvg);
}

/**
 * Scrolls the Markdown editor to a source line and selects it, so a click on
 * the chart lands the eye on the authored text. Rows above the target are
 * counted through the editor's soft wrap with measured monospace advances;
 * the target lands at the top with one context row above it. Focus stays on
 * the chart.
 */
function revealSourceLine(line: number): void {
	if (editorHidden) return;
	const lines = source.value.split("\n");
	const lineText = lines[line - 1];
	if (lineText === undefined) return;
	let offset = 0;
	for (let index = 0; index < line - 1; index += 1) offset += (lines[index]?.length ?? 0) + 1;
	source.setSelectionRange(offset, offset + lineText.length);
	const style = window.getComputedStyle(source);
	const context = document.createElement("canvas").getContext("2d");
	let charWidth = Number.parseFloat(style.fontSize) * 0.6;
	if (context) {
		context.font = `${style.fontSize} ${style.fontFamily}`;
		charWidth = context.measureText("M").width || charWidth;
	}
	const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
	const columns = Math.max(20, Math.floor((source.clientWidth - padding) / charWidth));
	let rows = 0;
	for (let index = 0; index < line - 1; index += 1) {
		rows += Math.max(1, Math.ceil((lines[index]?.length ?? 0) / columns));
	}
	const lineHeight = Number.parseFloat(style.lineHeight) || 20;
	source.scrollTop = Math.max(0, (rows - 1) * lineHeight);
}

function syncInteractivity(): void {
	interactivity?.dispose();
	interactivity = undefined;
	if (!interactiveToggle.checked) return;
	const previewSvg = preview.querySelector<SVGSVGElement>(":scope > svg");
	if (!previewSvg) return;
	interactivity = attachRoadmapInteractivity(previewSvg, {
		storageKey: `workbench-progress:${sampleSelect.value}`,
		// Notes arrive as authored Markdown; rendering is the host's call.
		// comrak escapes raw HTML by default, so the output is inert.
		renderNote: (markdown) => mdToHtml(markdown),
		// A selected topic also reveals its authored source in the editor.
		onSelect: (detail) => {
			if (detail?.sourceRange) revealSourceLine(detail.sourceRange.start.line);
		},
	});
}

function render(): void {
	if (!generator) return;
	try {
		const theme = selectedTheme();
		document.documentElement.dataset.workbenchTheme = theme.mode;
		const result = generator.generate(source.value, {
			theme,
			render: { idPrefix: "workbench-roadmap" },
		});
		svg = result.svg;
		preview.innerHTML = svg;
		suppressPreviewTitleTooltip();
		preview.dataset.theme = result.theme.name;
		preview.dataset.mode = result.theme.mode;
		stats.textContent = `${result.document.stats.chapters} chapters · ${result.document.stats.topics} topics · depth ${result.document.stats.maxDepth}`;
		dimensions.textContent = `${result.layout.width} × ${result.layout.height}`;
		syncInteractivity();
		syncSpotlight();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		preview.innerHTML = `<p class="error" role="alert"></p>`;
		preview.querySelector(".error")?.append(document.createTextNode(message));
		stats.textContent = "Render failed";
		dimensions.textContent = "";
	}
}

function scheduleRender(): void {
	if (renderTimer !== undefined) window.clearTimeout(renderTimer);
	renderTimer = window.setTimeout(render, 120);
}

source.addEventListener("input", () => {
	saveDraft();
	scheduleRender();
});
resetSource.addEventListener("click", () => {
	const sample = samples[sampleSelect.value];
	if (!sample) return;
	source.value = sample.source;
	saveDraft();
	render();
});
sampleSelect.addEventListener("change", () => {
	loadSample(sampleSelect.value);
	saveSettings();
	render();
});
themePresetSelect.addEventListener("change", () => {
	saveSettings();
	render();
});
colorModeSelect.addEventListener("change", () => {
	saveSettings();
	render();
});
systemTheme.addEventListener("change", () => {
	if (colorModeSelect.value === "system") render();
});
toggleEditor.addEventListener("click", () => {
	setEditorHidden(!editorHidden);
	saveSettings();
});
interactiveToggle.addEventListener("change", () => {
	syncInteractivity();
	saveSettings();
});
spotlightToggle.addEventListener("change", () => {
	syncSpotlight();
	saveSettings();
});
download.addEventListener("click", () => {
	if (!svg) return;
	const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = "roadmap.svg";
	anchor.click();
	URL.revokeObjectURL(url);
});

try {
	// Measure with the browser's real fonts; late font loads re-render.
	await installDomMeasurement({ onFontsChanged: () => render() });
	generator = await createRoadmapGenerator();
	render();
	// The full GitHub emoji tier loads lazily so first paint stays light;
	// shortcodes beyond the core pack upgrade on the next render.
	import("../src/emoji-github.ts")
		.then(({ githubEmojiArtwork }) => {
			registerEmojiArtwork(githubEmojiArtwork);
			render();
		})
		.catch((error: unknown) => {
			console.warn("GitHub emoji pack failed to load", error);
		});
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	preview.textContent = `Unable to initialize comrak-wasm: ${message}`;
	stats.textContent = "Initialization failed";
}

window.addEventListener("pagehide", () => generator?.dispose(), { once: true });
