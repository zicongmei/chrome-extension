// background.js (Full text - Updated for HTML Playbook & Dynamic API URL)

// --- Constants for API URL Construction ---
// NOTE: Consider making these configurable in options too for more flexibility
const API_REGION = "us-central1"; // Example region
const API_MODEL_ID = "gemini-2.0-flash"; // Example model
const API_METHOD = "generateContent"; // Or streamGenerateContent

// --- Authentication --- (Remains the same)
function getAuthToken(interactive) {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
            if (chrome.runtime.lastError) {
                console.error(`getAuthToken Error: ${chrome.runtime.lastError.message}`);
                reject(chrome.runtime.lastError);
            } else if (!token) {
                reject(new Error("Failed to retrieve auth token silently."));
            } else {
                console.log("OAuth token obtained successfully.");
                resolve(token);
            }
        });
    });
}

// --- HTML Playbook Processing --- (Remains the same as previous HTML version)
/**
 * Parses the HTML text and extracts structured playbook data.
 * !!! THIS FUNCTION MUST BE CUSTOMIZED BASED ON YOUR HTML STRUCTURE !!!
 */
function extractPlaybookDataFromHtml(htmlText) {
    console.log("Attempting to parse HTML playbook content...");
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const extractedData = [];

        // --- !!! CUSTOMIZATION REQUIRED BELOW !!! ---
        // Add your specific parsing logic here based on your HTML structure
        // (using doc.querySelectorAll, etc.) See previous examples.
        // Example: Extracting from <div class="problem"> and <div class="solution">
        /*
        const problemElements = doc.querySelectorAll('.problem');
        problemElements.forEach(problemEl => {
          const solutionEl = problemEl.nextElementSibling;
          if (solutionEl && solutionEl.classList.contains('solution')) {
            extractedData.push({
              problem: problemEl.textContent.trim(),
              solution: solutionEl.textContent.trim()
            });
          }
        });
        */
        // --- Add your logic above ---

        if (extractedData.length === 0) {
            console.warn("Could not extract any structured data from the HTML playbook. Check selectors and HTML structure.");
            return [];
        }

        console.log(`Successfully extracted ${extractedData.length} items from HTML playbook.`);
        return extractedData; // Return the structured data

    } catch (e) {
        console.error("Error parsing HTML playbook:", e);
        return [];
    }
}


// --- Gemini API Call --- (Updated to construct URL dynamically)

