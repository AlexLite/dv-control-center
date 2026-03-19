const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function run() {
  const modelIds = ['se3200', 'se2200', 'se1200mu', 'se700', 'se650']
  for (const modelId of modelIds) {
    const boot = initModelBootstrap({ requestedModelId: modelId })
    const mismatches = []
    for (const section of boot.catalog.sections || []) {
      for (const control of section.controls || []) {
        if (!Array.isArray(control.values) || control.values.length === 0) continue
        const byLabel = boot.catalog.byLabel.get(control.label)
        if (!byLabel || !Array.isArray(byLabel.values) || byLabel.values.length === 0) continue
        const sectionSrc = String(control.enumSource || '')
        const labelSrc = String(byLabel.enumSource || '')
        if (sectionSrc !== labelSrc) {
          mismatches.push(`${control.label}:${sectionSrc}!=${labelSrc}`)
        }
      }
    }
    assert.strictEqual(
      mismatches.length,
      0,
      `${modelId}: section/byLabel enumSource mismatch: ${mismatches.join(', ')}`,
    )
  }
}

run()
console.log('enum-source-alignment test passed')
