<?php
$items = get_field('sticky_nav_items');
if (empty($items)) {
	return;
}
?>
<div class="sticky-nav bg-grey-50">
	<div class="container">
		<ul>
			<?php foreach ($items as $index => $item) :
				$label  = $item['item_label'] ?? '';
				$anchor = $item['item_anchor'] ?? '';
				if (!$label || !$anchor) {
					continue;
				}
				$href = '#' . ltrim($anchor, '#');
			?>
				<li class="px-3 lg:px-5 relative<?php echo $index === 0 ? ' is-active' : ''; ?>">
					<a class="py-2 flex-center transition relative text-grey-950 text-base " href="<?php echo esc_url($href); ?>">
						<?php echo esc_html($label); ?>
					</a>
				</li>
			<?php endforeach; ?>
		</ul>
	</div>
</div>
