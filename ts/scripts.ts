declare const wp: any;
declare const settings: { 
  nonce: string;
  ajaxUrl: string;
};

/**
 * Post type
 */
type ItemType = "page" | "post";

/**
 * Interface for single item
 */
interface Item {
  id: number;
  type: ItemType;
}

/**
 * Interface for Wordpress post (or similar object, e.g. page)
 */
interface PostLike {
  content: {
    raw: string;
  };
}

/**
 * Main function
 */
(($: JQueryStatic) => {

  let checkedItems: Item[] = [];

  /**
   * Updates the checkedIds array with the ids of the checked checkboxes.
   */
  const updateSelected = () => {
    checkedItems = $('.kunta-api-migrate:checked').map((_index, element) => {
      return JSON.parse($(element).val() as string) as Item;
    }).get();

    if (checkedItems.length) {
      $('#kunta-api-guttenberg-migrator-migrate-button').removeAttr('disabled');
    } else {
      $('#kunta-api-guttenberg-migrator-migrate-button').attr('disabled', 'disabled');
    }
  };
 
  /**
   * Converts html to Gutenberg blocks
   * 
   * @param html html
   * @returns Gutenberg blocks
   */
  const convertToBlocks = (html: string) => {
    return wp.blocks.rawHandler({ 
			HTML: html
		});
  };

  const migrateServiceLocationComponent = (element: JQuery, componentName: string, serviceLocationId: string) => {
    element.attr("id", serviceLocationId);
    switch(componentName) {
      case "description":
        element.attr("component", "description");
      case "addresses":
        element.attr("component", "addresses");
      case "email":
        element.attr("component", "email");
      case "fax":
        throw Error("NOT SUPPORTED!!!");
      case "phone-charge-info":
          throw Error("NOT SUPPORTED!!!");
      case "name":
        element.attr("component", "name");
      case "phone":
        element.attr("component", "phone-numbers");
      case "servicehours":
        element.attr("component", "service-hours");
      case "webpages":
        element.attr("component", "webpage");
      default:
        throw Error("NOT SUPPORTED!!!");
    }
  }

  const migrateServiceComponent = (element: JQuery, componentName: string, serviceId: string) => {
    element.attr("id", serviceId);
    switch(componentName) {
      case "description":
        element.attr("component", "description");
      case "userInstruction":
        element.attr("component", "user-instruction");
      case "languages":
        throw Error("NOT SUPPORTED!!!");
      case "electronicServiceChannelIds":
        element.attr("component", "electronic-service-list");
      case "phoneServiceChannelIds":
        element.attr("component", "phone-service-list");
      case "printableFormServiceChannelIds":
        element.attr("component", "printable-service-list");
      case "serviceLocationServiceChannelIds":
        element.attr("component", "service-location-list");
      case "webPageServiceChannelIds":
        element.attr("component", "webpage-service-list");
      default:
        throw Error("NOT SUPPORTED!!!");
    }
  }

  const migrateComponent = (element: JQuery) => {

    const type = element.attr("data-type");
    const componentName = element.attr("data-component");
    const serviceId = element.attr("data-service-id");
    const serviceLocationId = element.attr("data-service-channel-id")

    element.attr("language", "fi");
    switch (type) {
      case "kunta-api-service-location-component":
        migrateServiceLocationComponent(element, componentName, serviceLocationId);
      case "kunta-api-service-component":
        migrateServiceComponent(element, componentName, serviceId);
      default:
        throw Error("NOT SUPPORTED!!!");
    }
  }

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

        migrateComponent(element);

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

  /**
   * Downloads page from Wordpress API
   * 
   * @param id page id
   * @returns page
   */
  const getPage = async (id: number): Promise<PostLike> => {
    return new Promise((resolve, reject) => {
      $.ajax({
        method: "GET",
        beforeSend: ( xhr ) => {
          xhr.setRequestHeader('X-WP-Nonce', settings.nonce);
        },
        url: `/wp-json/wp/v2/pages/${id}?context=edit`
      })
      .done(resolve)
      .fail(reject);
    });
  };

  /**
   * Downloads post from Wordpress API
   * 
   * @param id post id
   * @returns post
   */
  const getPost = async (id: number): Promise<PostLike> => {
    return new Promise((resolve, reject) => {
      $.ajax({
        method: "GET",
        beforeSend: ( xhr ) => {
          xhr.setRequestHeader('X-WP-Nonce', settings.nonce);
        },
        url: `/wp-json/wp/v2/posts/${id}?context=edit`
      })
      .done(resolve)
      .fail(reject);
    });
  };

  /**
   * Downloads item data
   * 
   * @param item item
   * @returns item data
   */
  const getItemData = async (item: Item) => {
    switch (item.type) {
      case "page":
        return (await getPage(item.id)).content.raw;
      case "post":
        return (await getPost(item.id)).content.raw;
      default:
        throw Error(`Unknown item type: ${item.type}`);
    }
  };

  /**
   * Updates migrated item back to Wordpress
   * 
   * @param item item
   * @param migratedHtml migrated html
   */
  const updateItem = async (item: Item, migratedHtml: string) => {
    return new Promise((resolve, reject) => {
      const { ajaxUrl, nonce } = settings;

      $.ajax({
        method: "POST",
        url: ajaxUrl,
        data: { 
          action : "kunta_api_guttenberg_migrator_migrate_item", 
          _wpnonce : nonce, 
          item: JSON.stringify(item),
          migratedHtml: migratedHtml 
        }
      })
      .done(resolve)
      .fail(reject);
    });
  };

  /**
   * Scans the database for items that need to be migrated.
   */
  const scanItems = async () => {
    return new Promise((resolve, reject) => {
      const { ajaxUrl, nonce } = settings;

      $.ajax({
        method: "POST",
        url: ajaxUrl,
        data: { 
          action : "kunta_api_guttenberg_migrator_scan_items", 
          _wpnonce : nonce
        }
      })
      .done(resolve)
      .fail(reject);
    });
  };

  /**
   * Migrates single item
   * 
   * @param item item to be migrated
   */
  const migrateItem = async (item: Item) => {
    const itemData = await getItemData(item);
    console.log({
      itemData
    });

    const migratedHtml = migrateHtml(itemData);
    console.log({
      migratedHtml
    });

    await updateItem(item, migratedHtml);
  };

  wp.domReady(() => {
    $('<div />')
      .attr('id', 'kunta-api-guttenberg-migrator-editor')
      .attr('style', 'display: block')
      .prependTo(document.body);

    wp.editPost.initializeEditor('kunta-api-guttenberg-migrator-editor', null, null, { defaultEditorStyles: [ ] }, {});
    updateSelected();
  });

  $('.kunta-api-migrate').on("change", () => {
    updateSelected();
  });

  $('#kunta-api-guttenberg-migrator-migrate-button').on("click", async () => {
    console.log({  checkedItems });
    const posts = await Promise.all(checkedItems.map(migrateItem));
    window.location.reload();
  });

  $('#kunta-api-guttenberg-migrator-scan-button').on("click", async () => {
    await scanItems();
    window.location.reload();
  });

})(jQuery);
