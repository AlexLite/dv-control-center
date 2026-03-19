const assert = require('assert')
const path = require('path')

const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')
const { MODEL_REGISTRY } = require('../lib/model-registry')

const ALLOWED = new Set(['protocol', 'choices', 'manual', 'inferred'])

function runCatalogCheck() {
  const ids = Object.keys(MODEL_REGISTRY).filter((id) => id !== 'auto')
  for (const id of ids) {
    const boot = initModelBootstrap({ requestedModelId: id })
    for (const section of (boot.catalog.sections || [])) {
      for (const control of (section.controls || [])) {
        if (!Array.isArray(control.values) || control.values.length === 0) continue
        const src = String(control.enumSource || '')
        assert(ALLOWED.has(src), `${id}:${control.label} has invalid enumSource=${src}`)
      }
    }
  }
}

function runMatrixCheck() {
  const matrix = require(path.join(__dirname, '..', 'data', 'model-control-matrix.json'))
  for (const [id, m] of Object.entries(matrix || {})) {
    for (const [label, srcRaw] of Object.entries(m.enumSources || {})) {
      const src = String(srcRaw || '')
      assert(ALLOWED.has(src), `matrix ${id}:${label} has invalid enumSource=${src}`)
    }
    for (const key of Object.keys(m.enumSourceCounts || {})) {
      assert(ALLOWED.has(String(key)), `matrix ${id} enumSourceCounts has invalid key=${key}`)
    }
  }
}

runCatalogCheck()
runMatrixCheck()
console.log('enum-source-domain test passed')
