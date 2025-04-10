// popup.js

const analyzeButton = document.getElementById('analyzeButton');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');

analyzeButton.addEventListener('click', () => {
    statusDiv.textContent = 'Analyzing... getting page content...';
    resultsDiv.textContent = ''; // Clear previous results
    resultsDiv.classList.remove('error');
    analyzeButton.disabled = true; // Disable button during analysis

    // 1. Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
            handleError("Error getting active tab: " + chrome.runtime.lastError.message);
            return;
        }
        const currentTab = tabs[0];
        if (!currentTab || !currentTab.id) {
            handleError("Could not get current tab ID.");
            return;
        }

        // Check if the tab URL is accessible (avoid chrome://, file:// etc.)
        if (!currentTab.url?.startsWith('http')) {
            handleError("Cannot analyze special pages (e.g., chrome://, file://). Please navigate to a standard webpage (http or https).");
            return;
        }


        // 2. Inject the content script to get page content
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['content_script.js']
            // Or use the 'func' property for simple scripts:
            // func: () => document.body.innerText
        })
            .then(injectionResults => {
                if (chrome.runtime.lastError) {
                    handleError("Error injecting script: " + chrome.runtime.lastError.message);
                    return;
                }
                if (!injectionResults || injectionResults.length === 0 || !injectionResults[0].result) {
                    handleError("Could not retrieve page content. The content script might have failed or returned empty.");
                    return;
                }

                const pageContent = injectionResults[0].result;
                statusDiv.textContent = 'Analyzing... sending content to background...';
                console.log("Content script executed, page content length:", pageContent?.length);

                // 3. Send message to background script to start analysis
                chrome.runtime.sendMessage(
                    {
                        action: "analyzePage",
                        pageContent: pageContent
                    },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            // This catches errors if the background script connection fails
                            handleError("Error communicating with background script: " + chrome.runtime.lastError.message);
                            return;
                        }

                        // 4. Handle the response from the background script
                        if (response) { // Check if response exists
                            if (response.success) {
                                statusDiv.textContent = 'Analysis complete.';
                                resultsDiv.textContent = response.result?.analysis || 'No analysis returned.'; // Adjust based on actual Gemini response structure
                                console.log("Analysis successful:", response.result);
                            } else {
                                handleError(`Analysis failed: ${response.error || 'Unknown error'}`);
                            }
                        } else {
                            handleError("Received no response from background script. Check background script logs.");
                        }

                        analyzeButton.disabled = false; // Re-enable button
                    }
                );
            })
            .catch(error => {
                handleError("Error executing content script: " + error.message);
            });
    });
});

function handleError(errorMessage) {
    console.error(errorMessage);
    statusDiv.textContent = 'Error!';
    resultsDiv.textContent = errorMessage;
    resultsDiv.classList.add('error');
    analyzeButton.disabled = false; // Re-enable button on error
}

// Optional: Check if playbook URL is set on popup open
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['playbookUrl'], (items) => {
        if (!items.playbookUrl) {
            statusDiv.textContent = 'Warning: Playbook URL not set in options.';
            statusDiv.style.color = 'orange';
        }
    });
});