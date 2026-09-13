// @vitest-environment happy-dom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { generateRoadmap } from "./index.ts";
import { attachRoadmapInteractivity } from "./interactive.ts";

const source = `# Chart

* Chapter
  + Column one
    * Alpha
    * Beta
  * Column two
    * Gamma
`;

function mountChart(markdown = source): SVGSVGElement {
	const { svg } = generateRoadmap(markdown, { render: { idPrefix: "t" } });
	// happy-dom's innerHTML drops SVG children; DOMParser keeps them.
	const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
	document.body.replaceChildren(document.importNode(parsed.documentElement, true));
	const element = document.querySelector("svg");
	if (!element) throw new Error("chart did not mount");
	// happy-dom lacks SVG text metrics; the interactive layer only needs
	// getBBox for done-strike overlays.
	(element as unknown as { getBBox?: () => DOMRect }).getBBox ??= () => new DOMRect(0, 0, 10, 10);
	for (const text of element.querySelectorAll("text")) {
		(text as unknown as { getBBox: () => DOMRect }).getBBox = () => new DOMRect(0, 0, 10, 10);
	}
	return element as unknown as SVGSVGElement;
}

class MemoryStorage implements Storage {
	#data = new Map<string, string>();
	get length(): number {
		return this.#data.size;
	}
	clear(): void {
		this.#data.clear();
	}
	getItem(key: string): string | null {
		return this.#data.get(key) ?? null;
	}
	key(index: number): string | null {
		return [...this.#data.keys()][index] ?? null;
	}
	removeItem(key: string): void {
		this.#data.delete(key);
	}
	setItem(key: string, value: string): void {
		this.#data.set(key, value);
	}
}

describe("interactive progress integrity", () => {
	beforeEach(() => {
		document.body.replaceChildren();
	});

	test("stale stored ids are pruned so totals cannot exceed the chart", () => {
		// Learn a real stable id first; ids carry a document sequence number.
		const scout = attachRoadmapInteractivity(mountChart(), { storage: null, summary: false });
		const knownId = scout.topics()[0]?.id ?? "";
		scout.dispose();
		const storage = new MemoryStorage();
		storage.setItem(
			"k",
			JSON.stringify({
				[knownId]: "done",
				"topic-999-ghost": "done",
				"topic-998-gone": "in-progress",
			}),
		);
		const handle = attachRoadmapInteractivity(mountChart(), {
			storageKey: "k",
			storage,
			summary: false,
		});
		expect(Object.keys(handle.states)).toEqual([knownId]);
		const summary = handle.getSummary();
		expect(summary.counts.done).toBeLessThanOrEqual(summary.total);
		// The pruned map is what storage keeps.
		expect(JSON.parse(storage.getItem("k") ?? "{}")).toEqual({ [knownId]: "done" });
		handle.dispose();
	});

	test("setState ignores unknown and header ids", () => {
		const handle = attachRoadmapInteractivity(mountChart(), {
			storage: null,
			summary: false,
		});
		handle.setState("topic-999-ghost", "done");
		const header = handle.headers()[0];
		if (header) handle.setState(header.id, "done");
		expect(Object.keys(handle.states)).toEqual([]);
		expect(handle.getSummary().counts.done).toBe(0);
		handle.dispose();
	});

	test("state survives a round trip through storage for known topics", () => {
		const storage = new MemoryStorage();
		const first = attachRoadmapInteractivity(mountChart(), {
			storageKey: "k",
			storage,
			summary: false,
		});
		const id = first.topics()[0]?.id ?? "";
		first.setState(id, "in-progress");
		first.dispose();
		const second = attachRoadmapInteractivity(mountChart(), {
			storageKey: "k",
			storage,
			summary: false,
		});
		expect(second.getState(id)).toBe("in-progress");
		second.dispose();
	});

	test("dispose removes listeners, classes, and injected descs", () => {
		const svg = mountChart();
		const handle = attachRoadmapInteractivity(svg, { storage: null, summary: false });
		expect(svg.classList.contains("roadmap--interactive")).toBe(true);
		expect(svg.getAttribute("role")).toBe("group");
		expect(svg.querySelectorAll("[tabindex]").length).toBeGreaterThan(0);
		handle.dispose();
		expect(svg.classList.contains("roadmap--interactive")).toBe(false);
		expect(svg.getAttribute("role")).toBe("img");
		expect(svg.querySelectorAll("[tabindex]").length).toBe(0);
		expect(svg.querySelectorAll("[role='button']").length).toBe(0);
	});

	test("selection callbacks fire on select and clear", () => {
		const seen: (string | undefined)[] = [];
		const ranges: (string | undefined)[] = [];
		const handle = attachRoadmapInteractivity(mountChart(), {
			storage: null,
			summary: false,
			onSelect: (detail) => {
				seen.push(detail?.id);
				// The detail carries the node's authored source location so a
				// host can jump its editor to the clicked topic.
				ranges.push(
					detail?.sourceRange
						? `${detail.sourceRange.start.line}:${detail.sourceRange.start.column}`
						: undefined,
				);
			},
		});
		const id = handle.topics()[0]?.id ?? "";
		handle.select(id);
		handle.select(undefined);
		expect(seen).toEqual([id, undefined]);
		expect(ranges[0]).toMatch(/^\d+:\d+$/u);
		handle.dispose();
	});

	test("milestones report reach progress and light up when cleared", () => {
		const svg = mountChart(`* Chapter one
  * Alpha
  * Beta

---
*Halfway.*

* Chapter two
  * Gamma
`);
		const handle = attachRoadmapInteractivity(svg, { storage: null, summary: false });
		const station = svg.querySelector('[data-roadmap-element="milestone"]');
		if (!station) throw new Error("Milestone station not rendered");

		let [status] = handle.milestones();
		expect(status).toMatchObject({ title: "Halfway.", reached: false, total: 2, remaining: 2 });

		const [alpha, beta] = handle
			.topics()
			.filter((topic) => topic.kind === "topic")
			.map((topic) => topic.id);
		if (!alpha || !beta) throw new Error("Fixture topics missing");
		handle.setState(alpha, "done");
		handle.setState(beta, "skipped");
		[status] = handle.milestones();
		// Done and skipped both clear the way; the station lights up.
		expect(status).toMatchObject({ reached: true, remaining: 0 });
		expect(station.classList.contains("roadmap__milestone--reached")).toBe(true);

		handle.setState(alpha, undefined);
		expect(station.classList.contains("roadmap__milestone--reached")).toBe(false);
		handle.dispose();
	});

	test("a throwing storage backend degrades to in-memory tracking", () => {
		const storage = new MemoryStorage();
		storage.setItem = () => {
			throw new Error("denied");
		};
		const handle = attachRoadmapInteractivity(mountChart(), {
			storageKey: "k",
			storage,
			summary: false,
		});
		const id = handle.topics()[0]?.id ?? "";
		handle.setState(id, "done");
		expect(handle.getState(id)).toBe("done");
		handle.dispose();
	});
});

test("updates the selected topic's progress control after an API change", () => {
	const handle = attachRoadmapInteractivity(mountChart(), { storage: null });
	const id = handle.topics()[0]?.id;
	if (!id) throw new Error("fixture topic missing");
	handle.select(id);

	handle.setState(id, "done");

	expect(document.querySelector<HTMLSelectElement>(".roadmap-topic-detail__state")?.value).toBe(
		"done",
	);
	expect(handle.getTopic(id)?.state).toBe("done");
	handle.dispose();
});

function required<T extends Element>(root: ParentNode, selector: string): T {
	const element = root.querySelector<T>(selector);
	if (!element) throw new Error(`Missing ${selector}`);
	return element;
}

test.each(["top-left", "bottom-right"] as const)(
	"panel drag and resize persist at %s and honor size bounds",
	(position) => {
		const storage = new MemoryStorage();
		const handle = attachRoadmapInteractivity(mountChart(), {
			storage,
			storageKey: "panel",
			summary: { position },
		});
		const panel = handle.summaryElement;
		if (!panel) throw new Error("Missing summary");
		const top = required<HTMLElement>(panel, ".roadmap-progress-summary__top");
		const grip = required<HTMLElement>(panel, ".roadmap-progress-summary__resize");
		top.setPointerCapture = vi.fn();
		grip.setPointerCapture = vi.fn();
		const pointer = (target: HTMLElement, type: string, x: number, y: number, button = 0): void => {
			target.dispatchEvent(
				new PointerEvent(type, {
					bubbles: true,
					cancelable: true,
					pointerId: 1,
					clientX: x,
					clientY: y,
					button,
				}),
			);
		};
		pointer(top, "pointerdown", 0, 0, 2);
		pointer(top, "pointermove", 50, 40);
		expect(panel.style.transform).toBe("");
		pointer(required(panel, "button"), "pointerdown", 0, 0);
		expect(top.setPointerCapture).not.toHaveBeenCalled();
		pointer(top, "pointerdown", 10, 10);
		pointer(top, "pointerdown", 200, 200);
		pointer(top, "pointermove", 40, 60);
		pointer(top, "pointerup", 40, 60);
		expect(panel.style.transform).toBe(
			`translate(30px, 50px)${position.startsWith("bottom") ? " translateY(-100%)" : ""}`,
		);
		expect(JSON.parse(storage.getItem("panel:panel") ?? "null")).toEqual({ x: 30, y: 50 });
		vi.spyOn(panel, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 220, 200));
		pointer(grip, "pointerdown", 0, 0, 2);
		expect(grip.setPointerCapture).not.toHaveBeenCalled();
		pointer(grip, "pointerdown", 0, 0);
		pointer(grip, "pointermove", 1000, 1000);
		expect(panel.style.width).toBe("560px");
		expect(panel.style.height).toBe("920px");
		pointer(grip, "pointermove", -1000, -1000);
		pointer(grip, "pointercancel", -1000, -1000);
		expect(panel.style.width).toBe("176px");
		expect(panel.style.height).toBe("120px");
		const expectedX = position.endsWith("right") ? -14 : 30;
		expect(JSON.parse(storage.getItem("panel:panel") ?? "null")).toEqual({
			x: expectedX,
			y: 50,
			width: 176,
			height: 120,
		});
		panel.scrollTop = 30;
		panel.dispatchEvent(new Event("scroll"));
		expect(grip.style.bottom).toBe("-29px");
		grip.dispatchEvent(new MouseEvent("dblclick"));
		expect(panel.style.width).toBe("");
		expect(panel.style.height).toBe("");
		expect(JSON.parse(storage.getItem("panel:panel") ?? "null")).toEqual({ x: expectedX, y: 50 });
		handle.dispose();
		expect(document.querySelector(".roadmap-progress-summary-anchor")).toBeNull();
	},
);

