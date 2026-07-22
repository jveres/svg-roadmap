import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { initializeRoadmapMarkdownSync } from "../src/markdown.ts";

const require = createRequire(import.meta.url);
const wasm = readFileSync(require.resolve("comrak-wasm/comrak.wasm"));
initializeRoadmapMarkdownSync(wasm);
