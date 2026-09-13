// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
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

afterEach(() => {
	document.body.replaceChildren();
	localStorage.clear();
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
		// The default-on interactivity inserts a progress summary (with its own
		// icon svg) ahead of the chart, so target the canvas's direct child.
		const chart = (): SVGElement | null | undefined =>
			element.shadowRoot?.querySelector(".chart-stage > svg");
		expect(chart()?.getAttribute("data-roadmap-theme")).toBe("fun");
		expect(chart()?.getAttribute("data-roadmap-mode")).toBe("light");

		const renders: unknown[] = [];
		element.addEventListener("roadmap-render", (event) => {
			renders.push((event as CustomEvent).detail);
		});
		element.setAttribute("theme", "sci-fi");
		element.setAttribute("mode", "dark");
		await flush();
		expect(chart()?.getAttribute("data-roadmap-theme")).toBe("sci-fi");
		expect(chart()?.getAttribute("data-roadmap-mode")).toBe("dark");
		expect(renders.at(-1)).toMatchObject({ theme: "sci-fi", mode: "dark" });
	});

	test("reads an inline artifact script and hides menu items per attribute", async () => {
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
		expect(part("theme-item")?.hidden).toBe(false);
		expect(part("zoom-in")?.hidden).toBe(false);
		expect(part("menu-button")?.hidden).toBe(false);
		expect(part("appearance-item")?.hidden).toBe(true);
		expect(part("interactive-item")?.hidden).toBe(true);
		expect(part("download-item")?.hidden).toBe(true);
	});

	test("menu toggles settings and the appearance button cycles modes", async () => {
		const element = mount({ mode: "light" });
		element.artifact = artifactDocument;
		await flush();
		const part = (name: string): HTMLElement | null | undefined =>
			element.shadowRoot?.querySelector(`[part="${name}"]`);
		const menuButton = part("menu-button") as HTMLButtonElement;
		const menu = part("menu") as HTMLElement;
		expect(menu.hidden).toBe(true);
		menuButton.click();
		expect(menu.hidden).toBe(false);
		expect(menuButton.getAttribute("aria-expanded")).toBe("true");
		// Interactive defaults on; the checkbox row toggles the attribute.
		const interactiveItem = part("interactive-item") as HTMLButtonElement;
		expect(interactiveItem.getAttribute("aria-checked")).toBe("true");
		interactiveItem.click();
		expect(element.hasAttribute("interactive")).toBe(false);
		const spotlightItem = part("spotlight-item") as HTMLButtonElement;
		expect(spotlightItem.getAttribute("aria-checked")).toBe("false");
		// The appearance button cycles light → dark → system.
		const modeCycle = part("mode-cycle") as HTMLButtonElement;
		modeCycle.click();
		expect(element.getAttribute("mode")).toBe("dark");
		modeCycle.click();
		expect(element.getAttribute("mode")).toBe("system");
		modeCycle.click();
		expect(element.getAttribute("mode")).toBe("light");
		// Scrolling anywhere dismisses the open menu, as popups conventionally do.
		expect(menu.hidden).toBe(false);
		element.shadowRoot?.querySelector('[part="canvas"]')?.dispatchEvent(new Event("scroll"));
		expect(menu.hidden).toBe(true);
		expect(menuButton.getAttribute("aria-expanded")).toBe("false");
	});

	test("attaches interactivity by default and forwards selection events", async () => {
		const element = mount({ mode: "light" });
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

// Network completion is controlled independently of aborts to verify that a
// stale response cannot win even if it has already reached response.json().
test.each(["remove source", "disconnect", "replace artifact"] as const)(
	"ignores an obsolete fetch after %s",
	async (action) => {
		const pending = Promise.withResolvers<Response>();
		const fetch = vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);
		const element = mount({ src: "/pending.json", mode: "light" });
		const errors: unknown[] = [];
		element.addEventListener("roadmap-error", (event) => errors.push(event));
		const replacement = { ...artifactDocument, source: "newer document" };

		if (action === "remove source") element.removeAttribute("src");
		else if (action === "disconnect") element.remove();
		else element.artifact = replacement;
		pending.resolve(new Response(JSON.stringify(packRoadmapDocument(artifactDocument))));
		await flush();

		expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
		expect(element.artifact).toBe(action === "replace artifact" ? replacement : undefined);
		expect(errors).toEqual([]);
	},
);

test("only displays the latest source when requests complete out of order", async () => {
	const first = Promise.withResolvers<Response>();
	const second = Promise.withResolvers<Response>();
	vi.spyOn(globalThis, "fetch")
		.mockReturnValueOnce(first.promise)
		.mockReturnValueOnce(second.promise);
	const element = mount({ src: "/first.json", mode: "light" });
	const replacement = { ...artifactDocument, source: "second source" };

	element.setAttribute("src", "/second.json");
	second.resolve(new Response(JSON.stringify(packRoadmapDocument(replacement))));
	await flush();
	first.resolve(new Response(JSON.stringify(packRoadmapDocument(artifactDocument))));
	await flush();

	expect(element.artifact?.source).toBe("second source");
	expect(element.generated?.document.source).toBe("second source");
});

test("does not render a queued update after disconnecting", async () => {
	const element = mount({ mode: "light" });
	const renders: Event[] = [];
	element.addEventListener("roadmap-render", (event) => renders.push(event));
	element.artifact = artifactDocument;

	element.remove();
	await flush();

	expect(renders).toEqual([]);
	expect(element.interactivity).toBeUndefined();
	expect(element.generated).toBeUndefined();
});

test("clearing an artifact also clears the displayed chart and interaction handle", async () => {
	const element = mount({ mode: "light" });
	element.artifact = artifactDocument;
	await flush();
	const handle = element.interactivity;
	if (!handle) throw new Error("interactivity missing");

	element.artifact = undefined;
	await flush();

	expect(element.shadowRoot?.querySelector(".chart-stage")).toBeNull();
	expect(element.generated).toBeUndefined();
	expect(element.interactivity).toBeUndefined();
	expect(handle.topics()).toEqual([]);
});

test("rejects malformed raw artifacts without replacing a valid chart", async () => {
	const element = mount({ mode: "light" });
	element.artifact = artifactDocument;
	await flush();

	expect(() => {
		element.artifact = { ...artifactDocument, settings: null };
	}).toThrow("The roadmap artifact does not carry a parsed document.");
	expect(element.generated?.document).toBe(artifactDocument);
});

test("restores zoom when switching storage keys", async () => {
	localStorage.setItem("first:zoom", "1.25");
	localStorage.setItem("second:zoom", "2");
	const element = mount({ "storage-key": "first", mode: "light" });
	element.artifact = artifactDocument;
	await flush();

	element.setAttribute("storage-key", "second");
	await flush();

	expect(element.shadowRoot?.querySelector('[part="zoom-reset"]')?.textContent).toBe("200%");
});

test("reports invalid inline JSON through the error event", async () => {
	const element = document.createElement("roadmap-preview") as RoadmapPreviewElement;
	const script = document.createElement("script");
	script.type = "application/roadmap+json";
	script.textContent = "{invalid";
	element.append(script);
	const errors: unknown[] = [];
	element.addEventListener("roadmap-error", (event) => {
		errors.push((event as CustomEvent<{ error: unknown }>).detail.error);
	});

	document.body.append(element);
	await flush();

	expect(errors).toHaveLength(1);
	expect(errors[0]).toBeInstanceOf(SyntaxError);
	expect(element.generated).toBeUndefined();
});

test("reports render errors and keeps the last working chart interactive", async () => {
	const element = mount({ mode: "light" });
	element.artifact = artifactDocument;
	await flush();
	const handle = element.interactivity;
	const errors: unknown[] = [];
	element.addEventListener("roadmap-error", (event) => {
		errors.push((event as CustomEvent<{ error: unknown }>).detail.error);
	});

	element.setAttribute("theme", "missing-preset");
	await flush();

	expect(errors).toHaveLength(1);
	expect(errors[0]).toEqual(new Error('Unknown roadmap theme preset "missing-preset".'));
	expect(element.interactivity).toBe(handle);
	expect(element.generated?.theme.name).toBe("fun");
});

function part<T extends HTMLElement = HTMLButtonElement>(
	element: RoadmapPreviewElement,
	name: string,
): T {
	const result = element.shadowRoot?.querySelector<T>(`[part="${name}"]`);
	if (!result) throw new Error(`Missing part ${name}`);
	return result;
}

test("zoom clamps to both limits, resets to fit and works without a chart", async () => {
	const element = mount({ mode: "light" });
	await flush();
	part(element, "zoom-in").click();
	expect(part(element, "zoom-reset").textContent).toBe("125%");
	element.artifact = artifactDocument;
	await flush();
	for (let i = 0; i < 30; i += 1) part(element, "zoom-in").click();
	expect(part(element, "zoom-reset").textContent).toBe("400%");
	for (let i = 0; i < 30; i += 1) part(element, "zoom-out").click();
	expect(part(element, "zoom-reset").textContent).toBe("25%");
	part(element, "zoom-reset").click();
	expect(part(element, "zoom-reset").textContent).toBe("100%");
	expect(
		element.shadowRoot?.querySelector<SVGSVGElement>(".chart-stage > svg")?.style.maxWidth,
	).toBe("100%");
});

test.each(["NaN", "Infinity", "0.1", "5", "bad"])(
	"invalid stored zoom %s falls back to fit",
	async (zoom) => {
		localStorage.setItem("z:zoom", zoom);
		const element = mount({ "storage-key": "z" });
		element.artifact = artifactDocument;
		await flush();
		expect(part(element, "zoom-reset").textContent).toBe("100%");
	},
);

test("denied zoom storage preserves working in-memory controls", async () => {
	vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
		throw new Error("denied");
	});
	vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
		throw new Error("denied");
	});
	const element = mount({ "storage-key": "z" });
	element.artifact = artifactDocument;
	await flush();
	part(element, "zoom-in").click();
	expect(part(element, "zoom-reset").textContent).toBe("125%");
});

