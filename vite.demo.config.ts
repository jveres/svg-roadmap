import { defineConfig } from "vite";

export default defineConfig({
	root: ".",
	build: {
		outDir: "demo-dist",
		emptyOutDir: true,
		target: "es2024",
	},
});
