// popup.js
// Handles popup interactions, OAuth flow, and Vertex AI API call.

const summarizeBtn = document.getElementById('summarizeBtn');
const summaryResultDiv = document.getElementById('summaryResult');
const optionsLink = document.getElementById('optionsLink'); // Make sure your popup.html has this link with id="optionsLink"

// --- Configuration ---
// IMPORTANT: Adjust REGION and MODEL_ID as needed for your GCP setup and desired model
const REGION = "us-central1"; // e.g., "us-central1", "europe-west1", etc. - MUST match host_permissions in manifest
const MODEL_ID = "gemini-2.0-flash"; // e.g., "gemini-1.5-flash-001", "gemini-1.0-pro", etc.
const VERTEX_AI_ENDPOINT_BASE = `https://${REGION}-aiplatform.googleapis.com/v1`;
const MAX_CHARS_FOR_SUMMARY = 18000; // Adjust based on model context window limits and desired performance
// --- End Configuration ---

// Function to display messages in the result area
function displayMessage(message, type = 'info') {
    summaryResultDiv.textContent = message;
    if (type === 'error') {
        summaryResultDiv.className = 'error'; // Ensure .error style is defined in popup.html
    } else if (type === 'loading') {
        summaryResultDiv.className = 'loading'; // Ensure .loading style is defined in popup.html
    } else {
        summaryResultDiv.className = ''; // Clear special styles
    }
    console.log(`Display [${type}]: ${message}`);
}

// Link to open the options page
optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        // Fallback for older environments if needed, though unlikely for Manifest V3
        window.open(chrome.runtime.getURL('options.html'));
    }
});

