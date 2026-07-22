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

const tileSize = 150;
const edgeInset = 20;
const primary = "var(--roadmap-background-artifact-primary)";
const secondary = "var(--roadmap-background-artifact-secondary)";
const accent = "var(--roadmap-background-artifact-accent)";
const coral = "var(--roadmap-background-artifact-coral)";
const strokeWidth = "var(--roadmap-background-artifact-stroke-width)";

function motifShapes(motif: number, variant: number): readonly LayoutBackgroundArtifactShape[] {
	const common = { fill: "none", strokeWidth } as const;
	if (motif === 0) {
		const rise = 5 + variant;
		return [
			{
				kind: "path",
				d: `M -24 0 C -20 -${rise} -16 -${rise} -12 0 S -4 ${rise} 0 0 S 8 -${rise} 12 0 S 20 ${rise} 24 0`,
				stroke: primary,
				...common,
			},
			{ kind: "circle", cx: -24, cy: 0, radius: 2.8, fill: secondary },
			{ kind: "circle", cx: 24, cy: 0, radius: 2.8, fill: coral },
		];
	}
	if (motif === 1) {
		return [
			{
				kind: "path",
				d: `M -23 9 Q -7 -${18 + variant} 22 -5`,
				stroke: secondary,
				strokeWidth: 1,
				fill: "none",
			},
			{ kind: "circle", cx: -22, cy: 7, radius: 3.1, fill: accent },
			{ kind: "circle", cx: -13, cy: -5, radius: 2.2, fill: coral },
			{ kind: "circle", cx: -1, cy: -12 - variant, radius: 3.5, fill: primary },
			{ kind: "circle", cx: 12, cy: -11, radius: 2.4, fill: secondary },
			{ kind: "circle", cx: 22, cy: -5, radius: 2.8, fill: coral },
		];
	}
	if (motif === 2) {
		return [
			{
				kind: "circle",
				cx: 0,
				cy: 0,
				radius: 9 + variant,
				fill: "none",
				stroke: primary,
				strokeWidth,
			},
			{
				kind: "path",
				d: "M -23 4 C -12 -8 12 -10 23 -2 C 12 10 -12 12 -23 4 Z",
				stroke: secondary,
				strokeWidth: 1.5,
				fill: "none",
			},
			{ kind: "circle", cx: -22, cy: 4, radius: 2.8, fill: accent },
			{ kind: "circle", cx: 22, cy: -2, radius: 2.4, fill: coral },
			{ kind: "circle", cx: 12, cy: 15, radius: 1.9, fill: secondary },
		];
	}
	if (motif === 3) {
		return [
			{
				kind: "path",
				d: "M -21 -13 C -17 -19 -9 -17 -8 -11 C -10 -5 -18 -5 -21 -13 Z",
				fill: coral,
			},
			{
				kind: "path",
				d: `M 1 -20 C ${7 + variant} -24 13 -17 10 -11 C 5 -8 -1 -13 1 -20 Z`,
				fill: secondary,
			},
			{
				kind: "path",
				d: "M 12 2 C 20 -2 25 5 20 11 C 13 14 8 8 12 2 Z",
				fill: accent,
			},
			{
				kind: "path",
				d: "M -15 8 C -8 5 -4 12 -8 18 C -15 20 -20 14 -15 8 Z",
				fill: primary,
			},
			{ kind: "circle", cx: 3, cy: 7, radius: 2.1, fill: coral },
			{ kind: "circle", cx: 18, cy: -15, radius: 1.8, fill: primary },
		];
	}
	if (motif === 4) {
		return Array.from({ length: 12 }, (_, index): LayoutBackgroundArtifactShape => {
			const column = index % 4;
			const row = Math.floor(index / 4);
			const palette = [primary, secondary, coral, accent] as const;
			return {
				kind: "circle",
				cx: -18 + column * 12 + (row % 2) * 4,
				cy: -12 + row * 12,
				radius: 1.7 + ((column + row + variant) % 3) * 0.8,
				fill: palette[(column + row) % palette.length] ?? primary,
			};
		});
	}
	if (motif === 5) {
		return [
			{ kind: "circle", cx: -13, cy: 8, radius: 10, fill: "none", stroke: primary, strokeWidth },
			{
				kind: "circle",
				cx: 5,
				cy: -5,
				radius: 7,
				fill: "none",
				stroke: secondary,
				strokeWidth: 1.5,
			},
			{ kind: "circle", cx: 17, cy: -15, radius: 4, fill: "none", stroke: coral, strokeWidth: 1.5 },
			{ kind: "circle", cx: 18, cy: 12, radius: 2.8, fill: accent },
			{ kind: "circle", cx: -23, cy: -12, radius: 2.2, fill: coral },
		];
	}
	if (motif === 6) {
		return [
			{ kind: "path", d: "M -21 -15 L -12 -7", stroke: coral, ...common },
			{ kind: "path", d: "M 4 -21 L 2 -10", stroke: secondary, ...common },
			{ kind: "path", d: "M 12 5 L 23 1", stroke: accent, ...common },
			{ kind: "path", d: "M -17 15 L -7 12", stroke: primary, ...common },
			{ kind: "circle", cx: -1, cy: 3, radius: 3.2, fill: coral },
			{ kind: "circle", cx: 17, cy: 17, radius: 2.4, fill: secondary },
		];
	}
	if (motif === 7) {
		const palette = [primary, coral, secondary, accent] as const;
		return Array.from(
			{ length: 8 },
			(_, index): LayoutBackgroundArtifactShape => ({
				kind: "circle",
				cx: -24 + index * 7,
				cy: Math.sin((index + variant) * 0.95) * 8,
				radius: 1.8 + (index % 3) * 0.55,
				fill: palette[index % palette.length] ?? primary,
			}),
		);
	}
	if (motif === 8) {
		return [
			{
				kind: "path",
				d: "M 0 -5 C -8 -18 -17 -13 -13 -4 C -10 1 -5 2 0 0 C 5 2 10 1 13 -4 C 17 -13 8 -18 0 -5 Z",
				stroke: secondary,
				strokeWidth: 1.5,
				fill: "none",
			},
			{
				kind: "path",
				d: "M -4 1 C -18 4 -17 14 -7 15 C -1 15 2 10 0 5 C 2 10 7 15 13 12 C 22 7 16 -1 4 0 Z",
				stroke: coral,
				strokeWidth: 1.5,
				fill: "none",
			},
			{ kind: "circle", cx: 0, cy: 1, radius: 3.2 + variant * 0.35, fill: accent },
			{ kind: "circle", cx: -15, cy: -8, radius: 2, fill: primary },
			{ kind: "circle", cx: 15, cy: 9, radius: 1.8, fill: secondary },
		];
	}
	if (motif === 9) {
		const orbit = Array.from({ length: 6 }, (_, index): LayoutBackgroundArtifactShape => {
			const angle = (index * Math.PI) / 3 + variant * 0.12;
			const palette = [primary, secondary, coral, accent] as const;
			return {
				kind: "circle",
				cx: Math.cos(angle) * 18,
				cy: Math.sin(angle) * 18,
				radius: 2.2 + (index % 2) * 0.9,
				fill: palette[index % palette.length] ?? primary,
			};
		});
		return [
			{ kind: "circle", cx: 0, cy: 0, radius: 6, fill: "none", stroke: coral, strokeWidth },
			...orbit,
		];
	}
	return [
		{ kind: "path", d: "M -21 -7 L -15 -14 L -8 -8 L -14 -1 Z", fill: secondary },
		{ kind: "path", d: "M 2 -17 L 8 -22 L 13 -15 L 6 -10 Z", fill: coral },
		{ kind: "path", d: "M 11 4 L 20 0 L 23 8 L 15 13 Z", fill: accent },
		{ kind: "path", d: "M -14 12 L -7 8 L -2 16 L -10 21 Z", fill: primary },
		{ kind: "circle", cx: 2, cy: 3, radius: 2.2, fill: secondary },
	];
}

