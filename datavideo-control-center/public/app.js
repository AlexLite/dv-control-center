const state = (window.DVIPStateFactory && typeof window.DVIPStateFactory.createDefaultState === 'function')
  ? window.DVIPStateFactory.createDefaultState()
  : {
    catalog: null,
    controlsByLabel: new Map(),
    values: {},
    stateById: {},
    connection: {},
    model: null,
    modelSelection: null,
    pipWindows: {},
    editLocks: { pip: {}, flex: {} },
    editor: {
      pip: { dirty: false, baseline: null, history: [], future: [] },
      flex: { dirty: false, baseline: null, history: [], future: [] },
    },
  };

const constants = window.DVIPConstants || {};
const FLEX_WINDOW_COUNT = Number(constants.FLEX_WINDOW_COUNT || 4);
const POS_RAW_LIMIT = Number(constants.POS_RAW_LIMIT || 1);
const SCALE_RAW_MAX = Number(constants.SCALE_RAW_MAX || 1);
const SOURCE_CHOICES = Array.isArray(constants.SOURCE_CHOICES_DVIP) ? constants.SOURCE_CHOICES_DVIP : (Array.isArray(constants.SOURCE_CHOICES) ? constants.SOURCE_CHOICES : [
  { id: 0, label: 'Black' },
  { id: 1, label: 'In 1' },
  { id: 2, label: 'In 2' },
  { id: 3, label: 'In 3' },
  { id: 4, label: 'In 4' },
  { id: 5, label: 'In 5' },
  { id: 6, label: 'In 6' },
  { id: 7, label: 'In 7' },
  { id: 8, label: 'In 8' },
  { id: 9, label: 'In 9' },
  { id: 10, label: 'In 10' },
  { id: 11, label: 'In 11' },
  { id: 12, label: 'In 12' },
  { id: 17, label: 'Matte' },
  { id: 18, label: 'Bars' },
  { id: 19, label: 'Still 1' },
  { id: 20, label: 'Still 2' },
  { id: 21, label: 'Flex' },
]);
const QUAD_POSITIONS = constants.QUAD_POSITIONS || {
  1: { x: -0.5, y: 0.5 },
  2: { x: 0.5, y: 0.5 },
  3: { x: -0.5, y: -0.5 },
  4: { x: 0.5, y: -0.5 },
};
const FLEX_QUAD_POSITIONS = constants.FLEX_QUAD_POSITIONS || {
  1: { x: -0.5, y: 0.5 },
  2: { x: 0.5, y: 0.5 },
  3: { x: -0.5, y: -0.5 },
  4: { x: 0.5, y: -0.5 },
};
const sharedSource = (window.DVIPShared && typeof window.DVIPShared === 'object') ? window.DVIPShared : {};
const sharedFallback = {
  clamp: (n, min, max) => Math.min(max, Math.max(min, n)),
  rawPosToPct: (v) => {
    const n = Number(v);
    const z = Math.abs(n) < 0.0001 ? 0 : n;
    return Math.min(100, Math.max(-100, z * 100));
  },
  pctToRawPos: (v, maxAbs = 1) => Math.min(maxAbs, Math.max(-maxAbs, Number(v) / 100)),
  rawScaleToPct: (v) => {
    const n = Number(v);
    const z = Math.abs(n) < 0.0001 ? 0 : n;
    return Math.min(100, Math.max(0, z * 100));
  },
  pctToRawScale: (v, maxAbs = 1) => Math.min(maxAbs, Math.max(0, Number(v) / 100)),
  flexToCanvas: (x, y, w, h, cw, ch) => {
    const cx = ((x + 1) * 0.5) * cw;
    const cy = (0.5 - (y * 0.5)) * ch;
    const ww = w * cw;
    const hh = h * ch;
    return { x: cx - (ww * 0.5), y: cy - (hh * 0.5), w: ww, h: hh };
  },
  flexFromCanvasRect: null,
  getGuidePixelsFromList: (guidesList, cw, ch) => ({
    vertical: (guidesList?.v || []).map((pct) => (pct / 100) * cw),
    horizontal: (guidesList?.h || []).map((pct) => (pct / 100) * ch),
  }),
  snapRectGeneric: (left, top, right, bottom) => ({ left, top, right, bottom }),
};
const shared = {
  clamp: typeof sharedSource.clamp === 'function' ? sharedSource.clamp : sharedFallback.clamp,
  rawPosToPct: typeof sharedSource.rawPosToPct === 'function' ? sharedSource.rawPosToPct : sharedFallback.rawPosToPct,
  pctToRawPos: typeof sharedSource.pctToRawPos === 'function' ? sharedSource.pctToRawPos : sharedFallback.pctToRawPos,
  rawScaleToPct: typeof sharedSource.rawScaleToPct === 'function' ? sharedSource.rawScaleToPct : sharedFallback.rawScaleToPct,
  pctToRawScale: typeof sharedSource.pctToRawScale === 'function' ? sharedSource.pctToRawScale : sharedFallback.pctToRawScale,
  flexToCanvas: typeof sharedSource.flexToCanvas === 'function' ? sharedSource.flexToCanvas : sharedFallback.flexToCanvas,
  flexFromCanvasRect: typeof sharedSource.flexFromCanvasRect === 'function' ? sharedSource.flexFromCanvasRect : sharedFallback.flexFromCanvasRect,
  getGuidePixelsFromList: typeof sharedSource.getGuidePixelsFromList === 'function' ? sharedSource.getGuidePixelsFromList : sharedFallback.getGuidePixelsFromList,
  snapRectGeneric: typeof sharedSource.snapRectGeneric === 'function' ? sharedSource.snapRectGeneric : sharedFallback.snapRectGeneric,
};
const {
  clamp,
  rawPosToPct,
  pctToRawPos: pctToRawPosBase,
  rawScaleToPct,
  pctToRawScale: pctToRawScaleBase,
  flexToCanvas,
  flexFromCanvasRect: flexFromCanvasRectBase,
  getGuidePixelsFromList,
  snapRectGeneric,
} = shared;
const clampSafe = (...args) => (typeof clamp === 'function' ? clamp : sharedFallback.clamp)(...args);

