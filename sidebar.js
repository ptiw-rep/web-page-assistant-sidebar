document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const startScreen = document.getElementById('start-screen');
  const loadingScreen = document.getElementById('loading-screen');
  const chatScreen = document.getElementById('chat-screen');
  const contextContainer = document.getElementById('context-container');
  const chatContainer = document.getElementById('chat-container');
  const startBtn = document.getElementById('start-btn');
  const newChatBtn = document.getElementById('new-chat-btn');
  const toggleSummaryBtn = document.getElementById('toggle-summary-btn');
  const summaryContainer = document.getElementById('summary-container');
  const summaryContent = document.getElementById('summary-content');
  const messages = document.getElementById('messages');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const pageFavicon = document.getElementById('page-favicon');
  const pageTitle = document.getElementById('page-title');
  const loadingStatus = document.getElementById('loading-status');
  const selectedTextElement = document.getElementById('selected-text');
  const processedTextElement = document.getElementById('processed-text');
  const reprocessBtn = document.getElementById('reprocess-btn');
  const inputContainer = document.getElementById('input-container');

  // API Configuration
  const API_BASE_URL = 'http://localhost:8000';

  // State
  let chatHistory = [];
  let pageData = {
    title: '',
    url: '',
    favicon: '',
    html: '',
    token: null
  };
  let pageSummary = '';
  let currentAction = '';
  let currentTargetLang = '';

  // Summary resize functionality
  let isResizingSummary = false;
  let initialY;
  let initialHeight;

  const summaryResizeHandle = document.querySelector('.summary-resize-handle');
  if (summaryResizeHandle) {
    summaryResizeHandle.addEventListener('mousedown', (e) => {
      isResizingSummary = true;
      initialY = e.clientY;
      initialHeight = summaryContainer.offsetHeight;
      
      const handleMouseMove = (e) => {
        if (!isResizingSummary) return;
        const newHeight = initialHeight + (e.clientY - initialY);
        const maxHeight = chatScreen.offsetHeight / 2;
        summaryContainer.style.height = `${Math.max(48, Math.min(maxHeight, newHeight))}px`;
      };
      
      const handleMouseUp = () => {
        isResizingSummary = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  }

  // Check for context menu action
  const checkContextAction = async () => {
    const { contextAction } = await chrome.storage.local.get('contextAction');
    if (contextAction) {
      const isNewAction = Date.now() - contextAction.timestamp < 1000;
      
      if (isNewAction) {
        if (chatScreen) chatScreen.classList.add('active');
        if (startScreen) startScreen.classList.remove('active');
        if (loadingScreen) loadingScreen.classList.remove('active');
        
        if (chatContainer) chatContainer.style.display = 'none';
        if (contextContainer) contextContainer.style.display = 'block';
        if (inputContainer) inputContainer.style.display = 'none';

        const { action, text, targetLang } = contextAction;
        currentAction = action;
        currentTargetLang = targetLang;
        
        if (selectedTextElement) {
          selectedTextElement.textContent = text;
        }

        try {
          await processText(text, action, targetLang);
        } catch (error) {
          console.error('Error processing text:', error);
          if (processedTextElement) {
            processedTextElement.textContent = 'Error processing text. Please try again.';
          }
        }

        await chrome.storage.local.remove('contextAction');
      }
    } else if (!chatScreen.classList.contains('active')) {
      showScreen(startScreen);
    }
  };

  // Process text based on action
  const processText = async (text, action, targetLang) => {
    try {
      let response;
      if (action === 'grammar') {
        response = await fetch(`${API_BASE_URL}/correct-grammar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
      } else if (action === 'translate') {
        response = await fetch(`${API_BASE_URL}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLang })
        });
      }

      const data = await response.json();
      if (processedTextElement) {
        processedTextElement.textContent = action === 'grammar' ? data.corrected : data.translated;
      }
    } catch (error) {
      throw error;
    }
  };

  // Reprocess text
  if (reprocessBtn) {
    reprocessBtn.addEventListener('click', async () => {
      const newText = selectedTextElement.textContent;
      try {
        await processText(newText, currentAction, currentTargetLang);
      } catch (error) {
        console.error('Error reprocessing text:', error);
        processedTextElement.textContent = 'Error processing text. Please try again.';
      }
    });
  }

  // Functions
  const showScreen = (screen) => {
    [startScreen, loadingScreen, chatScreen].forEach(s => {
      if (s) s.classList.remove('active');
    });
    if (screen) screen.classList.add('active');
  };

  const updatePageInfo = () => {
    if (pageFavicon && pageData.favicon) {
      pageFavicon.src = pageData.favicon;
    }
    if (pageTitle) {
      pageTitle.textContent = pageData.title || 'Current Page';
    }
  };

  const toggleSummary = () => {
    if (summaryContainer) {
      summaryContainer.classList.toggle('collapsed');
      const icon = toggleSummaryBtn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
      }
    }
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const addMessage = (content, sender) => {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message', sender);
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.innerHTML = marked.parse(content);
    
    const messageTime = document.createElement('div');
    messageTime.classList.add('message-time');
    messageTime.textContent = formatTime();
    
    messageEl.appendChild(messageContent);
    messageEl.appendChild(messageTime);
    
    if (messages) {
      messages.appendChild(messageEl);
      messages.scrollTop = messages.scrollHeight;
    }
    
    chatHistory.push({ content, sender, timestamp: new Date() });
  };

  const uploadHtml = async (html) => {
    const response = await fetch(`${API_BASE_URL}/upload_html/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload HTML');
    }
    
    const data = await response.json();
    return data.token;
  };

  const getPageSummary = async (token) => {
    const response = await fetch(`${API_BASE_URL}/get_summary/${token}`);
    
    if (!response.ok) {
      throw new Error('Failed to get summary');
    }
    
    const data = await response.json();
    return data.summary;
  };

  const askQuestion = async (token, question) => {
    const response = await fetch(`${API_BASE_URL}/ask/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, question }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get answer');
    }
    
    const data = await response.json();
    return data.answer;
  };

  const startChat = async () => {
    showScreen(loadingScreen);
    if (chatContainer) chatContainer.style.display = 'flex';
    if (contextContainer) contextContainer.style.display = 'none';
    if (inputContainer) inputContainer.style.display = 'block';
    
    try {
      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      pageData.title = tab.title;
      pageData.url = tab.url;
      pageData.favicon = tab.favIconUrl;
      
      // Get HTML content from the current tab
      if (loadingStatus) loadingStatus.textContent = "Fetching page content...";
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => document.documentElement.outerHTML
      });
      
      pageData.html = result;
      
      // Upload HTML and get token
      if (loadingStatus) loadingStatus.textContent = "Processing page content...";
      pageData.token = await uploadHtml(pageData.html);
      
      // Generate summary of the page
      pageSummary = await getPageSummary(pageData.token);
      if (summaryContent) summaryContent.innerHTML = marked.parse(pageSummary);
      
      // Set initial summary container height
      if (summaryContainer) summaryContainer.style.height = '150px';
      
      // Update page info in the chat header
      updatePageInfo();
      
      // Show welcome message
      setTimeout(() => {
        showScreen(chatScreen);
        addMessage("I've analyzed this page. How can I help you with it today?", "ai");
      }, 500);
      
    } catch (error) {
      console.error("Error starting chat:", error);
      if (loadingStatus) loadingStatus.textContent = "Error starting chat. Please try again.";
      setTimeout(() => showScreen(startScreen), 2000);
    }
  };

  const handleSendMessage = async () => {
    const message = userInput.value.trim();
    if (!message || !pageData.token) return;
    
    addMessage(message, "user");
    userInput.value = "";
    if (sendBtn) sendBtn.disabled = true;
    
    try {
      const aiResponse = await askQuestion(pageData.token, message);
      addMessage(aiResponse, "ai");
    } catch (error) {
      console.error("Error getting AI response:", error);
      addMessage("Sorry, I encountered an error processing your request.", "ai");
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      if (userInput) userInput.focus();
    }
  };

  // Event Listeners
  if (startBtn) startBtn.addEventListener('click', startChat);
  if (toggleSummaryBtn) toggleSummaryBtn.addEventListener('click', toggleSummary);
  
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      if (messages) messages.innerHTML = '';
      chatHistory = [];
      pageData.token = null;
      if (chatContainer) chatContainer.style.display = 'flex';
      if (contextContainer) contextContainer.style.display = 'none';
      if (inputContainer) inputContainer.style.display = 'block';
      showScreen(startScreen);
    });
  }
  
  if (userInput) {
    userInput.addEventListener('input', () => {
      if (sendBtn) sendBtn.disabled = !userInput.value.trim();
      userInput.style.height = 'auto';
      userInput.style.height = userInput.scrollHeight + 'px';
    });
    
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (sendBtn && !sendBtn.disabled) {
          handleSendMessage();
        }
      }
    });
  }
  
  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }

  // Initialize
  await checkContextAction();

  // Listen for storage changes to handle new context menu actions
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.contextAction) {
      checkContextAction();
    }
  });
});