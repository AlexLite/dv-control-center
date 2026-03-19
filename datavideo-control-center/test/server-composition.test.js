const assert = require('assert')
const path = require('path')
const { EventEmitter } = require('events')

const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')
const { DvipClient } = require('../lib/dvip-client')
const { handleModelApiRoute } = require('../lib/routes/model-routes')
const { handleControlApiRoute } = require('../lib/routes/control-routes')
const { handleMergeApiRoute } = require('../lib/routes/merge-routes')
const { handleSystemRoute } = require('../lib/routes/system-routes')
const { json, readBody } = require('../lib/http-utils')

async function run() {
  const modelRuntime = initModelBootstrap({ requestedModelId: 'auto' })
  assert(modelRuntime.activeModel, 'activeModel should be defined')
  assert(modelRuntime.catalog && Array.isArray(modelRuntime.catalog.sections), 'catalog sections should exist')
  assert(modelRuntime.catalog.sections.length > 0, 'catalog should not be empty')

  const tmpDataDir = path.join(__dirname, '..', 'data', '.tmp-composition-test')
  const client = new DvipClient(modelRuntime.catalog, {}, { dataDir: tmpDataDir })
  assert(client && typeof client.connect === 'function', 'DvipClient should initialize')
  assert.strictEqual(typeof client.requestStateSnapshot, 'function', 'DvipClient methods should be present')

  const falseJson = () => { throw new Error('json should not be called on false route test') }
  const falseRead = async () => ({})

  let handled = await handleModelApiRoute({
    req: { method: 'GET' },
    res: {},
    pathname: '/nope',
    json: falseJson,
    readBody: falseRead,
    client,
    catalog: modelRuntime.catalog,
    profiles: modelRuntime.profiles,
    activeModel: modelRuntime.activeModel,
    getDetectedModel: modelRuntime.getDetectedModel,
    getDetection: modelRuntime.getDetection,
    refreshDetectedModel: modelRuntime.refreshDetectedModel,
    getModelList: modelRuntime.getModelList,
  })
  assert.strictEqual(handled, false, 'model route should return false for unknown path')

  handled = await handleControlApiRoute({
    req: { method: 'GET' },
    res: {},
    pathname: '/nope',
    readBody: falseRead,
    json: falseJson,
    client,
    catalog: modelRuntime.catalog,
  })
  assert.strictEqual(handled, false, 'control route should return false for unknown path')

  handled = await handleMergeApiRoute({
    req: { method: 'GET' },
    res: {},
    pathname: '/nope',
    readBody: falseRead,
    json: falseJson,
    mergeEngine: {
      getPublicState: () => ({ presets: [] }),
      savePreset: () => ({}),
      deletePreset: () => {},
      applyState: (s) => s,
      runToPreset: () => ({}),
      runToState: () => ({}),
      stop: () => {},
      currentState: {},
    },
  })
  assert.strictEqual(handled, false, 'merge route should return false for unknown path')

  let statusCode = null
  let responseBody = null
  const res = {
    writeHead: (code) => { statusCode = code },
    end: (body) => { responseBody = body },
  }
  handled = await handleSystemRoute({
    req: { method: 'GET', url: '/api/unknown' },
    res,
    pathname: '/api/unknown',
    json,
    client,
    publicDir: path.join(__dirname, '..', 'public'),
  })
  assert.strictEqual(handled, true, 'system route should handle /api/* fallback')
  assert.strictEqual(statusCode, 404, 'system route should return 404 for unknown api')
  assert(responseBody && responseBody.includes('Unknown endpoint'), 'fallback body should include Unknown endpoint')

  // readBody/json quick smoke
  const req = new EventEmitter()
  const bodyPromise = readBody(req)
  req.emit('data', '{"ok":1}')
  req.emit('end')
  const parsed = await bodyPromise
  assert.strictEqual(parsed.ok, 1, 'readBody should parse JSON payload')

  console.log('server-composition test passed')
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
})
