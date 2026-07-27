#!/usr/bin/env node
'use strict'

// Regenerates the catalog markup in examples.html from assets/examples/data.json.
// To add or edit an example: edit the JSON (and drop the matching SVG in
// assets/examples/), then re-run `npm run generate-examples`. Do not hand-edit
// the generated block between the CATALOG:START / CATALOG:END markers.

const fs = require('fs')
const path = require('path')
const { buildUrl } = require('./kroki-url')

const root = path.join(__dirname, '..')
const dataPath = path.join(root, 'assets', 'examples', 'data.json')
const examplesPath = path.join(root, 'examples.html')

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
const categoryLabels = new Map(data.categories.map((c) => [c.slug, c.label]))

function copyButton (clipboardUrl) {
  return `<button class="button is-small bd-copy" data-clipboard-text="${clipboardUrl}" title="Copy to clipboard">
                            <svg fill="currentColor" viewBox="0 0 896 1024"><use href="#icon-copy"></use></svg>
                            Copy
                        </button>`
}

function renderFigure (example) {
  if (!example.inline) {
    // Cache-bust with the file's mtime so editing an SVG (as happened
    // repeatedly while fixing rendering bugs) always invalidates any
    // copy a browser already cached under the same URL.
    const version = Math.floor(fs.statSync(path.join(root, example.svg)).mtimeMs)
    return `<img class="catalog-example-image" src="${example.svg}?v=${version}" alt="${example.title} example" loading="lazy"/>`
  }
  // Custom @font-face fonts (e.g. Excalidraw's hand-drawn font) never render
  // when an SVG is loaded through <img> — browsers treat that as a
  // restricted "image" context that skips web font loading entirely, even
  // for self-contained data-URI fonts. Embedding the SVG inline is the only
  // way to get the intended font, so a handful of examples opt into it.
  const svgPath = path.join(root, example.svg)
  let svgContent = fs.readFileSync(svgPath, 'utf8').replace(/^<\?xml[^>]*\?>\s*/, '')
  const svgTagEnd = svgContent.indexOf('>')
  let openingTag = svgContent.slice(0, svgTagEnd)
  openingTag = openingTag.match(/\bclass="/)
    ? openingTag.replace(/\bclass="/, 'class="catalog-example-image ')
    : `${openingTag} class="catalog-example-image"`
  openingTag += ` role="img" aria-label="${example.title} example"`
  return openingTag + svgContent.slice(svgTagEnd)
}

function renderExample (example, isFirst, typeSlug) {
  const { getPath, clipboard } = buildUrl(typeSlug, 'svg', example.source, example.params)
  return `<div class="catalog-example" data-example="${example.anchor}"${isFirst ? '' : ' hidden'}>
                        ${renderFigure(example)}
                        <div class="catalog-example-code">
                            <code class="snippet-name">${example.anchor}.${example.lang}</code>
                            <pre class="catalog-example-source"><code class="language-${example.lang}">${example.source}</code></pre>
                            <div class="highlight">
                                <pre><code class="language-http static"><span class="token verb-get">GET</span> <span class="token host">https://kroki.io</span>/<span class="token path">${getPath}</span></code></pre>
                                ${copyButton(clipboard)}
                            </div>
                        </div>
                    </div>`
}

function renderSwitcher (examples) {
  if (examples.length < 2) return ''
  const buttons = examples
    .map((e, i) => `<button type="button" class="catalog-example-toggle${i === 0 ? ' is-active' : ''}" data-example="${e.anchor}">${e.title}</button>`)
    .join('\n                        ')
  return `<div class="catalog-detail-switcher">
                        ${buttons}
                    </div>\n                    `
}

function renderCard (type) {
  const categoryTags = type.categories.map((c) => `<span class="tag is-small">${categoryLabels.get(c)}</span>`).join('')
  const detailId = `detail-${type.type}`

  return `<div class="catalog-card" data-categories="${type.categories.join(' ')}">
                <button type="button" class="catalog-card-toggle" aria-expanded="false" aria-controls="${detailId}">
                    <span class="catalog-card-name">${type.name}</span>
                    <span class="catalog-card-chevron" aria-hidden="true">&#9662;</span>
                </button>
                <div class="catalog-card-tags">${categoryTags}</div>
            </div>`
}

function renderDetail (type) {
  const formatPills = type.formats.map((f) => `<span class="diagram-support-format">${f}</span>`).join('')
  const detailId = `detail-${type.type}`
  const examplesHtml = type.examples.map((e, i) => renderExample(e, i === 0, type.type)).join('\n                    ')

  return `<div class="catalog-detail" id="${detailId}" hidden>
                <div class="catalog-detail-header">
                    <div class="diagram-support-formats">${formatPills}</div>
                    <a class="catalog-card-link" href="${type.href}" target="_blank" rel="noopener noreferrer">View project &#8599;</a>
                </div>
                ${renderSwitcher(type.examples)}${examplesHtml}
            </div>`
}

const cardsHtml = data.types.map(renderCard).join('\n            ')
const detailsHtml = data.types.map(renderDetail).join('\n            ')

const catalogBlock = `<!-- CATALOG:START — generated by scripts/generate-examples.js from assets/examples/data.json. Do not edit by hand; edit the JSON and re-run the script instead. -->
        <div class="catalog-grid">
            ${cardsHtml}
        </div>
        <div class="catalog-details">
            ${detailsHtml}
        </div>
        <!-- CATALOG:END -->`

const html = fs.readFileSync(examplesPath, 'utf8')
const startMarker = '<!-- CATALOG:START'
const endMarker = '<!-- CATALOG:END -->'
const start = html.indexOf(startMarker)
const end = html.indexOf(endMarker) + endMarker.length
if (start === -1 || end === -1) {
  throw new Error('CATALOG:START / CATALOG:END markers not found in examples.html')
}

const newHtml = html.slice(0, start) + catalogBlock + html.slice(end)
fs.writeFileSync(examplesPath, newHtml)

console.log(`Generated ${data.types.length} type cards (${data.types.reduce((n, t) => n + t.examples.length, 0)} examples) into examples.html`)
