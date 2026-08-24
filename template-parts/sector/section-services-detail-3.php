<?php
/**
 * Sector advantages carousel (services-detail-3).
 *
 * @package Canhcam
 */

$title = get_field('sector_adv_title');
$items = get_field('sector_adv_items');

if (!$title && empty($items)) {
	return;
}
?>
<section class="services-detail-3 relative overflow-hidden bg-primary-1 pad-8">
	<div class="container-fluid">
		<div class="row">
			<div class="col w-full">
				<div class="block-wrap ml-auto max-lg:px-[15px]">
					<?php if ($title) : ?>
						<h2 class="heading-1 text-white"><?php echo esc_html($title); ?></h2>
					<?php endif; ?>
					<div class="inner flex items-center justify-center clamp:gap-[16-24] mt-10 lg:mt-[120px]">
						<div class="box left flex items-center"><i class="fa-solid fa-chevron-left text-white"></i><i class="fa-solid fa-chevron-left text-white"></i><i class="fa-solid fa-chevron-left text-white"></i></div>
						<div class="mouse"><span class="dot bg-primary-2"></span></div>
						<div class="box right flex items-center"><i class="fa-solid fa-chevron-right text-white"></i><i class="fa-solid fa-chevron-right text-white"></i><i class="fa-solid fa-chevron-right text-white"></i></div>
					</div>
				</div>
			</div>
			<?php if (!empty($items)) : ?>
				<div class="col w-full">
					<div class="wrap w-full relative init-swiper max-lg:px-[15px] play-on-view">
						<div class="swiper is-loop" data-time="5000">
							<div class="swiper-wrapper">
								<?php foreach ($items as $item) :
									$image     = $item['item_image'] ?? null;
									$item_title = $item['item_title'] ?? '';
								?>
									<div class="swiper-slide">
										<div class="item">
											<?php if ($image) : ?>
												<div class="img overflow-hidden bg-grey-d9">
													<?php echo get_image_attrachment($image, 'image'); ?>
												</div>
											<?php endif; ?>
											<?php if ($item_title) : ?>
												<div class="content">
													<h4 class="heading-5 text-white text-opacity-80"><?php echo esc_html($item_title); ?></h4>
												</div>
											<?php endif; ?>
										</div>
									</div>
								<?php endforeach; ?>
							</div>
						</div>
					</div>
				</div>
			<?php endif; ?>
		</div>
	</div>
</section>
