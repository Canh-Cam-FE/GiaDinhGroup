<?php
$source_id = canhcam_get_home_page_id();
$title = get_field('partner_title', $source_id);
$items = get_field('partner_items', $source_id);
if (empty($items))
	return;
?>
<section id="partner" class="home-doi-tac clamp:py-[64-80]"
	setBackground="<?php echo esc_url(get_template_directory_uri()); ?>/img/bg/home-partner-bg.png">
	<div class="container-xxl flex flex-col items-center clamp:gap-[32-40]">
		<?php if ($title): ?>
			<h2 class="heading-1 text-gray-950"><?php echo esc_html($title); ?></h2>
		<?php endif; ?>
		<div class="wrap w-full overflow-hidden rem:rounded-[20px]">
			<div class="list flex flex-col clamp:gap-[20-20]">
				<div class="init-swiper">
					<div class="swiper is-loop" data-time="0" data-speed="4000">
						<div class="swiper-wrapper">
							<?php foreach ($items as $item):
								$logo = $item['partner_logo'] ?? null;
								if (!$logo)
									continue;
								?>
								<div class="swiper-slide">
									<div class="item bg-white flex items-center justify-center">
										<?php echo get_image_attrachment($logo, 'image'); ?>
									</div>
								</div>
							<?php endforeach; ?>
						</div>
					</div>
				</div>

			</div>
		</div>
	</div>
</section>