<?php
$title_page = get_the_title();
?>
<div class="global-breadcrumb">
	<div class="container">
		<?php if ($title_page) : ?>
		<h2 class="heading-banner text-white text-4xl lg:text-6xl font-bold uppercase">
			<?php echo esc_html($title_page); ?>
		</h2>
		<?php endif; ?>
		<?php canhcam_render_breadcrumb(); ?>
	</div>
</div>