/* global window, document */
(function initControlsUi(global) {
  function t(key, vars) {
    if (global.DVIPI18n && typeof global.DVIPI18n.t === 'function') return global.DVIPI18n.t(key, vars);
    return key;
  }

function renderPipGuidesList(deps) {
    const { byId, state } = deps;
    const target = byId('pipGuidesList');
    if (!target) return;
    const v = (state.pipGuides?.v || []).map((n, idx) => `V${idx + 1}:${n.toFixed(1)}%`).join(', ');
    const h = (state.pipGuides?.h || []).map((n, idx) => `H${idx + 1}:${n.toFixed(1)}%`).join(', ');
    target.textContent = `Guides -> ${v || 'no vertical'} | ${h || 'no horizontal'}`;
  }

  function updatePipBorderUi(deps, i) {
    const { byId } = deps;
    const on = !!byId(`pip${i}-borderOn`)?.checked;
    const box = byId(`pip${i}-borderFields`);
    const toggle = byId(`pip${i}-borderToggle`);
    if (toggle && !on) toggle.open = false;
    if (box) box.style.display = on ? '' : 'none';
  }

  function renderGuidesList(deps) {
    const { byId, state } = deps;
    const target = byId('guidesList');
    if (!target) return;
    const v = (state.flexGuides?.v || []).map((n, idx) => `V${idx + 1}:${n.toFixed(1)}%`).join(', ');
    const h = (state.flexGuides?.h || []).map((n, idx) => `H${idx + 1}:${n.toFixed(1)}%`).join(', ');
    target.textContent = `Guides -> ${v || 'no vertical'} | ${h || 'no horizontal'}`;
  }

  function setActionStatus(byId, id, text, isError = false) {
    const el = byId(id);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('error', !!isError);
  }

  async function runActionButton(byId, buttonId, statusId, runningLabel, okLabel, action) {
    const btn = byId(buttonId);
    if (!btn || btn.dataset.busy === '1') return;
    const oldText = btn.textContent;
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.textContent = runningLabel;
    setActionStatus(byId, statusId, runningLabel, false);
    try {
      await action();
      setActionStatus(byId, statusId, okLabel, false);
    } catch (err) {
      const msg = (err && err.message) ? String(err.message) : t('action.failed');
      setActionStatus(byId, statusId, msg, true);
    } finally {
      btn.dataset.busy = '0';
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  function updateFlexBorderUi(deps, i) {
    const { byId } = deps;
    const on = !!byId(`flex${i}-borderOn`)?.checked;
    const box = byId(`flex${i}-borderFields`);
    const toggle = byId(`flex${i}-borderToggle`);
    if (toggle && !on) toggle.open = false;
    if (box) box.style.display = on ? '' : 'none';
  }

  function buildPipControls(deps) {
    const {
      byId, pickValues, fillSelect, state, getPipDefaultWindow, sliderNumberField, rawPosToPct, rawScaleToPct,
      bindSliderNumber, markEditorDirty, markEditLock, pushEditorHistory, pctToRawScale, drawPipCanvas,
      updatePipBorderUi: updateBorder, saveFlexEditorState, updateGuideSnapUi, renderPipGuidesList: renderGuides,
      downloadJsonFile, loadJsonFileFromDisk, normalizeGuidesPayload, applyAllPip, rollbackEditor, undoEditor, redoEditor,
    } = deps;
    const box = byId('pipControls');
    const srcValues = pickValues('SWITCHER_KEY1_KEY_SRC');
    box.innerHTML = '';
    for (let i = 1; i <= 4; i += 1) {
      const def = getPipDefaultWindow(i);
      const c = document.createElement('div');
      c.className = 'card window-card';
      c.innerHTML = `
        <div class="window-head">
          <input id="pip${i}-en" type="checkbox">
          <div class="title">${t('pip.window', { index: i })}</div>
          <label class="src-inline"><span>${t('common.source')}</span><select id="pip${i}-src"></select></label>
        </div>
        <div class="window-grid">
          ${sliderNumberField(`pip${i}-x`, 'X', -100, 100, rawPosToPct(def.x))}
          ${sliderNumberField(`pip${i}-y`, 'Y', -100, 100, rawPosToPct(def.y))}
          ${sliderNumberField(`pip${i}-s`, 'Scale', 0, 100, rawScaleToPct(def.s))}
          <details id="pip${i}-cropToggle" class="fold span2">
            <summary>${t('common.crop')}</summary>
            <div class="fold-body">
              ${sliderNumberField(`pip${i}-cl`, 'Crop >', 0, 100, 0)}
              ${sliderNumberField(`pip${i}-cr`, 'Crop <', 0, 100, 0)}
              ${sliderNumberField(`pip${i}-cb`, 'Crop ^', 0, 100, 0)}
              ${sliderNumberField(`pip${i}-ct`, 'Crop v', 0, 100, 0)}
            </div>
          </details>
          <label class="mini-label"><span>${t('common.border')}</span><input id="pip${i}-borderOn" type="checkbox" checked></label>
          <details id="pip${i}-borderToggle" class="fold span2">
            <summary>${t('common.borderControls')}</summary>
            <div id="pip${i}-borderFields" class="border-fields">
              <label class="mini-label"><span>${t('common.borderStyle')}</span><input id="pip${i}-bs" type="number" min="0" max="20" step="1" value="1"></label>
              <label class="mini-label"><span>${t('common.borderOpacity')}</span><input id="pip${i}-bo" type="number" min="0" max="100" step="0.01" value="100"></label>
              <label class="mini-label"><span>${t('common.borderWidth')}</span><input id="pip${i}-bw" type="number" min="0" max="100" step="0.01" value="2"></label>
              <label class="mini-label"><span>${t('common.borderHue')}</span><input id="pip${i}-bh" type="number" min="0" max="360" step="0.01" value="60"></label>
              <label class="mini-label"><span>${t('common.borderSat')}</span><input id="pip${i}-bsa" type="number" min="0" max="100" step="0.01" value="80"></label>
              <label class="mini-label"><span>${t('common.borderLuma')}</span><input id="pip${i}-bl" type="number" min="0" max="100" step="0.01" value="100"></label>
            </div>
          </details>
        </div>
        <input id="pip${i}-w" type="hidden" value="${def.s.toFixed(4)}">
        <input id="pip${i}-h" type="hidden" value="${def.s.toFixed(4)}">
      `;
      box.appendChild(c);

      fillSelect(byId(`pip${i}-src`), srcValues);
      byId(`pip${i}-src`)?.addEventListener('change', () => {
        markEditorDirty('pip');
        markEditLock('pip', i);
        pushEditorHistory('pip');
      });
      bindSliderNumber(`pip${i}-x`, 'pip', i);
      bindSliderNumber(`pip${i}-y`, 'pip', i);
      bindSliderNumber(`pip${i}-s`, 'pip', i);
      bindSliderNumber(`pip${i}-cl`, 'pip', i);
      bindSliderNumber(`pip${i}-cr`, 'pip', i);
      bindSliderNumber(`pip${i}-cb`, 'pip', i);
      bindSliderNumber(`pip${i}-ct`, 'pip', i);
      byId(`pip${i}-s`)?.addEventListener('input', () => {
        markEditLock('pip', i);
        markEditorDirty('pip');
        const s = pctToRawScale(byId(`pip${i}-s`).value);
        byId(`pip${i}-w`).value = s.toFixed(4);
        byId(`pip${i}-h`).value = s.toFixed(4);
        drawPipCanvas();
      });
      byId(`pip${i}-borderOn`)?.addEventListener('change', () => {
        markEditorDirty('pip');
        markEditLock('pip', i);
        if (byId(`pip${i}-borderOn`).checked && Number(byId(`pip${i}-bs`).value || 0) <= 0) byId(`pip${i}-bs`).value = '1';
        if (!byId(`pip${i}-borderOn`).checked) byId(`pip${i}-bs`).value = '0';
        updateBorder(i);
        drawPipCanvas();
      });
      ['en', 'x', 'y', 'cl', 'cr', 'ct', 'cb', 'bs', 'bw', 'bo', 'bh', 'bsa', 'bl'].forEach((k) => byId(`pip${i}-${k}`)?.addEventListener('input', () => {
        markEditorDirty('pip');
        markEditLock('pip', i);
        if (k === 'bs' && Number(byId(`pip${i}-bs`)?.value || 0) <= 0) byId(`pip${i}-borderOn`).checked = false;
        if (k === 'bs' && Number(byId(`pip${i}-bs`)?.value || 0) > 0) byId(`pip${i}-borderOn`).checked = true;
        updateBorder(i);
        drawPipCanvas();
      }));
      byId(`pip${i}-en`).checked = true;
      updateBorder(i);
    }

    byId('pipGridDensity').value = state.pipGridDensity || 24;
    byId('pipShowGuides').checked = state.pipShowGuides !== false;
    byId('pipSafeMargins').checked = !!state.pipSafeMargins;
    byId('pipSnapEnabled').checked = state.pipSnapEnabled !== false;
    byId('pipSnapDistance').value = state.pipSnapDistance || 10;

    byId('pipGridDensity')?.addEventListener('input', () => {
      state.pipGridDensity = Number(byId('pipGridDensity').value) || 24;
      saveFlexEditorState();
      drawPipCanvas();
    });
    byId('pipShowGuides')?.addEventListener('change', () => {
      state.pipShowGuides = byId('pipShowGuides').checked;
      saveFlexEditorState();
      updateGuideSnapUi('pip');
      drawPipCanvas();
    });
    byId('pipSafeMargins')?.addEventListener('change', () => {
      state.pipSafeMargins = byId('pipSafeMargins').checked;
      saveFlexEditorState();
      drawPipCanvas();
    });
    byId('pipSnapEnabled')?.addEventListener('change', () => {
      state.pipSnapEnabled = byId('pipSnapEnabled').checked;
      saveFlexEditorState();
      updateGuideSnapUi('pip');
    });
    byId('pipSnapDistance')?.addEventListener('input', () => {
      state.pipSnapDistance = Number(byId('pipSnapDistance').value) || 10;
      saveFlexEditorState();
    });
    updateGuideSnapUi('pip');
    byId('addPipGuideV')?.addEventListener('click', () => {
      state.pipGuides.v.push(50);
      state.pipGuides.v.sort((a, b) => a - b);
      saveFlexEditorState();
      renderGuides();
      drawPipCanvas();
    });
    byId('addPipGuideH')?.addEventListener('click', () => {
      state.pipGuides.h.push(50);
      state.pipGuides.h.sort((a, b) => a - b);
      saveFlexEditorState();
      renderGuides();
      drawPipCanvas();
    });
    byId('clearPipGuides')?.addEventListener('click', () => {
      state.pipGuides = { v: [], h: [] };
      saveFlexEditorState();
      renderGuides();
      drawPipCanvas();
    });
    byId('savePipGuides')?.addEventListener('click', () => {
      downloadJsonFile('datavideo-pip-guides.json', { type: 'datavideo-guides', editor: 'pip', savedAt: new Date().toISOString(), guides: state.pipGuides });
    });
    byId('loadPipGuides')?.addEventListener('click', async () => {
      const parsed = await loadJsonFileFromDisk();
      if (!parsed) return;
      state.pipGuides = normalizeGuidesPayload(parsed);
      saveFlexEditorState();
      renderGuides();
      drawPipCanvas();
    });
    renderGuides();
    byId('pipSaveAll')?.addEventListener('click', () => runActionButton(byId, 'pipSaveAll', 'pipActionStatus', t('action.savingPip'), t('action.pipSaved'), async () => {
      await applyAllPip();
    }));
    byId('pipCancelAll')?.addEventListener('click', () => {
      rollbackEditor('pip');
      setActionStatus(byId, 'pipActionStatus', t('action.pipCanceled'), false);
    });
    byId('pipUndo')?.addEventListener('click', () => {
      undoEditor('pip');
      setActionStatus(byId, 'pipActionStatus', t('action.pipUndone'), false);
    });
    byId('pipRedo')?.addEventListener('click', () => {
      redoEditor('pip');
      setActionStatus(byId, 'pipActionStatus', t('action.pipRedone'), false);
    });
  }

  function buildFlexWindowControls(deps) {
    const {
      byId, pickValues, fillSelect, state, FLEX_WINDOW_COUNT, getFlexDefaultWindow, sliderNumberField,
      rawPosToPct, rawScaleToPct, bindSliderNumber, markEditorDirty, markEditLock, pushEditorHistory,
      pctToRawScale, drawFlexCanvas, updateFlexBorderUi: updateBorder, saveFlexEditorState, updateGuideSnapUi,
      renderGuidesList: renderGuides, downloadJsonFile, loadJsonFileFromDisk, normalizeGuidesPayload,
      applyAllFlex, rollbackEditor, undoEditor, redoEditor, saveCurrentMergePreset,
      FLEX_POS_MIN, FLEX_POS_MAX, FLEX_SIZE_MAX,
    } = deps;
    const box = byId('flexWindowControls');
    const srcValues = pickValues('SWITCHER_FLEX_SRC_BGND_SRC');
    const flexBorderValues = pickValues('SWITCHER_FLEX_SRC_DVE1_BORDER_STYLE');
    const pipBorderValues = pickValues('SWITCHER_PINP1_BORDER_STYLE');
    const rawBorderStyleValues = (Array.isArray(flexBorderValues) && flexBorderValues.length > 0)
      ? flexBorderValues
      : ((Array.isArray(pipBorderValues) && pipBorderValues.length > 0)
        ? pipBorderValues
        : [
        { id: 0, label: 'BORDER_OFF' },
        { id: 1, label: 'BORDER_NORMAL' },
        { id: 2, label: 'BORDER_SHADED' },
        { id: 3, label: 'BORDER_3D_BEVEL' },
        { id: 4, label: 'BORDER_3D_BEVEL_SHADED' },
        { id: 5, label: 'BORDER_3D_BEVEL2' },
        { id: 6, label: 'BORDER_3D_BEVEL_FLAT' },
        { id: 7, label: 'BORDER_3D_FLAT_BEVEL' },
        { id: 8, label: 'BORDER_3D_GLASS' },
        { id: 9, label: 'BORDER_3D_GLASS_SHADED' },
        { id: 10, label: 'BORDER_3D_GLASS2' },
        { id: 11, label: 'BORDER_3D_GLASS_FLAT' },
        { id: 12, label: 'BORDER_3D_FLAT_GLASS' },
      ]);
    const borderStyleValues = (rawBorderStyleValues || []).map((item) => ({
      id: item.id,
      label: String(item.label ?? item.id).replace(/^BORDER_/, ''),
    }));
    box.innerHTML = '';
    for (let i = 1; i <= FLEX_WINDOW_COUNT; i += 1) {
      const def = getFlexDefaultWindow(i);
      const c = document.createElement('div');
      c.className = 'card window-card';
      c.innerHTML = `
        <div class="window-head">
          <input id="flex${i}-en" type="checkbox">
          <div class="title">${t('flex.window', { index: i })}</div>
          <label class="src-inline"><span>${t('common.source')}</span><select id="flex${i}-src"></select></label>
        </div>
        <div class="window-grid">
          ${sliderNumberField(`flex${i}-x`, 'X', FLEX_POS_MIN, FLEX_POS_MAX, rawPosToPct(def.x))}
          ${sliderNumberField(`flex${i}-y`, 'Y', FLEX_POS_MIN, FLEX_POS_MAX, rawPosToPct(def.y))}
          ${sliderNumberField(`flex${i}-s`, 'Scale', 0, FLEX_SIZE_MAX, rawScaleToPct(def.s))}
          <details id="flex${i}-cropToggle" class="fold span2">
            <summary>${t('common.crop')}</summary>
            <div class="fold-body">
              ${sliderNumberField(`flex${i}-cl`, 'Crop >', 0, 100, 0)}
              ${sliderNumberField(`flex${i}-cr`, 'Crop <', 0, 100, 0)}
              ${sliderNumberField(`flex${i}-cb`, 'Crop ^', 0, 100, 0)}
              ${sliderNumberField(`flex${i}-ct`, 'Crop v', 0, 100, 0)}
            </div>
          </details>
          <label class="mini-label"><span>Border</span><input id="flex${i}-borderOn" type="checkbox" checked></label>
          <details id="flex${i}-borderToggle" class="fold span2">
            <summary>${t('common.borderControls')}</summary>
            <div id="flex${i}-borderFields" class="border-fields">
              <label class="mini-label"><span>${t('common.borderStyle')}</span><select id="flex${i}-bs"></select></label>
              <label class="mini-label"><span>${t('common.borderOpacity')}</span><input id="flex${i}-bo" type="number" min="0" max="100" step="0.01" value="100"></label>
              <label class="mini-label"><span>${t('common.borderWidth')}</span><input id="flex${i}-bw" type="number" min="0" max="100" step="0.01" value="2"></label>
              <label class="mini-label"><span>${t('common.borderHue')}</span><input id="flex${i}-bh" type="number" min="0" max="360" step="0.01" value="60"></label>
              <label class="mini-label"><span>${t('common.borderSat')}</span><input id="flex${i}-bsa" type="number" min="0" max="100" step="0.01" value="80"></label>
              <label class="mini-label"><span>${t('common.borderLuma')}</span><input id="flex${i}-bl" type="number" min="0" max="100" step="0.01" value="100"></label>
            </div>
          </details>
        </div>
        <input id="flex${i}-w" type="hidden" value="${def.s.toFixed(4)}">
        <input id="flex${i}-h" type="hidden" value="${def.s.toFixed(4)}">
      `;
      box.appendChild(c);
      fillSelect(byId(`flex${i}-src`), srcValues);
      fillSelect(byId(`flex${i}-bs`), borderStyleValues);
      byId(`flex${i}-en`).checked = true;
      byId(`flex${i}-src`)?.addEventListener('change', () => {
        markEditorDirty('flex');
        markEditLock('flex', i);
        pushEditorHistory('flex');
      });
      bindSliderNumber(`flex${i}-x`, 'flex', i);
      bindSliderNumber(`flex${i}-y`, 'flex', i);
      bindSliderNumber(`flex${i}-s`, 'flex', i);
      bindSliderNumber(`flex${i}-cl`, 'flex', i);
      bindSliderNumber(`flex${i}-cr`, 'flex', i);
      bindSliderNumber(`flex${i}-cb`, 'flex', i);
      bindSliderNumber(`flex${i}-ct`, 'flex', i);
      byId(`flex${i}-s`)?.addEventListener('input', () => {
        markEditorDirty('flex');
        markEditLock('flex', i);
        const s = pctToRawScale(byId(`flex${i}-s`).value);
        byId(`flex${i}-w`).value = s.toFixed(4);
        byId(`flex${i}-h`).value = s.toFixed(4);
        drawFlexCanvas();
      });
      byId(`flex${i}-borderOn`)?.addEventListener('change', () => {
        markEditorDirty('flex');
        markEditLock('flex', i);
        if (byId(`flex${i}-borderOn`).checked && Number(byId(`flex${i}-bs`).value || 0) <= 0) byId(`flex${i}-bs`).value = '1';
        if (!byId(`flex${i}-borderOn`).checked) byId(`flex${i}-bs`).value = '0';
        updateBorder(i);
        drawFlexCanvas();
      });
      byId(`flex${i}-bs`)?.addEventListener('change', () => {
        markEditorDirty('flex');
        markEditLock('flex', i);
        if (Number(byId(`flex${i}-bs`)?.value || 0) <= 0) byId(`flex${i}-borderOn`).checked = false;
        if (Number(byId(`flex${i}-bs`)?.value || 0) > 0) byId(`flex${i}-borderOn`).checked = true;
        updateBorder(i);
        drawFlexCanvas();
      });
      ['en', 'x', 'y', 'cl', 'cr', 'ct', 'cb', 'bs', 'bw', 'bo', 'bh', 'bsa', 'bl'].forEach((k) => byId(`flex${i}-${k}`)?.addEventListener('input', () => {
        markEditorDirty('flex');
        markEditLock('flex', i);
        if (k === 'bs' && Number(byId(`flex${i}-bs`)?.value || 0) <= 0) byId(`flex${i}-borderOn`).checked = false;
        if (k === 'bs' && Number(byId(`flex${i}-bs`)?.value || 0) > 0) byId(`flex${i}-borderOn`).checked = true;
        updateBorder(i);
        drawFlexCanvas();
      }));
      updateBorder(i);
    }

    byId('flexGridDensity').value = state.flexGridDensity || 24;
    byId('flexShowGuides').checked = state.flexShowGuides !== false;
    byId('flexSafeMargins').checked = !!state.flexSafeMargins;
    byId('flexSnapEnabled').checked = state.flexSnapEnabled !== false;
    byId('flexSnapDistance').value = state.flexSnapDistance || 10;

    byId('flexGridDensity')?.addEventListener('input', () => {
      state.flexGridDensity = Number(byId('flexGridDensity').value) || 24;
      saveFlexEditorState();
      drawFlexCanvas();
    });
    byId('flexShowGuides')?.addEventListener('change', () => {
      state.flexShowGuides = byId('flexShowGuides').checked;
      saveFlexEditorState();
      updateGuideSnapUi('flex');
      drawFlexCanvas();
    });
    byId('flexSafeMargins')?.addEventListener('change', () => {
      state.flexSafeMargins = byId('flexSafeMargins').checked;
      saveFlexEditorState();
      drawFlexCanvas();
    });
    byId('flexSnapEnabled')?.addEventListener('change', () => {
      state.flexSnapEnabled = byId('flexSnapEnabled').checked;
      saveFlexEditorState();
      updateGuideSnapUi('flex');
    });
    byId('flexSnapDistance')?.addEventListener('input', () => {
      state.flexSnapDistance = Number(byId('flexSnapDistance').value) || 10;
      saveFlexEditorState();
    });
    updateGuideSnapUi('flex');

    byId('addGuideV')?.addEventListener('click', () => {
      state.flexGuides.v.push(50);
      state.flexGuides.v.sort((a, b) => a - b);
      saveFlexEditorState();
      renderGuides();
      drawFlexCanvas();
    });
    byId('addGuideH')?.addEventListener('click', () => {
      state.flexGuides.h.push(50);
      state.flexGuides.h.sort((a, b) => a - b);
      saveFlexEditorState();
      renderGuides();
      drawFlexCanvas();
    });
    byId('clearGuides')?.addEventListener('click', () => {
      state.flexGuides = { v: [], h: [] };
      saveFlexEditorState();
      renderGuides();
      drawFlexCanvas();
    });
    byId('saveFlexGuides')?.addEventListener('click', () => {
      downloadJsonFile('datavideo-flex-guides.json', { type: 'datavideo-guides', editor: 'flex', savedAt: new Date().toISOString(), guides: state.flexGuides });
    });
    byId('loadFlexGuides')?.addEventListener('click', async () => {
      const parsed = await loadJsonFileFromDisk();
      if (!parsed) return;
      state.flexGuides = normalizeGuidesPayload(parsed);
      saveFlexEditorState();
      renderGuides();
      drawFlexCanvas();
    });
    byId('flexSaveAll')?.addEventListener('click', () => runActionButton(byId, 'flexSaveAll', 'flexActionStatus', t('action.savingFlex'), t('action.flexSaved'), async () => {
      if (typeof saveCurrentMergePreset === 'function') {
        const saved = await saveCurrentMergePreset('flex', { preferSelected: true, confirmOverwrite: true, setStatus: false });
        if (saved === null) return;
      }
      await applyAllFlex();
    }));
    byId('flexCancelAll')?.addEventListener('click', () => {
      rollbackEditor('flex');
      setActionStatus(byId, 'flexActionStatus', t('action.flexCanceled'), false);
    });
    byId('flexUndo')?.addEventListener('click', () => {
      undoEditor('flex');
      setActionStatus(byId, 'flexActionStatus', t('action.flexUndone'), false);
    });
    byId('flexRedo')?.addEventListener('click', () => {
      redoEditor('flex');
      setActionStatus(byId, 'flexActionStatus', t('action.flexRedone'), false);
    });
    renderGuides();
  }

  global.DVIPControlsUi = {
    renderPipGuidesList,
    updatePipBorderUi,
    buildPipControls,
    renderGuidesList,
    updateFlexBorderUi,
    buildFlexWindowControls,
  };
}(window));




