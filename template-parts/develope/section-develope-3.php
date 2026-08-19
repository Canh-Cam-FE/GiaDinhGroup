<?php
/**
 * Develope / Sustainability news carousel (develope-3).
 *
 * @package Canhcam
 */

$title    = get_field('develope_3_title');
$category = get_field('develope_3_category');

$query_args = array(
	'post_type'      => 'post',
	'posts_per_page' => 8,
	'post_status'    => 'publish',
);

if (!empty($category)) {
	$query_args['cat'] = (int) $category;
}

$news_query = new WP_Query($query_args);

if (!$news_query->have_posts() && !$title) {
	wp_reset_postdata();
	return;
}
?>
<section class="develope-3 bg-white pad-8">
	<div class="container">
		<?php if ($title) : ?>
			<h2 class="heading-1 text-gray-950 text-center mb-10"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<?php if ($news_query->have_posts()) : ?>
			<div class="auto-3 init-swiper">
				<div class="swiper">
					<div class="swiper-wrapper">
						<?php
						while ($news_query->have_posts()) :
							$news_query->the_post();
						?>
							<div class="swiper-slide">
								<div class="item news-item">
									<div class="img zoom-in overflow-hidden">
										<a href="<?php the_permalink(); ?>" class="img-ratio ratio:pt-[228_320]">
											<?php
											if (has_post_thumbnail()) {
												echo get_image_post(get_the_ID(), 'image');
											}
											?>
										</a>
									</div>
									<div class="content">
										<h4 class="pt-5 pb-6">
											<a class="group-hover:text-primary-2 heading-5 text-gray-950" href="<?php the_permalink(); ?>">
												<?php echo esc_html(get_the_title()); ?>
											</a>
										</h4>
										<div class="inner flex items-center clamp:gap-[8-8]">
											<div class="desc body-3 text-gray-500"><?php echo esc_html(get_the_date('d/m/Y')); ?></div>
										</div>
									</div>
								</div>
							</div>
						<?php endwhile; ?>
					</div>
				</div>
				<div class="swiper-nav">
					<div class="prev"></div>
					<div class="next"></div>
				</div>
			</div>
		<?php endif; ?>
	</div>
</section>
<?php
wp_reset_postdata();
