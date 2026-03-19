const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

function approx(actual, expected, eps = 1e-6, msg = '') {
  assert(Math.abs(actual - expected) <= eps, `${msg} expected=${expected} actual=${actual}`)
}

function loadScripts(profileGetter) {
  const sandbox = {
    window: {
      DVIPCanvasGeometry: {
        getBaseFlexGeometry: () => {
          const profile = typeof profileGetter === 'function' ? profileGetter() : null
          const flex = profile && profile.flex ? profile.flex : null
          return flex ? { ...flex } : {
            positionMode: 'fixedCenter',
            xScale: 1.0075,
            xOffset: 0,
            yScale: 1.7857142857,
            yOffset: 0,
          }
        },
      },
    },
  }

  const uiGeometry = fs.readFileSync(path.join(__dirname, '..', 'public', 'ui-geometry.js'), 'utf8')
  const runtimeHelpers = fs.readFileSync(path.join(__dirname, '..', 'public', 'runtime-helpers.js'), 'utf8')

  vm.runInNewContext(uiGeometry, sandbox, { filename: 'ui-geometry.js' })
  vm.runInNewContext(runtimeHelpers, sandbox, { filename: 'runtime-helpers.js' })

  return {
    shared: sandbox.window.DVIPShared,
    runtime: sandbox.window.DVIPRuntimeHelpers,
  }
}

function testFlexQuarterFit() {
  const profile = {
    pip: { xRange: 1, yRange: 1, yOffset: 0 },
    flex: { positionMode: 'sizeAware', xScale: 1.3333333333, yScale: 2.3809523810, yOffset: 0 },
  }
  const { shared } = loadScripts(() => profile)
  const cw = 1227
  const ch = 690

  const r = shared.flexToCanvas(0.25, 0.14, 0.5, 0.5, cw, ch)
  approx(r.x, 613.5, 1e-5, 'flexToCanvas right-top left edge')
  approx(r.y, 0, 1e-5, 'flexToCanvas right-top top edge')
  approx(r.w, 613.5, 1e-5, 'flexToCanvas width')
  approx(r.h, 345, 1e-5, 'flexToCanvas height')

  const inv = shared.flexFromCanvasRect(r, cw, ch, 1, 1)
  approx(inv.x, 0.25, 1e-5, 'flexFromCanvasRect x inverse')
  approx(inv.y, 0.14, 1e-5, 'flexFromCanvasRect y inverse')
  approx(inv.w, 0.5, 1e-6, 'flexFromCanvasRect w inverse')
}

function testPipRoundTripWithCalibration() {
  const profile = {
    pip: { xRange: 0.8, yRange: 0.6, yOffset: 0.1 },
    flex: { positionMode: 'sizeAware', xScale: 1.3333333333, yScale: 2.3809523810, yOffset: 0 },
  }
  const { runtime, shared } = loadScripts(() => profile)

  const cw = 1920
  const ch = 1080
  const raw = { x: 0.2, y: -0.15, w: 0.4, h: 0.4 }

  const canvasRect = runtime.toCanvas(raw.x, raw.y, raw.w, raw.h, cw, ch)
  const flexRect = shared.flexToCanvas(raw.x, raw.y, raw.w, raw.h, cw, ch)
  const inv = runtime.pipFromCanvasRect(canvasRect, cw, ch, 1, 1)

  approx(canvasRect.x, flexRect.x, 1e-6, 'pip canvas x matches flex math')
  approx(canvasRect.y, flexRect.y, 1e-6, 'pip canvas y matches flex math')
  approx(canvasRect.w, flexRect.w, 1e-6, 'pip canvas w matches flex math')
  approx(canvasRect.h, flexRect.h, 1e-6, 'pip canvas h matches flex math')
  approx(inv.x, raw.x, 1e-6, 'pip x round trip')
  approx(inv.y, raw.y, 1e-6, 'pip y round trip')
  approx(inv.w, raw.w, 1e-6, 'pip w round trip')
  approx(inv.h, raw.h, 1e-6, 'pip h round trip')
}

function testProfileSwitchAffectsFlexGeometry() {
  let active = {
    pip: { xRange: 1, yRange: 1, yOffset: 0 },
    flex: { positionMode: 'sizeAware', xScale: 1.3333333333, yScale: 2.3809523810, yOffset: 0 },
  }
  const { shared } = loadScripts(() => active)

  const cw = 1227
  const ch = 690
  const a = shared.flexToCanvas(0.25, 0.14, 0.5, 0.5, cw, ch)

  active = {
    pip: { xRange: 1, yRange: 1, yOffset: 0 },
    flex: { positionMode: 'sizeAware', xScale: 1.6216216216, yScale: 2.9850746269, yOffset: -0.005 },
  }
  const b = shared.flexToCanvas(0.25, 0.14, 0.5, 0.5, cw, ch)

  assert.notStrictEqual(Number(a.x.toFixed(3)), Number(b.x.toFixed(3)), 'x should differ between profiles')
  assert.notStrictEqual(Number(a.y.toFixed(3)), Number(b.y.toFixed(3)), 'y should differ between profiles')
}

function testFixedCenterFlexAnchors() {
  const profile = {
    pip: { xRange: 1, yRange: 1, yOffset: 0 },
    flex: {
      positionMode: 'fixedCenter',
      xScale: 1.0075,
      xOffset: 0,
      yScale: 1.7857142857,
      yOffset: 0,
    },
  }
  const { shared } = loadScripts(() => profile)
  const cw = 1227
  const ch = 690

  const f1 = shared.flexToCanvas(0, 0, 1, 1, cw, ch)
  approx(f1.x, 0, 1e-3, 'flex1 full-screen left edge')
  approx(f1.y, 0, 1e-3, 'flex1 full-screen top edge')
  approx(f1.w, cw, 1e-3, 'flex1 full-screen width')
  approx(f1.h, ch, 1e-3, 'flex1 full-screen height')

  const f2 = shared.flexToCanvas(-0.248, 0.14, 0.5, 0.5, cw, ch)
  approx(f2.x, 0, 1.5, 'flex2 left edge')
  approx(f2.y, 0, 1e-3, 'flex2 top edge')

  const f3 = shared.flexToCanvas(0.122, -0.07, 0.75, 0.75, cw, ch)
  approx(f3.x + f3.w, cw, 3, 'flex3 right edge')
  approx(f3.y + f3.h, ch, 1e-3, 'flex3 bottom edge')

  const f4 = shared.flexToCanvas(0.3727, 0.21, 0.25, 0.25, cw, ch)
  approx(f4.x + f4.w, cw, 1.5, 'flex4 right edge')
  approx(f4.y, 0, 1e-3, 'flex4 top edge')

  const inv4 = shared.flexFromCanvasRect(f4, cw, ch, 1, 1)
  approx(inv4.x, 0.3727, 1e-3, 'flex4 inverse x')
  approx(inv4.y, 0.21, 1e-3, 'flex4 inverse y')
  approx(inv4.w, 0.25, 1e-6, 'flex4 inverse w')
}

function run() {
  testFlexQuarterFit()
  testPipRoundTripWithCalibration()
  testProfileSwitchAffectsFlexGeometry()
  testFixedCenterFlexAnchors()
  console.log('calibration-geometry test passed')
}

run()
