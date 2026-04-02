const { InstanceBase, InstanceStatus, runEntrypoint, combineRgb } = require('@companion-module/base')

const DEFAULT_BASE_URL = 'http://127.0.0.1:9999'

function normalizeBaseUrl(input) {
  const raw = String(input || '').trim()
  if (!raw) return DEFAULT_BASE_URL
  return raw.replace(/\/+$/, '')
}

function normalizeMode(mode) {
  return String(mode || '').toLowerCase() === 'pip' ? 'pip' : 'flex'
}

function normalizeComparableName(input) {
  // Handle common Cyrillic/Latin lookalike letters used in key names.
  const map = {
    А: 'A', а: 'a',
    В: 'B', в: 'b',
    Е: 'E', е: 'e',
    К: 'K', к: 'k',
    М: 'M', м: 'm',
    Н: 'H', н: 'h',
    О: 'O', о: 'o',
    Р: 'P', р: 'p',
    С: 'C', с: 'c',
    Т: 'T', т: 't',
    Х: 'X', х: 'x',
    У: 'Y', у: 'y',
  }
  return String(input || '')
    .trim()
    .split('')
    .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
    .join('')
    .toLowerCase()
}

function nearlyEqual(a, b, eps = 0.05) {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) <= eps
}

function statesMatch(a, b) {
  if (!a || !b) return false
  if (String(a.bank ?? 1) !== String(b.bank ?? 1)) return false
  if (String(a.bg ?? 0) !== String(b.bg ?? 0)) return false
  if (String(a.fg ?? 0) !== String(b.fg ?? 0)) return false
  if (!!a.fgEnable !== !!b.fgEnable) return false
  if (!Array.isArray(a.windows) || !Array.isArray(b.windows) || a.windows.length !== b.windows.length) return false
  return a.windows.every((wa, i) => {
    const wb = b.windows[i]
    if (!wa || !wb) return false
    return (
      !!wa.en === !!wb.en &&
      String(wa.src ?? 0) === String(wb.src ?? 0) &&
      nearlyEqual(wa.x, wb.x) &&
      nearlyEqual(wa.y, wb.y) &&
      nearlyEqual(wa.s, wb.s) &&
      nearlyEqual(wa.cl, wb.cl) &&
      nearlyEqual(wa.cr, wb.cr) &&
      nearlyEqual(wa.ct, wb.ct) &&
      nearlyEqual(wa.cb, wb.cb)
    )
  })
}

class DvccMergeInstance extends InstanceBase {
  constructor(internal) {
    super(internal)
    this.config = {}
    this.pollTimer = null
    this.activeByMode = { flex: '', pip: '' }
  }

  async init(config) {
    this.config = config || {}
    this.updateActions()
    this.updateFeedbacks()
    this.updatePresets()
    this.updateVariableDefinitions()
    this.startPolling()
  }

  async destroy() {
    this.stopPolling()
  }

  async configUpdated(config) {
    this.config = config || {}
    this.updateActions()
    this.updateFeedbacks()
    this.updatePresets()
    this.startPolling()
  }

  getConfigFields() {
    return [
      {
        type: 'text',
        id: 'info',
        width: 12,
        label: 'Information',
        value: 'This module controls DVCC Merge keys only.',
      },
      {
        type: 'textinput',
        id: 'dvcc_base_url',
        label: 'DVCC API Base URL',
        width: 12,
        default: DEFAULT_BASE_URL,
      },
    ]
  }

  getBaseUrl() {
    return normalizeBaseUrl(this.config?.dvcc_base_url)
  }

  async requestJson(path, opts = {}) {
    const url = `${this.getBaseUrl()}${path}`
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }

  inferActivePresetName(stateObj) {
    const active = String(stateObj?.activePresetName || '').trim()
    if (active) return active
    const current = stateObj?.currentState
    const presets = Array.isArray(stateObj?.presets) ? stateObj.presets : []
    if (!current || !presets.length) return ''
    const hit = presets.find((p) => p && p.state && statesMatch(current, p.state))
    return hit && hit.name ? String(hit.name) : ''
  }

  async pollMode(mode) {
    const data = await this.requestJson(`/api/merge/state?mode=${encodeURIComponent(mode)}`)
    const next = this.inferActivePresetName(data)
    if (this.activeByMode[mode] !== next) {
      this.activeByMode[mode] = next
      this.setVariableValues({ [`active_${mode}`]: next })
      this.checkFeedbacks('dvcc_merge_active')
    }
  }

