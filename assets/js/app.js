/**
 * DevTools Hub - Global Application Scripts
 * Handles themes, cookie consent, accessibility, shortcuts, and tool interactions.
 */

(function () {
  'use strict';

  // --- Cookie Consent & Privacy State ---
  const CONSENT_KEY = 'devtools_cookie_consent';
  const THEME_KEY = 'devtools_theme';

  function getConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (e) {
      return null;
    }
  }

  function setConsent(val) {
    try {
      localStorage.setItem(CONSENT_KEY, val);
    } catch (e) {}
    hideCookieBanner();
  }

  function canStorePreferences() {
    return getConsent() === 'accepted';
  }

  // --- Theme Management ---
  const htmlEl = document.documentElement;
  
  function initTheme() {
    let savedTheme = null;
    if (canStorePreferences()) {
      try {
        savedTheme = localStorage.getItem(THEME_KEY);
      } catch (e) {}
    }

    if (savedTheme) {
      htmlEl.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      htmlEl.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    const current = htmlEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', next);

    if (canStorePreferences()) {
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
    }
    updateThemeIcon();
    showToast(`Switched to ${next} theme`, 'info');
  }

  function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const isDark = htmlEl.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  }

  // --- Cookie Banner UI ---
  function initCookieBanner() {
    if (!getConsent()) {
      const banner = document.getElementById('cookie-consent-banner');
      if (banner) banner.classList.add('show');
    }

    const acceptBtn = document.getElementById('cookie-accept-btn');
    const rejectBtn = document.getElementById('cookie-reject-btn');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        setConsent('accepted');
        showToast('Preferences saved.', 'success');
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', function () {
        setConsent('rejected');
        try {
          localStorage.removeItem(THEME_KEY);
        } catch (e) {}
        showToast('Non-essential cookies and storage rejected.', 'info');
      });
    }
  }

  function hideCookieBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) banner.classList.remove('show');
  }

  // --- Mobile Navigation ---
  function initMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('primary-nav');

    if (toggleBtn && navMenu) {
      toggleBtn.addEventListener('click', function () {
        const isOpen = navMenu.classList.toggle('open');
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }
  }

  // --- FAQ Accordions ---
  function initFaqAccordions() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach((item) => {
      const question = item.querySelector('.faq-question');
      if (question) {
        question.addEventListener('click', () => {
          const isActive = item.classList.contains('active');
          faqItems.forEach((i) => i.classList.remove('active'));
          if (!isActive) {
            item.classList.add('active');
          }
        });
      }
    });
  }

  // --- Toast Notification System ---
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // --- Global Helpers for Tools ---
  window.DevToolsApp = {
    showToast,
    canStorePreferences,
    
    // Copy text to clipboard with feedback
    async copyText(text, btnElement = null) {
      if (!text) {
        showToast('Nothing to copy.', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        if (btnElement) {
          const originalText = btnElement.innerText;
          btnElement.innerText = 'Copied!';
          setTimeout(() => (btnElement.innerText = originalText), 1800);
        }
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 'success');
      }
    },

    // Download text as a file
    downloadFile(content, fileName, mimeType = 'text/plain;charset=utf-8') {
      if (!content) {
        showToast('Output is empty; cannot download.', 'error');
        return;
      }
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${fileName}`, 'success');
    },

    // Setup Drag-and-drop & File paste on textarea
    setupFileHandling(dropZoneEl, textareaEl, onContentLoaded) {
      if (!dropZoneEl || !textareaEl) return;

      ['dragenter', 'dragover'].forEach((eventName) => {
        dropZoneEl.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZoneEl.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach((eventName) => {
        dropZoneEl.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZoneEl.classList.remove('dragover');
        });
      });

      dropZoneEl.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          const file = files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
            textareaEl.value = event.target.result;
            if (typeof onContentLoaded === 'function') {
              onContentLoaded(event.target.result);
            }
            showToast(`Loaded file: ${file.name}`, 'success');
          };
          reader.readAsText(file);
        }
      });
    },

    // Format human readable bytes
    formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  };

  // --- Document Ready Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initCookieBanner();
    initMobileMenu();
    initFaqAccordions();

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Register Service Worker for offline PWA support
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  });
})();
