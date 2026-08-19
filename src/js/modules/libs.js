/**
 * Third-party library init (thin wrappers).
 *
 * Put here:
 * - Central place to initialize libraries that are loaded globally
 * - Small glue code only
 *
 * Avoid here:
 * - Feature logic that depends on libs (keep that in the feature module)
 */
export function initLibs() {
	if (typeof Fancybox !== "undefined") {
		Fancybox.bind('[data-fancybox^="gallery-image"]', {
			parentEl: document.body,

			Thumbs: {
				autoStart: true,
			},
		});

		// Everything else except gallery-
		Fancybox.bind('[data-fancybox]:not([data-fancybox^="gallery-image"])', {
			parentEl: document.body,
		});

	}

	// Lozad is initialized globally via window.lazyLoader in effect.js
}