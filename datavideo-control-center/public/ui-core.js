/* global window, document */
(function initUiCore(global) {
  const resetContextMenuState = {
    menu: null,
    cleanup: null,
  }

  function byId(id) {
    return document.getElementById(id)
  }

  function hideResetContextMenu() {
    if (resetContextMenuState.cleanup) {
      resetContextMenuState.cleanup()
      resetContextMenuState.cleanup = null
    }
    if (resetContextMenuState.menu && resetContextMenuState.menu.parentNode) {
      resetContextMenuState.menu.parentNode.removeChild(resetContextMenuState.menu)
    }
    resetContextMenuState.menu = null
  }

  function showResetContextMenu(clientX, clientY, onReset) {
    hideResetContextMenu()
    const menu = document.createElement('div')
    menu.className = 'reset-context-menu'
    menu.innerHTML = '<button type="button">Reset</button>'
    const btn = menu.querySelector('button')
    btn.addEventListener('click', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      try { onReset() } catch (e) { /* noop */ }
      hideResetContextMenu()
    })
    document.body.appendChild(menu)
    const rect = menu.getBoundingClientRect()
    const left = Math.max(6, Math.min(clientX, window.innerWidth - rect.width - 6))
    const top = Math.max(6, Math.min(clientY, window.innerHeight - rect.height - 6))
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
    const close = (ev) => {
      if (!menu.contains(ev.target)) hideResetContextMenu()
    }
    const closeEsc = (ev) => {
      if (ev.key === 'Escape') hideResetContextMenu()
    }
    document.addEventListener('mousedown', close, true)
    document.addEventListener('contextmenu', close, true)
    window.addEventListener('resize', hideResetContextMenu, { once: true })
    document.addEventListener('keydown', closeEsc, true)
    resetContextMenuState.menu = menu
    resetContextMenuState.cleanup = () => {
      document.removeEventListener('mousedown', close, true)
      document.removeEventListener('contextmenu', close, true)
      document.removeEventListener('keydown', closeEsc, true)
    }
  }

  function cloneJson(v) {
    return JSON.parse(JSON.stringify(v))
  }

  function syncCanvasResolution(id) {
    const canvas = byId(id)
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const ratio = window.devicePixelRatio || 1
    const targetW = Math.max(1, Math.round(rect.width * ratio))
    const targetH = Math.max(1, Math.round(rect.height * ratio))
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW
      canvas.height = targetH
    }
  }

  function fillSelect(selectEl, values) {
    if (!selectEl) return
    selectEl.innerHTML = ''
    for (const item of values || []) {
      const op = document.createElement('option')
      op.value = item.id
      op.textContent = `${item.id}: ${item.label}`
      selectEl.appendChild(op)
    }
  }

  function pickValues(state, sourceChoices, label) {
    const ctrl = state?.controlsByLabel?.get ? state.controlsByLabel.get(label) : null
    if (ctrl && Array.isArray(ctrl.values) && ctrl.values.length > 0) return ctrl.values
    if (label === 'OUTPUT_MULTIVIEWER_MODE') {
      return [
        { id: 0, label: 'Default' },
        { id: 1, label: 'Picture In Picture' },
        { id: 2, label: 'Quad' },
        { id: 3, label: 'Program/Preview' },
      ]
    }
    if (/^SWITCHER_KEY[1-4]_KEY_SRC$/.test(label)) return sourceChoices
    if (/^SWITCHER_FLEX_SRC_(BGND_SRC|DVE[1-4]_SRC|FGND_SRC)$/.test(label)) return sourceChoices
    if (/^OUTPUT_MULTIVIEWER_MAIN[12]_SRC$/.test(label)) return sourceChoices
    return []
  }

  function setTabVisible(byIdFn, tabId, visible) {
    const btn = document.querySelector(`.tabs button[data-tab="${tabId}"]`)
    const byIdSafe = (typeof byIdFn === 'function') ? byIdFn : byId
    const section = byIdSafe(`tab-${tabId}`)
    if (btn) btn.style.display = visible ? '' : 'none'
    if (section) section.style.display = visible ? '' : 'none'
  }

  function getActiveTabId() {
    const activeBtn = document.querySelector('.tabs button.active')
    return activeBtn ? activeBtn.dataset.tab : null
  }

  function activateTab(tabId) {
    const btn = document.querySelector(`.tabs button[data-tab="${tabId}"]`)
    if (!btn || typeof btn.click !== 'function') return false
    btn.click()
    return true
  }

  global.DVIPUiCore = {
    hideResetContextMenu,
    showResetContextMenu,
    cloneJson,
    syncCanvasResolution,
    fillSelect,
    pickValues,
    setTabVisible,
    getActiveTabId,
    activateTab,
  }
}(window))
