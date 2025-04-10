// options.js
// Handles saving and loading the Google Cloud Project ID

const projectIdInput = document.getElementById('projectIdInput'); // Make sure your options.html input has id="projectIdInput"
const saveButton = document.getElementById('saveButton');
const statusDiv = document.getElementById('status');

// Load the saved Google Cloud Project ID when the options page opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['gcpProjectId'], (result) => {
        if (result.gcpProjectId) {
            projectIdInput.value = result.gcpProjectId;
            statusDiv.textContent = 'Current Project ID loaded.';
            // Optional: Clear status after a delay
            setTimeout(() => { if (statusDiv.textContent === 'Current Project ID loaded.') statusDiv.textContent = ''; }, 2500);
        } else {
            statusDiv.textContent = 'Google Cloud Project ID not set.';
            // Optional: Clear status after a delay
            setTimeout(() => { if (statusDiv.textContent === 'Google Cloud Project ID not set.') statusDiv.textContent = ''; }, 2500);
        }
    });
});


// Save the Google Cloud Project ID when the save button is clicked
saveButton.addEventListener('click', () => {
    const projectId = projectIdInput.value.trim();
    if (projectId) {
        chrome.storage.sync.set({ gcpProjectId: projectId }, () => {
            // Check for errors during save
            if (chrome.runtime.lastError) {
                console.error("Error saving Project ID:", chrome.runtime.lastError);
                statusDiv.textContent = `Error saving: ${chrome.runtime.lastError.message}`;
                statusDiv.style.color = 'red';
            } else {
                console.log("Project ID saved:", projectId);
                statusDiv.textContent = 'Project ID saved successfully!';
                statusDiv.style.color = 'green';
                // Clear status after 2 seconds
                setTimeout(() => { statusDiv.textContent = ''; statusDiv.style.color = ''; }, 2000);
            }
        });
    } else {
        statusDiv.textContent = 'Please enter a valid Google Cloud Project ID.';
        statusDiv.style.color = 'orange';
        // Clear status after 2 seconds
        setTimeout(() => { statusDiv.textContent = ''; statusDiv.style.color = ''; }, 2000);
    }
});