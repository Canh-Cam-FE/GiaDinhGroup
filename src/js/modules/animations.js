/**
 * animations.js — Reusable GSAP + ScrollTrigger animation library.
 *
 * Each exported function is self-contained and configurable via an options
 * object. All functions guard against missing GSAP/ScrollTrigger globals so
 * they are safe to call unconditionally.
 *
 * Usage (ES module):
 *   import { initAnimations, fadeUpBlur, parallaxImage } from './animations';
 *
 *   // Run every animation on the page with their default CSS selectors:
 *   initAnimations();
 *
 *   // Or call individual primitives with custom selectors / options:
 *   fadeUpBlur('.my-card', { duration: 1, blurAmount: '8px' });
 *   parallaxImage('.hero-wrap', { yFrom: -20, yTo: 20 });
 */

/* ─── Guard ──────────────────────────────────────────────────────────────── */

function gsapReady() {
	if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
		console.warn("[animations] GSAP or ScrollTrigger is not loaded.");
		return false;
	}
	gsap.registerPlugin(ScrollTrigger);
	return true;
}

/* ─── Fade-up + blur ─────────────────────────────────────────────────────── */

/**
 * Fades elements up from below with a blur, triggered by scroll position.
 *
 * CSS selector (default): `.fd-up-blur`
 * HTML usage: <div class="fd-up-blur">…</div>
 *
 * @param {string|Element|Element[]} target  - CSS selector, Element, or array of Elements.
 * @param {object} [opts]
 * @param {number} [opts.y=20]               - Starting vertical offset (px).
 * @param {number} [opts.duration=0.8]       - Tween duration (seconds).
 * @param {string} [opts.blurAmount='12px']  - Starting blur radius.
 * @param {string} [opts.ease='power2.out']  - GSAP ease string.
 * @param {string} [opts.start='top 85%']    - ScrollTrigger start position.
 */
export function fadeUpBlur(target = ".fd-up-blur", opts = {}) {
	if (!gsapReady()) return;
	const {
		y = 20,
		duration = 0.8,
		blurAmount = "12px",
		ease = "power2.out",
		start = "top 85%",
	} = opts;

	gsap.utils.toArray(target).forEach((el) => {
		gsap.from(el, {
			y,
			opacity: 0,
			filter: `blur(${blurAmount})`,
			duration,
			ease,
			scrollTrigger: {
				trigger: el,
				start,
				toggleActions: "play none none reverse",
			},
		});
	});
}

/* ─── Text-up + blur (supports data-delay) ───────────────────────────────── */

/**
 * Same as fadeUpBlur but reads an optional `data-delay` attribute on each
 * element so staggered reveals can be authored purely in HTML.
 *
 * CSS selector (default): `.text-up-blur`
 * HTML usage: <p class="text-up-blur" data-delay="0.2">…</p>
 *
 * @param {string|Element|Element[]} target
 * @param {object} [opts]
 * @param {number} [opts.y=20]
 * @param {number} [opts.duration=0.9]
 * @param {string} [opts.blurAmount='12px']
 * @param {string} [opts.ease='power2.out']
 * @param {string} [opts.start='top 85%']
 */
export function textUpBlur(target = ".text-up-blur", opts = {}) {
	if (!gsapReady()) return;
	const {
		y = 20,
		duration = 0.9,
		blurAmount = "12px",
		ease = "power2.out",
		start = "top 85%",
	} = opts;

	gsap.utils.toArray(target).forEach((el) => {
		const delay = el.dataset.delay ? parseFloat(el.dataset.delay) : 0;

		gsap.from(el, {
			y,
			opacity: 0,
			filter: `blur(${blurAmount})`,
			duration,
			delay,
			ease,
			scrollTrigger: {
				trigger: el,
				start,
				toggleActions: "play none none reverse",
			},
		});
	});
}

/* ─── Scale + blur (scrub) ───────────────────────────────────────────────── */

