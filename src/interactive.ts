/**
 * Optional browser-side interactivity for a rendered roadmap SVG.
 *
 * The SVG itself stays script-free: this module runs in the host page and
 * talks to hooks the renderer already emits — stable node ids, `data-`
 * attributes (`data-parent`, `data-group`, and `data-roadmap-note` carrying
 * the authored note Markdown), and CSS classes. A downloaded chart remains
 * a plain, portable image.
 *
 * Clicking a topic selects it; progress changes happen in the detail panel
 * (or through the handle), never by stray clicks on the chart. State
 * persists per stable node id, so it survives re-renders and theme
 * switches. A separate, composable hover spotlight lights structural
 * scopes — column, chapter, topic subtree — while the rest recedes.
 */

export type RoadmapProgressState = "in-progress" | "done" | "skipped";

const progressCycle: readonly (RoadmapProgressState | undefined)[] = [
	undefined,
	"in-progress",
	"done",
	"skipped",
];

const stateLabels: Readonly<Record<RoadmapProgressState, string>> = {
	"in-progress": "in progress",
	done: "done",
	skipped: "skipped",
};

/** The state a click moves to from `state`; the cycle ends back at unset. */
export function nextProgressState(
	state: RoadmapProgressState | undefined,
): RoadmapProgressState | undefined {
	const index = progressCycle.indexOf(state);
	return progressCycle[(index + 1) % progressCycle.length];
}

/**
 * Distributes one fraction of travel across consecutive segment lengths:
 * earlier segments fill completely before later ones begin, so a multi-
 * segment gap inks continuously instead of each part filling in parallel.
 */
export function distributeAlongLengths(lengths: readonly number[], fraction: number): number[] {
	const total = lengths.reduce((sum, length) => sum + length, 0);
	let remaining = Math.max(0, Math.min(1, fraction)) * total;
	return lengths.map((length) => {
		const filled = length > 0 ? Math.min(1, remaining / length) : 0;
		remaining = Math.max(0, remaining - length);
		return filled;
	});
}

/**
 * How far a topic's state travels the line: done and skipped are traveled
 * territory (skipping is deciding to pass by, not unfinished business), and
 * in-progress counts half.
 */
export function progressTravelWeight(state: RoadmapProgressState | undefined): number {
	if (state === "done" || state === "skipped") return 1;
	if (state === "in-progress") return 0.5;
	return 0;
}

/**
 * The journey line is contiguous: a chapter's gap inks only after every
 * earlier chapter is complete, so working ahead cannot tear the line into
 * islands or throw the frontier marker downstream. Stations still report
 * each chapter's own fraction locally.
 */
export function contiguousTravel(fractions: readonly number[]): number[] {
	let reached = true;
	return fractions.map((fraction) => {
		const effective = reached ? fraction : 0;
		if (fraction < 0.999) reached = false;
		return effective;
	});
}

// GitHub Octicon "link-external" (https://primer.style/octicons, MIT
// license): fill-based, so it stays crisp and square at small sizes where
// scaled strokes read distorted.
const externalLinkIcon =
	'<svg width="12" height="12" viewBox="0 0 16 16" preserveAspectRatio="xMidYMid meet" fill="currentColor" stroke="currentColor" stroke-width="0.7" stroke-linejoin="round" aria-hidden="true"><path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"/></svg>';

/**
 * Best-effort plain-prose reading of note Markdown for accessible
 * descriptions: emphasis and code markers drop, links keep their text.
 * (Faithful rendering is the host's job; this only serves screen readers.)
 */
