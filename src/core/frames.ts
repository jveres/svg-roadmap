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

	return node.text.lines.map((line, index): PaintedTextLine => {
		const y = blockTop + index * lineHeight;
		const width = line.width * scale * renderScaleX;
		return {
			x: node.x + (node.width - width) / 2,
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
	const padding = 5 * scale;
	const safety = 2 * scale;
	const minY = Math.min(...lines.map((line) => line.y));
	const maxY = Math.max(...lines.map((line) => line.y + line.height));
	const width = node.width;
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
		if (outside.length === 0) return rectangle;
		if (outside.some((point) => point.y <= contentCenterY)) top -= scale;
		if (outside.some((point) => point.y > contentCenterY)) bottom += scale;
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
	const padding = Math.max(4, fontSize * 0.3);
	const verticalSafety = 1;
	const curveClearance = Math.max(1.5, fontSize * 0.12);
	const top = Math.min(...lines.map((line) => line.y)) - padding;
	const bottom = Math.max(...lines.map((line) => line.y + line.height)) + padding;
	const centerX = node.x + node.width / 2;
	// Optical vertical centering: line boxes reserve a full descender row that
	// mostly reads as empty space, so center the capsule on the cap-height
	// band (first cap top to last baseline) instead of on the boxes — growing
	// the height symmetrically so the shifted capsule still covers every line.
	const centerY = (firstLine.baseline - fontSize * 0.72 + lastLine.baseline) / 2;
	const height = 2 * Math.max(centerY - top, bottom - centerY);
	let width = Math.max(...lines.map((line) => line.width)) + padding * 2;
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
	if (node.kind !== "note") return node;
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

export function noteLayoutRectangle(node: LayoutNode): Rect {
	return paintedNodeFrameRectangle(node);
}
