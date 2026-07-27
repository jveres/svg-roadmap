// @vitest-environment happy-dom
import { beforeAll, describe, expect, test } from "vitest";
import { generateRoadmap } from "./index.ts";
// The side-effect import defines the custom element; biome must not
// reduce it to a type-only import.
import "./preview.ts";
import type { RoadmapPreviewElement } from "./preview.ts";
import { packRoadmapDocument, type RoadmapDocument } from "./viewer.ts";

const markdown = `# Chart

* Chapter
  * Alpha
    > A note.
  * Beta
`;

let artifactDocument: RoadmapDocument;

beforeAll(() => {
	artifactDocument = generateRoadmap(markdown).document;
});

const flush = async (): Promise<void> => {
	await new Promise((resolve) => setTimeout(resolve, 0));
};

function mount(attributes: Record<string, string> = {}): RoadmapPreviewElement {
	const element = document.createElement("roadmap-preview") as RoadmapPreviewElement;
	for (const [name, value] of Object.entries(attributes)) {
		element.setAttribute(name, value);
	}
	document.body.replaceChildren(element);
	return element;
}

describe("<roadmap-preview>", () => {
	test("renders a packed artifact and re-renders on theme change", async () => {
		const element = mount({ mode: "light" });
		element.artifact = packRoadmapDocument(artifactDocument);
		await flush();
		const svg = element.shadowRoot?.querySelector("svg");
		expect(svg?.getAttribute("data-roadmap-theme")).toBe("fun");
		expect(svg?.getAttribute("data-roadmap-mode")).toBe("light");

		const renders: unknown[] = [];
		element.addEventListener("roadmap-render", (event) => {
			renders.push((event as CustomEvent).detail);
		});
		element.setAttribute("theme", "sci-fi");
		element.setAttribute("mode", "dark");
		await flush();
		const restyled = element.shadowRoot?.querySelector("svg");
		expect(restyled?.getAttribute("data-roadmap-theme")).toBe("sci-fi");
		expect(restyled?.getAttribute("data-roadmap-mode")).toBe("dark");
		expect(renders.at(-1)).toEqual({ theme: "sci-fi", mode: "dark" });
	});

	test("reads an inline artifact script and hides controls per attribute", async () => {
		const element = document.createElement("roadmap-preview") as RoadmapPreviewElement;
		const inline = document.createElement("script");
		inline.setAttribute("type", "application/roadmap+json");
		inline.textContent = JSON.stringify(packRoadmapDocument(artifactDocument));
		element.append(inline);
		element.setAttribute("controls", "theme zoom");
		document.body.replaceChildren(element);
		await flush();
		expect(element.shadowRoot?.querySelector("svg")).toBeTruthy();
		const part = (name: string): HTMLElement | null | undefined =>
			element.shadowRoot?.querySelector(`[part="${name}"]`);
		expect(part("theme-select")?.hidden).toBe(false);
		expect(part("zoom-in")?.hidden).toBe(false);
		expect(part("mode-select")?.hidden).toBe(true);
		expect(part("download")?.hidden).toBe(true);
	});

	test("attaches interactivity on demand and forwards selection events", async () => {
		const element = mount({ interactive: "", mode: "light" });
		element.artifact = artifactDocument;
		await flush();
		const handle = element.interactivity;
		expect(handle).toBeDefined();
		if (!handle) throw new Error("no interactivity handle");
		const selections: (string | undefined)[] = [];
		element.addEventListener("roadmap-select", (event) => {
			selections.push((event as CustomEvent).detail?.id);
		});
		const first = handle.topics()[0]?.id ?? "";
		handle.select(first);
		expect(selections).toEqual([first]);
		// Re-render swaps the handle; the old one is disposed.
		element.setAttribute("theme", "print");
		await flush();
		expect(element.interactivity).not.toBe(handle);
	});

	test("zoom steps update the level and persist under the storage key", async () => {
		const element = mount({ "storage-key": "pv-test", mode: "light" });
		element.artifact = artifactDocument;
		await flush();
		const zoomIn = element.shadowRoot?.querySelector('[part="zoom-in"]') as HTMLButtonElement;
		zoomIn.click();
		expect(element.shadowRoot?.querySelector('[part="zoom-reset"]')?.textContent).toBe("125%");
		expect(localStorage.getItem("pv-test:zoom")).toBe("1.25");
		// A fresh element under the same key restores the factor.
		const second = mount({ "storage-key": "pv-test", mode: "light" });
		second.artifact = artifactDocument;
		await flush();
		expect(second.shadowRoot?.querySelector('[part="zoom-reset"]')?.textContent).toBe("125%");
	});
});
