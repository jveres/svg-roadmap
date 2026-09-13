import fc from "fast-check";
import { expect, test } from "vitest";
import { generateArcadeBackgroundArtifacts } from "../themes/arcade/background-artifacts.ts";
import { generateAsciiBackgroundArtifacts } from "../themes/ascii/background-artifacts.ts";
import { generateFunBackgroundArtifacts } from "../themes/fun/background-artifacts.ts";
import { generateRetroBackgroundArtifacts } from "../themes/retro/background-artifacts.ts";
import { generateRoseBackgroundArtifacts } from "../themes/rose/background-artifacts.ts";
import { generateSciFiBackgroundArtifacts } from "../themes/sci-fi/background-artifacts.ts";
import {
	createMotifCycler,
	createSeededRandom,
	createSpatialMotifPicker,
	intersectsAny,
	isInOuterVoid,
} from "./background-artifacts.ts";
import { rectanglesOverlap } from "./geometry.ts";

test("seeded streams are reproducible, bounded and vary between seeds", () => {
	fc.assert(
		fc.property(fc.string(), (seed) => {
			const a = createSeededRandom(seed);
			const b = createSeededRandom(seed);
			const c = createSeededRandom(`${seed}:other`);
			const values = Array.from({ length: 30 }, () => a());
			expect(values).toEqual(Array.from({ length: 30 }, () => b()));
			expect(values).not.toEqual(Array.from({ length: 30 }, () => c()));
			for (const value of values) {
				expect(value).toBeGreaterThanOrEqual(0);
				expect(value).toBeLessThan(1);
			}
		}),
	);
});

test.each([0, -1, 1.5, Infinity, NaN])("rejects invalid motif counts %s", (count) => {
	expect(() => createMotifCycler("seed", count)).toThrow(RangeError);
});

test("motif decks cover every design before repeating", () => {
	for (const count of [1, 2, 11]) {
		const next = createMotifCycler("deck", count);
		for (let cycle = 0; cycle < 5; cycle += 1) {
			expect(new Set(Array.from({ length: count }, () => next())).size).toBe(count);
		}
	}
});

test("spatial selection skips crowded spots and permits a motif again beyond its exclusion radius", () => {
	const next = createSpatialMotifPicker("seed", 2, 100);
	const box = { x: 0, y: 0, width: 10, height: 10 };
	const first = next(box);
	const second = next({ ...box, x: 20 });
	expect(new Set([first, second])).toEqual(new Set([0, 1]));
	expect(next({ ...box, x: 50 })).toBeUndefined();
	expect(next({ ...box, x: 100 })).toBe(first);
});

test("outer voids exclude content gaps while allowing both margins and empty edge rows", () => {
	const content = [
		{ x: 30, y: 20, width: 20, height: 30 },
		{ x: 70, y: 20, width: 10, height: 30 },
	];
	const box = { x: 0, y: 25, width: 10, height: 10 };
	for (const x of [0, 80]) expect(isInOuterVoid({ ...box, x }, content, 100, 0.2)).toBe(true);
	for (const x of [30, 55, 70]) expect(isInOuterVoid({ ...box, x }, content, 100, 0.2)).toBe(false);
	for (const x of [0, 90])
		expect(isInOuterVoid({ ...box, x, y: 60 }, content, 100, 0.2)).toBe(true);
	expect(isInOuterVoid({ ...box, x: 40, y: 60 }, content, 100, 0.2)).toBe(false);
	expect(intersectsAny(box, [])).toBe(false);
	expect(intersectsAny({ ...box, x: 30 }, content)).toBe(true);
});

test.each([
	["fun", generateFunBackgroundArtifacts],
	["retro", generateRetroBackgroundArtifacts],
	["rose", generateRoseBackgroundArtifacts],
	["ascii", generateAsciiBackgroundArtifacts],
	["arcade", generateArcadeBackgroundArtifacts],
	["sci-fi", generateSciFiBackgroundArtifacts],
] as const)("%s artifacts are reproducible, varied and avoid occupied areas", (_, generate) => {
	const context = {
		width: 1400,
		height: 1800,
		settings: { enabled: true, seed: "variance", density: 1, size: 1 },
		avoid: [{ x: 550, y: 100, width: 300, height: 1400 }],
	};
	const artifacts = generate(context);
	expect(artifacts.length).toBeGreaterThan(10);
	expect(generate(context)).toEqual(artifacts);
	expect(
		generate({ ...context, settings: { ...context.settings, seed: "different" } }),
	).not.toEqual(artifacts);
	expect(generate({ ...context, settings: { ...context.settings, enabled: false } })).toEqual([]);
	expect(generate({ ...context, settings: { ...context.settings, density: 0 } })).toEqual([]);
	for (const [index, artifact] of artifacts.entries()) {
		expect(intersectsAny(artifact.bounds, context.avoid)).toBe(false);
		for (const other of artifacts.slice(index + 1)) {
			expect(rectanglesOverlap(artifact.bounds, other.bounds)).toBe(false);
			const distance = Math.hypot(
				artifact.bounds.x + artifact.bounds.width / 2 - other.bounds.x - other.bounds.width / 2,
				artifact.bounds.y + artifact.bounds.height / 2 - other.bounds.y - other.bounds.height / 2,
			);
			if (distance < 350) expect(artifact.shapes).not.toEqual(other.shapes);
		}
	}
});

test.each([0, -1, Infinity, NaN])("rejects invalid motif spacing %s", (spacing) => {
	expect(() => createSpatialMotifPicker("seed", 3, spacing)).toThrow(RangeError);
});

test("spatial motif separation holds across cell boundaries and negative coordinates", () => {
	fc.assert(
		fc.property(
			fc.array(
				fc.record({
					x: fc.integer({ min: -1000, max: 1000 }),
					y: fc.integer({ min: -1000, max: 1000 }),
				}),
				{ maxLength: 100 },
			),
			(points) => {
				const next = createSpatialMotifPicker("property", 5, 200);
				const placed: { x: number; y: number; motif: number }[] = [];
				for (const point of points) {
					const motif = next({ ...point, width: 10, height: 10 });
					if (motif === undefined) continue;
					for (const other of placed) {
						if (Math.hypot(point.x - other.x, point.y - other.y) < 200)
							expect(motif).not.toBe(other.motif);
					}
					placed.push({ ...point, motif });
				}
			},
		),
	);
});
