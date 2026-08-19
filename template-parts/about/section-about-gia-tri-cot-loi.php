<?php
$title = get_field('values_title');
$items = get_field('values_items');

if (empty($items)) {
	return;
}
?>
<section class="about-gia-tri-cot-loi pad-8">
	<div class="container">
		<?php if ($title): ?>
			<h2 class="heading-1 text-gray-950 mb-10 text-center"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<div class="list grid grid-cols-1 w-full sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:clamp:gap-[40-40]">
			<?php foreach ($items as $item):
				$icon = $item['item_icon'] ?? null;
				$item_title = $item['item_title'] ?? '';
				$number = $item['item_number'] ?? '';
				$desc = $item['item_desc'] ?? '';
				?>
				<div class="item flex flex-col justify-end rem:rounded-[20px] p-5 lg:clamp:p-[24-24]">
					<?php if ($icon): ?>
						<div class="icon img-contain rem:w-[80px] rem:h-[80px]">
							<?php
							$icon_html = get_image_attrachment($icon, 'image');
							echo str_replace('class="lozad ', 'class="lozad js-inline-svg ', $icon_html);
							?>
						</div>
					<?php endif; ?>
					<div class="content flex flex-col clamp:gap-[12-12]">
						<div class="wrap flex items-end justify-between relative clamp:gap-[8-8]">
							<?php if ($item_title): ?>
								<h4 class="heading-5 text-primary-1 whitespace-nowrap"><?php echo esc_html($item_title); ?></h4>
							<?php endif; ?>
							<?php if ($number): ?>
								<div class="t72-700-94-s2-ls-004-avc num"><?php echo esc_html($number); ?></div>
							<?php endif; ?>
						</div>
						<hr>
						<?php if ($desc): ?>
							<div class="desc body-2 text-gray-950">
								<?php echo canhcam_kses_post($desc); ?>
							</div>
						<?php endif; ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>