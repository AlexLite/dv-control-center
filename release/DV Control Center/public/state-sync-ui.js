/* global window */
(function initStateSyncUi(global) {
  function setInputIfIdle(deps, id, value, digits) {
    const { byId } = deps;
    const el = byId(id);
    if (!el) return;
    if (document.activeElement === el) return;
    if (value === undefined || value === null || value === '') return;
    const n = Number(value);
    if (Number.isFinite(n) && digits !== null) {
      el.value = Number(n).toFixed(digits === undefined ? 2 : digits);
    } else {
      el.value = String(value);
    }
    const range = byId(`${id}-r`);
    if (range && document.activeElement !== range) {
      const rv = Number(el.value);
      if (Number.isFinite(rv)) {
        range.value = String(Math.round(rv));
      }
    }
  }

  function setCheckboxIfIdle(deps, id, checked) {
    const { byId } = deps;
    const el = byId(id);
    if (!el) return;
    if (document.activeElement === el) return;
    el.checked = Number(checked) !== 0;
  }

  function setSelectIfIdle(deps, id, value) {
    const { byId } = deps;
    const el = byId(id);
    if (!el) return;
    if (document.activeElement === el) return;
    if (value === undefined || value === null || value === '') return;
    el.value = String(value);
  }

  function syncPipWindowFromState(deps, i) {
    const {
      state, isEditLocked, controlValueById, byId, keyControlId, keyRawId,
      setCheckboxIfIdle: setCb, setInputIfIdle: setInput, rawPosToPct, rawScaleToPct,
      updatePipBorderUi, controlValue, setSelectIfIdle: setSelect,
    } = deps;
    if (isEditLocked('pip', i)) return;
    const en = controlValueById(2, 1, keyRawId(i, 0), byId(`pip${i}-en`)?.checked ? 1 : 0);
    const x = controlValueById(2, 1, keyRawId(i, 1), Number(byId(`pip${i}-x`)?.value || 0) / 100);
    const y = controlValueById(2, 1, keyRawId(i, 2), Number(byId(`pip${i}-y`)?.value || 0) / 100);
    let w = controlValueById(2, 1, keyRawId(i, 5), Number(byId(`pip${i}-w`)?.value || 1));
    let h = controlValueById(2, 1, keyRawId(i, 6), Number(byId(`pip${i}-h`)?.value || w));
    if ((en ? 1 : 0) && Number(w) <= 0) w = 1;
    if ((en ? 1 : 0) && Number(h) <= 0) h = w;
    const cl = controlValueById(2, 1, keyRawId(i, 9), byId(`pip${i}-cl`)?.value || 0);
    const cr = controlValueById(2, 1, keyRawId(i, 10), byId(`pip${i}-cr`)?.value || 0);
    const ct = controlValueById(2, 1, keyRawId(i, 11), byId(`pip${i}-ct`)?.value || 0);
    const cb = controlValueById(2, 1, keyRawId(i, 12), byId(`pip${i}-cb`)?.value || 0);

    setCb(deps, `pip${i}-en`, en);
    setInput(deps, `pip${i}-x`, rawPosToPct(x), 0);
    setInput(deps, `pip${i}-y`, rawPosToPct(y), 0);
    setInput(deps, `pip${i}-w`, w, 4);
    setInput(deps, `pip${i}-h`, h, 4);
    setInput(deps, `pip${i}-s`, rawScaleToPct(w), 0);
    setInput(deps, `pip${i}-cl`, cl, 0);
    setInput(deps, `pip${i}-cr`, cr, 0);
    setInput(deps, `pip${i}-ct`, ct, 0);
    setInput(deps, `pip${i}-cb`, cb, 0);

    setInput(deps, `pip${i}-bs`, controlValueById(2, 1, keyRawId(i, 14), byId(`pip${i}-bs`)?.value || 1), 0);
    setCb(deps, `pip${i}-borderOn`, Number(controlValueById(2, 1, keyRawId(i, 14), byId(`pip${i}-bs`)?.value || 1)) > 0);
    setInput(deps, `pip${i}-bo`, controlValueById(2, 1, keyRawId(i, 15), byId(`pip${i}-bo`)?.value || 100), 0);
    setInput(deps, `pip${i}-bw`, controlValueById(2, 1, keyRawId(i, 16), byId(`pip${i}-bw`)?.value || 2), 0);
    setInput(deps, `pip${i}-bh`, controlValueById(2, 1, keyRawId(i, 22), byId(`pip${i}-bh`)?.value || 60), 0);
    setInput(deps, `pip${i}-bsa`, controlValueById(2, 1, keyRawId(i, 23), byId(`pip${i}-bsa`)?.value || 80), 0);
    setInput(deps, `pip${i}-bl`, controlValueById(2, 1, keyRawId(i, 24), byId(`pip${i}-bl`)?.value || 100), 0);
    updatePipBorderUi(i);
    setSelect(deps, `pip${i}-src`, controlValue(`SWITCHER_KEY${i}_KEY_SRC`, byId(`pip${i}-src`)?.value));
  }

  function syncFlexWindowFromState(deps, i) {
    const {
      state, isEditLocked, controlValueById, byId, flexControlId, flexRawId,
      setCheckboxIfIdle: setCb, setInputIfIdle: setInput, rawPosToPct, rawScaleToPct,
      updateFlexBorderUi, controlValue, setSelectIfIdle: setSelect,
    } = deps;
    if (isEditLocked('flex', i)) return;
    const subSection = (Number(state.activeFlexBank) || 1) === 2 ? 3 : 2;
    const en = controlValueById(2, subSection, flexControlId(i, 'en'), byId(`flex${i}-en`)?.checked ? 1 : 0);
    const x = controlValueById(2, subSection, flexControlId(i, 'x'), Number(byId(`flex${i}-x`)?.value || 0) / 100);
    const y = controlValueById(2, subSection, flexControlId(i, 'y'), Number(byId(`flex${i}-y`)?.value || 0) / 100);
    let w = controlValueById(2, subSection, flexControlId(i, 'w'), Number(byId(`flex${i}-w`)?.value || 0.48));
    if ((en ? 1 : 0) && Number(w) <= 0) w = 1;
    const h = w;
    const cl = controlValueById(2, subSection, flexControlId(i, 'cl'), byId(`flex${i}-cl`)?.value || 0);
    const cr = controlValueById(2, subSection, flexControlId(i, 'cr'), byId(`flex${i}-cr`)?.value || 0);
    const ct = controlValueById(2, subSection, flexControlId(i, 'ct'), byId(`flex${i}-ct`)?.value || 0);
    const cb = controlValueById(2, subSection, flexControlId(i, 'cb'), byId(`flex${i}-cb`)?.value || 0);

    setCb(deps, `flex${i}-en`, en);
    setInput(deps, `flex${i}-x`, rawPosToPct(x), 0);
    setInput(deps, `flex${i}-y`, rawPosToPct(y), 0);
    setInput(deps, `flex${i}-w`, w, 4);
    setInput(deps, `flex${i}-h`, h, 4);
    setInput(deps, `flex${i}-s`, rawScaleToPct(w), 0);
    setInput(deps, `flex${i}-cl`, cl, 0);
    setInput(deps, `flex${i}-cr`, cr, 0);
    setInput(deps, `flex${i}-ct`, ct, 0);
    setInput(deps, `flex${i}-cb`, cb, 0);
    setInput(deps, `flex${i}-bs`, controlValueById(2, subSection, flexRawId(i, 14), byId(`flex${i}-bs`)?.value || 1), 0);
    setCb(deps, `flex${i}-borderOn`, Number(controlValueById(2, subSection, flexRawId(i, 14), byId(`flex${i}-bs`)?.value || 1)) > 0);
    setInput(deps, `flex${i}-bo`, controlValueById(2, subSection, flexRawId(i, 15), byId(`flex${i}-bo`)?.value || 100), 0);
    setInput(deps, `flex${i}-bw`, controlValueById(2, subSection, flexRawId(i, 16), byId(`flex${i}-bw`)?.value || 2), 0);
    setInput(deps, `flex${i}-bh`, controlValueById(2, subSection, flexRawId(i, 22), byId(`flex${i}-bh`)?.value || 60), 0);
    setInput(deps, `flex${i}-bsa`, controlValueById(2, subSection, flexRawId(i, 23), byId(`flex${i}-bsa`)?.value || 80), 0);
    setInput(deps, `flex${i}-bl`, controlValueById(2, subSection, flexRawId(i, 24), byId(`flex${i}-bl`)?.value || 100), 0);
    updateFlexBorderUi(i);
    setSelect(deps, `flex${i}-src`, controlValue(`SWITCHER_FLEX_SRC_DVE${i}_SRC`, byId(`flex${i}-src`)?.value));
  }

  function syncUiFromState(deps) {
    const {
      state, byId, controlValue, setSelectIfIdle: setSelect, setCheckboxIfIdle: setCb,
      setInputIfIdle: setInput, syncPipWindowFromState: syncPip, syncFlexWindowFromState: syncFlex,
      FLEX_WINDOW_COUNT, updateMemoryStatus, drawPipCanvas, drawFlexCanvas,
    } = deps;

    setSelect(deps, 'mvMode', controlValue('OUTPUT_MULTIVIEWER_MODE', byId('mvMode')?.value));
    setSelect(deps, 'mvMain1', controlValue('OUTPUT_MULTIVIEWER_MAIN1_SRC', byId('mvMain1')?.value));
    setSelect(deps, 'mvMain2', controlValue('OUTPUT_MULTIVIEWER_MAIN2_SRC', byId('mvMain2')?.value));
    setCb(deps, 'mvLabelsTransparent', controlValue('OUTPUT_MULTIVIEWER_TRANSP_LABELS', byId('mvLabelsTransparent')?.checked ? 1 : 0));
    setCb(deps, 'mvAutoNum', controlValue('OUTPUT_MULTIVIEWER_AUTO_NUM', byId('mvAutoNum')?.checked ? 1 : 0));
    setCb(deps, 'mvLabelInfo', controlValue('OUTPUT_MULTIVIEWER_LABEL_INFO', byId('mvLabelInfo')?.checked ? 1 : 0));

    setSelect(deps, 'flexBg', controlValue('SWITCHER_FLEX_SRC_BGND_SRC', byId('flexBg')?.value));
    setSelect(deps, 'flexFg', controlValue('SWITCHER_FLEX_SRC_FGND_SRC', byId('flexFg')?.value));
    setCb(deps, 'flexFgEnable', controlValue('SWITCHER_FLEX_SRC_FGND_ENABLE', byId('flexFgEnable')?.checked ? 1 : 0));

    for (let i = 1; i <= 12; i += 1) {
      const key = `INPUT_NAME_${i}`;
      setInput(deps, `camName-${i}`, state.values[key], null);
    }

    if (!state.editor.pip.dirty) {
      for (let i = 1; i <= 4; i += 1) syncPip(deps, i);
    }
    if (!state.editor.flex.dirty && !state.mergeAnimating) {
      for (let i = 1; i <= FLEX_WINDOW_COUNT; i += 1) syncFlex(deps, i);
    }
    setInput(deps, 'memSlot', controlValue('MEMORY_SELECT', byId('memSlot')?.value || 1), 0);
    setCb(deps, 'memLoadAll', controlValue('MEMORY_LOAD_ALL_SECTIONS', byId('memLoadAll')?.checked ? 1 : 0));
    updateMemoryStatus();
    drawPipCanvas();
    drawFlexCanvas();
  }

  function scheduleUiSync(deps) {
    if (deps.syncUiTimerRef.value) return;
    deps.syncUiTimerRef.value = setTimeout(() => {
      deps.syncUiTimerRef.value = null;
      deps.syncUiFromState(deps);
    }, 60);
  }

  global.DVIPStateSyncUi = {
    setInputIfIdle,
    setCheckboxIfIdle,
    setSelectIfIdle,
    syncPipWindowFromState,
    syncFlexWindowFromState,
    syncUiFromState,
    scheduleUiSync,
  };
}(window));








