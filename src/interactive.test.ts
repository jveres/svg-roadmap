import { describe, expect, test } from "vitest";
import {
	contiguousTravel,
	distributeAlongLengths,
	nextProgressState,
	progressTravelWeight,
	stableNodeId,
	stripNoteMarkdown,
	summarizeProgress,
} from "./interactive.ts";

describe("interactive helpers", () => {
	test("summarizeProgress aggregates counts and completion fraction", () => {
		const summary = summarizeProgress({ a: "done", b: "done", c: "in-progress", d: "skipped" }, 8);
		expect(summary.total).toBe(8);
		expect(summary.counts).toEqual({ "in-progress": 1, done: 2, skipped: 1 });
		expect(summary.fraction).toBeCloseTo(0.25);
	});

	test("summarizeProgress of an empty chart reports zero fraction", () => {
		expect(summarizeProgress({}, 0)).toEqual({
			total: 0,
			counts: { "in-progress": 0, done: 0, skipped: 0 },
			fraction: 0,
		});
	});

	test("progress cycles through the three states and back to unset", () => {
		expect(nextProgressState(undefined)).toBe("in-progress");
		expect(nextProgressState("in-progress")).toBe("done");
		expect(nextProgressState("done")).toBe("skipped");
		expect(nextProgressState("skipped")).toBeUndefined();
	});

	test("gap fill distributes along segment lengths front to back", () => {
		// Half of a 100+300 gap: the first segment fills fully, the second to a third.
		expect(distributeAlongLengths([100, 300], 0.5)).toEqual([1, 1 / 3]);
		expect(distributeAlongLengths([100, 300], 0)).toEqual([0, 0]);
		expect(distributeAlongLengths([100, 300], 1)).toEqual([1, 1]);
		// Zero-length segments never divide by zero.
		expect(distributeAlongLengths([0, 200], 0.5)).toEqual([0, 0.5]);
	});

	test("the journey line is contiguous: gaps ink only behind completed chapters", () => {
		// Everything half-started: only the first gap inks, to one half.
		expect(contiguousTravel([0.5, 0.5, 0.5])).toEqual([0.5, 0, 0]);
		// Chapter one complete: the second gap shows its own progress.
		expect(contiguousTravel([1, 0.5, 0.7])).toEqual([1, 0.5, 0]);
		// Working ahead without finishing chapter one keeps the line home.
		expect(contiguousTravel([0, 1, 1])).toEqual([0, 0, 0]);
		expect(contiguousTravel([1, 1, 1])).toEqual([1, 1, 1]);
	});

	test("travel weights: done and skipped are traveled, in-progress is half", () => {
		expect(progressTravelWeight("done")).toBe(1);
		expect(progressTravelWeight("skipped")).toBe(1);
		expect(progressTravelWeight("in-progress")).toBe(0.5);
		expect(progressTravelWeight(undefined)).toBe(0);
	});

	test("stripNoteMarkdown reads notes as plain prose", () => {
		expect(
			stripNoteMarkdown("Depth & **more** with `code` and\na [link](https://example.com)."),
		).toBe("Depth & more with code and a link.");
	});

	test("stable node ids strip only their own instance prefix", () => {
		expect(stableNodeId("roadmap-abc12-topic-4-linting", "roadmap-abc12")).toBe("topic-4-linting");
		expect(stableNodeId("other-topic-4-linting", "roadmap-abc12")).toBe("other-topic-4-linting");
		expect(stableNodeId("topic-4-linting", "")).toBe("topic-4-linting");
	});
});
