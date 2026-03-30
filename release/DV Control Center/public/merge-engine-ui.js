(() => {
  const WINDOW_COUNT = 4;

  let hooks = null;
  const presetMaps = {
    flex: new Map(),
    pip: new Map(),
  };
  const selectedPresetByMode = {
    flex: '',
    pip: '',
  };
  const runSettingsSaveTimers = {
    flex: null,
    pip: null,
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function t(key, fallback) {
    if (window.DVIPI18n && typeof window.DVIPI18n.t === 'function') return window.DVIPI18n.t(key);
    return fallback;
  }

  function clamp(n, min, max) {
    const v = Number(n);
    if (!Number.isFinite(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  function ease(kind, t) {
    const x = clamp(t, 0, 1);
    if (kind === 'EaseIn') return x * x;
    if (kind === 'EaseOut') return 1 - (1 - x) * (1 - x);
    if (kind === 'EaseEase') return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    return x;
  }

  function rawToPct(raw) {
    return clamp(Number(raw || 0) * 100, -100, 100);
  }

  function pctToRaw(pct) {
    return clamp(Number(pct || 0) / 100, -1, 1);
  }

  function normalizedXYToRaw(v) {
    const n = Number(v || 0);
    if (Math.abs(n) <= 1) return clamp(n, -1, 1);
    return clamp(n / 16, -1, 1);
  }

  function normalizedScaleToPct(v) {
    const n = Number(v || 0);
    if (n > 1) return clamp(n, 0, 100);
    return clamp(n * 100, 0, 100);
  }

  function normalizedScaleToRaw(v) {
    const n = Number(v || 0);
    if (n > 1) return clamp(n / 100, 0, 1);
    return clamp(n, 0, 1);
  }

  function normalizedCropToPct(v) {
    const n = Number(v || 0);
    if (n > 1) return clamp(n, 0, 100);
    return clamp(n * 100, 0, 100);
  }

  function getActiveFlexBank() {
    return Number(hooks?.state?.activeFlexBank || 1) === 2 ? 2 : 1;
  }

  function getPanels() {
    return [
      {
        mode: 'pip',
        hasBank: false,
        ids: {
          status: 'pipMergeStatus',
          presetButtons: 'pipMergePresetButtons',
          presetName: 'pipMergePresetName',
          duration: 'pipMergeDuration',
          fps: 'pipMergeFps',
          easing: 'pipMergeEasing',
          save: 'pipMergeSavePreset',
          apply: 'pipMergeApplyNow',
          stop: 'pipMergeStop',
        },
      },
      {
        mode: 'flex',
        hasBank: true,
        ids: {
          status: 'mergeStatus',
          presetButtons: 'mergePresetButtons',
          presetName: 'mergePresetName',
          duration: 'mergeDuration',
          fps: 'mergeFps',
          easing: 'mergeEasing',
          save: 'mergeSavePreset',
          apply: 'mergeApplyNow',
          stop: 'mergeStop',
        },
      },
    ].filter((panel) => !!byId(panel.ids.presetButtons));
  }

  function getPanel(mode) {
    return getPanels().find((panel) => panel.mode === mode) || null;
  }

  function setStatus(panel, text) {
    const el = byId(panel.ids.status);
    if (el) el.textContent = text;
  }

  function readRunSettings(panel) {
    return {
      durationMs: Number(byId(panel.ids.duration)?.value || 1200),
      fps: Number(byId(panel.ids.fps)?.value || 25),
      easing: byId(panel.ids.easing)?.value || 'EaseEase',
    };
  }

  function applyRunSettings(panel, settings) {
    if (!settings || typeof settings !== 'object') return;
    if (Number.isFinite(Number(settings.durationMs))) setInput(panel.ids.duration, Number(settings.durationMs), false);
    if (Number.isFinite(Number(settings.fps))) setInput(panel.ids.fps, Number(settings.fps), false);
    if (typeof settings.easing === 'string' && settings.easing) setInput(panel.ids.easing, settings.easing, false);
  }

  function readFlexUiState() {
    return {
      bank: getActiveFlexBank(),
      bg: Number(byId('flexBg')?.value || 0),
      fg: Number(byId('flexFg')?.value || 0),
      fgEnable: !!byId('flexFgEnable')?.checked,
      windows: Array.from({ length: WINDOW_COUNT }, (_, n) => n + 1).map((i) => ({
        en: !!byId(`flex${i}-en`)?.checked,
        src: Number(byId(`flex${i}-src`)?.value || 0),
        x: pctToRaw(byId(`flex${i}-x`)?.value || 0),
        y: pctToRaw(byId(`flex${i}-y`)?.value || 0),
        s: clamp(Number(byId(`flex${i}-s`)?.value || 0) / 100, 0, 1),
        cl: clamp(Number(byId(`flex${i}-cl`)?.value || 0), 0, 100),
        cr: clamp(Number(byId(`flex${i}-cr`)?.value || 0), 0, 100),
        ct: clamp(Number(byId(`flex${i}-ct`)?.value || 0), 0, 100),
        cb: clamp(Number(byId(`flex${i}-cb`)?.value || 0), 0, 100),
      })),
    };
  }

  function readPipUiState() {
    return {
      windows: Array.from({ length: WINDOW_COUNT }, (_, n) => n + 1).map((i) => ({
        en: !!byId(`pip${i}-en`)?.checked,
        src: Number(byId(`pip${i}-src`)?.value || 0),
        x: pctToRaw(byId(`pip${i}-x`)?.value || 0),
        y: pctToRaw(byId(`pip${i}-y`)?.value || 0),
        s: clamp(Number(byId(`pip${i}-s`)?.value || 0) / 100, 0, 1),
        cl: clamp(Number(byId(`pip${i}-cl`)?.value || 0), 0, 100),
        cr: clamp(Number(byId(`pip${i}-cr`)?.value || 0), 0, 100),
        ct: clamp(Number(byId(`pip${i}-ct`)?.value || 0), 0, 100),
        cb: clamp(Number(byId(`pip${i}-cb`)?.value || 0), 0, 100),
        bs: clamp(Number(byId(`pip${i}-bs`)?.value || 0), 0, 20),
        bo: clamp(Number(byId(`pip${i}-bo`)?.value || 0), 0, 100),
        bw: clamp(Number(byId(`pip${i}-bw`)?.value || 0), 0, 100),
        bh: clamp(Number(byId(`pip${i}-bh`)?.value || 0), 0, 360),
        bsa: clamp(Number(byId(`pip${i}-bsa`)?.value || 0), 0, 100),
        bl: clamp(Number(byId(`pip${i}-bl`)?.value || 0), 0, 100),
      })),
    };
  }

  function readUiState(mode) {
    return mode === 'pip' ? readPipUiState() : readFlexUiState();
  }

  function switchToBank(bank) {
    const next = Number(bank) === 2 ? 2 : 1;
    if (next === 2) byId('flexBank2')?.click();
    else byId('flexBank1')?.click();
  }

  function setInput(id, value, fire = true) {
    const el = byId(id);
    if (!el) return;
    el.value = String(value);
    if (fire) el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setCheck(id, value, fire = true) {
    const el = byId(id);
    if (!el) return;
    el.checked = !!value;
    if (fire) el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyStateToFlexUi(state, fire = true) {
    if (!state || typeof state !== 'object') return;
    setInput('flexBg', Number(state.bg || 0), false);
    setInput('flexFg', Number(state.fg || 0), false);
    setCheck('flexFgEnable', !!state.fgEnable, false);

    for (let i = 1; i <= WINDOW_COUNT; i += 1) {
      const w = state.windows?.[i - 1] || {};
      setCheck(`flex${i}-en`, !!w.en, false);
      setInput(`flex${i}-src`, Number(w.src || 0), false);
      setInput(`flex${i}-x`, rawToPct(normalizedXYToRaw(w.x)).toFixed(2), false);
      setInput(`flex${i}-y`, rawToPct(normalizedXYToRaw(w.y)).toFixed(2), false);
      setInput(`flex${i}-s`, normalizedScaleToPct(w.s).toFixed(2), false);
      const rawScale = normalizedScaleToRaw(w.s);
      setInput(`flex${i}-w`, rawScale.toFixed(4), false);
      setInput(`flex${i}-h`, rawScale.toFixed(4), false);
      setInput(`flex${i}-cl`, normalizedCropToPct(w.cl).toFixed(2), false);
      setInput(`flex${i}-cr`, normalizedCropToPct(w.cr).toFixed(2), false);
      setInput(`flex${i}-ct`, normalizedCropToPct(w.ct).toFixed(2), false);
      setInput(`flex${i}-cb`, normalizedCropToPct(w.cb).toFixed(2), false);
      setInput(`flex${i}-x-r`, Math.round(rawToPct(normalizedXYToRaw(w.x))), false);
      setInput(`flex${i}-y-r`, Math.round(rawToPct(normalizedXYToRaw(w.y))), false);
      setInput(`flex${i}-s-r`, Math.round(normalizedScaleToPct(w.s)), false);
      setInput(`flex${i}-cl-r`, Math.round(normalizedCropToPct(w.cl)), false);
      setInput(`flex${i}-cr-r`, Math.round(normalizedCropToPct(w.cr)), false);
      setInput(`flex${i}-ct-r`, Math.round(normalizedCropToPct(w.ct)), false);
      setInput(`flex${i}-cb-r`, Math.round(normalizedCropToPct(w.cb)), false);
    }

    if (fire) {
      byId('flexBg')?.dispatchEvent(new Event('change', { bubbles: true }));
      byId('flexFg')?.dispatchEvent(new Event('change', { bubbles: true }));
      byId('flexFgEnable')?.dispatchEvent(new Event('change', { bubbles: true }));
      byId('flex1-x')?.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function applyStateToPipUi(state, fire = true) {
    if (!state || typeof state !== 'object') return;

    for (let i = 1; i <= WINDOW_COUNT; i += 1) {
      const w = state.windows?.[i - 1] || {};
      setCheck(`pip${i}-en`, !!w.en, false);
      setInput(`pip${i}-src`, Number(w.src || 0), false);
      setInput(`pip${i}-x`, rawToPct(normalizedXYToRaw(w.x)).toFixed(2), false);
      setInput(`pip${i}-y`, rawToPct(normalizedXYToRaw(w.y)).toFixed(2), false);
      setInput(`pip${i}-s`, normalizedScaleToPct(w.s).toFixed(2), false);
      const rawScale = normalizedScaleToRaw(w.s);
      setInput(`pip${i}-w`, rawScale.toFixed(4), false);
      setInput(`pip${i}-h`, rawScale.toFixed(4), false);
      setInput(`pip${i}-cl`, normalizedCropToPct(w.cl).toFixed(2), false);
      setInput(`pip${i}-cr`, normalizedCropToPct(w.cr).toFixed(2), false);
      setInput(`pip${i}-ct`, normalizedCropToPct(w.ct).toFixed(2), false);
      setInput(`pip${i}-cb`, normalizedCropToPct(w.cb).toFixed(2), false);
      setInput(`pip${i}-x-r`, Math.round(rawToPct(normalizedXYToRaw(w.x))), false);
      setInput(`pip${i}-y-r`, Math.round(rawToPct(normalizedXYToRaw(w.y))), false);
      setInput(`pip${i}-s-r`, Math.round(normalizedScaleToPct(w.s)), false);
      setInput(`pip${i}-cl-r`, Math.round(normalizedCropToPct(w.cl)), false);
      setInput(`pip${i}-cr-r`, Math.round(normalizedCropToPct(w.cr)), false);
      setInput(`pip${i}-ct-r`, Math.round(normalizedCropToPct(w.ct)), false);
      setInput(`pip${i}-cb-r`, Math.round(normalizedCropToPct(w.cb)), false);
      setInput(`pip${i}-bs`, clamp(Number(w.bs ?? 0), 0, 20).toFixed(0), false);
      setInput(`pip${i}-bo`, clamp(Number(w.bo ?? 0), 0, 100).toFixed(2), false);
      setInput(`pip${i}-bw`, clamp(Number(w.bw ?? 0), 0, 100).toFixed(2), false);
      setInput(`pip${i}-bh`, clamp(Number(w.bh ?? 0), 0, 360).toFixed(2), false);
      setInput(`pip${i}-bsa`, clamp(Number(w.bsa ?? 0), 0, 100).toFixed(2), false);
      setInput(`pip${i}-bl`, clamp(Number(w.bl ?? 0), 0, 100).toFixed(2), false);
      setCheck(`pip${i}-borderOn`, Number(w.bs ?? 0) > 0, false);
    }

    if (fire) {
      byId('pip1-x')?.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function applyStateToUi(mode, state, fire = true) {
    if (mode === 'pip') applyStateToPipUi(state, fire);
    else applyStateToFlexUi(state, fire);
  }

  function interpolateState(mode, from, to, k, isFinal) {
    const out = {
      windows: [],
    };

    if (mode === 'flex') {
      out.bank = Number(to.bank || from.bank || 1);
      out.bg = k < 0.5 ? from.bg : to.bg;
      out.fg = k < 0.5 ? from.fg : to.fg;
      out.fgEnable = k < 0.5 ? from.fgEnable : to.fgEnable;
    }

    for (let i = 0; i < WINDOW_COUNT; i += 1) {
      const a = from.windows?.[i] || {};
      const b = to.windows?.[i] || {};
      const row = {
        en: isFinal ? !!b.en : (a.en || b.en),
        src: k < 0.5 ? Number(a.src || 0) : Number(b.src || 0),
        x: Number(a.x || 0) + ((Number(b.x || 0) - Number(a.x || 0)) * k),
        y: Number(a.y || 0) + ((Number(b.y || 0) - Number(a.y || 0)) * k),
        s: Number(a.s || 0) + ((Number(b.s || 0) - Number(a.s || 0)) * k),
        cl: Number(a.cl || 0) + ((Number(b.cl || 0) - Number(a.cl || 0)) * k),
        cr: Number(a.cr || 0) + ((Number(b.cr || 0) - Number(a.cr || 0)) * k),
        ct: Number(a.ct || 0) + ((Number(b.ct || 0) - Number(a.ct || 0)) * k),
        cb: Number(a.cb || 0) + ((Number(b.cb || 0) - Number(a.cb || 0)) * k),
      };
      if (mode === 'pip') {
        row.bs = Number(a.bs || 0) + ((Number(b.bs || 0) - Number(a.bs || 0)) * k);
        row.bo = Number(a.bo || 0) + ((Number(b.bo || 0) - Number(a.bo || 0)) * k);
        row.bw = Number(a.bw || 0) + ((Number(b.bw || 0) - Number(a.bw || 0)) * k);
        row.bh = Number(a.bh || 0) + ((Number(b.bh || 0) - Number(a.bh || 0)) * k);
        row.bsa = Number(a.bsa || 0) + ((Number(b.bsa || 0) - Number(a.bsa || 0)) * k);
        row.bl = Number(a.bl || 0) + ((Number(b.bl || 0) - Number(a.bl || 0)) * k);
      }
      out.windows.push(row);
    }
    return out;
  }

  function startLocalRun(panel, targetState, durationMs, easing) {
    if (Number(durationMs) <= 0) {
      applyStateToUi(panel.mode, targetState, true);
      if (panel.mode === 'flex' && hooks?.state) hooks.state.mergeAnimating = false;
      return;
    }
    const from = readUiState(panel.mode);
    const start = performance.now();

    if (panel.mode === 'flex' && hooks?.state) hooks.state.mergeAnimating = true;

    const tick = (now) => {
      const t = clamp((now - start) / Math.max(1, durationMs), 0, 1);
      const k = ease(easing, t);
      const isFinal = t >= 1;
      applyStateToUi(panel.mode, interpolateState(panel.mode, from, targetState, k, isFinal), true);
      if (!isFinal) {
        requestAnimationFrame(tick);
      } else if (panel.mode === 'flex' && hooks?.state) {
        hooks.state.mergeAnimating = false;
      }
    };
    requestAnimationFrame(tick);
  }

  function renderPresetButtons(panel, presets) {
    const box = byId(panel.ids.presetButtons);
    if (!box) return;

    const nextMap = new Map((presets || []).map((p) => [p.name, p.state]));
    presetMaps[panel.mode] = nextMap;
    const savedSelection = selectedPresetByMode[panel.mode];
    const nextSelection = (savedSelection && nextMap.has(savedSelection))
      ? savedSelection
      : (presets?.[0]?.name || '');
    selectedPresetByMode[panel.mode] = nextSelection;

    box.innerHTML = '';
    for (const item of presets || []) {
      const row = document.createElement('div');
      row.className = 'preset-chip';
      row.dataset.name = item.name;
      const bank = Number(item?.state?.bank || 1);
      const runClass = panel.mode === 'flex'
        ? (bank === 1 ? 'preset-src1' : bank === 2 ? 'preset-src2' : '')
        : '';
      const runBtn = document.createElement('button');
      runBtn.dataset.run = item.name;
      runBtn.className = `preset-run ${runClass}`.trim();
      runBtn.textContent = item.name;
      if (item.name === nextSelection) {
        runBtn.classList.add('active');
        row.classList.add('active');
      }
      const delBtn = document.createElement('button');
      delBtn.dataset.del = item.name;
      delBtn.className = 'muted preset-del';
      delBtn.title = t('merge.deleteKey', 'Delete key');
      delBtn.textContent = 'x';
      row.appendChild(runBtn);
      row.appendChild(delBtn);
      box.appendChild(row);
      runBtn.addEventListener('click', () => runPreset(panel, item.name));
      delBtn.addEventListener('click', () => deletePreset(panel, item.name));
    }

    const nameInput = byId(panel.ids.presetName);
    if (nameInput && !String(nameInput.value || '').trim()) {
      nameInput.value = nextSelection || '';
    }
  }

  async function loadFromServer(panel) {
    const data = await hooks.api(`/api/merge/state?mode=${encodeURIComponent(panel.mode)}`);
    applyRunSettings(panel, data.settings || null);
    renderPresetButtons(panel, data.presets || []);
    setStatus(panel, data.running ? 'Transition running...' : 'Merge Engine ready');
  }

  async function saveRunSettings(panel) {
    const settings = readRunSettings(panel);
    await hooks.api('/api/merge/settings', 'POST', {
      mode: panel.mode,
      durationMs: settings.durationMs,
      fps: settings.fps,
      easing: settings.easing,
    });
  }

  function scheduleRunSettingsSave(panel) {
    const mode = panel.mode === 'pip' ? 'pip' : 'flex';
    if (runSettingsSaveTimers[mode]) clearTimeout(runSettingsSaveTimers[mode]);
    runSettingsSaveTimers[mode] = setTimeout(() => {
      runSettingsSaveTimers[mode] = null;
      saveRunSettings(panel).catch(() => {});
    }, 250);
  }

  async function savePreset(panel, opts = {}) {
    try {
      const nameInput = byId(panel.ids.presetName);
      const explicitName = typeof opts.name === 'string' ? opts.name.trim() : '';
      const typedName = explicitName || (nameInput?.value || '').trim();
      const modeMap = presetMaps[panel.mode] || new Map();
      const selectedName = selectedPresetByMode[panel.mode];
      const fallbackName = modeMap.size > 0 ? Array.from(modeMap.keys())[0] : '';
      const confirmOverwrite = opts.confirmOverwrite !== false;
      let name = typedName;
      if (!name) {
        if (modeMap.size < 1) name = 'Key1';
        else if (selectedName && modeMap.has(selectedName) && opts.preferSelected !== false) name = selectedName;
        else name = fallbackName;
      }
      if (!name) name = 'Key1';
      if (confirmOverwrite && modeMap.has(name) && !window.confirm(t('merge.confirmRewrite', 'Rewrite key?'))) {
        if (opts.setStatus !== false) setStatus(panel, t('merge.rewriteCanceled', 'Rewrite canceled'));
        return null;
      }
      const body = {
        mode: panel.mode,
        name,
        state: readUiState(panel.mode),
      };
      await hooks.api('/api/merge/presets/save', 'POST', body);
      selectedPresetByMode[panel.mode] = name;
      if (nameInput) nameInput.value = name;
      await loadFromServer(panel);
      if (opts.setStatus !== false) {
        const bankNote = panel.mode === 'flex' ? ` (Src ${getActiveFlexBank()})` : '';
        setStatus(panel, `Saved preset: ${name}${bankNote}`);
      }
      return name;
    } catch (e) {
      setStatus(panel, `Save error: ${e.message}`);
      throw e;
    }
  }

  async function deletePreset(panel, name) {
    try {
      if (!window.confirm(t('merge.confirmDelete', 'Delete key?'))) {
        setStatus(panel, t('merge.deleteCanceled', 'Delete canceled'));
        return;
      }
      await hooks.api('/api/merge/presets/delete', 'POST', { mode: panel.mode, name });
      if (selectedPresetByMode[panel.mode] === name) selectedPresetByMode[panel.mode] = '';
      await loadFromServer(panel);
      setStatus(panel, `Deleted preset: ${name}`);
    } catch (e) {
      setStatus(panel, `Delete error: ${e.message}`);
    }
  }

  async function runPreset(panel, name) {
    const settings = readRunSettings(panel);
    const durationMs = settings.durationMs;
    const fps = settings.fps;
    const easing = settings.easing;
    const target = presetMaps[panel.mode].get(name);
    selectedPresetByMode[panel.mode] = name;
    const nameInput = byId(panel.ids.presetName);
    if (nameInput) nameInput.value = name;
    byId(panel.ids.presetButtons)?.querySelectorAll('.preset-run').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-run') === name);
    });
    byId(panel.ids.presetButtons)?.querySelectorAll('.preset-chip').forEach((row) => {
      row.classList.toggle('active', row.getAttribute('data-name') === name);
    });

    try {
      if (panel.mode === 'flex' && target?.bank) switchToBank(target.bank);
      await hooks.api('/api/merge/run', 'POST', { mode: panel.mode, preset: name, durationMs, fps, easing });
      if (target) startLocalRun(panel, target, durationMs, easing);
      setStatus(panel, `Running: ${name} (${easing}, ${durationMs}ms @ ${fps}Hz)`);
    } catch (e) {
      if (String(e.message || '').includes('Not connected')) {
        if (target) startLocalRun(panel, target, durationMs, easing);
        setStatus(panel, `Preview only: ${name} (${easing}, ${durationMs}ms @ ${fps}Hz)`);
        return;
      }
      setStatus(panel, `Run error: ${e.message}`);
    }
  }

  async function applyNow(panel) {
    try {
      await hooks.api('/api/merge/apply', 'POST', { mode: panel.mode, state: readUiState(panel.mode) });
      setStatus(panel, 'Applied now');
    } catch (e) {
      if (String(e.message || '').includes('Not connected')) {
        setStatus(panel, 'Preview only: mixer not connected');
        return;
      }
      setStatus(panel, `Apply error: ${e.message}`);
    }
  }

  async function stopRun(panel) {
    try {
      await hooks.api('/api/merge/stop', 'POST', { mode: panel.mode });
      if (panel.mode === 'flex' && hooks?.state) hooks.state.mergeAnimating = false;
      setStatus(panel, 'Stopped');
    } catch (e) {
      setStatus(panel, `Stop error: ${e.message}`);
    }
  }

  function initEvents(panel) {
    byId(panel.ids.save)?.addEventListener('click', () => savePreset(panel));
    byId(panel.ids.apply)?.addEventListener('click', () => applyNow(panel));
    byId(panel.ids.stop)?.addEventListener('click', () => stopRun(panel));
    byId(panel.ids.duration)?.addEventListener('change', () => scheduleRunSettingsSave(panel));
    byId(panel.ids.fps)?.addEventListener('change', () => scheduleRunSettingsSave(panel));
    byId(panel.ids.easing)?.addEventListener('change', () => scheduleRunSettingsSave(panel));
    byId(panel.ids.duration)?.addEventListener('input', () => scheduleRunSettingsSave(panel));
    byId(panel.ids.fps)?.addEventListener('input', () => scheduleRunSettingsSave(panel));
  }

  function init() {
    const panels = getPanels();
    if (!panels.length) return;

    if (hooks?.state) hooks.state.mergeAnimating = false;

    for (const panel of panels) {
      initEvents(panel);
      loadFromServer(panel).catch((e) => setStatus(panel, e.message));
    }
  }

  function bootWithHooks(h) {
    hooks = h;
    init();
  }

  async function saveCurrentPreset(mode, opts = {}) {
    const panel = getPanel(mode);
    if (!panel) return null;
    return savePreset(panel, opts);
  }

  function getActivePreset(mode) {
    return selectedPresetByMode[mode] || '';
  }

  window.DVIPMergeUi = {
    saveCurrentPreset,
    getActivePreset,
  };

  if (window.__DVIPHooks) {
    bootWithHooks(window.__DVIPHooks);
  } else {
    window.addEventListener('DVIP:ready', (ev) => bootWithHooks(ev.detail || window.__DVIPHooks), { once: true });
  }
})();



