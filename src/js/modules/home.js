export function initHome() {
	initProjectCards();
	initSectorCards();
	initVeGiaDinhProgress();
}

function initProjectCards() {
	const cards = document.querySelectorAll(
		'[data-js-target="home-projects"][data-js-action="expand-card"]'
	);
	if (!cards.length) return;

	cards.forEach((card) => {
		card.addEventListener("click", () => {
			cards.forEach((c) => c.classList.remove("active"));
			card.classList.add("active");
		});
	});
}

function initSectorCards() {
	const cards = document.querySelectorAll(
		'[data-js-target="home-sectors"][data-js-action="sector-card"]'
	);
	if (!cards.length) return;

	cards.forEach((card) => {
		card.addEventListener("mouseenter", () => {
			cards.forEach((c) => c.classList.remove("active"));
			card.classList.add("active");
		});
	});
}

function initVeGiaDinhProgress() {
	const section = document.querySelector('.home-about');
	if (!section) return;

	const progressTrack = section.querySelector('.progress-track');
	if (!progressTrack) return;

	if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
		gsap.to(progressTrack, {
			"--progress": 1,
			ease: "none",
			scrollTrigger: {
				trigger: section,
				start: "top center",
				end: "bottom center",
				scrub: true,
			}
		});
	}
}
