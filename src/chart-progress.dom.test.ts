// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from "vitest";
import { attachRoadmapInteractivity } from "./interactive.ts";

afterEach(() => document.body.replaceChildren());

function mount({ gradient = false, broken = false, spine = true } = {}): SVGSVGElement {
	const source = `<svg xmlns="http://www.w3.org/2000/svg" data-roadmap-instance="p" aria-label="Progress">
	${gradient ? '<defs><linearGradient id="p-connector-spine-gradient"/></defs>' : ""}
	${spine ? '<path class="roadmap__connector roadmap__connector--spine" d="M 50 0 L 50 90"/><path class="roadmap__connector roadmap__connector--spine" d="M 50 110 L 50 150"/><path class="roadmap__connector roadmap__connector--spine" d="M 50 150 L 50 190"/>' : ""}
	<g class="roadmap__node roadmap__node--heading" data-box="40 0 20 20"><text>Title</text></g>
	<g class="roadmap__node" data-roadmap-element="chapter" data-box="30 90 40 20"><text>One</text></g>
	<g id="p-a" class="roadmap__node" data-roadmap-element="topic" data-box="100 115 30 20"><text>A</text></g>
	<g id="p-b" class="roadmap__node" data-roadmap-element="topic" data-box="0 140 30 20"><text>B</text></g>
	<g class="roadmap__node" data-roadmap-element="chapter" data-box="30 190 40 20"><text>Two</text></g>
	<g id="p-c" class="roadmap__node" data-roadmap-element="topic" data-box="100 215 30 20"><text>C</text></g>
	<g class="roadmap__node" data-roadmap-element="chapter" data-box="30 290 40 20"><text>Empty</text></g>
	${broken ? '<g id="p-unmeasurable" class="roadmap__node" data-roadmap-element="topic"><text>Detached metrics</text></g>' : ""}
	</svg>`;
	const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
	document.body.append(document.importNode(parsed.documentElement, true));
	const svg = document.querySelector("svg");
	if (!svg) throw new Error("No fixture");
	vi.spyOn(SVGGraphicsElement.prototype, "getBBox").mockImplementation(function (
		this: SVGGraphicsElement,
	) {
		if (this.tagName === "text") return new DOMRect(0, 0, 10, 10);
		const value = this.getAttribute("data-box");
		if (!value) throw new Error("No metrics");
		const [x, y, width, height] = value.split(" ").map(Number);
		return new DOMRect(x, y, width, height);
	});
	vi.spyOn(SVGPathElement.prototype, "getTotalLength").mockImplementation(function (
		this: SVGPathElement,
	) {
		const values = this.getAttribute("d")?.match(/\d+/gu)?.map(Number) ?? [];
		return (values[3] ?? 0) - (values[1] ?? 0);
	});
	vi.spyOn(SVGPathElement.prototype, "getPointAtLength").mockImplementation(function (
		this: SVGPathElement,
		distance: number,
	) {
		const values = this.getAttribute("d")?.match(/\d+/gu)?.map(Number) ?? [];
		return new DOMPoint(values[0] ?? 0, (values[1] ?? 0) + distance);
	});
	return svg;
}

test.each([false, true])(
	"journey progress remains contiguous and restores empty visuals (gradient=%s)",
	(gradient) => {
		const svg = mount({ gradient, broken: true });
		const handle = attachRoadmapInteractivity(svg, { storage: null, summary: false });
		const cores = [...svg.querySelectorAll<SVGPathElement>(".roadmap__progress-ink--core")];
		const stations = [...svg.querySelectorAll<SVGGElement>(".roadmap__progress-station")];
		expect(cores).toHaveLength(3);
		expect(stations).toHaveLength(3);
		expect(cores.every((core) => core.style.display === "none")).toBe(true);
		expect(cores[0]?.style.stroke).toBe(gradient ? "url(#p-connector-spine-gradient)" : "");
		handle.setState("c", "done");
		expect(cores[0]?.getAttribute("stroke-dasharray")).toBe("100 100");
		expect(cores[1]?.style.display).toBe("none");
		expect(stations[1]?.style.display).toBe("");
		handle.setState("a", "in-progress");
		expect(stations[0]?.querySelector(".station-arc")?.getAttribute("stroke-dasharray")).toBe(
			"25 100",
		);
		handle.setState("a", "done");
		handle.setState("b", "skipped");
		handle.setState("unmeasurable", "done");
		expect(cores.every((core) => core.getAttribute("stroke-dasharray") === "100 100")).toBe(true);
		expect(svg.querySelector("#p-a")?.classList.contains("roadmap__progress-passed")).toBe(true);
		expect(stations[0]?.querySelector<SVGElement>(".station-tick")?.style.display).toBe("");
		expect(stations[2]?.style.display).toBe("none");
		expect(svg.outerHTML).not.toMatch(/translate\([^)]*(?:NaN|Infinity)/u);
		handle.reset();
		expect(cores.every((core) => core.style.display === "none")).toBe(true);
		expect(svg.querySelectorAll(".roadmap__progress-passed")).toHaveLength(0);
		handle.dispose();
		expect(
			svg.querySelectorAll(".roadmap__progress-ink,.roadmap__progress-station,#p-progress-memory"),
		).toHaveLength(0);
	},
);

test("chapters without inbound spines never emit invalid station positions", () => {
	const svg = mount({ spine: false });
	const handle = attachRoadmapInteractivity(svg, { storage: null, summary: false });
	handle.setState("a", "done");
	const stations = [...svg.querySelectorAll<SVGGElement>(".roadmap__progress-station")];
	expect(stations).toHaveLength(3);
	expect(
		stations.every(
			(station) => station.style.display === "none" && !station.hasAttribute("transform"),
		),
	).toBe(true);
	handle.dispose();
});
