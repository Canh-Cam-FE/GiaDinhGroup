<?php
$permalink = get_permalink();
$cat_name  = canhcam_get_post_primary_category_name();
$cat_link  = canhcam_get_post_primary_category_link();
?>
<div class="item news-item">
	<div class="img zoom-in overflow-hidden">
		<a href="<?php echo esc_url($permalink); ?>" class="img-ratio ratio:pt-[228_320]">
			<?php if (has_post_thumbnail()) : ?>
			<?php echo get_image_post(get_the_ID(), 'image'); ?>
			<?php endif; ?>
		</a>
	</div>
	<div class="content">
		<h4>
			<a class="group-hover:text-primary-2 heading-5 text-gray-950" href="<?php echo esc_url($permalink); ?>">
				<?php the_title(); ?>
			</a>
		</h4>
		<div class="inner flex items-center clamp:gap-[8-8]">
			<div class="desc body-3 text-gray-500"><?php echo esc_html(get_the_date('d/m/Y')); ?></div>
			<?php if ($cat_name) : ?>
			<div class="desc body-4 text-gray-500">|</div>
			<div class="desc body-3 text-gray-500"><a
					href="<?php echo esc_url($cat_link); ?>"><?php echo esc_html($cat_name); ?></a></div>
			<?php endif; ?>
		</div>
	</div>
</div>