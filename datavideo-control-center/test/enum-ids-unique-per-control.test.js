const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function run() {
  const modelIds = ['se3200', 'se2200', 'se1200mu', 'se700', 'se650']
  for (const modelId of modelIds) {
    const boot = initModelBootstrap({ requestedModelId: modelId })
    const dupByLabel = []
    for (const control of boot.catalog.byLabel.values()) {
      const values = Array.isArray(control?.values) ? control.values : []
      if (values.length === 0) continue
      const seen = new Set()
      for (const option of values) {
        const key = String(option?.id)
        if (seen.has(key)) {
          dupByLabel.push(String(control?.label || ''))
          break
        }
        seen.add(key)
      }
    }
    assert.strictEqual(
      dupByLabel.length,
      0,
      `${modelId}: duplicate enum ids found in byLabel controls: ${dupByLabel.join(', ')}`,
    )
  }
}

run()
console.log('enum-ids-unique-per-control test passed')
