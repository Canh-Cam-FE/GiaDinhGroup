import { series, parallel } from "gulp";

// Import tasks
import server from "./_gulptasks/server";
import pugTask from "./_gulptasks/html";
import jsCore from "./_gulptasks/core-js";

import cssCore from "./_gulptasks/core-css";
import { cleanDist } from "./_gulptasks/clean";
import { devJS, prodJS } from "./_gulptasks/script";
import { copyFonts, copyImage } from "./_gulptasks/copy";
import { devSass, prodSass, prodTailwindSass, tailwindSass } from "./_gulptasks/sass";
import deploy, { ftpDeploy } from "./_gulptasks/deploy";

/** Compile Sass only (Dart Sass via gulp-sass). */
exports.sass = series(tailwindSass, devSass);

exports.default = series(
	cleanDist,
	parallel(copyImage, copyFonts),
	parallel(jsCore, cssCore),
	tailwindSass,
	devSass,
	devJS,
	pugTask,
	server
);

exports.prod = series(
	cleanDist,
	parallel(copyImage, copyFonts),
	parallel(jsCore, cssCore),
	prodTailwindSass,
	prodSass,
	prodJS,
	pugTask
);


exports.sync = series(
	cleanDist,
	parallel(copyImage, copyFonts),
	parallel(jsCore, cssCore),
	tailwindSass,
	devSass,
	devJS,
	pugTask,
	ftpDeploy,
	deploy,
);
