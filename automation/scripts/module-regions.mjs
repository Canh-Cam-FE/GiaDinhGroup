/**
 * C16 — expandModuleRegions
 * Detects visual regions inside Figma mega-sections for manifest + page JSON meta.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OVERRIDES_DIR = path.join(ROOT, "automation", "page-regions");

export function normalizeMatchText(value) {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function isDetailPageSlug(slug) {
	const n = normalizeMatchText(slug).replace(/\s+/g, "-");
	return /-(ct|detail)$/.test(n) || /ct$/.test(n.split("-").pop() || "");
}

export function frameIsDetailSection(frameName) {
	const n = normalizeMatchText(frameName).replace(/\s+/g, "-");
	return /03[-_]2|[-_]ct\b|\bct$|[-_]detail\b|\bdetail$/i.test(n);
}

/** Phase 0 — listing slugs must not pull detail frames (and vice versa). */
export function sectionScopeMatches(frameName, slug) {
	const slugDetail = isDetailPageSlug(slug);
	const frameDetail = frameIsDetailSection(frameName);
	if (slugDetail && !frameDetail) return false;
	if (!slugDetail && frameDetail) return false;
	return true;
}

function nodeWidth(node) {
	return node?.b?.width ?? node?.b?.w ?? 0;
}

function nodeHeight(node) {
	return node?.b?.height ?? node?.b?.h ?? 0;
}

function hasTextDescendant(node) {
	if (!node || typeof node !== "object") return false;
	if (node.t === "TEXT" && node.tx) return true;
	return (node.ch || []).some(hasTextDescendant);
}

function headingRank(ty) {
	const key = (ty || "").split("#")[0];
	if (key === "Heading/Heading-1") return 100;
	if (key === "Heading/Heading-2") return 90;
	if (key === "Heading/Heading-3") return 80;
	if (key === "Heading/Heading-4") return 70;
	if (key.startsWith("Local/t")) return 60;
	if (key === "Heading/Heading-5") return 50;
	if (key === "Heading/Heading-6") return 40;
	return 10;
}

function findPrimaryHeading(node) {
	let best = null;
	function walk(n, depth = 0) {
		if (n.t === "TEXT" && n.tx) {
			const ty = (n.ty || "").split("#")[0];
			const isHeading =
				/^Heading\//.test(ty) ||
				/^Local\/t\d+/.test(ty) ||
				ty === "Label";
			if (isHeading && n.tx.length >= 4) {
				const rank = headingRank(ty) - depth;
				if (!best || rank > best.rank) {
					best = { text: n.tx.trim(), rank, ty };
				}
			}
		}
		if (n.ch) n.ch.forEach((c) => walk(c, depth + 1));
	}
	walk(node);
	return best?.text ?? null;
}

function slugifyRegion(text, fallback = "region") {
	const base = String(text || fallback)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 56)
		.replace(/-+$/g, "");
	return base || fallback;
}

/** Heuristic + SHARED_REF breadcrumb chrome → always maps to global-breadcrumb. */
export function isBreadcrumbNode(node) {
	if (node.t === "SHARED_REF") {
		return (
			node.ref === "global-breadcrumb" || node.ref === ".global-breadcrumb"
		);
	}
	if (node.t !== "FRAME") return false;
	const name = normalizeMatchText(node.n || "");
	if (/global[-_]?breadcrumb/.test(name) || /\bbreadcrumb\b/.test(name)) {
		return true;
	}
	const textChild = (node.ch || []).find((c) => c.t === "TEXT");
	return Boolean(
		textChild?.ty?.includes("Body/Body-4") &&
			textChild.tx?.includes("/")
	);
}

function isSkipNode(node) {
	if (node.t === "INSTANCE" && /^Button\s*\d*/i.test(node.n || "")) return true;
	if ((node.n || "").includes("1000005678")) return true;
	if (
		node.t === "FRAME" &&
		nodeWidth(node) <= 220 &&
		nodeHeight(node) <= 180 &&
		hasTextDescendant(node) &&
		(node.ch || []).some(
			(c) =>
				c.t === "TEXT" &&
				/^(phone|messages|keyboard_arrow)/i.test(c.tx || "")
		)
	) {
		return true;
	}
	if (node.t === "TEXT" && /©|all rights reserved|thiết kế web/i.test(node.tx || "")) {
		return true;
	}
	if (node.t === "FRAME" && isStatCardFrame(node)) return true;
	if (node.t === "INSTANCE") return true;
	return false;
}

function isStatCardFrame(node) {
	if (node.t !== "FRAME") return false;
	const w = nodeWidth(node);
	const h = nodeHeight(node);
	if (w > 320 || h > 280) return false;
	const heading = findPrimaryHeading(node);
	return Boolean(heading && /^[\d.,]+%?\+?$/.test(heading.trim()));
}

function isDecorativeSibling(node) {
	if (!["RECTANGLE", "VECTOR", "LINE", "BOOLEAN_OPERATION"].includes(node.t)) {
		return false;
	}
	if (hasTextDescendant(node)) return false;
	const w = nodeWidth(node);
	const h = nodeHeight(node);
	if (w <= 2 || h <= 2) return true;
	if (w < 900 && h < 400 && !node.fi) return true;
	return false;
}

