/**
 * Header/nav interactions.
 *
 * Put here:
 * - Menu open/close, search open/close, overlay toggles
 * - Click-outside behaviors for nav/search
 *
 * Avoid here:
 * - Heavy layout logic or unrelated UI widgets (keep those in `ui.js` or a new module)
 */
import { $ } from "../utils";

export function initNav() {
	const menuToggle = $(".site-menu-toggle");
	const closeMenu = $(".close-menu");
	const searchToggle = $(".search-toggle");
	const bodyElement = $("body");

	const menuMobile = $(".mobile-nav-wrap");
	const searchWrap = $(".searchbox");
	const closeSearch = $(".close-search");
	const hamburger = $(".hamburger");




	if (closeSearch !== null) {
		closeSearch.addEventListener("click", function () {
			searchWrap.classList.remove("is-open");
			searchToggle.classList.remove("is-open");
		});
	}

	const body = document.body;

	// Open menu
	menuToggle?.addEventListener("click", (e) => {
		e.preventDefault();
		menuMobile?.classList.toggle("is-open");
		hamburger?.classList.toggle("is-active");
		body.classList.toggle("overlay-bg");
	});

	// Close menu
	closeMenu?.addEventListener("click", () => {
		menuMobile?.classList.remove("is-open");
		hamburger?.classList.remove("is-active");
		body.classList.remove("overlay-bg");
	});

	// Search toggle
	searchToggle?.addEventListener("click", () => {
		searchToggle?.classList.toggle("is-open");
		searchWrap?.classList.toggle("is-open");
		bodyElement?.classList.toggle("overlay-bg");
	});

	// Click outside close
	document.addEventListener("click", (e) => {
		const target = e.target;

		if (
			searchWrap?.classList.contains("is-open") &&
			!target.closest(".searchbox, .search-toggle")
		) {
			searchWrap.classList.remove("is-open");
			bodyElement?.classList.remove("overlay-bg");
			searchToggle.classList.remove("is-open");
		}

		if (
			menuMobile?.classList.contains("is-open") &&
			!target.closest(".mobile-nav-wrap, .site-menu-toggle")
		) {
			menuMobile.classList.remove("is-open");
			hamburger?.classList.remove("is-active");
			body.classList.remove("overlay-bg");
		}
	});
}