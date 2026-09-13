// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from "vitest";
import { generateRoadmap } from "./index.ts";
import { attachRoadmapSpotlight } from "./interactive.ts";

const cleanups: (() => void)[] = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
	vi.useRealTimers();
	document.body.replaceChildren();
});

function mount(
	source = `* First chapter
*A chapter description.*
  * Parent
    * Child
      * Grandchild
    * Sibling
  * Other branch
    * Remote

* Second chapter
  * Elsewhere
`,
): SVGSVGElement {
	const { svg } = generateRoadmap(source, { render: { idPrefix: "spot" } });
	const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
	document.body.replaceChildren(document.importNode(parsed.documentElement, true));
	const chart = document.querySelector("svg");
	if (!chart) throw new Error("chart missing");
	cleanups.push(attachRoadmapSpotlight(chart));
	return chart;
}

function node(svg: SVGSVGElement, text: string): SVGGElement {
	const match = [...svg.querySelectorAll<SVGGElement>("g.roadmap__node")].find(
		(element) =>
			[...element.querySelectorAll("text")]
				.map((part) => part.textContent)
				.join("")
				.trim() === text,
	);
	if (!match) throw new Error(`node missing: ${text}`);
	return match;
}

function hover(element: Element, pointerType = "mouse"): void {
	element.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType }));
}

function lit(element: Element): boolean {
	return element.classList.contains("roadmap__node--lit");
}

test("lights descendants, ancestors and chapter context without lighting siblings", () => {
	const svg = mount();
	hover(node(svg, "Child"));
	for (const title of [
		"First chapter",
		"A chapter description.",
		"Parent",
		"Child",
		"Grandchild",
	]) {
		expect(lit(node(svg, title)), title).toBe(true);
	}
	for (const title of ["Sibling", "Other branch", "Remote", "Second chapter", "Elsewhere"]) {
		expect(lit(node(svg, title)), title).toBe(false);
	}
	expect(svg.querySelectorAll(".roadmap__connector--dim").length).toBeGreaterThan(0);
	expect(svg.querySelectorAll(".roadmap__group--dim").length).toBeGreaterThan(0);
	// A second event on a text child keeps the same scope.
	hover(node(svg, "Child").querySelector("text") ?? node(svg, "Child"));
	expect(lit(node(svg, "Grandchild"))).toBe(true);
});

test("hovering the chapter description selects its whole chapter", () => {
	const svg = mount();
	hover(node(svg, "A chapter description."));
	for (const title of ["First chapter", "Child", "Sibling", "Remote"])
		expect(lit(node(svg, title))).toBe(true);
	expect(lit(node(svg, "Elsewhere"))).toBe(false);
});

test("bridges gaps briefly, cancels the pending clear on reentry, and clears on mouse leave", () => {
	vi.useFakeTimers();
	const svg = mount();
	hover(svg);
	expect(svg.classList.contains("roadmap--spotlight-lit")).toBe(false);
	hover(node(svg, "Child"));
	hover(svg);
	hover(svg);
	vi.advanceTimersByTime(249);
	expect(lit(node(svg, "Child"))).toBe(true);
	hover(node(svg, "Child"));
	vi.advanceTimersByTime(500);
	expect(lit(node(svg, "Child"))).toBe(true);
	hover(svg);
	vi.advanceTimersByTime(250);
	expect(svg.classList.contains("roadmap--spotlight-lit")).toBe(false);
	hover(node(svg, "Sibling"));
	svg.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
	expect(svg.querySelectorAll(".roadmap__node--lit")).toHaveLength(0);
});

test("keeps touch selection and in-scope boards lit until another scope is touched", () => {
	vi.useFakeTimers();
	const svg = mount();
	const parent = node(svg, "Parent");
	hover(parent, "touch");
	svg.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "touch" }));
	const board = svg.querySelector(`[id="${parent.id}-children"]`);
	if (!board) throw new Error("child board missing");
	hover(svg);
	hover(board);
	vi.advanceTimersByTime(500);
	expect(lit(node(svg, "Child"))).toBe(true);
	hover(node(svg, "Elsewhere"), "touch");
	expect(lit(node(svg, "Child"))).toBe(false);
	expect(lit(node(svg, "Second chapter"))).toBe(true);
});

test("grid rails preserve the route to a later sibling without lighting earlier stubs", () => {
	const svg = mount(`* Chapter
  + Column
    * Parent
      * First
      * Last
        * Leaf
  + Other column
    * Other
`);
	hover(node(svg, "Leaf"));
	expect(lit(node(svg, "Column"))).toBe(true);
	expect(lit(node(svg, "Last"))).toBe(true);
	expect(lit(node(svg, "First"))).toBe(false);
	const lastId = node(svg, "Last").id;
	const firstId = node(svg, "First").id;
	expect(
		svg.querySelector(`[id="${lastId}-grid-link"]`)?.classList.contains("roadmap__connector--dim"),
	).toBe(false);
	expect(
		svg.querySelector(`[id="${firstId}-grid-link"]`)?.classList.contains("roadmap__connector--dim"),
	).toBe(true);
	hover(node(svg, "Other column"));
	expect(lit(node(svg, "Other"))).toBe(true);
	expect(lit(node(svg, "Leaf"))).toBe(false);
});

test("disposal cancels pending work, removes decorations and detaches pointer handling", () => {
	vi.useFakeTimers();
	const svg = mount();
	hover(node(svg, "Child"));
	hover(svg);
	cleanups.pop()?.();
	vi.runAllTimers();
	hover(node(svg, "Child"));
	expect(svg.classList.contains("roadmap--spotlight")).toBe(false);
	expect(
		svg.querySelectorAll(".roadmap__node--lit,.roadmap__connector--dim,.roadmap__group--dim"),
	).toHaveLength(0);
});
