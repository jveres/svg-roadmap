import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
	root: ".",
	server: {
		// comrak-wasm rides link: (one realpath with every sibling
		// embedder — seam) — the symlink resolves OUTSIDE this
		// package, so the dev server must allow the workspace parent
		// or the .wasm request 404s as HTML ("Unexpected response
		// MIME type").
		fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
	},
	build: {
		outDir: "demo-dist",
		emptyOutDir: true,
		target: "es2024",
	},
});