export function stripNoteMarkdown(markdown: string): string {
	return markdown
		.replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
		.replace(/[*_`~]/gu, "")
		.replace(/\s+/gu, " ")
		.trim();
}

/** Strips the render-instance prefix, leaving the stable per-document id. */
export function stableNodeId(elementId: string, instancePrefix: string): string {
	return instancePrefix && elementId.startsWith(`${instancePrefix}-`)
		? elementId.slice(instancePrefix.length + 1)
		: elementId;
}

export interface RoadmapTopicDetail {
	/** Stable node id, independent of the render instance prefix. */
	readonly id: string;
	/**
	 * `"topic"` for stateful topics; `"grid-header"` for a grid column's
	 * header, which has no state of its own but reports its column's
	 * aggregate progress.
	 */
	readonly kind: "topic" | "grid-header";
	readonly title: string;
	readonly href?: string;
	readonly tags: readonly string[];
	/**
	 * Authored detail note as raw Markdown, exactly as written under the
	 * topic's blockquote. Rendering is the host's concern — pass `renderNote`
	 * to make the built-in panel show rich text; custom panels receive this
	 * string and do whatever they like with it.
	 */
	readonly note?: string;
	/** Term definitions carried by the node's `<title>` tooltips. */
	readonly definitions: readonly string[];
	readonly state?: RoadmapProgressState;
	/** Grid headers only: stable ids of the topics in the header's column. */
	readonly columnIds?: readonly string[];
	/** Grid headers only: aggregate progress of the column's topics. */
	readonly columnProgress?: RoadmapProgressSummary;
}

/** Aggregate progress counts, for hosts drawing their own summary UI. */
export interface RoadmapProgressSummary {
	readonly total: number;
	readonly counts: Readonly<Record<RoadmapProgressState, number>>;
	/** Completed share of all topics, 0..1. */
	readonly fraction: number;
}

/** Pure aggregation of a state map into summary counts. */
export function summarizeProgress(
	states: Readonly<Record<string, RoadmapProgressState>>,
	total: number,
): RoadmapProgressSummary {
	const counts: Record<RoadmapProgressState, number> = { "in-progress": 0, done: 0, skipped: 0 };
	for (const state of Object.values(states)) counts[state] += 1;
	return { total, counts, fraction: total > 0 ? counts.done / total : 0 };
}

export type RoadmapSummaryPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export interface RoadmapProgressSummaryOptions {
	/** Corner the sticky panel anchors to. Defaults to `"top-right"`. */
	readonly position?: RoadmapSummaryPosition;
}

export interface AttachRoadmapInteractivityOptions {
	/**
	 * Sticky progress summary (count, bar, and state legend) overlaid on the
	 * chart's scroll container. On by default; pass `false` to disable.
	 */
	readonly summary?: false | RoadmapProgressSummaryOptions;
	/**
	 * Paint progress into the chart itself: the spine inks in like a metro
	 * line, station roundels appear at chapters with progress, a you-are-here
	 * ink's rounded end marks the frontier, and fully completed chapters
	 * fade to gray.
	 * Untraveled territory stays a plain, undecorated chart. On by default.
	 */
	readonly onChart?: boolean;
	/**
	 * Persistence key. Defaults to `svg-roadmap-progress:` plus the chart
	 * title, so the same document keeps its progress across renders.
	 */
	readonly storageKey?: string;
	/** Storage backend; defaults to `localStorage`. `null` disables persistence. */
	readonly storage?: Storage | null;
	/** Enable click-to-cycle progress. Defaults to `true`. */
	readonly progress?: boolean;
	/**
	 * Intercept topic links so a click toggles progress instead of
	 * navigating; the destination stays available on the selection detail.
	 * Defaults to `true`; set `false` to keep links navigating.
	 */
	readonly interceptLinks?: boolean;
	/**
	 * Fires after every progress change, whatever the source — the built-in
	 * panel's selector or a host UI calling `setState`.
	 */
	readonly onChange?: (detail: RoadmapTopicDetail) => void;
	/** Fires after progress is reset, from the panel button or `reset()`. */
	readonly onReset?: () => void;
	/**
	 * Renders a note's Markdown for the built-in detail panel. Return an
	 * element, fragment, or HTML string (the host owns its safety — e.g.
	 * comrak's mdToHtml with default escaping). Without it, the panel shows
	 * the Markdown as plain text.
	 */
	readonly renderNote?: (markdown: string) => Node | string;
	/**
	 * Fires when a topic is selected — by click, keyboard, or `select()` —
	 * and with `undefined` when the selection is cleared. Everything a detail
	 * UI needs (title, tags, rich note, definitions, link, state) rides on
	 * the detail object, so a host can render any panel it likes from here.
	 */
	readonly onSelect?: (detail: RoadmapTopicDetail | undefined) => void;
}

export interface RoadmapInteractivityHandle {
	/** The summary panel element, for hosts embedding extra content (a topic
	 * detail section, for example). `undefined` when the summary is disabled. */
	readonly summaryElement: HTMLElement | undefined;
	readonly states: Readonly<Record<string, RoadmapProgressState>>;
	/** Every topic on the chart, in document order, with current state. */
	topics(): readonly RoadmapTopicDetail[];
	/** Every grid column header, with its column's aggregate progress. */
	headers(): readonly RoadmapTopicDetail[];
	/** One topic or grid header by stable id, or `undefined` if unknown. */
	getTopic(id: string): RoadmapTopicDetail | undefined;
	/** Aggregate counts for custom summary UIs. */
	getSummary(): RoadmapProgressSummary;
	getState(id: string): RoadmapProgressState | undefined;
	setState(id: string, state: RoadmapProgressState | undefined): void;
	/** Currently selected topic id, if any. */
	readonly selectedId: string | undefined;
	/**
	 * Selects a topic programmatically (highlight ring, built-in detail when
	 * the summary panel is on, and the `onSelect` callback), or clears the
	 * selection with `undefined`.
	 */
	select(id: string | undefined): void;
	reset(): void;
	dispose(): void;
}

const styleElementId = "svg-roadmap-interactive-style";

// Injected once per document. Colors come through overridable custom
// properties; the frame stroke wins over presentation attributes without
// !important because CSS outranks them.
const interactiveCss = `
.roadmap--interactive [data-roadmap-element="topic"],
.roadmap--interactive [data-roadmap-element="nested-topic"],
.roadmap--interactive [data-roadmap-element="topic-header"]{cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.roadmap--interactive [data-roadmap-element="topic"]:focus-visible,
.roadmap--interactive [data-roadmap-element="nested-topic"]:focus-visible,
.roadmap--interactive [data-roadmap-element="topic-header"]:focus-visible{outline:none}
.roadmap--spotlight .roadmap__node{transition:opacity .18s}
.roadmap--spotlight [data-roadmap-element="topic"] .roadmap__frame,
.roadmap--spotlight [data-roadmap-element="topic-header"] .roadmap__frame,
.roadmap--spotlight [data-roadmap-element="nested-topic"] .roadmap__frame{transition:stroke .15s,stroke-width .15s}
.roadmap--spotlight [data-roadmap-element="topic"]:hover:not(.roadmap__node--in-progress):not(.roadmap__node--selected) .roadmap__frame,
.roadmap--spotlight [data-roadmap-element="topic-header"]:hover:not(.roadmap__node--selected) .roadmap__frame,
.roadmap--spotlight [data-roadmap-element="nested-topic"]:hover:not(.roadmap__node--in-progress):not(.roadmap__node--selected) .roadmap__frame{stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-width:1.7}
.roadmap--spotlight .roadmap__node--done:hover{opacity:.8}
.roadmap--spotlight .roadmap__node--skipped:hover{opacity:.55}
.roadmap--spotlight-lit .roadmap__node:not(.roadmap__node--lit){opacity:.4}
.roadmap--spotlight .roadmap__connector,.roadmap--spotlight .roadmap__group{transition:opacity .18s}
.roadmap--spotlight-lit .roadmap__connector--dim{opacity:.2}
.roadmap--spotlight-lit .roadmap__group--dim{opacity:.4}
@media (prefers-reduced-motion: reduce){
.roadmap--spotlight .roadmap__node,
.roadmap--spotlight .roadmap__connector,
.roadmap--spotlight .roadmap__group,
.roadmap--spotlight .roadmap__node .roadmap__frame{transition:none}}
.roadmap--interactive [data-roadmap-element="topic"]:focus-visible .roadmap__frame,
.roadmap--interactive [data-roadmap-element="nested-topic"]:focus-visible .roadmap__frame,
.roadmap--interactive [data-roadmap-element="topic-header"]:focus-visible .roadmap__frame,
.roadmap--interactive .roadmap__node--in-progress .roadmap__frame{stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-width:2.4}
.roadmap--interactive .roadmap__node--done{opacity:var(--roadmap-progress-done-opacity,.55)}
.roadmap--interactive .roadmap__node--skipped{opacity:var(--roadmap-progress-skipped-opacity,.32)}
.roadmap--interactive .roadmap__node--skipped .roadmap__frame{stroke-dasharray:4 3}
.roadmap__progress-strike{pointer-events:none;stroke:var(--roadmap-progress-strike,#5c6975);stroke-width:1.6;stroke-linecap:round;opacity:.85}
.roadmap__progress-ink{fill:none;stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-linecap:round;pointer-events:none}
.roadmap__progress-ink--glow{opacity:.16}
.roadmap__progress-ink--core{opacity:.9}
.roadmap__progress-station{pointer-events:none}
.roadmap__progress-station .station-casing{fill:var(--roadmap-canvas-background,#ffffff);stroke:rgba(90,110,125,.45);stroke-width:1.4}
.roadmap__progress-station .station-arc{fill:none;stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-width:2.6;stroke-linecap:round;transform:rotate(-90deg);transform-box:fill-box;transform-origin:center}
.roadmap__progress-station .station-full{fill:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7))}
.roadmap__progress-station .station-tick{stroke:var(--roadmap-canvas-background,#ffffff);stroke-width:1.9;fill:none;stroke-linecap:round;stroke-linejoin:round}
.roadmap--interactive .roadmap__progress-passed{opacity:var(--roadmap-progress-passed-opacity,.6);transition:opacity .5s}
@media (prefers-reduced-motion: reduce){.roadmap--interactive .roadmap__progress-passed{transition:none}}
.roadmap-progress-summary-anchor{position:sticky;z-index:5;height:0;display:flex;padding:0 12px;pointer-events:none}
.roadmap-progress-summary-anchor[data-at^="top"]{top:10px}
.roadmap-progress-summary-anchor[data-at^="bottom"]{bottom:10px}
.roadmap-progress-summary-anchor[data-at$="right"]{justify-content:flex-end}
.roadmap-progress-summary-anchor[data-at$="left"]{justify-content:flex-start}
.roadmap-progress-summary-anchor[data-at^="bottom"] .roadmap-progress-summary{transform:translateY(-100%)}
.roadmap-progress-summary{pointer-events:auto;align-self:flex-start;width:190px;padding:10px 12px;border-radius:9px;
	--_summary-border:var(--roadmap-summary-border,rgba(90,110,125,.25));
	--_summary-background:var(--roadmap-summary-background,rgba(255,255,255,.72));
	--_summary-color:var(--roadmap-summary-color,#2b3742);
	--_summary-track:var(--roadmap-summary-track,rgba(90,110,125,.16));
	--_accent:var(--roadmap-progress-accent,#1289a7);
	--_done:var(--roadmap-progress-done,#2aa876);
	border:1px solid var(--_summary-border);
	background:var(--_summary-background);
	-webkit-backdrop-filter:blur(9px) saturate(1.15);
	backdrop-filter:blur(9px) saturate(1.15);
	color:var(--_summary-color);
	box-shadow:0 6px 22px rgba(20,35,45,.16);font-size:12px;line-height:1.4}
@media (prefers-color-scheme: dark){
.roadmap-progress-summary{
	--_summary-border:var(--roadmap-summary-border,rgba(160,180,195,.22));
	--_summary-background:var(--roadmap-summary-background,rgba(26,34,43,.72));
	--_summary-color:var(--roadmap-summary-color,#dbe5ec);
	--_summary-track:var(--roadmap-summary-track,rgba(160,180,195,.18));
	box-shadow:0 6px 22px rgba(0,0,0,.45)}
}
.roadmap-progress-summary__top{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.roadmap-progress-summary__count{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.roadmap-progress-summary .roadmap-progress-summary__reset{margin-left:auto;border:0;border-radius:5px;
	background:transparent;cursor:pointer;color:inherit;opacity:.55;font:inherit;padding:0 4px}
.roadmap-progress-summary .roadmap-progress-summary__reset:hover{opacity:1;background:transparent;color:inherit}
.roadmap-progress-summary__bar{display:block;height:7px;border-radius:99px;margin-bottom:8px;
	background:var(--_summary-track);overflow:hidden}
.roadmap-progress-summary__bar i{display:block;height:100%;width:0;
	background:var(--_accent);transition:width .25s}
@media (prefers-reduced-motion: reduce){.roadmap-progress-summary__bar i{transition:none}}
.roadmap-progress-summary__row{display:flex;align-items:center;gap:7px}
.roadmap-progress-summary__row+.roadmap-progress-summary__row{margin-top:4px}
.roadmap-progress-summary__row b{margin-left:auto;font-variant-numeric:tabular-nums;font-weight:600}
.roadmap-progress-summary__swatch{width:12px;height:12px;border-radius:4px;flex:none;position:relative;
	border:1.6px solid var(--_summary-border)}
.roadmap-progress-summary__swatch--in-progress{border-color:var(--_accent);
	box-shadow:0 0 0 1.5px color-mix(in srgb,var(--_accent) 30%,transparent)}
.roadmap-progress-summary__swatch--done{opacity:.65}
.roadmap-progress-summary__swatch--done::after{content:"";position:absolute;left:1px;right:1px;top:50%;
	height:1.6px;transform:translateY(-50%);background:var(--roadmap-progress-strike,#5c6975)}
.roadmap-progress-summary__swatch--skipped{border-style:dashed;opacity:.5}
.roadmap--interactive .roadmap__node--selected .roadmap__frame{stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-width:2.2;stroke-dasharray:5 3}
.roadmap-topic-detail{margin-top:12px;padding-top:12px;border-top:1px solid var(--_summary-border);font-size:12.5px}
.roadmap-topic-detail h3{margin:0 0 8px;font-size:14px;font-weight:700;letter-spacing:.01em;line-height:1.3}
.roadmap-topic-detail__state{display:block;width:100%;margin:0 0 10px;font:inherit;font-size:12px;color:inherit;
	padding:5px 8px;border-radius:7px;border:1px solid var(--_summary-border);background:transparent;cursor:pointer}
.roadmap-topic-detail__state:hover{border-color:var(--_accent)}
.roadmap-topic-detail__state:focus-visible{outline:2px solid var(--_accent);outline-offset:1px}
.roadmap-topic-detail__column{margin:0 0 10px}
.roadmap-topic-detail__column b{font-variant-numeric:tabular-nums}
.roadmap-topic-detail__column .roadmap-topic-detail__column-bar{display:block;height:5px;margin-top:6px;
	border-radius:99px;background:var(--_summary-track);overflow:hidden}
.roadmap-topic-detail__column .roadmap-topic-detail__column-bar i{display:block;height:100%;
	border-radius:99px;background:var(--_done);transition:width .25s}
.roadmap-topic-detail__tags{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 10px}
.roadmap-topic-detail__tag{display:inline-flex;align-items:center;max-width:100%;padding:1.5px 8px;
	border-radius:99px;border:1px solid var(--_summary-border);font-size:10px;font-weight:600;
	letter-spacing:.06em;text-transform:uppercase;opacity:.85;line-height:1.35;text-align:left}
.roadmap-topic-detail__note{margin:0 0 10px;font-size:12.5px;line-height:1.55}
.roadmap-topic-detail__note p{margin:0 0 6px}
.roadmap-topic-detail__note p:last-child{margin-bottom:0}
.roadmap-topic-detail__note code{font-family:ui-monospace,Menlo,monospace;font-size:.88em;
	padding:0 4px;border-radius:4px;border:1px solid var(--_summary-border)}
.roadmap-topic-detail__note a{color:var(--_accent);font-weight:600;text-decoration:none}
.roadmap-topic-detail__note a:hover{text-decoration:underline}
.roadmap-topic-detail__definition{margin:0 0 10px;padding-left:9px;font-size:11.5px;line-height:1.5;
	opacity:.72;border-left:2px solid var(--_summary-border)}
.roadmap-topic-detail__link{display:inline-flex;align-items:center;gap:5px;margin-top:2px;
	color:var(--_accent);font-weight:600;font-size:12.5px;text-decoration:none}
.roadmap-topic-detail__link:hover{text-decoration:underline}
.roadmap-topic-detail__link:focus-visible{outline:2px solid var(--_accent);outline-offset:2px;border-radius:3px}
.roadmap-topic-detail__link-icon{display:inline-flex;flex:none}
.roadmap-topic-detail__link-icon svg{width:12px;height:12px;display:block}
`;

function ensureStyles(hostDocument: Document): void {
	const existing = hostDocument.getElementById(styleElementId);
	if (existing) {
		// A stale sheet from an earlier module version must not win: refresh
		// its content instead of trusting whatever injected it first.
		if (existing.textContent !== interactiveCss) existing.textContent = interactiveCss;
		return;
	}
	const style = hostDocument.createElement("style");
	style.id = styleElementId;
	style.textContent = interactiveCss;
	hostDocument.head.appendChild(style);
}

function topicTitle(group: SVGGElement): string {
	let title = "";
	for (const text of group.querySelectorAll("text")) {
		title += `${text.textContent ?? ""} `;
	}
	// The superscript term-definition indicator is part of the text nodes but
	// not of the human-readable title.
	return title
		.replace(/\s*\?\s*$/u, "")
		.replace(/\s+/gu, " ")
		.trim();
}

const svgNamespace = "http://www.w3.org/2000/svg";

interface ChartProgress {
	repaint(states: Readonly<Record<string, RoadmapProgressState>>): void;
	dispose(): void;
}

/**
 * Paints progress into the chart: accent ink inside the spine casing,
 * station roundels at chapters with progress, the ink's rounded end marking
 * the frontier, and completed chapters fading to gray. Progress decorates
 * only where
 * progress exists — untraveled territory renders as the plain chart.
 */
function createChartProgress(
	svg: SVGSVGElement,
	prefix: string,
	groups: ReadonlyMap<string, SVGGElement>,
	hostDocument: Document,
): ChartProgress | undefined {
	const chapters = [...svg.querySelectorAll<SVGGElement>('g[data-roadmap-element="chapter"]')]
		.map((g) => {
			const box = g.getBBox();
			return { centerY: box.y + box.height / 2, topY: box.y, bottomY: box.y + box.height };
		})
		.sort((a, b) => a.centerY - b.centerY);
	if (chapters.length === 0) return undefined;
	// Band rule shared with everything below: an element belongs to the last
	// chapter whose center is at or above its own center. The half-pixel
	// tolerance keeps a chapter capsule (centered exactly on its junction) in
	// its own band instead of the previous chapter's.
	const bandOf = (centerY: number): number => {
		let index = 0;
		for (const [i, chapter] of chapters.entries()) {
			if (chapter.centerY <= centerY + 0.5) index = i;
		}
		return index;
	};

	const topicChapter = new Map<string, number>();
	const totals = chapters.map(() => 0);
	for (const [id, group] of groups) {
		const box = group.getBBox();
		const band = bandOf(box.y + box.height / 2);
		topicChapter.set(id, band);
		totals[band] = (totals[band] ?? 0) + 1;
	}

	const cleanups: (() => void)[] = [];

	// Fully completed chapters fade: every chart element in the band except
	// the spine (which carries the ink), the title, and the legend. WebKit
	// ignores CSS filter functions on SVG elements, so the desaturation is a
	// real SVG filter in the chart's defs.
	const filterId = `${prefix || "roadmap"}-progress-memory`;
	const defs = hostDocument.createElementNS(svgNamespace, "defs");
	const filter = hostDocument.createElementNS(svgNamespace, "filter");
	filter.setAttribute("id", filterId);
	const matrix = hostDocument.createElementNS(svgNamespace, "feColorMatrix");
	matrix.setAttribute("type", "saturate");
	matrix.setAttribute("values", "0.06");
	filter.appendChild(matrix);
	defs.appendChild(filter);
	svg.appendChild(defs);
	cleanups.push(() => defs.remove());

	const bandElements: SVGGraphicsElement[][] = chapters.map(() => []);
	for (const element of svg.querySelectorAll<SVGGraphicsElement>(
		"g.roadmap__node:not(.roadmap__node--heading), path.roadmap__group, path.roadmap__connector",
	)) {
		if (/roadmap__connector--spine|roadmap__progress/u.test(element.getAttribute("class") ?? "")) {
			continue;
		}
		let box: DOMRect;
		try {
			box = element.getBBox();
		} catch {
			continue;
		}
		bandElements[bandOf(box.y + box.height / 2)]?.push(element);
	}
	cleanups.push(() => {
		for (const band of bandElements) {
			for (const element of band) {
				element.classList.remove("roadmap__progress-passed");
				element.style.removeProperty("filter");
			}
		}
	});

	// The ink: glow + core clones of each spine segment, inserted right after
	// their original so they stay in the connector layer, under the cards.
	// pathLength normalizes dashes; midpoints classify gaps (junction
	// endpoints sit within a pixel of chapter centers, where boundary
	// comparisons misfile segments).
	interface InkSegment {
		readonly glow: SVGPathElement;
		readonly core: SVGPathElement;
		readonly gap: number;
		readonly length: number;
	}
	const spinePaths = [...svg.querySelectorAll<SVGPathElement>("path.roadmap__connector--spine")];
	const spineWidth = spinePaths[0]
		? Number.parseFloat(
				svg.ownerDocument.defaultView?.getComputedStyle(spinePaths[0]).strokeWidth ?? "4",
			) || 4
		: 4;
	const inks: InkSegment[] = spinePaths.map((path) => {
		const midpoint = path.getPointAtLength(path.getTotalLength() / 2);
		let gap = 0;
		for (const [i, chapter] of chapters.entries()) {
			if (chapter.centerY < midpoint.y) gap = i + 1;
		}
		const clone = (className: string, width: number): SVGPathElement => {
			const ink = hostDocument.createElementNS(svgNamespace, "path") as SVGPathElement;
			ink.setAttribute("class", `roadmap__progress-ink ${className}`);
			ink.setAttribute("d", path.getAttribute("d") ?? "");
			ink.setAttribute("stroke-width", String(width));
			ink.setAttribute("pathLength", "100");
			ink.style.display = "none";
			path.parentNode?.insertBefore(ink, path.nextSibling);
			cleanups.push(() => ink.remove());
			return ink;
		};
		return {
			glow: clone("roadmap__progress-ink--glow", spineWidth + 5),
			core: clone("roadmap__progress-ink--core", Math.max(2.4, spineWidth * 0.5)),
			gap,
			length: path.getTotalLength(),
		};
	});
	// Stations mark the line, so they live in the line's layer:
	// under cards and visible through translucent boards, exactly like the
	// spine — never floating above content.
	let overlayTail: Element | null = inks.at(-1)?.core ?? null;
	const addLineOverlay = (element: SVGElement): void => {
		if (overlayTail?.parentNode) {
			overlayTail.parentNode.insertBefore(element, overlayTail.nextSibling);
			overlayTail = element;
		} else {
			svg.appendChild(element);
		}
	};

	const inksByGap = new Map<number, InkSegment[]>();
	for (const ink of inks) {
		const list = inksByGap.get(ink.gap) ?? [];
		list.push(ink);
		inksByGap.set(ink.gap, list);
	}
	for (const list of inksByGap.values()) {
		list.sort((a, b) => a.core.getPointAtLength(0).y - b.core.getPointAtLength(0).y);
	}

	// Stations sit on the inbound line above the chapter capsule — a roundel
	// at the capsule center would cover the title glyphs, and one below would
	// collide with the ink's rounded end resting on the outbound junction.
	const pointAtY = (path: SVGPathElement, targetY: number): DOMPoint => {
		const total = path.getTotalLength();
		let low = 0;
		let high = total;
		for (let step = 0; step < 24; step += 1) {
			const middle = (low + high) / 2;
			if (path.getPointAtLength(middle).y < targetY) low = middle;
			else high = middle;
		}
		return path.getPointAtLength(Math.min(total, high));
	};
	const stations = chapters.map((chapter, index) => {
		const inbound = inksByGap.get(index)?.at(-1);
		let point: { x: number; y: number } = { x: Number.NaN, y: chapter.centerY };
		if (inbound) {
			// Center the roundel in the gap between the capsule top and
			// whatever sits above it on the line.
			const endX = inbound.core.getPointAtLength(inbound.length).x;
			let previousBottom = chapter.topY - 26;
			for (const node of svg.querySelectorAll<SVGGElement>("g.roadmap__node")) {
				const box = node.getBBox();
				if (box.y + box.height > chapter.topY + 0.5) continue;
				if (endX < box.x || endX > box.x + box.width) continue;
				previousBottom = Math.max(previousBottom, box.y + box.height);
			}
			point = pointAtY(inbound.core, (previousBottom + chapter.topY) / 2);
		}
		const station = hostDocument.createElementNS(svgNamespace, "g") as SVGGElement;
		station.setAttribute("class", "roadmap__progress-station");
		station.setAttribute("aria-hidden", "true");
		station.setAttribute("transform", `translate(${point.x} ${point.y})`);
		station.style.display = "none";
		const make = (name: string, attributes: Record<string, string>): SVGElement => {
			const el = hostDocument.createElementNS(svgNamespace, name);
			for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
			station.appendChild(el);
			return el;
		};
		make("circle", { class: "station-casing", r: "7" });
		const full = make("circle", { class: "station-full", r: "7" });
		const arc = make("circle", {
			class: "station-arc",
			r: "7",
			pathLength: "100",
			"stroke-dasharray": "0 100",
		});
		const tick = make("path", { class: "station-tick", d: "M -3 0.2 L -0.8 2.4 L 3.2 -2.2" });
		addLineOverlay(station);
		cleanups.push(() => station.remove());
		return { station, full, arc, tick, placeable: !Number.isNaN(point.x) };
	});

	const repaint = (states: Readonly<Record<string, RoadmapProgressState>>): void => {
		const traveled = chapters.map(() => 0);
		for (const [id, state] of Object.entries(states)) {
			const weight = progressTravelWeight(state);
			if (weight === 0) continue;
			const band = topicChapter.get(id);
			if (band !== undefined) traveled[band] = (traveled[band] ?? 0) + weight;
		}
		const fractions = chapters.map((_, i) =>
			(totals[i] ?? 0) > 0 ? (traveled[i] ?? 0) / (totals[i] as number) : 0,
		);
		const anyProgress = fractions.some((f) => f > 0);
		const travel = contiguousTravel(fractions);

		for (const [gap, list] of inksByGap) {
			const fraction = gap === 0 ? (anyProgress ? 1 : 0) : (travel[gap - 1] ?? 0);
			const fills = distributeAlongLengths(
				list.map((segment) => segment.length),
				fraction,
			);
			list.forEach((segment, index) => {
				const fill = fills[index] ?? 0;
				// Round caps paint a zero-length dash as a dot, so empty
				// segments hide outright.
				const visible = fill > 0.001;
				segment.glow.style.display = visible ? "" : "none";
				segment.core.style.display = visible ? "" : "none";
				segment.glow.setAttribute("stroke-dasharray", `${fill * 100} 100`);
				segment.core.setAttribute("stroke-dasharray", `${fill * 100} 100`);
			});
		}

		stations.forEach((station, index) => {
			const fraction = fractions[index] ?? 0;
			station.station.style.display = station.placeable && fraction > 0 ? "" : "none";
			const complete = fraction >= 0.999;
			station.full.style.display = complete ? "" : "none";
			station.tick.style.display = complete ? "" : "none";
			station.arc.style.display = complete ? "none" : "";
			station.arc.setAttribute("stroke-dasharray", `${fraction * 100} 100`);
		});

		bandElements.forEach((elements, index) => {
			const passed = (fractions[index] ?? 0) >= 0.999;
			for (const element of elements) {
				element.classList.toggle("roadmap__progress-passed", passed);
				if (passed) element.style.setProperty("filter", `url(#${filterId})`);
				else element.style.removeProperty("filter");
			}
		});
	};

	return {
		repaint,
		dispose: () => {
			for (const cleanup of cleanups) cleanup();
		},
	};
}

const spotlightSources =
	'g[data-roadmap-element="chapter"],g[data-roadmap-element="chapter-description"],g[data-roadmap-element="topic"],g[data-roadmap-element="topic-header"],g[data-roadmap-element="nested-topic"]';

/**
 * Hover spotlight, independent of interactivity: pointing at a node lights
 * its whole structural scope while the rest of the chart recedes. A grid
 * header lights its column, a chapter lights itself plus every topic and
 * subtopic it owns, a topic lights itself plus its subtopics — recursively,
 * following the `data-parent` structure the renderer embeds. Composes with
 * {@link attachRoadmapInteractivity} but requires neither it nor progress
 * tracking. Returns a dispose function.
 */
export function attachRoadmapSpotlight(svg: SVGSVGElement): () => void {
	ensureStyles(svg.ownerDocument);
	svg.classList.add("roadmap--spotlight");
	const prefix = svg.getAttribute("data-roadmap-instance") ?? "";
	const nodes = [...svg.querySelectorAll<SVGGElement>("g.roadmap__node")];
	const byId = new Map(nodes.map((node) => [stableNodeId(node.id, prefix), node]));
	const children = new Map<string, string[]>();
	const parents = new Map<string, string>();
	const groupOf = new Map<string, string>();
	for (const node of nodes) {
		const id = stableNodeId(node.id, prefix);
		const group = node.getAttribute("data-group");
		if (group) groupOf.set(id, group);
		const parent = node.getAttribute("data-parent");
		if (!parent) continue;
		parents.set(id, parent);
		const siblings = children.get(parent) ?? [];
		siblings.push(id);
		children.set(parent, siblings);
	}

	// Path links dim with their targets: a child-cluster link follows its
	// owner topic, a grid gutter line follows its child (or the child's
	// parent, keeping chained gutter segments continuous), and a chapter's
	// group link follows whether the group holds any lit node.
	interface PathLink {
		readonly element: SVGElement;
		isActive(lit: ReadonlySet<string>, groups: ReadonlySet<string>): boolean;
	}
	const pathLinks: PathLink[] = [];
	for (const connector of svg.querySelectorAll<SVGElement>(".roadmap__connector")) {
		const id = stableNodeId(connector.id, prefix);
		const kind = connector.getAttribute("data-roadmap-element");
		if (kind === "topicToChildren-connector" && id.endsWith("-children-link")) {
			const owner = id.slice(0, -"-children-link".length);
			pathLinks.push({ element: connector, isActive: (lit) => lit.has(owner) });
		} else if (kind === "chapterToTopics-connector") {
			const group = connector.getAttribute("data-group");
			if (group) {
				pathLinks.push({ element: connector, isActive: (_, groups) => groups.has(group) });
			}
		} else if (kind === "tree-line" && id.endsWith("-grid-link")) {
			// The horizontal stub enters exactly one card; it follows that
			// child alone, so dimmed siblings keep no lit T-junctions.
			const child = id.slice(0, -"-grid-link".length);
			pathLinks.push({ element: connector, isActive: (lit) => lit.has(child) });
		} else if (kind === "tree-line" && id.endsWith("-grid-rail")) {
			// The vertical rail spans from the previous sibling's junction down
			// to this child's. The run from the parent to a lit child passes
			// every earlier sibling's rail, so a rail lights when this child or
			// any later sibling under the same parent is lit. Ancestors are
			// always in the lit set, which keeps deep paths continuous.
			const child = id.slice(0, -"-grid-rail".length);
			const parent = parents.get(child);
			const siblings = parent === undefined ? [child] : (children.get(parent) ?? [child]);
			const index = siblings.indexOf(child);
			const tail = siblings.slice(index === -1 ? 0 : index);
			pathLinks.push({
				element: connector,
				isActive: (lit) => tail.some((sibling) => lit.has(sibling)),
			});
		}
	}
	const syncPathLinks = (lit: ReadonlySet<string>, groups: ReadonlySet<string>): void => {
		for (const link of pathLinks) {
			link.element.classList.toggle("roadmap__connector--dim", !link.isActive(lit, groups));
		}
	};

	let litRoot: string | undefined;
	let lit: SVGGElement[] = [];
	let litIds: ReadonlySet<string> = new Set();
	let litGroups: ReadonlySet<string> = new Set();
	let pendingClear: ReturnType<typeof setTimeout> | undefined;
	const cancelPendingClear = (): void => {
		if (pendingClear !== undefined) clearTimeout(pendingClear);
		pendingClear = undefined;
	};
	const clear = (): void => {
		cancelPendingClear();
		for (const element of lit) element.classList.remove("roadmap__node--lit");
		for (const link of pathLinks) link.element.classList.remove("roadmap__connector--dim");
		for (const board of boardScope.keys()) board.classList.remove("roadmap__group--dim");
		lit = [];
		litIds = new Set();
		litGroups = new Set();
		litRoot = undefined;
		svg.classList.remove("roadmap--spotlight-lit");
	};
	const light = (rootId: string): void => {
		if (litRoot === rootId) return;
		clear();
		litRoot = rootId;
		const ids = new Set<string>();
		const stack = [rootId];
		while (stack.length > 0) {
			const id = stack.pop();
			if (!id || ids.has(id)) continue;
			ids.add(id);
			stack.push(...(children.get(id) ?? []));
		}
		// The path up stays lit for orientation — a topic keeps its column
		// header and chapter visible, and a lit chapter brings its comment.
		let ancestor = parents.get(rootId);
		while (ancestor) {
			ids.add(ancestor);
			for (const childId of children.get(ancestor) ?? []) {
				const role = byId.get(childId)?.getAttribute("data-roadmap-element");
				if (role === "chapter-description") ids.add(childId);
			}
			ancestor = parents.get(ancestor);
		}
		for (const id of ids) {
			const element = byId.get(id);
			if (element) {
				element.classList.add("roadmap__node--lit");
				lit.push(element);
			}
		}
		litIds = ids;
		const groups = new Set<string>();
		for (const id of ids) {
			const group = groupOf.get(id);
			if (group) groups.add(group);
		}
		litGroups = groups;
		syncPathLinks(ids, groups);
		syncBoards();
		svg.classList.add("roadmap--spotlight-lit");
	};
	// The spotlight is sticky over the lit scope's own hull: the board paths
	// are real elements, so crossing an in-group gap keeps the pointer on a
	// board that belongs to the scope and nothing resets. Everywhere else a
	// short grace period bridges gap crossings (no flashing) but releases the
	// spotlight when the pointer actually settles outside the scope.
	const graceMs = 250;
	const boardScope = new Map<Element, () => boolean>();
	for (const board of svg.querySelectorAll(
		'[data-roadmap-element="topic-group"],[data-roadmap-element="nested-group"]',
	)) {
		const boardId = stableNodeId(board.id, prefix);
		boardScope.set(
			board,
			boardId.endsWith("-children")
				? () => litIds.has(boardId.slice(0, -"-children".length))
				: () => litGroups.has(boardId.replace(/-grid-\d+$/u, "")),
		);
	}
	const syncBoards = (): void => {
		for (const [board, inScope] of boardScope) {
			board.classList.toggle("roadmap__group--dim", !inScope());
		}
	};
	const boardInScope = (target: Element | null): boolean => {
		const board = target?.closest(
			'[data-roadmap-element="topic-group"],[data-roadmap-element="nested-group"]',
		);
		return board ? (boardScope.get(board)?.() ?? false) : false;
	};
	const onOver = (event: PointerEvent): void => {
		const target = event.target as Element | null;
		const source = target?.closest(spotlightSources);
		if (source) {
			// The chapter comment has no scope of its own — hovering it
			// spotlights the chapter it describes.
			const rootId =
				source.getAttribute("data-roadmap-element") === "chapter-description"
					? (source.getAttribute("data-parent") ?? stableNodeId(source.id, prefix))
					: stableNodeId(source.id, prefix);
			light(rootId);
			cancelPendingClear();
			return;
		}
		if (litRoot === undefined) return;
		if (boardInScope(target)) {
			cancelPendingClear();
			return;
		}
		if (pendingClear === undefined) pendingClear = setTimeout(clear, graceMs);
	};
	const onLeave = (event: PointerEvent): void => {
		// A lifted finger fires pointerleave too; on touch the spotlight stays
		// until the next tap lights a new scope or lands outside this one.
		if (event.pointerType === "touch") return;
		clear();
	};
	svg.addEventListener("pointerover", onOver);
	svg.addEventListener("pointerleave", onLeave);
	return () => {
		clear();
		svg.removeEventListener("pointerover", onOver);
		svg.removeEventListener("pointerleave", onLeave);
		svg.classList.remove("roadmap--spotlight");
	};
}

export function attachRoadmapInteractivity(
	svg: SVGSVGElement,
	options: AttachRoadmapInteractivityOptions = {},
): RoadmapInteractivityHandle {
	const hostDocument = svg.ownerDocument;
	ensureStyles(hostDocument);

	const prefix = svg.getAttribute("data-roadmap-instance") ?? "";
	const chartTitle = svg.querySelector(":scope > title")?.textContent?.trim() || "roadmap";
	const storageKey = options.storageKey ?? `svg-roadmap-progress:${chartTitle}`;
	const storage =
		options.storage === undefined
			? ((globalThis as { localStorage?: Storage }).localStorage ?? null)
			: options.storage;
	const trackProgress = options.progress !== false;
	const interceptLinks = options.interceptLinks !== false;

	const states: Record<string, RoadmapProgressState> = {};
	if (storage) {
		try {
			const raw: unknown = JSON.parse(storage.getItem(storageKey) ?? "{}");
			if (raw && typeof raw === "object") {
				for (const [id, state] of Object.entries(raw)) {
					if (state === "in-progress" || state === "done" || state === "skipped") {
						states[id] = state;
					}
				}
			}
		} catch {
			// Corrupt or unavailable storage starts a fresh tracking session.
		}
	}

	const persist = (): void => {
		if (!storage) return;
		try {
			storage.setItem(storageKey, JSON.stringify(states));
		} catch {
			// Private browsing may deny writes; tracking continues in memory.
		}
	};

	const groups = new Map<string, SVGGElement>();
	// Grid column headers: selectable like topics, but stateless — their
	// detail reports the column's aggregate progress instead.
	const headerGroups = new Map<string, SVGGElement>();
	const headerColumns = new Map<string, readonly string[]>();
	const groupFor = (id: string): SVGGElement | undefined => groups.get(id) ?? headerGroups.get(id);
	const overlays = new Map<string, SVGGElement>();
	const disposers: (() => void)[] = [];
	let repaintChart: ((s: Readonly<Record<string, RoadmapProgressState>>) => void) | undefined;

	svg.classList.add("roadmap--interactive");

	// Sticky summary: a zero-height sticky anchor in the scroll container, so
	// the panel overlays the chart without shifting it and stays visible
	// while the user scrolls a tall roadmap.
	let summaryPanel: HTMLElement | undefined;
	let summaryElements:
		| {
				count: HTMLElement;
				bar: HTMLElement;
				rows: Record<RoadmapProgressState, HTMLElement>;
		  }
		| undefined;
	if (options.summary !== false && trackProgress && svg.parentElement) {
		const position = options.summary?.position ?? "top-right";
		const anchor = hostDocument.createElement("div");
		anchor.className = "roadmap-progress-summary-anchor";
		anchor.dataset.at = position;
		const panel = hostDocument.createElement("div");
		panel.className = "roadmap-progress-summary";
		const top = hostDocument.createElement("div");
		top.className = "roadmap-progress-summary__top";
		const count = hostDocument.createElement("span");
		count.className = "roadmap-progress-summary__count";
		const reset = hostDocument.createElement("button");
		reset.type = "button";
		reset.className = "roadmap-progress-summary__reset";
		reset.textContent = "reset";
		reset.setAttribute("aria-label", "Reset all progress");
		top.append(count, reset);
		const bar = hostDocument.createElement("span");
		bar.className = "roadmap-progress-summary__bar";
		const fill = hostDocument.createElement("i");
		bar.append(fill);
		panel.append(top, bar);
		const rows = {} as Record<RoadmapProgressState, HTMLElement>;
		for (const state of ["in-progress", "done", "skipped"] as const) {
			const row = hostDocument.createElement("div");
			row.className = "roadmap-progress-summary__row";
			const swatch = hostDocument.createElement("span");
			swatch.className = `roadmap-progress-summary__swatch roadmap-progress-summary__swatch--${state}`;
			const label = hostDocument.createElement("span");
			label.textContent = stateLabels[state];
			const value = hostDocument.createElement("b");
			row.append(swatch, label, value);
			rows[state] = value;
			panel.append(row);
		}
		anchor.append(panel);
		if (position.startsWith("top")) svg.parentElement.insertBefore(anchor, svg);
		else svg.parentElement.appendChild(anchor);
		// The chart's stylesheet resolves every theme token on the svg root;
		// adopting them here makes the panel wear the chart's theme — sci-fi
		// panel for a sci-fi chart — while explicit --roadmap-summary-* host
		// overrides still win through the var() chains.
		const chartStyles = svg.ownerDocument.defaultView?.getComputedStyle(svg);
		if (chartStyles) {
			const themeToken = (name: string): string => chartStyles.getPropertyValue(name).trim();
			const dress = (internal: string, override: string, value: string): void => {
				if (value) panel.style.setProperty(internal, `var(${override}, ${value})`);
			};
			// The chart canvas color is opaque; mixing it down keeps the theme
			// hue while letting the blurred chart show through the glass.
			const canvas = themeToken("--roadmap-canvas-background");
			if (canvas) {
				dress(
					"--_summary-background",
					"--roadmap-summary-background",
					`color-mix(in srgb, ${canvas} 72%, transparent)`,
				);
			}
			dress("--_summary-color", "--roadmap-summary-color", themeToken("--roadmap-legend-text"));
			const border = themeToken("--roadmap-topic-border");
			if (border) {
				dress(
					"--_summary-border",
					"--roadmap-summary-border",
					`color-mix(in srgb, ${border} 55%, transparent)`,
				);
				dress(
					"--_summary-track",
					"--roadmap-summary-track",
					`color-mix(in srgb, ${border} 35%, transparent)`,
				);
			}
			dress("--_accent", "--roadmap-progress-accent", themeToken("--roadmap-inline-link"));
			dress("--_done", "--roadmap-progress-done", themeToken("--roadmap-badge-check-background"));
			const legendText = svg.querySelector(".roadmap__legend-label") ?? svg.querySelector("text");
			if (legendText) {
				panel.style.fontFamily =
					svg.ownerDocument.defaultView?.getComputedStyle(legendText).fontFamily ?? "";
			}
		}
		const onReset = (): void => {
			handleReset();
		};
		reset.addEventListener("click", onReset);
		disposers.push(() => {
			reset.removeEventListener("click", onReset);
			anchor.remove();
		});
		summaryElements = { count, bar: fill, rows };
		summaryPanel = panel;
	}

	const updateSummary = (): void => {
		if (!summaryElements) return;
		const { total, counts, fraction } = summarizeProgress(states, groups.size);
		summaryElements.count.textContent = `${counts.done} / ${total} done`;
		summaryElements.bar.style.width = `${100 * fraction}%`;
		for (const state of ["in-progress", "done", "skipped"] as const) {
			summaryElements.rows[state].textContent = String(counts[state]);
		}
	};

	const detailFor = (id: string, group: SVGGElement): RoadmapTopicDetail => {
		const columnIds = headerColumns.get(id);
		const state = states[id];
		const note = group.getAttribute("data-roadmap-note")?.trim() || undefined;
		// Term definitions already travel as <title> tooltips in the text.
		const definitions = [
			...new Set(
				[...group.querySelectorAll("title")].map((title) => title.textContent?.trim() ?? ""),
			),
		].filter(Boolean);
		return {
			id,
			kind: columnIds ? "grid-header" : "topic",
			title: topicTitle(group),
			...(group.querySelector("a")?.getAttribute("href")
				? { href: group.querySelector("a")?.getAttribute("href") as string }
				: {}),
			tags: (group.getAttribute("data-tags") ?? "").split(",").filter(Boolean),
			...(note ? { note } : {}),
			definitions,
			...(state ? { state } : {}),
			...(columnIds
				? {
						columnIds,
						columnProgress: summarizeProgress(
							Object.fromEntries(
								columnIds.flatMap((memberId) =>
									states[memberId] ? [[memberId, states[memberId]]] : [],
								),
							),
							columnIds.length,
						),
					}
				: {}),
		};
	};

	const syncStrike = (id: string, group: SVGGElement): void => {
		const existing = overlays.get(id);
		if (existing) {
			existing.remove();
			overlays.delete(id);
		}
		if (states[id] !== "done") return;
		// Done is a strikethrough across each title line — unambiguous, and it
		// cannot collide with tag badges the way a second check mark would.
		// The overlay lives on the svg root so the dimmed card cannot fade it.
		const overlay = hostDocument.createElementNS(svgNamespace, "g") as SVGGElement;
		overlay.setAttribute("class", "roadmap__progress-strike");
		overlay.setAttribute("aria-hidden", "true");
		for (const text of group.querySelectorAll("text")) {
			const box = (text as SVGTextElement).getBBox();
			if (box.width <= 0) continue;
			const line = hostDocument.createElementNS(svgNamespace, "line");
			const y = box.y + box.height * 0.54;
			line.setAttribute("x1", String(box.x - 1.5));
			line.setAttribute("x2", String(box.x + box.width + 1.5));
			line.setAttribute("y1", String(y));
			line.setAttribute("y2", String(y));
			overlay.appendChild(line);
		}
		svg.appendChild(overlay);
		overlays.set(id, overlay);
	};

	const paint = (id: string): void => {
		const group = groups.get(id);
		if (!group) return;
		const state = states[id];
		group.classList.remove(
			"roadmap__node--in-progress",
			"roadmap__node--done",
			"roadmap__node--skipped",
		);
		if (state) group.classList.add(`roadmap__node--${state}`);
		group.setAttribute(
			"aria-label",
			state ? `${topicTitle(group)} — ${stateLabels[state]}` : topicTitle(group),
		);
		syncStrike(id, group);
	};

	// The detail section lives inside the summary panel: title, a state
	// selector, tags, the rich note rebuilt from the embedded model, term
	// definitions, and the resource link.
	let detailSection: HTMLElement | undefined;
	const renderDetail = (): void => {
		if (!summaryPanel || !selectedId) return;
		const group = groupFor(selectedId);
		if (!group) return;
		if (!detailSection) {
			detailSection = hostDocument.createElement("section");
			detailSection.className = "roadmap-topic-detail";
			summaryPanel.append(detailSection);
		}
		detailSection.replaceChildren();
		const detail = detailFor(selectedId, group);
		const heading = hostDocument.createElement("h3");
		heading.textContent = detail.title;
		detailSection.append(heading);
		if (detail.columnProgress && trackProgress) {
			const column = hostDocument.createElement("p");
			column.className = "roadmap-topic-detail__column";
			const count = hostDocument.createElement("b");
			count.textContent = `${detail.columnProgress.counts.done} / ${detail.columnProgress.total}`;
			column.append(count, " done in this column");
			const bar = hostDocument.createElement("span");
			bar.className = "roadmap-topic-detail__column-bar";
			const fill = hostDocument.createElement("i");
			fill.style.width = `${100 * detail.columnProgress.fraction}%`;
			bar.append(fill);
			column.append(bar);
			detailSection.append(column);
		} else if (trackProgress) {
			const select = hostDocument.createElement("select");
			select.className = "roadmap-topic-detail__state";
			select.setAttribute("aria-label", `Progress for ${detail.title}`);
			for (const [value, label] of [
				["", "not started"],
				["in-progress", "in progress"],
				["done", "done"],
				["skipped", "skipped"],
			] as const) {
				const option = hostDocument.createElement("option");
				option.value = value;
				option.textContent = label;
				select.append(option);
			}
			select.value = states[selectedId] ?? "";
			select.addEventListener("change", () => {
				if (!selectedId) return;
				const value = select.value as RoadmapProgressState | "";
				apply(selectedId, value === "" ? undefined : value);
			});
			detailSection.append(select);
		}
		if (detail.tags.length > 0) {
			const tags = hostDocument.createElement("div");
			tags.className = "roadmap-topic-detail__tags";
			for (const tag of detail.tags) {
				const chip = hostDocument.createElement("span");
				chip.className = "roadmap-topic-detail__tag";
				chip.textContent = tag;
				tags.append(chip);
			}
			detailSection.append(tags);
		}
		if (detail.note) {
			const note = hostDocument.createElement("div");
			note.className = "roadmap-topic-detail__note";
			const rendered = options.renderNote?.(detail.note);
			if (rendered === undefined) note.textContent = detail.note;
			else if (typeof rendered === "string") note.innerHTML = rendered;
			else note.append(rendered);
			detailSection.append(note);
		}
		for (const definition of detail.definitions) {
			const paragraph = hostDocument.createElement("p");
			paragraph.className = "roadmap-topic-detail__definition";
			paragraph.textContent = definition;
			detailSection.append(paragraph);
		}
		if (detail.href) {
			const link = hostDocument.createElement("a");
			link.className = "roadmap-topic-detail__link";
			link.href = detail.href;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			link.append("Open resource");
			const icon = hostDocument.createElement("span");
			icon.className = "roadmap-topic-detail__link-icon";
			icon.innerHTML = externalLinkIcon;
			link.append(icon);
			detailSection.append(link);
		}
	};

	const apply = (id: string, state: RoadmapProgressState | undefined): void => {
		if (state) states[id] = state;
		else delete states[id];
		persist();
		paint(id);
		updateSummary();
		repaintChart?.(states);
		if (selectedId && headerColumns.get(selectedId)?.includes(id)) renderDetail();
		const group = groups.get(id);
		if (group) options.onChange?.(detailFor(id, group));
	};

	const handleReset = (): void => {
		for (const id of Object.keys(states)) delete states[id];
		persist();
		for (const id of groups.keys()) paint(id);
		updateSummary();
		repaintChart?.(states);
		renderDetail();
		options.onReset?.();
	};

	// Clicking selects; state changes happen in the panel's selector, so a
	// stray click can never mutate progress.
	let selectedId: string | undefined;
	const selectTopic = (id: string, group: SVGGElement): void => {
		if (selectedId && selectedId !== id) {
			groupFor(selectedId)?.classList.remove("roadmap__node--selected");
		}
		selectedId = id;
		group.classList.add("roadmap__node--selected");
		renderDetail();
		options.onSelect?.(detailFor(id, group));
	};
	const clearSelection = (): void => {
		if (!selectedId) return;
		groupFor(selectedId)?.classList.remove("roadmap__node--selected");
		selectedId = undefined;
		detailSection?.remove();
		detailSection = undefined;
		options.onSelect?.(undefined);
	};

	const wire = (id: string, group: SVGGElement): void => {
		group.setAttribute("tabindex", "0");
		group.setAttribute("role", "button");
		// The note travels in the SVG only as authored Markdown; now that the
		// node is focusable, give assistive tech a lightly de-marked reading
		// as its <desc>.
		const noteData = group.getAttribute("data-roadmap-note")?.trim();
		if (noteData && !group.querySelector(":scope > desc")) {
			const desc = hostDocument.createElementNS(svgNamespace, "desc");
			desc.textContent = stripNoteMarkdown(noteData);
			group.insertBefore(desc, group.firstChild);
			disposers.push(() => {
				desc.remove();
			});
		}
		const onClick = (event: MouseEvent): void => {
			if (interceptLinks) event.preventDefault();
			else if ((event.target as Element | null)?.closest("a")) return;
			selectTopic(id, group);
		};
		const onKeydown = (event: KeyboardEvent): void => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			selectTopic(id, group);
		};
		group.addEventListener("click", onClick);
		group.addEventListener("keydown", onKeydown);
		disposers.push(() => {
			group.removeEventListener("click", onClick);
			group.removeEventListener("keydown", onKeydown);
			group.classList.remove(
				"roadmap__node--in-progress",
				"roadmap__node--done",
				"roadmap__node--skipped",
			);
			group.removeAttribute("tabindex");
			group.removeAttribute("role");
			group.removeAttribute("aria-label");
		});
	};

	// One document-order pass builds both maps: a header owns every following
	// grid topic until the next header or the first non-grid topic.
	let openHeader: { id: string; members: string[] } | undefined;
	const closeHeader = (): void => {
		if (openHeader) headerColumns.set(openHeader.id, openHeader.members);
		openHeader = undefined;
	};
	for (const group of svg.querySelectorAll<SVGGElement>(
		'g[data-roadmap-element="topic"],g[data-roadmap-element="nested-topic"],g[data-roadmap-element="topic-header"]',
	)) {
		const id = stableNodeId(group.id, prefix);
		if (!id) continue;
		if (group.getAttribute("data-roadmap-element") === "topic-header") {
			closeHeader();
			headerGroups.set(id, group);
			openHeader = { id, members: [] };
			wire(id, group);
			continue;
		}
		if (group.getAttribute("data-placement") !== "grid-topic") closeHeader();
		openHeader?.members.push(id);
		groups.set(id, group);
		wire(id, group);
		paint(id);
	}
	closeHeader();
	const chartProgress =
		options.onChart !== false && trackProgress
			? createChartProgress(svg, prefix, groups, hostDocument)
			: undefined;
	if (chartProgress) repaintChart = chartProgress.repaint;
	chartProgress?.repaint(states);
	updateSummary();

	return {
		get summaryElement() {
			return summaryPanel;
		},
		get states() {
			return { ...states };
		},
		topics: () => [...groups.entries()].map(([id, group]) => detailFor(id, group)),
		headers: () => [...headerGroups.entries()].map(([id, group]) => detailFor(id, group)),
		getTopic: (id) => {
			const group = groupFor(id);
			return group ? detailFor(id, group) : undefined;
		},
		getSummary: () => summarizeProgress(states, groups.size),
		getState: (id) => states[id],
		setState: (id, state) => {
			apply(id, state);
		},
		get selectedId() {
			return selectedId;
		},
		select: (id) => {
			if (id === undefined) {
				clearSelection();
				return;
			}
			const group = groupFor(id);
			if (group) selectTopic(id, group);
		},
		reset: handleReset,
		dispose: () => {
			for (const dispose of disposers) dispose();
			for (const overlay of overlays.values()) overlay.remove();
			overlays.clear();
			chartProgress?.dispose();
			detailSection?.remove();
			if (selectedId) groupFor(selectedId)?.classList.remove("roadmap__node--selected");
			groups.clear();
			headerGroups.clear();
			headerColumns.clear();
			svg.classList.remove("roadmap--interactive");
		},
	};
}
