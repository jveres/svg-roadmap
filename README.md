# SVG Roadmap

SVG Roadmap turns Markdown text into a deterministic, standalone SVG chart. It
keeps the visual language of the original roadmap generator while replacing its
fixed topic/subtopic model and browser-only layout dependencies with a recursive
model and a TypeScript core.

## Features

The library is designed for reusable rendering in browsers, Node.js, and build
tools.

- Parses Markdown with the local `comrak-wasm` package.
- Supports recursive topic trees without an application-level depth limit.
- Generates SVG strings without a DOM, canvas, or layout framework.
- Implements rectangle overlap checks, collision resolution, convex hulls, and
  Bézier connectors in the core.
- Includes `Fun`, utopian `Sci-fi`, feminine `Rose`, editorial `Print`,
  engineering-grade `Pro`, seventies `Retro`, neon `Arcade`, and terminal
  `ASCII` roadmap themes with light and dark modes.
- Supports optional, seeded background decoration owned by each theme.
- Exposes typed design tokens, CSS classes, and `data-roadmap-element` hooks.
- Preserves headings, comments, links, emphasis, highlights, inserts, tags,
  emoji shortcodes, source positions, and legacy abbreviation definitions.
- Renders common roadmap shortcodes with deterministic embedded SVG symbols
  instead of platform-dependent emoji glyphs.
- Produces accessible SVG with `<title>`, `<desc>`, safe links, and no
  `foreignObject` elements.

`comrak-wasm` is the only runtime dependency. Vite, Vitest, Biome, and
TypeScript are development dependencies.

## Install

This workspace uses the sibling `../comrak-wasm` checkout during development.
Place both repositories under the same parent directory, then install all
packages with pnpm from `roadmap-next`.

```text
workspace/
├── comrak-wasm/
└── roadmap-next/
```

```sh
cd roadmap-next
pnpm install
```

The package currently uses a local `file:` dependency. Before publishing SVG
Roadmap, replace it with a published or pinned Git version of `comrak-wasm`.

## Browser usage

The asynchronous browser API initializes the Wasm parser on its first call and
returns the SVG markup.

```ts
import { generateRoadmapSvg } from "svg-roadmap";

const markdown = `# Engineering roadmap

* Foundation
  + Languages
    * TypeScript [recommended]
    * Rust
`;

const svg = await generateRoadmapSvg(markdown, { theme: "light" });
document.querySelector("#roadmap")?.insertAdjacentHTML("beforeend", svg);
```

Use `createRoadmapGenerator()` when an editor renders repeatedly. It initializes
the Wasm parser once and returns a generator with synchronous methods. Dispose
the generator after its last render.

```ts
import { createRoadmapGenerator } from "svg-roadmap";

using generator = await createRoadmapGenerator();

editor.addEventListener("input", () => {
  const result = generator.generate(editor.value, { theme: "dark" });
  preview.innerHTML = result.svg;
});
```

Use `RoadmapParser` directly when you need independent access to the document,
layout, and rendering stages. Initialize it before construction; the prepared
parser reuses Comrak's validated options.

```ts
import {
  darkTheme,
  initializeRoadmapMarkdown,
  layoutRoadmap,
  renderRoadmapSvg,
  RoadmapParser,
} from "svg-roadmap";

await initializeRoadmapMarkdown();

using parser = new RoadmapParser();
const document = parser.parse(markdown);
const layout = layoutRoadmap(document, darkTheme);
const svg = renderRoadmapSvg(layout, darkTheme);

console.log(document.stats.maxDepth, layout.width, svg);
```

## Node.js usage

Node.js doesn't fetch `file:` Wasm URLs. The package's Node export condition
resolves and reads the exported Wasm asset before rendering. The explicit
`svg-roadmap/node` subpath is also available when a tool does not honor export
conditions.

```ts
import { writeFile } from "node:fs/promises";
import { generateRoadmapSvg } from "svg-roadmap";

const svg = await generateRoadmapSvg(markdown, { theme: "dark" });
await writeFile("roadmap.svg", svg);
```

The package requires Node.js 22 or newer.

## Markdown conventions

SVG Roadmap maps familiar Markdown structure to visual structure.

- A top-level heading becomes a step on the main spine.
- A top-level list item becomes a chapter.
- Every nested list item becomes a topic with recursive `children`.
- A `*comment*` inside a list item becomes its description. Underscore emphasis
  remains part of the title.
- A trailing `[recommended]` annotation becomes a tag badge.
- A trailing `[tag one, tag two]` annotation creates multiple badges.
- A `+` marker on the first topic in a group selects a grid layout.
- A blank line between first-level topics starts another group. Tree groups
  alternate around the main spine.
- A `*[Term]: Definition` line adds an abbreviation tooltip without adding a
  chart node.

