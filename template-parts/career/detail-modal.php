<?php
$app_shortcode = get_field('career_application_shortcode', 'option');

if (!$app_shortcode) {
	return;
}
?>
<div class="popup-modal recruit-modal hidden" id="recruit-modal">
	<div class="popup-modal-wrap">
		<h2 class="form-title heading-2 text-center text-primary-1 font-bold"><?php the_title(); ?></h2>

		<?php canhcam_render_cf7_form($app_shortcode); ?>
	</div>
</div>