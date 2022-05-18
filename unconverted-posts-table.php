<?php

if (!class_exists('WP_List_Table')) {
  require_once( ABSPATH . 'wp-admin/includes/class-wp-list-table.php');
}

 /**
  * Table class for unconverted posts
  */
class KuntaApiMigratorUnconvertedPostsTable extends WP_List_Table {

	/**
   * Constructor
   */
	public function __construct() {
		parent::__construct(
			[
				'singular' => __( 'Post', KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN ), 
				'plural'   => __( 'Posts', KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN ), 
				'ajax'     => false, 
			]
		);
	}

  /**
   * Renders convert column
   * 
   * @param array $item
   * @return string convert column contents
   */
	public function column_convert($item) {
		$item_json = json_encode([
      'id' => absint($item['ID']),
      'type' => $item['type']
    ]);

		return sprintf('<input type="checkbox" class="kunta-api-migrate" value="%s" />', htmlspecialchars($item_json));
	}

  /**
   * Renders title column
   * 
   * @param array $item
   * @return string title column contents
   */
	public function column_title( $item ) {
		return '<strong><a href="' . get_permalink($item['ID'] ) . '" target="_blank">' . $item['title'] . '</a></strong>';
	}

  /**
   * Renders type column
   * 
   * @param array $item
   * @return string type column content
   */
	public function column_type( $item ) {
		return $item['type'];
	}

  /**
   * Returns columns
   * 
   * @return array columns
   */
  public function get_columns() {
		return [
			'convert' => '<input class="kunta-api-migrate-all" type="checkbox" />',
			'title' => __( 'Title', KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN ),
			'type' => __( 'Post Type', KUNTA_API_GUTENBERG_MIGRATOR_I18N_DOMAIN )
		];
	}
  
  /**
   * Returns sortable columns
   * 
   * @return array sortable columns
   */  
	public function get_sortable_columns() {
		return [
      'title' => [ 'title', false ],
      'type' => [ 'type', false ]
    ];
	}

  /**
   * Returns all posts that are not converted to Gutenberg blocks
   * 
   * @return array posts
   */
	public function get_posts($page_number) {
    $posts_array = get_posts([
      'post_type' => 'page', // TODO: add support for other post types
      'post_status' => 'any',
      'posts_per_page' => $this->get_posts_per_page(),
      'paged' => $page_number,
      'orderby' => $_REQUEST['orderby'],
      'order' => $_REQUEST['order'],
      's' => $_REQUEST['s'],
			'meta_key' => 'kunta_api_guttenberg_migrator_status',
			'meta_value' => 'not_migrated'
    ]);

		$results = array();
		foreach ( $posts_array as $post ) {
			$results[] = array(
				'ID'    => $post->ID,
				'title' => $post->post_title,
				'type'  => $post->post_type
			);
		}

		return $results;
	}

  /**
   * Returns post count for current query
   * 
   * @return int Post count
   */
	public function count_items() {
		$posts_query = new WP_Query([
      'post_type' => 'page', // TODO: add support for other post types
      'post_status' => 'any',
      'posts_per_page' => -1,
      's' => $_REQUEST['s'],
			'meta_key' => 'kunta_api_guttenberg_migrator_status',
			'meta_value' => 'not_migrated'
    ]);

		return $posts_query->post_count;
	}

  /**
   * Prepare items for table
   */  
	public function prepare_items() {
		$this->_column_headers = [ $this->get_columns(), [], $this->get_sortable_columns() ];

    $total_items = $this->count_items();
    $current_page = $this->get_pagenum();

    $this->set_pagination_args(
			[
				'total_items' => $total_items,
				'per_page' => $this->get_posts_per_page()
			]
		);

    $this->items = $this->get_posts($current_page);
	}

  /**
   * Returns posts per page
   * 
   * @return int Number of posts per page
   */
  private function get_posts_per_page() {
    return 50;
  }

}