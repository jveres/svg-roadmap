import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { generateRoadmap } from "./index.ts";
import {
	openRoadmapDocument,
	packRoadmapDocument,
	RoadmapDocumentError,
	renderRoadmapDocument,
	roadmapDocumentFormat,
} from "./viewer.ts";

describe("viewer entry", () => {
	test("its import graph reaches neither the Markdown parser nor wasm", () => {
		// The split's contract: `svg-roadmap/viewer` ships no comrak. Walk the
		// static import graph from the entry and assert the boundary holds.
		const root = resolve(__dirname);
		const seen = new Set<string>();
		const queue = [resolve(root, "viewer.ts")];
		// Type-only imports erase at runtime and ship nothing — the boundary
		// is about executable modules, so they are exempt.
		const importPattern = /(?:import|export)\s+(type\s+)?(?:[^"']*?from\s+)?["']([^"']+)["']/gu;
		while (queue.length > 0) {
			const file = queue.pop();
			if (!file || seen.has(file)) continue;
			seen.add(file);
			const source = readFileSync(file, "utf8");
			for (const match of source.matchAll(importPattern)) {
				if (match[1]) continue;
				const specifier = match[2] ?? "";
				expect(specifier).not.toBe("comrak-wasm");
				if (!specifier.startsWith(".")) continue;
				const target = resolve(dirname(file), specifier);
				expect(target.endsWith("/markdown.ts")).toBe(false);
				queue.push(target);
			}
		}
		expect(seen.size).toBeGreaterThan(5);
	});

	test("a JSON round-tripped document renders byte-identically", () => {
		const markdown = `---
roadmap:
  noteMarkers: true
  tags:
    core:
      icon: check
      accent: green
---

Start with [core] ideas.^[A footnote.]

* :one: Chapter
*A chapter comment.*
  * Topic [core]
    > A note behind the click.

---
*Milestone label.*

* :two: Later
  * Next topic
`;
		const generated = generateRoadmap(markdown, { render: { idPrefix: "artifact" } });
		const wire = JSON.stringify(packRoadmapDocument(generated.document));
		const reopened = openRoadmapDocument(JSON.parse(wire));
		const rendered = renderRoadmapDocument(reopened, { render: { idPrefix: "artifact" } });
		expect(rendered.svg).toBe(generated.svg);
		// The viewer re-renders the same artifact in any theme without wasm.
		const restyled = renderRoadmapDocument(reopened, {
			theme: { preset: "sci-fi" },
			render: { idPrefix: "artifact" },
		});
		expect(restyled.svg).toContain('data-roadmap-theme="sci-fi"');
	});

	test("wrong or incompatible artifacts fail with clear errors", () => {
		expect(() => openRoadmapDocument(null)).toThrow(RoadmapDocumentError);
		expect(() =>
			openRoadmapDocument({ svgRoadmap: roadmapDocumentFormat + 1, document: {} }),
		).toThrow(/Unsupported roadmap artifact format/u);
		expect(() =>
			openRoadmapDocument({ svgRoadmap: roadmapDocumentFormat, document: { type: "nope" } }),
		).toThrow(/does not carry a parsed document/u);
	});
});
