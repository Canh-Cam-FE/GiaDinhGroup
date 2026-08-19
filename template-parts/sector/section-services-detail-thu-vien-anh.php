<?php
/**
 * Sector photo gallery — 5 images per slide (services-detail-thu-vien-anh).
 *
 * @package Canhcam
 */

$title   = get_field('sector_gallery_title');
$gallery = get_field('sector_gallery');

if (empty($gallery)) {
	return;
}

$slides = array_chunk($gallery, 5);
?>
<section class="services-detail-thu-vien-anh bg-grey-50 pad-8">
	<div class="container">
		<?php if ($title) : ?>
			<h2 class="heading-1 text-gray-950 mb-10 text-center"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<div class="single init-swiper relative">
			<div class="swiper">
				<div class="swiper-wrapper">
					<?php foreach ($slides as $slide_images) : ?>
						<div class="swiper-slide">
							<div class="item">
								<div class="wrap">
									<?php foreach ($slide_images as $image) : ?>
										<div class="img zoom-in overflow-hidden">
											<a class="img-ratio ratio:pt-[297_440]">
												<?php echo get_image_attrachment($image, 'image'); ?>
											</a>
										</div>
									<?php endforeach; ?>
								</div>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
			<div class="swiper-nav">
				<div class="prev"></div>
				<div class="next"></div>
			</div>
		</div>
	</div>
</section>
