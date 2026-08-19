import { src, dest } from "gulp";
import { readFileSync } from "graceful-fs";
import { imageWatchGlob } from "./watch-shared.js";

export const copyImage = () => {
	return src(imageWatchGlob)
		.pipe(
			dest("dist/img")
		)
		.pipe(
			dest("img")
		);
};

export const copyFonts = () => {
	let glob = JSON.parse(readFileSync("config.json"));
	return src(glob.font, {
		allowEmpty: true,
	})
		.pipe(dest("fonts"))
		.pipe(dest("dist/fonts"));
};

module.exports = {
	copyFonts,
	copyImage,
};
