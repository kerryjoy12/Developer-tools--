/**
 * DevTools Hub - UUID Generator UI Controller (v4 and RFC 9562 v7)
 */

document.addEventListener('DOMContentLoaded', () => {
  const outputEl = document.getElementById('uuid-output');
  const versionSelect = document.getElementById('uuid-version');
  const countInput = document.getElementById('uuid-count');
  const countSlider = document.getElementById('uuid-slider');

  const uppercaseCb = document.getElementById('uuid-opt-uppercase');
  const hyphensCb = document.getElementById('uuid-opt-hyphens');
  const bracesCb = document.getElementById('uuid-opt-braces');
  const formatSelect = document.getElementById('uuid-opt-format');

  const statusEl = document.getElementById('uuid-status');
  const statsEl = document.getElementById('uuid-stats');

  const generateBtn = document.getElementById('uuid-generate-btn');
  const copyBtn = document.getElementById('uuid-copy-btn');
  const downloadBtn = document.getElementById('uuid-download-btn');
  const clearBtn = document.getElementById('uuid-clear-btn');

  function generateUuids() {
    const version = versionSelect.value; // 'v4' or 'v7'
    const count = parseInt(countInput.value, 10) || 1;
    const isUpper = uppercaseCb.checked;
    const hasHyphens = hyphensCb.checked;
    const hasBraces = bracesCb.checked;
    const outputFormat = formatSelect.value; // 'newline', 'json', 'comma'

    const list = DevToolsCore.uuid.bulkGenerate({
      count,
      version,
      uppercase: isUpper,
      hyphens: hasHyphens,
      braces: hasBraces
    });

    let renderedText = '';
    if (outputFormat === 'json') {
      renderedText = JSON.stringify(list, null, 2);
    } else if (outputFormat === 'comma') {
      renderedText = list.join(', ');
    } else {
      renderedText = list.join('\n');
    }

    outputEl.value = renderedText;
    statusEl.textContent = `✓ Generated ${list.length} UUID ${version.toUpperCase()} IDs`;
    statusEl.className = 'stat-pill success';
    statsEl.textContent = `${list.length} UUIDs | ${renderedText.length} characters`;
  }

  // Synchronize count text input and slider
  countInput.addEventListener('input', () => {
    let val = parseInt(countInput.value, 10);
    if (isNaN(val)) val = 1;
    if (val < 1) val = 1;
    if (val > 1000) val = 1000;
    countSlider.value = val;
    generateUuids();
  });

  countSlider.addEventListener('input', () => {
    countInput.value = countSlider.value;
    generateUuids();
  });

  [versionSelect, uppercaseCb, hyphensCb, bracesCb, formatSelect].forEach((el) => {
    if (el) el.addEventListener('change', generateUuids);
  });

  generateBtn.addEventListener('click', () => {
    generateUuids();
    DevToolsApp.showToast('Generated fresh UUIDs', 'success');
  });

  copyBtn.addEventListener('click', () => {
    DevToolsApp.copyText(outputEl.value, copyBtn);
  });

  downloadBtn.addEventListener('click', () => {
    const isJson = formatSelect.value === 'json';
    DevToolsApp.downloadFile(outputEl.value, isJson ? 'uuids.json' : 'uuids.txt', isJson ? 'application/json' : 'text/plain');
  });

  clearBtn.addEventListener('click', () => {
    outputEl.value = '';
    statusEl.textContent = 'Ready';
    statusEl.className = 'stat-pill';
    statsEl.textContent = '0 UUIDs';
    DevToolsApp.showToast('Cleared output', 'info');
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      generateUuids();
    }
  });

  // Initial generation
  generateUuids();
});
