const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function run() {
  const modelIds = ['se3200', 'se2200', 'se1200mu', 'se700', 'se650']
  for (const modelId of modelIds) {
    const boot = initModelBootstrap({ requestedModelId: modelId })
    const missing = []
    for (const control of boot.catalog.byLabel.values()) {
      const type = String(control?.type || '').toLowerCase()
      const label = String(control?.label || '')
      if (type !== 'int') continue
      if (!/(?:_ENABLE|_ON|_INVERT)$/.test(label)) continue
      if (Array.isArray(control.values) && control.values.length > 0) continue
      missing.push(label)
    }
    assert.strictEqual(
      missing.length,
      0,
      `${modelId}: all boolean-like int controls should have enum values, missing: ${missing.join(', ')}`,
    )
  }
}

run()
console.log('int-boolean-enum-coverage test passed')
