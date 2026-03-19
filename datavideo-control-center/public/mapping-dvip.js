/* Primary mapping module (DVIP) */
/* global window */
(function initDvipMapping(global) {
  const FLEX_BASE = { 1: 0, 2: 37, 3: 74, 4: 111 };
  const KEY_BASE = { 1: 0, 2: 37, 3: 74, 4: 111 };
  const DVE_MAP = { en: 0, x: 1, y: 2, w: 7, h: 7, cl: 9, cr: 10, ct: 11, cb: 12 };

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, Number(n)));
  }

  function controlValue(state, label, fallback) {
    const v = state?.values ? state.values[label] : undefined;
    return v === undefined ? fallback : v;
  }

  function controlValueById(state, sectionId, subSectionId, controlId, fallback) {
    const key = `${sectionId}:${subSectionId}:${controlId}`;
    const v = state?.stateById ? state.stateById[key] : undefined;
    return v === undefined ? fallback : v;
  }

  function rawPosToPct(v) {
    return clamp((Math.abs(Number(v)) < 0.0001 ? 0 : Number(v)) * 100, -100, 100);
  }

  function pctToRawPos(v, maxAbs) {
    return clamp(Number(v) / 100, -maxAbs, maxAbs);
  }

  function rawScaleToPct(v) {
    return clamp((Math.abs(Number(v)) < 0.0001 ? 0 : Number(v)) * 100, 0, 100);
  }

  function pctToRawScale(v, maxAbs) {
    return clamp(Number(v) / 100, 0, maxAbs);
  }

  function flexControlId(n, kind) {
    const b = FLEX_BASE[n] || 0;
    return b + DVE_MAP[kind];
  }

  function flexRawId(n, offset) {
    return (FLEX_BASE[n] || 0) + offset;
  }

  function keyControlId(n, kind) {
    const b = KEY_BASE[n] || 0;
    return b + DVE_MAP[kind];
  }

  function keyRawId(n, offset) {
    return (KEY_BASE[n] || 0) + offset;
  }

  global.DVIPMapping = {
    controlValue,
    controlValueById,
    rawPosToPct,
    pctToRawPos,
    rawScaleToPct,
    pctToRawScale,
    flexControlId,
    flexRawId,
    keyControlId,
    keyRawId,
  };
  // Backward compatibility for tests/integrations loading this file directly.
  if (!global.SE3200Mapping) global.SE3200Mapping = global.DVIPMapping;
}(window));
