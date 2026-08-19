<?php
/**
 * Project detail — gallery section.
 */
$gallery = get_field('project_gallery');

if (empty($gallery) || !is_array($gallery)) {
	return;
}
?>
<section class="projects-detail-gallery pad-b-8">
	<div class="container">
		<div class="wrap relative">
			<div class="swiper swiper-main">
				<div class="swiper-wrapper">
					<?php foreach ($gallery as $image) : ?>
						<div class="swiper-slide">
							<div class="media overflow-hidden bg-grey-d9">
								<?php echo get_image_attrachment($image, 'image'); ?>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
			<div class="swiper-nav center">
				<div class="prev"></div>
				<div class="next"></div>
			</div>
		</div>
		<div class="list swiper swiper-thumbs">
			<div class="swiper-wrapper">
				<?php foreach ($gallery as $index => $image) :
					$is_first = $index === 0;
					?>
					<div class="swiper-slide">
						<button class="item w-full<?php echo $is_first ? ' is-active' : ''; ?>" type="button" role="tab" aria-selected="<?php echo $is_first ? 'true' : 'false'; ?>">
							<div class="media overflow-hidden bg-grey-d9">
								<?php echo get_image_attrachment($image, 'image'); ?>
							</div>
						</button>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</section>
