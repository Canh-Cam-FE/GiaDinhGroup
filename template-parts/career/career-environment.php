<?php
if (!have_rows('career_work_environment_list')) {
	return;
}
?>
<section class="recruit-1 relative overflow-hidden">
	<?php
	while (have_rows('career_work_environment_list')) :
		the_row();
		$title   = get_sub_field('title');
		$image   = get_sub_field('image');
		$content = get_sub_field('content');
		?>
		<div class="container-fluid bg-grey-50">
			<div class="row">
				<div class="col w-full lg:w-1/2">
					<?php if ($image) : ?>
						<div class="img zoom-in overflow-hidden flex-center w-full">
							<a class="overflow-hidden w-full">
								<?php echo get_image_attrachment($image, 'image'); ?>
							</a>
						</div>
					<?php endif; ?>
				</div>
				<div class="col w-full lg:w-1/2">
					<div class="txt lg:pl-10 2xl:pl-20 rem:lg:max-w-[760px] rem:xl:max-w-[790px] rem:2xl:max-w-[700px] h-full col-left">
						<?php if ($title) : ?>
							<h2 class="heading-1 mb-10"><?php echo esc_html($title); ?></h2>
						<?php endif; ?>
						<?php if ($content) : ?>
							<div class="scrollbar-wrap">
								<div class="fullcontent">
									<?php echo canhcam_kses_post($content); ?>
								</div>
							</div>
						<?php endif; ?>
					</div>
				</div>
			</div>
		</div>
	<?php endwhile; ?>
</section>
