const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

function loadModule(file, exportName) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', file), 'utf8')
  const sandbox = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } }
  vm.runInNewContext(code, sandbox, { filename: file })
  return sandbox.window[exportName]
}

async function runCase(activeFlexBank) {
  const actions = loadModule('control-actions.js', 'DVIPControlActions')
  const mapping = loadModule('mapping-dvip.js', 'DVIPMapping')
  assert(actions && mapping, 'modules should load')

  const elements = new Map()
  const set = (id, obj) => elements.set(id, obj)
  const get = (id) => elements.get(id)

  set('flex1-en', { checked: true })
  set('flex1-x', { value: '0' })
  set('flex1-y', { value: '0' })
  set('flex1-s', { value: '50' })
  set('flex1-w', { value: '' })
  set('flex1-h', { value: '' })
  set('flex1-borderOn', { checked: true })
  set('flex1-bs', { value: '1' })
  set('flex1-cl', { value: '0' })
  set('flex1-cr', { value: '0' })
  set('flex1-ct', { value: '0' })
  set('flex1-cb', { value: '0' })
  set('flex1-bo', { value: '100' })
  set('flex1-bw', { value: '2' })
  set('flex1-bh', { value: '60' })
  set('flex1-bsa', { value: '80' })
  set('flex1-bl', { value: '100' })

  const calls = []
  const deps = {
    state: { activeFlexBank },
    markEditLock: () => {},
    releaseEditLock: () => {},
    byId: (id) => get(id),
    pctToRawPos: (v) => Number(v) / 100,
    pctToRawScale: (v) => Number(v) / 100,
    flexControlId: mapping.flexControlId,
    flexRawId: mapping.flexRawId,
    sendRawControl: async (sectionId, subSectionId, controlId, type, value) => {
      calls.push({ sectionId, subSectionId, controlId, type, value })
    },
  }

  await actions.applyFlexWindow(deps, 1)
  return calls
}

async function run() {
  const bank1 = await runCase(1)
  assert(bank1.length > 0, 'bank1 should send calls')
  assert(bank1.every((c) => c.subSectionId === 2), 'bank1 must use subSection 2')

  const bank2 = await runCase(2)
  assert(bank2.length > 0, 'bank2 should send calls')
  assert(bank2.every((c) => c.subSectionId === 3), 'bank2 must use subSection 3')

  console.log('flex-subsection test passed')
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
})