test.each(["invalid", "null", '{"x":"bad","y":15,"width":240,"height":160}'])(
	"stored panel placement tolerates %s",
	(raw) => {
		const storage = new MemoryStorage();
		storage.setItem("p", raw);
		storage.setItem("p:panel", raw);
		const handle = attachRoadmapInteractivity(mountChart(), { storage, storageKey: "p" });
		expect(handle.states).toEqual({});
		expect(handle.summaryElement?.style.height).toBe(raw.startsWith("{") ? "160px" : "");
		expect(handle.summaryElement?.style.transform).toBe(
			raw.startsWith("{") ? "translate(0px, 15px)" : "",
		);
		handle.dispose();
	},
);

test("selected columns track their members and reset clears visuals, storage and detail", () => {
	const storage = new MemoryStorage();
	const onChange = vi.fn();
	const onReset = vi.fn();
	const svg = mountChart();
	const handle = attachRoadmapInteractivity(svg, {
		storage,
		storageKey: "states",
		onChange,
		onReset,
	});
	const header = handle.headers()[0];
	const topic = handle.topics()[0];
	if (!header || !topic) throw new Error("Missing topics");
	handle.select(header.id);
	expect(required(document, ".roadmap-topic-detail__column b").textContent).toBe("0 / 2");
	handle.setState(topic.id, "done");
	expect(required(document, ".roadmap-topic-detail__column b").textContent).toBe("1 / 2");
	expect(required<HTMLElement>(document, ".roadmap-topic-detail__column-bar i").style.width).toBe(
		"50%",
	);
	expect(svg.querySelectorAll(".roadmap__progress-strike line")).toHaveLength(1);
	expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: topic.id, state: "done" }));
	handle.select(topic.id);
	const select = required<HTMLSelectElement>(document, ".roadmap-topic-detail__state");
	select.value = "";
	select.dispatchEvent(new Event("change"));
	expect(handle.getState(topic.id)).toBeUndefined();
	expect(svg.querySelectorAll(".roadmap__progress-strike")).toHaveLength(0);
	required<HTMLSelectElement>(document, ".roadmap-topic-detail__state").value = "in-progress";
	required(document, ".roadmap-topic-detail__state").dispatchEvent(new Event("change"));
	expect(handle.getState(topic.id)).toBe("in-progress");
	required<HTMLButtonElement>(document, ".roadmap-progress-summary__reset").click();
	expect(handle.states).toEqual({});
	expect(storage.getItem("states")).toBe("{}");
	expect(onReset).toHaveBeenCalledOnce();
	expect(required<HTMLSelectElement>(document, ".roadmap-topic-detail__state").value).toBe("");
	handle.select(undefined);
	handle.select(undefined);
	handle.select("missing");
	expect(document.querySelector(".roadmap-topic-detail")).toBeNull();
	expect(handle.getTopic("missing")).toBeUndefined();
	handle.dispose();
});

