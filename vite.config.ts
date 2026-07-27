import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: {
				index: "src/index.ts",
				node: "src/node.ts",
				"emoji-github": "src/emoji-github.ts",
				interactive: "src/interactive.ts",
				viewer: "src/viewer.ts",
				preview: "src/preview.ts",
			},
			formats: ["es"],
		},
		rollupOptions: {
			external: ["comrak-wasm", "node:fs/promises", "node:module"],
		},
		target: "es2024",
		sourcemap: true,
	},
});
