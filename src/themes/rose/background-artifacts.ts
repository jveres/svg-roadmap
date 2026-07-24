import {
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

const tileSize = 190;
const edgeInset = 26;
const ink = "var(--roadmap-rose-artifact-ink)";
const madder = "var(--roadmap-rose-artifact-madder)";
const bloom = "var(--roadmap-rose-artifact-bloom)";
const sage = "var(--roadmap-rose-artifact-sage)";
const moss = "var(--roadmap-rose-artifact-moss)";
const cream = "var(--roadmap-rose-artifact-cream)";
const strokeWidth = "var(--roadmap-rose-artifact-stroke-width)";

/** A five-petal wild rose drawn as an engraving: petal outlines and stamens. */
function wildRose(variant: number): readonly LayoutBackgroundArtifactShape[] {
	const shapes: LayoutBackgroundArtifactShape[] = [];
	for (let index = 0; index < 5; index += 1) {
		const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
		const spread = 0.62;
		const tip = { x: Math.cos(angle) * 16, y: Math.sin(angle) * 16 };
		const left = angle - spread;
		const right = angle + spread;
		const baseLeft = { x: Math.cos(left) * 3.5, y: Math.sin(left) * 3.5 };
		const baseRight = { x: Math.cos(right) * 3.5, y: Math.sin(right) * 3.5 };
		const controlLeft = { x: Math.cos(left) * 15, y: Math.sin(left) * 15 };
		const controlRight = { x: Math.cos(right) * 15, y: Math.sin(right) * 15 };
		shapes.push({
			kind: "path",
			d: `M ${roundCoordinate(baseLeft.x)} ${roundCoordinate(baseLeft.y)} C ${roundCoordinate(controlLeft.x)} ${roundCoordinate(controlLeft.y)} ${roundCoordinate(tip.x * 1.05)} ${roundCoordinate(tip.y * 1.05)} ${roundCoordinate(tip.x)} ${roundCoordinate(tip.y)} C ${roundCoordinate(tip.x * 1.05)} ${roundCoordinate(tip.y * 1.05)} ${roundCoordinate(controlRight.x)} ${roundCoordinate(controlRight.y)} ${roundCoordinate(baseRight.x)} ${roundCoordinate(baseRight.y)}`,
			stroke: madder,
			strokeWidth,
			fill: "none",
		});
	}
	shapes.push({
		kind: "circle",
		cx: 0,
		cy: 0,
		radius: 2.6,
		stroke: ink,
		strokeWidth: 1,
		fill: "none",
	});
	for (let index = 0; index < 5; index += 1) {
		const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2 + 0.63 + variant * 0.1;
		shapes.push({
			kind: "circle",
			cx: roundCoordinate(Math.cos(angle) * 5.5),
			cy: roundCoordinate(Math.sin(angle) * 5.5),
			radius: 0.9,
			fill: ink,
		});
	}
	return shapes;
}

/** A sprig: an arced stem carrying two veined almond leaves. */
function leafSprig(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{ kind: "path", d: "M -18 17 Q 0 4 18 -16", stroke: sage, strokeWidth, fill: "none" },
		{
			kind: "path",
			d: "M -7 9 Q -17 7 -21 -3 Q -10 -2 -7 9 Z",
			stroke: moss,
			strokeWidth,
			fill: "none",
		},
		{ kind: "path", d: "M -7 9 Q -14 4 -21 -3", stroke: moss, strokeWidth: 0.8, fill: "none" },
		{
			kind: "path",
			d: "M 5 -2 Q 6 -13 15 -18 Q 13 -7 5 -2 Z",
			stroke: moss,
			strokeWidth,
			fill: "none",
		},
		{ kind: "path", d: "M 5 -2 Q 10 -10 15 -18", stroke: moss, strokeWidth: 0.8, fill: "none" },
	];
}

