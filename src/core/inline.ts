import type {
	AbbreviationInline,
	InlineMark,
	InlineNode,
	TextLine,
	TextLineSegment,
	TypographyTheme,
} from "../types.ts";

export interface InlineRun {
	readonly text: string;
	readonly marks: readonly InlineMark[];
	readonly destination?: string;
	readonly linkTitle?: string;
	readonly abbreviation?: string;
	readonly abbreviationIndicator?: boolean;
	readonly shortcode?: string;
}

const shortcodeEmoji: Readonly<Record<string, string>> = {
	beginner: "🔰",
	boom: "💥",
	cloud: "☁️",
	eight: "8️⃣",
	five: "5️⃣",
	four: "4️⃣",
	keycap_ten: "🔟",
	nine: "9️⃣",
	one: "1️⃣",
	recycle: "♻️",
	seven: "7️⃣",
	six: "6️⃣",
	soap: "🧼",
	star: "⭐",
	telescope: "🔭",
	three: "3️⃣",
	two: "2️⃣",
};

export function shortcodeToEmoji(id: string): string {
	return shortcodeEmoji[id] ?? `:${id}:`;
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
			case "footnoteReference":
				value += `[${current.label}]`;
				break;
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
			node.type === "footnoteReference"
		) {
			return [node];
		}
		if ("children" in node) {
			return [{ ...node, children: applyAbbreviations(node.children, definitions) }];
		}
		return [node];
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
			case "lineBreak":
				runs.push({ text: "\n", marks: state.marks });
				break;
			case "footnoteReference":
				runs.push({ text: `[${node.label}]`, marks: [...state.marks, "superscript"] });
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
	if (category === "monospace") return fontSize * 0.6;
	const units = (bold ? arialBold : arialRegular).get(character);
	if (units !== undefined) {
		const familyScale = category === "serif" ? 1.04 : 1;
		return (units / 1000) * fontSize * familyScale;
	}
	if (pictographPattern.test(character)) return fontSize * 1.05;
	if (cjkPattern.test(character)) return fontSize;
	if (whitespacePattern.test(character)) return fontSize * 0.278;
	return fontSize * 0.556;
}

export function measureText(
	text: string,
	fontSize: number,
	marks: readonly InlineMark[] = [],
	fontWeight = 400,
	fontFamily = "Arial, Helvetica, sans-serif",
): number {
	const bold = fontWeight >= 600 || marks.includes("strong");
	const code = marks.includes("code");
	const cacheKey = `${text}\u0000${fontSize}\u0000${bold ? 1 : 0}\u0000${code ? 1 : 0}\u0000${fontFamily}`;
	const cached = measurementCache.get(cacheKey);
	if (cached !== undefined) return cached;

	let width = 0;
	if (code) {
		width = Array.from(text).length * fontSize * 0.61;
	} else {
		const category = fontCategory(fontFamily);
		if (graphemeSegmenter) {
			for (const entry of graphemeSegmenter.segment(text)) {
				width += characterWidth(entry.segment, fontSize, bold, category);
			}
		} else {
			for (const character of text) {
				width += characterWidth(character, fontSize, bold, category);
			}
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

function sameRunStyle(left: TextLineSegment | undefined, right: TextLineSegment): boolean {
	return (
		left !== undefined &&
		left.destination === right.destination &&
		left.linkTitle === right.linkTitle &&
		left.abbreviation === right.abbreviation &&
		left.abbreviationIndicator === right.abbreviationIndicator &&
		left.shortcode === right.shortcode &&
		left.marks.join("|") === right.marks.join("|")
	);
}

export function wrapInline(
	nodes: readonly InlineNode[],
	maxWidth: number,
	typography: TypographyTheme,
	abbreviationIndicatorSize = typography.fontSize * 0.75,
): TextLine[] {
	const runs = flattenInline(nodes);
	const lines: { width: number; segments: TextLineSegment[] }[] = [{ width: 0, segments: [] }];
	const pushLine = (): void => {
		if ((lines.at(-1)?.segments.length ?? 0) > 0) lines.push({ width: 0, segments: [] });
	};

	for (const run of runs) {
		const tokens = run.text.split(/(\n|\s+)/u).filter(Boolean);
		for (const token of tokens) {
			if (token === "\n") {
				pushLine();
				continue;
			}
			let value = token;
			const runFontSize = run.abbreviationIndicator
				? abbreviationIndicatorSize
				: typography.fontSize;
			let tokenWidth = measureText(
				value,
				runFontSize,
				run.marks,
				typography.fontWeight,
				typography.fontFamily,
			);
			let line = lines.at(-1);
			if (!line) continue;
			if (/^\s+$/u.test(value) && line.segments.length === 0) continue;
			if (/^[.,:;!?…]+$/u.test(value) && line.width + tokenWidth > maxWidth) {
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
			if (line.width + tokenWidth > maxWidth && line.segments.length > 0 && !/^\s+$/u.test(value)) {
				pushLine();
				line = lines.at(-1);
				if (!line) continue;
			}

			while (tokenWidth > maxWidth && Array.from(value).length > 1) {
				const characters = Array.from(value);
				let split = 1;
				while (
					split < characters.length &&
					measureText(
						characters.slice(0, split + 1).join(""),
						runFontSize,
						run.marks,
						typography.fontWeight,
						typography.fontFamily,
					) <= maxWidth
				) {
					split += 1;
				}
				const head = characters.slice(0, split).join("");
				const headWidth = measureText(
					head,
					runFontSize,
					run.marks,
					typography.fontWeight,
					typography.fontFamily,
				);
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
				tokenWidth = measureText(
					value,
					runFontSize,
					run.marks,
					typography.fontWeight,
					typography.fontFamily,
				);
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

export function abbreviationNode(title: string, value: string): AbbreviationInline {
	return { type: "abbreviation", title, children: [{ type: "text", value }] };
}
