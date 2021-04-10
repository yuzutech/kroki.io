var _self = (typeof window !== 'undefined')
  ? window   // if in browser
  : (
    (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
      ? self // if in worker
      : {}   // if in node js
  );

var Prism = (function () {

// Private helper vars
  var lang = /\blang(?:uage)?-([\w-]+)\b/i;
  var uniqueId = 0;

  var _ = _self.Prism = {
    manual: _self.Prism && _self.Prism.manual,
    disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,
    util: {
      encode: function (tokens) {
        if (tokens instanceof Token) {
          return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
        } else if (_.util.type(tokens) === 'Array') {
          return tokens.map(_.util.encode);
        } else {
          return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
        }
      },

      type: function (o) {
        return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
      },

      objId: function (obj) {
        if (!obj['__id']) {
          Object.defineProperty(obj, '__id', { value: ++uniqueId });
        }
        return obj['__id'];
      },

      // Deep clone a language definition (e.g. to extend it)
      clone: function (o, visited) {
        var type = _.util.type(o);
        visited = visited || {};

        switch (type) {
          case 'Object':
            if (visited[_.util.objId(o)]) {
              return visited[_.util.objId(o)];
            }
            var clone = {};
            visited[_.util.objId(o)] = clone;

            for (var key in o) {
              if (o.hasOwnProperty(key)) {
                clone[key] = _.util.clone(o[key], visited);
              }
            }

            return clone;

          case 'Array':
            if (visited[_.util.objId(o)]) {
              return visited[_.util.objId(o)];
            }
            var clone = [];
            visited[_.util.objId(o)] = clone;

            o.forEach(function (v, i) {
              clone[i] = _.util.clone(v, visited);
            });

            return clone;
        }

        return o;
      }
    },

    languages: {
      extend: function (id, redef) {
        var lang = _.util.clone(_.languages[id]);

        for (var key in redef) {
          lang[key] = redef[key];
        }

        return lang;
      },

      /**
       * Insert a token before another token in a language literal
       * As this needs to recreate the object (we cannot actually insert before keys in object literals),
       * we cannot just provide an object, we need anobject and a key.
       * @param inside The key (or language id) of the parent
       * @param before The key to insert before. If not provided, the function appends instead.
       * @param insert Object with the key/value pairs to insert
       * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
       */
      insertBefore: function (inside, before, insert, root) {
        root = root || _.languages;
        var grammar = root[inside];

        if (arguments.length == 2) {
          insert = arguments[1];

          for (var newToken in insert) {
            if (insert.hasOwnProperty(newToken)) {
              grammar[newToken] = insert[newToken];
            }
          }

          return grammar;
        }

        var ret = {};

        for (var token in grammar) {

          if (grammar.hasOwnProperty(token)) {

            if (token == before) {

              for (var newToken in insert) {

                if (insert.hasOwnProperty(newToken)) {
                  ret[newToken] = insert[newToken];
                }
              }
            }

            ret[token] = grammar[token];
          }
        }

        // Update references in other language definitions
        _.languages.DFS(_.languages, function (key, value) {
          if (value === root[inside] && key != inside) {
            this[key] = ret;
          }
        });

        return root[inside] = ret;
      },

      // Traverse a language definition with Depth First Search
      DFS: function (o, callback, type, visited) {
        visited = visited || {};
        for (var i in o) {
          if (o.hasOwnProperty(i)) {
            callback.call(o, i, o[i], type || i);

            if (_.util.type(o[i]) === 'Object' && !visited[_.util.objId(o[i])]) {
              visited[_.util.objId(o[i])] = true;
              _.languages.DFS(o[i], callback, null, visited);
            } else if (_.util.type(o[i]) === 'Array' && !visited[_.util.objId(o[i])]) {
              visited[_.util.objId(o[i])] = true;
              _.languages.DFS(o[i], callback, i, visited);
            }
          }
        }
      }
    },
    plugins: {},

    highlightAll: function (async, callback) {
      _.highlightAllUnder(document, async, callback);
    },

    highlightAllUnder: function (container, async, callback) {
      var env = {
        callback: callback,
        selector: 'code[class*="language-"]:not(.static), [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
      };

      _.hooks.run("before-highlightall", env);

      var elements = env.elements || container.querySelectorAll(env.selector);

      for (var i = 0, element; element = elements[i++];) {
        _.highlightElement(element, async === true, env.callback);
      }
    },

    highlightElement: function (element, async, callback) {
      // Find language
      var language, grammar, parent = element;

      while (parent && !lang.test(parent.className)) {
        parent = parent.parentNode;
      }

      if (parent) {
        language = (parent.className.match(lang) || [, ''])[1].toLowerCase();
        grammar = _.languages[language];
      }

      // Set language on the element, if not present
      element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

      if (element.parentNode) {
        // Set language on the parent, for styling
        parent = element.parentNode;

        if (/pre/i.test(parent.nodeName)) {
          parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
        }
      }

      var code = element.textContent;

      var env = {
        element: element,
        language: language,
        grammar: grammar,
        code: code
      };

      _.hooks.run('before-sanity-check', env);

      if (!env.code || !env.grammar) {
        if (env.code) {
          _.hooks.run('before-highlight', env);
          env.element.textContent = env.code;
          _.hooks.run('after-highlight', env);
        }
        _.hooks.run('complete', env);
        return;
      }

      _.hooks.run('before-highlight', env);

      if (async && _self.Worker) {
        var worker = new Worker(_.filename);

        worker.onmessage = function (evt) {
          env.highlightedCode = evt.data;

          _.hooks.run('before-insert', env);

          env.element.innerHTML = env.highlightedCode;

          callback && callback.call(env.element);
          _.hooks.run('after-highlight', env);
          _.hooks.run('complete', env);
        };

        worker.postMessage(JSON.stringify({
          language: env.language,
          code: env.code,
          immediateClose: true
        }));
      } else {
        env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

        _.hooks.run('before-insert', env);

        env.element.innerHTML = env.highlightedCode;

        callback && callback.call(element);

        _.hooks.run('after-highlight', env);
        _.hooks.run('complete', env);
      }
    },

    highlight: function (text, grammar, language) {
      var env = {
        code: text,
        grammar: grammar,
        language: language
      };
      _.hooks.run('before-tokenize', env);
      env.tokens = _.tokenize(env.code, env.grammar);
      _.hooks.run('after-tokenize', env);
      return Token.stringify(_.util.encode(env.tokens), env.language);
    },

    matchGrammar: function (text, strarr, grammar, index, startPos, oneshot, target) {
      var Token = _.Token;

      for (var token in grammar) {
        if (!grammar.hasOwnProperty(token) || !grammar[token]) {
          continue;
        }

        if (token == target) {
          return;
        }

        var patterns = grammar[token];
        patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

        for (var j = 0; j < patterns.length; ++j) {
          var pattern = patterns[j],
            inside = pattern.inside,
            lookbehind = !!pattern.lookbehind,
            greedy = !!pattern.greedy,
            lookbehindLength = 0,
            alias = pattern.alias;

          if (greedy && !pattern.pattern.global) {
            // Without the global flag, lastIndex won't work
            var flags = pattern.pattern.toString().match(/[imuy]*$/)[0];
            pattern.pattern = RegExp(pattern.pattern.source, flags + "g");
          }

          pattern = pattern.pattern || pattern;

          // Don’t cache length as it changes during the loop
          for (var i = index, pos = startPos; i < strarr.length; pos += strarr[i].length, ++i) {

            var str = strarr[i];

            if (strarr.length > text.length) {
              // Something went terribly wrong, ABORT, ABORT!
              return;
            }

            if (str instanceof Token) {
              continue;
            }

            if (greedy && i != strarr.length - 1) {
              pattern.lastIndex = pos;
              var match = pattern.exec(text);
              if (!match) {
                break;
              }

              var from = match.index + (lookbehind ? match[1].length : 0),
                to = match.index + match[0].length,
                k = i,
                p = pos;

              for (var len = strarr.length; k < len && (p < to || (!strarr[k].type && !strarr[k - 1].greedy)); ++k) {
                p += strarr[k].length;
                // Move the index i to the element in strarr that is closest to from
                if (from >= p) {
                  ++i;
                  pos = p;
                }
              }

              // If strarr[i] is a Token, then the match starts inside another Token, which is invalid
              if (strarr[i] instanceof Token) {
                continue;
              }

              // Number of tokens to delete and replace with the new match
              delNum = k - i;
              str = text.slice(pos, p);
              match.index -= pos;
            } else {
              pattern.lastIndex = 0;

              var match = pattern.exec(str),
                delNum = 1;
            }

            if (!match) {
              if (oneshot) {
                break;
              }

              continue;
            }

            if (lookbehind) {
              lookbehindLength = match[1] ? match[1].length : 0;
            }

            var from = match.index + lookbehindLength,
              match = match[0].slice(lookbehindLength),
              to = from + match.length,
              before = str.slice(0, from),
              after = str.slice(to);

            var args = [i, delNum];

            if (before) {
              ++i;
              pos += before.length;
              args.push(before);
            }

            var wrapped = new Token(token, inside ? _.tokenize(match, inside) : match, alias, match, greedy);

            args.push(wrapped);

            if (after) {
              args.push(after);
            }

            Array.prototype.splice.apply(strarr, args);

            if (delNum != 1)
              _.matchGrammar(text, strarr, grammar, i, pos, true, token);

            if (oneshot)
              break;
          }
        }
      }
    },

    tokenize: function (text, grammar, language) {
      var strarr = [text];

      var rest = grammar.rest;

      if (rest) {
        for (var token in rest) {
          grammar[token] = rest[token];
        }

        delete grammar.rest;
      }

      _.matchGrammar(text, strarr, grammar, 0, 0, false);

      return strarr;
    },

    hooks: {
      all: {},

      add: function (name, callback) {
        var hooks = _.hooks.all;

        hooks[name] = hooks[name] || [];

        hooks[name].push(callback);
      },

      run: function (name, env) {
        var callbacks = _.hooks.all[name];

        if (!callbacks || !callbacks.length) {
          return;
        }

        for (var i = 0, callback; callback = callbacks[i++];) {
          callback(env);
        }
      }
    }
  };

  var Token = _.Token = function (type, content, alias, matchedStr, greedy) {
    this.type = type;
    this.content = content;
    this.alias = alias;
    // Copy of the full string this token was created from
    this.length = (matchedStr || "").length | 0;
    this.greedy = !!greedy;
  };

  Token.stringify = function (o, language, parent) {
    if (typeof o == 'string') {
      return o;
    }

    if (_.util.type(o) === 'Array') {
      return o.map(function (element) {
        return Token.stringify(element, language, o);
      }).join('');
    }

    var env = {
      type: o.type,
      content: Token.stringify(o.content, language, parent),
      tag: 'span',
      classes: ['token', o.type],
      attributes: {},
      language: language,
      parent: parent
    };

    if (o.alias) {
      var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
      Array.prototype.push.apply(env.classes, aliases);
    }

    _.hooks.run('wrap', env);

    var attributes = Object.keys(env.attributes).map(function (name) {
      return name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
    }).join(' ');

    return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + (attributes ? ' ' + attributes : '') + '>' + env.content + '</' + env.tag + '>';

  };

  if (!_self.document) {
    if (!_self.addEventListener) {
      // in Node.js
      return _self.Prism;
    }

    if (!_.disableWorkerMessageHandler) {
      // In worker
      _self.addEventListener('message', function (evt) {
        var message = JSON.parse(evt.data),
          lang = message.language,
          code = message.code,
          immediateClose = message.immediateClose;

        _self.postMessage(_.highlight(code, _.languages[lang], lang));
        if (immediateClose) {
          _self.close();
        }
      }, false);
    }

    return _self.Prism;
  }

//Get current script and highlight
  var script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();

  if (script) {
    _.filename = script.src;

    if (!_.manual && !script.hasAttribute('data-manual')) {
      if (document.readyState !== "loading") {
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(_.highlightAll);
        } else {
          window.setTimeout(_.highlightAll, 16);
        }
      } else {
        document.addEventListener('DOMContentLoaded', _.highlightAll);
      }
    }
  }

  return _self.Prism;

})();