Comrak extensions enable `++insert++`, `==highlight==`, `~subscript~`,
`^superscript^`, strikethrough, footnotes, and emoji shortcodes. SVG Roadmap
doesn't impose an application-level topic-depth limit; the practical maximum is
bounded only by the parser and JavaScript runtime resources. The test suite
exercises a 128-level topic tree.

Roadmap settings live under a namespaced front-matter key. The seed keeps a
theme's background geometry stable while the Markdown content changes. Enabling
the background is only a request: the selected theme decides whether it has a
background-artifact capability and what that capability draws.

```yaml
---
roadmap:
  theme:
    preset: sci-fi
    mode: dark
  background:
    enabled: true
    seed: engineering-2026
    density: 0.55
    size: 0.8
    animated: 1.5
---
```

`density` accepts values from `0` to `1`. `size` is a scale from `0.25` to `3`;
`1` uses the theme's default artifact size. `animated` adds a deterministic
CSS drift loop to the artifacts: `true` uses the default intensity of `1`, and
a number from `0` to `4` scales the motion. No scripts are involved,
`prefers-reduced-motion` is respected, and each artifact gets its own phase and
tempo. Programmatic `theme` options
override the front-matter theme, which lets an editor follow the system color
scheme without rewriting its source.

## Themes and restyling

`Fun`, `Sci-fi`, `Rose`, `Print`, `Pro`, `Retro`, `Arcade`, and `ASCII` are
built-in roadmap theme presets. Each
preset supplies a complete appearance and light and dark palettes; decorative
background artifacts are an optional theme capability. `Sci-fi` uses clean
translucent surfaces, cyan and violet accents, geometric orbital and signal
motifs, chamfered cards and boards, capsule notes, technical grid and dot
patterns, a straight architectural spine, and orthogonal circuit-like branches
for an optimistic near-future look.
`Rose` uses blush, berry, and lavender colors with vintage cameo labels and
fine inset keylines, petal-edged cards and notes, floral lace, pearl, and bow
boards, curved branches, a double-strand spine, and soft pearl, bow, and floral
motifs. `Print` uses warm paper and ink surfaces, editorial serif display
type, sharp flat cards with hairline rules, serif italic pull-quote notes,
solid ink chapter blocks, restrained badges, and no background artifacts for a
minimal editorial result. `Pro` targets software professionals with cool slate
surfaces, monospace display type, blueprint grid and dot boards, orthogonal
connectors, a steel-blue accent, and no background artifacts. `Retro` leans
into the seventies with cream paper, burnt orange, avocado, and mustard,
chunky rounded display type, capsule chapters with hard offset shadows,
polka-dot boards, and thick curved connectors, over warm espresso surfaces in
dark mode. `Arcade` is an eighties cabinet: marquee display type, neon pink
and cyan on deep violet, chamfered bezels with inner keylines, synthwave grid
boards, dotted pellet-trail branch connectors, and background sprites straight
from the cabinet floor — a chomping puck, ghosts, pixel invaders, cherries,
power pellets, tetrominoes, and one-life hearts. `ASCII` reads like a hand-set
monospace diagram zine on warm paper: unfilled hairline boxes, a double-ruled
chapter frame, tracked uppercase labels, warm-grayscale badges, arrowed
right-angle rules, and marginalia doodles — block cursors, crop marks, frame
corners, shading swatches, and tiny diagram stubs — printed in negative for
dark mode.

The `lightTheme` and `darkTheme` exports remain convenient Fun resolved-mode
values for the lower-level API. Typography and spacing properties affect
layout; CSS custom properties control rendered paint and effects.

Select a built-in preset programmatically in the same form used by front
matter.

```ts
const svg = await generateRoadmapSvg(markdown, {
  theme: { preset: "sci-fi", mode: "dark" },
});
```

Create a derived theme when you need structural or typography changes that
CSS paint tokens cannot express.

```ts
import { createTheme, darkTheme, generateRoadmapSvg } from "svg-roadmap";

const midnight = createTheme(
  {
    canvas: { background: "#090b12" },
    chapter: {
      fill: "#243b64",
      stroke: "#9fc2ff",
      typography: { color: "#ffffff" },
    },
    connectors: {
      spine: { color: "#63708a" },
    },
  },
  darkTheme,
);

const svg = await generateRoadmapSvg(markdown, { theme: midnight });
```

Every visual element includes a stable class and semantic data attributes. The
generated SVG declares descriptive `--roadmap-*` properties on its scoped root.
Override them through `render.css` or through a stylesheet applied to an inline
SVG. For example, this recolors the major surfaces without requiring another
layout pass.

