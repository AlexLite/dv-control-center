const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

function loadUiCore(windowObj, documentObj) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'ui-core.js'), 'utf8')
  const sandbox = { window: windowObj, document: documentObj, console }
  vm.runInNewContext(code, sandbox, { filename: 'ui-core.js' })
  return sandbox.window.DVIPUiCore
}

function makeButton(tabId, active = false) {
  return {
    dataset: { tab: tabId },
    style: {},
    clicked: false,
    classList: { contains: (name) => (name === 'active' ? !!active : false) },
    click() { this.clicked = true },
  }
}

function run() {
  const buttons = {
    connect: makeButton('connect', false),
    flex: makeButton('flex', true),
  }
  const sections = {
    'tab-connect': { style: {} },
    'tab-flex': { style: {} },
  }
  const documentObj = {
    querySelector(selector) {
      const byTab = selector.match(/^\.tabs button\[data-tab="([^"]+)"\]$/)
      if (byTab) return buttons[byTab[1]] || null
      if (selector === '.tabs button.active') {
        const all = Object.values(buttons)
        return all.find((b) => b.classList.contains('active')) || null
      }
      return null
    },
    createElement() { return { style: {}, appendChild() {}, querySelector() { return null } } },
    addEventListener() {},
    removeEventListener() {},
    body: { appendChild() {} },
  }
  const windowObj = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener() {},
    removeEventListener() {},
  }

  const ui = loadUiCore(windowObj, documentObj)
  assert(ui && typeof ui.setTabVisible === 'function', 'setTabVisible should exist')
  assert.strictEqual(typeof ui.getActiveTabId, 'function', 'getActiveTabId should exist')
  assert.strictEqual(typeof ui.activateTab, 'function', 'activateTab should exist')

  ui.setTabVisible((id) => sections[id] || null, 'flex', false)
  assert.strictEqual(buttons.flex.style.display, 'none', 'flex button should be hidden')
  assert.strictEqual(sections['tab-flex'].style.display, 'none', 'flex section should be hidden')

  ui.setTabVisible((id) => sections[id] || null, 'flex', true)
  assert.strictEqual(buttons.flex.style.display, '', 'flex button should be visible')
  assert.strictEqual(sections['tab-flex'].style.display, '', 'flex section should be visible')

  assert.strictEqual(ui.getActiveTabId(), 'flex', 'active tab should be resolved from active button')

  assert.strictEqual(ui.activateTab('connect'), true, 'activateTab should return true when target exists')
  assert.strictEqual(buttons.connect.clicked, true, 'activateTab should click target tab button')
  assert.strictEqual(ui.activateTab('missing'), false, 'activateTab should return false when button does not exist')
}

run()
console.log('ui-core-tabs test passed')