/**
 * Scrubs elements from a scaled-down + blurred state to full size as the
 * user scrolls through a trigger section.
 *
 * CSS selector (default): `.fd-scale-blur`
 * HTML usage: <div class="fd-scale-blur">…</div>
 *
 * @param {string|Element|Element[]} target
 * @param {Element|string|null} [triggerEl=null] - Override scroll trigger element.
 *        Defaults to the element itself.
 * @param {object} [opts]
 * @param {number} [opts.scale=0.75]
 * @param {string} [opts.blurAmount='15px']
 * @param {string} [opts.start='top bottom']
 * @param {string} [opts.end='top 40%']
 * @param {number} [opts.scrub=1]
 */
export function scaleBlur(target = ".fd-scale-blur", triggerEl = null, opts = {}) {
	if (!gsapReady()) return;
	const {
		scale = 0.75,
		blurAmount = "15px",
		start = "top bottom",
		end = "top 40%",
		scrub = 1,
	} = opts;

	gsap.utils.toArray(target).forEach((el) => {
		gsap.from(el, {
			scale,
			filter: `blur(${blurAmount})`,
			transformOrigin: "center center",
			ease: "none",
			scrollTrigger: {
				trigger: triggerEl || el,
				start,
				end,
				scrub,
			},
		});
	});
}

/* ─── Scale-up + blur (scroll-reveal, NOT scrub) ─────────────────────────── */

/**
 * Reveals elements by scaling up from a smaller blurred state on scroll entry.
 * Uses toggleActions (not scrub) so the animation plays once and can reverse.
 *
 * CSS selector (default): `.scale-up-blur`
 * HTML usage: <div class="scale-up-blur">…</div>
 *
 * @param {string|Element|Element[]} target
 * @param {object} [opts]
 * @param {number} [opts.y=40]
 * @param {number} [opts.scale=0.85]
 * @param {number} [opts.duration=1.2]
 * @param {string} [opts.blurAmount='12px']
 * @param {string} [opts.ease='power2.out']
 * @param {string} [opts.start='top 85%']
 */
export function scaleUpBlur(target = ".scale-up-blur", opts = {}) {
	if (!gsapReady()) return;
	const {
		y = 40,
		scale = 0.85,
		duration = 1.2,
		blurAmount = "12px",
		ease = "power2.out",
		start = "top 85%",
	} = opts;

	gsap.utils.toArray(target).forEach((el) => {
		gsap.from(el, {
			y,
			opacity: 0,
			scale,
			filter: `blur(${blurAmount})`,
			transformOrigin: "center center",
			duration,
			ease,
			scrollTrigger: {
				trigger: el,
				start,
				toggleActions: "play none none reverse",
			},
		});
	});
}

/* ─── 3-D cinematic class-toggle reveal ──────────────────────────────────── */

/**
 * Toggles a `.show` class on elements as they enter / leave the viewport.
 * The actual 3-D animation is handled entirely in CSS on `.reveal-3d-cinematic.show`.
 *
 * CSS selector (default): `.reveal-3d-cinematic`
 * HTML usage: <div class="reveal-3d-cinematic">…</div>
 *
 * @param {string|Element|Element[]} target
 * @param {object} [opts]
 * @param {string} [opts.start='top 85%']
 * @param {string} [opts.showClass='show']
 */
export function reveal3dCinematic(target = ".reveal-3d-cinematic", opts = {}) {
	if (!gsapReady()) return;
	const { start = "top 85%", showClass = "show" } = opts;

	gsap.utils.toArray(target).forEach((el) => {
		ScrollTrigger.create({
			trigger: el,
			start,
			onEnter: () => el.classList.add(showClass),
			onLeaveBack: () => el.classList.remove(showClass),
		});
	});
}

/* ─── Parallax image (light, ±15 %) ──────────────────────────────────────── */

