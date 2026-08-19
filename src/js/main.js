/**
 * JS entrypoint (bundled by Rollup/Gulp).
 *
 * Put here:
 * - App boot sequence (what runs on DOMContentLoaded)
 * - Wiring: call each module init via `safeInit()`
 * - High-level event wiring via `initEvents()`
 *
 * Avoid here:
 * - Large feature logic, DOM selectors, or page-specific code (put in `modules/`)
 */


import { safeInit, initEvents } from "./utils";

import { initNav } from "./modules/nav";
import { initUI, initDataJsTabs } from "./modules/ui";
import { handleScroll, initScroll } from "./modules/scroll";
import { initEffects } from "./modules/effect";
import { initMisc } from "./modules/misc";
import { swiperInit } from "./modules/swiper";
import { initHome } from "./modules/home";
import { initAbout } from "./modules/about";
import { initWork } from "./modules/work";
import { initProjects } from "./modules/projects";
import { initProjectsDetail } from "./modules/projects-detail";
import { initViewport } from "./modules/viewport";


document.addEventListener("DOMContentLoaded", () => {
	safeInit(initViewport, "viewport");
	safeInit(initNav, "nav");
	safeInit(initUI, "ui");
	safeInit(initEffects, "effects");
	safeInit(initMisc, "misc");
	safeInit(swiperInit, "swiper");
	safeInit(initDataJsTabs, "data-js-tabs");
	safeInit(initHome, "home");
	safeInit(initAbout, "about");
	safeInit(initWork, "work");
	safeInit(initProjects, "projects");
	safeInit(initProjectsDetail, "projects-detail");
	safeInit(initScroll, "scroll");

	initEvents({
		onScroll: handleScroll
	});


});