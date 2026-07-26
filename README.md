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
- Includes `Fun`, utopian `Sci-fi`, botanical `Rose`, editorial `Print`,
  engineering-grade `Pro`, seventies `Retro`, neon `Arcade`, and terminal
  `ASCII` roadmap themes with light and dark modes.
- Supports optional, seeded background decoration owned by each theme.
- Exposes typed design tokens, CSS classes, and `data-roadmap-element` hooks.
- Preserves headings, comments, links, emphasis, highlights, inserts, tags,
  emoji shortcodes, source positions, and legacy abbreviation definitions.
- Supports the full GitHub emoji shortcode set: popular shortcodes render as
  deterministic embedded SVG symbols, the rest as platform glyphs, with an
  opt-in pack that upgrades every GitHub shortcode to embedded artwork.
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

## Text measurement

Layout needs the width of every text run before the SVG exists. By default
the library measures with built-in deterministic metric tables — no DOM or
canvas — and the rendered SVG pins each run's geometry with `textLength`, so
every viewer reproduces the measured layout even when its fonts differ.

In a browser, install the DOM measurement oracle to measure with the real
fonts instead. Layout then reflects the generating browser exactly —
including custom fonts and scripts the tables cannot cover — while
`textLength` still keeps the saved SVG stable in every other viewer:

```ts
import { createRoadmapGenerator, installDomMeasurement } from "svg-roadmap";

const uninstall = await installDomMeasurement({
  // Optional web fonts to load before measuring; `document.fonts.ready`
  // alone would not request faces nothing has used yet.
  fonts: ['600 16px "My Display Face"'],
  // Late font loads change advances; regenerate when they land.
  onFontsChanged: () => render(),
});

using generator = await createRoadmapGenerator();
```

The oracle measures inside a hidden SVG `<text>` element — not an HTML
element — because Safari resolves and spaces fonts differently for SVG text
than for HTML. Fixed-advance content (code spans, monospace families, and
vendored emoji) stays on contractual metrics in every mode, so those never
shift between environments.

`setMeasurementProvider(provider)` accepts any `(text, style) => width`
function for full control — tests use deterministic fake providers this way —
and `setMeasurementProvider(undefined)` restores the metric tables.
Generate in a browser and save the SVG when a roadmap uses fonts or scripts
the tables cannot approximate; the Node path keeps using tables and remains
fully deterministic for CI.

## Interactive host layer

The SVG is always script-free. For self-learning use, the optional
`svg-roadmap/interactive` module (browser-only, ~2 kB gzipped) adds
progress tracking on top of a rendered chart from the host page, through
hooks the SVG already exposes — stable node ids, `data-` attributes, and
CSS classes. A downloaded chart remains a plain image.

```ts
import { attachRoadmapInteractivity } from "svg-roadmap/interactive";

const handle = attachRoadmapInteractivity(svgElement, {
  onSelect: (topic) => showDetailPanel(topic), // title, href, tags, note, state
});
// later: handle.reset(); handle.dispose();
```

