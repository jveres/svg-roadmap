import type {
	InlineMark,
	InlineNode,
	TextLine,
	TextLineSegment,
	TypographyTheme,
} from "../types.ts";
import { gemojiEmoji } from "./emoji/gemoji-data.ts";

export interface InlineRun {
	readonly text: string;
	readonly marks: readonly InlineMark[];
	readonly destination?: string;
	readonly linkTitle?: string;
	readonly abbreviation?: string;
	readonly abbreviationIndicator?: boolean;
	readonly shortcode?: string;
	readonly tag?: string;
}

export function shortcodeToEmoji(id: string): string {
	return gemojiEmoji[id] ?? `:${id}:`;
}

export function inlineToPlainText(nodes: readonly InlineNode[]): string {
	let value = "";
	const pending: InlineNode[] = [...nodes].reverse();
	while (pending.length > 0) {
		const current = pending.pop();
		if (!current) continue;
		switch (current.type) {
			case "text":
			case "code":
				value += current.value;
				break;
			case "softBreak":
			case "lineBreak":
				value += " ";
				break;
			case "footnoteReference": {
				const fallback = current.label.match(/^__inline_(\d+)$/u)?.[1] ?? `[${current.label}]`;
				value += current.ordinal !== undefined ? String(current.ordinal) : fallback;
				break;
			}
			default:
				pending.push(...[...current.children].reverse());
		}
	}
	return value.replaceAll(/\s+/gu, " ").trim();
}

function annotateText(value: string, definitions: Readonly<Record<string, string>>): InlineNode[] {
	const terms = Object.keys(definitions).sort((left, right) => right.length - left.length);
	if (terms.length === 0 || !value) return [{ type: "text", value }];
	const wordCharacter = "\\p{Letter}\\p{Number}\\p{Mark}_";
	const expression = new RegExp(
		`(?<![${wordCharacter}])(${terms.map(escapeRegExp).join("|")})(?![${wordCharacter}])`,
		"giu",
	);
	const result: InlineNode[] = [];
	let start = 0;
	for (const match of value.matchAll(expression)) {
		const index = match.index;
		const matched = match[0];
		if (index > start) result.push({ type: "text", value: value.slice(start, index) });
		const definitionKey = terms.find((term) => term.toLowerCase() === matched.toLowerCase());
		const title = definitionKey ? definitions[definitionKey] : undefined;
		if (title) {
			result.push({
				type: "abbreviation",
				title,
				children: [{ type: "text", value: matched }],
			});
		} else {
			result.push({ type: "text", value: matched });
		}
		start = index + matched.length;
	}
	if (start < value.length) result.push({ type: "text", value: value.slice(start) });
	return result;
}

