<?php
/**
 * Develope / Sustainability intro (develope-1).
 *
 * @package Canhcam
 */

$image = get_field('develope_1_image');
$title = get_field('develope_1_title');
$desc  = get_field('develope_1_desc');

if (!$image && !$title && !$desc) {
	return;
}
?>
<section class="develope-1 relative">
	<?php if ($image) : ?>
		<div class="img zoom-in overflow-hidden">
			<a class="img-ratio ratio:pt-[960_1920]">
				<?php echo get_image_attrachment($image, 'image'); ?>
			</a>
		</div>
	<?php endif; ?>
	<div class="container absolute-x top-10 lg:top-20">
		<div class="box-wrap relative relative lg:rem:max-w-[620px]">
			<div class="bg-wrap">
				<?php if ($title) : ?>
					<h2 class="heading-banner text-primary-1 uppercase mb-5"><?php echo esc_html($title); ?></h2>
				<?php endif; ?>
				<?php if ($desc) : ?>
					<div class="desc body-2"><?php echo canhcam_kses_post($desc); ?></div>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>
