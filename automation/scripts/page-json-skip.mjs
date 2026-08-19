/**
 * JSON files in json/ that are not Figma page slugs.
 * Import this set in agent-compiler, audits, and scaffold scripts.
 */
export const SKIP_PAGE_JSON_FILES = new Set([
	"system-design.json",
	"typography-audit.json",
	"typography-contract.json",
	"global.json",
	"module-structure-audit.json",
	"layout-geometry-audit.json",
	"font-style-overrides.json",
	"page-9.json",
]);

export function isPageJsonFile(filename) {
	return filename.endsWith(".json") && !SKIP_PAGE_JSON_FILES.has(filename);
}
