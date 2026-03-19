const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function labelsFor(control) {
  return (control?.values || []).map((x) => String(x.label))
}

function run() {
  const se2200 = initModelBootstrap({ requestedModelId: 'se2200' }).catalog.byLabel.get('SWITCHER_WIPE_PATTERN_NUM')
  const se3200 = initModelBootstrap({ requestedModelId: 'se3200' }).catalog.byLabel.get('SWITCHER_WIPE_PATTERN_NUM')

  assert(se2200, 'se2200 should include SWITCHER_WIPE_PATTERN_NUM control')
  assert(Array.isArray(se2200.values) && se2200.values.length > 0, 'se2200 wipe pattern should have enum values')
  assert.strictEqual(se2200.enumSource, 'choices', 'se2200 wipe pattern should be choices enum source')
  const labels2200 = labelsFor(se2200)
  assert(labels2200.includes('Wipe 1'), 'se2200 wipe pattern should include Wipe 1')
  assert(labels2200.includes('BDR'), 'se2200 wipe pattern should include BDR')

  assert(se3200, 'se3200 should include SWITCHER_WIPE_PATTERN_NUM control')
  const len3200 = Array.isArray(se3200.values) ? se3200.values.length : 0
  assert.strictEqual(len3200, 0, 'se3200 wipe pattern should stay numeric (no forced enum values)')
}

run()
console.log('model-specific-wipe-pattern test passed')