// Main logic when the "Summarize" button is clicked
summarizeBtn.addEventListener('click', async () => {
    displayMessage('Processing...', 'loading');
    summarizeBtn.disabled = true; // Prevent multiple clicks

    // 1. Get Google Cloud Project ID from storage
    let gcpProjectId;
    try {
        const result = await chrome.storage.sync.get(['gcpProjectId']);
        gcpProjectId = result.gcpProjectId;
        if (!gcpProjectId) {
            throw new Error('Google Cloud Project ID not set. Please configure it in the extension options.');
        }
    } catch (error) {
        console.error("Error getting Project ID:", error);
        displayMessage(`Error: ${error.message}`, 'error');
        summarizeBtn.disabled = false;
        return;
    }

    // 2. Get OAuth 2.0 Token using chrome.identity
    let authToken;
    try {
        displayMessage('Requesting authorization...', 'loading');
        // interactive: true will prompt the user for login/consent if needed
        authToken = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (!token) {
                    reject(new Error('Authorization failed: No token received.'));
                }
                else {
                    resolve(token);
                }
            });
        });
        console.log("OAuth token obtained successfully.");
    } catch (error) {
        console.error("OAuth Error:", error);
        displayMessage(`Authorization Error: ${error.message}. Ensure you are logged into Chrome and grant permission when prompted.`, 'error');
        summarizeBtn.disabled = false;
        return;
    }

    // 3. Get current tab information
    let tab;
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id || !activeTab.url) {
            throw new Error('Could not identify the active tab.');
        }
        if (!activeTab.url.startsWith('http')) {
            throw new Error('Cannot summarize this type of page (requires http/https URLs).');
        }
        tab = activeTab;
        console.log("Active tab identified:", tab.url);
    } catch (error) {
        console.error("Error getting active tab:", error);
        displayMessage(`Tab Error: ${error.message}`, 'error');
        summarizeBtn.disabled = false;
        return;
    }


    // 4. Inject content script to extract page text
    let pageText;
    try {
        displayMessage('Extracting page content...', 'loading');
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content_script.js']
        });

        if (!injectionResults || injectionResults.length === 0 || !injectionResults[0].result) {
            // Check for specific frame-related errors if result is null but no exception was thrown
            if (injectionResults && injectionResults.length > 0 && injectionResults[0].result === null) {
                throw new Error('Could not extract content, possibly due to page structure or security restrictions (e.g., cannot access content within certain iframes).');
            } else {
                throw new Error('Failed to execute content script or no text returned.');
            }
        }
        pageText = injectionResults[0].result.trim();
        if (!pageText) {
            throw new Error('No text content found on the page.');
        }
        console.log(`Extracted ${pageText.length} characters.`);
    } catch (error) {
        console.error("Content Script Error:", error);
        displayMessage(`Content Extraction Error: ${error.message}. Try reloading the page.`, 'error');
        summarizeBtn.disabled = false;
        return;
    }

    // Truncate text if it exceeds the limit
    const truncatedText = pageText.length > MAX_CHARS_FOR_SUMMARY
        ? pageText.substring(0, MAX_CHARS_FOR_SUMMARY) + "... (truncated)"
        : pageText;
    if (pageText.length > MAX_CHARS_FOR_SUMMARY) {
        console.log(`Content truncated to ${MAX_CHARS_FOR_SUMMARY} characters.`);
    }

    // 5. Call the Vertex AI API
    displayMessage('Sending request to Vertex AI Gemini...', 'loading');

    // Construct the API endpoint URL
    const API_URL = `${VERTEX_AI_ENDPOINT_BASE}/projects/${gcpProjectId}/locations/${REGION}/publishers/google/models/${MODEL_ID}:generateContent`;

    // Construct the request body (IMPORTANT: Verify this matches Vertex AI documentation for your model)
    const requestBody = {
        contents: {
            role: "user",
            parts: [
                {
                    "text": `Please provide a concise summary of the following web page content:\n\n---\n\n${truncatedText}\n\n---\n\nSummary:`
                }
            ]
        }

        // instances: [
        //     {
        //         // For Gemini text models, the structure is often like this:
        //         "prompt": `Please provide a concise summary of the following web page content:\n\n---\n\n${truncatedText}\n\n---\n\nSummary:`
        //         // Alternatively, some models might use a different structure like:
        //         // "content": { "role": "user", "parts": [{ "text": `...prompt...` }] }
        //     }
        // ],
        // parameters: {
        //     // Common parameters - adjust as needed
        //     temperature: 0.3,       // Lower for more factual summaries
        //     maxOutputTokens: 512,   // Max length of the summary
        //     topK: 40,
        //     topP: 0.95,
        // }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` // Use the OAuth token
            },
            body: JSON.stringify(requestBody),
        });

        const responseData = await response.json(); // Attempt to parse JSON regardless of status

        if (!response.ok) {
            console.error("Vertex AI API Error Response:", response.status, responseData);
            const errorMessage = responseData?.error?.message || `HTTP status ${response.status}`;
            // If authentication failed, try to remove the potentially invalid token
            if (response.status === 401 || response.status === 403) {
                console.log("Authentication error detected, attempting to remove cached token.");
                await chrome.identity.removeCachedAuthToken({ token: authToken });
                displayMessage(`API Auth Error: ${errorMessage}. Token cache cleared, please try again.`, 'error');
            } else {
                displayMessage(`API Error: ${errorMessage}`, 'error');
            }
            summarizeBtn.disabled = false;
            return; // Stop execution on API error
        }

        console.log("Vertex AI API Success Response:", responseData);

        // Extract the summary (IMPORTANT: Verify the response structure from Vertex AI docs)
        let summary = '';
        summary = responseData.candidates[0].content.parts[0].text;

        if (summary) {
            displayMessage(summary.trim(), 'info'); // Display successful summary
            // displayMessage(summary.toString(), 'info'); // Display successful summary
        } else {
            console.error("Could not find summary text in Vertex AI response:", responseData);
            throw new Error('Summary not found in the expected format within the API response.');
        }

    } catch (error) {
        console.error('Fetch or Parsing Error calling Vertex AI API:', error);
        displayMessage(`Request Failed: ${error.message}`, 'error');
    } finally {
        summarizeBtn.disabled = false; // Re-enable button after completion or error
    }
});