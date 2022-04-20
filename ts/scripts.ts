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
  let ids: any = {};

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

  /**
   * Resolves a service location component
   * 
   * @param componentName component name
   * @returns resolved name
   */
  const resolveServiceLocationComponent = (componentName: string) => {

    switch(componentName) {
      case "accessibility":
        return "accessibility";
      case "description":
        return "description";
      case "addresses":
        return "addresses";
      case "email":
        return "email";
      case "name":
        return "name";
      case "phone":
        return "phone-numbers";
      case "servicehours":
        return "service-hours";
      case "webpages":
        return "webpage";
      default:
        throw Error(`Could not resolve service location component ${componentName}`);
    }
  }

  /**
   * Resolves a service component
   * 
   * @param componentName component name
   * @returns resolved name
   */
  const resolveServiceComponent = (componentName: string) => {
    switch(componentName) {
      case "description":
        return "description";
      case "userInstruction":
        return "user-instruction";
      case "languages":
        return "languages";
      case "electronicServiceChannelIds":
        return "electronic-service-list";
      case "phoneServiceChannelIds":
        return "phone-service-list";
      case "printableFormServiceChannelIds":
        return "printable-form-list";
      case "serviceLocationServiceChannelIds":
        return "service-location-list";
      case "webPageServiceChannelIds":
        return "webpage-service-list";
      default:
        throw Error(`Could not resolve service component ${componentName}`);
    }
  }

  /**
   * Migrates a component
   * 
   * @param element element to be migrated
   * @returns migrated component
   */
  const migrateComponent = (element: JQuery, block: any) => { 
    const type = element.attr("data-type");
    const componentName = element.attr("data-component");

    switch (type) {
      case "kunta-api-service-location-component":
        const serviceLocationIdAttr = element.attr("data-service-channel-id");
        if (!serviceLocationIdAttr) {
          throw Error("Empty attribute!");
        }

        const serviceLocationId = ids[serviceLocationIdAttr];
        if (!serviceLocationId) { 
          throw Error("Id not found!");
        }

        if (componentName === "fax" || componentName === "phone-charge-info") {
          return null;
        }

        const newLocationComponentName = resolveServiceLocationComponent(componentName);
        return {
          "name": "sptv/service-location-service-channel-block",
          "attributes": {
              "id": serviceLocationId,
              "component": newLocationComponentName,
              "language": "fi"
          },
          "innerBlocks": [] as any[],
          "innerHTML": null as string | null
        }

      case "kunta-api-service-component":
        const serviceIdAttr = element.attr("data-service-id");
        if (!serviceIdAttr) {
          throw Error("Empty attribute!");
        }
        const serviceId = ids[serviceIdAttr];
        if (!serviceId) {
          throw Error("Id not found!");
        }
        const newComponentName = resolveServiceComponent(componentName);
        return {
          "name": "sptv/service-block",
          "attributes": {
              "id": serviceId,
              "component": newComponentName,
              "language": "fi"
          },
          "innerBlocks": [] as any[],
          "innerHTML": null as string | null
        }

      default:
        return block;
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
        return migrateComponent(element, block);
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
    return blocks.map(migrateBlock).filter(block => !!block);
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
   * Loads the id map
   */
  const loadIdMap = async () => {
    return new Promise((resolve, reject) => {
      const { ajaxUrl, nonce } = settings;

      $.ajax({
        method: "POST",
        url: ajaxUrl,
        data: { 
          action : "kunta_api_guttenberg_migrator_load_id_map", 
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

  wp.domReady(async () => {
    $('<div />')
      .attr('id', 'kunta-api-guttenberg-migrator-editor')
      .attr('style', 'display: block')
      .prependTo(document.body);

    ids = await loadIdMap();
    ids = JSON.parse(ids);
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
