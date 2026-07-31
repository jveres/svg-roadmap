import initComrak, {
	type ComrakOptions,
	getFrontmatter,
	type InitInput,
	initSync as initComrakSync,
	mdToXml,
	PreparedOptions,
	type SyncInitInput,
} from "comrak-wasm";
import { parseRoadmapFrontmatter, RoadmapFrontmatterError } from "./core/frontmatter.ts";
import {
	applyAbbreviations,
	applyTagChips,
	inlineToPlainText,
	shortcodeToEmoji,
} from "./core/inline.ts";
import { childElements, decodeXml, type XmlElementNode, xmlText } from "./core/xml.ts";
import type {
	FootnoteDefinition,
	InlineNode,
	ParseRoadmapOptions,
	RoadmapChapter,
	RoadmapDocument,
	RoadmapHeading,
	RoadmapNote,
	RoadmapSettings,
	RoadmapStep,
	RoadmapTopic,
	RoadmapTopicGroup,
	SourceRange,
} from "./types.ts";

const defaultComrakOptions: ComrakOptions = {
	extension: {
		footnotes: true,
		frontMatterDelimiter: "---",
		highlight: true,
		inlineFootnotes: true,
		insert: true,
		shortcodes: true,
		strikethrough: true,
		subscript: true,
		superscript: true,
	},
	parse: {
		smart: true,
		sourceposChars: true,
	},
	render: {
		sourcepos: true,
	},
};

export class RoadmapMarkdownError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "RoadmapMarkdownError";
	}
}

export function createMarkdownOptions(options?: ComrakOptions): ComrakOptions {
	return {
		...defaultComrakOptions,
		...options,
		extension: { ...defaultComrakOptions.extension, ...options?.extension },
		parse: { ...defaultComrakOptions.parse, ...options?.parse, sourceposChars: true },
		render: { ...defaultComrakOptions.render, ...options?.render, sourcepos: true },
	};
}

export async function initializeRoadmapMarkdown(
	input?: InitInput | Promise<InitInput>,
): Promise<void> {
	await initComrak(input === undefined ? undefined : { module_or_path: input });
}

export function initializeRoadmapMarkdownSync(input: SyncInitInput): void {
	initComrakSync({ module: input });
}

interface PreparedSource {
	readonly originalSource: string;
	readonly source: string;
	readonly lines: readonly string[];
	readonly abbreviations: Readonly<Record<string, string>>;
	readonly settings: RoadmapSettings;
}

function prepareSource(source: string, frontmatter: string | undefined): PreparedSource {
	const lines = source.split("\n");
	const parsedLines = [...lines];
	const abbreviations: Record<string, string> = {};
	// Up to three leading spaces, per CommonMark: four or more is indented
	// code, where a definition-looking line is literal content.
	const definition = /^ {0,3}\*\[([^\]\n]+)\]:\s*(.+?)\s*$/u;
	const inFence = fencedContentMask(lines);
	for (const [index, line] of lines.entries()) {
		if (inFence[index]) continue;
		const match = line.match(definition);
		if (!match?.[1] || !match[2]) continue;
		abbreviations[match[1].trim()] = match[2].trim();
		parsedLines[index] = "";
	}
	return {
		originalSource: source,
		source: parsedLines.join("\n"),
		lines: parsedLines,
		abbreviations,
		settings: parseRoadmapFrontmatter(frontmatter),
	};
}

function parseSourceRange(value: string | undefined): SourceRange | undefined {
	const match = value?.match(/^(\d+):(\d+)-(\d+):(\d+)$/u);
	if (!match) return undefined;
	const [, startLine, startColumn, endLine, endColumn] = match;
	if (!startLine || !startColumn || !endLine || !endColumn) return undefined;
	return {
		start: { line: Number(startLine), column: Number(startColumn) },
		end: { line: Number(endLine), column: Number(endColumn) },
	};
}

function nodeRange(node: XmlElementNode): SourceRange | undefined {
	return parseSourceRange(node.attributes.sourcepos);
}

function sourceCharacterAt(range: SourceRange | undefined, lines: readonly string[]): string {
	if (!range) return "";
	const line = lines[range.start.line - 1];
	return line ? (Array.from(line)[range.start.column - 1] ?? "") : "";
}

