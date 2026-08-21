const plugin = require("tailwindcss/plugin");

// Layout constants (root font, design viewport) — not design tokens.
const layoutRules = require("./automation/config/layout-rules.json");

// Color + typography tokens from the DesignTokenIR pipeline (single source of truth):
//   json/system-design.json → ir:build → ir:resolve → emit:* → generated/*
// Regenerate with `npm run tokens`.
const generatedTokens = require("./generated/design-tokens");
const generatedTypography = require("./generated/typography");

const ROOT_FONT_SIZE = layoutRules.rootFontSizePx;
const BASE_VIEWPORT_WIDTH = layoutRules.designBaseWidthPx;
const SCROLLBAR_FALLBACK_PX = layoutRules.scrollbarFallbackPx ?? 15;

// Effective viewport: Figma 1920px canvas maps to (100vw − scrollbar), not raw 100vw.
// --scrollbar-width is measured in src/js/modules/viewport.js (0 on overlay scrollbars).
const DESIGN_VW = `var(--design-vw, calc(100vw - var(--scrollbar-width, ${SCROLLBAR_FALLBACK_PX}px)))`;

// --- CORE UTILITY FUNCTIONS ---

const calcVP = (size) => {
	if (typeof size !== 'number' || isNaN(size)) {
		console.warn(`calcVP: Invalid size value: ${size}`);
		return '0px';
	}
	return `calc(${size} / ${BASE_VIEWPORT_WIDTH} * ${DESIGN_VW})`;
};

// Simplified spacing calculation using REM instead of complex custom clamp for theme configuration
const calcSpacingRem = (size) => {
	if (typeof size !== 'number' || isNaN(size)) {
		console.warn(`calcSpacingRem: Invalid size value: ${size}`);
		return '0.25rem'; // Fallback for 4px
	}
	// Convert px size to rem based on standard 16px root or use your custom ROOT_FONT_SIZE
	// Using ROOT_FONT_SIZE for consistency with theme
	return `${size / ROOT_FONT_SIZE}rem`;
};


// Enhanced responsive font size (remains as original to keep custom min/max logic)
const calcFzVP = (size) => {
	if (typeof size !== 'number' || isNaN(size) || size <= 0) {
		console.warn(`calcFzVP: Invalid size value: ${size}`);
		return '1rem';
	}
	const getMinSize = (size) => {
		if (size <= 14) return size;
		if (size <= 20) return size - 2;
		if (size <= 30) return size - 4;
		if (size <= 38) return size - 8;
		if (size <= 60) return size - 12;
		if (size <= 80) return size - 16;
		if (size <= 100) return size - 28;
		return size - 4;
	};

	const min = Math.max(getMinSize(size), 12); // Accessibility minimum
	// Max value capped using rem conversion of the px size (based on ROOT_FONT_SIZE)
	const maxValue = `${size / ROOT_FONT_SIZE}rem`;

	// Preferred value using calcVP (vw-based)
	return `clamp(${min}px, ${calcVP(size)}, ${maxValue})`;
};

// Optimized numeric utilities generator (remains as original)
const generateUtilities = (config) => {
	const { start, end, step = 1, transform = (i) => i } = config;
	const utilities = {};

	for (let i = start; i <= end; i += step) {
		utilities[i] = transform(i);
	}
	return utilities;
};

// Pre-generate common ranges to avoid runtime computation
const COMMON_SIZES = [12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 40, 44, 48, 52, 56, 60, 64, 72];
// px that also have t-shirt aliases — listed explicitly above with lineHeight;
// excluded from the NUMERIC_ONLY spread so we don't overwrite the tuple form.
const FONT_SIZE_SEMANTIC_PX = [12, 14, 16, 18, 20, 24, 30, 36, 40, 48, 56, 72, 96, 128];
const NUMERIC_ONLY_FONT_SIZES = COMMON_SIZES.filter((px) => !FONT_SIZE_SEMANTIC_PX.includes(px));
const COMMON_LINE_HEIGHTS = [16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 52, 54, 56, 58, 60, 62, 64, 80];

const clampRange = (minSize, maxSize) => {
	const preferred = `calc(${maxSize} / ${BASE_VIEWPORT_WIDTH} * ${DESIGN_VW})`;
	const maxValueRem = `${maxSize / ROOT_FONT_SIZE}rem`;
	return `clamp(${minSize}px, ${preferred}, ${maxValueRem})`;
};

