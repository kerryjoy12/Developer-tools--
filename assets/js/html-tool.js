/**
 * DevTools Hub - HTML Minifier UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('html-input');
  const outputEl = document.getElementById('html-output');
  const dropZone = document.getElementById('html-drop-zone');

  const removeCommentsCb = document.getElementById('html-opt-comments');
  const collapseWhitespaceCb = document.getElementById('html-opt-whitespace');
  const removeQuotesCb = document.getElementById('html-opt-quotes');
  const removeTagsCb = document.getElementById('html-opt-tags');

  const statusEl = document.getElementById('html-status');
  const statsEl = document.getElementById('html-stats');

  const minifyBtn = document.getElementById('html-minify-btn');
  const clearBtn = document.getElementById('html-clear-btn');
  const copyBtn = document.getElementById('html-copy-btn');
  const downloadBtn = document.getElementById('html-download-btn');
  const exampleBtn = document.getElementById('html-example-btn');
  const pasteBtn = document.getElementById('html-paste-btn');

  let debounceTimer = null;

  const EXAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Meta Configuration -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>High Performance Web Page</title>
    
    <style>
      /* Embedded stylesheet must be preserved intact */
      body {
        margin: 0;
        font-family: sans-serif;
      }
    </style>
  </head>
  <body>
    <!-- Main Application Container -->
    <main class="container" id="app-root">
      <h1>Welcome to Fast Web</h1>
      <p>This paragraph contains multiple spaces and newlines that can be collapsed.</p>
      
      <!-- Preformatted code block must NEVER lose indentation! -->
      <pre>
function calculateTotal(items) {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].price;
  }
  return sum;
}
      </pre>

      <label for="feedback">Your Comments:</label>
      <textarea id="feedback" rows="4">
  Preserve this initial indentation exactly as written.
      </textarea>
    </main>

    <script>
      // Embedded JavaScript code preserved safely
      const config = {
        debug: true,
        endpoint: "/api/v1"
      };
      console.log("App loaded successfully!");
    </script>
  </body>
</html>`;

  function runMinification() {
    const raw = inputEl.value;
    if (!raw.trim()) {
      outputEl.value = '';
      statusEl.textContent = 'Ready';
      statusEl.className = 'stat-pill';
      statsEl.textContent = '0 B / 0 B (0.00% saved)';
      return;
    }

    const options = {
      removeComments: removeCommentsCb.checked,
      collapseWhitespace: collapseWhitespaceCb.checked,
      removeQuotes: removeQuotesCb.checked,
      removeOptionalTags: removeTagsCb.checked
    };

    try {
      const minified = DevToolsCore.html.minify(raw, options);
      outputEl.value = minified;

      const savings = DevToolsCore.html.calculateSavings(raw, minified);
      statusEl.textContent = `✓ Minified Successfully`;
      statusEl.className = 'stat-pill success';
      statsEl.textContent = `Original: ${DevToolsApp.formatBytes(savings.originalBytes)} | Minified: ${DevToolsApp.formatBytes(savings.minifiedBytes)} | Saved: ${savings.percentSaved}% (${DevToolsApp.formatBytes(savings.savedBytes)})`;
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'stat-pill error';
    }
  }

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runMinification, 250);
  });

  [removeCommentsCb, collapseWhitespaceCb, removeQuotesCb, removeTagsCb].forEach((cb) => {
    if (cb) cb.addEventListener('change', runMinification);
  });

  minifyBtn.addEventListener('click', runMinification);

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    outputEl.value = '';
    statusEl.textContent = 'Ready';
    statusEl.className = 'stat-pill';
    statsEl.textContent = '0 B / 0 B (0.00% saved)';
    DevToolsApp.showToast('Cleared editors', 'info');
  });

  copyBtn.addEventListener('click', () => {
    DevToolsApp.copyText(outputEl.value, copyBtn);
  });

  downloadBtn.addEventListener('click', () => {
    DevToolsApp.downloadFile(outputEl.value, 'index.min.html', 'text/html');
  });

  exampleBtn.addEventListener('click', () => {
    inputEl.value = EXAMPLE_HTML;
    runMinification();
    DevToolsApp.showToast('Loaded example HTML document', 'info');
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputEl.value = text;
      runMinification();
      DevToolsApp.showToast('Pasted from clipboard', 'success');
    } catch (e) {
      DevToolsApp.showToast('Please press Ctrl+V to paste', 'info');
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runMinification();
    }
  });

  DevToolsApp.setupFileHandling(dropZone, inputEl, runMinification);

  // Initial load
  inputEl.value = EXAMPLE_HTML;
  runMinification();
});
