chrome.browserAction.onClicked.addListener(function(activeTab) {
    chrome.tabs.executeScript(null, {file: "content.js"});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  fetch(request.input, request.init).then(function(response) {
    return response.text().then(function(text) {
      sendResponse([{
        body: text,
        status: response.status,
        statusText: response.statusText,
      }, null]);
    });
  }, function(error) {
    sendResponse([null, error]);
  });
  return true;
});
/* chrome.webNavigation.onCompleted.addListener(function() {
  chrome.tabs.executeScript(null, {file: "twitter.js"})
}, {url: [{urlMatches : 'https://twitter.com/*'}]}); */
