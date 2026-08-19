<?php
$form_title     = get_field('contact_form_title');
$form_subtitle  = get_field('contact_form_subtitle');
$form_shortcode = get_field('contact_form_shortcode');
$company_name   = get_field('contact_company_name');
$map_iframe     = get_field('contact_iframe');

$has_form = $form_title || $form_subtitle || $form_shortcode;
$has_info = $company_name || have_rows('contact_info_list');
$has_map  = !empty($map_iframe);

if (!$has_form && !$has_info && !$has_map) {
	return;
}
?>
<section class="contact-us pad-8 overflow-hidden">
	<div class="container">
		<?php if ($has_form || $has_info) : ?>
			<div class="row">
				<?php if ($has_form) : ?>
					<div class="col w-full lg:w-6/12">
						<div class="txt lg:pr-10">
							<?php if ($form_title) : ?>
								<h2 class="heading-1 mb-4 text-grey-950"><?php echo esc_html($form_title); ?></h2>
							<?php endif; ?>
							<?php if ($form_subtitle) : ?>
								<div class="fmr-msg mb-5 desc body-2"><?php echo esc_html($form_subtitle); ?></div>
							<?php endif; ?>
							<?php if ($form_shortcode) : ?>
								<div class="wrap-form relative z-50">
									<?php canhcam_render_cf7_form($form_shortcode); ?>
								</div>
							<?php endif; ?>
						</div>
					</div>
				<?php endif; ?>
				<?php if ($has_info) : ?>
					<div class="col w-full lg:w-5/12">
						<div class="block-wrap lg:pl-8">
							<?php if ($company_name) : ?>
								<h2 class="heading-2 text-primary-1 mb-10"><?php echo esc_html($company_name); ?></h2>
							<?php endif; ?>
							<?php if (have_rows('contact_info_list')) : ?>
								<address>
									<ul>
										<?php while (have_rows('contact_info_list')) :
											the_row();
											$icon_class = get_sub_field('icon_class');
											$content    = get_sub_field('content');
											?>
											<li>
												<?php if ($icon_class) : ?>
													<div class="icon"><em class="<?php echo esc_attr($icon_class); ?>"></em></div>
												<?php endif; ?>
												<?php if ($content) : ?>
													<div class="desc body-2">
														<?php echo canhcam_kses_post($content); ?>
													</div>
												<?php endif; ?>
											</li>
										<?php endwhile; ?>
									</ul>
								</address>
							<?php endif; ?>
						</div>
					</div>
				<?php endif; ?>
			</div>
		<?php endif; ?>
		<?php if ($has_map) : ?>
			<div class="map-wrap mt-10 h-full lg:mt-15">
				<a class="overflow-hidden">
					<?php canhcam_render_contact_map_iframe($map_iframe); ?>
				</a>
			</div>
		<?php endif; ?>
	</div>
</section>
