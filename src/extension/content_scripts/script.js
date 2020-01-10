var agent = "undefined" !== typeof chrome ? chrome : browser;

/**
 * Collects the eBay purchase history data from the current page and prints-out a report in the given format.
 * 
 * @class
 * @author Eugen Mihailescu
 * @since 1.0
 * 
 * @params {Object=} params - Optional. Report parameters such as sorting field, sorting order,etc.
 */
function QuickReport(params) {
    params = params || {};

    var sortby = params.sortBy || '';
    var customFilter = params.customFilter || '';
    var reverseorder = params.reverseorder || false;

    /**
     * Calculates the date difference between the specified date and "now"
     * 
     * @since 1.0.21
     * @param {Object}
     *            date - The Date object to compare
     * @param {int=}
     *            [sign] - When 1 then the Date is expected to be older than today, otherwise newer. Default 1.
     * @return {int} - Returns the number of days between the Date and today
     */
    function dateDiff(date, sign) {
        if ("undefined" === typeof sign) {
            sign = 1;
        } else if (1 != sign) {
            sign = -1;
        }

        var today = new Date();
        return Math.round(sign * (today - date) / 86400000.0, 1);
    }

    /**
     * Parses the given string as date
     * 
     * @since 1.0.21
     * @param {String}
     *            string - The string to parse
     * @return {Object} - Returns the Date object on success, NaN otherwise
     */
    function dateParse(string) {
        var result = Date.parse(string);
        var today = new Date();
        if (isNaN(result) || Math.abs((today - result) / 86400000.0) > 365) {
            string += " " + today.getFullYear();
            result = Date.parse(string);
        }
        return result;
    }

    /**
     * Get the inner text of a HTML element
     * 
     * @since 1.0
     * @param {Object}
     *            element - The DOM element
     * @param {String}
     *            value - The default value if element is NULL
     * @return {String}
     */
    function getInnerText(element, value) {
        return null !== element ? element.innerText : value;
    }

    /**
     * Get the attribute value of a HTML element
     * 
     * @since 1.0
     * @param {Object}
     *            element - The DOM element
     * @param {string}
     *            name - The attribute name
     * @param {String}
     *            value - The default value if element is NULL
     * @return {String}
     */
    function getAttribute(element, name, value) {
        return null !== element ? element.getAttribute(name) : value;
    }

    /**
     * Get the dataset value of a HTML element
     * 
     * @since 1.0.21
     * @param {Object}
     *            element - The DOM element
     * @param {string}
     *            name - The dataset key name
     * @param {String}
     *            value - The default value if element is NULL
     * @return {String}
     */
    function getDataset(element, name, value) {
        if (!element || "undefined" === typeof element.dataset || "undefined" === typeof element.dataset[name]) {
            if ("undefined" === typeof value) {
                value = null;
            }
            return value;
        }

        return element.dataset[name];
    }

    /**
     * Gather the eBay order information
     * 
     * @since 1.0
     * @return {Array} - Returns an array of purchase history items
     */
    function prepare() {
        // search for Orders list
        var orders = document.querySelectorAll('#orders .result-set-r .order-r');

        if (!orders.length) {
            return false;
        }

        var order, item;
        var data = [];

        // parse the document
        for (order in orders) {
            if (orders.hasOwnProperty(order)) {
                var orderId = orders[order].querySelector('input.item-select[type=checkbox]');
                if (null !== orderId) {
                    orderId = orderId.dataset.orderid;
                }

                var sellerName = getInnerText(orders[order].querySelector('.order-item-count .seller-id'), '');
                var sellerUrl = getAttribute(orders[order].querySelector('.order-item-count .seller-id'), 'href', '');
                var purchaseDate = getInnerText(orders[order].querySelector('.order-row .purchase-header .row-value'), '');
                var orderItems = orders[order].querySelectorAll('.item-level-wrap');

                var elapsedDays = dateDiff(dateParse(purchaseDate));

                var itemIndex = 1;

                for (item in orderItems) {
                    if (orderItems.hasOwnProperty(item)) {
                        var purchasePrice = getInnerText(orderItems[item].querySelector('.cost-label'), 0);
                        var itemSpec = getInnerText(orderItems[item].querySelector('.item-spec-r .item-title'), '');
                        var deliveryDate = getInnerText(orderItems[item].querySelector('.item-spec-r .delivery-date strong'),
                                '');

                        var trackingEl = orderItems[item].querySelector('.item-spec-r .tracking-label a');
                        var trackingNo = getInnerText(trackingEl, '').replace(getAttribute(trackingEl, 'title', ''), '')
                                .replace(/[^\S]*/g, '');
                        var trackingNoUrl = getDataset(trackingEl, 'url', '');

                        var etaDays = dateDiff(dateParse(deliveryDate.replace(/.*-\s*/g, '')), -1);

                        var shipStatus = getAttribute(orderItems[item]
                                .querySelector('.purchase-info-col .order-status .ph-ship'), 'title', '');
                        var feedbackNotLeft = orderItems[item]
                                .querySelector('.purchase-info-col .order-status .ph-fbl.feedbackNotLeft');
                        var quantity = getInnerText(orderItems[item].querySelector('.qa'), "1");

                        var thumbnail = getAttribute(orderItems[item].querySelector('.picCol .lazy-img'), 'src', '');

                        data.push({
                            orderId : orderId,
                            seller : {
                                name : sellerName,
                                url : sellerUrl
                            },
                            itemIndex : itemIndex,
                            purchaseDate : purchaseDate,
                            elapsedDays : elapsedDays,
                            price : purchasePrice,
                            quantity : quantity.replace(/[\D]+/g, ''),
                            specs : itemSpec,
                            deliveryDate : deliveryDate,
                            etaDays : etaDays,
                            shipStatus : shipStatus.replace(/.*?([\d\/]+)/g, '$1'),
                            feedbackNotLeft : null !== feedbackNotLeft,
                            thumbnail : thumbnail,
                            trackingNo : {
                                name : trackingNo,
                                url : trackingNoUrl
                            }
                        });

                        itemIndex += 1;
                    }
                }
            }
        }

        return data;
    }

    /**
     * Sort the give data array
     * 
     * @since 1.0
     * @param {Array}
     *            data - The array to sort
     * @return {Array} Returns the sorted array
     */
    function sort(data) {
        // sort the result
        if (sortby.length) {
            // sort by non-date field
            var sortByText = function(a, b) {
                return reverseorder ? a[sortby] < b[sortby] : a[sortby] > b[sortby];
            };

            // sort by date field
            var sortByDate = function(a, b) {
                var date1 = dateParse(a[sortby].replace(/.*-\s*/g, ''));
                var date2 = dateParse(b[sortby].replace(/.*-\s*/g, ''));

                return reverseorder ? date2 - date1 : date1 - date2;
            };

            // sort by number
            var sortByNumeric = function(a, b) {
                var num1 = parseFloat(String(a[sortby]).replace(/[^\d.\-]+/g, ''));
                var num2 = parseFloat(String(b[sortby]).replace(/[^\d.\-]+/g, ''));
                num1 = isNaN(num1) ? 0 : num1;
                num2 = isNaN(num2) ? 0 : num2;

                return reverseorder ? num2 - num1 : num1 - num2;
            };

            var sortBySeller = function(a, b) {
                return reverseorder ? a[sortby]["name"] < b[sortby]["name"] : a[sortby]["name"] > b[sortby]["name"];
            };

            if ('price' == sortby || 'elapsedDays' == sortby || 'etaDays' == sortby) {
                data.sort(sortByNumeric);
            } else if ('seller' == sortby) {
                data.sort(sortBySeller);
            } else if ('purchaseDate' != sortby && 'deliveryDate' != sortby && 'shipStatus' != sortby) {
                data.sort(sortByText);
            } else {
                data.sort(sortByDate);
            }
        }

        return data;
    }

    /**
     * Apply the custom filter to the data array
     * 
     * @since 1.0
     * @param {Array}
     *            data - The array to sort
     * @return {Array} Returns the sorted array
     */
    function applyCustomFilter(data) {
        var result = [];
        if (null !== customFilter && customFilter.length) {
            var i;
            for (i = 0; i < data.length; i += 1) {
                switch (customFilter) {
                case "notShipped":
                    if (isNaN(dateParse(data[i].shipStatus)))
                        result.push(data[i]);
                    break;
                }
            }
        } else {
            result = data;
        }

        return result;
    }

    /**
     * Query the eBay purchase history filters from the current page
     * 
     * @since 1.0
     * @return {Array} Returns an array of the filters
     */
    function getEbayFilters() {
        var filters = document.querySelectorAll('#orders .filter');

        if (!filters.length) {
            return false;
        }

        var result = [], f;

        Array.prototype.forEach.call(filters, function(filter, index) {
            f = {
                label : getInnerText(filter.querySelector('.filter-label')),
                content : getInnerText(filter.querySelector('.filter-content'))
            };
            result.push(f);
        });

        var itemPage = document.querySelector('#orders .num-items-page');
        if (null !== itemPage) {
            f = {
                label : getInnerText(itemPage.querySelector('span')),
                content : getInnerText(itemPage.querySelector('li>span[title=selected]'))
            };
            result.push(f);
        }

        return result;
    }

    /**
     * Get the data sorted by the given column order
     * 
     * @since 1.0
     * @return {Array} Returns an array of order items
     */
    this.get_data = function() {
        var data = prepare();
        if (false !== data) {
            data = applyCustomFilter(data);
            data = sort(data);
        }

        return {
            orders : data,
            filters : getEbayFilters()
        };
    };
}

