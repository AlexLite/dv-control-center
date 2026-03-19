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

function makeRoot() {
  return {
    innerHTML: 'stale',
    style: {},
    children: [],
    appendChild(node) {
      this.children.push(node)
    },
  }
}

function makeDocument(buttonsByTab) {
  const makeNode = (tag) => ({
    tagName: String(tag || '').toUpperCase(),
    className: '',
    textContent: '',
    value: '',
    dataset: {},
    style: {},
    children: [],
    appendChild(node) { this.children.push(node) },
    addEventListener() {},
    querySelector() { return null },
  })
  return {
    createElement: makeNode,
    querySelector(selector) {
      const byTab = selector.match(/^\.tabs button\[data-tab="([^"]+)"\]$/)
      if (byTab) return buttonsByTab[byTab[1]] || null
      if (selector === '.tabs button.active') {
        const buttons = Object.values(buttonsByTab)
        return buttons.find((b) => b.classList.contains('active')) || null
      }
      return null
    },
    querySelectorAll(selector) {
      if (selector === '[data-menu-control-label]') return []
      return []
    },
  }
}

function testHidesEmptyGroupsAndFallbacksToConnect() {
  const buttons = {
    connect: makeButton('connect', false),
    keyer: makeButton('keyer', true),
    chroma: makeButton('chroma', false),
    inputs: makeButton('inputs', false),
    outputs: makeButton('outputs', false),
    audio: makeButton('audio', false),
    files: makeButton('files', false),
    setup: makeButton('setup', false),
  }
  const document = makeDocument(buttons)
  const file = path.join(__dirname, '..', 'public', 'panels-ui.js')
  const code = fs.readFileSync(file, 'utf8')
  const roots = {
    keyerControls: makeRoot(),
    chromaControls: makeRoot(),
    inputsControls: makeRoot(),
    outputsControls: makeRoot(),
    audioControls: makeRoot(),
    filesControls: makeRoot(),
    setupControls: makeRoot(),
    'tab-keyer': makeRoot(),
    'tab-chroma': makeRoot(),
    'tab-inputs': makeRoot(),
    'tab-outputs': makeRoot(),
    'tab-audio': makeRoot(),
    'tab-files': makeRoot(),
    'tab-setup': makeRoot(),
  }
  const sandbox = { window: {}, document, console }
  vm.runInNewContext(code, sandbox, { filename: 'panels-ui.js' })
  const panels = sandbox.window.DVIPPanelsUi
  const deps = {
    byId: (id) => roots[id] || null,
    state: { catalog: { sections: [] }, values: {} },
    sendControl: async () => {},
    isControlVisible: () => true,
  }
  panels.buildMenuControls(deps)

  const groups = ['keyer', 'chroma', 'inputs', 'outputs', 'audio', 'files', 'setup']
  for (const g of groups) {
    assert.strictEqual(buttons[g].style.display, 'none', `${g} tab should be hidden`)
    assert.strictEqual(roots[`${g}Controls`].innerHTML, '', `${g} root should be cleared`)
    assert.strictEqual(roots[`tab-${g}`].style.display, 'none', `tab-${g} section should be hidden`)
  }
  assert.strictEqual(buttons.connect.clicked, true, 'connect tab should be auto-selected when active menu tab becomes empty')
}

function testShowsGroupWithVisibleItemsWithoutFallback() {
  const buttons = {
    connect: makeButton('connect', false),
    keyer: makeButton('keyer', false),
    chroma: makeButton('chroma', false),
    inputs: makeButton('inputs', true),
    outputs: makeButton('outputs', false),
    audio: makeButton('audio', false),
    files: makeButton('files', false),
    setup: makeButton('setup', false),
  }
  const document = makeDocument(buttons)
  const file = path.join(__dirname, '..', 'public', 'panels-ui.js')
  const code = fs.readFileSync(file, 'utf8')
  const roots = {
    keyerControls: makeRoot(),
    chromaControls: makeRoot(),
    inputsControls: makeRoot(),
    outputsControls: makeRoot(),
    audioControls: makeRoot(),
    filesControls: makeRoot(),
    setupControls: makeRoot(),
    'tab-keyer': makeRoot(),
    'tab-chroma': makeRoot(),
    'tab-inputs': makeRoot(),
    'tab-outputs': makeRoot(),
    'tab-audio': makeRoot(),
    'tab-files': makeRoot(),
    'tab-setup': makeRoot(),
  }
  const sandbox = { window: {}, document, console }
  vm.runInNewContext(code, sandbox, { filename: 'panels-ui.js' })
  const panels = sandbox.window.DVIPPanelsUi
  const deps = {
    byId: (id) => roots[id] || null,
    state: {
      catalog: {
        sections: [
          {
            id: 10,
            label: 'INPUT',
            controls: [{ id: 1, label: 'INPUT_PROC_HUE', type: 'int' }],
          },
        ],
      },
      values: { INPUT_PROC_HUE: 0 },
    },
    sendControl: async () => {},
    isControlVisible: () => true,
  }
  panels.buildMenuControls(deps)

  assert.strictEqual(buttons.inputs.style.display, '', 'inputs tab should be visible with items')
  assert.strictEqual(roots['tab-inputs'].style.display, '', 'inputs section should be visible with items')
  assert.strictEqual(buttons.connect.clicked, false, 'connect tab should not be auto-selected when active tab stays visible')
}

