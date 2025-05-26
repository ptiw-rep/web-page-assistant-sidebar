// Background script for the Chrome extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Page Chat Assistant extension installed');
  // Open side panel by default
  chrome.sidePanel.setOptions({
    enabled: true,
    path: 'sidebar.html'
  });

  // Create context menu items
  chrome.contextMenus.create({
    id: 'correct-grammar',
    title: 'Correct Grammar',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'translate',
    title: 'Translate to',
    contexts: ['selection']
  });

  // Create translation submenu items
  const languages = {
    'ko': 'Korean',
    'en': 'English',
    'zh': 'Chinese'
  };

  Object.entries(languages).forEach(([code, language]) => {
    chrome.contextMenus.create({
      id: `translate-${code}`,
      parentId: 'translate',
      title: language,
      contexts: ['selection']
    });
  });
});

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel when extension icon is clicked
  if (tab.url.startsWith('chrome://')) {
    console.log('Cannot open side panel on chrome:// pages');
    return;
  }
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;
  let action = '';
  let targetLang = '';

  if (info.menuItemId === 'correct-grammar') {
    action = 'grammar';
  } else if (info.menuItemId.startsWith('translate-')) {
    action = 'translate';
    targetLang = info.menuItemId.split('-')[1];
  }

  // Store the context in local storage for the sidebar to access
  chrome.storage.local.set({
    contextAction: {
      action,
      text: selectedText,
      targetLang,
      timestamp: Date.now()
    }
  });

  // Open the sidebar
  chrome.windows.get(tab.windowId, { populate: true }, (window) => {
    chrome.sidePanel.open({ windowId: window.id });
  });
});

// Message handling between components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROCESS_PAGE') {
    console.log('Received page content for processing');
    sendResponse({ success: true });
    return true;
  }
});