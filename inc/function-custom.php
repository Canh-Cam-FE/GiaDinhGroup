<?php

function log_dump($data)
{
	ob_start();
	var_dump($data);
	$dump = ob_get_clean();

	$highlighted = highlight_string("<?php\n" . $dump . "\n?>", true);

$formatted = '
<pre>' . substr($highlighted, 27, -8) . '</pre>';

$custom_css = 'pre {position: static;
background: #ffffff80;
// max-height: 50vh;
width: 100vw;
}
pre::-webkit-scrollbar{
width: 1rem;}';

$formatted_css = '<style>
' . $custom_css . '
</style>';
echo ($formatted_css . $formatted);
}

function empty_content($str)
{
return trim(str_replace('&nbsp;', '', strip_tags($str, '<img>'))) == '';
}

class Canhcam_Desktop_Menu_Walker extends Walker_Nav_Menu
{
	public function start_lvl(&$output, $depth = 0, $args = null)
	{
		$output .= '<ul class="sub-menu">';
	}

	public function end_lvl(&$output, $depth = 0, $args = null)
	{
		$output .= '</ul>';
	}

	public function start_el(&$output, $item, $depth = 0, $args = null, $id = 0)
	{
		$classes   = empty($item->classes) ? array() : (array) $item->classes;
		$classes[] = 'menu-item';

		$has_children = in_array('menu-item-has-children', $classes, true);

		$class_names = implode(' ', array_filter(array_unique($classes)));
		$class_attr  = $class_names ? ' class="' . esc_attr($class_names) . '"' : '';
		$id_attr     = ' id="menu-item-' . esc_attr($item->ID) . '"';

		$output .= '<li' . $id_attr . $class_attr . '>';

		$title  = apply_filters('the_title', $item->title, $item->ID);
		$title  = apply_filters('nav_menu_item_title', $title, $item, $args, $depth);
		$url    = !empty($item->url) ? $item->url : '#';
		$target = !empty($item->target) ? ' target="' . esc_attr($item->target) . '"' : '';

		// Parent with submenu: block navigation click.
		$link_attrs = '';
		if ($has_children) {
			$url        = '#';
			$target     = '';
			$link_attrs = ' onclick="return false;" aria-haspopup="true"';
		}

		$link = '<a href="' . esc_url($url) . '"' . $target . $link_attrs . '>' . esc_html($title) . '</a>';

		if (0 === (int) $depth) {
			$output .= '<div class="title">' . $link . '</div>';
		} else {
			$output .= $link;
		}
	}

	public function end_el(&$output, $item, $depth = 0, $args = null)
	{
		$output .= '</li>';
	}
}

/**
 * Mobile menu walker — simple flat list matching mobile-menu-nav mockup.
 * Output: <li class="menu-item …"><a href="…">Title</a></li>
 */
class Canhcam_Mobile_Menu_Walker extends Walker_Nav_Menu
{
	public function start_lvl(&$output, $depth = 0, $args = null)
	{
		$output .= '<ul class="sub-menu">';
	}

	public function end_lvl(&$output, $depth = 0, $args = null)
	{
		$output .= '</ul>';
	}

	public function start_el(&$output, $item, $depth = 0, $args = null, $id = 0)
	{
		$classes   = empty($item->classes) ? array() : (array) $item->classes;
		$classes[] = 'menu-item';

		$has_children = in_array('menu-item-has-children', $classes, true);

		$class_names = implode(' ', array_filter(array_unique($classes)));
		$class_attr  = $class_names ? ' class="' . esc_attr($class_names) . '"' : '';
		$id_attr     = ' id="menu-item-' . esc_attr($item->ID) . '"';

		$output .= '<li' . $id_attr . $class_attr . '>';

		$title = apply_filters('the_title', $item->title, $item->ID);
		$title = apply_filters('nav_menu_item_title', $title, $item, $args, $depth);
		$url   = !empty($item->url) ? $item->url : '#';

		// Parent with submenu: block navigation click.
		$link_attrs = '';
		if ($has_children) {
			$url        = '#';
			$link_attrs = ' onclick="return false;" aria-haspopup="true"';
		}

		$output .= '<a href="' . esc_url($url) . '"' . $link_attrs . '>' . esc_html($title) . '</a>';
	}