function testHandlesMissingCatalogSafely() {
  const buttons = {
    connect: makeButton('connect', false),
    keyer: makeButton('keyer', true),
    chroma: makeButton('chroma', false),
    inputs: makeButton('inputs', false),
    outputs: makeButton('outputs', false),
    audio: makeButton('audio', false),
    files: makeButton('files', false),
    setup: makeButton('setup', false),
  }
  const document = makeDocument(buttons)
  const file = path.join(__dirname, '..', 'public', 'panels-ui.js')
  const code = fs.readFileSync(file, 'utf8')
  const roots = {
    keyerControls: makeRoot(),
    chromaControls: makeRoot(),
    inputsControls: makeRoot(),
    outputsControls: makeRoot(),
    audioControls: makeRoot(),
    filesControls: makeRoot(),
    setupControls: makeRoot(),
    'tab-keyer': makeRoot(),
    'tab-chroma': makeRoot(),
    'tab-inputs': makeRoot(),
    'tab-outputs': makeRoot(),
    'tab-audio': makeRoot(),
    'tab-files': makeRoot(),
    'tab-setup': makeRoot(),
  }
  const sandbox = { window: {}, document, console }
  vm.runInNewContext(code, sandbox, { filename: 'panels-ui.js' })
  const panels = sandbox.window.DVIPPanelsUi

  assert.doesNotThrow(() => {
    panels.buildMenuControls({
      byId: (id) => roots[id] || null,
      state: { catalog: null, values: {} },
      sendControl: async () => {},
      isControlVisible: () => true,
    })
  }, 'buildMenuControls should tolerate missing catalog')
  assert.strictEqual(buttons.connect.clicked, true, 'connect fallback should still work when catalog is missing')
}

function testHandlesMissingStateSafely() {
  const buttons = {
    connect: makeButton('connect', false),
    keyer: makeButton('keyer', true),
    chroma: makeButton('chroma', false),
    inputs: makeButton('inputs', false),
    outputs: makeButton('outputs', false),
    audio: makeButton('audio', false),
    files: makeButton('files', false),
    setup: makeButton('setup', false),
  }
  const document = makeDocument(buttons)
  const file = path.join(__dirname, '..', 'public', 'panels-ui.js')
  const code = fs.readFileSync(file, 'utf8')
  const roots = {
    keyerControls: makeRoot(),
    chromaControls: makeRoot(),
    inputsControls: makeRoot(),
    outputsControls: makeRoot(),
    audioControls: makeRoot(),
    filesControls: makeRoot(),
    setupControls: makeRoot(),
    'tab-keyer': makeRoot(),
    'tab-chroma': makeRoot(),
    'tab-inputs': makeRoot(),
    'tab-outputs': makeRoot(),
    'tab-audio': makeRoot(),
    'tab-files': makeRoot(),
    'tab-setup': makeRoot(),
  }
  const sandbox = { window: {}, document, console }
  vm.runInNewContext(code, sandbox, { filename: 'panels-ui.js' })
  const panels = sandbox.window.DVIPPanelsUi

  assert.doesNotThrow(() => {
    panels.buildMenuControls({
      byId: (id) => roots[id] || null,
      sendControl: async () => {},
      isControlVisible: () => true,
    })
  }, 'buildMenuControls should tolerate missing state')
  assert.strictEqual(buttons.connect.clicked, true, 'connect fallback should still work when state is missing')
}

testHidesEmptyGroupsAndFallbacksToConnect()
testShowsGroupWithVisibleItemsWithoutFallback()
testHandlesMissingCatalogSafely()
testHandlesMissingStateSafely()
console.log('panels-menu-tabs test passed')
