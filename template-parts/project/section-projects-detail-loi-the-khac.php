<?php
/**
 * Project detail — other advantages.
 */
$title = get_field('other_adv_title');
$image = get_field('other_adv_image');
$items = get_field('other_adv_items');

if (!$image && empty($items)) {
	return;
}
?>
<section class="projects-detail-loi-the-khac pad-8">
	<div class="container">
		<div class="row">
			<?php if ($image) : ?>
				<div class="col w-full lg:w-1/2">
					<div class="img zoom-in overflow-hidden">
						<a class="img-ratio ratio:pt-[575_680]">
							<?php echo get_image_attrachment($image, 'image'); ?>
						</a>
					</div>
				</div>
			<?php endif; ?>
			<div class="col w-full lg:w-1/2">
				<div class="txt col-left h-full lg:pl-5">
					<div class="content flex flex-col clamp:gap-[40-40]">
						<?php if ($title) : ?>
							<h2 class="heading-1 text-gray-950"><?php echo esc_html($title); ?></h2>
						<?php endif; ?>
						<?php if (!empty($items) && is_array($items)) : ?>
							<div class="list flex flex-col clamp:gap-[24-24]">
								<?php
								$total = count($items);
								foreach ($items as $index => $item) :
									$icon  = $item['item_icon'] ?? '';
									$label = $item['item_title'] ?? '';
									$desc  = $item['item_desc'] ?? '';
									?>
									<div class="item flex items-start clamp:gap-[24-24]">
										<?php if ($icon) : ?>
											<div class="box"><i class="material-symbols-outlined text-primary-2"><?php echo esc_html($icon); ?></i></div>
										<?php endif; ?>
										<div class="inner flex flex-col clamp:gap-[4-4]">
											<?php if ($label) : ?>
												<h4 class="heading-6 text-gray-950"><?php echo esc_html($label); ?></h4>
											<?php endif; ?>
											<?php if ($desc) : ?>
												<div class="desc body-2 text-gray-950"><?php echo canhcam_kses_post($desc); ?></div>
											<?php endif; ?>
										</div>
									</div>
									<?php if ($index < $total - 1) : ?>
										<hr>
									<?php endif; ?>
								<?php endforeach; ?>
							</div>
						<?php endif; ?>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
