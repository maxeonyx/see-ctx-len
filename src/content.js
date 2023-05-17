let data = null;

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        data = request.data;
        console.log(request.data);
    }
);
