const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function assertOnOffEnum(control, label) {
  assert(control, `${label} should exist in catalog`)
  assert(Array.isArray(control.values), `${label} should have enum values`)
  assert.strictEqual(control.values.length, 2, `${label} should expose OFF/ON enum values`)
  assert.deepStrictEqual(
    control.values.map((x) => ({ id: Number(x.id), label: String(x.label) })),
    [{ id: 0, label: 'OFF' }, { id: 1, label: 'ON' }],
    `${label} should map to OFF/ON`,
  )
  assert.strictEqual(control.enumSource, 'manual', `${label} should be manual enum source`)
}

function run() {
  for (const modelId of ['se3200', 'se2200', 'se700']) {
    const boot = initModelBootstrap({ requestedModelId: modelId })
    const autoSave = boot.catalog.byLabel.get('SYSTEM_AUTO_SAVE_ENABLE')
    assertOnOffEnum(autoSave, `SYSTEM_AUTO_SAVE_ENABLE (${modelId})`)
    const aspect = boot.catalog.byLabel.get('SYSTEM_ASPECT')
    assertOnOffEnum(aspect, `SYSTEM_ASPECT (${modelId})`)
    const genlockEnable = boot.catalog.byLabel.get('SYSTEM_GENLOCK_ENABLE')
    assertOnOffEnum(genlockEnable, `SYSTEM_GENLOCK_ENABLE (${modelId})`)
    const serialMode = boot.catalog.byLabel.get('SYSTEM_SERIAL_MODE')
    assertOnOffEnum(serialMode, `SYSTEM_SERIAL_MODE (${modelId})`)
    const analogLevel = boot.catalog.byLabel.get('SYSTEM_AUDIO_ANALOG_LEVEL')
    assertOnOffEnum(analogLevel, `SYSTEM_AUDIO_ANALOG_LEVEL (${modelId})`)
    const transpMenus = boot.catalog.byLabel.get('SYSTEM_PREF_TRANSP_MENUS')
    assertOnOffEnum(transpMenus, `SYSTEM_PREF_TRANSP_MENUS (${modelId})`)
    const smallMenus = boot.catalog.byLabel.get('SYSTEM_PREF_SMALL_MENUS')
    assertOnOffEnum(smallMenus, `SYSTEM_PREF_SMALL_MENUS (${modelId})`)
    const gpiEnable = boot.catalog.byLabel.get('OUTPUT_GPI_OUT_ENABLE')
    if (gpiEnable) assertOnOffEnum(gpiEnable, `OUTPUT_GPI_OUT_ENABLE (${modelId})`)

    for (const n of [1, 2, 3, 4, 5, 6]) {
      const sdiAudio = boot.catalog.byLabel.get(`AUDIO_SDI${n}_ENABLE`)
      if (sdiAudio) assertOnOffEnum(sdiAudio, `AUDIO_SDI${n}_ENABLE (${modelId})`)
    }
    for (const n of [1, 2, 3]) {
      const hdmiAudio = boot.catalog.byLabel.get(`AUDIO_HDMI${n}_ENABLE`)
      if (hdmiAudio) assertOnOffEnum(hdmiAudio, `AUDIO_HDMI${n}_ENABLE (${modelId})`)
    }

    const dsk1Keyer = boot.catalog.byLabel.get('SWITCHER_DSK1_KEYER_ON')
    if (dsk1Keyer) assertOnOffEnum(dsk1Keyer, `SWITCHER_DSK1_KEYER_ON (${modelId})`)
    const dsk2Keyer = boot.catalog.byLabel.get('SWITCHER_DSK2_KEYER_ON')
    if (dsk2Keyer) assertOnOffEnum(dsk2Keyer, `SWITCHER_DSK2_KEYER_ON (${modelId})`)
    const dsk1Invert = boot.catalog.byLabel.get('SWITCHER_DSK1_LINEAR_KEY_INVERT')
    if (dsk1Invert) assertOnOffEnum(dsk1Invert, `SWITCHER_DSK1_LINEAR_KEY_INVERT (${modelId})`)
    const dsk2Invert = boot.catalog.byLabel.get('SWITCHER_DSK2_LINEAR_KEY_INVERT')
    if (dsk2Invert) assertOnOffEnum(dsk2Invert, `SWITCHER_DSK2_LINEAR_KEY_INVERT (${modelId})`)

    for (const n of [1, 2, 3, 4]) {
      const keyer = boot.catalog.byLabel.get(`SWITCHER_KEY${n}_KEYER_ON`)
      if (keyer) assertOnOffEnum(keyer, `SWITCHER_KEY${n}_KEYER_ON (${modelId})`)

      const chroma = boot.catalog.byLabel.get(`SWITCHER_KEY${n}_CHROMA_ENABLE`)
      if (chroma) assertOnOffEnum(chroma, `SWITCHER_KEY${n}_CHROMA_ENABLE (${modelId})`)

      const mask = boot.catalog.byLabel.get(`SWITCHER_KEY${n}_MASK_ENABLE`)
      if (mask) assertOnOffEnum(mask, `SWITCHER_KEY${n}_MASK_ENABLE (${modelId})`)

      const invert = boot.catalog.byLabel.get(`SWITCHER_KEY${n}_LINEAR_KEY_INVERT`)
      if (invert) assertOnOffEnum(invert, `SWITCHER_KEY${n}_LINEAR_KEY_INVERT (${modelId})`)
    }
  }
}

run()
console.log('manual-binary-enums test passed')
