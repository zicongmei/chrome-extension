// content_script.js
console.log("Content script injected.");

// Function to extract relevant text content from the page.
// This can be made much more sophisticated (e.g., target specific elements,
// clean up text, extract metadata), but document.body.innerText is a simple start.
function getPageContent() {
    try {
        // Using document.body.innerText often gives a reasonable text representation
        // You might want to use document.documentElement.innerText for the whole HTML content text
        // or more specific selectors like document.querySelector('main article').innerText
        return document.body.innerText || '';
    } catch (e) {
        console.error("Error getting page content:", e);
        return `Error extracting content: ${e.message}`;
    }
}

// Return the content so it can be captured by chrome.scripting.executeScript
getPageContent();