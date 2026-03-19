const MODEL_REGISTRY = {
  auto: {
    id: 'auto',
    label: 'Auto Detect',
    protocolMode: 'hybrid',
    supports: {
      multiview: true,
      flex: true,
      extendedPipBorder: true,
    },
    hiddenLabelPatterns: [],
    legacyDvip: false,
  },
  se650: {
    id: 'se650',
    label: 'SE-650',
    protocolMode: 'common',
    supports: {
      multiview: false,
      flex: false,
      extendedPipBorder: false,
    },
    hiddenLabelPatterns: [
      '^SWITCHER_KEY[2-4]_',
      '^SWITCHER_DSK2_',
      '^OUTPUT_AUX_CTRL_AUX[1-4]_SRC$',
      '^OUTPUT_HDMI[23]_OUT_SELECT$',
      '^OUTPUT_SDI_OUT2_SELECT$',
    ],
    legacyDvip: false,
  },
  se700: {
    id: 'se700',
    label: 'SE-700',
    protocolMode: 'common',
    supports: {
      multiview: false,
      flex: false,
      extendedPipBorder: false,
    },
    hiddenLabelPatterns: [
      '^SWITCHER_KEY[2-4]_',
      '^SWITCHER_DSK2_',
      '^OUTPUT_AUX_CTRL_AUX[1-4]_SRC$',
      '^OUTPUT_HDMI[23]_OUT_SELECT$',
    ],
    legacyDvip: false,
  },
  se1200mu: {
    id: 'se1200mu',
    label: 'SE-1200MU / HS-1300',
    protocolMode: 'common',
    supports: {
      multiview: false,
      flex: false,
      extendedPipBorder: false,
    },
    hiddenLabelPatterns: [
      '^SWITCHER_KEY[3-4]_',
      '^OUTPUT_AUX_CTRL_AUX[1-4]_SRC$',
      '^OUTPUT_HDMI[23]_OUT_SELECT$',
    ],
    legacyDvip: false,
  },
  se2200: {
    id: 'se2200',
    label: 'SE-2200 / HS-2200',
    protocolMode: 'common',
    supports: {
      multiview: false,
      flex: false,
      extendedPipBorder: false,
    },
    hiddenLabelPatterns: [
      '^SWITCHER_KEY[2-4]_',
      '^SWITCHER_DSK2_',
      '^OUTPUT_AUX_CTRL_AUX[1-4]_SRC$',
      '^OUTPUT_HDMI[23]_OUT_SELECT$',
      '^OUTPUT_SDI_OUT[12]_SELECT$',
    ],
    legacyDvip: true,
  },
  se3200: {
    id: 'se3200',
    label: 'SE-3200 / HS-3200',
    protocolMode: 'hybrid',
    supports: {
      multiview: true,
      flex: true,
      extendedPipBorder: true,
    },
    hiddenLabelPatterns: [],
    legacyDvip: false,
  },
}

function normalizeModelId(raw) {
  const id = String(raw || '').trim().toLowerCase()
  if (MODEL_REGISTRY[id]) return id
  return 'auto'
}

function getModelProfile(raw) {
  const id = normalizeModelId(raw)
  return MODEL_REGISTRY[id]
}

function getModelList() {
  return Object.values(MODEL_REGISTRY).map((x) => ({ id: x.id, label: x.label }))
}

function resolveSectionSources(profile, protocol3200, protocolCommon) {
  if (profile.protocolMode === 'common') {
    return [...(protocolCommon.GET_SET_CMD_COMMON || [])]
  }
  if (profile.protocolMode === 'hybrid') {
    return [
      ...(protocol3200.GET_SET_CMD_3200 || []),
      ...(protocolCommon.GET_SET_CMD_COMMON || []),
    ]
  }
  return [...(protocolCommon.GET_SET_CMD_COMMON || [])]
}

function isControlVisibleForModel(modelProfile, section, control) {
  const label = String(control?.label || '')
  if (!label) return true
  const supports = modelProfile?.supports || {}

  if (supports.flex === false) {
    const sub = Number(section?.subSection || 0)
    if (label.includes('FLEX')) return false
    if (Number(section?.id) === 2 && (sub === 2 || sub === 3)) return false
  }
  if (supports.multiview === false && label.startsWith('OUTPUT_MULTIVIEWER_')) return false
  if (supports.extendedPipBorder === false && label.includes('BORDER_')) return false

  const patterns = Array.isArray(modelProfile?.hiddenLabelPatterns) ? modelProfile.hiddenLabelPatterns : []
  for (const pattern of patterns) {
    try {
      if (new RegExp(pattern).test(label)) return false
    } catch (_) {
      // ignore invalid pattern
    }
  }
  return true
}

module.exports = {
  MODEL_REGISTRY,
  normalizeModelId,
  getModelProfile,
  getModelList,
  resolveSectionSources,
  isControlVisibleForModel,
}

