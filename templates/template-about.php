<?php
/**
 * Template Name: About
 *
 * @package Canhcam
 */

get_header();

get_template_part('template-parts/shared/section-top-banner');
get_template_part('template-parts/about/section-sticky-nav');

echo '<div class="scroll-section-wrap">';

get_template_part('template-parts/about/section-about-tong-quan-tap-oan');
get_template_part('template-parts/about/section-about-thong-iep-cua-chu-tich');
get_template_part('template-parts/about/section-about-vision');
get_template_part('template-parts/about/section-about-gia-tri-cot-loi');
get_template_part('template-parts/about/section-about-history');
get_template_part('template-parts/about/section-about-quy-mo');
get_template_part('template-parts/about/section-about-chief');
get_template_part('template-parts/home/section-sector');
get_template_part('template-parts/home/section-partner');

echo '</div>';

get_footer();
