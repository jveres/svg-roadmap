import type { Rect } from "../types.ts";
import { rectanglesOverlap } from "./geometry.ts";
import { hashNumber } from "./strings.ts";

export function createSeededRandom(seed: string): () => number {
	// FNV hashes of near-identical seeds (adjacent tile coordinates) are
	// themselves correlated, which made neighboring tiles draw similar
	// sequences — the same motifs clustering in the same area. A murmur-style
	// finalizer gives the initial state full avalanche before the stream runs.
	let state = hashNumber(seed) || 0x6d2b79f5;
	state = Math.imul(state ^ (state >>> 16), 0x85ebca6b);
	state = Math.imul(state ^ (state >>> 13), 0xc2b2ae35);
	state = (state ^ (state >>> 16)) >>> 0;
	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
	};
}

/**
 * Deals motif indices like a shuffled deck: every motif appears once before
 * any repeats, so a canvas never shows three of one shape while others are
 * absent. Independent per-tile draws cluster far more than intuition expects
 * (birthday paradox); cycling bounds repeats at the cost of none of the
 * determinism.
 */
export function createMotifCycler(seed: string, motifCount: number): () => number {
	const random = createSeededRandom(`motif-cycle:${seed}`);
	let deck: number[] = [];
	return () => {
		if (deck.length === 0) {
			deck = Array.from({ length: motifCount }, (_, index) => index);
			for (let index = deck.length - 1; index > 0; index -= 1) {
				const swap = Math.floor(random() * (index + 1));
				const held = deck[index] as number;
				deck[index] = deck[swap] as number;
				deck[swap] = held;
			}
		}
		return deck.pop() ?? 0;
	};
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
