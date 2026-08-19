/**
 * Generic UI widgets & interactions (page-agnostic).
 *
 * Put here:
 * - Toggles, tabs, accordions, "read more", mobile filter sheet
 *
 * Avoid here:
 * - Nav-specific code (use `nav.js`)
 * - Third-party library setup (use `libs.js`)
 */
export function initUI() {
	// =========================
	// FILTER TOGGLE (mobile)
	// =========================
	const filterToggle = document.querySelector(".filter-toggle");
	const closeFilter = document.querySelector(".close-filter");
	const mobileFilter = document.querySelector(".mobile-filter-wrap");

	const cardHover = $('.card-option');
	try {

		if (cardHover !== null) {


			cardHover.on('mouseenter', function () {
				$('.card-option').removeClass('is-active');
				$(this).toggleClass('is-active');
			});
		}
	} catch (error) {

	}


	try {

		const bgContainer = $(".section-hover .bg-placeholder");
		$(".section-hover .item-bg").each(function () {
			$(this).on("mouseenter", function () {
				let srcImage = $(this).attr("data-src");
				bgContainer[0].style.setProperty("--bg-hover", `url(${srcImage})`);
				bgContainer.css("--bg-hover", `url(${srcImage})`);
			});
		});

		bgContainer.on("mouseenter", function () {
			$(this).addClass("active");
		});
		bgContainer.on("mouseleave", function () {
			$(this).removeClass("active");
		});

	} catch (error) {
		console.log(error);
	}



	$(".mobile-menu-nav .menu-item > a,.nav-primary-menu .menu-item > a").wrap("<div class='title'></div>");
	$(".menu-item-has-children >.title").append("<div class='icon'></div>");

	$(".mobile-menu-nav .menu-item-has-children .title .icon").on("click", function () {
		$(this).parent().next().slideToggle();
		$(this).parent().toggleClass('is-active');
	});

	try {

		const bgContainer = $(".section-hover .bg-placeholder");
		$(".section-hover .item-bg").each(function () {
			$(this).on("mouseenter", function () {
				let srcImage = $(this).attr("data-src");
				bgContainer[0].style.setProperty("--bg-hover", `url(${srcImage})`);
				bgContainer.css("--bg-hover", `url(${srcImage})`);
			});
		});

		bgContainer.on("mouseenter", function () {
			$(this).addClass("active");
		});
		bgContainer.on("mouseleave", function () {
			$(this).removeClass("active");
		});

	} catch (error) {
		console.log(error);
	}

	document.querySelectorAll('.drop-menu .icon').forEach(icon => {
		icon.addEventListener('click', function (e) {
			e.stopPropagation();

			const current = this.closest('.drop-menu');
			const isActive = current.classList.contains('active');

			document.querySelectorAll('.drop-menu').forEach(item => {
				item.classList.remove('active');
			});

			if (!isActive) {
				current.classList.add('active');
			}
		});
	});
	document.querySelectorAll('.toggle-item .title').forEach(title => {
		title.addEventListener('click', function () {
			const current = this.closest('.toggle-item');
			const isActive = current.classList.contains('is-toggle');

			const parent = current.parentElement;

			// close all
			parent.querySelectorAll('.toggle-item').forEach(item => {
				item.classList.remove('is-toggle');
			});

			// reopen if it was closed
			if (!isActive) {
				current.classList.add('is-toggle');
			}
		});
	});

	if (filterToggle && mobileFilter) {
		filterToggle.addEventListener("click", () => {
			mobileFilter.classList.add("is-open");
		});
	}

	if (closeFilter && mobileFilter) {
		closeFilter.addEventListener("click", () => {
			mobileFilter.classList.remove("is-open");
		});
	}

	// =========================
	// SIDE NAV TOGGLE
	// =========================
	document.querySelectorAll(".side-nav-mobile .title-nav").forEach((el) => {
		el.addEventListener("click", function () {
			const sideNav = document.querySelector(".side-nav");
			if (!sideNav) return;

			const isHidden =
				sideNav.style.display === "none" ||
				getComputedStyle(sideNav).display === "none";

			sideNav.style.display = isHidden ? "block" : "none";
			this.parentElement.classList.toggle("is-active");
		});
	});

	// =========================
	// TABS INIT
	// =========================
	document.querySelectorAll("section").forEach((section) => {
		const items = section.querySelectorAll(".tab-item");
		if (!items.length) return; // SAFETY: Skip if no tab items exist

		items.forEach((el) => (el.style.display = "none"));

		const active = section.querySelector(".tab-item.active");

		if (active) {
			active.style.display = "block";
		} else {
			const firstItem = items[0];
			if (firstItem) {
				firstItem.style.display = "block";
				firstItem.classList.add("active");
			}

			const firstNav = section.querySelector(".tab-nav li:first-child");
			if (firstNav) {
				firstNav.classList.add("active");
				firstNav.parentElement
					?.querySelectorAll("li")
					.forEach((li) => {
						if (li !== firstNav) li.classList.remove("active");
					});
			}
		}
	});

	if ($(".sticky-nav").length) {
		$(".sticky-nav").scrollToFixed({
			zIndex: 99,
			// Dynamically match header height so the nav snaps flush below it
			marginTop: function () {
				return $("header").outerHeight();
			},
			limit: function limit() {
				return (
					$("footer").offset().top -
					$("header").outerHeight() -
					$(".sticky-nav").outerHeight()
				);
			},
			// Add the class when it becomes absolute (reaches the limit)
			preAbsolute: function () {
				$(this).addClass("reached-limit");
			},
			// Remove the class when it becomes fixed again
			preFixed: function () {
				$(this).removeClass("reached-limit");
			},
			// If you need to handle it unfixed above the scroll point
			postUnfixed: function () {
				$(this).removeClass("reached-limit");
			},
		});
	}

	$(".sticky-nav a").on("click", function (event) {
		if (this.hash !== "") {
			var hash = this.hash;
			var $target = $(hash);

			// Guard: target element must exist on this page
			if (!$target.length) return;

			event.preventDefault();

			var offset =
				$("header").outerHeight() + $(".sticky-nav").outerHeight();

			$("html, body").animate(
				{
					scrollTop: $target.offset().top - offset,
				},
				800
			);
		}
	});

	// =========================
	// READ MORE INIT
	// =========================
	const initReadMore = () => {
		document.querySelectorAll(".read-more-wrap").forEach((instance) => {
			const article = instance.querySelector(".article");
			const buttonReadMore = instance.querySelector(".btn-read-more");

			// SAFETY: If a tab has .read-more-wrap but is missing the article or buttonReadMore inside, skip it to prevent errors.
			if (!article || !buttonReadMore) return;

			// Skip if element is currently hidden
			if (article.offsetParent === null) return;

			const isMobile = window.innerWidth < 1200;
			const heightLimit = isMobile ? 300 : 400;

			// reset first
			article.style.height = "";
			article.style.overflow = "";
			buttonReadMore.classList.remove("hide");

			const fullHeight = article.scrollHeight;
			if (fullHeight <= heightLimit) {
				buttonReadMore.classList.add("hide");
				return;
			}

			if (!instance.classList.contains('is-expanded')) {
				article.style.height = heightLimit + "px";
				article.style.overflow = "hidden";
			}
		});
	};

	setTimeout(() => {
		initReadMore();
	}, 50);

	let isMobile = window.innerWidth < 1200;
	window.addEventListener("resize", () => {
		const newIsMobile = window.innerWidth < 1200;
		if (newIsMobile !== isMobile) {
			isMobile = newIsMobile;
			initReadMore();
		}
	});

	// =========================
	// READ MORE TOGGLE EVENT
	// =========================
	document.addEventListener("click", (e) => {
		const readMoreBtn = e.target.closest(".btn-read-more");
		if (readMoreBtn && !readMoreBtn.classList.contains("hide")) {
			e.preventDefault();

			const wrap = readMoreBtn.closest(".read-more-wrap");
			// SAFETY: Ensure the wrap exists
			if (!wrap) return;

			const article = wrap.querySelector(".article");
			// SAFETY: Ensure the article exists
			if (!article) return;

			wrap.classList.toggle("is-expanded");

			if (wrap.classList.contains("is-expanded")) {
				article.style.height = article.scrollHeight + "px";
			} else {
				const isMob = window.innerWidth < 1200;
				article.style.height = (isMob ? 300 : 1500) + "px";
			}
		}
	});

	// =========================
	// GLOBAL CLICK (TABS)
	// =========================
	document.addEventListener("click", (e) => {
		const link = e.target.closest(".tab-nav a");
		if (!link) return;

		e.preventDefault();

		const nav = link.closest(".tab-nav");
		const section = link.closest("section");

		if (!nav || !section) return;

		nav.querySelectorAll("li").forEach((li) =>
			li.classList.remove("active")
		);
		link.closest("li")?.classList.add("active");

		const tab = link.getAttribute("data-type");
		if (!tab) return; // SAFETY: Ensure data-type attribute exists

		const items = section.querySelectorAll(".tab-item");

		items.forEach((el) => {
			el.style.display = "none";
			el.classList.remove("active");
			el.style.opacity = 0;
		});

		const target = section.querySelector("#" + tab);
		if (target) {
			target.style.display = "block";
			target.classList.add("active");

			initReadMore();

			let opacity = 0;
			const fade = () => {
				opacity += 0.1;
				target.style.opacity = opacity;
				if (opacity < 1) requestAnimationFrame(fade);
			};
			fade();
		}
	});
}