function byId(id) {
  return document.getElementById(id);
}

function hideResetContextMenu() {
  if (window.DVIPUiCore && typeof window.DVIPUiCore.hideResetContextMenu === 'function') {
    return window.DVIPUiCore.hideResetContextMenu();
  }
}

function showResetContextMenu(clientX, clientY, onReset) {
  if (window.DVIPUiCore && typeof window.DVIPUiCore.showResetContextMenu === 'function') {
    return window.DVIPUiCore.showResetContextMenu(clientX, clientY, onReset);
  }
}

function cloneJson(v) {
  if (window.DVIPUiCore && typeof window.DVIPUiCore.cloneJson === 'function') {
    return window.DVIPUiCore.cloneJson(v);
  }
  return JSON.parse(JSON.stringify(v));
}

function syncCanvasResolution(id) {
  if (window.DVIPUiCore && typeof window.DVIPUiCore.syncCanvasResolution === 'function') {
    return window.DVIPUiCore.syncCanvasResolution(id);
  }
}

function exposeHooks() {
  if (window.DVIPEditorState && typeof window.DVIPEditorState.exposeHooks === 'function') {
    return window.DVIPEditorState.exposeHooks({
      state,
      byId,
      api,
      clamp: clampSafe,
      syncCanvasResolution,
      pickValues,
    });
  }
}

async function api(path, method = 'GET', body) {
  if (window.DVIPApiClient && typeof window.DVIPApiClient.request === 'function') {
    return window.DVIPApiClient.request(path, method, body);
  }
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json();
}

function setConnState() {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.setConnState === 'function') {
    return window.DVIPRuntimeHelpers.setConnState(state, byId);
  }
}

function setModelState() {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.setModelState === 'function') {
    return window.DVIPRuntimeHelpers.setModelState(state, byId);
  }
}

function controlValue(label, fallback = 0) {
  if (window.DVIPMapping && typeof window.DVIPMapping.controlValue === 'function') {
    return window.DVIPMapping.controlValue(state, label, fallback);
  }
  const v = state.values[label];
  return v === undefined ? fallback : v;
}

function controlValueById(sectionId, subSectionId, controlId, fallback = 0) {
  if (window.DVIPMapping && typeof window.DVIPMapping.controlValueById === 'function') {
    return window.DVIPMapping.controlValueById(state, sectionId, subSectionId, controlId, fallback);
  }
  const key = `${sectionId}:${subSectionId}:${controlId}`;
  const v = state.stateById[key];
  return v === undefined ? fallback : v;
}

function markEditLock(kind, index, ttlMs = 4000) {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.markEditLock === 'function') {
    return window.DVIPRuntimeHelpers.markEditLock(state, kind, index, ttlMs);
  }
}

function releaseEditLock(kind, index, delayMs = 1200) {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.releaseEditLock === 'function') {
    return window.DVIPRuntimeHelpers.releaseEditLock(state, kind, index, delayMs);
  }
}

function isEditLocked(kind, index) {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.isEditLocked === 'function') {
    return window.DVIPRuntimeHelpers.isEditLocked(state, kind, index);
  }
  return false;
}

function capturePipEditorState() {
  if (window.DVIPEditorState && typeof window.DVIPEditorState.capturePipEditorState === 'function') {
    return window.DVIPEditorState.capturePipEditorState({ byId });
  }
  return { windows: [] };
}

function restorePipEditorState(snapshot) {
  if (window.DVIPEditorState && typeof window.DVIPEditorState.restorePipEditorState === 'function') {
    return window.DVIPEditorState.restorePipEditorState({
      byId,
      updatePipBorderUi,
      normalizePipAspect,
      drawPipCanvas,
    }, snapshot);
  }
}

function captureFlexEditorState() {
  if (window.DVIPEditorState && typeof window.DVIPEditorState.captureFlexEditorState === 'function') {
    return window.DVIPEditorState.captureFlexEditorState({
      byId,
      FLEX_WINDOW_COUNT,
    });
  }
  return { windows: [] };
}

function restoreFlexEditorState(snapshot) {
  if (window.DVIPEditorState && typeof window.DVIPEditorState.restoreFlexEditorState === 'function') {
    return window.DVIPEditorState.restoreFlexEditorState({
      byId,
      FLEX_WINDOW_COUNT,
      normalizeFlexAspect,
      drawFlexCanvas,
    }, snapshot);
  }
}

function markEditorDirty(kind) {
  if (window.DVIPEditorState && typeof window.DVIPEditorState.markEditorDirty === 'function') {
    return window.DVIPEditorState.markEditorDirty({
      state,
      capturePipEditorState,
      captureFlexEditorState,
      cloneJson,
    }, kind);
  }
}

