<?php
/**
 * Project detail — location advantages.
 */
$title = get_field('location_adv_title');
$items = get_field('location_adv_items');

if (empty($items) || !is_array($items)) {
	return;
}
?>
<section class="projects-detail-vi-tri pad-8 bg-grey-50">
	<div class="container">
		<?php if ($title) : ?>
			<h2 class="heading-1 mb-10"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<div class="list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 clamp:gap-[40-40]">
			<?php foreach ($items as $index => $item) :
				$image = $item['item_image'] ?? null;
				$icon  = $item['item_icon'] ?? '';
				$text  = $item['item_text'] ?? '';
				$bg    = $index === 0 ? 'bg-primary-bg' : 'bg-gray-50';
				?>
				<div class="item relative overflow-hidden <?php echo esc_attr($bg); ?>">
					<?php if ($image) : ?>
						<div class="img">
							<a>
								<?php echo get_image_attrachment($image, 'image'); ?>
							</a>
						</div>
					<?php endif; ?>
					<div class="content">
						<?php if ($icon) : ?>
							<div class="box"><i class="material-symbols-outlined text-white"><?php echo esc_html($icon); ?></i></div>
						<?php endif; ?>
						<?php if ($text) : ?>
							<h4 class="heading-6 text-white"><?php echo esc_html($text); ?></h4>
						<?php endif; ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>
