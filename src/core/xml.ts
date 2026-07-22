export interface XmlTextNode {
	readonly type: "text";
	readonly value: string;
}

export interface XmlElementNode {
	readonly type: "element";
	readonly name: string;
	readonly attributes: Readonly<Record<string, string>>;
	readonly children: readonly XmlNode[];
}

export type XmlNode = XmlTextNode | XmlElementNode;

export class XmlDecodeError extends Error {
	readonly offset: number;

	constructor(message: string, offset: number) {
		super(`${message} at XML offset ${offset}`);
		this.name = "XmlDecodeError";
		this.offset = offset;
	}
}

const namedEntities: Readonly<Record<string, string>> = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	quot: '"',
};

function decodeEntities(value: string): string {
	return value.replaceAll(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
		if (entity.startsWith("#x") || entity.startsWith("#X")) {
			const codePoint = Number.parseInt(entity.slice(2), 16);
			return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
				? String.fromCodePoint(codePoint)
				: match;
		}
		if (entity.startsWith("#")) {
			const codePoint = Number.parseInt(entity.slice(1), 10);
			return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
				? String.fromCodePoint(codePoint)
				: match;
		}
		return namedEntities[entity] ?? match;
	});
}

function isNameCharacter(character: string | undefined): boolean {
	return character !== undefined && /[\w:.-]/u.test(character);
}

function skipWhitespace(source: string, start: number): number {
	let cursor = start;
	while (/\s/u.test(source[cursor] ?? "")) cursor += 1;
	return cursor;
}

function skipDeclaration(source: string, start: number): number {
	const end = source.indexOf("?>", start + 2);
	if (end < 0) throw new XmlDecodeError("Unterminated XML declaration", start);
	return end + 2;
}

function skipDoctype(source: string, start: number): number {
	let cursor = start + 2;
	let quote = "";
	let bracketDepth = 0;
	for (; cursor < source.length; cursor += 1) {
		const character = source[cursor] ?? "";
		if (quote) {
			if (character === quote) quote = "";
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}
		if (character === "[") bracketDepth += 1;
		else if (character === "]") bracketDepth = Math.max(0, bracketDepth - 1);
		else if (character === ">" && bracketDepth === 0) return cursor + 1;
	}
	throw new XmlDecodeError("Unterminated doctype", start);
}

interface MutableXmlElement {
	type: "element";
	name: string;
	attributes: Record<string, string>;
	children: XmlNode[];
}

function freezeElement(element: MutableXmlElement): XmlElementNode {
	return {
		type: "element",
		name: element.name,
		attributes: Object.freeze({ ...element.attributes }),
		children: Object.freeze([...element.children]),
	};
}

