const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function collectEnumSourceCounts(catalog) {
  const counts = {}
  for (const section of (catalog.sections || [])) {
    for (const control of (section.controls || [])) {
      if (!Array.isArray(control.values) || control.values.length === 0) continue
      const src = String(control.enumSource || 'inferred')
      counts[src] = (counts[src] || 0) + 1
    }
  }
  return counts
}

function run() {
  const boot = initModelBootstrap({ requestedModelId: 'se3200' })
  const counts = collectEnumSourceCounts(boot.catalog)
  assert((counts.protocol || 0) > 0, 'se3200 should have protocol enum sources')
  assert((counts.manual || 0) > 0, 'se3200 should have manual enum sources')
  assert((counts.choices || 0) > 0, 'se3200 should have choices enum sources')

  const ipMode = boot.catalog.byLabel.get('SYSTEM_NETWORK_IP_MODE')
  assert(ipMode && Array.isArray(ipMode.values) && ipMode.values.length > 0, 'SYSTEM_NETWORK_IP_MODE should have enum values')
  assert.strictEqual(ipMode.enumSource, 'manual', 'SYSTEM_NETWORK_IP_MODE should be manual enum source')

  const splitSrc = boot.catalog.byLabel.get('SWITCHER_KEY1_SPLIT_SRC')
  assert(splitSrc && Array.isArray(splitSrc.values) && splitSrc.values.length > 0, 'SWITCHER_KEY1_SPLIT_SRC should have enum values')
  assert.strictEqual(splitSrc.enumSource, 'choices', 'SWITCHER_KEY1_SPLIT_SRC should be choices enum source')

  const statusConn = boot.catalog.byLabel.get('STATUS_SYSTEM_CONNECTION_STATUS')
  assert(statusConn && Array.isArray(statusConn.values) && statusConn.values.length > 0, 'STATUS_SYSTEM_CONNECTION_STATUS should have enum values')
  assert.strictEqual(statusConn.enumSource, 'protocol', 'STATUS_SYSTEM_CONNECTION_STATUS should be protocol enum source')
}

run()
console.log('model-enum-source test passed')
