/**
 * Visual effects + enhancements (3rd-party driven).
 *
 * Put here:
 * - ScrollReveal / Lozad / Fancybox initialization glue
 * - Feature-detection before calling globals
 *
 * Avoid here:
 * - Creating/owning the libraries themselves (loaded elsewhere)
 */


import {
	initAnimations,

} from "./animations";

export function initEffects() {
	// ScrollReveal
	// ScrollReveal
	if (typeof ScrollReveal !== "undefined") {
		const sr = ScrollReveal({
			duration: 1000,
			distance: "20px",
			easing: "cubic-bezier(0.5, 0, 0, 1)",
			once: true,
		});

		// Fade Up
		sr.reveal(".fd-up", {
			origin: "bottom",
			delay: 200,
		});

		// Fade Down
		sr.reveal(".fd-down", {
			origin: "top",
			delay: 200,
		});

		// Fade Left
		sr.reveal(".fd-left", {
			origin: "right",
			delay: 200,
		});

		// Fade Right
		sr.reveal(".fd-right", {
			origin: "left",
			delay: 200,
		});

		// Fade In (zoom)
		sr.reveal(".fd-in", {
			scale: 0.9,
			opacity: 0,
			delay: 200,
			distance: "0px",
		});

		// Optional stagger for children
		sr.reveal(".stagger > *", {
			origin: "bottom",
			interval: 120,
		});
	}

	// Lozad (lazy load) — single universal observer
	if (typeof lozad !== "undefined") {
		window.lazyLoader = lozad(".lozad", {
			rootMargin: "200px 0px",
			threshold: 0,
		});
		window.lazyLoader.observe();
	}

	// Fancybox
	if (typeof Fancybox !== "undefined") {
		Fancybox.bind("[data-fancybox]");
	}



	if ($(".news-detail").length) {

		// Find all iframes inside .news-detail
		$(".news-detail iframe").each(function () {
			const $iframe = $(this);

			// Skip if iframe is inside .pdf-iframe
			if ($iframe.closest(".pdf-iframe").length === 0) {

				// Prevent double wrapping
				if (!$iframe.parent().hasClass("iframe-ratio")) {
					$iframe.wrap("<div class='iframe-ratio'></div>");
				}
			}
		});
	}

	wrapTextWords(".text-fd-up");
	wrapTextWords(".text-slide-up");
	initTextSlideUpObserver();
	// ── Generic page-wide animations (use default selectors) ────────────────
	initAnimations();
}

function wrapTextWords(selector) {
	document.querySelectorAll(selector).forEach((el) => {
		if (el.dataset.wordsWrapped) return;

		let wordIndex = 0;

		function processNode(node) {
			if (node.nodeType === Node.TEXT_NODE) {
				const words = node.nodeValue.split(/\s+/).filter((w) => w.trim() !== "");

				return words
					.map((word) => {
						const span = `<span class="word" style="--i:${wordIndex}">${word}&nbsp;</span>`;
						wordIndex++;
						return span;
					})
					.join("");
			} else if (node.nodeName.toLowerCase() === "br") {
				return "<br>";
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const innerHTML = Array.from(node.childNodes).map(processNode).join("");
				const clone = node.cloneNode(false);
				clone.innerHTML = innerHTML;
				return clone.outerHTML;
			}
			return node.outerHTML || node.nodeValue || "";
		}

		const newHTML = Array.from(el.childNodes).map(processNode).join("");

		el.innerHTML = newHTML;
		el.dataset.wordsWrapped = "true";
	});
}

function initTextSlideUpObserver() {
	const elements = document.querySelectorAll(".text-slide-up");
	if (!elements.length) return;

	const reveal = (el) => {
		el.classList.remove("is-visible");
		void el.offsetWidth;
		el.classList.add("is-visible");
	};

	const hide = (el) => {
		el.classList.remove("is-visible");
	};

	if (!("IntersectionObserver" in window)) {
		elements.forEach(reveal);
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					reveal(entry.target);
				} else {
					hide(entry.target);
				}
			});
		},
		{ rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
	);

	elements.forEach((el) => observer.observe(el));
}