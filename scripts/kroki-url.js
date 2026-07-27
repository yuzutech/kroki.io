'use strict'

// Shared by scripts/generate-examples.js and scripts/cheatsheet/generate.js:
// builds a kroki.io GET URL from a diagram type/source/params, the same way
// the site's own "Try" editor does client-side (js/main.js, pako.deflate +
// url-safe base64). Keeping this in one place means data.json only stores
// the source and any extra HTTP params (background=transparent,
// view-key=Containers, ...) — never a precomputed, easy-to-forget-to-update
// getPath/clipboard pair.

const pako = require('pako')

// data.json stores "source" HTML-escaped where needed (so it can be dropped
// straight into a <pre><code> block) — decode it back before encoding for
// kroki, since kroki needs the real diagram text, not HTML entities.
function unescapeHtml (str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function buildUrl (type, format, source, params) {
  const deflated = pako.deflate(Buffer.from(unescapeHtml(source), 'utf8'), { level: 9 })
  const b64 = Buffer.from(deflated).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
  let getPath = `${type}/${format}/${b64}`
  if (params && Object.keys(params).length) {
    const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    getPath += `?${qs}`
  }
  return { getPath, clipboard: `https://kroki.io/${getPath}` }
}

module.exports = { buildUrl, unescapeHtml }