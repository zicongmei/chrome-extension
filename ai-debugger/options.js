// options.js

const urlInput = document.getElementById('playbookUrl');
const projectIdInput = document.getElementById('projectId'); // Get the new input field
const saveButton = document.getElementById('saveButton');
const statusDiv = document.getElementById('status');

// Function to save options
function saveOptions() {
    const url = urlInput.value;
    const projectId = projectIdInput.value.trim(); // Get and trim the project ID

    // Validation
    let errors = [];
    if (!url) {
        errors.push('Playbook URL is required.');
    } else {
        try {
            new URL(url); // Check if it's a parseable URL
        } catch (_) {
            errors.push('Invalid Playbook URL format.');
        }
    }

    if (!projectId) {
        errors.push('Google Cloud Project ID is required.');
    }
    // Basic check for likely invalid project ID format (too simple, but catches empty spaces)
    if (projectId.includes(' ')) {
        errors.push('Project ID cannot contain spaces.');
    }


    if (errors.length > 0) {
        statusDiv.textContent = 'Error: ' + errors.join(' ');
        statusDiv.style.color = 'red';
        return;
    }

    // Save both values
    chrome.storage.sync.set(
        {
            playbookUrl: url,
            projectId: projectId
        },
        () => {
            // Update status to let user know options were saved.
            statusDiv.textContent = 'Options saved successfully.';
            statusDiv.style.color = 'green';
            console.log("Options saved:", { playbookUrl: url, projectId: projectId });
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 2000); // Clear status message after 2 seconds
        }
    );
}

// Function to restore options
function restoreOptions() {
    // Use default values playbookUrl = '', projectId = ''
    chrome.storage.sync.get(
        {
            playbookUrl: '',
            projectId: ''
        },
        (items) => {
            urlInput.value = items.playbookUrl;
            projectIdInput.value = items.projectId; // Restore project ID
            console.log("Restored options:", items);
        }
    );
}

// Add event listeners
document.addEventListener('DOMContentLoaded', restoreOptions);
saveButton.addEventListener('click', saveOptions);