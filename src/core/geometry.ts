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

/** Rounds a coordinate to two decimals, the precision paths are emitted with. */
export function roundCoordinate(value: number): number {
	return Math.round(value * 100) / 100;
}

export function smoothClosedPath(points: readonly Point[], tension = 1): string {
	if (points.length === 0) return "";
	if (points.length === 1) {
		const point = points[0] as Point;
		return `M ${roundCoordinate(point.x)} ${roundCoordinate(point.y)} Z`;
	}
	if (points.length === 2) {
		const [left, right] = points as readonly [Point, Point];
		return `M ${roundCoordinate(left.x)} ${roundCoordinate(left.y)} L ${roundCoordinate(right.x)} ${roundCoordinate(right.y)} Z`;
	}

	const size = points.length;
	const pointAt = (index: number): Point => points[(index + size) % size] as Point;
	let path = `M ${roundCoordinate(pointAt(0).x)} ${roundCoordinate(pointAt(0).y)}`;
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
		path += ` C ${roundCoordinate(firstControl.x)} ${roundCoordinate(firstControl.y)} ${roundCoordinate(secondControl.x)} ${roundCoordinate(secondControl.y)} ${roundCoordinate(next.x)} ${roundCoordinate(next.y)}`;
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

/**
 * The pillow hull's Catmull-Rom control offsets grow with neighbor edge
 * length, so a tall hull's long sides balloon the arc over its short caps:
 * top and bottom read several times as padded as the sides. This variant
 * clamps only the outward-normal component of each control point to a
 * bulge allowance — anchors stay put, side billows and corner roundness
 * (the tangential component) are untouched, and edges already within the
 * allowance render byte-identically to the classic pillow.
 */
function clampedPillowPath(points: readonly Point[], tension: number, maxBulge: number): string {
	if (points.length < 3) return smoothClosedPath(points, tension);
	const size = points.length;
	const at = (index: number): Point => points[(index + size) % size] as Point;
	const centroid = {
		x: points.reduce((sum, point) => sum + point.x, 0) / size,
		y: points.reduce((sum, point) => sum + point.y, 0) / size,
	};
	// A cubic with both controls offset outward by d peaks at ~0.75 d.
	const controlLimit = maxBulge / 0.75;
	let path = `M ${roundCoordinate(at(0).x)} ${roundCoordinate(at(0).y)}`;
	for (let index = 0; index < size; index += 1) {
		const previous = at(index - 1);
		const current = at(index);
		const next = at(index + 1);
		const after = at(index + 2);
		const edge = { x: next.x - current.x, y: next.y - current.y };
		const length = Math.hypot(edge.x, edge.y) || 1;
		let normal = { x: edge.y / length, y: -edge.x / length };
		const mid = { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 };
		if ((mid.x - centroid.x) * normal.x + (mid.y - centroid.y) * normal.y < 0) {
			normal = { x: -normal.x, y: -normal.y };
		}
		const clampOutward = (offset: { x: number; y: number }): { x: number; y: number } => {
			const outward = offset.x * normal.x + offset.y * normal.y;
			if (outward <= controlLimit) return offset;
			const trim = outward - controlLimit;
			return { x: offset.x - normal.x * trim, y: offset.y - normal.y * trim };
		};
		const first = clampOutward({
			x: ((next.x - previous.x) / 6) * tension,
			y: ((next.y - previous.y) / 6) * tension,
		});
		const second = clampOutward({
			x: ((current.x - after.x) / 6) * tension,
			y: ((current.y - after.y) / 6) * tension,
		});
		path += ` C ${roundCoordinate(current.x + first.x)} ${roundCoordinate(current.y + first.y)} ${roundCoordinate(next.x + second.x)} ${roundCoordinate(next.y + second.y)} ${roundCoordinate(next.x)} ${roundCoordinate(next.y)}`;
	}
	return `${path} Z`;
}

export function blobPath(rectangles: readonly Rect[], padding: number): string {
	const hull = expandedRectangleHull(rectangles, padding);
	// Allowance of one padding puts the cap air in the same band as the
	// side air; the pillow keeps its curvature, just without the balloon.
	return clampedPillowPath(hull, 0.5, Math.max(10, padding));
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
	let path = `M ${roundCoordinate(first.x)} ${roundCoordinate(first.y)}`;
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
		path += ` C ${roundCoordinate(firstControl.x)} ${roundCoordinate(firstControl.y)} ${roundCoordinate(secondControl.x)} ${roundCoordinate(secondControl.y)} ${roundCoordinate(end.x)} ${roundCoordinate(end.y)}`;
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
		`M ${roundCoordinate(first.start.x)} ${roundCoordinate(first.start.y)}`,
		...curves.map(
			(curve) =>
				`C ${roundCoordinate(curve.control1.x)} ${roundCoordinate(curve.control1.y)} ${roundCoordinate(curve.control2.x)} ${roundCoordinate(curve.control2.y)} ${roundCoordinate(curve.end.x)} ${roundCoordinate(curve.end.y)}`,
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

/**
 * Tangent length out of a port for an S-curve between axis-aligned ports.
 * Half the port-axis distance gives the classic midpoint S; the floor keeps
 * the curve turning out of the port when the endpoints sit nearly level, so
 * a flat connector still departs and arrives perpendicular instead of
 * degenerating into a straight line. The floor grows with the cross-axis
 * run (a longer sweep earns more turning room) and is capped so short
 * links stay tight.
 */
function portReach(alongAxis: number, acrossAxis: number): number {
	return Math.max(Math.abs(alongAxis) / 2, Math.min(32, Math.abs(acrossAxis) * 0.25));
}

export function verticalBumpPath(from: Point, to: Point): string {
	const sign = Math.sign(to.y - from.y) || 1;
	const reach = sign * portReach(to.y - from.y, to.x - from.x);
	return `M ${roundCoordinate(from.x)} ${roundCoordinate(from.y)} C ${roundCoordinate(from.x)} ${roundCoordinate(from.y + reach)} ${roundCoordinate(to.x)} ${roundCoordinate(to.y - reach)} ${roundCoordinate(to.x)} ${roundCoordinate(to.y)}`;
}

export function horizontalBumpPath(from: Point, to: Point): string {
	const sign = Math.sign(to.x - from.x) || 1;
	const reach = sign * portReach(to.x - from.x, to.y - from.y);
	return `M ${roundCoordinate(from.x)} ${roundCoordinate(from.y)} C ${roundCoordinate(from.x + reach)} ${roundCoordinate(from.y)} ${roundCoordinate(to.x - reach)} ${roundCoordinate(to.y)} ${roundCoordinate(to.x)} ${roundCoordinate(to.y)}`;
}

/**
 * Curved route for a side-port child link. Sweeping links keep the legacy
 * bundled bow, but on a steep link that bow collapses into a near-vertical
 * line hanging out of a horizontal port; those switch to the S-curve whose
 * tangent floor keeps both ends turning into their ports.
 */
export function childCurvePath(from: Point, to: Point): string {
	if (Math.abs(to.y - from.y) > Math.abs(to.x - from.x)) return horizontalBumpPath(from, to);
	return bundledCurvePath(from, to);
}

export function bundledCurvePath(from: Point, to: Point, curveDistance = 0.15): string {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.hypot(dx, dy);
	if (length === 0) return `M ${roundCoordinate(from.x)} ${roundCoordinate(from.y)}`;
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
		`M ${roundCoordinate(from.x)} ${roundCoordinate(from.y)}`,
		`L ${roundCoordinate(entry.x)} ${roundCoordinate(entry.y)}`,
		`C ${roundCoordinate(firstControl.x)} ${roundCoordinate(firstControl.y)} ${roundCoordinate(secondControl.x)} ${roundCoordinate(secondControl.y)} ${roundCoordinate(centre.x)} ${roundCoordinate(centre.y)}`,
		`C ${roundCoordinate(thirdControl.x)} ${roundCoordinate(thirdControl.y)} ${roundCoordinate(fourthControl.x)} ${roundCoordinate(fourthControl.y)} ${roundCoordinate(exit.x)} ${roundCoordinate(exit.y)}`,
		`L ${roundCoordinate(to.x)} ${roundCoordinate(to.y)}`,
	].join(" ");
}
