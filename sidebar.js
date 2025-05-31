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
  const inputContainer = document.getElementById('input-container');
  const clearChatBtn = document.getElementById('clear-chat-icon-btn');
  // clearChatBtn.className = 'icon-btn';
  // clearChatBtn.title = 'Clear Chat';
  // clearChatBtn.innerHTML = '<i class="fas fa-trash"></i>';

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
  let selectedContent = '';


  // Load chat history from local storage
  const loadChatHistory = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // const key = currentAction === 'interact' ? 
    //   `interact_history_${tab.url}_${selectedContent}` : 
    //   `chat_history_${tab.url}`;
    
    const key = `chat_history_${tab.url}`;

    const stored = await chrome.storage.local.get(key);
    chatHistory = stored[key] || [];
    
    // Render stored messages
    if (messages) {
      messages.innerHTML = '';
      chatHistory.forEach(msg => addMessage(msg.content, msg.sender, false));
    }
  };

  // Save chat history to local storage
  const saveChatHistory = async () => {
    
    if (currentAction === 'interact') {
      return; // No need to save interact history in this event
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // const key = currentAction === 'interact' ? 
    //   `interact_history_${tab.url}_${selectedContent}` : 
    //   `chat_history_${tab.url}`;
    
    const key = `chat_history_${tab.url}`;

    await chrome.storage.local.set({ [key]: chatHistory });
  };

  // Clear chat history
  const clearChat = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // const key = currentAction === 'interact' ? 
    //   `interact_history_${tab.url}_${selectedContent}` : 
    //   `chat_history_${tab.url}`;
    
    const key = `chat_history_${tab.url}`;

    await chrome.storage.local.remove(key);
    chatHistory = [];
    if (messages) messages.innerHTML = '';

    // Add initial message based on context
    // if (currentAction === 'interact') {
    //   addMessage("I'm ready to help you with the selected content. What would you like to know?", 'ai');
    // } else {
    //   addMessage("I've analyzed this page. How can I help you with it today?", "ai");
    // }
    addMessage("I've analyzed the content. How can I help you with it today?", "ai");
  };

  // Check for context menu action
  const checkContextAction = async () => {
    const { contextAction } = await chrome.storage.local.get('contextAction');
    if (contextAction) {
      const isNewAction = Date.now() - contextAction.timestamp < 1000;
      
      if (isNewAction) {
        if (chatScreen) chatScreen.classList.add('active');
        if (startScreen) startScreen.classList.remove('active');
        if (loadingScreen) loadingScreen.classList.remove('active');

        const { action, text, targetLang } = contextAction;
        currentAction = action;
        currentTargetLang = targetLang;
        selectedContent = text;

        if (action === 'interact') {
          if (chatContainer) chatContainer.style.display = 'flex';
          if (contextContainer) contextContainer.style.display = 'none';
          if (summaryContainer) {
            summaryContainer.style.display = 'none';
          }
          if (messages) {
            messages.innerHTML = '';
            // Add selected content as a special message
            const contentMessage = document.createElement('div');
            contentMessage.classList.add('message', 'selected-content');
            const contentDiv = document.createElement('div');
            contentDiv.classList.add('message-content', 'editable');
            contentDiv.setAttribute('contenteditable', 'true');
            contentDiv.textContent = text;
            contentDiv.addEventListener('input', () => {
              selectedContent = contentDiv.textContent;
            });
            contentMessage.appendChild(contentDiv);
            messages.appendChild(contentMessage);
            addMessage("I'm ready to help you with the selected content. What would you like to know?", 'ai');
          }

          // Add clear chat button to header
          // const chatHeader = document.querySelector('.chat-header');
          // if (chatHeader && !chatHeader.contains(clearChatBtn)) {
          //   chatHeader.insertBefore(clearChatBtn, newChatBtn);
          // }
          
          // await loadChatHistory();

          if (inputContainer) {
            inputContainer.style.display = 'block';
            if (userInput) {
              userInput.value = '';
              userInput.disabled = false;
            }
            if (sendBtn) {
              sendBtn.disabled = true;
            }
          }
        } else {
          if (chatContainer) chatContainer.style.display = 'none';
          if (contextContainer) contextContainer.style.display = 'block';
          if (inputContainer) inputContainer.style.display = 'none';
          
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

  const addMessage = (content, sender, save = true) => {
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
    
    if (save) {
      chatHistory.push({ content, sender, timestamp: new Date() });
      saveChatHistory();
    }
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
    const endpoint = currentAction === 'interact' ? '/chat_about_content/' : '/ask/';
    const body = currentAction === 'interact' 
      ? { question, selectedContent }
      : { token, question };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    if (summaryContainer) summaryContainer.style.display = 'block';
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
      if (loadingStatus) loadingStatus.textContent = "Generating page summary...";
      pageSummary = await getPageSummary(pageData.token);
      if (summaryContent) summaryContent.innerHTML = marked.parse(pageSummary);
      
      // Set initial summary container height
      if (summaryContainer) summaryContainer.style.height = '150px';
      
      // Update page info in the chat header
      updatePageInfo();
      
      // Add clear chat button to header
      // const chatHeader = document.querySelector('.chat-header');
      // if (chatHeader && !chatHeader.contains(clearChatBtn)) {
      //   chatHeader.insertBefore(clearChatBtn, newChatBtn);
      // }
      
      // Load existing chat history
      await loadChatHistory();
      
      // Show chat screen
      showScreen(chatScreen);
      
      // Add welcome message if no history exists
      if (chatHistory.length === 0) {
        addMessage("I've analyzed this page. How can I help you with it today?", "ai");
      }
      
    } catch (error) {
      console.error("Error starting chat:", error);
      if (loadingStatus) loadingStatus.textContent = "Error starting chat. Please try again.";
      setTimeout(() => showScreen(startScreen), 2000);
    }
  };

  const handleSendMessage = async () => {
    const message = userInput.value.trim();
    if (!message) return;
    
    // For interact mode, we don't need a token
    if (!currentAction && !pageData.token) return;
    
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
  
  if (clearChatBtn) clearChatBtn.addEventListener('click', clearChat);

  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      if (messages) messages.innerHTML = '';
      chatHistory = [];
      pageData.token = null;
      currentAction = '';
      selectedContent = '';
      if (chatContainer) chatContainer.style.display = 'flex';
      if (contextContainer) contextContainer.style.display = 'none';
      if (summaryContainer) {
        summaryContainer.style.display = 'block';
        summaryContainer.classList.remove('collapsed');
      }
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