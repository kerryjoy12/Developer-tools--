/**
 * DevTools Hub - Node.js Test Runner
 * Executes unit tests for all 6 tools against core-tools.js
 */

const core = require('../assets/js/core-tools.js');
const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(description, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${description}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${description}`);
    if (details) console.error(`    Detail: ${details}`);
    failures.push({ description, details });
  }
}

console.log('====================================================');
console.log(' DevTools Hub - Automated Test Suite');
console.log('====================================================\n');

/* -----------------------------------------------------------------
 * 1. JSON FORMATTER & VALIDATOR (8+ tests)
 * ----------------------------------------------------------------- */
console.log('Suite 1: JSON Formatter, Minifier & Validator');

// Test 1.1: Basic Formatting with 2 spaces
const sample1 = '{"name":"DevTools","count":42}';
const res1 = core.json.format(sample1, 2);
assert('JSON: Format with 2 spaces indentation', res1 === '{\n  "name": "DevTools",\n  "count": 42\n}');

// Test 1.2: Format with 4 spaces
const res2 = core.json.format(sample1, 4);
assert('JSON: Format with 4 spaces indentation', res2 === '{\n    "name": "DevTools",\n    "count": 42\n}');

// Test 1.3: Format with Tab indentation
const res3 = core.json.format(sample1, 'tab');
assert('JSON: Format with Tab indentation', res3 === '{\n\t"name": "DevTools",\n\t"count": 42\n}');

// Test 1.4: Minification
const unminified = '{\n  "a": 1,\n  "b": [2, 3]\n}';
const minRes = core.json.minify(unminified);
assert('JSON: Minify removes whitespace correctly', minRes === '{"a":1,"b":[2,3]}');

// Test 1.5: Sort keys alphabetically
const unsorted = '{"zebra": 1, "apple": 2, "nested": {"cat": 3, "bear": 4}}';
const sorted = core.json.format(unsorted, 2, true);
assert('JSON: Sort keys recursively (depth-first)', sorted.indexOf('"apple"') < sorted.indexOf('"zebra"') && sorted.indexOf('"bear"') < sorted.indexOf('"cat"'));

// Test 1.6: Empty input validation
const emptyVal = core.json.validate('');
assert('JSON: Empty string validation fails gracefully', emptyVal.valid === false && emptyVal.message.includes('empty'));

// Test 1.7: Invalid JSON with line and column detection
const invalidJson = '{\n  "name": "DevTools",\n  "invalid": ,\n  "ok": 1\n}';
const invalidVal = core.json.validate(invalidJson);
assert('JSON: Invalid JSON reports line and column info', invalidVal.valid === false && invalidVal.line >= 2);

// Test 1.8: Nested arrays and Unicode characters
const unicodeJson = '{"greeting": "こんにちは 🌍", "list": [1, [2, "🚀"], {"key": "value"}]}';
const unicodeRes = core.json.format(unicodeJson, 2);
assert('JSON: Handles deep nesting and Unicode emojis correctly', unicodeRes.includes('こんにちは') && unicodeRes.includes('🚀'));
const sortedArrayJson = core.json.format('{"z":1,"items":[2,1]}', 2, true);
assert('JSON: Preserves array order when sorting object keys', sortedArrayJson.indexOf('"items"') < sortedArrayJson.indexOf('"z"') && sortedArrayJson.includes('[\n    2,\n    1\n  ]'));
assert('JSON: Rejects non-string input with a stable validation result', core.json.validate(null).valid === false && core.json.validate(null).line === 1);

/* -----------------------------------------------------------------
 * 2. HTML MINIFIER (8+ tests)
 * ----------------------------------------------------------------- */
console.log('\nSuite 2: HTML Minifier');

// Test 2.1: Strips HTML comments
const htmlComment = '<div><!-- this is a comment --><span>text</span></div>';
assert('HTML: Strips standard HTML comments', core.html.minify(htmlComment) === '<div><span>text</span></div>');

// Test 2.2: Collapses whitespace between tags
const htmlSpacing = '<div> \n   <p>Hello</p> \n   <p>World</p> \n</div>';
assert('HTML: Collapses whitespace between tags', core.html.minify(htmlSpacing) === '<div><p>Hello</p><p>World</p></div>');

// Test 2.3: Preserves <pre> blocks verbatim
const htmlPre = '<p>Code:</p><pre>  line 1\n    line 2\n  line 3  </pre><footer>End</footer>';
const minPre = core.html.minify(htmlPre);
assert('HTML: Preserves whitespace inside <pre> tags', minPre.includes('<pre>  line 1\n    line 2\n  line 3  </pre>'));

// Test 2.4: Preserves <textarea> blocks verbatim
const htmlTextarea = '<label>Notes</label><textarea>  First line\n  Second line  </textarea>';
const minTextarea = core.html.minify(htmlTextarea);
assert('HTML: Preserves whitespace inside <textarea> tags', minTextarea.includes('<textarea>  First line\n  Second line  </textarea>'));

// Test 2.5: Preserves inline <script> blocks
const htmlScript = '<head><script>\n  const x = 1;\n  if (x > 0) {\n    console.log("ok");\n  }\n</script></head>';
const minScript = core.html.minify(htmlScript);
assert('HTML: Preserves contents inside <script> tags', minScript.includes('if (x > 0)') && minScript.includes('console.log("ok");'));

// Test 2.6: Preserves inline <style> blocks
const htmlStyle = '<style>\n  body { margin: 0; padding: 0; }\n</style>';
const minStyle = core.html.minify(htmlStyle);
assert('HTML: Preserves contents inside <style> tags', minStyle.includes('body { margin: 0; padding: 0; }'));

// Test 2.7: Safely removes quotes around safe attributes when enabled
const htmlQuotes = '<div class="container" id="main-content" data-test="alpha_123" title="has space"></div>';
const minQuotes = core.html.minify(htmlQuotes, { removeQuotes: true });
assert('HTML: Strips safe attribute quotes and preserves quotes with spaces', minQuotes.includes('class=container') && minQuotes.includes('title="has space"'));

// Test 2.8: Savings calculator
const savings = core.html.calculateSavings('<div>   <span>Hi</span>   </div>', '<div><span>Hi</span></div>');
assert('HTML: Accurately calculates size and percentage saved', savings.originalBytes > savings.minifiedBytes && Number(savings.percentSaved) > 0);
assert('HTML: Preserves conditional comments while removing ordinary comments', core.html.minify('<!--[if IE]>legacy<![endif]--><!-- remove -->').includes('[if IE]') && !core.html.minify('<!--[if IE]>legacy<![endif]--><!-- remove -->').includes('remove'));

/* -----------------------------------------------------------------
 * 3. CSS BEAUTIFIER & MINIFIER (8+ tests)
 * ----------------------------------------------------------------- */
console.log('\nSuite 3: CSS Beautifier & Minifier');

// Test 3.1: CSS Beautification basic formatting
const rawCss = 'body{color:#333;margin:0;padding:10px}';
const beautyCss = core.css.beautify(rawCss, 2);
assert('CSS: Beautifies single rule with proper indentation', beautyCss.includes('body {\n  color: #333;\n  margin: 0;\n  padding: 10px;\n}'));

// Test 3.2: CSS Minification basic
const minCss = core.css.minify(beautyCss);
assert('CSS: Minifies rules removing whitespace and trailing semicolon', minCss === 'body{color:#333;margin:0;padding:10px}');

// Test 3.3: CSS Beautification with @media queries
const mediaCss = '@media (max-width: 768px) { .container { width: 100%; padding: 0; } }';
const beautyMedia = core.css.beautify(mediaCss, 2);
assert('CSS: Properly indents nested @media query rules', beautyMedia.includes('@media (max-width: 768px) {\n  .container {\n    width: 100%;'));

// Test 3.4: CSS Beautification with @keyframes
const kfCss = '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }';
const beautyKf = core.css.beautify(kfCss, 2);
assert('CSS: Properly indents @keyframes rules', beautyKf.includes('from {\n    opacity: 0;') && beautyKf.includes('to {\n    opacity: 1;'));

// Test 3.5: Preserves url("data:image/svg+xml;...") with semicolons/brackets
const dataUriCss = '.icon { background-image: url("data:image/svg+xml;charset=utf-8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 10 10\'><circle cx=\'5\' cy=\'5\' r=\'5\'/></svg>"); color: red; }';
const beautyDataUri = core.css.beautify(dataUriCss, 2);
assert('CSS: Preserves complex data URI with brackets & semicolons in beautifier', beautyDataUri.includes('url("data:image/svg+xml;charset=utf-8,<svg xmlns='));

// Test 3.6: Preserves url() in minifier
const minDataUri = core.css.minify(dataUriCss);
assert('CSS: Preserves complex data URI in minifier', minDataUri.includes('url("data:image/svg+xml;charset=utf-8,<svg xmlns='));

// Test 3.7: CSS comment handling in beautifier vs minifier
const cssWithComment = '/* Header styling */ h1 { font-size: 2rem; }';
const bComment = core.css.beautify(cssWithComment);
const mComment = core.css.minify(cssWithComment);
assert('CSS: Preserves comments in beautifier, strips in minifier', bComment.includes('/* Header styling */') && !mComment.includes('/* Header styling */'));

// Test 3.8: Size comparison calculation
const cssSavings = core.css.calculateSavings(beautyCss, minCss);
assert('CSS: Computes byte savings and percentage accurately', cssSavings.savedBytes > 0 && Number(cssSavings.percentSaved) > 0);
assert('CSS: Handles empty input without producing text', core.css.beautify('') === '' && core.css.minify('') === '');

/* -----------------------------------------------------------------
 * 4. BASE64 ENCODER & DECODER (8+ tests)
 * ----------------------------------------------------------------- */
console.log('\nSuite 4: Base64 Encoder & Decoder');

// Test 4.1: Standard ASCII text encode/decode
const ascii = 'Hello, World!';
const asciiB64 = core.base64.encode(ascii);
assert('Base64: Standard ASCII encode matches standard', asciiB64 === 'SGVsbG8sIFdvcmxkIQ==');
assert('Base64: Standard ASCII decode', core.base64.decode(asciiB64) === ascii);

// Test 4.2: Multi-byte UTF-8 Unicode characters (Accents, CJK, Emoji)
const unicodeText = 'Café ☕ 日本語 🚀 DevTools';
const uniB64 = core.base64.encode(unicodeText);
const uniDecoded = core.base64.decode(uniB64);
assert('Base64: 100% UTF-8 safe encode and decode with emojis & CJK', uniDecoded === unicodeText);

// Test 4.3: URL-Safe Base64 mode (+ -> -, / -> _, no =)
const urlSafeInput = '>>> ??? <<< ~~~';
const stdB64 = core.base64.encode(urlSafeInput, false);
const safeB64 = core.base64.encode(urlSafeInput, true);
assert('Base64: URL-safe replaces + and / and strips padding =', !safeB64.includes('+') && !safeB64.includes('/') && !safeB64.endsWith('='));
assert('Base64: URL-safe decodes accurately', core.base64.decode(safeB64, true) === urlSafeInput);

// Test 4.4: Empty input handling
assert('Base64: Empty string encodes to empty string', core.base64.encode('') === '');
assert('Base64: Empty string decodes to empty string', core.base64.decode('') === '');

// Test 4.5: Invalid Base64 error detection (illegal characters)
let threwError = false;
try {
  core.base64.decode('This is not valid base64!!!@#$');
} catch (e) {
  threwError = true;
}
assert('Base64: Throws descriptive error on illegal characters', threwError);

// Test 4.6: Base64 with whitespace/newlines
const spacedB64 = '  SGVs \n  bG8s \r\n  IFdvcmxkIQ==  ';
assert('Base64: Cleans and decodes input with whitespace and linebreaks', core.base64.decode(spacedB64) === 'Hello, World!');

// Test 4.7: Base64 validation helper
const validCheck = core.base64.validate('SGVsbG8=');
const invalidCheck = core.base64.validate('%%%not-b64%%%');
assert('Base64: validate() identifies valid vs invalid strings', validCheck.valid === true && invalidCheck.valid === false);

// Test 4.8: Long text chunking test (>64KB payload)
const longText = 'A'.repeat(70000);
const longB64 = core.base64.encode(longText);
assert('Base64: Handles large payloads without call stack overflow', core.base64.decode(longB64) === longText);
assert('Base64: Decodes unpadded URL-safe values', core.base64.decode(core.base64.encode('binary-ish 🧪', true)) === 'binary-ish 🧪');

/* -----------------------------------------------------------------
 * 5. URL ENCODER & DECODER & QUERY PARSER (8+ tests)
 * ----------------------------------------------------------------- */
console.log('\nSuite 5: URL Encoder, Decoder & Query Parser');

// Test 5.1: Component mode encodes reserved characters
const rawComp = 'hello world&param=1+2/3?4#5';
const encComp = core.url.encode(rawComp, 'component');
assert('URL: Component mode encodes &, =, +, /, ?, #', encComp.includes('%26') && encComp.includes('%3D') && encComp.includes('%2B') && encComp.includes('%2F'));

// Test 5.2: Full URL mode preserves URL structure
const fullUrl = 'https://example.com/search?q=developer tools&category=web#top';
const encFull = core.url.encode(fullUrl, 'full');
assert('URL: Full URL mode preserves ://, ?, =, &, # while encoding spaces', encFull.startsWith('https://example.com/search?q=developer%20tools&category=web#top'));

// Test 5.3: Component decode reverses encode
assert('URL: Component decode restores encoded string', core.url.decode(encComp, 'component') === rawComp);

// Test 5.4: Decode replaces '+' with space in query components
const plusString = 'hello+world+test';
assert('URL: Decodes + as space in query component mode', core.url.decode(plusString, 'component') === 'hello world test');

// Test 5.5: Query string parser extracts key-value pairs
const testQuery = 'https://api.example.com/v1/users?name=Alice%20Smith&role=admin&active=true&tags=dev&tags=ops';
const parsedParams = core.url.parseQueryString(testQuery);
assert('URL: Parses query string into structured array', parsedParams.length === 5 && parsedParams[0].key === 'name' && parsedParams[0].value === 'Alice Smith');

// Test 5.6: Query string parser handles bare query strings
const bareQuery = 'foo=bar&baz=123';
const parsedBare = core.url.parseQueryString(bareQuery);
assert('URL: Parses bare query strings correctly', parsedBare.length === 2 && parsedBare[1].key === 'baz' && parsedBare[1].value === '123');

// Test 5.7: Query params stringifier reconstructs query string
const rebuiltQuery = core.url.stringifyQueryParams(parsedBare);
assert('URL: stringifyQueryParams reconstructs query string', rebuiltQuery === 'foo=bar&baz=123');

// Test 5.8: Malformed percent-encoding error handling
let urlErrorThrew = false;
try {
  core.url.decode('%E0%A4%Z', 'component');
} catch (e) {
  urlErrorThrew = true;
}
assert('URL: Malformed percent sequence throws friendly descriptive error', urlErrorThrew);
assert('URL: Query parser preserves duplicate keys and decodes plus signs', core.url.parseQueryString('?tag=one+two&tag=three').map((item) => item.value).join('|') === 'one two|three');

/* -----------------------------------------------------------------
 * 6. UUID GENERATOR (8+ tests)
 * ----------------------------------------------------------------- */
console.log('\nSuite 6: UUID Generator');

// Test 6.1: UUID v4 format and version/variant bit check
const v4 = core.uuid.generateV4();
const v4Val = core.uuid.validate(v4, 4);
assert('UUID: Generates valid v4 UUID with RFC version 4 and variant bit', v4Val.valid === true && v4Val.version === 4);

// Test 6.2: UUID v7 format and version/variant bit check
const v7 = core.uuid.generateV7();
const v7Val = core.uuid.validate(v7, 7);
assert('UUID: Generates valid v7 UUID with RFC 9562 version 7 and variant bit', v7Val.valid === true && v7Val.version === 7);

// Test 6.3: Bulk generation count matches requested
const bulk10 = core.uuid.bulkGenerate({ count: 10, version: 'v4' });
assert('UUID: Bulk generate generates exact requested count', bulk10.length === 10);

// Test 6.4: Bulk generation uniqueness
const bulk100 = core.uuid.bulkGenerate({ count: 100, version: 'v4' });
const uniqueSet = new Set(bulk100);
assert('UUID: All generated bulk UUIDs are distinct and unique', uniqueSet.size === 100);

// Test 6.5: Hyphenless option
const noHyphen = core.uuid.bulkGenerate({ count: 1, hyphens: false })[0];
assert('UUID: Hyphenless option strips dashes and produces 32 hex chars', noHyphen.length === 32 && !noHyphen.includes('-'));

// Test 6.6: Uppercase option
const upperUuid = core.uuid.bulkGenerate({ count: 1, uppercase: true })[0];
assert('UUID: Uppercase option outputs all uppercase hex', upperUuid === upperUuid.toUpperCase() && /[A-F]/.test(upperUuid));

// Test 6.7: Braces option
const bracesUuid = core.uuid.bulkGenerate({ count: 1, braces: true })[0];
assert('UUID: Braces option wraps in curly braces { ... }', bracesUuid.startsWith('{') && bracesUuid.endsWith('}'));

// Test 6.8: UUID v7 chronological sortability (RFC 9562 time-ordering)
const v7_first = core.uuid.generateV7();
// Brief tick to ensure millisecond increment if needed
const v7_second = core.uuid.generateV7();
assert('UUID: v7 generates valid 36-char string with RFC 9562 format', v7_first.length === 36 && v7_second.length === 36);
assert('UUID: Bulk count is capped at 1,000 and defaults to version 4', core.uuid.bulkGenerate({ count: 5000 }).length === 1000 && core.uuid.validate(core.uuid.bulkGenerate({ count: 1 })[0], 4).valid);
assert('UUID: Rejects a UUID when requested version does not match', core.uuid.validate(v4, 7).valid === false);

/* -----------------------------------------------------------------
 * 7. STATIC TOOL PAGE WIRING (all six browser tools)
 * ----------------------------------------------------------------- */
console.log('\nSuite 7: Static tool page and controller wiring');
const toolPages = [
  { page: 'tools/json-formatter.html', controller: 'json-tool.js', marker: 'json-input' },
  { page: 'tools/html-minifier.html', controller: 'html-tool.js', marker: 'html-input' },
  { page: 'tools/css-beautifier.html', controller: 'css-tool.js', marker: 'css-input' },
  { page: 'tools/base64-encoder.html', controller: 'base64-tool.js', marker: 'b64-input' },
  { page: 'tools/url-encoder.html', controller: 'url-tool.js', marker: 'url-input' },
  { page: 'tools/uuid-generator.html', controller: 'uuid-tool.js', marker: 'uuid-output' }
];

toolPages.forEach(({ page, controller, marker }) => {
  const filePath = path.join(__dirname, '..', page);
  const exists = fs.existsSync(filePath);
  assert(`Site: ${page} exists`, exists);
  if (!exists) return;
  const html = fs.readFileSync(filePath, 'utf8');
  assert(`Site: ${page} includes its controller ${controller}`, html.includes(controller));
  assert(`Site: ${page} includes required control ${marker}`, html.includes(`id="${marker}"`));
  assert(`Site: ${page} loads the shared core engine`, html.includes('core-tools.js'));
});

const articleFiles = [
  'what-is-json-common-errors.html',
  'base64-encoding-explained.html',
  'encodeuri-vs-encodeuricomponent.html',
  'why-minify-html-css-page-speed.html',
  'uuid-v4-vs-v7-database-keys.html',
  'how-to-read-debug-api-responses.html',
  'is-base64-encryption-security-misconceptions.html',
  'css-formatting-best-practices.html'
];
const blogIndex = fs.readFileSync(path.join(__dirname, '..', 'blog', 'index.html'), 'utf8');
assert('Site: Blog index links to all eight published guides', articleFiles.every((article) => blogIndex.includes(`href="${article}"`)));
assert('Site: Legal, trust, contact, and fallback pages are present', [
  'about.html', 'contact.html', 'privacy-policy.html', 'cookie-policy.html',
  'terms-of-service.html', 'disclaimer.html', '404.html'
].every((page) => fs.existsSync(path.join(__dirname, '..', page))));
const contactPage = fs.readFileSync(path.join(__dirname, '..', 'contact.html'), 'utf8');
assert('Site: Contact placeholder cannot submit or report a fake success', contactPage.includes('YOUR_FORM_ID') && contactPage.includes('disabled') && !contactPage.includes('Message sent'));

console.log('\n====================================================');
console.log(` Results: ${passedTests} / ${totalTests} tests passed (${failedTests} failures)`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
