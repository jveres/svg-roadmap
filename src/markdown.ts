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
import { applyAbbreviations, inlineToPlainText, shortcodeToEmoji } from "./core/inline.ts";
import {
	childElements,
	decodeXml,
	firstChildElement,
	type XmlElementNode,
	xmlText,
} from "./core/xml.ts";
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
	const definition = /^\s*\*\[([^\]\n]+)\]:\s*(.+?)\s*$/u;
	for (const [index, line] of lines.entries()) {
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
	nextId(prefix: string, content: readonly InlineNode[]): string;
}

function withAbbreviations(nodes: readonly InlineNode[], context: ParseContext): InlineNode[] {
	return applyAbbreviations(trimInline(nodes), context.abbreviations);
}

function topicFromItem(item: XmlElementNode, depth: number, context: ParseContext): RoadmapTopic {
	const sourceRange = nodeRange(item);
	const paragraphs = childElements(item, "paragraph");
	const parts = paragraphParts(paragraphs[0], context.lines);
	const title = withAbbreviations(parts.title, context);
	const extraDescription = paragraphContent(paragraphs.slice(1));
	const description = withAbbreviations(
		joinInlineSections([parts.description, extraDescription]),
		context,
	);
	const children = childElements(item, "list").flatMap((list) =>
		listItems(list).map((child) => topicFromItem(child, depth + 1, context)),
	);
	return {
		type: "topic",
		id: context.nextId("topic", title),
		depth,
		marker: itemMarker(item, context.lines),
		content: title,
		description,
		tags: parts.tags,
		children,
		...(sourceRange ? { sourceRange } : {}),
	};
}

function groupTopics(items: readonly XmlElementNode[], context: ParseContext): RoadmapTopicGroup[] {
	const groups: RoadmapTopic[][] = [];
	let current: RoadmapTopic[] = [];
	let previousRange: SourceRange | undefined;
	for (const item of items) {
		const range = nodeRange(item);
		if (
			current.length > 0 &&
			previousRange &&
			range &&
			range.start.line > previousRange.end.line + 1
		) {
			groups.push(current);
			current = [];
		}
		current.push(topicFromItem(item, 1, context));
		previousRange = range;
	}
	if (current.length > 0) groups.push(current);

	return groups.map((topics, index) => ({
		id: `group-${index + 1}-${topics[0]?.id ?? "empty"}`,
		layout: topics[0]?.marker === "+" ? "grid" : "tree",
		topics,
	}));
}

function chapterFromItem(item: XmlElementNode, context: ParseContext): RoadmapChapter {
	const sourceRange = nodeRange(item);
	const paragraphs = childElements(item, "paragraph");
	const parts = paragraphParts(paragraphs[0], context.lines);
	const content = withAbbreviations(parts.title, context);
	const additional = paragraphContent(paragraphs.slice(1));
	const description = withAbbreviations(
		joinInlineSections([parts.description, additional]),
		context,
	);
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

function noteFromElement(node: XmlElementNode, context: ParseContext): RoadmapNote {
	const sourceRange = nodeRange(node);
	const content = withAbbreviations(
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

function roadmapFromXml(root: XmlElementNode, prepared: PreparedSource): RoadmapDocument {
	let sequence = 0;
	const context: ParseContext = {
		lines: prepared.lines,
		abbreviations: prepared.abbreviations,
		nextId(prefix, content) {
			sequence += 1;
			return `${prefix}-${sequence}-${slug(inlineToPlainText(content)) || "untitled"}`;
		},
	};
	const steps: RoadmapStep[] = [];
	const footnotes: FootnoteDefinition[] = [];

	for (const child of childElements(root)) {
		switch (child.name) {
			case "heading":
				steps.push(headingFromElement(child, context));
				break;
			case "paragraph":
			case "block_quote":
			case "code_block":
				steps.push(noteFromElement(child, context));
				break;
			case "list":
				steps.push(...listItems(child).map((item) => chapterFromItem(item, context)));
				break;
			case "footnote_definition":
				footnotes.push({
					label: child.attributes.label ?? `footnote-${footnotes.length + 1}`,
					content: withAbbreviations(blockContent(child), context),
				});
				break;
		}
	}

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

function fenceInfo(line: string): string | undefined {
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
	return info;
}

function validateFences(source: string): void {
	for (const [index, line] of source.split("\n").entries()) {
		const info = fenceInfo(line);
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
		throw new RoadmapMarkdownError(
			"Unable to parse roadmap Markdown. Initialize comrak-wasm before using the synchronous parser.",
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

export function firstParagraph(node: XmlElementNode): XmlElementNode | undefined {
	return firstChildElement(node, "paragraph");
}
