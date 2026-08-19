<?php
/**
 * Project detail — related projects.
 */
$related = new WP_Query(array(
	'post_type'      => 'projects',
	'posts_per_page' => 6,
	'post_status'    => 'publish',
	'post__not_in'   => array(get_the_ID()),
	'orderby'        => 'date',
	'order'          => 'DESC',
));

if (!$related->have_posts()) {
	return;
}
?>
<section class="projects-detail-du-an-khac pad-8 bg-grey-50">
	<div class="container">
		<h2 class="heading-1 text-gray-950 mb-10 text-center"><?php echo esc_html__('DỰ ÁN KHÁC', 'canhcamtheme'); ?></h2>
		<div class="auto-3 init-swiper">
			<div class="swiper">
				<div class="swiper-wrapper">
					<?php while ($related->have_posts()) : $related->the_post(); ?>
						<div class="swiper-slide">
							<?php get_template_part('template-parts/project/project-card'); ?>
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
