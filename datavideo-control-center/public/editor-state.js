/* global window */
(function initEditorState(global) {
  function exposeHooks(deps) {
    const { state, byId, api, clamp, syncCanvasResolution, pickValues } = deps;
    global.__DVIPHooks = {
      state,
      byId,
      api,
      clamp,
      syncCanvasResolution,
      pickValues,
    };
  }

  function capturePipEditorState(deps) {
    const { byId } = deps;
    return {
      windows: Array.from({ length: 4 }, (_, n) => n + 1).map((i) => ({
        en: !!byId(`pip${i}-en`)?.checked,
        src: Number(byId(`pip${i}-src`)?.value || 0),
        x: Number(byId(`pip${i}-x`)?.value || 0),
        y: Number(byId(`pip${i}-y`)?.value || 0),
        s: Number(byId(`pip${i}-s`)?.value || 0),
        cl: Number(byId(`pip${i}-cl`)?.value || 0),
        cr: Number(byId(`pip${i}-cr`)?.value || 0),
        ct: Number(byId(`pip${i}-ct`)?.value || 0),
        cb: Number(byId(`pip${i}-cb`)?.value || 0),
        bs: Number(byId(`pip${i}-bs`)?.value || 0),
        bw: Number(byId(`pip${i}-bw`)?.value || 0),
        bo: Number(byId(`pip${i}-bo`)?.value || 0),
        bh: Number(byId(`pip${i}-bh`)?.value || 0),
        bsa: Number(byId(`pip${i}-bsa`)?.value || 0),
        bl: Number(byId(`pip${i}-bl`)?.value || 0),
        borderOn: !!byId(`pip${i}-borderOn`)?.checked,
      })),
    };
  }

  function restorePipEditorState(deps, snapshot) {
    const { byId, updatePipBorderUi, normalizePipAspect, drawPipCanvas } = deps;
    if (!snapshot || !Array.isArray(snapshot.windows)) return;
    for (let i = 1; i <= 4; i += 1) {
      const w = snapshot.windows[i - 1];
      if (!w) continue;
      if (byId(`pip${i}-en`)) byId(`pip${i}-en`).checked = !!w.en;
      if (byId(`pip${i}-src`)) byId(`pip${i}-src`).value = String(w.src ?? 0);
      ['x', 'y', 's', 'cl', 'cr', 'ct', 'cb', 'bs', 'bw', 'bo', 'bh', 'bsa', 'bl'].forEach((k) => {
        if (byId(`pip${i}-${k}`)) byId(`pip${i}-${k}`).value = String(w[k] ?? 0);
      });
      if (byId(`pip${i}-borderOn`)) byId(`pip${i}-borderOn`).checked = (w.borderOn !== undefined) ? !!w.borderOn : Number(w.bs ?? 1) > 0;
      const sr = byId(`pip${i}-s-r`);
      if (sr) sr.value = String(Math.round(Number(w.s ?? 0)));
      // Keep hidden raw scale in sync with restored percent scale.
      // drawPipCanvas() calls normalizePipAspect(), which derives s from pipN-w.
      const rawScale = Number(w.s ?? 0) / 100;
      if (byId(`pip${i}-w`)) byId(`pip${i}-w`).value = rawScale.toFixed(4);
      if (byId(`pip${i}-h`)) byId(`pip${i}-h`).value = rawScale.toFixed(4);
      updatePipBorderUi(i);
    }
    normalizePipAspect();
    drawPipCanvas();
  }

  function captureFlexEditorState(deps) {
    const { byId, FLEX_WINDOW_COUNT } = deps;
    return {
      bg: Number(byId('flexBg')?.value || 0),
      fg: Number(byId('flexFg')?.value || 0),
      fgEnable: !!byId('flexFgEnable')?.checked,
      windows: Array.from({ length: FLEX_WINDOW_COUNT }, (_, n) => n + 1).map((i) => ({
        en: !!byId(`flex${i}-en`)?.checked,
        src: Number(byId(`flex${i}-src`)?.value || 0),
        x: Number(byId(`flex${i}-x`)?.value || 0),
        y: Number(byId(`flex${i}-y`)?.value || 0),
        s: Number(byId(`flex${i}-s`)?.value || 0),
        cl: Number(byId(`flex${i}-cl`)?.value || 0),
        cr: Number(byId(`flex${i}-cr`)?.value || 0),
        ct: Number(byId(`flex${i}-ct`)?.value || 0),
        cb: Number(byId(`flex${i}-cb`)?.value || 0),
        bs: Number(byId(`flex${i}-bs`)?.value || 0),
        bw: Number(byId(`flex${i}-bw`)?.value || 0),
        bo: Number(byId(`flex${i}-bo`)?.value || 0),
        bh: Number(byId(`flex${i}-bh`)?.value || 0),
        bsa: Number(byId(`flex${i}-bsa`)?.value || 0),
        bl: Number(byId(`flex${i}-bl`)?.value || 0),
        borderOn: !!byId(`flex${i}-borderOn`)?.checked,
      })),
    };
  }

  function restoreFlexEditorState(deps, snapshot) {
    const { byId, FLEX_WINDOW_COUNT, normalizeFlexAspect, drawFlexCanvas } = deps;
    if (!snapshot || !Array.isArray(snapshot.windows)) return;
    if (byId('flexBg')) byId('flexBg').value = String(snapshot.bg ?? 0);
    if (byId('flexFg')) byId('flexFg').value = String(snapshot.fg ?? 0);
    if (byId('flexFgEnable')) byId('flexFgEnable').checked = !!snapshot.fgEnable;
    for (let i = 1; i <= FLEX_WINDOW_COUNT; i += 1) {
      const w = snapshot.windows[i - 1];
      if (!w) continue;
      if (byId(`flex${i}-en`)) byId(`flex${i}-en`).checked = !!w.en;
      if (byId(`flex${i}-src`)) byId(`flex${i}-src`).value = String(w.src ?? 0);
      ['x', 'y', 's', 'cl', 'cr', 'ct', 'cb', 'bs', 'bw', 'bo', 'bh', 'bsa', 'bl'].forEach((k) => {
        if (byId(`flex${i}-${k}`)) byId(`flex${i}-${k}`).value = String(w[k] ?? 0);
      });
      if (byId(`flex${i}-borderOn`)) byId(`flex${i}-borderOn`).checked = !!w.borderOn;
      const sr = byId(`flex${i}-s-r`);
      if (sr) sr.value = String(Math.round(Number(w.s ?? 0)));
      // Keep hidden raw scale in sync with restored percent scale.
      // drawFlexCanvas() calls normalizeFlexAspect(), which derives s from flexN-w.
      const rawScale = Number(w.s ?? 0) / 100;
      if (byId(`flex${i}-w`)) byId(`flex${i}-w`).value = rawScale.toFixed(4);
      if (byId(`flex${i}-h`)) byId(`flex${i}-h`).value = rawScale.toFixed(4);
    }
    normalizeFlexAspect();
    drawFlexCanvas();
  }

  function markEditorDirty(deps, kind) {
    const { state, capturePipEditorState: capturePip, captureFlexEditorState: captureFlex, cloneJson } = deps;
    const session = state.editor[kind];
    if (!session) return;
    if (!session.dirty) {
      session.baseline = kind === 'pip' ? capturePip() : captureFlex();
      session.history = [cloneJson(session.baseline)];
      session.future = [];
      session.dirty = true;
    }
  }

  function pushEditorHistory(deps, kind) {
    const { state, capturePipEditorState: capturePip, captureFlexEditorState: captureFlex, cloneJson } = deps;
    const session = state.editor[kind];
    if (!session) return;
    const snap = kind === 'pip' ? capturePip() : captureFlex();
    const prev = session.history.length > 0 ? JSON.stringify(session.history[session.history.length - 1]) : '';
    const cur = JSON.stringify(snap);
    if (cur === prev) return;
    session.history.push(cloneJson(snap));
    if (session.history.length > 30) session.history.shift();
    session.future = [];
  }

  function rollbackEditor(deps, kind) {
    const { state, restorePipEditorState: restorePip, restoreFlexEditorState: restoreFlex, cloneJson } = deps;
    const session = state.editor[kind];
    if (!session || !session.dirty || !session.baseline) return;
    if (kind === 'pip') restorePip(session.baseline);
    else restoreFlex(session.baseline);
    session.history = [cloneJson(session.baseline)];
    session.future = [];
    session.dirty = false;
  }

  function commitEditor(deps, kind) {
    const { state, capturePipEditorState: capturePip, captureFlexEditorState: captureFlex, cloneJson } = deps;
    const session = state.editor[kind];
    if (!session) return;
    const snap = kind === 'pip' ? capturePip() : captureFlex();
    session.baseline = cloneJson(snap);
    session.history = [cloneJson(snap)];
    session.future = [];
    session.dirty = false;
  }

  global.DVIPEditorState = {
    exposeHooks,
    capturePipEditorState,
    restorePipEditorState,
    captureFlexEditorState,
    restoreFlexEditorState,
    markEditorDirty,
    pushEditorHistory,
    rollbackEditor,
    commitEditor,
  };
}(window));
