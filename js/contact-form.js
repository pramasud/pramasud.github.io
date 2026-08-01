(function () {
  'use strict';

  function init() {
    var form = document.getElementById('request');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = (form.querySelector('[name="Name"]') || {}).value || '';
      var email = (form.querySelector('[name="Email"]') || {}).value || '';
      var phone = (form.querySelector('[name="Phone Number"]') || {}).value || '';
      var message = (form.querySelector('[name="Message"]') || {}).value || '';

      name = name.trim();
      email = email.trim();
      phone = phone.trim();
      message = message.trim();

      if (!name && !email && !phone && !message) return;

      // #chatbot-input is a single-line <input>, which silently strips
      // newlines from its value — so this must stay on one line.
      var parts = ['New Contact Us submission —'];
      if (name) parts.push('Name: ' + name + ';');
      if (email) parts.push('Email: ' + email + ';');
      if (phone) parts.push('Phone: ' + phone + ';');
      if (message) parts.push('Message: ' + message);

      var composed = parts.join(' ');

      if (window.ChatbotWidget && window.ChatbotWidget.openAndSend) {
        window.ChatbotWidget.openAndSend(composed);
      } else if (window.ChatbotWidget && window.ChatbotWidget.open) {
        window.ChatbotWidget.open();
      }

      form.reset();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
