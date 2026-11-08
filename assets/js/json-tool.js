/**
 * DevTools Hub - JSON Formatter & Validator UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('json-input');
  const outputEl = document.getElementById('json-output');
  const treeContainer = document.getElementById('json-tree');
  const indentSelect = document.getElementById('json-indent');
  const sortKeysCheckbox = document.getElementById('json-sort-keys');
  const statusEl = document.getElementById('json-status');
  const statsEl = document.getElementById('json-stats');
  const viewToggleBtn = document.getElementById('json-view-toggle');
  const dropZone = document.getElementById('json-drop-zone');

  const formatBtn = document.getElementById('json-format-btn');
  const minifyBtn = document.getElementById('json-minify-btn');
  const validateBtn = document.getElementById('json-validate-btn');
  const clearBtn = document.getElementById('json-clear-btn');
  const copyBtn = document.getElementById('json-copy-btn');
  const downloadBtn = document.getElementById('json-download-btn');
  const loadExampleBtn = document.getElementById('json-example-btn');
  const pasteBtn = document.getElementById('json-paste-btn');

  let currentView = 'text'; // 'text' or 'tree'
  let debounceTimer = null;

  const EXAMPLE_JSON = `{
  "site": "DevTools Hub",
  "version": 2.5,
  "privacy": {
    "clientSideOnly": true,
    "servers": "none",
    "tracking": false
  },
  "tools": [
    "JSON Formatter & Validator",
    "HTML Minifier",
    "CSS Beautifier",
    "Base64 Encoder",
    "URL Encoder",
    "UUID Generator"
  ],
  "stats": {
    "users": 150000,
    "uptime": "99.99%",
    "rating": 4.98
  }
}`;

  function processJson(action = 'format') {
    const raw = inputEl.value;
    if (!raw.trim()) {
      outputEl.value = '';
      treeContainer.innerHTML = '';
      statusEl.textContent = 'Ready';
      statusEl.className = 'stat-pill';
      statsEl.textContent = '0 characters';
      return;
    }

    // Check size for performance warning (> 1MB)
    if (raw.length > 1024 * 1024) {
      statusEl.textContent = 'Large input detected (>1MB)... Processing client-side.';
      statusEl.className = 'stat-pill warning';
    }

    const valRes = DevToolsCore.json.validate(raw);
    if (!valRes.valid) {
      statusEl.textContent = `Error: ${valRes.message} (Line ${valRes.line}, Col ${valRes.column})`;
      statusEl.className = 'stat-pill error';
      outputEl.value = '';
      const errorMessage = document.createElement('div');
      errorMessage.className = 'stat-pill error';
      errorMessage.style.padding = '1rem';
      errorMessage.textContent = `⚠ ${valRes.message} at line ${valRes.line}, column ${valRes.column}`;
      treeContainer.replaceChildren(errorMessage);
      return;
    }

    statusEl.textContent = '✓ Valid JSON';
    statusEl.className = 'stat-pill success';

    try {
      if (action === 'minify') {
        const minified = DevToolsCore.json.minify(raw);
        outputEl.value = minified;
      } else {
        const indent = indentSelect.value === 'tab' ? 'tab' : parseInt(indentSelect.value, 10);
        const sort = sortKeysCheckbox.checked;
        const formatted = DevToolsCore.json.format(raw, indent, sort);
        outputEl.value = formatted;
      }

      statsEl.textContent = `${outputEl.value.length} characters | ${outputEl.value.split('\n').length} lines`;
      renderTreeView(valRes.parsed);
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'stat-pill error';
    }
  }

  function renderTreeView(data) {
    treeContainer.innerHTML = '';
    const rootNode = createTreeNode(data, 'root', true);
    treeContainer.appendChild(rootNode);
  }

  function createTreeNode(val, key = null, isLast = true) {
    const div = document.createElement('div');
    div.className = 'tree-node';

    if (val === null) {
      div.innerHTML = `${key !== null ? `<span class="tree-key">"${key}"</span>: ` : ''}<span class="tree-null">null</span>${!isLast ? ',' : ''}`;
      return div;
    }

    if (typeof val === 'boolean') {
      div.innerHTML = `${key !== null ? `<span class="tree-key">"${key}"</span>: ` : ''}<span class="tree-boolean">${val}</span>${!isLast ? ',' : ''}`;
      return div;
    }

    if (typeof val === 'number') {
      div.innerHTML = `${key !== null ? `<span class="tree-key">"${key}"</span>: ` : ''}<span class="tree-number">${val}</span>${!isLast ? ',' : ''}`;
      return div;
    }

    if (typeof val === 'string') {
      div.innerHTML = `${key !== null ? `<span class="tree-key">"${key}"</span>: ` : ''}<span class="tree-string">"${escapeHtml(val)}"</span>${!isLast ? ',' : ''}`;
      return div;
    }

    if (Array.isArray(val)) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tree-toggle';
      toggle.textContent = '▼';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', `Collapse ${key || 'array'}`);

      const header = document.createElement('span');
      header.innerHTML = `${key !== null ? `<span class="tree-key">"${escapeHtml(key)}"</span>: ` : ''}[ <span style="color:var(--text-muted);font-size:0.8rem;">${val.length} items</span>`;

      const childrenContainer = document.createElement('div');
      val.forEach((item, idx) => {
        childrenContainer.appendChild(createTreeNode(item, null, idx === val.length - 1));
      });

      const footer = document.createElement('div');
      footer.textContent = `]${!isLast ? ',' : ''}`;

      toggle.addEventListener('click', () => {
        const hidden = childrenContainer.style.display === 'none';
        childrenContainer.style.display = hidden ? 'block' : 'none';
        footer.style.display = hidden ? 'block' : 'none';
        toggle.textContent = hidden ? '▼' : '▶';
        toggle.setAttribute('aria-expanded', hidden ? 'true' : 'false');
        toggle.setAttribute('aria-label', `${hidden ? 'Collapse' : 'Expand'} ${key || 'array'}`);
      });

      div.appendChild(toggle);
      div.appendChild(header);
      div.appendChild(childrenContainer);
      div.appendChild(footer);
      return div;
    }

    if (typeof val === 'object') {
      const keys = Object.keys(val);
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tree-toggle';
      toggle.textContent = '▼';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', `Collapse ${key || 'object'}`);

      const header = document.createElement('span');
      header.innerHTML = `${key !== null ? `<span class="tree-key">"${escapeHtml(key)}"</span>: ` : ''}{ <span style="color:var(--text-muted);font-size:0.8rem;">${keys.length} keys</span>`;

      const childrenContainer = document.createElement('div');
      keys.forEach((k, idx) => {
        childrenContainer.appendChild(createTreeNode(val[k], k, idx === keys.length - 1));
      });

      const footer = document.createElement('div');
      footer.textContent = `}${!isLast ? ',' : ''}`;

      toggle.addEventListener('click', () => {
        const hidden = childrenContainer.style.display === 'none';
        childrenContainer.style.display = hidden ? 'block' : 'none';
        footer.style.display = hidden ? 'block' : 'none';
        toggle.textContent = hidden ? '▼' : '▶';
        toggle.setAttribute('aria-expanded', hidden ? 'true' : 'false');
        toggle.setAttribute('aria-label', `${hidden ? 'Collapse' : 'Expand'} ${key || 'object'}`);
      });

      div.appendChild(toggle);
      div.appendChild(header);
      div.appendChild(childrenContainer);
      div.appendChild(footer);
      return div;
    }

    return div;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Live Input Debounce
  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => processJson('format'), 250);
  });

  indentSelect.addEventListener('change', () => processJson('format'));
  sortKeysCheckbox.addEventListener('change', () => processJson('format'));

  formatBtn.addEventListener('click', () => processJson('format'));
  minifyBtn.addEventListener('click', () => processJson('minify'));
  validateBtn.addEventListener('click', () => {
    processJson('format');
    if (statusEl.classList.contains('success')) {
      DevToolsApp.showToast('JSON is 100% valid RFC 8259 syntax!', 'success');
    }
  });

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    outputEl.value = '';
    treeContainer.innerHTML = '';
    statusEl.textContent = 'Ready';
    statusEl.className = 'stat-pill';
    statsEl.textContent = '0 characters';
    DevToolsApp.showToast('Cleared editors', 'info');
  });

  copyBtn.addEventListener('click', () => {
    DevToolsApp.copyText(outputEl.value, copyBtn);
  });

  downloadBtn.addEventListener('click', () => {
    DevToolsApp.downloadFile(outputEl.value, 'formatted.json', 'application/json');
  });

  loadExampleBtn.addEventListener('click', () => {
    inputEl.value = EXAMPLE_JSON;
    processJson('format');
    DevToolsApp.showToast('Loaded example JSON payload', 'info');
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputEl.value = text;
      processJson('format');
      DevToolsApp.showToast('Pasted from clipboard', 'success');
    } catch (e) {
      DevToolsApp.showToast('Please press Ctrl+V to paste', 'info');
    }
  });

  viewToggleBtn.addEventListener('click', () => {
    if (currentView === 'text') {
      currentView = 'tree';
      outputEl.style.display = 'none';
      treeContainer.classList.add('active');
      viewToggleBtn.textContent = 'Text View';
    } else {
      currentView = 'text';
      outputEl.style.display = 'block';
      treeContainer.classList.remove('active');
      viewToggleBtn.textContent = 'Tree View';
    }
  });

  // Keyboard Shortcuts: Ctrl+Enter to Format
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      processJson('format');
    }
  });

  // Setup Drag & Drop File Upload
  DevToolsApp.setupFileHandling(dropZone, inputEl, () => processJson('format'));

  // Initial Example Load
  inputEl.value = EXAMPLE_JSON;
  processJson('format');
});
