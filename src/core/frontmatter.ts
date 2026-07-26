import type { RoadmapSettings, RoadmapTagSetting } from "../types.ts";

type FrontmatterScalar = string | number | boolean;
type FrontmatterValue = FrontmatterScalar | FrontmatterMap;
interface FrontmatterMap {
	[key: string]: FrontmatterValue;
}

export const defaultRoadmapSettings: RoadmapSettings = {
	theme: { preset: "fun" },
	background: { enabled: false, seed: "default", density: 0.55, size: 1, animated: false },
	tags: {},
	legend: true,
	noteMarkers: false,
	footnotes: true,
	layout: {},
};

export class RoadmapFrontmatterError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RoadmapFrontmatterError";
	}
}

function parseScalar(source: string, line: number): FrontmatterScalar {
	let value = source.trim();
	if (!value) throw new RoadmapFrontmatterError(`Missing value on front-matter line ${line}.`);
	// YAML-style inline comments: an unquoted value ends at whitespace + '#'.
	// A leading '#' (a bare color) is a value, matching quoted-color examples.
	if (!value.startsWith('"') && !value.startsWith("'")) {
		const comment = value.search(/\s#/u);
		if (comment > 0) value = value.slice(0, comment).trim();
	}
	if (value.startsWith('"')) {
		try {
			const parsed: unknown = JSON.parse(value);
			if (typeof parsed === "string") return parsed;
		} catch {
			// The descriptive error below covers malformed quoted values.
		}
		throw new RoadmapFrontmatterError(`Invalid quoted string on front-matter line ${line}.`);
	}
	if (value.startsWith("'")) {
		if (!value.endsWith("'") || value.length < 2) {
			throw new RoadmapFrontmatterError(`Invalid quoted string on front-matter line ${line}.`);
		}
		return value.slice(1, -1).replaceAll("''", "'");
	}
	if (value === "true") return true;
	if (value === "false") return false;
	if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) {
		const number = Number(value);
		if (Number.isFinite(number)) return number;
	}
	return value;
}

function parseMapping(source: string): FrontmatterMap {
	const root: FrontmatterMap = {};
	const stack: { indent: number; value: FrontmatterMap }[] = [{ indent: -2, value: root }];
	for (const [index, rawLine] of source.split(/\r?\n/u).entries()) {
		const lineNumber = index + 1;
		if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
		if (rawLine.includes("\t")) {
			throw new RoadmapFrontmatterError(
				`Tabs aren't supported in roadmap front matter (line ${lineNumber}).`,
			);
		}
		const indent = rawLine.length - rawLine.trimStart().length;
		if (indent % 2 !== 0) {
			throw new RoadmapFrontmatterError(
				`Use two-space indentation in roadmap front matter (line ${lineNumber}).`,
			);
		}
		while ((stack.at(-1)?.indent ?? -2) >= indent) stack.pop();
		const parent = stack.at(-1);
		if (!parent || indent !== parent.indent + 2) {
			throw new RoadmapFrontmatterError(`Invalid front-matter indentation on line ${lineNumber}.`);
		}
		const content = rawLine.slice(indent);
		const separator = content.indexOf(":");
		if (separator <= 0) {
			throw new RoadmapFrontmatterError(`Expected a key and value on line ${lineNumber}.`);
		}
		const key = content.slice(0, separator).trim();
		// Author-defined map keys (tag names) may be written in any language;
		// lowercase or caseless letters keep the original a-z spirit while
		// admitting accented and non-Latin scripts. Structural keys are still
		// checked against their allow-lists after lexing.
		if (!/^[\p{Ll}\p{Lo}][\p{Letter}\p{Number}-]*$/u.test(key)) {
			throw new RoadmapFrontmatterError(`Invalid key "${key}" on line ${lineNumber}.`);
		}
		if (Object.hasOwn(parent.value, key)) {
			throw new RoadmapFrontmatterError(`Duplicate key "${key}" on line ${lineNumber}.`);
		}
		const rawValue = content.slice(separator + 1).trim();
		if (rawValue) {
			parent.value[key] = parseScalar(rawValue, lineNumber);
		} else {
			const nested: FrontmatterMap = {};
			parent.value[key] = nested;
			stack.push({ indent, value: nested });
		}
	}
	return root;
}

function isMap(value: FrontmatterValue | undefined): value is FrontmatterMap {
	return typeof value === "object" && value !== null;
}

const roadmapLevelKeys = ["theme", "background", "tags", "legend"] as const;

function assertKnownKeys(value: FrontmatterMap, keys: readonly string[], context: string): void {
	for (const key of Object.keys(value)) {
		if (keys.includes(key)) continue;
		// The usual mistake is one indent level too deep: name the fix.
		if (context !== "roadmap" && (roadmapLevelKeys as readonly string[]).includes(key)) {
			throw new RoadmapFrontmatterError(
				`"${key}" is a roadmap setting, not a ${context} setting — put it directly under "roadmap:" with a two-space indent.`,
			);
		}
		throw new RoadmapFrontmatterError(
			`Unsupported ${context} setting "${key}". Supported: ${keys.join(", ")}.`,
		);
	}
}

