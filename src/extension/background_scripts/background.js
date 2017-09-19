const eBayErrorMessage = 'eBay purchase history page not found. Please open it then try again.';

var agent = "undefined" !== typeof chrome ? chrome : browser;

/**
 * The add-on's background script helper class
 * 
 * @class
 * @author Eugen Mihailescu
 * @since 1.0
 */
function BackgroundScript() {
    var manifest = agent.runtime.getManifest();

    /**
     * Get the current UI options
     * 
     * @since 1.0.17
     * @return {String}
     */
    function get_ui_options() {
        return localStorage.getItem('ui_options') || "";
    }

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

        var matches = [ "*://*.ebay.com/*", "*://*.ebay.com.au/*", "*://*.ebay.co.uk/*", "*://*.ebay.com.my/*",
                "*://*.ebay.ca/*", "*://*.ebay.com.ar/*", "*://*.ebay.at/*", "*://*.ebay.be/*", "*://*.ebay.com.br/*",
                "*://*.ebay.com.cn/*", "*://*.ebay.cz/*", "*://*.ebay.dk/*", "*://*.ebay.fi/*", "*://*.ebay.fr/*",
                "*://*.ebay.de/*", "*://*.ebay.gr/*", "*://*.ebay.com.hk/*", "*://*.ebay.hu/*", "*://*.ebay.in/*",
                "*://*.ebay.ie/*", "*://*.ebay.it/*", "*://*.ebay.nl/*", "*://*.ebay.no/*", "*://*.ebay.ph/*",
                "*://*.ebay.pl/*", "*://*.ebay.pt/*", "*://*.ebay.ru/*", "*://*.ebay.com.sg/*", "*://*.ebay.es/*",
                "*://*.ebay.ch/*", "*://*.ebay.co.th/*", "*://*.ebay.vn/*" ];

        if ("undefined" !== typeof manifest.content_scripts && "undefined" !== typeof manifest.content_scripts.matches) {
            matches = manifest.content_scripts.matches;
        }

        agent.tabs.query({
            active : false,
            status : "complete",
            url : matches

        }, resolve);

    }

    // listen for events from content scripts
    agent.runtime.onMessage
            .addListener(function(request, sender, sendResponse) {
                var newTabId = null;

                var eBayPageNotFound = function(reason) {
                    // send back to the origin tab a message error
                    agent.tabs.sendMessage(sender.tab.id, {
                        eBayPageNotFound : reason
                    });
                };

                // pass the request to the report content script
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

                        if (null !== request.reportData.tabId) {
                            // agent.tabs.remove(request.reportData.tabId);
                            newTabId = request.reportData.tabId;
                            onTabReady(newTabId, "complete", {
                                id : newTabId
                            });
                        } else {
                            agent.tabs.onUpdated.addListener(onTabReady);

                            // open the report template in a new tab
                            agent.tabs.create({
                                active : true,
                                url : "content_scripts/report.html"
                            }, function(tab) {
                                newTabId = tab.id;
                            });
                        }
                    }
                }

                // pass the request forward to the content script
                if (request.hasOwnProperty('sortBy') || request.hasOwnProperty('customFilter')
                        || request.hasOwnProperty('showItem')) {
                    getEbayTab(function(tabs) {
                        if (!tabs.length) {
                            eBayPageNotFound(eBayErrorMessage);
                        } else {
                            tabs.forEach(function(tab, index) {
                                if (!request.hasOwnProperty('tabId')) {
                                    request.tabId = tab.id;
                                }
                                request.ui_options = get_ui_options();
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

                if (request.hasOwnProperty('getUIOptions')) {
                    sendResponse({
                        ui_options : get_ui_options()
                    });
                }
            });
}

BackgroundScript();