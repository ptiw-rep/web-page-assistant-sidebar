// Content script that runs in the context of web pages

console.log('Page Chat Assistant content script loaded');

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_CONTENT') {
    // Get the page HTML
    const pageContent = document.documentElement.outerHTML;
    
    // Send back the page content
    sendResponse({ pageContent });
  }
  
  // TODO: Open for Extension if we want to inject Scipt
  // if (message.type === 'MODIFY_PAGE') {
  //   console.log('Received page modification request:', message.modifications);
  //   sendResponse({ success: true });
  // }
  
  return true;
});