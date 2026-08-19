<?php

/**
 * Career list helpers (adapted from OIC pattern).
 * Templates for career page/single are deferred — helpers ready for later use.
 */

defined('ABSPATH') || exit;

/**
 * Get career list pagination settings from career page ACF.
 */
function canhcam_get_career_list_settings($page_id = 0)
{
	$page_id = $page_id ?: get_the_ID();

	return array(
		'initial'   => max(1, (int) get_field('career_list_per_page', $page_id) ?: 10),
		'load_more' => max(1, (int) get_field('career_list_load_more', $page_id) ?: 5),
	);
}

/**
 * Build WP_Query args for career list with offset-based load more.
 */
function canhcam_get_career_list_query_args($page = 1, $page_id = 0)
{
	$settings = canhcam_get_career_list_settings($page_id);
	$page     = max(1, (int) $page);

	if ($page <= 1) {
		return array(
			'post_type'      => 'career',
			'post_status'    => 'publish',
			'posts_per_page' => $settings['initial'],
			'orderby'        => 'date',
			'order'          => 'DESC',
		);
	}

	$offset = $settings['initial'] + ($page - 2) * $settings['load_more'];

	return array(
		'post_type'      => 'career',
		'post_status'    => 'publish',
		'posts_per_page' => $settings['load_more'],
		'offset'         => $offset,
		'orderby'        => 'date',
		'order'          => 'DESC',
	);
}

/**
 * Count published career posts.
 */
function canhcam_get_career_total_count()
{
	$counts = wp_count_posts('career');

	return isset($counts->publish) ? (int) $counts->publish : 0;
}

/**
 * Check if more career posts are available after a given page.
 */
function canhcam_career_has_more($page = 1, $page_id = 0)
{
	$settings = canhcam_get_career_list_settings($page_id);
	$total    = canhcam_get_career_total_count();
	$page     = max(1, (int) $page);

	if ($page <= 1) {
		return $total > $settings['initial'];
	}

	$loaded = $settings['initial'] + ($page - 1) * $settings['load_more'];

	return $loaded < $total;
}

/**
 * Format career deadline for display.
 */
function canhcam_format_career_deadline($date)
{
	if (empty($date)) {
		return '';
	}

	$timestamp = strtotime($date);

	if (!$timestamp) {
		return esc_html($date);
	}

	return date_i18n('d.m.Y', $timestamp);
}

/**
 * Get career image (ACF field with featured image fallback).
 */
function canhcam_get_career_image($post_id = null)
{
	$post_id = $post_id ?: get_the_ID();
	$image   = get_field('career_image', $post_id);

	if (!empty($image)) {
		return $image;
	}

	if (has_post_thumbnail($post_id)) {
		return array('ID' => get_post_thumbnail_id($post_id));
	}

	return null;
}

/**
 * Get career page ID assigned to career list template.
 */
function canhcam_get_career_page_id()
{
	$pages = get_posts(array(
		'post_type'      => 'page',
		'post_status'    => 'publish',
		'posts_per_page' => 1,
		'meta_key'       => '_wp_page_template',
		'meta_value'     => 'templates/template-career.php',
		'fields'         => 'ids',
	));

	return !empty($pages) ? (int) $pages[0] : 0;
}

/**
 * AJAX: load more career rows.
 */
function canhcam_ajax_load_more_careers()
{
	check_ajax_referer('canhcam_career_load_more', 'nonce');

	$page     = isset($_POST['page']) ? max(2, (int) $_POST['page']) : 2;
	$page_id  = isset($_POST['page_id']) ? (int) $_POST['page_id'] : 0;
	$start_no = isset($_POST['start_no']) ? max(1, (int) $_POST['start_no']) : 1;

	$query = new WP_Query(canhcam_get_career_list_query_args($page, $page_id));

	ob_start();

	if ($query->have_posts()) {
		$index = $start_no;
		while ($query->have_posts()) {
			$query->the_post();
			get_template_part('template-parts/career/career-list-row', null, array('index' => $index));
			$index++;
		}
	}

	wp_reset_postdata();

	wp_send_json_success(array(
		'html'          => ob_get_clean(),
		'has_more'      => canhcam_career_has_more($page, $page_id),
		'next_page'     => $page + 1,
		'next_start_no' => $start_no + (int) $query->post_count,
	));
}
add_action('wp_ajax_canhcam_load_more_careers', 'canhcam_ajax_load_more_careers');
add_action('wp_ajax_nopriv_canhcam_load_more_careers', 'canhcam_ajax_load_more_careers');

/**
 * Enqueue career load-more script on career page template.
 */
add_action('wp_enqueue_scripts', function () {
	if (!is_page_template('templates/template-career.php')) {
		return;
	}

	$page_id  = get_the_ID();
	$settings = canhcam_get_career_list_settings($page_id);

	wp_enqueue_script(
		'canhcam-career-load-more',
		THEME_URI . '/scripts/career-load-more.js',
		array('jquery'),
		GENERATE_VERSION,
		true
	);

	wp_localize_script('canhcam-career-load-more', 'canhcamCareerLoadMore', array(
		'ajaxUrl'  => admin_url('admin-ajax.php'),
		'nonce'    => wp_create_nonce('canhcam_career_load_more'),
		'pageId'   => $page_id,
		'nextPage' => 2,
		'startNo'  => $settings['initial'] + 1,
		'loading'  => __('Đang tải...', 'canhcamtheme'),
		'loadMore' => __('Xem thêm', 'canhcamtheme'),
	));
});