/** A thorned cane, drawn with the plate's finest pen. */
function thornedStem(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{ kind: "path", d: "M -22 12 C -8 4 8 0 22 -12", stroke: ink, strokeWidth, fill: "none" },
		{ kind: "path", d: "M -12 7 l 2.4 -5.4 l 1.6 6 Z", fill: ink },
		{ kind: "path", d: "M 1 2.3 l 2 -5.6 l 2 5.8 Z", fill: ink },
		{ kind: "path", d: "M 13 -4 l 1.6 -5.8 l 2.4 5 Z", fill: ink },
	];
}

/** A rosebud: soft-filled teardrop in a sepal cradle on a short stem. */
function rosebud(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{ kind: "path", d: "M 0 21 Q 1 12 0 4", stroke: sage, strokeWidth, fill: "none" },
		{
			kind: "path",
			d: "M 6 16 Q 12 14 15 8 Q 8 9 6 16 Z",
			stroke: moss,
			strokeWidth,
			fill: "none",
		},
		{
			kind: "path",
			d: "M 0 -15 C -6.5 -9 -6.5 -1 0 3 C 6.5 -1 6.5 -9 0 -15 Z",
			stroke: madder,
			strokeWidth,
			fill: bloom,
		},
		{ kind: "path", d: "M 0 -13 Q -1 -6 0 1", stroke: madder, strokeWidth: 0.8, fill: "none" },
		{
			kind: "path",
			d: "M -4.5 0 L -7.5 7 M 0 3 L 0 9.5 M 4.5 0 L 7.5 7",
			stroke: sage,
			strokeWidth,
			fill: "none",
		},
	];
}

/** A pair of rose hips on a forked stem, sepals still attached. */
function roseHips(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M -1 21 Q -3 8 -9 -1 M -1 21 Q 1 6 8 -6",
			stroke: sage,
			strokeWidth,
			fill: "none",
		},
		{ kind: "circle", cx: -10, cy: -5, radius: 4.6, stroke: madder, strokeWidth, fill: bloom },
		{ kind: "circle", cx: 9, cy: -10, radius: 4.2, stroke: madder, strokeWidth, fill: bloom },
		{
			kind: "path",
			d: "M -12 -9.5 L -13 -12.5 M -10 -9.8 L -10 -13 M -8 -9.5 L -7 -12.5",
			stroke: moss,
			strokeWidth: 0.9,
			fill: "none",
		},
		{
			kind: "path",
			d: "M 7 -14 L 6 -17 M 9 -14.4 L 9 -17.5 M 11 -14 L 12 -17",
			stroke: moss,
			strokeWidth: 0.9,
			fill: "none",
		},
	];
}

/** A fern frond: paired pinnae shrinking toward the tip. */
function fernFrond(): readonly LayoutBackgroundArtifactShape[] {
	const shapes: LayoutBackgroundArtifactShape[] = [
		{ kind: "path", d: "M -3 22 Q 2 2 4 -20", stroke: moss, strokeWidth, fill: "none" },
	];
	for (let index = 0; index < 6; index += 1) {
		const t = index / 6;
		const x = roundCoordinate(-3 + 5.4 * t + 1.6 * t * t);
		const y = roundCoordinate(22 - 38 * t);
		const reach = roundCoordinate(9 * (1 - t * 0.75));
		const lift = roundCoordinate(4 * (1 - t * 0.6));
		shapes.push(
			{
				kind: "path",
				d: `M ${x} ${y} q ${-reach * 0.9} ${-lift} ${-reach} ${-lift * 2.4}`,
				stroke: sage,
				strokeWidth: 0.9,
				fill: "none",
			},
			{
				kind: "path",
				d: `M ${x} ${y} q ${reach * 0.75} ${-lift * 0.9} ${reach * 0.85} ${-lift * 2.2}`,
				stroke: sage,
				strokeWidth: 0.9,
				fill: "none",
			},
		);
	}
	return shapes;
}

