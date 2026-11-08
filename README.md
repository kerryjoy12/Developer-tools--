# DevTools Hub

DevTools Hub is a static website containing six small developer utilities: a JSON formatter and validator, HTML minifier, CSS beautifier/minifier, Base64 encoder/decoder, URL encoder/decoder, and UUID v4/v7 generator. The browser tools use vanilla JavaScript and the shared engine in `assets/js/core-tools.js`.

## Run locally

The pages use relative asset and navigation paths so individual pages can be opened from a local file preview. For a more representative test of static hosting, open a terminal in this directory and run a simple local HTTP server, for example:

```powershell
py -m http.server 8000
```

Then visit `http://localhost:8000/`. Service workers are only registered over HTTP(S), not `file:` URLs. Clipboard access can also be restricted by a browser when pages are opened directly from disk. These restrictions do not affect the core parsing, formatting, encoding, or UUID operations.

## Run the test suite

Node.js is required; the tests use only built-in modules and the project’s own engine.

```powershell
node tests\run-node-tests.js
```

The runner exercises the six core tool APIs and checks that all six static tool pages include their matching controller, required editor control, and shared engine.

## Privacy and data handling

The tools process editor content in browser JavaScript. They do not submit input to a DevTools Hub conversion API. The Base64 file feature reads the selected local file through the browser File API and builds a data URI in the page; it does not upload the file. Clipboard reads are user-triggered and may require browser permission. Do not use shared devices or paste real secrets into public screen shares: browser extensions, operating-system clipboard history, downloads, and hosting infrastructure are outside the tools’ local conversion code.

The consent control stores the accepted/rejected preference in browser local storage. A manually selected theme is persisted only when preference storage is accepted. No analytics or advertising script is enabled in the current source. Static hosting necessarily receives page and asset requests; review the hosting provider’s policies for its infrastructure data handling.

## Contact integration status

`contact.html` intentionally shows a disabled form and an explicit `https://formspree.io/f/YOUR_FORM_ID` placeholder. This endpoint is not configured and cannot deliver a message. Do not enable the form or claim that messages are sent until a real destination, privacy disclosures, and delivery behavior have been verified.

## Static hosting notes

The repository includes GitHub Pages support files, a sitemap, a service worker, and canonical/structured metadata. Before publishing, verify that the configured custom domain in `CNAME` is owned and intended for this deployment, validate the sitemap and canonical URLs, and test the site under the actual project or custom-domain base path. The pages themselves use relative links and assets to work under a project subpath; the existing home page and some pre-existing files may still contain root-absolute URLs and should be checked if the site is deployed under a repository subdirectory.

`404.html` is the static-hosting fallback page. No contact identity, organization address, or active email is invented by this project. Check the contents of all policy pages against the operator’s actual jurisdiction and hosting configuration before relying on them as legal advice.

## Project layout

```text
assets/
  css/       Shared site, tool, and blog styles
  img/       Local SVG icon and social preview
  js/        Shared core, application UI, and tool controllers
tools/       Interactive tool pages
blog/        Engineering blog index and articles
tests/       Browser test page and Node.js unit runner
```

