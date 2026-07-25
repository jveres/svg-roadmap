/**
 * Optional browser-side interactivity for a rendered roadmap SVG.
 *
 * The SVG itself stays script-free: this module runs in the host page and
 * talks to hooks the renderer already emits — stable node ids,
 * `data-roadmap-element` attributes, and CSS classes. A downloaded chart
 * remains a plain, portable image.
 *
 * Clicking a topic cycles its progress state (in progress → done → skipped)
 * and reports a selection, so a host can pair the same click with a detail
 * panel. State persists per stable node id, so it survives re-renders and
 * theme switches.
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

/** Strips the render-instance prefix, leaving the stable per-document id. */
export function stableNodeId(elementId: string, instancePrefix: string): string {
	return instancePrefix && elementId.startsWith(`${instancePrefix}-`)
		? elementId.slice(instancePrefix.length + 1)
		: elementId;
}

export interface RoadmapTopicDetail {
	/** Stable node id, independent of the render instance prefix. */
	readonly id: string;
	readonly title: string;
	readonly href?: string;
	readonly tags: readonly string[];
	readonly state?: RoadmapProgressState;
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
	 * tip terminates the ink, and fully completed chapters fade to gray.
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
	/** Fires after every progress change. */
	readonly onChange?: (detail: RoadmapTopicDetail) => void;
	/** Fires after progress is reset, from the panel button or `reset()`. */
	readonly onReset?: () => void;
	/** Fires on every topic click or keyboard activation. */
	readonly onSelect?: (detail: RoadmapTopicDetail) => void;
}

export interface RoadmapInteractivityHandle {
	/** The summary panel element, for hosts embedding extra content (a topic
	 * detail section, for example). `undefined` when the summary is disabled. */
	readonly summaryElement: HTMLElement | undefined;
	readonly states: Readonly<Record<string, RoadmapProgressState>>;
	getState(id: string): RoadmapProgressState | undefined;
	setState(id: string, state: RoadmapProgressState | undefined): void;
	reset(): void;
	dispose(): void;
}

const styleElementId = "svg-roadmap-interactive-style";

// Injected once per document. Colors come through overridable custom
// properties; the frame stroke wins over presentation attributes without
// !important because CSS outranks them.
const interactiveCss = `
.roadmap--interactive [data-roadmap-element="topic"]{cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.roadmap--interactive [data-roadmap-element="topic"]:focus-visible{outline:none}
.roadmap--interactive [data-roadmap-element="topic"]:focus-visible .roadmap__frame,
.roadmap--interactive .roadmap__node--in-progress .roadmap__frame{stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-width:2.4}
.roadmap--interactive .roadmap__node--done{opacity:var(--roadmap-progress-done-opacity,.55)}
.roadmap--interactive .roadmap__node--skipped{opacity:var(--roadmap-progress-skipped-opacity,.32)}
.roadmap--interactive .roadmap__node--skipped .roadmap__frame{stroke-dasharray:4 3}
.roadmap__progress-strike{pointer-events:none;stroke:var(--roadmap-progress-strike,#5c6975);stroke-width:1.6;stroke-linecap:round;opacity:.85}
.roadmap__progress-ink{fill:none;stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-linecap:round;pointer-events:none}
.roadmap__progress-ink--glow{opacity:.16}
.roadmap__progress-ink--core{opacity:.9}
.roadmap__progress-station{pointer-events:none}
.roadmap__progress-station .station-casing{fill:#ffffff;stroke:rgba(90,110,125,.45);stroke-width:1.4}
.roadmap__progress-station .station-arc{fill:none;stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-width:2.6;stroke-linecap:round;transform:rotate(-90deg);transform-box:fill-box;transform-origin:center}
.roadmap__progress-station .station-full{fill:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7))}
.roadmap__progress-station .station-tick{stroke:#ffffff;stroke-width:1.9;fill:none;stroke-linecap:round;stroke-linejoin:round}
.roadmap__progress-tip{pointer-events:none}
.roadmap__progress-tip .tip-core{fill:#ffffff;stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-width:2.6}
.roadmap__progress-tip .tip-heart{fill:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7))}
.roadmap__progress-tip .tip-pulse{fill:none;stroke:var(--roadmap-progress-accent,var(--roadmap-inline-link,#1289a7));stroke-width:1.6}
.roadmap--interactive .roadmap__progress-passed{opacity:var(--roadmap-progress-passed-opacity,.6);transition:opacity .5s}
@media (prefers-reduced-motion: no-preference){
.roadmap__progress-tip .tip-pulse{animation:roadmap-progress-pulse 2.4s ease-out infinite}
@keyframes roadmap-progress-pulse{0%{r:6;opacity:.5}70%{r:14;opacity:0}100%{r:14;opacity:0}}
}
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
`;

