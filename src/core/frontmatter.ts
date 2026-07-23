import type { RoadmapSettings } from "../types.ts";

type FrontmatterScalar = string | number | boolean;
type FrontmatterValue = FrontmatterScalar | FrontmatterMap;
interface FrontmatterMap {
	[key: string]: FrontmatterValue;
}

export const defaultRoadmapSettings: RoadmapSettings = {
	theme: { preset: "fun" },
	background: { enabled: false, seed: "default", density: 0.55, size: 1, animated: false },
};

export class RoadmapFrontmatterError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RoadmapFrontmatterError";
	}
}

function parseScalar(source: string, line: number): FrontmatterScalar {
	const value = source.trim();
	if (!value) throw new RoadmapFrontmatterError(`Missing value on front-matter line ${line}.`);
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
		if (!/^[a-z][a-zA-Z0-9-]*$/u.test(key)) {
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

function assertKnownKeys(value: FrontmatterMap, keys: readonly string[], context: string): void {
	for (const key of Object.keys(value)) {
		if (!keys.includes(key)) {
			throw new RoadmapFrontmatterError(`Unsupported ${context} setting "${key}".`);
		}
	}
}

function parseTheme(value: FrontmatterValue | undefined): RoadmapSettings["theme"] {
	if (value === undefined) return defaultRoadmapSettings.theme;
	if (typeof value === "string") return { preset: value };
	if (!isMap(value)) {
		throw new RoadmapFrontmatterError("The roadmap theme must be a name or a mapping.");
	}
	assertKnownKeys(value, ["preset", "mode"], "theme");
	const preset = value.preset ?? "fun";
	if (typeof preset !== "string" || !/^[a-z][a-z0-9-]*$/u.test(preset)) {
		throw new RoadmapFrontmatterError("The roadmap theme preset must be a valid name.");
	}
	const mode = value.mode;
	if (mode !== undefined && mode !== "light" && mode !== "dark") {
		throw new RoadmapFrontmatterError('The theme mode must be "light" or "dark".');
	}
	return mode ? { preset, mode } : { preset };
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

export function parseRoadmapFrontmatter(source: string | undefined): RoadmapSettings {
	if (!source?.trim()) return defaultRoadmapSettings;
	const root = parseMapping(source);
	const roadmap = root.roadmap;
	if (roadmap === undefined) return defaultRoadmapSettings;
	if (!isMap(roadmap)) {
		throw new RoadmapFrontmatterError("The roadmap front-matter value must be a mapping.");
	}
	assertKnownKeys(roadmap, ["theme", "background"], "roadmap");
	return {
		theme: parseTheme(roadmap.theme),
		background: parseBackground(roadmap.background),
	};
}
