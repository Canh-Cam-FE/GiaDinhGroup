<?php
$id_category = get_queried_object()->term_id;
$taxonomy = get_queried_object()->taxonomy;
if ($id_category) {
	$id = $taxonomy . '_' . $id_category;
} else {
	$id = get_the_ID();
}
$banner = get_field('banner_select_page', $id);
?>
<?php if ($banner) : ?>
	<?php foreach ($banner as $item) : ?>
	<?php endforeach; ?>
<?php endif; ?>