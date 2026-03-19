(function exposeGeometryHelpers() {
  function getBaseFlexGeometry() {
    if (window.DVIPCanvasGeometry && typeof window.DVIPCanvasGeometry.getBaseFlexGeometry === 'function') {
      return window.DVIPCanvasGeometry.getBaseFlexGeometry()
    }
    return { positionMode: 'fixedCenter', xScale: 1.0075, xOffset: 0, yScale: 1.7857142857, yOffset: 0 }
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n))
  }

  function rawPosToPct(v) {
    const n = Number(v)
    const z = Math.abs(n) < 0.0001 ? 0 : n
    return clamp(z * 100, -100, 100)
  }

  function pctToRawPos(v, maxAbs = 1) {
    return clamp(Number(v) / 100, -maxAbs, maxAbs)
  }

  function rawScaleToPct(v) {
    const n = Number(v)
    const z = Math.abs(n) < 0.0001 ? 0 : n
    return clamp(z * 100, 0, 100)
  }

  function pctToRawScale(v, maxAbs = 1) {
    return clamp(Number(v) / 100, 0, maxAbs)
  }

  function flexToCanvas(x, y, w, h, cw, ch) {
    const ww = w * cw
    const hh = h * ch
    const base = getBaseFlexGeometry()
    const positionMode = String(base.positionMode || 'fixedCenter')
    const xScale = Number(base.xScale || 1.0075)
    const xOffset = Number(base.xOffset || 0)
    const yScale = Number(base.yScale || 1.7857142857)
    const yOffset = Number(base.yOffset || 0)
    const cx = positionMode === 'fixedCenter'
      ? (cw * 0.5) + ((Number(x) - xOffset) * cw * xScale)
      : (cw * 0.5) + (Number(x) * (cw + ww) * 0.5 * xScale)
    const cy = positionMode === 'fixedCenter'
      ? (ch * 0.5) - ((Number(y) - yOffset) * ch * yScale)
      : (ch * 0.5) - ((Number(y) - yOffset) * (ch + hh) * 0.5 * yScale)
    return { x: cx - (ww * 0.5), y: cy - (hh * 0.5), w: ww, h: hh }
  }

  function flexFromCanvasRect(r, cw, ch, posLimit = 1, scaleLimit = 1) {
    const cx = r.x + (r.w * 0.5)
    const cy = r.y + (r.h * 0.5)
    const w = r.w / cw
    const h = r.h / ch
    const base = getBaseFlexGeometry()
    const positionMode = String(base.positionMode || 'fixedCenter')
    const xScale = Number(base.xScale || 1.0075)
    const xOffset = Number(base.xOffset || 0)
    const yScale = Number(base.yScale || 1.7857142857)
    const yOffset = Number(base.yOffset || 0)
    const xDen = positionMode === 'fixedCenter'
      ? ((cw * xScale) || 1)
      : ((((cw + r.w) * 0.5) * xScale) || 1)
    const yDen = positionMode === 'fixedCenter'
      ? ((ch * yScale) || 1)
      : ((((ch + r.h) * 0.5) * yScale) || 1)
    const x = positionMode === 'fixedCenter'
      ? (xOffset + ((cx - (cw * 0.5)) / xDen))
      : ((cx - (cw * 0.5)) / xDen)
    const y = yOffset + (((ch * 0.5) - cy) / yDen)
    return {
      x: clamp(x, -posLimit, posLimit),
      y: clamp(y, -posLimit, posLimit),
      w: clamp(w, 0, scaleLimit),
      h: clamp(h, 0, scaleLimit),
    }
  }

  function getGuidePixelsFromList(guidesList, cw, ch) {
    const vertical = (guidesList?.v || []).map((pct) => (pct / 100) * cw)
    const horizontal = (guidesList?.h || []).map((pct) => (pct / 100) * ch)
    return { vertical, horizontal }
  }

  function snapRectGeneric(left, top, right, bottom, mode, cw, ch, guidesList, snapEnabled, snapDistance) {
    if (!snapEnabled) return { left, top, right, bottom }
    const dist = Math.max(1, Number(snapDistance) || 10)
    const guides = getGuidePixelsFromList(guidesList, cw, ch)
    const centerX = (left + right) * 0.5
    const centerY = (top + bottom) * 0.5

    let dx = 0
    let dy = 0
    let bestX = Number.POSITIVE_INFINITY
    let bestY = Number.POSITIVE_INFINITY

    const xCandidates = mode === 'move' ? [left, centerX, right] : [left, right]
    const yCandidates = mode === 'move' ? [top, centerY, bottom] : [top, bottom]

    for (const gx of guides.vertical) {
      for (const c of xCandidates) {
        const diff = gx - c
        const ad = Math.abs(diff)
        if (ad <= dist && ad < bestX) {
          bestX = ad
          dx = diff
        }
      }
    }
    for (const gy of guides.horizontal) {
      for (const c of yCandidates) {
        const diff = gy - c
        const ad = Math.abs(diff)
        if (ad <= dist && ad < bestY) {
          bestY = ad
          dy = diff
        }
      }
    }

    if (mode === 'move') {
      left += dx
      right += dx
      top += dy
      bottom += dy
    } else {
      if (mode.includes('l')) left += dx
      if (mode.includes('r')) right += dx
      if (mode.includes('t')) top += dy
      if (mode.includes('b')) bottom += dy
    }
    return { left, top, right, bottom }
  }

  window.DVIPShared = {
    clamp,
    rawPosToPct,
    pctToRawPos,
    rawScaleToPct,
    pctToRawScale,
    flexToCanvas,
    flexFromCanvasRect,
    getGuidePixelsFromList,
    snapRectGeneric,
  }
})()
