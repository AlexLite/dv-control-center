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
    broadcast() {},
    sendSet(control, value) {
      sent.push({ control, value })
    },
  })

  const byLabel = new Map()
  const sourceLabels = [
    'SWITCHER_FLEX_SRC_BGND_SRC',
    'SWITCHER_FLEX_SRC_FGND_SRC',
    'SWITCHER_FLEX_SRC_FGND_ENABLE',
    'SWITCHER_FLEX_SRC_DVE1_SRC',
    'SWITCHER_FLEX_SRC_DVE2_SRC',
    'SWITCHER_FLEX_SRC_DVE3_SRC',
    'SWITCHER_FLEX_SRC_DVE4_SRC',
  ]
  for (const label of sourceLabels) {
    byLabel.set(label, { sectionId: 9, controlId: 1, subSectionId: 0, type: 'int', label })
  }

  const engine = new MergeEngine({
    client,
    catalog: { byLabel },
    storagePath: '__tmp_merge_diff_test__.json',
  })

  engine.currentState = {
    bank: 1,
    bg: 1,
    fg: 2,
    fgEnable: true,
    windows: [
      { en: true, src: 11, x: -0.5, y: 0.5, s: 1, cl: 0, cr: 0, ct: 0, cb: 0 },
      { en: true, src: 12, x: 0.5, y: 0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
      { en: true, src: 13, x: -0.5, y: -0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
      { en: true, src: 14, x: 0.5, y: -0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
    ],
  }

  const targetSameSources = {
    bank: 1,
    bg: 1,
    fg: 2,
    fgEnable: true,
    windows: [
      { en: true, src: 11, x: -0.5, y: 0.5, s: 0.75, cl: 0, cr: 0, ct: 0, cb: 0 },
      { en: true, src: 12, x: 0.5, y: 0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
      { en: true, src: 13, x: -0.5, y: -0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
      { en: true, src: 14, x: 0.5, y: -0.5, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0 },
    ],
  }

  sent.length = 0
  engine.runToState(targetSameSources, { durationMs: 120, fps: 25, easing: 'Linear' })
  await delay(260)

  const sourceWritesSame = sent.filter((x) => sourceLabels.includes(x.control?.label))
  assert.strictEqual(sourceWritesSame.length, 0, 'Expected no source writes when source state is unchanged')

  const targetChangedBg = { ...targetSameSources, bg: 3 }
  sent.length = 0
  engine.runToState(targetChangedBg, { durationMs: 120, fps: 25, easing: 'Linear' })
  await delay(260)

  const bgWrites = sent.filter((x) => x.control?.label === 'SWITCHER_FLEX_SRC_BGND_SRC')
  assert(bgWrites.length >= 1, 'Expected BG source write when bg changes')

  console.log('merge-diff-only test passed')
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
})
