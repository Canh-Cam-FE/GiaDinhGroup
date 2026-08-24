<?php
/**
 * Related news swiper.
 */
$categories = wp_get_post_categories(get_the_ID());

if (empty($categories)) {
	return;
}

$related = new WP_Query(array(
	'category__in'   => $categories,
	'post__not_in'   => array(get_the_ID()),
	'posts_per_page' => 8,
	'orderby'        => 'date',
	'order'          => 'DESC',
	'post_status'    => 'publish',
));

if (!$related->have_posts()) {
	return;
}
?>
<section class="news-other relative z-50 pad-8 bg-grey-50">
	<div class="container">
		<h2 class="heading-1 text-primary-1 text-center mb-10"><?php echo esc_html__('Tin tức khác', 'canhcamtheme'); ?></h2>
		<div class="auto-3 init-swiper relative z-50">
			<div class="swiper max-lg:mb-10">
				<div class="swiper-wrapper">
					<?php while ($related->have_posts()) : $related->the_post(); ?>
						<div class="swiper-slide">
							<?php get_template_part('template-parts/news/news-card'); ?>
						</div>
					<?php endwhile; ?>
				</div>
			</div>
			<div class="swiper-nav">
				<div class="prev"></div>
				<div class="next"></div>
			</div>
		</div>
	</div>
</section>
<?php
wp_reset_postdata();
