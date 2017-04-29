// Make sure it works for both, Mozilla and Chrome|Opera
var agent = "undefined" !== typeof chrome ? chrome : browser;

/**
 * An asynchron helper class that provides info about the running platform
 * 
 * @class
 * @author Eugen Mihailescu
 * @since 1.0
 * 
 * @param {callback}
 *            callback - A callback to be notified when the platform information is available
 */
function PlatformInfo(callback) {
    var response = {};
    var callbacks = [];

    /**
     * Notify all registered callbacks when all platform info are ready
     * 
     * @since 1.0
     */
    function notifyCallbacks() {
        if (response.hasOwnProperty('browser') && response.hasOwnProperty('info')) {
            callbacks.forEach(function(callback) {
                callback(response.info, response.browser);
            });
        }
    }

    callbacks.push(callback);
    notifyCallbacks();

    if (agent.runtime.hasOwnProperty('getBrowserInfo')) {
        agent.runtime.getBrowserInfo(function(browser) {
            response.browser = browser;
            notifyCallbacks();

        });
    }
    if (agent.runtime.hasOwnProperty('getPlatformInfo')) {
        agent.runtime.getPlatformInfo(function(platform) {
            response.info = platform;
            notifyCallbacks();
        });
    }
}

/**
 * A class that generates the HTML report
 * 
 * @class
 * @author Eugen Mihailescu
 * @since 1.0
 * 
 * @param {Object}
 *            params - The object containing the report settings and data
 * @param {Object}
 *            ui_options - The add-on UI settings
 */