```ts
const svg = await generateRoadmapSvg(markdown, {
  render: {
    className: "product-roadmap",
    css: `
      .product-roadmap {
        --roadmap-canvas-background: #0b1020;
        --roadmap-chapter-background: #243b64;
        --roadmap-chapter-border: #9fc2ff;
        --roadmap-chapter-text: #ffffff;
        --roadmap-topic-background: #151d31;
        --roadmap-topic-text: #eef4ff;
        --roadmap-connector-spine-color: #63708a;
        --roadmap-inline-link: #78a9ff;
        --roadmap-background-artifact-primary: #8b7cf6;
      }
    `,
  },
});
```

Token families cover the canvas; heading and legend text; every card role's
background, border, border width, corner radius, and text; topic, nested-topic,
and legend boards; all connector kinds; inline links and decorations; badge
foregrounds and backgrounds; shadows; gradients; hatches; and theme-owned
background artifacts. Names use semantic roles, for example
`--roadmap-topic-header-background`,
`--roadmap-connector-topic-to-children-color`, and
`--roadmap-inline-highlight-background`.

Theme geometry is typed alongside paint. Every card role selects a rounded,
chamfered, capsule, organic, cameo, or petal frame; boards select organic,
rounded, chamfered, or scalloped hulls and themed patterned or unpatterned
backgrounds; and each connector kind, including the main spine, selects curved,
orthogonal, straight, or braided routing. These values can change SVG topology
and therefore are configured through a theme rather than a CSS token.

Set a connector's `laneSpacing` to a positive number to distribute nearby
orthogonal routes across separate, ordered lanes. This keeps each source and
destination traceable in dense nested trees. A value of `0` preserves each
connector's natural midpoint.

Use a typed theme override for changes to font size, font family, padding, or
maximum node width because those values require a new layout pass. Dedicated
`nestedTopic` and `legend` tokens allow those elements to be styled separately;
`renderScale`, `renderScaleX`, and `renderScaleY` offer opt-in optical-size
adjustments without changing the layout box. Set `baselineRatio` on a typography
token when a custom font needs different optical vertical alignment.
`legend.rowGap`, per-placement badge sizes, and independent connector widths
expose the remaining layout details. The light and dark presets use one
connector tone across branch depths by default. A custom tag definition inherits
omitted badge values from the configured unknown-tag fallback.

Notes and chapter comments use content-fitted painted frames by default, so text
with different line counts remains inside its bubble with consistent padding.

### Isolated theme packages

A theme preset supplies complete light and dark `RoadmapTheme` values. Optional
features are capabilities on that theme, not switches in core. In particular,
`backgroundArtifacts` owns its CSS variables and a generator that returns
generic SVG primitives. Core layout and rendering do not depend on
preset-specific motif names.

Pass additional presets through the `themes` catalog. This allows front matter
to select an application theme without global registration or changes to the
library's resolver.

```ts
const minimalPreset = {
  name: "minimal",
  modes: {
    light: minimalLightTheme,
    dark: minimalDarkTheme,
  },
} satisfies RoadmapThemePreset;

const result = await generateRoadmapSvg(markdown, {
  themes: { minimal: minimalPreset },
});
```

A theme that omits `backgroundArtifacts` renders no artifacts even when the
document requests a background. A different theme may provide an entirely
different generator and token set while using the same generic renderer.

## Lower-level API

The pipeline is available as independent stages when an application needs the
document model or coordinates.

```ts
import {
  layoutRoadmap,
  lightTheme,
  parseRoadmapMarkdown,
  renderRoadmapSvg,
} from "svg-roadmap";

const document = parseRoadmapMarkdown(markdown);
const layout = layoutRoadmap(document, lightTheme, { width: 1440 });
const svg = renderRoadmapSvg(layout, lightTheme, {
  idPrefix: "architecture-roadmap",
});
```

The geometry exports include `rectanglesOverlap`, `resolveOverlaps`,
`convexHull`, `blobPath`, `verticalBumpPath`, and `horizontalBumpPath`.

## Development

The Vite workbench starts with a compact editable roadmap, renders it with both
themes, and supports SVG download. Focused regression tests cover parsing,
layout geometry, collision handling, and SVG rendering.

```sh
pnpm dev
```

Run the complete verification suite before publishing changes.

```sh
pnpm verify
```

The individual commands are `pnpm test`, `pnpm run typecheck`,
`pnpm run check`, `pnpm run build`, and `pnpm run build:demo`.

Generate a local coverage report when changing parser, layout, or rendering
behavior.

```sh
pnpm run test:coverage
```

## Visual validation

Use the workbench to inspect layout and theme changes at browser rendering size.
Content-fitted note frames are also covered by focused geometry and collision
tests. When you add a Markdown convention, add focused model and geometry tests
for its layout behavior.
