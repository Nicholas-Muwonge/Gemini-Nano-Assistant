// Service Worker for Gemini Nano Assistant

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('Gemini Nano Assistant installed');
    
    // Create parent context menu
    chrome.contextMenus.create({
        id: "geminiNanoParent",
        title: "Gemini Nano Assistant",
        contexts: ["selection"]
    });

    // Create child menu items
    const menuItems = [
        {
            id: "summarize",
            title: "📋 Summarize Selection",
            contexts: ["selection"]
        },
        {
            id: "rewrite", 
            title: "✍️ Rewrite Selection",
            contexts: ["selection"]
        },
        {
            id: "translate",
            title: "🌐 Translate Selection",
            contexts: ["selection"]
        },
        {
            id: "proofread",
            title: "✓ Proofread Selection",
            contexts: ["selection"]
        }
    ];

    menuItems.forEach(item => {
        chrome.contextMenus.create({
            id: item.id,
            parentId: "geminiNanoParent",
            title: item.title,
            contexts: item.contexts
        });
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    const selectedText = info.selectionText;
    
    if (!selectedText || selectedText.trim().length === 0) {
        return;
    }

    // Store the selected text and action for the popup
    chrome.storage.local.set({
        pendingAction: {
            action: info.menuItemId,
            text: selectedText
        }
    }, () => {
        // Open the popup
        chrome.action.openPopup();
    });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // Just open the popup, selected text will be loaded automatically
    chrome.action.openPopup();
});