function escapeRegExp(value: string): string {
	return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function applyAbbreviations(
	nodes: readonly InlineNode[],
	definitions: Readonly<Record<string, string>>,
): InlineNode[] {
	return nodes.flatMap((node): InlineNode[] => {
		if (node.type === "text") return annotateText(node.value, definitions);
		if (
			node.type === "code" ||
			node.type === "softBreak" ||
			node.type === "lineBreak" ||
			node.type === "footnoteReference" ||
			node.type === "tagChip"
		) {
			return [node];
		}
		if ("children" in node) {
			return [{ ...node, children: applyAbbreviations(node.children, definitions) }];
		}
		return [node];
	});
}

const tagReferencePattern = /\[([\p{Letter}\p{Number}][\p{Letter}\p{Number}_-]*)\]/gu;

/**
 * Replaces `[name]` references to document-defined tags with inline chip
 * nodes. Unknown names stay literal text, so prose that happens to use
 * brackets is untouched; link and code content is never rewritten (links
 * resolve before this pass, code is a value node).
 */
export function applyTagChips(
	nodes: readonly InlineNode[],
	tags: ReadonlySet<string>,
): InlineNode[] {
	if (tags.size === 0) return [...nodes];
	return nodes.flatMap((node): InlineNode[] => {
		if (node.type === "text") {
			const result: InlineNode[] = [];
			let start = 0;
			for (const match of node.value.matchAll(tagReferencePattern)) {
				const name = match[1] ?? "";
				if (!tags.has(name)) continue;
				if (match.index > start) {
					result.push({ type: "text", value: node.value.slice(start, match.index) });
				}
				result.push({ type: "tagChip", tag: name, children: [{ type: "text", value: name }] });
				start = match.index + match[0].length;
			}
			if (start === 0) return [node];
			if (start < node.value.length) {
				result.push({ type: "text", value: node.value.slice(start) });
			}
			return result;
		}
		if (node.type === "link" || node.type === "tagChip" || !("children" in node)) return [node];
		return [{ ...node, children: applyTagChips(node.children, tags) }];
	});
}

interface RunState {
	readonly marks: readonly InlineMark[];
	readonly destination?: string;
	readonly linkTitle?: string;
	readonly abbreviation?: string;
	readonly shortcode?: string;
}

function visitInline(nodes: readonly InlineNode[], state: RunState, runs: InlineRun[]): void {
	for (const node of nodes) {
		switch (node.type) {
			case "text":
			case "code": {
				const marks = node.type === "code" ? [...state.marks, "code" as const] : state.marks;
				runs.push({
					text: node.value,
					marks,
					...(state.destination ? { destination: state.destination } : {}),
					...(state.linkTitle ? { linkTitle: state.linkTitle } : {}),
					...(state.abbreviation ? { abbreviation: state.abbreviation } : {}),
					...(state.shortcode ? { shortcode: state.shortcode } : {}),
				});
				break;
			}
			case "softBreak":
				// A soft break is the author wrapping their source line; prose
				// flows through it. Only a hard break forces a new line.
				runs.push({ text: " ", marks: state.marks });
				break;
			case "lineBreak":
				runs.push({ text: "\n", marks: state.marks });
				break;
			case "footnoteReference": {
				// The parser numbers footnotes in order of first reference; the
				// marker paints that ordinal, matching the footnotes block. An
				// unnumbered reference falls back to a de-machined label.
				const fallback = node.label.match(/^__inline_(\d+)$/u)?.[1] ?? `[${node.label}]`;
				runs.push({
					text: node.ordinal !== undefined ? String(node.ordinal) : fallback,
					marks: [...state.marks, "superscript"],
				});
				break;
			}
			case "tagChip":
				// The chip is atomic: one run carrying the tag name; wrapping and
				// painting size it through tagChipMetrics, never per character.
				runs.push({ text: node.tag, marks: state.marks, tag: node.tag });
				break;
			case "link":
				visitInline(
					node.children,
					{
						...state,
						destination: node.destination,
						...(node.title ? { linkTitle: node.title } : {}),
					},
					runs,
				);
				break;
			case "abbreviation":
				visitInline(node.children, { ...state, abbreviation: node.title }, runs);
				runs.push({
					text: "?",
					marks: state.marks,
					abbreviation: node.title,
					abbreviationIndicator: true,
					...(state.destination ? { destination: state.destination } : {}),
					...(state.linkTitle ? { linkTitle: state.linkTitle } : {}),
				});
				break;
			default:
				visitInline(
					node.children,
					{
						...state,
						marks: [...state.marks, node.type],
						...(node.type === "emoji" && node.shortcode ? { shortcode: node.shortcode } : {}),
					},
					runs,
				);
		}
	}
}

export function flattenInline(nodes: readonly InlineNode[]): InlineRun[] {
	const runs: InlineRun[] = [];
	visitInline(nodes, { marks: [] }, runs);
	return runs;
}

const arialCharacters =
	" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

const arialRegularUnits = [
	278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
	556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
	611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
	667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
	222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
] as const;

const arialBoldUnits = [
	278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
	556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
	611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
	667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
	278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
] as const;

const arialRegular = new Map(
	Array.from(arialCharacters, (character, index) => [character, arialRegularUnits[index] ?? 556]),
);
const arialBold = new Map(
	Array.from(arialCharacters, (character, index) => [character, arialBoldUnits[index] ?? 556]),
);

/**
 * Code spans paint at 0.9em of the surrounding text, the ratio prose
 * typography uses for inline code: monospace glyphs at full size read a
 * step larger than serif bodies (rose's Palatino most visibly). Measurement
 * and paint share the constant so textLength never stretches the glyphs.
 */
export const codePaintScale = 0.9;

type FontCategory = "monospace" | "serif" | "sans";

const monospaceFontPattern = /\b(?:monospace|courier|consolas|menlo|monaco)\b/iu;
const serifFontPattern = /\b(?:serif|times|georgia|cambria)\b/iu;
const pictographPattern = /\p{Extended_Pictographic}|\u20e3/u;
const cjkPattern = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u;
const whitespacePattern = /\s/u;
const graphemeSegmenter =
	typeof Intl.Segmenter === "function"
		? new Intl.Segmenter(undefined, { granularity: "grapheme" })
		: undefined;
const measurementCache = new Map<string, number>();
const measurementCacheLimit = 4096;

function fontCategory(fontFamily: string): FontCategory {
	if (monospaceFontPattern.test(fontFamily)) return "monospace";
	if (!fontFamily.toLowerCase().includes("sans-serif") && serifFontPattern.test(fontFamily)) {
		return "serif";
	}
	return "sans";
}

function characterWidth(
	character: string,
	fontSize: number,
	bold: boolean,
	category: FontCategory,
): number {
	// Emoji keep their pictographic advance even in monospace text: emoji
	// glyphs and the SVG symbols drawn in their place are ~1em wide, not 1ch.
	if (pictographPattern.test(character)) return fontSize * 1.05;
	if (category === "monospace") return fontSize * 0.6;
	const units = (bold ? arialBold : arialRegular).get(character);
	if (units !== undefined) {
		const familyScale = category === "serif" ? 1.04 : 1;
		return (units / 1000) * fontSize * familyScale;
	}
	if (cjkPattern.test(character)) return fontSize;
	if (whitespacePattern.test(character)) return fontSize * 0.278;
	return fontSize * 0.556;
}

/** The style a measurement provider receives for a plain-text span. */
export interface TextMeasurementStyle {
	readonly fontSize: number;
	readonly fontFamily: string;
	readonly fontWeight: number;
	readonly fontStyle: "normal" | "italic";
}

/**
 * Measures the advance width of a single-line plain-text span in CSS pixels.
 * Pictographs, code spans, and monospace families never reach a provider —
 * their fixed advances are part of the rendering contract.
 */
export type MeasurementProvider = (text: string, style: TextMeasurementStyle) => number;

let measurementProvider: MeasurementProvider | undefined;

/**
 * Installs a measurement oracle for ordinary text (for example the hidden-DOM
 * provider in browsers) or restores the built-in metric tables with
 * `undefined`. Cached widths are flushed either way, so switching providers
 * mid-session cannot serve stale metrics.
 */
export function setMeasurementProvider(provider: MeasurementProvider | undefined): void {
	measurementProvider = provider;
	measurementCache.clear();
}

/** The provider currently occupying the global slot, for lifecycle guards. */
export function activeMeasurementProvider(): MeasurementProvider | undefined {
	return measurementProvider;
}

function textGraphemes(text: string): readonly string[] {
	if (graphemeSegmenter) {
		return [...graphemeSegmenter.segment(text)].map((entry) => entry.segment);
	}
	return Array.from(text);
}

function providerWidth(
	provider: MeasurementProvider,
	text: string,
	style: TextMeasurementStyle,
): number {
	// Pictographs keep their fixed advance: vendored emoji symbols and
	// platform glyphs are both drawn into that box, and delegating them to
	// the provider would reintroduce per-platform emoji drift.
	let width = 0;
	let plain = "";
	const flush = (): void => {
		if (plain.length > 0) {
			width += provider(plain, style);
			plain = "";
		}
	};
	for (const grapheme of textGraphemes(text)) {
		if (pictographPattern.test(grapheme)) {
			flush();
			width += style.fontSize * 1.05;
		} else {
			plain += grapheme;
		}
	}
	flush();
	return width;
}

export function measureText(
	text: string,
	fontSize: number,
	marks: readonly InlineMark[] = [],
	fontWeight = 400,
	fontFamily = "Arial, Helvetica, sans-serif",
	fontStyle: "normal" | "italic" = "normal",
): number {
	const bold = fontWeight >= 600 || marks.includes("strong");
	const code = marks.includes("code");
	const italic = fontStyle === "italic" || marks.includes("emphasis");
	const cacheKey = `${text}\u0000${fontSize}\u0000${fontWeight}\u0000${bold ? 1 : 0}\u0000${code ? 1 : 0}\u0000${italic ? 1 : 0}\u0000${fontFamily}`;
	const cached = measurementCache.get(cacheKey);
	if (cached !== undefined) return cached;

	let width = 0;
	const category = fontCategory(fontFamily);
	if (code) {
		width = textGraphemes(text).length * fontSize * 0.61 * codePaintScale;
	} else if (measurementProvider !== undefined && category !== "monospace") {
		width = providerWidth(measurementProvider, text, {
			fontSize,
			fontFamily,
			fontWeight: marks.includes("strong") ? Math.max(700, fontWeight) : fontWeight,
			fontStyle: italic ? "italic" : "normal",
		});
	} else if (graphemeSegmenter) {
		for (const entry of graphemeSegmenter.segment(text)) {
			width += characterWidth(entry.segment, fontSize, bold, category);
		}
	} else {
		for (const character of text) {
			width += characterWidth(character, fontSize, bold, category);
		}
	}
	const measured = Math.ceil(width * 100) / 100;
	if (measurementCache.size >= measurementCacheLimit) {
		const oldest = measurementCache.keys().next().value;
		if (oldest !== undefined) measurementCache.delete(oldest);
	}
	measurementCache.set(cacheKey, measured);
	return measured;
}

/**
 * Advance width of a plain label including its tracking. Layout and rendering
 * must size legend labels identically, so both go through this helper: the
 * tracked advance counts graphemes, not UTF-16 units.
 */
export function measureTrackedText(
	text: string,
	fontSize: number,
	fontWeight: number,
	fontFamily: string,
	letterSpacing: number,
): number {
	return (
		measureText(text, fontSize, [], fontWeight, fontFamily) +
		letterSpacing * textGraphemes(text).length
	);
}

function sameRunStyle(left: TextLineSegment | undefined, right: TextLineSegment): boolean {
	return (
		left !== undefined &&
		// Chips and emoji never merge: each is one atomic painted unit — two
		// adjacent :one: shortcodes must stay two glyphs, not one wide one.
		left.tag === undefined &&
		right.tag === undefined &&
		left.shortcode === undefined &&
		right.shortcode === undefined &&
		left.destination === right.destination &&
		left.linkTitle === right.linkTitle &&
		left.abbreviation === right.abbreviation &&
		left.abbreviationIndicator === right.abbreviationIndicator &&
		left.marks.join("|") === right.marks.join("|")
	);
}

/**
 * Shared measurement/paint contract for inline tag chips: a badge disc, the
 * tag name in a smaller semibold cut, and a pill of air around both. Layout
 * and rendering must agree on every one of these numbers, or textLength
 * would stretch the label to cover the difference.
 */
export interface TagChipMetrics {
	readonly width: number;
	readonly disc: number;
	readonly discX: number;
	readonly labelX: number;
	readonly labelWidth: number;
	readonly labelFontSize: number;
	readonly labelFontWeight: number;
	readonly pillHeight: number;
}

export function tagChipMetrics(tag: string, fontSize: number, fontFamily: string): TagChipMetrics {
	// The pill hugs the text band (1.12em, rising 0.8em above the baseline)
	// so ordinary theme leading clears it without loosening chip-bearing
	// blocks; layout only floors truly tight leading (see layoutText).
	const disc = fontSize * 0.95;
	const discX = fontSize * 0.12;
	const labelFontSize = fontSize * 0.9;
	const labelFontWeight = 600;
	const labelWidth = measureText(tag, labelFontSize, [], labelFontWeight, fontFamily);
	const labelX = discX + disc + fontSize * 0.22;
	return {
		width: labelX + labelWidth + fontSize * 0.35,
		disc,
		discX,
		labelX,
		labelWidth,
		labelFontSize,
		labelFontWeight,
		pillHeight: fontSize * 1.12,
	};
}

export function wrapInline(
	nodes: readonly InlineNode[],
	maxWidth: number,
	typography: TypographyTheme,
	abbreviationIndicatorSize = typography.fontSize * 0.75,
	lineWidths?: readonly number[],
): TextLine[] {
	const runs = flattenInline(nodes);
	const lines: { width: number; segments: TextLineSegment[] }[] = [{ width: 0, segments: [] }];
	// Shaped wrapping: each line may carry its own width budget (a bubble is
	// narrow at the top and bottom, widest in the middle); lines past the
	// plan fall back to the flat maximum.
	const widthFor = (index: number): number => lineWidths?.[index] ?? maxWidth;
	const pushLine = (): void => {
		if ((lines.at(-1)?.segments.length ?? 0) > 0) lines.push({ width: 0, segments: [] });
	};
	const letterSpacing = typography.letterSpacing ?? 0;
	const measureRun = (text: string, fontSize: number, marks: readonly InlineMark[]): number =>
		measureText(
			text,
			fontSize,
			marks,
			typography.fontWeight,
			typography.fontFamily,
			typography.fontStyle ?? "normal",
		) +
		letterSpacing * textGraphemes(text).length;

	for (const run of runs) {
		if (run.tag) {
			// A chip wraps as one atomic unit at its measured pill width; the
			// tag name inside never splits or merges with neighbouring text.
			const chipWidth = tagChipMetrics(run.tag, typography.fontSize, typography.fontFamily).width;
			let line = lines.at(-1);
			if (!line) continue;
			if (line.width + chipWidth > widthFor(lines.length - 1) && line.segments.length > 0) {
				pushLine();
				line = lines.at(-1);
				if (!line) continue;
			}
			line.segments.push({ text: run.text, width: chipWidth, marks: run.marks, tag: run.tag });
			line.width += chipWidth;
			continue;
		}
		const runText = typography.textTransform === "uppercase" ? run.text.toUpperCase() : run.text;
		const tokens = runText.split(/(\n|\s+)/u).filter(Boolean);
		for (const token of tokens) {
			if (token === "\n") {
				pushLine();
				continue;
			}
			let value = token;
			// Super/subscript paints at 0.75em (see markAttributes); measuring
			// at full size would make textLength stretch the small glyphs back
			// to full-size advances.
			const runFontSize = run.abbreviationIndicator
				? abbreviationIndicatorSize
				: run.marks.includes("superscript") || run.marks.includes("subscript")
					? typography.fontSize * 0.75
					: typography.fontSize;
			let tokenWidth = measureRun(value, runFontSize, run.marks);
			let line = lines.at(-1);
			if (!line) continue;
			if (/^\s+$/u.test(value) && line.segments.length === 0) continue;
			if (/^[.,:;!?…]+$/u.test(value) && line.width + tokenWidth > widthFor(lines.length - 1)) {
				const previous = line.segments.at(-1);
				if (previous && !/^\s*$/u.test(previous.text) && line.segments.length > 1) {
					line.segments.pop();
					line.width -= previous.width;
					pushLine();
					line = lines.at(-1);
					if (!line) continue;
					line.segments.push(previous);
					line.width = previous.width;
				}
			}
			if (
				line.width + tokenWidth > widthFor(lines.length - 1) &&
				line.segments.length > 0 &&
				!/^\s+$/u.test(value)
			) {
				pushLine();
				line = lines.at(-1);
				if (!line) continue;
			}

			while (tokenWidth > widthFor(lines.length - 1) && textGraphemes(value).length > 1) {
				const characters = [...textGraphemes(value)];
				let split = 1;
				while (
					split < characters.length &&
					measureRun(characters.slice(0, split + 1).join(""), runFontSize, run.marks) <=
						widthFor(lines.length - 1)
				) {
					split += 1;
				}
				const head = characters.slice(0, split).join("");
				const headWidth = measureRun(head, runFontSize, run.marks);
				const segment: TextLineSegment = {
					text: head,
					width: headWidth,
					marks: run.marks,
					...(run.destination ? { destination: run.destination } : {}),
					...(run.linkTitle ? { linkTitle: run.linkTitle } : {}),
					...(run.abbreviation ? { abbreviation: run.abbreviation } : {}),
					...(run.abbreviationIndicator ? { abbreviationIndicator: true } : {}),
					...(run.shortcode ? { shortcode: run.shortcode } : {}),
				};
				line.segments.push(segment);
				line.width += headWidth;
				value = characters.slice(split).join("");
				tokenWidth = measureRun(value, runFontSize, run.marks);
				pushLine();
				line = lines.at(-1);
				if (!line) break;
			}
			if (!value || !line) continue;

			const segment: TextLineSegment = {
				text: value,
				width: tokenWidth,
				marks: run.marks,
				...(run.destination ? { destination: run.destination } : {}),
				...(run.linkTitle ? { linkTitle: run.linkTitle } : {}),
				...(run.abbreviation ? { abbreviation: run.abbreviation } : {}),
				...(run.abbreviationIndicator ? { abbreviationIndicator: true } : {}),
				...(run.shortcode ? { shortcode: run.shortcode } : {}),
			};
			const previous = line.segments.at(-1);
			if (sameRunStyle(previous, segment) && previous) {
				line.segments[line.segments.length - 1] = {
					...previous,
					text: previous.text + value,
					width: previous.width + tokenWidth,
				};
			} else {
				line.segments.push(segment);
			}
			line.width += tokenWidth;
		}
	}

	const nonEmpty = lines.filter((line, index) => line.segments.length > 0 || index === 0);
	return nonEmpty.map((line) => ({ width: line.width, segments: line.segments }));
}
