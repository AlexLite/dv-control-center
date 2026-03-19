const assert = require('assert')
const fs = require('fs')
const path = require('path')

function run() {
  const md = fs.readFileSync(path.join(__dirname, '..', 'docs', 'generated', 'MODEL_CONTROL_MATRIX.md'), 'utf8')
  assert(md.includes('## Enum Coverage (top 120 labels)'), 'markdown should include enum coverage section')
  assert(md.includes('SWITCHER_DSK1_KEYER_ON [manual]:'), 'markdown should include manual source marker for SWITCHER_DSK1_KEYER_ON')
  assert(md.includes('SWITCHER_KEY1_SPLIT_SRC [choices]:'), 'markdown should include choices source marker for SWITCHER_KEY1_SPLIT_SRC')
  assert(md.includes('STATUS_SYSTEM_CONNECTION_STATUS [protocol]:'), 'markdown should include protocol source marker for STATUS_SYSTEM_CONNECTION_STATUS')
}

run()
console.log('model-matrix-doc-enum-source test passed')
