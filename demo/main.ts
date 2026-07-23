import {
	createRoadmapGenerator,
	type RoadmapColorMode,
	type RoadmapGenerator,
	type RoadmapThemeSelection,
} from "../src/index.ts";
import softwareHygiene from "./software-hygiene.md?raw";
import "./style.css";

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
				<select id="theme-preset">
					<option value="fun" selected>Fun</option>
					<option value="sci-fi">Sci-fi</option>
					<option value="rose">Rose</option>
					<option value="print">Print</option>
					<option value="pro">Pro</option>
				</select>
			</label>
			<label class="theme-picker">Mode
				<select id="color-mode">
					<option value="system" selected>System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</label>
			<button id="download" type="button">Download SVG</button>
		</div>
	</header>
	<main class="workbench">
		<section class="editor-panel" aria-labelledby="editor-title">
			<div class="panel-heading">
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
const themePresetSelect = requiredElement<HTMLSelectElement>("#theme-preset");
const colorModeSelect = requiredElement<HTMLSelectElement>("#color-mode");
const preview = requiredElement<HTMLDivElement>("#preview");
const stats = requiredElement<HTMLSpanElement>("#stats");
const dimensions = requiredElement<HTMLSpanElement>("#dimensions");
const download = requiredElement<HTMLButtonElement>("#download");

source.value = softwareHygiene;
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
		preset:
			preset === "sci-fi" || preset === "rose" || preset === "print" || preset === "pro"
				? preset
				: "fun",
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
themePresetSelect.addEventListener("change", render);
colorModeSelect.addEventListener("change", render);
systemTheme.addEventListener("change", () => {
	if (colorModeSelect.value === "system") render();
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
	generator = await createRoadmapGenerator();
	render();
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	preview.textContent = `Unable to initialize comrak-wasm: ${message}`;
	stats.textContent = "Initialization failed";
}

window.addEventListener("pagehide", () => generator?.dispose(), { once: true });
