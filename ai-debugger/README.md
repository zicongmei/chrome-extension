# Playbook Problem Solver - Chrome Extension

## Overview / Purpose

This Chrome extension helps users analyze the content of their current webpage against a predefined "playbook". The playbook, hosted as an HTML document at a specified URL, contains information about potential problems and their corresponding solutions or relevant instructions.

The extension uses Google's Gemini AI (via the Vertex AI API) to understand the context of the current page and compare it against the rules or information extracted from the HTML playbook. It then presents potential problems and solutions found in the extension's popup window.

Authentication with Google Cloud Platform (GCP) is handled securely using OAuth 2.0, leveraging the user's logged-in Chrome session, eliminating the need to embed sensitive API keys within the extension.

## How It Works (Simplified Flow)

1.  **User Action:** The user clicks the extension icon on a webpage they want to analyze.
2.  **Get Page Content:** The popup injects a content script to extract text from the current page.
3.  **Trigger Analysis:** The popup sends the page content to the background script.
4.  **Authentication:** The background script requests a GCP OAuth token using `chrome.identity`. The user might see a Google consent screen the first time.
5.  **Fetch & Parse Playbook:** The background script fetches the HTML playbook from the URL configured in the options. It then parses this HTML to extract relevant rules/information (***requires custom parsing logic***).
6.  **Call Gemini:** The background script sends the current page content and the extracted playbook data to the Gemini API (Vertex AI), asking it to identify relevant problems/solutions.
7.  **Display Results:** The background script receives the analysis from Gemini and sends it back to the popup, which displays the results to the user.

## Prerequisites

* **Google Chrome Browser:** The extension is built for Chrome.
* **Google Account:** Needed for authentication via OAuth 2.0.
* **Google Cloud Platform (GCP) Project:**
    * A GCP project is required to enable APIs and create OAuth credentials.
    * **Billing Enabled:** The Vertex AI API (used for Gemini) is a paid service. You need billing enabled on your GCP project. Be mindful of potential costs associated with API usage.
    * **Vertex AI API Enabled:** You must enable the "Vertex AI API" within your GCP project.

## Setup Instructions

### 1. Google Cloud Project & OAuth Setup

*(Perform these steps in the Google Cloud Console: https://console.cloud.google.com/)*

1.  **Create/Select GCP Project:** Choose an existing project or create a new one. Ensure billing is enabled if you haven't already.
2.  **Enable Vertex AI API:**
    * Navigate to "APIs & Services" > "Library".
    * Search for "Vertex AI API" and click "Enable".
3.  **Configure OAuth Consent Screen:**
    * Navigate to "APIs & Services" > "OAuth consent screen".
    * Choose "External" (unless for a specific Workspace org).
    * Fill in the required app name (e.g., "Playbook Solver Extension"), user support email, and developer contact email.
    * **Scopes:** Click "Add or Remove Scopes". Add the following scopes:
        * `https://www.googleapis.com/auth/userinfo.email` (or `openid`)
        * `https://www.googleapis.com/auth/cloud-platform` (This grants broad access to GCP services, including Vertex AI. You could potentially use more granular scopes if identified.)
    * Save the scopes configuration.
    * **Test Users:** Add your Google account email address(es) to the list of test users while the app is in testing status.
    * Save the consent screen configuration.
4.  **Create OAuth Client ID:**
    * Navigate to "APIs & Services" > "Credentials".
    * Click "+ CREATE CREDENTIALS" > "OAuth client ID".
    * **Application type:** Select **"Chrome app"**.
    * **Name:** Give it a descriptive name (e.g., "Playbook Solver Chrome Client").
    * **Application ID:** You will fill this in *after* loading the extension in Chrome for the first time (see next section). For now, you might need to enter a temporary value or leave it blank if allowed, then come back and edit it.
    * Click **"Create"**.
5.  **Copy Client ID:** After creation, copy the generated **Client ID** (looks like `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`).

### 2. Extension Installation & Configuration

1.  **Get Extension Code:** Download or clone the extension files to a local folder.
2.  **Update `manifest.json`:**
    * Open the `manifest.json` file in a text editor.
    * Find the `oauth2` section.
    * Paste the **Client ID** you copied from GCP into the `client_id` field.
    * Ensure the `scopes` listed match those you configured on the consent screen.
    * Save the file.
3.  **Load Extension in Chrome:**
    * Open Chrome and navigate to `chrome://extensions`.
    * Enable **"Developer mode"** using the toggle in the top-right corner.
    * Click the **"Load unpacked"** button.
    * Select the **folder** containing the extension's files (including the `manifest.json`).
    * The "Playbook Problem Solver" extension should appear in the list.
4.  **Link Extension ID to GCP Client ID:**
    * On the `chrome://extensions` page, find the newly loaded extension. Note its **ID** (a long string of letters). **Copy this ID.**
    * Go back to the **Google Cloud Console** > APIs & Services > Credentials.
    * Click the **pencil icon (Edit)** next to the "Chrome app" Client ID you created earlier.
    * Paste the **Extension ID** you just copied from Chrome into the **"Application ID"** field.
    * Click **"Save"** in the GCP Console.
5.  **Configure Extension Options:**
    * Find the "Playbook Problem Solver" icon in your Chrome toolbar (it might be under the puzzle piece icon).
    * **Right-click** the icon and select **"Options"**.
    * In the options page:
        * Enter the URL for your HTML **Playbook URL**.
        * Enter your **Google Cloud Project ID**.
        * Click **"Save Settings"**.

## Example Usage: Ask Ubuntu iptables

This example demonstrates how you could *theoretically* use an Ask Ubuntu question page as a playbook to analyze another related question page.

1.  **Set Playbook URL:**
    * Go to the extension's **Options** page.
    * Set the **Playbook URL** to: `https://askubuntu.com/questions/692278/how-to-install-iptables-in-ubuntu`
    * Enter your **Google Cloud Project ID**.
    * Click **"Save Settings"**.

2.  **Navigate to Problem Page:**
    * Open this page in a new Chrome tab: `https://askubuntu.com/questions/504351/the-program-iptables-is-currently-not-installed`

3.  **Run Analysis:**
    * Click the "Playbook Problem Solver" extension icon in your toolbar.
    * Click the **"Analyze This Page"** button.
    * The first time, you will likely see a Google sign-in/consent screen pop up. Review the permissions and click **"Allow"**.

4.  **Expected Outcome (with caveats):**
    * The extension popup should display an analysis generated by Gemini.
    * Ideally, Gemini (guided by the playbook content) would identify that the current page discusses `iptables` not being installed and suggest solutions extracted from the playbook page, such as the command `sudo apt-get update && sudo apt-get install iptables`.

5.  **!!! IMPORTANT NOTE ON HTML PARSING !!!**
    * The accuracy of this example heavily depends on the **HTML parsing logic** within the `extractPlaybookDataFromHtml` function in `background.js`.
    * The current code contains only placeholder examples for parsing. **You MUST customize this function** to correctly navigate the specific DOM structure of Ask Ubuntu pages (or whatever HTML structure your playbook uses) and extract the relevant commands, problem descriptions, or solution text.
    * Without customization, the extension might send poorly structured or irrelevant data from the playbook page to Gemini, leading to weak or incorrect analysis results.

## Customization

The core area for customization is the `extractPlaybookDataFromHtml` function in `background.js`. You need to add JavaScript code using DOM manipulation methods (like `doc.querySelectorAll`, `element.textContent`, etc.) to accurately parse your specific HTML playbook format.