export function decodeXml(source: string): XmlElementNode {
	const roots: XmlElementNode[] = [];
	const stack: MutableXmlElement[] = [];
	let cursor = 0;

	while (cursor < source.length) {
		const open = source.indexOf("<", cursor);
		if (open < 0) {
			const trailing = source.slice(cursor);
			if (trailing.trim() && stack.length > 0) {
				stack.at(-1)?.children.push({ type: "text", value: decodeEntities(trailing) });
			}
			break;
		}

		if (open > cursor && stack.length > 0) {
			const value = source.slice(cursor, open);
			if (value.trim() || stack.at(-1)?.name === "text" || stack.at(-1)?.name === "code") {
				stack.at(-1)?.children.push({ type: "text", value: decodeEntities(value) });
			}
		}

		if (source.startsWith("<?", open)) {
			cursor = skipDeclaration(source, open);
			continue;
		}
		if (source.startsWith("<!DOCTYPE", open) || source.startsWith("<!doctype", open)) {
			cursor = skipDoctype(source, open);
			continue;
		}
		if (source.startsWith("<!--", open)) {
			const end = source.indexOf("-->", open + 4);
			if (end < 0) throw new XmlDecodeError("Unterminated XML comment", open);
			cursor = end + 3;
			continue;
		}
		if (source.startsWith("<![CDATA[", open)) {
			const end = source.indexOf("]]>", open + 9);
			if (end < 0) throw new XmlDecodeError("Unterminated CDATA section", open);
			if (stack.length === 0) throw new XmlDecodeError("CDATA outside the root element", open);
			stack.at(-1)?.children.push({ type: "text", value: source.slice(open + 9, end) });
			cursor = end + 3;
			continue;
		}

		if (source.startsWith("</", open)) {
			let nameEnd = open + 2;
			while (isNameCharacter(source[nameEnd])) nameEnd += 1;
			const name = source.slice(open + 2, nameEnd);
			const close = source.indexOf(">", nameEnd);
			if (close < 0) throw new XmlDecodeError("Unterminated closing tag", open);
			const current = stack.pop();
			if (!current || current.name !== name) {
				throw new XmlDecodeError(
					`Unexpected closing tag </${name}>; expected </${current?.name ?? "none"}>`,
					open,
				);
			}
			const frozen = freezeElement(current);
			if (stack.length > 0) stack.at(-1)?.children.push(frozen);
			else roots.push(frozen);
			cursor = close + 1;
			continue;
		}

		let nameEnd = open + 1;
		while (isNameCharacter(source[nameEnd])) nameEnd += 1;
		const name = source.slice(open + 1, nameEnd);
		if (!name) throw new XmlDecodeError("Element name is missing", open);

		const attributes: Record<string, string> = {};
		let tagCursor = nameEnd;
		let selfClosing = false;
		while (tagCursor < source.length) {
			tagCursor = skipWhitespace(source, tagCursor);
			if (source.startsWith("/>", tagCursor)) {
				selfClosing = true;
				tagCursor += 2;
				break;
			}
			if (source[tagCursor] === ">") {
				tagCursor += 1;
				break;
			}

			let attributeEnd = tagCursor;
			while (isNameCharacter(source[attributeEnd])) attributeEnd += 1;
			const attributeName = source.slice(tagCursor, attributeEnd);
			if (!attributeName) throw new XmlDecodeError("Invalid attribute name", tagCursor);
			tagCursor = skipWhitespace(source, attributeEnd);
			if (source[tagCursor] !== "=") {
				throw new XmlDecodeError(`Attribute ${attributeName} has no value`, tagCursor);
			}
			tagCursor = skipWhitespace(source, tagCursor + 1);
			const quote = source[tagCursor];
			if (quote !== '"' && quote !== "'") {
				throw new XmlDecodeError(`Attribute ${attributeName} is not quoted`, tagCursor);
			}
			const valueEnd = source.indexOf(quote, tagCursor + 1);
			if (valueEnd < 0) throw new XmlDecodeError("Unterminated attribute", tagCursor);
			attributes[attributeName] = decodeEntities(source.slice(tagCursor + 1, valueEnd));
			tagCursor = valueEnd + 1;
		}

		const element: MutableXmlElement = { type: "element", name, attributes, children: [] };
		if (selfClosing) {
			const frozen = freezeElement(element);
			if (stack.length > 0) stack.at(-1)?.children.push(frozen);
			else roots.push(frozen);
		} else {
			stack.push(element);
		}
		cursor = tagCursor;
	}

	if (stack.length > 0) {
		throw new XmlDecodeError(
			`Unclosed element <${stack.at(-1)?.name ?? "unknown"}>`,
			source.length,
		);
	}
	if (roots.length !== 1 || roots[0]?.name !== "document") {
		throw new XmlDecodeError("Expected one <document> root element", 0);
	}
	return roots[0];
}

export function childElements(node: XmlElementNode, name?: string): XmlElementNode[] {
	return node.children.filter(
		(child): child is XmlElementNode =>
			child.type === "element" && (name === undefined || child.name === name),
	);
}

export function firstChildElement(node: XmlElementNode, name: string): XmlElementNode | undefined {
	return node.children.find(
		(child): child is XmlElementNode => child.type === "element" && child.name === name,
	);
}

export function xmlText(node: XmlElementNode): string {
	let value = "";
	const pending: XmlNode[] = [...node.children].reverse();
	while (pending.length > 0) {
		const current = pending.pop();
		if (!current) continue;
		if (current.type === "text") value += current.value;
		else pending.push(...[...current.children].reverse());
	}
	return value;
}
