<?php
$source_id = canhcam_get_home_page_id();
$title     = get_field('sector_title', $source_id);

$query = new WP_Query(array(
	'post_type'      => 'sector',
	'posts_per_page' => -1,
	'post_status'    => 'publish',
));

if (!$query->have_posts()) return;
?>
<section class="home-linh-vuc-hoat-ong pad-8">
	<div class="container">
		<?php if ($title) : ?>
			<h2 class="heading-1 text-gray-950 mb-10 text-center"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<div class="row">
			<?php while ($query->have_posts()) : $query->the_post(); ?>
				<div class="col w-full md:w-1/3">
					<div class="card sector-figure relative overflow-hidden">
						<div class="img zoom-in overflow-hidden">
							<a href="<?php the_permalink(); ?>" class="img-ratio ratio:pt-[440_453]">
								<?php if (has_post_thumbnail()) : ?>
									<?php echo get_image_post(get_the_ID(), 'image'); ?>
								<?php endif; ?>
							</a>
						</div>
						<div class="content relative z-50">
							<h4 class="heading-4 text-white relative z-50"><?php the_title(); ?></h4>
							<div class="txt-grid relative z-50">
								<div>
									<div class="desc desc body-2 text-primary-4 my-4 lg:my-5"><?php echo esc_html(get_the_excerpt()); ?></div>
									<a href="<?php the_permalink(); ?>" class="btn btn-secondary white">
										<span><?php echo esc_html__('Tìm hiểu thêm', 'canhcamtheme'); ?></span><em class="fa-regular fa-arrow-right"></em>
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			<?php endwhile; ?>
			<?php wp_reset_postdata(); ?>
		</div>
	</div>
</section>
