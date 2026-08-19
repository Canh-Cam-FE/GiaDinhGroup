<?php
$title = get_field('overview_title');
$content = get_field('overview_content');
$image = get_field('overview_image');

if (!$title && !$content && !$image) {
	return;
}
?>
<section id="anchor-1" class="about-tong-quan-tap-oan anchor-section-id pad-8 bg-white">
	<div class="container-fluid p-0">
		<div class="row justify-between ml-auto">
			<div class="col w-full lg:w-5/12">
				<div class="txt col-left h-full lg:rem:max-w-[600px]">
					<?php if ($title): ?>
						<h2 class="heading-1 text-gray-950 mb-10"><?php echo esc_html($title); ?></h2>
					<?php endif; ?>
					<?php if ($content): ?>
						<div class="desc body-2">
							<?php echo canhcam_kses_post($content); ?>
						</div>
					<?php endif; ?>
				</div>
			</div>
			<div class="col w-full lg:w-6/12">
				<?php if ($image): ?>
					<div class="media overflow-hidden">
						<?php echo get_image_attrachment($image, 'image'); ?>
					</div>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>