test("menu hit testing keeps inside clicks open and dismisses outside clicks and Escape", async () => {
	const element = mount();
	await flush();
	const menu = part(element, "menu");
	const button = part(element, "menu-button");
	vi.spyOn(menu, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 100, 100, 100));
	vi.spyOn(button, "getBoundingClientRect").mockReturnValue(new DOMRect(80, 70, 20, 20));
	button.click();
	for (const [clientX, clientY] of [
		[150, 150],
		[85, 75],
	] as const) {
		document.dispatchEvent(new PointerEvent("pointerdown", { clientX, clientY }));
		expect(menu.hidden).toBe(false);
	}
	document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
	expect(menu.hidden).toBe(false);
	document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
	expect(menu.hidden).toBe(true);
	for (const [clientX, clientY] of [
		[50, 150],
		[250, 150],
		[150, 50],
		[150, 250],
	] as const) {
		button.click();
		document.dispatchEvent(new PointerEvent("pointerdown", { clientX, clientY }));
		expect(menu.hidden).toBe(true);
	}
	button.click();
	document.dispatchEvent(new Event("pointerdown"));
	expect(menu.hidden).toBe(true);
	button.click();
	button.click();
	expect(menu.hidden).toBe(true);
	button.click();
	element.setAttribute("controls", "zoom invalid");
	element.setAttribute("chromeless", "");
	await flush();
	expect(menu.hidden).toBe(true);
	expect(button.hidden).toBe(true);
	expect(part(element, "header").hidden).toBe(true);
});

