// Generates the emoji shortcode map and Twemoji artwork packs:
//   src/core/emoji/gemoji-data.ts    — every GitHub shortcode -> emoji (ships in core)
//   src/core/emoji/artwork-core.ts   — popular-subset artwork (ships in core)
//   src/core/emoji/artwork-github.ts — full GitHub-set artwork (opt-in pack)
//
// Inputs (downloaded on demand into --cache, or reused if present):
//   gemoji database  https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json
//   twemoji assets   https://github.com/jdecked/twemoji/archive/refs/tags/v<version>.tar.gz
//
// Usage: node scripts/generate-emoji.mjs [--cache <dir>]

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TWEMOJI_VERSION = "15.1.0";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheArgIndex = process.argv.indexOf("--cache");
const cache =
	cacheArgIndex >= 0
		? process.argv[cacheArgIndex + 1]
		: join(root, "node_modules", ".cache", "emoji-generation");
mkdirSync(cache, { recursive: true });

const gemojiPath = join(cache, "gemoji.json");
if (!existsSync(gemojiPath)) {
	execSync(
		`curl -sL -o ${JSON.stringify(gemojiPath)} https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json`,
		{ stdio: "inherit" },
	);
}
const svgDirectory = join(cache, `twemoji-${TWEMOJI_VERSION}`, "assets", "svg");
if (!existsSync(svgDirectory)) {
	const tarball = join(cache, "twemoji.tar.gz");
	execSync(
		`curl -sL -o ${JSON.stringify(tarball)} https://github.com/jdecked/twemoji/archive/refs/tags/v${TWEMOJI_VERSION}.tar.gz`,
		{ stdio: "inherit" },
	);
	execSync(
		`tar -xzf ${JSON.stringify(tarball)} -C ${JSON.stringify(cache)} --include='*/assets/svg/*'`,
		{
			stdio: "inherit",
		},
	);
}

/**
 * Popular subset shipped in core: names common in engineering roadmaps and
 * general writing. Everything else lives in the opt-in GitHub pack.
 */
const popular = new Set(
	`grinning smiley smile grin laughing joy rofl wink blush innocent heart_eyes star_struck
	thinking neutral_face roll_eyes smirk grimacing relieved sweat_smile cry sob angry rage
	scream fearful disappointed confused worried astonished open_mouth sunglasses nerd_face
	exploding_head partying_face pleading_face zzz sleeping skull ghost alien
	+1 -1 ok_hand wave clap raised_hands pray muscle point_up point_right point_left point_down
	crossed_fingers handshake writing_hand v
	heart heartpulse sparkling_heart broken_heart blue_heart green_heart yellow_heart
	purple_heart orange_heart black_heart white_heart two_hearts
	white_check_mark heavy_check_mark x negative_squared_cross_mark warning question exclamation
	grey_question grey_exclamation no_entry no_entry_sign bangbang information_source
	red_circle green_circle yellow_circle orange_circle large_blue_circle purple_circle white_circle
	black_circle checkered_flag triangular_flag_on_post new sos top on cool free
	arrow_right arrow_left arrow_up arrow_down arrow_upper_right arrow_lower_right
	arrows_counterclockwise arrow_right_hook leftwards_arrow_with_hook fast_forward rewind
	repeat twisted_rightwards_arrows
	zero one two three four five six seven eight nine keycap_ten hash asterisk 100
	rocket robot gear bulb wrench hammer hammer_and_wrench toolbox nut_and_bolt computer
	desktop_computer keyboard iphone floppy_disk cd electric_plug battery bug lady_beetle
	microscope telescope satellite package gift card_index_dividers file_folder
	open_file_folder page_facing_up page_with_curl clipboard memo pencil2 black_nib paperclip
	link mag mag_right key lock unlock closed_lock_with_key shield bell no_bell mega
	loudspeaker speech_balloon thought_balloon envelope inbox_tray outbox_tray calendar date
	alarm_clock stopwatch hourglass hourglass_flowing_sand watch chart_with_upwards_trend
	chart_with_downwards_trend bar_chart books book notebook ledger bookmark label
	moneybag dollar credit_card balance_scale briefcase dart trophy medal_sports
	1st_place_medal crown gem construction rotating_light crystal_ball world_map compass
	round_pushpin pushpin triangular_ruler straight_ruler scissors eyes eye brain
	seedling herb four_leaf_clover deciduous_tree evergreen_tree rose sunflower tulip
	cherry_blossom sunny cloud zap fire star star2 sparkles dizzy boom rainbow snowflake
	droplet ocean earth_americas globe_with_meridians crescent_moon soap sponge broom recycle
	tada confetti_ball balloon birthday coffee pizza beer apple
	technologist scientist detective airplane ship
	turtle snail bee butterfly unicorn penguin owl hankey beginner soap`
		.split(/\s+/u)
		.filter(Boolean),
);

