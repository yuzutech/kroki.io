'use strict'

document.addEventListener('DOMContentLoaded', function () {
  function toArray (nodeList) {
    return Array.prototype.slice.call(nodeList, 0)
  }

  var filterButtons = toArray(document.querySelectorAll('.catalog-filter'))
  var cards = toArray(document.querySelectorAll('.catalog-card'))
  var details = toArray(document.querySelectorAll('.catalog-detail'))
  var activeToggle = null

  function closeActive () {
    if (!activeToggle) return
    activeToggle.setAttribute('aria-expanded', 'false')
    var card = activeToggle.closest('.catalog-card')
    if (card) card.classList.remove('is-active')
    var detail = document.getElementById(activeToggle.getAttribute('aria-controls'))
    if (detail) detail.hidden = true
    activeToggle = null
  }

  function applyFilter (button) {
    filterButtons.forEach(function (b) { b.classList.remove('is-active') })
    button.classList.add('is-active')
    var category = button.getAttribute('data-category')
    cards.forEach(function (card) {
      var categories = (card.getAttribute('data-categories') || '').split(' ')
      var visible = category === 'all' || categories.indexOf(category) !== -1
      card.hidden = !visible
    })
    if (activeToggle) {
      var activeCard = activeToggle.closest('.catalog-card')
      if (activeCard && activeCard.hidden) closeActive()
    }
  }

  function resetFilterToAll () {
    var allButton = document.querySelector('.catalog-filter[data-category="all"]')
    if (allButton) applyFilter(allButton)
  }

  // Only one card's detail can be open at a time (accordion), and the
  // detail always lives after the full card grid — never between cards —
  // so opening one never reflows/cuts the list. Always scrolls to the same
  // position (top of the detail) so the behavior is predictable regardless
  // of where the card sits in the grid.
  function openDetail (detail, smooth) {
    var toggle = document.querySelector('.catalog-card-toggle[aria-controls="' + detail.id + '"]')
    if (!toggle) return
    var card = toggle.closest('.catalog-card')
    if (card && card.hidden) resetFilterToAll()
    closeActive()
    toggle.setAttribute('aria-expanded', 'true')
    if (card) card.classList.add('is-active')
    detail.hidden = false
    activeToggle = toggle
    detail.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  }

  function selectExample (detail, anchor) {
    var switcherButtons = toArray(detail.querySelectorAll('.catalog-example-toggle'))
    var exampleBlocks = toArray(detail.querySelectorAll('.catalog-example'))
    if (!exampleBlocks.length) return
    switcherButtons.forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-example') === anchor)
    })
    exampleBlocks.forEach(function (block) {
      block.hidden = block.getAttribute('data-example') !== anchor
    })
  }

  cards.forEach(function (card) {
    var toggle = card.querySelector('.catalog-card-toggle')
    if (!toggle) return
    toggle.addEventListener('click', function () {
      if (toggle === activeToggle) {
        closeActive()
        return
      }
      var detail = document.getElementById(toggle.getAttribute('aria-controls'))
      if (detail) openDetail(detail, true)
    })
  })

  details.forEach(function (detail) {
    toArray(detail.querySelectorAll('.catalog-example-toggle')).forEach(function (switchButton) {
      switchButton.addEventListener('click', function () {
        selectExample(detail, switchButton.getAttribute('data-example'))
      })
    })
  })

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () { applyFilter(button) })
  })

  // Deep links: examples.html#<type-slug> opens that type's card (e.g. a
  // future "Diagram types" card on the homepage linking straight to its
  // catalog entry). examples.html#<example-anchor> keeps every link to the
  // previous per-example anchors (e.g. #seqdiag, #use-case, #c4-context)
  // working, opening the owning type and selecting that specific example.
  function openFromHash (smooth) {
    var hash = window.location.hash.slice(1)
    if (!hash || !/^[\w-]+$/.test(hash)) return

    var detail = document.getElementById('detail-' + hash)
    if (detail) {
      openDetail(detail, smooth)
      return
    }

    var exampleBlock = document.querySelector('.catalog-example[data-example="' + hash + '"]')
    if (exampleBlock) {
      var parentDetail = exampleBlock.closest('.catalog-detail')
      if (parentDetail) {
        openDetail(parentDetail, smooth)
        selectExample(parentDetail, hash)
      }
    }
  }

  openFromHash(false)
  window.addEventListener('hashchange', function () { openFromHash(true) })
})