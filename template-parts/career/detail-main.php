<?php
$info          = get_field('career_information');
$image         = canhcam_get_career_image();
$app_file      = get_field('career_application_file');
$app_shortcode = get_field('career_application_shortcode', 'option');

$info_rows = array(
	array('label' => __('Vị trí', 'canhcamtheme'), 'value' => $info['position'] ?? ''),
	array('label' => __('Chức vụ', 'canhcamtheme'), 'value' => $info['level'] ?? ''),
	array('label' => __('Yêu cầu bằng cấp', 'canhcamtheme'), 'value' => $info['degree'] ?? ''),
	array('label' => __('Mức lương', 'canhcamtheme'), 'value' => $info['salary'] ?? ''),
	array('label' => __('Số lượng ứng tuyển', 'canhcamtheme'), 'value' => $info['quantity'] ?? ''),
	array('label' => __('Địa điểm làm việc', 'canhcamtheme'), 'value' => $info['location'] ?? ''),
	array(
		'label' => __('Hạn nộp hồ sơ', 'canhcamtheme'),
		'value' => !empty($info['application_deadline']) ? canhcam_format_career_deadline($info['application_deadline']) : '',
	),
);

$other_careers = new WP_Query(array(
	'post_type'      => 'career',
	'post_status'    => 'publish',
	'posts_per_page' => 4,
	'post__not_in'   => array(get_the_ID()),
	'orderby'        => 'date',
	'order'          => 'DESC',
));
?>
<section class="recruit-detail pad-8">
	<div class="container">
		<div class="grid grid-cols-12 gap-10">
			<div class="col-span-12 lg:col-span-8">
				<div class="info-wrap block lg:p-10 bg-grey-50 p-6 mb-10">
					<h2 class="heading-2 mb-6 lg:mb-10"><?php the_title(); ?></h2>
					<div class="row">
						<?php if ($image) : ?>
						<div class="col w-full">
							<div class="img zoom-in overflow-hidden">
								<a class="img-ratio ratio:pt-[300_360]">
									<?php echo get_image_attrachment($image, 'image'); ?>
								</a>
							</div>
						</div>
						<?php endif; ?>
						<div class="col w-full">
							<div class="table-wrap">
								<table>
									<tbody>
										<?php foreach ($info_rows as $row) :
											if ($row['value'] === '') {
												continue;
											}
										?>
										<tr>
											<td><?php echo esc_html($row['label']); ?></td>
											<td><?php echo esc_html($row['value']); ?></td>
										</tr>
										<?php endforeach; ?>
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
				<?php if (have_rows('career_job_descriptions')) : ?>
				<?php while (have_rows('career_job_descriptions')) :
						the_row();
						$block_title   = get_sub_field('title');
						$block_content = get_sub_field('content');
						if (!$block_title && !$block_content) {
							continue;
						}
					?>
				<div class="block-wrap bg-grey-50 p-6 lg:p-10 mb-10 last:mb-0">
					<?php if ($block_title) : ?>
					<h3 class="heading-2 mb-5 text-primary-1"><?php echo esc_html($block_title); ?></h3>
					<?php endif; ?>
					<?php if ($block_content) : ?>
					<div class="fullcontent"><?php echo canhcam_kses_post($block_content); ?></div>
					<?php endif; ?>
				</div>
				<?php endwhile; ?>
				<?php endif; ?>
			</div>
			<div class="col-span-12 lg:col-span-4">
				<?php if ($app_shortcode || $app_file) : ?>
				<div class="btn-group bg-grey-50 p-6 w-full mb-10">
					<?php if ($app_shortcode) : ?>
					<a class="btn w-full btn-primary mb-3" href="#recruit-modal" data-fancybox>
						<span><?php echo esc_html__('Nộp CV ứng tuyển', 'canhcamtheme'); ?></span>
						<em class="fa-regular fa-plus"></em>
					</a>
					<?php endif; ?>
					<?php if ($app_file) : ?>
					<a class="btn w-full btn-primary white" href="<?php echo esc_url($app_file); ?>" download>
						<span><?php echo esc_html__('Tải hồ sơ ứng tuyển', 'canhcamtheme'); ?></span>
						<em class="fa-regular fa-file-download"></em>
					</a>
					<?php endif; ?>
				</div>
				<?php endif; ?>
				<?php if ($other_careers->have_posts()) : ?>
				<div class="other-recruit">
					<div class="tilte-wrap bg-primary-1 p-5">
						<h3 class="heading-2 text-white"><?php echo esc_html__('Các vị trí khác', 'canhcamtheme'); ?>
						</h3>
					</div>
					<div class="wrap bg-grey-50">
						<?php
							while ($other_careers->have_posts()) :
								$other_careers->the_post();
								$other_info     = get_field('career_information');
								$other_deadline = !empty($other_info['application_deadline'])
									? canhcam_format_career_deadline($other_info['application_deadline'])
									: '';
							?>
						<div class="recruit-item group border-b overflow-hidden p-6">
							<div class="txt col-hor">
								<h3 class="mb-3">
									<a class="body-1 group-hover:underline"
										href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
								</h3>
								<?php if ($other_deadline) : ?>
								<div class="timeline text-lg text-grey-500">
									<em class="fa-regular fa-calendar-star"></em>
									<span><?php echo esc_html__('Hạn nộp hồ sơ:', 'canhcamtheme'); ?></span>
									<strong
										class="inline-block text-primary-1"><?php echo esc_html($other_deadline); ?></strong>
								</div>
								<?php endif; ?>
							</div>
						</div>
						<?php endwhile; ?>
					</div>
				</div>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>
<?php
wp_reset_postdata();