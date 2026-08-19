import { watch, series, parallel } from "gulp";
import browserSync from "browser-sync";
import jsCore from "./core-js";
import { devJS } from "./script";
import pugTask from "./html";
import cssCore from "./core-css";
import { copyImage } from "./copy";
import { cleanImage } from "./clean";
import { devSass, tailwindSass } from "./sass.js";
import {
	watchOpts,
	bsOptions,
	imageWatchGlob,
	distReloadGlob,
} from "./watch-shared.js";

const bs = browserSync.create();
const runBothSass = parallel(tailwindSass, devSass);

const reload = (done) => {
	bs.reload();
	done();
};

export const server = () => {
	bs.init(bsOptions);

	watch("src/js/**/*.js", watchOpts, series(devJS));

	watch(
		["src/plugins/**/*.{css,js}", "config.json"],
		watchOpts,
		parallel(jsCore, cssCore)
	);

	watch(
		["tailwind.config.js", "src/core/**/*.sass"],
		watchOpts,
		runBothSass
	);

	watch(
		["src/components/**/*.sass", "src/modules/**/*.sass"],
		watchOpts,
		devSass
	);

	watch("src/**/*.pug", watchOpts, parallel(pugTask, runBothSass));

	watch(imageWatchGlob, watchOpts, series(cleanImage, copyImage));

	watch(
		distReloadGlob,
		{ ...watchOpts, delay: 50, ignoreInitial: true },
		reload
	);
};

export default server;
module.exports = server;