Clicking a topic selects it: the sticky panel shows its title, tags, rich
note, term definitions, resource link, and a state selector — progress
changes happen in the panel, never by stray clicks on the chart. Grid
column headers are selectable too; having no state of their own, their
detail swaps the selector for the column's aggregate progress (`1 / 5 done
in this column` with a mini bar) that live-updates as members change. States
paint as an accent ring (in progress), a dimmed struck-through card (done),
and a faded dashed frame (skipped). Progress also
paints into the chart itself (`onChart: false` disables it): the spine inks
in like a metro line in the theme's accent, station roundels appear at
chapters once they have progress — an arc while partial, solid with a check
when complete — the ink's rounded end marks the frontier,
and fully completed chapters fade to gray while the active chapter stays at
full strength. The line measures travel, not just completion: done and
skipped topics count as traveled (skipping is deciding to pass by), and
in-progress counts half. The line is contiguous — a chapter's gap inks only
after every earlier chapter is complete, so working ahead never tears the
line into islands; stations still show each chapter's own arc. Untraveled territory renders as the plain, undecorated
chart.
State persists in `localStorage` keyed by stable node ids (pluggable via
`storage`/`storageKey`), so it survives re-renders and theme switches.
Topics become keyboard-operable (`Tab`, then `Enter`/`Space`) with state
announced through `aria-label`, text selection is suppressed on click, and
topic links are intercepted by default — the destination arrives on the
selection detail for the host's panel (`interceptLinks: false` restores
navigation). Colors follow `--roadmap-progress-accent`,
`--roadmap-progress-done`, and related custom properties. The workbench's
Interactive toggle demonstrates the full pattern, including a topic detail
panel fed by `onSelect`.

Spotlight is a separate, composable feature:
`attachRoadmapSpotlight(svgElement)` lights the structural scope under the
pointer while the rest of the chart recedes. Scope follows the hierarchy —
a grid header lights its whole column, a chapter lights itself plus every
topic and subtopic it owns, a topic lights itself plus its subtopics, and
so on down the tree. The hovered card also gets an accent outline, and
progress-dimmed cards ease back up for reading. The hierarchy rides inside
the SVG as `data-parent` attributes emitted by the renderer, so any host
can walk the same structure. Spotlight needs neither interactivity nor
progress tracking — use it alone on a plain chart, or together with
`attachRoadmapInteractivity` (stronger in-progress and selection rings
always win over the hover outline). It returns a dispose function. The
workbench exposes it as its own Spotlight toggle.

### Bring your own panel

The built-in sticky panel is one consumer of a headless data API — the
module tracks state and paints the chart; how progress is *shown* is an app
concern. Pass `summary: false` and no module-owned DOM is created; build
any UI — a sidebar, a split card next to the chart, a dialog — from the
same data the built-in panel uses:

```ts
const handle = attachRoadmapInteractivity(svgElement, {
  summary: false,
  onSelect: (topic) => renderMyCard(topic), // undefined when deselected
  onChange: () => renderMyProgressBar(handle.getSummary()),
});

handle.topics();               // every topic: id, title, href, tags,
                               // note (Markdown), definitions, state
handle.headers();              // grid column headers: kind "grid-header",
                               // columnIds plus aggregate columnProgress
handle.getTopic(id);           // one topic or header by stable id
handle.getSummary();           // { total, counts, fraction } for summary UIs
handle.select(id);             // programmatic selection (or undefined to clear)
handle.setState(id, "done");   // mutate from your own controls;
                               // chart repaints, onChange fires