// --- MODULE EXPORT (TAILWIND CONFIG) ---

module.exports = {
	content: [
		"./src/dist/**/*.{html,js}",
		"./src/pages/**/*.pug",
		"./src/components/**/*.{sass,scss,pug}",
		"./src/modules/**/*.{sass,scss,pug}",
		"./src/core/design-system/**/*.sass",
	],

	// Guarantee all design-system typography component classes are always emitted.
	// Without this, JIT only generates classes it sees in content files — any
	// class token added to system-design.json but not yet used in a source file
	// is silently absent from the compiled CSS.
	safelist: generatedTypography.cssClasses,

	theme: {
		// Screens remain the same
		screens: {
			xs: "320px",
			sm: "576.1px",
			md: "768.1px",
			lg: "1024.1px",
			xl: "1200.1px",
			"2xl": "1600px",
			// Max-width screens
			"max-sm": { max: "576px" },
			"max-md": { max: "768px" },
			"max-lg": { max: "1024px" },
			"max-xl": { max: "1200px" },
			"max-2xl": { max: "1600px" },
		},

		// Aspect ratio remains the same
		aspectRatio: {
			auto: "auto",
			square: "1",
			video: "16/9",
			...Object.fromEntries(
				Array.from({ length: 16 }, (_, i) => [i + 1, `${i + 1}`])
			),
		},

		// Border Width: Simplified to use pixel values for easier utility usage
		borderWidth: {
			DEFAULT: "1px",
			0: "0",
			...generateUtilities({
				start: 2,
				end: 10,
				transform: (i) => `${i}px` // Using px, not rem conversion
			}),
		},

		// Spacing: Simplified to use the custom REM calculation for consistent scaling
		spacing: {
			0: "0",
			px: "1px",
			...generateUtilities({
				start: 1,
				end: 25,
				transform: (i) => calcSpacingRem(i * 4) // i * 4px converted to rem
			}),
			full: "100%",
		},

		extend: {
			// Font Size: t-shirt aliases + matching numeric keys (text-48 ≡ text-5xl).
			// Numeric keys let typography components @apply text-{px} and pick up calcFzVP.
			fontSize: {
				xs: [calcFzVP(12), { lineHeight: "1.4" }],
				sm: [calcFzVP(14), { lineHeight: "1.4" }],
				base: [calcFzVP(16), { lineHeight: "1.4" }],
				lg: [calcFzVP(18), { lineHeight: "1.4" }],
				xl: [calcFzVP(20), { lineHeight: "1.4" }],
				"2xl": [calcFzVP(24), { lineHeight: "1.35" }],
				"3xl": [calcFzVP(30), { lineHeight: "1.3" }],
				"4xl": [calcFzVP(36), { lineHeight: "1.3" }],
				"4.5xl": [calcFzVP(40), { lineHeight: "1.3" }],
				"5xl": [calcFzVP(48), { lineHeight: "1.25" }],
				"6xl": [calcFzVP(56), { lineHeight: "1.15" }],
				"7xl": [calcFzVP(72), { lineHeight: "1" }],
				"8xl": [calcFzVP(96), { lineHeight: "1" }],
				"9xl": [calcFzVP(128), { lineHeight: "1" }],
				// Numeric mirrors of t-shirt sizes (used by generated typography @apply text-N)
				12: [calcFzVP(12), { lineHeight: "1.4" }],
				14: [calcFzVP(14), { lineHeight: "1.4" }],
				16: [calcFzVP(16), { lineHeight: "1.4" }],
				18: [calcFzVP(18), { lineHeight: "1.4" }],
				20: [calcFzVP(20), { lineHeight: "1.4" }],
				24: [calcFzVP(24), { lineHeight: "1.35" }],
				30: [calcFzVP(30), { lineHeight: "1.3" }],
				32: [calcFzVP(32), { lineHeight: "1.3" }],
				36: [calcFzVP(36), { lineHeight: "1.3" }],
				40: [calcFzVP(40), { lineHeight: "1.3" }],
				48: [calcFzVP(48), { lineHeight: "1.25" }],
				56: [calcFzVP(56), { lineHeight: "1.15" }],
				60: [calcFzVP(60), { lineHeight: "1.2" }],
				64: [calcFzVP(64), { lineHeight: "1.2" }],
				70: [calcFzVP(70), { lineHeight: "1.2" }],
				72: [calcFzVP(72), { lineHeight: "1" }],
				96: [calcFzVP(96), { lineHeight: "1" }],
				120: [calcFzVP(120), { lineHeight: "1.15" }],
				128: [calcFzVP(128), { lineHeight: "1" }],
				140: [calcFzVP(140), { lineHeight: "1.14" }],
				400: [calcFzVP(400), { lineHeight: "1.2" }],

				...Object.fromEntries(
					NUMERIC_ONLY_FONT_SIZES.map((size) => [size, calcFzVP(size)])
				),
			},

			// Colors: DesignTokenIR → generated/design-tokens.js (spread first).
			// Chrome-only aliases below are intentional non-Figma utilities used by
			// shared header/footer/form UI (grey-* ladder, dark, danger, …).
			// Do NOT redeclare Figma-backed groups (`primary`, most of `secondary`)
			// as a whole object — that wipes IR keys such as secondary.utility-*.
			// Figma page tokens win for secondary-2 / secondary-3 / secondary-bg.
			colors: {
				...generatedTokens.colors,
				dark: "#000000",
				// Soft black for chrome; Figma Utility/black is pure #000000 in IR.
				black: "#111113",
				white: "#ffffff",
				green: "#5BB54B",
				red: "#ff0000",
				success: "#0079d5",
				danger: "#e30e00",

				secondary: {
					...(generatedTokens.colors.secondary || {}),
					// Chrome-only; not in Figma solid IR
					1: "#03bdcd",
				},
				grey: {
					...(generatedTokens.colors.grey || {}),
					// Non-Figma chrome ladder (see README / 03-colors-gradients.md).
					// Figma Utility/gray-* maps to gray-* from the generated spread above.
					50: "#f6f6f6",
					100: "#efefef",
					200: "#dcdcdc",
					300: "#bdbdbd",
					400: "#989898",
					500: "#818181",
					600: "#666666",
					700: "#525252",
					800: "#464646",
					900: "#3d3d3d",
					950: "#292929",
					main: "#252422",
				},
			},

			// borderRadius: Using simplified calcSpacingRem for consistency
			borderRadius: {
				0: "0",
				20: calcSpacingRem(80),
				...generateUtilities({
					start: 1,
					end: 10,
					transform: (i) => calcSpacingRem(i * 4) // Converted to rem
				}),
				full: "9999px",
			},
			// Font families: DesignTokenIR → generated/design-tokens.js.
			// The generated map is spread last so it owns every family Figma
			// knows about, including `sans`. Hardcoding it here is what made the
			// whole site render in Manrope while the design called for
			// Google Sans Flex, and what left icon2/icon3 pointing at each
			// other's typeface. Entries below are project extras with no Figma
			// counterpart; keep them until nothing @applies them.
			fontFamily: {
				Inter: ["'Inter'", "sans-serif"],
				"Mona-Sans": ["'Mona Sans'", "sans-serif"],
				Pinyon: ["'Pinyon Script'", "cursive"],
				Poppins: ["'Poppins'", "sans-serif"],
				"Segoe-UI": ["'Segoe UI'", "sans-serif"],
				"Playfair-Display": ["'Playfair Display'", "serif"],
				"NVN-Motherland-Signature": ["'NVN Motherland Signature'"],
				"Montserrat-Alternates": ["'Montserrat Alternates'", "sans-serif"],
				"Material-Icon": ["'Material Symbols Outlined'"],
				Awesome6: ["'Font Awesome 6 Pro'"],
				"sans-system": [
					"system-ui",
					"-apple-system",
					"BlinkMacSystemFont",
					"'Segoe UI'",
					"Arial",
					"Helvetica",
					"sans-serif",
				],
				...generatedTokens.fontFamily,
			},
			// boxShadow: Remains the same, correctly using calcVP for dynamic shadows
			boxShadow: {
				DEFAULT: "4px 4px 20px 4px rgba(0, 0, 0, 0.12)",
				soft: "0px 4px 40px 0px rgba(0, 0, 0, 0.04)",
				medium: `${calcVP(4)} ${calcVP(4)} ${calcVP(8)} ${calcVP(4)} rgba(0, 0, 0, 0.24)`,
				hard: `${calcVP(8)} ${calcVP(8)} ${calcVP(16)} ${calcVP(8)} rgba(0,0,0,0.4)`,
			},

			// zIndex remains the same
			zIndex: {
				...Object.fromEntries(
					[1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99, 100, 200, 900, 990, 999]
						.map(z => [z, z])
				),
			},

			// lineHeight remains the same
			lineHeight: {
				...Object.fromEntries(
					[100, 110, 115, 120, 125, 130, 135, 140, 145, 150].map(lh => [lh, `${lh}%`])
				),
				...Object.fromEntries(
					COMMON_LINE_HEIGHTS.map(lh => [lh, `${lh}px`])
				),
			},

			letterSpacing: {
				tightest: "-0.04em",
			},

			// ponytail: Figma only exposes gradient identifiers here, not full stop data for every key.
			// Keep existing macros that are in use and align the token names to system-design.json.
			backgroundImage: {
				"gradient-1": "linear-gradient(49deg, #FFF -8.18%, #5F5B5D 110.53%)",
				"gradient-2": "linear-gradient(49deg, #FFF -8.18%, #5F5B5D 110.53%)",
				"gradient-3": "linear-gradient(135deg, #FB0200 0%, #ff4757 100%)",
				"gradient-4": "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 100%)",
				"Gradient/1": "linear-gradient(49deg, #FFF -8.18%, #5F5B5D 110.53%)",
				"Gradient/2": "linear-gradient(49deg, #FFF -8.18%, #5F5B5D 110.53%)",
				"Gradient/bg": "linear-gradient(135deg, #FB0200 0%, #ff4757 100%)",
			},
		},
	},

	corePlugins: {
		container: false,
		aspectRatio: false, // Keep false as you have a custom utility for it
	},

	plugins: [
		// Typography component classes (.heading-*, .body-*, .heading-serif-*) from
		// generated/typography.js (DesignTokenIR emit:typography).
		plugin(({ addComponents }) => {
			addComponents(generatedTypography.components, { respectPrefix: false });
		}),

		plugin(({ addComponents, addUtilities, matchUtilities, theme }) => {
			// Custom utilities (streamlined, removed basic flex duplicates)
			// --- NEW: Box Shadow Utilities Generator ---
			const insetShadowStyle = (colorValue) => ({
				boxShadow: `0px 0px 0px 3px ${colorValue} inset`,
			});

			// Flatten color config to iterate over all named colors (primary, grey, etc.)
			const allColors = theme('colors');
			const shadowColorUtilities = {};

			// Extract all simple and nested colors
			for (const colorName in allColors) {
				const colorValue = allColors[colorName];

				if (typeof colorValue === 'string') {
					// Simple color (e.g., 'dark', 'white', 'green', 'success', 'danger')
					shadowColorUtilities[`.shadow-inset-1-${colorName}`] = insetShadowStyle(colorValue);
				} else if (typeof colorValue === 'object' && colorValue !== null) {
					// Nested color scale (e.g., 'primary', 'grey')
					for (const shade in colorValue) {
						const shadeValue = colorValue[shade];
						// Ignore non-string values like '1', '2', '3' in primary
						if (typeof shadeValue === 'string' && shadeValue.startsWith('#')) {
							shadowColorUtilities[`.shadow-inset-1-${colorName}-${shade}`] = insetShadowStyle(shadeValue);
						}
					}
				}
			};
			const flexUtilities = {
				// Text Gradients remain
				".text-gradient-1": {
					"-webkit-background-clip": "text",
					"-webkit-text-fill-color": "transparent",
					"background-image":
						"linear-gradient(105.88deg, #FFB800 0%, #FF710D 85.28%)",
				},
				".text-gradient-2": {
					"-webkit-background-clip": "text",
					"-webkit-text-fill-color": "transparent",
					"background-image":
						" linear-gradient(106deg, #005BD2 18.64%, #006FFF 38.77%, #104891 77.4%)",
				},
				// Common combinations
				".flex-start": { display: "flex", justifyContent: "flex-start", alignItems: "center" },
				".flex-top": { display: "flex", justifyContent: "flex-start", alignItems: "flex-start" },
				".flex-end": { display: "flex", justifyContent: "flex-end", alignItems: "center" },
				".flex-center": { display: "flex", justifyContent: "center", alignItems: "center" },
				".flex-between": { display: "flex", justifyContent: "space-between", alignItems: "center" },
				".flex-around": { display: "flex", justifyContent: "space-around", alignItems: "center" },
				// Keep only advanced, non-native column combos
				".col-center": { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
				".col-reverse": { display: "flex", flexDirection: "column-reverse", justifyContent: "center", alignItems: "center" },
				".col-start": { display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center" },
				".col-end": { display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" },
				".col-between": { display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center" },
				".col-around": { display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: "center" },
				".col-evenly": { display: "flex", flexDirection: "column", justifyContent: "space-evenly", alignItems: "center" },
				".col-left": { display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center" },
				".col-right": { display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" },
				".col-top": { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" },
				".col-top-left": { display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start" },

				".col-top-right": { display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "flex-start" },
				".col-bottom-left": { display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-end" },
				".col-bottom-right": { display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "flex-end" },
				".col-stretch": { display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center" },

				// Keep grid and absolute position utilities
				".grid-center": { display: "grid", placeItems: "center" },
				".grid-start": { display: "grid", placeItems: "start" },
				".grid-end": { display: "grid", placeItems: "end" },
				".absolute-center": { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
				".absolute-x": { position: "absolute", left: "50%", transform: "translateX(-50%)" },
				".absolute-y": { position: "absolute", top: "50%", transform: "translateY(-50%)" },

				// Keep modern transitions
				".transition": { transition: ".4s all ease-in-out" },
				".transition-smooth": { transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" },
				".transition-bounce": { transition: "all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
			};

			// Components (Container & Button) remain the same
			const components = {
				".container": {
					width: "100%",
					maxWidth: "100%",
					marginLeft: "auto",
					marginRight: "auto",
					paddingLeft: "1rem",
					paddingRight: "1rem",
					"@screen sm": { maxWidth: "94vw" },
					"@screen md": { maxWidth: "92vw" },
					"@screen lg": { maxWidth: "90vw" },
					"@screen xl": { maxWidth: calcVP(1630) },
					"@screen 2xl": { maxWidth: calcVP(1440) },
				},
				".container-xxl": {
					width: "100%",
					maxWidth: "100%",
					marginLeft: "auto",
					marginRight: "auto",
					paddingLeft: "1rem",
					paddingRight: "1rem",
					"@screen sm": { maxWidth: "94vw" },
					"@screen md": { maxWidth: "92vw" },
					"@screen lg": { maxWidth: "90vw" },
					"@screen xl": { maxWidth: calcVP(1760) },
					"@screen 2xl": { maxWidth: calcVP(1760) },
				},
				".btn": {
					display: "inline-flex",
					justifyContent: "center",
					alignItems: "center",
					position: "relative",
					cursor: "pointer",
					transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
					overflow: "hidden",
					textDecoration: "none",
					"&:disabled": {
						opacity: "0.5",
						cursor: "not-allowed",
					},
				},

			};

			matchUtilities(
				{
					sq: (value) => {
						const getSmartMinSize = (size) => {
							if (size <= 16) return size;
							if (size <= 24) return size - 2;
							if (size <= 40) return size - 4;
							if (size <= 64) return size - 8;
							if (size <= 96) return size - 12;
							return size - 16;
						};

						const numericValue = Number(value);
						const isNumericValue = !isNaN(numericValue);
						const parsedValue = isNumericValue ? `${numericValue}px` : value;
						const smartMinValue = isNumericValue
							? `${Math.max(getSmartMinSize(numericValue), 12)}px`
							: value;
						const responsiveSize = isNumericValue
							? `clamp(${smartMinValue}, ${calcVP(numericValue)}, ${parsedValue})`
							: parsedValue;

						return {
							width: responsiveSize,
							height: responsiveSize,
							"min-width": smartMinValue,
							"min-height": smartMinValue,
							"flex-shrink": "0",

							// Center content
							display: "flex",
							"align-items": "center",
							"justify-content": "center",

							// Prevent oversized content breaking layout
							overflow: "hidden",

							// Icons
							"& > em, & > i, & > svg": {
								"max-width": "100%",
								"max-height": "100%",
								display: "block",
								"font-size": "inherit",
							},

							// Images
							"& > img, & picture > img": {
								width: "100%",
								height: "100%",
								"object-fit": "contain", // never crop
								display: "block",
							},
						};
					},
				},
				{ values: theme("spacing") }
			);

			addUtilities(flexUtilities);
			addComponents(components);
			addUtilities(shadowColorUtilities);
		}),

		// Unit conversion variants (Remains the same as it's the core of your dynamic system)
		plugin(({ addVariant, e }) => {
			addVariant("hover-fine", "@media (hover: hover) and (pointer: fine) { & }");

			// CLAMP VARIANT (The most powerful utility for fluid sizing)
			addVariant("clamp", ({ container, separator }) => {
				container.walkRules((rule) => {
					rule.selector = `.${e(`clamp${separator}`)}${rule.selector.slice(1)}`

					rule.walkDecls((decl) => {
						const trimmed = decl.value.trim();
						// Tailwind JIT strips brackets from py-[56-96] → "56-96" before this runs
						const bareRange = trimmed.match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);
						if (bareRange) {
							decl.value = clampRange(
								parseFloat(bareRange[1]),
								parseFloat(bareRange[2])
							);
							return;
						}
						// Bracket range syntax (if brackets are still present)
						if (decl.value.includes("[") && decl.value.includes("-") && decl.value.includes("]")) {
							decl.value = decl.value.replace(
								/\[(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\]/g,
								(_match, min, max) =>
									clampRange(parseFloat(min), parseFloat(max))
							);
						}
						// Handle single pixel values: w-[16px]
						else if (decl.value.includes("px")) {
							decl.value = decl.value.replace(
								/(-?\d+(?:\.\d+)?)px/g,
								(_match, pxValue) => {
									const size = parseFloat(pxValue);
									return clampRange(size, size);
								}
							);
						}
						// Handle rem values: w-[1rem]
						else if (decl.value.includes("rem") && !decl.value.includes("calc(")) {
							decl.value = decl.value.replace(
								/(-?\d+(?:\.\d+)?)rem/g,
								(_match, remValue) => {
									const size = parseFloat(remValue) * ROOT_FONT_SIZE;
									const min = Math.round(size * 0.75);
									const preferred = `calc(${size} / ${BASE_VIEWPORT_WIDTH} * ${DESIGN_VW})`;
									return `clamp(${min}px, ${preferred}, ${remValue}rem)`;
								}
							);
						}
					})
				})
			})

			// REM VARIANT (For forcing rem conversion on non-clamped values)
			addVariant("rem", ({ container, separator }) => {
				container.walkRules((rule) => {
					rule.selector = `.${e(
						`rem${separator}`
					)}${rule.selector.slice(1)}`
					rule.walkDecls((decl) => {
						if (decl.value.includes("clamp(")) {
							// If the value already uses clamp, simplify it to the max rem value
							decl.value = decl.value.replace(
								/clamp\((.*?),\s*(.*?)\s*,.*?\)/,
								(_, min, calc) => {
									// Extract the rem value from the clamp max argument (which often contains calc)
									const maxRem = calc.match(/(\d+(?:\.\d+)?rem)/g);
									return maxRem ? maxRem[0] : calc.trim() // Fallback to calc if rem not found
								}
							)
						} else if (decl.value.includes("px")) {
							// Convert the pixel number to rem
							decl.value = decl.value.replace(
								/(-?\d+(\.\d+)?)px/g,
								(match, p1) => {
									// Handle letter-spacing separately as it only accepts unitless numbers in px values
									if (decl.prop === "letter-spacing") {
										return `${parseFloat(p1) / ROOT_FONT_SIZE}rem`;
									}
									return `${parseFloat(p1) / ROOT_FONT_SIZE}rem`
								}
							)
						}
					})
				})
			})
			addVariant("ratio", ({ container, separator }) => {
				container.walkRules((rule) => {
					rule.selector = `.${e(
						`ratio${separator}`
					)}${rule.selector.slice(1)}`;
					rule.walkDecls((decl) => {
						const ratioValues = decl.value.split(" ");
						if (ratioValues.length === 2) {
							const num1 = parseInt(ratioValues[0]);
							const num2 = parseInt(ratioValues[1]);
							if (!isNaN(num1) && !isNaN(num2) && num2 !== 0) {
								const percentage = `${(num1 / num2) * 100}%`;
								decl.value = `${percentage}`;
							}
						}
					});
				});
			});

			// Removed `ratio` variant
		}),
	],
};