test.each([404, "invalid JSON", "network"] as const)(
	"source loading reports %s errors",
	async (failure) => {
		const errors: Error[] = [];
		const element = mount();
		element.addEventListener("roadmap-error", (event) =>
			errors.push((event as CustomEvent<{ error: Error }>).detail.error),
		);
		if (failure === "network")
			vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
		else
			vi.spyOn(globalThis, "fetch").mockResolvedValue(
				new Response("invalid", { status: failure === 404 ? 404 : 200 }),
			);
		element.setAttribute("src", "/bad.json");
		await flush();
		expect(errors).toHaveLength(1);
		expect(errors[0]).toBeInstanceOf(Error);
		expect(element.artifact).toBeUndefined();
	},
);

test("refresh and a note renderer replace the chart and preserve explicit interaction opt-out", async () => {
	const element = mount({ mode: "light", spotlight: "" });
	element.artifact = artifactDocument;
	await flush();
	const renderer = (note: string): string => `<em>${note}</em>`;
	element.renderNote = renderer;
	await flush();
	expect(element.renderNote).toBe(renderer);
	element.interactivity?.select(element.interactivity.topics()[0]?.id);
	expect(element.shadowRoot?.querySelector(".roadmap-topic-detail__note em")?.textContent).toBe(
		"A note.",
	);
	const previous = element.generated;
	element.refresh();
	await flush();
	expect(element.generated).not.toBe(previous);
	element.removeAttribute("interactive");
	element.remove();
	document.body.append(element);
	await flush();
	expect(element.interactivity).toBeUndefined();
	expect(
		element.shadowRoot
			?.querySelector(".chart-stage > svg")
			?.classList.contains("roadmap--spotlight"),
	).toBe(true);
});

test("downloads a rendered SVG and releases its object URL", async () => {
	const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
	const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
	const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
	const element = mount();
	await flush();
	part(element, "download-item").click();
	expect(create).not.toHaveBeenCalled();
	element.artifact = artifactDocument;
	await flush();
	part(element, "download-item").click();
	expect(create).toHaveBeenCalledOnce();
	const blob = create.mock.calls[0]?.[0];
	if (!(blob instanceof Blob)) throw new Error("Missing download blob");
	expect(blob.type).toBe("image/svg+xml");
	expect(await blob.text()).toContain('data-roadmap-theme="fun"');
	expect(click).toHaveBeenCalledOnce();
	expect(revoke).toHaveBeenCalledWith("blob:test");
});

