/**
 * DevTools Hub - URL Encoder, Decoder & Query Parser UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('url-input');
  const outputEl = document.getElementById('url-output');
  const dropZone = document.getElementById('url-drop-zone');

  const actionSelect = document.getElementById('url-action'); // 'encode' or 'decode'
  const modeSelect = document.getElementById('url-mode');     // 'component' or 'full'
  const statusEl = document.getElementById('url-status');
  const statsEl = document.getElementById('url-stats');
  const modeExplanation = document.getElementById('url-mode-explanation');

  const runBtn = document.getElementById('url-run-btn');
  const swapBtn = document.getElementById('url-swap-btn');
  const clearBtn = document.getElementById('url-clear-btn');
  const copyBtn = document.getElementById('url-copy-btn');
  const downloadBtn = document.getElementById('url-download-btn');
  const exampleBtn = document.getElementById('url-example-btn');
  const pasteBtn = document.getElementById('url-paste-btn');

  // Query table elements
  const queryTableBody = document.getElementById('query-table-body');
  const addParamBtn = document.getElementById('add-param-btn');
  const rebuildFromTableBtn = document.getElementById('rebuild-url-btn');

  let debounceTimer = null;
  let parsedParams = [];

  const EXAMPLE_URL = 'https://api.example.com/v2/search?q=developer tools&category=web dev&sort=popular&filters[active]=true#results';

  function updateExplanation() {
    const isComponent = modeSelect.value === 'component';
    if (isComponent) {
      modeExplanation.innerHTML = '<strong>Component Mode (<code>encodeURIComponent</code>):</strong> Encodes ALL special characters including <code>/</code>, <code>?</code>, <code>&amp;</code>, <code>=</code>, <code>#</code>, and <code>:</code>. Essential for query parameter values so they do not break URL structure.';
    } else {
      modeExplanation.innerHTML = '<strong>Full URL Mode (<code>encodeURI</code>):</strong> Preserves structural URL delimiters (<code>://</code>, <code>?</code>, <code>&amp;</code>, <code>=</code>, <code>#</code>) while encoding spaces and non-ASCII Unicode characters. Used when encoding an entire valid address.';
    }
  }

  function processUrl() {
    const raw = inputEl.value;
    const action = actionSelect.value;
    const mode = modeSelect.value;

    if (!raw.trim()) {
      outputEl.value = '';
      statusEl.textContent = 'Ready';
      statusEl.className = 'stat-pill';
      statsEl.textContent = '0 characters';
      renderQueryTable([]);
      return;
    }

    try {
      if (action === 'encode') {
        const encoded = DevToolsCore.url.encode(raw, mode);
        outputEl.value = encoded;
        statusEl.textContent = `✓ Encoded via ${mode === 'component' ? 'encodeURIComponent' : 'encodeURI'}`;
        statusEl.className = 'stat-pill success';
      } else {
        const decoded = DevToolsCore.url.decode(raw, mode);
        outputEl.value = decoded;
        statusEl.textContent = `✓ Decoded via ${mode === 'component' ? 'decodeURIComponent' : 'decodeURI'}`;
        statusEl.className = 'stat-pill success';
      }

      statsEl.textContent = `${outputEl.value.length} characters`;

      // Update Query String Table
      parsedParams = DevToolsCore.url.parseQueryString(raw);
      renderQueryTable(parsedParams);
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'stat-pill error';
      outputEl.value = '';
    }
  }

  function renderQueryTable(params) {
    if (!queryTableBody) return;
    queryTableBody.innerHTML = '';

    if (params.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="3" style="text-align:center; color:var(--text-muted); padding:1rem;">No query parameters detected in input.</td>';
      queryTableBody.appendChild(emptyRow);
      return;
    }

    params.forEach((param, index) => {
      const tr = document.createElement('tr');

      const tdKey = document.createElement('td');
      const inputKey = document.createElement('input');
      inputKey.type = 'text';
      inputKey.value = param.key;
      inputKey.addEventListener('input', (e) => {
        parsedParams[index].key = e.target.value;
      });
      tdKey.appendChild(inputKey);

      const tdVal = document.createElement('td');
      const inputVal = document.createElement('input');
      inputVal.type = 'text';
      inputVal.value = param.value;
      inputVal.addEventListener('input', (e) => {
        parsedParams[index].value = e.target.value;
      });
      tdVal.appendChild(inputVal);

      const tdAction = document.createElement('td');
      tdAction.style.width = '70px';
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-outline btn-sm';
      delBtn.textContent = '✕';
      delBtn.title = 'Remove parameter';
      delBtn.addEventListener('click', () => {
        parsedParams.splice(index, 1);
        renderQueryTable(parsedParams);
      });
      tdAction.appendChild(delBtn);

      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tr.appendChild(tdAction);
      queryTableBody.appendChild(tr);
    });
  }

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processUrl, 250);
  });

  actionSelect.addEventListener('change', () => {
    runBtn.textContent = actionSelect.value === 'encode' ? 'Encode URL' : 'Decode URL';
    processUrl();
  });

  modeSelect.addEventListener('change', () => {
    updateExplanation();
    processUrl();
  });

  runBtn.addEventListener('click', processUrl);

  swapBtn.addEventListener('click', () => {
    const temp = inputEl.value;
    inputEl.value = outputEl.value;
    outputEl.value = temp;
    actionSelect.value = actionSelect.value === 'encode' ? 'decode' : 'encode';
    actionSelect.dispatchEvent(new Event('change'));
    DevToolsApp.showToast('Swapped input & output', 'info');
  });

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    outputEl.value = '';
    statusEl.textContent = 'Ready';
    statusEl.className = 'stat-pill';
    statsEl.textContent = '0 characters';
    renderQueryTable([]);
    DevToolsApp.showToast('Cleared editors', 'info');
  });

  copyBtn.addEventListener('click', () => {
    DevToolsApp.copyText(outputEl.value, copyBtn);
  });

  downloadBtn.addEventListener('click', () => {
    DevToolsApp.downloadFile(outputEl.value, 'url-output.txt', 'text/plain');
  });

  exampleBtn.addEventListener('click', () => {
    inputEl.value = EXAMPLE_URL;
    modeSelect.value = 'full';
    actionSelect.value = 'encode';
    updateExplanation();
    processUrl();
    DevToolsApp.showToast('Loaded example URL with query params', 'info');
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputEl.value = text;
      processUrl();
      DevToolsApp.showToast('Pasted from clipboard', 'success');
    } catch (e) {
      DevToolsApp.showToast('Please press Ctrl+V to paste', 'info');
    }
  });

  if (addParamBtn) {
    addParamBtn.addEventListener('click', () => {
      parsedParams.push({ key: 'new_param', value: 'value' });
      renderQueryTable(parsedParams);
    });
  }

  if (rebuildFromTableBtn) {
    rebuildFromTableBtn.addEventListener('click', () => {
      const basePart = inputEl.value.split('?')[0] || '';
      const qs = DevToolsCore.url.stringifyQueryParams(parsedParams);
      const rebuilt = qs ? `${basePart}?${qs}` : basePart;
      inputEl.value = rebuilt;
      processUrl();
      DevToolsApp.showToast('Rebuilt URL from query table parameters', 'success');
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      processUrl();
    }
  });

  DevToolsApp.setupFileHandling(dropZone, inputEl, processUrl);

  // Initial load
  inputEl.value = EXAMPLE_URL;
  updateExplanation();
  processUrl();
});
