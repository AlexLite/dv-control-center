/* global window, document */
(function initEditorUiUtils(global) {
  function asIntString(v, fallback = 0) {
    const n = Number(v)
    return String(Number.isFinite(n) ? Math.round(n) : fallback)
  }

  function bindSliderNumber(deps, id, kind, index) {
    const {
      byId, pctToRawScale, markEditorDirty, markEditLock, drawPipCanvas, drawFlexCanvas, clamp, showResetContextMenu, pushEditorHistory,
    } = deps
    const range = byId(`${id}-r`)
    const input = byId(id)
    if (!range || !input) return
    const min = Number(input.min === '' ? -Infinity : input.min)
    const max = Number(input.max === '' ? Infinity : input.max)
    const syncScaleHidden = () => {
      const scaleMatch = id.match(/^(pip|flex)(\d+)-s$/)
      if (scaleMatch) {
        const num = Number(scaleMatch[2])
        const rawScale = pctToRawScale(Number(input.value || 0))
        const w = byId(`${scaleMatch[1]}${num}-w`)
        const h = byId(`${scaleMatch[1]}${num}-h`)
        if (w) w.value = rawScale.toFixed(4)
        if (h) h.value = rawScale.toFixed(4)
      }
    }
    const redraw = () => {
      if (Number.isInteger(index)) markEditLock(kind, index)
      if (typeof pushEditorHistory === 'function') pushEditorHistory(kind)
      if (kind === 'pip') drawPipCanvas()
      else drawFlexCanvas()
    }
    const applyValue = (value, keepDecimals = false) => {
      // Capture baseline before first mutation so Ctrl+Z can return to pre-edit state.
      markEditorDirty(kind)
      const clamped = clamp(Number(value) || 0, min, max)
      const shown = keepDecimals ? Number(clamped).toFixed(2) : String(Math.round(clamped))
      input.value = shown
      range.value = shown
      syncScaleHidden()
      redraw()
    }
    const syncFromRange = (ev) => {
      const raw = Number(range.value || 0)
      const wheelFine = range.dataset.wheelNudge === '1'
      if (wheelFine) delete range.dataset.wheelNudge
      if (wheelFine) range.step = range.dataset.wheelStep || '0.1'
      const keepDecimals = !!(ev && ev.ctrlKey) || wheelFine
      applyValue(keepDecimals ? raw : Math.round(raw), keepDecimals)
    }
    const syncFromInput = () => {
      const raw = Number(input.value || 0)
      applyValue(Math.round(raw), false)
    }
    const resetToDefault = () => {
      const def = Number(input.dataset.defaultValue || range.dataset.defaultValue || 0)
      applyValue(def, false)
    }
    const primeBaseline = () => {
      markEditorDirty(kind)
    }
    const openResetMenu = (ev) => {
      ev.preventDefault()
      showResetContextMenu(ev.clientX, ev.clientY, resetToDefault)
    }
    range.addEventListener('pointerdown', primeBaseline)
    input.addEventListener('pointerdown', primeBaseline)
    range.addEventListener('keydown', primeBaseline)
    input.addEventListener('keydown', primeBaseline)
    range.addEventListener('wheel', primeBaseline, { passive: true })
    input.addEventListener('wheel', primeBaseline, { passive: true })
    range.addEventListener('input', syncFromRange)
    input.addEventListener('input', syncFromInput)
    input.addEventListener('change', syncFromInput)
    input.addEventListener('blur', syncFromInput)
    range.addEventListener('contextmenu', openResetMenu)
    input.addEventListener('contextmenu', openResetMenu)
  }

  function normalizeFineControls() {
    document.querySelectorAll('.num-sync').forEach((el) => {
      if (document.activeElement === el) return
      const v = Math.round(Number(el.value || 0))
      el.value = String(v)
    })
    document.querySelectorAll('.slider-sync').forEach((el) => {
      const v = Math.round(Number(el.value || 0))
      el.value = String(v)
      el.step = '1'
    })
  }

  function setPipWindowInputs(deps, i, v) {
    const { byId, rawPosToPct, rawScaleToPct, updatePipBorderUi } = deps
    const scaleRaw = Number(v.s || 0.96)
    byId(`pip${i}-en`).checked = !!v.en
    byId(`pip${i}-x`).value = asIntString(rawPosToPct(Number(v.x || 0)))
    byId(`pip${i}-y`).value = asIntString(rawPosToPct(Number(v.y || 0)))
    byId(`pip${i}-s`).value = asIntString(rawScaleToPct(scaleRaw))
    if (byId(`pip${i}-x-r`)) byId(`pip${i}-x-r`).value = String(Math.round(rawPosToPct(Number(v.x || 0))))
    if (byId(`pip${i}-y-r`)) byId(`pip${i}-y-r`).value = String(Math.round(rawPosToPct(Number(v.y || 0))))
    if (byId(`pip${i}-s-r`)) byId(`pip${i}-s-r`).value = String(Math.round(rawScaleToPct(scaleRaw)))
    byId(`pip${i}-w`).value = scaleRaw.toFixed(4)
    byId(`pip${i}-h`).value = scaleRaw.toFixed(4)
    byId(`pip${i}-cl`).value = asIntString(v.cl || 0)
    byId(`pip${i}-cr`).value = asIntString(v.cr || 0)
    byId(`pip${i}-ct`).value = asIntString(v.ct || 0)
    byId(`pip${i}-cb`).value = asIntString(v.cb || 0)
    if (byId(`pip${i}-cl-r`)) byId(`pip${i}-cl-r`).value = String(Math.round(Number(v.cl || 0)))
    if (byId(`pip${i}-cr-r`)) byId(`pip${i}-cr-r`).value = String(Math.round(Number(v.cr || 0)))
    if (byId(`pip${i}-ct-r`)) byId(`pip${i}-ct-r`).value = String(Math.round(Number(v.ct || 0)))
    if (byId(`pip${i}-cb-r`)) byId(`pip${i}-cb-r`).value = String(Math.round(Number(v.cb || 0)))
    if (byId(`pip${i}-bs`)) byId(`pip${i}-bs`).value = Number(v.bs ?? 1).toFixed(0)
    if (byId(`pip${i}-borderOn`)) byId(`pip${i}-borderOn`).checked = Number(v.bs ?? 1) > 0
    if (byId(`pip${i}-bo`)) byId(`pip${i}-bo`).value = asIntString(v.bo ?? 100, 100)
    if (byId(`pip${i}-bw`)) byId(`pip${i}-bw`).value = asIntString(v.bw ?? 2, 2)
    if (byId(`pip${i}-bh`)) byId(`pip${i}-bh`).value = asIntString(v.bh ?? 60, 60)
    if (byId(`pip${i}-bsa`)) byId(`pip${i}-bsa`).value = asIntString(v.bsa ?? 80, 80)
    if (byId(`pip${i}-bl`)) byId(`pip${i}-bl`).value = asIntString(v.bl ?? 100, 100)
    updatePipBorderUi(i)
  }

  function setFlexWindowInputs(deps, i, v) {
    const { byId, rawPosToPct, rawScaleToPct, updateFlexBorderUi } = deps
    const scaleRaw = Number(v.s || 0.48)
    byId(`flex${i}-en`).checked = !!v.en
    byId(`flex${i}-x`).value = asIntString(rawPosToPct(Number(v.x || 0)))
    byId(`flex${i}-y`).value = asIntString(rawPosToPct(Number(v.y || 0)))
    byId(`flex${i}-s`).value = asIntString(rawScaleToPct(scaleRaw))
    if (byId(`flex${i}-x-r`)) byId(`flex${i}-x-r`).value = String(Math.round(rawPosToPct(Number(v.x || 0))))
    if (byId(`flex${i}-y-r`)) byId(`flex${i}-y-r`).value = String(Math.round(rawPosToPct(Number(v.y || 0))))
    if (byId(`flex${i}-s-r`)) byId(`flex${i}-s-r`).value = String(Math.round(rawScaleToPct(scaleRaw)))
    byId(`flex${i}-w`).value = scaleRaw.toFixed(4)
    byId(`flex${i}-h`).value = scaleRaw.toFixed(4)
    byId(`flex${i}-cl`).value = asIntString(v.cl || 0)
    byId(`flex${i}-cr`).value = asIntString(v.cr || 0)
    byId(`flex${i}-ct`).value = asIntString(v.ct || 0)
    byId(`flex${i}-cb`).value = asIntString(v.cb || 0)
    if (byId(`flex${i}-cl-r`)) byId(`flex${i}-cl-r`).value = String(Math.round(Number(v.cl || 0)))
    if (byId(`flex${i}-cr-r`)) byId(`flex${i}-cr-r`).value = String(Math.round(Number(v.cr || 0)))
    if (byId(`flex${i}-ct-r`)) byId(`flex${i}-ct-r`).value = String(Math.round(Number(v.ct || 0)))
    if (byId(`flex${i}-cb-r`)) byId(`flex${i}-cb-r`).value = String(Math.round(Number(v.cb || 0)))
    if (byId(`flex${i}-bs`)) byId(`flex${i}-bs`).value = Number(v.bs ?? 1).toFixed(0)
    if (byId(`flex${i}-borderOn`)) byId(`flex${i}-borderOn`).checked = Number(v.bs ?? 1) > 0
    if (byId(`flex${i}-bo`)) byId(`flex${i}-bo`).value = asIntString(v.bo ?? 100, 100)
    if (byId(`flex${i}-bw`)) byId(`flex${i}-bw`).value = asIntString(v.bw ?? 2, 2)
    if (byId(`flex${i}-bh`)) byId(`flex${i}-bh`).value = asIntString(v.bh ?? 60, 60)
    if (byId(`flex${i}-bsa`)) byId(`flex${i}-bsa`).value = asIntString(v.bsa ?? 80, 80)
    if (byId(`flex${i}-bl`)) byId(`flex${i}-bl`).value = asIntString(v.bl ?? 100, 100)
    updateFlexBorderUi(i)
  }

  function normalizePipAspect(deps) {
    const { byId, clamp, SCALE_RAW_MAX, rawScaleToPct } = deps
    for (let i = 1; i <= 4; i += 1) {
      if (!byId(`pip${i}-w`) || !byId(`pip${i}-h`)) continue
      const w = clamp(Number(byId(`pip${i}-w`).value || 0.96), 0, SCALE_RAW_MAX)
      byId(`pip${i}-w`).value = w.toFixed(4)
      byId(`pip${i}-h`).value = w.toFixed(4)
      if (byId(`pip${i}-s`)) byId(`pip${i}-s`).value = String(Math.round(rawScaleToPct(w)))
    }
  }

  function normalizeFlexAspect(deps) {
    const { byId, clamp, FLEX_WINDOW_COUNT, SCALE_RAW_MAX, rawScaleToPct } = deps
    for (let i = 1; i <= FLEX_WINDOW_COUNT; i += 1) {
      if (!byId(`flex${i}-w`) || !byId(`flex${i}-h`)) continue
      const w = clamp(Number(byId(`flex${i}-w`).value || 0.48), 0, SCALE_RAW_MAX)
      byId(`flex${i}-w`).value = w.toFixed(4)
      byId(`flex${i}-h`).value = w.toFixed(4)
      if (byId(`flex${i}-s`)) byId(`flex${i}-s`).value = String(Math.round(rawScaleToPct(w)))
    }
  }

  global.DVIPEditorUiUtils = {
    bindSliderNumber,
    normalizeFineControls,
    setPipWindowInputs,
    setFlexWindowInputs,
    normalizePipAspect,
    normalizeFlexAspect,
  }
}(window))
