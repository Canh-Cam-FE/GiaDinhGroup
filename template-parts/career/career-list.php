<?php
$list_title    = get_field('career_list_title');
$list_subtitle = get_field('career_list_subtitle');
$page_id       = get_the_ID();
$query         = new WP_Query(canhcam_get_career_list_query_args(1, $page_id));
$has_more      = canhcam_career_has_more(1, $page_id);
?>
<section class="recruit-list pad-8 bg-grey-50">
	<div class="container">
		<?php if ($list_title) : ?>
			<h2 class="heading-1 mb-3 text-center"><?php echo esc_html($list_title); ?></h2>
		<?php endif; ?>
		<?php if ($list_subtitle) : ?>
			<div class="body-1 text-center mb-10"><?php echo esc_html($list_subtitle); ?></div>
		<?php endif; ?>
		<div class="filter-table-wrap">
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th><?php echo esc_html__('STT', 'canhcamtheme'); ?></th>
							<th><?php echo esc_html__('VỊ TRÍ ỨNG TUYỂN', 'canhcamtheme'); ?></th>
							<th><?php echo esc_html__('KHU VỰC', 'canhcamtheme'); ?></th>
							<th><?php echo esc_html__('HẠN NỘP HỒ SƠ', 'canhcamtheme'); ?></th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						<?php if ($query->have_posts()) : ?>
							<?php
							$index = 1;
							while ($query->have_posts()) :
								$query->the_post();
								get_template_part('template-parts/career/career-list-row', null, array('index' => $index));
								$index++;
							endwhile;
							?>
						<?php endif; ?>
					</tbody>
				</table>
			</div>
			<?php if ($has_more) : ?>
				<div class="ajax-btn-wrap mx-auto w-fit pt-9">
					<a class="btn btn-primary" href="#">
						<span><?php echo esc_html__('Xem thêm', 'canhcamtheme'); ?></span>
						<em class="fa-regular fa-chevron-down"></em>
					</a>
				</div>
			<?php endif; ?>
		</div>
	</div>
</section>
<?php
wp_reset_postdata();
