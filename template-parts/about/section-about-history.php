<?php
$title = get_field('history_title');
$items = get_field('history_items');

if (empty($items)) {
	return;
}
?>
<section id="anchor-4" class="about-history anchor-section-id pad-8 bg-grey-50">
	<div class="container">
		<?php if ($title): ?>
			<h2 class="heading-1 text-gray-950 mb-10 text-center"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<div class="history-main relative mb-10 clamp:mb-[40-60]">
			<div class="wrap w-full flex items-center justify-center clamp:gap-[40-40]">
				<button class="box bg-white prev" type="button"
					aria-label="<?php echo esc_attr__('Năm trước', 'canhcamtheme'); ?>">
					<i class="fa-light fa-chevron-left text-gray-300"></i>
				</button>
				<div class="panel swiper w-full">
					<div class="swiper-wrapper">
						<?php foreach ($items as $item):
							$heading = $item['item_heading'] ?? '';
							$desc = $item['item_desc'] ?? '';
							$image = $item['item_image'] ?? null;
							?>
							<div class="swiper-slide">
								<div class="row">
									<div class="col w-full lg:w-5/12">
										<div class="txt col-left h-full">
											<div class="content flex flex-col clamp:gap-[8-8]">
												<?php if ($heading): ?>
													<h4 class="heading-4 text-gray-950"><?php echo esc_html($heading); ?></h4>
												<?php endif; ?>
												<?php if ($desc): ?>
													<div class="desc body-1 text-gray-950">
														<?php echo canhcam_kses_post($desc); ?>
													</div>
												<?php endif; ?>
											</div>
										</div>
									</div>
									<div class="col w-full lg:w-7/12">
										<?php if ($image): ?>
											<div class="media bg-grey-d9 overflow-hidden">
												<?php echo get_image_attrachment($image, 'image'); ?>
											</div>
										<?php endif; ?>
									</div>
								</div>
							</div>
						<?php endforeach; ?>
					</div>
				</div>
				<button class="box bg-white next" type="button"
					aria-label="<?php echo esc_attr__('Năm sau', 'canhcamtheme'); ?>">
					<i class="fa-light fa-chevron-right text-gray-300"></i>
				</button>
			</div>
			<div class="swiper-pagination"></div>
		</div>
		<div class="history-thumb relative w-full mt-12">
			<div class="swiper relative z-10">
				<div class="swiper-wrapper">
					<?php foreach ($items as $item):
						$year = $item['item_year'] ?? '';
						if (!$year) {
							continue;
						}
						?>
						<div class="swiper-slide">
							<div class="item relative flex flex-col items-center justify-start cursor-pointer">
								<hr class="transition-colors duration-300 w-px border-0 bg-gray-300 h-[40px] mb-[26px]">
								<div class="text-wrap flex flex-col items-center justify-center h-[48px]">
									<div class="desc body-2 text-gray-300 idle transition-all duration-300">
										<?php echo esc_html($year); ?>
									</div>
									<h2 class="heading-2 text-primary-2 current transition-all duration-300 hidden">
										<?php echo esc_html($year); ?>
									</h2>
								</div>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		</div>
	</div>
</section>