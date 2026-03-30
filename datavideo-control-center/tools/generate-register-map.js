const fs = require('fs');
const path = require('path');

function requireMaybe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(filePath);
}

function loadProtocolSources() {
  const root = path.join(__dirname, '..');
  const externalBase = path.join(root, 'docs', 'external');

  const protocol3200 = requireMaybe(path.join(externalBase, 'protocol_3200.js'));
  const protocolCommon = requireMaybe(path.join(externalBase, 'protocol_common.js'));

  if (!protocol3200) throw new Error('protocol_3200.js not found in docs/external');
  if (!protocolCommon) throw new Error('protocol_common.js not found in docs/external');

  return { protocol3200, protocolCommon };
}

function flattenSectionControls(sections, sourceName) {
  const rows = [];
  for (const section of sections || []) {
    if (!section || !Array.isArray(section.controls)) continue;

    const effectiveSectionId = Number.isInteger(section.mainSection) ? section.mainSection : section.id;
    const effectiveSubSection = Number.isInteger(section.mainSection) ? (section.subSection || 0) : 0;

    for (const control of section.controls) {
      if (!control || typeof control.id !== 'number' || !control.label) continue;
      rows.push({
        sectionId: effectiveSectionId,
        subSectionId: effectiveSubSection,
        controlId: control.id,
        label: control.label,
        type: control.type || 'int',
        values: Array.isArray(control.values) ? control.values : null,
        enumSource: Array.isArray(control.values) && control.values.length > 0 ? 'protocol' : null,
        source: sourceName,
      });
    }
  }
  return rows;
}

function dedupeByLabel(rows) {
  const out = [];
  const byLabel = new Map();
  for (const row of rows) {
    if (!byLabel.has(row.label)) {
      byLabel.set(row.label, row);
      out.push(row);
      continue;
    }
    const prev = byLabel.get(row.label);
    // Keep 3200-specific mapping when duplicate labels exist.
    if (prev.source !== 'protocol_3200' && row.source === 'protocol_3200') {
      byLabel.set(row.label, row);
      const idx = out.findIndex((x) => x.label === row.label);
      if (idx >= 0) out[idx] = row;
    }
  }
  return out;
}

function buildOutput(rows) {
  const byKey = {};
  const byLabel = {};
  const sections = {};

  for (const r of rows) {
    const key = `${r.sectionId}:${r.subSectionId}:${r.controlId}`;
    byKey[key] = {
      label: r.label,
      type: r.type,
      values: r.values,
      enumSource: r.enumSource || null,
      source: r.source,
    };
    byLabel[r.label] = {
      sectionId: r.sectionId,
      subSectionId: r.subSectionId,
      controlId: r.controlId,
      type: r.type,
      values: r.values,
      enumSource: r.enumSource || null,
      source: r.source,
    };

    const secKey = `${r.sectionId}:${r.subSectionId}`;
    if (!sections[secKey]) sections[secKey] = [];
    sections[secKey].push({
      controlId: r.controlId,
      label: r.label,
      type: r.type,
      enumSource: r.enumSource || null,
    });
  }

  for (const secKey of Object.keys(sections)) {
    sections[secKey].sort((a, b) => a.controlId - b.controlId);
  }

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    byKey,
    byLabel,
    sections,
  };
}

function main() {
  const { protocol3200, protocolCommon } = loadProtocolSources();
  const rows3200 = flattenSectionControls(protocol3200.GET_SET_CMD_3200, 'protocol_3200');
  const rowsCommon = flattenSectionControls(protocolCommon.GET_SET_CMD_COMMON, 'protocol_common');
  const rows = dedupeByLabel([...rows3200, ...rowsCommon]).sort((a, b) => {
    if (a.sectionId !== b.sectionId) return a.sectionId - b.sectionId;
    if (a.subSectionId !== b.subSectionId) return a.subSectionId - b.subSectionId;
    return a.controlId - b.controlId;
  });

  const outPath = path.join(__dirname, '..', 'data', 'register-map.full.json');

  let prevGeneratedAt = null;
  try {
    if (fs.existsSync(outPath)) {
      const rawPrev = fs.readFileSync(outPath, 'utf8');
      const parsedPrev = JSON.parse(rawPrev || '{}');
      if (parsedPrev && typeof parsedPrev === 'object' && parsedPrev.generatedAt) prevGeneratedAt = String(parsedPrev.generatedAt);
    }
  } catch (_) {
    prevGeneratedAt = null;
  }

  const output = buildOutput(rows);
  if (prevGeneratedAt) output.generatedAt = prevGeneratedAt;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Saved ${rows.length} controls to ${outPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  loadProtocolSources,
  flattenSectionControls,
  dedupeByLabel,
  buildOutput,
  main,
};
