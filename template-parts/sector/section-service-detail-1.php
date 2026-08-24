<?php

/**
 * Sector stats + gallery (service-detail-1).
 *
 * @package Canhcam
 */

$title = get_the_title();
$intro = get_field('sector_stats_intro');
$items = get_field('sector_stats_items');
$gallery = get_field('sector_stats_gallery');

if (!$title && !$intro && empty($items) && empty($gallery)) {
	return;
}
?>
<section class="home-about bg-white relative service-detail-1">
	<div class="container-fluid p-0 relative">
		<div class="row gap-10 lg:gap-16">
			<div class="col w-full lg:w-1/2">
				<div
					class="content h-full flex flex-col col-left justify-center clamp:gap-[24-32] lg:rem:max-w-[740px] 2xl:rem:max-w-[640px]">
					<div class="wrap flex flex-col clamp:gap-[24-32]">
						<?php if ($title): ?>
							<h2 class="heading-1 text-gray-950"><?php echo esc_html($title); ?></h2>
						<?php endif; ?>
						<?php if ($intro): ?>
							<div class="desc body-2 text-gray-800"><?php echo canhcam_kses_post($intro); ?></div>
						<?php endif; ?>
					</div>
					<?php if (!empty($items)): ?>
						<div class="list flex flex-col clamp:gap-[24-32]">
							<?php
							$chunks = array_chunk($items, 2);
							foreach ($chunks as $chunk):
								?>
								<div class="row flex clamp:gap-[32-32]">
									<?php foreach ($chunk as $stat):
										$number = $stat['item_number'] ?? '';
										$sufix = $stat['item_sufix'] ?? '';
										$label = $stat['item_label'] ?? '';
										$note = $stat['item_note'] ?? '';
										?>
										<div class="col w-full sm:w-1/2">
											<div class="item flex flex-col clamp:gap-[8-8]">
												<div class="flex stat-item flex-row items-center justify-start gap-2">
													<h2 class="heading-1 text-primary-1 counter">
														<?php echo esc_html($number); ?>
													</h2>
													<div class="heading-1 text-primary-1 sufix">
														<?php echo esc_html($sufix); ?>
													</div>
												</div>
												<div class="inner items-start gap-2 flex clamp:gap-[8-8]">
													<div class="wrap-inner flex-shrink-0 gap-2 items-center flex">
														<span
															class="box bg-primary-2 rounded-full rem:w-[8px] rem:h-[8px] rem:min-w-[8px]"></span>
														<?php if ($label): ?>
															<h4 class="heading-5 text-gray-950"><?php echo esc_html($label); ?></h4>
														<?php endif; ?>
													</div>

													<?php if ($note): ?>
														<div class="desc body-3 text-gray-800"><?php echo esc_html($note); ?></div>
													<?php endif; ?>
												</div>
											</div>
										</div>
									<?php endforeach; ?>
								</div>
							<?php endforeach; ?>
						</div>
					<?php endif; ?>
				</div>
			</div>
			<div class="col w-full lg:w-1/2">
				<?php if (!empty($gallery)): ?>
					<div class="single-swiper init-swiper">
						<div class="swiper">
							<div class="swiper-wrapper">
								<?php foreach ($gallery as $image): ?>
									<div class="swiper-slide">
										<div class="img zoom-in overflow-hidden lg:rem:max-w-[900px] lg:rem:max-h-[600px]">
											<a class="img-ratio ratio:pt-[600_900]">
												<?php echo get_image_attrachment($image, 'image'); ?>
											</a>
										</div>
									</div>
								<?php endforeach; ?>
							</div>
						</div>
						<div class="swiper-nav inset center">
							<div class="prev"></div>
							<div class="next"></div>
						</div>
					</div>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>