<?php
/**
 * Project card (grid / related).
 *
 * @var int|null $post_id Optional post ID; defaults to current post.
 */
$post_id  = isset($post_id) ? (int) $post_id : get_the_ID();
$permalink = get_permalink($post_id);
$location  = get_field('project_location', $post_id);
$scale     = get_field('project_scale', $post_id);
?>
<div class="item bg-white project-item">
	<div class="media zoom-in">
		<a href="<?php echo esc_url($permalink); ?>">
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
