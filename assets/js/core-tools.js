/**
 * DevTools Hub - Core Processing Engine
 * Pure, zero-dependency, unit-tested engine for developer tools.
 * All operations execute 100% client-side in the user's browser.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DevToolsCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Polyfill crypto if in environments where crypto isn't global
  const getCrypto = () => {
    if (typeof crypto !== 'undefined') return crypto;
    if (typeof window !== 'undefined' && window.crypto) return window.crypto;
    try {
      return require('crypto').webcrypto || require('crypto');
    } catch (e) {
      return null;
    }
  };

  /* =========================================================================
   * 1. JSON FORMATTER, VALIDATOR & MINIFIER
   * ========================================================================= */
  const json = {
    /**
     * Recursively sort object keys alphabetically. Arrays preserve element order.
     */
    sortObjectKeys(val) {
      if (val === null || typeof val !== 'object') {
        return val;
      }
      if (Array.isArray(val)) {
        return val.map(json.sortObjectKeys);
      }
      const sortedKeys = Object.keys(val).sort();
      const result = {};
      for (const key of sortedKeys) {
        result[key] = json.sortObjectKeys(val[key]);
      }
      return result;
    },

    /**
     * Validate JSON string and pinpoint error location (line, column, position)
     */
    validate(jsonStr) {
      if (typeof jsonStr !== 'string') {
        return { valid: false, message: 'Input must be a string.', line: 1, column: 1, position: 0 };
      }
      const trimmed = jsonStr.trim();
      if (!trimmed) {
        return { valid: false, message: 'Input is empty.', line: 1, column: 1, position: 0 };
      }

      try {
        const parsed = JSON.parse(jsonStr);
        return { valid: true, message: 'Valid JSON', parsed };
      } catch (err) {
        const message = err.message || 'Syntax error';
        let position = -1;
        let line = 1;
        let column = 1;

        // Pattern 1: "(line X column Y)"
        const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
        if (lineColMatch) {
          line = parseInt(lineColMatch[1], 10);
          column = parseInt(lineColMatch[2], 10);
          return { valid: false, message, line, column, position };
        }

        // Pattern 2: "at position N"
        const posMatch = message.match(/position\s+(\d+)/i);
        if (posMatch) {
          position = parseInt(posMatch[1], 10);
        }

        // Pattern 3: V8 snippet format: Unexpected token '...', ..."<snippet>"...
        if (position === -1) {
          const snippetMatch = message.match(/\.\.\."?([\s\S]+?)"?\.\.\./);
          if (snippetMatch) {
            const snippet = snippetMatch[1].replace(/\\n/g, '\n').slice(0, 15);
            const foundIdx = jsonStr.indexOf(snippet);
            if (foundIdx !== -1) {
              position = foundIdx;
            }
          }
        }

        // Pattern 4: Fallback to token character offset
        if (position === -1) {
          const tokenMatch = message.match(/Unexpected token '([^']+)'/);
          if (tokenMatch) {
            const token = tokenMatch[1];
            const idx = jsonStr.indexOf(token);
            if (idx !== -1) {
              position = idx;
            }
          }
        }

        // Calculate line and column from position offset
        if (position >= 0) {
          const clampedPos = Math.min(position, jsonStr.length);
          const lines = jsonStr.slice(0, clampedPos).split('\n');
          line = lines.length;
          column = lines[lines.length - 1].length + 1;
        }

        return { valid: false, message, line, column, position };
      }
    },

    /**
     * Format JSON string with customizable indentation and optional key sorting
     */
    format(jsonStr, indent = 2, sortKeys = false) {
      const valRes = json.validate(jsonStr);
      if (!valRes.valid) {
        throw new Error(`Invalid JSON: ${valRes.message} (Line ${valRes.line}, Column ${valRes.column})`);
      }

      let data = valRes.parsed;
      if (sortKeys) {
        data = json.sortObjectKeys(data);
      }

      const indentStr = indent === 'tab' || indent === '\t' ? '\t' : Number(indent) || 2;
      return JSON.stringify(data, null, indentStr);
    },

    /**
     * Minify JSON string (remove all unneeded whitespace)
     */
    minify(jsonStr) {
      const valRes = json.validate(jsonStr);
      if (!valRes.valid) {
        throw new Error(`Invalid JSON: ${valRes.message} (Line ${valRes.line}, Column ${valRes.column})`);
      }
      return JSON.stringify(valRes.parsed);
    }
  };

  /* =========================================================================
   * 2. HTML MINIFIER
   * ========================================================================= */
  const html = {
    /**
     * Minify HTML preserving <pre>, <textarea>, <script>, <style> blocks.
     */
    minify(htmlStr, options = {}) {
      if (typeof htmlStr !== 'string') return '';
      if (!htmlStr.trim()) return '';

      const {
        removeComments = true,
        collapseWhitespace = true,
        removeOptionalTags = false,
        removeQuotes = false
      } = options;

      let result = htmlStr;
      const preservedBlocks = [];

      // 1. Stash <pre>, <textarea>, <script>, <style> blocks
      const preserveRegex = /<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
      result = result.replace(preserveRegex, (match) => {
        const token = `___DEVTOOLS_PRESERVE_${preservedBlocks.length}___`;
        preservedBlocks.push(match);
        return token;
      });

      // 2. Remove HTML comments (preserving conditional IE comments if present)
      if (removeComments) {
        result = result.replace(/<!--(?!\s*(?:\[if [^\]]+]|<!|>))(?:(?!-->)[\s\S])*-->/g, '');
      }

      // 3. Collapse whitespace
      if (collapseWhitespace) {
        // Collapse space between tags
        result = result.replace(/>\s+</g, '><');
        // Collapse multiple spaces/newlines inside text and tags
        result = result.replace(/\s{2,}/g, ' ');
      }

      // 4. Optionally remove quotes around safe attributes
      if (removeQuotes) {
        // Only strip quotes if attribute value consists solely of safe characters
        result = result.replace(/(\s[a-zA-Z0-9_\-]+)=["']([a-zA-Z0-9_\-\.:\/]+)["']/g, '$1=$2');
      }

      // 5. Optionally remove optional closing tags (HTML5 spec section 8.1.2.4)
      if (removeOptionalTags) {
        result = result.replace(/<\/(li|dt|dd|p|tr|td|th|thead|tbody|tfoot)>/gi, '');
      }

      // 6. Restore preserved blocks
      for (let i = 0; i < preservedBlocks.length; i++) {
        result = result.replace(`___DEVTOOLS_PRESERVE_${i}___`, preservedBlocks[i]);
      }

      return result.trim();
    },

    calculateSavings(original, minified) {
      const origBytes = new TextEncoder().encode(original || '').length;
      const minBytes = new TextEncoder().encode(minified || '').length;
      const diff = Math.max(0, origBytes - minBytes);
      const percent = origBytes > 0 ? ((diff / origBytes) * 100).toFixed(2) : '0.00';
      return {
        originalBytes: origBytes,
        minifiedBytes: minBytes,
        savedBytes: diff,
        percentSaved: percent
      };
    }
  };

  /* =========================================================================
   * 3. CSS BEAUTIFIER & MINIFIER
   * ========================================================================= */
  const css = {
    /**
     * Format/Beautify CSS with correct indentation, handling comments, @media,
     * @keyframes, strings and url() values safely.
     */
    beautify(cssStr, indentOption = 2) {
      if (typeof cssStr !== 'string') return '';
      const indentUnit = indentOption === 'tab' || indentOption === '\t' ? '\t' : ' '.repeat(Number(indentOption) || 2);

      // Tokenize strings, comments, and url() blocks to prevent tampering
      const tokens = [];
      const stash = (str) => {
        const id = `___CSS_TOKEN_${tokens.length}___`;
        tokens.push(str);
        return id;
      };

      let text = cssStr;

      // Stash comments
      text = text.replace(/\/\*[\s\S]*?\*\//g, stash);

      // Stash url() expressions (including url("data:..."))
      text = text.replace(/url\((?:['"][^'"]*['"]|[^)]*)\)/gi, stash);

      // Stash quoted strings
      text = text.replace(/(["'])(?:(?=(\\?))\2[\s\S])*?\1/g, stash);

      // Normalize whitespace around structural tokens
      text = text
        .replace(/([^;\{\}\s])\s*\}/g, '$1;\n}') // Ensure trailing semicolon before closing brace
        .replace(/\s+/g, ' ')
        .replace(/\s*\{\s*/g, ' {\n')
        .replace(/\s*\}\s*/g, '\n}\n')
        .replace(/\s*;\s*/g, ';\n')
        .replace(/\s*:\s*/g, ': ')
        .replace(/\s*,\s*/g, ', ');

      const lines = text.split('\n');
      let depth = 0;
      const formattedLines = [];

      for (let rawLine of lines) {
        let line = rawLine.trim();
        if (!line) continue;

        // If line starts with closing brace, decrease depth before indenting
        if (line.startsWith('}')) {
          depth = Math.max(0, depth - 1);
        }

        const currentIndent = indentUnit.repeat(depth);
        formattedLines.push(currentIndent + line);

        // If line ends with opening brace, increase depth for next lines
        if (line.endsWith('{')) {
          depth++;
        }
      }

      let result = formattedLines.join('\n');

      // Unstash tokens
      for (let i = 0; i < tokens.length; i++) {
        result = result.replace(`___CSS_TOKEN_${i}___`, tokens[i]);
      }

      return result.trim();
    },

    /**
     * Minify CSS
     */
    minify(cssStr) {
      if (typeof cssStr !== 'string') return '';
      if (!cssStr.trim()) return '';

      const tokens = [];
      const stash = (str) => {
        const id = `___CSS_MIN_TOKEN_${tokens.length}___`;
        tokens.push(str);
        return id;
      };

      let text = cssStr;

      // Stash comments? We want to remove comments in minification, except license comments /*! ... */
      text = text.replace(/\/\*![\s\S]*?\*\//g, stash);
      text = text.replace(/\/\*[\s\S]*?\*\//g, '');

      // Stash url() expressions
      text = text.replace(/url\((?:['"][^'"]*['"]|[^)]*)\)/gi, stash);

      // Stash quoted strings
      text = text.replace(/(["'])(?:(?=(\\?))\2[\s\S])*?\1/g, stash);

      // Collapse whitespace
      text = text
        .replace(/\s+/g, ' ')
        .replace(/\s*([\{\};:,>~+])\s*/g, '$1')
        .replace(/;}/g, '}'); // Remove redundant trailing semicolon before closing brace

      // Unstash preserved tokens
      for (let i = 0; i < tokens.length; i++) {
        text = text.replace(`___CSS_MIN_TOKEN_${i}___`, tokens[i]);
      }

      return text.trim();
    },

    calculateSavings(original, minified) {
      return html.calculateSavings(original, minified);
    }
  };

  /* =========================================================================
   * 4. BASE64 ENCODER & DECODER (100% UTF-8 SAFE)
   * ========================================================================= */
  const base64 = {
    /**
     * UTF-8 safe Base64 encode.
     * Prevents btoa Unicode Latin1 errors on emojis, CJK, accents.
     */
    encode(str, urlSafe = false) {
      if (typeof str !== 'string') return '';
      if (str.length === 0) return '';

      let base64Result = '';

      if (typeof TextEncoder !== 'undefined') {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        const len = bytes.byteLength;
        const chunkSize = 0x8000; // 32KB chunking to avoid max call stack
        for (let i = 0; i < len; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
          binary += String.fromCharCode.apply(null, chunk);
        }
        base64Result = (typeof btoa !== 'undefined' ? btoa : (b) => Buffer.from(b, 'binary').toString('base64'))(binary);
      } else {
        // Fallback for older environments
        base64Result = Buffer.from(str, 'utf-8').toString('base64');
      }

      if (urlSafe) {
        base64Result = base64Result
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      }

      return base64Result;
    },

    /**
     * UTF-8 safe Base64 decode.
     * Handles standard and URL-safe Base64 strings.
     */
    decode(base64Str, urlSafe = false) {
      if (typeof base64Str !== 'string') return '';
      let clean = base64Str.trim().replace(/\s+/g, '');
      if (clean.length === 0) return '';

      // Normalize URL-safe characters
      clean = clean.replace(/-/g, '+').replace(/_/g, '/');

      // Restore padding if missing
      while (clean.length % 4 !== 0) {
        clean += '=';
      }

      // Check for illegal Base64 characters
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
        throw new Error('Invalid Base64 string: Contains illegal characters.');
      }

      let binary = '';
      try {
        binary = (typeof atob !== 'undefined' ? atob : (b) => Buffer.from(b, 'base64').toString('binary'))(clean);
      } catch (e) {
        throw new Error('Invalid Base64 sequence: Unable to decode.');
      }

      if (typeof TextDecoder !== 'undefined') {
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        try {
          return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch (e) {
          // If decoding strictly as UTF-8 fails (e.g. raw binary file), return binary string
          return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        }
      } else {
        return Buffer.from(clean, 'base64').toString('utf-8');
      }
    },

    /**
     * Validate Base64 string syntax
     */
    validate(str) {
      if (!str || !str.trim()) return { valid: false, message: 'Input is empty' };
      const clean = str.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
      const padded = clean.padEnd(clean.length + (4 - (clean.length % 4)) % 4, '=');
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(padded)) {
        return { valid: false, message: 'Invalid character detected.' };
      }
      try {
        base64.decode(str);
        return { valid: true, message: 'Valid Base64' };
      } catch (err) {
        return { valid: false, message: err.message };
      }
    }
  };

  /* =========================================================================
   * 5. URL ENCODER, DECODER & QUERY PARSER
   * ========================================================================= */
  const url = {
    /**
     * Encode string in either 'component' or 'full' mode.
     */
    encode(str, mode = 'component') {
      if (typeof str !== 'string') return '';
      if (mode === 'full') {
        return encodeURI(str);
      }
      return encodeURIComponent(str);
    },

    /**
     * Decode URL encoded string.
     */
    decode(str, mode = 'component') {
      if (typeof str !== 'string') return '';
      try {
        if (mode === 'full') {
          return decodeURI(str);
        }
        // In component query mode, replace + with space
        const prepared = str.replace(/\+/g, ' ');
        return decodeURIComponent(prepared);
      } catch (err) {
        throw new Error(`Malformed URL sequence: ${err.message}`);
      }
    },

    /**
     * Parse query string or URL into structured key-value array.
     */
    parseQueryString(urlOrQuery) {
      if (typeof urlOrQuery !== 'string' || !urlOrQuery.trim()) {
        return [];
      }

      let queryStr = urlOrQuery.trim();
      // If full URL with question mark, extract everything after '?'
      const qIndex = queryStr.indexOf('?');
      if (qIndex !== -1) {
        queryStr = queryStr.slice(qIndex + 1);
      }
      // Strip hash fragment if present
      const hashIndex = queryStr.indexOf('#');
      if (hashIndex !== -1) {
        queryStr = queryStr.slice(0, hashIndex);
      }

      if (!queryStr) return [];

      const pairs = queryStr.split('&');
      const result = [];

      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        if (!pair) continue;
        const eqIndex = pair.indexOf('=');
        let key = eqIndex !== -1 ? pair.slice(0, eqIndex) : pair;
        let val = eqIndex !== -1 ? pair.slice(eqIndex + 1) : '';

        let decodedKey = key;
        let decodedVal = val;
        try {
          decodedKey = decodeURIComponent(key.replace(/\+/g, ' '));
        } catch (e) {
          decodedKey = key;
        }
        try {
          decodedVal = decodeURIComponent(val.replace(/\+/g, ' '));
        } catch (e) {
          decodedVal = val;
        }

        result.push({
          rawKey: key,
          rawValue: val,
          key: decodedKey,
          value: decodedVal
        });
      }

      return result;
    },

    /**
     * Convert array of { key, value } back to query string.
     */
    stringifyQueryParams(paramsArray) {
      if (!Array.isArray(paramsArray) || paramsArray.length === 0) return '';
      return paramsArray
        .filter((p) => p && p.key !== undefined && p.key !== '')
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`)
        .join('&');
    }
  };

  /* =========================================================================
   * 6. UUID GENERATOR (v4 and v7 RFC 9562)
   * ========================================================================= */
  const uuid = {
    /**
     * Generate standard UUID v4 using crypto.randomUUID or crypto.getRandomValues
     */
    generateV4() {
      const cr = getCrypto();
      if (cr && typeof cr.randomUUID === 'function') {
        return cr.randomUUID();
      }

      const bytes = new Uint8Array(16);
      if (cr && typeof cr.getRandomValues === 'function') {
        cr.getRandomValues(bytes);
      } else {
        // Math.random fallback with high entropy mixing
        for (let i = 0; i < 16; i++) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
      }

      // RFC 4122 variant & version
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xxxxxx

      return uuid._bytesToUuid(bytes);
    },

    /**
     * Generate UUID v7 (Unix Epoch timestamp + random bits per RFC 9562)
     */
    generateV7() {
      const cr = getCrypto();
      const bytes = new Uint8Array(16);

      if (cr && typeof cr.getRandomValues === 'function') {
        cr.getRandomValues(bytes);
      } else {
        for (let i = 0; i < 16; i++) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
      }

      // 48-bit timestamp in milliseconds
      const now = Date.now();
      bytes[0] = (now / 0x10000000000) & 0xff;
      bytes[1] = (now / 0x100000000) & 0xff;
      bytes[2] = (now / 0x1000000) & 0xff;
      bytes[3] = (now / 0x10000) & 0xff;
      bytes[4] = (now / 0x100) & 0xff;
      bytes[5] = now & 0xff;

      // Version 7: 0b0111 in high 4 bits of byte 6
      bytes[6] = (bytes[6] & 0x0f) | 0x70;
      // Variant: 0b10 in high 2 bits of byte 8
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      return uuid._bytesToUuid(bytes);
    },

    _bytesToUuid(bytes) {
      const hex = [];
      for (let i = 0; i < 16; i++) {
        hex.push(bytes[i].toString(16).padStart(2, '0'));
      }
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
    },

    /**
     * Format a UUID string according to user preferences
     */
    formatUuid(rawUuid, options = {}) {
      let result = rawUuid.toLowerCase();
      if (options.hyphens === false) {
        result = result.replace(/-/g, '');
      }
      if (options.uppercase === true) {
        result = result.toUpperCase();
      }
      if (options.braces === true) {
        result = `{${result}}`;
      }
      return result;
    },

    /**
     * Bulk generate UUIDs
     */
    bulkGenerate(options = {}) {
      const count = Math.min(Math.max(1, parseInt(options.count, 10) || 1), 1000);
      const version = options.version === 'v7' ? 'v7' : 'v4';
      const results = [];

      for (let i = 0; i < count; i++) {
        const raw = version === 'v7' ? uuid.generateV7() : uuid.generateV4();
        results.push(uuid.formatUuid(raw, options));
      }

      return results;
    },

    /**
     * Validate a UUID string against standard regex
     */
    validate(str, expectedVersion = null) {
      if (typeof str !== 'string') return { valid: false, message: 'Not a string' };
      const cleaned = str.trim().replace(/^\{|\}$/g, '');

      // Standard canonical 8-4-4-4-12 pattern
      const canonicalRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-([1-8])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const match = cleaned.match(canonicalRegex);

      if (!match) {
        // Also allow hyphenless 32-hex
        const unhyphenatedRegex = /^[0-9a-f]{12}([1-8])[0-9a-f]{3}[89ab][0-9a-f]{15}$/i;
        const unMatch = cleaned.match(unhyphenatedRegex);
        if (!unMatch) {
          return { valid: false, message: 'Invalid UUID format or variant.' };
        }
        const v = parseInt(unMatch[1], 10);
        if (expectedVersion && v !== Number(expectedVersion)) {
          return { valid: false, message: `Expected version ${expectedVersion}, got version ${v}.`, version: v };
        }
        return { valid: true, version: v };
      }

      const version = parseInt(match[1], 10);
      if (expectedVersion && version !== Number(expectedVersion)) {
        return { valid: false, message: `Expected version ${expectedVersion}, got version ${version}.`, version };
      }

      return { valid: true, version };
    }
  };

  return {
    json,
    html,
    css,
    base64,
    url,
    uuid
  };
});
