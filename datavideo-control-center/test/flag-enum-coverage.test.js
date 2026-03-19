const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function run() {
  const modelIds = ['se3200', 'se2200', 'se1200mu', 'se700', 'se650']
  for (const modelId of modelIds) {
    const boot = initModelBootstrap({ requestedModelId: modelId })
    const missing = []
    for (const control of boot.catalog.byLabel.values()) {
      const type = String(control?.type || '').toLowerCase()
      if (type !== 'flag') continue
      const values = Array.isArray(control.values) ? control.values : []
      if (values.length === 0) missing.push(String(control.label || ''))
    }
    assert.strictEqual(
      missing.length,
      0,
      `${modelId}: all flag controls should have enum values, missing: ${missing.join(', ')}`,
    )
  }
}

run()
console.log('flag-enum-coverage test passed')
