const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

function loadHelpers(windowObj) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'runtime-helpers.js'), 'utf8')
  const sandbox = { window: windowObj, console }
  vm.runInNewContext(code, sandbox, { filename: 'runtime-helpers.js' })
  return sandbox.window.DVIPRuntimeHelpers
}

function createById(modelStateEl, modelCapsEl, modelHiddenEl) {
  return (id) => {
    if (id === 'modelState') return modelStateEl
    if (id === 'modelCapabilities') return modelCapsEl
    if (id === 'modelHiddenControls') return modelHiddenEl
    return null
  }
}

function run() {
  const windowObj = {
    DVIPI18n: {
      t(key, vars = {}) {
        if (key === 'model.na') return 'Model: n/a'
        if (key === 'model.simple') return `Model: ${vars.detected}`
        if (key === 'model.requested') return `Model: ${vars.detected} (requested ${vars.requested})`
        if (key === 'model.note.legacy') return 'legacy DVIP'
        if (key === 'model.note.filtered') return 'filtered profile'
        if (key === 'model.note.noFlex') return 'no Flex'
        if (key === 'model.note.noMultiview') return 'no Multiview'
        if (key === 'model.note.noExtBorder') return 'no ext border'
        if (key === 'model.limitsLabel') return 'Limits'
        if (key === 'model.limit.flex') return 'Flex'
        if (key === 'model.limit.multiview') return 'Multiview'
        if (key === 'model.limit.extBorder') return 'Extended border'
        if (key === 'model.hiddenControls') return `Hidden controls: ${vars.count}`
        return key
      },
    },
    DVIPModelCapabilitiesUi: {
      isRawControlVisible(_state, _section, control) {
        return String(control?.label || '') !== 'HIDDEN_CTRL'
      },
    },
  }
  const helpers = loadHelpers(windowObj)
  assert(helpers && typeof helpers.setModelState === 'function', 'setModelState should exist')

  const el1 = { textContent: '' }
  const caps1 = { textContent: '', style: {} }
  const hidden1 = { textContent: '', style: {} }
  helpers.setModelState({}, createById(el1, caps1, hidden1))
  assert.strictEqual(el1.textContent, 'Model: n/a')
  assert.strictEqual(caps1.style.display, 'none', 'caps badge should be hidden when model is n/a')
  assert.strictEqual(hidden1.style.display, 'none', 'hidden-controls badge should be hidden when model is n/a')

  const el2 = { textContent: '' }
  const caps2 = { textContent: '', style: {} }
  const hidden2 = { textContent: '', style: {} }
  helpers.setModelState({
    catalog: {
      sections: [
        { id: 1, controls: [{ label: 'VISIBLE_CTRL' }, { label: 'HIDDEN_CTRL' }] },
      ],
    },
    modelSelection: {
      detected: {
        id: 'se2200',
        label: 'SE-2200',
        legacyDvip: true,
        hiddenLabelPatterns: ['^A_'],
        supports: { flex: false, multiview: false, extendedPipBorder: false },
      },
    },
  }, createById(el2, caps2, hidden2))
  assert(el2.textContent.includes('Model: SE-2200'), 'should include detected model label')
  assert(el2.textContent.includes('legacy DVIP'), 'should include legacy note')
  assert(el2.textContent.includes('filtered profile'), 'should include filtered profile note')
  assert(el2.textContent.includes('no Flex'), 'should include no Flex note')
  assert(el2.textContent.includes('no Multiview'), 'should include no Multiview note')
  assert(el2.textContent.includes('no ext border'), 'should include no ext border note')
  assert.strictEqual(caps2.style.display, 'inline-block', 'caps badge should be visible for disabled features')
  assert(caps2.textContent.includes('Limits:'), 'caps badge should include Limits prefix')
  assert(caps2.textContent.includes('Flex'), 'caps badge should include Flex')
  assert(caps2.textContent.includes('Multiview'), 'caps badge should include Multiview')
  assert(caps2.textContent.includes('Extended border'), 'caps badge should include Extended border')
  assert.strictEqual(hidden2.style.display, 'inline-block', 'hidden-controls badge should be visible when hidden controls exist')
  assert.strictEqual(hidden2.textContent, 'Hidden controls: 1', 'hidden-controls badge should show hidden control count')

  const el3 = { textContent: '' }
  const caps3 = { textContent: '', style: {} }
  const hidden3 = { textContent: '', style: {} }
  helpers.setModelState({
    catalog: {
      sections: [{ id: 1, controls: [{ label: 'VISIBLE_CTRL' }] }],
    },
    modelSelection: {
      requested: { id: 'auto', label: 'Auto Detect' },
      detected: { id: 'se700', label: 'SE-700', supports: { flex: false } },
    },
  }, createById(el3, caps3, hidden3))
  assert(el3.textContent.includes('requested Auto Detect'), 'should include requested model in text')
  assert.strictEqual(caps3.style.display, 'inline-block', 'caps badge should be visible when at least one feature is disabled')
  assert(caps3.textContent.includes('Flex'), 'caps badge should include Flex for se700 sample')
  assert.strictEqual(hidden3.style.display, 'none', 'hidden-controls badge should be hidden when no hidden controls exist')
}

run()
console.log('runtime-model-state test passed')
