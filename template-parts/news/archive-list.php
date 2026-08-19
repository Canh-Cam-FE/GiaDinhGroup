<?php

/**
 * News archive listing (OIC archive-list pattern + Gia Định UI).
 */
global $wp_query;

$paged = max(1, (int) get_query_var('paged'));
?>
<section class="home-tin-tuc bg-white pad-8 news-list">
	<div class="container">
		<h2 class="heading-1 text-gray-950 text-center mb-4"><?php echo esc_html__('Tin tức', 'canhcamtheme'); ?></h2>
		<div class="tab-nav mb-10">
			<?php get_template_part('template-parts/news/category-nav'); ?>
		</div>
		<?php if (have_posts()) : ?>
		<?php if ($paged === 1) : ?>
		<?php
				the_post();
				get_template_part('template-parts/news/news-featured');
				?>
		<?php endif; ?>
		<?php if (have_posts()) : ?>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bottom-block pt-10 lg:gap-10">
			<?php while (have_posts()) : the_post(); ?>
			<?php get_template_part('template-parts/news/news-card'); ?>
			<?php endwhile; ?>
		</div>
		<?php endif; ?>
		<?php canhcam_render_news_pagination($wp_query); ?>
		<?php else : ?>
		<div class="desc body-2 text-gray-800 text-center">
			<?php echo esc_html__('Nội dung sẽ được cập nhật.', 'canhcamtheme'); ?></div>
		<?php endif; ?>
	</div>
</section>