gsap.registerPlugin(ScrollTrigger);


export function initStickyElements() {
	try {


		if (
			$(".news-detail .social-network")
				.length
		) {
			$(
				".news-detail .social-network"
			).scrollToFixed({
				zIndex: 99,

				marginTop: 100,

				limit: function () {
					return (
						$("footer").offset().top -
						$("header").outerHeight() -
						100
					);
				},

				postUnfixed: function () {
					$(this).addClass(
						"reached-limit"
					);
				},

				preFixed: function () {
					$(this).removeClass(
						"reached-limit"
					);
				}
			});
		}

		if (
			$(window).width() > 1024 &&
			$(".home-news .sticky-block")
				.length
		) {
			$(
				".home-news .sticky-block"
			).scrollToFixed({
				zIndex: 99,

				marginTop: function () {
					return (
						$("header").outerHeight() || 0
					);
				},

				limit: function () {
					const $section = $(".home-news");
					const sectionTop = $section.offset()?.top || 0;
					const sectionHeight =
						$section.outerHeight() || 0;
					const stickyHeight =
						$(".home-news .sticky-block").outerHeight(true) || 0;
					const headerHeight =
						$("header").outerHeight() || 0;

					return (
						sectionTop +
						sectionHeight -
						stickyHeight -
						headerHeight
					);
				}
			});
		}




	} catch (error) {
		console.error(
			"Sticky elements error:",
			error
		);
	}
}
initStickyElements();

function updateStickyNavActive() {
	const $stickyNav = $(".sticky-nav");
	const $header = $("header");
	const $sections = $(".scroll-section-wrap .anchor-section-id");

	if (!$stickyNav.length || !$sections.length) return;

	const scrollDistance = $(window).scrollTop();
	const offset = $stickyNav.outerHeight() + $header.outerHeight() + 1;
	let activeIndex = 0;

	$sections.each(function (i) {
		if ($(this).offset().top - offset <= scrollDistance) {
			activeIndex = i;
		}
	});

	$stickyNav.find("li.is-active").removeClass("is-active");
	$stickyNav.find("li").eq(activeIndex).addClass("is-active");
}


export function initScroll() {

	const onScroll = () => {
		const scrollTop = window.scrollY;



		// Back-to-top visibility
		const backTop = document.querySelector(".back-to-top");

		if (backTop) {
			backTop.classList.toggle("show", scrollTop > 300);
		}
		updateStickyNavActive();
	};

	window.addEventListener("scroll", throttle(onScroll, 100));



}



import { CONFIG, throttle, debounce } from "../utils";

export function initBackToTop() {
	const backTop = document.querySelector(".back-to-top");
	if (!backTop || backTop.dataset.bound) return;

	backTop.dataset.bound = "true";
	backTop.addEventListener("click", (e) => {
		e.preventDefault();
		window.scrollTo({ top: 0, behavior: "smooth" });
	});
}


let lastScrollTop = 0;

export function handleScroll() {

	// Centralised toggle so both the scroll listener and the initial/load
	// check always use the same logic.
	const applyScrollState = () => {
		const scrollTop = window.scrollY;

		// Bug fix 1: use >= so the class is reliably removed when
		// scrollTop drops back to exactly the threshold (or below).
		document.body.classList.toggle(
			"minimize",
			scrollTop >= CONFIG.scrollThreshold
		);

		// Back-to-top visibility (kept here so one call handles both)
		const backTop = document.querySelector(".back-to-top");
		if (backTop) {
			backTop.classList.toggle("show", scrollTop > 300);
		}
	};

	// Bug fix 2: re-run after the browser has restored the scroll
	// position on refresh (browsers may restore scroll AFTER JS runs).
	window.addEventListener("load", applyScrollState, { once: true });

	// Initial call for the current session's scroll position.
	applyScrollState();

	// Back-to-top click handler (register once, not inside the scroll loop)
	const backTop = document.querySelector(".back-to-top");
	if (backTop) {
		backTop.addEventListener("click", (e) => {
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	}

	window.addEventListener("scroll", throttle(applyScrollState, 100));
	updateStickyNavActive();
}