test.each([true, false])("keyboard and mouse links respect interceptLinks=%s", (interceptLinks) => {
	const svg = mountChart("* Chapter\n  * [Resource](https://example.com)\n  * Plain\n");
	const handle = attachRoadmapInteractivity(svg, { storage: null, interceptLinks, onChart: false });
	const group = required<SVGGElement>(svg, '[data-roadmap-element="topic"]');
	const anchor = required<SVGAElement>(group, "a");
	const click = new MouseEvent("click", { bubbles: true, cancelable: true });
	anchor.dispatchEvent(click);
	expect(click.defaultPrevented).toBe(interceptLinks);
	expect(handle.selectedId).toBe(interceptLinks ? handle.topics()[0]?.id : undefined);
	handle.select(undefined);
	const activation = vi.fn();
	anchor.addEventListener("click", activation);
	group.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	expect(handle.selectedId).toBeUndefined();
	group.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
	);
	expect(activation).toHaveBeenCalledTimes(interceptLinks ? 0 : 1);
	group.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
	expect(handle.selectedId).toBe(handle.topics()[0]?.id);
	const link = required<HTMLAnchorElement>(document, ".roadmap-topic-detail__link");
	expect(link.href).toBe("https://example.com/");
	expect(link.rel).toBe("noopener noreferrer");
	expect(link.target).toBe("_blank");
	handle.dispose();
	expect(anchor.getAttribute("tabindex")).toBeNull();
});

