<?php

/**
 * Register theme custom post types and taxonomies.
 */

defined('ABSPATH') || exit;

add_action('init', function () {
	create_post_type('sector', array(
		'name'          => 'Lĩnh vực',
		'singular_name' => 'Lĩnh vực',
		'slug'          => 'linh-vuc',
		'icon'          => 'dashicons-portfolio',
		'menu_position' => 21,
		'supports'      => array('title', 'editor', 'thumbnail', 'excerpt'),
		'has_archive'   => false,
		'rewrite'       => array('slug' => 'linh-vuc'),
	));

	create_post_type('projects', array(
		'name'          => 'Dự án',
		'singular_name' => 'Dự án',
		'slug'          => 'du-an',
		'icon'          => 'dashicons-building',
		'menu_position' => 22,
		'supports'      => array('title', 'editor', 'thumbnail', 'excerpt'),
		'has_archive'   => true,
		'rewrite'       => array('slug' => 'du-an'),
	));

	create_taxonomy('projects_category', array(
		'name'         => 'Danh mục dự án',
		'singular_name'=> 'Danh mục dự án',
		'object_type'  => array('projects'),
		'slug'         => 'danh-muc-du-an',
		'hierarchical' => true,
		'rewrite'      => array('slug' => 'danh-muc-du-an'),
	));

	create_taxonomy('sector_category', array(
		'name'         => 'Danh mục lĩnh vực',
		'singular_name'=> 'Danh mục lĩnh vực',
		'object_type'  => array('sector'),
		'slug'         => 'danh-muc-linh-vuc',
		'hierarchical' => true,
		'rewrite'      => array('slug' => 'danh-muc-linh-vuc'),
	));

	create_post_type('career', array(
		'name'          => 'Tuyển dụng',
		'singular_name' => 'Tuyển dụng',
		'slug'          => 'tuyen-dung',
		'icon'          => 'dashicons-id-alt',
		'menu_position' => 23,
		'supports'      => array('title', 'editor', 'thumbnail', 'excerpt'),
		'has_archive'   => false,
		'rewrite'       => array('slug' => 'tuyen-dung'),
	));
});

/**
 * No public sector listing — redirect taxonomy / archive URLs to About.
 */
add_action('template_redirect', function () {
	if (!is_tax('sector_category') && !is_post_type_archive('sector')) {
		return;
	}

	$about_url = function_exists('get_page_link_by_template')
		? get_page_link_by_template('templates/template-about.php')
		: false;

	wp_safe_redirect($about_url ? $about_url : home_url('/'), 301);
	exit;
});
