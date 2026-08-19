import { throttle } from "../utils";

const DEFAULT_ROWS = [
	[{ size: "lg" }, { size: "sm" }],
	[{ size: "sm" }, { size: "sm" }, { size: "sm" }],
	[{ size: "md" }, { size: "md" }],
	[{ size: "full" }],
	[{ size: "sm" }, { size: "lg" }],
	[{ size: "sm" }, { size: "sm" }, { size: "sm" }],
];

function getWorkImg(index) {
	return `https://picsum.photos/seed/toppan-work-${index}/1200/800`;
}

function createWorkItem(item, index) {
	const el = document.createElement("div");
	el.className = `work-item work-item--${item.size} fd-up`;
	el.innerHTML = `
		<div class="card zoom-in overflow-hidden">
			<a href="javascript:;">
				<div class="work-media work-media--${item.size}">
					<img class="lozad" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" data-src="${getWorkImg(index)}" alt="Work project ${index}" loading="lazy">
				</div>
			</a>
		</div>
	`;
	return el;
}

function revealWorkItems(sr, items) {
	if (!sr || !items.length) return;
	sr.reveal(items, {
		origin: "bottom",
		distance: "30px",
		duration: 1000,
		delay: 120,
		interval: 80,
		easing: "cubic-bezier(0.5, 0, 0, 1)",
	});
}

function observeImages(items) {
	const loader = window.lazyLoader;
	if (!loader) return;
	items.forEach((item) => {
		const img = item.querySelector(".lozad");
		if (img) loader.triggerLoad(img);
	});
}

export function initWork() {
	const section = document.querySelector(".work-list");
	const grid = document.querySelector("#work-grid");
	if (!section || !grid) return;

	let rows = DEFAULT_ROWS;
	try {
		rows = JSON.parse(section.dataset.workRows || "[]");
		if (!rows.length) rows = DEFAULT_ROWS;
	} catch {
		rows = DEFAULT_ROWS;
	}

	let itemCount = grid.querySelectorAll(".work-item").length;
	let loading = false;

	const sr =
		typeof ScrollReveal !== "undefined"
			? ScrollReveal({
				duration: 1000,
				distance: "30px",
				easing: "cubic-bezier(0.5, 0, 0, 1)",
				once: true,
			})
			: null;


	revealWorkItems(sr, grid.querySelectorAll(".work-item"));

	const appendBatch = () => {
		if (loading) return;
		loading = true;

		const fragment = document.createDocumentFragment();
		const newItems = [];

		rows.forEach((row) => {
			row.forEach((item) => {
				itemCount += 1;
				const el = createWorkItem(item, itemCount);
				fragment.appendChild(el);
				newItems.push(el);
			});
		});

		grid.appendChild(fragment);
		revealWorkItems(sr, newItems);
		observeImages(newItems);
		loading = false;
	};

	// const onScroll = () => {
	// 	const { bottom } = grid.getBoundingClientRect();
	// 	if (bottom <= window.innerHeight + 500) {
	// 		appendBatch();
	// 	}
	// };

	// window.addEventListener("scroll", throttle(onScroll, 200));
	// onScroll();
}
