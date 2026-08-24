<?php
/**
 * Single post — news detail (OIC pattern + Gia Định UI).
 */
get_header();

$news_banner = get_field('news_banner');

get_template_part('template-parts/shared/section-top-banner', null, array(
	'show_banner'  => !empty($news_banner),
	'banner_image' => $news_banner,
));

get_template_part('template-parts/news/section-news-detail');
get_template_part('template-parts/news/section-news-other');

get_footer();
