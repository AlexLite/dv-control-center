const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

function loadMapping() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'mapping-dvip.js'), 'utf8')
  const sandbox = { window: {} }
  vm.runInNewContext(code, sandbox, { filename: 'mapping-dvip.js' })
  return sandbox.window.DVIPMapping
}

function run() {
  const m = loadMapping()
  assert(m, 'DVIPMapping should be defined')

  assert.strictEqual(m.rawPosToPct(0.5), 50)
  assert.strictEqual(m.rawPosToPct(-2), -100)
  assert.strictEqual(m.pctToRawPos(25, 1), 0.25)
  assert.strictEqual(m.pctToRawPos(-250, 1), -1)

  assert.strictEqual(m.rawScaleToPct(0.75), 75)
  assert.strictEqual(m.rawScaleToPct(2), 100)
  assert.strictEqual(m.pctToRawScale(75, 1), 0.75)
  assert.strictEqual(m.pctToRawScale(-10, 1), 0)

  assert.strictEqual(m.flexControlId(1, 'en'), 0)
  assert.strictEqual(m.flexControlId(1, 'x'), 1)
  assert.strictEqual(m.flexControlId(1, 'w'), 7)
  assert.strictEqual(m.flexControlId(2, 'en'), 37)
  assert.strictEqual(m.flexControlId(3, 'cl'), 83)
  assert.strictEqual(m.flexRawId(4, 24), 135)

  assert.strictEqual(m.keyControlId(1, 'en'), 0)
  assert.strictEqual(m.keyControlId(2, 'w'), 44)
  assert.strictEqual(m.keyControlId(4, 'cb'), 123)
  assert.strictEqual(m.keyRawId(4, 24), 135)

  const fakeState = { values: { A: 7 }, stateById: { '2:3:44': 0.75 } }
  assert.strictEqual(m.controlValue(fakeState, 'A', 0), 7)
  assert.strictEqual(m.controlValue(fakeState, 'B', 10), 10)
  assert.strictEqual(m.controlValueById(fakeState, 2, 3, 44, 0), 0.75)
  assert.strictEqual(m.controlValueById(fakeState, 2, 2, 44, 0.1), 0.1)

  console.log('mapping-contract test passed')
}

run()