/** A full engraved rose: a loose spiral heart inside scalloped outer petals. */
function engravedRose(): readonly LayoutBackgroundArtifactShape[] {
	const scallops: string[] = [];
	for (let index = 0; index < 6; index += 1) {
		const from = (index * 2 * Math.PI) / 6 - Math.PI / 2;
		const to = ((index + 1) * 2 * Math.PI) / 6 - Math.PI / 2;
		const mid = (from + to) / 2;
		const start = {
			x: roundCoordinate(Math.cos(from) * 14),
			y: roundCoordinate(Math.sin(from) * 14),
		};
		const control = {
			x: roundCoordinate(Math.cos(mid) * 21),
			y: roundCoordinate(Math.sin(mid) * 21),
		};
		const end = { x: roundCoordinate(Math.cos(to) * 14), y: roundCoordinate(Math.sin(to) * 14) };
		scallops.push(
			`${index === 0 ? `M ${start.x} ${start.y}` : ""} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
		);
	}
	return [
		{ kind: "path", d: scallops.join(" "), stroke: madder, strokeWidth, fill: "none" },
		{
			kind: "path",
			d: "M 1 -1 C 4 -3 6 1 2 3 C -3 6 -8 1 -5 -4 C -1 -11 8 -8 9 0 C 10 8 2 13 -6 10",
			stroke: madder,
			strokeWidth,
			fill: "none",
		},
		{ kind: "circle", cx: 0, cy: 0, radius: 1.2, fill: ink },
	];
}

/** Stippled seeds and pen ticks, the plate's margin dust. */
function seedStipple(variant: number): readonly LayoutBackgroundArtifactShape[] {
	const positions = [
		{ x: -10, y: -6, radius: 1.3 },
		{ x: -2, y: 3, radius: 1 },
		{ x: 7, y: -3, radius: 1.4 },
		{ x: 12, y: 6, radius: 0.9 },
		{ x: -6, y: 10, radius: 1.1 },
		{ x: 2, y: -11, radius: 1 },
	] as const;
	return [
		...positions.map(
			(seed, index): LayoutBackgroundArtifactShape => ({
				kind: "circle",
				cx: seed.x,
				cy: seed.y,
				radius: seed.radius + (index === variant ? 0.3 : 0),
				fill: index % 3 === 0 ? moss : ink,
			}),
		),
		{
			kind: "path",
			d: "M -13 4 l 3.4 -2 M 10 -9 l 3 -2.2",
			stroke: ink,
			strokeWidth: 0.8,
			fill: "none",
		},
		{ kind: "circle", cx: -1, cy: -4, radius: 2.4, stroke: cream, strokeWidth: 1, fill: "none" },
	];
}

const motifs = [
	wildRose,
	leafSprig,
	thornedStem,
	rosebud,
	roseHips,
	fernFrond,
	engravedRose,
	seedStipple,
] as const;

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
			if (random() >= settings.density * 0.62) continue;
			const size = roundCoordinate((25 + random() * 27) * settings.size);
			const x = roundCoordinate(
				Math.min(
					width - edgeInset - size / 2,
					Math.max(edgeInset + size / 2, column * tileSize + 20 + random() * (tileSize - 40)),
				),
			);
			const y = roundCoordinate(
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
			const motif =
				motifs[(Math.floor(random() * motifs.length) + column + row * 3) % motifs.length];
			if (!motif) continue;
			// Botanical cuttings lie loosely on the page but keep their "up":
			// a gentle tilt, never a full spin.
			const tilt = roundCoordinate((random() - 0.5) * 56);
			artifacts.push({
				id: `rose-background-${column}-${row}`,
				bounds,
				transform: `translate(${x} ${y}) rotate(${tilt}) scale(${roundCoordinate(size / 50)})`,
				shapes: motif(Math.floor(random() * 3)),
			});
		}
	}

	return artifacts;
}
