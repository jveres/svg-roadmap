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

const tileSize = 160;
const edgeInset = 22;
const blush = "var(--roadmap-rose-artifact-blush)";
const berry = "var(--roadmap-rose-artifact-berry)";
const lavender = "var(--roadmap-rose-artifact-lavender)";
const pearl = "var(--roadmap-rose-artifact-pearl)";
const apricot = "var(--roadmap-rose-artifact-apricot)";
const mint = "var(--roadmap-rose-artifact-mint)";
const sky = "var(--roadmap-rose-artifact-sky)";
const strokeWidth = "var(--roadmap-rose-artifact-stroke-width)";

function motifShapes(motif: number, variant: number): readonly LayoutBackgroundArtifactShape[] {
	const outline = { fill: "none", strokeWidth } as const;
	if (motif === 0) {
		return [
			{
				kind: "path",
				d: "M 0 -4 C -7 -18 -18 -13 -14 -3 C -11 4 -5 5 0 1 C 5 5 11 4 14 -3 C 18 -13 7 -18 0 -4 Z",
				stroke: berry,
				...outline,
			},
			{ kind: "circle", cx: 0, cy: 1, radius: 2.8, fill: pearl },
			{ kind: "circle", cx: 12, cy: 9, radius: 2, fill: mint },
		];
	}
	if (motif === 1) {
		const petals = [
			"M 0 -3 C -8 -8 -7 -17 0 -19 C 7 -17 8 -8 0 -3 Z",
			"M 3 0 C 8 -8 17 -7 19 0 C 17 7 8 8 3 0 Z",
			"M 0 3 C 8 8 7 17 0 19 C -7 17 -8 8 0 3 Z",
			"M -3 0 C -8 8 -17 7 -19 0 C -17 -7 -8 -8 -3 0 Z",
		] as const;
		return [
			...petals.map(
				(d, index): LayoutBackgroundArtifactShape => ({
					kind: "path",
					d,
					fill: [blush, lavender, apricot, sky][index] ?? blush,
				}),
			),
			{ kind: "circle", cx: 0, cy: 0, radius: 4 + variant * 0.4, fill: pearl },
		];
	}
	if (motif === 2) {
		return [
			{
				kind: "path",
				d: "M 0 -22 L 3 -6 L 17 -13 L 7 0 L 20 7 L 4 4 L 0 21 L -4 4 L -20 7 L -7 0 L -17 -13 L -3 -6 Z",
				stroke: sky,
				...outline,
			},
			{ kind: "circle", cx: 0, cy: 0, radius: 3, fill: pearl },
			{ kind: "circle", cx: 19, cy: -16, radius: 2, fill: apricot },
			{ kind: "circle", cx: -17, cy: 15, radius: 1.8, fill: mint },
		];
	}
	if (motif === 3) {
		return [
			{
				kind: "path",
				d: "M -2 0 C -12 -14 -25 -9 -20 3 C -15 12 -7 8 -2 3 M 2 0 C 12 -14 25 -9 20 3 C 15 12 7 8 2 3",
				stroke: berry,
				...outline,
			},
			{
				kind: "path",
				d: "M -2 2 L -14 19 L 0 12 L 14 19 L 2 2",
				stroke: sky,
				strokeWidth: 1.2,
				fill: "none",
			},
			{ kind: "circle", cx: 0, cy: 1, radius: 3.4, fill: pearl },
		];
	}
	if (motif === 4) {
		const pearlColors = [pearl, apricot, lavender, mint, berry, sky, pearl] as const;
		return [
			{
				kind: "path",
				d: "M -24 -4 Q -12 14 0 2 Q 12 14 24 -4",
				stroke: lavender,
				strokeWidth: 1.1,
				fill: "none",
			},
			...pearlColors.map(
				(fill, index): LayoutBackgroundArtifactShape => ({
					kind: "circle",
					cx: -21 + index * 7,
					cy: -1 + Math.sin((index / 6) * Math.PI) * 9,
					radius: 2.1 + (index % 2) * 0.35,
					fill,
				}),
			),
			{
				kind: "path",
				d: "M 0 3 C -6 8 -5 15 0 17 C 5 15 6 8 0 3 Z",
				fill: apricot,
			},
		];
	}
	if (motif === 5) {
		return [
			{
				kind: "path",
				d: `M -25 ${6 + variant} C -17 -10 -8 -10 -2 1 C 5 13 14 13 24 -3`,
				stroke: sky,
				...outline,
			},
			{
				kind: "path",
				d: "M 18 -4 C 10 -12 5 -7 9 -1 C 13 4 17 1 19 -2 C 21 1 25 4 29 -1 C 33 -7 26 -12 20 -4 Z M 18 0 L 14 10 L 20 5 L 25 10 L 21 0",
				stroke: berry,
				strokeWidth: 1.35,
				fill: "none",
			},
			{ kind: "circle", cx: 19.5, cy: -2, radius: 2.4, fill: mint },
		];
	}
	if (motif === 6) {
		return [
			{
				kind: "path",
				d: "M -2 -2 C -10 -18 -24 -13 -19 -1 C -15 8 -7 7 -2 2 M 2 -2 C 10 -18 24 -13 19 -1 C 15 8 7 7 2 2 M -2 3 C -8 11 -5 18 0 10 C 5 18 8 11 2 3",
				stroke: sky,
				...outline,
			},
			{ kind: "circle", cx: 0, cy: -1, radius: 2.2, fill: pearl },
			{ kind: "circle", cx: 0, cy: 4, radius: 1.7, fill: apricot },
		];
	}
	if (motif === 7) {
		return [
			{ kind: "circle", cx: 0, cy: -2, radius: 14, stroke: sky, ...outline },
			{ kind: "circle", cx: 0, cy: -2, radius: 10, stroke: mint, strokeWidth: 1, fill: "none" },
			{
				kind: "path",
				d: "M -4 12 L -10 24 L 0 18 L 10 24 L 4 12",
				stroke: berry,
				strokeWidth: 1.2,
				fill: "none",
			},
			{
				kind: "path",
				d: "M 0 -8 C -5 -12 -9 -6 -5 -2 C -2 1 0 0 0 -2 C 0 0 2 1 5 -2 C 9 -6 5 -12 0 -8 Z",
				fill: pearl,
			},
		];
	}
	const petals = Array.from({ length: 6 }, (_, index): LayoutBackgroundArtifactShape => {
		const angle = (index * Math.PI) / 3;
		return {
			kind: "circle",
			cx: Math.cos(angle) * 7,
			cy: Math.sin(angle) * 7,
			radius: 5,
			fill: [blush, lavender, apricot, mint, sky, lavender][index] ?? blush,
		};
	});
	return [
		...petals,
		{ kind: "circle", cx: 0, cy: 0, radius: 4.2, fill: pearl },
		{
			kind: "path",
			d: "M -5 10 L -12 23 L 0 17 L 12 23 L 5 10",
			stroke: berry,
			strokeWidth: 1.2,
			fill: "none",
		},
	];
}