function pushEditorHistory(kind) {
  if (window.DVIPEditorState && typeof window.DVIPEditorState.pushEditorHistory === 'function') {
    return window.DVIPEditorState.pushEditorHistory({
      state,
      capturePipEditorState,
      captureFlexEditorState,
      cloneJson,
    }, kind);
  }
}

function rollbackEditor(kind) {
  if (window.DVIPEditorState && typeof window.DVIPEditorState.rollbackEditor === 'function') {
    return window.DVIPEditorState.rollbackEditor({
      state,
      restorePipEditorState,
      restoreFlexEditorState,
      cloneJson,
    }, kind);
  }
}

function commitEditor(kind) {
  if (window.DVIPEditorState && typeof window.DVIPEditorState.commitEditor === 'function') {
    return window.DVIPEditorState.commitEditor({
      state,
      capturePipEditorState,
      captureFlexEditorState,
      cloneJson,
    }, kind);
  }
}

async function sendControl(label, value) {
  if (window.DVIPTransportApi && typeof window.DVIPTransportApi.sendControl === 'function') {
    return window.DVIPTransportApi.sendControl({ api, state }, label, value);
  }
  await api('/api/control', 'POST', { label, value });
  state.values[label] = value;
}

async function sendRawControl(sectionId, subSectionId, controlId, type, value) {
  if (window.DVIPTransportApi && typeof window.DVIPTransportApi.sendRawControl === 'function') {
    return window.DVIPTransportApi.sendRawControl({ api }, sectionId, subSectionId, controlId, type, value);
  }
  await api('/api/control', 'POST', { sectionId, subSectionId, controlId, type, value });
}

function loadFlexEditorState() {
  if (window.DVIPEditorPersistence && typeof window.DVIPEditorPersistence.loadFlexEditorState === 'function') {
    return window.DVIPEditorPersistence.loadFlexEditorState({ state });
  }
}

function saveFlexEditorState() {
  if (window.DVIPEditorPersistence && typeof window.DVIPEditorPersistence.saveFlexEditorState === 'function') {
    return window.DVIPEditorPersistence.saveFlexEditorState({ state });
  }
}

function normalizeGuidesPayload(parsed) {
  if (window.DVIPEditorPersistence && typeof window.DVIPEditorPersistence.normalizeGuidesPayload === 'function') {
    return window.DVIPEditorPersistence.normalizeGuidesPayload(parsed);
  }
  return { v: [], h: [] };
}

function downloadJsonFile(filename, payload) {
  if (window.DVIPEditorPersistence && typeof window.DVIPEditorPersistence.downloadJsonFile === 'function') {
    return window.DVIPEditorPersistence.downloadJsonFile(filename, payload);
  }
}

function loadJsonFileFromDisk() {
  if (window.DVIPEditorPersistence && typeof window.DVIPEditorPersistence.loadJsonFileFromDisk === 'function') {
    return window.DVIPEditorPersistence.loadJsonFileFromDisk();
  }
  return Promise.resolve(null);
}

function initNumberWheelNudge() {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.initNumberWheelNudge === 'function') {
    return window.DVIPAppShell.initNumberWheelNudge({
      clamp: clampSafe,
    });
  }
}

function initSliderWheelNudge() {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.initSliderWheelNudge === 'function') {
    return window.DVIPAppShell.initSliderWheelNudge({
      clamp: clampSafe,
    });
  }
}

function initTabs() {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.initTabs === 'function') {
    return window.DVIPAppShell.initTabs({
      state,
      rollbackEditor,
      byId,
      drawPipCanvas,
      drawFlexCanvas,
    });
  }
}

function applyModelCapabilities() {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.applyModelCapabilities === 'function') {
    return window.DVIPAppShell.applyModelCapabilities({ state, byId, refreshRawControls: buildRawControls });
  }
}

function fillSelect(selectEl, values) {
  if (window.DVIPUiCore && typeof window.DVIPUiCore.fillSelect === 'function') {
    return window.DVIPUiCore.fillSelect(selectEl, values);
  }
}

function pickValues(label) {
  if (window.DVIPUiCore && typeof window.DVIPUiCore.pickValues === 'function') {
    return window.DVIPUiCore.pickValues(state, SOURCE_CHOICES, label);
  }
  return [];
}

function buildMultiview() {
  if (window.DVIPPanelsUi && typeof window.DVIPPanelsUi.buildMultiview === 'function') {
    return window.DVIPPanelsUi.buildMultiview({
      byId,
      fillSelect,
      pickValues,
      api,
    });
  }
}

function buildFlex() {
  if (window.DVIPPanelsUi && typeof window.DVIPPanelsUi.buildFlex === 'function') {
    return window.DVIPPanelsUi.buildFlex({
      byId,
      fillSelect,
      pickValues,
      markEditorDirty,
      pushEditorHistory,
      applyAllFlex,
    });
  }
}

function updateMemoryStatus() {
  if (window.DVIPPanelsUi && typeof window.DVIPPanelsUi.updateMemoryStatus === 'function') {
    return window.DVIPPanelsUi.updateMemoryStatus({
      byId,
      controlValue,
      pickValues,
    });
  }
}

