const fs = require('fs')
const path = require('path')

const FLEX_BASE = { 1: 0, 2: 37, 3: 74, 4: 111 }
// Keep identical to Flex Studio (public/app.js flexControlId)
const FLEX_MAP = { en: 0, x: 1, y: 2, w: 7, h: 7, cl: 9, cr: 10, ct: 11, cb: 12 }
const PIP_MAP = { en: 0, x: 1, y: 2, w: 5, h: 6, cl: 9, cr: 10, ct: 11, cb: 12, bs: 14, bo: 15, bw: 16, bh: 22, bsa: 23, bl: 24 }
const WINDOW_COUNT = 4
const FLEX_NUMERIC_KEYS = ['x', 'y', 's', 'cl', 'cr', 'ct', 'cb']
const PIP_NUMERIC_KEYS = ['x', 'y', 's', 'cl', 'cr', 'ct', 'cb', 'bs', 'bo', 'bw', 'bh', 'bsa', 'bl']

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function ease(kind, t) {
  const x = clamp(t, 0, 1)
  if (kind === 'EaseIn') return x * x
  if (kind === 'EaseOut') return 1 - (1 - x) * (1 - x)
  if (kind === 'EaseEase') return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
  return x
}

function modeKey(mode) {
  return String(mode || '').toLowerCase() === 'pip' ? 'pip' : 'flex'
}

function defaultWindow(mode, index) {
  const kind = modeKey(mode)
  const quad = {
    1: { x: -1, y: 1 },
    2: { x: 1, y: 1 },
    3: { x: -1, y: -1 },
    4: { x: 1, y: -1 },
  }[index] || { x: 0, y: 0 }

  if (kind === 'pip') {
    return {
      en: true,
      src: 0,
      x: quad.x,
      y: quad.y,
      s: 0.96,
      cl: 0,
      cr: 0,
      ct: 0,
      cb: 0,
      bs: 1,
      bo: 100,
      bw: 2,
      bh: 60,
      bsa: 80,
      bl: 100,
    }
  }

  return {
    en: true,
    src: 0,
    x: quad.x,
    y: quad.y,
    s: 0.48,
    cl: 0,
    cr: 0,
    ct: 0,
    cb: 0,
  }
}

function defaultState(mode = 'flex') {
  const kind = modeKey(mode)
  const base = {
    windows: Array.from({ length: WINDOW_COUNT }, (_, n) => defaultWindow(kind, n + 1)),
  }

  if (kind === 'pip') return base

  return {
    bank: 1,
    bg: 0,
    fg: 0,
    fgEnable: false,
    windows: base.windows,
  }
}

function normalizeScale(input) {
  let scale = Number(input)
  if (Number.isFinite(scale) && scale > 1) scale = scale / 100
  return clamp(scale, 0, 1)
}

function normalizeCrop(input) {
  let value = Number(input)
  if (Number.isFinite(value) && value >= 0 && value <= 1) value = value * 100
  return clamp(value, 0, 100)
}

function normalizeWindow(mode, input, index) {
  const kind = modeKey(mode)
  const defaults = defaultWindow(kind, index)
  const src = Number(input?.src ?? defaults.src)

  const out = {
    en: !!input?.en,
    src: Number.isFinite(src) ? src : defaults.src,
    x: clamp(Number(input?.x ?? defaults.x), -1, 1),
    y: clamp(Number(input?.y ?? defaults.y), -1, 1),
    s: normalizeScale(input?.s ?? defaults.s),
    cl: normalizeCrop(input?.cl ?? defaults.cl),
    cr: normalizeCrop(input?.cr ?? defaults.cr),
    ct: normalizeCrop(input?.ct ?? defaults.ct),
    cb: normalizeCrop(input?.cb ?? defaults.cb),
  }

  if (kind === 'pip') {
    out.bs = clamp(Number(input?.bs ?? defaults.bs), 0, 20)
    out.bo = clamp(Number(input?.bo ?? defaults.bo), 0, 100)
    out.bw = clamp(Number(input?.bw ?? defaults.bw), 0, 100)
    out.bh = clamp(Number(input?.bh ?? defaults.bh), 0, 360)
    out.bsa = clamp(Number(input?.bsa ?? defaults.bsa), 0, 100)
    out.bl = clamp(Number(input?.bl ?? defaults.bl), 0, 100)
  }

  return out
}

