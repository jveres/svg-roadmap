---
roadmap:
  theme:
    preset: sci-fi
  # legend: false — uncomment to hide the tag legend entirely
  # scale: 1.25 — renders the whole SVG a quarter larger
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

:bulb: Everything this chart uses is plain Markdown plus a small front-matter block. **Bold**, _italic_, ==highlights==, ++inserts++, ~~strikethrough~~, `code`, and [links](https://github.com/jveres/roadmap-next) all work inside any text.

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
    * Nested boards [advanced]
      * Deep nesting [advanced]
        * No depth limit
      * Lane routing [experimental]
  * Notes
    * Chapter descriptions [core]
    * Floating comments [optional]

* :two: Inline styling
*:beginner: Emphasis works everywhere: **strong**, _emphasis_, ==highlight==, ++insert++, `inline code`, and ~~strikethrough~~. Term definitions get dotted underlines.*
  * Emoji :tada:
    * Shortcodes :rocket: [core]
    * GitHub set :octocat: [optional]
  * Term definitions [core]
  * Footnote markers [optional]
  * Old habits ~~like these~~ [deprecated]

* :three: Tags & badges
*:beginner: The tags on this chart are **defined in front matter**: a name, an icon or emoji, and a theme ==accent slot== — so they restyle with every theme and mode. Undeclared tags like [mystery] fall back automatically.*
  * Built-in icons [core]
  * Emoji badges [experimental]
  * Accent slots [advanced]
  * Hidden from legend [deprecated]
  * Fallback badges [mystery]

## Switch themes and modes from the toolbar :arrows_counterclockwise:

*[Grid headers]: The bold first row of a grid; every topic under it joins that column.
*[Grid topics]: Topics laid out in balanced columns inside a chapter grid.
*[Branching topics]: Topics connected by routed connector lines.
*[Deep nesting]: Grid columns and trees both nest to any depth; each grid level indents one tree-line gutter.
*[Term definitions]: Defined with a `*[Term]: explanation` line and shown as a dotted underline with a tooltip.
*[Chapter descriptions]: The italic paragraph right under a chapter bullet.
*[Floating comments]: Standalone italic paragraphs between chapters.
*[Accent slots]: Named theme colors (green, red, amber, blue, violet, neutral) that custom tags reference instead of hex codes.
*[Emoji badges]: Tag badges can paint any emoji shortcode on a colored disc.
*[Fallback badges]: Tags without a definition use the theme's unknown-tag style.
*[Right-hand lines]: A `-` marker on the first nested item mirrors the tree lines to the right.
*[Mirrored indent]: Right-side nesting spends its indent on the right edge, keeping cards left-flush.
