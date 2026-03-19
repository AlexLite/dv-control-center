const fs = require('fs');
const path = require('path');

function loadProtocol() {
  const localModule = path.join(__dirname, '..', '..', 'companion-module-datavideo-dvip-master', 'protocol_3200.js');
  const externalCopy = path.join(__dirname, '..', 'docs', 'external', 'protocol_3200.js');
  const target = fs.existsSync(localModule) ? localModule : externalCopy;
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const mod = require(target);
  return { target, mod };
}

function flattenRows(mod) {
  const rows = [];
  for (const section of mod.GET_SET_CMD_3200 || []) {
    for (const control of section.controls || []) {
      rows.push({
        sectionId: section.id,
        subSectionId: 0,
        controlId: control.id,
        label: control.label,
      });
    }
  }
  return rows;
}

function main() {
  const { target, mod } = loadProtocol();
  const rows = flattenRows(mod);
  const byLabel = new Map(rows.map((r) => [r.label, r]));

  const mustHave = [
    'SWITCHER_FLEX_SRC_BGND_SRC',
    'SWITCHER_FLEX_SRC_DVE1_SRC',
    'SWITCHER_FLEX_SRC_DVE2_SRC',
    'SWITCHER_FLEX_SRC_DVE3_SRC',
    'SWITCHER_FLEX_SRC_DVE4_SRC',
    'SWITCHER_FLEX_SRC_FGND_SRC',
    'SWITCHER_FLEX_SRC_FGND_ENABLE',
    'OUTPUT_MULTIVIEWER_MODE',
    'OUTPUT_MULTIVIEWER_MAIN1_SRC',
    'OUTPUT_MULTIVIEWER_MAIN2_SRC',
    'OUTPUT_MULTIVIEWER_TRANSP_LABELS',
    'OUTPUT_MULTIVIEWER_AUTO_NUM',
    'OUTPUT_MULTIVIEWER_LABEL_INFO',
    'MEMORY_SELECT',
    'MEMORY_COMMAND',
    'MEMORY_LOAD_ALL_SECTIONS',
  ];

  for (let i = 1; i <= 4; i += 1) {
    mustHave.push(
      `SWITCHER_PINP${i}_ENABLE`,
      `SWITCHER_PINP${i}_POSITION_X`,
      `SWITCHER_PINP${i}_POSITION_Y`,
      `SWITCHER_PINP${i}_SIZE_X`,
      `SWITCHER_PINP${i}_SIZE_Y`,
      `SWITCHER_PINP${i}_EDGE_LEFT`,
      `SWITCHER_PINP${i}_EDGE_RIGHT`,
      `SWITCHER_PINP${i}_EDGE_TOP`,
      `SWITCHER_PINP${i}_EDGE_BOTTOM`,
      `SWITCHER_PINP${i}_BORDER_STYLE`,
      `SWITCHER_PINP${i}_BORDER_OPACITY`,
      `SWITCHER_PINP${i}_BORDER_SIZE`,
    );
  }

  const missing = mustHave.filter((label) => !byLabel.has(label));
  const present = mustHave.filter((label) => byLabel.has(label));

  console.log(`Protocol source: ${target}`);
  console.log(`Total controls in GET_SET_CMD_3200: ${rows.length}`);
  console.log(`Must-have present: ${present.length}/${mustHave.length}`);
  if (missing.length) {
    console.log('Missing labels:');
    for (const label of missing) console.log(`- ${label}`);
  } else {
    console.log('Missing labels: none');
  }

  const sample = present.slice(0, 20).map((label) => byLabel.get(label));
  console.log('Sample map:');
  for (const item of sample) {
    console.log(`${item.sectionId}:${item.subSectionId}:${item.controlId} ${item.label}`);
  }
}

main();
