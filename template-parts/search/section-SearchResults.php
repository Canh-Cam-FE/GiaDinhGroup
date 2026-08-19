<?php
/**
 * Search results section grouped by post type.
 *
 * @package Canhcam
 */

$search_query = get_search_query();
$grouped      = function_exists('canhcam_get_search_results_grouped') ? canhcam_get_search_results_grouped($search_query) : array();
$has_results  = !empty($grouped);
?>

<section class="section-SearchResults">
    <div class="section-py">
        <div class="container">
            <?php if ($search_query) : ?>
                <p class="search-query body-1 mb-base">
                    <?php
                    printf(
                        /* translators: %s: search keyword */
                        esc_html__('Kết quả tìm kiếm: "%s"', 'canhcamtheme'),
                        esc_html($search_query)
                    );
                    ?>
                </p>
            <?php endif; ?>

            <?php if ($has_results) : ?>
                <?php foreach ($grouped as $post_type => $post_ids) :
                    $card_template = function_exists('canhcam_get_search_card_template') ? canhcam_get_search_card_template($post_type) : '';

                    if (!$post_ids) {
                        continue;
                    }
                    ?>
                    <div class="search-results-group mb-base">
                        <h2 class="heading-2 text-primary-1 mb-base uppercase">
                            <?php echo esc_html(function_exists('canhcam_get_search_post_type_label') ? canhcam_get_search_post_type_label($post_type) : ucfirst($post_type)); ?>
                        </h2>
                        <div class="<?php echo esc_attr(function_exists('canhcam_get_search_grid_class') ? canhcam_get_search_grid_class($post_type) : 'grid grid-cols-3 gap-6'); ?>">
                            <?php foreach ($post_ids as $post_id) :
                                $post = get_post($post_id);
                                if (!$post) {
                                    continue;
                                }
                                setup_postdata($post);
                                ?>
                                <?php if ($card_template) : ?>
                                    <?php
                                    get_template_part(
                                        $card_template,
                                        null,
                                        array('post_id' => (int) $post_id)
                                    );
                                    ?>
                                <?php else : ?>
                                    <article id="post-<?php echo (int) $post_id; ?>" class="search-item card">
                                        <a href="<?php echo esc_url(get_permalink($post_id)); ?>" class="block">
                                            <?php if (has_post_thumbnail($post_id)) : ?>
                                                <div class="thumb">
                                                    <?php echo get_the_post_thumbnail($post_id, 'medium'); ?>
                                                </div>
                                            <?php endif; ?>
                                            <h3 class="title heading-3 mt-3"><?php echo esc_html(get_the_title($post_id)); ?></h3>
                                            <div class="excerpt body-2 mt-2"><?php echo wp_kses_post(get_the_excerpt($post_id)); ?></div>
                                        </a>
                                    </article>
                                <?php endif; ?>
                            <?php endforeach; wp_reset_postdata(); ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else : ?>
                <p class="body-1"><?php esc_html_e('Không tìm thấy kết quả nào.', 'canhcamtheme'); ?></p>
            <?php endif; ?>
        </div>
    </div>
</section>
