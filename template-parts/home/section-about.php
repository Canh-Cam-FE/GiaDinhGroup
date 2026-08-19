<?php
$image_1 = get_field('about_image_1');
$title_1 = get_field('about_title_1');
$desc_1 = get_field('about_desc_1');
$button_1 = get_field('about_button_1');

$image_2 = get_field('about_image_2');
$title_2 = get_field('about_title_2');
$desc_2 = get_field('about_desc_2');
$stats = get_field('about_stats');
$button_2 = get_field('about_button_2');

$panel_image = get_field('about_panel_image');
$panel_content = get_field('about_panel_content');
?>
<section class="home-about bg-white relative">
	<div class="progress-track"></div>
	<div class="container-fluid p-0 relative">
		<div class="row gap-10 lg:gap-16">
			<div class="col w-full lg:w-1/2">
				<div class="img zoom-in overflow-hidden lg:rem:max-w-[900px] lg:rem:max-h-[600px]">
					<a class="img-ratio ratio:pt-[600_900]">
						<?php if ($image_1): ?>
							<img class="lozad" data-src="<?php echo esc_url($image_1['url']); ?>"
								alt="<?php echo esc_attr($image_1['alt']); ?>" loading="lazy" />
						<?php endif; ?>
					</a>
				</div>
			</div>
			<div class="col w-full lg:w-1/2">
				<div
					class="content h-full flex flex-col col-left justify-center clamp:gap-[24-32] lg:rem:max-w-[740px] 2xl:rem:max-w-[640px]">
					<?php if ($title_1): ?>
						<h2 class="heading-1 text-gray-950"><?php echo esc_html($title_1); ?></h2>
					<?php endif; ?>
					<?php if ($desc_1): ?>
						<div class="wrap flex flex-col clamp:gap-[16-16]">
							<div class="zone-desc body-2">
								<?php echo wp_kses_post($desc_1); ?>
							</div>
						</div>
					<?php endif; ?>
					<?php if ($button_1): ?>
						<a href="<?php echo esc_url($button_1['url']); ?>" class="btn btn-primary" <?php if (!empty($button_1['target'])): ?>target="<?php echo esc_attr($button_1['target']); ?>" <?php endif; ?>>
							<span><?php echo esc_html($button_1['title']); ?></span><em
								class="fa-regular fa-arrow-right"></em>
						</a>
					<?php endif; ?>
				</div>
			</div>
		</div>
		<div class="row gap-10 lg:gap-16">
			<div class="col w-full lg:w-1/2">
				<div class="img zoom-in overflow-hidden lg:rem:max-w-[900px] lg:rem:max-h-[600px]">
					<a class="img-ratio ratio:pt-[600_900]">
						<?php if ($image_2): ?>
							<img class="lozad" data-src="<?php echo esc_url($image_2['url']); ?>"
								alt="<?php echo esc_attr($image_2['alt']); ?>" loading="lazy" />
						<?php endif; ?>
					</a>
				</div>
			</div>
			<div class="col w-full lg:w-1/2">
				<div
					class="content h-full flex flex-col col-left justify-center clamp:gap-[24-32] lg:rem:max-w-[740px] 2xl:rem:max-w-[640px]">
					<div class="wrap flex flex-col clamp:gap-[24-32]">
						<?php if ($title_2): ?>
							<h2 class="heading-1 text-gray-950"><?php echo esc_html($title_2); ?></h2>
						<?php endif; ?>
						<?php if ($desc_2): ?>
							<div class="desc body-2 text-gray-800"><?php echo nl2br(esc_html($desc_2)); ?></div>
						<?php endif; ?>
					</div>
					<?php if (!empty($stats)): ?>
						<div class="list flex flex-col clamp:gap-[24-32]">
							<?php
							$chunks = array_chunk($stats, 2);
							foreach ($chunks as $chunk):
								?>
								<div class="row flex clamp:gap-[32-32]">
									<?php foreach ($chunk as $stat): ?>
										<div class="col w-full sm:w-1/2">
											<div class="item flex flex-col clamp:gap-[8-8]">
												<h2 class="heading-1 text-primary-1 counter">
													<?php echo esc_html($stat['stat_number']); ?>
												</h2>
												<hr>
												<div class="inner flex items-center clamp:gap-[8-8]">
													<span
														class="box bg-primary-2 rounded-full rem:w-[8px] rem:h-[8px] rem:min-w-[8px]"></span>
													<h4 class="heading-5 text-gray-950"><?php echo esc_html($stat['stat_unit']); ?>
													</h4>
													<div class="desc body-3 text-gray-800">
														<?php echo esc_html($stat['stat_desc']); ?>
													</div>
												</div>
											</div>
										</div>
									<?php endforeach; ?>
								</div>
							<?php endforeach; ?>
						</div>
					<?php endif; ?>
					<?php if ($button_2): ?>
						<a href="<?php echo esc_url($button_2['url']); ?>" class="btn btn-primary" <?php if (!empty($button_2['target'])): ?>target="<?php echo esc_attr($button_2['target']); ?>" <?php endif; ?>>
							<span><?php echo esc_html($button_2['title']); ?></span><em
								class="fa-regular fa-arrow-right"></em>
						</a>
					<?php endif; ?>
				</div>
			</div>
		</div>
	</div>
	<div class="panel relative">
		<div class="bg-bottom">
			<?php if ($panel_image): ?>
				<img src="<?php echo esc_url($panel_image['url']); ?>" alt="<?php echo esc_attr($panel_image['alt']); ?>">
			<?php else: ?>
				<img src="<?php echo esc_url(get_template_directory_uri()); ?>/img/bg/home-about-bg-2.png" alt="">
			<?php endif; ?>
		</div>
		<div class="t128-900-125-s-ahc text-center">
			<?php echo $panel_content ? esc_html($panel_content) : 'WHATWE DO'; ?>
		</div>
	</div>
</section>