function isFooterChrome(node) {
	if (node.t !== "FRAME") return false;
	const heading = findPrimaryHeading(node);
	return Boolean(heading && /©|all rights reserved/i.test(heading));
}

function uniqueFolder(base, used) {
	let folder = base;
	let n = 2;
	while (used.has(folder)) {
		folder = `${base}-${n}`;
		n++;
	}
	used.add(folder);
	return folder;
}

function makeRegion({
	pageSlug,
	parentSection,
	id,
	folder,
	regionType,
	sourceIndices,
	title,
}) {
	return {
		id,
		folder,
		parentSection,
		sectionClass: `${pageSlug}-${folder}`,
		regionType,
		sort: sourceIndices[0],
		sourceIndices,
		...(title ? { title } : {}),
	};
}

/**
 * Detect module regions from one Figma section node's flat children.
 */
export function detectModuleRegions(sectionNode, pageSlug) {
	const parentSection = sectionNode.n || "section";
	const children = sectionNode.ch || [];
	const regions = [];
	const usedFolders = new Set();
	let i = 0;

	while (i < children.length) {
		const node = children[i];

		if (isSkipNode(node) || isFooterChrome(node)) {
			i++;
			continue;
		}

		if (isBreadcrumbNode(node)) {
			const folder = uniqueFolder("global-breadcrumb", usedFolders);
			regions.push(
				makeRegion({
					pageSlug,
					parentSection,
					id: "global-breadcrumb",
					folder,
					regionType: "shared-ref",
					sourceIndices: [i],
				})
			);
			i++;
			continue;
		}

		if (node.t === "SHARED_REF") {
			const refId =
				node.ref === ".global-breadcrumb"
					? "global-breadcrumb"
					: node.ref === ".top-banner"
						? "top-banner"
						: node.ref;
			const folder = uniqueFolder(refId || "shared-ref", usedFolders);
			regions.push(
				makeRegion({
					pageSlug,
					parentSection,
					id: refId,
					folder,
					regionType: "shared-ref",
					sourceIndices: [i],
				})
			);
			i++;
			continue;
		}

		// Composite hero: full-width background + heading text sibling
		if (
			node.t === "RECTANGLE" &&
			nodeWidth(node) >= 1500 &&
			nodeHeight(node) >= 400
		) {
			const indices = [i];
			let j = i + 1;
			while (j < children.length) {
				const sib = children[j];
				if (isDecorativeSibling(sib)) {
					j++;
					continue;
				}
				if (sib.t === "TEXT" && findPrimaryHeading({ ch: [sib] })) {
					indices.push(j);
					j++;
				}
				break;
			}
			const title =
				findPrimaryHeading({ ch: indices.map((idx) => children[idx]) }) ||
				"hero";
			const folder = uniqueFolder(slugifyRegion(title, "hero"), usedFolders);
			regions.push(
				makeRegion({
					pageSlug,
					parentSection,
					id: slugifyRegion(title, "hero"),
					folder,
					regionType: "hero",
					sourceIndices: indices,
					title,
				})
			);
			i = j;
			continue;
		}

		// Split-layout cluster: divider rects + accordion frame
		if (
			isDecorativeSibling(node) &&
			i + 1 < children.length &&
			children[i + 1].t === "FRAME"
		) {
			const indices = [i];
			let j = i;
			while (j < children.length && (isDecorativeSibling(children[j]) || children[j].t === "RECTANGLE")) {
				if (!indices.includes(j)) indices.push(j);
				j++;
				if (children[j]?.t === "FRAME") {
					indices.push(j);
					j++;
					break;
				}
			}
			if (indices.length > 1 && children[indices[indices.length - 1]]?.t === "FRAME") {
				const frame = children[indices[indices.length - 1]];
				const title = findPrimaryHeading(frame) || "benefits";
				const folder = uniqueFolder(slugifyRegion(title, "benefits"), usedFolders);
				regions.push(
					makeRegion({
						pageSlug,
						parentSection,
						id: slugifyRegion(title, "benefits"),
						folder,
						regionType: "content",
						sourceIndices: indices,
						title,
					})
				);
				i = j;
				continue;
			}
		}

		if (isDecorativeSibling(node)) {
			i++;
			continue;
		}

		// Root TEXT heading (orphan) — attach to previous region or skip
		if (node.t === "TEXT" && findPrimaryHeading({ ch: [node] })) {
			const title = findPrimaryHeading({ ch: [node] });
			const prev = regions[regions.length - 1];
			if (prev?.regionType === "hero") {
				prev.sourceIndices.push(i);
				i++;
				continue;
			}
			const folder = uniqueFolder(slugifyRegion(title, "heading"), usedFolders);
			regions.push(
				makeRegion({
					pageSlug,
					parentSection,
					id: slugifyRegion(title, "heading"),
					folder,
					regionType: "content",
					sourceIndices: [i],
					title,
				})
			);
			i++;
			continue;
		}

		if (node.t === "FRAME") {
			const w = nodeWidth(node);
			const h = nodeHeight(node);
			// Small promo / CTA frames (duplicate buttons)
			if (w < 900 && h < 500 && !findPrimaryHeading(node)?.includes("?")) {
				const title = findPrimaryHeading(node);
				if (title && /đặt lịch|xem chi tiết/i.test(title)) {
					i++;
					continue;
				}
			}
			const title = findPrimaryHeading(node) || node.n || `region-${i}`;
			const baseSlug = slugifyRegion(title, `region-${i}`);
			const folder = uniqueFolder(baseSlug, usedFolders);
			regions.push(
				makeRegion({
					pageSlug,
					parentSection,
					id: baseSlug,
					folder,
					regionType: "content",
					sourceIndices: [i],
					title: typeof title === "string" ? title : findPrimaryHeading(node),
				})
			);
			i++;
			continue;
		}

		i++;
	}

	return regions.sort((a, b) => a.sort - b.sort);
}

