<?php
/**
 * Career detail breadcrumb (no top-banner — OIC pattern).
 */
?>
<div class="global-breadcrumb">
	<div class="container">
		<h2 class="heading-banner text-4xl lg:text-6xl font-bold uppercase"><?php the_title(); ?></h2>
		<?php if (function_exists('rank_math_the_breadcrumbs')) : ?>
			<?php rank_math_the_breadcrumbs(); ?>
		<?php else : ?>
			<nav class="rank-math-breadcrumb" aria-label="<?php echo esc_attr__('breadcrumbs', 'canhcamtheme'); ?>">
				<p>
					<a href="<?php echo esc_url(home_url('/')); ?>"><?php echo esc_html__('Trang chủ', 'canhcamtheme'); ?></a>
					<span class="separator"> - </span>
					<?php
					$career_page_id = canhcam_get_career_page_id();
					if ($career_page_id) :
						?>
						<a href="<?php echo esc_url(get_permalink($career_page_id)); ?>"><?php echo esc_html(get_the_title($career_page_id)); ?></a>
						<span class="separator"> - </span>
					<?php endif; ?>
					<span class="last"><?php echo esc_html(get_the_title()); ?></span>
				</p>
			</nav>
		<?php endif; ?>
	</div>
</div>