function inlineFromXml(node: XmlElementNode): InlineNode[] {
	const children = (): InlineNode[] =>
		node.children.flatMap((child) => (child.type === "element" ? inlineFromXml(child) : []));

	switch (node.name) {
		case "text":
			return [{ type: "text", value: xmlText(node) }];
		case "code":
		case "code_block":
			return [{ type: "code", value: xmlText(node) }];
		case "softbreak":
			return [{ type: "softBreak" }];
		case "linebreak":
			return [{ type: "lineBreak" }];
		case "strong":
			return [{ type: "strong", children: children() }];
		case "emph":
			return [{ type: "emphasis", children: children() }];
		case "strikethrough":
			return [{ type: "strikethrough", children: children() }];
		case "insert":
			return [{ type: "insert", children: children() }];
		case "highlight":
			return [{ type: "highlight", children: children() }];
		case "superscript":
			return [{ type: "superscript", children: children() }];
		case "subscript":
			return [{ type: "subscript", children: children() }];
		case "link":
		case "wikilink": {
			const destination = node.attributes.destination ?? node.attributes.url ?? "";
			const title = node.attributes.title;
			return [
				{
					type: "link",
					destination,
					...(title ? { title } : {}),
					children: children(),
				},
			];
		}
		case "shortcode":
			return [
				{
					type: "emoji",
					shortcode: node.attributes.id ?? "",
					children: [{ type: "text", value: shortcodeToEmoji(node.attributes.id ?? "") }],
				},
			];
		case "footnote_reference":
			return [{ type: "footnoteReference", label: node.attributes.label ?? "note" }];
		case "image": {
			const label = inlineToPlainText(children()) || node.attributes.title || "image";
			return [{ type: "text", value: label }];
		}
		default:
			return children();
	}
}

function trimInline(nodes: readonly InlineNode[]): InlineNode[] {
	const result = [...nodes];
	while (result[0]?.type === "softBreak" || result[0]?.type === "lineBreak") result.shift();
	while (result.at(-1)?.type === "softBreak" || result.at(-1)?.type === "lineBreak") result.pop();

	const first = result[0];
	if (first?.type === "text") {
		const value = first.value.trimStart();
		if (value) result[0] = { ...first, value };
		else result.shift();
	}
	const last = result.at(-1);
	if (last?.type === "text") {
		const value = last.value.trimEnd();
		if (value) result[result.length - 1] = { ...last, value };
		else result.pop();
	}
	return result;
}

function joinInlineSections(sections: readonly (readonly InlineNode[])[]): InlineNode[] {
	const result: InlineNode[] = [];
	for (const section of sections) {
		const content = trimInline(section);
		if (content.length === 0) continue;
		if (result.length > 0) result.push({ type: "softBreak" });
		result.push(...content);
	}
	return result;
}

function paragraphContent(paragraphs: readonly XmlElementNode[]): InlineNode[] {
	return joinInlineSections(paragraphs.map((paragraph) => inlineFromXml(paragraph)));
}

function blockContent(node: XmlElementNode): InlineNode[] {
	return joinInlineSections(
		childElements(node).map((child) =>
			child.name === "block_quote" ? blockContent(child) : inlineFromXml(child),
		),
	);
}

function listItems(list: XmlElementNode): XmlElementNode[] {
	return childElements(list).filter((child) => child.name === "item" || child.name === "taskitem");
}

function extractTags(nodes: readonly InlineNode[]): { content: InlineNode[]; tags: string[] } {
	const content = trimInline(nodes);
	const last = content.at(-1);
	if (last?.type !== "text") return { content, tags: [] };
	const suffix = last.value.match(/((?:\s*\[[^\]\n]+\])+\s*)$/u)?.[1];
	if (!suffix) return { content, tags: [] };
	const tags = [...suffix.matchAll(/\[([^\]\n]+)\]/gu)]
		.flatMap((match) => (match[1] ?? "").split(","))
		.map((tag) => tag.trim().toLowerCase())
		.filter(Boolean);
	const value = last.value.slice(0, -suffix.length).trimEnd();
	if (value) content[content.length - 1] = { ...last, value };
	else content.pop();
	return { content: trimInline(content), tags: [...new Set(tags)] };
}

function paragraphParts(
	paragraph: XmlElementNode | undefined,
	lines: readonly string[],
): { title: InlineNode[]; description: InlineNode[]; tags: string[] } {
	if (!paragraph) return { title: [], description: [], tags: [] };
	const title: InlineNode[] = [];
	const description: InlineNode[] = [];

	for (const child of childElements(paragraph)) {
		const isComment = child.name === "emph" && sourceCharacterAt(nodeRange(child), lines) === "*";
		if (isComment) {
			if (description.length > 0) description.push({ type: "text", value: " " });
			description.push(
				...child.children.flatMap((nested) =>
					nested.type === "element" ? inlineFromXml(nested) : [],
				),
			);
		} else {
			title.push(...inlineFromXml(child));
		}
	}

	const extracted = extractTags(title);
	return {
		title: extracted.content,
		description: trimInline(description),
		tags: extracted.tags,
	};
}

