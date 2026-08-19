<?php
/**
 * Sector cards carousel (service-detail-2).
 *
 * @package Canhcam
 */

$items = get_field('sector_cards_items');

if (empty($items)) {
	return;
}
?>
<section class="bg-grey-50 relative service-detail-2 pad-8">
	<div class="container">
		<div class="auto-3 init-swiper">
			<div class="swiper">
				<div class="swiper-wrapper">
					<?php foreach ($items as $item) :
						$image = $item['item_image'] ?? null;
						$title = $item['item_title'] ?? '';
						$desc  = $item['item_desc'] ?? '';
					?>
						<div class="swiper-slide">
							<div class="box-info group">
								<?php if ($image) : ?>
									<div class="img zoom-in overflow-hidden">
										<a class="img-ratio ratio:pt-[320_440]">
											<?php echo get_image_attrachment($image, 'image'); ?>
										</a>
									</div>
								<?php endif; ?>
								<div class="txt pt-5">
									<h3>
										<?php if ($title) : ?>
											<a class="heading-5 mb-1 group-hover:text-primary-2"><?php echo esc_html($title); ?></a>
										<?php endif; ?>
										<?php if ($desc) : ?>
											<div class="desc body-2 line-clamp-4"><?php echo canhcam_kses_post($desc); ?></div>
										<?php endif; ?>
									</h3>
								</div>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		</div>
	</div>
</section>
