import type { LayoutNode, Rect } from "../types.ts";
import { organicBlobPolygon, pointInPolygon } from "./geometry.ts";

export interface NoteBlobGeometry {
	readonly frame: Rect;
	readonly lowerInset: number;
	readonly upperInset: number;
	readonly upperShoulderInset: number;
	readonly upperShoulderRatio: number;
}

export interface PaintedTextLine extends Rect {
	readonly baseline: number;
}

interface CachedContentFrame {
	readonly nodeWidth: number;
	readonly nodeHeight: number;
	readonly offsetX: number;
	readonly offsetY: number;
	readonly width: number;
	readonly height: number;
}

const contentFrameCache = new WeakMap<LayoutNode, CachedContentFrame>();

function noteBlobMetrics(node: LayoutNode): Omit<NoteBlobGeometry, "frame"> {
	const scale = node.text.fontSize / 16;
	return {
		lowerInset: 4 * scale,
		upperInset: scale,
		upperShoulderInset: 0.98 * scale,
		upperShoulderRatio: 0.1,
	};
}

export function paintedTextLines(node: LayoutNode): PaintedTextLine[] {
	const scale = node.text.renderScale;
	const fontSize = node.text.fontSize * scale;
	const lineHeight = node.text.lineHeight * scale;
	const totalHeight = node.text.lines.length * lineHeight;
	const blockTop = node.y + (node.height - totalHeight) / 2;
	const renderScaleX = node.text.renderScaleX ?? 1;

	// Aligned blocks (milestone labels, footnotes) keep the block's
	// symmetric margin but rag their lines toward one edge instead of
	// centering each line; a line's hanging indent shifts it further in.
	const widest = Math.max(
		0,
		...node.text.lines.map((line) => (line.width + (line.indent ?? 0)) * scale * renderScaleX),
	);
	const margin = Math.max(0, (node.width - widest) / 2);
	return node.text.lines.map((line, index): PaintedTextLine => {
		const y = blockTop + index * lineHeight;
		const width = line.width * scale * renderScaleX;
		const indent = (line.indent ?? 0) * scale * renderScaleX;
		const x =
			node.text.align === "start"
				? node.x + margin + indent
				: node.text.align === "end"
					? node.x + node.width - margin - width
					: node.x + (node.width - width) / 2;
		return {
			x,
			y,
			width,
			height: lineHeight,
			baseline: y + fontSize * node.text.baselineRatio,
		};
	});
}

function fittedNoteContentRectangle(node: LayoutNode): Rect {
	const lines = paintedTextLines(node);
	if (lines.length === 0) return node;
	const scale = node.text.fontSize / 16;
	const { lowerInset, upperInset, upperShoulderInset, upperShoulderRatio } = noteBlobMetrics(node);
	// The card's paddingY token is the contract; the blob's own constant is
	// only a floor so token-less nodes keep their look. Without this the
	// bubble's vertical air ran at half its horizontal air.
	const padding = Math.max(5 * scale, node.paddingY ?? 0);
	const safety = 2 * scale;
	const minY = Math.min(...lines.map((line) => line.y));
	const maxY = Math.max(...lines.map((line) => line.y + line.height));
	// The blob's side edges wave inward, and the widest line meets the hull
	// at its fattest point: without side allowance the wave eats into the
	// standard horizontal padding exactly where the eye checks it.
	let width = node.width + 8 * scale;
	const centerX = node.x + node.width / 2;
	let top = minY - padding - upperInset - safety;
	let bottom = maxY + padding + lowerInset + safety;
	const contentCenterY = (minY + maxY) / 2;
	const points = lines.flatMap((line) => [
		{ x: line.x - safety, y: line.y - safety },
		{ x: line.x + line.width + safety, y: line.y - safety },
		{ x: line.x + line.width + safety, y: line.y + line.height + safety },
		{ x: line.x - safety, y: line.y + line.height + safety },
	]);

	const expandToContain = (): void => {
		for (let iteration = 0; iteration < 256; iteration += 1) {
			const rectangle = { x: centerX - width / 2, y: top, width, height: bottom - top };
			const polygon = organicBlobPolygon(
				rectangle,
				lowerInset,
				upperInset,
				upperShoulderInset,
				upperShoulderRatio,
			);
			const outside = points.filter((point) => !pointInPolygon(polygon, point));
			if (outside.length === 0) return;
			if (outside.some((point) => point.y <= contentCenterY)) top -= scale;
			if (outside.some((point) => point.y > contentCenterY)) bottom += scale;
			// Vertical growth cannot fix a point outside the wavy side edges;
			// widen as a backstop when violations persist.
			if (iteration % 4 === 3) width += 2 * scale;
		}
	};
	// The fit grows whichever side collides — usually the top, where a wide
	// first line meets the blob's sloped shoulder — leaving the text visibly
	// low in the bubble. Rebalancing equalizes the outer air, but the blob's
	// carves scale with height, so each rebalance re-runs containment and the
	// sequence ends on a containment pass: symmetric to within a couple of
	// pixels, and never leaking paint.
	expandToContain();
	for (let pass = 0; pass < 2; pass += 1) {
		// The eye reads the painted edges, not the rectangle: the blob carves
		// upward from the rect bottom by lowerInset and downward from the top
		// by upperInset, so balance the air against the carved edges.
		const topAir = minY - (top + upperInset);
		const bottomAir = bottom - lowerInset - maxY;
		if (topAir > bottomAir) bottom += topAir - bottomAir;
		else top -= bottomAir - topAir;
		expandToContain();
	}
	return { x: centerX - width / 2, y: top, width, height: bottom - top };
}

