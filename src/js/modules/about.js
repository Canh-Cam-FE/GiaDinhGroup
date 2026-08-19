export function initAbout() {
	initSectorCards();
	initBackToTop();
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

function initSectorCards() {
	const cards = document.querySelectorAll(
		'[data-js-target="about-sectors"][data-js-action="sector-card"]'
	);
	if (!cards.length) return;

	cards.forEach((card) => {
		card.addEventListener("mouseenter", () => {
			cards.forEach((c) => c.classList.remove("active"));
			card.classList.add("active");
		});
	});
}