export function generateRoseBackgroundArtifacts({
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
			const random = createSeededRandom(`rose:${settings.seed}:${column}:${row}`);
			if (random() >= settings.density * 0.66) continue;
			const size = roundArtifactCoordinate((25 + random() * 29) * settings.size);
			const x = roundArtifactCoordinate(
				Math.min(
					width - edgeInset - size / 2,
					Math.max(edgeInset + size / 2, column * tileSize + 20 + random() * (tileSize - 40)),
				),
			);
			const y = roundArtifactCoordinate(
				Math.min(
					height - edgeInset - size / 2,
					Math.max(edgeInset + size / 2, row * tileSize + 20 + random() * (tileSize - 40)),
				),
			);
			const bounds = {
				x: x - size / 2 - 8,
				y: y - size / 2 - 8,
				width: size + 16,
				height: size + 16,
			};
			if (intersectsAny(bounds, avoid)) continue;
			if (!isInOuterVoid(bounds, avoid, width, 0.29)) continue;
			if (intersectsAny(bounds, accepted)) continue;
			accepted.push(bounds);
			const motif = (Math.floor(random() * 9) + column * 2 + row * 3) % 9;
			artifacts.push({
				id: `rose-background-${column}-${row}`,
				bounds,
				transform: `translate(${x} ${y}) rotate(${roundArtifactCoordinate(random() * 360)}) scale(${roundArtifactCoordinate(size / 50)})`,
				shapes: motifShapes(motif, Math.floor(random() * 3)),
			});
		}
	}

	return artifacts;
}
