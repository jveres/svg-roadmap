import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
	blobPath,
	boundedBlobPath,
	bundledCurvePath,
	childCurvePath,
	convexHull,
	horizontalBumpPath,
	inflateRectangle,
	intersectionArea,
	organicBlobPath,
	organicBlobPolygon,
	pointInPolygon,
	rectangleIntersection,
	rectanglesOverlap,
	rectBottom,
	rectRight,
	resolveOverlaps,
	smoothClosedPath,
	translateRectangle,
	unionRectangles,
	verticalBumpPath,
} from "./geometry.ts";

describe("rectangle geometry", () => {
	test("treats touching edges as non-overlapping", () => {
		const left = { x: 0, y: 0, width: 20, height: 20 };
		const right = { x: 20, y: 0, width: 10, height: 10 };

		expect(rectanglesOverlap(left, right)).toBe(false);
		expect(rectanglesOverlap(left, right, 1)).toBe(true);
		expect(intersectionArea(left, right)).toBe(0);
	});

	test("samples the organic blob for deterministic containment checks", () => {
		const polygon = organicBlobPolygon({ x: 0, y: 0, width: 100, height: 50 }, 2, 1, 1);

		expect(polygon).toHaveLength(96);
		expect(pointInPolygon(polygon, { x: 50, y: 25 })).toBe(true);
		expect(pointInPolygon(polygon, { x: 0, y: 0 })).toBe(false);
	});

	test("resolves collisions without moving fixed rectangles", () => {
		const result = resolveOverlaps(
			[
				{ x: 0, y: 0, width: 30, height: 30 },
				{ x: 10, y: 10, width: 30, height: 30 },
				{ x: 15, y: 20, width: 20, height: 20 },
			],
			{ padding: 4, axis: "y", fixed: new Set([0]) },
		);

		expect(result.remainingOverlaps).toBe(0);
		expect(result.rectangles[0]).toEqual({ x: 0, y: 0, width: 30, height: 30 });
		expect(result.rectangles[1]?.y).toBeGreaterThanOrEqual(34);
	});
});

