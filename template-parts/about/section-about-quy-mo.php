<?php
$title = get_field('scale_title');
$subtitle = get_field('scale_subtitle');
$number = get_field('scale_number');
$label = get_field('scale_label');
$desc = get_field('scale_desc');
$map = get_field('scale_map');

if (!$title && !$subtitle && !$number && !$map) {
	return;
}
?>
<section id="anchor-5" class="about-quy-mo anchor-section-id pad-8">
	<div class="container">
		<?php if ($title): ?>
			<h2 class="heading-1 text-center"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<div class="row">
			<div class="col w-full lg:w-1/2">
				<div class="txt col-left h-full">
					<div class="content flex flex-col gap-4 lg:clamp:gap-[40-40] lg:pr-15 ">
						<?php if ($subtitle): ?>
							<h4 class="heading-4 text-primary-1"><?php echo esc_html($subtitle); ?></h4>
						<?php endif; ?>
						<div class="wrap flex flex-col clamp:gap-[12-12]">
							<?php if ($number): ?>
								<div class="t128-700-120-s-ls-002-upp num counter"><?php echo esc_html($number); ?></div>
							<?php endif; ?>
							<?php if ($label): ?>
								<h4 class="heading-5 text-primary-1"><?php echo esc_html($label); ?></h4>
							<?php endif; ?>
							<?php if ($desc): ?>
								<div class="desc body-2 text-gray-950">
									<?php echo canhcam_kses_post($desc); ?>
								</div>
							<?php endif; ?>
						</div>
					</div>
				</div>
			</div>
			<div class="col w-full relative lg:w-1/2">
				<?php if ($map): ?>
					<div class="map-wrap img-contain flex-center">
						<?php echo get_image_attrachment($map, 'image'); ?>
					</div>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>