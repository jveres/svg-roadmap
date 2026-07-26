# Theme styling guide

This guide describes how svg-roadmap themes work, the rules a well-behaved
theme follows, and the reasoning behind those rules. It complements the
[Themes and restyling](../README.md#themes-and-restyling) section of the
README, which covers selecting and overriding themes from application code.

## Anatomy of a theme

A theme preset supplies complete light and dark `RoadmapTheme` values:

```ts
export const myTheme = {
  name: "my-theme",
  modes: { light: myLightTheme, dark: myDarkTheme },
} as const satisfies RoadmapThemePresetWithModes;
```

`createTheme(override, base)` builds a resolved theme by deep-merging an
override onto a base per field. Build the light mode on a neutral base (for
example `lightTheme`) and the dark mode on the resolved light theme, so dark
mode only restates colors:

```ts
const myLightTheme = createTheme({ name: "my-theme", mode: "light", /* … */ }, lightTheme);
const myDarkTheme = createTheme({ mode: "dark", /* palette only */ }, myLightTheme);
```

Because the merge is per field, **inherited values are part of your theme**.
Audit what the base contributes — especially typography `renderScale`
values and font stacks — and neutralize anything that does not suit your
design (see “Optical scaling” below for a real example).

## Paint versus structure

Two channels style a roadmap, and choosing the right one matters:

- **CSS custom properties** (`--roadmap-*`) control paint: colors, opacities,
  stroke widths, shadows. They can be overridden after generation without a
  layout pass, via `render.css` or an external stylesheet.
- **Typed theme values** control everything that changes geometry or SVG
  topology: font family/size/weight, padding, shapes, connector routing,
  board hulls, badge sizes. Changing these requires regenerating the SVG.

If a value could ever move a glyph or a box, it belongs in the typed theme.

## Typography

### Use named font faces only

Never put `system-ui`, `ui-sans-serif`, `ui-serif`, `ui-monospace`, or
`-apple-system` in a theme's `fontFamily`. Safari resolves these to system
fonts (SF, New York) whose **advance widths change with the effective
on-screen size** — Apple's optical tracking. A responsive or zoomed SVG then
drifts from every width measured at generation time, and `textLength`
visibly stretches or squeezes the glyphs. No measurement strategy can fix
this; the metrics genuinely differ per display scale.

Named faces are metric-stable at every scale. Verified stable on macOS:
Helvetica, Helvetica Neue, Arial, Avenir Next, Futura, Seravek, Gill Sans,
Didot, Iowan Old Style, Palatino, Georgia, Menlo, DIN Alternate, Trebuchet
MS, Verdana, Impact.

### Build cross-platform stacks

Lead with the intended face, follow with the closest counterpart on other
platforms, and end with a plain generic:

```ts
const displayFontFamily =
  '"DIN Alternate", Bahnschrift, "Franklin Gothic Medium", Futura, sans-serif';
const fontFamily = 'Seravek, "Trebuchet MS", "Helvetica Neue", Helvetica, sans-serif';
```

Mind weight availability: some faces ship in limited cuts (macOS DIN
Alternate is bold-only), so request weights the face actually has, and check
what `**strong**` runs look like — a face whose only bold is near-black
(Futura) makes inline bold read double-weight next to the regular cut.

### Type tiers

Themes read best with two or three coordinated tiers rather than one family
everywhere: a display tier (title, section headings, chapters, grid headers,
optionally topics), a prose tier (notes and descriptions, where multi-line
readability matters), and optionally a distinct legend treatment. The
sci-fi preset pairs DIN display type with Seravek prose; rose pairs
Didot-class display serifs with a Palatino body.

### Tracking and case

`letterSpacing` is measured into the layout and declared as native
`letter-spacing` in the SVG, so tracked uppercase headers keep exact widths.
`textTransform: "uppercase"` transforms the text before measurement. Both
are safe to combine; give tracked display faces slightly more air than the
default.

### Optical scaling

`renderScale` scales the painted font size uniformly (layout boxes are
unchanged); `renderScaleX` / `renderScaleY` scale glyph paint per axis.
Non-uniform values (for example `0.985`/`0.96`) deliberately condense text,
but they also change the glyph aspect ratio — a face rendered 4% shorter but
only 1.5% narrower looks stretched. The base theme uses mild squeezes tuned
for its own faces; **a theme with its own fonts should explicitly pin
`renderScaleX: 1, renderScaleY: 1`** unless it wants the effect (the print
preset does exactly this).

`baselineRatio` adjusts optical vertical alignment when a custom face sits
too high or low in its line box.

### Text painting

`textPainting` selects how card text reaches the SVG:

- `positioned` (default) — every segment gets its own `<text>` at a measured
  origin. Required for exact alignment of painted decorations.
- `flowing` — one centered `<text>` per line, letting the browser shape the
  run naturally. Suits display faces with tracking. Lines carrying painted
  decorations (highlights, inserts, links, code, defined terms, vendored
  emoji) automatically fall back to positioned painting.

Decorations are always painted rects, never SVG `text-decoration`: WebKit
segments decorations per glyph under letter-spacing and Firefox paints them
over the glyphs.

## Shapes and frames

Each card role selects a frame shape: `rounded`, `chamfered`, `capsule`,
`organic`, `cameo`, or `petal`. Shapes are typed theme values because they
change SVG topology.

Notes and chapter descriptions use **content-fitted frames**: the painted
frame hugs the wrapped text rather than the layout box, so bubbles keep
consistent padding at any line count. Blocks of three lines or more wrap
to a sine width profile — narrower first and last lines, widest middle —
so the ragged text block follows the bubble's own geometry. Comment padding is a two-token
contract shared by every theme — the card's `paddingX`/`paddingY` — and
shape fitting adds clearance on top of those tokens (the blob's bulge, the
capsule's curve), never substitutes its own constants. Capsule note frames
additionally center on the cap-height band for optical balance, because
the widest line meets the capsule at its fattest point.

Badges anchor to a node's top-right corner — except on capsule cards, where
the anchor moves onto the cap's 45° shoulder so the badge overlaps the
painted edge instead of floating in the recessed corner.

## Boards

Topic, nested-topic, and legend boards select `organic`, `rounded`,
`chamfered`, or `scalloped` hulls, plus a patterned or plain background
(`grid`, `dots`, `crosshatch`, …). Board paint is tokenized; hull shape and
padding are typed.

## Connectors

Each connector kind (`spine`, `chapterToTopics`, `topicToChildren`) selects
`curved`, `orthogonal`, `straight`, or `braided` routing, with width, dash,
opacity, and an optional end shape (`arrow`, `circle`, `diamond`, `dot`).

A connector may carry a typed multi-stop `gradient` alongside its plain
`color`: the stroke is painted with a user-space gradient spanning the
kind's full vertical extent, so the spine wears a color journey from the
chart's first anchor to its last. Gradients are capabilities, not
defaults — they render only when the document opts in with
`theme.gradients: true` (or the host passes `render.gradients`); without
the opt-in the theme paints exactly as if it never defined them. Gradient
and color are alternate paints in merges — a theme overriding `color`
repaints plainly and drops the inherited gradient. Boards may join in
with `strokeGradient`, outlining each hull with the ramp color at its own
elevation (subtle by default: hairline at 70%). The Fun preset ships the
reference project's prototype rainbow on its spine and hulls, and the
interactive progress ink adopts the spine gradient automatically,
revealing the traveled segment of the ramp.

- `endShapeJoin: "overlap"` (default) runs the stroke under the marker;
  `"detached"` places the marker wholly ahead of the trimmed stroke. The
  renderer anchors overlapped circles and diamonds so a dash landing at the
  path end can never poke past the shape's leading edge.
- `laneSpacing > 0` distributes nearby orthogonal routes into ordered lanes
  so dense nested trees stay traceable.

## Badges, tags, and accent slots

Themes style the built-in tags (`recommended`, `insightful`, …) directly in
`badges.tags`. Documents can extend the taxonomy from front matter, and they
bind colors through **accent slots** rather than literals:

```ts
badges: {
  // …sizes, unknown, tags…
  accents: {
    green: { background: "#76c479", foreground: "#ffffff" },
    red: { background: "#c75c5c", foreground: "#ffffff" },
    amber: { background: "#f5a100", foreground: "#ffffff" },
    blue: { background: "#748ffc", foreground: "#ffffff" },
    violet: { background: "#8a75e5", foreground: "#ffffff" },
    neutral: { background: "#777982", foreground: "#ffffff" },
  },
},
```

The base theme defines these six slots and every theme inherits them; a theme
that restates them in its own palette makes every document taxonomy feel
native. A document tag whose accent slot is missing falls back to the
unknown-tag colors, so partial coverage degrades gracefully. Documents may
also pass a literal CSS color as the accent; named slots take precedence,
and literal colors do not adapt across themes or modes.

Tag badges may also carry an emoji shortcode instead of a built-in icon; the
renderer paints the artwork on a disc filled with the accent background.
Document-defined tags emit per-tag CSS paint tokens
(`--roadmap-badge-tag-<name>-background`/`-foreground`), while theme badges
keep their icon-keyed tokens.

## Inline decoration tokens

`inline` supplies the link color, highlight fill, insert-underline color,
code background, and defined-term rule color. Their geometry is fixed by the
renderer (pixel-snapped dotted rules, proportional underline weights); the
theme only chooses paint.

## Background artifacts

Decorative background motifs are a theme capability, not a core feature. A
theme opts in by supplying `backgroundArtifacts` with its own CSS variables
and a generator:

```ts
backgroundArtifacts: {
  cssVariables: { "my-theme-artifact-primary": "#4ccbe4" },
  generate: generateMyBackgroundArtifacts,
},
```

The generator receives the canvas size, background settings, and avoid
rectangles, and returns artifacts made of generic `circle` and `path`
shapes. Rules for a well-behaved generator:

- **Deterministic**: derive all variation from `createSeededRandom` keyed on
  the document seed and tile position. `Date.now()`/`Math.random()` are
  forbidden — output must be reproducible.
- **Respect the avoid list** and outer-void checks so motifs never sit under
  content.
- **Limit rotation for figurative motifs**: objects with a clear "up"
  (planets, satellites) read as scribbles under full 360° rotation; a gentle
  tilt (±20°) keeps them recognizable.
- Reference paint through the theme's own CSS variables so dark mode can
  restate colors without touching the generator.

A theme that omits `backgroundArtifacts` renders none even when a document
requests a background.

## Verification workflow

- `pnpm verify` runs tests, typecheck, lint, and builds. The layout-invariant
  suite renders a corpus across every theme and rejects occlusions, and a
  stress suite re-runs layout under distorted metrics to prove the geometry
  does not depend on any particular font tables.
- Use the workbench (`pnpm dev`) to inspect themes at browser rendering
  size; the browser measurement oracle is active there, so what you see is
  measured with your real fonts.
- Check Safari as well as Chromium: Safari lays out HTML and SVG text
  differently and is the engine most sensitive to font-stack mistakes.
  `safaridriver` plus WebDriver works for scripted verification.
- When adding a theme, pin its structural choices in `generator.test.ts`
  (shapes, patterns, routing, key CSS variables) so refactors cannot
  silently change them.
