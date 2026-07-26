import { describe, expect, test } from "vitest";
import {
	blobPath,
	bundledCurvePath,
	childCurvePath,
	convexHull,
	intersectionArea,
	organicBlobPath,
	organicBlobPolygon,
	pointInPolygon,
	rectanglesOverlap,
	resolveOverlaps,
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