	public function end_el(&$output, $item, $depth = 0, $args = null)
	{
		$output .= '</li>';
	}
}

		?>
		<?php
/**
 * Search helpers: grouped search by post type and labels.
 */

/**
 * Post types included in site search.
 *
 * @return array<int, string>
 */
function canhcam_get_search_post_types()
{
	return array('projects', 'sector', 'post');
}

/**
 * Default search section labels keyed by post type.
 *
 * @return array<string, string>
 */
function canhcam_get_search_post_type_label_defaults()
{
	return array(
		'projects' => esc_html__('Dự án', 'canhcamtheme'),
		'sector'   => esc_html__('Lĩnh vực', 'canhcamtheme'),
		'post'     => esc_html__('Tin tức', 'canhcamtheme'),
	);
}

/**
 * Get section title for a searchable post type.
 *
 * @param string $post_type Post type slug.
 * @return string
 */
function canhcam_get_search_post_type_label($post_type)
{
	$defaults = canhcam_get_search_post_type_label_defaults();

	if (isset($defaults[$post_type])) {
		$label = __($defaults[$post_type], 'canhcamtheme');
	} else {
		$post_type_object = get_post_type_object($post_type);
		$label            = ($post_type_object && !empty($post_type_object->labels->name))
			? $post_type_object->labels->name
			: ucfirst($post_type);
	}

	return apply_filters('canhcam_search_post_type_label', $label, $post_type);
}

/**
 * Get card template part slug for search results.
 * Return empty to use generic markup when no specific template exists.
 *
 * @param string $post_type Post type slug.
 * @return string
 */
function canhcam_get_search_card_template($post_type)
{
	$templates = array(
		'projects' => 'template-parts/project/project-card',
		'sector'   => 'template-parts/sector/sector-card',
		'post'     => 'template-parts/news/news-card',
	);

	return $templates[$post_type] ?? '';
}

/**
 * Get grid wrapper classes for search result cards.
 *
 * @param string $post_type   Post type slug.
 * @param string $extra_class Optional extra classes to append.
 * @return string
 */
function canhcam_get_search_grid_class($post_type, $extra_class = '')
{
	$base = 'grid grid-cols-3 gap-5';

	$extra = is_string($extra_class) ? trim($extra_class) : '';

	return $extra ? $base . ' ' . $extra : $base;
}

/**
 * Optional extra class per post type for search grids.
 *
 * @param string $post_type Post type slug.
 * @return string
 */
function canhcam_get_search_grid_extra_class($post_type)
{
	$map = array(
		'projects' => 'list grid grid-cols-1 md:grid-cols-2 mt-10 lg:grid-cols-3 clamp:gap-[40-40]',
		'sector'   => 'search-grid-sector home-linh-vuc-hoat-ong pad-8',
		'post'     => 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bottom-block pt-10 lg:gap-10',
	);

	return $map[$post_type] ?? '';
}

/**Thêm
 * Get grouped search results by post type.
 *
 * @param string $search_query Search keyword.
 * @return array<string, array<int, int>>
 */
function canhcam_get_search_results_grouped($search_query = '')
{
	$search_query = $search_query ? $search_query : get_search_query();
	$search_query = trim((string) $search_query);

	if ($search_query === '') {
		return array();
	}

	$grouped = array();

	foreach (canhcam_get_search_post_types() as $post_type) {
		$query = new WP_Query(
			array(
				'post_type'      => $post_type,
				'post_status'    => 'publish',
				's'              => $search_query,
				'posts_per_page' => -1,
				'no_found_rows'  => true,
			)
		);

		if ($query->have_posts()) {
			$grouped[$post_type] = wp_list_pluck($query->posts, 'ID');
		}

		wp_reset_postdata();
	}

	return $grouped;
}

// end search helpers