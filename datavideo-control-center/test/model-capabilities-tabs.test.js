const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

function makeButton(tabId, isActive) {
  return {
    dataset: { tab: tabId },
    style: {},
    clicked: false,
    classList: { contains: (name) => (name === 'active' ? !!isActive : false) },
    click() { this.clicked = true },
  }
}

function makeNode() {
  return { style: {}, open: true, checked: true, value: '1' }
}

function createEnv(activeTab) {
  const buttons = {
    connect: makeButton('connect', activeTab === 'connect'),
    flex: makeButton('flex', activeTab === 'flex'),
    multiview: makeButton('multiview', activeTab === 'multiview'),
  }
  const nodesById = {
    'tab-flex': makeNode(),
    'tab-multiview': makeNode(),
  }
  const document = {
    querySelector(selector) {
      const byTab = selector.match(/^\.tabs button\[data-tab="([^"]+)"\]$/)
      if (byTab) return buttons[byTab[1]] || null
      if (selector === '.tabs button.active') {
        const all = Object.values(buttons)
        return all.find((b) => b.classList.contains('active')) || null
      }
      return null
    },
  }
  return {
    buttons,
    document,
    byId: (id) => nodesById[id] || null,
  }
}

function loadModule(windowObj, documentObj) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'model-capabilities-ui.js'), 'utf8')
  const sandbox = { window: windowObj, document: documentObj, console }
  vm.runInNewContext(code, sandbox, { filename: 'model-capabilities-ui.js' })
  return sandbox.window.DVIPModelCapabilitiesUi
}

function testFallbackToConnectWhenFlexHidden() {
  const env = createEnv('flex')
  const calls = []
  const windowObj = {
    DVIPUiCore: {
      setTabVisible(byId, tabId, visible) {
        calls.push({ fn: 'setTabVisible', tabId, visible })
        const btn = env.buttons[tabId]
        const section = byId(`tab-${tabId}`)
        if (btn) btn.style.display = visible ? '' : 'none'
        if (section) section.style.display = visible ? '' : 'none'
      },
      getActiveTabId() {
        calls.push({ fn: 'getActiveTabId' })
        return 'flex'
      },
      activateTab(tabId) {
        calls.push({ fn: 'activateTab', tabId })
        const btn = env.buttons[tabId]
        if (btn) btn.click()
        return !!btn
      },
    },
  }
  const mod = loadModule(windowObj, env.document)
  let refreshed = 0
  mod.applyModelCapabilities({
    state: { modelSelection: { detected: { supports: { flex: false, multiview: true, extendedPipBorder: true } } } },
    byId: env.byId,
    refreshRawControls: () => { refreshed += 1 },
  })

  assert.strictEqual(env.buttons.flex.style.display, 'none', 'flex tab should be hidden')
  assert.strictEqual(env.byId('tab-flex').style.display, 'none', 'flex section should be hidden')
  assert.strictEqual(env.buttons.multiview.style.display, '', 'multiview tab should stay visible')
  assert.strictEqual(env.buttons.connect.clicked, true, 'connect should be activated')
  assert.strictEqual(refreshed, 1, 'raw controls should be refreshed')
  assert(calls.some((c) => c.fn === 'setTabVisible' && c.tabId === 'flex'), 'setTabVisible should be used')
  assert(calls.some((c) => c.fn === 'activateTab' && c.tabId === 'connect'), 'activateTab should be used')
}

function testNoFallbackWhenActiveTabVisible() {
  const env = createEnv('multiview')
  const windowObj = {}
  const mod = loadModule(windowObj, env.document)

  mod.applyModelCapabilities({
    state: { modelSelection: { detected: { supports: { flex: true, multiview: true, extendedPipBorder: true } } } },
    byId: env.byId,
    refreshRawControls: () => {},
  })

  assert.strictEqual(env.buttons.flex.style.display, '', 'flex tab should be visible')
  assert.strictEqual(env.buttons.multiview.style.display, '', 'multiview tab should be visible')
  assert.strictEqual(env.buttons.connect.clicked, false, 'connect should not be activated')
}

testFallbackToConnectWhenFlexHidden()
testNoFallbackWhenActiveTabVisible()
console.log('model-capabilities-tabs test passed')
