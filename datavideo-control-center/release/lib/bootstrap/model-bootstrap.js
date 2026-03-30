const fs = require('fs');
const path = require('path');

function loadCompanionAsset(fileName) {
  const candidates = [
    path.resolve(__dirname, '../../docs/external', fileName),
    path.resolve(process.cwd(), 'docs', 'external', fileName),
  ];

  const loadErrors = [];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      return require(candidate);
    } catch (err) {
      loadErrors.push(`${candidate}: ${err.message}`);
    }
  }

  const message = loadErrors.length
    ? `Cannot load ${fileName}. Tried: ${candidates.join(', ')}. Errors: ${loadErrors.join(' | ')}`
    : `Cannot load ${fileName}. Tried: ${candidates.join(', ')}`;
  throw new Error(message);
}

const protocol3200 = loadCompanionAsset('protocol_3200.js');
const protocolCommon = loadCompanionAsset('protocol_common.js');
const choices = loadCompanionAsset('choices.js');

const { detectModelFromState } = require('../model-detect');
const {
  normalizeModelId,
  getModelProfile,
  getModelList,
  resolveSectionSources,
  isControlVisibleForModel,
} = require('../model-registry');

const ALLOWED_ENUM_SOURCES = new Set(['protocol', 'choices', 'manual', 'inferred']);

function normalizeEnumSource(source, fallback = null) {
  const s = String(source || '').toLowerCase();
  if (ALLOWED_ENUM_SOURCES.has(s)) return s;
  if (fallback === null) return null;
  const fb = String(fallback || '').toLowerCase();
  return ALLOWED_ENUM_SOURCES.has(fb) ? fb : null;
}

function createCatalog(modelProfile) {
  const allSections = resolveSectionSources(modelProfile, protocol3200, protocolCommon);

  const byLabel = new Map();
  const sectionMap = new Map();
  for (const section of allSections) {
    if (!section || !Array.isArray(section.controls)) continue;
    const effectiveSectionId = Number.isInteger(section.mainSection) ? section.mainSection : section.id;
    const effectiveSubSection = Number.isInteger(section.mainSection) ? (section.subSection || 0) : 0;
    const sectionKey = `${effectiveSectionId}:${effectiveSubSection}`;

    if (!sectionMap.has(sectionKey)) {
      sectionMap.set(sectionKey, {
        id: effectiveSectionId,
        label: section.label,
        mainSection: effectiveSectionId,
        subSection: effectiveSubSection,
        controls: [],
      });
    }

    const dest = sectionMap.get(sectionKey);
    for (const control of section.controls) {
      if (!control || typeof control.id !== 'number' || !control.label) continue;
      if (!isControlVisibleForModel(modelProfile, dest, control)) continue;
      const full = {
        sectionId: dest.id,
        sectionLabel: dest.label,
        subSectionId: dest.subSection || 0,
        controlId: control.id,
        label: control.label,
        type: control.type || 'int',
        values: control.values || null,
        enumSource: normalizeEnumSource(
          (Array.isArray(control.values) && control.values.length > 0) ? 'protocol' : null,
          null,
        ),
      };

      const existingByLabel = byLabel.get(full.label);
      if (!existingByLabel) {
        byLabel.set(full.label, full);
      } else {
        if ((!Array.isArray(existingByLabel.values) || existingByLabel.values.length === 0)
          && Array.isArray(full.values)
          && full.values.length > 0) {
          existingByLabel.values = full.values;
          existingByLabel.enumSource = normalizeEnumSource(existingByLabel.enumSource || full.enumSource, null);
        }
        if ((!existingByLabel.type || existingByLabel.type === 'int') && full.type && full.type !== 'int') {
          existingByLabel.type = full.type;
        }
      }

      const existingControl = dest.controls.find((x) => x.id === full.controlId);
      if (!existingControl) {
        dest.controls.push({
          id: full.controlId,
          label: full.label,
          type: full.type,
          values: full.values,
          enumSource: normalizeEnumSource(full.enumSource, null),
        });
      } else {
        if (!existingControl.label && full.label) existingControl.label = full.label;
        if ((!Array.isArray(existingControl.values) || existingControl.values.length === 0)
          && Array.isArray(full.values)
          && full.values.length > 0) {
          existingControl.values = full.values;
          existingControl.enumSource = normalizeEnumSource(existingControl.enumSource || full.enumSource, null);
        }
        if ((!existingControl.type || existingControl.type === 'int') && full.type && full.type !== 'int') {
          existingControl.type = full.type;
        }
      }
    }
  }

  // Normalize enumSource after label-level merge:
  // ensure every enum entry in byLabel has a valid source, using section-level
  // controls as fallback when byLabel source is missing.
  const sourcesByLabel = new Map();
  for (const section of sectionMap.values()) {
    for (const control of (section.controls || [])) {
      if (!control || !control.label) continue;
      if (!Array.isArray(control.values) || control.values.length === 0) continue;
      if (!sourcesByLabel.has(control.label)) sourcesByLabel.set(control.label, []);
      const src = normalizeEnumSource(control.enumSource, null);
      if (src) sourcesByLabel.get(control.label).push(src);
    }
  }
  for (const [label, entry] of byLabel.entries()) {
    if (!entry || !Array.isArray(entry.values) || entry.values.length === 0) continue;
    const candidates = sourcesByLabel.get(label) || [];
    const preferred = ['protocol', 'choices', 'manual', 'inferred'];
    let fallback = null;
    for (const p of preferred) {
      if (candidates.includes(p)) {
        fallback = p;
        break;
      }
    }
    entry.enumSource = normalizeEnumSource(entry.enumSource, fallback || 'inferred');
  }

  // Keep section-level enumSource aligned with the canonical byLabel view.
  for (const section of sectionMap.values()) {
    for (const control of (section.controls || [])) {
      if (!control || !control.label) continue;
      if (!Array.isArray(control.values) || control.values.length === 0) continue;
      const byLabelEntry = byLabel.get(control.label);
      const canonical = normalizeEnumSource(byLabelEntry && byLabelEntry.enumSource, 'inferred');
      control.enumSource = canonical;
    }
  }

  return {
    byLabel,
    sections: [...sectionMap.values()].sort((a, b) => a.id - b.id),
  };
}

