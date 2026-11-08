/**
 * DevTools Hub - Base64 Encoder & Decoder UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('b64-input');
  const outputEl = document.getElementById('b64-output');
  const dropZone = document.getElementById('b64-drop-zone');
  const modeSelect = document.getElementById('b64-mode'); // 'encode' or 'decode'
  const urlSafeCb = document.getElementById('b64-urlsafe');
  const statusEl = document.getElementById('b64-status');
  const statsEl = document.getElementById('b64-stats');

  const runBtn = document.getElementById('b64-run-btn');
  const swapBtn = document.getElementById('b64-swap-btn');
  const clearBtn = document.getElementById('b64-clear-btn');
  const copyBtn = document.getElementById('b64-copy-btn');
  const downloadBtn = document.getElementById('b64-download-btn');
  const exampleBtn = document.getElementById('b64-example-btn');
  const pasteBtn = document.getElementById('b64-paste-btn');

  // File upload & image preview elements
  const fileInput = document.getElementById('b64-file-input');
  const fileDropBox = document.getElementById('b64-file-drop');
  const imagePreviewContainer = document.getElementById('b64-image-preview');
  const previewImg = document.getElementById('b64-preview-img');

  let debounceTimer = null;

  const EXAMPLE_TEXT = 'DevTools Hub: 100% Client-Side Developer Utilities! 🚀 🛠️ ☕\nAccents: Société, Über, Cañon\nCJK: 日本語, 中文, 한국어';

  function processBase64() {
    const raw = inputEl.value;
    const mode = modeSelect.value;
    const isUrlSafe = urlSafeCb.checked;

    if (!raw.trim()) {
      outputEl.value = '';
      statusEl.textContent = 'Ready';
      statusEl.className = 'stat-pill';
      statsEl.textContent = '0 characters';
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
      return;
    }

    try {
      if (mode === 'encode') {
        const encoded = DevToolsCore.base64.encode(raw, isUrlSafe);
        outputEl.value = encoded;
        statusEl.textContent = '✓ Encoded to Base64 (UTF-8)';
        statusEl.className = 'stat-pill success';
      } else {
        const decoded = DevToolsCore.base64.decode(raw, isUrlSafe);
        outputEl.value = decoded;
        statusEl.textContent = '✓ Decoded from Base64 (UTF-8)';
        statusEl.className = 'stat-pill success';

        // Check if decoded output or raw input looks like an image data URI
        checkImageDataUri(raw);
      }
      statsEl.textContent = `${outputEl.value.length} characters`;
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'stat-pill error';
      outputEl.value = '';
    }
  }

  function checkImageDataUri(str) {
    if (!imagePreviewContainer || !previewImg) return;
    const trimmed = str.trim();
    if (trimmed.startsWith('data:image/')) {
      previewImg.src = trimmed;
      imagePreviewContainer.style.display = 'block';
    } else {
      imagePreviewContainer.style.display = 'none';
    }
  }

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processBase64, 250);
  });

  modeSelect.addEventListener('change', () => {
    runBtn.textContent = modeSelect.value === 'encode' ? 'Encode to Base64' : 'Decode from Base64';
    processBase64();
  });

  urlSafeCb.addEventListener('change', processBase64);
  runBtn.addEventListener('click', processBase64);

  swapBtn.addEventListener('click', () => {
    const temp = inputEl.value;
    inputEl.value = outputEl.value;
    outputEl.value = temp;
    modeSelect.value = modeSelect.value === 'encode' ? 'decode' : 'encode';
    modeSelect.dispatchEvent(new Event('change'));
    DevToolsApp.showToast('Swapped input & output', 'info');
  });

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    outputEl.value = '';
    statusEl.textContent = 'Ready';
    statusEl.className = 'stat-pill';
    statsEl.textContent = '0 characters';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    DevToolsApp.showToast('Cleared editors', 'info');
  });

  copyBtn.addEventListener('click', () => {
    DevToolsApp.copyText(outputEl.value, copyBtn);
  });

  downloadBtn.addEventListener('click', () => {
    const isEnc = modeSelect.value === 'encode';
    DevToolsApp.downloadFile(outputEl.value, isEnc ? 'encoded.b64' : 'decoded.txt', 'text/plain');
  });

  exampleBtn.addEventListener('click', () => {
    inputEl.value = EXAMPLE_TEXT;
    modeSelect.value = 'encode';
    modeSelect.dispatchEvent(new Event('change'));
    DevToolsApp.showToast('Loaded example text with emojis & UTF-8', 'info');
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputEl.value = text;
      processBase64();
      DevToolsApp.showToast('Pasted from clipboard', 'success');
    } catch (e) {
      DevToolsApp.showToast('Please press Ctrl+V to paste', 'info');
    }
  });

  // Handle File to Base64 / Data URI
  if (fileDropBox && fileInput) {
    fileDropBox.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleUploadedFile(file);
    });

    ['dragover', 'dragenter'].forEach((ev) => {
      fileDropBox.addEventListener(ev, (e) => {
        e.preventDefault();
        fileDropBox.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((ev) => {
      fileDropBox.addEventListener(ev, (e) => {
        e.preventDefault();
        fileDropBox.classList.remove('dragover');
      });
    });

    fileDropBox.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleUploadedFile(e.dataTransfer.files[0]);
      }
    });
  }

  function handleUploadedFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUri = ev.target.result;
      outputEl.value = dataUri;
      inputEl.value = `[File: ${file.name} | ${DevToolsApp.formatBytes(file.size)} | Type: ${file.type || 'unknown'}]`;
      statusEl.textContent = `✓ Generated Data URI for ${file.name}`;
      statusEl.className = 'stat-pill success';
      statsEl.textContent = `${dataUri.length} characters`;

      if (file.type && file.type.startsWith('image/')) {
        previewImg.src = dataUri;
        imagePreviewContainer.style.display = 'block';
      } else {
        imagePreviewContainer.style.display = 'none';
      }
      DevToolsApp.showToast(`Converted ${file.name} to Base64 Data URI`, 'success');
    };
    reader.readAsDataURL(file);
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      processBase64();
    }
  });

  DevToolsApp.setupFileHandling(dropZone, inputEl, processBase64);

  // Initial load
  inputEl.value = EXAMPLE_TEXT;
  processBase64();
});
