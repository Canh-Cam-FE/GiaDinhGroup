import { watch, series, parallel } from "gulp";
import browserSync from "browser-sync";
import jsCore from "./core-js";
import devJS from "./script";
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

export const ftpDeploy = () => require("./ftp").ftpFileDeploy();

const deploy = () => {
	bs.init(bsOptions);

	watch("src/js/**/*.js", watchOpts, series(devJS, ftpDeploy));

	watch(
		["src/plugins/**/*.{css,js}", "config.json"],
		watchOpts,
		series(parallel(jsCore, cssCore), ftpDeploy)
	);

	watch(
		["tailwind.config.js", "src/core/**/*.sass"],
		watchOpts,
		series(runBothSass, ftpDeploy)
	);

	watch(
		["src/components/**/*.sass", "src/modules/**/*.sass"],
		watchOpts,
		series(devSass, ftpDeploy)
	);

	watch(
		"src/**/*.pug",
		watchOpts,
		series(parallel(pugTask, runBothSass), ftpDeploy)
	);

	watch(
		imageWatchGlob,
		watchOpts,
		series(cleanImage, copyImage, ftpDeploy)
	);

	watch(
		distReloadGlob,
		{ ...watchOpts, delay: 50, ignoreInitial: true },
		reload
	);
};

export default deploy;