function pointInCapsule(
	rectangle: Rect,
	point: { readonly x: number; readonly y: number },
): boolean {
	const radius = rectangle.height / 2;
	const centerY = rectangle.y + radius;
	const leftCenterX = rectangle.x + radius;
	const rightCenterX = rectangle.x + rectangle.width - radius;
	if (point.y < rectangle.y || point.y > rectangle.y + rectangle.height) return false;
	if (point.x >= leftCenterX && point.x <= rightCenterX) return true;
	const capCenterX = point.x < leftCenterX ? leftCenterX : rightCenterX;
	return Math.hypot(point.x - capCenterX, point.y - centerY) <= radius;
}

export function fittedCapsuleFrame(node: LayoutNode): Rect {
	const lines = paintedTextLines(node);
	const firstLine = lines[0];
	const lastLine = lines.at(-1);
	if (!firstLine || !lastLine) return node;
	const fontSize = node.text.fontSize * node.text.renderScale;
	// The theme's padding tokens are the contract; the capsule only adds its
	// curve clearance on top. Font-derived floors remain as a fallback for
	// nodes built without tokens (tests, external callers).
	const paddingY = node.paddingY ?? Math.max(6, fontSize * 0.45);
	// The widest line meets the capsule at its fattest point, so side air
	// needs to be visibly larger than the vertical padding to read as padded.
	const paddingX = node.paddingX ?? Math.max(9, fontSize * 0.7);
	const verticalSafety = 1;
	const curveClearance = Math.max(1.5, fontSize * 0.12);
	const top = Math.min(...lines.map((line) => line.y)) - paddingY;
	const bottom = Math.max(...lines.map((line) => line.y + line.height)) + paddingY;
	const centerX = node.x + node.width / 2;
	// Optical vertical centering: line boxes reserve a full descender row that
	// mostly reads as empty space, so center the capsule on the cap-height
	// band (first cap top to last baseline) instead of on the boxes — growing
	// the height symmetrically so the shifted capsule still covers every line.
	const centerY = (firstLine.baseline - fontSize * 0.72 + lastLine.baseline) / 2;
	const height = 2 * Math.max(centerY - top, bottom - centerY);
	let width = Math.max(...lines.map((line) => line.width)) + paddingX * 2;
	const points = lines.flatMap((line) => {
		// Line widths are pinned by textLength, so a flat safety margin is
		// enough — no allowance needed for fallback-font width drift.
		const horizontalSafety = 2;
		return [
			{ x: line.x - horizontalSafety, y: line.y - verticalSafety },
			{ x: line.x + line.width + horizontalSafety, y: line.y - verticalSafety },
			{
				x: line.x + line.width + horizontalSafety,
				y: line.y + line.height + verticalSafety,
			},
			{ x: line.x - horizontalSafety, y: line.y + line.height + verticalSafety },
		];
	});

	for (let iteration = 0; iteration < 256; iteration += 1) {
		const rectangle = {
			x: centerX - width / 2,
			y: centerY - height / 2,
			width,
			height,
		};
		const interior = {
			x: rectangle.x + curveClearance,
			y: rectangle.y + curveClearance,
			width: rectangle.width - curveClearance * 2,
			height: rectangle.height - curveClearance * 2,
		};
		if (points.every((point) => pointInCapsule(interior, point))) return rectangle;
		width += 2;
	}

	return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}

function cachedContentFrame(node: LayoutNode, create: () => Rect): Rect {
	const cached = contentFrameCache.get(node);
	if (cached && cached.nodeWidth === node.width && cached.nodeHeight === node.height) {
		return {
			x: node.x + cached.offsetX,
			y: node.y + cached.offsetY,
			width: cached.width,
			height: cached.height,
		};
	}
	const frame = create();
	contentFrameCache.set(node, {
		nodeWidth: node.width,
		nodeHeight: node.height,
		offsetX: frame.x - node.x,
		offsetY: frame.y - node.y,
		width: frame.width,
		height: frame.height,
	});
	return frame;
}

export function paintedNodeFrameRectangle(node: LayoutNode): Rect {
	// Milestone labels and the footnotes board paint on their layout box;
	// the content-fitted note frames would report a bubble that isn't there.
	if (
		node.kind !== "note" ||
		node.placement === "milestone-label" ||
		node.placement === "footnotes"
	) {
		return node;
	}
	return cachedContentFrame(node, () =>
		node.frameShape === "capsule" ? fittedCapsuleFrame(node) : fittedNoteContentRectangle(node),
	);
}

export function noteBlobGeometry(node: LayoutNode): NoteBlobGeometry {
	return {
		frame: paintedNodeFrameRectangle(node),
		...noteBlobMetrics(node),
	};
}
