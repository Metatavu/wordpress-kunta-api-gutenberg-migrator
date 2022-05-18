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
  const convertToBlocks = (html: string): any[] => {
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
          return null;
        }

        const serviceLocationId = ids[serviceLocationIdAttr];
        if (!serviceLocationId) { 
          return null;
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
          return null;
        }
        const serviceId = ids[serviceIdAttr];
        if (!serviceId) {
          return null;
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
   * Gets the JQUERY-element from a block
   * 
   * @param block block
   * @returns block
   */
  const getElement = (block: any) => {
    try {
      return $(block.attributes.content);
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Migrate block 
   * 
   * @param block block
   * @returns migrated block
   */
  const migrateBlock = (block: any): any => {
    const element = getElement(block);

    if (!element) {
      return block;
    }

    return migrateComponent(element, block);
  };

  /**
   * Migrate blocks
   * 
   * @param html html to migrate
   * @returns migrated blocks
   */
  const migrateBlocks = (html: string) => {
    const blocks = convertToBlocks(html);
    return blocks.filter(block => getElement(block)?.prop('tagName') != 'ASIDE').map(migrateBlock).filter(block => !!block);
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
   * Load post sidebar
   * @param postId post id
   */
  const loadPostSidebar = async (postId: number) => {
    return new Promise((resolve, reject) => {
      const { ajaxUrl, nonce } = settings;

      $.ajax({
        method: "POST",
        url: ajaxUrl,
        data: { 
          action : "kunta_api_guttenberg_migrator_load_post_sidebar",
          post_id : postId, 
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
    try {
      const itemData = await getItemData(item);

      const migratedMainContent = migrateBlocks(itemData);
  
      const sidebar = await loadPostSidebar(item.id);
  
      if (sidebar) {
        const migratedSidebar = migrateBlocks(sidebar as string);
        const mainContentWithSidebar = {
          "name": "core/columns",
          "attributes": {
            "isStackedOnMobile": true
          },
          "innerBlocks": [{
            "name": "core/column",
            "attributes": {
              "width": "66.66%"
            },
            "innerBlocks": migratedMainContent
          },
          {
            "name": "core/column",
            "attributes": {
              "width": "33.33%"
            },
            "innerBlocks": migratedSidebar
          }]
        };
        
        const migratedHtml = wp.blocks.serialize(mainContentWithSidebar);
  
        await updateItem(item, migratedHtml);
      } else {
        const migratedHtml = wp.blocks.serialize(migratedMainContent);
        await updateItem(item, migratedHtml);
      }
    } catch (error: any) {
      console.log(error);
    }
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
    await Promise.all(checkedItems.map(migrateItem));
    window.location.reload();
  });

  $('#kunta-api-guttenberg-migrator-scan-button').on("click", async () => {
    await scanItems();
    window.location.reload();
  });

  $('.kunta-api-migrate-all').on("change", async (event) => {
    const value = (event.target as HTMLInputElement).checked;
    $('.kunta-api-migrate').map((_index, element) => {
      (element as HTMLInputElement).checked = value;
    });

    $('.kunta-api-migrate-all').map((_index, element) => {
      (element as HTMLInputElement).checked = value;
    });
    
    updateSelected();
  });

})(jQuery);
