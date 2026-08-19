<?php

/**
 * Reusable term-archive helpers (root category + children pattern).
 *
 * Pattern:
 * - One top-level term named like the post type (e.g. "Dự án", "Dịch vụ")
 * - Child terms underneath
 * - Nav: "Tất cả" = root term + child tabs
 * - Breadcrumb: Home | Root [| Child…] (no taxonomy label)
 * - ACF on child empty → fallback to parent term
 *
 * ---------------------------------------------------------------------------
 * Mapping (register once per project):
 *
 *   canhcam_register_term_archive_map('projects', 'projects_category');
 *   canhcam_register_term_archive_map('post', 'category');
 *
 * Or filter:
 *
 *   add_filter('canhcam_term_archive_maps', function ($maps) {
 *       $maps['services'] = array('taxonomy' => 'services_category');
 *       return $maps;
 *   });
 *
 * Then use in templates:
 *
 *   $nav = canhcam_get_term_nav_context('projects');
 *   // $nav['root'], $nav['children'], $nav['all_url'], $nav['is_all_active'], $nav['active_term_id']
 *
 *   $banner = canhcam_get_term_field_with_parent_fallback('banner_select');
 * ---------------------------------------------------------------------------
 */

defined('ABSPATH') || exit;

/**
 * Default maps for this theme — extend via canhcam_register_term_archive_map() or filter.
 *
 * @return array<string, array{taxonomy:string,banner_fields?:string[]}>
 */
function canhcam_get_term_archive_maps_default(): array
{
	return array(
		'projects' => array(
			'taxonomy'      => 'projects_category',
			'banner_fields' => array('banner_select', 'banner_select_page'),
		),
		'sector'   => array(
			'taxonomy'      => 'sector_category',
			'banner_fields' => array('banner_select', 'banner_select_page'),
		),
		'post'     => array(
			'taxonomy'      => 'category',
			'banner_fields' => array('banner_select', 'banner_select_page'),
		),
	);
}

/**
 * Registered maps (post_type => config).
 *
 * @return array<string, array{taxonomy:string,banner_fields?:string[]}>
 */
function canhcam_get_term_archive_maps(): array
{
	static $maps = null;

	if ($maps !== null) {
		return $maps;
	}

	$maps = apply_filters('canhcam_term_archive_maps', canhcam_get_term_archive_maps_default());

	return is_array($maps) ? $maps : array();
}

/**
 * Register a post_type → taxonomy archive map.
 *
 * @param string $post_type
 * @param string $taxonomy
 * @param array  $args Optional: banner_fields (string[])
 */
function canhcam_register_term_archive_map(string $post_type, string $taxonomy, array $args = []): void
{
	add_filter('canhcam_term_archive_maps', function ($maps) use ($post_type, $taxonomy, $args) {
		if (!is_array($maps)) {
			$maps = array();
		}

		$maps[$post_type] = array_merge(
			array(
				'taxonomy'      => $taxonomy,
				'banner_fields' => array('banner_select', 'banner_select_page'),
			),
			$args,
			array('taxonomy' => $taxonomy)
		);

		return $maps;
	});
}

/**
 * Resolve taxonomy slug from post_type key, taxonomy slug, or current query.
 *
 * @param string|null $post_type_or_taxonomy
 */
function canhcam_resolve_archive_taxonomy($post_type_or_taxonomy = null): string
{
	$maps = canhcam_get_term_archive_maps();

	if (is_string($post_type_or_taxonomy) && $post_type_or_taxonomy !== '') {
		if (isset($maps[$post_type_or_taxonomy]['taxonomy'])) {
			return (string) $maps[$post_type_or_taxonomy]['taxonomy'];
		}

		foreach ($maps as $config) {
			if (!empty($config['taxonomy']) && $config['taxonomy'] === $post_type_or_taxonomy) {
				return (string) $config['taxonomy'];
			}
		}

		if (taxonomy_exists($post_type_or_taxonomy)) {
			return $post_type_or_taxonomy;
		}
	}

	if (is_tax() || is_category() || is_tag()) {
		$term = get_queried_object();
		if ($term instanceof WP_Term) {
			return $term->taxonomy;
		}
	}

	if (is_post_type_archive()) {
		$pto = get_query_var('post_type');
		if (is_array($pto)) {
			$pto = reset($pto);
		}
		if (is_string($pto) && isset($maps[$pto]['taxonomy'])) {
			return (string) $maps[$pto]['taxonomy'];
		}
	}

	if (is_home() && !is_front_page() && isset($maps['post']['taxonomy'])) {
		return (string) $maps['post']['taxonomy'];
	}

	return '';
}

/**
 * Get post_type key for a taxonomy from the map.
 */
function canhcam_get_post_type_for_taxonomy(string $taxonomy): string
{
	foreach (canhcam_get_term_archive_maps() as $post_type => $config) {
		if (!empty($config['taxonomy']) && $config['taxonomy'] === $taxonomy) {
			return (string) $post_type;
		}
	}

	return '';
}

