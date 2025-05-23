// Background script for the Chrome extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Page Chat Assistant extension installed');
  // Open side panel by default
  chrome.sidePanel.setOptions({
    enabled: true,
    path: 'sidebar.html'
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

// Message handling between components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROCESS_PAGE') {
    console.log('Received page content for processing');
    sendResponse({ success: true });
    return true;
  }
});