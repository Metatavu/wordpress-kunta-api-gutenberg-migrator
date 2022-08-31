var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { registerBlockType } = wp.blocks;
/**
 * Registers newsblock Gutenberg block
 */
const registerNewsBlock = () => {
    registerBlockType('acf/newsblock', {
        category: 'acf',
        title: "title",
        attributes: {
            data: {
                type: "object"
            }
        }
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
     * Migrates newslist shortcode
     *
     * @param block block
     * @param parsedShortcode parsed shortcode
     * @returns migrated block
     */
    const migrateNewsListShortcode = (parsedShortcode) => __awaiter(this, void 0, void 0, function* () {
        const tag = parsedShortcode.attrs.tag;
        const categoryId = yield findCategoryId(tag);
        if (!categoryId) {
            throw new Error(`Could not find new list categry ${tag}`);
        }
        const data = {
            tag: categoryId,
            _tag: settings.newsAcfField
        };
        return {
            "name": "acf/newsblock",
            "attributes": {
                data: data,
                align: "",
                mode: "auto"
            },
            "innerBlocks": []
        };
    });
    /**
     * Decodes html encoded text
     *
     * @param html html encoded text
     * @returns decoded text
     */
    const decodeHtmlEntities = (html) => {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    };
    /**
     * Parses shortcode attributes
     *
     * @param text attrbutes text
     * @returns parsed shortcode attributes
     */
    const parseShortcodeAttributes = (text) => {
        const result = {};
        if (!text) {
            return result;
        }
        let textLeft = text;
        let match = null;
        match = textLeft.match(/([a-z]{1,})=\"(.*?)\"/);
        while (match && match.length === 3) {
            const [matchText, name, value] = match;
            result[name] = decodeHtmlEntities(value);
            textLeft = textLeft.substring(matchText.length);
            match = textLeft.match(/([a-z]{1,})=\"(.*?)\"/);
        }
        return result;
    };
    /**
     * Parses shortcode from text representation
     *
     * @param text shortcode text representation
     * @returns parsed shortcode
     */
    const parseShortcodeText = (text) => {
        const result = text.match(/\[([a-z_]{1,})(.*)\]/);
        if (!result) {
            throw Error(`Could not parse shortcode ${text}`);
        }
        const name = result[1];
        const attrs = parseShortcodeAttributes(result[2]);
        return {
            name: name,
            attrs: attrs
        };
    };
    /**
     * Migrates a shortcode
     *
     * @param block
     * @returns
     */
    const migrateShortcode = (block) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const shortcodeText = (_a = block === null || block === void 0 ? void 0 : block.attributes) === null || _a === void 0 ? void 0 : _a.text;
        if (!shortcodeText) {
            return block;
        }
        const parsedShortcode = parseShortcodeText(shortcodeText);
        if (!parsedShortcode) {
            return block;
        }
        switch (parsedShortcode.name) {
            case "kunta_api_news_list":
                return yield migrateNewsListShortcode(parsedShortcode);
        }
        return block;
    });
    /**
     * Migrate block
     *
     * @param block block
     * @param pageId page id
     * @returns migrated block
     */
    const migrateBlock = (block, pageId) => __awaiter(this, void 0, void 0, function* () {
        if (block.name === "core/shortcode") {
            return yield migrateShortcode(block);
        }
        const element = getElement(block);
        if (!element) {
            return block;
        }
        return migrateComponent(element, block, pageId);
    });
    /**
     * Migrate blocks
     *
     * @param html html to migrate
     * @param pageId page id
     * @returns migrated blocks
     */
    const migrateBlocks = (html, pageId) => __awaiter(this, void 0, void 0, function* () {
        const blocks = convertToBlocks(html);
        const migratedBlocks = yield Promise.all(blocks.filter(block => { var _a; return ((_a = getElement(block)) === null || _a === void 0 ? void 0 : _a.prop('tagName')) != 'ASIDE'; }).map(block => migrateBlock(block, pageId)));
        return migratedBlocks.filter(block => !!block);
    });
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
     * Searches categories by name
     *
     * @param name category name
     * @returns found categories
     */
    const searchCategories = (name) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                method: "GET",
                beforeSend: (xhr) => {
                    xhr.setRequestHeader('X-WP-Nonce', settings.nonce);
                },
                url: `/wp-json/wp/v2/categories?search=${name}`
            })
                .done(resolve)
                .fail(reject);
        });
    };
    /**
     * Finds category id for categry name
     *
     * @param name category name
     * @returns found category id or null if not found
     */
    const findCategoryId = (name) => __awaiter(this, void 0, void 0, function* () {
        var _b;
        const categories = yield searchCategories(name);
        return (_b = categories.find(category => {
            return category.name === name;
        })) === null || _b === void 0 ? void 0 : _b.id;
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
            const migratedMainContent = yield migrateBlocks(itemData, item.id);
            const featuredImage = {
                "name": "core/post-featured-image",
                "attributes": {},
                "innerBlocks": []
            };
            const sidebar = yield loadPostSidebar(item.id);
            if (sidebar) {
                const migratedSidebar = yield migrateBlocks(sidebar, item.id);
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
                            "innerBlocks": [featuredImage, ...migratedMainContent]
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
                const migratedHtml = wp.blocks.serialize([featuredImage, ...migratedMainContent]);
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
        registerNewsBlock();
        $('#kunta-api-guttenberg-migrator-migrate-button').attr("disabled", "disabled");
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