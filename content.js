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
    const selection = window.getSelection();
    return selection.toString();
}

// Enhanced text selection styling
const style = document.createElement('style');
style.textContent = `
    .gemini-nano-highlight {
        background: linear-gradient(120deg, #e8f0fe 0%, #d2e3fc 100%) !important;
        border-radius: 4px !important;
        padding: 2px 4px !important;
        border: 1px solid #1a73e8 !important;
        box-shadow: 0 2px 4px rgba(26, 115, 232, 0.2) !important;
        transition: all 0.3s ease !important;
    }
    
    .gemini-nano-highlight:hover {
        background: linear-gradient(120deg, #d2e3fc 0%, #bbd6fa 100%) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px rgba(26, 115, 232, 0.3) !important;
    }
`;
document.head.appendChild(style);

// Add selection enhancement
document.addEventListener('mouseup', function() {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    if (selectedText.length > 10) {
        // Could add visual feedback for longer selections
        console.log('Text selected for Gemini Nano:', selectedText.substring(0, 50) + '...');
    }
});