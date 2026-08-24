<?php
/**
 * Single news detail content.
 */
$gallery = get_field('news_gallery');
$brief = get_field('news_brief');
?>
<section class="news-detail relative z-50 pad-8">
	<div class="container">
		<div class="row">
			<div class="col w-full lg:w-9/12">
				<h2 class="heading-2 mb-5"><?php the_title(); ?></h2>
				<time class="div desc body-3 text-grey-500" datetime="<?php echo esc_attr(get_the_date('Y-m-d')); ?>">
					<?php echo esc_html(get_the_date('d/m/Y')); ?>
				</time>
				<?php if (!empty($gallery) && is_array($gallery)): ?>
					<div class="single-swiper init-swiper my-10">
						<div class="swiper">
							<div class="swiper-wrapper">
								<?php foreach ($gallery as $image): ?>
									<div class="swiper-slide">
										<div class="img zoom-in overflow-hidden">
											<a class="img-ratio ratio:pt-[788_1400]">
												<?php echo get_image_attrachment($image, 'image'); ?>
											</a>
										</div>
									</div>
								<?php endforeach; ?>
							</div>
						</div>
					</div>
				<?php elseif (has_post_thumbnail()): ?>
					<div class="single-swiper init-swiper my-10">
						<div class="swiper">
							<div class="swiper-wrapper">
								<div class="swiper-slide">
									<div class="img zoom-in overflow-hidden">
										<a class="img-ratio ratio:pt-[788_1400]">
											<?php echo get_image_post(get_the_ID(), 'image'); ?>
										</a>
									</div>
								</div>
							</div>
						</div>
					</div>
				<?php endif; ?>
				<div class="w-full block-wrap">
					<?php if ($brief): ?>
						<div class="briefcontent font-bold body-1 border-t border-grey-200 py-5">
							<?php echo canhcam_kses_post($brief); ?>
						</div>
					<?php endif; ?>
					<div class="fullcontent">
						<?php the_content(); ?>
					</div>
				</div>
			</div>
			<div class="col w-full lg:w-3/12">
				<?php
				$categories = wp_get_post_categories(get_the_ID());

				if (!empty($categories)):
					$related = new WP_Query(array(
						'category__in' => $categories,
						'post__not_in' => array(get_the_ID()),
						'posts_per_page' => 8,
						'orderby' => 'date',
						'order' => 'DESC',
						'post_status' => 'publish',
					));

					if ($related->have_posts()):
						?>
						<div class="news-other">
							<h2 class="heading-3 text-primary-1 mb-6">
								<?php echo esc_html__('Tin tức khác', 'canhcamtheme'); ?>
							</h2>
							<div class=" block-wrap max-lg:grid-cols-2 max-lg:grid flex flex-col gap-6">
								<?php while ($related->have_posts()):
									$related->the_post(); ?>
									<?php get_template_part('template-parts/news/news-card'); ?>
								<?php endwhile; ?>
							</div>
						</div>
						<?php
						wp_reset_postdata();
					endif;
				endif;
				?>
			</div>
		</div>
	</div>
</section>