/** Twemoji file name for an emoji: codepoints, fe0f stripped unless ZWJ-joined. */
function twemojiFile(emoji) {
	let codepoints = Array.from(emoji).map((character) => character.codePointAt(0));
	if (!codepoints.includes(0x200d)) {
		codepoints = codepoints.filter((codepoint) => codepoint !== 0xfe0f);
	}
	return `${codepoints.map((codepoint) => codepoint.toString(16)).join("-")}.svg`;
}

function artworkContent(file) {
	const source = readFileSync(join(svgDirectory, file), "utf8");
	const match = source.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>\s*$/u);
	if (!match) throw new Error(`Unexpected SVG structure in ${file}`);
	return { viewBox: match[1], content: match[2].trim() };
}

const gemoji = JSON.parse(readFileSync(gemojiPath, "utf8"));
const available = new Set(readdirSync(svgDirectory));

const aliasToEmoji = [];
const aliasToCanonical = [];
const coreArtwork = [];
const githubArtwork = [];
let missingArtwork = 0;

const escapeLiteral = (value) => value.replace(/\\/gu, "\\\\").replace(/'/gu, "\\'");

for (const entry of gemoji) {
	if (!entry.emoji || !entry.aliases?.length) continue;
	const canonical = entry.aliases[0];
	for (const alias of entry.aliases) {
		aliasToEmoji.push([alias, entry.emoji]);
		if (alias !== canonical) aliasToCanonical.push([alias, canonical]);
	}
	const file = twemojiFile(entry.emoji);
	if (!available.has(file)) {
		missingArtwork += 1;
		continue;
	}
	const artwork = artworkContent(file);
	const line = `\t"${escapeLiteral(canonical)}": {\n\t\tviewBox: "${artwork.viewBox}",\n\t\tcontent:\n\t\t\t'${escapeLiteral(artwork.content)}',\n\t},`;
	(popular.has(canonical) ? coreArtwork : githubArtwork).push(line);
}

const unknownPopular = [...popular].filter(
	(name) => !gemoji.some((entry) => entry.aliases?.[0] === name),
);
if (unknownPopular.length > 0) {
	console.warn(`popular names not canonical in gemoji: ${unknownPopular.join(", ")}`);
}

const header = "// Generated by scripts/generate-emoji.mjs — do not edit.\n";
const emojiDirectory = join(root, "src", "core", "emoji");
mkdirSync(emojiDirectory, { recursive: true });

writeFileSync(
	join(emojiDirectory, "gemoji-data.ts"),
	`${header}
/** Every GitHub (gemoji) shortcode alias mapped to its emoji. */
export const gemojiEmoji: Readonly<Record<string, string>> = {
${aliasToEmoji.map(([alias, emoji]) => `\t"${escapeLiteral(alias)}": "${emoji}",`).join("\n")}
};

/** Aliases that differ from their canonical (first) gemoji name. */
export const gemojiCanonical: Readonly<Record<string, string>> = {
${aliasToCanonical.map(([alias, canonical]) => `\t"${escapeLiteral(alias)}": "${escapeLiteral(canonical)}",`).join("\n")}
};
`,
);

const pack = (
	name,
	doc,
	lines,
) => `${header}// Twemoji artwork (https://github.com/jdecked/twemoji), CC-BY 4.0;
// see LICENSES/TWEMOJI.txt.
import type { EmojiArtwork } from "../emoji-artwork.ts";

/** ${doc} */
export const ${name}: Readonly<Record<string, EmojiArtwork>> = {
${lines.join("\n")}
};
`;

writeFileSync(
	join(emojiDirectory, "artwork-core.ts"),
	pack("coreEmojiArtwork", "Popular-subset emoji artwork shipped with the library.", coreArtwork),
);
writeFileSync(
	join(emojiDirectory, "artwork-github.ts"),
	pack(
		"githubEmojiArtwork",
		"Full GitHub-set emoji artwork; register via registerEmojiArtwork.",
		githubArtwork,
	),
);

console.log(
	`gemoji aliases: ${aliasToEmoji.length}, core artwork: ${coreArtwork.length}, github artwork: ${githubArtwork.length}, missing twemoji files: ${missingArtwork}`,
);
