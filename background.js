chrome.runtime.onInstalled.addListener(() => {
  console.log('Gemini Nano Assistant installed');
  
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => console.log('Side panel behavior set'))
    .catch(error => console.error('Error setting side panel:', error));

  createContextMenus();
});

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked, opening side panel');
});

function createContextMenus() {
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

  chrome.contextMenus.create({
    id: "analyzeImage",
    title: "🖼️ Analyze Image with AI",
    contexts: ["image"]
  });
}

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
  }, async () => {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      console.log('Side panel opened for context menu action');
    } catch (error) {
      console.error('Error opening side panel:', error);
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidePanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId });
      }
    });
  }
  
  if (request.action === 'getSelectedText') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => window.getSelection().toString()
        }, (results) => {
          sendResponse({ text: results[0].result });
        });
      }
    });
    return true;
  }
});