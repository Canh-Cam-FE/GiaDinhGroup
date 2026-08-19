<?php
$title = get_field('news_title');
$button = get_field('news_button');

// Lấy danh sách các chuyên mục (category)
$categories = get_terms([
	'taxonomy'   => 'category',
	'hide_empty' => true,
	'number'     => 3, // Lấy 3 chuyên mục để giống mockup
]);

// Hàm helper để render danh sách bài viết trong 1 tab
if (!function_exists('canhcam_render_news_tab_content')) {
	function canhcam_render_news_tab_content($query)
	{
		if (!$query->have_posts()) {
			echo '<div class="desc body-2 text-gray-800">Nội dung sẽ được cập nhật.</div>';
			return;
		}

		$posts = $query->posts;
		?>
		<div class="desktop-block max-lg:hidden">
			<div class="row">
				<?php if (count($posts) > 0) : ?>
					<div class="col w-full lg:w-3/12">
						<div class="list flex flex-col gap-5 lg:clamp:gap-[40-40]">
							<?php for ($i = 1; $i <= 2; $i++) :
								if (!isset($posts[$i])) break;
								$p = $posts[$i];
								$cat = get_the_category($p->ID);
								$cat_name = !empty($cat) ? $cat[0]->name : '';
							?>
								<div class="item news-item">
									<div class="img zoom-in overflow-hidden">
										<a href="<?php echo get_permalink($p->ID); ?>" class="img-ratio ratio:pt-[228_320]">
											<?php if (has_post_thumbnail($p->ID)) : ?>
												<img class="lozad" data-src="<?php echo get_the_post_thumbnail_url($p->ID, 'full'); ?>" alt="<?php echo esc_attr(get_the_title($p->ID)); ?>" loading="lazy" />
											<?php else : ?>
												<img class="lozad" data-src="https://picsum.photos/1920/1080?nature=1" alt="<?php echo esc_attr(get_the_title($p->ID)); ?>" loading="lazy" />
											<?php endif; ?>
										</a>
									</div>
									<div class="content">
										<h4><a class="group-hover:text-primary-2 heading-5 text-gray-950" href="<?php echo get_permalink($p->ID); ?>"><?php echo get_the_title($p->ID); ?></a></h4>
										<div class="inner flex items-center clamp:gap-[8-8]">
											<div class="desc body-3 text-gray-500"><?php echo get_the_date('d/m/Y', $p->ID); ?></div>
											<div class="desc body-4 text-gray-500">|</div>
											<div class="desc body-3 text-gray-500"><?php echo esc_html($cat_name); ?></div>
										</div>
									</div>
								</div>
							<?php endfor; ?>
						</div>
					</div>
				<?php endif; ?>

				<?php if (isset($posts[0])) :
					$p = $posts[0];
					$cat = get_the_category($p->ID);
					$cat_name = !empty($cat) ? $cat[0]->name : '';
				?>
					<div class="col w-full lg:w-6/12">
						<div class="item news-item group">
							<div class="img zoom-in overflow-hidden">
								<a href="<?php echo get_permalink($p->ID); ?>" class="img-ratio ratio:pt-[520_640]">
									<?php if (has_post_thumbnail($p->ID)) : ?>
										<img class="lozad" data-src="<?php echo get_the_post_thumbnail_url($p->ID, 'full'); ?>" alt="<?php echo esc_attr(get_the_title($p->ID)); ?>" loading="lazy" />
									<?php else : ?>
										<img class="lozad" data-src="https://picsum.photos/1920/1080?nature=1" alt="<?php echo esc_attr(get_the_title($p->ID)); ?>" loading="lazy" />
									<?php endif; ?>
								</a>
							</div>
							<div class="content">
								<h4><a class="heading-4 group-hover:text-primary-2 text-gray-950" href="<?php echo get_permalink($p->ID); ?>"><?php echo get_the_title($p->ID); ?></a></h4>
								<div class="desc body-3 text-gray-950 line-clamp-2"><?php echo get_the_excerpt($p->ID); ?></div>
								<div class="inner flex items-center clamp:gap-[8-8] pt-2">
									<div class="desc body-3 text-gray-500"><?php echo get_the_date('d/m/Y', $p->ID); ?></div>
									<div class="desc body-4 text-gray-500">|</div>
									<div class="desc body-3 text-gray-500"><?php echo esc_html($cat_name); ?></div>
								</div>
							</div>
						</div>
					</div>
				<?php endif; ?>

				<?php if (count($posts) > 3) : ?>
					<div class="col w-full lg:w-3/12">
						<div class="list flex flex-col gap-5 lg:clamp:gap-[40-40]">
							<?php for ($i = 3; $i <= 4; $i++) :
								if (!isset($posts[$i])) break;
								$p = $posts[$i];
								$cat = get_the_category($p->ID);
								$cat_name = !empty($cat) ? $cat[0]->name : '';
							?>
								<div class="item news-item">
									<div class="img zoom-in overflow-hidden">
										<a href="<?php echo get_permalink($p->ID); ?>" class="img-ratio ratio:pt-[228_320]">
											<?php if (has_post_thumbnail($p->ID)) : ?>
												<img class="lozad" data-src="<?php echo get_the_post_thumbnail_url($p->ID, 'full'); ?>" alt="<?php echo esc_attr(get_the_title($p->ID)); ?>" loading="lazy" />
											<?php else : ?>
												<img class="lozad" data-src="https://picsum.photos/1920/1080?nature=1" alt="<?php echo esc_attr(get_the_title($p->ID)); ?>" loading="lazy" />
											<?php endif; ?>
										</a>
									</div>
									<div class="content">
										<h4><a class="group-hover:text-primary-2 heading-5 text-gray-950" href="<?php echo get_permalink($p->ID); ?>"><?php echo get_the_title($p->ID); ?></a></h4>
										<div class="inner flex items-center clamp:gap-[8-8]">
											<div class="desc body-3 text-gray-500"><?php echo get_the_date('d/m/Y', $p->ID); ?></div>
											<div class="desc body-4 text-gray-500">|</div>
											<div class="desc body-3 text-gray-500"><?php echo esc_html($cat_name); ?></div>
										</div>
									</div>
								</div>
							<?php endfor; ?>
						</div>
					</div>
				<?php endif; ?>
			</div>
		</div>

		<div class="tablet-block lg:hidden">
			<div class="auto-3 init-swiper">
				<div class="swiper">
					<div class="swiper-wrapper">
						<?php foreach ($posts as $p) :
							$cat = get_the_category($p->ID);
							$cat_name = !empty($cat) ? $cat[0]->name : '';
						?>
							<div class="swiper-slide">
								<div class="item news-item group">
									<div class="img zoom-in overflow-hidden">
										<a href="<?php echo get_permalink($p->ID); ?>" class="img-ratio ratio:pt-[520_640]">
											<?php if (has_post_thumbnail($p->ID)) : ?>
												<img class="lozad" data-src="<?php echo get_the_post_thumbnail_url($p->ID, 'full'); ?>" alt="<?php echo esc_attr(get_the_title($p->ID)); ?>" loading="lazy" />
											<?php else : ?>
												<img class="lozad" data-src="https://picsum.photos/1920/1080?nature=1" alt="<?php echo esc_attr(get_the_title($p->ID)); ?>" loading="lazy" />
											<?php endif; ?>
										</a>
									</div>
									<div class="content">
										<h4><a class="heading-4 group-hover:text-primary-2 text-gray-950" href="<?php echo get_permalink($p->ID); ?>"><?php echo get_the_title($p->ID); ?></a></h4>
										<div class="desc body-3 text-gray-950 line-clamp-2"><?php echo get_the_excerpt($p->ID); ?></div>
										<div class="inner flex items-center clamp:gap-[8-8] pt-2">
											<div class="desc body-3 text-gray-500"><?php echo get_the_date('d/m/Y', $p->ID); ?></div>
											<div class="desc body-4 text-gray-500">|</div>
											<div class="desc body-3 text-gray-500"><?php echo esc_html($cat_name); ?></div>
										</div>
									</div>
								</div>
							</div>
						<?php endforeach; ?>
					</div>
				</div>
				<div class="pagination-wrap mt-8">
					<div class="swiper-pagination"></div>
				</div>
			</div>
		</div>
<?php
	}
}
?>
<section class="home-tin-tuc bg-white pad-8">
	<div class="container">
		<?php if ($title) : ?>
			<h2 class="heading-1 text-gray-950 text-center mb-4"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>

		<div class="tab-nav mb-10">
			<ul class="list flex flex-wrap items-center justify-center clamp:gap-[16-16]">
				<li class="active">
					<a href="javascript:;" data-type="news-tab-all">
						<span class="desc body-1">Tất cả</span><i class="material-symbols-outlined">arrow_drop_down</i>
					</a>
				</li>
				<?php foreach ($categories as $cat) : ?>
					<hr>
					<li>
						<a href="javascript:;" data-type="news-tab-<?php echo esc_attr($cat->term_id); ?>">
							<span class="desc body-1"><?php echo esc_html($cat->name); ?></span><i class="material-symbols-outlined">arrow_drop_down</i>
						</a>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>

		<div class="tab-item active" id="news-tab-all">
			<?php
			$query_all = new WP_Query([
				'post_type'      => 'post',
				'posts_per_page' => 5,
				'post_status'    => 'publish',
			]);
			canhcam_render_news_tab_content($query_all);
			wp_reset_postdata();
			?>
		</div>

		<?php foreach ($categories as $cat) : ?>
			<div class="tab-item" id="news-tab-<?php echo esc_attr($cat->term_id); ?>">
				<?php
				$query_cat = new WP_Query([
					'post_type'      => 'post',
					'posts_per_page' => 5,
					'post_status'    => 'publish',
					'cat'            => $cat->term_id,
				]);
				canhcam_render_news_tab_content($query_cat);
				wp_reset_postdata();
				?>
			</div>
		<?php endforeach; ?>

		<?php if ($button) : ?>
			<div class="btn-wrap mt-4 flex-center block-btn">
				<a href="<?php echo esc_url($button['url']); ?>" class="btn btn-primary" <?php if (!empty($button['target'])) : ?>target="<?php echo esc_attr($button['target']); ?>" <?php endif; ?>>
					<span><?php echo esc_html($button['title']); ?></span><em class="fa-regular fa-arrow-right"></em>
				</a>
			</div>
		<?php endif; ?>
	</div>
</section>