export function buildPageModuleRegions(pageTrees, pageSlug) {
	/** Layout chrome owned by `_layout.pug` — never emit as module regions. */
	const LAYOUT_OWNED = new Set(["header", "footer"]);

	const all = [];
	for (const section of pageTrees || []) {
		if (!section?.ch?.length) continue;
		if (section.ch.length === 1 && section.ch[0].t === "SHARED_REF") {
			const ref = section.ch[0].ref;
			if (LAYOUT_OWNED.has(ref)) continue;
			const folder = slugifyRegion(ref, "shared");
			all.push(
				makeRegion({
					pageSlug,
					parentSection: section.n,
					id: ref,
					folder,
					regionType: "shared-ref",
					sourceIndices: [0],
				})
			);
			continue;
		}
		all.push(...detectModuleRegions(section, pageSlug));
	}
	return mergeRegionOverrides(pageSlug, all).filter(
		(r) => !(r.regionType === "shared-ref" && LAYOUT_OWNED.has(r.id)),
	);
}

function mergeRegionOverrides(pageSlug, autoRegions) {
	const overridePath = path.join(OVERRIDES_DIR, `${pageSlug}.json`);
	if (!fs.existsSync(overridePath)) return autoRegions;
	try {
		const override = JSON.parse(fs.readFileSync(overridePath, "utf8"));
		if (override.replace) return override.regions;
		if (override.append?.length) return [...autoRegions, ...override.append];
	} catch {
		// ignore bad override files
	}
	return autoRegions;
}

const SHARED_REF_INCLUDES = {
	header: "../../../components/header/header.pug",
	footer: "../../../components/footer/footer.pug",
	"top-banner": "../../../components/banner/index.pug",
	".top-banner": "../../../components/banner/index.pug",
	"global-breadcrumb": "../../../components/breadcrumb/index.pug",
	".global-breadcrumb": "../../../components/breadcrumb/index.pug",
};

/** Page-entry include paths (relative to src/pages/{slug}.pug). */
const SHARED_REF_PAGE_INCLUDES = {
	"top-banner": "../components/banner/index.pug",
	".top-banner": "../components/banner/index.pug",
	"global-breadcrumb": "../components/breadcrumb/index.pug",
	".global-breadcrumb": "../components/breadcrumb/index.pug",
};

/** Pug include path for SHARED_REF (relative to src/modules/{page}/{section}/index.pug). */
export function sharedRefIncludePath(ref) {
	return SHARED_REF_INCLUDES[ref] || `../../../components/${ref}/index.pug`;
}

/** Pug include path for SHARED_REF chrome in the page entry. */
export function sharedRefPageIncludePath(ref) {
	return (
		SHARED_REF_PAGE_INCLUDES[ref] ||
		`../components/${String(ref || "").replace(/^\./, "")}/index.pug`
	);
}

export function expandSectionManifest(moduleRegions, pageSlug, legacyTree) {
	if (moduleRegions?.length) {
		return moduleRegions
			.map((r, idx) => {
				if (r.regionType === "shared-ref") {
					return `${idx + 1}. [SHARED_REF] ref="${r.id}" → include ${sharedRefPageIncludePath(r.id)} (page entry — do not scaffold a module)`;
				}
				return `${idx + 1}. "${r.title || r.id}" → src/modules/${pageSlug}/${r.folder}/`;
			})
			.join("\n");
	}
	const lines = [];
	let idx = 1;
	for (const node of legacyTree || []) {
		if (node.t === "SHARED_REF") {
			lines.push(
				`${idx}. [SHARED_REF] ref="${node.ref}" → include ${sharedRefPageIncludePath(node.ref)} (page entry — do not scaffold a module)`
			);
		} else {
			const folderName = (node.n || `section-${idx}`)
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
			lines.push(
				`${idx}. "${node.n || `section-${idx}`}" → src/modules/${pageSlug}/${folderName}/`
			);
		}
		idx++;
	}
	return lines.join("\n");
}

