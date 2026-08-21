export function swiperInit() {
	function getSlidesPerGroup(slidesSizesGrid, visibleSlidesIndexes) {
		const totalSlide = slidesSizesGrid.length;
		const visibleSlide = visibleSlidesIndexes?.length ?? 1;

		let slidesPerGroup = visibleSlide;

		if (totalSlide <= visibleSlide) {
			slidesPerGroup = null;
		}
		return slidesPerGroup;
	}
	function triggerLozadNextSlideImage(swiper) {
		const nextSlide = swiper.slides[swiper.activeIndex + 1];
		if (nextSlide) {
			const nextImage = nextSlide.querySelectorAll("img");
			const loader = window.lazyLoader;
			if (nextImage && loader && typeof loader.triggerLoad === "function") {
				nextImage.forEach((img) => {
					loader.triggerLoad(img);
				});
			} else {
				throw new Error("Lozad is not defined");
			}
		}
	}
	function autoSetSlidesPerGroup(swiper) {
		if (!swiper.pagination.el) return;
		const { visibleSlidesIndexes, slidesSizesGrid } = swiper;
		const slidesPerGroup = getSlidesPerGroup(
			slidesSizesGrid,
			visibleSlidesIndexes
		);
		if (
			slidesPerGroup != null &&
			slidesPerGroup > 0 &&
			slidesPerGroup !== swiper.params.slidesPerGroup
		) {
			swiper.params.slidesPerGroup = slidesPerGroup;
			swiper.update();
		}
	}
	// GLOBAL
	window.triggerFadeUp = function (slide) {
		slide?.querySelectorAll(".text-fd-up").forEach((el) => {
			el.classList.remove("is-visible");
			void el.offsetWidth; // force reflow
			el.classList.add("is-visible");
		});
	};



	// 1. Initialize Swiper
	var primarySwiper = new Swiper(".primary-banner .swiper", {
		slidesPerView: 1,
		observer: true,
		observeParents: true,
		preventInteractionOnTransition: false,
		speed: 1205,
		autoplay: false,
		lazy: {
			loadPrevNext: true,
		},
		effect: "fade",
		fadeEffect: {
			crossFade: true,
		},
		loop: true,
		init: false,
		navigation: {
			nextEl: ".primary-banner .next",
			prevEl: ".primary-banner .prev",
		},
		pagination: {
			el: ".primary-banner .swiper-pagination",
			type: "bullets",
			clickable: true,
			renderBullet: function (index, className) {
				return `<span class="${className}" data-index="${index}"></span>`;
			},
		},
	});

	// 2. Global Variables
	let progressInterval = null;
	let timer = null;
	let isPaused = false; // NEW: Track manual pause state
	const slideTimeout = 9000;

	// 3. Progress Track Function
	function startProgressTrack() {
		if (progressInterval) clearInterval(progressInterval);
		if (isPaused) return; // Don't start animation if paused

		const progressTrack = document.querySelector(".primary-banner .progress-track");
		if (!progressTrack) return;

		const intervalStep = 20;
		// Get current width to allow resuming from same spot if desired, 
		// otherwise it defaults to 0 on new slides.
		let progress = parseFloat(progressTrack.style.width) || 0;

		progressInterval = setInterval(() => {
			if (!isPaused) {
				progress += (intervalStep / slideTimeout) * 100;
				if (progress >= 100) {
					clearInterval(progressInterval);
					progressTrack.style.width = "100%";
				} else {
					progressTrack.style.width = `${progress}%`;
				}
			}
		}, intervalStep);
	}

	document.querySelectorAll(".gallery-swiper.swiper").forEach((el) => {
		new Swiper(el, {
			slidesPerView: 1,
			observer: true,
			observeParents: true,
			preventInteractionOnTransition: false,
			speed: 1205,
			autoplay: false,
			lazy: {
				loadPrevNext: true,
			},
			loop: true,
		});
	});


	function resetProgressTrack() {
		if (progressInterval) {
			clearInterval(progressInterval);
			progressInterval = null;
		}
		const progressTrack = document.querySelector(".primary-banner .progress-track");
		if (progressTrack) {
			progressTrack.style.width = "0%";
		}
	}

	// 4. Video & Timer Handling
	function handleVideoPlayback(slide) {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}

		if (!isPaused) {
			resetProgressTrack();
		}

		// Stop all videos first
		const allVideos = document.querySelectorAll(".primary-banner-video");
		allVideos.forEach((video) => {
			video.pause();
		});

		// Detect which video to play based on screen width
		// Adjust 768 to match your specific CSS breakpoint (e.g., 1024 for desktop)
		const isMobile = window.innerWidth <= 768;
		const videoSelector = isMobile ? "video.mobile" : "video.desktop";

		let videoElement = slide.querySelector(videoSelector);

		// Fallback: If the specific mobile/desktop video doesn't exist, 
		// grab whatever video is available in the slide.
		if (!videoElement) {
			videoElement = slide.querySelector("video");
		}

		if (videoElement) {
			if (!isPaused) {
				startProgressTrack();
				videoElement.play().catch((error) => {
					// Handle browsers that block autoplay
					timer = setTimeout(() => {
						primarySwiper.slideNext();
					}, slideTimeout);
				});
			}

			videoElement.onended = function () {
				if (!isPaused) {
					if (primarySwiper.slides.length === 1) {
						videoElement.currentTime = 0;
						videoElement.play();
					} else {
						primarySwiper.slideNext();
					}
				}
			};

		} else {
			// Handle Image Slides
			if (!isPaused) {
				startProgressTrack();
				timer = setTimeout(() => {
					primarySwiper.slideNext();
				}, slideTimeout);
			}
		}
	}

	// 5. Swiper Event Listeners
	primarySwiper.on("slideChangeTransitionEnd", function () {
		const currentSlide = primarySwiper.slides[primarySwiper.activeIndex];
		handleVideoPlayback(currentSlide);
		triggerFadeUp(currentSlide);
	});

	primarySwiper.on("slideChangeTransitionStart", function () {
		if (!isPaused) {
			resetProgressTrack();
		}
	});

	primarySwiper.on("init", function () {
		const currentSlide = primarySwiper.slides[primarySwiper.activeIndex];
		handleVideoPlayback(currentSlide);
		triggerFadeUp(currentSlide);
	});

	// 6. Pause Button Logic (.pause-track)
	const pauseTrackBtn = document.querySelector(".pause-track");
	if (pauseTrackBtn) {
		pauseTrackBtn.addEventListener("click", function () {
			isPaused = !isPaused; // Toggle state

			const currentSlide = primarySwiper.slides[primarySwiper.activeIndex];
			const video = currentSlide.querySelector("video");

			if (isPaused) {
				// STOP
				this.classList.add("paused");
				if (progressInterval) clearInterval(progressInterval);
				if (timer) clearTimeout(timer);
				if (video) video.pause();
			} else {
				// RESUME
				this.classList.remove("paused");
				if (video) {
					video.play();
					startProgressTrack();
				} else {
					startProgressTrack();
					// Resume the remaining time (simplified as full timeout here)
					timer = setTimeout(() => {
						primarySwiper.slideNext();
					}, slideTimeout);
				}
			}
		});
	}

	// 7. Manual Video Click Handling
	const primaryBannerVideo = document.querySelectorAll(".primary-banner-video");
	primaryBannerVideo.forEach(function (videoElement) {
		videoElement.addEventListener("click", function (event) {
			if (this.paused) {
				this.play();
				this.parentNode.parentNode.classList.remove("pause");
			} else {
				this.pause();
				this.parentNode.parentNode.classList.add("pause");
			}
		});
	});

	// 8. Run Init
	primarySwiper.init();





	window.initSwiper = [];

	$(".init-swiper .swiper").each(function (index) {
		const $this = $(this);

		if ($this.closest(".primary-banner").length) return;

		// Flags
		const isLoop = $this.hasClass("is-loop");
		const isTriggerLoadedNext = $this.hasClass("trigger-loaded-next");
		const isCenter = $this.hasClass("is-center-slide");
		const isGrid = $this.hasClass("is-grid");

		// Data attrs
		let time = Number($this.data("time"));
		let dataspeed = Number($this.data("speed"));
		let initialSlide = Number($this.data("initial"));

		// Grid rows — read base value + per-breakpoint overrides
		// Usage: data-grid-rows="2" data-grid-rows-768="1" data-grid-rows-1024="3"
		const gridRows = isGrid ? (Number($this.data("grid-rows")) || 2) : null;
		const gridBreakpoints = {};
		if (isGrid) {
			const rawAttrs = this.attributes || [];
			Array.from(rawAttrs).forEach(function (attr) {
				const match = attr.name.match(/^data-grid-rows-(\d+)$/);
				if (match) {
					const bp = Number(match[1]);
					const rows = Number(attr.value);
					if (bp && rows) gridBreakpoints[bp] = { grid: { rows } };
				}
			});
		}

		// Defaults
		if (!Number.isFinite(time)) time = 5000;
		if (!Number.isFinite(dataspeed)) dataspeed = 1205;

		console.log("Swiper:", index);
		console.log("time:", time);
		console.log("speed:", dataspeed);

		// Pagination type
		let paginationType = "bullets";

		if ($this.hasClass("fraction")) {
			paginationType = "fraction";
		} else if ($this.hasClass("progress")) {
			paginationType = "progressbar";
		}

		// Unique classes
		$this.addClass("swiper-init-" + index);

		$this
			.parents(".init-swiper")
			.find(".prev")
			.addClass("prev-nav-" + index);

		$this
			.parents(".init-swiper")
			.find(".next")
			.addClass("next-nav-" + index);

		$this
			.parents(".init-swiper")
			.find(".swiper-pagination")
			.addClass("pagination-inst-" + index);

		// Base options
		const options = {
			observer: true,
			observeParents: true,

			rewind: !isLoop,
			loop: isLoop,

			speed: dataspeed,

			watchSlidesProgress: true,
			slidesPerView: "auto",

			centeredSlides: isCenter,

			lazy: {
				loadPrevNext: true,
			},

			autoplay: {
				delay: time,
				pauseOnMouseEnter: true,
				disableOnInteraction: false,
			},

			navigation: {
				nextEl: ".next-nav-" + index,
				prevEl: ".prev-nav-" + index,
			},

			pagination: {
				el: ".pagination-inst-" + index,
				type: paginationType,
				clickable: true,
				dynamicMainBullets: 1,
			},

			on: {
				beforeInit: function () {
					window.initSwiper.push(this);
				},

				init: function () {
					// Fix duplicate fancybox in loop mode
					if (isLoop) {
						window.lazyLoader?.observe();

						$(this.el)
							.find(".swiper-slide-duplicate a[data-fancybox]")
							.removeAttr("data-fancybox");
					}

					if (isTriggerLoadedNext) {
						triggerLozadNextSlideImage(this);
					}

					console.log("Swiper initialized:", {
						index,
						speed: this.params.speed,
						delay: this.params.autoplay?.delay,
					});
				},

				slideChange: function () {
					// Pause videos when slide changes
					if ($this.hasClass("slide-has-video")) {
						const $videos = $this.find("video");

						if ($videos.length) {
							$videos[0].pause();
						}

						$this.find(".swiper-slide").removeClass("play-video");
						$this.find(".play-btn").removeClass("active");
					}

					if (isTriggerLoadedNext) {
						triggerLozadNextSlideImage(this);
					}
				},

				resize: function (swiper) {
					const totalSlidesWidth = swiper.slidesSizesGrid.reduce(
						(acc, curr) => acc + curr,
						0
					);

					swiper.el.classList.toggle(
						"center-slide-active",
						totalSlidesWidth < swiper.size
					);

					autoSetSlidesPerGroup(swiper);
				},
			},
		};

		// Better center mode behavior
		if (isCenter) {
			options.centeredSlidesBounds = true;
		}

		// Grid mode
		if (isGrid) {
			options.grid = { rows: gridRows };

			if (Object.keys(gridBreakpoints).length) {
				options.breakpoints = Object.assign({}, options.breakpoints, gridBreakpoints);
			}
		}

		// Initial slide
		if (Number.isFinite(initialSlide)) {
			options.initialSlide = initialSlide;
		}

		// Continuous autoplay mode
		if (time === 0) {
			options.loop = true;

			options.autoplay = {
				delay: 0,
				disableOnInteraction: false,
				pauseOnMouseEnter: false,
			};

			if ($this.closest(".init-swiper").hasClass("reverse-direction") || $this.hasClass("reverse-direction")) {
				options.autoplay.reverseDirection = true;
			}

			// Use data-speed if provided
			options.speed = dataspeed || 1800;

			// Disable touch/click interaction so it won't reset the linear transition
			options.allowTouchMove = false;
			options.preventInteractionOnTransition = true;

			// Remove nav for marquee mode
			delete options.navigation;

			// Enforce linear easing for smooth continuous scrolling
			$this.addClass("is-continuous-marquee");
			if (!$("style#swiper-continuous-style").length) {
				$("head").append('<style id="swiper-continuous-style">.is-continuous-marquee > .swiper-wrapper { transition-timing-function: linear !important; }</style>');
			}

			// Smooth continuous movement
			options.freeMode = {
				enabled: true,
				momentum: false,
			};
		}

		console.log("Final options:", options);

		// Init
		new Swiper(".swiper-init-" + index, options);
	});

	// Wrap Swiper initialization inside a function


	var gridSwiper = new Swiper(".partner-grid-swiper .swiper", {
		preventInteractionOnTransition: true,
		observer: true,
		observeParents: true,
		rewind: true,
		speed: 1205,
		autoplay: {
			delay: 4000,
			pauseOnMouseEnter: true,
		},
		lazy: {
			loadPrevNext: true,
		},
		spaceBetween: 15,
		observeParents: true,
		simulateTouch: false,
		breakpoints: {

			300: {
				slidesPerView: 3,
				spaceBetween: 8,
				grid: {
					rows: 2,
					fill: "row",
				},
			},

			768: {
				slidesPerView: 4,
				grid: {
					rows: 2,
					fill: "row",
				},
			},
			1024: {
				slidesPerView: 3,
				spaceBetween: 15,
				grid: {
					rows: 2,
					fill: "row",
				},
			},
			1400: {
				slidesPerView: 3,
				spaceBetween: 16,
				grid: {
					rows: 2,
					fill: "row",
				},
			},
		},
		navigation: {
			nextEl: ".partner-grid-swiper .next",
			prevEl: ".partner-grid-swiper .prev",
		},
	});
	if (document.querySelector(".about-history")) {
		var historyThumb = new Swiper(".about-history .history-thumb .swiper", {
			spaceBetween: 0,
			breakpoints: {
				200: { spaceBetween: 0, slidesPerView: 3 },
				576: { slidesPerView: 4 },
				1024: { slidesPerView: 5 },
				1200: { slidesPerView: 6 },
				1400: { slidesPerView: 6 },
			},
			speed: 300,
			noSwiping: true,
			lazy: { loadPrevNext: true },
		});

		var historyMain = new Swiper(".about-history .history-main .swiper", {
			spaceBetween: 40,
			centeredSlides: true,
			loop: true,
			speed: 1205,
			slidesPerView: 1,
			// autoplay: { delay: 5000 },
			slideToClickedSlide: true,
			lazy: { loadPrevNext: true },
			navigation: {
				nextEl: ".about-history .history-main .next",
				prevEl: ".about-history .history-main .prev",
			},
			pagination: {
				el: ".history-main .swiper-pagination",
				type: "bullets",
				clickable: true,

			},
			thumbs: {
				swiper: historyThumb,
			},
		});
	}
}