document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const startScreen = document.getElementById('start-screen');
  const loadingScreen = document.getElementById('loading-screen');
  const chatScreen = document.getElementById('chat-screen');
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

  // Add resize handle to summary container
  const summaryResizeHandle = document.createElement('div');
  summaryResizeHandle.className = 'summary-resize-handle';
  summaryContainer.appendChild(summaryResizeHandle);

  // Set initial summary container height
  summaryContainer.style.height = '150px';

  // Summary resize functionality
  let isResizingSummary = false;
  let initialY;
  let initialHeight;

  summaryResizeHandle.addEventListener('mousedown', (e) => {
    isResizingSummary = true;
    initialY = e.clientY;
    initialHeight = summaryContainer.offsetHeight;

    document.addEventListener('mousemove', handleSummaryResize);
    document.addEventListener('mouseup', () => {
      isResizingSummary = false;
      document.removeEventListener('mousemove', handleSummaryResize);
    });
  });

  function handleSummaryResize(e) {
    if (!isResizingSummary) return;

    const newHeight = initialHeight + (e.clientY - initialY);
    const maxHeight = document.body.offsetHeight - 200; // Leave space for other elements
    summaryContainer.style.height = `${Math.max(48, Math.min(maxHeight, newHeight))}px`;
  }

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

  // Functions
  const showScreen = (screen) => {
    [startScreen, loadingScreen, chatScreen].forEach(s => {
      s.classList.remove('active');
    });
    screen.classList.add('active');
  };

  const updatePageInfo = () => {
    if (pageData.favicon) {
      pageFavicon.src = pageData.favicon;
    }
    pageTitle.textContent = pageData.title || 'Current Page';
  };

  const toggleSummary = () => {
    summaryContainer.classList.toggle('collapsed');
    toggleSummaryBtn.querySelector('i').classList.toggle('fa-chevron-down');
    toggleSummaryBtn.querySelector('i').classList.toggle('fa-chevron-up');
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
    messages.appendChild(messageEl);
    
    messages.scrollTop = messages.scrollHeight;
    
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
    
    try {
      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      pageData.title = tab.title;
      pageData.url = tab.url;
      pageData.favicon = tab.favIconUrl;
      
      // Get HTML content from the current tab
      loadingStatus.textContent = "Fetching page content...";
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => document.documentElement.outerHTML
      });
      
      pageData.html = result;
      
      // Upload HTML and get token
      loadingStatus.textContent = "Processing page content...";
      pageData.token = await uploadHtml(pageData.html);
      
      // Generate summary of the page
      loadingStatus.textContent = "Generating page summary...";
      pageSummary = await getPageSummary(pageData.token);
      summaryContent.innerHTML = marked.parse(pageSummary);
      
      // Update page info in the chat header
      updatePageInfo();
      
      // Show welcome message
      setTimeout(() => {
        showScreen(chatScreen);
        addMessage("I've analyzed this page. How can I help you with it today?", "ai");
      }, 500);
      
    } catch (error) {
      console.error("Error starting chat:", error);
      loadingStatus.textContent = "Error starting chat. Please try again.";
      setTimeout(() => showScreen(startScreen), 2000);
    }
  };

  const handleSendMessage = async () => {
    const message = userInput.value.trim();
    if (!message || !pageData.token) return;
    
    addMessage(message, "user");
    userInput.value = "";
    sendBtn.disabled = true;
    
    try {
      const aiResponse = await askQuestion(pageData.token, message);
      addMessage(aiResponse, "ai");
    } catch (error) {
      console.error("Error getting AI response:", error);
      addMessage("Sorry, I encountered an error processing your request.", "ai");
    } finally {
      sendBtn.disabled = false;
      userInput.focus();
    }
  };

  // Event Listeners
  startBtn.addEventListener('click', startChat);
  
  toggleSummaryBtn.addEventListener('click', toggleSummary);
  
  newChatBtn.addEventListener('click', () => {
    messages.innerHTML = '';
    chatHistory = [];
    pageData.token = null;
    showScreen(startScreen);
  });
  
  userInput.addEventListener('input', () => {
    sendBtn.disabled = !userInput.value.trim();
    
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });
  
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        handleSendMessage();
      }
    }
  });
  
  sendBtn.addEventListener('click', handleSendMessage);

  // Initialize
  showScreen(startScreen);
  sendBtn.disabled = true;
});