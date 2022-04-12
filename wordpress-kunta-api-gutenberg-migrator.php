<?php
/**
 * @wordpress-plugin
 * Plugin Name: Kuten API Gutenerg Migrator
 * Plugin URI: https://github.com/Metatavu/wordpress-kunta-api-gutenberg-migrator
 * Description: Convert CKEditor content to Gutenberg blocks and migrate Kunta API emdeds to SPTV blocks.
 * Version: 1.0.0
 * Author: Metatavu Oy
 * Author URI: https://metatavu.fi
 * Text Domain: kunta_api_guttenberg_migrator
 */

defined ( 'ABSPATH' ) || die ( 'No script kiddies please!' );
  
if (!defined('KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN')) {
  define('KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN', 'kunta_api_guttenberg_migrator');
}

include_once 'unconverted-posts-table.php';

add_action('plugins_loaded', function () {

  add_action('admin_menu', function () {
    $plugin_page = add_management_page(__('Kunta API Gutenberg Migration',  KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN), __( 'Kunta API Migration', KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN ), 'manage_options', 'kunta_api_gutenberg_migration', 'render_kunta_api_gutenberg_migration_page' );
  });

  add_action('wp_ajax_kunta_api_guttenberg_migrator_scan_items', function () {
    $posts_array = get_posts([
      'post_type' => 'page', // TODO: add support for other post types
      'post_status' => 'any',
      'posts_per_page' => -1,
    ]);

		foreach ($posts_array as $post ) {
      $status = get_post_meta($post->ID, 'kunta_api_guttenberg_migrator_status', true);

			if (empty($status) && !has_blocks($post)) {        
        update_post_meta($post->ID, 'kunta_api_guttenberg_migrator_status', 'not_migrated');
      }
		}
  });

	add_action('wp_ajax_kunta_api_guttenberg_migrator_migrate_item', function () {
    $item = json_decode(stripslashes($_POST['item']), true);
    $migrated_html = $_POST['migratedHtml'];

    $post_data = [
      'ID'  => $item['id'],
      'post_content' => $migrated_html,
    ];

    if (!wp_update_post($post_data)) {
      $json['error'] = true;
      die(json_encode($json));
    }

    update_post_meta($item['id'], 'kunta_api_guttenberg_migrator_status', 'migrated');

    die(json_encode(["success" => $item['id']]));
  });

  wp_register_script('kunta-api-guttenberg-migrator-script', plugin_dir_url( __FILE__ ) . 'js/scripts.js', [ 'jquery', 'wp-blocks', 'wp-edit-post', 'wp-api' ], false, true);
  wp_localize_script('kunta-api-guttenberg-migrator-script', 'settings', [
    'nonce' => wp_create_nonce( 'wp_rest' ),
		'ajaxUrl' => admin_url( 'admin-ajax.php' )
  ]);
	wp_enqueue_script('kunta-api-guttenberg-migrator-script');
});

/**
 * Display table with indexed posts.
 */
function render_kunta_api_gutenberg_migration_unconverted_table() {
  $table = new KuntaApiMigratorUnconvertedPostsTable();

  echo '<div class="meta-box-sortables ui-sortable">';
  $table->views();
  echo '<form method="post">';
  $table->prepare_items();
  $table->search_box( __( 'Search', KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN ), 'kunta-api-guttenberg-migrator-search' );
  $table->display();
  echo '</form></div>';
  echo '<div>';
  echo sprintf('<button disabled="disabled" id="kunta-api-guttenberg-migrator-migrate-button" class="button button-primary button-hero">%s</button>', __( 'Migrate selected', KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN ));
  echo '</div>';
  echo '<div style="margin-top: 50px">';
  echo sprintf('<button id="kunta-api-guttenberg-migrator-scan-button" class="button button-primary button-hero">%s</button>', __( 'Scan items', KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN ));
  echo '</div>';
}

/**
 * Renders migration page.
 */
function render_kunta_api_gutenberg_migration_page() {
  echo '<div class="wrap">';
  render_kunta_api_gutenberg_migration_unconverted_table();
  echo '</div>';
}