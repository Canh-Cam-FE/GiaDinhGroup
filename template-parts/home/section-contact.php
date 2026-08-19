<?php
$title = get_field('contact_title');
$desc = get_field('contact_desc');
$form_shortcode = get_field('contact_form_shortcode');
?>
<section id="contact" class="home-lien-he relative">
	<div class="container py-8">
		<div class="row">
			<div class="col w-full lg:w-5/12">
				<div class="content flex flex-col clamp:gap-[24-24] clamp:py-[40-40]">
					<?php if ($title) : ?>
					<h3 class="heading-3 text-white"><?php echo esc_html($title); ?></h3>
					<?php endif; ?>
					<?php if ($desc) : ?>
					<div class="desc body-2 text-white"><?php echo nl2br(esc_html($desc)); ?></div>
					<?php endif; ?>
				</div>
			</div>
			<div class="col w-full lg:w-7/12">
				<div class="box relative">
					<div class="wrap-form relative z-50">
						<?php if ($form_shortcode) : ?>
						<?php echo do_shortcode($form_shortcode); ?>
						<?php else : ?>
						<div class="wpcf7-form">
							<div class="form-group">
								<input type="text" name="hoten" placeholder="Họ tên *" required>
							</div>
							<div class="form-group">
								<input type="text" name="congty" placeholder="Tên công ty *" required>
							</div>
							<div class="form-group">
								<input type="email" name="email" placeholder="Email *" required>
							</div>
							<div class="form-group">
								<input type="tel" name="phone" placeholder="Số điện thoại *" required>
							</div>
							<div class="form-group col-span-2">
								<textarea name="noidung" placeholder="Nội dung"></textarea>
							</div>
							<div class="frm-btnwrap flex-start">
								<button class="btn btn-primary white"><span class="desc body-1">Gửi</span><em
										class="fa-regular fa-arrow-right"></em></button>
							</div>
						</div>
						<?php endif; ?>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>