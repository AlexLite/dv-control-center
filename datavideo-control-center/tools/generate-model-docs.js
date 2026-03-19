const fs = require('fs');
const path = require('path');
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap');
const { MODEL_REGISTRY } = require('../lib/model-registry');

const modelIds = Object.keys(MODEL_REGISTRY).filter((id) => id !== 'auto');
const out = {};

for (const id of modelIds) {
  const boot = initModelBootstrap({ requestedModelId: id });
  const labels = [];
  const enums = {};
  const enumSources = {};
  const enumSourceCounts = {};
  const seenEnumLabels = new Set();
  for (const s of boot.catalog.sections || []) {
    for (const c of s.controls || []) {
      labels.push(c.label);
      if (Array.isArray(c.values) && c.values.length > 0) {
        enums[c.label] = c.values.map((v) => ({ id: Number(v.id), label: String(v.label) }));
        const source = String(c.enumSource || boot.catalog.byLabel.get(c.label)?.enumSource || 'inferred');
        enumSources[c.label] = source;
        if (!seenEnumLabels.has(c.label)) {
          enumSourceCounts[source] = (enumSourceCounts[source] || 0) + 1;
          seenEnumLabels.add(c.label);
        }
      }
    }
  }
  out[id] = {
    model: boot.activeModel,
    controlsCount: labels.length,
    uniqueLabelsCount: new Set(labels).size,
    enumControlsCount: Object.keys(enums).length,
    labels: Array.from(new Set(labels)).sort(),
    supports: boot.activeModel.supports || {},
    hiddenLabelPatterns: boot.activeModel.hiddenLabelPatterns || [],
    legacyDvip: !!boot.activeModel.legacyDvip,
    enumSources,
    enumSourceCounts,
    enums,
  };
}

const dataDir = path.join(__dirname, '..', 'data');
const docsDir = path.join(__dirname, '..', 'docs', 'generated');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

const jsonPath = path.join(dataDir, 'model-control-matrix.json');
fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2), 'utf8');

let md = '# Model Control Matrix\n\n';
md += 'Generated from current protocol + model filters.\n\n';
for (const id of modelIds) {
  const m = out[id];
  md += `## ${m.model.label} (${id})\n`;
  md += `- Controls: ${m.controlsCount} (${m.uniqueLabelsCount} unique)\n`;
  md += `- Enum controls: ${m.enumControlsCount}\n`;
  if (m.enumSourceCounts && Object.keys(m.enumSourceCounts).length > 0) {
    const parts = Object.entries(m.enumSourceCounts)
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([k, v]) => `${k}=${v}`);
    md += `- Enum sources: ${parts.join(', ')}\n`;
  }
  md += `- Supports: multiview=${m.supports.multiview !== false}, flex=${m.supports.flex !== false}, extendedPipBorder=${m.supports.extendedPipBorder !== false}\n`;
  md += `- Legacy DVIP: ${m.legacyDvip ? 'yes' : 'no'}\n`;
  if (Array.isArray(m.hiddenLabelPatterns) && m.hiddenLabelPatterns.length > 0) {
    md += `- Hidden patterns: ${m.hiddenLabelPatterns.join(', ')}\n`;
  }
  md += '\n';
}
md += '## Enum Coverage (top 120 labels)\n\n';
const unionEnums = new Map();
const unionEnumSources = new Map();
for (const id of modelIds) {
  for (const [label, values] of Object.entries(out[id].enums)) {
    if (!unionEnums.has(label)) unionEnums.set(label, values);
    const src = out[id].enumSources ? out[id].enumSources[label] : null;
    if (!unionEnumSources.has(label) && src) unionEnumSources.set(label, src);
  }
}
for (const label of Array.from(unionEnums.keys()).sort().slice(0, 120)) {
  const vals = unionEnums.get(label) || [];
  const short = vals.slice(0, 8).map((v) => `${v.id}:${v.label}`).join(', ');
  const src = unionEnumSources.get(label) || 'inferred';
  md += `- ${label} [${src}]: ${short}${vals.length > 8 ? ', ...' : ''}\n`;
}

const pinnedCoverageLabels = [
  'SWITCHER_DSK1_KEYER_ON',
  'SWITCHER_KEY1_SPLIT_SRC',
  'STATUS_SYSTEM_CONNECTION_STATUS',
];
for (const label of pinnedCoverageLabels) {
  if (!unionEnums.has(label)) continue;
  if (md.includes(`- ${label} [`)) continue;
  const vals = unionEnums.get(label) || [];
  const short = vals.slice(0, 8).map((v) => `${v.id}:${v.label}`).join(', ');
  const src = unionEnumSources.get(label) || 'inferred';
  md += `- ${label} [${src}]: ${short}${vals.length > 8 ? ', ...' : ''}\n`;
}

const mdPath = path.join(docsDir, 'MODEL_CONTROL_MATRIX.md');
fs.writeFileSync(mdPath, md, 'utf8');

console.log('written', jsonPath);
console.log('written', mdPath);