// Async function to call the Gemini API endpoint.
// Takes auth token, page content, playbook data, and project ID.
async function callGeminiApi(authToken, pageContent, playbookData, projectId) {
    console.log("Initiating callGeminiApi function...");

    // --- Dynamically Construct API URL ---
    if (!projectId) {
        console.error("Project ID is missing. Cannot construct API URL.");
        throw new Error("Google Cloud Project ID is not configured or retrieved.");
    }

    // Construct the URL using retrieved projectId and constants
    const apiUrl = `https://${API_REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${API_REGION}/publishers/google/models/${API_MODEL_ID}:${API_METHOD}`;

    console.log(`Constructed Gemini API URL: ${apiUrl}`);

    // Adjust the prompt to work with the structured playbook data (same as before)
    let playbookPromptSection = "No playbook rules extracted or provided.";
    if (playbookData && Array.isArray(playbookData) && playbookData.length > 0) {
        playbookPromptSection = "Analyze the web page content based on these rules:\n";
        playbookData.forEach((rule, index) => {
            playbookPromptSection += `${index + 1}. Problem: ${rule.problem}\n   Solution: ${rule.solution}\n`;
        });
    } else {
        console.warn("Playbook data is empty or not in expected format for Gemini prompt.");
    }

    const prompt = `You are an assistant analyzing web page content for potential issues based on a provided playbook.

Playbook content:
${playbookPromptSection}

Now, examine the following web page content (excerpt). Summarize the problem and suggest the corresponding solutions from the playbook. Be concise and focus only on matches found.

Web Page Content (excerpt):
${pageContent.substring(0, 8000)} HLT_END`;

    try {
        console.log(`Workspaceing from Gemini API endpoint: ${apiUrl}`);
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // Payload structure (Ensure matches API requirements)
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }],
                // generationConfig: { ... },
                // safetySettings: [ ... ]
            })
        });

        console.log(`Gemini API response status: ${response.status} ${response.statusText}`);
        const responseText = await response.text();

        if (!response.ok) {
            console.error("Gemini API request failed. Response status:", response.status, "Response text:", responseText);
            try {
                const errorJson = JSON.parse(responseText);
                throw new Error(`Gemini API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorJson.error?.message || errorJson)}`);
            } catch (e) {
                throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}. Response body: ${responseText.substring(0, 500)}`);
            }
        }

        // Try to parse the successful response text as JSON (same as before)
        try {
            console.log("Gemini API request successful. Attempting to parse JSON response...");
            const result = JSON.parse(responseText);
            console.log("Gemini API Raw Parsed Response:", result);
            const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis generated or unexpected response structure.";
            return { analysis: analysisText };
        } catch (e) {
            console.error("Failed to parse successful Gemini API response as JSON. Received text:", responseText);
            throw new Error(`Gemini API response was successful (status ${response.status}) but is not valid JSON: ${e.message}`);
        }

    } catch (error) {
        console.error("Error occurred during callGeminiApi function:", error);
        throw error;
    }
}


// --- Event Listeners --- (Updated to fetch projectId)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzePage") {
        console.log("Background script received 'analyzePage' message.");
        let token;
        let playbookHtmlText;
        let settings; // To hold both playbookUrl and projectId

        getAuthToken(true)
            .then(retrievedToken => {
                token = retrievedToken;
                console.log("Authentication token retrieved.");
                // Get BOTH playbookUrl and projectId from storage
                return chrome.storage.sync.get(['playbookUrl', 'projectId']); // Fetch both items
            })
            .then(retrievedSettings => {
                settings = retrievedSettings; // Store settings
                // Check if settings were retrieved and are valid
                if (!settings || !settings.playbookUrl) {
                    throw new Error("Playbook URL is not set. Please configure it in the extension options.");
                }
                if (!settings.projectId) {
                    throw new Error("Google Cloud Project ID is not set. Please configure it in the extension options.");
                }

                console.log(`Workspaceing playbook content (expecting HTML) from URL: ${settings.playbookUrl}`);
                console.log(`Using Project ID: ${settings.projectId}`);
                // Fetch the content from the playbook URL
                return fetch(settings.playbookUrl);
            })
            .then(response => { // Handle playbook fetch response (same as before)
                console.log(`Playbook fetch response status: ${response.status} ${response.statusText}`);
                if (!response.ok) {
                    return response.text().then(text => {
                        console.error(`Playbook fetch failed. Status: ${response.status}. Response text:`, text.substring(0, 500));
                        throw new Error(`Failed to fetch playbook: ${response.status} ${response.statusText}. Check console for details.`);
                    });
                }
                return response.text();
            })
            .then(fetchedHtmlText => { // Handle the raw HTML text
                playbookHtmlText = fetchedHtmlText; // Store HTML text
                // Process the HTML text to extract structured data
                const structuredPlaybookData = extractPlaybookDataFromHtml(playbookHtmlText);

                if (!structuredPlaybookData || (Array.isArray(structuredPlaybookData) && structuredPlaybookData.length === 0)) {
                    console.warn("Proceeding to call Gemini without structured playbook rules as extraction failed or returned empty.");
                }

                // Proceed to call Gemini API, passing the projectId from settings
                return callGeminiApi(token, request.pageContent, structuredPlaybookData, settings.projectId);
            })
            .then(analysisResult => {
                console.log("Analysis complete, sending result back to sender.");
                sendResponse({ success: true, result: analysisResult });
            })
            .catch(error => {
                console.error("Error during 'analyzePage' workflow:", error);
                sendResponse({ success: false, error: error.message || "An unknown error occurred." });
            });

        return true; // Indicate asynchronous response
    }
});

// Listener for install/update (Remains the same)
chrome.runtime.onInstalled.addListener((details) => {
    console.log(`Extension installed or updated. Reason: ${details.reason}`);
    if (details.reason === 'install') {
        // Could potentially open options page on first install
        // chrome.runtime.openOptionsPage();
        console.log("Extension installed. Remember to set the Playbook URL and Project ID in the options.");
    }
});

console.log("Background service worker script loaded (HTML playbook, dynamic API URL).");