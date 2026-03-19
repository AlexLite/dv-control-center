const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

function run() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'mapping-se3200.js'), 'utf8')
  const sandbox = {
    window: {
      DVIPMapping: { hello: 'world' },
    },
  }

  vm.runInNewContext(code, sandbox, { filename: 'mapping-se3200.js' })

  assert(sandbox.window.SE3200Mapping, 'SE3200Mapping alias should be created')
  assert.strictEqual(sandbox.window.SE3200Mapping, sandbox.window.DVIPMapping, 'SE3200Mapping should point to DVIPMapping')

  console.log('mapping-legacy-shim test passed')
}

run()