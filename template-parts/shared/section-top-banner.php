<?php
/**
 * Shared top banner + breadcrumb.
 *
 * @param array $args {
 *   @type bool   $show_banner   Show top-banner image. Default true.
 *   @type string $title         Override heading. Default auto.
 *   @type array  $banner_image  Optional ACF image array (skips banner CPT).
 * }
 */

$args = wp_parse_args(isset($args) ? $args : array(), array(
	'show_banner'  => true,
	'title'        => '',
	'banner_image' => null,
));

$title       = $args['title'] !== '' ? $args['title'] : canhcam_get_banner_heading_title();
$show_banner = !empty($args['show_banner']);
$banner_img  = !empty($args['banner_image']) ? $args['banner_image'] : null;
$banner_id   = null;
$has_image   = false;

if ($banner_img) {
	$has_image = true;
} elseif ($show_banner) {
	$banner_id = canhcam_get_selected_banner_id();
	$has_image = $banner_id && has_post_thumbnail($banner_id);
}

if (!$show_banner && !$banner_img) {
	?>
	<div class="global-breadcrumb">
		<div class="container">
			<?php if ($title) : ?>
				<h2 class="heading-banner text-4xl lg:text-6xl font-bold uppercase"><?php echo esc_html($title); ?></h2>
			<?php endif; ?>
			<?php canhcam_render_breadcrumb(); ?>
		</div>
	</div>
	<?php
	return;
}
?>
<div class="banner-breadcrumb">
	<?php if ($has_image) : ?>
		<section class="top-banner single init-swiper">
			<div class="swiper overflow-hidden">
				<div class="swiper-wrapper">
					<div class="swiper-slide">
						<div class="img zoom-in overflow-hidden">
							<a class="img-ratio ratio:pt-[496_1920]">
								<?php
								if ($banner_img) {
									echo get_image_attrachment($banner_img, 'image');
								} else {
									echo get_image_post($banner_id, 'image');
								}
								?>
							</a>
						</div>
					</div>
				</div>
			</div>
		</section>
	<?php endif; ?>
	<div class="global-breadcrumb">
		<div class="container">
			<?php if ($title) : ?>
				<h2 class="heading-banner text-white text-4xl lg:text-6xl font-bold uppercase"><?php echo esc_html($title); ?></h2>
			<?php endif; ?>
			<?php canhcam_render_breadcrumb(); ?>
		</div>
	</div>
</div>
