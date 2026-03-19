const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

const ALLOWED = new Set(['protocol', 'choices', 'manual', 'inferred'])

function run() {
  const modelIds = ['se3200', 'se2200', 'se1200mu', 'se700', 'se650']
  for (const modelId of modelIds) {
    const boot = initModelBootstrap({ requestedModelId: modelId })
    const missing = []
    const invalid = []
    for (const control of boot.catalog.byLabel.values()) {
      const values = Array.isArray(control?.values) ? control.values : []
      if (values.length === 0) continue
      const src = String(control?.enumSource || '')
      if (!src) {
        missing.push(String(control?.label || ''))
        continue
      }
      if (!ALLOWED.has(src)) invalid.push(`${String(control?.label || '')}:${src}`)
    }
    assert.strictEqual(missing.length, 0, `${modelId}: byLabel enum controls missing enumSource: ${missing.join(', ')}`)
    assert.strictEqual(invalid.length, 0, `${modelId}: byLabel enum controls with invalid enumSource: ${invalid.join(', ')}`)
  }
}

run()
console.log('bylabel-enum-source-coverage test passed')