function buildMemoryControls() {
  if (window.DVIPPanelsUi && typeof window.DVIPPanelsUi.buildMemoryControls === 'function') {
    return window.DVIPPanelsUi.buildMemoryControls({
      byId,
      controlValue,
      clamp: clampSafe,
      sendControl,
      api,
      pickValues,
    });
  }
}

function buildCameraNames() {
  if (window.DVIPPanelsUi && typeof window.DVIPPanelsUi.buildCameraNames === 'function') {
    return window.DVIPPanelsUi.buildCameraNames({
      byId,
      api,
    });
  }
}

function sliderNumberField(id, label, min, max, value, unit = '%') {
  const intVal = Math.round(Number(value) || 0);
  return `
    <label class="mini-label span2">
      <span>${label}</span>
      <div class="valctl">
        <input id="${id}-r" class="slider-sync" type="range" min="${min}" max="${max}" step="1" value="${intVal}" data-fine-step="0.01" data-default-value="${intVal}">
        <input id="${id}" class="num-sync" type="number" min="${min}" max="${max}" step="1" value="${intVal}" data-default-value="${intVal}">
        <span class="unit-suffix">${unit || ''}</span>
      </div>
    </label>
  `;
}

function bindSliderNumber(id, kind, index) {
  if (window.DVIPEditorUiUtils && typeof window.DVIPEditorUiUtils.bindSliderNumber === 'function') {
    return window.DVIPEditorUiUtils.bindSliderNumber({
      byId,
      pctToRawScale,
      markEditorDirty,
      markEditLock,
      drawPipCanvas,
      drawFlexCanvas,
      clamp: clampSafe,
      showResetContextMenu,
      pushEditorHistory,
    }, id, kind, index);
  }
}

function normalizeFineControls() {
  if (window.DVIPEditorUiUtils && typeof window.DVIPEditorUiUtils.normalizeFineControls === 'function') {
    return window.DVIPEditorUiUtils.normalizeFineControls();
  }
}

function initFineAdjustHotkey() {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.initFineAdjustHotkey === 'function') {
    return window.DVIPAppShell.initFineAdjustHotkey({
      normalizeFineControls,
    });
  }
}

function initUndoHotkey() {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.initUndoHotkey === 'function') {
    return window.DVIPAppShell.initUndoHotkey({
      undoEditor,
      redoEditor,
    });
  }
}

function isGuideSnapActive(kind) {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.isGuideSnapActive === 'function') {
    return window.DVIPAppShell.isGuideSnapActive({ state }, kind);
  }
  return false;
}

function updateGuideSnapUi(kind) {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.updateGuideSnapUi === 'function') {
    return window.DVIPAppShell.updateGuideSnapUi({ byId }, kind);
  }
}

function buildPipControls() {
  if (window.DVIPControlsUi && typeof window.DVIPControlsUi.buildPipControls === 'function') {
    return window.DVIPControlsUi.buildPipControls({
      byId,
      pickValues,
      fillSelect,
      state,
      getPipDefaultWindow,
      sliderNumberField,
      rawPosToPct,
      rawScaleToPct,
      bindSliderNumber,
      markEditorDirty,
      markEditLock,
      pushEditorHistory,
      pctToRawScale,
      drawPipCanvas,
      updatePipBorderUi,
      saveFlexEditorState,
      updateGuideSnapUi,
      renderPipGuidesList,
      downloadJsonFile,
      loadJsonFileFromDisk,
      normalizeGuidesPayload,
      applyAllPip,
      rollbackEditor,
      undoEditor,
      redoEditor,
    });
  }
}

function renderPipGuidesList() {
  if (window.DVIPControlsUi && typeof window.DVIPControlsUi.renderPipGuidesList === 'function') {
    return window.DVIPControlsUi.renderPipGuidesList({ byId, state });
  }
}

function updatePipBorderUi(i) {
  if (window.DVIPControlsUi && typeof window.DVIPControlsUi.updatePipBorderUi === 'function') {
    return window.DVIPControlsUi.updatePipBorderUi({ byId }, i);
  }
}

async function applyPip(n) {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.applyPip === 'function') {
    return window.DVIPControlActions.applyPip({
      markEditLock,
      byId,
      pctToRawPos,
      pctToRawScale,
      updatePipBorderUi,
      api,
      releaseEditLock,
    }, n);
  }
}

async function applyAllPip() {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.applyAllPip === 'function') {
    return window.DVIPControlActions.applyAllPip({
      byId,
      sendControl,
      commitEditor,
      applyPip,
    });
  }
}

function toCanvas(x, y, w, h, cw, ch) {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.toCanvas === 'function') {
    return window.DVIPRuntimeHelpers.toCanvas(x, y, w, h, cw, ch);
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

function pipFromCanvasRect(r, cw, ch) {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.pipFromCanvasRect === 'function') {
    return window.DVIPRuntimeHelpers.pipFromCanvasRect(r, cw, ch, POS_RAW_LIMIT, SCALE_RAW_MAX);
  }
  const cx = r.x + (r.w * 0.5);
  const cy = r.y + (r.h * 0.5);
  const rawX = ((cx / cw) * 2) - 1;
  const rawY = ((1 - (cy / ch)) * 2) - 1;
  const rawS = r.w / cw;
  return {
    x: Math.max(-POS_RAW_LIMIT, Math.min(POS_RAW_LIMIT, rawX)),
    y: Math.max(-POS_RAW_LIMIT, Math.min(POS_RAW_LIMIT, rawY)),
    w: Math.max(0, Math.min(SCALE_RAW_MAX, rawS)),
    h: Math.max(0, Math.min(SCALE_RAW_MAX, rawS)),
  };
}

