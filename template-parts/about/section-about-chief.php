<?php
$title = get_field('chief_title');
$featured_photo = get_field('chief_featured_photo');
$featured_name = get_field('chief_featured_name');
$featured_role = get_field('chief_featured_role');
$items = get_field('chief_items');

if (!$title && !$featured_name && empty($items)) {
	return;
}
?>
<section id="anchor-6" class="about-chief pad-8 anchor-section-id bg-grey-50">
	<div class="container">
		<?php if ($title): ?>
			<h2 class="heading-1 text-center mb-10"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<div class="row top-row">
			<div class="col">
				<div class="card flex flex-col items-center chief-figure">
					<?php if ($featured_photo): ?>
						<div class="media bg-grey-d9 w-full overflow-hidden zoom-in">
							<?php echo get_image_attrachment($featured_photo, 'image'); ?>
						</div>
					<?php endif; ?>
					<div class="box bg-white w-full text-center clamp:py-[12-16] clamp:px-[8-8]">
						<?php if ($featured_name): ?>
							<h4 class="heading-4 text-gray-950 uppercase"><?php echo esc_html($featured_name); ?></h4>
						<?php endif; ?>
						<?php if ($featured_role): ?>
							<div class="desc body-2 text-gray-950"><?php echo esc_html($featured_role); ?></div>
						<?php endif; ?>
					</div>
				</div>
			</div>
			<?php if (!empty($items)): ?>
				<div class="col">
					<div class="grid grid-cols-2 gap-8 block-grid list lg:gap-10">
						<?php foreach ($items as $item):
							$photo = $item['item_photo'] ?? null;
							$name = $item['item_name'] ?? '';
							$role = $item['item_role'] ?? '';
							?>
							<div class="item w-full">
								<?php if ($photo): ?>
									<div class="media bg-grey-d9 w-full overflow-hidden zoom-in">
										<?php echo get_image_attrachment($photo, 'image'); ?>
									</div>
								<?php endif; ?>
								<div class="box bg-white w-full text-center clamp:py-[12-12] clamp:px-[4-4]">
									<?php if ($name): ?>
										<h4 class="heading-6 text-gray-950 uppercase"><?php echo esc_html($name); ?></h4>
									<?php endif; ?>
									<?php if ($role): ?>
										<div class="desc body-4 text-gray-950"><?php echo esc_html($role); ?></div>
									<?php endif; ?>
								</div>
							</div>
						<?php endforeach; ?>
					</div>
				</div>
			<?php endif; ?>
		</div>
	</div>
</section>