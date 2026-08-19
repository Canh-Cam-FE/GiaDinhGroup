/**
 * Measures scrollbar width and sets --scrollbar-width on :root.
 * Drives --design-vw (see src/core/tailwind/viewport.sass) so fluid
 * clamp/rem math matches Figma's 1920px canvas, not raw 100vw.
 */
export function initViewport() {
	const root = document.documentElement;

	const measure = () => {
		const width = Math.max(0, window.innerWidth - root.clientWidth);
		root.style.setProperty("--scrollbar-width", `${width}px`);
	};

	measure();

	window.addEventListener("resize", measure, { passive: true });

	if (typeof ResizeObserver !== "undefined") {
		const ro = new ResizeObserver(measure);
		ro.observe(root);
	}
}
