// Chatbot floating widget (Chatbase)
(function() {
  if (window.__chatbotWidgetInitialized) return; 
  window.__chatbotWidgetInitialized = true;

  function createStyles() {
    const style = document.createElement('style');
    style.setAttribute('data-chatbot-style', 'true');
    style.textContent = `
      .bc-chatbot-button {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #2563eb;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 15px rgba(0,0,0,0.2);
        cursor: pointer;
        z-index: 2147483000;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }
      .bc-chatbot-button:hover { 
        transform: translateY(-2px); 
        box-shadow: 0 14px 22px rgba(0,0,0,0.24);
        background: #1d4ed8;
      }
      .bc-chatbot-iframe-container {
        position: fixed;
        right: 20px;
        bottom: 88px;
        width: 360px;
        height: 560px;
        max-height: calc(100vh - 120px);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0,0,0,0.28);
        background: #fff;
        z-index: 2147483000;
        display: none;
      }
      .bc-chatbot-iframe-container.open { display: block; }
      .bc-chatbot-close {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        background: rgba(0,0,0,0.6);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 2;
      }
      @media (max-width: 480px) {
        .bc-chatbot-iframe-container {
          right: 12px;
          bottom: 84px;
          width: calc(100vw - 24px);
          height: 70vh;
        }
        .bc-chatbot-button { right: 12px; bottom: 12px; }
      }
    `;
    document.head.appendChild(style);
  }

  function createWidget() {
    // Button
    const button = document.createElement('button');
    button.className = 'bc-chatbot-button';
    button.setAttribute('aria-label', 'Open chat assistant');
    button.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 12a8 8 0 0 1 13.856-5.657A8 8 0 0 1 20 12c0 1.79-.586 3.445-1.574 4.774-.18.24-.26.539-.2.832l.44 2.202a.75.75 0 0 1-.884.884l-2.202-.44a1.2 1.2 0 0 0-.832.2A7.97 7.97 0 0 1 12 20a8 8 0 0 1-8-8Z" fill="currentColor"/>
      </svg>
    `;

    // Container with iframe
    const container = document.createElement('div');
    container.className = 'bc-chatbot-iframe-container';

    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.chatbase.co/chatbot-iframe/YTKPCvl_zJBhWM1pb-3sx';
    iframe.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.setAttribute('title', 'Chat assistant');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

    const closeBtn = document.createElement('div');
    closeBtn.className = 'bc-chatbot-close';
    closeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;

    closeBtn.addEventListener('click', function() {
      container.classList.remove('open');
    });

    button.addEventListener('click', function() {
      container.classList.toggle('open');
    });

    container.appendChild(closeBtn);
    container.appendChild(iframe);
    document.body.appendChild(container);
    document.body.appendChild(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      createStyles();
      createWidget();
    });
  } else {
    createStyles();
    createWidget();
  }
})();


