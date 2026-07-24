import { afterEach, describe, expect, test, vi } from "vitest";
import { createDomMeasurementProvider, installDomMeasurement } from "./core/dom-measurement.ts";
import { measureText, setMeasurementProvider } from "./core/inline.ts";
import { generateRoadmap } from "./index.ts";

afterEach(() => {
	setMeasurementProvider(undefined);
});

describe("measurement provider seam", () => {
	test("ordinary text delegates to the installed provider", () => {
		const provider = vi.fn(
			(text: string, style: { fontSize: number }) => text.length * style.fontSize,
		);
		setMeasurementProvider(provider);
		const width = measureText("abc", 10);
		expect(provider).toHaveBeenCalledWith(
			"abc",
			expect.objectContaining({ fontSize: 10, fontWeight: 400, fontStyle: "normal" }),
		);
		expect(width).toBe(30);
	});

	test("provider metrics change the generated layout", () => {
		const narrow = generateRoadmap("# T\n\n* Chapter label\n  * Topic\n");
		setMeasurementProvider((text, style) => text.length * style.fontSize * 1.4);
		const wide = generateRoadmap("# T\n\n* Chapter label\n  * Topic\n");
		const chapterWidth = (svg: {
			layout: { elements: readonly { id: string; width?: number }[] };
		}) => svg.layout.elements.find((element) => element.id.includes("chapter"))?.width ?? 0;
		expect(chapterWidth(wide)).toBeGreaterThan(chapterWidth(narrow));
	});

	test("pictographs never reach the provider and keep their fixed advance", () => {
		const provider = vi.fn((text: string) => {
			expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
			return text.length * 8;
		});
		setMeasurementProvider(provider);
		const width = measureText("a🚀b", 16);
		// Two plain spans around the fixed 1.05em pictograph advance.
		expect(provider).toHaveBeenCalledTimes(2);
		expect(width).toBeCloseTo(8 + 16 * 1.05 + 8, 1);
	});

	test("code spans and monospace families bypass the provider", () => {
		const provider = vi.fn(() => 999);
		setMeasurementProvider(provider);
		expect(measureText("code", 10, ["code"])).toBeCloseTo(4 * 10 * 0.61, 1);
		expect(measureText("mono", 10, [], 400, "Menlo, monospace")).toBeCloseTo(4 * 10 * 0.6, 1);
		expect(provider).not.toHaveBeenCalled();
	});

	test("switching providers flushes cached widths", () => {
		setMeasurementProvider(() => 111);
		expect(measureText("cache-key-text", 10)).toBe(111);
		setMeasurementProvider(() => 222);
		expect(measureText("cache-key-text", 10)).toBe(222);
	});

	test("strong marks raise the provider font weight", () => {
		const provider = vi.fn(() => 10);
		setMeasurementProvider(provider);
		measureText("bold", 10, ["strong"], 400);
		expect(provider).toHaveBeenCalledWith("bold", expect.objectContaining({ fontWeight: 700 }));
	});
});

interface StubElement {
	style: Record<string, string> & { setProperty(name: string, value: string): void };
	textContent: string;
	children: StubElement[];
	attributes: Record<string, string>;
	appendChild(child: StubElement): void;
	removeChild(child: StubElement): void;
	remove(): void;
	setAttribute(name: string, value: string): void;
	getBoundingClientRect(): { width: number };
}

function createStubDocument(scale = 1): {
	document: Document;
	body: StubElement;
	fonts: {
		load: ReturnType<typeof vi.fn>;
		ready: Promise<void>;
		addEventListener: ReturnType<typeof vi.fn>;
		removeEventListener: ReturnType<typeof vi.fn>;
		emitLoadingDone(): void;
	};
} {
	const createElement = (): StubElement => {
		const element: StubElement = {
			style: Object.assign(Object.create(null), {
				setProperty(name: string, value: string) {
					element.style[name] = value;
				},
			}),
			textContent: "",
			children: [],
			attributes: {},
			appendChild(child) {
				element.children.push(child);
			},
			removeChild(child) {
				element.children = element.children.filter((entry) => entry !== child);
			},
			remove() {
				body.children = body.children.filter((entry) => entry !== element);
			},
			setAttribute(name, value) {
				element.attributes[name] = value;
			},
			getBoundingClientRect() {
				// A fixed-width probe scales like everything else; text spans
				// measure 7px per character in this stub.
				const fixed = element.style.width ? Number.parseFloat(element.style.width) : undefined;
				return { width: (fixed ?? element.textContent.length * 7) * scale };
			},
		};
		return element;
	};
	const body = createElement();
	const listeners = new Map<string, () => void>();
	const fonts = {
		load: vi.fn(() => Promise.resolve([])),
		ready: Promise.resolve(),
		addEventListener: vi.fn((name: string, listener: () => void) => {
			listeners.set(name, listener);
		}),
		removeEventListener: vi.fn((name: string) => {
			listeners.delete(name);
		}),
		emitLoadingDone() {
			listeners.get("loadingdone")?.();
		},
	};
	const stub = { createElement, body, fonts };
	return { document: stub as unknown as Document, body, fonts };
}

describe("hidden-DOM oracle", () => {
	test("measures via a hidden pre-formatted span with calibration", () => {
		// Everything in this document is scaled 0.5x, as if an ancestor
		// transform shrank the page; calibration must undo it.
		const { document, body } = createStubDocument(0.5);
		const handle = createDomMeasurementProvider(document);
		const host = body.children[0];
		expect(host?.style.visibility).toBe("hidden");
		expect(host?.style.whiteSpace).toBe("pre");
		expect(host?.style.position).toBe("absolute");
		expect(host?.attributes["aria-hidden"]).toBe("true");
		const width = handle.provider("abcd", {
			fontSize: 12,
			fontFamily: "Didot, serif",
			fontWeight: 600,
			fontStyle: "italic",
		});
		expect(width).toBe(4 * 7);
		const span = host?.children[0];
		expect(span?.style.font).toBe("italic 600 12px Didot, serif");
		handle.dispose();
		expect(body.children).toHaveLength(0);
	});

	test("install loads fonts, installs the oracle, and uninstall restores tables", async () => {
		const { document, fonts } = createStubDocument();
		const onFontsChanged = vi.fn();
		const uninstall = await installDomMeasurement({
			document,
			fonts: ['600 16px "Didot"'],
			onFontsChanged,
		});
		expect(fonts.load).toHaveBeenCalledWith('600 16px "Didot"');
		// 7px per character comes from the stub oracle, not the tables.
		expect(measureText("abcd", 16)).toBe(28);
		fonts.emitLoadingDone();
		expect(onFontsChanged).toHaveBeenCalledTimes(1);
		uninstall();
		expect(fonts.removeEventListener).toHaveBeenCalled();
		expect(measureText("abcd", 16)).not.toBe(28);
	});
});
