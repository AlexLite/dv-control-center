const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function run() {
  const root = path.join(__dirname, '..')
  const genScript = path.join(root, 'tools', 'generate-model-docs.js')
  const jsonPath = path.join(root, 'data', 'model-control-matrix.json')
  const mdPath = path.join(root, 'docs', 'generated', 'MODEL_CONTROL_MATRIX.md')

  const proc = spawnSync(process.execPath, [genScript], { cwd: root, encoding: 'utf8' })
  assert.strictEqual(proc.status, 0, `generate-model-docs failed: ${proc.stderr || proc.stdout}`)

  const matrix = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const md = fs.readFileSync(mdPath, 'utf8')

  for (const [id, m] of Object.entries(matrix || {})) {
    const header = `## ${m.model.label} (${id})`
    assert(md.includes(header), `${id}: markdown should include model header`)
    assert(md.includes(`- Enum controls: ${m.enumControlsCount}`), `${id}: markdown should include enum controls count`)

    const parts = Object.entries(m.enumSourceCounts || {})
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([k, v]) => `${k}=${v}`)
    if (parts.length > 0) {
      const line = `- Enum sources: ${parts.join(', ')}`
      assert(md.includes(line), `${id}: markdown should include exact enum sources summary line`)
    }
  }
}

run()
console.log('model-docs-generation-consistency test passed')