export function generateFunBackgroundArtifacts({
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
			const random = createSeededRandom(`${settings.seed}:${column}:${row}`);
			if (random() >= settings.density * 0.72) continue;
			const size = roundArtifactCoordinate((24 + random() * 28) * settings.size);
			const x = roundArtifactCoordinate(
				Math.min(
					width - edgeInset - size / 2,
					Math.max(edgeInset + size / 2, column * tileSize + 18 + random() * (tileSize - 36)),
				),
			);
			const y = roundArtifactCoordinate(
				Math.min(
					height - edgeInset - size / 2,
					Math.max(edgeInset + size / 2, row * tileSize + 18 + random() * (tileSize - 36)),
				),
			);
			const bounds = {
				x: x - size / 2 - 7,
				y: y - size / 2 - 7,
				width: size + 14,
				height: size + 14,
			};
			if (intersectsAny(bounds, avoid)) continue;
			if (!isInOuterVoid(bounds, avoid, width, 0.28)) continue;
			if (intersectsAny(bounds, accepted)) continue;
			accepted.push(bounds);
			const motif = Math.floor(random() * 11);
			const rotation = roundArtifactCoordinate(random() * 360);
			const variant = Math.floor(random() * 3);
			artifacts.push({
				id: `fun-background-${column}-${row}`,
				bounds,
				transform: `translate(${x} ${y}) rotate(${rotation}) scale(${roundArtifactCoordinate(size / 48)})`,
				shapes: motifShapes(motif, variant),
			});
		}
	}
	return artifacts;
}
