import type { Point, Rect } from "../types.ts";

export interface ResolveOverlapOptions {
	readonly padding?: number;
	readonly maxIterations?: number;
	readonly axis?: "x" | "y" | "smallest";
	readonly fixed?: ReadonlySet<number>;
}

export interface ResolveOverlapResult {
	readonly rectangles: readonly Rect[];
	readonly iterations: number;
	readonly remainingOverlaps: number;
}

export function rectRight(rectangle: Rect): number {
	return rectangle.x + rectangle.width;
}

export function rectBottom(rectangle: Rect): number {
	return rectangle.y + rectangle.height;
}

export function rectCenter(rectangle: Rect): Point {
	return { x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2 };
}

export function rectanglesOverlap(left: Rect, right: Rect, padding = 0): boolean {
	return !(
		rectRight(left) + padding <= right.x ||
		rectRight(right) + padding <= left.x ||
		rectBottom(left) + padding <= right.y ||
		rectBottom(right) + padding <= left.y
	);
}

export function rectangleIntersection(left: Rect, right: Rect): Rect | undefined {
	const x = Math.max(left.x, right.x);
	const y = Math.max(left.y, right.y);
	const rightEdge = Math.min(rectRight(left), rectRight(right));
	const bottomEdge = Math.min(rectBottom(left), rectBottom(right));
	if (rightEdge <= x || bottomEdge <= y) return undefined;
	return { x, y, width: rightEdge - x, height: bottomEdge - y };
}

export function intersectionArea(left: Rect, right: Rect): number {
	const intersection = rectangleIntersection(left, right);
	return intersection ? intersection.width * intersection.height : 0;
}

export function inflateRectangle(rectangle: Rect, padding: number): Rect {
	return {
		x: rectangle.x - padding,
		y: rectangle.y - padding,
		width: rectangle.width + 2 * padding,
		height: rectangle.height + 2 * padding,
	};
}

export function translateRectangle(rectangle: Rect, dx: number, dy: number): Rect {
	return { ...rectangle, x: rectangle.x + dx, y: rectangle.y + dy };
}

