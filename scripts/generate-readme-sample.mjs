// Regenerates the README hero figures from the workbench's feature-tour
// sample, one SVG per color mode so the README <picture> can follow the
// viewer's theme. Run `pnpm build` first; the script renders through
// dist/node.js.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { generateRoadmapSvg } = await import(join(root, "dist/node.js"));

const markdown = await readFile(join(root, "demo/feature-tour.md"), "utf8");
for (const mode of ["light", "dark"]) {
	const svg = await generateRoadmapSvg(markdown, {
		theme: { preset: "sci-fi", mode },
	});
	const target = join(root, `docs/readme-sample-${mode}.svg`);
	await writeFile(target, svg);
	console.log(`wrote ${target} (${(svg.length / 1024).toFixed(0)} kB)`);
}
