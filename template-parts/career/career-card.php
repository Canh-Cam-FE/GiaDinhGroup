<?php
/**
 * Career card for search results.
 *
 * @var int|null $post_id
 */
$post_id = isset($post_id) ? (int) $post_id : get_the_ID();
$permalink = get_permalink($post_id);
$info = get_field('career_information', $post_id);
$location = !empty($info['location']) ? $info['location'] : '';
$deadline = !empty($info['application_deadline']) ? canhcam_format_career_deadline($info['application_deadline']) : '';
?>
<div class="item career-item">
	<div class="content">
		<h4>
			<a class="heading-5 text-gray-950" href="<?php echo esc_url($permalink); ?>">
				<?php echo esc_html(get_the_title($post_id)); ?>
			</a>
		</h4>
		<div class="meta body-2 text-gray-700">
			<?php if ($location) : ?><div><?php echo esc_html($location); ?></div><?php endif; ?>
			<?php if ($deadline) : ?><div><?php echo esc_html($deadline); ?></div><?php endif; ?>
		</div>
	</div>
</div>