function normalizeState(input, mode = 'flex') {
  const kind = modeKey(mode)
  const src = input && typeof input === 'object' ? input : {}
  const base = defaultState(kind)

  const common = {
    windows: Array.from({ length: WINDOW_COUNT }, (_, n) => normalizeWindow(kind, src.windows?.[n], n + 1)),
  }

  if (kind === 'pip') return common

  const bank = Number(src.bank ?? base.bank)
  const bg = Number(src.bg ?? base.bg)
  const fg = Number(src.fg ?? base.fg)

  return {
    bank: bank === 2 ? 2 : 1,
    bg: Number.isFinite(bg) ? bg : base.bg,
    fg: Number.isFinite(fg) ? fg : base.fg,
    fgEnable: !!src.fgEnable,
    windows: common.windows,
  }
}

class MergeEngine {
  constructor({ client, catalog, storagePath }) {
    this.client = client
    this.catalog = catalog
    this.storagePath = storagePath || path.join(process.cwd(), 'data', 'merge-presets.json')

    this.modeStates = {
      flex: this.createModeState('flex'),
      pip: this.createModeState('pip'),
    }

    Object.defineProperty(this, 'presets', {
      enumerable: true,
      configurable: true,
      get: () => this.modeStates.flex.presets,
      set: (value) => { this.modeStates.flex.presets = value || {} },
    })
    Object.defineProperty(this, 'currentState', {
      enumerable: true,
      configurable: true,
      get: () => this.modeStates.flex.currentState,
      set: (value) => { this.modeStates.flex.currentState = normalizeState(value, 'flex') },
    })
    Object.defineProperty(this, 'running', {
      enumerable: true,
      configurable: true,
      get: () => this.modeStates.flex.running,
      set: (value) => { this.modeStates.flex.running = value },
    })
    Object.defineProperty(this, 'lastTickState', {
      enumerable: true,
      configurable: true,
      get: () => this.modeStates.flex.lastTickState,
      set: (value) => { this.modeStates.flex.lastTickState = value ? normalizeState(value, 'flex') : null },
    })

    this.load()
  }

  createModeState(mode) {
    const kind = modeKey(mode)
    return {
      presets: {},
      currentState: defaultState(kind),
      running: null,
      lastTickState: null,
      activePresetName: null,
    }
  }

  ctx(mode = 'flex') {
    return this.modeStates[modeKey(mode)]
  }

  load() {
    this.modeStates.flex.presets = {}
    this.modeStates.pip.presets = {}

    try {
      if (!fs.existsSync(this.storagePath)) return
      const raw = fs.readFileSync(this.storagePath, 'utf8')
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return

      const hasModes = parsed.flex || parsed.pip
      if (hasModes) {
        for (const mode of ['flex', 'pip']) {
          const node = parsed[mode]
          if (!node || typeof node !== 'object') continue
          const next = {}
          for (const [name, state] of Object.entries(node)) {
            next[name] = normalizeState(state, mode)
          }
          this.modeStates[mode].presets = next
        }
      } else {
        // Backward compatibility: old flat preset map = flex presets.
        const next = {}
        for (const [name, state] of Object.entries(parsed)) {
          next[name] = normalizeState(state, 'flex')
        }
        this.modeStates.flex.presets = next
      }
    } catch (_) {
      this.modeStates.flex.presets = {}
      this.modeStates.pip.presets = {}
    }
  }

