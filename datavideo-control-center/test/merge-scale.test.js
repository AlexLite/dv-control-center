const assert = require('assert')
const EventEmitter = require('events')
const { MergeEngine } = require('../lib/merge-engine')

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  const sent = []
  const client = Object.assign(new EventEmitter(), {
    connection: { connected: true },
    cmdSocket: null,
    sendSet(control, value) {
      sent.push({ control, value })
    },
  })
  const catalog = { byLabel: new Map() }
  const engine = new MergeEngine({
    client,
    catalog,
    storagePath: '__tmp_merge_test__.json',
  })

  engine.currentState = {
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

  const target = {
    bank: 1,
    bg: 0,
    fg: 0,
    fgEnable: false,
    windows: [
      { en: true, src: 0, x: -0.5, y: 0.5, s: 0.75, cl: 0, cr: 0, ct: 0, cb: 0 },
      { en: true, src: 0, x: 0.5, y: 0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
      { en: true, src: 0, x: -0.5, y: -0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
      { en: true, src: 0, x: 0.5, y: -0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
    ],
  }

  engine.runToState(target, { durationMs: 250, fps: 25, easing: 'Linear' })
  await delay(450)

  const scaleWrites = sent.filter((x) => x.control.sectionId === 2 && x.control.subSectionId === 2 && (x.control.controlId === 7 || x.control.controlId === 44 || x.control.controlId === 81 || x.control.controlId === 118))
  assert(scaleWrites.length > 0, 'Expected scale writes for FLEX windows')

  const w1Writes = sent.filter((x) => x.control.sectionId === 2 && x.control.subSectionId === 2 && x.control.controlId === 7)
  assert(w1Writes.length >= 2, 'Expected multiple interpolated writes for Flex 1 scale')
  assert(Math.abs(w1Writes[w1Writes.length - 1].value - 0.75) < 0.001, 'Final Flex 1 scale should be 0.75')

  const uniqueRounded = [...new Set(w1Writes.map((x) => Number(x.value).toFixed(3)))]
  assert(uniqueRounded.length >= 2, 'Expected non-constant Flex 1 scale writes during interpolation')

  console.log('merge-scale test passed')
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
})
