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
	type RoadmapInteractivityHandle,
	type RoadmapTopicDetail,
} from "../src/interactive.ts";
import aiArchitect from "./ai-architect.md?raw";
import featureTour from "./feature-tour.md?raw";
import softwareHygiene from "./software-hygiene.md?raw";
import "./style.css";

interface WorkbenchSample {
	readonly label: string;
	readonly source: string;
	readonly preset: string;
}

const samples: Readonly<Record<string, WorkbenchSample>> = {
	"software-hygiene": {
		label: "Software Hygiene",
		source: softwareHygiene,
		preset: "fun",
	},
	"ai-architect": {
		label: "AI Architect",
		source: aiArchitect,
		preset: "pro",
	},
	"feature-tour": {
		label: "Feature Tour",
		source: featureTour,
		preset: "sci-fi",
	},
};

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
						.map(([id, sample]) => `<option value="${id}">${sample.label}</option>`)
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
				<h2 id="editor-title">Markdown</h2>
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
const sampleSelect = requiredElement<HTMLSelectElement>("#sample");
const themePresetSelect = requiredElement<HTMLSelectElement>("#theme-preset");
const colorModeSelect = requiredElement<HTMLSelectElement>("#color-mode");
const preview = requiredElement<HTMLDivElement>("#preview");
const stats = requiredElement<HTMLSpanElement>("#stats");
const dimensions = requiredElement<HTMLSpanElement>("#dimensions");
const download = requiredElement<HTMLButtonElement>("#download");
const workbench = requiredElement<HTMLElement>("#workbench");
const interactiveToggle = requiredElement<HTMLInputElement>("#interactive");
let topicPanel: HTMLElement | undefined;
const toggleEditor = requiredElement<HTMLButtonElement>("#toggle-editor");
const previewOnlyClass = "workbench--preview-only";
let editorHidden = false;

function loadSample(id: string): void {
	const sample = samples[id];
	if (!sample) return;
	source.value = sample.source;
	if ([...themePresetSelect.options].some((option) => option.value === sample.preset)) {
		themePresetSelect.value = sample.preset;
	}
}

const settingsStorageKey = "roadmap-workbench-settings";

interface WorkbenchSettings {
	readonly sample?: string;
	readonly theme?: string;
	readonly mode?: string;
	readonly editorHidden?: boolean;
	readonly interactive?: boolean;
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
let abbreviations: Readonly<Record<string, string>> = {};

/**
 * The floating detail panel pairs with click-to-track: the same click that
 * cycles a topic's progress shows its resource link, tags, and definition.
 */
function showTopicDetail(detail: RoadmapTopicDetail): void {
	if (!topicPanel) return;
	topicPanel.hidden = false;
	topicPanel.replaceChildren();
	const heading = document.createElement("h3");
	heading.textContent = detail.title;
	topicPanel.append(heading);
	const state = document.createElement("p");
	state.className = "topic-panel__state";
	state.dataset.state = detail.state ?? "none";
	state.textContent = detail.state ? detail.state.replace("-", " ") : "not started";
	topicPanel.append(state);
	if (detail.tags.length > 0) {
		const tags = document.createElement("p");
		tags.className = "topic-panel__tags";
		tags.textContent = detail.tags.join(" · ");
		topicPanel.append(tags);
	}
	const definition = abbreviations[detail.title];
	if (definition) {
		const paragraph = document.createElement("p");
		paragraph.className = "topic-panel__definition";
		paragraph.textContent = definition;
		topicPanel.append(paragraph);
	}
	if (detail.href) {
		const link = document.createElement("a");
		link.href = detail.href;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = "Open resource ↗";
		topicPanel.append(link);
	}
}

function syncInteractivity(): void {
	interactivity?.dispose();
	interactivity = undefined;
	if (!interactiveToggle.checked) return;
	const previewSvg = preview.querySelector<SVGSVGElement>(":scope > svg");
	if (!previewSvg) return;
	interactivity = attachRoadmapInteractivity(previewSvg, {
		storageKey: `workbench-progress:${sampleSelect.value}`,
		onSelect: showTopicDetail,
		// A reset clears the tracking context, so the last selection's detail
		// section disappears with it.
		onReset: () => {
			if (topicPanel) topicPanel.hidden = true;
		},
	});
	// One panel, not two: the topic detail lives inside the module's sticky
	// summary card instead of floating separately.
	topicPanel = undefined;
	if (interactivity.summaryElement) {
		topicPanel = document.createElement("section");
		topicPanel.className = "topic-panel";
		topicPanel.hidden = true;
		interactivity.summaryElement.append(topicPanel);
	}
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
		abbreviations = result.document.abbreviations;
		syncInteractivity();
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

source.addEventListener("input", scheduleRender);
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
