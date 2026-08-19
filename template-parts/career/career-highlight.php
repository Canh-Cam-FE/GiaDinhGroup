<?php
$highlight = get_field('career_highlight_text');

if (!$highlight) {
	return;
}
?>
<section class="recruit-banner pad-6 bg-primary-1 relative overflow-hidden">
	<h2 class="heading-2 italic text-white text-center"><?php echo esc_html($highlight); ?></h2>
</section>
