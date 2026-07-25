import { describe, expect, test } from "vitest";
import {
	distributeAlongLengths,
	nextProgressState,
	progressTravelWeight,
	stableNodeId,
} from "./interactive.ts";

describe("interactive helpers", () => {
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

	test("travel weights: done and skipped are traveled, in-progress is half", () => {
		expect(progressTravelWeight("done")).toBe(1);
		expect(progressTravelWeight("skipped")).toBe(1);
		expect(progressTravelWeight("in-progress")).toBe(0.5);
		expect(progressTravelWeight(undefined)).toBe(0);
	});

	test("stable node ids strip only their own instance prefix", () => {
		expect(stableNodeId("roadmap-abc12-topic-4-linting", "roadmap-abc12")).toBe("topic-4-linting");
		expect(stableNodeId("other-topic-4-linting", "roadmap-abc12")).toBe("other-topic-4-linting");
		expect(stableNodeId("topic-4-linting", "")).toBe("topic-4-linting");
	});
});
