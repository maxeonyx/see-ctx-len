let partsArray = [];
let lastParts = null;
let fullMessage = "";

let decoder = new TextDecoder("utf-8");
let encoder = new TextEncoder();

function processEvent(event) {
    let str = decoder.decode(event.data, {
        stream: true
    });

    console.groupCollapsed("Raw data");
    console.log(str);
    console.groupEnd();

    // Split the data into individual lines.
    let lines = str.trim().split('\n').map(line => line.trim());

    // Process each line.
    for(let line of lines) {
        // Ignore the final message which is just [DONE].
        if(line === "") {
            continue;
        } else if(line === 'data: [DONE]') {
            continue;
        }

        // Parse the JSON object in the line.
        let obj;
        try {
            obj = JSON.parse(line.slice(6)); // Remove the 'data: ' prefix.
        } catch (e) {
            console.log("Error parsing JSON object, this is probably just a partial cut in the text stream: ", line);
            continue;
        }

        // Get the 'parts' array in the JSON object.
        let parts = obj.message.content.parts[0];

        // Find the new parts.
        let newParts = parts.replace(lastParts, '');

        // Add the new parts to fullMessage and partsArray.
        fullMessage += newParts;
        partsArray.push(newParts);

        // Update lastParts.
        lastParts = parts;
    }

    console.log("Full message: ", fullMessage);
    console.log("Parts array: ", partsArray);

    // Send new data to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {data: {fullMessage, partsArray}});
    });
}

// Listener for web requests
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        let filter = browser.webRequest.filterResponseData(details.requestId);

        filter.ondata = event => {
            processEvent(event);
            filter.write(event.data);
        }

        filter.onstop = event => {
            processEvent(event);
            console.log('Message Array: ', partsArray);
            console.log('Full Message: ', fullMessage);
            filter.disconnect();
        }

        return {};
    }, {
        urls: ["*://chat.openai.com/backend-api/conversation"]
    }, ["blocking"]
);