function drawPipCanvas() {
  if (window.DVIPPipRenderer && typeof window.DVIPPipRenderer.drawPipCanvas === 'function') {
    return window.DVIPPipRenderer.drawPipCanvas({
      state,
      byId,
      toCanvas,
      pctToRawPos,
      pctToRawScale,
      getGuidePixelsFromList,
      clamp: clampSafe,
      normalizePipAspect,
      syncCanvasResolution,
    });
  }
}

function enablePipMouse() {
  if (window.DVIPPipEditor && typeof window.DVIPPipEditor.enablePipMouse === 'function') {
    return window.DVIPPipEditor.enablePipMouse({
      state,
      byId,
      toCanvas,
      pipFromCanvasRect,
      pctToRawPos,
      pctToRawScale,
      rawPosToPct,
      rawScaleToPct,
      markEditLock,
      markEditorDirty,
      pushEditorHistory,
      drawPipCanvas,
      getGuidePixelsFromList,
      saveFlexEditorState,
      renderPipGuidesList,
      snapRectGeneric,
      isGuideSnapActive,
      pickValues,
      clamp: clampSafe,
    });
  }
}

const FLEX_POS_MIN = Number(constants.FLEX_POS_MIN ?? -100);
const FLEX_POS_MAX = Number(constants.FLEX_POS_MAX ?? 100);
const FLEX_SIZE_MIN = Number(constants.FLEX_SIZE_MIN ?? 0);
const FLEX_SIZE_MAX = Number(constants.FLEX_SIZE_MAX ?? 100);

function pctToRawPos(v) {
  if (window.DVIPMapping && typeof window.DVIPMapping.pctToRawPos === 'function') {
    return window.DVIPMapping.pctToRawPos(v, POS_RAW_LIMIT);
  }
  return pctToRawPosBase ? pctToRawPosBase(v, POS_RAW_LIMIT) : Math.max(-POS_RAW_LIMIT, Math.min(POS_RAW_LIMIT, Number(v) / 100));
}

function pctToRawScale(v) {
  if (window.DVIPMapping && typeof window.DVIPMapping.pctToRawScale === 'function') {
    return window.DVIPMapping.pctToRawScale(v, SCALE_RAW_MAX);
  }
  return pctToRawScaleBase ? pctToRawScaleBase(v, SCALE_RAW_MAX) : Math.max(0, Math.min(SCALE_RAW_MAX, Number(v) / 100));
}

function flexControlId(n, kind) {
  if (window.DVIPMapping && typeof window.DVIPMapping.flexControlId === 'function') {
    return window.DVIPMapping.flexControlId(n, kind);
  }
  return 0;
}

function flexRawId(n, offset) {
  if (window.DVIPMapping && typeof window.DVIPMapping.flexRawId === 'function') {
    return window.DVIPMapping.flexRawId(n, offset);
  }
  return 0;
}

function keyControlId(n, kind) {
  if (window.DVIPMapping && typeof window.DVIPMapping.keyControlId === 'function') {
    return window.DVIPMapping.keyControlId(n, kind);
  }
  return 0;
}

function keyRawId(n, offset) {
  if (window.DVIPMapping && typeof window.DVIPMapping.keyRawId === 'function') {
    return window.DVIPMapping.keyRawId(n, offset);
  }
  return 0;
}

function getPipDefaultWindow(i) {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.getPipDefaultWindow === 'function') {
    return window.DVIPRuntimeHelpers.getPipDefaultWindow(QUAD_POSITIONS, i);
  }
  return { en: true, x: 0, y: 0, s: 0.96, cl: 0, cr: 0, ct: 0, cb: 0, bs: 1, bo: 100, bw: 2, bh: 60, bsa: 80, bl: 100 };
}

function getFlexDefaultWindow(i) {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.getFlexDefaultWindow === 'function') {
    return window.DVIPRuntimeHelpers.getFlexDefaultWindow(FLEX_QUAD_POSITIONS, i);
  }
  return { en: true, x: 0, y: 0, s: 0.48, cl: 0, cr: 0, ct: 0, cb: 0, bs: 1, bo: 100, bw: 2, bh: 60, bsa: 80, bl: 100 };
}

function setPipWindowInputs(i, v) {
  if (window.DVIPEditorUiUtils && typeof window.DVIPEditorUiUtils.setPipWindowInputs === 'function') {
    return window.DVIPEditorUiUtils.setPipWindowInputs({
      byId,
      rawPosToPct,
      rawScaleToPct,
      updatePipBorderUi,
    }, i, v);
  }
}

function setFlexWindowInputs(i, v) {
  if (window.DVIPEditorUiUtils && typeof window.DVIPEditorUiUtils.setFlexWindowInputs === 'function') {
    return window.DVIPEditorUiUtils.setFlexWindowInputs({
      byId,
      rawPosToPct,
      rawScaleToPct,
      updateFlexBorderUi,
    }, i, v);
  }
}

