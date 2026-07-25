import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { paintedNodeFrameRectangle } from "./core/frames.ts";
import { setMeasurementProvider } from "./core/inline.ts";
import { generateRoadmap } from "./index.ts";
import type {
	LayoutConnector,
	LayoutGroup,
	LayoutLegend,
	LayoutNode,
	Point,
	Rect,
	RoadmapLayout,
} from "./types.ts";

/**
 * Layout invariants: whatever the document shape and theme, the generated
 * layout must stay free of unwanted occlusion. Containment (a board holding
 * its member cards) is legitimate; partial overlaps and covered connectors
 * are not.
 */

const presets = ["fun", "sci-fi", "rose", "print", "pro", "retro", "arcade", "ascii"] as const;

const wideWord = "Superlongunbreakablelabelwithoutanyspacesatall";
const filler = Array.from({ length: 28 }, (_, index) => `word${index}`).join(" ");

const documents: Record<string, string> = {
	"demo sweep": readFileSync(new URL("../demo/sweep.md", import.meta.url), "utf8"),
	"demo ai architect": readFileSync(new URL("../demo/ai-architect.md", import.meta.url), "utf8"),
	// A tall tree-chapter description forces the chapter connectors' mid-runs
	// to clear it — the run must not graze the note border after marker trim.
	"demo sweep tall description": readFileSync(
		new URL("../demo/sweep.md", import.meta.url),
		"utf8",
	).replace(
		/\*:beginner: \[Software Engineers\][^\n]*\*/u,
		`*:beginner: [Software Engineers](https://en.wikipedia.org/wiki/Software_engineering) strive for better **quality** and favour things ${filler} like [Software Craftsmanship](https://manifesto.softwarecraftsmanship.org/) and [12factors](https://12factor.net/). Engineering decisions drive ==_how_== to create.*`,
	),
	minimal: "# Tiny\n\n* Chapter\n  * Topic\n",
	"deep nesting": `# Deep

* Chapter
  * Level one
    * Level two
      * Level three
        * Level four
          * Level five
            * Level six
`,
	"wide grid": `# Wide

* Chapter one
${["Alpha", "Beta", "Gamma", "Delta"]
	.map(
		(header) =>
			`  + ${header} heading\n${Array.from(
				{ length: 8 },
				(_, index) => `    * ${header} item number ${index} [recommended]`,
			).join("\n")}`,
	)
	.join("\n")}
`,
	"tall tree description": `# Tall

* Chapter one
${["Alpha", "Beta", "Gamma", "Delta"]
	.map(
		(header) =>
			`  + ${header} wide heading\n${Array.from(
				{ length: 4 },
				(_, index) => `    * ${header} grid item ${index}`,
			).join("\n")}`,
	)
	.join("\n")}

* Chapter two
*A very long chapter description ${filler} ${filler} ${filler} ${filler} that wraps onto many many lines before the topics start.*
  * Gamma
    * Nested one
    * Nested two
  * Delta
    * Nested three
`,
	"wide corridor children": `# Corridor

* Chapter
  * First topic
    * ${wideWord}
    * Another wide child label here
  * Second topic
    * ${wideWord} extended even further
  * Third topic
    * Deep child
`,
	"many chapters": `# Many

${Array.from(
	{ length: 8 },
	(_, index) => `* Chapter number ${index}
*Description for chapter number ${index} with some **rich** text.*
  * Topic A${index}
    * Child A${index}
  * Topic B${index}
    * Child B${index}
`,
).join("\n")}
## Closing heading
`,
	"notes and headings only": `# Only prose

A standalone floating note paragraph that wraps across a couple of lines to gain height.

## Section heading

Another floating note after the section heading.
`,
	"unbreakable labels": `# Unbreakable

* ${wideWord}
  * ${wideWord}
    * ${wideWord}
`,
	"tags everywhere": `# Tags

* Chapter [insightful]
  + Header [recommended]
    * Item one [personal recommendation]
    * Item two [warning]
  * Tree topic [personal favourite]
    * Child [cloud service]
`,
};

function nodePaintRect(node: LayoutNode): Rect {
	return node.kind === "note" ? paintedNodeFrameRectangle(node) : node;
}

function overlapArea(a: Rect, b: Rect): number {
	const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
	const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
	return width > 0 && height > 0 ? width * height : 0;
}

function contains(outer: Rect, inner: Rect, tolerance: number): boolean {
	return (
		inner.x >= outer.x - tolerance &&
		inner.y >= outer.y - tolerance &&
		inner.x + inner.width <= outer.x + outer.width + tolerance &&
		inner.y + inner.height <= outer.y + outer.height + tolerance
	);
}

function pointInRect(point: Point, rect: Rect, tolerance = 0.5): boolean {
	return (
		point.x >= rect.x - tolerance &&
		point.x <= rect.x + rect.width + tolerance &&
		point.y >= rect.y - tolerance &&
		point.y <= rect.y + rect.height + tolerance
	);
}