function itemMarker(item: XmlElementNode, lines: readonly string[]): RoadmapTopic["marker"] {
	const character = sourceCharacterAt(nodeRange(item), lines);
	if (character === "*" || character === "+" || character === "-") return character;
	return "ordered";
}

interface ParseContext {
	readonly lines: readonly string[];
	readonly abbreviations: Readonly<Record<string, string>>;
	readonly tagNames: ReadonlySet<string>;
	nextId(prefix: string, content: readonly InlineNode[]): string;
}

function withAbbreviations(nodes: readonly InlineNode[], context: ParseContext): InlineNode[] {
	return applyAbbreviations(trimInline(nodes), context.abbreviations);
}

/**
 * Prose surfaces — notes and descriptions — additionally resolve `[name]`
 * references to document-defined tags into inline chips. Titles keep the
 * plain pass: their trailing tag tokens are structural, already extracted.
 */
function withProseInline(nodes: readonly InlineNode[], context: ParseContext): InlineNode[] {
	return applyAbbreviations(
		applyTagChips(trimInline(nodes), context.tagNames),
		context.abbreviations,
	);
}

/**
 * Recursive construction bounds the topic depth explicitly: past this the
 * call stack becomes the limit, and a stack overflow would surface as a
 * misleading generic parse failure.
 */
const maxTopicDepth = 512;

function topicFromItem(item: XmlElementNode, depth: number, context: ParseContext): RoadmapTopic {
	if (depth > maxTopicDepth) {
		throw new RoadmapMarkdownError(
			`Topic nesting exceeds the supported depth of ${maxTopicDepth} levels.`,
		);
	}
	const sourceRange = nodeRange(item);
	const paragraphs = childElements(item, "paragraph");
	const parts = paragraphParts(paragraphs[0], context.lines);
	const title = withAbbreviations(parts.title, context);
	const extraDescription = paragraphContent(paragraphs.slice(1));
	const description = withProseInline(
		joinInlineSections([parts.description, extraDescription]),
		context,
	);
	const children = childElements(item, "list").flatMap((list) =>
		listItems(list).map((child) => topicFromItem(child, depth + 1, context)),
	);
	// Blockquotes under the topic carry its detail note — learning depth for
	// host panels, never drawn on the chart. The note stays raw Markdown,
	// sliced from the source; rendering it is the host's concern.
	const note = childElements(item, "block_quote")
		.map((quote) => rawBlockMarkdown(nodeRange(quote), context.lines))
		.filter(Boolean)
		.join("\n\n");
	return {
		type: "topic",
		id: context.nextId("topic", title),
		depth,
		marker: itemMarker(item, context.lines),
		content: title,
		description,
		tags: parts.tags,
		...(note ? { note } : {}),
		children,
		...(sourceRange ? { sourceRange } : {}),
	};
}

/**
 * The Markdown of a blockquote exactly as authored, minus the `>` markers
 * and list indentation — the sourcepos slice of the original document.
 */
function rawBlockMarkdown(range: SourceRange | undefined, lines: readonly string[]): string {
	if (!range) return "";
	return lines
		.slice(range.start.line - 1, range.end.line)
		.map((line) => line.replace(/^\s*>[ ]?/u, ""))
		.join("\n")
		.trim();
}

/** Splits sibling list items into batches at blank-line gaps. */
function splitByBlankLines(items: readonly XmlElementNode[]): XmlElementNode[][] {
	const batches: XmlElementNode[][] = [];
	let current: XmlElementNode[] = [];
	let previousRange: SourceRange | undefined;
	for (const item of items) {
		const range = nodeRange(item);
		if (
			current.length > 0 &&
			previousRange &&
			range &&
			range.start.line > previousRange.end.line + 1
		) {
			batches.push(current);
			current = [];
		}
		current.push(item);
		previousRange = range;
	}
	if (current.length > 0) batches.push(current);
	return batches;
}

function groupTopics(items: readonly XmlElementNode[], context: ParseContext): RoadmapTopicGroup[] {
	return splitByBlankLines(items).map((batch, index) => {
		const topics = batch.map((item) => topicFromItem(item, 1, context));
		return {
			id: `group-${index + 1}-${topics[0]?.id ?? "empty"}`,
			layout: topics[0]?.marker === "+" ? "grid" : "tree",
			topics,
		};
	});
}