test("system appearance follows media changes and detaches on disconnect", async () => {
	const media = matchMedia("(prefers-color-scheme: dark)");
	vi.spyOn(globalThis, "matchMedia").mockReturnValue(media);
	const matches = vi.spyOn(media, "matches", "get").mockReturnValue(true);
	const remove = vi.spyOn(media, "removeEventListener");
	const element = mount({ mode: "system" });
	element.artifact = artifactDocument;
	await flush();
	expect(element.generated?.theme.mode).toBe("dark");
	matches.mockReturnValue(false);
	media.dispatchEvent(new Event("change"));
	await flush();
	expect(element.generated?.theme.mode).toBe("light");
	element.remove();
	expect(remove).toHaveBeenCalledWith("change", expect.any(Function));
});

test("ambient animations sleep outside the viewport and while the document is hidden", async () => {
	let deliver: IntersectionObserverCallback | undefined;
	let observed: IntersectionObserver | undefined;
	const observe = vi.fn();
	const disconnect = vi.fn();
	vi.spyOn(globalThis, "IntersectionObserver").mockImplementation(
		class {
			readonly root = null;
			readonly rootMargin = "0px";
			readonly scrollMargin = "0px";
			readonly thresholds = [0];
			observe = observe;
			disconnect = disconnect;
			unobserve = vi.fn();
			takeRecords = (): IntersectionObserverEntry[] => [];
			constructor(callback: IntersectionObserverCallback) {
				deliver = callback;
				observed = this;
			}
		},
	);
	const element = mount();
	await flush();
	const canvas = part(element, "canvas");
	expect(observe).toHaveBeenCalledWith(element);
	if (!deliver || !observed) throw new Error("Missing observer");
	const entry = {
		isIntersecting: false,
		boundingClientRect: new DOMRect(),
		intersectionRect: new DOMRect(),
		intersectionRatio: 0,
		rootBounds: null,
		target: element,
		time: 0,
	};
	deliver([entry], observed);
	expect(canvas.classList.contains("canvas--asleep")).toBe(true);
	deliver([{ ...entry, isIntersecting: true }], observed);
	expect(canvas.classList.contains("canvas--asleep")).toBe(false);
	const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
	document.dispatchEvent(new Event("visibilitychange"));
	expect(canvas.classList.contains("canvas--asleep")).toBe(true);
	hidden.mockReturnValue(false);
	deliver([], observed);
	expect(canvas.classList.contains("canvas--asleep")).toBe(false);
	element.remove();
	expect(disconnect).toHaveBeenCalledOnce();
});

test.each(["measurable", "broken", "empty"] as const)(
	"animated decorations handle %s SVG geometry",
	async (geometry) => {
		vi.spyOn(SVGGraphicsElement.prototype, "getBoundingClientRect").mockImplementation(function (
			this: SVGGraphicsElement,
		) {
			if (this.tagName === "svg") return new DOMRect(0, 0, 800, 1200);
			return geometry === "empty" ? new DOMRect() : new DOMRect(20, 50, 40, 40);
		});
		vi.spyOn(SVGGraphicsElement.prototype, "getBBox").mockImplementation(() => {
			if (geometry === "broken") throw new Error("Detached artwork");
			return new DOMRect(-24, -24, 48, 48);
		});
		const element = mount({ mode: "light" });
		element.removeAttribute("interactive");
		element.artifact = generateRoadmap(`---
roadmap:
  background:
    enabled: true
    animated: true
    density: 1
---
# Animated

* Chapter
  * Topic
`).document;
		await flush();
		const stage = element.shadowRoot?.querySelector(".chart-stage");
		expect(stage?.classList.contains("chart-stage--lifted")).toBe(geometry === "measurable");
		if (geometry === "measurable") {
			const lifted = stage?.querySelectorAll<SVGSVGElement>(".chart-artifact-layer > svg");
			expect(lifted?.length).toBeGreaterThan(0);
			for (const mini of lifted ?? []) {
				expect(mini.getAttribute("viewBox")).toBe("-24 -24 48 48");
				expect(mini.style.width).toBe("5%");
				expect(mini.firstElementChild?.hasAttribute("transform")).toBe(false);
			}
		} else expect(stage?.querySelector(".chart-artifact-layer")).toBeNull();
	},
);