function coerceChoiceValues(items) {
  const out = [];
  const seenIds = new Set();
  for (const item of (items || [])) {
    const id = Number(item && item.id);
    const label = String((item && item.label) || '');
    if (!Number.isFinite(id)) continue;
    if (!label) continue;
    if (/\[release\]/i.test(label)) continue;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    out.push({ id, label });
  }
  return out;
}

function enrichCatalogChoices(catalog, modelProfile) {
  const sectionControlsByLabel = new Map();
  for (const section of catalog.sections || []) {
    for (const control of section.controls || []) {
      if (!control || !control.label) continue;
      if (!sectionControlsByLabel.has(control.label)) sectionControlsByLabel.set(control.label, []);
      sectionControlsByLabel.get(control.label).push(control);
    }
  }

  function setChoiceValues(label, items, source = 'choices') {
    const values = coerceChoiceValues(items);
    if (!values.length) return;
    const sourceNorm = normalizeEnumSource(source, 'inferred');

    const byLabel = catalog.byLabel.get(label);
    if (byLabel && (!Array.isArray(byLabel.values) || byLabel.values.length === 0)) {
      byLabel.values = values;
      byLabel.enumSource = sourceNorm;
    }

    for (const ctrl of (sectionControlsByLabel.get(label) || [])) {
      if (!Array.isArray(ctrl.values) || ctrl.values.length === 0) {
        ctrl.values = values;
        ctrl.enumSource = sourceNorm;
      }
    }
  }

  function fillMissingFlagEnums() {
    const flagValues = [
      { id: 0, label: 'OFF' },
      { id: 1, label: 'ON' },
    ];
    for (const [label, byLabel] of (catalog.byLabel || new Map()).entries()) {
      if (!byLabel) continue;
      const type = String(byLabel.type || '').toLowerCase();
      if (type !== 'flag') continue;
      if (Array.isArray(byLabel.values) && byLabel.values.length > 0) continue;
      setChoiceValues(label, flagValues, 'manual');
    }
  }

  function alignEnumSources() {
    for (const section of (catalog.sections || [])) {
      for (const control of (section.controls || [])) {
        if (!control || !control.label) continue;
        if (!Array.isArray(control.values) || control.values.length === 0) continue;
        const byLabel = catalog.byLabel && catalog.byLabel.get ? catalog.byLabel.get(control.label) : null;
        const canonical = normalizeEnumSource(byLabel && byLabel.enumSource, null)
          || normalizeEnumSource(control.enumSource, 'inferred');
        control.enumSource = canonical;
        if (byLabel && Array.isArray(byLabel.values) && byLabel.values.length > 0) {
          byLabel.enumSource = canonical;
        }
      }
    }
  }

  function firstNonEmptyChoice(list) {
    for (const item of (list || [])) {
      if (Array.isArray(item) && item.length > 0) return item;
    }
    return null;
  }

  const modelId = String(modelProfile?.id || 'auto');
  const modelChoices = {
    genericSource: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_KEY1_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_KEY1_1200 : null,
      (modelId === 'se700' || modelId === 'se650') ? choices.CHOICES_SWITCH_KEY1_700 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_PGM_2200 : null,
      choices.CHOICES_SWITCH_KEY1_3200,
    ]),
    pgm: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_PGM_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_PGM_1200 : null,
      (modelId === 'se700' || modelId === 'se650') ? choices.CHOICES_SWITCH_PGM_700 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_PGM_2200 : null,
      choices.CHOICES_SWITCH_PGM_3200,
    ]),
    pvw: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_PVW_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_PVW_1200 : null,
      (modelId === 'se700' || modelId === 'se650') ? choices.CHOICES_SWITCH_PVW_700 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_PVW_2200 : null,
      choices.CHOICES_SWITCH_PVW_3200,
    ]),
    key1: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_KEY1_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_KEY1_1200 : null,
      (modelId === 'se700' || modelId === 'se650') ? choices.CHOICES_SWITCH_KEY1_700 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_PGM_2200 : null,
      choices.CHOICES_SWITCH_KEY1_3200,
    ]),
    key2: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_KEY2_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_KEY2_1200 : null,
      modelId === 'se700' ? choices.CHOICES_SWITCH_KEY1_700 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_PGM_2200 : null,
      choices.CHOICES_SWITCH_KEY2_3200,
    ]),
    key3: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_KEY3_3200 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_PGM_2200 : null,
      choices.CHOICES_SWITCH_KEY3_3200,
    ]),
    key4: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_KEY4_3200 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_PGM_2200 : null,
      choices.CHOICES_SWITCH_KEY4_3200,
    ]),
    dsk1: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_DSK1_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_DSK1_1200 : null,
      (modelId === 'se700' || modelId === 'se650') ? choices.CHOICES_SWITCH_DSK1_700 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_PGM_2200 : null,
      choices.CHOICES_SWITCH_DSK1_3200,
    ]),
    dsk2: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_DSK2_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_DSK2_1200 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_PGM_2200 : null,
      choices.CHOICES_SWITCH_DSK2_3200,
    ]),
    aux1: modelId === 'se3200' ? choices.CHOICES_SWITCH_AUX1_3200 : null,
    aux2: modelId === 'se3200' ? choices.CHOICES_SWITCH_AUX2_3200 : null,
    aux3: modelId === 'se3200' ? choices.CHOICES_SWITCH_AUX3_3200 : null,
    aux4: modelId === 'se3200' ? choices.CHOICES_SWITCH_AUX4_3200 : null,
    hdmi1: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_HDMI1_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_HDMI1_1200 : null,
      modelId === 'se700' ? choices.CHOICES_SWITCH_HDMI1_700 : null,
      modelId === 'se650' ? choices.CHOICES_SWITCH_HDMI1_650 : null,
      modelId === 'se2200' ? choices.CHOICES_SWITCH_HDMI1_2200 : null,
      choices.CHOICES_SWITCH_HDMI1_3200,
    ]),
    hdmi2: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_HDMI2_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_HDMI1_1200 : null,
      modelId === 'se700' ? choices.CHOICES_SWITCH_HDMI1_700 : null,
      choices.CHOICES_SWITCH_HDMI2_3200,
    ]),
    hdmi3: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_HDMI3_3200 : null,
      choices.CHOICES_SWITCH_HDMI3_3200,
    ]),
    sdi1: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_SDI1_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_SDI1_1200 : null,
      modelId === 'se700' ? choices.CHOICES_SWITCH_SDI1_700 : null,
      modelId === 'se650' ? choices.CHOICES_SWITCH_SDI1_650 : null,
      choices.CHOICES_SWITCH_SDI1_3200,
    ]),
    sdi2: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SWITCH_SDI2_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SWITCH_SDI2_1200 : null,
      modelId === 'se700' ? choices.CHOICES_SWITCH_SDI2_700 : null,
      choices.CHOICES_SWITCH_SDI2_3200,
    ]),
    audioSource: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_AUDIO_SRC_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_AUDIO_SRC_1200 : null,
      modelId === 'se2200' ? choices.CHOICES_AUDIO_SRC_2200 : null,
      choices.CHOICES_AUDIO_SRC_3200,
    ]),
    wipePattern: firstNonEmptyChoice([
      modelId === 'se2200' ? choices.CHOICES_WIPE_2200 : null,
    ]),
    standard: firstNonEmptyChoice([
      modelId === 'se3200' ? choices.CHOICES_SET_STANDARD_3200 : null,
      modelId === 'se1200mu' ? choices.CHOICES_SET_STANDARD_1200 : null,
      choices.CHOICES_SET_STANDARD_3200,
    ]),
  };

  const sourceChoices = modelChoices.genericSource;
  const sourceLabels = [
    'SWITCHER_KEY1_KEY_SRC',
    'SWITCHER_KEY1_SPLIT_SRC',
    'SWITCHER_KEY2_KEY_SRC',
    'SWITCHER_KEY2_SPLIT_SRC',
    'SWITCHER_KEY3_KEY_SRC',
    'SWITCHER_KEY3_SPLIT_SRC',
    'SWITCHER_KEY4_KEY_SRC',
    'SWITCHER_KEY4_SPLIT_SRC',
    'SWITCHER_FLEX_SRC_BGND_SRC',
    'SWITCHER_FLEX_SRC_DVE1_SRC',
    'SWITCHER_FLEX_SRC_DVE2_SRC',
    'SWITCHER_FLEX_SRC_DVE3_SRC',
    'SWITCHER_FLEX_SRC_DVE4_SRC',
    'SWITCHER_FLEX_SRC_FGND_SRC',
    'OUTPUT_MULTIVIEWER_MAIN1_SRC',
    'OUTPUT_MULTIVIEWER_MAIN2_SRC',
  ];
  for (const label of sourceLabels) setChoiceValues(label, sourceChoices);

  setChoiceValues('SWITCHER_PGM_SRC', modelChoices.pgm);
  setChoiceValues('SWITCHER_PST_SRC', modelChoices.pvw);

  setChoiceValues('SWITCHER_KEY1_KEY_SRC', modelChoices.key1);
  setChoiceValues('SWITCHER_KEY1_SPLIT_SRC', modelChoices.key1);
  setChoiceValues('SWITCHER_KEY2_KEY_SRC', modelChoices.key2);
  setChoiceValues('SWITCHER_KEY2_SPLIT_SRC', modelChoices.key2);
  setChoiceValues('SWITCHER_KEY3_KEY_SRC', modelChoices.key3);
  setChoiceValues('SWITCHER_KEY3_SPLIT_SRC', modelChoices.key3);
  setChoiceValues('SWITCHER_KEY4_KEY_SRC', modelChoices.key4);
  setChoiceValues('SWITCHER_KEY4_SPLIT_SRC', modelChoices.key4);

  setChoiceValues('SWITCHER_DSK1_KEY_SRC', modelChoices.dsk1);
  setChoiceValues('SWITCHER_DSK1_SPLIT_SRC', modelChoices.dsk1);
  setChoiceValues('SWITCHER_DSK2_KEY_SRC', modelChoices.dsk2);
  setChoiceValues('SWITCHER_DSK2_SPLIT_SRC', modelChoices.dsk2);

  setChoiceValues('OUTPUT_AUX_CTRL_AUX1_SRC', modelChoices.aux1);
  setChoiceValues('OUTPUT_AUX_CTRL_AUX2_SRC', modelChoices.aux2);
  setChoiceValues('OUTPUT_AUX_CTRL_AUX3_SRC', modelChoices.aux3);
  setChoiceValues('OUTPUT_AUX_CTRL_AUX4_SRC', modelChoices.aux4);

  setChoiceValues('OUTPUT_HDMI1_OUT_SELECT', modelChoices.hdmi1);
  setChoiceValues('OUTPUT_DVI_OUT_SELECT', modelChoices.hdmi1);
  setChoiceValues('OUTPUT_HDMI2_OUT_SELECT', modelChoices.hdmi2);
  setChoiceValues('OUTPUT_HDMI3_OUT_SELECT', modelChoices.hdmi3);
  setChoiceValues('OUTPUT_SDI_OUT1_SELECT', modelChoices.sdi1);
  setChoiceValues('OUTPUT_SDI_OUT2_SELECT', modelChoices.sdi2);

  setChoiceValues('OUTPUT_MULTIVIEWER_MODE', [
    { id: 0, label: 'Default' },
    { id: 1, label: 'Picture In Picture' },
    { id: 2, label: 'Quad' },
    { id: 3, label: 'Program/Preview' },
  ], 'manual');

  setChoiceValues('SWITCHER_TRANS_TYPE', choices.CHOICES_TRANS_3200);
  setChoiceValues('ME_TRANS_TYPE', choices.CHOICES_TRANS_3200);
  setChoiceValues('DSK_TRANS_TYPE', choices.CHOICES_TRANS_3200);
  setChoiceValues('FTB_TRANS_TYPE', choices.CHOICES_TRANS_3200);

  setChoiceValues('AUDIO_SOURCE', modelChoices.audioSource);
  setChoiceValues('SWITCHER_WIPE_PATTERN_NUM', modelChoices.wipePattern);
  setChoiceValues('SYSTEM_STANDARD', modelChoices.standard);
  setChoiceValues('INPUT_STANDARD', modelChoices.standard);
  setChoiceValues('SYSTEM_NETWORK_IP_MODE', [
    { id: 0, label: 'STATIC' },
    { id: 1, label: 'DHCP' },
  ], 'manual');
  // SE-3200 manual: Menu mode is Basic/Advanced; observed defaults map 0->Basic, 1->Advanced.
  setChoiceValues('SYSTEM_PREF_MENU_MODE', [
    { id: 0, label: 'BASIC' },
    { id: 1, label: 'ADVANCED' },
  ], 'manual');
  // SE-3200 manual: Menu color options are Blue/Grey; observed defaults map 0->Blue, 1->Grey.
  setChoiceValues('SYSTEM_PREF_MENU_COLOUR', [
    { id: 0, label: 'BLUE' },
    { id: 1, label: 'GREY' },
  ], 'manual');
  // SE-3200 manual: GPI mode is Pulse/Level; observed defaults map 0->Pulse, 1->Level.
  setChoiceValues('OUTPUT_GPI_OUT_MODE', [
    { id: 0, label: 'PULSE' },
    { id: 1, label: 'LEVEL' },
  ], 'manual');
  setChoiceValues('INPUT_INPUT_MODE', [
    { id: 0, label: 'INPUT_LIVE' },
    { id: 1, label: 'INPUT_FROZEN' },
    { id: 2, label: 'INPUT_STILL' },
    { id: 3, label: 'INPUT_CLIP' },
  ], 'manual');
  setChoiceValues('INPUT_INPUT_FREEZE_MODE', [
    { id: 0, label: 'INPUT_LIVE' },
    { id: 1, label: 'INPUT_FROZEN' },
    { id: 2, label: 'INPUT_STILL' },
    { id: 3, label: 'INPUT_CLIP' },
  ], 'manual');
  setChoiceValues('INPUT_INPUT_FRAME_MODE', [
    { id: 0, label: 'FRAME_MODE' },
    { id: 1, label: 'FIELD_MODE' },
  ], 'manual');
  setChoiceValues('OUTPUT_MULTIVIEWER_TRANSP_LABELS', [
    { id: 0, label: 'OFF' },
    { id: 1, label: 'ON' },
  ], 'manual');
  setChoiceValues('OUTPUT_MULTIVIEWER_AUTO_NUM', [
    { id: 0, label: 'OFF' },
    { id: 1, label: 'ON' },
  ], 'manual');
  setChoiceValues('OUTPUT_MULTIVIEWER_LABEL_INFO', [
    { id: 0, label: 'OFF' },
    { id: 1, label: 'ON' },
  ], 'manual');

  const linearKeyModeChoices = [
    { id: 0, label: 'LUMA' },
    { id: 1, label: 'LINEAR' },
  ];
  const linearKeySelModeChoices = [
    { id: 0, label: 'SELF_KEY' },
    { id: 1, label: 'SPLIT' },
    { id: 2, label: 'PIP' },
  ];
  const linearKeyFillModeChoices = [
    { id: 0, label: 'VIDEO_FILL' },
    { id: 1, label: 'MATTE' },
  ];
  for (const n of [1, 2, 3, 4]) {
    setChoiceValues(`SWITCHER_KEY${n}_LINEAR_KEY_MODE`, linearKeyModeChoices, 'manual');
    setChoiceValues(`SWITCHER_KEY${n}_LINEAR_KEY_SEL_MODE`, linearKeySelModeChoices, 'manual');
    setChoiceValues(`SWITCHER_KEY${n}_LINEAR_KEY_FILL_MODE`, linearKeyFillModeChoices, 'manual');
  }
  for (const n of [1, 2]) {
    setChoiceValues(`SWITCHER_DSK${n}_LINEAR_KEY_MODE`, linearKeyModeChoices, 'manual');
    setChoiceValues(`SWITCHER_DSK${n}_LINEAR_KEY_SEL_MODE`, linearKeySelModeChoices, 'manual');
    setChoiceValues(`SWITCHER_DSK${n}_LINEAR_KEY_FILL_MODE`, linearKeyFillModeChoices, 'manual');
  }

  const onOffChoices = [
    { id: 0, label: 'OFF' },
    { id: 1, label: 'ON' },
  ];
  setChoiceValues('SYSTEM_AUTO_SAVE_ENABLE', onOffChoices, 'manual');
  setChoiceValues('SYSTEM_ASPECT', onOffChoices, 'manual');
  setChoiceValues('SYSTEM_GENLOCK_ENABLE', onOffChoices, 'manual');
  setChoiceValues('SYSTEM_SERIAL_MODE', onOffChoices, 'manual');
  setChoiceValues('SYSTEM_AUDIO_ANALOG_LEVEL', onOffChoices, 'manual');
  setChoiceValues('SYSTEM_PREF_TRANSP_MENUS', onOffChoices, 'manual');
  setChoiceValues('SYSTEM_PREF_SMALL_MENUS', onOffChoices, 'manual');
  setChoiceValues('OUTPUT_GPI_OUT_ENABLE', onOffChoices, 'manual');
  for (const n of [1, 2, 3, 4, 5, 6]) {
    setChoiceValues(`AUDIO_SDI${n}_ENABLE`, onOffChoices, 'manual');
  }
  for (const n of [1, 2, 3]) {
    setChoiceValues(`AUDIO_HDMI${n}_ENABLE`, onOffChoices, 'manual');
  }
  for (const n of [1, 2, 3, 4]) {
    setChoiceValues(`SWITCHER_KEY${n}_KEYER_ON`, onOffChoices, 'manual');
    setChoiceValues(`SWITCHER_KEY${n}_CHROMA_ENABLE`, onOffChoices, 'manual');
    setChoiceValues(`SWITCHER_KEY${n}_MASK_ENABLE`, onOffChoices, 'manual');
    setChoiceValues(`SWITCHER_KEY${n}_LINEAR_KEY_INVERT`, onOffChoices, 'manual');
  }
  setChoiceValues('SWITCHER_DSK1_KEYER_ON', onOffChoices, 'manual');
  setChoiceValues('SWITCHER_DSK2_KEYER_ON', onOffChoices, 'manual');
  setChoiceValues('SWITCHER_DSK1_LINEAR_KEY_INVERT', onOffChoices, 'manual');
  setChoiceValues('SWITCHER_DSK2_LINEAR_KEY_INVERT', onOffChoices, 'manual');

  const borderStyleChoices = [
    { id: 0, label: 'BORDER_OFF' },
    { id: 1, label: 'BORDER_NORMAL' },
    { id: 2, label: 'BORDER_SHADED' },
    { id: 3, label: 'BORDER_3D_BEVEL' },
    { id: 4, label: 'BORDER_3D_BEVEL_SHADED' },
    { id: 5, label: 'BORDER_3D_BEVEL2' },
    { id: 6, label: 'BORDER_3D_BEVEL_FLAT' },
    { id: 7, label: 'BORDER_3D_FLAT_BEVEL' },
    { id: 8, label: 'BORDER_3D_GLASS' },
    { id: 9, label: 'BORDER_3D_GLASS_SHADED' },
    { id: 10, label: 'BORDER_3D_GLASS2' },
    { id: 11, label: 'BORDER_3D_GLASS_FLAT' },
    { id: 12, label: 'BORDER_3D_FLAT_GLASS' },
  ];
  for (const n of [1, 2, 3, 4]) {
    setChoiceValues(`SWITCHER_PINP${n}_BORDER_STYLE`, borderStyleChoices, 'manual');
  }

  fillMissingFlagEnums();
  alignEnumSources();
}
function buildUiProfiles(catalog) {
  const resolve = (label) => catalog.byLabel.get(label) || null;
  const pip = [1, 2, 3, 4].map((n) => ({
    id: n,
    enable: resolve(`SWITCHER_PINP${n}_ENABLE`),
    x: resolve(`SWITCHER_PINP${n}_POSITION_X`),
    y: resolve(`SWITCHER_PINP${n}_POSITION_Y`),
    w: resolve(`SWITCHER_PINP${n}_SIZE_X`),
    h: resolve(`SWITCHER_PINP${n}_SIZE_Y`),
    cropL: resolve(`SWITCHER_PINP${n}_EDGE_LEFT`),
    cropR: resolve(`SWITCHER_PINP${n}_EDGE_RIGHT`),
    cropT: resolve(`SWITCHER_PINP${n}_EDGE_TOP`),
    cropB: resolve(`SWITCHER_PINP${n}_EDGE_BOTTOM`),
  }));

  const flexSource = {
    bg: resolve('SWITCHER_FLEX_SRC_BGND_SRC'),
    fg: resolve('SWITCHER_FLEX_SRC_FGND_SRC'),
    fgEnable: resolve('SWITCHER_FLEX_SRC_FGND_ENABLE'),
    dve1Src: resolve('SWITCHER_FLEX_SRC_DVE1_SRC'),
    dve2Src: resolve('SWITCHER_FLEX_SRC_DVE2_SRC'),
    dve3Src: resolve('SWITCHER_FLEX_SRC_DVE3_SRC'),
    dve4Src: resolve('SWITCHER_FLEX_SRC_DVE4_SRC'),
  };

  return { pip, flexSource };
}

