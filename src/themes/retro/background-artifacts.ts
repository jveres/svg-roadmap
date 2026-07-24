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
const orange = "var(--roadmap-retro-artifact-orange)";
const mustard = "var(--roadmap-retro-artifact-mustard)";
const avocado = "var(--roadmap-retro-artifact-avocado)";
const teal = "var(--roadmap-retro-artifact-teal)";
const brick = "var(--roadmap-retro-artifact-brick)";
const strokeWidth = "var(--roadmap-retro-artifact-stroke-width)";

function ringPoint(radius: number, angle: number): { x: number; y: number } {
	return {
		x: roundArtifactCoordinate(Math.cos(angle) * radius),
		y: roundArtifactCoordinate(Math.sin(angle) * radius),
	};
}

/** Twelve rays around a warm disc, the seventies sunburst clock. */
function sunburst(): readonly LayoutBackgroundArtifactShape[] {
	const rays = Array.from({ length: 12 }, (_, index) => {
		const angle = (index * Math.PI) / 6;
		const inner = ringPoint(9, angle);
		const outer = ringPoint(index % 2 === 0 ? 20 : 16, angle);
		return `M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`;
	}).join(" ");
	return [
		{ kind: "path", d: rays, stroke: mustard, strokeWidth, fill: "none" },
		{ kind: "circle", cx: 0, cy: 0, radius: 5.5, fill: orange },
	];
}

/** The classic seventies rainbow: three nested arcs with open legs. */
function rainbowArcs(): readonly LayoutBackgroundArtifactShape[] {
	return [18, 13, 8].map((radius, index) => ({
		kind: "path",
		d: `M ${-radius} 10 A ${radius} ${radius} 0 0 1 ${radius} 10`,
		stroke: [orange, mustard, avocado][index] ?? orange,
		strokeWidth,
		fill: "none",
	}));
}

/** Mid-century atomic starburst with satellite dots. */
function atomicStar(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M 0 -20 L 2.6 -2.6 L 20 0 L 2.6 2.6 L 0 20 L -2.6 2.6 L -20 0 L -2.6 -2.6 Z",
			fill: mustard,
		},
		{ kind: "circle", cx: 12, cy: -12, radius: 2.2, fill: teal },
		{ kind: "circle", cx: -13, cy: 11, radius: 1.8, fill: brick },
	];
}

/** Concentric target rings. */
function targetRings(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{ kind: "circle", cx: 0, cy: 0, radius: 17, stroke: brick, strokeWidth, fill: "none" },
		{ kind: "circle", cx: 0, cy: 0, radius: 11, stroke: mustard, strokeWidth, fill: "none" },
		{ kind: "circle", cx: 0, cy: 0, radius: 5, fill: orange },
	];
}

/** Stacked groovy waves. */
function groovyWaves(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M -24 -6 Q -16 -16 -8 -6 T 8 -6 T 24 -6",
			stroke: teal,
			strokeWidth,
			fill: "none",
		},
		{
			kind: "path",
			d: "M -24 4 Q -16 -6 -8 4 T 8 4 T 24 4",
			stroke: orange,
			strokeWidth,
			fill: "none",
		},
		{
			kind: "path",
			d: "M -24 14 Q -16 4 -8 14 T 8 14 T 24 14",
			stroke: mustard,
			strokeWidth,
			fill: "none",
		},
	];
}

/** Flower-power daisy with alternating petals. */
function daisy(): readonly LayoutBackgroundArtifactShape[] {
	const petals = Array.from({ length: 6 }, (_, index): LayoutBackgroundArtifactShape => {
		const center = ringPoint(9.5, (index * Math.PI) / 3 + Math.PI / 6);
		return {
			kind: "circle",
			cx: center.x,
			cy: center.y,
			radius: 6,
			fill: index % 2 === 0 ? orange : mustard,
		};
	});
	return [...petals, { kind: "circle", cx: 0, cy: 0, radius: 5, fill: avocado }];
}

