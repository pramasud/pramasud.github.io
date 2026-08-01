(function () {
  'use strict';

  var SESSION_KEY = 'probaho_chat_session_id';
  var MESSAGES_KEY = 'probaho_chat_messages';

  function loadStoredMessages() {
    try {
      return JSON.parse(sessionStorage.getItem(MESSAGES_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function getSessionId() {
    var id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function sanitize(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function scrollToBottom(el) {
    el.scrollTop = el.scrollHeight;
  }

  function addMessage(messagesEl, role, text) {
    var el = document.createElement('div');
    el.className = role === 'user'
      ? 'chatbot-msg chatbot-msg-user'
      : 'chatbot-msg chatbot-msg-ai';
    el.innerHTML = sanitize(text);
    messagesEl.appendChild(el);
    scrollToBottom(messagesEl);
    return el;
  }

  function showTyping(messagesEl) {
    var el = document.createElement('div');
    el.id = 'chatbot-typing-indicator';
    el.className = 'chatbot-typing';
    el.innerHTML =
      '<span>AI is typing</span>' +
      '<span class="chatbot-typing-dots">' +
        '<span></span><span></span><span></span>' +
      '</span>';
    messagesEl.appendChild(el);
    scrollToBottom(messagesEl);
  }

  function hideTyping() {
    var el = document.getElementById('chatbot-typing-indicator');
    if (el) el.remove();
  }

  function updateTypingMessage(text) {
    var el = document.getElementById('chatbot-typing-indicator');
    if (el) {
      var span = el.querySelector('span');
      if (span) span.textContent = text;
    }
  }

  async function postChat(message, sessionId, config) {
    const now = new Date();
    const user_time = now.toLocaleString('en-CA', { hour12: false })
                    + ' ' + Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify({
        message: message,
        session_id: sessionId,
        user_time: user_time,
        visitor_user_id: config.visitorUserId || null
      }),
      signal: AbortSignal.timeout(90000)
    });
    if (!res.ok) {
      let body;
      try { body = await res.json(); } catch (_) { throw new Error('HTTP ' + res.status); }
      throw new Error(body.error || 'HTTP ' + res.status);
    }
    return res.json();
  }

  function setInputState(input, sendBtn, disabled) {
    input.disabled = disabled;
    sendBtn.disabled = disabled;
  }

  function init() {
    var config = window.ChatbotConfig || {};

    var isConfigured = !!(config.apiEndpoint && config.apiKey &&
      config.apiEndpoint.indexOf('REPLACE_WITH') !== 0);

    if (!isConfigured) {
      console.warn('ChatbotConfig.apiEndpoint / apiKey is not set — chat window will open, but messages will not reach a backend yet.');
    }

    var widget = document.getElementById('chatbot-widget');
    var toggleBtn = document.getElementById('chatbot-toggle');
    var chatWindow = document.getElementById('chatbot-window');
    var closeBtn = document.getElementById('chatbot-close');
    var input = document.getElementById('chatbot-input');
    var sendBtn = document.getElementById('chatbot-send');
    var messagesEl = document.getElementById('chatbot-messages');

    if (!toggleBtn || !chatWindow || !messagesEl) return;

    var sessionId = getSessionId();
    var storedMessages = loadStoredMessages();

    storedMessages.forEach(function (msg) {
      addMessage(messagesEl, msg.role, msg.text);
    });

    function addAndPersist(role, text) {
      addMessage(messagesEl, role, text);
      storedMessages.push({ role: role, text: text });
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(storedMessages));
    }

    if (storedMessages.length === 0) {
      addAndPersist('ai', 'Welcome to Probaho! How can I help you today?');
    }

    function openChat() {
      chatWindow.classList.remove('chatbot-hidden');
      if (widget) widget.classList.add('chatbot-open');
      input.focus();
    }

    function closeChat() {
      chatWindow.classList.add('chatbot-hidden');
      if (widget) widget.classList.remove('chatbot-open');
    }

    toggleBtn.addEventListener('click', function () {
      if (chatWindow.classList.contains('chatbot-hidden')) {
        openChat();
      } else {
        closeChat();
      }
    });

    closeBtn.addEventListener('click', closeChat);

    window.ChatbotWidget = {
      open: openChat,
      openAndSend: function (message) {
        openChat();
        setTimeout(function () {
          input.value = message;
          handleSend();
        }, 120);
      }
    };

    function handleSend() {
      var text = input.value.trim();
      if (!text || input.disabled) return;

      input.value = '';
      setInputState(input, sendBtn, true);
      addAndPersist('user', text);

      if (!isConfigured) {
        addAndPersist('ai', 'This chat isn\'t connected to a backend yet — check back soon!');
        setInputState(input, sendBtn, false);
        input.focus();
        return;
      }

      showTyping(messagesEl);

      var MAX_RETRIES = 3;
      var RETRY_DELAY_MS = 5000;

      function attempt(retriesLeft) {
        postChat(text, sessionId, config)
          .then(function (data) {
            hideTyping();
            if (data.session_id) {
              sessionId = data.session_id;
              sessionStorage.setItem(SESSION_KEY, sessionId);
            }
            var reply = (data.success && data.response)
              ? data.response
              : 'Sorry, I could not process your request. Please try again.';
            addAndPersist('ai', reply);
            setInputState(input, sendBtn, false);
            input.focus();
          })
          .catch(function (err) {
            if (err.name === 'TimeoutError' || err.name === 'AbortError') {
              hideTyping();
              addAndPersist('ai', 'The response is taking longer than expected. Please try again.');
              setInputState(input, sendBtn, false);
              input.focus();
              return;
            }
            if (retriesLeft > 1) {
              updateTypingMessage('Looks like the connection is initializing, giving it a few more seconds…');
              setTimeout(function () { attempt(retriesLeft - 1); }, RETRY_DELAY_MS);
            } else {
              hideTyping();
              addAndPersist('ai', 'The server seems to be taking too long to respond. Please try again in a minute.');
              console.error('Chatbot error:', err);
              setInputState(input, sendBtn, false);
              input.focus();
            }
          });
      }

      attempt(MAX_RETRIES);
    }

    sendBtn.addEventListener('click', handleSend);

    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
