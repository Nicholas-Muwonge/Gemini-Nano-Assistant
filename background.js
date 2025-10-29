chrome.runtime.onInstalled.addListener(() => {
    console.log('Gemini Nano Assistant installed');
    
    chrome.contextMenus.create({
        id: "geminiNanoParent",
        title: "Gemini Nano Assistant",
        contexts: ["selection"]
    });

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
        },
        {
            id: "expand",
            title: "📈 Expand Selection",
            contexts: ["selection"]
        },
        {
            id: "simplify",
            title: "💡 Simplify Selection",
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
    const selectedText = info.selectionText;
    
    if (!selectedText || selectedText.trim().length === 0) {
        return;
    }

    chrome.storage.local.set({
        pendingAction: {
            action: info.menuItemId,
            text: selectedText
        }
    }, () => {
        chrome.action.openPopup();
    });
});

chrome.action.onClicked.addListener((tab) => {
   chrome.sidePanel.open({ windowId: tab.windowId }); 
});
chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setOptions({
        path: 'sidebar.html',
        enabled: true
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSelectedText') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: () => window.getSelection().toString()
            }, (results) => {
                sendResponse({text: results[0].result});
            });
        });
        return true; // Will respond asynchronously
    }
    if (request.action === 'screenshotCaptured') {
         chrome.storage.local.set({ 
            pendingScreenshot: request.dataUrl 
        }, () => {
            chrome.action.openPopup();
        });
    }
});