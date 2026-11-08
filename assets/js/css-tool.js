/**
 * DevTools Hub - CSS Beautifier & Minifier UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('css-input');
  const outputEl = document.getElementById('css-output');
  const dropZone = document.getElementById('css-drop-zone');

  const modeSelect = document.getElementById('css-mode'); // 'beautify' or 'minify'
  const indentSelect = document.getElementById('css-indent');
  const statusEl = document.getElementById('css-status');
  const statsEl = document.getElementById('css-stats');

  const runBtn = document.getElementById('css-run-btn');
  const clearBtn = document.getElementById('css-clear-btn');
  const copyBtn = document.getElementById('css-copy-btn');
  const downloadBtn = document.getElementById('css-download-btn');
  const exampleBtn = document.getElementById('css-example-btn');
  const pasteBtn = document.getElementById('css-paste-btn');

  let debounceTimer = null;

  const EXAMPLE_CSS = `/* DevTools Hub - Production Stylesheet */
:root {
  --primary-color: #2563eb;
  --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #334155;
  background: #f8fafc;
}

/* Complex SVG Data URI in url() should never be broken */
.card-badge {
  display: inline-flex;
  align-items: center;
  background-image: url("data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><circle cx='8' cy='8' r='7' fill='%232563eb'/></svg>");
  padding: 4px 8px;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .container {
    width: 100%;
    padding: 0 16px;
  }
  .nav-menu {
    display: none;
  }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}`;

  function processCss() {
    const raw = inputEl.value;
    const mode = modeSelect.value; // 'beautify' or 'minify'

    if (!raw.trim()) {
      outputEl.value = '';
      statusEl.textContent = 'Ready';
      statusEl.className = 'stat-pill';
      statsEl.textContent = '0 characters';
      return;
    }

    try {
      if (mode === 'minify') {
        const minified = DevToolsCore.css.minify(raw);
        outputEl.value = minified;
        const savings = DevToolsCore.css.calculateSavings(raw, minified);
        statusEl.textContent = '✓ Minified Successfully';
        statusEl.className = 'stat-pill success';
        statsEl.textContent = `Orig: ${DevToolsApp.formatBytes(savings.originalBytes)} | Min: ${DevToolsApp.formatBytes(savings.minifiedBytes)} | Saved: ${savings.percentSaved}% (${DevToolsApp.formatBytes(savings.savedBytes)})`;
      } else {
        const indent = indentSelect.value === 'tab' ? 'tab' : parseInt(indentSelect.value, 10);
        const beautified = DevToolsCore.css.beautify(raw, indent);
        outputEl.value = beautified;
        statusEl.textContent = '✓ Beautified Successfully';
        statusEl.className = 'stat-pill success';
        statsEl.textContent = `${outputEl.value.length} characters | ${outputEl.value.split('\n').length} lines`;
      }
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'stat-pill error';
    }
  }

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processCss, 250);
  });

  modeSelect.addEventListener('change', () => {
    if (modeSelect.value === 'minify') {
      indentSelect.disabled = true;
      runBtn.textContent = 'Minify CSS';
    } else {
      indentSelect.disabled = false;
      runBtn.textContent = 'Beautify CSS';
    }
    processCss();
  });

  indentSelect.addEventListener('change', processCss);
  runBtn.addEventListener('click', processCss);

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    outputEl.value = '';
    statusEl.textContent = 'Ready';
    statusEl.className = 'stat-pill';
    statsEl.textContent = '0 characters';
    DevToolsApp.showToast('Cleared editors', 'info');
  });

  copyBtn.addEventListener('click', () => {
    DevToolsApp.copyText(outputEl.value, copyBtn);
  });

  downloadBtn.addEventListener('click', () => {
    const isMin = modeSelect.value === 'minify';
    DevToolsApp.downloadFile(outputEl.value, isMin ? 'style.min.css' : 'style.css', 'text/css');
  });

  exampleBtn.addEventListener('click', () => {
    inputEl.value = EXAMPLE_CSS;
    processCss();
    DevToolsApp.showToast('Loaded example stylesheet', 'info');
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputEl.value = text;
      processCss();
      DevToolsApp.showToast('Pasted from clipboard', 'success');
    } catch (e) {
      DevToolsApp.showToast('Please press Ctrl+V to paste', 'info');
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      processCss();
    }
  });

  DevToolsApp.setupFileHandling(dropZone, inputEl, processCss);

  // Initial load
  inputEl.value = EXAMPLE_CSS;
  processCss();
});