/**
 * A top-level `+` list hoists the nested grid rule one level up: the list is
 * a grid whose items are its columns, mounted on the spine as a headless
 * step — no chapter pill; the spine threads the grid itself. Blank lines
 * split the list into separate grid steps, exactly as they split nested
 * groups. A document holding nothing but one such grid renders standalone.
 */
function gridChaptersFromItems(
	items: readonly XmlElementNode[],
	context: ParseContext,
): RoadmapChapter[] {
	return splitByBlankLines(items).map((batch) => {
		const topics = batch.map((item) => topicFromItem(item, 1, context));
		const firstRange = batch[0] ? nodeRange(batch[0]) : undefined;
		const lastItem = batch[batch.length - 1];
		const lastRange = lastItem ? nodeRange(lastItem) : undefined;
		const id = context.nextId("chapter", topics[0]?.content ?? []);
		return {
			type: "chapter",
			id,
			content: [],
			description: [],
			tags: [],
			groups: [{ id: `${id}-grid`, layout: "grid", topics }],
			...(firstRange && lastRange
				? { sourceRange: { start: firstRange.start, end: lastRange.end } }
				: {}),
		};
	});
}

function chapterFromItem(item: XmlElementNode, context: ParseContext): RoadmapChapter {
	const sourceRange = nodeRange(item);
	const paragraphs = childElements(item, "paragraph");
	const parts = paragraphParts(paragraphs[0], context.lines);
	const content = withAbbreviations(parts.title, context);
	const additional = paragraphContent(paragraphs.slice(1));
	const description = withProseInline(joinInlineSections([parts.description, additional]), context);
	const items = childElements(item, "list").flatMap(listItems);
	return {
		type: "chapter",
		id: context.nextId("chapter", content),
		content,
		description,
		tags: parts.tags,
		groups: groupTopics(items, context),
		...(sourceRange ? { sourceRange } : {}),
	};
}

function headingFromElement(node: XmlElementNode, context: ParseContext): RoadmapHeading {
	const sourceRange = nodeRange(node);
	const content = withAbbreviations(inlineFromXml(node), context);
	return {
		type: "heading",
		id: context.nextId("heading", content),
		level: Number(node.attributes.level ?? 3),
		content,
		...(sourceRange ? { sourceRange } : {}),
	};
}

/**
 * The emphasis carrying a milestone label: the paragraph must be exactly one
 * `*...*` emphasis, the same shape chapter comments use.
 */
function milestoneLabel(
	paragraph: XmlElementNode,
	lines: readonly string[],
): XmlElementNode | undefined {
	const inline = childElements(paragraph);
	const only = inline[0];
	if (inline.length !== 1 || only?.name !== "emph") return undefined;
	return sourceCharacterAt(nodeRange(only), lines) === "*" ? only : undefined;
}

function noteFromElement(node: XmlElementNode, context: ParseContext): RoadmapNote {
	const sourceRange = nodeRange(node);
	const content = withProseInline(
		node.name === "block_quote" ? blockContent(node) : inlineFromXml(node),
		context,
	);
	return {
		type: "note",
		id: context.nextId("note", content),
		content,
		...(sourceRange ? { sourceRange } : {}),
	};
}

function slug(value: string): string {
	return value
		.normalize("NFKD")
		.replaceAll(/\p{Mark}/gu, "")
		.toLowerCase()
		.replaceAll(/[^\p{Letter}\p{Number}]+/gu, "-")
		.replaceAll(/^-|-$/gu, "")
		.slice(0, 42);
}

function countTopics(topics: readonly RoadmapTopic[]): { count: number; maxDepth: number } {
	let count = 0;
	let maxDepth = 0;
	const pending = [...topics];
	while (pending.length > 0) {
		const topic = pending.pop();
		if (!topic) continue;
		count += 1;
		maxDepth = Math.max(maxDepth, topic.depth);
		pending.push(...topic.children);
	}
	return { count, maxDepth };
}

/**
 * Assigns chart marker numbers to footnotes in order of first reference,
 * walking the document exactly as it reads. References paint the ordinal
 * and referenced definitions carry it, so the footnotes block below the
 * chart lists rows in marker order; unreferenced definitions stay unmarked.
 */