/** Lava-lamp blob with a floating droplet. */
function lavaBlob(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M -3 -18 C 9 -20 17 -10 13 -1 C 10 6 15 8 13 14 C 10 21 -4 22 -10 15 C -17 7 -13 2 -10 -3 C -7 -8 -14 -16 -3 -18 Z",
			stroke: avocado,
			strokeWidth,
			fill: "none",
		},
		{ kind: "circle", cx: 1, cy: 3, radius: 3.4, fill: orange },
		{ kind: "circle", cx: -2, cy: -8, radius: 2, fill: mustard },
	];
}

/** Nested chevron stripes. */
function chevrons(): readonly LayoutBackgroundArtifactShape[] {
	return [0, 9, 18].map((offset, index) => ({
		kind: "path",
		d: `M -16 ${offset - 8} L 0 ${offset - 20} L 16 ${offset - 8}`,
		stroke: [orange, mustard, avocado][index] ?? orange,
		strokeWidth,
		fill: "none",
	}));
}

/** A spinning vinyl record. */
function vinyl(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{ kind: "circle", cx: 0, cy: 0, radius: 17, stroke: brick, strokeWidth, fill: "none" },
		{
			kind: "path",
			d: "M -12 -6 A 13.5 13.5 0 0 1 6 -12",
			stroke: teal,
			strokeWidth: 1.1,
			fill: "none",
		},
		{ kind: "circle", cx: 0, cy: 0, radius: 8, stroke: mustard, strokeWidth: 1.1, fill: "none" },
		{ kind: "circle", cx: 0, cy: 0, radius: 3, fill: orange },
	];
}

/** A candy-swirl lollipop on a stick. */
function lollipop(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{ kind: "path", d: "M 0 12 L 0 24", stroke: brick, strokeWidth, fill: "none" },
		{ kind: "circle", cx: 0, cy: -1, radius: 13, stroke: orange, strokeWidth, fill: "none" },
		{
			kind: "path",
			d: "M 0 -1 C 4 -5 9 -2 8 3 C 7 8 0 9 -4 5 C -9 0 -6 -9 0 -10 C 8 -11 13 -5 12 2",
			stroke: mustard,
			strokeWidth: 1.4,
			fill: "none",
		},
	];
}

/** A shooting star with a beaded trail. */
function shootingStar(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M 4 -4 L 8 -14 L 12 -4 L 22 0 L 12 4 L 8 14 L 4 4 L -6 0 Z",
			fill: mustard,
		},
		{ kind: "circle", cx: -13, cy: 5, radius: 2.4, fill: orange },
		{ kind: "circle", cx: -19, cy: 10, radius: 1.7, fill: teal },
		{ kind: "circle", cx: -24, cy: 15, radius: 1.2, fill: brick },
	];
}

const motifs = [
	sunburst,
	rainbowArcs,
	atomicStar,
	targetRings,
	groovyWaves,
	daisy,
	lavaBlob,
	chevrons,
	vinyl,
	lollipop,
	shootingStar,
] as const;

export function generateRetroBackgroundArtifacts({
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
			const random = createSeededRandom(`retro:${settings.seed}:${column}:${row}`);
			if (random() >= settings.density * 0.62) continue;
			const size = roundArtifactCoordinate((26 + random() * 30) * settings.size);
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
			if (!isInOuterVoid(bounds, avoid, width, 0.29)) continue;
			if (intersectsAny(bounds, accepted)) continue;
			accepted.push(bounds);
			const motif =
				motifs[(Math.floor(random() * motifs.length) + column + row * 2) % motifs.length];
			if (!motif) continue;
			// Seventies motifs stay mostly upright; only a gentle tilt.
			const tilt = roundArtifactCoordinate((random() - 0.5) * 30);
			artifacts.push({
				id: `retro-background-${column}-${row}`,
				bounds,
				transform: `translate(${x} ${y}) rotate(${tilt}) scale(${roundArtifactCoordinate(size / 50)})`,
				shapes: motif(),
			});
		}
	}

	return artifacts;
}