```

`RoadmapTopicDetail` carries everything the built-in panel renders: the
note arrives as its authored Markdown string — render it with whatever
the host already has (comrak, marked, plain text) — and term definitions
ride along as plain strings. `onChange` fires
on every mutation regardless of source — the built-in selector, your
controls, or `reset()` — so a custom panel stays in sync without extra
wiring. `summarizeProgress(states, total)` is exported as a pure helper for
server-side or test use.

## Markdown conventions

SVG Roadmap maps familiar Markdown structure to visual structure.

- A top-level heading becomes a step on the main spine.
- A top-level list item becomes a chapter.
- Every nested list item becomes a topic with recursive `children`.
- A `*comment*` inside a list item becomes its description. Underscore emphasis
  remains part of the title.
- A trailing `[recommended]` annotation becomes a tag badge.
- A trailing `[tag one, tag two]` annotation creates multiple badges.
- A `+` marker on the first topic in a group selects a grid layout. Nested
  items inside a grid column indent under their parent with hairline
  tree-gutter connectors, to any depth; a `-` marker on the first nested item
  mirrors the lines and indent to the right.
- A blank line between first-level topics starts another group. Tree groups
  alternate around the main spine.
- A `*[Term]: Definition` line adds an abbreviation tooltip without adding a
  chart node.
- A `>` blockquote under a topic becomes its detail note: never drawn on
  the chart, it travels inside the SVG once, as the authored Markdown in
  `data-roadmap-note`. Rendering it is the host's concern — the workbench
  passes comrak's `mdToHtml` as `renderNote`; without a renderer the panel
  shows plain text. The interactive layer injects a de-marked prose
  reading as the node's `<desc>` when it makes topics focusable, so
  assistive tech hears the note exactly where it can be reached.

Comrak extensions enable `++insert++`, `==highlight==`, `~subscript~`,
`^superscript^`, strikethrough, footnotes, and emoji shortcodes. Every GitHub
(gemoji) shortcode is recognized, including aliases such as `:+1:` for
`:thumbsup:`. SVG Roadmap
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
    # gradients: true  # render the theme's gradient capabilities (fun: rainbow spine + hulls)
  title: Engineering roadmap 2026     # accessible <title>; defaults to the H1
  description: Our path to production # accessible <desc>
  layout:
    clusterColumns: 2   # topic columns in tree clusters (1 or 2); default 1
    columns: 3          # grid columns per row before wrapping; default unlimited
    spacing: compact    # compact | cozy | roomy — scales the vertical rhythm
    canvas: 1.5 # grow the canvas around the centered chart (1–3)
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

`layout` carries the document's curated layout intent. The canvas always
crops to the chart's content on both axes — a roadmap with a single small
grid renders as a small SVG, ready to embed — so neither knob promises
pixels; they shape proportions. `clusterColumns: 2` lays tree clusters out
in two columns of uniform boxes — two is the ceiling by design, so every
cluster keeps a clean edge for its subtopics to attach to — while the
widest topic still sets the box width and every gap keeps its default.
`spacing` scales the vertical rhythm gaps coherently (`compact` ×0.8,
`roomy` ×1.25), and `canvas` grows the final canvas — both
dimensions — around the centered chart: the chart itself does not change,
and the margins become open ground for the theme's background artifacts. Solver clearances stay fixed in both, so a document can
tune proportions but never lay out a broken chart; the raw gap values
remain API-only (`options.layout`), and explicit API options always win
over front matter. `title` and `description` set
the SVG's accessible name and description, defaulting to the document's
H1.

### Document-defined tags

Beyond the built-in tags, a document can declare its own taxonomy in front
matter. The document owns the names, meanings, and legend labels; the theme
owns the palette, referenced through named accent slots (`green`, `red`,
`amber`, `blue`, `violet`, `neutral`) so a taxonomy adapts to every theme and
mode. `legend: false` at the roadmap level hides the tag legend entirely, and
`noteMarkers: true` paints a small folded corner on every box that carries a
detail note, so readers can see where a click has content waiting (hosts can
override per render with `render.noteMarkers`).

### Footnotes

Footnote references (`[^label]` or inline `^[text]`) paint as small
superscript numbers, assigned in order of first reference. The referenced
definitions gather in a footnotes block beneath the chart — legend-styled,
hanging-indented, aligned with the legend's column — with full inline
formatting. `footnotes: false` keeps the block off the chart.

### Milestones

A thematic break (`---`) between chapters becomes a station on the spine — a
journey milestone. An italic paragraph right after it (the chapter-comment
syntax) becomes the station's label; a bare break stays an unlabeled station:

```markdown
* 1️⃣ Development & Delivery
  ...

---
*🏁 You can ship a real service now.*

* 2️⃣ Deployment & Operations
```

In interactive mode a station lights up once every topic authored above it is
done or skipped, and `handle.milestones()` reports each station's remaining
count for custom progress UIs. (Mind the blank line before `---`: text
directly above it would parse as a setext heading instead.)

```yaml
---
roadmap:
  tags:
    advanced:
      icon: star            # built-in icon: check, heart, star, x, question, cloud, warning
      accent: violet        # theme accent slot supplying the colors
      label: Advanced topic # legend text; defaults to the humanized tag name
    experimental:
      icon: ":rocket:"      # any emoji shortcode paints on a colored disc
      accent: amber
    internal:
      icon: x
      legend: false         # taggable, but kept out of the legend