// Deliberately independent of the layout module's segment clipper so the
// invariants cannot inherit a bug from the code under test.
function segmentIntersectsRect(from: Point, to: Point, rect: Rect): boolean {
	const deltaX = to.x - from.x;
	const deltaY = to.y - from.y;
	let entry = 0;
	let exit = 1;
	const clip = (direction: number, distance: number): boolean => {
		if (direction === 0) return distance >= 0;
		const ratio = distance / direction;
		if (direction < 0) {
			if (ratio > exit) return false;
			if (ratio > entry) entry = ratio;
		} else {
			if (ratio < entry) return false;
			if (ratio < exit) exit = ratio;
		}
		return true;
	};
	return (
		clip(-deltaX, from.x - rect.x) &&
		clip(deltaX, rect.x + rect.width - from.x) &&
		clip(-deltaY, from.y - rect.y) &&
		clip(deltaY, rect.y + rect.height - from.y) &&
		entry <= exit
	);
}

interface LayoutIndex {
	readonly nodes: readonly LayoutNode[];
	readonly groups: readonly LayoutGroup[];
	readonly legends: readonly LayoutLegend[];
}

function indexLayout(layout: RoadmapLayout): LayoutIndex {
	return {
		nodes: layout.elements.filter((element): element is LayoutNode =>
			["heading", "note", "chapter", "topic"].includes(element.kind),
		),
		groups: layout.elements.filter((element): element is LayoutGroup => element.kind === "group"),
		legends: layout.elements.filter(
			(element): element is LayoutLegend => element.kind === "legend",
		),
	};
}