function parseTheme(value: FrontmatterValue | undefined): RoadmapSettings["theme"] {
	if (value === undefined) return defaultRoadmapSettings.theme;
	if (typeof value === "string") return { preset: value };
	if (!isMap(value)) {
		throw new RoadmapFrontmatterError("The roadmap theme must be a name or a mapping.");
	}
	assertKnownKeys(value, ["preset", "mode", "gradients"], "theme");
	const gradients = value.gradients;
	if (gradients !== undefined && typeof gradients !== "boolean") {
		throw new RoadmapFrontmatterError("The theme gradients setting must be a boolean.");
	}
	const preset = value.preset ?? "fun";
	if (typeof preset !== "string" || !/^[a-z][a-z0-9-]*$/u.test(preset)) {
		throw new RoadmapFrontmatterError("The roadmap theme preset must be a valid name.");
	}
	const mode = value.mode;
	if (mode !== undefined && mode !== "light" && mode !== "dark") {
		throw new RoadmapFrontmatterError('The theme mode must be "light" or "dark".');
	}
	return {
		preset,
		...(mode !== undefined ? { mode } : {}),
		...(gradients !== undefined ? { gradients } : {}),
	};
}

function parseBackground(value: FrontmatterValue | undefined): RoadmapSettings["background"] {
	if (value === undefined || value === false) return defaultRoadmapSettings.background;
	if (value === true) return { ...defaultRoadmapSettings.background, enabled: true };
	if (!isMap(value)) {
		throw new RoadmapFrontmatterError("The roadmap background must be a boolean or a mapping.");
	}
	assertKnownKeys(value, ["enabled", "seed", "density", "size", "animated"], "background");
	const enabled = value.enabled ?? true;
	if (typeof enabled !== "boolean") {
		throw new RoadmapFrontmatterError("The background enabled setting must be a boolean.");
	}
	const rawSeed = value.seed ?? defaultRoadmapSettings.background.seed;
	if (typeof rawSeed !== "string" && typeof rawSeed !== "number") {
		throw new RoadmapFrontmatterError("The background seed must be a string or number.");
	}
	const density = value.density ?? defaultRoadmapSettings.background.density;
	if (typeof density !== "number" || density < 0 || density > 1) {
		throw new RoadmapFrontmatterError("The background density must be between 0 and 1.");
	}
	const size = value.size ?? defaultRoadmapSettings.background.size;
	if (typeof size !== "number" || size < 0.25 || size > 3) {
		throw new RoadmapFrontmatterError("The background size must be between 0.25 and 3.");
	}
	const animated = value.animated ?? defaultRoadmapSettings.background.animated;
	if (
		typeof animated !== "boolean" &&
		(typeof animated !== "number" || animated < 0 || animated > 4)
	) {
		throw new RoadmapFrontmatterError(
			"The background animated setting must be a boolean or a number between 0 and 4.",
		);
	}
	return { enabled, seed: String(rawSeed), density, size, animated };
}

const builtInBadgeIcons = ["check", "heart", "star", "x", "question", "cloud", "warning"] as const;
const shortcodeIconPattern = /^:[a-z0-9_+-]+:$/u;
// Colors reach SVG attribute values, so only plain CSS color syntax passes.
const colorPattern = /^[#a-zA-Z0-9(),.%\s-]+$/u;

function parseTagColor(value: FrontmatterValue | undefined, context: string): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string" || !value.trim() || !colorPattern.test(value)) {
		throw new RoadmapFrontmatterError(`The ${context} must be a plain CSS color.`);
	}
	return value;
}

function parseTag(name: string, value: FrontmatterValue): RoadmapTagSetting {
	if (!isMap(value)) {
		throw new RoadmapFrontmatterError(`The tag "${name}" must be a mapping of tag settings.`);
	}
	assertKnownKeys(
		value,
		["icon", "accent", "label", "legend", "background", "foreground"],
		`tag "${name}"`,
	);
	const icon = value.icon;
	if (icon !== undefined) {
		const known =
			typeof icon === "string" &&
			((builtInBadgeIcons as readonly string[]).includes(icon) || shortcodeIconPattern.test(icon));
		if (!known) {
			throw new RoadmapFrontmatterError(
				`The tag "${name}" icon must be one of ${builtInBadgeIcons.join(", ")} or an emoji shortcode such as ":rocket:".`,
			);
		}
	}
	const accent = value.accent;
	if (
		accent !== undefined &&
		(typeof accent !== "string" ||
			!(/^[a-z][a-z0-9-]*$/u.test(accent) || colorPattern.test(accent)))
	) {
		throw new RoadmapFrontmatterError(
			`The tag "${name}" accent must be an accent slot name or a plain CSS color.`,
		);
	}
	const label = value.label;
	if (label !== undefined && typeof label !== "string") {
		throw new RoadmapFrontmatterError(`The tag "${name}" label must be a string.`);
	}
	const legend = value.legend;
	if (legend !== undefined && typeof legend !== "boolean") {
		throw new RoadmapFrontmatterError(`The tag "${name}" legend setting must be a boolean.`);
	}
	return {
		...(icon !== undefined ? { icon } : {}),
		...(accent !== undefined ? { accent } : {}),
		...(label !== undefined ? { label } : {}),
		...(legend !== undefined ? { legend } : {}),
		...(() => {
			const background = parseTagColor(value.background, `tag "${name}" background`);
			const foreground = parseTagColor(value.foreground, `tag "${name}" foreground`);
			return {
				...(background !== undefined ? { background } : {}),
				...(foreground !== undefined ? { foreground } : {}),
			};
		})(),
	};
}