/**
 * Whether taxonomy is registered in term-archive maps.
 */
function canhcam_is_mapped_taxonomy(string $taxonomy): bool
{
	return canhcam_get_post_type_for_taxonomy($taxonomy) !== '';
}

/**
 * Whether current request is a mapped post type archive.
 */
function canhcam_is_mapped_post_type_archive(): bool
{
	if (!is_post_type_archive()) {
		return false;
	}

	$pto = get_query_var('post_type');
	if (is_array($pto)) {
		$pto = reset($pto);
	}

	$maps = canhcam_get_term_archive_maps();

	return is_string($pto) && isset($maps[$pto]);
}

/**
 * Whether an ACF value should be treated as empty for fallback purposes.
 *
 * @param mixed $value
 */
function canhcam_is_empty_acf_value($value): bool
{
	if ($value === null || $value === false || $value === '') {
		return true;
	}

	if (is_array($value)) {
		return empty($value);
	}

	return false;
}

/**
 * Get ACF field on a term; if empty, walk up parent terms until a value is found.
 *
 * @param string       $field_name ACF field name.
 * @param WP_Term|null $term       Term to start from. Default: queried term.
 * @param bool         $format     Whether to format value via ACF (get_field). Default true.
 * @return mixed|null
 */
function canhcam_get_term_field_with_parent_fallback($field_name, $term = null, $format = true)
{
	if (!$term instanceof WP_Term) {
		$queried = get_queried_object();
		$term    = $queried instanceof WP_Term ? $queried : null;
	}

	if (!$term instanceof WP_Term || $field_name === '') {
		return null;
	}

	$current = $term;
	$guard   = 0;

	while ($current instanceof WP_Term && $guard < 20) {
		$acf_id = $current->taxonomy . '_' . $current->term_id;
		$value  = $format
			? get_field($field_name, $acf_id)
			: get_field($field_name, $acf_id, false);

		if (!canhcam_is_empty_acf_value($value)) {
			return $value;
		}

		if ((int) $current->parent <= 0) {
			break;
		}

		$parent = get_term((int) $current->parent, $current->taxonomy);
		if (!$parent || is_wp_error($parent)) {
			break;
		}

		$current = $parent;
		$guard++;
	}

	return null;
}

/**
 * Walk a term up to its top-level ancestor.
 */
function canhcam_get_term_top_ancestor(WP_Term $term): WP_Term
{
	$current = $term;
	$guard   = 0;

	while ($current instanceof WP_Term && (int) $current->parent > 0 && $guard < 20) {
		$parent = get_term((int) $current->parent, $current->taxonomy);
		if (!$parent || is_wp_error($parent)) {
			break;
		}
		$current = $parent;
		$guard++;
	}

	return $current;
}

/**
 * Get root (top-level) term for a mapped post_type / taxonomy.
 *
 * @param string|null $post_type_or_taxonomy
 * @return WP_Term|null
 */
function canhcam_get_term_nav_root($post_type_or_taxonomy = null)
{
	$taxonomy = canhcam_resolve_archive_taxonomy($post_type_or_taxonomy);

	if ($taxonomy === '') {
		return null;
	}

	if ((is_tax($taxonomy) || ($taxonomy === 'category' && is_category()) || ($taxonomy === 'post_tag' && is_tag()))) {
		$term = get_queried_object();
		if ($term instanceof WP_Term && $term->taxonomy === $taxonomy) {
			return canhcam_get_term_top_ancestor($term);
		}
	}

	$roots = get_terms(array(
		'taxonomy'   => $taxonomy,
		'hide_empty' => false,
		'parent'     => 0,
		'orderby'    => 'term_id',
		'order'      => 'ASC',
		'number'     => 1,
	));

	if (empty($roots) || is_wp_error($roots)) {
		return null;
	}

	return $roots[0];
}

/**
 * Child terms under a root term (zone-nav tabs).
 *
 * @param WP_Term $root
 * @param array   $args get_terms overrides
 * @return WP_Term[]
 */
function canhcam_get_term_nav_children(WP_Term $root, array $args = []): array
{
	$children = get_terms(array_merge(array(
		'taxonomy'   => $root->taxonomy,
		'hide_empty' => true,
		'parent'     => (int) $root->term_id,
		'orderby'    => 'name',
		'order'      => 'ASC',
	), $args));

	if (empty($children) || is_wp_error($children)) {
		return array();
	}

	return $children;
}

/**
 * Nav context for zone-nav / category tabs.
 *
 * @param string|null $post_type_or_taxonomy
 * @return array{
 *   taxonomy:string,
 *   post_type:string,
 *   root:?WP_Term,
 *   children:WP_Term[],
 *   all_url:string,
 *   is_all_active:bool,
 *   active_term_id:int
 * }
 */
