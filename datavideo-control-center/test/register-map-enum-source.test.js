const assert = require('assert')

const {
  loadProtocolSources,
  flattenSectionControls,
  dedupeByLabel,
  buildOutput,
} = require('../tools/generate-register-map')

function run() {
  const { protocol3200, protocolCommon } = loadProtocolSources()
  const rows3200 = flattenSectionControls(protocol3200.GET_SET_CMD_3200, 'protocol_3200')
  const rowsCommon = flattenSectionControls(protocolCommon.GET_SET_CMD_COMMON, 'protocol_common')
  const rows = dedupeByLabel([...rows3200, ...rowsCommon])
  assert(rows.length > 0, 'flattened rows should not be empty')

  const withEnum = rows.find((r) => Array.isArray(r.values) && r.values.length > 0)
  const withoutEnum = rows.find((r) => !Array.isArray(r.values) || r.values.length === 0)
  assert(withEnum, 'should contain row with enum values')
  assert(withoutEnum, 'should contain row without enum values')
  assert.strictEqual(withEnum.enumSource, 'protocol', 'rows with enum values should have enumSource=protocol')
  assert.strictEqual(withoutEnum.enumSource, null, 'rows without enum values should have enumSource=null')

  const output = buildOutput(rows)
  assert(output && output.byLabel && output.byKey && output.sections, 'buildOutput should return map structure')

  const sampleEnum = output.byLabel[withEnum.label]
  assert(sampleEnum, 'sample enum label should exist in byLabel')
  assert.strictEqual(sampleEnum.enumSource, 'protocol', 'byLabel should preserve enumSource for enum row')

  const sampleNoEnum = output.byLabel[withoutEnum.label]
  assert(sampleNoEnum, 'sample non-enum label should exist in byLabel')
  assert.strictEqual(sampleNoEnum.enumSource, null, 'byLabel should preserve null enumSource for non-enum row')
}

run()
console.log('register-map-enum-source test passed')