test.each(["plain", "html", "node"] as const)(
	"topic notes use %s rendering and expose accessible descriptions",
	(rendering) => {
		const svg = mountChart("* Chapter\n  * Topic\n    > **Useful** note.\n");
		const group = required<SVGGElement>(svg, '[data-roadmap-element="topic"]');
		group.setAttribute("data-tags", "unknown");
		const definition = document.createElementNS("http://www.w3.org/2000/svg", "title");
		definition.textContent = "Term definition";
		group.append(definition, definition.cloneNode(true));
		const handle = attachRoadmapInteractivity(svg, {
			storage: null,
			...(rendering === "plain"
				? {}
				: {
						renderNote: () => {
							if (rendering === "html") return "<strong>Useful</strong> note.";
							const node = document.createElement("em");
							node.textContent = "Useful note.";
							return node;
						},
					}),
		});
		handle.select(handle.topics()[0]?.id);
		expect(required(group, "desc").textContent).toBe("Useful note.");
		const note = required(document, ".roadmap-topic-detail__note");
		expect(note.textContent).toBe(rendering === "plain" ? "**Useful** note." : "Useful note.");
		expect(note.children.length).toBe(rendering === "plain" ? 0 : 1);
		expect(document.querySelectorAll(".roadmap-topic-detail__definition")).toHaveLength(1);
		expect(required(document, ".roadmap-topic-detail__tag--plain").textContent).toBe("unknown");
		handle.dispose();
		expect(group.querySelector("desc")).toBeNull();
	},
);

test("selection-only mode creates no progress surfaces", () => {
	const svg = mountChart();
	const handle = attachRoadmapInteractivity(svg, { storage: null, progress: false });
	handle.select(handle.topics()[0]?.id);
	expect(handle.selectedId).toBe(handle.topics()[0]?.id);
	expect(handle.summaryElement).toBeUndefined();
	expect(svg.querySelector(".roadmap__chart-progress")).toBeNull();
	handle.dispose();
});

test.each([true, false])("detail tags reuse themed artwork with legend=%s", (legend) => {
	const svg = mountChart(`---
roadmap:
  legend: ${legend}
  tags:
    custom:
      icon: [heart, check]
      accent: [red, green]
---
A [custom] label.

* Chapter
  * Topic [custom]
`);
	const handle = attachRoadmapInteractivity(svg, { storage: null });
	handle.select(handle.topics()[0]?.id);
	const chip = required(document, ".roadmap-topic-detail__tag");
	expect(chip.textContent).toBe("custom");
	expect(chip.classList.contains("roadmap-topic-detail__tag--plain")).toBe(false);
	const discs = [...chip.querySelectorAll("svg")];
	expect(discs).toHaveLength(legend ? 2 : 1);
	for (const disc of discs) {
		expect(disc.getAttribute("viewBox")).toMatch(/^-1 -1 [\d.]+ [\d.]+$/u);
		expect(disc.firstElementChild?.getAttribute("transform")).toBeNull();
		expect(disc.getAttribute("aria-hidden")).toBe("true");
	}
	handle.dispose();
});

test("shadow-hosted charts share one style sheet and refresh stale styles", () => {
	const svg = mountChart();
	const host = document.createElement("div");
	document.body.append(host);
	const root = host.attachShadow({ mode: "open" });
	root.append(svg);
	let handle = attachRoadmapInteractivity(svg, { storage: null, summary: false });
	const style = required(root, "style#svg-roadmap-interactive-style");
	const expected = style.textContent;
	handle.dispose();
	style.textContent = "stale";
	handle = attachRoadmapInteractivity(svg, { storage: null, summary: false });
	expect(style.textContent).toBe(expected);
	expect(root.querySelectorAll("style#svg-roadmap-interactive-style")).toHaveLength(1);
	handle.dispose();
});