function numberFootnotes(
	steps: readonly RoadmapStep[],
	footnotes: readonly FootnoteDefinition[],
): void {
	const ordinals = new Map<string, number>();
	const visit = (nodes: readonly InlineNode[]): void => {
		for (const node of nodes) {
			if (node.type === "footnoteReference") {
				const ordinal = ordinals.get(node.label) ?? ordinals.size + 1;
				ordinals.set(node.label, ordinal);
				(node as { ordinal?: number }).ordinal = ordinal;
				continue;
			}
			if ("children" in node) visit(node.children);
		}
	};
	const visitTopics = (topics: readonly RoadmapTopic[]): void => {
		for (const topic of topics) {
			visit(topic.content);
			visit(topic.description);
			visitTopics(topic.children);
		}
	};
	for (const step of steps) {
		visit(step.content);
		if (step.type === "chapter") {
			visit(step.description);
			for (const group of step.groups) visitTopics(group.topics);
		}
	}
	for (const definition of footnotes) {
		const ordinal = ordinals.get(definition.label);
		if (ordinal !== undefined) (definition as { ordinal?: number }).ordinal = ordinal;
	}
}

function roadmapFromXml(root: XmlElementNode, prepared: PreparedSource): RoadmapDocument {
	let sequence = 0;
	const context: ParseContext = {
		lines: prepared.lines,
		abbreviations: prepared.abbreviations,
		tagNames: new Set(Object.keys(prepared.settings.tags)),
		nextId(prefix, content) {
			sequence += 1;
			return `${prefix}-${sequence}-${slug(inlineToPlainText(content)) || "untitled"}`;
		},
	};
	const steps: RoadmapStep[] = [];
	const footnotes: FootnoteDefinition[] = [];

	const children = childElements(root);
	for (let index = 0; index < children.length; index += 1) {
		const child = children[index];
		if (!child) continue;
		switch (child.name) {
			case "heading":
				steps.push(headingFromElement(child, context));
				break;
			case "thematic_break": {
				// A break between chapters is a journey milestone. An
				// immediately following comment paragraph (`*...*`, the chapter
				// comment syntax) becomes its label; a bare break stays an
				// unlabeled station.
				const next = children[index + 1];
				const labelEmph =
					next?.name === "paragraph" ? milestoneLabel(next, context.lines) : undefined;
				// The `*...*` wrapper is comment syntax, not styling: the label
				// paints upright, so unwrap the emphasis container.
				const labelInline = labelEmph ? inlineFromXml(labelEmph) : [];
				const first = labelInline[0];
				const content = withProseInline(
					labelInline.length === 1 && first?.type === "emphasis" ? first.children : labelInline,
					context,
				);
				if (labelEmph) index += 1;
				const sourceRange = nodeRange(child);
				steps.push({
					type: "milestone",
					id: context.nextId("milestone", content),
					content,
					...(sourceRange ? { sourceRange } : {}),
				});
				break;
			}
			case "paragraph":
			case "block_quote":
			case "code_block":
				steps.push(noteFromElement(child, context));
				break;
			case "list": {
				const items = listItems(child);
				const first = items[0];
				// A `+` list at the top level is a grid, not a row of chapters
				// (CommonMark starts a new list on marker change, so a list is
				// all-`+` or has none).
				if (first && itemMarker(first, context.lines) === "+") {
					steps.push(...gridChaptersFromItems(items, context));
				} else {
					steps.push(...items.map((item) => chapterFromItem(item, context)));
				}
				break;
			}
			case "footnote_definition":
				footnotes.push({
					label: child.attributes.label ?? `footnote-${footnotes.length + 1}`,
					content: withAbbreviations(blockContent(child), context),
				});
				break;
		}
	}

	numberFootnotes(steps, footnotes);

	let topics = 0;
	let maxDepth = 0;
	for (const step of steps) {
		if (step.type !== "chapter") continue;
		for (const group of step.groups) {
			const stats = countTopics(group.topics);
			topics += stats.count;
			maxDepth = Math.max(maxDepth, stats.maxDepth);
		}
	}

	return {
		type: "roadmap",
		source: prepared.originalSource,
		settings: prepared.settings,
		steps,
		abbreviations: prepared.abbreviations,
		footnotes,
		stats: {
			chapters: steps.filter((step) => step.type === "chapter").length,
			topics,
			maxDepth,
		},
	};
}

interface FenceLine {
	readonly marker: string;
	readonly info: string;
}

