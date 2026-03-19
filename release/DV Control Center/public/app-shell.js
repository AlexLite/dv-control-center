/* global window, document, EventSource */
(function initShell(global) {
  function t(key, vars) {
    if (global.DVIPI18n && typeof global.DVIPI18n.t === 'function') return global.DVIPI18n.t(key, vars);
    return key;
  }

function nudgeNumberInputByWheel(deps, input, deltaY, fineMode) {
    const { clamp } = deps;
    const step = fineMode ? 0.01 : 1;
    const dir = deltaY < 0 ? 1 : -1;
    const cur = Number(input.value || 0);
    let next = cur + (dir * step);
    const min = input.min === '' ? -Infinity : Number(input.min);
    const max = input.max === '' ? Infinity : Number(input.max);
    next = clamp(next, min, max);
    input.value = fineMode ? next.toFixed(2) : String(Math.round(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function initNumberWheelNudge(deps) {
    document.addEventListener('wheel', (ev) => {
      const input = ev.target && ev.target.closest ? ev.target.closest('input[type="number"]') : null;
      if (!input) return;
      ev.preventDefault();
      nudgeNumberInputByWheel(deps, input, ev.deltaY, !!ev.ctrlKey);
    }, { passive: false });
  }

  function nudgeRangeInputByWheel(deps, input, deltaY) {
    const { clamp } = deps;
    const dir = deltaY < 0 ? 1 : -1;
    const step = Number(input.dataset.wheelStep || 0.1);
    if (!input.dataset.baseStep) input.dataset.baseStep = String(input.step || '1');
    input.step = String(step);
    const cur = Number(input.value || 0);
    const min = input.min === '' ? -Infinity : Number(input.min);
    const max = input.max === '' ? Infinity : Number(input.max);
    const precision = step >= 1 ? 0 : Math.max(1, String(step).split('.')[1]?.length || 1);
    const next = clamp(cur + (dir * step), min, max);
    input.value = Number(next).toFixed(precision);
    input.dataset.wheelNudge = '1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function initSliderWheelNudge(deps) {
    document.addEventListener('wheel', (ev) => {
      const slider = ev.target && ev.target.closest ? ev.target.closest('input[type="range"]') : null;
      if (!slider || slider.disabled) return;
      ev.preventDefault();
      nudgeRangeInputByWheel(deps, slider, ev.deltaY);
    }, { passive: false });
  }

  function initTabs(deps) {
    const { state, rollbackEditor, byId, drawPipCanvas, drawFlexCanvas } = deps;
    document.querySelectorAll('.tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const active = document.querySelector('.tabs button.active');
        const activeTab = active ? active.dataset.tab : null;
        if (activeTab === 'pip' && state.editor.pip.dirty) rollbackEditor('pip');
        if (activeTab === 'flex' && state.editor.flex.dirty) rollbackEditor('flex');
        document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        byId(`tab-${btn.dataset.tab}`)?.classList.add('active');
        if ((btn.dataset.tab === 'pip' || btn.dataset.tab === 'flex') && typeof global.__DVIPSyncUiFromState === 'function') {
          try { global.__DVIPSyncUiFromState(); } catch (_) {}
        }
        if (btn.dataset.tab === 'pip') {
          requestAnimationFrame(() => drawPipCanvas());
        } else if (btn.dataset.tab === 'flex') {
          requestAnimationFrame(() => drawFlexCanvas());
        }
      });
    });
  }

  function applyModelCapabilities(deps) {
    if (global.DVIPModelCapabilitiesUi && typeof global.DVIPModelCapabilitiesUi.applyModelCapabilities === 'function') {
      return global.DVIPModelCapabilitiesUi.applyModelCapabilities(deps);
    }

    const { state, byId } = deps;
    const supports = (state?.modelSelection?.detected?.supports) || (state?.model?.supports) || {};
    const allowFlex = supports.flex !== false;
    const allowMultiview = supports.multiview !== false;
    const setTabVisible = (tabId, visible) => {
      const btn = document.querySelector(`.tabs button[data-tab="${tabId}"]`);
      const section = byId(`tab-${tabId}`);
      if (btn) btn.style.display = visible ? '' : 'none';
      if (section) section.style.display = visible ? '' : 'none';
    };

    setTabVisible('flex', allowFlex);
    setTabVisible('multiview', allowMultiview);
  }

  function initFineAdjustHotkey(deps) {
    const { normalizeFineControls } = deps;
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Control') return;
      document.querySelectorAll('.slider-sync').forEach((el) => { el.step = el.dataset.fineStep || '0.01'; });
    });
    document.addEventListener('keyup', (ev) => {
      if (ev.key !== 'Control') return;
      normalizeFineControls();
    });
  }

  function initUndoHotkey(deps) {
    const { undoEditor, redoEditor } = deps;
    document.addEventListener('keydown', (ev) => {
      const mod = !!ev.ctrlKey || !!ev.metaKey;
      if (!mod) return;
      const key = String(ev.key || '').toLowerCase();
      const code = String(ev.code || '').toLowerCase();
      const activeTab = document.querySelector('.tabs button.active')?.dataset?.tab;
      if (activeTab !== 'pip' && activeTab !== 'flex') return;
      const isUndo = key === 'z' || key === 'СЏ' || code === 'keyz';
      const isRedo = key === 'y' || key === 'Н' || code === 'keyy' || ((ev.shiftKey) && isUndo);
      if (!isUndo && !isRedo) return;
      ev.preventDefault();
      if (isRedo) {
        if (typeof redoEditor === 'function') redoEditor(activeTab);
      } else {
        undoEditor(activeTab);
      }
    });
  }

  function isGuideSnapActive(deps, kind) {
    const { state } = deps;
    if (kind === 'pip') return (state.pipShowGuides !== false) && (state.pipSnapEnabled !== false);
    return (state.flexShowGuides !== false) && (state.flexSnapEnabled !== false);
  }

  function updateGuideSnapUi(deps, kind) {
    const { byId } = deps;
    const showEl = byId(kind === 'pip' ? 'pipShowGuides' : 'flexShowGuides');
    const snapEl = byId(kind === 'pip' ? 'pipSnapEnabled' : 'flexSnapEnabled');
    const distEl = byId(kind === 'pip' ? 'pipSnapDistance' : 'flexSnapDistance');
    if (!showEl || !snapEl || !distEl) return;
    const show = !!showEl.checked;
    snapEl.disabled = !show;
    distEl.disabled = !show || !snapEl.checked;
  }

  function initConnectionButtons(deps) {
    const { byId, api, state, scheduleUiSync, syncUiFromState, setConnState, setModelState, applyModelCapabilities } = deps;
    const syncButton = byId('btnSyncNow');

    async function manualStateRefresh() {
      if (!syncButton) return;
      const oldText = syncButton.textContent;
      syncButton.disabled = true;
      syncButton.textContent = t('connect.syncing');
      try {
        await api('/api/state/refresh', 'POST', {});
        await new Promise((resolve) => setTimeout(resolve, 350));
        const snapshot = await api('/api/state');
        if (state && typeof state === 'object') {
          state.connection = snapshot.connection || state.connection || {};
          state.values = snapshot.state || {};
          state.stateById = snapshot.stateById || {};
          state.model = snapshot.model || state.model || null;
          state.modelSelection = snapshot.modelSelection || state.modelSelection || null;
          state.editLocks = { pip: {}, flex: {} };
          if (state.editor?.pip) state.editor.pip.dirty = false;
          if (state.editor?.flex) state.editor.flex.dirty = false;
          try { if (typeof setConnState === 'function') setConnState(); } catch (_) {}
          try { if (typeof setModelState === 'function') setModelState(); } catch (_) {}
          try {
            if (typeof syncUiFromState === 'function') syncUiFromState();
            else if (typeof global.__DVIPSyncUiFromState === 'function') global.__DVIPSyncUiFromState();
            else if (typeof scheduleUiSync === 'function') scheduleUiSync();
          } catch (_) {
            try {
              if (typeof global.__DVIPSyncUiFromState === 'function') global.__DVIPSyncUiFromState();
              else if (typeof scheduleUiSync === 'function') scheduleUiSync();
            } catch (_) {}
          }
          try { if (typeof applyModelCapabilities === 'function') applyModelCapabilities(); } catch (_) {}
        }
      } finally {
        syncButton.disabled = false;
        syncButton.textContent = oldText || t('connect.syncNow');
      }
    }

    byId('btnConnect')?.addEventListener('click', async () => {
      await api('/api/connect', 'POST', {
        host: byId('host')?.value.trim(),
        realtimePort: Number(byId('rtPort')?.value),
        commandPort: Number(byId('cmdPort')?.value),
      });
      setTimeout(() => {
        api('/api/state/refresh', 'POST', {}).catch(() => {});
      }, 250);
    });
    byId('btnDisconnect')?.addEventListener('click', async () => {
      await api('/api/disconnect', 'POST', {});
    });
    syncButton?.addEventListener('click', manualStateRefresh);
  }

  function applySavedConnectionConfig(deps, cfg) {
    const { byId } = deps;
    if (!cfg || typeof cfg !== 'object') return;
    if (cfg.host && byId('host')) byId('host').value = String(cfg.host);
    if (Number.isFinite(Number(cfg.realtimePort)) && byId('rtPort')) byId('rtPort').value = String(Number(cfg.realtimePort));
    if (Number.isFinite(Number(cfg.commandPort)) && byId('cmdPort')) byId('cmdPort').value = String(Number(cfg.commandPort));
  }

  function handleStateRows(deps, rows) {
    const { state, scheduleUiSync } = deps;
    for (const item of rows || []) {
      state.values[item.key] = item.value;
      if (
        item
        && Number.isInteger(item.sectionId)
        && Number.isInteger(item.subSectionId)
        && Number.isInteger(item.controlId)
      ) {
        state.stateById[`${item.sectionId}:${item.subSectionId}:${item.controlId}`] = item.value;
        if (item.label) state.values[item.label] = item.value;
      }
    }
    scheduleUiSync();
  }

  function startEvents(deps) {
    const { state, setConnState, setModelState, applyModelCapabilities, scheduleUiSync } = deps;
    if (global.DVIPApiClient && typeof global.DVIPApiClient.startEvents === 'function') {
      global.DVIPApiClient.startEvents({
        onBootstrap: (data) => {
          state.connection = data.connection || {};
          state.values = data.state || {};
          state.stateById = data.stateById || {};
          setConnState();
          if (data.model) state.model = data.model;
          if (data.modelSelection) state.modelSelection = data.modelSelection;
          setModelState();
          if (typeof applyModelCapabilities === 'function') applyModelCapabilities();
          scheduleUiSync();
        },
        onConnection: (data) => {
          state.connection = data || {};
          setConnState();
        },
        onState: (rows) => handleStateRows(deps, rows),
        onModel: (data) => {
          state.modelSelection = data || null;
          state.model = (data && data.detected) ? data.detected : state.model;
          setModelState();
          if (typeof applyModelCapabilities === 'function') applyModelCapabilities();
        },
      });
      return;
    }

    const events = new EventSource('/api/events');
    events.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'bootstrap') {
        state.connection = msg.data.connection || {};
        state.values = msg.data.state || {};
        state.stateById = msg.data.stateById || {};
        if (msg.data.model) state.model = msg.data.model;
        if (msg.data.modelSelection) state.modelSelection = msg.data.modelSelection;
        setConnState();
        setModelState();
        if (typeof applyModelCapabilities === 'function') applyModelCapabilities();
        scheduleUiSync();
        return;
      }
      if (msg.type === 'connection') {
        state.connection = msg.data || {};
        setConnState();
        return;
      }
      if (msg.type === 'model') {
        state.modelSelection = msg.data || null;
        state.model = (msg.data && msg.data.detected) ? msg.data.detected : state.model;
        setModelState();
        if (typeof applyModelCapabilities === 'function') applyModelCapabilities();
        return;
      }
      if (msg.type === 'state') handleStateRows(deps, msg.data);
    };
  }

  global.DVIPAppShell = {
    initNumberWheelNudge,
    initSliderWheelNudge,
    initTabs,
    applyModelCapabilities,
    initFineAdjustHotkey,
    initUndoHotkey,
    isGuideSnapActive,
    updateGuideSnapUi,
    initConnectionButtons,
    applySavedConnectionConfig,
    startEvents,
  };
}(window));










