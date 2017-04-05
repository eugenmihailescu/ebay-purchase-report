const eBayErrorMessage = 'eBay purchase history page not found. Please open it then try again.';

var agent = "undefined" !== typeof chrome ? chrome : browser;

/**
 * Query for the eBay browser's tab
 * 
 * @param {callback}
 *            resolve - The callback function on success
 * @param {callback}
 *            reject - The callback function on error
 */
function getEbayTab(resolve, reject) {
    resolve = resolve || false;
    reject = reject || false;

    agent.tabs.query({
        active : false,
        status : "complete",
        url : "*://*.ebay.com/*"
    }, resolve);

}

// listen for events from content scripts
agent.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var newTabId = null;

    var eBayPageNotFound = function(reason) {
        // send back to the origin tab a message error
        agent.tabs.sendMessage(sender.tab.id, {
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
                    var p = agent.tabs.sendMessage(tab.id, request, function() {
                        agent.tabs.onUpdated.removeListener(onTabReady);
                    });
                }
            };

            agent.tabs.onUpdated.addListener(onTabReady);

            if (null !== request.reportData.tabId) {
                agent.tabs.remove(request.reportData.tabId);
            }

            // open the report template in a new tab
            agent.tabs.create({
                active : true,
                url : "content_scripts/report.html"
            }, function(tab) {
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
                    agent.tabs.sendMessage(tab.id, request);
                });
            }
        }, eBayPageNotFound);
    }

    // open the given URL in a new tab
    if (request.hasOwnProperty('showEbayItem')) {
        agent.tabs.create({
            active : true,
            url : request.url
        });
    }
});
