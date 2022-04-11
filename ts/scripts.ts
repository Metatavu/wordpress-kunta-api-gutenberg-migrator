declare const wp: any;
declare const jQuery: any;

(($: any) => {
 
  /**
   * Converts html to Gutenberg blocks
   * 
   * @param html html
   * @returns Gutenberg blocks
   */
  const convertToBlocks = (html: string) => {
    var blocks = wp.blocks.rawHandler({ 
			HTML: html
		});

    return blocks;
  };

  /**
   * Migrate block 
   * 
   * @param block block
   * @returns migrated block
   */
  const migrateBlock = (block: any): any => {
    const element = $(block.attributes.content);
    const tag = element.prop("tagName");

    switch (tag) {
      case "ARTICLE":
        const type = element.attr("data-type");
        const component = element.attr("data-component");
        const serviceId = element.attr("data-service-id");

        console.log({
          tag,
          type,
          component,
          serviceId
        });
      break;
      case "ASIDE":
        console.log({
          tag,
          element
        });
      break;
    }

    return block;
  };

  /**
   * Migrate blocks
   * 
   * @param blocks blocks
   * @returns migrated blocks
   */
  const migrateBlocks = (blocks: any[]) => {
    return blocks.map(block => {
      if (block.name == "core/html") {
        return migrateBlock(block);
      }

      return block;
    });
  };

  /**
   * Migrates html from old format to new format
   * 
   * @param html html to be migrated
   * @returns migrated html
   */
  const migrateHtml = (html: string): string => {
    const rawBlocks = convertToBlocks(html);
    const migratedBlocks = migrateBlocks(rawBlocks);
    return wp.blocks.serialize(migratedBlocks);
  };

  wp.domReady(() => {
    $('<div />')
      .attr('id', 'kunta-api-guttenberg-migrator-editor')
      .attr('style', 'display: block')
      .prependTo(document.body);

    wp.editPost.initializeEditor('kunta-api-guttenberg-migrator-editor', null, null, { defaultEditorStyles: [ ] }, {});

    console.log(migrateHtml("<article data-type=\"article\" data-component=\"article\" data-service-id=\"1\"><h1>Hello</h1></article>"));
  });

})( jQuery );
