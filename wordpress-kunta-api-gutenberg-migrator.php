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

  wp_register_script('kunta-api-guttenberg-migrator-script', plugin_dir_url( __FILE__ ) . 'js/scripts.js', [ 'jquery', 'wp-blocks', 'wp-edit-post' ], false, true);
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
}

/**
 * Renders migration page.
 */
function render_kunta_api_gutenberg_migration_page() {
  echo '<div class="wrap">';
  render_kunta_api_gutenberg_migration_unconverted_table();
  echo '</div>';
}