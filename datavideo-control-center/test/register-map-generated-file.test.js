const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function run() {
  const root = path.join(__dirname, '..')
  const tool = path.join(root, 'tools', 'generate-register-map.js')
  const outFile = path.join(root, 'data', 'register-map.full.json')

  const proc = spawnSync(process.execPath, [tool], { cwd: root, encoding: 'utf8' })
  assert.strictEqual(proc.status, 0, `generate-register-map failed: ${proc.stderr || proc.stdout}`)

  const raw = fs.readFileSync(outFile, 'utf8')
  const parsed = JSON.parse(raw)
  assert(parsed && parsed.byLabel && parsed.byKey && parsed.sections, 'register-map.full.json structure should be valid')

  const byLabel = parsed.byLabel || {}
  const labels = Object.keys(byLabel)
  assert(labels.length > 0, 'byLabel should not be empty')

  const sampleEnum = labels.find((l) => Array.isArray(byLabel[l]?.values) && byLabel[l].values.length > 0)
  const samplePlain = labels.find((l) => !Array.isArray(byLabel[l]?.values) || byLabel[l].values.length === 0)
  assert(sampleEnum, 'should include at least one enum control in byLabel')
  assert(samplePlain, 'should include at least one non-enum control in byLabel')

  assert.strictEqual(byLabel[sampleEnum].enumSource, 'protocol', 'enum control should have enumSource=protocol')
  assert.strictEqual(byLabel[samplePlain].enumSource, null, 'non-enum control should have enumSource=null')
}

run()
console.log('register-map-generated-file test passed')
