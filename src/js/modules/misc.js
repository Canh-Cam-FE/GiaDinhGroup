/**
 * Misc small behaviors that don’t justify their own module (keep it small).
 *
 * Put here:
 * - Attribute-driven helpers (e.g. [setBackground])
 * - Small, isolated DOM behaviors
 *
 * Avoid here:
 * - Anything that grows big: split into a dedicated module as soon as it does
 */
export function initMisc() {
	// Background images
	document.querySelectorAll("[setBackground]").forEach((el) => {
		const url = el.getAttribute("setBackground");
		if (url) {
			el.style.backgroundImage = `url(${url})`;
		}
	});


	// Counter (if exists)
	const counters = document.querySelectorAll(".counter");
	const counterUp = window.counterUp?.default;

	if (counters.length && counterUp) {
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && !entry.target.classList.contains("done")) {
					counterUp(entry.target, { duration: 2000, delay: 200 });
					entry.target.classList.add("done");
				}
			});
		});

		counters.forEach((c) => observer.observe(c));
	}

	// new MappingListener({
	// 	selector: ".header-contact",
	// 	mobileWrapper: ".mobile-nav-wrap",
	// 	mobileMethod: "appendTo",
	// 	desktopWrapper: ".site-menu-toggle",
	// 	desktopMethod: "insertBefore",
	// 	breakpoint: 1200.1,
	// }).watch();



}