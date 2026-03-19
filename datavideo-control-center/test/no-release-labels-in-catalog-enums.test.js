const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function run() {
  const modelIds = ['se3200', 'se2200', 'se1200mu', 'se700', 'se650']
  for (const modelId of modelIds) {
    const boot = initModelBootstrap({ requestedModelId: modelId })
    const bad = []
    for (const control of boot.catalog.byLabel.values()) {
      const values = Array.isArray(control?.values) ? control.values : []
      for (const opt of values) {
        const label = String(opt?.label || '')
        if (/\[release\]/i.test(label)) {
          bad.push(`${String(control.label)} => ${label}`)
        }
      }
    }
    assert.strictEqual(
      bad.length,
      0,
      `${modelId}: catalog should not include [Release] enum labels; found: ${bad.join('; ')}`,
    )
  }
}

run()
console.log('no-release-labels-in-catalog-enums test passed')
