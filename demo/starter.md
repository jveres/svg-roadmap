---
roadmap:
  noteMarkers: true
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
---

* :one: Structure
*:beginner: Chapters come from top-level bullets — a `+` marker starts a ==grid==, nested bullets under a `*` grow ==trees==. **Bold**, ++inserts++, ~~strikethrough~~, H~2~O subscripts, x^2^ superscripts, and 🎯 raw emoji work in any text; declared tags render as chips — [core], [experimental].^[Footnotes paint as superscript markers, gathered in this block beneath the chart.]*
  + Grid layouts
    * Grid headers [core]
    * [Grid topics](https://github.com/jveres/svg-roadmap) [core]
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
  * Notes & terms
    * Chapter descriptions [core]
    * Floating comments [optional]
    * Term definitions [core]
    * Note markers [core]
      > The folded corner on this box is the opt-in `noteMarkers` mark — it
      > shows a detail note is waiting behind the click, like this one.

*[Term definitions]: Defined with a `*[Term]: explanation` line — a dotted underline carrying this tooltip.
