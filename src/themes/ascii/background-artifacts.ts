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

const tileSize = 180;
const edgeInset = 24;
const ink = "var(--roadmap-ascii-artifact-ink)";
const faint = "var(--roadmap-ascii-artifact-faint)";
const strokeWidth = "var(--roadmap-ascii-artifact-stroke-width)";

/**
 * A terminal prompt with a blinking block cursor, set on monospace cell
 * metrics: a 12-unit character advance and a 9x16 glyph box on a shared
 * baseline. The chevron is a mid-height glyph; the cursor fills its cell.
 */
function cursorPrompt(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M -9 -5 L -3 0 L -9 5",
			stroke: ink,
			strokeWidth,
			fill: "none",
		},
		{ kind: "path", d: "M 1.5 -8 h 9 v 16 h -9 Z", fill: ink, animation: "blink" },
	];
}

/** A double-ruled frame corner, like the chapter boxes. */
function frameCorner(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M -11 11 L -11 -11 L 11 -11",
			stroke: ink,
			strokeWidth,
			fill: "none",
		},
		{
			kind: "path",
			d: "M -7.5 11 L -7.5 -7.5 L 11 -7.5",
			stroke: faint,
			strokeWidth: 1,
			fill: "none",
		},
	];
}

/** Printer's crop marks with a registration dot. */
function cropMarks(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M -13 -8 V -13 H -8 M 8 -13 H 13 V -8 M 13 8 V 13 H 8 M -8 13 H -13 V 8",
			stroke: ink,
			strokeWidth,
			fill: "none",
		},
		{ kind: "circle", cx: 0, cy: 0, radius: 2.6, stroke: faint, strokeWidth: 1, fill: "none" },
		{ kind: "circle", cx: 0, cy: 0, radius: 0.9, fill: ink },
	];
}

/** A halftone shading swatch. */
function shadingSwatch(): readonly LayoutBackgroundArtifactShape[] {
	const cells: string[] = [];
	for (let row = 0; row < 5; row += 1) {
		for (let column = 0; column < 7; column += 1) {
			if ((row + column) % 2 === 0) continue;
			cells.push(`M ${-14 + column * 4} ${-10 + row * 4} h 2.2 v 2.2 h -2.2 Z`);
		}
	}
	return [{ kind: "path", d: cells.join(" "), fill: faint }];
}

/** A footnote asterisk. */
function asterisk(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M 0 -11 L 0 11 M -9.5 -5.5 L 9.5 5.5 M -9.5 5.5 L 9.5 -5.5",
			stroke: ink,
			strokeWidth,
			fill: "none",
		},
	];
}

/** The erase-left delete key, on the same character-cell height. */
function deleteKey(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M -15 0 L -7 -8 H 15 V 8 H -7 Z",
			stroke: ink,
			strokeWidth,
			fill: "none",
		},
		{
			kind: "path",
			d: "M 0 -4 L 8 4 M 8 -4 L 0 4",
			stroke: ink,
			strokeWidth,
			fill: "none",
		},
	];
}

/** A miniature box-and-arrow diagram stub, box sized like a character cell. */
function diagramStub(): readonly LayoutBackgroundArtifactShape[] {
	return [
		{
			kind: "path",
			d: "M -17 -8 h 14 v 16 h -14 Z",
			stroke: ink,
			strokeWidth,
			fill: "none",
		},
		{
			kind: "path",
			d: "M -3 0 H 9 M 9 0 L 5.5 -2.8 M 9 0 L 5.5 2.8",
			stroke: ink,
			strokeWidth,
			fill: "none",
		},
		{ kind: "circle", cx: 14, cy: 0, radius: 3.6, stroke: faint, strokeWidth: 1, fill: "none" },
	];
}

const motifs = [
	cursorPrompt,
	frameCorner,
	cropMarks,
	shadingSwatch,
	asterisk,
	deleteKey,
	diagramStub,
] as const;

export function generateAsciiBackgroundArtifacts({
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
			const random = createSeededRandom(`ascii:${settings.seed}:${column}:${row}`);
			if (random() >= settings.density * 0.58) continue;
			const size = roundArtifactCoordinate((24 + random() * 24) * settings.size);
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
			const motif = motifs[(Math.floor(random() * motifs.length) + column * 2 + row) % motifs.length];
			if (!motif) continue;
			// Zine marginalia sit almost square with the page.
			const tilt = roundArtifactCoordinate((random() - 0.5) * 10);
			artifacts.push({
				id: `ascii-background-${column}-${row}`,
				bounds,
				transform: `translate(${x} ${y}) rotate(${tilt}) scale(${roundArtifactCoordinate(size / 50)})`,
				shapes: motif(),
			});
		}
	}

	return artifacts;
}
