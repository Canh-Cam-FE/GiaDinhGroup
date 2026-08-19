<?php
/**
 * Sector archive listing with category nav.
 */
global $wp_query;

$paged = max(1, (int) get_query_var('paged'));
$nav   = canhcam_get_term_nav_context('sector');

$child_terms    = $nav['children'];
$all_url        = $nav['all_url'] ?: get_post_type_archive_link('sector');
$is_all_active  = !empty($nav['is_all_active']);
$active_term_id = (int) $nav['active_term_id'];
?>
<section class="sector-list home-linh-vuc-hoat-ong bg-gray-50 pad-8">
	<div class="container">
		<?php if (!empty($child_terms)) : ?>
		<div class="zone-nav mb-10 lg:mb-12">
			<ul class="list flex flex-wrap items-center clamp:gap-[16-16]" role="tablist"
				aria-label="<?php echo esc_attr__('Danh mục lĩnh vực', 'canhcamtheme'); ?>">
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
		<?php endif; ?>

		<?php if (!$wp_query->have_posts()) : ?>
		<div class="desc body-2 text-gray-800"><?php echo esc_html__('Nội dung sẽ được cập nhật.', 'canhcamtheme'); ?>
		</div>
		<?php else : ?>
		<div class="row">
			<?php while ($wp_query->have_posts()) : $wp_query->the_post(); ?>
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
								<div class="desc body-2 text-primary-4 my-4 lg:my-5">
									<?php echo esc_html(get_the_excerpt()); ?></div>
								<a href="<?php the_permalink(); ?>" class="btn btn-secondary white">
									<span><?php echo esc_html__('Tìm hiểu thêm', 'canhcamtheme'); ?></span><em
										class="fa-regular fa-arrow-right"></em>
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
			<?php endwhile; ?>
			<?php wp_reset_postdata(); ?>
		</div>
		<?php endif; ?>
	</div>
</section>