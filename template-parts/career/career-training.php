<?php
$title = get_field('career_training_title');

if (!$title && !have_rows('career_training_list')) {
	return;
}
?>
<section class="recruit-2 relative overflow-hidden pad-8">
	<div class="container">
		<?php if ($title) : ?>
			<h2 class="heading-1 mb-10 text-center"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<?php if (have_rows('career_training_list')) : ?>
			<div class="auto-3 init-swiper">
				<div class="swiper">
					<div class="swiper-wrapper max-lg:mb-10">
						<?php while (have_rows('career_training_list')) :
							the_row();
							$image       = get_sub_field('image');
							$item_title  = get_sub_field('title');
							$description = get_sub_field('description');
							?>
							<div class="swiper-slide">
								<div class="item overflow-hidden bg-grey-50">
									<?php if ($image) : ?>
										<div class="img zoom-in overflow-hidden">
											<a class="img-ratio ratio:pt-[248_440]">
												<?php echo get_image_attrachment($image, 'image'); ?>
											</a>
										</div>
									<?php endif; ?>
									<div class="txt p-6 text-center lg:py-10">
										<?php if ($item_title) : ?>
											<h2 class="heading-2 uppercase text-primary-1"><?php echo esc_html($item_title); ?></h2>
										<?php endif; ?>
										<?php if ($description) : ?>
											<div class="desc my-6"><?php echo canhcam_kses_post($description); ?></div>
										<?php endif; ?>
									</div>
								</div>
							</div>
						<?php endwhile; ?>
					</div>
				</div>
				<div class="swiper-nav">
					<div class="prev"></div>
					<div class="next"></div>
				</div>
			</div>
		<?php endif; ?>
	</div>
</section>
