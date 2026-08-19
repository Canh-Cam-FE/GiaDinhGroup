<?php
/**
 * Projects archive listing.
 */
global $wp_query;

$paged = max(1, (int) get_query_var('paged'));
$nav   = canhcam_get_term_nav_context('projects');

$child_terms    = $nav['children'];
$all_url        = $nav['all_url'] ?: get_post_type_archive_link('projects');
$is_all_active  = !empty($nav['is_all_active']);
$active_term_id = (int) $nav['active_term_id'];

?>
<section class="projects-list bg-gray-50 pad-8">
	<div class="container">
		<div class="wrap flex flex-wrap items-center clamp:gap-[16-24] mb-10 lg:justify-between max-lg:mb-7">
			<h2 class="heading-1 text-gray-950"><?php echo esc_html__('DỰ ÁN', 'canhcamtheme'); ?></h2>
			<div class="zone-nav">
				<ul class="list flex flex-wrap items-center clamp:gap-[16-16]" role="tablist" aria-label="<?php echo esc_attr__('Danh mục dự án', 'canhcamtheme'); ?>" data-js-target="projects-filter">
					<li>
						<a href="<?php echo esc_url($all_url); ?>">
							<span class="desc body-1 <?php echo $is_all_active ? 'text-primary-2' : 'text-gray-950'; ?>">
								<?php echo esc_html__('Tất cả', 'canhcamtheme'); ?>
							</span>
						</a>
					</li>
					<?php foreach ($child_terms as $term) :
						$is_active = (int) $term->term_id === $active_term_id;
						$term_link = get_term_link($term);
						if (is_wp_error($term_link)) {
							continue;
						}
						?>
						<li>
							<a href="<?php echo esc_url($term_link); ?>">
								<span class="desc body-1 <?php echo $is_active ? 'text-primary-2' : 'text-gray-950'; ?>">
									<?php echo esc_html($term->name); ?>
								</span>
							</a>
						</li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>
	</div>
	<div class="container">
		<?php if (!$wp_query->have_posts()) : ?>
			<div class="desc body-2 text-gray-800"><?php echo esc_html__('Nội dung sẽ được cập nhật.', 'canhcamtheme'); ?></div>
		<?php elseif ($paged === 1 && $wp_query->have_posts()) :
			the_post();
			$permalink = get_permalink();
			$location  = get_field('project_location');
			$scale     = get_field('project_scale');
			$handover  = get_field('project_handover');
			?>
			<div class="card project-big group">
				<div class="row">
					<div class="col w-full lg:w-7/12">
						<div class="media zoom-in">
							<a href="<?php echo esc_url($permalink); ?>">
								<?php if (has_post_thumbnail()) : ?>
									<?php echo get_image_post(get_the_ID(), 'image'); ?>
								<?php endif; ?>
							</a>
						</div>
					</div>
					<div class="col w-full lg:w-5/12">
						<div class="content">
							<div class="wrap">
								<h3>
									<a class="group-hover:text-primary-2 heading-3 text-gray-950" href="<?php echo esc_url($permalink); ?>">
										<?php the_title(); ?>
									</a>
								</h3>
								<div class="box">
									<?php if ($location) : ?>
										<div class="item">
											<div class="desc body-2 text-gray-950 label font-bold"><?php echo esc_html__('Vị trí', 'canhcamtheme'); ?></div>
											<div class="desc body-2 text-gray-950"><?php echo esc_html($location); ?></div>
										</div>
									<?php endif; ?>
									<?php if ($scale || $handover) : ?>
										<div class="inner flex items-center clamp:gap-[52-52]">
											<?php if ($scale) : ?>
												<div class="item">
													<div class="desc body-2 text-gray-950 label font-bold"><?php echo esc_html__('Quy mô', 'canhcamtheme'); ?></div>
													<div class="desc body-2 text-gray-950"><?php echo esc_html($scale); ?></div>
												</div>
											<?php endif; ?>
											<?php if ($scale && $handover) : ?>
												<hr>
											<?php endif; ?>
											<?php if ($handover) : ?>
												<div class="item">
													<div class="desc body-2 text-gray-950 label font-bold"><?php echo esc_html__('Thời gian bàn giao', 'canhcamtheme'); ?></div>
													<div class="desc body-2 text-gray-950"><?php echo esc_html($handover); ?></div>
												</div>
											<?php endif; ?>
										</div>
									<?php endif; ?>
								</div>
							</div>
							<div class="btn-wrap">
								<a class="btn btn-primary" href="<?php echo esc_url($permalink); ?>">
									<span><?php echo esc_html__('Xem chi tiết', 'canhcamtheme'); ?></span>
									<em class="fa-regular fa-arrow-right"></em>
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		<?php endif; ?>

		<?php if ($wp_query->have_posts()) : ?>
			<div class="list grid grid-cols-1 md:grid-cols-2 mt-10 lg:grid-cols-3 clamp:gap-[40-40]">
				<?php while ($wp_query->have_posts()) : $wp_query->the_post(); ?>
					<?php get_template_part('template-parts/project/project-card'); ?>
				<?php endwhile; ?>
			</div>
		<?php endif; ?>
	</div>
	<?php canhcam_render_news_pagination($wp_query); ?>
</section>
