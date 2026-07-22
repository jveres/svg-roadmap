import {
	createSeededRandom,
	intersectsAny,
	isInOuterVoid,
	roundArtifactCoordinate,
} from "../../core/background-artifacts.ts";
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
	if (motif === 0) {
		return [
			{ kind: "circle", cx: 0, cy: 0, radius: 13, stroke: cyan, ...outline },
			{
				kind: "path",
				d: "M -25 3 C -13 -10 14 -12 25 -3 C 13 10 -14 12 -25 3 Z",
				stroke: violet,
				...outline,
			},
			{ kind: "circle", cx: 23, cy: -4, radius: 2.5, fill: mint },
		];
	}
	if (motif === 1) {
		return [
			{
				kind: "path",
				d: "M 0 -23 L 20 -12 L 20 12 L 0 23 L -20 12 L -20 -12 Z",
				stroke: cyan,
				...outline,
			},
			{
				kind: "path",
				d: "M -20 -12 L 0 0 L 20 -12 M 0 0 L 0 23",
				stroke: violet,
				strokeWidth: 1,
				fill: "none",
			},
			{ kind: "circle", cx: 0, cy: 0, radius: 3 + variant * 0.5, fill: mint },
		];
	}
	if (motif === 2) {
		return [
			{
				kind: "path",
				d: "M -24 -14 L -8 -14 L -8 0 L 9 0 L 9 15 L 24 15",
				stroke: cyan,
				...outline,
			},
			{ kind: "circle", cx: -24, cy: -14, radius: 2.4, fill: violet },
			{ kind: "circle", cx: -8, cy: 0, radius: 2.4, fill: mint },
			{ kind: "circle", cx: 24, cy: 15, radius: 2.4, fill: violet },
		];
	}
	if (motif === 3) {
		return [
			{
				kind: "path",
				d: "M -22 10 L -9 -13 L 4 4 L 21 -12",
				stroke: violet,
				strokeWidth: 1,
				fill: "none",
			},
			{ kind: "circle", cx: -22, cy: 10, radius: 3, fill: cyan },
			{ kind: "circle", cx: -9, cy: -13, radius: 2, fill: mint },
			{ kind: "circle", cx: 4, cy: 4, radius: 2.5, fill: cyan },
			{ kind: "circle", cx: 21, cy: -12, radius: 3.2, fill: violet },
		];
	}
	if (motif === 4) {
		return [
			{
				kind: "path",
				d: "M -25 12 Q 0 -22 25 12 M -17 12 Q 0 -10 17 12 M -8 12 Q 0 1 8 12",
				stroke: cyan,
				...outline,
			},
			{ kind: "circle", cx: 0, cy: 12, radius: 2.5, fill: mint },
		];
	}
	return [
		{
			kind: "path",
			d: "M -23 15 L -23 5 M -12 15 L -12 -4 M 0 15 L 0 -17 M 12 15 L 12 -7 M 23 15 L 23 2",
			stroke: violet,
			...outline,
		},
		{ kind: "path", d: "M -27 15 L 27 15", stroke: cyan, strokeWidth: 1, fill: "none" },
		{ kind: "circle", cx: 0, cy: -17, radius: 2 + variant * 0.4, fill: mint },
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
	for (let row = 0; row < rows; row += 1) {
		for (let column = 0; column < columns; column += 1) {
			const random = createSeededRandom(`sci-fi:${settings.seed}:${column}:${row}`);
			if (random() >= settings.density * 0.62) continue;
			const size = roundArtifactCoordinate((28 + random() * 32) * settings.size);
			const x = roundArtifactCoordinate(
				Math.min(
					width - edgeInset - size / 2,
					Math.max(edgeInset + size / 2, column * tileSize + 22 + random() * (tileSize - 44)),
				),
			);
			const y = roundArtifactCoordinate(
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
				transform: `translate(${x} ${y}) rotate(${roundArtifactCoordinate(random() * 360)}) scale(${roundArtifactCoordinate(size / 52)})`,
				shapes: motifShapes(Math.floor(random() * 6), Math.floor(random() * 3)),
			});
		}
	}
	return artifacts;
}
