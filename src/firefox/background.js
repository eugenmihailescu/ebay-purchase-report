const eBayErrorMessage = 'eBay purchase history page not found. Please open it then try again.';

/**
 * Query for the eBay browser's tab
 * 
 * @param {callback}
 *            resolve - The callback function on success
 * @param {callback}
 *            reject - The callback function on error
 */
function getEbayTab(resolve, reject) {
    var promise = browser.tabs.query({
        active : false,
        status : "complete",
        url : "*://*.ebay.com/*"
    });

    resolve = resolve || false;
    reject = reject || false;

    promise.then(resolve, reject);

}

// listen for events from content scripts
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var newTabId = null;

    var eBayPageNotFound = function(reason) {
        // send back to the origin tab a message error
        browser.tabs.sendMessage(sender.tab.id, {
            eBayPageNotFound : reason
        });
    };

    if (request.hasOwnProperty('reportData')) {
        if (!request.reportData.orders) {
            eBayPageNotFound(eBayErrorMessage);
        } else {
            // push the report data when the new report tab is ready
            var onTabReady = function(tabId, changeInfo, tab) {
                if ("complete" == changeInfo.status && tabId == newTabId) {
                    // pass the reportData to the injected report
                    var p = browser.tabs.sendMessage(tab.id, request);
                    p.then(function() {
                        browser.tabs.onUpdated.removeListener(onTabReady);
                    });
                }
            };

            browser.tabs.onUpdated.addListener(onTabReady);

            if (null !== request.reportData.tabId) {
                browser.tabs.remove(request.reportData.tabId);
            }

            // open the report template in a new tab
            var promise = browser.tabs.create({
                active : true,
                url : "report.html"
            }).then(function(tab) {
                newTabId = tab.id;
            });
        }
    }

    // pass the request forward to the content script
    if (request.hasOwnProperty('sortBy') || request.hasOwnProperty('showItem')) {
        getEbayTab(function(tabs) {
            if (!tabs.length) {
                eBayPageNotFound(eBayErrorMessage);
            } else {
                tabs.forEach(function(tab, index) {
                    if (!request.hasOwnProperty('tabId')) {
                        request.tabId = tab.id;
                    }
                    var promise = browser.tabs.sendMessage(tab.id, request);
                });
            }
        }, eBayPageNotFound);
    }

    if (request.hasOwnProperty('showEbayItem')) {
        browser.tabs.create({
            active : true,
            url : request.url
        });
    }
});
