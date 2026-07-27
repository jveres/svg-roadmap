// Packs a roadmap Markdown file into the versioned JSON artifact that the
// comrak-free viewer and <roadmap-preview> element consume:
//
//   node scripts/pack-artifact.mjs demo/sweep-1.1.md sweep.json
//
// Run `pnpm build` first; the script renders through dist/node.js.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [source, target] = process.argv.slice(2);
if (!source || !target) {
	console.error("usage: node scripts/pack-artifact.mjs <roadmap.md> <artifact.json>");
	process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { generateRoadmap, initializeRoadmapNode, packRoadmapDocument } = await import(
	join(root, "dist/node.js")
);

// Node cannot fetch file: Wasm URLs; the node entry reads the asset instead.
await initializeRoadmapNode();
const markdown = await readFile(source, "utf8");
const { document } = generateRoadmap(markdown);
await writeFile(target, JSON.stringify(packRoadmapDocument(document)));
const { stats } = document;
console.log(
	`wrote ${target} — ${stats.chapters} chapters, ${stats.topics} topics, depth ${stats.maxDepth}`,
);