function ReportTemplate(params, ui_options) {
    params = params || {};

    // set default values when a certain param not defined
    var sortby = params.sortby || "";
    var customFilter = params.customFilter || "";
    var reverseorder = params.reverseorder || false;
    var orders = params.orders || [];
    var filters = params.filters || [];
    var highlight = params.highlight || {};
    highlight.delayedShipment = highlight.delayedShipment || {
        days : 5,
        title : "Shipped after 5 days",
        "class" : "delayed-shipment"

    };
    highlight.notDelivered = highlight.notDelivered || {
        days : 40,
        title : "Delivery could take 40+ days",
        "class" : "not-delivered"
    };
    highlight.itemNotReceived = highlight.itemNotReceived || {
        title : "Not received yet",
        "class" : "not-received "
    };
    highlight.itemReceived = highlight.itemReceived || {
        title : "Item received",
        "class" : "received"
    };

    var manifest = agent.runtime.getManifest();
    var platform = {};

    // prepare export data
    var reportExport = document.body.querySelector('.export-report');

    if (null !== reportExport) {
        var i, mime = {
            csv : 'text/csv',
            json : 'application/json',
            xml : 'application/xml'
        };

        // create the downloadable blob on-demand only
        function onExport(event) {
            var type = event.target.getAttribute("data-type");
            var blob = new Blob([ getExportData(type) ], {
                type : mime[type]
            });
            var url = window.URL.createObjectURL(blob);
            var today = new Date();
            var filename = "ebay-purchase-history-" + today.getFullYear() + today.getMonth() + today.getDay() + "." + type;

            agent.downloads.download({
                url : url,
                filename : filename,
                saveAs : true
            }, function() {
                window.URL.revokeObjectURL(blob);
            });
        }

        appendElement(reportExport, 'label', 'Export as:', null, true);

        for (i in mime) {
            if (mime.hasOwnProperty(i)) {
                var a = appendElement(reportExport, 'a', i.toUpperCase(), {
                    "href" : "#",
                    "class" : i,
                    "data-type" : i
                });
                a.addEventListener("click", onExport);
            }
        }
    }

    // prepare custom filters
    var customFilters = document.body.querySelector('.custom-filters');
    if (null !== customFilters) {
        var i, filter_options = {
            "" : "All",
            "notShipped" : 'Not yet shipped'
        };

        appendElement(customFilters, 'label', 'Show only:', null, true);

        function onFilter(event) {
            var filter = event.target.value;

            agent.tabs.getCurrent(function(tab) {
                agent.runtime.sendMessage({
                    tabId : tab.id,
                    customFilter : filter
                });
            });
        }

        var filterElement = appendElement(customFilters, 'select');
        filterElement.addEventListener("change", onFilter);

        for (i in filter_options) {
            if (filter_options.hasOwnProperty(i)) {
                var attrs = {
                    "value" : i
                };
                if (customFilter == i) {
                    attrs["selected"] = "selected";
                }
                appendElement(filterElement, 'option', filter_options[i], attrs);
            }
        }
    }

    /**
     * Removes all child nodes of an DOM element
     * 
     * @since 1.0
     * @param {Element}
     *            node - The parent node which children are removed
     */
    function removeAllChildren(node) {
        while (node.hasChildNodes()) {
            node.removeChild(node.lastChild);
        }
    }

    /**
     * Create a new DOM element
     * 
     * @since 1.0
     * @param {Element}
     *            parent - The parent DOM element for the new element
     * @param {string}
     *            tag - The tag element to create
     * @param {string=}
     *            text - Optional. The inner text for the new element.
     * @param {Object=}
     *            attrs - Optional. The new element attributes.
     * @param {bool=}
     *            cleanup - Optional. When true removes all parent's children before appending the element
     * @returns {Element} Returns the new created element
     */
    function appendElement(parent, tag, text, attrs, cleanup) {
        cleanup = cleanup || false;

        if (cleanup) {
            removeAllChildren(parent);
        }

        if ('undefined' !== typeof tag && '' != String(tag)) {
            var e = document.createElement(tag);
        } else {
            e = parent;
        }

        if ('undefined' !== typeof text && text) {
            e.appendChild(document.createTextNode(text));
        }
        if ('undefined' !== typeof attrs && attrs) {
            var i;
            for (i in attrs) {
                if (attrs.hasOwnProperty(i)) {
                    e.setAttribute(i, attrs[i]);
                }
            }
        }

        if (e !== parent) {
            parent.appendChild(e);
        }

        return e;
    }

    /**
     * Converts the given order array to its XML string representation
     * 
     * @since 1.0
     * @params {Array} array - An array containing the order data
     * @returns {string} Returns the XML string representation of the array
     */
    function orders2Xml(array) {
        array = array || [];

        var xmlEscape = function(string) {
            string = String(string);

            var escapeChars = {
                quot : '"',
                apos : "'",
                lt : '<',
                gt : '>',
                amp : '&'
            }, i;

            for (i in escapeChars) {
                if (escapeChars.hasOwnProperty(i)) {
                    string = string.replace(escapeChars[i], '&' + i + ';');
                }
            }

            return string;
        };

        var xmlSchema = '<?xml version="1.0" encoding="UTF-8" ?>';
        var now = new Date();
        var signature = '<generator type="WebExtension" datetime="' + now.toUTCString() + '" alias="' + manifest.short_name
                + '" name="' + xmlEscape(manifest.name) + '" version="' + xmlEscape(manifest.version) + '" author="'
                + xmlEscape(manifest.author) + '" homepage="' + manifest.homepage_url + '" description="'
                + manifest.description + '"></generator>';

        // make sure the array is ordered by OrderId,itemIndex
        array = array.sort(function(a, b) {
            if (a.orderId < b.orderId) {
                return a;
            } else if (a.orderId == b.orderId) {
                if (a.itemIndex < b.itemIndex) {
                    return a;
                }
            }
            return b;
        });

        var rows = [], lastOrderId = null;
        array.forEach(function(order, index) {
            var orderCols = [ 'orderId', 'purchaseDate', 'seller' ];
            // close `order` tag on orderId change
            if (lastOrderId !== order.orderId) {
                rows.push((null !== lastOrderId ? '</items></order>' : '') + '<order id="' + xmlEscape(order.orderId)
                        + '" purchaseDate="' + xmlEscape(order.purchaseDate) + '" seller="' + xmlEscape(order.seller.name)
                        + '" sellerUrl="' + xmlEscape(order.seller.url) + '"><items>');
                lastOrderId = order.orderId;
            }

            var i, attrs = [];
            for (i in order) {
                if (orderCols.indexOf(i) < 0 && order.hasOwnProperty(i)) {
                    attrs.push(i + '="' + xmlEscape(order[i]) + '"');
                }
            }
            rows.push('<item ' + attrs.join(' ') + '></item>');
        });

        if (null !== lastOrderId) {
            rows.push('</items></order>');
        }

        return xmlSchema + "<orders>" + signature + rows.join("") + "</orders>";
    }

    /**
     * Get the data exported in the given format
     * 
     * @since 1.0
     * @params {string} format - The export format (json|csv|xml)
     * @return {string} - Returns the exported data in the given format
     */
    function getExportData(format) {
        var result = '';
        switch (format) {
        case 'json':
            result = JSON.stringify(orders);
            break;
        case 'xml':
            result = orders2Xml(orders);
            break;
        case 'csv':
            orders.forEach(function(order, index) {
                // file header
                if ('' == result) {
                    result += Object.keys(order).join("\t") + "\n";
                }

                // file content
                var line = [], i;
                for (i in order) {
                    if (order.hasOwnProperty(i)) {
                        line.push('seller' == i ? order[i]["name"] : order[i]);
                    }
                }
                result += line.join("\t") + "\n";
            });
            break;
        }

        return result;
    }

    /**
     * Get the columns of the report
     * 
     * @since 1.0
     * @return {Object} - Returns the columns definition
     */
    function getColumns() {
        var cols = {
            index : {
                label : "#"
            },
            seller : {
                href : {
                    url : "url",
                    text : "name"
                },
                label : "Seller",
                sort : true
            },
            purchaseDate : {
                label : "Purchase date",
                sort : true
            },
            elapsedDays : {
                label : "Days",
                sort : true
            },
            price : {
                label : "Item price",
                sort : true
            },
            quantity : {
                label : "Quantity",
                sort : true
            },
            shipStatus : {
                label : "Shipping status",
                sort : true
            },
            deliveryDate : {
                label : "Estimated delivery",
                sort : true
            },
            etaDays : {
                label : "ETA",
                sort : true
            },
            specs : {
                label : "Item description",
            }
        };

        return cols;
    }

    /**
     * Get the report column count
     * 
     * @since 1.0
     * @return int
     */
    function getColumnsCount() {
        var cols = getColumns();

        return Object.keys(cols).length;
    }

    /**
     * Add a group|header report row
     * 
     * @since 1.0
     */
    function addWideRow(parent, attrs) {
        var row = appendElement(parent, 'tr', null, attrs);
        row.addEventListener('mouseover', updateThumbnail);

        return row;
    }

    /**
     * Creates the report header
     * 
     * @since 1.0
     * @params {Element} parent - The parent element where the header will be appended
     */
    function addHeader(parent) {
        var sortByColumn = function(event) {
            var name = event.target.getAttribute("name");
            agent.tabs.getCurrent(function(tab) {
                agent.runtime.sendMessage({
                    tabId : tab.id,
                    sortBy : name,
                    reverseorder : !reverseorder
                });
            });
        };

        var cols = getColumns();

        var row = addWideRow(parent, {
            "class" : "wide"
        });

        var i, td, attrs, html;
        for (i in cols) {
            if (cols.hasOwnProperty(i)) {
                var visibility = ui_options.visibleColumns[i] ? "" : "hidden";
                td = appendElement(row, 'th', cols[i].label, {
                    "class" : visibility
                });

                if (ui_options.enableSorting && cols[i].hasOwnProperty('sort') && true === cols[i].sort) {
                    var sort_order = false === reverseorder && i == sortby ? "desc" : "asc";
                    var sortIcon = appendElement(td, 'div', null, {
                        "class" : "sort-icon sort-" + sort_order,
                        "name" : i,
                        "title" : "Sort " + sort_order
                    });
                    sortIcon.addEventListener("click", sortByColumn);
                }
            }
        }
    }

    /**
     * Generates the report footer
     * 
     * @since 1.0
     */
    function addReportFooter() {
        var footer = {
            addon : document.querySelector('.report-footer .addon-info'),
            icon : document.querySelector('.report-footer .addon-icon'),
            selector : document.querySelector('.report-footer .platform-info')
        };

        if (null !== footer.selector) {
            PlatformInfo(function(info, browser) {
                var text = [];
                if (browser.hasOwnProperty('vendor')) {
                    text.push(browser.vendor);
                }
                if (browser.hasOwnProperty('name')) {
                    text.push(browser.name);
                }
                if (browser.hasOwnProperty('version')) {
                    text.push('v' + browser.version);
                }
                if (text.length) {
                    text.push('/');
                }
                text.push(info.os.charAt(0).toUpperCase() + info.os.slice(1) + ' ' + info.arch);

                appendElement(footer.selector, 'span', 'running on ' + text.join(' '), null, true);
            });
        }

        if (footer.addon) {
            if (footer.icon) {
                appendElement(footer.icon, 'img', null, {
                    src : manifest.icons[32]
                }, true);
            }

            var text = manifest.short_name + ' v' + manifest.version;
            appendElement(footer.addon, 'a', text, {
                href : manifest.homepage_url
            }, true);
        }
    }

    /**
     * Add a new group subtotal to the given DOM parent element
     * 
     * @since 1.0
     * @param {Object}
     *            parent - The parent DOM element where to append the group footer
     * @param {string}
     *            label - The group's total prefix label
     * @param {number}
     *            value - The group's total value
     * @param {string}
     *            currency - The group's currency for the value
     * @param {int}
     *            count - The group's total number of items
     * @param {int}
     *            shipped - The group's total number of shipped items
     * @param {Object=}
     *            attrs - Optional. An object containing the custom atrributes for the group footer element.
     */
    function addGrpFooter(parent, label, value, currency, count, shipped, attrs) {
        attrs = attrs || {};
        attrs["class"] = (attrs.hasOwnProperty("class") ? attrs["class"] : "") + " group-footer";
        var row = addWideRow(parent, attrs);

        appendElement(row, 'td', label, {
            "colspan" : 2
        });

        var text = Math.round(value, 2) + ' ' + currency + ', ' + shipped + ' shipped, ' + (count - shipped)
                + ' not-shipped (' + count + ' items, ~ ';
        text += Math.round(value / count, 2);
        text += ' ' + currency + '/item)';

        appendElement(row, 'td', text, {
            "colspan" : getColumnsCount() - 2
        });
    }

    /**
     * Calculates what attributes the item should have based on its not-shipped, not-delivered,etc info
     * 
     * @since 1.0
     * @param {Object}
     *            item - An object containing the item fields.
     * @return {Object} Return an object containing the item's CSS attributes
     */
    function getItemHighlightedAttrs(item) {
        var dateDiff = function(date1, date2) {
            var diff = date1 - date2;// in microseconds
            return diff / 86400000;
        };
        var purchaseDate = Date.parse(item.purchaseDate);
        var result = false;

        if (ui_options.enableRowHighlights && NaN !== purchaseDate) {
            var daysFromPurchase = dateDiff(Date.now(), purchaseDate);

            var shippingDate = Date.parse(item.shipStatus);
            var shippedAfterDays = NaN === shippingDate ? daysFromPurchase : dateDiff(shippingDate - purchaseDate);
            var deliveryDate = Date.parse(item.deliveryDate.replace(/.*-\s*/g, ''));
            deliveryDate = NaN === deliveryDate ? Date.now() : deliveryDate;

            if (!item.received) {
                // item not delivered after 40 days
                if (dateDiff(deliveryDate, purchaseDate) > highlight.notDelivered.days) {
                    result = highlight.notDelivered;
                    result.style = "background-color:" + ui_options.notDelivered_color;
                }

                // not yet shipped after 5 days
                if (shippedAfterDays > highlight.delayedShipment.days) {
                    result = highlight.delayedShipment;
                    result.style = "background-color:" + ui_options.delayedShipment_color;
                }

                // item not received on due date
                if (NaN !== deliveryDate && dateDiff(Date.now(), deliveryDate) > 0) {
                    result = highlight.itemNotReceived;
                    result.style = "background-color:" + ui_options.itemNotReceived_color;
                }
            } else {
                // item received
                result = highlight.itemReceived;
                result.style = "background-color:" + ui_options.itemReceived_color;
            }
        }

        return result;
    }

    /**
     * Add a legend item with the given attributes
     * 
     * @since 1.0
     * @param {Object}
     *            attrs - The attributes of the legend item
     */
    function updateLegend(attrs) {
        var reportLegend = document.body.querySelector('.report-legend');

        if (null === reportLegend || null !== reportLegend.querySelector("." + attrs['class'])) {
            return;
        }

        // append the legend entry
        appendElement(reportLegend, 'li', attrs['title'], attrs);
    }

    /**
     * Add the report filters in the report header
     * 
     * @since 1.0
     */
    function updateFilters() {
        var reportFilter = document.body.querySelector('.report-filters');

        if (null === reportFilter) {
            return;
        }

        removeAllChildren(reportFilter);

        filters.forEach(function(filter, index) {
            var entry = appendElement(reportFilter, 'tr');
            appendElement(entry, 'td', filter.label + ' :');
            appendElement(entry, 'td', filter.content);
        });
    }

    /**
     * Add the report title
     * 
     * @since 1.0
     */
    function updateTitle() {
        var reportTitle = document.body.querySelector('h2.report-title');
        var reportDate = document.querySelector('.report-date-wrapper');

        if (null !== reportTitle) {
            appendElement(reportTitle, null, manifest.name, null, true);
        }

        if (null !== reportDate) {
            var today = new Date();

            appendElement(reportDate, 'span', "(generated at " + today.toUTCString() + ")", null, true);
        }
    }

    /**
     * Update the target element thumbnail image on mouse-over
     * 
     * @since 1.0
     */
    function updateThumbnail(event) {
        var src = event.currentTarget.getAttribute("data-thumbnail");
        if (null !== src && src.length) {
            document.getElementById('thumbnail').setAttribute("src", src);
        } else {
            document.getElementById('thumbnail').removeAttribute("src");
        }
    }

    /**
     * Adds a new row for the given fields by padding their values with spaces if not having a given minimum length.
     * 
     * @since 1.0
     * @param {Object}
     *            parent - The parent DOM element where to append the row
     * @param {Object}
     *            fields - An object containing the field's key name and their corresponding values
     * @param {Object=}
     *            dataset - Optional. A dataset object to add to the row
     */
    function addRow(parent, fields, dataset) {
        dataset = dataset || {};

        var cols = getColumns();

        var onRowClick = function(event) {
            agent.runtime.sendMessage({
                showItem : {
                    orderId : event.target.parentElement.dataset.orderid,
                    index : event.target.parentElement.dataset.index
                }
            });
        };

        var f, a = [], v, attr;
        var attrs = getItemHighlightedAttrs(fields);

        if (false !== attrs) {
            updateLegend(attrs);
        }

        var row = appendElement(parent, 'tr', false, attrs);
        row.addEventListener('mouseover', updateThumbnail);

        for (f in dataset) {
            if (dataset.hasOwnProperty(f)) {
                row.dataset[f] = dataset[f];
            }
        }

        if (dataset.hasOwnProperty('orderid') && dataset.hasOwnProperty('index')) {
            row.addEventListener("click", onRowClick);
        }

        for (f in fields) {
            if (fields.hasOwnProperty(f) && cols.hasOwnProperty(f)) {
                var visibility = ui_options.visibleColumns[f] ? "" : "hidden";
                attr = {
                    "class" : visibility
                };

                if (sortby == f) {
                    attr["class"] += " sort-column"
                }

                // in case of a href column
                if (cols[f].hasOwnProperty('href')) {
                    var td = appendElement(row, 'td', null, attr);
                    var hrefCol = cols[f].href;
                    appendElement(td, 'a', fields[f][hrefCol.text], {
                        "href" : fields[f][hrefCol.url],
                        "target" : "_blank"
                    });
                } else {
                    // a normal text column
                    appendElement(row, 'td', fields[f], attr);
                }
            }
        }
    }

    /**
     * Generates the HTML output for the orders items
     * 
     * @since 1.0
     * @param {Element}
     *            parent - The parent element that encloses the HTML output
     */
    this.printData = function(parent) {
        var i;
        var e;
        var c;
        var v;
        var n;
        var g = 0;
        var s = 0;
        var ts = 0;
        var j = 0;
        var t = 0;
        var gt = 0;
        var currency;
        var prevDate = '';
        var prevCurrency = '';
        var prevSeller = '';
        var currencies = [];

        var cols = getColumns();
        var sortByDate = [ 'purchaseDate', 'shipStatus', 'deliveryDate' ].indexOf(sortby) >= 0;

        // clean-up the existent content, if any
        removeAllChildren(parent);

        updateTitle();

        updateFilters();

        addHeader(parent);

        for (i = 0; i < orders.length; i += 1) {
            e = orders[i];
            c = e.price.replace(/.*?([a-zA-Z]+)/g, '$1');
            n = e.seller.name;

            var newGroup = ('' == sortby || sortByDate) && (prevDate.length && e.purchaseDate != prevDate);
            newGroup = newGroup || (prevCurrency.length && c != prevCurrency);
            newGroup = newGroup || ('seller' == sortby && prevSeller.length && n != prevSeller);

            // print the group footer
            if (ui_options.enableGrouping && newGroup) {
                addGrpFooter(parent, 'SUBTOTAL', t, currency, j, s);
                g += 1;
                j = 0;
                t = 0;
                s = 0;
                prevDate = e.purchaseDate;
                prevCurrency = c;
                prevSeller = n;
            }

            if (/\d+/g.test(e.shipStatus)) {
                s += 1;
                ts += 1;
            }

            currency = c;
            v = parseFloat(e.price.replace(/.*?([\d\.]+).*/g, '$1').replace(',',''));
            t += v;
            gt += v;

            var itemData = {
                index : i + 1,
                seller : e.seller,
                purchaseDate : e.purchaseDate,
                elapsedDays : e.elapsedDays,
                price : e.price,
                quantity : e.quantity,
                shipStatus : e.shipStatus,
                deliveryDate : e.deliveryDate,
                etaDays : e.etaDays,
                specs : e.specs,
                received : !e.feedbackNotLeft
            };

            // print the item's row
            addRow(parent, itemData, {
                orderid : e.orderId,
                index : e.itemIndex,
                thumbnail : e.thumbnail
            });

            j += 1;
            prevDate = e.purchaseDate;
            prevSeller = e.seller.name;
            prevCurrency = currency;
            if (currencies.indexOf(prevCurrency) < 0) {
                currencies.push(prevCurrency);
            }
        }

        // print the last group footer
        if (g) {
            addGrpFooter(parent, 'SUBTOTAL', t, currency, j, s);
        }

        // print the grand total
        if (1 == currencies.length) {
            addGrpFooter(parent, 'GRAND TOTAL', gt, currencies[0], orders.length, ts, {
                "class" : "wide"
            });
        }

        addReportFooter();

        parent.addEventListener("mouseenter", function(event) {
            var el = document.getElementById('thumbnail');
            el.className = el.className.replace(/\bhidden/, '')
        });
        parent.addEventListener("mouseleave", function(event) {
            var el = document.getElementById('thumbnail');
            el.className += " hidden";
        });
    };
}

