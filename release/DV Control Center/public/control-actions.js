/* global window */
(function initControlActions(global) {
  function saveFlexBanksState(deps) {
    const { state } = deps;
    localStorage.setItem('datavideo_flex_banks', JSON.stringify(state.flexBanks || {}));
    if (global.DVCCUiSettings && typeof global.DVCCUiSettings.saveFlexBanks === 'function') {
      global.DVCCUiSettings.saveFlexBanks(state.flexBanks || {}).catch(() => {});
    }
  }

  async function loadFlexBanksState(deps) {
    const { state } = deps;
    let loaded = null;
    try {
      if (global.DVCCUiSettings && typeof global.DVCCUiSettings.getFlexBanks === 'function') {
        loaded = await global.DVCCUiSettings.getFlexBanks();
      }
    } catch (_) {
      loaded = null;
    }
    if (loaded && typeof loaded === 'object' && Object.keys(loaded).length > 0) {
      state.flexBanks = loaded;
      return;
    }
    try {
      const raw = localStorage.getItem('datavideo_flex_banks') || localStorage.getItem('se3200_flex_banks');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') state.flexBanks = parsed;
    } catch (e) {
      // ignore broken local storage values
    }
  }

  function captureCurrentFlexBankState(deps) {
    const { state, byId, FLEX_WINDOW_COUNT } = deps;
    return {
      view: Number(state.flexView) || 2,
      bg: Number(byId('flexBg')?.value || 0),
      fg: Number(byId('flexFg')?.value || 0),
      fgEnable: !!byId('flexFgEnable')?.checked,
      windows: Array.from({ length: FLEX_WINDOW_COUNT }, (_, n) => n + 1).map((i) => ({
        en: !!byId(`flex${i}-en`)?.checked,
        src: Number(byId(`flex${i}-src`)?.value || 0),
        x: Number(byId(`flex${i}-x`)?.value || 0),
        y: Number(byId(`flex${i}-y`)?.value || 0),
        s: Number(byId(`flex${i}-s`)?.value || 2),
        cl: Number(byId(`flex${i}-cl`)?.value || 0),
        cr: Number(byId(`flex${i}-cr`)?.value || 0),
        ct: Number(byId(`flex${i}-ct`)?.value || 0),
        cb: Number(byId(`flex${i}-cb`)?.value || 0),
      })),
    };
  }

  function makeDefaultFlexBankState(deps) {
    const { byId, FLEX_WINDOW_COUNT, getFlexDefaultWindow } = deps;
    return {
      view: 2,
      bg: Number(byId('flexBg')?.value || 0),
      fg: Number(byId('flexFg')?.value || 0),
      fgEnable: !!byId('flexFgEnable')?.checked,
      windows: Array.from({ length: FLEX_WINDOW_COUNT }, (_, n) => n + 1).map((i) => {
        const def = getFlexDefaultWindow(i);
        return {
          en: def.en,
          src: Number(byId(`flex${i}-src`)?.value || 0),
          x: def.x,
          y: def.y,
          s: def.s,
          cl: 0,
          cr: 0,
          ct: 0,
          cb: 0,
        };
      }),
    };
  }

  function applyFlexBankState(deps, bank) {
    const { state, byId, FLEX_WINDOW_COUNT, getFlexDefaultWindow, setFlexWindowInputs } = deps;
    if (!bank) return;
    state.flexView = Number(bank.view) || 2;
    if (byId('flexBg')) byId('flexBg').value = String(bank.bg ?? byId('flexBg').value);
    if (byId('flexFg')) byId('flexFg').value = String(bank.fg ?? byId('flexFg').value);
    if (byId('flexFgEnable')) byId('flexFgEnable').checked = !!bank.fgEnable;
    for (let i = 1; i <= FLEX_WINDOW_COUNT; i += 1) {
      const v = bank.windows?.[i - 1] || getFlexDefaultWindow(i);
      setFlexWindowInputs(i, v);
      if (byId(`flex${i}-src`) && v.src !== undefined) byId(`flex${i}-src`).value = String(v.src);
    }
  }

  function updateFlexBankUi(deps) {
    const { state, byId } = deps;
    const active = state.activeFlexBank || 1;
    const b1 = byId('flexBank1');
    const b2 = byId('flexBank2');
    if (b1) b1.classList.toggle('inactive', active !== 1);
    if (b2) b2.classList.toggle('inactive', active !== 2);
  }

  function switchFlexBank(deps, nextBank) {
    const { state, drawFlexCanvas } = deps;
    const current = Number(state.activeFlexBank) || 1;
    if (current === nextBank) return;
    state.flexBanks[current] = captureCurrentFlexBankState(deps);
    state.activeFlexBank = nextBank;
    if (!state.flexBanks[nextBank]) state.flexBanks[nextBank] = makeDefaultFlexBankState(deps);
    applyFlexBankState(deps, state.flexBanks[nextBank]);
    saveFlexBanksState(deps);
    updateFlexBankUi(deps);
    drawFlexCanvas();
  }

  async function initFlexBanks(deps) {
    const { state, byId } = deps;
    await loadFlexBanksState(deps);
    if (!state.flexBanks[1]) state.flexBanks[1] = makeDefaultFlexBankState(deps);
    if (!state.flexBanks[2]) state.flexBanks[2] = makeDefaultFlexBankState(deps);
    state.activeFlexBank = Number(state.activeFlexBank) || 1;
    if (state.flexBanks[state.activeFlexBank]) applyFlexBankState(deps, state.flexBanks[state.activeFlexBank]);
    updateFlexBankUi(deps);
    byId('flexBank1')?.addEventListener('click', () => switchFlexBank(deps, 1));
    byId('flexBank2')?.addEventListener('click', () => switchFlexBank(deps, 2));
  }

  async function applyPip(deps, n) {
    const { markEditLock, byId, pctToRawPos, pctToRawScale, updatePipBorderUi, api, releaseEditLock } = deps;
    markEditLock('pip', n);
    const x = pctToRawPos(byId(`pip${n}-x`).value);
    const y = pctToRawPos(byId(`pip${n}-y`).value);
    const s = pctToRawScale(byId(`pip${n}-s`).value);
    byId(`pip${n}-w`).value = s.toFixed(4);
    byId(`pip${n}-h`).value = s.toFixed(4);
    const borderOn = byId(`pip${n}-borderOn`)?.checked ? 1 : 0;
    const borderStyle = borderOn ? Math.max(1, Number(byId(`pip${n}-bs`).value || 1)) : 0;
    byId(`pip${n}-bs`).value = String(borderStyle);
    updatePipBorderUi(n);
    await api('/api/control/batch', 'POST', {
      updates: [
        { label: `SWITCHER_PINP${n}_ENABLE`, value: byId(`pip${n}-en`).checked ? 1 : 0 },
        { label: `SWITCHER_PINP${n}_POSITION_X`, value: x },
        { label: `SWITCHER_PINP${n}_POSITION_Y`, value: y },
        { label: `SWITCHER_PINP${n}_SIZE_Z`, value: s },
        { label: `SWITCHER_PINP${n}_EDGE_LEFT`, value: Number(byId(`pip${n}-cl`).value) },
        { label: `SWITCHER_PINP${n}_EDGE_RIGHT`, value: Number(byId(`pip${n}-cr`).value) },
        { label: `SWITCHER_PINP${n}_EDGE_TOP`, value: Number(byId(`pip${n}-ct`).value) },
        { label: `SWITCHER_PINP${n}_EDGE_BOTTOM`, value: Number(byId(`pip${n}-cb`).value) },
        { label: `SWITCHER_PINP${n}_BORDER_STYLE`, value: borderStyle },
        { label: `SWITCHER_PINP${n}_BORDER_OPACITY`, value: Number(byId(`pip${n}-bo`).value) },
        { label: `SWITCHER_PINP${n}_BORDER_SIZE`, value: Number(byId(`pip${n}-bw`).value) },
        { label: `SWITCHER_PINP${n}_BORDER_HUE`, value: Number(byId(`pip${n}-bh`).value) },
        { label: `SWITCHER_PINP${n}_BORDER_SAT`, value: Number(byId(`pip${n}-bsa`).value) },
        { label: `SWITCHER_PINP${n}_BORDER_LUMA`, value: Number(byId(`pip${n}-bl`).value) },
      ],
    });
    releaseEditLock('pip', n, 1600);
  }

  async function applyAllPip(deps) {
    const { byId, sendControl, commitEditor } = deps;
    const applyOne = (typeof deps.applyPip === 'function')
      ? (i) => deps.applyPip(i)
      : (i) => applyPip(deps, i);
    for (let i = 1; i <= 4; i += 1) {
      await applyOne(i);
      await sendControl(`SWITCHER_KEY${i}_KEY_SRC`, Number(byId(`pip${i}-src`).value || 0));
    }
    commitEditor('pip');
  }

  async function applyFlexWindow(deps, i) {
    const {
      state, markEditLock, byId, pctToRawPos, pctToRawScale, sendRawControl, flexControlId, flexRawId, releaseEditLock,
    } = deps;
    markEditLock('flex', i);
    const subSection = (Number(state.activeFlexBank) || 1) === 2 ? 3 : 2;
    const x = pctToRawPos(byId(`flex${i}-x`).value);
    const y = pctToRawPos(byId(`flex${i}-y`).value);
    const s = pctToRawScale(byId(`flex${i}-s`).value);
    byId(`flex${i}-w`).value = s.toFixed(4);
    byId(`flex${i}-h`).value = s.toFixed(4);
    const borderOn = byId(`flex${i}-borderOn`)?.checked ? 1 : 0;
    const borderStyle = borderOn ? Math.max(1, Number(byId(`flex${i}-bs`).value || 1)) : 0;
    byId(`flex${i}-bs`).value = String(borderStyle);
    await Promise.all([
      sendRawControl(2, subSection, flexControlId(i, 'en'), 'flag', byId(`flex${i}-en`).checked ? 1 : 0),
      sendRawControl(2, subSection, flexControlId(i, 'x'), 'float', x),
      sendRawControl(2, subSection, flexControlId(i, 'y'), 'float', y),
      sendRawControl(2, subSection, flexControlId(i, 'w'), 'float', s),
      sendRawControl(2, subSection, flexControlId(i, 'cl'), 'float', Number(byId(`flex${i}-cl`).value)),
      sendRawControl(2, subSection, flexControlId(i, 'cr'), 'float', Number(byId(`flex${i}-cr`).value)),
      sendRawControl(2, subSection, flexControlId(i, 'ct'), 'float', Number(byId(`flex${i}-ct`).value)),
      sendRawControl(2, subSection, flexControlId(i, 'cb'), 'float', Number(byId(`flex${i}-cb`).value)),
      sendRawControl(2, subSection, flexRawId(i, 14), 'int', borderStyle),
      sendRawControl(2, subSection, flexRawId(i, 15), 'float', Number(byId(`flex${i}-bo`).value)),
      sendRawControl(2, subSection, flexRawId(i, 16), 'float', Number(byId(`flex${i}-bw`).value)),
      sendRawControl(2, subSection, flexRawId(i, 22), 'float', Number(byId(`flex${i}-bh`).value)),
      sendRawControl(2, subSection, flexRawId(i, 23), 'float', Number(byId(`flex${i}-bsa`).value)),
      sendRawControl(2, subSection, flexRawId(i, 24), 'float', Number(byId(`flex${i}-bl`).value)),
    ]);
    releaseEditLock('flex', i, 1600);
  }

  async function applyAllFlex(deps) {
    const { byId, sendControl, commitEditor, FLEX_WINDOW_COUNT } = deps;
    const applyOne = (typeof deps.applyFlexWindow === 'function')
      ? (i) => deps.applyFlexWindow(i)
      : (i) => applyFlexWindow(deps, i);
    await sendControl('SWITCHER_FLEX_SRC_BGND_SRC', Number(byId('flexBg')?.value || 0));
    await sendControl('SWITCHER_FLEX_SRC_FGND_SRC', Number(byId('flexFg')?.value || 0));
    await sendControl('SWITCHER_FLEX_SRC_FGND_ENABLE', byId('flexFgEnable')?.checked ? 1 : 0);
    for (let i = 1; i <= FLEX_WINDOW_COUNT; i += 1) {
      await sendControl(`SWITCHER_FLEX_SRC_DVE${i}_SRC`, Number(byId(`flex${i}-src`)?.value || 0));
      await applyOne(i);
    }
    commitEditor('flex');
  }

  global.DVIPControlActions = {
    saveFlexBanksState,
    loadFlexBanksState,
    captureCurrentFlexBankState,
    makeDefaultFlexBankState,
    applyFlexBankState,
    updateFlexBankUi,
    switchFlexBank,
    initFlexBanks,
    applyPip,
    applyAllPip,
    applyFlexWindow,
    applyAllFlex,
  };
  // Backward compatibility for tests/integrations loading this file directly.
  if (!global.SE3200ControlActions) global.SE3200ControlActions = global.DVIPControlActions;
}(window));






