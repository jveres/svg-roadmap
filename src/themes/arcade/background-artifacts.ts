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

const tileSize = 175;
const edgeInset = 24;
const yellow = "var(--roadmap-arcade-artifact-yellow)";
const pink = "var(--roadmap-arcade-artifact-pink)";
const cyan = "var(--roadmap-arcade-artifact-cyan)";
const purple = "var(--roadmap-arcade-artifact-purple)";
const white = "var(--roadmap-arcade-artifact-white)";

/** Builds one path from the filled cells of a sprite raster. */
function pixelPath(rows: readonly string[], pixel: number): string {
	const width = rows[0]?.length ?? 0;
	const offsetX = (-width * pixel) / 2;
	const offsetY = (-rows.length * pixel) / 2;
	const cells: string[] = [];
	for (const [rowIndex, row] of rows.entries()) {
		for (let column = 0; column < row.length; column += 1) {
			if (row[column] !== "X") continue;
			const x = roundCoordinate(offsetX + column * pixel);
			const y = roundCoordinate(offsetY + rowIndex * pixel);
			cells.push(`M ${x} ${y} h ${pixel} v ${pixel} h ${-pixel} Z`);
		}
	}
	return cells.join(" ");
}

/** Pac-Man with a pellet trail. */
function pacman(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M 2 0 L 11.4 -7 A 12 12 0 1 0 11.4 7 Z",
			fill: yellow,
		},
		{ kind: "circle", cx: 17, cy: 0, radius: 1.9, fill: yellow },
		{ kind: "circle", cx: 24, cy: 0, radius: 1.9, fill: yellow },
		{ kind: "circle", cx: 31, cy: 0, radius: 1.9, fill: yellow },
	];
}

/** The classic arcade ghost. */
function ghost(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M -9 9 L -9 -1 A 9 9 0 0 1 9 -1 L 9 9 L 6 6.4 L 3 9 L 0 6.4 L -3 9 L -6 6.4 Z",
			fill: pink,
		},
		{ kind: "circle", cx: -3.6, cy: -2, radius: 2.5, fill: white },
		{ kind: "circle", cx: 3.6, cy: -2, radius: 2.5, fill: white },
		{ kind: "circle", cx: -2.9, cy: -1.6, radius: 1.2, fill: purple },
		{ kind: "circle", cx: 4.3, cy: -1.6, radius: 1.2, fill: purple },
	];
}

/** A pixel space invader. */
function invader(): readonly LayoutBackgroundArtifactShape[] {
	const sprite = [
		"..X.....X..",
		"...X...X...",
		"..XXXXXXX..",
		".XX.XXX.XX.",
		"XXXXXXXXXXX",
		"X.XXXXXXX.X",
		"X.X.....X.X",
		"...XX.XX...",
	];
	return [{ kind: "path", d: pixelPath(sprite, 2.4), fill: cyan }];
}

/** Bonus cherries. */
function cherries(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M 1 -11 C -3 -8 -5 -3 -5 2 M 1 -11 C 4 -7 6 -3 6 3 M 1 -11 L 4 -13",
			stroke: purple,
			strokeWidth: 1.6,
			fill: "none",
		},
		{ kind: "circle", cx: -5, cy: 5, radius: 4.4, fill: pink },
		{ kind: "circle", cx: 6, cy: 6, radius: 4.4, fill: pink },
		{ kind: "circle", cx: -6.4, cy: 3.6, radius: 1.2, fill: white },
		{ kind: "circle", cx: 4.6, cy: 4.6, radius: 1.2, fill: white },
	];
}

/** A pulsing power pellet. */
function powerPellet(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{ kind: "circle", cx: 0, cy: 0, radius: 9, stroke: yellow, strokeWidth: 1.6, fill: "none" },
		{ kind: "circle", cx: 0, cy: 0, radius: 4.5, fill: yellow, animation: "blink" },
	];
}

/** A falling T tetromino. */
function tetromino(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: pixelPath(["XXX", ".X."], 7),
			fill: purple,
		},
		{
			kind: "path",
			d: pixelPath(["XXX", ".X."], 7),
			stroke: white,
			strokeWidth: 0.9,
			fill: "none",
		},
	];
}

/** A pixel heart, one life left. */
function pixelHeart(): readonly LayoutBackgroundArtifactShape[] {
	const sprite = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
	return [{ kind: "path", d: pixelPath(sprite, 2.8), fill: pink }];
}

const motifs = [pacman, ghost, invader, cherries, powerPellet, tetromino, pixelHeart] as const;

export function generateArcadeBackgroundArtifacts({
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
	const nextMotif = createMotifCycler(`arcade:${settings.seed}`, motifs.length);

	for (let row = 0; row < rows; row += 1) {
		for (let column = 0; column < columns; column += 1) {
			const random = createSeededRandom(`arcade:${settings.seed}:${column}:${row}`);
			if (random() >= settings.density * 0.62) continue;
			const size = roundCoordinate((26 + random() * 28) * settings.size);
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
			if (!isInOuterVoid(bounds, avoid, width, 0.29)) continue;
			if (intersectsAny(bounds, accepted)) continue;
			accepted.push(bounds);
			const motif = motifs[nextMotif()];
			if (!motif) continue;
			// Sprites stay upright like they are marching across a screen.
			const tilt = roundCoordinate((random() - 0.5) * 16);
			artifacts.push({
				id: `arcade-background-${column}-${row}`,
				bounds,
				transform: `translate(${x} ${y}) rotate(${tilt}) scale(${roundCoordinate(size / 50)})`,
				shapes: motif(),
			});
		}
	}

	return artifacts;
}