/**
 * Applies a subtle vertical parallax to the first `<img>` inside each wrapper.
 *
 * CSS selector (default): `.parallax-fixed-wrap`
 * HTML usage: <div class="parallax-fixed-wrap"><img …></div>
 *
 * @param {string|Element|Element[]} target
 * @param {object} [opts]
 * @param {number} [opts.yFrom=-15]   - yPercent at scroll start.
 * @param {number} [opts.yTo=15]      - yPercent at scroll end.
 * @param {boolean|number} [opts.scrub=true]
 * @param {string} [opts.start='top bottom']
 * @param {string} [opts.end='bottom top']
 */
export function parallaxImage(target = ".parallax-fixed-wrap", opts = {}) {
	if (!gsapReady()) return;
	const { yFrom = -15, yTo = 15, scrub = true, start = "top bottom", end = "bottom top" } = opts;

	gsap.utils.toArray(target).forEach((wrap) => {
		const img = wrap.querySelector("img");
		if (!img) return;

		gsap.fromTo(
			img,
			{ yPercent: yFrom },
			{
				yPercent: yTo,
				ease: "none",
				scrollTrigger: {
					trigger: wrap,
					start,
					end,
					scrub,
				},
			}
		);
	});
}

/* ─── Inner parallax (heavy, ±25 %) ──────────────────────────────────────── */

/**
 * A heavier parallax variant with a momentum scrub for a luxurious feel.
 *
 * CSS selector (default): `.inner-parallax`
 * HTML usage: <div class="inner-parallax"><img …></div>
 *
 * @param {string|Element|Element[]} target
 * @param {object} [opts]
 * @param {number} [opts.yFrom=-25]
 * @param {number} [opts.yTo=25]
 * @param {number} [opts.scrub=1.5]
 * @param {string} [opts.start='top bottom']
 * @param {string} [opts.end='bottom top']
 */
export function innerParallax(target = ".inner-parallax", opts = {}) {
	if (!gsapReady()) return;
	const { yFrom = -25, yTo = 25, scrub = 1.5, start = "top bottom", end = "bottom top" } = opts;

	gsap.utils.toArray(target).forEach((wrap) => {
		const img = wrap.querySelector("img");
		if (!img) return;

		gsap.fromTo(
			img,
			{ yPercent: yFrom },
			{
				yPercent: yTo,
				ease: "none",
				scrollTrigger: {
					trigger: wrap,
					start,
					end,
					scrub,
				},
			}
		);
	});
}

/* ─── Inner blur parallax (scale-blur reveal + parallax combined) ─────────── */

/**
 * Combination animation: scale+blur reveal on enter (or instant play if
 * already in the above-the-fold area), plus a long-track parallax on the
 * child `<img>`.
 *
 * CSS selector (default): `.inner-blur-parallax`
 * HTML usage: <div class="inner-blur-parallax"><img …></div>
 *
 * @param {string|Element|Element[]} target
 * @param {object} [opts]
 * @param {number} [opts.scale=0.75]
 * @param {string} [opts.blurAmount='15px']
 * @param {number} [opts.revealDuration=1.2]   - Duration when playing instantly (above fold).
 * @param {number} [opts.revealScrub=1]         - Scrub value for scroll-linked reveal.
 * @param {number} [opts.parallaxScrub=1.5]
 * @param {number} [opts.yFrom=-25]
 * @param {number} [opts.yTo=25]
 */
