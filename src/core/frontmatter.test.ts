import { describe, expect, test } from "vitest";
import {
	defaultRoadmapSettings,
	parseRoadmapFrontmatter,
	RoadmapFrontmatterError,
} from "./frontmatter.ts";

describe("front-matter validation", () => {
	test.each([
		["roadmap: true", "must be a mapping"],
		["roadmap:\n\tlegend: true", "Tabs aren't supported"],
		["roadmap:\n legend: true", "two-space indentation"],
		["roadmap:\n    legend: true", "Invalid front-matter indentation"],
		["roadmap:\n  missing", "Expected a key and value"],
		["roadmap:\n  _invalid: true", "Invalid key"],
		["roadmap:\n  legend: true\n  legend: false", "Duplicate key"],
		['roadmap:\n  title: "unfinished', "Invalid quoted string"],
		["roadmap:\n  title: 'unfinished", "Invalid quoted string"],
		["roadmap:\n  theme: 42", "theme must be a name or a mapping"],
		["roadmap:\n  theme:\n    gradients: 1", "gradients setting must be a boolean"],
		["roadmap:\n  theme:\n    preset: 1", "preset must be a valid name"],
		["roadmap:\n  theme:\n    preset: Invalid!", "preset must be a valid name"],
		["roadmap:\n  theme:\n    mode: sepia", "mode must be"],
		["roadmap:\n  theme:\n    background: false", "put it directly under"],
		["roadmap:\n  theme:\n    unknown: false", "Unsupported theme setting"],
		["roadmap:\n  background: nope", "background must be a boolean or a mapping"],
		["roadmap:\n  background:\n    enabled: 1", "enabled setting must be a boolean"],
		["roadmap:\n  background:\n    seed: true", "seed must be a string or number"],
		["roadmap:\n  background:\n    density: -0.1", "density must be between"],
		["roadmap:\n  background:\n    density: 1.1", "density must be between"],
		["roadmap:\n  background:\n    density: lots", "density must be between"],
		["roadmap:\n  background:\n    size: 0.24", "size must be between"],
		["roadmap:\n  background:\n    size: 3.1", "size must be between"],
		["roadmap:\n  background:\n    animated: -1", "animated setting must be"],
		["roadmap:\n  background:\n    animated: 5", "animated setting must be"],
		["roadmap:\n  background:\n    animated: fast", "animated setting must be"],
		["roadmap:\n  tags: true", "tags must be a mapping"],
		["roadmap:\n  tags:\n    core: true", "must be a mapping of tag settings"],
		["roadmap:\n  tags:\n    core:\n      icon: 1", "icon must be a string or a list"],
		["roadmap:\n  tags:\n    core:\n      icon: invalid", "icon must be one of"],
		["roadmap:\n  tags:\n    core:\n      icon: [heart", "missing its closing"],
		["roadmap:\n  tags:\n    core:\n      icon: []", "comma-separated entries"],
		["roadmap:\n  tags:\n    core:\n      icon: [heart,]", "comma-separated entries"],
		["roadmap:\n  tags:\n    core:\n      accent: 1", "accent must be a string or a list"],
		["roadmap:\n  tags:\n    core:\n      accent: bad<color", "accent must be an accent slot"],
		["roadmap:\n  tags:\n    core:\n      accent: [red, blue]", "more accents than icons"],
		["roadmap:\n  tags:\n    core:\n      label: true", "label must be a string"],
		["roadmap:\n  tags:\n    core:\n      legend: 1", "legend setting must be a boolean"],
		["roadmap:\n  tags:\n    core:\n      foreground: 1", "must be a plain CSS color"],
		['roadmap:\n  tags:\n    core:\n      background: ""', "must be a plain CSS color"],
		["roadmap:\n  tags:\n    core:\n      background: bad<color", "must be a plain CSS color"],
		["roadmap:\n  legend: 1", "legend setting must be a boolean"],
		["roadmap:\n  noteMarkers: 1", "noteMarkers setting must be a boolean"],
		["roadmap:\n  footnotes: 1", "footnotes setting must be a boolean"],
		["roadmap:\n  title: 1", "title must be a string"],
		["roadmap:\n  description: true", "description must be a string"],
		["roadmap:\n  layout: true", "layout must be a mapping"],
		["roadmap:\n  layout:\n    canvas: 0.9", "canvas must be a number between"],
		["roadmap:\n  layout:\n    canvas: 3.1", "canvas must be a number between"],
		["roadmap:\n  layout:\n    canvas: wide", "canvas must be a number between"],
		["roadmap:\n  layout:\n    clusterColumns: 3", "clusterColumns must be 1 or 2"],
		["roadmap:\n  layout:\n    columns: 1.5", "columns must be a whole number"],
		["roadmap:\n  layout:\n    columns: 0", "columns must be a whole number"],
		["roadmap:\n  layout:\n    columns: many", "columns must be a whole number"],
		["roadmap:\n  layout:\n    spacing: loose", "spacing must be"],
	])("rejects %j with a useful error", (source, message) => {
		expect(() => parseRoadmapFrontmatter(source)).toThrow(RoadmapFrontmatterError);
		expect(() => parseRoadmapFrontmatter(source)).toThrow(message);
	});

	test.each([undefined, "", "  \n", "# comment\ntitle: Unrelated"])(
		"uses defaults for %j",
		(source) => {
			expect(parseRoadmapFrontmatter(source)).toEqual(defaultRoadmapSettings);
		},
	);

	test("preserves quoted punctuation, doubled apostrophes, and numeric-looking strings", () => {
		const settings = parseRoadmapFrontmatter(`roadmap:
  title: '  It''s #not a comment  '
  description: "escaped \\"quote\\""
  background:
    seed: "001"
    density: 0 # inline comment
    size: 0.25
    animated: 4
  theme:
    mode: dark
    gradients: false
  tags:
    élève:
      icon: [heart, :rocket:]
      accent: "[red, #22c55e]"
      foreground: white
      background: rgb(1, 2, 3)
      legend: false
`);
		expect(settings.title).toBe("It's #not a comment");
		expect(settings.description).toBe('escaped "quote"');
		expect(settings.background).toEqual({
			enabled: true,
			seed: "001",
			density: 0,
			size: 0.25,
			animated: 4,
		});
		expect(settings.theme).toEqual({ preset: "fun", mode: "dark", gradients: false });
		expect(settings.tags.élève).toEqual({
			icon: ["heart", ":rocket:"],
			accent: ["red", "#22c55e"],
			foreground: "white",
			background: "rgb(1, 2, 3)",
			legend: false,
		});
	});

	test("accepts upper bounds and omits blank accessible labels", () => {
		const settings = parseRoadmapFrontmatter(
			'roadmap:\n  title: " "\n  description: ""\n  background:\n    seed: -12\n    density: 1\n    size: 3\n    animated: 0\n  layout:\n    canvas: 3\n    clusterColumns: 1\n    columns: 2\n    spacing: cozy',
		);
		expect(settings.title).toBeUndefined();
		expect(settings.description).toBeUndefined();
		expect(settings.background).toEqual({
			enabled: true,
			seed: "-12",
			density: 1,
			size: 3,
			animated: 0,
		});
		expect(settings.layout).toEqual({ canvas: 3, clusterColumns: 1, columns: 2, spacing: "cozy" });
	});
});
