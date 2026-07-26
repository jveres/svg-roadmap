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
		expect(measureText("code", 10, ["code"])).toBeCloseTo(4 * 10 * 0.61 * 0.9, 1);
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
	namespace: string | undefined;
	tag: string | undefined;
	appendChild(child: StubElement): void;
	removeChild(child: StubElement): void;
	remove(): void;
	setAttribute(name: string, value: string): void;
	getComputedTextLength(): number;
}

function createStubDocument(): {
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
	const createElement = (namespace?: string, tag?: string): StubElement => {
		const element: StubElement = {
			style: Object.assign(Object.create(null), {
				setProperty(name: string, value: string) {
					element.style[name] = value;
				},
			}),
			textContent: "",
			children: [],
			attributes: {},
			namespace,
			tag,
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
			getComputedTextLength() {
				// Text advances measure 7px per character in this stub.
				return element.textContent.length * 7;
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
	const stub = {
		createElementNS: (namespace: string, tag: string) => createElement(namespace, tag),
		body,
		fonts,
	};
	return { document: stub as unknown as Document, body, fonts };
}

describe("hidden-DOM oracle", () => {
	test("measures via a hidden SVG text element in the SVG font-resolution path", () => {
		const { document, body } = createStubDocument();
		const handle = createDomMeasurementProvider(document);
		const host = body.children[0];
		// Measuring in SVG (not an HTML div) is load-bearing: Safari resolves
		// fonts differently for SVG text, and textLength would stretch glyphs
		// to any HTML-measured width.
		expect(host?.namespace).toBe("http://www.w3.org/2000/svg");
		expect(host?.tag).toBe("svg");
		expect(host?.style.visibility).toBe("hidden");
		expect(host?.style.position).toBe("absolute");
		expect(host?.attributes["aria-hidden"]).toBe("true");
		const width = handle.provider("abcd", {
			fontSize: 12,
			fontFamily: "Didot, serif",
			fontWeight: 600,
			fontStyle: "italic",
		});
		expect(width).toBe(4 * 7);
		const text = host?.children[0];
		expect(text?.tag).toBe("text");
		expect(text?.attributes["xml:space"]).toBe("preserve");
		expect(text?.style.letterSpacing).toBe("0");
		expect(text?.style.font).toBe("italic 600 12px Didot, serif");
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

	test("disposing an older installation leaves the newer one active", async () => {
		const first = createStubDocument();
		const second = createStubDocument();
		const uninstallFirst = await installDomMeasurement({ document: first.document });
		const uninstallSecond = await installDomMeasurement({ document: second.document });
		// The stub oracle measures 7px per character; the tables do not.
		expect(measureText("abcd", 16)).toBe(28);
		uninstallFirst();
		// First's dispose must not tear down second's provider.
		expect(measureText("abcd", 16)).toBe(28);
		uninstallSecond();
		expect(measureText("abcd", 16)).not.toBe(28);
	});

	test("disposing an installation never clobbers a host-swapped provider", async () => {
		const { document } = createStubDocument();
		const uninstall = await installDomMeasurement({ document });
		setMeasurementProvider(() => 999);
		uninstall();
		// The host's provider still owns the slot.
		expect(measureText("abcd", 16)).toBe(999);
	});
});
