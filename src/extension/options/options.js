// Make sure it works for both, Mozilla and Chrome|Opera
var agent = "undefined" !== typeof chrome ? chrome : browser;

/**
 * Class that handles the add-on's UI option page
 * 
 * @class
 * @author Eugen Mihailescu
 * @since 1.0
 */
function UI_OptionPage() {
    /**
     * Get the add-on's default options
     * 
     * @since 1.0
     * @returns {Object} Returns an object containing the default options
     */
    function getDefaultOptions() {
        return {
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
                index : {
                    label : "#",
                    visible : true
                },
                seller : {
                    label : "Seller",
                    visible : true
                },
                purchaseDate : {
                    label : "Purchase date",
                    visible : true
                },
                elapsedDays : {
                    label : "Days",
                    visible : true
                },
                price : {
                    label : "Item price",
                    visible : true
                },
                quantity : {
                    label : "Quantity",
                    visible : true
                },
                shipStatus : {
                    label : "Shipping status",
                    visible : true
                },
                deliveryDate : {
                    label : "Estimated delivery",
                    visible : true
                },
                etaDays : {
                    label : "ETA",
                    visible : true
                },
                specs : {
                    label : "Item description",
                    visible : true
                }
            }
        };
    }

    /**
     * Check whether the given key represents a checkbox option
     * 
     * @since 1.0
     * @param {string}
     *            key - The id of the option
     * @returns {boolean} Returns true when the given option is checkbox, false otherwise
     */
    function isCheckboxOption(key) {
        var keys = [ "enableRowHighlights", "enableGrouping", "enableSorting", "enablePagination", "visibleColumns" ];

        return keys.indexOf(key) >= 0;
    }

    /**
     * Get the current UI options from the options page
     * 
     * @since 1.0
     * @returns {Object} Returns an object containing the current UI options
     */
    function getCurrentChoice() {
        var key, col, keys = getDefaultOptions();
        var result = {};

        for (key in keys) {
            if (keys.hasOwnProperty(key)) {
                var element = document.querySelector("#" + key);
                if (isCheckboxOption(key)) {
                    if ("visibleColumns" == key) {
                        for (col in keys[key]) {
                            if (keys[key].hasOwnProperty(col)) {
                                result[key] = result[key] || {};
                                element = document.querySelector("#" + key + "_" + col);
                                result[key][col] = null !== element ? element.checked : keys[key][col];
                            }
                        }
                    } else {
                        result[key] = null !== element ? element.checked : keys[key];
                    }
                } else
                    result[key] = null !== element ? element.value : keys[key];
            }
        }

        return result;
    }

    /**
     * Save the current UI options on Save button click
     * 
     * @since 1.0
     * @listens click
     * @param {Event}
     *            event - The calling event
     */
    function saveOptions(event) {
        var ui_options = getCurrentChoice();
        localStorage.setItem('ui_options', JSON.stringify(ui_options));
    }

    /**
     * Reset the current stored UI options on Reset button click
     * 
     * @since 1.0
     * @listen click
     * @param {Event}
     *            event - The calling event
     */
    function resetOptions(event) {
        localStorage.setItem('ui_options', "");

        loadOptions();

        saveOptions(event);
    }

    function addVisibleColumnsOptions() {
        var div, el, col, i = 0, keys = getDefaultOptions();
        var group, parent = document.body.querySelector('.visible-columns');

        if (null === parent)
            return;

        while (parent.hasChildNodes()) {
            parent.removeChild(parent.lastChild);
        }

        for (i = 0; i < 3; i += 1) {
            div = document.createElement("div");
            div.setAttribute("class", "cols-" + (i + 1));
            parent.appendChild(div);
        }

        for (col in keys.visibleColumns) {
            if (keys.visibleColumns.hasOwnProperty(col)) {
                group = parent.querySelector(".cols-" + (i % 3 + 1));

                div = document.createElement("div");

                el = document.createElement("input");
                el.setAttribute("type", "checkbox");
                el.setAttribute("id", "visibleColumns_" + col);
                div.appendChild(el);

                el = document.createElement("label");
                el.setAttribute("for", "visibleColumns_" + col);
                el.appendChild(document.createTextNode(keys.visibleColumns[col]["label"]));
                div.appendChild(el);

                if (null !== group) {
                    group.appendChild(div);
                }

                i += 1;
            }
        }
    }

    /**
     * Load the stored UI options into the options page
     * 
     * @listen DOMContentLoaded
     * @since 1.0
     */
    function loadOptions() {
        var key, col, keys = getDefaultOptions();
        var ui_options = localStorage.getItem('ui_options') || "";

        try {
            ui_options = JSON.parse(ui_options);
        } catch (e) {
            ui_options = {};
        }

        addVisibleColumnsOptions();

        var enableRowHighlights = document.querySelector('#enableRowHighlights');
        for (key in keys) {
            if (keys.hasOwnProperty(key)) {
                var element = document.querySelector("#" + key);

                if ("visibleColumns" == key) {
                    for (col in keys[key]) {
                        if (keys[key].hasOwnProperty(col)) {
                            element = document.querySelector("#" + key + "_" + col);
                            if (null !== element) {
                                element.checked = ui_options.hasOwnProperty(key) && ui_options[key].hasOwnProperty(col) ? ui_options[key][col]
                                        : keys[key][col];
                            }
                        }
                    }
                } else if (null !== element) {
                    if (isCheckboxOption(key)) {
                        {
                            element.checked = ui_options.hasOwnProperty(key) ? ui_options[key] : keys[key];
                        }
                        if ('enableRowHighlights' == key) {
                            enableRowHighlightsOptions(element.checked);
                        }
                    } else
                        element.value = ui_options.hasOwnProperty(key) ? ui_options[key] : keys[key];
                }
            }
        }
    }
    /**
     * Enables/disables the row highlighting UI options
     * 
     * @since 1.0
     * @param {boolean}
     *            enabled - When true enables the options, otherwise disabled.
     */
    function enableRowHighlightsOptions(enabled) {
        var key, keys = getDefaultOptions();

        for (key in keys) {
            if (keys.hasOwnProperty(key) && !isCheckboxOption(key)) {
                var element = document.querySelector("#" + key);
                if (null !== element)
                    element.disabled = !enabled;
            }
        }

    }
    /**
     * Sync the disabled attribute of the row highlighting options
     * 
     * @since 1.0
     * 
     * @listens change
     * @param {Event}
     *            event - The event that triggers this function
     */
    function enableRowHighlights(event) {
        enableRowHighlightsOptions(event.target.checked);
    }

    document.addEventListener("DOMContentLoaded", loadOptions);
    document.querySelector(".save-options").addEventListener("click", saveOptions);
    document.querySelector(".reset-options").addEventListener("click", resetOptions);
    document.querySelector("#enableRowHighlights").addEventListener("change", enableRowHighlights);
}

UI_OptionPage();