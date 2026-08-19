<?php
$deco_logo = get_field('message_deco_logo');
$portrait = get_field('message_portrait');
$title = get_field('message_title');
$content = get_field('message_content');
$author_name = get_field('message_author_name');
$author_role = get_field('message_author_role');

if (!$title && !$content && !$portrait) {
	return;
}
?>
<section id="anchor-2" class="about-thong-iep-cua-chu-tich anchor-section-id relative overflow-hidden">
	<div class="container">
		<?php if ($deco_logo): ?>
			<div class="media absolute">
				<?php echo get_image_attrachment($deco_logo, 'image'); ?>
			</div>
		<?php endif; ?>
		<div class="container relative z-10">
			<div class="row">
				<div class="col w-full lg:w-5/12">
					<?php if ($portrait): ?>
						<div class="img overflow-hidden">
							<a><?php echo get_image_attrachment($portrait, 'image'); ?></a>
						</div>
					<?php endif; ?>
				</div>
				<div class="col w-full lg:w-7/12">
					<div class="content flex flex-col pad-8 clamp:gap-[40-40]">
						<?php if ($title): ?>
							<h2 class="heading-1 text-gray-950"><?php echo esc_html($title); ?></h2>
						<?php endif; ?>
						<?php if ($content): ?>
							<div class="bg-wrap relative z-50">
								<div class="card bg-secondary-white-80 relative z-50 rem:rounded-[28px] p-10 lg:p-10 ">
									<div class="desc body-2">
										<?php echo canhcam_kses_post($content); ?>
									</div>
								</div>
							</div>
						<?php endif; ?>
						<?php if ($author_name || $author_role): ?>
							<div class="wrap flex flex-col items-end qoute-text relative z-50 clamp:gap-[20-24]">
								<?php if ($author_name): ?>
									<div class="t52-400-198-s6-avc text-primary-1"><?php echo esc_html($author_name); ?></div>
								<?php endif; ?>
								<?php if ($author_role): ?>
									<div class="desc body-4 text-primary-1 font-bold"><?php echo esc_html($author_role); ?>
									</div>
								<?php endif; ?>
							</div>
						<?php endif; ?>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>