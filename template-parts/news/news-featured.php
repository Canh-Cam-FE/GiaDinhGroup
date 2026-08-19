<?php
$permalink = get_permalink();
$cat_name  = canhcam_get_post_primary_category_name();
$excerpt   = get_the_excerpt();
?>
<div class="news-item big row group">
	<div class="col w-full lg:w-8/12">
		<div class="img zoom-in overflow-hidden">
			<a href="<?php echo esc_url($permalink); ?>" class="img-ratio ratio:pt-[519_920]">
				<?php if (has_post_thumbnail()) : ?>
					<?php echo get_image_post(get_the_ID(), 'image'); ?>
				<?php endif; ?>
			</a>
		</div>
	</div>
	<div class="col w-full lg:w-4/12">
		<div class="content col-left h-full px-8 max-lg:px-[15px]">
			<h4 class="border-b border-white pb-4 border-opacity-20">
				<a class="group-hover:text-primary-2 heading-4 text-gray-950 uppercase text-white" href="<?php echo esc_url($permalink); ?>">
					<?php the_title(); ?>
				</a>
			</h4>
			<?php if ($excerpt) : ?>
				<div class="desc body-2 text-white mt-4"><?php echo esc_html($excerpt); ?></div>
			<?php endif; ?>
			<div class="inner flex items-center clamp:gap-[8-8] mt-5">
				<div class="desc body-3 text-white"><?php echo esc_html(get_the_date('d/m/Y')); ?></div>
				<?php if ($cat_name) : ?>
					<div class="desc body-4 text-white">|</div>
					<div class="desc body-3 text-white"><?php echo esc_html($cat_name); ?></div>
				<?php endif; ?>
			</div>
		</div>
	</div>
</div>
