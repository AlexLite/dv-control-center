/* global window, document */
(function initModelCapabilitiesUi(global) {
  function getSupports(state) {
    return (state?.modelSelection?.detected?.supports)
      || (state?.model?.supports)
      || {};
  }

  function isRawControlVisible(state, section, control) {
    const supports = getSupports(state);
    const label = String(control?.label || '');
    if (!label) return true;

    if (supports.flex === false) {
      const sub = Number(section?.subSection || 0);
      if (label.includes('FLEX')) return false;
      if (Number(section?.id) === 2 && (sub === 2 || sub === 3)) return false;
    }
    if (supports.multiview === false && label.startsWith('OUTPUT_MULTIVIEWER_')) return false;
    if (supports.extendedPipBorder === false && label.includes('BORDER_')) return false;

    const patterns = (state?.modelSelection?.detected?.hiddenLabelPatterns)
      || (state?.model?.hiddenLabelPatterns)
      || [];
    for (const ptn of patterns) {
      try { if (new RegExp(ptn).test(label)) return false; } catch (_) {}
    }
    return true;
  }

  function applyModelCapabilities(deps) {
    const { state, byId, refreshRawControls } = deps;
    const supports = getSupports(state);
    const allowFlex = supports.flex !== false;
    const allowMultiview = supports.multiview !== false;
    const allowExtendedPipBorder = supports.extendedPipBorder !== false;

    function setTabVisible(tabId, visible) {
      if (global.DVIPUiCore && typeof global.DVIPUiCore.setTabVisible === 'function') {
        global.DVIPUiCore.setTabVisible(byId, tabId, visible);
        return;
      }
      const btn = document.querySelector(`.tabs button[data-tab="${tabId}"]`);
      const section = byId(`tab-${tabId}`);
      if (btn) btn.style.display = visible ? '' : 'none';
      if (section) section.style.display = visible ? '' : 'none';
    }

    setTabVisible('flex', allowFlex);
    setTabVisible('multiview', allowMultiview);

    for (let i = 1; i <= 4; i += 1) {
      for (const prefix of ['pip', 'flex']) {
        const borderOn = byId(`${prefix}${i}-borderOn`);
        const borderToggle = byId(`${prefix}${i}-borderToggle`);
        const borderStyle = byId(`${prefix}${i}-bs`);
        const onLabel = borderOn && borderOn.closest ? borderOn.closest('label') : null;
        if (onLabel) onLabel.style.display = allowExtendedPipBorder ? '' : 'none';
        if (borderToggle) {
          borderToggle.style.display = allowExtendedPipBorder ? '' : 'none';
          if (!allowExtendedPipBorder) borderToggle.open = false;
        }
        if (!allowExtendedPipBorder && borderOn) borderOn.checked = false;
        if (!allowExtendedPipBorder && borderStyle) borderStyle.value = '0';
      }
    }

    if (typeof refreshRawControls === 'function') refreshRawControls();

    const activeTab = (global.DVIPUiCore && typeof global.DVIPUiCore.getActiveTabId === 'function')
      ? global.DVIPUiCore.getActiveTabId()
      : (document.querySelector('.tabs button.active')?.dataset?.tab || null);
    const activeHidden = (
      (activeTab === 'flex' && !allowFlex)
      || (activeTab === 'multiview' && !allowMultiview)
    );
    if (activeHidden) {
      if (global.DVIPUiCore && typeof global.DVIPUiCore.activateTab === 'function') {
        global.DVIPUiCore.activateTab('connect');
      } else {
        const connectBtn = document.querySelector('.tabs button[data-tab="connect"]');
        if (connectBtn) connectBtn.click();
      }
    }
  }

  global.DVIPModelCapabilitiesUi = {
    getSupports,
    isRawControlVisible,
    applyModelCapabilities,
  };
}(window));
