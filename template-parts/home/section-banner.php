<?php
$slides = get_field('banner_slides');
if (empty($slides)) return;
?>
<section class="primary-banner init-swiper" data-home-banner>
	<div class="banner-container relative overflow-hidden">
		<div class="swiper">
			<div class="swiper-wrapper">
				<?php foreach ($slides as $slide) :
					$type = $slide['slide_type'];
					$subtitle = $slide['slide_subtitle'];
					$title = $slide['slide_title'];
				?>
					<div class="swiper-slide">
						<div class="wrap relative">
							<div class="img <?php echo $type === 'video_upload' || $type === 'youtube' ? 'video' : ''; ?>">
								<a>
									<?php if ($type === 'video_upload') :
										$video_desktop = $slide['slide_video_desktop'];
										$video_mobile = $slide['slide_video_mobile'];
									?>
										<?php if ($video_desktop) : ?>
											<video class="primary-banner-video desktop" muted playsinline autoplay loop>
												<source src="<?php echo esc_url($video_desktop['url']); ?>" type="video/mp4">
											</video>
										<?php endif; ?>
										<?php if ($video_mobile) : ?>
											<video class="primary-banner-video mobile" muted playsinline autoplay loop>
												<source src="<?php echo esc_url($video_mobile['url']); ?>" type="video/mp4">
											</video>
										<?php endif; ?>
									<?php elseif ($type === 'youtube') :
										$youtube_url = $slide['slide_youtube_url'];
										// Extract video ID from youtube URL
										preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/\s]{11})%i', $youtube_url, $match);
										$youtube_id = isset($match[1]) ? $match[1] : '';
									?>
										<?php if ($youtube_id) : ?>
											<div class="youtube-video-container" style="width: 100%; height: 100%; pointer-events: none;">
												<iframe width="100%" height="100%" src="https://www.youtube.com/embed/<?php echo esc_attr($youtube_id); ?>?autoplay=1&mute=1&controls=0&loop=1&playlist=<?php echo esc_attr($youtube_id); ?>&showinfo=0&rel=0&modestbranding=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
											</div>
										<?php endif; ?>
									<?php else :
										$img_desktop = $slide['slide_image_desktop'];
										$img_mobile = $slide['slide_image_mobile'];
									?>
										<picture>
											<?php if ($img_mobile) : ?>
												<source media="(max-width: 767px)" srcset="<?php echo esc_url($img_mobile['url']); ?>">
											<?php endif; ?>
											<?php if ($img_desktop) : ?>
												<source media="(min-width: 768px)" srcset="<?php echo esc_url($img_desktop['url']); ?>">
												<img src="<?php echo esc_url($img_desktop['url']); ?>" alt="<?php echo esc_attr($img_desktop['alt']); ?>" fetchpriority="high">
											<?php endif; ?>
										</picture>
									<?php endif; ?>
								</a>
							</div>
							<div class="txt absolute-x bottom-0 z-90 w-full flex-col justify-center items-center text-center">
								<div class="bg-wrap py-8 mx-auto lg:rem:max-w-[1120px]">
									<?php if ($subtitle) : ?>
										<h3 class="heading-3 text-white text-fd-up uppercase"><?php echo wp_kses_post($subtitle); ?></h3>
									<?php endif; ?>
									<?php if ($title) : ?>
										<h2 class="heading-banner text-white uppercase my-4 text-fd-up"><?php echo wp_kses_post($title); ?></h2>
									<?php endif; ?>
								</div>
							</div>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
	<div class="custom-pagination absolute-x z-50 bottom-0 pb-8 lg:pb-20 xl:pb-25">
		<div class="swiper-pagination"></div>
	</div>
</section>
