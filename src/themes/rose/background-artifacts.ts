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
					fill: index % 2 === 0 ? blush : lavender,
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
				stroke: lavender,
				...outline,
			},
			{ kind: "circle", cx: 0, cy: 0, radius: 3, fill: pearl },
			{ kind: "circle", cx: 19, cy: -16, radius: 2, fill: blush },
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
				stroke: lavender,
				strokeWidth: 1.2,
				fill: "none",
			},
			{ kind: "circle", cx: 0, cy: 1, radius: 3.4, fill: pearl },
		];
	}
	if (motif === 4) {
		const palette = [blush, lavender, berry, pearl] as const;
		return Array.from({ length: 9 }, (_, index): LayoutBackgroundArtifactShape => {
			const angle = index * 0.92 + variant * 0.15;
			const distance = 4 + index * 2.2;
			return {
				kind: "circle",
				cx: Math.cos(angle) * distance,
				cy: Math.sin(angle) * distance,
				radius: 1.8 + (index % 3) * 0.55,
				fill: palette[index % palette.length] ?? blush,
			};
		});
	}
	if (motif === 5) {
		return [
			{
				kind: "path",
				d: `M -24 4 C -18 -${8 + variant} -12 -${8 + variant} -6 4 S 6 ${16 + variant} 12 4 S 20 -${8 + variant} 25 4`,
				stroke: blush,
				...outline,
			},
			{ kind: "circle", cx: -24, cy: 4, radius: 2.7, fill: pearl },
			{ kind: "circle", cx: 25, cy: 4, radius: 2.7, fill: berry },
		];
	}
	return [
		{ kind: "circle", cx: -13, cy: 5, radius: 10, stroke: lavender, ...outline },
		{ kind: "circle", cx: 4, cy: -7, radius: 7, stroke: blush, ...outline },
		{ kind: "circle", cx: 17, cy: 9, radius: 4, fill: berry },
		{ kind: "circle", cx: 20, cy: -15, radius: 2.4, fill: pearl },
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
			artifacts.push({
				id: `rose-background-${column}-${row}`,
				bounds,
				transform: `translate(${x} ${y}) rotate(${roundArtifactCoordinate(random() * 360)}) scale(${roundArtifactCoordinate(size / 50)})`,
				shapes: motifShapes(Math.floor(random() * 7), Math.floor(random() * 3)),
			});
		}
	}

	return artifacts;
}
