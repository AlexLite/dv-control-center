const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function labelsFor(control) {
  return (control?.values || []).map((x) => String(x.label))
}

function run() {
  const se3200 = initModelBootstrap({ requestedModelId: 'se3200' }).catalog.byLabel.get('AUDIO_SOURCE')
  const se1200 = initModelBootstrap({ requestedModelId: 'se1200mu' }).catalog.byLabel.get('AUDIO_SOURCE')
  const se2200 = initModelBootstrap({ requestedModelId: 'se2200' }).catalog.byLabel.get('AUDIO_SOURCE')

  assert(se3200 && Array.isArray(se3200.values) && se3200.values.length > 0, 'se3200 should expose AUDIO_SOURCE choices')
  assert(se1200 && Array.isArray(se1200.values) && se1200.values.length > 0, 'se1200mu should expose AUDIO_SOURCE choices')
  assert(se2200 && Array.isArray(se2200.values) && se2200.values.length > 0, 'se2200 should expose AUDIO_SOURCE choices')

  const l3200 = labelsFor(se3200)
  const l1200 = labelsFor(se1200)
  const l2200 = labelsFor(se2200)

  assert(l3200.includes('In 12'), 'se3200 AUDIO_SOURCE should include In 12')
  assert(!l1200.includes('In 12'), 'se1200mu AUDIO_SOURCE should not include In 12')
  assert(l1200.includes('In 6'), 'se1200mu AUDIO_SOURCE should include In 6')
  assert(!l2200.includes('In 1'), 'se2200 AUDIO_SOURCE should not include In 1')
  assert(l2200.includes('Fixed'), 'se2200 AUDIO_SOURCE should include Fixed')
  assert(l2200.includes('Follow'), 'se2200 AUDIO_SOURCE should include Follow')

  assert.strictEqual(se1200.enumSource, 'choices', 'se1200mu AUDIO_SOURCE should be choices enum source')
  assert.strictEqual(se2200.enumSource, 'choices', 'se2200 AUDIO_SOURCE should be choices enum source')
}

run()
console.log('model-specific-source-choices test passed')
