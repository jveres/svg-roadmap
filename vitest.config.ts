import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		clearMocks: true,
		mockReset: true,
		restoreMocks: true,
		coverage: {
			exclude: ["demo/**", "dist/**", "test/**", "**/*.config.ts"],
			provider: "v8",
			reporter: ["text", "json", "json-summary", "html"],
			thresholds: {
				statements: 90,
				branches: 90,
				functions: 90,
				lines: 90,
			},
		},
		setupFiles: ["./test/setup.ts"],
	},
});