function fenceLine(line: string): FenceLine | undefined {
	let candidate = line.endsWith("\r") ? line.slice(0, -1) : line;
	const containerPrefix = /^[\t ]*(?:>[\t ]?|(?:[*+-]|\d{1,9}[.)])[\t ]+)/u;
	while (true) {
		const prefix = candidate.match(containerPrefix)?.[0];
		if (!prefix) break;
		candidate = candidate.slice(prefix.length);
	}

	const match = candidate.match(/^[\t ]*(`{3,}|~{3,})(.*)$/u);
	if (!match) return undefined;
	const marker = match[1] ?? "";
	const info = match[2] ?? "";
	if (marker.startsWith("`") && info.includes("`")) return undefined;
	return { marker, info };
}

/**
 * Marks lines inside fenced code (content and closing fence). Opening lines
 * stay unmarked so callers can inspect their info strings; everything the
 * fence swallows is plain text and must not be treated as roadmap syntax.
 */
function fencedContentMask(lines: readonly string[]): boolean[] {
	const mask = new Array<boolean>(lines.length).fill(false);
	let open: { readonly character: string; readonly length: number } | undefined;
	for (const [index, line] of lines.entries()) {
		const fence = fenceLine(line);
		if (open) {
			mask[index] = true;
			const closes =
				fence?.marker.startsWith(open.character) &&
				fence.marker.length >= open.length &&
				fence.info.trim() === "";
			if (closes) open = undefined;
		} else if (fence) {
			open = { character: fence.marker[0] ?? "`", length: fence.marker.length };
		}
	}
	return mask;
}

function validateFences(source: string): void {
	const lines = source.split("\n");
	const inFence = fencedContentMask(lines);
	for (const [index, line] of lines.entries()) {
		// Fence-looking lines inside an open fence are literal content.
		if (inFence[index]) continue;
		const info = fenceLine(line)?.info;
		if (info && /["&<>]/u.test(info)) {
			throw new RoadmapMarkdownError(
				`Code-fence info strings cannot contain quotes, ampersands, or angle brackets (line ${index + 1}).`,
			);
		}
	}
}

export function parseRoadmapMarkdown(
	source: string,
	options: ParseRoadmapOptions = {},
): RoadmapDocument {
	validateFences(source);
	const markdownOptions = createMarkdownOptions(options.markdown);
	try {
		const prepared = prepareSource(source, getFrontmatter(source, markdownOptions));
		const xml = mdToXml(prepared.source, markdownOptions);
		return roadmapFromXml(decodeXml(xml), prepared);
	} catch (error) {
		if (error instanceof RoadmapMarkdownError) throw error;
		if (error instanceof RoadmapFrontmatterError) {
			throw new RoadmapMarkdownError(`Invalid roadmap front matter: ${error.message}`, {
				cause: error,
			});
		}
		// Only a missing WASM initialization earns the initialization hint;
		// other causes (stack overflow, malformed XML) keep their own story.
		const message = error instanceof Error ? error.message : String(error);
		const uninitialized = /not (?:been )?initiali[sz]ed|initialize/iu.test(message);
		throw new RoadmapMarkdownError(
			uninitialized
				? "Unable to parse roadmap Markdown. Initialize comrak-wasm before using the synchronous parser."
				: `Unable to parse roadmap Markdown: ${message}`,
			{ cause: error },
		);
	}
}

export class RoadmapParser implements Disposable {
	readonly #options: PreparedOptions;
	#disposed = false;

	constructor(options?: ComrakOptions) {
		try {
			this.#options = new PreparedOptions(createMarkdownOptions(options));
		} catch (error) {
			throw new RoadmapMarkdownError("Unable to create a parser. Initialize comrak-wasm first.", {
				cause: error,
			});
		}
	}

	parse(source: string): RoadmapDocument {
		if (this.#disposed) throw new RoadmapMarkdownError("This RoadmapParser has been disposed.");
		validateFences(source);
		try {
			const prepared = prepareSource(source, this.#options.getFrontmatter(source));
			return roadmapFromXml(decodeXml(this.#options.mdToXml(prepared.source)), prepared);
		} catch (error) {
			if (error instanceof RoadmapFrontmatterError) {
				throw new RoadmapMarkdownError(`Invalid roadmap front matter: ${error.message}`, {
					cause: error,
				});
			}
			throw new RoadmapMarkdownError("Unable to parse roadmap Markdown.", { cause: error });
		}
	}

	dispose(): void {
		if (this.#disposed) return;
		this.#options.free();
		this.#disposed = true;
	}

	[Symbol.dispose](): void {
		this.dispose();
	}
}
