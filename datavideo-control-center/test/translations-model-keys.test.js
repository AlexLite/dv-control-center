const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

function loadTranslations() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'language', 'translations.js'), 'utf8')
  const sandbox = { window: {} }
  vm.runInNewContext(code, sandbox, { filename: 'translations.js' })
  return sandbox.window.DVIPTranslations
}

function assertKeys(locale, dict, keys) {
  for (const key of keys) {
    assert(Object.prototype.hasOwnProperty.call(dict, key), `${locale}: missing key ${key}`)
    assert(String(dict[key] || '').length > 0, `${locale}: empty value for key ${key}`)
  }
}

function run() {
  const tr = loadTranslations()
  assert(tr && tr.en && tr.ru, 'translations should expose en and ru dictionaries')

  const keys = [
    'model.note.legacy',
    'model.note.filtered',
    'model.note.noFlex',
    'model.note.noMultiview',
    'model.note.noExtBorder',
    'model.limitsLabel',
    'model.limit.flex',
    'model.limit.multiview',
    'model.limit.extBorder',
    'model.hiddenControls',
  ]
  assertKeys('en', tr.en, keys)
  assertKeys('ru', tr.ru, keys)
}

run()
console.log('translations-model-keys test passed')
