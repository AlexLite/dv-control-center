/* global window, document, Blob, URL */
(function initEditorPersistence(global) {
  function loadFlexEditorState(deps) {
    const { state } = deps
    try {
      const raw = localStorage.getItem('datavideo_flex_editor') || localStorage.getItem('se3200_flex_editor')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved && typeof saved === 'object') {
        state.flexView = Number(saved.flexView) || 2
        state.flexGridDensity = Number(saved.flexGridDensity) || 24
        state.flexShowGuides = saved.flexShowGuides !== false
        state.flexSafeMargins = !!saved.flexSafeMargins
        state.flexSnapEnabled = saved.flexSnapEnabled !== false
        state.flexSnapDistance = Number(saved.flexSnapDistance) || 10
        state.flexGuides = {
          v: Array.isArray(saved.flexGuides?.v) ? saved.flexGuides.v : [],
          h: Array.isArray(saved.flexGuides?.h) ? saved.flexGuides.h : [],
        }
        state.pipGridDensity = Number(saved.pipGridDensity) || 24
        state.pipShowGuides = saved.pipShowGuides !== false
        state.pipSafeMargins = !!saved.pipSafeMargins
        state.pipSnapEnabled = saved.pipSnapEnabled !== false
        state.pipSnapDistance = Number(saved.pipSnapDistance) || 10
        state.pipGuides = {
          v: Array.isArray(saved.pipGuides?.v) ? saved.pipGuides.v : [],
          h: Array.isArray(saved.pipGuides?.h) ? saved.pipGuides.h : [],
        }
      }
    } catch (e) {
      // ignore broken local storage values
    }
  }

  function saveFlexEditorState(deps) {
    const { state } = deps
    const payload = {
      flexView: state.flexView,
      flexGridDensity: state.flexGridDensity,
      flexShowGuides: state.flexShowGuides,
      flexSafeMargins: state.flexSafeMargins,
      flexSnapEnabled: state.flexSnapEnabled,
      flexSnapDistance: state.flexSnapDistance,
      flexGuides: state.flexGuides,
      pipGridDensity: state.pipGridDensity,
      pipShowGuides: state.pipShowGuides,
      pipSafeMargins: state.pipSafeMargins,
      pipSnapEnabled: state.pipSnapEnabled,
      pipSnapDistance: state.pipSnapDistance,
      pipGuides: state.pipGuides,
    }
    localStorage.setItem('datavideo_flex_editor', JSON.stringify(payload))
  }

  function normalizeGuidesPayload(parsed) {
    const source = parsed?.guides || parsed || {}
    return {
      v: Array.isArray(source?.v) ? source.v.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [],
      h: Array.isArray(source?.h) ? source.h.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [],
    }
  }

  function downloadJsonFile(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function loadJsonFileFromDisk() {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0] ? input.files[0] : null
        if (!file) {
          resolve(null)
          return
        }
        try {
          const text = await file.text()
          resolve(JSON.parse(text))
        } catch (e) {
          resolve(null)
        }
      }, { once: true })
      input.click()
    })
  }

  global.DVIPEditorPersistence = {
    loadFlexEditorState,
    saveFlexEditorState,
    normalizeGuidesPayload,
    downloadJsonFile,
    loadJsonFileFromDisk,
  }
}(window))
