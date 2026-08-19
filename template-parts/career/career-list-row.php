<?php
$index    = isset($args['index']) ? (int) $args['index'] : 1;
$info     = get_field('career_information');
$location = !empty($info['location']) ? $info['location'] : '';
$deadline = !empty($info['application_deadline']) ? canhcam_format_career_deadline($info['application_deadline']) : '';
$stt      = str_pad((string) $index, 2, '0', STR_PAD_LEFT);
?>
<tr>
	<td data-attr="STT "><?php echo esc_html($stt); ?></td>
	<td data-attr="Vị trí ">
		<a class="title" href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
	</td>
	<td data-attr="NƠI LÀM VIỆC"><?php echo esc_html($location); ?></td>
	<td data-attr="hạn nộp hồ sơ"><?php echo esc_html($deadline); ?></td>
	<td>
		<div class="flex-center btn-wrap">
			<a class="btn btn-tertiary" href="<?php the_permalink(); ?>">
				<em class="fa-light fa-eye"></em>
				<span><?php echo esc_html__('Xem chi tiết', 'canhcamtheme'); ?></span>
			</a>
		</div>
	</td>
</tr>
