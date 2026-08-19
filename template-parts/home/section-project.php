<?php
$title         = get_field('project_title');
$button        = get_field('project_button');
$project_items = get_field('project_items');

if (empty($project_items)) return;

// Wrap selected posts into a rewindable WP_Query
$query = new WP_Query(array(
	'post_type'      => 'projects',
	'post_status'    => 'publish',
	'post__in'       => wp_list_pluck($project_items, 'ID'),
	'orderby'        => 'post__in',
	'posts_per_page' => count($project_items),
));

if (!$query->have_posts()) return;
?>
<section class="home-du-an-noi-bat bg-gray-50 pad-8">
	<?php if ($title) : ?>
	<h2 class="heading-1 text-gray-950 mb-10 text-center"><?php echo esc_html($title); ?></h2>
	<?php endif; ?>

	<div class="desktop-block max-lg:hidden">
		<div class="flex-options w-full clamp:gap-[4-4]">
			<?php
			$count = 0;
			while ($query->have_posts()) : $query->the_post();
				$is_active = $count === 0 ? 'is-active' : '';
				$count++;
			?>
			<div class="card-option <?php echo $is_active; ?>">
				<div class="card-label">
					<div class="item relative">
						<div class="img-wrap">
							<a href="<?php the_permalink(); ?>">
								<?php if (has_post_thumbnail()) : ?>
								<img class="lozad"
									data-src="<?php echo get_the_post_thumbnail_url(get_the_ID(), 'full'); ?>"
									alt="<?php the_title_attribute(); ?>" loading="lazy" />
								<?php else : ?>
								<img class="lozad" data-src="https://picsum.photos/1920/1080?nature=1"
									alt="<?php the_title_attribute(); ?>" loading="lazy" />
								<?php endif; ?>
							</a>
						</div>
						<div class="txt absolute inset-0 z-20 w-full h-full mt-auto transition">
							<a href="<?php the_permalink(); ?>"
								class="bg-wrap relative overflow-hidden w-full h-full flex flex-col justify-between">
								<h3 class="heading-3 text-white relative z-50"><?php the_title(); ?></h3>
								<div class="bottom w-full relative">
									<div class="content-wrap relative">
										<div class="desc body-2 text-white relative z-50 mt-2">
											<?php
												$location = get_field('project_location');
												$scale = get_field('project_scale');
												if ($location || $scale) :
												?>
											<ul>
												<?php if ($location) : ?>
												<li>Vị Trí: <strong><?php echo esc_html($location); ?></strong></li>
												<?php endif; ?>
												<?php if ($scale) : ?>
												<li>Quy Mô: <strong><?php echo esc_html($scale); ?></strong></li>
												<?php endif; ?>
											</ul>
											<?php else : ?>
											<?php the_excerpt(); ?>
											<?php endif; ?>
										</div>
									</div>
								</div>
							</a>
						</div>
					</div>
				</div>
			</div>
			<?php endwhile; ?>
		</div>
	</div>

	<div class="tablet-block lg:hidden">
		<div class="auto-3 init-swiper px-[15px]">
			<div class="swiper">
				<div class="swiper-wrapper">
					<?php
					$query->rewind_posts();
					while ($query->have_posts()) : $query->the_post();
					?>
					<div class="swiper-slide">
						<div class="item relative">
							<div class="img-wrap">
								<a href="<?php the_permalink(); ?>">
									<?php if (has_post_thumbnail()) : ?>
									<img class="lozad"
										data-src="<?php echo get_the_post_thumbnail_url(get_the_ID(), 'full'); ?>"
										alt="<?php the_title_attribute(); ?>" loading="lazy" />
									<?php else : ?>
									<img class="lozad" data-src="https://picsum.photos/1920/1080?nature=1"
										alt="<?php the_title_attribute(); ?>" loading="lazy" />
									<?php endif; ?>
								</a>
							</div>
							<div class="txt pt-4">
								<h3 class="heading-3 text-primary-1 relative z-50 mb-4"><?php the_title(); ?></h3>
								<div class="desc body-2 relative z-50 mt-2">
									<?php
										$location = get_field('project_location');
										$scale = get_field('project_scale');
										if ($location || $scale) :
										?>
									<ul>
										<?php if ($location) : ?>
										<li>Vị Trí: <strong><?php echo esc_html($location); ?></strong></li>
										<?php endif; ?>
										<?php if ($scale) : ?>
										<li>Quy Mô: <strong><?php echo esc_html($scale); ?></strong></li>
										<?php endif; ?>
									</ul>
									<?php else : ?>
									<?php the_excerpt(); ?>
									<?php endif; ?>
								</div>
							</div>
						</div>
					</div>
					<?php endwhile; ?>
				</div>
			</div>
		</div>
	</div>

	<?php if ($button) : ?>
	<div class="btn-wrap mt-10 flex-center">
		<a href="<?php echo esc_url($button['url']); ?>" class="btn btn-primary"
			<?php if (!empty($button['target'])) : ?>target="<?php echo esc_attr($button['target']); ?>"
			<?php endif; ?>>
			<span><?php echo esc_html($button['title']); ?></span><em class="fa-regular fa-arrow-right"></em>
		</a>
	</div>
	<?php endif; ?>

	<?php wp_reset_postdata(); ?>
</section>