function collectViolations(layout: RoadmapLayout, svg?: string): string[] {
	const violations: string[] = [];
	const { nodes, groups, legends } = indexLayout(layout);
	const overlapTolerance = 1.5;

	// 1. Cards never overlap each other.
	for (let a = 0; a < nodes.length; a += 1) {
		for (let b = a + 1; b < nodes.length; b += 1) {
			const nodeA = nodes[a] as LayoutNode;
			const nodeB = nodes[b] as LayoutNode;
			const area = overlapArea(nodePaintRect(nodeA), nodePaintRect(nodeB));
			if (area > overlapTolerance * overlapTolerance) {
				violations.push(`card overlap: ${nodeA.id} x ${nodeB.id} (${Math.round(area)}px2)`);
			}
		}
	}

	// 2. A card is either fully inside a board or fully outside it.
	for (const node of nodes) {
		const rect = nodePaintRect(node);
		for (const group of groups) {
			const area = overlapArea(rect, group);
			if (area <= overlapTolerance * overlapTolerance) continue;
			if (!contains(group, rect, 2)) {
				violations.push(`card partially covered by board: ${node.id} x ${group.id}`);
			}
		}
	}

	// 3. Boards never partially overlap; containment is allowed.
	for (let a = 0; a < groups.length; a += 1) {
		for (let b = a + 1; b < groups.length; b += 1) {
			const groupA = groups[a] as LayoutGroup;
			const groupB = groups[b] as LayoutGroup;
			const area = overlapArea(groupA, groupB);
			if (area <= overlapTolerance * overlapTolerance) continue;
			if (!contains(groupA, groupB, 2) && !contains(groupB, groupA, 2)) {
				violations.push(`board overlap: ${groupA.id} x ${groupB.id} (${Math.round(area)}px2)`);
			}
		}
	}

	// 4. The legend never overlaps anything.
	for (const legend of legends) {
		for (const node of nodes) {
			if (overlapArea(legend, nodePaintRect(node)) > 0) {
				violations.push(`legend overlaps card: ${node.id}`);
			}
		}
		for (const group of groups) {
			if (overlapArea(legend, group) > 0) {
				violations.push(`legend overlaps board: ${group.id}`);
			}
		}
	}

	// 5. Connectors never cross unrelated cards; the spine additionally never
	// crosses boards. Elements that contain a connector endpoint are related
	// (the line starts or ends there by design), and notes legitimately mask
	// the spine that passes behind them.
	const insideAnyBoard = (rect: Rect): boolean => groups.some((group) => contains(group, rect, 2));
	// Kinds rendered as pure polylines get the exact path check below instead
	// of the chord approximation.
	const polylineKinds = new Set<string>();
	if (svg !== undefined) {
		for (const match of svg.matchAll(
			/class="roadmap__connector roadmap__connector--(chapterToTopics|topicToChildren)"[^>]*\bd="([^"]+)"/gu,
		)) {
			if (!/[CQAS]/u.test(match[2] ?? "")) polylineKinds.add(match[1] ?? "");
		}
	}
	const checkConnector = (connector: LayoutConnector): void => {
		if (connector.kind !== "spine" && polylineKinds.has(connector.kind)) return;
		for (const node of nodes) {
			const rect = nodePaintRect(node);
			if (pointInRect(connector.from, rect) || pointInRect(connector.to, rect)) continue;
			if (connector.kind === "spine") {
				// The spine renders beneath boards and notes, so anything they
				// cover (including their member cards) legitimately masks it.
				if (node.kind === "note" || node.kind === "heading") continue;
				if (insideAnyBoard(rect)) continue;
			}
			if (segmentIntersectsRect(connector.from, connector.to, rect)) {
				violations.push(`${connector.kind} connector crosses card: ${connector.id} x ${node.id}`);
			}
		}
		if (connector.kind !== "spine") return;
		for (const group of groups) {
			if (pointInRect(connector.from, group) || pointInRect(connector.to, group)) continue;
			if (segmentIntersectsRect(connector.from, connector.to, group)) {
				violations.push(`spine crosses board: ${connector.id} x ${group.id}`);
			}
		}
	};
	for (const connector of layout.connectors) checkConnector(connector);

	// 6. Rendered polyline connectors (straight and orthogonal routing) never
	// cross cards; this exact check replaces the chord approximation for
	// those kinds. Curved paths keep the chord check above. Note frames get a
	// 2px halo so a run grazing along a note border also counts as covered.
	if (svg !== undefined) {
		const cardRects = nodes.map((node) => {
			const rect = nodePaintRect(node);
			if (node.kind !== "note") return { id: node.id, rect, anchorable: true };
			return {
				id: node.id,
				rect: {
					x: rect.x - 2,
					y: rect.y - 2,
					width: rect.width + 4,
					height: rect.height + 4,
				},
				// Connectors never attach to notes, so no endpoint exemption.
				anchorable: false,
			};
		});
		const pathPattern =
			/class="roadmap__connector roadmap__connector--(chapterToTopics|topicToChildren)"[^>]*\bd="([^"]+)"/gu;
		for (const match of svg.matchAll(pathPattern)) {
			const kind = match[1] ?? "";
			const d = match[2] ?? "";
			if (/[CQAS]/u.test(d)) continue;
			const points = [...d.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/gu)].map((point) => ({
				x: Number(point[1]),
				y: Number(point[2]),
			}));
			for (let index = 1; index < points.length; index += 1) {
				const from = points[index - 1] as Point;
				const to = points[index] as Point;
				for (const { id, rect, anchorable } of cardRects) {
					if (anchorable && (pointInRect(from, rect, 2) || pointInRect(to, rect, 2))) continue;
					if (segmentIntersectsRect(from, to, rect)) {
						violations.push(`${kind} path crosses card: ${id}`);
					}
				}
			}
		}
	}

	// 7. Rendered orthogonal lanes never run along a board's vertical edge:
	// a lane within a board's vertical span must keep a visible gap from its
	// left and right rules.
	if (svg !== undefined) {
		const lanePattern =
			/topicToChildren[^"]*"[^>]*\bd="M [^"]*?L (-?[\d.]+) (-?[\d.]+) L \1 (-?[\d.]+)/gu;
		for (const match of svg.matchAll(lanePattern)) {
			const laneX = Number(match[1]);
			const yStart = Math.min(Number(match[2]), Number(match[3]));
			const yEnd = Math.max(Number(match[2]), Number(match[3]));
			for (const group of groups) {
				if (yEnd < group.y || yStart > group.y + group.height) continue;
				for (const edge of [group.x, group.x + group.width]) {
					if (Math.abs(laneX - edge) < 2.5) {
						violations.push(
							`connector lane hugs board edge: x=${laneX} near ${group.id} edge ${Math.round(edge)}`,
						);
					}
				}
			}
		}
	}

	// 7. Everything stays inside the canvas.
	for (const element of layout.elements) {
		const rect =
			element.kind === "note" ? paintedNodeFrameRectangle(element as LayoutNode) : element;
		if (
			rect.x < -0.5 ||
			rect.y < -0.5 ||
			rect.x + rect.width > layout.width + 0.5 ||
			rect.y + rect.height > layout.height + 0.5
		) {
			violations.push(`element outside canvas: ${element.id}`);
		}
	}

	return violations;
}

describe.each(presets)("layout invariants (%s theme)", (preset) => {
	test.each(Object.entries(documents))("%s", (_label, source) => {
		const generated = generateRoadmap(source, { theme: { preset, mode: "light" } });
		expect(collectViolations(generated.layout, generated.svg)).toEqual([]);
	});
});

// The layout algorithm must hold its guarantees for any measurement oracle,
// not just the built-in Arial tables: a browser-side hidden-DOM provider
// reports different advances for every font. Flat metrics scaled well past
// the realistic range stand in for that whole family of oracles.
describe("layout invariants under provider metrics", () => {
	const stressDocuments = ["demo sweep", "tall tree description", "wide grid"] as const;
	describe.each([0.8, 1.2] as const)("flat metrics x%s", (scale) => {
		test.each(
			presets.flatMap((preset) => stressDocuments.map((label) => [preset, label] as const)),
		)("%s / %s", (preset, label) => {
			const source = documents[label];
			if (!source) throw new Error(`missing fixture: ${label}`);
			setMeasurementProvider(
				(text, style) => Array.from(text).length * style.fontSize * 0.62 * scale,
			);
			try {
				const generated = generateRoadmap(source, { theme: { preset, mode: "light" } });
				expect(collectViolations(generated.layout, generated.svg)).toEqual([]);
			} finally {
				setMeasurementProvider(undefined);
			}
		});
	});
});
