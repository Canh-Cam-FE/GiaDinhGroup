/**
 * Shared JS utilities (single shallow import target).
 *
 * Convention:
 * - Put small, reusable, dependency-free helpers here.
 * - Modules should import from `../utils` (never from each other’s internals).
 * - Keep this file stable; if it grows too big, split by domain (still shallow) like `utils-dom.js`, `utils-events.js`.
 */

// =========================
// Config
// =========================
export const CONFIG = {
	breakpoint: 1200,
	scrollThreshold: 100,
	debug: false,
};

// =========================
// DOM helpers
// =========================
export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) =>
	Array.from(parent.querySelectorAll(selector));

// =========================
// Timing helpers
// =========================
export function throttle(fn, wait = 100) {
	let last = 0;
	let timeout = null;
	return (...args) => {
		const now = Date.now();
		if (now - last >= wait) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			last = now;
			fn(...args);
		} else if (!timeout) {
			timeout = setTimeout(() => {
				last = Date.now();
				timeout = null;
				fn(...args);
			}, wait - (now - last));
		}
	};
}

export function debounce(fn, wait = 300) {
	let timeout;
	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), wait);
	};
}

// =========================
// Boot helpers
// =========================
export const safeInit = (fn, name) => {
	try {
		fn();
		if (CONFIG.debug) console.log(`[INIT OK]: ${name}`);
	} catch (e) {
		console.error(`[INIT FAIL]: ${name}`, e);
	}
};

export function initEvents({ onScroll, onResize }) {
	// SCROLL (throttled)
	if (onScroll) window.addEventListener("scroll", throttle(onScroll, 100));

	// RESIZE (debounced)
	if (onResize) window.addEventListener("resize", debounce(onResize, 300));
}

