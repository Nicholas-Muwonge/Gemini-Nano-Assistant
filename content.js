// Content script for Gemini Nano Assistant

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSelectedText') {
        const selectedText = getSelectedText();
        sendResponse({ text: selectedText });
    }
    return true;
});

// Function to get currently selected text
function getSelectedText() {
    return window.getSelection().toString();
}

// Inject styles for better selection visibility
const style = document.createElement('style');
style.textContent = `
    .gemini-nano-highlight {
        background-color: #e8f0fe !important;
        border-radius: 2px !important;
        padding: 2px 1px !important;
    }
`;
document.head.appendChild(style);