import {
	createSeededRandom,
	createSpatialMotifPicker,
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

const tileSize = 150;
const edgeInset = 20;
const primary = "var(--roadmap-background-artifact-primary)";
const secondary = "var(--roadmap-background-artifact-secondary)";
const accent = "var(--roadmap-background-artifact-accent)";
const coral = "var(--roadmap-background-artifact-coral)";
const strokeWidth = "var(--roadmap-background-artifact-stroke-width)";

function outline(d: string, stroke = secondary): LayoutBackgroundArtifactShape {
	return { kind: "path", d, fill: "none", stroke, strokeWidth };
}

function motifShapes(motif: number, variant: number): readonly LayoutBackgroundArtifactShape[] {
	if (motif === 0) {
		// Paper plane: two wings and a folded centre, with a short flight trail.
		return [
			outline("M -21 -5 L 23 -18 L 8 18 L 0 3 Z", secondary),
			outline("M 0 3 L 23 -18 M 0 3 L -3 13 L 4 10", primary),
			outline("M -22 11 Q -17 18 -10 17", coral),
		];
	}
	if (motif === 1) {
		// Shooting star: a closed five-point silhouette and two trailing arcs.
		return [
			outline(
				"M 11 -21 L 14 -14 L 22 -13 L 16 -8 L 18 0 L 11 -4 L 4 0 L 6 -8 L 0 -13 L 8 -14 Z",
				accent,
			),
			outline("M 1 -6 Q -12 -2 -23 14", secondary),
			outline("M 5 2 Q -9 7 -15 21", coral),
		];
	}
	if (motif === 2) {
		// Saturn: the rear half of the ring disappears behind the planet.
		return [
			outline("M -22 9 C -29 0 14 -18 23 -8", coral),
			{
				kind: "circle",
				cx: 0,
				cy: -2,
				radius: 12,
				fill: "var(--roadmap-canvas-background)",
				stroke: secondary,
				strokeWidth,
			},
			outline("M -22 9 C -12 18 30 -3 23 -8", coral),
			outline(`M -5 -${8 + variant} Q 1 -${12 + variant} 6 -9`, primary),
		];
	}
	if (motif === 3) {
		// Wrapped sweet, with pinched wrappers and curved candy stripes.
		return [
			outline(
				"M -12 -5 L -23 -11 L -21 0 L -23 11 L -12 5 M 12 -5 L 23 -11 L 21 0 L 23 11 L 12 5",
				accent,
			),
			outline("M -12 0 C -12 -15 12 -15 12 0 C 12 15 -12 15 -12 0 Z", coral),
			outline(`M -${5 + variant} -10 Q 1 -4 -2 10 M 3 -10 Q 9 -4 5 9`, secondary),
		];
	}
	if (motif === 4) {
		// A five-pip die keeps the old dot texture inside a recognizable frame.
		return [
			outline(
				"M -12 -18 H 12 Q 18 -18 18 -12 V 12 Q 18 18 12 18 H -12 Q -18 18 -18 12 V -12 Q -18 -18 -12 -18 Z",
				primary,
			),
			...[-9, 9].flatMap((cx) =>
				[-9, 9].map(
					(cy): LayoutBackgroundArtifactShape => ({
						kind: "circle",
						cx,
						cy,
						radius: 2.5,
						fill: secondary,
					}),
				),
			),
			{ kind: "circle", cx: 0, cy: 0, radius: 2.5, fill: coral },
		];
	}
	if (motif === 5) {
		// Two balloons, with knots and curved strings instead of loose circles.
		return [
			outline("M -7 2 C -24 0 -22 -22 -9 -22 C 4 -22 8 -4 -7 2 Z M -7 2 L -10 5 L -5 5 Z", coral),
			outline("M 11 4 C -1 0 1 -17 12 -17 C 25 -17 26 0 11 4 Z M 11 4 L 8 7 L 13 7 Z", secondary),
			outline(`M -7 5 C -12 13 ${variant} 14 -5 23 M 11 7 C 5 14 15 17 9 24`, primary),
		];
	}
	if (motif === 6) {
		// Sun: a round centre and eight evenly spaced rays.
		return [
			{
				kind: "circle",
				cx: 0,
				cy: 0,
				radius: 10 + variant * 0.4,
				fill: "none",
				stroke: accent,
				strokeWidth,
			},
			outline(
				"M 0 -16 V -23 M 11 -11 L 16 -16 M 16 0 H 23 M 11 11 L 16 16 M 0 16 V 23 M -11 11 L -16 16 M -16 0 H -23 M -11 -11 L -16 -16",
				coral,
			),
		];
	}
	if (motif === 7) {
		// Rainbow: concentric arches share a baseline and stay upright.
		return [
			outline("M -23 13 A 23 23 0 0 1 23 13", coral),
			outline("M -17 13 A 17 17 0 0 1 17 13", accent),
			outline("M -11 13 A 11 11 0 0 1 11 13", secondary),
			outline("M -5 13 A 5 5 0 0 1 5 13", primary),
		];
	}
	if (motif === 8) {
		// Separate radial petals meet beneath the centre, with no crossing seams.
		const petals = Array.from({ length: 5 }, (_, index): LayoutBackgroundArtifactShape => {
			const angle = (index * Math.PI * 2) / 5 - Math.PI / 2;
			const point = (radius: number, offset: number): string =>
				`${roundCoordinate(Math.cos(angle + offset) * radius)} ${roundCoordinate(Math.sin(angle + offset) * radius)}`;
			return {
				kind: "path",
				d: `M ${point(3, -0.55)} C ${point(19, -0.6)} ${point(25, -0.3)} ${point(23, 0)} C ${point(25, 0.3)} ${point(19, 0.6)} ${point(3, 0.55)} Z`,
				stroke: index % 2 === 0 ? secondary : coral,
				strokeWidth: 1.5,
				fill: "none",
			};
		});
		return [...petals, { kind: "circle", cx: 0, cy: 0, radius: 4.2 + variant * 0.2, fill: accent }];
	}
	if (motif === 9) {
		// Kite: a diamond sail, cross spars, a ribbon tail and two little bows.
		return [
			outline("M 0 -23 L 16 -9 L 0 9 L -16 -9 Z", secondary),
			outline("M 0 -23 V 9 M -16 -9 H 16", coral),
			outline("M 0 9 C 12 12 -5 19 5 24", primary),
			outline("M 5 12 L 10 9 L 10 15 Z M 2 18 L -3 15 L -3 21 Z", accent),
		];
	}
	// Paired musical notes: a shared beam, two stems and oval note heads.
	return [
		outline("M -10 12 V -15 L 15 -21 V 6 M -10 -9 L 15 -15", primary),
		{ kind: "path", d: "M -10 8 C -13 4 -24 8 -23 13 C -22 19 -10 16 -10 12 Z", fill: coral },
		{ kind: "path", d: "M 15 2 C 12 -2 1 2 2 7 C 3 13 15 10 15 6 Z", fill: secondary },
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
	const nextMotif = createSpatialMotifPicker(`fun:${settings.seed}`, 11, tileSize * 2.5);
	for (let row = 0; row < rows; row += 1) {
		for (let column = 0; column < columns; column += 1) {
			const random = createSeededRandom(`${settings.seed}:${column}:${row}`);
			if (random() >= settings.density * 0.72) continue;
			const size = roundCoordinate((24 + random() * 28) * settings.size);
			const x = roundCoordinate(
				Math.min(
					width - edgeInset - size / 2,
					Math.max(edgeInset + size / 2, column * tileSize + 18 + random() * (tileSize - 36)),
				),
			);
			const y = roundCoordinate(
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
			const motifIndex = nextMotif(bounds);
			if (motifIndex === undefined) continue;
			accepted.push(bounds);
			const motif = motifIndex;
			// Only rotationally symmetric motifs spin freely; objects keep their "up".
			const rotation = roundCoordinate(
				motif === 6 || motif === 8 ? random() * 360 : (random() - 0.5) * 28,
			);
			const variant = Math.floor(random() * 3);
			artifacts.push({
				id: `fun-background-${column}-${row}`,
				bounds,
				transform: `translate(${x} ${y}) rotate(${rotation}) scale(${roundCoordinate(size / 48)})`,
				shapes: motifShapes(motif, variant),
			});
		}
	}
	return artifacts;
}
