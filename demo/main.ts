import { mdToHtml } from "comrak-wasm";
import {
	builtInThemes,
	initializeRoadmapMarkdown,
	installDomMeasurement,
	RoadmapParser,
	registerEmojiArtwork,
} from "../src/index.ts";
import "../src/preview.ts";
import type { RoadmapPreviewElement } from "../src/preview.ts";
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
		<section class="preview-panel" aria-label="SVG preview">
			<p id="parse-error" class="error" role="alert" hidden></p>
			<roadmap-preview id="preview" class="preview" aria-live="polite"></roadmap-preview>
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
const preview = requiredElement<RoadmapPreviewElement>("#preview");
const parseError = requiredElement<HTMLParagraphElement>("#parse-error");
const stats = requiredElement<HTMLSpanElement>("#stats");
const workbench = requiredElement<HTMLElement>("#workbench");
const toggleEditor = requiredElement<HTMLButtonElement>("#toggle-editor");
const previewOnlyClass = "workbench--preview-only";
let editorHidden = false;

const draftStorageKey = (id: string): string => `roadmap-workbench-draft:${id}`;
const previewStorageKey = (id: string): string => `workbench:${id}`;

// The element scopes progress as `<storage-key>:progress`; earlier workbench
// builds used `workbench-progress:<sample>`. Carry existing progress over
// once so upgrading does not lose anyone's checkmarks.
for (const id of Object.keys(samples)) {
	try {
		const legacy = localStorage.getItem(`workbench-progress:${id}`);
		const target = `${previewStorageKey(id)}:progress`;
		if (legacy !== null && localStorage.getItem(target) === null) {
			localStorage.setItem(target, legacy);
		}
	} catch {
		// Storage may be unavailable; migration is best-effort.
	}
}

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
	if (presetIds.includes(sample.preset)) preview.setAttribute("theme", sample.preset);
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
				theme: preview.getAttribute("theme") ?? fallbackPreset,
				mode: preview.getAttribute("mode") ?? "system",
				editorHidden,
				interactive: preview.hasAttribute("interactive"),
				spotlight: preview.hasAttribute("spotlight"),
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
setEditorHidden(storedSettings.editorHidden === true);

// The element's own menu is the settings surface; the workbench only seeds
// stored values and keys per-sample storage. Interactive follows the element
// default (on) unless a stored session switched it off.
preview.setAttribute("storage-key", previewStorageKey(sampleSelect.value));
preview.setAttribute(
	"theme",
	presetIds.includes(storedSettings.theme ?? "")
		? (storedSettings.theme as string)
		: fallbackPreset,
);
preview.setAttribute("mode", storedSettings.mode ?? "system");
if (storedSettings.interactive !== undefined) {
	preview.toggleAttribute("interactive", storedSettings.interactive);
}
preview.toggleAttribute("spotlight", storedSettings.spotlight === true);

// Settings changed through the menu persist across reloads.
new MutationObserver(() => saveSettings()).observe(preview, {
	attributes: true,
	attributeFilter: ["theme", "mode", "interactive", "spotlight"],
});

let renderTimer: number | undefined;
let parser: RoadmapParser | undefined;

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

/** Parses the editor's Markdown and hands the artifact to the preview. */
function render(): void {
	if (!parser) return;
	try {
		const parsed = parser.parse(source.value);
		parseError.hidden = true;
		parseError.textContent = "";
		preview.artifact = parsed;
		stats.textContent = `${parsed.stats.chapters} chapters · ${parsed.stats.topics} topics · depth ${parsed.stats.maxDepth}`;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		parseError.hidden = false;
		parseError.textContent = message;
		stats.textContent = "Parse failed";
	}
}

function scheduleRender(): void {
	if (renderTimer !== undefined) window.clearTimeout(renderTimer);
	renderTimer = window.setTimeout(render, 120);
}

preview.addEventListener("roadmap-render", (event) => {
	const detail = (event as CustomEvent<{ mode: string }>).detail;
	document.documentElement.dataset.workbenchTheme = detail.mode;
});
// A selected topic also reveals its authored source in the editor.
preview.addEventListener("roadmap-select", (event) => {
	const detail = (event as CustomEvent<{ sourceRange?: { start: { line: number } } }>).detail;
	if (detail?.sourceRange) revealSourceLine(detail.sourceRange.start.line);
});

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
	preview.setAttribute("storage-key", previewStorageKey(sampleSelect.value));
	saveSettings();
	render();
});
toggleEditor.addEventListener("click", () => {
	setEditorHidden(!editorHidden);
	saveSettings();
});

try {
	// Notes arrive as authored Markdown; rendering is the host's call.
	// comrak escapes raw HTML by default, so the output is inert.
	preview.renderNote = (markdown) => mdToHtml(markdown);
	// Measure with the browser's real fonts; late font loads re-render.
	await installDomMeasurement({ onFontsChanged: () => preview.refresh() });
	await initializeRoadmapMarkdown();
	parser = new RoadmapParser();
	render();
	// The full GitHub emoji tier loads lazily so first paint stays light;
	// shortcodes beyond the core pack upgrade on the next render.
	import("../src/emoji-github.ts")
		.then(({ githubEmojiArtwork }) => {
			registerEmojiArtwork(githubEmojiArtwork);
			preview.refresh();
		})
		.catch((error: unknown) => {
			console.warn("GitHub emoji pack failed to load", error);
		});
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	parseError.hidden = false;
	parseError.textContent = `Unable to initialize comrak-wasm: ${message}`;
	stats.textContent = "Initialization failed";
}

window.addEventListener("pagehide", () => parser?.dispose(), { once: true });
