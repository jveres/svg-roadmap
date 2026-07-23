import { createTheme, darkTheme, funTheme, lightTheme } from "../theme.ts";
import type { RoadmapTheme, RoadmapThemeCatalog, ThemeInput } from "../types.ts";
import { printTheme } from "./print/theme.ts";
import { proTheme } from "./pro/theme.ts";
import { roseTheme } from "./rose/theme.ts";
import { sciFiTheme } from "./sci-fi/theme.ts";

export const builtInThemes: RoadmapThemeCatalog = {
	fun: funTheme,
	"sci-fi": sciFiTheme,
	rose: roseTheme,
	print: printTheme,
	pro: proTheme,
};

export function resolveTheme(
	theme: ThemeInput | undefined,
	themes: RoadmapThemeCatalog = builtInThemes,
): RoadmapTheme {
	if (theme === undefined || theme === "light") return lightTheme;
	if (theme === "dark") return darkTheme;
	if ("preset" in theme) {
		const preset = themes[theme.preset];
		if (!preset) throw new Error(`Unknown roadmap theme preset "${theme.preset}".`);
		return preset.modes[theme.mode ?? "light"];
	}
	return createTheme(theme);
}
