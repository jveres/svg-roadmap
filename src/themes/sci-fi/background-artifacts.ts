import {
	createMotifCycler,
	createSeededRandom,
	intersectsAny,
	isInOuterVoid,
} from "../../core/background-artifacts.ts";
import { roundCoordinate } from "../../core/geometry.ts";
import type {
	BackgroundArtifactContext,
	LayoutBackgroundArtifact,
	LayoutBackgroundArtifactShape,
	Rect,
} from "../../types.ts";

const tileSize = 170;
const edgeInset = 24;
const cyan = "var(--roadmap-sci-fi-artifact-cyan)";
const violet = "var(--roadmap-sci-fi-artifact-violet)";
const mint = "var(--roadmap-sci-fi-artifact-mint)";
const strokeWidth = "var(--roadmap-sci-fi-artifact-stroke-width)";

function motifShapes(motif: number, variant: number): readonly LayoutBackgroundArtifactShape[] {
	const outline = { fill: "none", strokeWidth } as const;
	const thin = { fill: "none", strokeWidth: 1 } as const;
	if (motif === 0) {
		// Ringed planet with a small moon.
		return [
			{ kind: "circle", cx: 0, cy: 0, radius: 11, stroke: cyan, ...outline },
			{ kind: "path", d: "M -7 -5 Q -2 -2 4 -6 M -8 3 Q 0 6 8 2", stroke: violet, ...thin },
			{
				kind: "path",
				d: "M -24 5 C -16 -6 16 -11 24 -4 M 24 -4 C 20 1 14 4 8 6 M -24 5 C -21 8 -15 10 -9 10",
				stroke: violet,
				...outline,
			},
			{
				kind: "circle",
				cx: 19,
				cy: -13,
				radius: 2 + variant * 0.3,
				fill: mint,
				animation: "blink",
			},
		];
	}
	if (motif === 1) {
		// Radar dial with a sweep arm and a blip.
		return [
			{ kind: "circle", cx: 0, cy: 0, radius: 20, stroke: cyan, ...outline },
			{ kind: "circle", cx: 0, cy: 0, radius: 12.5, stroke: violet, ...thin },
			{ kind: "circle", cx: 0, cy: 0, radius: 5.5, stroke: violet, ...thin },
			{
				kind: "path",
				d: "M 0 0 L 13 -15 M 0 -20 L 0 -23 M 20 0 L 23 0 M 0 20 L 0 23 M -20 0 L -23 0",
				stroke: cyan,
				...outline,
			},
			{ kind: "circle", cx: 8, cy: -9, radius: 2.2, fill: mint, animation: "blink" },
		];
	}
	if (motif === 2) {
		// Satellite with solar panels, dish, and an outgoing signal.
		return [
			{ kind: "path", d: "M -5 -4 L 5 -4 L 5 4 L -5 4 Z", stroke: cyan, ...outline },
			{
				kind: "path",
				d: "M -20 -3 L -8 -3 L -8 3 L -20 3 Z M -16 -3 L -16 3 M -12 -3 L -12 3",
				stroke: violet,
				...thin,
			},
			{
				kind: "path",
				d: "M 8 -3 L 20 -3 L 20 3 L 8 3 Z M 12 -3 L 12 3 M 16 -3 L 16 3",
				stroke: violet,
				...thin,
			},
			{ kind: "path", d: "M 0 -4 L 0 -9 M -4 -12 Q 0 -16 4 -12", stroke: cyan, ...outline },
			{ kind: "path", d: "M -8 -16 Q 0 -24 8 -16", stroke: mint, ...thin },
			{ kind: "circle", cx: 0, cy: -10, radius: 1.6, fill: mint, animation: "blink" },
		];
	}
	if (motif === 3) {
		// Circuit chip with pins and corner traces.
		return [
			{ kind: "path", d: "M -9 -9 L 9 -9 L 9 9 L -9 9 Z", stroke: cyan, ...outline },
			{
				kind: "path",
				d: "M -4 -9 L -4 -16 M 4 -9 L 4 -16 M -4 9 L -4 16 M 4 9 L 4 16 M -9 -4 L -16 -4 M -9 4 L -16 4 M 9 -4 L 16 -4 M 9 4 L 16 4",
				stroke: violet,
				...thin,
			},
			{ kind: "path", d: "M -16 -16 L -16 -4 M 16 16 L 16 4", stroke: cyan, ...thin },
			{ kind: "circle", cx: 0, cy: 0, radius: 2.4, fill: mint, animation: "blink" },
		];
	}
	if (motif === 4) {
		// Comet streaking with a tapered tail.
		return [
			{ kind: "circle", cx: 14, cy: -8, radius: 3 + variant * 0.4, fill: mint },
			{
				kind: "path",
				d: "M 9 -5 L -14 6 M 10 -9 L -20 -2 M 12 -3 L -6 8",
				stroke: cyan,
				...outline,
			},
			{ kind: "path", d: "M -18 8 L -24 11", stroke: violet, ...thin },
		];
	}
	if (motif === 5) {
		// Crossing electron orbits around a nucleus.
		return [
			{
				kind: "path",
				d: "M -22 8 C -12 -6 12 -18 22 -8 C 13 6 -12 18 -22 8 Z",
				stroke: cyan,
				...outline,
			},
			{
				kind: "path",
				d: "M -8 -22 C -18 -10 -6 14 8 22 C 18 10 6 -14 -8 -22 Z",
				stroke: violet,
				...thin,
			},
			{ kind: "circle", cx: 0, cy: 0, radius: 2.6, fill: mint },
			{ kind: "circle", cx: 17, cy: -6, radius: 1.8, fill: cyan, animation: "blink" },
		];
	}
	if (motif === 6) {
		// HUD reticle with corner brackets.
		return [
			{
				kind: "path",
				d: "M -20 -12 L -20 -20 L -12 -20 M 12 -20 L 20 -20 L 20 -12 M 20 12 L 20 20 L 12 20 M -12 20 L -20 20 L -20 12",
				stroke: cyan,
				...outline,
			},
			{ kind: "path", d: "M -7 0 L 7 0 M 0 -7 L 0 7", stroke: violet, ...thin },
			{ kind: "circle", cx: 0, cy: 0, radius: 11, stroke: violet, ...thin },
			{ kind: "circle", cx: 8, cy: -8, radius: 1.8, fill: mint, animation: "blink" },
		];
	}
	// Data-stream chevrons.
	return [
		{
			kind: "path",
			d: "M -18 -8 L -10 0 L -18 8 M -6 -8 L 2 0 L -6 8 M 6 -8 L 14 0 L 6 8",
			stroke: cyan,
			...outline,
		},
		{ kind: "path", d: "M 18 -8 L 26 0 L 18 8", stroke: violet, ...thin },
		{ kind: "circle", cx: -24, cy: 0, radius: 1.6 + variant * 0.3, fill: mint, animation: "blink" },
	];
}