Prism.languages.markup = {
  'comment': /<!--[\s\S]*?-->/,
  'prolog': /<\?[\s\S]+?\?>/,
  'doctype': /<!DOCTYPE[\s\S]+?>/i,
  'cdata': /<!\[CDATA\[[\s\S]*?]]>/i,
  'property': {
    pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+))?)*\s*\/?>/i,
    greedy: true,
    inside: {
      'property': {
        pattern: /^<\/?[^\s>\/]+/i,
        inside: {
          'punctuation': /^<\/?/,
          'namespace': /^[^\s>\/:]+:/
        }
      },
      'attr-value': {
        pattern: /=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+)/i,
        inside: {
          'punctuation': [
            /^=/,
            {
              pattern: /(^|[^\\])["']/,
              lookbehind: true
            }
          ]
        }
      },
      'punctuation': /\/?>/,
      'attr-name': {
        pattern: /[^\s>\/]+/,
        inside: {
          'namespace': /^[^\s>\/:]+:/
        }
      }

    }
  },
  'entity': /&#?[\da-z]{1,8};/i
};
Prism.languages.markup['property'].inside['attr-value'].inside['entity'] = Prism.languages.markup['entity'];

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function (env) {
  if (env.type === 'entity') {
    env.attributes['title'] = env.content.replace(/&amp;/, '&');
  }
});
Prism.languages.xml = Prism.languages.markup;
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;
Prism.languages.mermaid = {
  'string': {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    greedy: true
  },
  'punctuation': /[{}[\])(;,]/,
  'operator': /[:*+]|-?->|<--?|participant|Note|right of|loop|end|sequenceDiagram|gantt|title|dateFormat|section/g,
};
Prism.languages.nomnoml = {
  'punctuation': /[{}[\]|,]/,
  'operator': /<choice>|<end>|<start>|<abstract>|<state>|<actor>|<usecase>|[:+\-<>]/g
};
Prism.languages.plantuml = {
  'string': {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    greedy: true
  },
  'symbol': /@startuml|@enduml|@startwbs|@endwbs|@startmindmap|@endmindmap/,
  'comment': /skinparam.*|!include.*/,
  'variable': /LAYOUT_WITH_LEGEND|LAYOUT_TOP_DOWN/,
  'punctuation': /[{}[\])(;,]/,
  'operator': /[:*+\-]|(\.>)|left to right direction|actor|rectangle/g,
  'boolean': /\b(?:true|false)\b/i,
  'null': /\bnull\b/i,
  'text': {
    pattern: /(?:title)(.*)/,
    inside: {
      'operator': {
        pattern: /^title/,
      }
    }
  },
  'keyword': /System_Boundary|Container_Boundary|ContainerDb|Container|Rel_Back|Rel_Neighbor|Rel|System_Ext|System|Person|Component/
};
Prism.languages.http = {
  'verb-post': /^POST/i,
  'verb-get': /^GET/i,
  'host': /(http)s?:\/\/[^\/]+/
};
Prism.languages.erd = {
  'string': /\[[a-zA-Z]+]/i,
  'number': /\b0x[\dA-Fa-f]+\b|\*|\+|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee][+-]?\d+)?/
};
Prism.languages.diag = {
  'property': /"(?:\\.|[^\\"\r\n])*"(?=\s*:)/i,
  'string': {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)|LSX|Interdata|Wollongong|V7M|Xenix/,
    greedy: true
  },
  'operator': /:|--?>|=|<-?-|node |digraph|graph |^nwdiag|network|lane|^actdiag|^seqdiag|^blockdiag|^packetdiag|^rackdiag|[0-9]+-[0-9]+:|[0-9]+:/g,
  'number': /\b0x[\dA-Fa-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)\b(?:[Ee][+-]?\d+)?/,
  'punctuation': /[{}[\]);,]/,
  'attr-value': /polygon|white|filled|salmon[0-9]?|deep|sky|golden|rod[0-9]?|bisque[0-9]?|orangered|crimson|orange[0-9]?|green[0-9]?|light|blue[0-9]?|burlywood[0-9]?|gold[0-9]?|green|yellow[0-9]?|dodger|thistle[0-9]?|dark|olive|blue|steel|turquoise[0-9]?|navy|sea|coral[0-9]?|chocolate|aqua|marine[0-9]?|lemon[0-9]?|chiffon[0-9]?|blanchedalmond|orchid[0-9]?|cyan|cadet|firebrick|mistyrose2|chartreuse4/,
  'boolean': /\b(?:true|false)\b/i,
  'null': /\bnull\b/i
};
Prism.languages.ascii = {
  'number': /\b0x[\dA-Fa-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee][+-]?\d+)?/,
  'punctuation': /[-+|v><^]/,
};
Prism.languages.json = {
  'property': /"(?:\\.|[^\\"\r\n])*"(?=\s*:)/i,
  'string': {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    greedy: true
  },
  'number': /\b0x[\dA-Fa-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee][+-]?\d+)?/,
  'punctuation': /[{}[\]);,]/,
  'operator': /:/g,
  'boolean': /\b(?:true|false)\b/i,
  'null': /\bnull\b/i
};
Prism.languages.request = {
  'null': /\n.*$/i,
  'operator': /[a-zA-Z\-]+:/i,
  'keyword': /image\/svg\+xml|text\/plain/i,
}
Prism.languages.sh = {
  'keyword': /'[^']+'|"[^"]+"|text\/plain/i,
  'host': /(http)s?:\/\/[^\/]+/,
  'operator': /-[a-zA-Z]+ |[a-z_A-Z]+=|--[a-zA-Z\-]+|Content-Type/g,
  'command': /http|curl|python|kroki/i
}
Prism.languages.clojure = {
  comment: /;.*/,
  string: { pattern: /"(?:[^"\\]|\\.)*"/, greedy: !0 },
  operator: /(?:::|[:|'])\b[a-z][\w*+!?-]*\b/i,
  keyword: {
    pattern: /([^\w+*'?-])(?:def|if|do|let|\.\.|quote|var|->>|->|fn|loop|recur|throw|try|monitor-enter|\.|new|set!|def\-|defn|defn\-|defmacro|defmulti|defmethod|defstruct|defonce|declare|definline|definterface|defprotocol|==|defrecord|>=|deftype|<=|defproject|ns|\*|\+|\-|\/|<|=|>|accessor|agent|agent-errors|aget|alength|all-ns|alter|and|append-child|apply|array-map|aset|aset-boolean|aset-byte|aset-char|aset-double|aset-float|aset-int|aset-long|aset-short|assert|assoc|await|await-for|bean|binding|bit-and|bit-not|bit-or|bit-shift-left|bit-shift-right|bit-xor|boolean|branch\?|butlast|byte|cast|char|children|class|clear-agent-errors|comment|commute|comp|comparator|complement|concat|conj|cons|constantly|cond|if-not|construct-proxy|contains\?|count|create-ns|create-struct|cycle|dec|deref|difference|disj|dissoc|distinct|doall|doc|dorun|doseq|dosync|dotimes|doto|double|down|drop|drop-while|edit|end\?|ensure|eval|every\?|false\?|ffirst|file-seq|filter|find|find-doc|find-ns|find-var|first|float|flush|for|fnseq|frest|gensym|get-proxy-class|get|hash-map|hash-set|identical\?|identity|if-let|import|in-ns|inc|index|insert-child|insert-left|insert-right|inspect-table|inspect-tree|instance\?|int|interleave|intersection|into|into-array|iterate|join|key|keys|keyword|keyword\?|last|lazy-cat|lazy-cons|left|lefts|line-seq|list\*|list|load|load-file|locking|long|loop|macroexpand|macroexpand-1|make-array|make-node|map|map-invert|map\?|mapcat|max|max-key|memfn|merge|merge-with|meta|min|min-key|name|namespace|neg\?|new|newline|next|nil\?|node|not|not-any\?|not-every\?|not=|ns-imports|ns-interns|ns-map|ns-name|ns-publics|ns-refers|ns-resolve|ns-unmap|nth|nthrest|or|parse|partial|path|peek|pop|pos\?|pr|pr-str|print|print-str|println|println-str|prn|prn-str|project|proxy|proxy-mappings|quot|rand|rand-int|range|re-find|re-groups|re-matcher|re-matches|re-pattern|re-seq|read|read-line|reduce|ref|ref-set|refer|rem|remove|remove-method|remove-ns|rename|rename-keys|repeat|replace|replicate|resolve|rest|resultset-seq|reverse|rfirst|right|rights|root|rrest|rseq|second|select|select-keys|send|send-off|seq|seq-zip|seq\?|set|short|slurp|some|sort|sort-by|sorted-map|sorted-map-by|sorted-set|special-symbol\?|split-at|split-with|str|string\?|struct|struct-map|subs|subvec|symbol|symbol\?|sync|take|take-nth|take-while|test|time|to-array|to-array-2d|tree-seq|true\?|union|up|update-proxy|val|vals|var-get|var-set|var\?|vector|vector-zip|vector\?|when|when-first|when-let|when-not|with-local-vars|with-meta|with-open|with-out-str|xml-seq|xml-zip|zero\?|zipmap|zipper)(?=[^\w+*'?-])/,
    lookbehind: !0
  },
  boolean: /\b(?:true|false|nil)\b/,
  number: /\b[\da-f]+\b/i,
  punctuation: /[{}\[\](),]/
};
Prism.languages.pikchr = {
  'string': {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    greedy: true
  },
  'assignment': /([a-z\$]+) (?=\*?=)/,
  'comment': /#.*/,
  'punctuation': /[{}[\])(;,\\/]|\.start|\.end|\.nw|\.ne|\.n|\.sw|\.se|\.s|\.e|\.w|\.radius|\.x|\.y/,
  'variable': /linewid/,
  'operator': /[:*+\-\=]|heading|right|left|down|from|then|to|at|rad|height|width|with|wid|ht|behind|fill|move|up|last|color|between|and|way|until|even|previous|same|scale|dist|chop|fit|west|of|below|above|south|2nd/g,
  'keyword': /circle|arrow|box|ellipse|line|dot|oval/,
  'symbol': /black|white|gray|0x[0-9a-z]{6}/,
  'number': /\b[0-9\.]+(%|cm|in)?/,
  'font-style-thin': /thin/,
  'font-style-bold': /bold/,
  'font-style-italic': /italic/
};
