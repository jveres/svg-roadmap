export function escapeXml(value: string): string {
	return value.replaceAll(/[&<>"']/gu, (character) => {
		switch (character) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			default:
				return "&apos;";
		}
	});
}

export function safeId(value: string): string {
	const id = value.replaceAll(/[^a-zA-Z0-9_-]+/gu, "-").replaceAll(/^-+|-+$/gu, "");
	return id || "roadmap";
}

/**
 * FNV-1a over UTF-16 code units, as an unsigned 32-bit integer. Pass a
 * previous result as `seed` to fold several chunks into one digest without
 * concatenating them first.
 */
export function hashNumber(value: string, seed = 0x811c9dc5): number {
	let hash = seed;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

export function hashString(value: string): string {
	return hashNumber(value).toString(36);
}

export function safeLinkDestination(value: string): string | undefined {
	const normalized = value.trim();
	if (!normalized) return undefined;
	if (normalized.startsWith("#") || normalized.startsWith("/")) return normalized;
	try {
		const url = new URL(normalized, "https://roadmap.invalid");
		return ["http:", "https:", "mailto:"].includes(url.protocol) ? normalized : undefined;
	} catch {
		return undefined;
	}
}
