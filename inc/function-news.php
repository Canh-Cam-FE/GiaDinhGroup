<?php

/**
 * News archive helpers (adapted from OIC pattern).
 */

defined('ABSPATH') || exit;

/**
 * Check if current archive is a post taxonomy archive.
 */
function canhcam_is_post_taxonomy_archive()
{
	return is_category() || is_tag() || (is_tax() && !is_tax('projects_category'));
}

/**
 * Get active term ID for news category navigation.
 */
function canhcam_get_active_news_term_id()
{
	if (is_category() || is_tag() || is_tax()) {
		$term = get_queried_object();
		if ($term instanceof WP_Term) {
			return (int) $term->term_id;
		}
	}

	return 0;
}

/**
 * Get top-level terms for a hierarchical taxonomy.
 */
function canhcam_get_news_top_level_terms($taxonomy = 'category')
{
	$terms = get_terms(array(
		'taxonomy'   => $taxonomy,
		'hide_empty' => true,
		'parent'     => 0,
		'orderby'    => 'name',
		'order'      => 'ASC',
	));

	if (empty($terms) || is_wp_error($terms)) {
		return array();
	}

	return $terms;
}

/**
 * Get child terms for nav when viewing a parent/child category.
 */
function canhcam_get_news_child_nav_terms($taxonomy, WP_Term $current)
{
	$children = get_terms(array(
		'taxonomy'   => $taxonomy,
		'hide_empty' => true,
		'parent'     => $current->term_id,
		'orderby'    => 'name',
		'order'      => 'ASC',
	));

	if (!empty($children) && !is_wp_error($children)) {
		return $children;
	}

	if ($current->parent > 0) {
		$siblings = get_terms(array(
			'taxonomy'   => $taxonomy,
			'hide_empty' => true,
			'parent'     => $current->parent,
			'orderby'    => 'name',
			'order'      => 'ASC',
		));

		if (!empty($siblings) && !is_wp_error($siblings)) {
			return $siblings;
		}
	}

	return array();
}

/**
 * Resolve nav-primary terms based on current archive context.
 */
function canhcam_get_news_nav_terms()
{
	if (is_category()) {
		$current = get_queried_object();
		if ($current instanceof WP_Term) {
			$child_nav = canhcam_get_news_child_nav_terms('category', $current);
			if (!empty($child_nav)) {
				return $child_nav;
			}
		}

		return canhcam_get_news_top_level_terms('category');
	}

	if (is_tax() && !is_tax('projects_category')) {
		$current = get_queried_object();
		if ($current instanceof WP_Term) {
			$tax_object = get_taxonomy($current->taxonomy);
			if ($tax_object && $tax_object->hierarchical) {
				$child_nav = canhcam_get_news_child_nav_terms($current->taxonomy, $current);
				if (!empty($child_nav)) {
					return $child_nav;
				}
			}
		}

		return canhcam_get_news_top_level_terms('category');
	}

	return canhcam_get_news_top_level_terms('category');
}

/**
 * Render news archive pagination markup.
 */
function canhcam_render_news_pagination($query = null)
{
	$query = $query instanceof WP_Query ? $query : $GLOBALS['wp_query'];

	if ($query->max_num_pages <= 1) {
		return;
	}

	$current = max(1, (int) get_query_var('paged'));
	?>
	<div class="pages">
		<div class="modulepager">
			<ul class="pagination">
				<?php for ($page = 1; $page <= $query->max_num_pages; $page++) : ?>
					<li<?php echo $page === $current ? ' class="active"' : ''; ?>>
						<a href="<?php echo esc_url(get_pagenum_link($page)); ?>"><?php echo esc_html((string) $page); ?></a>
					</li>
				<?php endfor; ?>
			</ul>
		</div>
	</div>
	<?php
}
