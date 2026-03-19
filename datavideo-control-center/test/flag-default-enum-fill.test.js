const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function assertOffOn(control, label) {
  assert(control, `${label} should exist in catalog`)
  assert(Array.isArray(control.values), `${label} should have enum values`)
  assert.deepStrictEqual(
    control.values.map((x) => ({ id: Number(x.id), label: String(x.label) })),
    [{ id: 0, label: 'OFF' }, { id: 1, label: 'ON' }],
    `${label} should map to OFF/ON`,
  )
  assert.strictEqual(control.enumSource, 'manual', `${label} should use manual enum source`)
}

function assertPreserved(control, label, expected) {
  assert(control, `${label} should exist in catalog`)
  assert(Array.isArray(control.values), `${label} should have enum values`)
  assert.deepStrictEqual(
    control.values.map((x) => String(x.label)),
    expected,
    `${label} should preserve existing enum labels`,
  )
}

function run() {
  const boot = initModelBootstrap({ requestedModelId: 'se3200' })
  assertOffOn(boot.catalog.byLabel.get('SWITCHER_TRANS_BGND'), 'SWITCHER_TRANS_BGND')
  assertPreserved(boot.catalog.byLabel.get('FTB_TRANS_DIRN'), 'FTB_TRANS_DIRN', ['FORWARD', 'REVERSE'])
}

run()
console.log('flag-default-enum-fill test passed')
