const assert = require('assert')
const path = require('path')

function run() {
  const matrix = require(path.join(__dirname, '..', 'data', 'model-control-matrix.json'))
  const modelIds = Object.keys(matrix || {})
  assert(modelIds.length > 0, 'model matrix should not be empty')

  for (const id of modelIds) {
    const m = matrix[id]
    assert(m && typeof m === 'object', `${id}: model entry should be object`)
    assert(m.enumSources && typeof m.enumSources === 'object', `${id}: enumSources should exist`)
    assert(m.enumSourceCounts && typeof m.enumSourceCounts === 'object', `${id}: enumSourceCounts should exist`)

    const sum = Object.values(m.enumSourceCounts).reduce((acc, n) => acc + Number(n || 0), 0)
    assert.strictEqual(sum, Number(m.enumControlsCount || 0), `${id}: enumSourceCounts sum should equal enumControlsCount`)
  }

  const se3200 = matrix.se3200
  assert(se3200, 'se3200 should exist in matrix')
  assert.strictEqual(se3200.enumSources.SYSTEM_NETWORK_IP_MODE, 'manual', 'SYSTEM_NETWORK_IP_MODE should be manual source')
  assert.strictEqual(se3200.enumSources.SWITCHER_KEY1_SPLIT_SRC, 'choices', 'SWITCHER_KEY1_SPLIT_SRC should be choices source')
  assert.strictEqual(se3200.enumSources.STATUS_SYSTEM_CONNECTION_STATUS, 'protocol', 'STATUS_SYSTEM_CONNECTION_STATUS should be protocol source')
}

run()
console.log('model-matrix-enum-sources test passed')
