<?php
/**
 * Sector card for search results.
 *
 * @var int|null $post_id
 */
$post_id = isset($post_id) ? (int) $post_id : get_the_ID();
$permalink = get_permalink($post_id);
$excerpt = get_the_excerpt($post_id);
?>
<div class="item sector-item">
	<div class="img zoom-in overflow-hidden">
		<a href="<?php echo esc_url($permalink); ?>" class="img-ratio ratio:pt-[440_453]">
			<?php if (has_post_thumbnail($post_id)) : ?>
				<?php echo get_image_post($post_id, 'image'); ?>
			<?php endif; ?>
		</a>
	</div>
	<div class="content">
		<h4>
			<a class="heading-5 text-gray-950" href="<?php echo esc_url($permalink); ?>">
				<?php echo esc_html(get_the_title($post_id)); ?>
			</a>
		</h4>
		<?php if ($excerpt) : ?>
			<div class="desc body-2 text-gray-950"><?php echo esc_html($excerpt); ?></div>
		<?php endif; ?>
	</div>
</div>