function canhcam_get_term_nav_context($post_type_or_taxonomy = null): array
{
	$taxonomy  = canhcam_resolve_archive_taxonomy($post_type_or_taxonomy);
	$post_type = $taxonomy !== '' ? canhcam_get_post_type_for_taxonomy($taxonomy) : '';
	$root      = $taxonomy !== '' ? canhcam_get_term_nav_root($taxonomy) : null;
	$children  = $root instanceof WP_Term ? canhcam_get_term_nav_children($root) : array();

	$active_term_id = 0;
	if (is_tax() || is_category() || is_tag()) {
		$queried = get_queried_object();
		if ($queried instanceof WP_Term && ($taxonomy === '' || $queried->taxonomy === $taxonomy)) {
			$active_term_id = (int) $queried->term_id;
		}
	}

	$all_url = '';
	if ($root instanceof WP_Term) {
		$link = get_term_link($root);
		$all_url = is_wp_error($link) ? '' : $link;
	}

	if ($all_url === '' && $post_type !== '') {
		$archive = get_post_type_archive_link($post_type);
		$all_url = $archive ? $archive : '';
	}

	$is_all_active = false;
	if ($root instanceof WP_Term && $active_term_id === (int) $root->term_id) {
		$is_all_active = true;
	} elseif ($post_type !== '' && is_post_type_archive($post_type) && !is_tax()) {
		$is_all_active = true;
	} elseif ($post_type === 'post' && is_home() && !is_front_page() && $active_term_id === 0) {
		// Blog index without a root-term URL — treat as "all" until root term is used.
		$is_all_active = true;
	}

	return array(
		'taxonomy'        => $taxonomy,
		'post_type'       => $post_type,
		'root'            => $root,
		'children'        => $children,
		'all_url'         => $all_url,
		'is_all_active'   => $is_all_active,
		'active_term_id'  => $active_term_id,
	);
}

/**
 * Resolve banner post ID from a term (with parent fallback) using mapped banner fields.
 *
 * @param WP_Term|null $term
 * @param string|null  $post_type_or_taxonomy Used to read banner_fields from map.
 */
function canhcam_get_term_banner_id($term = null, $post_type_or_taxonomy = null)
{
	if (!$term instanceof WP_Term) {
		$queried = get_queried_object();
		$term    = $queried instanceof WP_Term ? $queried : null;
	}

	if (!$term instanceof WP_Term) {
		return null;
	}

	$post_type = canhcam_get_post_type_for_taxonomy($term->taxonomy);
	$maps      = canhcam_get_term_archive_maps();
	$fields    = array('banner_select', 'banner_select_page');

	if ($post_type && !empty($maps[$post_type]['banner_fields']) && is_array($maps[$post_type]['banner_fields'])) {
		$fields = $maps[$post_type]['banner_fields'];
	}

	foreach ($fields as $field_name) {
		$value = canhcam_get_term_field_with_parent_fallback($field_name, $term);
		if (function_exists('canhcam_resolve_banner_post_id')) {
			$resolved = canhcam_resolve_banner_post_id($value);
			if ($resolved) {
				return $resolved;
			}
		} elseif (!canhcam_is_empty_acf_value($value)) {
			return is_numeric($value) ? (int) $value : $value;
		}
	}

	return null;
}

/**
 * BC wrappers — projects-specific names used by existing templates.
 *
 * @return WP_Term|null
 */
function canhcam_get_projects_nav_root_term()
{
	return canhcam_get_term_nav_root('projects');
}

/**
 * @param WP_Term $root
 * @return WP_Term[]
 */
function canhcam_get_projects_nav_child_terms(WP_Term $root): array
{
	return canhcam_get_term_nav_children($root);
}

/**
 * Rank Math breadcrumb: Home | Root [| Child…] for mapped taxonomies / CPT archives.
 */
add_filter('rank_math/frontend/breadcrumb/items', function ($crumbs, $class) {
	if (!is_array($crumbs) || empty($crumbs)) {
		return $crumbs;
	}

	// Mapped taxonomy term archive
	if (is_tax() || is_category() || is_tag()) {
		$term = get_queried_object();
		if ($term instanceof WP_Term && canhcam_is_mapped_taxonomy($term->taxonomy)) {
			$new_crumbs   = array($crumbs[0]);
			$ancestor_ids = array_reverse(get_ancestors($term->term_id, $term->taxonomy));

			foreach ($ancestor_ids as $ancestor_id) {
				$ancestor = get_term((int) $ancestor_id, $term->taxonomy);
				if ($ancestor && !is_wp_error($ancestor)) {
					$new_crumbs[] = array($ancestor->name, get_term_link($ancestor));
				}
			}

			$new_crumbs[] = array($term->name, '');

			return $new_crumbs;
		}
	}

	// Mapped CPT archive → Home | Root term name
	if (canhcam_is_mapped_post_type_archive()) {
		$pto = get_query_var('post_type');
		if (is_array($pto)) {
			$pto = reset($pto);
		}
		$root = is_string($pto) ? canhcam_get_term_nav_root($pto) : null;
		if ($root instanceof WP_Term) {
			return array(
				$crumbs[0],
				array($root->name, ''),
			);
		}
	}

	return $crumbs;
}, 20, 2);
