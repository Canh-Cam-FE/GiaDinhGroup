<?php



/**

 * Shared theme helpers (non-module-specific).

 */



defined('ABSPATH') || exit;



/**

 * Allow <br> through esc_html() so titles can use line breaks

 * without switching to wp_kses_post().

 *

 * User can type: <br>, <br />, <br /> (case-insensitive).

 */

add_filter('esc_html', 'esc_html_allow_br', 10, 2);



function esc_html_allow_br($safe_text, $text)

{

	if ($safe_text === '' || $safe_text === null) {

		return $safe_text;
	}



	return preg_replace('/&lt;br\s*\/?&gt;/i', '<br>', $safe_text);
}



/**

 * Allowed HTML for ACF WYSIWYG / rich text (extends wp_kses_post).

 *

 * @return array<string, array<string, bool>>

 */

function canhcam_get_kses_allowed_html(): array

{

	return canhcam_extend_kses_allowed_html(wp_kses_allowed_html('post'), 'post');
}



/**

 * Extend wp_kses post context — keeps span/class/style from editor output.

 *

 * @param array<string, array<string, bool>> $allowed

 * @return array<string, array<string, bool>>

 */

function canhcam_extend_kses_allowed_html(array $allowed, string $context): array

{

	if ($context !== 'post') {

		return $allowed;
	}



	$allowed['span'] = array_merge(

		$allowed['span'] ?? [],

		[

			'class'    => true,

			'style'    => true,

			'id'       => true,

			'lang'     => true,

			'dir'      => true,

			'title'    => true,

			'xml:lang' => true,

		]

	);



	$allowed['mark'] = [

		'class' => true,

		'style' => true,

	];



	$allowed['sub'] = ['class' => true];

	$allowed['sup'] = ['class' => true];



	return $allowed;
}



add_filter('wp_kses_allowed_html', 'canhcam_extend_kses_allowed_html', 10, 2);



/**

 * Sanitize rich text output from ACF WYSIWYG fields.

 */

function canhcam_kses_post($content): string

{

	if ($content === null || $content === '') {

		return '';
	}



	return wp_kses((string) $content, canhcam_get_kses_allowed_html());
}



/**

 * Render an ACF image/file upload as inline SVG markup (not <img>).

 *

 * @param array|int|null $image ACF image array or attachment ID.

 * @return string

 */

function get_acf_svg($image)