  async pollOnce() {
    await Promise.all([this.pollMode('flex'), this.pollMode('pip')])
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  startPolling() {
    this.stopPolling()
    this.pollOnce()
      .then(() => this.updateStatus(InstanceStatus.Ok))
      .catch((err) => this.updateStatus(InstanceStatus.UnknownWarning, err.message || 'DVCC unreachable'))

    this.pollTimer = setInterval(() => {
      this.pollOnce()
        .then(() => this.updateStatus(InstanceStatus.Ok))
        .catch((err) => this.updateStatus(InstanceStatus.UnknownWarning, err.message || 'DVCC unreachable'))
    }, 1000)
  }

  async runNamedMergeKey(options) {
    const mode = normalizeMode(options.mode)
    const keyNameRaw = String(options.key_name || '').trim()
    if (!keyNameRaw) {
      this.log('warn', 'DVCC merge run skipped: empty key name')
      return
    }
    let keyName = keyNameRaw

    // Resolve confusable key names by checking existing preset names.
    try {
      const state = await this.requestJson(`/api/merge/state?mode=${encodeURIComponent(mode)}`)
      const presets = Array.isArray(state?.presets) ? state.presets : []
      const exact = presets.find((p) => String(p?.name || '') === keyNameRaw)
      if (exact?.name) {
        keyName = String(exact.name)
      } else {
        const target = normalizeComparableName(keyNameRaw)
        const matches = presets
          .map((p) => String(p?.name || ''))
          .filter((name) => normalizeComparableName(name) === target)
        if (matches.length === 1) keyName = matches[0]
      }
    } catch (_) {
      // Non-fatal: fallback to user input and let backend validate.
    }

    await this.requestJson('/api/merge/run', {
      method: 'POST',
      body: {
        mode,
        preset: keyName,
      },
    })
    await this.pollMode(mode).catch(() => {})
  }

  updateActions() {
    this.setActionDefinitions({
      dvcc_merge_run_named: {
        name: 'Run DVCC Merge Key',
        options: [
          {
            type: 'dropdown',
            id: 'mode',
            label: 'Mode',
            default: 'flex',
            choices: [
              { id: 'flex', label: 'Flex' },
              { id: 'pip', label: 'P-in-P' },
            ],
          },
          {
            type: 'textinput',
            id: 'key_name',
            label: 'Key Name',
            default: 'Key1',
            useVariables: true,
          },
        ],
        callback: async (event) => {
          const key_name = await this.parseVariablesInString(String(event.options.key_name || ''))
          await this.runNamedMergeKey({
            mode: event.options.mode,
            key_name,
          })
        },
      },
    })
  }

  updateFeedbacks() {
    this.setFeedbackDefinitions({
      dvcc_merge_active: {
        type: 'boolean',
        name: 'DVCC Merge Key Active',
        description: 'True when selected DVCC merge key is active.',
        defaultStyle: {
          color: combineRgb(255, 255, 255),
          bgcolor: combineRgb(0, 102, 255),
        },
        options: [
          {
            type: 'dropdown',
            id: 'mode',
            label: 'Mode',
            default: 'flex',
            choices: [
              { id: 'flex', label: 'Flex' },
              { id: 'pip', label: 'P-in-P' },
            ],
          },
          {
            type: 'textinput',
            id: 'key_name',
            label: 'Key Name',
            default: 'Key1',
            useVariables: true,
          },
        ],
        callback: (feedback) => {
          const mode = normalizeMode(feedback.options.mode)
          const keyName = String(feedback.options.key_name || '').trim().toLowerCase()
          if (!keyName) return false
          return String(this.activeByMode[mode] || '').trim().toLowerCase() === keyName
        },
      },
    })
  }

  updatePresets() {
    const mk = (mode, keyName, text) => ({
      type: 'button',
      category: 'dvcc-merge',
      name: `${mode.toUpperCase()} ${keyName}`,
      style: {
        text,
        size: '14',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      steps: [
        {
          down: [
            {
              actionId: 'dvcc_merge_run_named',
              options: { mode, key_name: keyName },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'dvcc_merge_active',
          options: { mode, key_name: keyName },
          style: {
            color: combineRgb(255, 255, 255),
            bgcolor: combineRgb(0, 102, 255),
          },
        },
      ],
    })

    this.setPresetDefinitions({
      flex_key1: mk('flex', 'Key1', 'Key1'),
      flex_key2: mk('flex', 'Key2', 'Key2'),
      pip_key1: mk('pip', 'Key1', 'PIP K1'),
      pip_key2: mk('pip', 'Key2', 'PIP K2'),
    })
  }

  updateVariableDefinitions() {
    this.setVariableDefinitions([
      { variableId: 'active_flex', name: 'Active Flex Merge Key' },
      { variableId: 'active_pip', name: 'Active PIP Merge Key' },
    ])
    this.setVariableValues({ active_flex: '', active_pip: '' })
  }
}

runEntrypoint(DvccMergeInstance, [])
