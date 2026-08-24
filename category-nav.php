<?php
/**
 * News category nav — real term links (not JS tabs).
 * Parent wrapper must NOT use class "tab-nav" (main.js preventDefault).
 *
 * Map: post → category. Top-level term = "Tất cả", children = other tabs.
 */
$nav = canhcam_get_term_nav_context('post');

if (empty($nav['root']) && empty($nav['children'])) {
	return;
}
?>
<ul class="list flex flex-wrap items-center justify-center clamp:gap-[16-16]" role="navigation" aria-label="<?php echo esc_attr__('Danh mục tin tức', 'canhcamtheme'); ?>">
	<?php if (!empty($nav['all_url'])) : ?>
		<li<?php echo !empty($nav['is_all_active']) ? ' class="active"' : ''; ?>>
			<a href="<?php echo esc_url($nav['all_url']); ?>">
				<span class="desc body-1"><?php echo esc_html__('Tất cả', 'canhcamtheme'); ?></span>
				<i class="material-symbols-outlined" aria-hidden="true">arrow_drop_down</i>
			</a>
		</li>
	<?php endif; ?>
	<?php foreach ($nav['children'] as $term) :
		$term_link = get_term_link($term);
		if (is_wp_error($term_link)) {
			continue;
		}
		$is_active = (int) $term->term_id === (int) $nav['active_term_id'];
		?>
		<hr>
		<li<?php echo $is_active ? ' class="active"' : ''; ?>>
			<a href="<?php echo esc_url($term_link); ?>">
				<span class="desc body-1"><?php echo esc_html($term->name); ?></span>
				<i class="material-symbols-outlined" aria-hidden="true">arrow_drop_down</i>
			</a>
		</li>
	<?php endforeach; ?>
</ul>