function initModelBootstrap(opts = {}) {
  const requestedModelId = normalizeModelId(opts.requestedModelId || 'auto');
  const activeModel = getModelProfile(requestedModelId);
  const catalog = createCatalog(activeModel);
  enrichCatalogChoices(catalog, activeModel);
  const profiles = buildUiProfiles(catalog);

  let detectedModel = activeModel;
  let detection = {
    mode: activeModel.id === 'auto' ? 'auto' : 'manual',
    lastDetectedAt: null,
    result: null,
  };

  function refreshDetectedModel(state) {
    if (activeModel.id !== 'auto') {
      detectedModel = activeModel;
      detection = {
        mode: 'manual',
        lastDetectedAt: new Date().toISOString(),
        result: { modelId: activeModel.id, confidence: 1, reason: 'Model fixed by DV_MODEL env' },
      };
      return detection.result;
    }
    const result = detectModelFromState(state, activeModel.id);
    if (result && result.modelId) {
      detectedModel = getModelProfile(result.modelId) || getModelProfile('auto');
      detection = {
        mode: 'auto',
        lastDetectedAt: new Date().toISOString(),
        result,
      };
    }
    return result;
  }

  function getDetectedModel() {
    return detectedModel;
  }

  function getDetection() {
    return detection;
  }

  function getModelSelection() {
    return {
      requested: activeModel,
      detected: detectedModel,
      detection,
    };
  }

  function handleStateChanged(state) {
    const prev = detectedModel ? detectedModel.id : null;
    const next = refreshDetectedModel(state);
    const nextId = next && next.modelId ? next.modelId : prev;
    return !!(nextId && nextId !== prev);
  }

  return {
    activeModel,
    catalog,
    profiles,
    getModelList,
    refreshDetectedModel,
    getDetectedModel,
    getDetection,
    getModelSelection,
    handleStateChanged,
  };
}

module.exports = {
  initModelBootstrap,
};
