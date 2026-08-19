export function initProjectsDetail() {
	initGallery();
}

function initGallery() {
	const section = document.querySelector(".projects-detail-gallery");
	if (!section) return;

	const swiperEl = section.querySelector(".swiper-main");
	if (!swiperEl || typeof Swiper === "undefined") return;

	const thumbSwiperEl = section.querySelector(".swiper-thumbs");

	let thumbSwiper;
	if (thumbSwiperEl) {
		thumbSwiper = new Swiper(thumbSwiperEl, {
			slidesPerView: 2,
			spaceBetween: 20,
			breakpoints: {
				320: {
					slidesPerView: 3,
					spaceBetween: 20,
				},
				768: {
					slidesPerView: 4,
					spaceBetween: 40,
				}
			},
			observer: true,
			observeParents: true,
		});
	}

	const swiper = new Swiper(swiperEl, {
		slidesPerView: 1,
		observer: true,
		observeParents: true,
		speed: 600,
		rewind: true,
		lazy: {
			loadPrevNext: true,
		},
		navigation: {
			nextEl: section.querySelector('.projects-detail-gallery .next'),
			prevEl: section.querySelector('.projects-detail-gallery .prev'),
		},
		thumbs: thumbSwiper ? {
			swiper: thumbSwiper
		} : undefined,
	});
}
