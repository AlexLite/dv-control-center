const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

const MENU_GROUPS = ['keyer', 'chroma', 'inputs', 'outputs', 'audio', 'files', 'setup']

function createNode(tagName) {
  const node = {
    tagName: String(tagName || '').toUpperCase(),
    className: '',
    textContent: '',
    value: '',
    type: '',
    min: '',
    max: '',
    step: '',
    dataset: {},
    style: {},
    children: [],
    _innerHTML: '',
    appendChild(child) {
      this.children.push(child)
      return child
    },
    addEventListener() {},
    querySelector(selector) {
      if (!selector) return null
      if (selector === 'button') return findNode(this, (n) => n.tagName === 'BUTTON')
      if (selector.startsWith('.')) {
        const cls = selector.slice(1)
        return findNode(this, (n) => String(n.className || '').split(/\s+/).includes(cls))
      }
      return null
    },
  }

  Object.defineProperty(node, 'innerHTML', {
    get() { return node._innerHTML },
    set(v) {
      node._innerHTML = String(v ?? '')
      node.children = []
    },
  })

  return node
}

function findNode(root, predicate) {
  for (const child of root.children || []) {
    if (predicate(child)) return child
    const nested = findNode(child, predicate)
    if (nested) return nested
  }
  return null
}

function makeTabButton(tabId, active) {
  const btn = createNode('button')
  btn.dataset.tab = tabId
  btn.clicked = false
  btn.classList = {
    contains(name) {
      return name === 'active' ? !!active : false
    },
  }
  btn.click = () => { btn.clicked = true }
  return btn
}

function createHarness(activeTab) {
  const buttons = {
    connect: makeTabButton('connect', activeTab === 'connect'),
    keyer: makeTabButton('keyer', activeTab === 'keyer'),
    chroma: makeTabButton('chroma', activeTab === 'chroma'),
    inputs: makeTabButton('inputs', activeTab === 'inputs'),
    outputs: makeTabButton('outputs', activeTab === 'outputs'),
    audio: makeTabButton('audio', activeTab === 'audio'),
    files: makeTabButton('files', activeTab === 'files'),
    setup: makeTabButton('setup', activeTab === 'setup'),
  }

  const nodesById = {
    keyerControls: createNode('div'),
    chromaControls: createNode('div'),
    inputsControls: createNode('div'),
    outputsControls: createNode('div'),
    audioControls: createNode('div'),
    filesControls: createNode('div'),
    setupControls: createNode('div'),
    'tab-keyer': createNode('section'),
    'tab-chroma': createNode('section'),
    'tab-inputs': createNode('section'),
    'tab-outputs': createNode('section'),
    'tab-audio': createNode('section'),
    'tab-files': createNode('section'),
    'tab-setup': createNode('section'),
  }

  const document = {
    createElement: (tag) => createNode(tag),
    querySelector(selector) {
      const byTab = selector.match(/^\.tabs button\[data-tab="([^"]+)"\]$/)
      if (byTab) return buttons[byTab[1]] || null
      if (selector === '.tabs button.active') {
        return Object.values(buttons).find((b) => b.classList.contains('active')) || null
      }
      return null
    },
    querySelectorAll(selector) {
      if (selector === '[data-menu-control-label]') return []
      return []
    },
  }

  return {
    buttons,
    byId: (id) => nodesById[id] || null,
    document,
  }
}

function loadPanelsUi(document) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'panels-ui.js'), 'utf8')
  const sandbox = { window: {}, document, console }
  vm.runInNewContext(code, sandbox, { filename: 'panels-ui.js' })
  const panels = sandbox.window.DVIPPanelsUi
  assert(panels && typeof panels.buildMenuControls === 'function', 'buildMenuControls should be defined')
  return panels
}

function runModelSmoke(modelId) {
  const boot = initModelBootstrap({ requestedModelId: modelId })
  const state = { catalog: boot.catalog, values: {} }

  const initial = createHarness('connect')
  const panels = loadPanelsUi(initial.document)
  panels.buildMenuControls({
    byId: initial.byId,
    state,
    sendControl: async () => {},
    isControlVisible: () => true,
  })

  const hidden = MENU_GROUPS.filter((g) => initial.buttons[g].style.display === 'none')
  const visible = MENU_GROUPS.filter((g) => initial.buttons[g].style.display !== 'none')
  assert(visible.length > 0, `${modelId}: at least one menu group should remain visible`)

  const visibleActive = createHarness(visible[0])
  const panelsVisible = loadPanelsUi(visibleActive.document)
  panelsVisible.buildMenuControls({
    byId: visibleActive.byId,
    state,
    sendControl: async () => {},
    isControlVisible: () => true,
  })
  assert.strictEqual(visibleActive.buttons.connect.clicked, false, `${modelId}: connect fallback should not trigger for visible active tab`)

  if (hidden.length > 0) {
    const hiddenActive = createHarness(hidden[0])
    const panelsHidden = loadPanelsUi(hiddenActive.document)
    panelsHidden.buildMenuControls({
      byId: hiddenActive.byId,
      state,
      sendControl: async () => {},
      isControlVisible: () => true,
    })
    assert.strictEqual(hiddenActive.buttons.connect.clicked, true, `${modelId}: connect fallback should trigger for hidden active tab`)
  }
}

function run() {
  for (const modelId of ['se3200', 'se2200', 'se700']) {
    runModelSmoke(modelId)
  }
}

run()
console.log('menu-tabs-model-smoke test passed')