function parseTags(value: FrontmatterValue | undefined): RoadmapSettings["tags"] {
	if (value === undefined) return defaultRoadmapSettings.tags;
	if (!isMap(value)) {
		throw new RoadmapFrontmatterError("The roadmap tags must be a mapping of tag definitions.");
	}
	const tags: Record<string, RoadmapTagSetting> = {};
	for (const [name, setting] of Object.entries(value)) {
		tags[name] = parseTag(name, setting);
	}
	return tags;
}

export function parseRoadmapFrontmatter(source: string | undefined): RoadmapSettings {
	if (!source?.trim()) return defaultRoadmapSettings;
	const root = parseMapping(source);
	const roadmap = root.roadmap;
	if (roadmap === undefined) return defaultRoadmapSettings;
	if (!isMap(roadmap)) {
		throw new RoadmapFrontmatterError("The roadmap front-matter value must be a mapping.");
	}
	assertKnownKeys(
		roadmap,
		[
			"theme",
			"background",
			"tags",
			"legend",
			"noteMarkers",
			"footnotes",
			"layout",
			"title",
			"description",
		],
		"roadmap",
	);
	const legend = roadmap.legend ?? defaultRoadmapSettings.legend;
	if (typeof legend !== "boolean") {
		throw new RoadmapFrontmatterError("The roadmap legend setting must be a boolean.");
	}
	const noteMarkers = roadmap.noteMarkers ?? defaultRoadmapSettings.noteMarkers;
	if (typeof noteMarkers !== "boolean") {
		throw new RoadmapFrontmatterError("The roadmap noteMarkers setting must be a boolean.");
	}
	const footnotes = roadmap.footnotes ?? defaultRoadmapSettings.footnotes;
	if (typeof footnotes !== "boolean") {
		throw new RoadmapFrontmatterError("The roadmap footnotes setting must be a boolean.");
	}
	const title = roadmap.title;
	if (title !== undefined && typeof title !== "string") {
		throw new RoadmapFrontmatterError("The roadmap title must be a string.");
	}
	const description = roadmap.description;
	if (description !== undefined && typeof description !== "string") {
		throw new RoadmapFrontmatterError("The roadmap description must be a string.");
	}
	return {
		theme: parseTheme(roadmap.theme),
		background: parseBackground(roadmap.background),
		tags: parseTags(roadmap.tags),
		legend,
		noteMarkers,
		footnotes,
		layout: parseLayout(roadmap.layout),
		...(title?.trim() ? { title: title.trim() } : {}),
		...(description?.trim() ? { description: description.trim() } : {}),
	};
}

function parseLayout(value: FrontmatterValue | undefined): RoadmapSettings["layout"] {
	if (value === undefined) return defaultRoadmapSettings.layout;
	if (!isMap(value)) {
		throw new RoadmapFrontmatterError("The roadmap layout must be a mapping.");
	}
	assertKnownKeys(value, ["canvas", "clusterColumns", "columns", "spacing"], "layout");
	const canvas = value.canvas;
	if (canvas !== undefined && (typeof canvas !== "number" || canvas < 1 || canvas > 3)) {
		throw new RoadmapFrontmatterError("The layout canvas must be a number between 1 and 3.");
	}
	const clusterColumns = value.clusterColumns;
	if (clusterColumns !== undefined && clusterColumns !== 1 && clusterColumns !== 2) {
		throw new RoadmapFrontmatterError("The layout clusterColumns must be 1 or 2.");
	}
	const columns = value.columns;
	if (
		columns !== undefined &&
		(typeof columns !== "number" || !Number.isInteger(columns) || columns < 1)
	) {
		throw new RoadmapFrontmatterError("The layout columns must be a whole number of at least 1.");
	}
	const spacing = value.spacing;
	if (spacing !== undefined && spacing !== "compact" && spacing !== "cozy" && spacing !== "roomy") {
		throw new RoadmapFrontmatterError('The layout spacing must be "compact", "cozy", or "roomy".');
	}
	return {
		...(canvas !== undefined ? { canvas } : {}),
		...(clusterColumns !== undefined ? { clusterColumns } : {}),
		...(columns !== undefined ? { columns } : {}),
		...(spacing !== undefined ? { spacing } : {}),
	};
}
