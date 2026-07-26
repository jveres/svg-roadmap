// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from "vitest";
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
		expect(svg.querySelectorAll("[tabindex]").length).toBeGreaterThan(0);
		handle.dispose();
		expect(svg.classList.contains("roadmap--interactive")).toBe(false);
		expect(svg.querySelectorAll("[tabindex]").length).toBe(0);
		expect(svg.querySelectorAll("[role='button']").length).toBe(0);
	});

	test("selection callbacks fire on select and clear", () => {
		const seen: (string | undefined)[] = [];
		const handle = attachRoadmapInteractivity(mountChart(), {
			storage: null,
			summary: false,
			onSelect: (detail) => seen.push(detail?.id),
		});
		const id = handle.topics()[0]?.id ?? "";
		handle.select(id);
		handle.select(undefined);
		expect(seen).toEqual([id, undefined]);
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
