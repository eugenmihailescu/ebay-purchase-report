// Make sure it works for both, Mozilla and Chrome|Opera
var agent = "undefined" !== typeof chrome ? chrome : browser;

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
        itemReceived_color : "#D6FDD6"
    };
}

function isCheckbox(key) {
    var keys = [ "enableRowHighlights", "enableGrouping", "enableSorting", "enablePagination" ];

    return keys.indexOf(key) >= 0;
}
function getCurrentChoice() {
    var key, keys = getDefaultOptions();
    var result = {};

    for (key in keys) {
        if (keys.hasOwnProperty(key)) {
            var element = document.querySelector("#" + key);
            if (isCheckbox(key))
                result[key] = null !== element ? element.checked : keys[key];
            else
                result[key] = null !== element ? element.value : keys[key];
        }
    }

    return result;
}

function saveOptions(e) {
    var ui_options = getCurrentChoice();
    localStorage.setItem('ui_options', JSON.stringify(ui_options));
}

function resetOptions(e) {
    localStorage.setItem('ui_options', "");

    restoreOptions();

    saveOptions(e);
}

function restoreOptions() {
    var key, keys = getDefaultOptions();
    var ui_options = localStorage.getItem('ui_options') || "";

    try {
        ui_options = JSON.parse(ui_options);
    } catch (e) {
        ui_options = {};
    }

    var enableRowHighlights = document.querySelector('#enableRowHighlights');
    for (key in keys) {
        if (keys.hasOwnProperty(key)) {
            var element = document.querySelector("#" + key);
            if (null !== element) {
                if (isCheckbox(key)) {
                    element.checked = ui_options.hasOwnProperty(key) ? ui_options[key] : keys[key];
                    if (key == 'enableRowHighlights') {
                        enableOptions(element.checked);
                    }
                } else
                    element.value = ui_options.hasOwnProperty(key) ? ui_options[key] : keys[key];
            }
        }
    }

}

function enableOptions(enabled) {
    var key, keys = getDefaultOptions();

    for (key in keys) {
        if (keys.hasOwnProperty(key) && !isCheckbox(key)) {
            var element = document.querySelector("#" + key);
            if (null !== element)
                element.disabled = !enabled;
        }
    }

}
function enableRowHighlights(event) {
    enableOptions(event.target.checked);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector(".save-options").addEventListener("click", saveOptions);
document.querySelector(".reset-options").addEventListener("click", resetOptions);
document.querySelector("#enableRowHighlights").addEventListener("change", enableRowHighlights);
