<?php
$vision_bg = get_field('vision_bg');
$items = get_field('vision_items');

if (empty($items)) {
	return;
}

$bg_url = $vision_bg ? get_image_attrachment($vision_bg, 'url') : '';
?>
<section id="anchor-3" class="about-vision anchor-section-id section-hover overflow-hidden relative pad-t-8">
	<div class="tablet-block">
		<div class="bg-placeholder relative" <?php if ($bg_url): ?>
				style="--bg-url: url(&quot;<?php echo esc_url($bg_url); ?>&quot;);  " <?php endif; ?>>
			<div class="grid relative z-50 block-grid grid-cols-2">
				<?php foreach ($items as $item):
					$image = $item['item_image'] ?? null;
					$title = $item['item_title'] ?? '';
					$content = $item['item_content'] ?? '';
					$img_url = $image ? get_image_attrachment($image, 'url') : '';
					?>
					<div class="item-bg hover-grid relative lazy" <?php if ($img_url): ?>
							data-src="<?php echo esc_url($img_url); ?>" <?php endif; ?>>
						<div class="txt absolute-x  bottom-0 p-5 w-full z-20 lg:py-10 xl:px-20">
							<?php if ($title): ?>
								<h3 class="heading-2 text-white relative z-50  "><?php echo esc_html($title); ?></h3>
							<?php endif; ?>
							<?php if ($content): ?>
								<div class="txt-grid relative z-50">
									<div>
										<div class="desc body-2 text-white">
											<?php echo canhcam_kses_post($content); ?>
										</div>
									</div>
								</div>
							<?php endif; ?>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
	<div class="mobile-block">
		<div class="auto-3 init-swiper">
			<div class="swiper">
				<div class="swiper-wrapper">
					<?php foreach ($items as $item):
						$image = $item['item_image'] ?? null;
						$title = $item['item_title'] ?? '';
						$content = $item['item_content'] ?? '';
						?>
						<div class="swiper-slide">
							<div class="item relative">
								<?php if ($image): ?>
									<div class="img zoom-in overflow-hidden">
										<a class="img-ratio ratio:pt-[560_1400]">
											<?php echo get_image_attrachment($image, 'image'); ?>
										</a>
									</div>
								<?php endif; ?>
								<div class="txt">
									<?php if ($title): ?>
										<h3 class="heading-5 my-3"><?php echo esc_html($title); ?></h3>
									<?php endif; ?>
									<?php if ($content): ?>
										<div class="desc body-2">
											<?php echo canhcam_kses_post($content); ?>
										</div>
									<?php endif; ?>
								</div>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		</div>
	</div>
</section>