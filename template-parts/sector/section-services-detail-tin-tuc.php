<?php
/**
 * Sector news with category tabs + carousel (services-detail-tin-tuc).
 *
 * @package Canhcam
 */

$title = get_field('sector_news_title');

$categories = get_terms(array(
	'taxonomy'   => 'category',
	'hide_empty' => true,
	'number'     => 3,
));

if (is_wp_error($categories)) {
	$categories = array();
}

/**
 * Render news carousel slides for a query.
 *
 * @param WP_Query $query Posts query.
 */
if (!function_exists('canhcam_render_sector_news_carousel')) {
	function canhcam_render_sector_news_carousel($query)
	{
		if (!$query->have_posts()) {
			echo '<div class="desc body-2 text-gray-800">' . esc_html__('Nội dung sẽ được cập nhật.', 'canhcamtheme') . '</div>';
			return;
		}
		?>
		<div class="auto-3 init-swiper large-gap">
			<div class="swiper">
				<div class="swiper-wrapper">
					<?php
					while ($query->have_posts()) :
						$query->the_post();
						$cats     = get_the_category();
						$cat_name = !empty($cats) ? $cats[0]->name : '';
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
									<h4>
										<a class="group-hover:text-primary-2 heading-5 text-gray-950" href="<?php the_permalink(); ?>">
											<?php echo esc_html(get_the_title()); ?>
										</a>
									</h4>
									<div class="inner flex items-center clamp:gap-[8-8]">
										<div class="desc body-3 text-gray-500"><?php echo esc_html(get_the_date('d/m/Y')); ?></div>
										<?php if ($cat_name) : ?>
											<div class="desc body-4 text-gray-500">|</div>
											<div class="desc body-3 text-gray-500"><?php echo esc_html($cat_name); ?></div>
										<?php endif; ?>
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
		<?php
	}
}
?>
<section class="services-detail-tin-tuc bg-white pad-8 home-tin-tuc">
	<div class="container">
		<?php if ($title) : ?>
			<h2 class="heading-1 text-gray-950 text-center mb-4"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>

		<div class="tab-nav mb-10">
			<ul class="list flex flex-wrap items-center justify-center clamp:gap-[16-16]">
				<li class="active">
					<a href="javascript:;" data-type="news-tab-all">
						<span class="desc body-1"><?php echo esc_html__('Tất cả', 'canhcamtheme'); ?></span>
						<i class="material-symbols-outlined">arrow_drop_down</i>
					</a>
				</li>
				<?php foreach ($categories as $cat) : ?>
					<hr>
					<li>
						<a href="javascript:;" data-type="news-tab-<?php echo esc_attr($cat->term_id); ?>">
							<span class="desc body-1"><?php echo esc_html($cat->name); ?></span>
							<i class="material-symbols-outlined">arrow_drop_down</i>
						</a>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>

		<div class="tab-item active" id="news-tab-all">
			<?php
			$query_all = new WP_Query(array(
				'post_type'      => 'post',
				'posts_per_page' => 8,
				'post_status'    => 'publish',
			));
			canhcam_render_sector_news_carousel($query_all);
			wp_reset_postdata();
			?>
		</div>

		<?php foreach ($categories as $cat) : ?>
			<div class="tab-item" id="news-tab-<?php echo esc_attr($cat->term_id); ?>">
				<?php
				$query_cat = new WP_Query(array(
					'post_type'      => 'post',
					'posts_per_page' => 8,
					'post_status'    => 'publish',
					'cat'            => $cat->term_id,
				));
				canhcam_render_sector_news_carousel($query_cat);
				wp_reset_postdata();
				?>
			</div>
		<?php endforeach; ?>
	</div>
</section>