function setInputIfIdle(arg1, arg2, arg3, arg4) {
  const id = (arg1 && typeof arg1 === 'object') ? arg2 : arg1;
  const value = (arg1 && typeof arg1 === 'object') ? arg3 : arg2;
  const digits = (arg1 && typeof arg1 === 'object') ? arg4 : (arg3 ?? null);
  if (window.DVIPStateSyncUi && typeof window.DVIPStateSyncUi.setInputIfIdle === 'function') {
    return window.DVIPStateSyncUi.setInputIfIdle({ byId }, id, value, digits);
  }
}

function setCheckboxIfIdle(arg1, arg2, arg3) {
  const id = (arg1 && typeof arg1 === 'object') ? arg2 : arg1;
  const checked = (arg1 && typeof arg1 === 'object') ? arg3 : arg2;
  if (window.DVIPStateSyncUi && typeof window.DVIPStateSyncUi.setCheckboxIfIdle === 'function') {
    return window.DVIPStateSyncUi.setCheckboxIfIdle({ byId }, id, checked);
  }
}

function setSelectIfIdle(arg1, arg2, arg3) {
  const id = (arg1 && typeof arg1 === 'object') ? arg2 : arg1;
  const value = (arg1 && typeof arg1 === 'object') ? arg3 : arg2;
  if (window.DVIPStateSyncUi && typeof window.DVIPStateSyncUi.setSelectIfIdle === 'function') {
    return window.DVIPStateSyncUi.setSelectIfIdle({ byId }, id, value);
  }
}

function syncPipWindowFromState(arg1, arg2) {
  const i = Number.isInteger(arg2) ? arg2 : arg1;
  if (window.DVIPStateSyncUi && typeof window.DVIPStateSyncUi.syncPipWindowFromState === 'function') {
    return window.DVIPStateSyncUi.syncPipWindowFromState({
      state,
      isEditLocked,
      controlValueById,
      byId,
      keyControlId,
      keyRawId,
      setCheckboxIfIdle,
      setInputIfIdle,
      rawPosToPct,
      rawScaleToPct,
      updatePipBorderUi,
      controlValue,
      setSelectIfIdle,
    }, i);
  }
}

function syncFlexWindowFromState(arg1, arg2) {
  const i = Number.isInteger(arg2) ? arg2 : arg1;
  if (window.DVIPStateSyncUi && typeof window.DVIPStateSyncUi.syncFlexWindowFromState === 'function') {
    return window.DVIPStateSyncUi.syncFlexWindowFromState({
      state,
      isEditLocked,
      controlValueById,
      byId,
      flexControlId,
      flexRawId,
      setCheckboxIfIdle,
      setInputIfIdle,
      rawPosToPct,
      rawScaleToPct,
      updateFlexBorderUi,
      controlValue,
      setSelectIfIdle,
    }, i);
  }
}

function syncUiFromState() {
  if (window.DVIPStateSyncUi && typeof window.DVIPStateSyncUi.syncUiFromState === 'function') {
    const result = window.DVIPStateSyncUi.syncUiFromState({
      state,
      byId,
      controlValue,
      setSelectIfIdle,
      setCheckboxIfIdle,
      setInputIfIdle,
      syncPipWindowFromState,
      syncFlexWindowFromState,
      FLEX_WINDOW_COUNT,
      updateMemoryStatus,
      drawPipCanvas,
      drawFlexCanvas,
    });
    try { syncMenuControlValues(); } catch (_) {}
    return result;
  }
}
window.__DVIPSyncUiFromState = syncUiFromState;

let syncUiTimer = null;
function scheduleUiSync() {
  if (window.DVIPStateSyncUi && typeof window.DVIPStateSyncUi.scheduleUiSync === 'function') {
    return window.DVIPStateSyncUi.scheduleUiSync({
      syncUiTimerRef: {
        get value() { return syncUiTimer; },
        set value(v) { syncUiTimer = v; },
      },
      syncUiFromState,
    });
  }
}
function normalizePipAspect() {
  if (window.DVIPEditorUiUtils && typeof window.DVIPEditorUiUtils.normalizePipAspect === 'function') {
    return window.DVIPEditorUiUtils.normalizePipAspect({
      byId,
      clamp: clampSafe,
      SCALE_RAW_MAX,
      rawScaleToPct,
    });
  }
}

function normalizeFlexAspect() {
  if (window.DVIPEditorUiUtils && typeof window.DVIPEditorUiUtils.normalizeFlexAspect === 'function') {
    return window.DVIPEditorUiUtils.normalizeFlexAspect({
      byId,
      clamp: clampSafe,
      FLEX_WINDOW_COUNT,
      SCALE_RAW_MAX,
      rawScaleToPct,
    });
  }
}

function flexFromCanvasRect(r, cw, ch) {
  if (window.DVIPRuntimeHelpers && typeof window.DVIPRuntimeHelpers.flexFromCanvasRect === 'function') {
    return window.DVIPRuntimeHelpers.flexFromCanvasRect(r, cw, ch, POS_RAW_LIMIT, SCALE_RAW_MAX);
  }
  if (flexFromCanvasRectBase) return flexFromCanvasRectBase(r, cw, ch, POS_RAW_LIMIT, SCALE_RAW_MAX);
  return { x: 0, y: 0, w: 0, h: 0 };
}