  save() {
    const dir = path.dirname(this.storagePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const payload = {
      flex: this.modeStates.flex.presets,
      pip: this.modeStates.pip.presets,
    }
    fs.writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), 'utf8')
  }

  getPublicState(mode = 'flex') {
    const kind = modeKey(mode)
    const ctx = this.ctx(kind)
    return {
      mode: kind,
      running: !!ctx.running,
      activePresetName: ctx.activePresetName || null,
      runningPresetName: ctx.running?.presetName || null,
      currentState: ctx.currentState,
      presets: Object.keys(ctx.presets).sort().map((name) => ({ name, state: ctx.presets[name] })),
    }
  }

  flexControlId(index, field) {
    return (FLEX_BASE[index] || 0) + FLEX_MAP[field]
  }

  pipControlId(index, field) {
    return (FLEX_BASE[index] || 0) + PIP_MAP[field]
  }

  rawControl(mode, controlId, type, bankOrState = 1) {
    const kind = modeKey(mode)
    const subSectionId = kind === 'flex'
      ? ((Number(bankOrState) === 2) ? 3 : 2)
      : 1

    return { sectionId: 2, subSectionId, controlId, type, label: `2:${subSectionId}:${controlId}` }
  }

  sendRaw(mode, controlId, type, value, bankOrState = 1) {
    this.client.sendSet(this.rawControl(mode, controlId, type, bankOrState), value)
  }

  sendLabel(label, value) {
    const control = this.catalog.byLabel.get(label)
    if (!control) return
    this.client.sendSet(control, value)
  }

  applySources(mode, state, force = false, prevState = null) {
    const kind = modeKey(mode)

    if (kind === 'flex') {
      if (force || !prevState || prevState.bg !== state.bg) this.sendLabel('SWITCHER_FLEX_SRC_BGND_SRC', state.bg)
      if (force || !prevState || prevState.fg !== state.fg) this.sendLabel('SWITCHER_FLEX_SRC_FGND_SRC', state.fg)
      if (force || !prevState || prevState.fgEnable !== state.fgEnable) this.sendLabel('SWITCHER_FLEX_SRC_FGND_ENABLE', state.fgEnable ? 1 : 0)
      for (let i = 1; i <= WINDOW_COUNT; i += 1) {
        const cur = state.windows[i - 1]
        const prev = prevState?.windows?.[i - 1]
        if (force || !prev || prev.src !== cur.src) this.sendLabel(`SWITCHER_FLEX_SRC_DVE${i}_SRC`, cur.src)
      }
      return
    }

    for (let i = 1; i <= WINDOW_COUNT; i += 1) {
      const cur = state.windows[i - 1]
      const prev = prevState?.windows?.[i - 1]
      if (force || !prev || prev.src !== cur.src) this.sendLabel(`SWITCHER_KEY${i}_KEY_SRC`, cur.src)
    }
  }

  applyWindows(mode, state, prevState = null, force = false) {
    const kind = modeKey(mode)

    if (kind === 'flex') {
      const bank = Number(state?.bank) === 2 ? 2 : 1
      const prevBank = Number(prevState?.bank) === 2 ? 2 : 1
      const sameBank = bank === prevBank
      for (let i = 1; i <= WINDOW_COUNT; i += 1) {
        const cur = state.windows[i - 1]
        const prev = sameBank ? prevState?.windows?.[i - 1] : null

        if (force || !prev || prev.en !== cur.en) this.sendRaw('flex', this.flexControlId(i, 'en'), 'flag', cur.en ? 1 : 0, bank)
        if (force || !prev || Math.abs(prev.x - cur.x) > 0.0001) this.sendRaw('flex', this.flexControlId(i, 'x'), 'float', cur.x, bank)
        if (force || !prev || Math.abs(prev.y - cur.y) > 0.0001) this.sendRaw('flex', this.flexControlId(i, 'y'), 'float', cur.y, bank)
        if (force || !prev || Math.abs(prev.cl - cur.cl) > 0.0001) this.sendRaw('flex', this.flexControlId(i, 'cl'), 'float', cur.cl, bank)
        if (force || !prev || Math.abs(prev.cr - cur.cr) > 0.0001) this.sendRaw('flex', this.flexControlId(i, 'cr'), 'float', cur.cr, bank)
        if (force || !prev || Math.abs(prev.ct - cur.ct) > 0.0001) this.sendRaw('flex', this.flexControlId(i, 'ct'), 'float', cur.ct, bank)
        if (force || !prev || Math.abs(prev.cb - cur.cb) > 0.0001) this.sendRaw('flex', this.flexControlId(i, 'cb'), 'float', cur.cb, bank)
        if (force || !prev || Math.abs(prev.s - cur.s) > 0.0001) {
          this.sendRaw('flex', this.flexControlId(i, 'w'), 'float', cur.s, bank)
          this.sendRaw('flex', this.flexControlId(i, 'h'), 'float', cur.s, bank)
        }
      }
      return
    }

    for (let i = 1; i <= WINDOW_COUNT; i += 1) {
      const cur = state.windows[i - 1]
      const prev = prevState?.windows?.[i - 1]

      if (force || !prev || prev.en !== cur.en) this.sendRaw('pip', this.pipControlId(i, 'en'), 'flag', cur.en ? 1 : 0)
      if (force || !prev || Math.abs(prev.x - cur.x) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'x'), 'float', cur.x)
      if (force || !prev || Math.abs(prev.y - cur.y) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'y'), 'float', cur.y)
      if (force || !prev || Math.abs(prev.cl - cur.cl) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'cl'), 'float', cur.cl)
      if (force || !prev || Math.abs(prev.cr - cur.cr) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'cr'), 'float', cur.cr)
      if (force || !prev || Math.abs(prev.ct - cur.ct) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'ct'), 'float', cur.ct)
      if (force || !prev || Math.abs(prev.cb - cur.cb) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'cb'), 'float', cur.cb)
      if (force || !prev || Math.abs(prev.s - cur.s) > 0.0001) {
        this.sendRaw('pip', this.pipControlId(i, 'w'), 'float', cur.s)
        this.sendRaw('pip', this.pipControlId(i, 'h'), 'float', cur.s)
      }
      if (force || !prev || Math.abs(prev.bs - cur.bs) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'bs'), 'int', cur.bs)
      if (force || !prev || Math.abs(prev.bo - cur.bo) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'bo'), 'float', cur.bo)
      if (force || !prev || Math.abs(prev.bw - cur.bw) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'bw'), 'float', cur.bw)
      if (force || !prev || Math.abs(prev.bh - cur.bh) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'bh'), 'float', cur.bh)
      if (force || !prev || Math.abs(prev.bsa - cur.bsa) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'bsa'), 'float', cur.bsa)
      if (force || !prev || Math.abs(prev.bl - cur.bl) > 0.0001) this.sendRaw('pip', this.pipControlId(i, 'bl'), 'float', cur.bl)
    }
  }

  applyState(inputState, mode = 'flex') {
    if (!this.client.connection.connected) throw new Error('Not connected')
    const kind = modeKey(mode)
    const ctx = this.ctx(kind)
    const next = normalizeState(inputState, kind)
    this.applySources(kind, next, true)
    this.applyWindows(kind, next, null, true)
    ctx.currentState = next
    ctx.lastTickState = next
    ctx.activePresetName = null
    return ctx.currentState
  }

  savePreset(name, inputState, mode = 'flex') {
    const clean = String(name || '').trim()
    if (!clean) throw new Error('Preset name required')
    const kind = modeKey(mode)
    const ctx = this.ctx(kind)
    const next = normalizeState(inputState || ctx.currentState, kind)
    ctx.presets[clean] = next
    this.save()
    return { name: clean, state: next }
  }

  deletePreset(name, mode = 'flex') {
    const clean = String(name || '').trim()
    const kind = modeKey(mode)
    const ctx = this.ctx(kind)
    if (!clean || !ctx.presets[clean]) throw new Error('Preset not found')
    delete ctx.presets[clean]
    if (ctx.activePresetName === clean) ctx.activePresetName = null
    this.save()
  }

  stop(mode = 'flex') {
    const kind = modeKey(mode)
    const ctx = this.ctx(kind)
    if (ctx.running) {
      ctx.running.cancelled = true
      if (ctx.running.timer) clearTimeout(ctx.running.timer)
    }
    ctx.running = null
  }

  interpolateWindow(mode, from, to, k, isFinal) {
    const kind = modeKey(mode)
    const out = { ...from }
    const keys = kind === 'pip' ? PIP_NUMERIC_KEYS : FLEX_NUMERIC_KEYS
    for (const key of keys) {
      out[key] = from[key] + (to[key] - from[key]) * k
    }
    out.src = k < 0.5 ? from.src : to.src
    if (to.en && !from.en) out.en = true
    else if (!to.en && from.en) out.en = isFinal ? false : true
    else out.en = to.en
    return out
  }

  runToPreset(name, opts = {}, mode = 'flex') {
    const kind = modeKey(mode)
    const ctx = this.ctx(kind)
    const preset = ctx.presets[name]
    if (!preset) throw new Error('Preset not found')
    const result = this.runToState(preset, opts, kind, name)
    ctx.activePresetName = name
    return result
  }

  runToState(inputTarget, opts = {}, mode = 'flex', presetName = null) {
    if (!this.client.connection.connected) throw new Error('Not connected')

    const kind = modeKey(mode)
    const ctx = this.ctx(kind)
    const target = normalizeState(inputTarget, kind)
    const durationMs = clamp(Number(opts.durationMs || 1200), 50, 120000)
    const fps = clamp(Number(opts.fps || 25), 2, 50)
    const easing = ['Linear', 'EaseEase', 'EaseIn', 'EaseOut'].includes(opts.easing) ? opts.easing : 'EaseEase'

    this.stop(kind)

    const from = normalizeState(ctx.currentState, kind)
    const stepMs = Math.max(20, Math.round(1000 / fps))
    const start = Date.now()

    this.applySources(kind, target, true, from)

    const tick = () => {
      if (!ctx.running || ctx.running.cancelled) return
      const now = Date.now()
      const t = clamp((now - start) / durationMs, 0, 1)
      const k = ease(easing, t)
      const isFinal = t >= 1

      const state = kind === 'flex'
        ? {
          bank: target.bank,
          bg: target.bg,
          fg: target.fg,
          fgEnable: target.fgEnable,
          windows: Array.from({ length: WINDOW_COUNT }, (_, n) => this.interpolateWindow(kind, from.windows[n], target.windows[n], k, isFinal)),
        }
        : {
          windows: Array.from({ length: WINDOW_COUNT }, (_, n) => this.interpolateWindow(kind, from.windows[n], target.windows[n], k, isFinal)),
        }

      try {
        this.applyWindows(kind, state, ctx.lastTickState, isFinal)
        ctx.lastTickState = state
        ctx.currentState = state
      } catch (_) {
        this.stop(kind)
        return
      }

      if (isFinal) {
        this.stop(kind)
        return
      }
      if (ctx.running && !ctx.running.cancelled) {
        ctx.running.timer = setTimeout(tick, stepMs)
      }
    }

    ctx.running = {
      from,
      target,
      presetName: presetName ? String(presetName) : null,
      durationMs,
      fps,
      easing,
      startedAt: start,
      timer: null,
      cancelled: false,
    }

    tick()
    return {
      ok: true,
      durationMs,
      fps,
      easing,
    }
  }
}

module.exports = {
  MergeEngine,
  normalizeState,
}