/**
 * data-js-* tab panels (gold standard: automation/reference/snippets/modules/tabs-example/).
 * Legacy `.tab-nav a[data-type]` tabs remain in initUI().
 */
function updateSwipersInPanel(panel) {
	if (!panel) return;
	panel.querySelectorAll(".swiper").forEach((el) => {
		if (el.swiper && typeof el.swiper.update === "function") {
			el.swiper.update();
		}
	});
}

function resolveDataJsTabPanelId(trigger) {
	return trigger.dataset.tab || trigger.getAttribute("aria-controls") || "";
}

function getDataJsTabPanels(section) {
	return section.querySelectorAll(
		'[role="tabpanel"][data-tab], [data-js-target$="-panel"][data-tab], .panel[data-tab]'
	);
}

function activateDataJsTab(section, panelId) {
	if (!section || !panelId) return;

	const triggers = section.querySelectorAll('button[data-js-action="switch-tab"]');
	triggers.forEach((btn) => {
		const isActive = resolveDataJsTabPanelId(btn) === panelId;
		btn.setAttribute("aria-selected", String(isActive));
		btn.setAttribute("aria-expanded", String(isActive));
	});

	let revealedPanel = null;
	getDataJsTabPanels(section).forEach((panel) => {
		const isTarget =
			panel.dataset.tab === panelId || panel.id === panelId;
		if (isTarget) {
			panel.removeAttribute("hidden");
			panel.classList.add("active");
			revealedPanel = panel;
		} else {
			panel.setAttribute("hidden", "");
			panel.classList.remove("active");
		}
	});

	updateSwipersInPanel(revealedPanel);
}

export function initDataJsTabs() {
	document.querySelectorAll("section").forEach((section) => {
		const triggers = section.querySelectorAll(
			'button[data-js-action="switch-tab"]'
		);
		if (!triggers.length) return;

		const panels = getDataJsTabPanels(section);
		if (!panels.length) return;

		const activeTrigger =
			section.querySelector(
				'button[data-js-action="switch-tab"][aria-selected="true"]'
			) || triggers[0];

		const initialPanelId = resolveDataJsTabPanelId(activeTrigger);
		if (initialPanelId) {
			activateDataJsTab(section, initialPanelId);
		}
	});

	document.addEventListener("click", (e) => {
		const trigger = e.target.closest(
			'button[data-js-action="switch-tab"]'
		);
		if (!trigger) return;

		e.preventDefault();

		const section = trigger.closest("section");
		if (!section) return;

		const panelId = resolveDataJsTabPanelId(trigger);
		if (!panelId) return;

		activateDataJsTab(section, panelId);
	});
}