describe("dependency-free paths", () => {
	test("builds a stable convex hull and smooth SVG path", () => {
		const points = [
			{ x: 10, y: 10 },
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 0, y: 10 },
			{ x: 5, y: 5 },
		];

		expect(convexHull(points)).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
			{ x: 0, y: 10 },
		]);
		expect(blobPath([{ x: 0, y: 0, width: 10, height: 10 }], 2)).toMatch(/^M .+ C .+ Z$/u);
		expect(verticalBumpPath({ x: 0, y: 0 }, { x: 20, y: 40 })).toBe("M 0 0 C 0 20 20 20 20 40");
	});

	test("flat bump connectors keep turning out of their ports", () => {
		// Nearly level endpoints: the midpoint S would collapse into a straight
		// horizontal line; the tangent floor keeps a perpendicular departure.
		expect(verticalBumpPath({ x: 0, y: 0 }, { x: 200, y: 10 })).toBe("M 0 0 C 0 32 200 -22 200 10");
		// The floor is capped, and steep links keep the classic midpoint S.
		expect(verticalBumpPath({ x: 0, y: 0 }, { x: 200, y: 120 })).toBe(
			"M 0 0 C 0 60 200 60 200 120",
		);
		// Short flat links stay tight: the floor scales with the cross run.
		expect(verticalBumpPath({ x: 0, y: 0 }, { x: 40, y: 6 })).toBe("M 0 0 C 0 10 40 -4 40 6");
	});

	test("reproduces the legacy three-point bundle curve without d3", () => {
		expect(bundledCurvePath({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(
			"M 0 0 L 12.5 2.5 C 25 5 50 10 66.67 10 C 83.33 10 91.67 5 95.83 2.5 L 100 0",
		);
	});

	test("steep child links trade the bundle bow for a turning S-curve", () => {
		// Sweeping aspect keeps the legacy bundle.
		expect(childCurvePath({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(
			bundledCurvePath({ x: 0, y: 0 }, { x: 100, y: 0 }),
		);
		// Steeper than 45°: the bundle would hang near-vertically out of a
		// horizontal port, so the link turns into both ports instead.
		expect(childCurvePath({ x: 0, y: 0 }, { x: -56, y: 209 })).toBe(
			"M 0 0 C -32 0 -24 209 -56 209",
		);
	});

	test("can lift only the organic blob lower contour", () => {
		const path = organicBlobPath({ x: 402, y: 130, width: 406, height: 88 }, 4, 1, 0.98);

		expect(path).toContain("M 605 131 C 787.7 131 808 147.5 808 174");
		expect(path).toContain("C 808 199.52 787.7 214 605 214 C 422.3 214 402 199.52 402 174");
		expect(path).toContain("C 402 147.5 422.3 131 605 131 Z");
	});
});

test.each(["x", "y", "smallest"] as const)(
	"collision resolution supports %s with either rectangle fixed",
	(axis) => {
		for (const fixedIndex of [0, 1]) {
			const input = [
				{ x: 0, y: 0, width: 10, height: 30 },
				{ x: 5, y: 5, width: 10, height: 30 },
			];
			const result = resolveOverlaps(input, { axis, fixed: new Set([fixedIndex]) });
			expect(result.remainingOverlaps).toBe(0);
			expect(result.rectangles[fixedIndex]).toEqual(input[fixedIndex]);
			expect(input[1]).toEqual({ x: 5, y: 5, width: 10, height: 30 });
		}
	},
);

test("collision resolution reports unsatisfiable constraints and exhausted budgets", () => {
	const rectangles = [
		{ x: 0, y: 0, width: 10, height: 10 },
		{ x: 2, y: 3, width: 10, height: 10 },
	];
	for (const options of [{ fixed: new Set([0, 1]) }, { maxIterations: 0 }]) {
		expect(resolveOverlaps(rectangles, options)).toEqual({
			rectangles,
			iterations: 0,
			remainingOverlaps: 1,
		});
	}
	expect(resolveOverlaps([])).toEqual({ rectangles: [], iterations: 0, remainingOverlaps: 0 });
	const horizontal = [
		{ x: 0, y: 0, width: 30, height: 10 },
		{ x: 5, y: 5, width: 30, height: 10 },
	];
	expect(resolveOverlaps(horizontal).rectangles[1]?.y).toBe(10);
});

test("empty, point and line hulls produce finite minimal paths", () => {
	const point = { x: 2, y: 3 };
	expect(convexHull([])).toEqual([]);
	expect(convexHull([point])).toEqual([point]);
	expect(convexHull([point, { x: 4, y: 3 }, { x: 3, y: 3 }, point])).toEqual([
		point,
		{ x: 4, y: 3 },
	]);
	expect(smoothClosedPath([])).toBe("");
	expect(smoothClosedPath([point])).toBe("M 2 3 Z");
	expect(smoothClosedPath([point, { x: 4, y: 3 }])).toBe("M 2 3 L 4 3 Z");
	expect(blobPath([], 0)).toBe("");
	expect(boundedBlobPath([], 0)).toBe("");
	expect(boundedBlobPath([{ x: 2, y: 3, width: 0, height: 0 }], 0)).not.toMatch(/NaN|Infinity/u);
	expect(bundledCurvePath(point, point)).toBe("M 2 3");
	expect(horizontalBumpPath(point, point)).toBe("M 2 3 C 2 3 2 3 2 3");
	expect(verticalBumpPath(point, point)).toBe("M 2 3 C 2 3 2 3 2 3");
});

test("polygon containment includes vertices and edges, and rejects exterior points", () => {
	const polygon = [
		{ x: 0, y: 0 },
		{ x: 10, y: 0 },
		{ x: 10, y: 10 },
		{ x: 0, y: 10 },
	];
	for (const point of [
		{ x: 0, y: 0 },
		{ x: 0, y: 5 },
		{ x: 10, y: 5 },
		{ x: 5, y: 10 },
		{ x: 5, y: 5 },
	]) {
		expect(pointInPolygon(polygon, point)).toBe(true);
		expect(pointInPolygon([...polygon].reverse(), point)).toBe(true);
	}
	for (const point of [
		{ x: -1, y: 0 },
		{ x: 11, y: 10 },
		{ x: 0, y: -1 },
		{ x: 10, y: 11 },
	]) {
		expect(pointInPolygon(polygon, point)).toBe(false);
	}
	expect(pointInPolygon([], { x: 0, y: 0 })).toBe(false);
	expect(organicBlobPolygon({ x: 0, y: 0, width: 20, height: 10 }, 0, 0, 0, 0.21, 1)).toHaveLength(
		16,
	);
});

test("rectangle operations preserve translation and intersection symmetry", () => {
	const rect = fc.record({
		x: fc.integer({ min: -1000, max: 1000 }),
		y: fc.integer({ min: -1000, max: 1000 }),
		width: fc.integer({ min: 1, max: 1000 }),
		height: fc.integer({ min: 1, max: 1000 }),
	});
	fc.assert(
		fc.property(rect, rect, (a, b) => {
			expect(rectangleIntersection(a, b)).toEqual(rectangleIntersection(b, a));
			expect(intersectionArea(a, b)).toBeLessThanOrEqual(
				Math.min(a.width * a.height, b.width * b.height),
			);
			expect(translateRectangle(translateRectangle(a, b.x, b.y), -b.x, -b.y)).toEqual(a);
			const union = unionRectangles([a, b]);
			expect(union.x).toBeLessThanOrEqual(Math.min(a.x, b.x));
			expect(union.y).toBeLessThanOrEqual(Math.min(a.y, b.y));
			expect(rectRight(union)).toBeGreaterThanOrEqual(Math.max(rectRight(a), rectRight(b)));
			expect(rectBottom(union)).toBeGreaterThanOrEqual(Math.max(rectBottom(a), rectBottom(b)));
		}),
	);
	expect(unionRectangles([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
	expect(inflateRectangle({ x: 0, y: 0, width: 10, height: 20 }, 2)).toEqual({
		x: -2,
		y: -2,
		width: 14,
		height: 24,
	});
});