export function innerBlurParallax(target = ".inner-blur-parallax", opts = {}) {
	if (!gsapReady()) return;
	const {
		scale = 0.75,
		blurAmount = "15px",
		revealDuration = 1.2,
		revealScrub = 1,
		parallaxScrub = 1.5,
		yFrom = -25,
		yTo = 25,
	} = opts;

	gsap.utils.toArray(target).forEach((wrap) => {
		const img = wrap.querySelector("img");
		if (!img) return;

		const isAboveFold = wrap.getBoundingClientRect().top < window.innerHeight;

		if (isAboveFold) {
			// Already visible on load — play the reveal immediately, no scroll dependency.
			gsap.from(wrap, {
				scale,
				filter: `blur(${blurAmount})`,
				transformOrigin: "center center",
				ease: "power2.out",
				duration: revealDuration,
			});
		} else {
			// Scroll-linked scale+blur reveal.
			gsap.from(wrap, {
				scale,
				filter: `blur(${blurAmount})`,
				transformOrigin: "center center",
				ease: "power2.out",
				scrollTrigger: {
					trigger: wrap,
					start: "top bottom",
					end: "top 40%",
					scrub: revealScrub,
					invalidateOnRefresh: true,
				},
			});
		}

		// Long-track image parallax runs regardless of fold position.
		gsap.fromTo(
			img,
			{ yPercent: yFrom },
			{
				yPercent: yTo,
				ease: "none",
				scrollTrigger: {
					trigger: wrap,
					start: isAboveFold ? "top top" : "top bottom",
					end: "bottom top",
					scrub: parallaxScrub,
					invalidateOnRefresh: true,
				},
			}
		);
	});
}

/* ─── Generic fade-in (no blur) ─────────────────────────────────────────── */

/**
 * Simple opacity + y fade-in triggered by scroll. Useful for content blocks.
 *
 * @param {string|Element} target     - CSS selector or Element.
 * @param {Element|string} [trigger]  - ScrollTrigger trigger element (defaults to target).
 * @param {object} [opts]
 * @param {number} [opts.y=30]
 * @param {number} [opts.duration=1]
 * @param {string} [opts.ease='power2.out']
 * @param {string} [opts.start='top 60%']
 */
export function fadeIn(target, trigger, opts = {}) {
	if (!gsapReady()) return;
	const { y = 30, duration = 1, ease = "power2.out", start = "top 60%" } = opts;

	gsap.from(target, {
		opacity: 0,
		y,
		duration,
		ease,
		scrollTrigger: {
			trigger: trigger || target,
			start,
			toggleActions: "play none none reverse",
		},
	});
}

/* ─── initAnimations — convenience bootstrap ─────────────────────────────── */

/**
 * Runs all animation primitives against their default CSS selectors.
 * Drop this single call into any page init to activate the full suite.
 *
 * Individual selector / option overrides can still be passed as needed:
 *
 *   initAnimations({
 *     fadeUpBlur:  { selector: '.my-card', opts: { duration: 1 } },
 *     scaleUpBlur: { selector: '.hero', opts: { scale: 0.9 } },
 *   });
 *
 * @param {object} [config={}] - Per-animation overrides.
 */
export function initAnimations(config = {}) {
	if (!gsapReady()) return;

	const get = (key, defaultSel) => ({
		selector: config[key]?.selector ?? defaultSel,
		opts: config[key]?.opts ?? {},
	});

	const fu = get("fadeUpBlur", ".fd-up-blur");
	fadeUpBlur(fu.selector, fu.opts);

	const tu = get("textUpBlur", ".text-up-blur");
	textUpBlur(tu.selector, tu.opts);

	const sb = get("scaleBlur", ".fd-scale-blur");
	scaleBlur(sb.selector, null, sb.opts);

	const sbu = get("scaleUpBlur", ".scale-up-blur");
	scaleUpBlur(sbu.selector, sbu.opts);

	const r3d = get("reveal3dCinematic", ".reveal-3d-cinematic");
	reveal3dCinematic(r3d.selector, r3d.opts);

	const pi = get("parallaxImage", ".parallax-fixed-wrap");
	parallaxImage(pi.selector, pi.opts);

	const ip = get("innerParallax", ".inner-parallax");
	innerParallax(ip.selector, ip.opts);

	const ibp = get("innerBlurParallax", ".inner-blur-parallax");
	innerBlurParallax(ibp.selector, ibp.opts);
}