function buildFlexWindowControls() {
  if (window.DVIPControlsUi && typeof window.DVIPControlsUi.buildFlexWindowControls === 'function') {
    return window.DVIPControlsUi.buildFlexWindowControls({
      byId,
      pickValues,
      fillSelect,
      state,
      FLEX_WINDOW_COUNT,
      getFlexDefaultWindow,
      sliderNumberField,
      rawPosToPct,
      rawScaleToPct,
      bindSliderNumber,
      markEditorDirty,
      markEditLock,
      pushEditorHistory,
      pctToRawScale,
      drawFlexCanvas,
      updateFlexBorderUi,
      saveFlexEditorState,
      updateGuideSnapUi,
      renderGuidesList,
      downloadJsonFile,
      loadJsonFileFromDisk,
      normalizeGuidesPayload,
      applyAllFlex,
      rollbackEditor,
      undoEditor,
      redoEditor,
      saveCurrentMergePreset: (mode, opts) => {
        if (window.DVIPMergeUi && typeof window.DVIPMergeUi.saveCurrentPreset === 'function') {
          return window.DVIPMergeUi.saveCurrentPreset(mode, opts);
        }
        return null;
      },
      FLEX_POS_MIN,
      FLEX_POS_MAX,
      FLEX_SIZE_MAX,
    });
  }
}

function renderGuidesList() {
  if (window.DVIPControlsUi && typeof window.DVIPControlsUi.renderGuidesList === 'function') {
    return window.DVIPControlsUi.renderGuidesList({ byId, state });
  }
}

function updateFlexBorderUi(i) {
  if (window.DVIPControlsUi && typeof window.DVIPControlsUi.updateFlexBorderUi === 'function') {
    return window.DVIPControlsUi.updateFlexBorderUi({ byId }, i);
  }
}

function saveFlexBanksState() {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.saveFlexBanksState === 'function') {
    return window.DVIPControlActions.saveFlexBanksState({ state });
  }
}

function loadFlexBanksState() {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.loadFlexBanksState === 'function') {
    return window.DVIPControlActions.loadFlexBanksState({ state });
  }
}

function captureCurrentFlexBankState() {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.captureCurrentFlexBankState === 'function') {
    return window.DVIPControlActions.captureCurrentFlexBankState({
      state,
      byId,
      FLEX_WINDOW_COUNT,
    });
  }
  return null;
}

function makeDefaultFlexBankState() {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.makeDefaultFlexBankState === 'function') {
    return window.DVIPControlActions.makeDefaultFlexBankState({
      byId,
      FLEX_WINDOW_COUNT,
      getFlexDefaultWindow,
    });
  }
  return null;
}

function applyFlexBankState(bank) {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.applyFlexBankState === 'function') {
    return window.DVIPControlActions.applyFlexBankState({
      state,
      byId,
      FLEX_WINDOW_COUNT,
      getFlexDefaultWindow,
      setFlexWindowInputs,
    }, bank);
  }
}

function updateFlexBankUi() {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.updateFlexBankUi === 'function') {
    return window.DVIPControlActions.updateFlexBankUi({ state, byId });
  }
}

function switchFlexBank(nextBank) {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.switchFlexBank === 'function') {
    return window.DVIPControlActions.switchFlexBank({
      state,
      drawFlexCanvas,
      captureCurrentFlexBankState,
      makeDefaultFlexBankState,
      applyFlexBankState,
      saveFlexBanksState,
      updateFlexBankUi,
    }, nextBank);
  }
}

function initFlexBanks() {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.initFlexBanks === 'function') {
    return window.DVIPControlActions.initFlexBanks({
      state,
      byId,
      loadFlexBanksState,
      makeDefaultFlexBankState,
      applyFlexBankState,
      updateFlexBankUi,
      switchFlexBank,
    });
  }
}

async function applyFlexWindow(i) {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.applyFlexWindow === 'function') {
    return window.DVIPControlActions.applyFlexWindow({
      state,
      markEditLock,
      byId,
      pctToRawPos,
      pctToRawScale,
      sendRawControl,
      flexControlId,
      flexRawId,
      releaseEditLock,
    }, i);
  }
}

async function applyAllFlex() {
  if (window.DVIPControlActions && typeof window.DVIPControlActions.applyAllFlex === 'function') {
    return window.DVIPControlActions.applyAllFlex({
      byId,
      sendControl,
      commitEditor,
      FLEX_WINDOW_COUNT,
      applyFlexWindow,
    });
  }
}

function undoEditor(kind) {
  const session = state.editor[kind];
  if (!session || session.history.length < 2) return;
  const current = cloneJson(session.history.pop());
  if (!Array.isArray(session.future)) session.future = [];
  session.future.push(current);
  const prev = cloneJson(session.history[session.history.length - 1]);
  if (kind === 'pip') restorePipEditorState(prev);
  else restoreFlexEditorState(prev);
  session.dirty = true;
}

function redoEditor(kind) {
  const session = state.editor[kind];
  if (!session || !Array.isArray(session.future) || session.future.length < 1) return;
  const next = cloneJson(session.future.pop());
  session.history.push(cloneJson(next));
  if (kind === 'pip') restorePipEditorState(next);
  else restoreFlexEditorState(next);
  session.dirty = true;
}

function drawFlexCanvas() {
  if (window.DVIPFlexRenderer && typeof window.DVIPFlexRenderer.drawFlexCanvas === 'function') {
    return window.DVIPFlexRenderer.drawFlexCanvas({
      state,
      byId,
      flexToCanvas,
      pctToRawPos,
      pctToRawScale,
      getGuidePixelsFromList,
      clamp: clampSafe,
      FLEX_WINDOW_COUNT,
      normalizeFlexAspect,
      syncCanvasResolution,
    });
  }
}

