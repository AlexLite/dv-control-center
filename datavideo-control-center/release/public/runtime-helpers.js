/* global window */
(function initRuntimeHelpers(global) {
  function getBaseFlexGeometry() {
    if (global.DVIPCanvasGeometry && typeof global.DVIPCanvasGeometry.getBaseFlexGeometry === 'function') {
      return global.DVIPCanvasGeometry.getBaseFlexGeometry()
    }
    return { positionMode: 'fixedCenter', xScale: 1.0075, xOffset: 0, yScale: 1.7857142857, yOffset: 0 }
  }

  function t(key, vars) {
    if (global.DVIPI18n && typeof global.DVIPI18n.t === 'function') return global.DVIPI18n.t(key, vars)
    return key
  }

  function getFlexGeometry() {
    const base = getBaseFlexGeometry()
    return {
      positionMode: String(base.positionMode || 'fixedCenter'),
      xScale: Number(base.xScale || 1.0075),
      xOffset: Number(base.xOffset || 0),
      yScale: Number(base.yScale || 1.7857142857),
      yOffset: Number(base.yOffset || 0),
    }
  }

  function setConnState(state, byId) {
    const el = byId('connState')
    if (!el) return
    if (state.connection.connected) {
      el.textContent = t('status.connected', { host: state.connection.host, port: state.connection.commandPort })
    } else {
      el.textContent = t('status.disconnected')
    }
  }

  function setModelState(state, byId) {
    const el = byId('modelState')
    const capsEl = byId('modelCapabilities')
    const hiddenEl = byId('modelHiddenControls')
    const setCaps = (items) => {
      if (!capsEl) return
      const list = Array.isArray(items) ? items.filter(Boolean) : []
      if (list.length === 0) {
        capsEl.textContent = ''
        capsEl.style.display = 'none'
        return
      }
      capsEl.textContent = `${t('model.limitsLabel')}: ${list.join(', ')}`
      capsEl.style.display = 'inline-block'
    }
    const setHidden = (count) => {
      if (!hiddenEl) return
      const n = Number(count || 0)
      if (!Number.isFinite(n) || n <= 0) {
        hiddenEl.textContent = ''
        hiddenEl.style.display = 'none'
        return
      }
      hiddenEl.textContent = t('model.hiddenControls', { count: n })
      hiddenEl.style.display = 'inline-block'
    }
    const countHiddenControls = () => {
      if (!global.DVIPModelCapabilitiesUi || typeof global.DVIPModelCapabilitiesUi.isRawControlVisible !== 'function') return 0
      const sections = state?.catalog?.sections
      if (!Array.isArray(sections)) return 0
      let hiddenCount = 0
      for (const section of sections) {
        for (const control of (section?.controls || [])) {
          if (!control || !control.label) continue
          if (!global.DVIPModelCapabilitiesUi.isRawControlVisible(state, section, control)) hiddenCount += 1
        }
      }
      return hiddenCount
    }
    if (!el) return
    const detected = state?.modelSelection?.detected || state?.model || null
    const requested = state?.modelSelection?.requested || null
    if (!detected) {
      el.textContent = t('model.na')
      setCaps([])
      setHidden(0)
      return
    }
    const detectedLabel = detected.label || detected.id || 'Unknown'
    const notes = []
    const supports = detected?.supports || {}
    if (detected.legacyDvip) notes.push(t('model.note.legacy'))
    if (Array.isArray(detected.hiddenLabelPatterns) && detected.hiddenLabelPatterns.length > 0) {
      notes.push(t('model.note.filtered'))
    }
    if (supports.flex === false) notes.push(t('model.note.noFlex'))
    if (supports.multiview === false) notes.push(t('model.note.noMultiview'))
    if (supports.extendedPipBorder === false) notes.push(t('model.note.noExtBorder'))
    setCaps([
      supports.flex === false ? t('model.limit.flex') : '',
      supports.multiview === false ? t('model.limit.multiview') : '',
      supports.extendedPipBorder === false ? t('model.limit.extBorder') : '',
    ])
    setHidden(countHiddenControls())
    const noteText = notes.length ? ` (${notes.join(', ')})` : ''
    if (!requested || !requested.id || requested.id === detected.id) {
      el.textContent = t('model.simple', { detected: detectedLabel }) + noteText
      return
    }
    const requestedLabel = requested.label || requested.id
    el.textContent = t('model.requested', { detected: detectedLabel, requested: requestedLabel }) + noteText
  }

  function markEditLock(state, kind, index, ttlMs = 4000) {
    if (!state.editLocks[kind]) state.editLocks[kind] = {}
    state.editLocks[kind][index] = Date.now() + Math.max(200, Number(ttlMs) || 4000)
  }

  function releaseEditLock(state, kind, index, delayMs = 1200) {
    if (!state.editLocks[kind]) state.editLocks[kind] = {}
    state.editLocks[kind][index] = Date.now() + Math.max(100, Number(delayMs) || 1200)
  }

  function isEditLocked(state, kind, index) {
    const expiresAt = state.editLocks[kind] ? Number(state.editLocks[kind][index] || 0) : 0
    if (!expiresAt) return false
    if (Date.now() >= expiresAt) {
      if (state.editLocks[kind]) delete state.editLocks[kind][index]
      return false
    }
    return true
  }

  function getPipDefaultWindow(quadPositions, i) {
    const p = quadPositions[i] || quadPositions[1]
    return { en: true, x: p.x, y: p.y, s: 0.96, cl: 0, cr: 0, ct: 0, cb: 0, bs: 1, bo: 100, bw: 2, bh: 60, bsa: 80, bl: 100 }
  }

  function getFlexDefaultWindow(flexQuadPositions, i) {
    const p = flexQuadPositions[i] || flexQuadPositions[1]
    return { en: true, x: p.x, y: p.y, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0, bs: 1, bo: 100, bw: 2, bh: 60, bsa: 80, bl: 100 }
  }

  function toCanvas(x, y, w, h, cw, ch) {
    const flex = getFlexGeometry()
    const width = w * cw
    const height = h * ch
    const centerX = flex.positionMode === 'fixedCenter'
      ? (cw * 0.5) + ((Number(x) - flex.xOffset) * cw * flex.xScale)
      : (cw * 0.5) + (Number(x) * (cw + width) * 0.5 * flex.xScale)
    const centerY = flex.positionMode === 'fixedCenter'
      ? (ch * 0.5) - ((Number(y) - flex.yOffset) * ch * flex.yScale)
      : (ch * 0.5) - ((Number(y) - flex.yOffset) * (ch + height) * 0.5 * flex.yScale)
    return {
      x: centerX - (width * 0.5),
      y: centerY - (height * 0.5),
      w: width,
      h: height,
    }
  }

  function pipFromCanvasRect(r, cw, ch, POS_RAW_LIMIT, SCALE_RAW_MAX) {
    const flex = getFlexGeometry()
    const cx = r.x + (r.w * 0.5)
    const cy = r.y + (r.h * 0.5)
    const xDen = flex.positionMode === 'fixedCenter'
      ? ((cw * flex.xScale) || 1)
      : ((((cw + r.w) * 0.5) * flex.xScale) || 1)
    const yDen = flex.positionMode === 'fixedCenter'
      ? ((ch * flex.yScale) || 1)
      : ((((ch + r.h) * 0.5) * flex.yScale) || 1)
    const x = flex.positionMode === 'fixedCenter'
      ? (flex.xOffset + ((cx - (cw * 0.5)) / xDen))
      : ((cx - (cw * 0.5)) / xDen)
    const y = flex.yOffset + (((ch * 0.5) - cy) / yDen)
    const w = r.w / cw
    const h = r.h / ch
    return {
      x: Math.max(-POS_RAW_LIMIT, Math.min(POS_RAW_LIMIT, x)),
      y: Math.max(-POS_RAW_LIMIT, Math.min(POS_RAW_LIMIT, y)),
      w: Math.max(0, Math.min(SCALE_RAW_MAX, w)),
      h: Math.max(0, Math.min(SCALE_RAW_MAX, h)),
    }
  }

  function flexFromCanvasRect(r, cw, ch, POS_RAW_LIMIT, SCALE_RAW_MAX) {
    const flex = getFlexGeometry()

    const cx = r.x + (r.w * 0.5)
    const cy = r.y + (r.h * 0.5)
    const w = r.w / cw
    const h = r.h / ch
    const xDen = flex.positionMode === 'fixedCenter'
      ? ((cw * flex.xScale) || 1)
      : ((((cw + r.w) * 0.5) * flex.xScale) || 1)
    const yDen = flex.positionMode === 'fixedCenter'
      ? ((ch * flex.yScale) || 1)
      : ((((ch + r.h) * 0.5) * flex.yScale) || 1)
    const x = flex.positionMode === 'fixedCenter'
      ? (flex.xOffset + ((cx - (cw * 0.5)) / xDen))
      : ((cx - (cw * 0.5)) / xDen)
    const y = flex.yOffset + (((ch * 0.5) - cy) / yDen)
    return {
      x: Math.max(-POS_RAW_LIMIT, Math.min(POS_RAW_LIMIT, x)),
      y: Math.max(-POS_RAW_LIMIT, Math.min(POS_RAW_LIMIT, y)),
      w: Math.max(0, Math.min(SCALE_RAW_MAX, w)),
      h: Math.max(0, Math.min(SCALE_RAW_MAX, h)),
    }
  }

  global.DVIPRuntimeHelpers = {
    setConnState,
    setModelState,
    markEditLock,
    releaseEditLock,
    isEditLocked,
    getPipDefaultWindow,
    getFlexDefaultWindow,
    toCanvas,
    pipFromCanvasRect,
    flexFromCanvasRect,
  }
}(window))
