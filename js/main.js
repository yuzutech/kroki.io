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

  function textEncode(str) {
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
      }
      convert()
    })
  }
})
