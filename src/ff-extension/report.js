function Report(params) {
    params = params || {};
    var sortby = params.sortby || "";
    var reverseorder = params.reverseorder || false;
    var orders = params.orders || [];

    function appendElement(parent, tag, text, attrs) {
        var e = document.createElement(tag);
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
        parent.appendChild(e);

        return e;
    }

    function addHeader(parent) {
        var sortByColumn = function(event) {
            var name = event.target.getAttribute("name");
            var current = browser.tabs.getCurrent();
            current.then(function(tab) {
                browser.runtime.sendMessage({
                    tabId : tab.id,
                    sortBy : name,
                    reverseorder : !reverseorder
                });
            });
        };

        var cols = {
            index : {
                label : "#"
            },
            purchaseDate : {
                label : "Purchase date",
                sort : true
            },
            price : {
                label : "Item price",
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
            specs : {
                label : "Item description",
            }
        };

        var row = appendElement(parent, 'tr', null, {
            "class" : "wide"
        });

        var i, td, attrs, html;
        for (i in cols) {
            if (cols.hasOwnProperty(i)) {
                td = appendElement(row, 'th', cols[i].label);
                if (cols[i].hasOwnProperty('sort') && true === cols[i].sort) {
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
     * Add a new group subtotal to the given DOM parent element
     * 
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
        var row = appendElement(parent, 'tr', null, attrs);

        appendElement(row, 'td', label, {
            "colspan" : "2"
        });

        var text = Math.round(value, 2) + ' ' + currency + ', ' + shipped + ' shipped, ' + (count - shipped)
                + ' not-shipped (' + count + ' items, ~ ';
        text += Math.round(value / count, 2);
        text += ' ' + currency + '/item)';

        appendElement(row, 'td', text, {
            "colspan" : "4"
        });
    }

    /**
     * Adds a new row for the given fields by padding their values with spaces if not having a given minimum length.
     * 
     * @param {Object}
     *            parent - The parent DOM element where to append the row
     * @param {Object}
     *            fields - An object containing the field's key name and their corresponding values
     */
    function addRow(parent, fields) {
        var f, a = [], v, attr;

        var row = appendElement(parent, 'tr');
        for (f in fields) {
            if (fields.hasOwnProperty(f)) {
                attr = null;
                if (sortby == f) {
                    attr = {
                        "class" : "sort-column"
                    };
                }
                appendElement(row, 'td', fields[f], attr);
            }
        }
    }

    this.printData = function(parent) {
        var i;
        var e;
        var c;
        var v;
        var g = 0;
        var s = 0;
        var ts = 0;
        var j = 0;
        var t = 0;
        var gt = 0;
        var currency;
        var prevDate = '';
        var prevCurrency = '';
        var currencies = [];

        // clean-up the existent content, if any
        while (parent.hasChildNodes()) {
            parent.removeChild(parent.lastChild);
        }

        addHeader(parent);

        for (i = 0; i < orders.length; i += 1) {
            e = orders[i];
            c = e.price.replace(/.*?([a-zA-Z]+)/g, '$1');

            // print the group footer
            if ((('' == sortby || 'purchaseDate' == sortby || 'shipStatus' == sortby || 'deliveryDate' == sortby)
                    && prevDate.length && e.purchaseDate != prevDate)
                    || (prevCurrency.length && c != prevCurrency)) {
                addGrpFooter(parent, 'SUBTOTAL', t, currency, j, s);
                g += 1;
                j = 0;
                t = 0;
                s = 0;
                prevDate = e.purchaseDate;
                prevCurrency = c;
            }

            if (/\d+/g.test(e.shipStatus)) {
                s += 1;
                ts += 1;
            }

            currency = c;
            v = parseFloat(e.price.replace(/.*?([\d\.]+).*/g, '$1'));
            t += v;
            gt += v;

            // print the item's row
            addRow(parent, {
                index : i + 1,
                purchaseDate : e.purchaseDate,
                price : e.price,
                shipStatus : e.shipStatus,
                deliveryDate : e.deliveryDate,
                specs : e.specs
            });

            j += 1;
            prevDate = e.purchaseDate;
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
    };
}

browser.runtime.onMessage.addListener(function(request, sender, sendRespose) {
    var reportDate = document.querySelector('.report-date');
    var table = document.querySelector('.report');

    if (null !== reportDate) {
        var today = new Date();
        reportDate.appendChild(document.createTextNode(today.toUTCString()));
    }

    if (null !== table) {
        var report = new Report(request);

        report.printData(table);
    } else {
        console.error('Parent table with class ".report" not found');
    }
});
