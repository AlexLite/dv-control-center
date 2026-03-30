/* global window, CustomEvent */
(function initAppBootstrap(global) {
  function initEditorDefaults(state) {
    state.pipGuides = { v: [], h: [] };
    state.pipGridDensity = 24;
    state.pipShowGuides = true;
    state.pipSafeMargins = false;
    state.pipSnapEnabled = true;
    state.pipSnapDistance = 10;
    state.pipActive = 1;
    state.flexGuides = { v: [], h: [] };
    state.flexGridDensity = 24;
    state.flexShowGuides = true;
    state.flexSafeMargins = false;
    state.flexSnapEnabled = true;
    state.flexSnapDistance = 10;
    state.flexView = 2;
    state.flexActive = 1;
    state.activeFlexBank = 1;
    state.flexBanks = {};
  }

  async function bootstrap(deps) {
    const {
      exposeHooks,
      state,
      loadFlexEditorState,
      initNumberWheelNudge,
      initSliderWheelNudge,
      initTabs,
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
    } = deps;

    exposeHooks();
    initEditorDefaults(state);
    await Promise.resolve(loadFlexEditorState());
    initNumberWheelNudge();
    initSliderWheelNudge();
    initTabs();
    initConnectionButtons();
    initCalibrationUi();

    const catalog = await api('/api/catalog');
    const snapshot = await api('/api/state');
    state.catalog = catalog;
    state.connection = snapshot.connection || {};
    applySavedConnectionConfig(snapshot.connectionConfig || null);
    state.values = snapshot.state || {};
    state.stateById = snapshot.stateById || {};
    state.model = snapshot.model || catalog.model || null;
    state.modelSelection = snapshot.modelSelection || catalog.modelSelection || null;
    for (const s of catalog.sections) {
      for (const c of s.controls || []) {
        state.controlsByLabel.set(c.label, c);
      }
    }

    buildMultiview();
    buildCameraNames();
    buildPipControls();
    buildFlex();
    buildMemoryControls();
    buildFlexWindowControls();
    await Promise.resolve(initFlexBanks());
    buildRawControls();
    buildMenuControls();
    enablePipMouse();
    enableFlexMouse();

    global.addEventListener('resize', () => {
      drawPipCanvas();
      drawFlexCanvas();
    });

    drawPipCanvas();
    drawFlexCanvas();
    syncUiFromState();
    commitEditor('pip');
    commitEditor('flex');
    initFineAdjustHotkey();
    initUndoHotkey();
    startEvents();
    setConnState();
    setModelState();
    if (typeof applyModelCapabilities === 'function') applyModelCapabilities();
    const detail = global.__DVIPHooks || null;
    global.dispatchEvent(new CustomEvent('DVIP:ready', { detail }));
  }

  global.DVIPAppBootstrap = {
    initEditorDefaults,
    bootstrap,
  };
}(window));