---
```

`accent` also accepts a literal CSS color (`accent: "#ffe066"`); named slots
win when both interpretations exist, and hex accents derive a readable
foreground automatically.

Topics then use the tags exactly like built-ins: `Topic name [advanced]`.
Declared tags join the legend in the theme's style; undeclared tags keep
falling back to the unknown-tag badge. Each document tag also gets a semantic
CSS paint token (`--roadmap-badge-tag-advanced-background`) for stylesheet
overrides. Explicit `background`/`foreground` colors are accepted as an escape
hatch, with the caveat that literal colors do not adapt across themes or
modes.

Prose can reference declared tags too: `[advanced]` inside a note or
description renders as an inline chip — the tag's badge disc plus its name on
a soft accent pill — so an intro card can show the legend's marks in place.
Names that match no declared tag stay literal text.

## Emoji

Emoji handling is tiered so documents render identically on every platform
without shipping megabytes by default.

- Popular shortcodes (about 260: faces, hands, hearts, status marks, arrows,
  keycaps, and engineering objects such as `:rocket:`, `:gear:`, `:bug:`, and
  `:bulb:`) render as embedded Twemoji SVG symbols and look the same in every
  viewer.
- Every other GitHub shortcode resolves to its Unicode character and renders
  with the viewer's platform emoji font.
- Unknown names stay as literal `:text:`.
- Raw Unicode emoji typed directly into the Markdown always render as platform
  glyphs.

Register the opt-in GitHub pack to upgrade the entire shortcode set to
embedded artwork. The pack is a separate entry point (about 1 MB gzipped), and
generated SVGs only embed the symbols a document actually uses.

```ts
import { registerEmojiArtwork } from "svg-roadmap";
import { githubEmojiArtwork } from "svg-roadmap/emoji-github";

registerEmojiArtwork(githubEmojiArtwork);
```

Twemoji artwork is licensed CC-BY 4.0; see `LICENSES/TWEMOJI.txt`.
`pnpm generate:emoji` regenerates the shortcode map and both artwork packs
from the gemoji database and Twemoji assets.

## Themes and restyling

`Fun`, `Sci-fi`, `Rose`, `Print`, `Pro`, `Retro`, `Arcade`, and `ASCII` are
built-in roadmap theme presets. Each
preset supplies a complete appearance and light and dark palettes; decorative
background artifacts are an optional theme capability. `Sci-fi` uses clean
translucent surfaces, cyan and violet accents, engineering DIN display type
over Seravek prose, chamfered cards and boards, capsule notes, technical grid
and dot patterns, a straight architectural spine, orthogonal circuit-like
branches, and background motifs drawn from mission hardware — ringed planets,
radar dials, satellites, circuit chips, comets, electron orbits, HUD
reticles, and data streams — for an optimistic near-future look.
`Rose` is an antique botanical plate: warm parchment, engraved sepia and
old-rose hairlines with madder reserved as the accent, Didot-class display
serifs over a Palatino body, stadium medallion chapters with an engraved inner
keyline, a climbing sage-stem spine whose branches end in rose-hip dots, and
plate marginalia — wild roses, leaf sprigs, thorned canes, rose hips, and
fern fronds — with a wine-dark folio for dark mode. `Print` uses warm paper and ink surfaces, editorial serif display
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
[docs/theming.md](docs/theming.md) is the full styling guide for building
themes: type tiers and font-stack rules, optical scaling, shapes, connector
joins, background-artifact generators, and the verification workflow.

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
`letterSpacing` and `textTransform: "uppercase"` provide tracked display
lettering that is measured into the layout and declared as real letter
spacing in the SVG.
`legend.rowGap`, per-placement badge sizes, and independent connector widths
expose the remaining layout details. The light and dark presets use one
connector tone across branch depths by default. A custom tag definition inherits
omitted badge values from the configured unknown-tag fallback.

Notes and chapter comments use content-fitted painted frames by default, so text
with different line counts remains inside its bubble with consistent padding.

A theme's `textPainting` selects how card text reaches the SVG. The default,
`positioned`, gives every segment its own `<text>` at a measured origin, which
is what keeps painted decorations aligned with their glyphs. Setting it to
`flowing` emits one centered `<text>` per line so display faces keep natural
shaping and tracking; lines carrying highlights, inserts, code spans, defined
terms, or vendored emoji artwork still paint positioned individually. The Rose
and Sci-fi presets opt into `flowing`.

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
layout geometry, collision handling, and SVG rendering, and a layout-invariant
suite renders a corpus of documents across every theme and rejects card,
board, connector, and legend occlusions in the generated geometry.

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
for its layout behavior. Check text-heavy changes in Safari as well as
Chromium and Firefox — Safari lays out HTML and SVG text differently and is
the engine most sensitive to font-stack mistakes; the rules a theme must
follow are collected in [docs/theming.md](docs/theming.md).
