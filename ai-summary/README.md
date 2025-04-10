# Gemini Page Summarizer (OAuth) Chrome Extension

This Chrome extension summarizes the text content of the current webpage using the Google Gemini large language model accessed via the Google Cloud Vertex AI API. It uses OAuth 2.0 for authentication, meaning it leverages your logged-in Google account instead of requiring a separate API key.

## Features

* Summarizes web page content with one click.
* Uses Google Sign-In (OAuth 2.0) for secure authentication via `chrome.identity`.
* Configurable Google Cloud Project ID via the extension's options page.
* Calls the Vertex AI API to access Gemini models (e.g., `gemini-2.0-flash`).

## Prerequisites

* Google Chrome browser.
* A Google Account.
* A Google Cloud Platform (GCP) Project with billing enabled (Vertex AI usage may incur costs).
* The source code files for this extension (`manifest.json`, `popup.html`, `popup.js`, `options.html`, `options.js`, `content_script.js`, `images/` folder).

## Setup Instructions

This setup involves two main parts: configuring GCP and setting up the extension locally.

### Part 1: Google Cloud Platform (GCP) Configuration

You need to configure GCP to allow this extension to make requests to the Vertex AI API on your behalf.

1.  **Select or Create a GCP Project:**
    * Go to the [Google Cloud Console](https://console.cloud.google.com/).
    * Select an existing project or create a new one. Make sure billing is enabled for this project.
    * **Note down your Project ID.** You'll need it later for the extension options. Your Project ID is a unique string, often like `your-project-name-123456`.

2.  **Enable the Vertex AI API:**
    * In the Cloud Console, navigate to **APIs & Services -> Library**.
    * Search for "Vertex AI API".
    * Select it and click **Enable**.

3.  **Configure the OAuth Consent Screen:**
    * Navigate to **APIs & Services -> OAuth consent screen**.
    * Choose **User Type:** Select **External** (unless you are a Google Workspace user and want internal only). Click **Create**.
    * Fill in the required information:
        * **App name:** `Gemini Summarizer Extension` (or similar)
        * **User support email:** Your email address.
        * **Developer contact information:** Your email address.
    * Click **Save and Continue**.
    * **Scopes:** Click **Add or Remove Scopes**. Select **Manually Add Scopes** (you might need to scroll down or look carefully for this option). In the box that appears, paste the following scope and press Enter or click Add to table:
        ```
        [https://www.googleapis.com/auth/cloud-platform](https://www.googleapis.com/auth/cloud-platform)
        ```
        * *Note: This is a broad scope required for Vertex AI. Be aware of the permissions you are granting.*
    * Click **Update**. Then click **Save and Continue**.
    * **Test users:** Add your own Google account email address as a test user. Click **Add**, then **Save and Continue**.
    * Review the summary and click **Back to Dashboard**. You do *not* need to submit for verification for personal use with only test users.

4.  **Load the Extension Temporarily (to get its ID):**
    * Open Chrome and navigate to `chrome://extensions`.
    * Enable **Developer mode** using the toggle in the top-right corner.
    * Click **Load unpacked**.
    * Select the local folder containing the extension's files (`manifest.json`, etc.).
    * The extension will load. Find its card and **copy the 32-character Extension ID** displayed on it (e.g., `abcdefghijklmnopqrstuvwxyzabcdef`). You need this for the next step.

5.  **Create OAuth 2.0 Client ID:**
    * Go back to the GCP Console. Navigate to **APIs & Services -> Credentials**.
    * Click **+ Create Credentials** -> **OAuth client ID**.
    * **Application type:** Select **Chrome App**.
    * **Name:** Enter a name, e.g., `Gemini Summarizer Extension Client`.
    * **Application ID:** **Paste the Chrome Extension ID** you copied in the previous step.
    * Click **Create**.
    * A popup will show your **Client ID**. **Copy this Client ID** (ends with `.apps.googleusercontent.com`). You need this for the `manifest.json` file. Click **OK**.

### Part 2: Chrome Extension Setup

Now, configure the extension code and load it properly in Chrome.

1.  **Add Client ID to `manifest.json`:**
    * Open the `manifest.json` file from the extension's source code folder in a text editor.
    * Find the `oauth2` section:
        ```json
        "oauth2": {
          "client_id": "YOUR_OAUTH_CLIENT_ID_FROM_GOOGLE_CLOUD.apps.googleusercontent.com", // <<< REPLACE THIS
          "scopes": [
            "[https://www.googleapis.com/auth/cloud-platform](https://www.googleapis.com/auth/cloud-platform)"
          ]
        },
        ```
    * **Replace** the placeholder value for `client_id` with the actual **Client ID** you copied from the GCP Credentials page.
    * Save the `manifest.json` file.

2.  **Load/Reload the Extension:**
    * Go back to `chrome://extensions`.
    * If you still have the extension loaded from step 4 of Part 1, click the **Reload** icon (circular arrow) on its card.
    * If you removed it or are loading for the first time *after* editing `manifest.json`, click **Load unpacked** and select the extension's folder again.

3.  **Configure Extension Options:**
    * Find the "Gemini Page Summarizer (OAuth)" extension icon in your Chrome toolbar (it might be inside the puzzle piece Extensions menu).
    * **Right-click** the icon and select **Options**.
    * A new tab will open asking for the "Google Cloud Project ID".
    * **Paste your GCP Project ID** (the one you noted down in step 1 of Part 1) into the input field.
    * Click **Save Project ID**. You should see a confirmation message.

## Usage

1.  Navigate to a webpage you want to summarize (must start with `http://` or `https://`).
2.  Click the "Gemini Page Summarizer (OAuth)" icon in your Chrome toolbar.
3.  Click the **Summarize** button in the popup.
4.  **First Time Only:** A Google consent screen popup will appear asking you to grant the extension permission to access the "Google Cloud Platform" scope you configured. Review the request and click **Allow**.
5.  The popup will show "Processing..." and then display the summary returned by the Vertex AI Gemini model.

## Notes and Disclaimers

* **Costs:** Using the Vertex AI API can incur costs on your Google Cloud Platform bill, depending on usage volume and the specific Gemini model used. Monitor your billing.
* **Content Extraction:** This extension uses a basic method (`document.body.innerText`) to extract page content. It may include unwanted text like navigation menus, ads, or footers, which could affect summary quality.
* **Permissions:** Granting the `cloud-platform` scope is powerful. Ensure you understand the permissions you are granting via the OAuth consent screen. This extension *only* uses it to call the Vertex AI prediction endpoint.
* **Error Handling:** Error handling is basic. Network issues, invalid configurations, or API errors might result in generic error messages. Check the popup's console (Right-click popup -> Inspect -> Console) for more details if needed.