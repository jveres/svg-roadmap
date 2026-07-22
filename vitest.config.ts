import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			exclude: ["demo/**", "dist/**", "test/**", "**/*.config.ts"],
			provider: "v8",
			reporter: ["text", "json-summary"],
		},
		setupFiles: ["./test/setup.ts"],
	},
});