/**
 * Content script helper class for the eBay purchase history page
 * 
 * @class
 * @author Eugen Mihailescu
 * @since 1.0
 */
function EbayPurchaseHistory() {
    /**
     * Get the report data and push it to the background script
     * 
     * @since 1.0
     * @param {Object=}
     *            params - Optional. An object of parameters to pass to the report.
     */
    function onButtonClick(params) {
        params = params || {
            sortby : "",
            customFilter : "",
            reverseorder : false
        };

        var ebay_report = new QuickReport(params);

        // get the report data
        var data = ebay_report.get_data();

        // push the data to the web extension
        agent.runtime.sendMessage({
            reportData : {
                orders : data.orders,
                filters : data.filters,
                sortby : params.sortBy,
                customFilter : params.customFilter,
                reverseorder : params.reverseorder,
                tabId : params.hasOwnProperty('tabId') ? params.tabId : null
            }
        });
    }

    /**
     * Sends the order item URL to the background script
     * 
     * @since 1.0
     * @param {Object}
     *            params - An Object describing what order item to query. Default to false.
     */
    function onShowItem(params) {
        params = params || false;

        if (!params)
            return;

        var orders = document.querySelectorAll('#orders .result-set-r .order-r');
        if (null !== orders) {
            Array.prototype.forEach.call(orders, function(order, index) {
                var found = order.querySelector('input[type="checkbox"][data-orderid="' + params.showItem.orderId + '"');
                if (null !== found) {
                    var orderItems = order.querySelectorAll('.item-level-wrap');
                    var i;
                    if (null !== orderItems) {
                        Array.prototype.forEach.call(orderItems, function(value, index) {
                            if (index === params.showItem.index - 1) {
                                var link = value.querySelector('.item-spec-r .item-title');
                                if (null !== link) {
                                    agent.runtime.sendMessage({
                                        showEbayItem : true,
                                        url : link.getAttribute("href")
                                    });
                                }
                                return;
                            }
                        });
                    }
                }
            });
        }
    }

    /**
     * Creates the `Quick report` link at DOM level
     * 
     * @since 1.0
     * @param {Object}
     *            parent - The parent element where the link is appended
     * @param {String}
     *            classname - The link CSS class name
     * @returns {Object} - Returns the newly created element
     */
    function createButton(parent, classname) {
        var button = parent.querySelector("." + classname);

        if (null === button) {
            button = document.createElement('a');
            button.innerHTML = "Quick Report";
            button.setAttribute("class", classname);
            button.setAttribute("href", "#");
            button.setAttribute("style", "float:right;padding:3px;background-color:#FFD700;color:#000");
            button.addEventListener("click", function(event) {
                onButtonClick();
            });
            parent.appendChild(button);
        }

        return button;
    }

    // inject the Report button into the eBay purchase history page
    var parent = document.querySelector('#orders .container-header');
    if (parent) {

        var button_class = "ebay-purchase-report";

        createButton(parent, button_class);

        // respawn the button whenever is necessary
        var observer = new MutationObserver(function(mutations) {
            createButton(parent, button_class);
        });

        // start monitoring the any DOM changes of parent's childList only
        observer.observe(parent, {
            childList : true
        });
    }

    /**
     * Listen for messages from the background script
     */
    agent.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.hasOwnProperty('sortBy') || request.hasOwnProperty('customFilter')) {
            onButtonClick(request);
        }

        if (request.hasOwnProperty('showItem')) {
            onShowItem(request);
        }
    });
}