/**
 * Report page content script helper
 * 
 * @class
 * @author Eugen Mihailescu
 * @since 1.0
 */
function ReportPageScript() {

    /**
     * Popup a error message which fades-out at onClick or automatically after 5sec.
     * 
     * @since 1.0
     * @param {string}
     *            message - The message error to show
     */
    function showError(message) {
        var wrapper = appendElement(document.body, 'div', null, {
            "class" : "error-message-wrapper"
        });
        var inner = appendElement(wrapper, 'div', null, {
            "class" : "error-message-inner"
        });
        var message = appendElement(inner, 'div', message, {
            "class" : "error-message"
        });

        var fadeOut = function() {
            wrapper.setAttribute("class", wrapper.getAttribute("class") + " fade-out");
            // remove the wrapper after 0.5s (fade-out duration)
            setTimeout(function() {
                if (wrapper.parentNode) {
                    wrapper.parentNode.removeChild(wrapper);
                }
            }, 500);
        };

        wrapper.addEventListener("click", fadeOut);

        // fade out automatically after 5s
        setTimeout(fadeOut, 5000);
    }

    /**
     * Generate the report
     * 
     * @since 1.0
     * @param {Object}
     *            data - The object that contains the report's data
     * @param {Object}
     *            ui_options - The add-on UI settings
     */
    function printReport(data, ui_options) {
        var table = document.querySelector('.report');

        if (null !== table) {
            var report = new ReportTemplate(data, ui_options);
            report.printData(table);
        } else {
            console.error('Parent table with class ".report" not found');
        }
    }

    /**
     * Get the current add-on's UI options
     * 
     * @since 1.0
     * @returns {Object} Returns an object containing the UI options
     */
    function get_ui_options() {
        var ui_options = localStorage.getItem('ui_options') || "";
        try {
            result = JSON.parse(ui_options);
        } catch (e) {
            result = {
                enableRowHighlights : true,
                enableGrouping : true,
                enableSorting : true,
                enablePagination : false,
                pageSize : 100,
                delayedShipment : 5,
                delayedShipment_color : "#FFD0C7",
                notDelivered : 40,
                notDelivered_color : "#FAFAD2",
                itemNotReceived_color : "#FF6347",
                itemReceived_color : "#D6FDD6",
                visibleColumns : {
                    index : true,
                    seller : true,
                    purchaseDate : true,
                    elapsedDays : true,
                    price : true,
                    quantity : true,
                    shipStatus : true,
                    deliveryDate : true,
                    etaDays : true,
                    specs : true
                }
            };
        }

        return result;
    }
    /**
     * Listen for messages received from the background script
     */
    agent.runtime.onMessage.addListener(function(request, sender, sendRespose) {
        if (request.hasOwnProperty('reportData')) {

            printReport(request.reportData, get_ui_options());

            // save data to session cache
            sessionStorage.setItem('reportData', JSON.stringify(request.reportData));
        }
        if (request.hasOwnProperty('eBayPageNotFound')) {
            showError(request.eBayPageNotFound);
        }
    });

    // on page refresh load data from session cache
    document.addEventListener('DOMContentLoaded', function() {
        if ('undefined' !== typeof Storage) {
            var reportData = sessionStorage.getItem('reportData');
            try {
                reportData = JSON.parse(reportData);
                if (null !== reportData) {
                    printReport(reportData, get_ui_options());
                }
            } catch (e) {
                console.log(e);
            }
        }
    });
}

ReportPageScript();