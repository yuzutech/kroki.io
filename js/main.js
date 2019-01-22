'use strict';

document.addEventListener('DOMContentLoaded', function () {
  function getAll (selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector), 0);
  }

  function clearTooltip (e) {
    e.classList.remove('tooltipped', 'tooltipped-s', 'tooltipped-no-delay');
    e.removeAttribute('aria-label');
  }

  function showTooltip (elem, msg) {
    elem.classList.add('tooltipped', 'tooltipped-s', 'tooltipped-no-delay');
    elem.setAttribute('aria-label', msg);
  }

  function fallbackMessage (action) {
    var actionMsg = '';
    var actionKey = (action === 'cut' ? 'X' : 'C');
    if (/iPhone|iPad/i.test(navigator.userAgent)) {
      actionMsg = 'No support :(';
    } else if (/Mac/i.test(navigator.userAgent)) {
      actionMsg = 'Press ⌘-' + actionKey + ' to ' + action;
    } else {
      actionMsg = 'Press Ctrl-' + actionKey + ' to ' + action;
    }
    return actionMsg;
  }

  function addHighlightControls () {
    var $highlightButtons = getAll('.highlight .bd-copy, .highlight .bd-expand');


    $highlightButtons.forEach(function ($el) {
      $el.addEventListener('mouseenter', function () {
        $el.parentNode.classList.add('bd-is-hovering');
      });

      $el.addEventListener('mouseleave', function () {
        $el.parentNode.classList.remove('bd-is-hovering');
        clearTooltip(this);
      });

      $el.addEventListener('blur', function () {
        clearTooltip(this);
      });

      var clipboardSnippets = new ClipboardJS($el);
      clipboardSnippets.on('success', function (e) {
        e.clearSelection();
        showTooltip(e.trigger, 'Copied!');
      });
      clipboardSnippets.on('error', function (e) {
        showTooltip(e.trigger, fallbackMessage(e.action));
      });
    });
  }

  addHighlightControls();
});
