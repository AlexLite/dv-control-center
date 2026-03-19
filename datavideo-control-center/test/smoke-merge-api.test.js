const assert = require('assert')
const { spawn } = require('child_process')
const path = require('path')

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestJson(baseUrl, route, method = 'GET', body) {
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch (e) {
    payload = { raw: text }
  }
  return { ok: res.ok, status: res.status, payload }
}

async function waitForServer(baseUrl, timeoutMs = 12000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/state`)
      if (res.ok) return
    } catch (e) {
      // keep polling
    }
    await delay(250)
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`)
}

async function run() {
  const port = 19999
  const baseUrl = `http://127.0.0.1:${port}`
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let serverOutput = ''
  server.stdout.on('data', (buf) => { serverOutput += buf.toString() })
  server.stderr.on('data', (buf) => { serverOutput += buf.toString() })

  try {
    await waitForServer(baseUrl)

    const baseState = {
      bank: 1,
      bg: 0,
      fg: 0,
      fgEnable: false,
      windows: [
        { en: true, src: 0, x: -0.5, y: 0.5, s: 1, cl: 0, cr: 0, ct: 0, cb: 0 },
        { en: true, src: 0, x: 0.5, y: 0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
        { en: true, src: 0, x: -0.5, y: -0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
        { en: true, src: 0, x: 0.5, y: -0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
      ],
    }
    const variantState = {
      ...baseState,
      windows: baseState.windows.map((w, idx) => (idx === 0 ? { ...w, s: 0.75 } : { ...w })),
    }

    const suffix = Date.now()
    const presetA = `SMOKE_API_A_${suffix}`
    const presetB = `SMOKE_API_B_${suffix}`

    let r = await requestJson(baseUrl, '/api/merge/presets/save', 'POST', { name: presetA, state: baseState })
    assert(r.ok, `save preset A failed: ${JSON.stringify(r.payload)}`)
    r = await requestJson(baseUrl, '/api/merge/presets/save', 'POST', { name: presetB, state: variantState })
    assert(r.ok, `save preset B failed: ${JSON.stringify(r.payload)}`)

    r = await requestJson(baseUrl, '/api/merge/presets', 'GET')
    assert(r.ok, `list presets failed: ${JSON.stringify(r.payload)}`)
    const names = (r.payload.presets || []).map((p) => p.name)
    assert(names.includes(presetA), 'preset A missing after save')
    assert(names.includes(presetB), 'preset B missing after save')

    r = await requestJson(baseUrl, '/api/merge/run', 'POST', {
      preset: presetB,
      durationMs: 250,
      fps: 10,
      easing: 'Linear',
    })
    if (!r.ok) {
      const msg = String(r.payload?.error || '')
      assert(msg.includes('Not connected'), `run failed with unexpected error: ${msg}`)
    }

    r = await requestJson(baseUrl, '/api/merge/presets/delete', 'POST', { name: presetA })
    assert(r.ok, `delete preset A failed: ${JSON.stringify(r.payload)}`)
    r = await requestJson(baseUrl, '/api/merge/presets/delete', 'POST', { name: presetB })
    assert(r.ok, `delete preset B failed: ${JSON.stringify(r.payload)}`)

    r = await requestJson(baseUrl, '/api/merge/presets', 'GET')
    assert(r.ok, `list presets after delete failed: ${JSON.stringify(r.payload)}`)
    const afterDelete = (r.payload.presets || []).map((p) => p.name)
    assert(!afterDelete.includes(presetA), 'preset A still exists after delete')
    assert(!afterDelete.includes(presetB), 'preset B still exists after delete')

    console.log('smoke-merge-api test passed')
  } finally {
    server.kill()
    await delay(150)
    if (!server.killed) {
      throw new Error(`Failed to stop spawned server. Output:\n${serverOutput}`)
    }
  }
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
})
