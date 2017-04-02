browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var newTabId = null;

    if (request.hasOwnProperty('reportData')) {
        // push the report data when the new report tab is ready
        var onTabReady = function(tabId, changeInfo, tab) {
            if ("complete" == changeInfo.status && tabId == newTabId) {
                // pass the reportData to the injected report
                var p = browser.tabs.sendMessage(tab.id, request.reportData);
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

    if (request.hasOwnProperty('sortBy')) {
        var querying = browser.tabs.query({
            active : false,
            status : "complete",
            url : "*://*.ebay.com/*"
        });

        querying.then(function(tabs) {
            tabs.forEach(function(tab, index) {
                browser.tabs.sendMessage(tab.id, request);
            });
        });
    }
});