{

	if (empty($image)) {

		return '';
	}



	$attachment_id = is_array($image) ? (int) ($image['ID'] ?? 0) : (int) $image;

	if (!$attachment_id) {

		return '';
	}



	$mime = get_post_mime_type($attachment_id);

	if ($mime !== 'image/svg+xml') {

		return '';
	}



	$path = get_attached_file($attachment_id);

	if (!$path || !is_readable($path)) {

		return '';
	}



	$svg = file_get_contents($path);

	if ($svg === false || $svg === '') {

		return '';
	}



	$svg = preg_replace('/<\?xml[^>]*\?>/i', '', $svg);

$svg = preg_replace('/<!DOCTYPE[^>]*>/i', '', $svg);

	$svg = preg_replace('/
	<!--.*?-->/s', '', $svg);

	$svg = preg_replace('/<script\b[^>]*>.*?<\ /script>/is', '', $svg);

			$svg = preg_replace('/\son[a-z]+\s*=\s*(["\']).*?\1/i', '', $svg);



			return trim($svg);
			}



			/**

			* Render icon markup for Font Awesome or Google Material Symbols.

			*

			* - FA: "fa-light fa-phone"

			* - Material Symbols: "outgoing_mail" → <span class="material-symbols-outlined">outgoing_mail</span>

			*

			* @param string $icon Icon value from ACF.

			* @param string $fallback Fallback when empty.

			* @return string

			*/

			function render_theme_icon($icon, $fallback = '')

			{

			$icon = trim((string) $icon);

			if ($icon === '') {

			$icon = trim((string) $fallback);
			}

			if ($icon === '') {

			return '';
			}



			// Font Awesome class string (contains fa-*).

			if (

			preg_match('/\bfa[bsr]?(-[a-z0-9]+)+\b/i', $icon) ||

			preg_match('/\bfa-(solid|regular|light|thin|brands|duotone)\b/i', $icon)

			) {

			return '<i class="' . esc_attr($icon) . '" aria-hidden="true"></i>';
			}



			// Material Symbols icon name (e.g. outgoing_mail, call, chat).

			$icon_name = preg_replace('/[^a-z0-9_-]/i', '', str_replace(' ', '_', $icon));

			if ($icon_name === '') {

			return '';
			}



			return '<span class="material-symbols-outlined" aria-hidden="true">' . esc_html($icon_name) . '</span>';
			}



			/**

			* Chuyển mã ngôn ngữ WPML (vi, en...) sang label hiển thị (VN, EN...)

			*

			* @param string $lang_code Mã ngôn ngữ WPML, ví dụ 'vi', 'en'

			* @return string

			*/

			function canhcam_get_lang_label($lang_code)

			{

			$lang_code = strtolower((string) $lang_code);



			$map = array(

			'vi' => 'VN',

			'en' => 'EN',

			);



			return isset($map[$lang_code]) ? $map[$lang_code] : strtoupper($lang_code);
			}

/**
 * Render WPML language switcher — Desktop dropdown variant.
 * Matches: .wpml-ls-legacy-dropdown markup from mockup.
 */
function canhcam_render_language_switcher_dropdown(): void
{
	$languages = apply_filters('wpml_active_languages', null, ['skip_missing' => 0]);

	if (empty($languages) || !is_array($languages)) {
		return;
	}

	$current = null;
	$others  = [];

	foreach ($languages as $lang) {
		if (!empty($lang['active'])) {
			$current = $lang;
		} else {
			$others[] = $lang;
		}
	}

	if (!$current) {
		return;
	}
	?>
	<div class="wpml-ls-statics-shortcode_actions wpml-ls wpml-ls-legacy-dropdown js-wpml-ls-legacy-dropdown">
		<ul>
			<li class="wpml-ls-slot-shortcode_actions wpml-ls-item wpml-ls-item-<?php echo esc_attr($current['language_code']); ?> wpml-ls-current-language wpml-ls-first-item wpml-ls-item-legacy-dropdown" tabindex="0">
				<a class="js-wpml-ls-item-toggle wpml-ls-item-toggle">
					<?php if (!empty($current['country_flag_url'])) : ?>
						<img class="wpml-ls-flag" src="<?php echo esc_url($current['country_flag_url']); ?>" alt="<?php echo esc_attr($current['native_name']); ?>" width="26" height="26">
					<?php endif; ?>
					<span class="wpml-ls-native"><?php echo esc_html(canhcam_get_lang_label($current['language_code'])); ?></span>
				</a>
				<?php if (!empty($others)) : ?>
					<ul class="wpml-ls-sub-menu">
						<?php foreach ($others as $lang) : ?>
							<li class="wpml-ls-slot-shortcode_actions wpml-ls-item wpml-ls-item-<?php echo esc_attr($lang['language_code']); ?> wpml-ls-last-item">
								<a class="wpml-ls-link" href="<?php echo esc_url($lang['url']); ?>">
									<?php if (!empty($lang['country_flag_url'])) : ?>
										<img class="wpml-ls-flag" src="<?php echo esc_url($lang['country_flag_url']); ?>" alt="<?php echo esc_attr($lang['native_name']); ?>" width="26" height="26">
									<?php endif; ?>
									<span class="wpml-ls-native" lang="<?php echo esc_attr($lang['language_code']); ?>"><?php echo esc_html(canhcam_get_lang_label($lang['language_code'])); ?></span>
								</a>
							</li>
						<?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</li>
		</ul>
	</div>
	<?php
}

/**
 * Render WPML language switcher — Mobile horizontal variant.
 * Matches: .wpml-ls-legacy-list-horizontal markup from mockup.
 */
function canhcam_render_language_switcher_horizontal(): void
{
	$languages = apply_filters('wpml_active_languages', null, ['skip_missing' => 0]);

	if (empty($languages) || !is_array($languages)) {
		return;
	}
	?>
	<div class="wpml-ls wpml-ls-legacy-list-horizontal wpml-ls-statics-shortcode_actions">
		<div class="wpml-ls-statics-shortcode_actions wpml-ls wpml-ls-legacy-list-horizontal">
			<ul role="menu">
				<?php
				$index = 0;
				$total = count($languages);
				foreach ($languages as $lang) :
					$is_first   = ($index === 0);
					$is_last    = ($index === $total - 1);
					$is_current = !empty($lang['active']);
					$classes    = 'wpml-ls-slot-shortcode_actions wpml-ls-item wpml-ls-item-' . esc_attr($lang['language_code']);
					if ($is_first) $classes .= ' wpml-ls-first-item';
					if ($is_last)  $classes .= ' wpml-ls-last-item';
					if ($is_current) $classes .= ' wpml-ls-current-language';
					$classes .= ' wpml-ls-item-legacy-list-horizontal';
				?>
					<li class="<?php echo esc_attr($classes); ?>" role="none">
						<a class="wpml-ls-link" href="<?php echo esc_url($lang['url']); ?>" role="menuitem"
							<?php if ($is_current) : ?>aria-label="<?php echo esc_attr(sprintf(__('Switch to %s', 'canhcamtheme'), canhcam_get_lang_label($lang['language_code']))); ?>"<?php endif; ?>>
							<span class="wpml-ls-native" lang="<?php echo esc_attr($lang['language_code']); ?>"><?php echo esc_html(canhcam_get_lang_label($lang['language_code'])); ?></span>
						</a>
					</li>
				<?php
					$index++;
				endforeach;
				?>
			</ul>
		</div>
	</div>
	<?php
}

/**
 * Render floating sidenav group (back-to-top + ACF repeater CTA buttons).
 */
function canhcam_render_sidenav(): void
{
	$items = get_field('sidenav_items', 'option');
	?>
	<div class="sidenav-group">
		<a class="back-to-top transition opacity-100 pointer-events-none flex-center mb-1 e">
			<div class="icon flex-center bg-white rounded-full overflow-hidden">
				<em class="fa-regular fa-arrow-up"></em>
			</div>
		</a>
		<?php if (!empty($items) && is_array($items)) : ?>
			<ul>
				<?php foreach ($items as $item) :
					$icon = !empty($item['sidenav_icon']) ? $item['sidenav_icon'] : '';
					$link = !empty($item['sidenav_link']) ? $item['sidenav_link'] : null;
					if (!$link) continue;
				?>
					<li>
						<a class="wrap" href="<?php echo esc_url($link['url']); ?>"
							<?php if (!empty($link['target'])) : ?>target="<?php echo esc_attr($link['target']); ?>"<?php endif; ?>>
							<?php if ($icon) : ?>
								<div class="icon"><?php echo render_theme_icon($icon); ?></div>
							<?php endif; ?>
							<div class="txt-grid">
								<div><span><?php echo esc_html($link['title']); ?></span></div>
							</div>
						</a>
					</li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
	</div>
	<?php
}

/**
 * Get Homepage page ID (template-home.php), with front page fallback.
 */
function canhcam_get_home_page_id(): int
{
	static $home_id = null;

	if ($home_id !== null) {
		return $home_id;
	}

	$home_id = canhcam_get_page_id_by_template('templates/template-home.php');

	if ($home_id > 0) {
		return $home_id;
	}

	$front   = (int) get_option('page_on_front');
	$home_id = $front > 0 ? $front : 0;

	return $home_id;
}

/**
 * Map CPT slug => listing page template path.
 * Add new entries when a post type uses a dedicated page template.
 *
 * @return array<string, string>
 */
function canhcam_get_post_type_page_template_map(): array
{
	return apply_filters(
		'canhcam_post_type_page_template_map',
		array(
			'career' => 'templates/template-career.php',
			// 'projects' => 'templates/template-projects.php',
			// 'sector'   => 'templates/template-about.php',
		)
	);
}

/**
 * Get page template path for a post type from the map.
 */
function canhcam_get_page_template_for_post_type(string $post_type): string
{
	$map = canhcam_get_post_type_page_template_map();

	return isset($map[$post_type]) ? (string) $map[$post_type] : '';
}

/**
 * Get published page ID by template file path.
 */
function canhcam_get_page_id_by_template(string $template): int
{
	static $cache = array();

	$template = trim($template);
	if ($template === '') {
		return 0;
	}

	if (isset($cache[$template])) {
		return $cache[$template];
	}

	$pages = get_posts(array(
		'post_type'      => 'page',
		'post_status'    => 'publish',
		'posts_per_page' => 1,
		'meta_key'       => '_wp_page_template',
		'meta_value'     => $template,
		'fields'         => 'ids',
	));

	$cache[$template] = !empty($pages) ? (int) $pages[0] : 0;

	return $cache[$template];
}

/**
 * Get listing page ID mapped to a post type.
 * Empty $post_type uses the current queried post type.
 */
function canhcam_get_post_type_page_id(string $post_type = ''): int
{
	if ($post_type === '') {
		$post_type = (string) get_post_type();
	}

	$template = canhcam_get_page_template_for_post_type($post_type);

	return $template !== '' ? canhcam_get_page_id_by_template($template) : 0;
}

/**
 * Get listing page URL mapped to a post type.
 *
 * @return string|false
 */
function canhcam_get_post_type_page_url(string $post_type = '')
{
	$page_id = canhcam_get_post_type_page_id($post_type);

	return $page_id > 0 ? get_permalink($page_id) : false;
}

/**
 * Mark mapped listing-page menu items active on CPT singular views.
 *
 * @param array<int, WP_Post> $items Menu items.
 * @return array<int, WP_Post>
 */
function canhcam_active_nav_menu_for_mapped_post_types($items)
{
	if (is_admin() || empty($items) || !is_singular()) {
		return $items;
	}

	$post_type = (string) get_post_type();
	$page_id   = canhcam_get_post_type_page_id($post_type);

	if ($page_id <= 0) {
		return $items;
	}

	$page_url       = untrailingslashit((string) get_permalink($page_id));
	$active_item_id = 0;

	foreach ($items as $item) {
		$is_mapped_page = ('page' === $item->object && (int) $item->object_id === $page_id)
			|| untrailingslashit((string) $item->url) === $page_url;

		if (!$is_mapped_page) {
			continue;
		}

		$item->current = true;
		$item->classes = array_unique(array_merge((array) $item->classes, array(
			'current-menu-item',
			'current_page_item',
		)));
		$active_item_id = (int) $item->ID;
		break;
	}

	if (!$active_item_id) {
		return $items;
	}

	$parent_id = 0;
	foreach ($items as $item) {
		if ((int) $item->ID === $active_item_id) {
			$parent_id = (int) $item->menu_item_parent;
			break;
		}
	}

	while ($parent_id) {
		$found = false;

		foreach ($items as $item) {
			if ((int) $item->ID !== $parent_id) {
				continue;
			}

			$item->current_item_ancestor = true;
			$item->current_item_parent   = true;
			$item->classes               = array_unique(array_merge((array) $item->classes, array(
				'current-menu-ancestor',
				'current-menu-parent',
				'current_page_ancestor',
				'current_page_parent',
			)));
			$parent_id = (int) $item->menu_item_parent;
			$found     = true;
			break;
		}

		if (!$found) {
			break;
		}
	}

	return $items;
}
add_filter('wp_nav_menu_objects', 'canhcam_active_nav_menu_for_mapped_post_types', 10, 1);

/**
 * Resolve ACF object ID for current page, post, or taxonomy term.
 */
function canhcam_get_acf_object_id()
{
	$queried = get_queried_object();

	if ($queried instanceof WP_Term) {
		return $queried->taxonomy . '_' . $queried->term_id;
	}

	if (is_singular()) {
		return get_the_ID();
	}

	return null;
}

/**
 * Normalize ACF banner field value to post ID.
 */
function canhcam_resolve_banner_post_id($banner)
{
	if (empty($banner)) {
		return null;
	}

	if (is_object($banner)) {
		return (int) $banner->ID;
	}

	if (is_numeric($banner)) {
		return (int) $banner;
	}

	if (is_array($banner) && !empty($banner)) {
		$first = reset($banner);
		return is_object($first) ? (int) $first->ID : (int) $first;
	}

	return null;
}

/**
 * Get selected banner post ID from ACF (page, taxonomy, or theme options).
 * Mapped taxonomies / CPT archives use term helpers (parent fallback).
 */
function canhcam_get_selected_banner_id()
{
	// Mapped CPT archive → options field (optional) then root term banner.
	if (function_exists('canhcam_is_mapped_post_type_archive') && canhcam_is_mapped_post_type_archive()) {
		$pto = get_query_var('post_type');
		if (is_array($pto)) {
			$pto = reset($pto);
		}

		if (is_string($pto) && $pto !== '') {
			$option_banner = canhcam_resolve_banner_post_id(get_field($pto . '_archive_banner', 'option'));
			if ($option_banner) {
				return $option_banner;
			}

			$root = canhcam_get_term_nav_root($pto);
			if ($root instanceof WP_Term) {
				$term_banner = canhcam_get_term_banner_id($root, $pto);
				if ($term_banner) {
					return $term_banner;
				}
			}
		}
	}

	if (is_home() && !is_front_page()) {
		$news_banner = canhcam_resolve_banner_post_id(get_field('news_archive_banner', 'option'));
		if ($news_banner) {
			return $news_banner;
		}

		if (function_exists('canhcam_get_term_nav_root')) {
			$root = canhcam_get_term_nav_root('post');
			if ($root instanceof WP_Term) {
				$term_banner = canhcam_get_term_banner_id($root, 'post');
				if ($term_banner) {
					return $term_banner;
				}
			}
		}
	}

	if (is_tax() || is_category() || is_tag()) {
		if (function_exists('canhcam_get_term_banner_id')) {
			return canhcam_get_term_banner_id();
		}
	}

	$object_id = canhcam_get_acf_object_id();

	if (!$object_id) {
		return null;
	}

	$banner = get_field('banner_select', $object_id);

	if (empty($banner)) {
		$banner = get_field('banner_select_page', $object_id);
	}

	return canhcam_resolve_banner_post_id($banner);
}

/**
 * Resolve heading title for banner breadcrumb.
 */
function canhcam_get_banner_heading_title(): string
{
	if (is_singular()) {
		return get_the_title();
	}

	if (is_tax() || is_category() || is_tag()) {
		return single_term_title('', false);
	}

	if (is_post_type_archive()) {
		return post_type_archive_title('', false);
	}

	if (is_home()) {
		$posts_page = (int) get_option('page_for_posts');
		return $posts_page ? get_the_title($posts_page) : __('Tin tức', 'canhcamtheme');
	}

	return get_the_title();
}

/**
 * Render Rank Math breadcrumb or simple fallback.
 */
function canhcam_render_breadcrumb(): void
{
	if (function_exists('rank_math_the_breadcrumbs')) {
		rank_math_the_breadcrumbs();
		return;
	}
	?>
	<nav class="rank-math-breadcrumb" aria-label="<?php echo esc_attr__('breadcrumbs', 'canhcamtheme'); ?>">
		<p>
			<a href="<?php echo esc_url(home_url('/')); ?>"><?php echo esc_html__('Trang chủ', 'canhcamtheme'); ?></a>
			<?php if (is_singular()) : ?>
				<span class="separator"> - </span>
				<span class="last"><?php echo esc_html(get_the_title()); ?></span>
			<?php elseif (is_tax() || is_category() || is_tag()) : ?>
				<span class="separator"> - </span>
				<span class="last"><?php single_term_title(); ?></span>
			<?php elseif (is_post_type_archive()) : ?>
				<span class="separator"> - </span>
				<span class="last"><?php post_type_archive_title(); ?></span>
			<?php endif; ?>
		</p>
	</nav>
	<?php
}

/**
 * Render Contact Form 7 shortcode or numeric form ID.
 */
function canhcam_render_cf7_form($shortcode_or_id): void
{
	if (empty($shortcode_or_id)) {
		return;
	}

	if (strpos((string) $shortcode_or_id, '[') !== false) {
		echo do_shortcode($shortcode_or_id);
		return;
	}

	echo do_shortcode('[contact-form-7 id="' . intval($shortcode_or_id) . '"]');
}

/**
 * Output sanitized Google Maps iframe embed.
 */
function canhcam_render_contact_map_iframe($iframe): void
{
	if (empty($iframe)) {
		return;
	}

	$allowed = array(
		'iframe' => array(
			'src'             => true,
			'width'           => true,
			'height'          => true,
			'style'           => true,
			'allowfullscreen' => true,
			'loading'         => true,
			'referrerpolicy'  => true,
			'title'           => true,
			'frameborder'     => true,
		),
	);

	echo wp_kses($iframe, $allowed);
}

/**
 * Primary category name for a post.
 */
function canhcam_get_post_primary_category_name($post_id = null): string
{
	$post_id = $post_id ?: get_the_ID();
	$cats    = get_the_category($post_id);

	if (empty($cats) || is_wp_error($cats)) {
		return '';
	}

	return $cats[0]->name;
}
