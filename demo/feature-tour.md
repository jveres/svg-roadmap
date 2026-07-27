---
roadmap:
  theme:
    preset: sci-fi
    gradients: true  # themes that define gradient capabilities paint them
  noteMarkers: true  # folded corner on boxes that carry a detail note
  # legend: false  # uncomment to hide the tag legend
  # layout:
  #   canvas: 1.5        # grow the canvas; the chart stays centered
  #   columns: 4         # wrap wide grids after this many columns
  #   clusterColumns: 2  # two-column tree clusters
  #   spacing: roomy     # compact | cozy | roomy
  background:
    enabled: true
    seed: feature-tour
    density: 0.7
    animated: 1
  tags:
    core:
      icon: check
      accent: green
      label: Core concept
    advanced:
      icon: star
      accent: violet
      label: Advanced topic
    experimental:
      icon: ":rocket:"
      accent: amber
      label: Experimental
    optional:
      icon: question
      accent: blue
    deprecated:
      icon: warning
      accent: neutral
      legend: false
---

# Feature ++_Tour_++ :sparkles:

:bulb: Everything this chart uses is plain Markdown plus a small front-matter block.[^md] **Bold**, _italic_, ==highlights==, ++inserts++, ~~strikethrough~~, `code`, and [links](https://github.com/jveres/svg-roadmap) all work inside any text.

* :one: Structure
*:beginner: Chapters come from top-level bullets. A `+` marker starts a ==grid==; nested bullets under a `*` grow ==trees== with connectors.*
  + Grid layouts
    * Grid headers [core]
    * Grid topics [core]
    * Column balance [optional]
      - Right-hand lines
      - Mirrored indent
  * Tree layouts
    * Branching topics [core]
      > Trees are the right home for real hierarchy: every branch gets its
      > own board and routed connectors, at any depth.
    * Nested boards [advanced]
      * Deep nesting [advanced]
        > Click a topic with a **note** like this one and the detail appears
        > in the progress panel — authored as a plain `>` blockquote in
        > [Markdown](https://www.markdownguide.org/), invisible on the chart.
        * No depth limit
      * Lane routing [experimental]
  * Notes
    * Chapter descriptions [core]
    * Floating comments [optional]
    * Note markers [core]
      > The folded corner on this box is the opt-in `noteMarkers` mark — it
      > shows a detail note is waiting behind the click, like this one.

* :two: Inline styling
*:beginner: Emphasis works everywhere: **strong**, _emphasis_, ==highlight==, ++insert++, `inline code`, and ~~strikethrough~~. Term definitions get dotted underlines.^[Footnotes render as small superscript markers.]*
  * Emoji :tada:
    * Shortcodes :rocket: [core]
    * GitHub set :joystick: [optional]
  * Term definitions [core]
    > Definitions get dotted underlines and tooltips; notes like this get a
    > whole panel. Use definitions for glossary terms, notes for guidance.
  * Footnote markers [optional]
  * Old habits ~~like these~~ [deprecated]

---
*:checkered_flag: A `---` break between chapters becomes a spine milestone like this one — in interactive mode it lights up once everything above is done.*

* :three: Tags & badges
*:beginner: The tags on this chart are **defined in front matter**: a name, an icon or emoji, and a theme ==accent slot== — so they restyle with every theme and mode. In prose a declared tag renders as its chip — [core], [experimental] — while undeclared ones like [mystery] stay plain text.*
  * Built-in icons [core]
  * Emoji badges [experimental]
  * Accent slots [advanced]
  * Hidden from legend [deprecated]
  * Fallback badges [mystery]

## Switch themes and modes from the toolbar :arrows_counterclockwise:

#### Deeper headings keep shrinking: h4, h5, and h6 step down from the h3 size.

*[Grid headers]: The bold first row of a grid; every topic under it joins that column.
*[Grid topics]: Topics laid out in balanced columns inside a chapter grid.
*[Branching topics]: Topics connected by routed connector lines.
*[Deep nesting]: Grid columns and trees both nest to any depth; each grid level indents one tree-line gutter.
*[Term definitions]: Defined with a `*[Term]: explanation` line and shown as a dotted underline with a tooltip.
*[Chapter descriptions]: The italic paragraph right under a chapter bullet.
*[Floating comments]: Standalone italic paragraphs between chapters.
*[Note markers]: An opt-in folded-corner mark on any box that carries a detail note.
*[Accent slots]: Named theme colors (green, red, amber, blue, violet, neutral) that custom tags reference instead of hex codes.
*[Emoji badges]: Tag badges can paint any emoji shortcode on a colored disc.
*[Fallback badges]: Tags without a definition use the theme's unknown-tag style.
[^md]: CommonMark plus the GitHub extensions — footnotes render as numbered markers with this block beneath the chart.

*[Right-hand lines]: A `-` marker on the first nested item mirrors the tree lines to the right.
*[Mirrored indent]: Right-side nesting spends its indent on the right edge, keeping cards left-flush.