export function unionRectangles(rectangles: readonly Rect[]): Rect {
	if (rectangles.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
	let left = Number.POSITIVE_INFINITY;
	let top = Number.POSITIVE_INFINITY;
	let right = Number.NEGATIVE_INFINITY;
	let bottom = Number.NEGATIVE_INFINITY;
	for (const rectangle of rectangles) {
		left = Math.min(left, rectangle.x);
		top = Math.min(top, rectangle.y);
		right = Math.max(right, rectRight(rectangle));
		bottom = Math.max(bottom, rectBottom(rectangle));
	}
	return { x: left, y: top, width: right - left, height: bottom - top };
}

function overlapCount(rectangles: readonly Rect[], padding: number): number {
	let count = 0;
	for (let left = 0; left < rectangles.length; left += 1) {
		const leftRectangle = rectangles[left];
		if (!leftRectangle) continue;
		for (let right = left + 1; right < rectangles.length; right += 1) {
			const rightRectangle = rectangles[right];
			if (rightRectangle && rectanglesOverlap(leftRectangle, rightRectangle, padding)) count += 1;
		}
	}
	return count;
}

export function resolveOverlaps(
	rectangles: readonly Rect[],
	options: ResolveOverlapOptions = {},
): ResolveOverlapResult {
	const padding = options.padding ?? 0;
	const maxIterations = options.maxIterations ?? Math.max(8, rectangles.length * rectangles.length);
	const axis = options.axis ?? "smallest";
	const fixed = options.fixed ?? new Set<number>();
	const result = rectangles.map((rectangle) => ({ ...rectangle }));
	let iterations = 0;

	for (; iterations < maxIterations; iterations += 1) {
		let changed = false;
		for (let left = 0; left < result.length; left += 1) {
			const first = result[left];
			if (!first) continue;
			for (let right = left + 1; right < result.length; right += 1) {
				const second = result[right];
				if (!second || !rectanglesOverlap(first, second, padding)) continue;

				const moveFirst = fixed.has(right) && !fixed.has(left);
				if (fixed.has(left) && fixed.has(right)) continue;
				const moving = moveFirst ? first : second;
				const stationary = moveFirst ? second : first;
				const movingCenter = rectCenter(moving);
				const stationaryCenter = rectCenter(stationary);
				const horizontalDirection = moveFirst ? -1 : movingCenter.x < stationaryCenter.x ? -1 : 1;
				const verticalDirection = moveFirst ? -1 : movingCenter.y < stationaryCenter.y ? -1 : 1;
				const dx =
					horizontalDirection < 0
						? stationary.x - padding - rectRight(moving)
						: rectRight(stationary) + padding - moving.x;
				const dy =
					verticalDirection < 0
						? stationary.y - padding - rectBottom(moving)
						: rectBottom(stationary) + padding - moving.y;
				const useX = axis === "x" || (axis === "smallest" && Math.abs(dx) < Math.abs(dy));
				if (useX) {
					moving.x = moveFirst
						? stationary.x - padding - moving.width
						: rectRight(stationary) + padding;
				} else {
					moving.y = moveFirst
						? stationary.y - padding - moving.height
						: rectBottom(stationary) + padding;
				}
				changed = true;
			}
		}
		if (!changed) break;
	}

	return {
		rectangles: result,
		iterations,
		remainingOverlaps: overlapCount(result, padding),
	};
}

function cross(origin: Point, left: Point, right: Point): number {
	return (left.x - origin.x) * (right.y - origin.y) - (left.y - origin.y) * (right.x - origin.x);
}

export function convexHull(points: readonly Point[]): Point[] {
	const sorted = [...points]
		.sort((left, right) => left.x - right.x || left.y - right.y)
		.filter(
			(point, index, values) =>
				index === 0 || point.x !== values[index - 1]?.x || point.y !== values[index - 1]?.y,
		);
	if (sorted.length <= 2) return sorted;

	const lower: Point[] = [];
	for (const point of sorted) {
		while (lower.length >= 2 && cross(lower.at(-2) as Point, lower.at(-1) as Point, point) <= 0) {
			lower.pop();
		}
		lower.push(point);
	}
	const upper: Point[] = [];
	for (let index = sorted.length - 1; index >= 0; index -= 1) {
		const point = sorted[index];
		if (!point) continue;
		while (upper.length >= 2 && cross(upper.at(-2) as Point, upper.at(-1) as Point, point) <= 0) {
			upper.pop();
		}
		upper.push(point);
	}
	lower.pop();
	upper.pop();
	return [...lower, ...upper];
}

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

export function smoothClosedPath(points: readonly Point[], tension = 1): string {
	if (points.length === 0) return "";
	if (points.length === 1) {
		const point = points[0] as Point;
		return `M ${round(point.x)} ${round(point.y)} Z`;
	}
	if (points.length === 2) {
		const [left, right] = points as readonly [Point, Point];
		return `M ${round(left.x)} ${round(left.y)} L ${round(right.x)} ${round(right.y)} Z`;
	}

	const size = points.length;
	const pointAt = (index: number): Point => points[(index + size) % size] as Point;
	let path = `M ${round(pointAt(0).x)} ${round(pointAt(0).y)}`;
	for (let index = 0; index < size; index += 1) {
		const previous = pointAt(index - 1);
		const current = pointAt(index);
		const next = pointAt(index + 1);
		const after = pointAt(index + 2);
		const firstControl = {
			x: current.x + ((next.x - previous.x) / 6) * tension,
			y: current.y + ((next.y - previous.y) / 6) * tension,
		};
		const secondControl = {
			x: next.x - ((after.x - current.x) / 6) * tension,
			y: next.y - ((after.y - current.y) / 6) * tension,
		};
		path += ` C ${round(firstControl.x)} ${round(firstControl.y)} ${round(secondControl.x)} ${round(secondControl.y)} ${round(next.x)} ${round(next.y)}`;
	}
	return `${path} Z`;
}

function expandedRectangleHull(rectangles: readonly Rect[], padding: number): Point[] {
	const points = rectangles.flatMap((rectangle): Point[] => {
		return [
			{ x: rectangle.x, y: rectangle.y },
			{ x: rectRight(rectangle), y: rectangle.y },
			{ x: rectRight(rectangle), y: rectBottom(rectangle) },
			{ x: rectangle.x, y: rectBottom(rectangle) },
		];
	});
	const hull = convexHull(points);
	return hull.map((point, index): Point => {
		if (padding === 0 || hull.length < 3) return point;
		const previous = hull[(index - 1 + hull.length) % hull.length] as Point;
		const next = hull[(index + 1) % hull.length] as Point;
		const previousLength = Math.hypot(point.x - previous.x, point.y - previous.y) || 1;
		const nextLength = Math.hypot(next.x - point.x, next.y - point.y) || 1;
		const previousDirection = {
			x: (point.x - previous.x) / previousLength,
			y: (point.y - previous.y) / previousLength,
		};
		const nextDirection = {
			x: (next.x - point.x) / nextLength,
			y: (next.y - point.y) / nextLength,
		};
		const extension = {
			x: previousDirection.x - nextDirection.x,
			y: previousDirection.y - nextDirection.y,
		};
		const extensionLength = Math.hypot(extension.x, extension.y) || 1;
		return {
			x: point.x + (extension.x / extensionLength) * padding,
			y: point.y + (extension.y / extensionLength) * padding,
		};
	});
}

export function blobPath(rectangles: readonly Rect[], padding: number): string {
	return smoothClosedPath(expandedRectangleHull(rectangles, padding), 0.5);
}

export function boundedBlobPath(rectangles: readonly Rect[], padding: number): string {
	const points = expandedRectangleHull(rectangles, padding);
	if (points.length < 3) return smoothClosedPath(points, 0);
	const size = points.length;
	const pointAt = (index: number): Point => points[(index + size) % size] as Point;
	const weighted = (left: Point, centerWeight: number, center: Point, right: Point): Point => ({
		x: (left.x + centerWeight * center.x + right.x) / (centerWeight + 2),
		y: (left.y + centerWeight * center.y + right.y) / (centerWeight + 2),
	});
	const first = weighted(pointAt(-1), 4, pointAt(0), pointAt(1));
	let path = `M ${round(first.x)} ${round(first.y)}`;
	for (let index = 0; index < size; index += 1) {
		const current = pointAt(index);
		const next = pointAt(index + 1);
		const after = pointAt(index + 2);
		const firstControl = {
			x: (2 * current.x + next.x) / 3,
			y: (2 * current.y + next.y) / 3,
		};
		const secondControl = {
			x: (current.x + 2 * next.x) / 3,
			y: (current.y + 2 * next.y) / 3,
		};
		const end = weighted(current, 4, next, after);
		path += ` C ${round(firstControl.x)} ${round(firstControl.y)} ${round(secondControl.x)} ${round(secondControl.y)} ${round(end.x)} ${round(end.y)}`;
	}
	return `${path} Z`;
}

export function organicBlobPath(
	rectangle: Rect,
	lowerInset = 0,
	upperInset = 0,
	upperShoulderInset = 0,
	upperShoulderRatio = 0.21,
): string {
	const curves = organicBlobCurves(
		rectangle,
		lowerInset,
		upperInset,
		upperShoulderInset,
		upperShoulderRatio,
	);
	const first = curves[0];
	if (!first) return "";
	return [
		`M ${round(first.start.x)} ${round(first.start.y)}`,
		...curves.map(
			(curve) =>
				`C ${round(curve.control1.x)} ${round(curve.control1.y)} ${round(curve.control2.x)} ${round(curve.control2.y)} ${round(curve.end.x)} ${round(curve.end.y)}`,
		),
		"Z",
	].join(" ");
}

interface CubicCurve {
	readonly start: Point;
	readonly control1: Point;
	readonly control2: Point;
	readonly end: Point;
}

function organicBlobCurves(
	rectangle: Rect,
	lowerInset: number,
	upperInset: number,
	upperShoulderInset: number,
	upperShoulderRatio: number,
): CubicCurve[] {
	const left = rectangle.x;
	const top = rectangle.y;
	const upperEdge = top + upperInset;
	const right = rectRight(rectangle);
	const bottom = rectBottom(rectangle);
	const lowerEdge = bottom - lowerInset;
	const upperShoulder = top + rectangle.height * upperShoulderRatio - upperShoulderInset;
	const centerX = left + rectangle.width / 2;
	const centerY = top + rectangle.height / 2;
	return [
		{
			start: { x: centerX, y: upperEdge },
			control1: { x: left + rectangle.width * 0.95, y: upperEdge },
			control2: { x: right, y: upperShoulder },
			end: { x: right, y: centerY },
		},
		{
			start: { x: right, y: centerY },
			control1: { x: right, y: top + rectangle.height * 0.79 },
			control2: { x: left + rectangle.width * 0.95, y: lowerEdge },
			end: { x: centerX, y: lowerEdge },
		},
		{
			start: { x: centerX, y: lowerEdge },
			control1: { x: left + rectangle.width * 0.05, y: lowerEdge },
			control2: { x: left, y: top + rectangle.height * 0.79 },
			end: { x: left, y: centerY },
		},
		{
			start: { x: left, y: centerY },
			control1: { x: left, y: upperShoulder },
			control2: { x: left + rectangle.width * 0.05, y: upperEdge },
			end: { x: centerX, y: upperEdge },
		},
	];
}

function cubicPoint(curve: CubicCurve, time: number): Point {
	const inverse = 1 - time;
	const startWeight = inverse ** 3;
	const firstControlWeight = 3 * inverse ** 2 * time;
	const secondControlWeight = 3 * inverse * time ** 2;
	const endWeight = time ** 3;
	return {
		x:
			curve.start.x * startWeight +
			curve.control1.x * firstControlWeight +
			curve.control2.x * secondControlWeight +
			curve.end.x * endWeight,
		y:
			curve.start.y * startWeight +
			curve.control1.y * firstControlWeight +
			curve.control2.y * secondControlWeight +
			curve.end.y * endWeight,
	};
}

export function organicBlobPolygon(
	rectangle: Rect,
	lowerInset = 0,
	upperInset = 0,
	upperShoulderInset = 0,
	upperShoulderRatio = 0.21,
	samplesPerCurve = 24,
): Point[] {
	const sampleCount = Math.max(4, Math.floor(samplesPerCurve));
	return organicBlobCurves(
		rectangle,
		lowerInset,
		upperInset,
		upperShoulderInset,
		upperShoulderRatio,
	).flatMap((curve) =>
		Array.from({ length: sampleCount }, (_, index) => cubicPoint(curve, index / sampleCount)),
	);
}

export function pointInPolygon(polygon: readonly Point[], point: Point): boolean {
	let inside = false;
	for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; index += 1) {
		const current = polygon[index] as Point;
		const previous = polygon[previousIndex] as Point;
		const cross =
			(point.x - previous.x) * (current.y - previous.y) -
			(point.y - previous.y) * (current.x - previous.x);
		const onSegment =
			Math.abs(cross) < 1e-7 &&
			point.x >= Math.min(previous.x, current.x) - 1e-7 &&
			point.x <= Math.max(previous.x, current.x) + 1e-7 &&
			point.y >= Math.min(previous.y, current.y) - 1e-7 &&
			point.y <= Math.max(previous.y, current.y) + 1e-7;
		if (onSegment) return true;
		if (
			current.y > point.y !== previous.y > point.y &&
			point.x <
				((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x
		) {
			inside = !inside;
		}
		previousIndex = index;
	}
	return inside;
}

export function verticalBumpPath(from: Point, to: Point): string {
	const middle = (from.y + to.y) / 2;
	return `M ${round(from.x)} ${round(from.y)} C ${round(from.x)} ${round(middle)} ${round(to.x)} ${round(middle)} ${round(to.x)} ${round(to.y)}`;
}

export function horizontalBumpPath(from: Point, to: Point): string {
	const middle = (from.x + to.x) / 2;
	return `M ${round(from.x)} ${round(from.y)} C ${round(middle)} ${round(from.y)} ${round(middle)} ${round(to.y)} ${round(to.x)} ${round(to.y)}`;
}

export function bundledCurvePath(from: Point, to: Point, curveDistance = 0.15): string {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.hypot(dx, dy);
	if (length === 0) return `M ${round(from.x)} ${round(from.y)}`;
	const angle = Math.atan2(dy, dx);
	const middle = {
		x: from.x + length * 0.75 * Math.cos(angle),
		y: from.y + length * 0.75 * Math.sin(angle),
	};
	const curvesDown = from.y <= to.y ? from.x <= to.x : from.x >= to.x;
	const sign = curvesDown ? 1 : -1;
	const distance = length * curveDistance;
	const control = {
		x: middle.x - sign * Math.sin(angle) * distance,
		y: middle.y + sign * Math.cos(angle) * distance,
	};
	const entry = {
		x: (5 * from.x + control.x) / 6,
		y: (5 * from.y + control.y) / 6,
	};
	const firstControl = {
		x: (2 * from.x + control.x) / 3,
		y: (2 * from.y + control.y) / 3,
	};
	const secondControl = {
		x: (from.x + 2 * control.x) / 3,
		y: (from.y + 2 * control.y) / 3,
	};
	const centre = {
		x: (from.x + 4 * control.x + to.x) / 6,
		y: (from.y + 4 * control.y + to.y) / 6,
	};
	const thirdControl = {
		x: (2 * control.x + to.x) / 3,
		y: (2 * control.y + to.y) / 3,
	};
	const fourthControl = {
		x: (control.x + 2 * to.x) / 3,
		y: (control.y + 2 * to.y) / 3,
	};
	const exit = {
		x: (control.x + 5 * to.x) / 6,
		y: (control.y + 5 * to.y) / 6,
	};
	return [
		`M ${round(from.x)} ${round(from.y)}`,
		`L ${round(entry.x)} ${round(entry.y)}`,
		`C ${round(firstControl.x)} ${round(firstControl.y)} ${round(secondControl.x)} ${round(secondControl.y)} ${round(centre.x)} ${round(centre.y)}`,
		`C ${round(thirdControl.x)} ${round(thirdControl.y)} ${round(fourthControl.x)} ${round(fourthControl.y)} ${round(exit.x)} ${round(exit.y)}`,
		`L ${round(to.x)} ${round(to.y)}`,
	].join(" ");
}