function ensureStyles(hostDocument: Document): void {
	if (hostDocument.getElementById(styleElementId)) return;
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
 * station roundels at chapters with progress, a tip roundel terminating the
 * ink, and completed chapters fading to gray. Progress decorates only where
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
			return { centerY: box.y + box.height / 2, bottomY: box.y + box.height };
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
	// Stations and the tip mark the line, so they live in the line's layer:
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

	// Stations sit on the line where it exits the chapter capsule — a
	// junction roundel at the capsule center would cover the title glyphs.
	const pointBelow = (path: SVGPathElement, targetY: number): DOMPoint => {
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
		const junctionSegment = inksByGap.get(index + 1)?.[0];
		let point: { x: number; y: number } = { x: Number.NaN, y: chapter.centerY };
		if (junctionSegment) {
			// Center the roundel in the gap between the capsule and whatever
			// sits below it on the line (usually the chapter description).
			const startX = junctionSegment.core.getPointAtLength(0).x;
			let nextTop = chapter.bottomY + 26;
			for (const node of svg.querySelectorAll<SVGGElement>("g.roadmap__node")) {
				const box = node.getBBox();
				if (box.y < chapter.bottomY - 0.5) continue;
				if (startX < box.x || startX > box.x + box.width) continue;
				nextTop = Math.min(nextTop, box.y);
			}
			point = pointBelow(junctionSegment.core, (chapter.bottomY + nextTop) / 2);
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

	const tip = hostDocument.createElementNS(svgNamespace, "g") as SVGGElement;
	tip.setAttribute("class", "roadmap__progress-tip");
	tip.setAttribute("aria-hidden", "true");
	tip.style.display = "none";
	const pulse = hostDocument.createElementNS(svgNamespace, "circle");
	pulse.setAttribute("class", "tip-pulse");
	pulse.setAttribute("r", "6");
	const tipCore = hostDocument.createElementNS(svgNamespace, "circle");
	tipCore.setAttribute("class", "tip-core");
	tipCore.setAttribute("r", "5.4");
	const tipHeart = hostDocument.createElementNS(svgNamespace, "circle");
	tipHeart.setAttribute("class", "tip-heart");
	tipHeart.setAttribute("r", "2");
	tip.appendChild(pulse);
	tip.appendChild(tipCore);
	tip.appendChild(tipHeart);
	addLineOverlay(tip);
	cleanups.push(() => tip.remove());

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

		let deepest: { segment: InkSegment; fill: number; gap: number } | undefined;
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
				if (visible && gap > 0 && (!deepest || gap >= (deepest.gap ?? 0))) {
					deepest = { segment, fill, gap };
				}
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

		// The tip terminates the contiguous ink whenever the journey is
		// unfinished — including resting on a junction while the next
		// chapter is still untouched.
		const journeyComplete = fractions.every((f) => f >= 0.999);
		if (deepest && !journeyComplete) {
			const length = deepest.segment.core.getTotalLength();
			const point = deepest.segment.core.getPointAtLength(length * Math.min(1, deepest.fill));
			tip.setAttribute("transform", `translate(${point.x} ${point.y})`);
			tip.style.display = "";
		} else {
			tip.style.display = "none";
		}

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
		const totals: Record<RoadmapProgressState, number> = { "in-progress": 0, done: 0, skipped: 0 };
		for (const state of Object.values(states)) totals[state] += 1;
		const total = groups.size;
		summaryElements.count.textContent = `${totals.done} / ${total} done`;
		summaryElements.bar.style.width = total ? `${(100 * totals.done) / total}%` : "0";
		for (const state of ["in-progress", "done", "skipped"] as const) {
			summaryElements.rows[state].textContent = String(totals[state]);
		}
	};

	const detailFor = (id: string, group: SVGGElement): RoadmapTopicDetail => {
		const state = states[id];
		return {
			id,
			title: topicTitle(group),
			...(group.querySelector("a")?.getAttribute("href")
				? { href: group.querySelector("a")?.getAttribute("href") as string }
				: {}),
			tags: (group.getAttribute("data-tags") ?? "").split(",").filter(Boolean),
			...(state ? { state } : {}),
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

	const apply = (id: string, state: RoadmapProgressState | undefined): void => {
		if (state) states[id] = state;
		else delete states[id];
		persist();
		paint(id);
		updateSummary();
		repaintChart?.(states);
	};

	const handleReset = (): void => {
		for (const id of Object.keys(states)) delete states[id];
		persist();
		for (const id of groups.keys()) paint(id);
		updateSummary();
		repaintChart?.(states);
		options.onReset?.();
	};

	const activate = (id: string, group: SVGGElement): void => {
		if (trackProgress) {
			apply(id, nextProgressState(states[id]));
			options.onChange?.(detailFor(id, group));
		}
		options.onSelect?.(detailFor(id, group));
	};

	for (const group of svg.querySelectorAll<SVGGElement>('g[data-roadmap-element="topic"]')) {
		const id = stableNodeId(group.id, prefix);
		if (!id) continue;
		groups.set(id, group);
		group.setAttribute("tabindex", "0");
		group.setAttribute("role", "button");
		const onClick = (event: MouseEvent): void => {
			if (interceptLinks) event.preventDefault();
			else if ((event.target as Element | null)?.closest("a")) return;
			activate(id, group);
		};
		const onKeydown = (event: KeyboardEvent): void => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			activate(id, group);
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
		paint(id);
	}
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
		getState: (id) => states[id],
		setState: (id, state) => {
			apply(id, state);
		},
		reset: handleReset,
		dispose: () => {
			for (const dispose of disposers) dispose();
			for (const overlay of overlays.values()) overlay.remove();
			overlays.clear();
			chartProgress?.dispose();
			groups.clear();
			svg.classList.remove("roadmap--interactive");
		},
	};
}
