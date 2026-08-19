<?php
/**
 * Develope / Sustainability content rows (develope-2).
 *
 * @package Canhcam
 */

$items = get_field('develope_2_items');

if (empty($items)) {
	return;
}
?>
<section class="develope-2">
	<?php foreach ($items as $item) :
		$image   = $item['item_image'] ?? null;
		$title   = $item['item_title'] ?? '';
		$content = $item['item_content'] ?? '';
	?>
		<div class="row">
			<div class="col w-full md:w-1/2">
				<?php if ($image) : ?>
					<div class="img zoom-in overflow-hidden">
						<a><?php echo get_image_attrachment($image, 'image'); ?></a>
					</div>
				<?php endif; ?>
			</div>
			<div class="col w-full md:w-1/2">
				<div class="txt col-left h-full max-md:py-10 max-md:px-[15px]">
					<?php if ($title) : ?>
						<h2 class="heading-1 text-white mb-5"><?php echo esc_html($title); ?></h2>
					<?php endif; ?>
					<?php if ($content) : ?>
						<div class="scrollbar-wrap">
							<div class="desc body-2 text-white"><?php echo canhcam_kses_post($content); ?></div>
						</div>
					<?php endif; ?>
				</div>
			</div>
		</div>
	<?php endforeach; ?>
</section>