/**
 * Content script helper class for the eBay item detail page
 * 
 * @class
 * @author Eugen Mihailescu
 * @since 1.0.17
 */
function EbayItemPage() {
    /**
     * Get the current add-on's UI options
     * 
     * @since 1.0
     * @param {String}
     *            options - The session stored options
     * @returns {Object} Returns an object containing the UI options
     */
    function get_ui_options(options) {
        var result = {};

        try {
            result = JSON.parse(options);
        } catch (e) {
            result = {
                feedbackScore : 1000,
                csvSeparator : "tab"
            };
        }

        return result;
    }

    var responseCallback = function(response) {
        // inject the Report button into the eBay purchase history page
        var scoreDiv = document.querySelector('#CenterPanel #CenterPanelInternal #RightSummaryPanel .si-content div');

        if (null !== scoreDiv) {

            var scoreElement = scoreDiv.querySelector('span.mbg-l a');
            if (null !== scoreElement) {
                var scoreValue = parseInt(scoreElement.innerText);
                var ui_options = get_ui_options(response.ui_options);

                if (scoreValue < ui_options.feedbackScore) {
                    var defaultBgColor = scoreDiv.style.backgroundColor;
                    setInterval(function() {
                        if (scoreDiv.style.backgroundColor == defaultBgColor) {
                            scoreDiv.style.backgroundColor = "#FF0000";
                            scoreDiv.style.transition = "background-color 0.3s ease";
                        } else {
                            scoreDiv.style.backgroundColor = defaultBgColor;
                        }
                    }, 1000);
                }
            }
        }
    };

    var promise = agent.runtime.sendMessage({
        getUIOptions : true,
    }, responseCallback);

    // on non-Chrome browsers use the promise
    if ("undefined" === typeof chrome) {
        promise.then(responseCallback);
    }
}

EbayPurchaseHistory();

EbayItemPage();
