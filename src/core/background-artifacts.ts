import type { Rect } from "../types.ts";
import { rectanglesOverlap } from "./geometry.ts";

function hashSeed(value: string): number {
	let hash = 0x811c9dc5;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

export function createSeededRandom(seed: string): () => number {
	let state = hashSeed(seed) || 0x6d2b79f5;
	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
	};
}

export function roundArtifactCoordinate(value: number): number {
	return Math.round(value * 100) / 100;
}

export function isInOuterVoid(
	bounds: Rect,
	avoid: readonly Rect[],
	canvasWidth: number,
	emptyRowEdgeRatio: number,
): boolean {
	const verticallyRelevant = avoid.filter(
		(rectangle) =>
			bounds.y < rectangle.y + rectangle.height && bounds.y + bounds.height > rectangle.y,
	);
	if (verticallyRelevant.length === 0) {
		return (
			bounds.x + bounds.width <= canvasWidth * emptyRowEdgeRatio ||
			bounds.x >= canvasWidth * (1 - emptyRowEdgeRatio)
		);
	}
	const contentLeft = Math.min(...verticallyRelevant.map((rectangle) => rectangle.x));
	const contentRight = Math.max(
		...verticallyRelevant.map((rectangle) => rectangle.x + rectangle.width),
	);
	return bounds.x + bounds.width <= contentLeft || bounds.x >= contentRight;
}

export function intersectsAny(bounds: Rect, rectangles: readonly Rect[]): boolean {
	return rectangles.some((rectangle) => rectanglesOverlap(bounds, rectangle));
}
