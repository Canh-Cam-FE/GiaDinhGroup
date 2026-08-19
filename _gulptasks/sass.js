import { src, dest } from "gulp";
const sassCompiler = require("sass");
const gulpSass = require("gulp-sass")(sassCompiler);
import concat from "gulp-concat";
import cssnano from "cssnano";
import merge from "merge-stream";
import plumber from "gulp-plumber";
import sourcemaps from "gulp-sourcemaps";
var postcss = require("gulp-postcss");
import cssSort from "css-declaration-sorter";
import notify from "gulp-notify";

import autoprefixer from "autoprefixer";
// Get base file form node module

const sassOptions = {
	// Improve warning logs (file + line/col) instead of just a snippet.
	logger: {
		warn(message, { span } = {}) {
			const url = span?.url ? String(span.url) : "unknown";
			const line = typeof span?.start?.line === "number" ? span.start.line + 1 : "?";
			const col = typeof span?.start?.column === "number" ? span.start.column + 1 : "?";
			// eslint-disable-next-line no-console
			console.warn(`[sass] ${url}:${line}:${col} ${message}`);
		},
		debug(message) {
			// eslint-disable-next-line no-console
			console.debug(`[sass] ${message}`);
		},
	},
};

const buildSassStream = ({ source, output }) => src(source, { allowEmpty: true })
	.pipe(concat(output))
	.pipe(
		plumber({
			errorHandler: notify.onError("Error: <%= error.message %>"),
		})
	)
	.pipe(gulpSass(sassOptions).on("error", gulpSass.logError));

const sassPipeline = ({ source, sourceScss = null, output, minify = false }) => {
	const tailwindcss = require("tailwindcss");
	const processors = [tailwindcss("./tailwind.config.js"), autoprefixer()];

	if (minify) {
		processors.push(
			cssSort({ order: "concentric-css" }),
			cssnano({
				preset: ['default', {
					calc: false
				}]
			})
		);
	}

	const streams = [buildSassStream({ source, output: output.replace(/\.css$/, ".sass") })];

	if (sourceScss) {
		streams.push(buildSassStream({ source: sourceScss, output: output.replace(/\.css$/, ".scss") }));
	}

	return merge(...streams)
		.pipe(sourcemaps.init())
		.pipe(concat(output))
		.pipe(postcss(processors))
		.pipe(sourcemaps.write("."))
		.pipe(dest("dist/css"))
		.pipe(dest("styles"));
};

const tailwindSources = [
	"src/core/mixin.sass",
	"src/core/tailwind/import.sass",
	"src/core/tailwind/preflight.sass",
	"src/core/tailwind/*.sass",
	"src/core/tailwind/elements/*.sass",
	"src/core/design-system/*.sass",
	"src/core/animation-lib/_keyframes.sass",
	"src/core/animation-lib/_animation-classes.sass",
	"src/core/animation-lib/_hamburger.sass",
	"src/core/utility/*.sass",
];

const mainSources = [
	"src/core/mixin.sass",
	"src/components/**/*.sass",
	"src/modules/**/*.sass",
];

const mainScssSources = [
	"src/components/**/*.scss",
	"src/modules/**/*.scss",
];

export const tailwindSass = () => sassPipeline({
	source: tailwindSources,
	output: "tailwind.min.css",
});

export const devSass = () => sassPipeline({
	source: mainSources,
	sourceScss: mainScssSources,
	output: "main.min.css",
});

export const prodTailwindSass = () => sassPipeline({
	source: tailwindSources,
	output: "tailwind.min.css",
	minify: true,
});

export const prodSass = () => sassPipeline({
	source: mainSources,
	sourceScss: mainScssSources,
	output: "main.min.css",
	minify: true,
});

module.exports = { devSass, prodSass, prodTailwindSass, tailwindSass };
