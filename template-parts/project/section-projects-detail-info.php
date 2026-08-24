<?php
/**
 * Project detail — info section.
 */
$intro = get_field('project_intro');
$product_note = get_field('project_product_note');
$location = get_field('project_location');
$investor = get_field('project_investor');
$scale = get_field('project_scale');
$handover = get_field('project_handover');

$has_meta = $location || $investor || $scale || $handover;
?>
<section class="projects-detail-info clamp:py-[40-80]">
	<div class="container">
		<div class="row">
			<div class="col w-full lg:w-7/12">
				<div class="content flex flex-col clamp:gap-[24-24]">
					<h2 class="heading-1 text-gray-950"><?php the_title(); ?></h2>
					<?php if ($intro || $product_note): ?>
						<div class="wrap flex flex-col clamp:gap-[12-12]">
							<?php if ($intro): ?>
								<div class="desc body-2 text-gray-950"><?php echo canhcam_kses_post($intro); ?></div>
							<?php endif; ?>
							<?php if ($product_note): ?>
								<div class="desc body-2 text-gray-950"><?php echo canhcam_kses_post($product_note); ?></div>
							<?php endif; ?>
						</div>
					<?php endif; ?>
				</div>
			</div>
			<?php if ($has_meta): ?>
				<div class="col w-full lg:w-5/12">
					<div class="card">
						<div class="list flex flex-col clamp:gap-[24-24]">
							<?php if ($location): ?>
								<div class="item flex flex-col clamp:gap-[4-4]">
									<div class="desc body-2 text-white label font-bold">
										<?php echo esc_html__('Vị trí', 'canhcamtheme'); ?></div>
									<div class="desc body-2 text-white"><?php echo esc_html($location); ?></div>
								</div>
							<?php endif; ?>
							<?php if ($investor): ?>
								<div class="item flex flex-col clamp:gap-[4-4]">
									<div class="desc body-2 text-white label font-bold">
										<?php echo esc_html__('Chủ đầu tư', 'canhcamtheme'); ?></div>
									<div class="desc body-2 text-white"><?php echo esc_html($investor); ?></div>
								</div>
							<?php endif; ?>
							<?php if ($scale || $handover): ?>
								<div class="inner flex items-center clamp:gap-[52-52]">
									<?php if ($scale): ?>
										<div class="item flex flex-col clamp:gap-[4-4]">
											<div class="desc body-2 text-white label font-bold">
												<?php echo esc_html__('Quy mô', 'canhcamtheme'); ?></div>
											<div class="desc body-2 text-white"><?php echo esc_html($scale); ?></div>
										</div>
									<?php endif; ?>
									<!-- <?php if ($scale && $handover): ?>
							<hr>
							<?php endif; ?>
							<?php if ($handover): ?>
							<div class="item flex flex-col clamp:gap-[4-4]">
								<div class="desc body-2 text-white label font-bold">
									<?php echo esc_html__('Thời gian bàn giao', 'canhcamtheme'); ?></div>
								<div class="desc body-2 text-white"><?php echo esc_html($handover); ?></div>
							</div>
							<?php endif; ?> -->
								</div>
							<?php endif; ?>
						</div>
					</div>
				</div>
			<?php endif; ?>
		</div>
	</div>
</section>