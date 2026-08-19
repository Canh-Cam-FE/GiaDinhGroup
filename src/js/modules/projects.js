export function initProjects() {
	initFilterTabs();
	initPagination();
	initBackToTop();
}

function initFilterTabs() {
	const buttons = document.querySelectorAll(
		'[data-js-target="projects-filter"][data-js-action="filter"]'
	);
	if (!buttons.length) return;

	buttons.forEach((btn) => {
		btn.addEventListener("click", () => {
			buttons.forEach((b) => {
				const isActive = b === btn;
				b.setAttribute("aria-selected", String(isActive));
				const label = b.querySelector("span");
				if (!label) return;
				label.classList.toggle("text-primary-2", isActive);
				label.classList.toggle("text-gray-950", !isActive);
			});
		});
	});
}

function initPagination() {
	const buttons = document.querySelectorAll(
		'[data-js-target="projects-pagination"][data-js-action="page"]'
	);
	if (!buttons.length) return;

	buttons.forEach((btn) => {
		btn.addEventListener("click", () => {
			buttons.forEach((b) => {
				const isActive = b === btn;
				if (isActive) {
					b.setAttribute("aria-current", "page");
					b.classList.add("bg-primary-2");
					b.classList.remove("bg-gray-50");
					const label = b.querySelector(".body");
					label?.classList.add("text-white");
					label?.classList.remove("text-gray-500");
				} else {
					b.removeAttribute("aria-current");
					b.classList.remove("bg-primary-2");
					b.classList.add("bg-gray-50");
					const label = b.querySelector(".body");
					label?.classList.remove("text-white");
					label?.classList.add("text-gray-500");
				}
			});
		});
	});
}

function initBackToTop() {
	document
		.querySelectorAll('[data-js-action="back-to-top"]')
		.forEach((btn) => {
			btn.addEventListener("click", (event) => {
				event.preventDefault();
				window.scrollTo({ top: 0, behavior: "smooth" });
			});
		});
}