function enableFlexMouse() {
  if (window.DVIPFlexEditor && typeof window.DVIPFlexEditor.enableFlexMouse === 'function') {
    return window.DVIPFlexEditor.enableFlexMouse({
      state,
      byId,
      flexToCanvas,
      flexFromCanvasRect,
      pctToRawPos,
      pctToRawScale,
      rawPosToPct,
      rawScaleToPct,
      markEditLock,
      markEditorDirty,
      pushEditorHistory,
      drawFlexCanvas,
      getGuidePixelsFromList,
      saveFlexEditorState,
      renderGuidesList,
      snapRectGeneric,
      isGuideSnapActive,
      pickValues,
      clamp: clampSafe,
      FLEX_WINDOW_COUNT,
    });
  }
}

function isRawControlVisible(section, control) {
  const supports = (state?.modelSelection?.detected?.supports)
    || (state?.model?.supports)
    || {};
  const label = String(control?.label || "");
  if (!label) return true;

  if (supports.flex === false) {
    const sub = Number(section?.subSection || 0);
    if (label.includes("FLEX")) return false;
    if (Number(section?.id) === 2 && (sub === 2 || sub === 3)) return false;
  }
  if (supports.multiview === false && label.startsWith("OUTPUT_MULTIVIEWER_")) return false;
  if (supports.extendedPipBorder === false && label.includes("BORDER_")) return false;

  const patterns = (state?.modelSelection?.detected?.hiddenLabelPatterns)
    || (state?.model?.hiddenLabelPatterns)
    || [];
  for (const ptn of patterns) {
    try { if (new RegExp(ptn).test(label)) return false; } catch (_) {}
  }
  return true;
}

function buildRawControls() {
  if (window.DVIPPanelsUi && typeof window.DVIPPanelsUi.buildRawControls === 'function') {
    return window.DVIPPanelsUi.buildRawControls({
      byId,
      state,
      sendControl,
      isControlVisible: isRawControlVisible,
    });
  }
}

function buildMenuControls() {
  if (window.DVIPPanelsUi && typeof window.DVIPPanelsUi.buildMenuControls === 'function') {
    return window.DVIPPanelsUi.buildMenuControls({
      byId,
      state,
      api,
      controlValue,
      clamp: clampSafe,
      sendControl,
      pickValues,
      isControlVisible: isRawControlVisible,
    });
  }
}

function syncMenuControlValues() {
  if (window.DVIPPanelsUi && typeof window.DVIPPanelsUi.syncMenuControlValues === 'function') {
    return window.DVIPPanelsUi.syncMenuControlValues({ byId, state });
  }
}

function initConnectionButtons() {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.initConnectionButtons === 'function') {
    return window.DVIPAppShell.initConnectionButtons({
      byId,
      api,
      state,
      scheduleUiSync,
      syncUiFromState,
      setConnState,
      setModelState,
      applyModelCapabilities,
    });
  }
}

function applySavedConnectionConfig(cfg) {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.applySavedConnectionConfig === 'function') {
    return window.DVIPAppShell.applySavedConnectionConfig({ byId }, cfg);
  }
}

function startEvents() {
  if (window.DVIPAppShell && typeof window.DVIPAppShell.startEvents === 'function') {
    return window.DVIPAppShell.startEvents({
      state,
      setConnState,
      setModelState,
      applyModelCapabilities,
      scheduleUiSync,
    });
  }
}


function initCalibrationUi() {
  // Calibration UI layer removed; canvas geometry is now global and static.
}

async function bootstrap() {
  if (window.DVIPAppBootstrap && typeof window.DVIPAppBootstrap.bootstrap === 'function') {
    return window.DVIPAppBootstrap.bootstrap({
      exposeHooks,
      state,
      loadFlexEditorState,
      initNumberWheelNudge,
      initSliderWheelNudge,
      initTabs,
      applyModelCapabilities,
      initConnectionButtons,
      initCalibrationUi,
      api,
      applySavedConnectionConfig,
      buildMultiview,
      buildCameraNames,
      buildPipControls,
      buildFlex,
      buildMemoryControls,
      buildFlexWindowControls,
      initFlexBanks,
      buildRawControls,
      buildMenuControls,
      enablePipMouse,
      enableFlexMouse,
      drawPipCanvas,
      drawFlexCanvas,
      syncUiFromState,
      commitEditor,
      initFineAdjustHotkey,
      initUndoHotkey,
      startEvents,
      setConnState,
      setModelState,
      applyModelCapabilities,
    });
  }
}

document.addEventListener('dvcc:lang-changed', () => {
  try { setConnState(); } catch (_) {}
  try { setModelState(); } catch (_) {}
  try { buildMultiview(); } catch (_) {}
  try { buildCameraNames(); } catch (_) {}
  try { buildPipControls(); } catch (_) {}
  try { buildFlex(); } catch (_) {}
  try { buildMemoryControls(); } catch (_) {}
  try { buildFlexWindowControls(); } catch (_) {}
  try { buildRawControls(); } catch (_) {}
  try { buildMenuControls(); } catch (_) {}
  try { syncUiFromState(); } catch (_) {}
});

bootstrap().catch((err) => {
  console.error(err);
  alert(`Ошибка инициализации: ${err.message}`);
});


































