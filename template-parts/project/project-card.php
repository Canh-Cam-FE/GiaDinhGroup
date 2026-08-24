<?php

$post_id   = isset($post_id) ? (int) $post_id : get_the_ID();
$permalink = get_permalink($post_id);
$location  = get_field('project_location', $post_id);
$scale     = get_field('project_scale', $post_id);
$gallery   = get_field('project_gallery', $post_id);


$list_gallery = array();

$thumbnail_id = get_post_thumbnail_id($post_id);

if ($thumbnail_id) {
	$list_gallery[] = $thumbnail_id;
}

if ($gallery) {
	foreach ($gallery as $image) {
		$image_id = isset($image['ID']) ? (int) $image['ID'] : 0;

		if ($image_id) {
			$list_gallery[] = $image_id;
		}
	}
}

$list_gallery = array_unique($list_gallery);
?>
<div class="item bg-white project-item">
	<?php if ($list_gallery) : ?>
		<div class="gallery-swiper swiper">
			<div class="swiper-wrapper">

				<?php foreach ($list_gallery as $image_id) : ?>
					<div class="swiper-slide">
						<div class="media zoom-in">
							<a href="javascript:;">
								<?php
								echo wp_get_attachment_image(
									$image_id,
									'large',
									false,
									array(
										'class'   => 'lozad',
										'loading' => 'lazy',
										'alt'     => '',
									)
								);
								?>
							</a>
						</div>
					</div>
				<?php endforeach; ?>

			</div>
		</div>
	<?php endif; ?>
	<div class="content">
		<h4>
			<a class="heading-5 text-gray-950" href="<?php echo esc_url($permalink); ?>">
				<?php echo esc_html(get_the_title($post_id)); ?>
			</a>
		</h4>
		<?php if ($location || $scale) : ?>
			<div class="desc body-2 text-gray-950">
				<ul>
					<?php if ($location) : ?>
						<li><?php echo esc_html(sprintf(__('Vị Trí: %s', 'canhcamtheme'), $location)); ?></li>
					<?php endif; ?>
					<?php if ($scale) : ?>
						<li><?php echo esc_html(sprintf(__('Quy Mô: %s', 'canhcamtheme'), $scale)); ?></li>
					<?php endif; ?>
				</ul>
			</div>
		<?php endif; ?>
	</div>
</div>