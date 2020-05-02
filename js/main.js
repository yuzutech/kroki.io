'use strict'

document.addEventListener('DOMContentLoaded', function () {
  function getAll (selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector), 0)
  }

  function clearTooltip (e) {
    e.classList.remove('tooltipped', 'tooltipped-s', 'tooltipped-no-delay')
    e.removeAttribute('aria-label')
  }

  function showTooltip (elem, msg) {
    elem.classList.add('tooltipped', 'tooltipped-s', 'tooltipped-no-delay')
    elem.setAttribute('aria-label', msg)
  }

  function fallbackMessage (action) {
    var actionMsg = ''
    var actionKey = (action === 'cut' ? 'X' : 'C')
    if (/iPhone|iPad/i.test(navigator.userAgent)) {
      actionMsg = 'No support :('
    } else if (/Mac/i.test(navigator.userAgent)) {
      actionMsg = 'Press ⌘-' + actionKey + ' to ' + action
    } else {
      actionMsg = 'Press Ctrl-' + actionKey + ' to ' + action
    }
    return actionMsg
  }

  function addHighlightControls () {
    var $highlightButtons = getAll('.highlight .bd-copy, .highlight .bd-expand')

    $highlightButtons.forEach(function ($el) {
      $el.addEventListener('mouseenter', function () {
        $el.parentNode.classList.add('bd-is-hovering')
      })

      $el.addEventListener('mouseleave', function () {
        $el.parentNode.classList.remove('bd-is-hovering')
        clearTooltip(this)
      })

      $el.addEventListener('blur', function () {
        clearTooltip(this)
      })

      var clipboardSnippets = new ClipboardJS($el)
      clipboardSnippets.on('success', function (e) {
        e.clearSelection()
        showTooltip(e.trigger, 'Copied!')
      })
      clipboardSnippets.on('error', function (e) {
        showTooltip(e.trigger, fallbackMessage(e.action))
      })
    })
  }

  addHighlightControls()

  function debounce (func, wait, immediate) {
    var timeout
    return function () {
      var context = this, args = arguments
      var later = function () {
        timeout = null
        if (!immediate) func.apply(context, args)
      }
      var callNow = immediate && !timeout
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
      if (callNow) func.apply(context, args)
    }
  }

  function textEncode (str) {
    if (window.TextEncoder) {
      return new TextEncoder('utf-8').encode(str);
    }
    var utf8 = unescape(encodeURIComponent(str));
    var result = new Uint8Array(utf8.length);
    for (var i = 0; i < utf8.length; i++) {
      result[i] = utf8.charCodeAt(i);
    }
    return result;
  }

  var convert = debounce(function () {
    diagramErrorElement.classList.add('is-invisible')
    var diagramType = selectDiagramElement.value
    var source = diagramSourceElement.value
    if (diagramType && source && source.trim() !== '') {
      var urlPath = diagramType + '/svg/' + btoa(pako.deflate(textEncode(source), { level: 9, to: 'string' }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
      var url = 'https://kroki.io/' + urlPath
      diagramUrlPathElement.innerText = urlPath
      diagramUrlButtonElement.setAttribute('data-clipboard-text', url)
      var req = new XMLHttpRequest()
      req.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
          if (this.status === 200) {
            diagramResultElement.innerHTML = this.responseText
            if (diagramType !== 'ditaa') {
              const svg = diagramResultElement.getElementsByTagName('svg')[0]
              const height = svg.getAttribute('height')
              const width = svg.getAttribute('width')
              svg.setAttribute('height', '100%')
              svg.setAttribute('width', '100%')
              let style = 'width:100%;height:100%;'
              if (height) {
                style += 'max-height:' + height + ';'
              }
              if (width) {
                style += 'max-width:' + width + ';'
              }
              svg.style = style
            }
            diagramResultElement.className = 'diagram-' + diagramType
          } else {
            diagramResultElement.innerHTML = ''
            diagramResultElement.className = ''
            diagramErrorMessageElement.innerHTML = this.responseText
            diagramErrorElement.classList.remove('is-invisible')
          }
        }
      }
      req.open('GET', url, true)
      req.send(null)
    } else {
      diagramResultElement.innerHTML = ''
    }
  }, 250)

  var diagramResultElement = document.getElementById('diagram-result')
  var diagramErrorElement = document.getElementById('diagram-error')
  var diagramErrorMessageElement = document.getElementById('diagram-error-message')
  var diagramSourceElement = document.getElementById('diagram-source')
  var selectDiagramElement = document.getElementById('select-diagram')
  var diagramUrlElement = document.getElementById('diagram-url')
  if (diagramUrlElement) {
    var diagramUrlPathElement = diagramUrlElement.querySelector("pre > code > span.path")
    var diagramUrlButtonElement = diagramUrlElement.querySelector("button")
    if (diagramSourceElement && diagramResultElement && diagramErrorElement && diagramErrorMessageElement && selectDiagramElement) {
      diagramSourceElement.addEventListener('keyup', convert)
      diagramSourceElement.addEventListener('change', convert)
      selectDiagramElement.addEventListener('change', (_) => {
        diagramSourceElement.value = ''
        diagramSourceElement.placeholder = ''
        let diagramType = selectDiagramElement.value
        if (diagramType === 'plantuml') {
          diagramSourceElement.value = 'skinparam monochrome true\n' +
            'skinparam ranksep 20\n' +
            'skinparam dpi 150\n' +
            'skinparam arrowThickness 0.7\n' +
            'skinparam packageTitleAlignment left\n' +
            'skinparam usecaseBorderThickness 0.4\n' +
            'skinparam defaultFontSize 12\n' +
            'skinparam rectangleBorderThickness 1\n' +
            '\n' +
            'rectangle "Main" {\n' +
            '  (main.view)\n' +
            '  (singleton)\n' +
            '}\n' +
            'rectangle "Base" {\n' +
            '  (base.component)\n' +
            '  (component)\n' +
            '  (model)\n' +
            '}\n' +
            'rectangle "<b>main.ts</b>" as main_ts\n' +
            '\n' +
            '(component) ..> (base.component)\n' +
            'main_ts ==> (main.view)\n' +
            '(main.view) --> (component)\n' +
            '(main.view) ...> (singleton)\n' +
            '(singleton) ---> (model)'
        } else if (diagramType === 'erd') {
          diagramSourceElement.value = '[Person]\n' +
            '*name\n' +
            'height\n' +
            'weight\n' +
            '+birth_location_id\n' +
            '\n' +
            '[Location]\n' +
            '*id\n' +
            'city\n' +
            'state\n' +
            'country\n' +
            '\n' +
            'Person *--1 Location'
        } else if (diagramType === 'blockdiag') {
          diagramSourceElement.value = 'blockdiag {\n' +
            '  Kroki -> generates -> "Block diagrams";\n' +
            '  Kroki -> is -> "very easy!";\n' +
            '\n' +
            '  Kroki [color = "greenyellow"];\n' +
            '  "Block diagrams" [color = "pink"];\n' +
            '  "very easy!" [color = "orange"];\n' +
            '}'
        } else if (diagramType === 'seqdiag') {
          diagramSourceElement.value = 'seqdiag {\n' +
            '  browser  -> webserver [label = "GET /seqdiag/svg/base64"];\n' +
            '  webserver  -> processor [label = "Convert text to image"];\n' +
            '  webserver <-- processor;\n' +
            '  browser <-- webserver;\n' +
            '}'
        } else if (diagramType === 'actdiag') {
          diagramSourceElement.value = 'actdiag {\n' +
            '  write -> convert -> image\n' +
            '\n' +
            '  lane user {\n' +
            '    label = "User"\n' +
            '    write [label = "Writing text"];\n' +
            '    image [label = "Get diagram image"];\n' +
            '  }\n' +
            '  lane Kroki {\n' +
            '    convert [label = "Convert text to image"];\n' +
            '  }\n' +
            '}'
        } else if (diagramType === 'nwdiag') {
          diagramSourceElement.value = 'nwdiag {\n' +
            '  network dmz {\n' +
            '    address = "210.x.x.x/24"\n' +
            '\n' +
            '    web01 [address = "210.x.x.1"];\n' +
            '    web02 [address = "210.x.x.2"];\n' +
            '  }\n' +
            '  network internal {\n' +
            '    address = "172.x.x.x/24";\n' +
            '\n' +
            '    web01 [address = "172.x.x.1"];\n' +
            '    web02 [address = "172.x.x.2"];\n' +
            '    db01;\n' +
            '    db02;\n' +
            '  }\n' +
            '}'
        } else if (diagramType === 'packetdiag') {
          diagramSourceElement.value = 'packetdiag {\n' +
            '  colwidth = 32;\n' +
            '  node_height = 72;\n' +
            '\n' +
            '  0-15: Source Port;\n' +
            '  16-31: Destination Port;\n' +
            '  32-63: Sequence Number;\n' +
            '  64-95: Acknowledgment Number;\n' +
            '  96-99: Data Offset;\n' +
            '  100-105: Reserved;\n' +
            '  106: URG [rotate = 270];\n' +
            '  107: ACK [rotate = 270];\n' +
            '  108: PSH [rotate = 270];\n' +
            '  109: RST [rotate = 270];\n' +
            '  110: SYN [rotate = 270];\n' +
            '  111: FIN [rotate = 270];\n' +
            '  112-127: Window;\n' +
            '  128-143: Checksum;\n' +
            '  144-159: Urgent Pointer;\n' +
            '  160-191: (Options and Padding);\n' +
            '  192-223: data [colheight = 3];\n' +
            '}'
        } else if (diagramType === 'rackdiag') {
          diagramSourceElement.value = 'rackdiag {\n' +
            '  16U;\n' +
            '  1: UPS [2U];\n' +
            '  3: DB Server;\n' +
            '  4: Web Server;\n' +
            '  5: Web Server;\n' +
            '  6: Web Server;\n' +
            '  7: Load Balancer;\n' +
            '  8: L3 Switch;\n' +
            '}'
      } else if (diagramType === 'svgbob') {
          diagramSourceElement.value = '                  .-,(  ),-.\n' +
            '   ___  _      .-(          )-.\n' +
            '  [___]|=| -->(                )      __________\n' +
            '  /::/ |_|     \'-(          ).-\' --->[_...__... ]\n' +
            '                  \'-.( ).-\'\n' +
            '                          \\      ____   __\n' +
            '                           \'--->|    | |==|\n' +
            '                                |____| |  |\n' +
            '                                /::::/ |__|'
        } else if (diagramType === 'c4plantuml') {
          diagramSourceElement.value = '@startuml\n' +
            '!include C4_Context.puml\n' +
            '\n' +
            'title System Context diagram for Internet Banking System\n' +
            '\n' +
            'Person(customer, "Banking Customer", "A customer of the bank, with personal bank accounts.")\n' +
            'System(banking_system, "Internet Banking System", "Allows customers to check their accounts.")\n' +
            '\n' +
            'System_Ext(mail_system, "E-mail system", "The internal Microsoft Exchange e-mail system.")\n' +
            'System_Ext(mainframe, "Mainframe Banking System", "Stores all of the core banking information.")\n' +
            '\n' +
            'Rel(customer, banking_system, "Uses")\n' +
            'Rel_Back(customer, mail_system, "Sends e-mails to")\n' +
            'Rel_Neighbor(banking_system, mail_system, "Sends e-mails", "SMTP")\n' +
            'Rel(banking_system, mainframe, "Uses")\n' +
            '@enduml'
        } else if (diagramType === 'ditaa') {
          diagramSourceElement.value = '      +--------+\n' +
            '      |        |\n' +
            '      |  User  |\n' +
            '      |        |\n' +
            '      +--------+\n' +
            '          ^\n' +
            '  request |\n' +
            '          v\n' +
            '  +-------------+\n' +
            '  |             |\n' +
            '  |    Kroki    |\n' +
            '  |             |---+\n' +
            '  +-------------+   |\n' +
            '       ^  ^         | inflate\n' +
            '       |  |         |\n' +
            '       v  +---------+\n' +
            '  +-------------+\n' +
            '  |             |\n' +
            '  |    Ditaa    |\n' +
            '  |             |----+\n' +
            '  +-------------+    |\n' +
            '             ^       | process\n' +
            '             |       |\n' +
            '             +-------+\n'
        } else if (diagramType === 'mermaid') {
          diagramSourceElement.value = 'graph TD\n' +
            '  A[ Anyone ] -->|Can help | B( Go to github.com/yuzutech/kroki )\n' +
            '  B --> C{ How to contribute? }\n' +
            '  C --> D[ Reporting bugs ]\n' +
            '  C --> E[ Sharing ideas ]\n' +
            '  C --> F[ Advocating ]\n'
        } else if (diagramType === 'nomnoml') {
          diagramSourceElement.value = '[Pirate|eyeCount: Int|raid();pillage()|\n' +
            '  [beard]--[parrot]\n' +
            '  [beard]-:>[foul mouth]\n' +
            ']\n' +
            '\n' +
            '[<abstract>Marauder]<:--[Pirate]\n' +
            '[Pirate]- 0..7[mischief]\n' +
            '[jollyness]->[Pirate]\n' +
            '[jollyness]->[rum]\n' +
            '[jollyness]->[singing]\n' +
            '[Pirate]-> *[rum|tastiness: Int|swig()]\n' +
            '[Pirate]->[singing]\n' +
            '[singing]<->[rum]'
        } else if (diagramType === 'graphviz') {
          diagramSourceElement.value = 'digraph D {\n' +
            '  subgraph cluster_p {\n' +
            '    label = "Kroki";\n' +
            '    subgraph cluster_c1 {\n' +
            '      label = "Server";\n' +
            '      Filebeat;\n' +
            '      subgraph cluster_gc_1 {\n' +
            '        label = "Docker/Server";\n' +
            '        Java;\n' +
            '      }\n' +
            '      subgraph cluster_gc_2 {\n' +
            '        label = "Docker/Mermaid";\n' +
            '        "Node.js";\n' +
            '        "Puppeteer";\n' +
            '        "Chrome";\n' +
            '      }\n' +
            '    }\n' +
            '    subgraph cluster_c2 {\n' +
            '      label = "CLI";\n' +
            '      Golang;\n' +
            '    }\n' +
            '  }\n' +
            '}'
        } else if (diagramType === 'vega') {
          diagramSourceElement.value = '{\n' +
            '  "$schema": "https://vega.github.io/schema/vega/v5.json",\n' +
            '  "width": 400,\n' +
            '  "height": 200,\n' +
            '  "padding": 5,\n' +
            '\n' +
            '  "data": [\n' +
            '    {\n' +
            '      "name": "table",\n' +
            '      "values": [\n' +
            '        {"category": "A", "amount": 28},\n' +
            '        {"category": "B", "amount": 55},\n' +
            '        {"category": "C", "amount": 43},\n' +
            '        {"category": "D", "amount": 91},\n' +
            '        {"category": "E", "amount": 81},\n' +
            '        {"category": "F", "amount": 53},\n' +
            '        {"category": "G", "amount": 19},\n' +
            '        {"category": "H", "amount": 87}\n' +
            '      ]\n' +
            '    }\n' +
            '  ],\n' +
            '\n' +
            '  "signals": [\n' +
            '    {\n' +
            '      "name": "tooltip",\n' +
            '      "value": {},\n' +
            '      "on": [\n' +
            '        {"events": "rect:mouseover", "update": "datum"},\n' +
            '        {"events": "rect:mouseout",  "update": "{}"}\n' +
            '      ]\n' +
            '    }\n' +
            '  ],\n' +
            '\n' +
            '  "scales": [\n' +
            '    {\n' +
            '      "name": "xscale",\n' +
            '      "type": "band",\n' +
            '      "domain": {"data": "table", "field": "category"},\n' +
            '      "range": "width",\n' +
            '      "padding": 0.05,\n' +
            '      "round": true\n' +
            '    },\n' +
            '    {\n' +
            '      "name": "yscale",\n' +
            '      "domain": {"data": "table", "field": "amount"},\n' +
            '      "nice": true,\n' +
            '      "range": "height"\n' +
            '    }\n' +
            '  ],\n' +
            '\n' +
            '  "axes": [\n' +
            '    { "orient": "bottom", "scale": "xscale" },\n' +
            '    { "orient": "left", "scale": "yscale" }\n' +
            '  ],\n' +
            '\n' +
            '  "marks": [\n' +
            '    {\n' +
            '      "type": "rect",\n' +
            '      "from": {"data":"table"},\n' +
            '      "encode": {\n' +
            '        "enter": {\n' +
            '          "x": {"scale": "xscale", "field": "category"},\n' +
            '          "width": {"scale": "xscale", "band": 1},\n' +
            '          "y": {"scale": "yscale", "field": "amount"},\n' +
            '          "y2": {"scale": "yscale", "value": 0}\n' +
            '        },\n' +
            '        "update": {\n' +
            '          "fill": {"value": "steelblue"}\n' +
            '        },\n' +
            '        "hover": {\n' +
            '          "fill": {"value": "red"}\n' +
            '        }\n' +
            '      }\n' +
            '    },\n' +
            '    {\n' +
            '      "type": "text",\n' +
            '      "encode": {\n' +
            '        "enter": {\n' +
            '          "align": {"value": "center"},\n' +
            '          "baseline": {"value": "bottom"},\n' +
            '          "fill": {"value": "#333"}\n' +
            '        },\n' +
            '        "update": {\n' +
            '          "x": {"scale": "xscale", "signal": "tooltip.category", "band": 0.5},\n' +
            '          "y": {"scale": "yscale", "signal": "tooltip.amount", "offset": -2},\n' +
            '          "text": {"signal": "tooltip.amount"},\n' +
            '          "fillOpacity": [\n' +
            '            {"test": "datum === tooltip", "value": 0},\n' +
            '            {"value": 1}\n' +
            '          ]\n' +
            '        }\n' +
            '      }\n' +
            '    }\n' +
            '  ]\n' +
            '}\n'
        } else if (diagramType === 'vegalite') {
          diagramSourceElement.value = '{\n' +
            '  "$schema": "https://vega.github.io/schema/vega-lite/v4.json",\n' +
            '  "description": "Horizontally concatenated charts that show different types of discretizing scales.",\n' +
            '  "data": {\n' +
            '    "values": [\n' +
            '      {"a": "A", "b": 28},\n' +
            '      {"a": "B", "b": 55},\n' +
            '      {"a": "C", "b": 43},\n' +
            '      {"a": "D", "b": 91},\n' +
            '      {"a": "E", "b": 81},\n' +
            '      {"a": "F", "b": 53},\n' +
            '      {"a": "G", "b": 19},\n' +
            '      {"a": "H", "b": 87},\n' +
            '      {"a": "I", "b": 52}\n' +
            '    ]\n' +
            '  },\n' +
            '  "hconcat": [\n' +
            '    {\n' +
            '      "mark": "circle",\n' +
            '      "encoding": {\n' +
            '        "y": {\n' +
            '          "field": "b",\n' +
            '          "type": "nominal",\n' +
            '          "sort": null,\n' +
            '          "axis": {\n' +
            '            "ticks": false,\n' +
            '            "domain": false,\n' +
            '            "title": null\n' +
            '          }\n' +
            '        },\n' +
            '        "size": {\n' +
            '          "field": "b",\n' +
            '          "type": "quantitative",\n' +
            '          "scale": {\n' +
            '            "type": "quantize"\n' +
            '          }\n' +
            '        },\n' +
            '        "color": {\n' +
            '          "field": "b",\n' +
            '          "type": "quantitative",\n' +
            '          "scale": {\n' +
            '            "type": "quantize",\n' +
            '            "zero": true\n' +
            '          },\n' +
            '          "legend": {\n' +
            '            "title": "Quantize"\n' +
            '          }\n' +
            '        }\n' +
            '      }\n' +
            '    },\n' +
            '    {\n' +
            '      "mark": "circle",\n' +
            '      "encoding": {\n' +
            '        "y": {\n' +
            '          "field": "b",\n' +
            '          "type": "nominal",\n' +
            '          "sort": null,\n' +
            '          "axis": {\n' +
            '            "ticks": false,\n' +
            '            "domain": false,\n' +
            '            "title": null\n' +
            '          }\n' +
            '        },\n' +
            '        "size": {\n' +
            '          "field": "b",\n' +
            '          "type": "quantitative",\n' +
            '          "scale": {\n' +
            '            "type": "quantile",\n' +
            '            "range": [80, 160, 240, 320, 400]\n' +
            '          }\n' +
            '        },\n' +
            '        "color": {\n' +
            '          "field": "b",\n' +
            '          "type": "quantitative",\n' +
            '          "scale": {\n' +
            '            "type": "quantile",\n' +
            '            "scheme": "magma"\n' +
            '          },\n' +
            '          "legend": {\n' +
            '            "format": "d",\n' +
            '            "title": "Quantile"\n' +
            '          }\n' +
            '        }\n' +
            '      }\n' +
            '    },\n' +
            '    {\n' +
            '      "mark": "circle",\n' +
            '      "encoding": {\n' +
            '        "y": {\n' +
            '          "field": "b",\n' +
            '          "type": "nominal",\n' +
            '          "sort": null,\n' +
            '          "axis": {\n' +
            '            "ticks": false,\n' +
            '            "domain": false,\n' +
            '            "title": null\n' +
            '          }\n' +
            '        },\n' +
            '        "size": {\n' +
            '          "field": "b",\n' +
            '          "type": "quantitative",\n' +
            '          "scale": {\n' +
            '            "type": "threshold",\n' +
            '            "domain": [30, 70],\n' +
            '            "range": [80, 200, 320]\n' +
            '          }\n' +
            '        },\n' +
            '        "color": {\n' +
            '          "field": "b",\n' +
            '          "type": "quantitative",\n' +
            '          "scale": {\n' +
            '            "type": "threshold",\n' +
            '            "domain": [30, 70],\n' +
            '            "scheme": "viridis"\n' +
            '          },\n' +
            '          "legend": {\n' +
            '            "title": "Threshold"\n' +
            '          }\n' +
            '        }\n' +
            '      }\n' +
            '    }\n' +
            '  ],\n' +
            '  "resolve": {\n' +
            '    "scale": {\n' +
            '      "color": "independent",\n' +
            '      "size": "independent"\n' +
            '    }\n' +
            '  }\n' +
            '}\n'
        } else if (diagramType === 'wavedrom') {
          diagramSourceElement.value = '{ signal: [\n' +
            '  { name: "clk",         wave: "p.....|..." },\n' +
            '  { name: "Data",        wave: "x.345x|=.x", data: ["head", "body", "tail", "data"] },\n' +
            '  { name: "Request",     wave: "0.1..0|1.0" },\n' +
            '  {},\n' +
            '  { name: "Acknowledge", wave: "1.....|01." }\n' +
            ']}'
        } else if (diagramType === 'bpmn') {
          diagramSourceElement.value = '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<semantic:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:semantic="http://www.omg.org/spec/BPMN/20100524/MODEL" id="_1275940932088" targetNamespace="http://www.trisotech.com/definitions/_1275940932088" exporter="Camunda Modeler" exporterVersion="1.16.0">\n' +
            '  <semantic:message id="_1275940932310" />\n' +
            '  <semantic:message id="_1275940932433" />\n' +
            '  <semantic:process id="_6-1" isExecutable="false">\n' +
            '    <semantic:laneSet id="ls_6-438">\n' +
            '      <semantic:lane id="_6-650" name="clerk">\n' +
            '        <semantic:flowNodeRef>OrderReceivedEvent</semantic:flowNodeRef>\n' +
            '        <semantic:flowNodeRef>_6-652</semantic:flowNodeRef>\n' +
            '        <semantic:flowNodeRef>_6-674</semantic:flowNodeRef>\n' +
            '        <semantic:flowNodeRef>CalmCustomerTask</semantic:flowNodeRef>\n' +
            '      </semantic:lane>\n' +
            '      <semantic:lane id="_6-446" name="pizza chef">\n' +
            '        <semantic:flowNodeRef>_6-463</semantic:flowNodeRef>\n' +
            '      </semantic:lane>\n' +
            '      <semantic:lane id="_6-448" name="delivery boy">\n' +
            '        <semantic:flowNodeRef>_6-514</semantic:flowNodeRef>\n' +
            '        <semantic:flowNodeRef>_6-565</semantic:flowNodeRef>\n' +
            '        <semantic:flowNodeRef>_6-616</semantic:flowNodeRef>\n' +
            '      </semantic:lane>\n' +
            '    </semantic:laneSet>\n' +
            '    <semantic:startEvent id="OrderReceivedEvent" name="Order received">\n' +
            '      <semantic:outgoing>_6-630</semantic:outgoing>\n' +
            '      <semantic:messageEventDefinition messageRef="_1275940932310" />\n' +
            '    </semantic:startEvent>\n' +
            '    <semantic:parallelGateway id="_6-652" name="">\n' +
            '      <semantic:incoming>_6-630</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-691</semantic:outgoing>\n' +
            '      <semantic:outgoing>_6-693</semantic:outgoing>\n' +
            '    </semantic:parallelGateway>\n' +
            '    <semantic:intermediateCatchEvent id="_6-674" name="„where is my pizza?“">\n' +
            '      <semantic:incoming>_6-691</semantic:incoming>\n' +
            '      <semantic:incoming>_6-746</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-748</semantic:outgoing>\n' +
            '      <semantic:messageEventDefinition messageRef="_1275940932433" />\n' +
            '    </semantic:intermediateCatchEvent>\n' +
            '    <semantic:task id="CalmCustomerTask" name="Calm customer">\n' +
            '      <semantic:incoming>_6-748</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-746</semantic:outgoing>\n' +
            '    </semantic:task>\n' +
            '    <semantic:task id="_6-463" name="Bake the pizza">\n' +
            '      <semantic:incoming>_6-693</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-632</semantic:outgoing>\n' +
            '    </semantic:task>\n' +
            '    <semantic:task id="_6-514" name="Deliver the pizza">\n' +
            '      <semantic:incoming>_6-632</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-634</semantic:outgoing>\n' +
            '    </semantic:task>\n' +
            '    <semantic:task id="_6-565" name="Receive payment">\n' +
            '      <semantic:incoming>_6-634</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-636</semantic:outgoing>\n' +
            '    </semantic:task>\n' +
            '    <semantic:endEvent id="_6-616" name="">\n' +
            '      <semantic:incoming>_6-636</semantic:incoming>\n' +
            '      <semantic:terminateEventDefinition />\n' +
            '    </semantic:endEvent>\n' +
            '    <semantic:sequenceFlow id="_6-630" name="" sourceRef="OrderReceivedEvent" targetRef="_6-652" />\n' +
            '    <semantic:sequenceFlow id="_6-632" name="" sourceRef="_6-463" targetRef="_6-514" />\n' +
            '    <semantic:sequenceFlow id="_6-634" name="" sourceRef="_6-514" targetRef="_6-565" />\n' +
            '    <semantic:sequenceFlow id="_6-636" name="" sourceRef="_6-565" targetRef="_6-616" />\n' +
            '    <semantic:sequenceFlow id="_6-691" name="" sourceRef="_6-652" targetRef="_6-674" />\n' +
            '    <semantic:sequenceFlow id="_6-693" name="" sourceRef="_6-652" targetRef="_6-463" />\n' +
            '    <semantic:sequenceFlow id="_6-746" name="" sourceRef="CalmCustomerTask" targetRef="_6-674" />\n' +
            '    <semantic:sequenceFlow id="_6-748" name="" sourceRef="_6-674" targetRef="CalmCustomerTask" />\n' +
            '  </semantic:process>\n' +
            '  <semantic:message id="_1275940932198" />\n' +
            '  <semantic:process id="_6-2" isExecutable="false">\n' +
            '    <semantic:startEvent id="_6-61" name="Hungry for pizza">\n' +
            '      <semantic:outgoing>_6-125</semantic:outgoing>\n' +
            '    </semantic:startEvent>\n' +
            '    <semantic:task id="SelectAPizzaTask" name="Select a pizza">\n' +
            '      <semantic:incoming>_6-125</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-178</semantic:outgoing>\n' +
            '    </semantic:task>\n' +
            '    <semantic:task id="_6-127" name="Order a pizza">\n' +
            '      <semantic:incoming>_6-178</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-420</semantic:outgoing>\n' +
            '    </semantic:task>\n' +
            '    <semantic:eventBasedGateway id="_6-180" name="">\n' +
            '      <semantic:incoming>_6-420</semantic:incoming>\n' +
            '      <semantic:incoming>_6-430</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-422</semantic:outgoing>\n' +
            '      <semantic:outgoing>_6-424</semantic:outgoing>\n' +
            '    </semantic:eventBasedGateway>\n' +
            '    <semantic:intermediateCatchEvent id="_6-202" name="pizza received">\n' +
            '      <semantic:incoming>_6-422</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-428</semantic:outgoing>\n' +
            '      <semantic:messageEventDefinition messageRef="_1275940932198" />\n' +
            '    </semantic:intermediateCatchEvent>\n' +
            '    <semantic:intermediateCatchEvent id="_6-219" name="60 minutes">\n' +
            '      <semantic:incoming>_6-424</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-426</semantic:outgoing>\n' +
            '      <semantic:timerEventDefinition>\n' +
            '        <semantic:timeDate />\n' +
            '      </semantic:timerEventDefinition>\n' +
            '    </semantic:intermediateCatchEvent>\n' +
            '    <semantic:task id="_6-236" name="Ask for the pizza">\n' +
            '      <semantic:incoming>_6-426</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-430</semantic:outgoing>\n' +
            '    </semantic:task>\n' +
            '    <semantic:task id="_6-304" name="Pay the pizza">\n' +
            '      <semantic:incoming>_6-428</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-434</semantic:outgoing>\n' +
            '    </semantic:task>\n' +
            '    <semantic:task id="_6-355" name="Eat the pizza">\n' +
            '      <semantic:incoming>_6-434</semantic:incoming>\n' +
            '      <semantic:outgoing>_6-436</semantic:outgoing>\n' +
            '    </semantic:task>\n' +
            '    <semantic:endEvent id="_6-406" name="Hunger satisfied">\n' +
            '      <semantic:incoming>_6-436</semantic:incoming>\n' +
            '    </semantic:endEvent>\n' +
            '    <semantic:sequenceFlow id="_6-125" name="" sourceRef="_6-61" targetRef="SelectAPizzaTask" />\n' +
            '    <semantic:sequenceFlow id="_6-178" name="" sourceRef="SelectAPizzaTask" targetRef="_6-127" />\n' +
            '    <semantic:sequenceFlow id="_6-420" name="" sourceRef="_6-127" targetRef="_6-180" />\n' +
            '    <semantic:sequenceFlow id="_6-422" name="" sourceRef="_6-180" targetRef="_6-202" />\n' +
            '    <semantic:sequenceFlow id="_6-424" name="" sourceRef="_6-180" targetRef="_6-219" />\n' +
            '    <semantic:sequenceFlow id="_6-426" name="" sourceRef="_6-219" targetRef="_6-236" />\n' +
            '    <semantic:sequenceFlow id="_6-428" name="" sourceRef="_6-202" targetRef="_6-304" />\n' +
            '    <semantic:sequenceFlow id="_6-430" name="" sourceRef="_6-236" targetRef="_6-180" />\n' +
            '    <semantic:sequenceFlow id="_6-434" name="" sourceRef="_6-304" targetRef="_6-355" />\n' +
            '    <semantic:sequenceFlow id="_6-436" name="" sourceRef="_6-355" targetRef="_6-406" />\n' +
            '  </semantic:process>\n' +
            '  <semantic:collaboration id="C1275940932557">\n' +
            '    <semantic:participant id="_6-53" name="Pizza Customer" processRef="_6-2" />\n' +
            '    <semantic:participant id="_6-438" name="Pizza vendor" processRef="_6-1" />\n' +
            '    <semantic:messageFlow id="_6-638" name="pizza order" sourceRef="_6-127" targetRef="OrderReceivedEvent" />\n' +
            '    <semantic:messageFlow id="_6-642" name="" sourceRef="_6-236" targetRef="_6-674" />\n' +
            '    <semantic:messageFlow id="_6-646" name="receipt" sourceRef="_6-565" targetRef="_6-304" />\n' +
            '    <semantic:messageFlow id="_6-648" name="money" sourceRef="_6-304" targetRef="_6-565" />\n' +
            '    <semantic:messageFlow id="_6-640" name="pizza" sourceRef="_6-514" targetRef="_6-202" />\n' +
            '    <semantic:messageFlow id="_6-750" name="" sourceRef="CalmCustomerTask" targetRef="_6-236" />\n' +
            '  </semantic:collaboration>\n' +
            '  <bpmndi:BPMNDiagram id="Trisotech.Visio-_6" name="Untitled Diagram" documentation="" resolution="96.00000267028808">\n' +
            '    <bpmndi:BPMNPlane bpmnElement="C1275940932557">\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6-53" bpmnElement="_6-53" isHorizontal="true">\n' +
            '        <dc:Bounds x="12" y="12" width="1044" height="294" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6-438" bpmnElement="_6-438" isHorizontal="true">\n' +
            '        <dc:Bounds x="12" y="372" width="905" height="337" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-650" bpmnElement="_6-650" isHorizontal="true">\n' +
            '        <dc:Bounds x="42" y="372" width="875" height="114" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-446" bpmnElement="_6-446" isHorizontal="true">\n' +
            '        <dc:Bounds x="42" y="486" width="875" height="114" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-448" bpmnElement="_6-448" isHorizontal="true">\n' +
            '        <dc:Bounds x="42" y="600" width="875" height="109" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6_OrderReceivedEvent" bpmnElement="OrderReceivedEvent">\n' +
            '        <dc:Bounds x="79" y="405" width="30" height="30" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-652" bpmnElement="_6-652">\n' +
            '        <dc:Bounds x="140" y="399" width="42" height="42" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-674" bpmnElement="_6-674">\n' +
            '        <dc:Bounds x="218" y="404" width="32" height="32" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6_CalmCustomerTask" bpmnElement="CalmCustomerTask">\n' +
            '        <dc:Bounds x="286" y="386" width="83" height="68" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-463" bpmnElement="_6-463">\n' +
            '        <dc:Bounds x="252" y="521" width="83" height="68" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-514" bpmnElement="_6-514">\n' +
            '        <dc:Bounds x="464" y="629" width="83" height="68" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-565" bpmnElement="_6-565">\n' +
            '        <dc:Bounds x="603" y="629" width="83" height="68" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-616" bpmnElement="_6-616">\n' +
            '        <dc:Bounds x="722" y="647" width="32" height="32" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-61" bpmnElement="_6-61">\n' +
            '        <dc:Bounds x="66" y="96" width="30" height="30" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-74" bpmnElement="SelectAPizzaTask">\n' +
            '        <dc:Bounds x="145" y="77" width="83" height="68" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-127" bpmnElement="_6-127">\n' +
            '        <dc:Bounds x="265" y="77" width="83" height="68" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-180" bpmnElement="_6-180">\n' +
            '        <dc:Bounds x="378" y="90" width="42" height="42" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-202" bpmnElement="_6-202">\n' +
            '        <dc:Bounds x="647" y="95" width="32" height="32" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-219" bpmnElement="_6-219">\n' +
            '        <dc:Bounds x="448" y="184" width="32" height="32" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-236" bpmnElement="_6-236">\n' +
            '        <dc:Bounds x="517" y="166" width="83" height="68" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-304" bpmnElement="_6-304">\n' +
            '        <dc:Bounds x="726" y="77" width="83" height="68" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-355" bpmnElement="_6-355">\n' +
            '        <dc:Bounds x="834" y="77" width="83" height="68" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNShape id="Trisotech.Visio__6__6-406" bpmnElement="_6-406">\n' +
            '        <dc:Bounds x="956" y="95" width="32" height="32" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNShape>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-640" bpmnElement="_6-640">\n' +
            '        <di:waypoint x="506" y="629" />\n' +
            '        <di:waypoint x="506" y="384" />\n' +
            '        <di:waypoint x="663" y="384" />\n' +
            '        <di:waypoint x="663" y="127" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-630" bpmnElement="_6-630">\n' +
            '        <di:waypoint x="109" y="420" />\n' +
            '        <di:waypoint x="140" y="420" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-691" bpmnElement="_6-691">\n' +
            '        <di:waypoint x="182" y="420" />\n' +
            '        <di:waypoint x="200" y="420" />\n' +
            '        <di:waypoint x="218" y="420" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-648" bpmnElement="_6-648">\n' +
            '        <di:waypoint x="754" y="145" />\n' +
            '        <di:waypoint x="754" y="408" />\n' +
            '        <di:waypoint x="630" y="408" />\n' +
            '        <di:waypoint x="631" y="629" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-422" bpmnElement="_6-422">\n' +
            '        <di:waypoint x="420" y="111" />\n' +
            '        <di:waypoint x="438" y="111" />\n' +
            '        <di:waypoint x="647" y="111" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-646" bpmnElement="_6-646" messageVisibleKind="non_initiating">\n' +
            '        <di:waypoint x="658" y="629" />\n' +
            '        <di:waypoint x="658" y="432" />\n' +
            '        <di:waypoint x="782" y="432" />\n' +
            '        <di:waypoint x="782" y="145" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-428" bpmnElement="_6-428">\n' +
            '        <di:waypoint x="679" y="111" />\n' +
            '        <di:waypoint x="726" y="111" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-748" bpmnElement="_6-748">\n' +
            '        <di:waypoint x="250" y="420" />\n' +
            '        <di:waypoint x="268" y="420" />\n' +
            '        <di:waypoint x="286" y="420" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-420" bpmnElement="_6-420">\n' +
            '        <di:waypoint x="348" y="111" />\n' +
            '        <di:waypoint x="366" y="111" />\n' +
            '        <di:waypoint x="378" y="111" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-636" bpmnElement="_6-636">\n' +
            '        <di:waypoint x="686" y="663" />\n' +
            '        <di:waypoint x="704" y="663" />\n' +
            '        <di:waypoint x="722" y="663" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-750" bpmnElement="_6-750">\n' +
            '        <di:waypoint x="328" y="386" />\n' +
            '        <di:waypoint x="328" y="348" />\n' +
            '        <di:waypoint x="572" y="348" />\n' +
            '        <di:waypoint x="572" y="234" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-436" bpmnElement="_6-436">\n' +
            '        <di:waypoint x="918" y="111" />\n' +
            '        <di:waypoint x="936" y="111" />\n' +
            '        <di:waypoint x="956" y="111" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-632" bpmnElement="_6-632">\n' +
            '        <di:waypoint x="335" y="555" />\n' +
            '        <di:waypoint x="353" y="555" />\n' +
            '        <di:waypoint x="353" y="663" />\n' +
            '        <di:waypoint x="464" y="663" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-634" bpmnElement="_6-634">\n' +
            '        <di:waypoint x="548" y="663" />\n' +
            '        <di:waypoint x="603" y="663" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-125" bpmnElement="_6-125">\n' +
            '        <di:waypoint x="96" y="111" />\n' +
            '        <di:waypoint x="114" y="111" />\n' +
            '        <di:waypoint x="145" y="111" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-430" bpmnElement="_6-430">\n' +
            '        <di:waypoint x="600" y="200" />\n' +
            '        <di:waypoint x="618" y="200" />\n' +
            '        <di:waypoint x="618" y="252" />\n' +
            '        <di:waypoint x="576" y="252" />\n' +
            '        <di:waypoint x="549" y="252" />\n' +
            '        <di:waypoint x="360" y="252" />\n' +
            '        <di:waypoint x="360" y="111" />\n' +
            '        <di:waypoint x="378" y="111" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-642" bpmnElement="_6-642">\n' +
            '        <di:waypoint x="545" y="234" />\n' +
            '        <di:waypoint x="545" y="324" />\n' +
            '        <di:waypoint x="234" y="324" />\n' +
            '        <di:waypoint x="234" y="404" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-424" bpmnElement="_6-424">\n' +
            '        <di:waypoint x="399" y="132" />\n' +
            '        <di:waypoint x="399" y="200" />\n' +
            '        <di:waypoint x="448" y="200" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-638" bpmnElement="_6-638">\n' +
            '        <di:waypoint x="306" y="145" />\n' +
            '        <di:waypoint x="306" y="252" />\n' +
            '        <di:waypoint x="94" y="252" />\n' +
            '        <di:waypoint x="94" y="405" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-426" bpmnElement="_6-426">\n' +
            '        <di:waypoint x="480" y="200" />\n' +
            '        <di:waypoint x="498" y="200" />\n' +
            '        <di:waypoint x="517" y="200" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-693" bpmnElement="_6-693">\n' +
            '        <di:waypoint x="161" y="441" />\n' +
            '        <di:waypoint x="161" y="556" />\n' +
            '        <di:waypoint x="252" y="555" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-178" bpmnElement="_6-178">\n' +
            '        <di:waypoint x="228" y="111" />\n' +
            '        <di:waypoint x="265" y="111" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-746" bpmnElement="_6-746">\n' +
            '        <di:waypoint x="370" y="420" />\n' +
            '        <di:waypoint x="386" y="420" />\n' +
            '        <di:waypoint x="386" y="474" />\n' +
            '        <di:waypoint x="191" y="474" />\n' +
            '        <di:waypoint x="191" y="420" />\n' +
            '        <di:waypoint x="218" y="420" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '      <bpmndi:BPMNEdge id="Trisotech.Visio__6__6-434" bpmnElement="_6-434">\n' +
            '        <di:waypoint x="810" y="111" />\n' +
            '        <di:waypoint x="834" y="111" />\n' +
            '        <bpmndi:BPMNLabel />\n' +
            '      </bpmndi:BPMNEdge>\n' +
            '    </bpmndi:BPMNPlane>\n' +
            '  </bpmndi:BPMNDiagram>\n' +
            '</semantic:definitions>\n'
        } else if (diagramType === 'bytefield') {
          diagramSourceElement.value = '(defattrs :bg-green {:fill "#a0ffa0"})\n' +
            '(defattrs :bg-yellow {:fill "#ffffa0"})\n' +
            '(defattrs :bg-pink {:fill "#ffb0a0"})\n' +
            '(defattrs :bg-cyan {:fill "#a0fafa"})\n' +
            '(defattrs :bg-purple {:fill "#e4b5f7"})\n' +
            '\n' +
            '(defn draw-group-label-header\n' +
            '  [span label]\n' +
            '  (draw-box (text label [:math {:font-size 12}]) {:span span :borders #{} :height 14}))\n' +
            '\n' +
            '(defn draw-remotedb-header\n' +
            '  [kind args]\n' +
            '  (draw-column-headers)\n' +
            '  (draw-group-label-header 5 "start")\n' +
            '  (draw-group-label-header 5 "TxID")\n' +
            '  (draw-group-label-header 3 "type")\n' +
            '  (draw-group-label-header 2 "args")\n' +
            '  (draw-group-label-header 1 "tags")\n' +
            '  (next-row 18)\n' +
            '\n' +
            '  (draw-box 0x11 :bg-green)\n' +
            '  (draw-box 0x872349ae [{:span 4} :bg-green])\n' +
            '  (draw-box 0x11 :bg-yellow)\n' +
            '  (draw-box (text "TxID" :math) [{:span 4} :bg-yellow])\n' +
            '  (draw-box 0x10 :bg-pink)\n' +
            '  (draw-box (hex-text kind 4 :bold) [{:span 2} :bg-pink])\n' +
            '  (draw-box 0x0f :bg-cyan)\n' +
            '  (draw-box (hex-text args 2 :bold) :bg-cyan)\n' +
            '  (draw-box 0x14 :bg-purple)\n' +
            '\n' +
            '  (draw-box (text "0000000c" :hex [[:plain {:font-weight "light" :font-size 16}] " (12)"]) [{:span 4} :bg-purple])\n' +
            '  (draw-box (hex-text 6 2 :bold) [:box-first :bg-purple])\n' +
            '  (doseq [val [6 6 3 6 6 6 6 3]]\n' +
            '    (draw-box (hex-text val 2 :bold) [:box-related :bg-purple]))\n' +
            '  (doseq [val [0 0]]\n' +
            '    (draw-box val [:box-related :bg-purple]))\n' +
            '  (draw-box 0 [:box-last :bg-purple]))\n' +
            '\n' +
            '(draw-remotedb-header 0x4702 9)\n' +
            '\n' +
            '(draw-box 0x11)\n' +
            '(draw-box 0x2104 {:span 4})\n' +
            '(draw-box 0x11)\n' +
            '(draw-box 0 {:span 4})\n' +
            '(draw-box 0x11)\n' +
            '(draw-box (text "length" [:math] [:sub 1]) {:span 4})\n' +
            '(draw-box 0x14)\n' +
            '\n' +
            '(draw-box (text "length" [:math] [:sub 1]) {:span 4})\n' +
            '(draw-gap "Cue and loop point bytes")\n' +
            '\n' +
            '(draw-box nil :box-below)\n' +
            '(draw-box 0x11)\n' +
            '(draw-box 0x36 {:span 4})\n' +
            '(draw-box 0x11)\n' +
            '(draw-box (text "num" [:math] [:sub "hot"]) {:span 4})\n' +
            '(draw-box 0x11)\n' +
            '(draw-box (text "num" [:math] [:sub "cue"]) {:span 4})\n' +
            '\n' +
            '(draw-box 0x11)\n' +
            '(draw-box (text "length" [:math] [:sub 2]) {:span 4})\n' +
            '(draw-box 0x14)\n' +
            '(draw-box (text "length" [:math] [:sub 2]) {:span 4})\n' +
            '(draw-gap "Unknown bytes" {:min-label-columns 6})\n' +
            '(draw-bottom)\n'
        }
        convert()
      })
    }
  }

  var backToTopElement = document.getElementById('back-top');
  if (backToTopElement) {
    backToTopElement.onclick = function scrollToTop () {
      window.scrollTo(0, 0);
    }
  }
})
