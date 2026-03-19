const assert = require('assert')

const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')
const { handleModelApiRoute } = require('../lib/routes/model-routes')

async function run() {
  const modelRuntime = initModelBootstrap({ requestedModelId: 'se3200' })

  let payload = null
  const handled = await handleModelApiRoute({
    req: { method: 'GET' },
    res: {},
    pathname: '/api/catalog',
    json: (_res, _code, body) => { payload = body },
    readBody: async () => ({}),
    client: { state: {}, connection: {}, stateById: {}, savedConnectionConfig: null, requestStateSnapshot() {} },
    catalog: modelRuntime.catalog,
    profiles: modelRuntime.profiles,
    activeModel: modelRuntime.activeModel,
    getDetectedModel: modelRuntime.getDetectedModel,
    getDetection: modelRuntime.getDetection,
    refreshDetectedModel: modelRuntime.refreshDetectedModel,
    getModelList: modelRuntime.getModelList,
  })

  assert.strictEqual(handled, true, '/api/catalog should be handled')
  assert(payload && Array.isArray(payload.sections), 'catalog response should include sections')

  const controls = []
  for (const s of payload.sections) {
    for (const c of (s.controls || [])) controls.push(c)
  }
  const enums = controls.filter((c) => Array.isArray(c.values) && c.values.length > 0)
  assert(enums.length > 0, 'catalog should contain enum controls')

  const ipMode = enums.find((c) => c.label === 'SYSTEM_NETWORK_IP_MODE')
  const splitSrc = enums.find((c) => c.label === 'SWITCHER_KEY1_SPLIT_SRC')
  const statusConn = enums.find((c) => c.label === 'STATUS_SYSTEM_CONNECTION_STATUS')
  assert(ipMode && ipMode.enumSource === 'manual', 'SYSTEM_NETWORK_IP_MODE should expose enumSource=manual in catalog API')
  assert(splitSrc && splitSrc.enumSource === 'choices', 'SWITCHER_KEY1_SPLIT_SRC should expose enumSource=choices in catalog API')
  assert(statusConn && statusConn.enumSource === 'protocol', 'STATUS_SYSTEM_CONNECTION_STATUS should expose enumSource=protocol in catalog API')
}

run()
  .then(() => console.log('catalog-enum-source-route test passed'))
  .catch((err) => {
    console.error(err && err.stack ? err.stack : err)
    process.exit(1)
  })