export function generateSciFiBackgroundArtifacts({
	width,
	height,
	settings,
	avoid,
}: BackgroundArtifactContext): readonly LayoutBackgroundArtifact[] {
	if (!settings.enabled || settings.density <= 0) return [];
	const columns = Math.ceil(width / tileSize);
	const rows = Math.ceil(height / tileSize);
	const artifacts: LayoutBackgroundArtifact[] = [];
	const accepted: Rect[] = [];
	const nextMotif = createMotifCycler(`sci-fi:${settings.seed}`, 8);
	for (let row = 0; row < rows; row += 1) {
		for (let column = 0; column < columns; column += 1) {
			const random = createSeededRandom(`sci-fi:${settings.seed}:${column}:${row}`);
			if (random() >= settings.density * 0.62) continue;
			const size = roundCoordinate((28 + random() * 32) * settings.size);
			const x = roundCoordinate(
				Math.min(
					width - edgeInset - size / 2,
					Math.max(edgeInset + size / 2, column * tileSize + 22 + random() * (tileSize - 44)),
				),
			);
			const y = roundCoordinate(
				Math.min(
					height - edgeInset - size / 2,
					Math.max(edgeInset + size / 2, row * tileSize + 22 + random() * (tileSize - 44)),
				),
			);
			const bounds = {
				x: x - size / 2 - 8,
				y: y - size / 2 - 8,
				width: size + 16,
				height: size + 16,
			};
			if (intersectsAny(bounds, avoid)) continue;
			if (!isInOuterVoid(bounds, avoid, width, 0.3)) continue;
			if (intersectsAny(bounds, accepted)) continue;
			accepted.push(bounds);
			artifacts.push({
				id: `sci-fi-background-${column}-${row}`,
				bounds,
				// A gentle tilt only: these motifs depict objects with a clear
				// "up", and full rotation reads as abstract scribbles.
				transform: `translate(${x} ${y}) rotate(${roundCoordinate((random() - 0.5) * 36)}) scale(${roundCoordinate(size / 52)})`,
				shapes: motifShapes(nextMotif(), Math.floor(random() * 3)),
			});
		}
	}
	return artifacts;
}
