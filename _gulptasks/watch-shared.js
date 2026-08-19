/** Shared BrowserSync + gulp-watch settings for server.js and deploy.js */

export const watchOpts = {
	delay: 125,
	awaitWriteFinish: {
		stabilityThreshold: 200,
		pollInterval: 50,
	},
};

export const bsOptions = {
	notify: false,
	open: false,
	reloadDebounce: 300,
	injectChanges: true,
	server: { baseDir: "dist" },
	port: 8000,
};

/** Must match copy.js image glob (lowercase + uppercase extensions). */
export const imageWatchGlob =
	"src/img/**/*.{svg,png,jpg,jpeg,gif,webp,mp4,SVG,PNG,JPG,JPEG,GIF,WEBP,MP4}";

export const distReloadGlob = [
	"dist/**/*.html",
	"dist/css/**/*.css",
	"dist/js/**/*.js",
];
