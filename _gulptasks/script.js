import { src, dest } from "gulp";
import plumber from "gulp-plumber";
import sourcemaps from "gulp-sourcemaps";
import esbuild from "gulp-esbuild";

const buildJS = (name, minify = false) => {
	const task = () =>
		src("src/js/main.js")
			.pipe(plumber())
			.pipe(sourcemaps.init())
			.pipe(
				esbuild({
					bundle: true,
					format: "iife",
					target: "es2020",
					outfile: "main.min.js",
					sourcemap: true,
					minify,
				})
			)
			.pipe(sourcemaps.write("."))
			.pipe(dest("dist/js"))
			.pipe(dest("scripts"));

	task.displayName = name;
	return task;
};

/** Dev + sync — readable bundle, sourcemaps for debugging. */
export const devJS = buildJS("devJS", false);

/** Prod — minified IIFE (same filename as dev). */
export const prodJS = buildJS("prodJS", true);
