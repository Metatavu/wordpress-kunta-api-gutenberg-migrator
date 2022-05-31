var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Main function
 */
(($) => {
    let checkedItems = [];
    let ids = {};
    /**
     * Updates the checkedIds array with the ids of the checked checkboxes.
     */
    const updateSelected = () => {
        checkedItems = $('.kunta-api-migrate:checked').map((_index, element) => {
            return JSON.parse($(element).val());
        }).get();
        if (checkedItems.length) {
            $('#kunta-api-guttenberg-migrator-migrate-button').removeAttr('disabled');
        }
        else {
            $('#kunta-api-guttenberg-migrator-migrate-button').attr('disabled', 'disabled');
        }
    };
    /**
     * Converts html to Gutenberg blocks
     *
     * @param html html
     * @returns Gutenberg blocks
     */
    const convertToBlocks = (html) => {
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
    const resolveServiceLocationComponent = (componentName) => {
        switch (componentName) {
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
    };
    /**
     * Resolves a service component
     *
     * @param componentName component name
     * @returns resolved name
     */
    const resolveServiceComponent = (componentName) => {
        switch (componentName) {
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
    };
    /**
     * Migrates a component
     *
     * @param element element to be migrated
     * @returns migrated component
     */
    const migrateComponent = (element, block, pageId) => {
        const type = element.attr("data-type");
        const componentName = element.attr("data-component");
        switch (type) {
            case "kunta-api-service-location-component":
                const serviceLocationIdAttr = element.attr("data-service-channel-id");
                if (!serviceLocationIdAttr || serviceLocationIdAttr == "undefined") {
                    return null;
                }
                const serviceLocationId = ids[serviceLocationIdAttr];
                if (!serviceLocationId) {
                    console.log(element.html());
                    throw Error(`No PTV id service channel location found for Kunta id ${serviceLocationIdAttr}, for page ${pageId}`);
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
                    "innerBlocks": [],
                    "innerHTML": null
                };
            case "kunta-api-service-component":
                const serviceIdAttr = element.attr("data-service-id");
                if (!serviceIdAttr || serviceIdAttr == "undefined") {
                    return null;
                }
                const serviceId = ids[serviceIdAttr];
                if (!serviceId) {
                    throw Error(`No PTV id service found for Kunta id ${serviceIdAttr}, for page ${pageId}`);
                }
                const newComponentName = resolveServiceComponent(componentName);
                return {
                    "name": "sptv/service-block",
                    "attributes": {
                        "id": serviceId,
                        "component": newComponentName,
                        "language": "fi"
                    },
                    "innerBlocks": [],
                    "innerHTML": null
                };
            default:
                return block;
        }
    };
    /**
     * Gets the JQUERY-element from a block
     *
     * @param block block
     * @returns block
     */
    const getElement = (block) => {
        try {
            return $(block.attributes.content);
        }
        catch (e) {
            return undefined;
        }
    };
    /**
     * Migrate block
     *
     * @param block block
     * @returns migrated block
     */
    const migrateBlock = (block, pageId) => {
        const element = getElement(block);
        if (!element) {
            return block;
        }
        return migrateComponent(element, block, pageId);
    };
    /**
     * Migrate blocks
     *
     * @param html html to migrate
     * @returns migrated blocks
     */
    const migrateBlocks = (html, pageId) => {
        const blocks = convertToBlocks(html);
        return blocks.filter(block => { var _a; return ((_a = getElement(block)) === null || _a === void 0 ? void 0 : _a.prop('tagName')) != 'ASIDE'; }).map(block => migrateBlock(block, pageId)).filter(block => !!block);
    };
    /**
     * Downloads page from Wordpress API
     *
     * @param id page id
     * @returns page
     */
    const getPage = (id) => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            $.ajax({
                method: "GET",
                beforeSend: (xhr) => {
                    xhr.setRequestHeader('X-WP-Nonce', settings.nonce);
                },
                url: `/wp-json/wp/v2/pages/${id}?context=edit`
            })
                .done(resolve)
                .fail(reject);
        });
    });
    /**
     * Downloads post from Wordpress API
     *
     * @param id post id
     * @returns post
     */
    const getPost = (id) => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            $.ajax({
                method: "GET",
                beforeSend: (xhr) => {
                    xhr.setRequestHeader('X-WP-Nonce', settings.nonce);
                },
                url: `/wp-json/wp/v2/posts/${id}?context=edit`
            })
                .done(resolve)
                .fail(reject);
        });
    });
    /**
     * Downloads item data
     *
     * @param item item
     * @returns item data
     */
    const getItemData = (item) => __awaiter(this, void 0, void 0, function* () {
        switch (item.type) {
            case "page":
                return (yield getPage(item.id)).content.raw;
            case "post":
                return (yield getPost(item.id)).content.raw;
            default:
                throw Error(`Unknown item type: ${item.type}`);
        }
    });
    /**
     * Updates migrated item back to Wordpress
     *
     * @param item item
     * @param migratedHtml migrated html
     */
    const updateItem = (item, migratedHtml) => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const { ajaxUrl, nonce } = settings;
            $.ajax({
                method: "POST",
                url: ajaxUrl,
                data: {
                    action: "kunta_api_guttenberg_migrator_migrate_item",
                    _wpnonce: nonce,
                    item: JSON.stringify(item),
                    migratedHtml: migratedHtml
                }
            })
                .done(resolve)
                .fail(reject);
        });
    });
    /**
     * Scans the database for items that need to be migrated.
     */
    const scanItems = () => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const { ajaxUrl, nonce } = settings;
            $.ajax({
                method: "POST",
                url: ajaxUrl,
                data: {
                    action: "kunta_api_guttenberg_migrator_scan_items",
                    _wpnonce: nonce
                }
            })
                .done(resolve)
                .fail(reject);
        });
    });
    /**
     * Loads the id map
     */
    const loadIdMap = () => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const { ajaxUrl, nonce } = settings;
            $.ajax({
                method: "POST",
                url: ajaxUrl,
                data: {
                    action: "kunta_api_guttenberg_migrator_load_id_map",
                    _wpnonce: nonce
                }
            })
                .done(resolve)
                .fail(reject);
        });
    });
    /**
     * Load post sidebar
     * @param postId post id
     */
    const loadPostSidebar = (postId) => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const { ajaxUrl, nonce } = settings;
            $.ajax({
                method: "POST",
                url: ajaxUrl,
                data: {
                    action: "kunta_api_guttenberg_migrator_load_post_sidebar",
                    post_id: postId,
                    _wpnonce: nonce
                }
            })
                .done(resolve)
                .fail(reject);
        });
    });
    /**
     * Migrates single item
     *
     * @param item item to be migrated
     */
    const migrateItem = (item) => __awaiter(this, void 0, void 0, function* () {
        try {
            const itemData = yield getItemData(item);
            const migratedMainContent = migrateBlocks(itemData, item.id);
            const sidebar = yield loadPostSidebar(item.id);
            if (sidebar) {
                const migratedSidebar = migrateBlocks(sidebar, item.id);
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
                yield updateItem(item, migratedHtml);
            }
            else {
                const migratedHtml = wp.blocks.serialize(migratedMainContent);
                yield updateItem(item, migratedHtml);
            }
        }
        catch (error) {
            console.log(error);
        }
    });
    wp.domReady(() => __awaiter(this, void 0, void 0, function* () {
        $('<div />')
            .attr('id', 'kunta-api-guttenberg-migrator-editor')
            .attr('style', 'display: block')
            .prependTo(document.body);
        ids = yield loadIdMap();
        ids = JSON.parse(ids);
        wp.editPost.initializeEditor('kunta-api-guttenberg-migrator-editor', null, null, { defaultEditorStyles: [] }, {});
        updateSelected();
    }));
    $('.kunta-api-migrate').on("change", () => {
        updateSelected();
    });
    $('#kunta-api-guttenberg-migrator-migrate-button').on("click", () => __awaiter(this, void 0, void 0, function* () {
        console.log({ checkedItems });
        yield Promise.all(checkedItems.map(migrateItem));
        window.location.reload();
    }));
    $('#kunta-api-guttenberg-migrator-scan-button').on("click", () => __awaiter(this, void 0, void 0, function* () {
        yield scanItems();
        window.location.reload();
    }));
    $('.kunta-api-migrate-all').on("change", (event) => __awaiter(this, void 0, void 0, function* () {
        const value = event.target.checked;
        $('.kunta-api-migrate').map((_index, element) => {
            element.checked = value;
        });
        $('.kunta-api-migrate-all').map((_index, element) => {
            element.checked = value;
        });
        updateSelected();
    }));
})(jQuery);
//# sourceMappingURL=scripts.js.map