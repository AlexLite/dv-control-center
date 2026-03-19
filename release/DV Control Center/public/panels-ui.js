/* global window, document */
(function initPanelsUi(global) {
  function t(key, vars) {
    if (global.DVIPI18n && typeof global.DVIPI18n.t === 'function') return global.DVIPI18n.t(key, vars)
    return key
  }

  function pickChoiceLabel(pickValues, label, value, fallback) {
    const values = typeof pickValues === 'function' ? pickValues(label) : [];
    const item = (values || []).find((x) => Number(x.id) === Number(value));
    return item ? item.label : fallback;
  }

  function updateMemoryStatus(deps) {
    const { byId, controlValue, pickValues } = deps;
    const el = byId('memStatus');
    if (!el) return;
    const stateCode = Number(controlValue('MEMORY_STATE', 0));
    const resultCode = Number(controlValue('MEMORY_RESULT', 0));
    const eventCode = Number(controlValue('MEMORY_EVENT', 0));
    const stateLabel = pickChoiceLabel(pickValues, 'MEMORY_STATE', stateCode, `STATE_${stateCode}`);
    const resultLabel = pickChoiceLabel(pickValues, 'MEMORY_RESULT', resultCode, `RESULT_${resultCode}`);
    el.textContent = t('memory.status', { state: stateLabel, result: resultLabel, event: eventCode });
  }

  async function runMemoryCommand(deps, commandId) {
    const { byId, clamp, sendControl, api } = deps;
    const slot = clamp(Number(byId('memSlot')?.value || 1), 1, 999);
    const loadAll = byId('memLoadAll')?.checked ? 1 : 0;
    byId('memSlot').value = String(slot);
    await sendControl('MEMORY_SELECT', slot);
    await sendControl('MEMORY_LOAD_ALL_SECTIONS', loadAll);
    await sendControl('MEMORY_COMMAND', commandId);
    setTimeout(() => {
      sendControl('MEMORY_COMMAND', 0).catch(() => {});
      api('/api/state/refresh', 'POST', {}).catch(() => {});
    }, 120);
  }

  function buildMemoryControls(deps) {
    const { byId, controlValue } = deps;
    const slot = Number(controlValue('MEMORY_SELECT', 1)) || 1;
    if (byId('memSlot')) byId('memSlot').value = String(Math.max(1, Math.min(999, slot)));
    if (byId('memLoadAll')) byId('memLoadAll').checked = Number(controlValue('MEMORY_LOAD_ALL_SECTIONS', 1)) !== 0;
    byId('memSave')?.addEventListener('click', () => runMemoryCommand(deps, 2));
    byId('memLoad')?.addEventListener('click', () => runMemoryCommand(deps, 1));
    updateMemoryStatus(deps);
  }

  function buildCameraNames(deps) {
    const { byId, api } = deps;
    const box = byId('cameraNames');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 1; i <= 12; i += 1) {
      const row = document.createElement('div');
      row.className = 'camera-name-row';
      row.innerHTML = `
        <label>${t('cameras.input', { index: i })}<input id="camName-${i}" placeholder="${t('cameras.placeholder', { index: i })}"></label>
        <button id="camBtn-${i}" class="muted">${t('cameras.save')}</button>
      `;
      box.appendChild(row);
      row.querySelector(`#camBtn-${i}`)?.addEventListener('click', async () => {
        await api('/api/input-name', 'POST', {
          input: i,
          name: row.querySelector(`#camName-${i}`)?.value || `CAM${i}`,
        });
      });
    }
  }

  function buildMultiview(deps) {
    const { byId, fillSelect, pickValues, api } = deps;
    fillSelect(byId('mvMode'), pickValues('OUTPUT_MULTIVIEWER_MODE'));
    fillSelect(byId('mvMain1'), pickValues('OUTPUT_MULTIVIEWER_MAIN1_SRC'));
    fillSelect(byId('mvMain2'), pickValues('OUTPUT_MULTIVIEWER_MAIN2_SRC'));

    byId('applyMv')?.addEventListener('click', async () => {
      await api('/api/control/batch', 'POST', {
        updates: [
          { label: 'OUTPUT_MULTIVIEWER_MODE', value: Number(byId('mvMode')?.value || 0) },
          { label: 'OUTPUT_MULTIVIEWER_MAIN1_SRC', value: Number(byId('mvMain1')?.value || 0) },
          { label: 'OUTPUT_MULTIVIEWER_MAIN2_SRC', value: Number(byId('mvMain2')?.value || 0) },
          { label: 'OUTPUT_MULTIVIEWER_TRANSP_LABELS', value: byId('mvLabelsTransparent')?.checked ? 1 : 0 },
          { label: 'OUTPUT_MULTIVIEWER_AUTO_NUM', value: byId('mvAutoNum')?.checked ? 1 : 0 },
          { label: 'OUTPUT_MULTIVIEWER_LABEL_INFO', value: byId('mvLabelInfo')?.checked ? 1 : 0 },
        ],
      });
    });
  }

  function buildFlex(deps) {
    const { byId, fillSelect, pickValues, markEditorDirty, pushEditorHistory } = deps;
    const srcValues = pickValues('SWITCHER_FLEX_SRC_BGND_SRC');
    fillSelect(byId('flexBg'), srcValues);
    fillSelect(byId('flexFg'), srcValues);
    byId('flexBg')?.addEventListener('change', () => { markEditorDirty('flex'); pushEditorHistory('flex'); });
    byId('flexFg')?.addEventListener('change', () => { markEditorDirty('flex'); pushEditorHistory('flex'); });
    byId('flexFgEnable')?.addEventListener('change', () => { markEditorDirty('flex'); pushEditorHistory('flex'); });

    byId('flexMergeToggle')?.addEventListener('click', () => {
      const panel = byId('flexMergePanel');
      if (!panel) return;
      panel.classList.toggle('hidden-panel');
    });

    byId('pipMergeToggle')?.addEventListener('click', () => {
      const panel = byId('pipMergePanel');
      if (!panel) return;
      panel.classList.toggle('hidden-panel');
    });
  }

  function buildRawControls(deps) {
    const { byId, state, sendControl, isControlVisible } = deps;
    const raw = byId('rawControls');
    const search = byId('rawSearch');
    if (!raw || !search) return;

    const render = () => {
      const q = search.value.trim().toUpperCase();
      raw.innerHTML = '';
      const sections = state.catalog.sections || [];
      for (const s of sections) {
        for (const c of s.controls || []) {
          if (!c.label || (q && !c.label.includes(q))) continue;
          if (typeof isControlVisible === 'function' && !isControlVisible(s, c)) continue;
          const box = document.createElement('div');
          box.className = 'raw-item';
          box.innerHTML = `
            <div class="raw-title">${c.label}</div>
            <div>section=${s.id} sub=${s.subSection || 0} control=${c.id} type=${c.type}</div>
            <input id="raw-${s.id}-${s.subSection || 0}-${c.id}" placeholder="${t('raw.valuePlaceholder')}">
            <button data-label="${c.label}">${t('raw.set')}</button>
          `;
          box.querySelector('button')?.addEventListener('click', async (ev) => {
            const input = box.querySelector('input')?.value;
            await sendControl(ev.target.dataset.label, input);
          });
          raw.appendChild(box);
        }
      }
    };

    search.oninput = render;
    render();
  }

  function normalizeMenuValue(control, raw) {
    const label = String(control?.label || '');
    if (isNetworkIpLabel(label)) {
      const signed = ipToSignedInt(String(raw || '').trim());
      if (signed === null) throw new Error('Invalid IP address');
      return signed;
    }
    if (isNetworkMacLabel(label)) {
      const signed = macChunkToSignedInt(String(raw || '').trim());
      if (signed === null) throw new Error('Invalid MAC value');
      return signed;
    }
    if (control.type === 'float') return Number(raw);
    if (control.type === 'string') return String(raw ?? '');
    return Math.round(Number(raw));
  }

  function signedIntToIp(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    const u = (Math.trunc(n) >>> 0);
    const a = (u >>> 24) & 255;
    const b = (u >>> 16) & 255;
    const c = (u >>> 8) & 255;
    const d = u & 255;
    return `${a}.${b}.${c}.${d}`;
  }

  function ipToSignedInt(ip) {
    const s = String(ip || '').trim();
    const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const parts = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    if (parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
    const u = (((((parts[0] * 256) + parts[1]) * 256) + parts[2]) * 256 + parts[3]) >>> 0;
    return u > 0x7fffffff ? (u - 0x100000000) : u;
  }

  function isNetworkIpLabel(label) {
    const l = String(label || '');
    return l === 'SYSTEM_NETWORK_IP_ADDR' || l === 'SYSTEM_NETWORK_GATEWAY' || l === 'SYSTEM_NETWORK_NETWORK_MASK';
  }

  function isNetworkMacLabel(label) {
    const l = String(label || '');
    return l === 'SYSTEM_NETWORK_MAC_ADDR0' || l === 'SYSTEM_NETWORK_MAC_ADDR1';
  }

  function isNetworkLabel(label) {
    return String(label || '').startsWith('SYSTEM_NETWORK_');
  }

  function signedIntToHex(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    const u = (Math.trunc(n) >>> 0);
    return u.toString(16).toUpperCase().padStart(8, '0');
  }

  function macChunkToSignedInt(value) {
    const s = String(value || '').trim();
    if (!s) return null;
    const hex = s.replace(/^0x/i, '').replace(/[\s:-]/g, '');
    if (/^[0-9a-fA-F]{1,8}$/.test(hex)) {
      const u = parseInt(hex, 16) >>> 0;
      return u > 0x7fffffff ? (u - 0x100000000) : u;
    }
    if (/^-?\d+$/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      const u = (Math.trunc(n) >>> 0);
      return u > 0x7fffffff ? (u - 0x100000000) : u;
    }
    return null;
  }

  function controlChoiceValues(deps, control) {
    const fromCatalog = (typeof deps?.pickValues === 'function') ? deps.pickValues(control?.label) : null;
    if (Array.isArray(fromCatalog) && fromCatalog.length > 0) return fromCatalog;
    if (Array.isArray(control.values) && control.values.length > 0) return control.values;
    const type = String(control.type || '').toLowerCase();
    const label = String(control.label || '');
    const looksBoolean = type === 'flag' || label.endsWith('_ENABLE') || label.endsWith('_ON');
    if (looksBoolean) {
      return [
        { id: 0, label: 'Off' },
        { id: 1, label: 'On' },
      ];
    }
    return null;
  }
  function shouldSkipMenuControl(section, control) {
    const label = String(control?.label || '');
    if (!label) return true;
    if (label.startsWith('STATUS_')) return true;
    if (label === 'NOT_DOCUMENTED') return true;

    // Managed by dedicated editors/tabs.
    if (label.startsWith('SWITCHER_PINP')) return true;
    if (label.startsWith('SWITCHER_FLEX')) return true;
    if (label.startsWith('OUTPUT_MULTIVIEWER_')) return true;

    if (String(section?.label || '').includes('PRESENT')) return true;
    return false;
  }

  function menuGroupIdForControl(section, control) {
    const label = String(control?.label || '');
    if (!label) return 'other';
    if (label.startsWith('SWITCHER_KEY') && label.includes('CHROMA')) return 'chroma';
    if (label.startsWith('SWITCHER_KEY')) return 'keyer';
    if (label.startsWith('INPUT_')) return 'inputs';
    if (label.startsWith('OUTPUT_')) return 'outputs';
    if (label.startsWith('AUDIO_')) return 'audio';
    if (label.startsWith('STILL_') || label.startsWith('CLIP_') || label.startsWith('LOGO_') || label.startsWith('MEMORY_')) return 'files';
    if (label.startsWith('SYSTEM_')) return 'setup';
    if (label.startsWith('SWITCHER_')) return 'setup';
    if (label.startsWith('ME_') || label.startsWith('DSK_') || label.startsWith('FTB_') || label.startsWith('STREAMER_')) return 'setup';

    const sectionLabel = String(section?.label || '');
    if (sectionLabel.includes('AUDIO')) return 'audio';
    if (sectionLabel.includes('INPUT')) return 'inputs';
    if (sectionLabel.includes('OUTPUT')) return 'outputs';
    if (sectionLabel.includes('MEMORY') || sectionLabel.includes('STILL') || sectionLabel.includes('CLIP') || sectionLabel.includes('LOGO')) return 'files';
    if (sectionLabel.includes('SYSTEM') || sectionLabel.includes('SWITCHER')) return 'setup';
    return 'other';
  }

  function menuFieldLabel(rawLabel) {
    return String(rawLabel || '')
      .replace(/^SWITCHER_/, '')
      .replace(/^INPUT_/, 'IN ')
      .replace(/^OUTPUT_/, 'OUT ')
      .replace(/^AUDIO_/, 'AUDIO ')
      .replace(/^MEMORY_/, 'MEM ')
      .replace(/^STILL_/, 'STILL ')
      .replace(/^CLIP_/, 'CLIP ')
      .replace(/^LOGO_/, 'LOGO ')
      .replace(/^SYSTEM_/, 'SYS ')
      .replace(/_/g, ' ');
  }

  function menuControlHint(rawLabel) {
    const label = String(rawLabel || '');
    if (label === 'SYSTEM_PREF_MENU_POSITION') {
      return 'Reference positions: Center / Top / Left / Right / Bottom (numeric id mapping is device-specific).';
    }
    if (label === 'SYSTEM_LANGUAGE_SELECT') {
      return 'Reference languages: English / Traditional Chinese / Simplified Chinese (numeric id mapping is device-specific).';
    }
    if (label === 'SYSTEM_ASPECT') {
      return 'Reference options: 16:9 / 4:3 (numeric id mapping is device-specific).';
    }
    if (label === 'SYSTEM_GENLOCK_SRC') {
      return 'Genlock source ids differ by model/firmware. Keep current numeric mapping.';
    }
    return '';
  }

  function extractKeyIndex(label) {
    const m = String(label || '').match(/^SWITCHER_KEY([1-4])_/);
    return m ? Number(m[1]) : null;
  }

  function sliderBoundsForControl(control, currentValue) {
    const label = String(control?.label || '');
    const cur = Number(currentValue ?? 0);
    if (label.includes('_HUE')) return { min: 0, max: 360, step: 1 };
    if (label.includes('_GAIN') || label.includes('_SAT') || label.includes('_LUMA') || label.includes('_OPACITY')) {
      return { min: 0, max: Math.max(100, Math.ceil(cur)), step: 1 };
    }
    const min = Math.min(cur < 0 ? Math.floor(cur) : 0, -100);
    const max = Math.max(cur > 100 ? Math.ceil(cur) : 100, 100);
    return { min, max, step: 1 };
  }

  function createSliderNumberPair(control, currentValue) {
    const bounds = sliderBoundsForControl(control, currentValue);
    const cur = Number(currentValue ?? 0);
    const row = document.createElement('div');
    row.className = 'valctl';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider-sync';
    slider.min = String(bounds.min);
    slider.max = String(bounds.max);
    slider.step = String(bounds.step);
    slider.value = String(Number.isFinite(cur) ? cur : 0);

    const num = document.createElement('input');
    num.type = 'number';
    num.className = 'num-sync';
    num.min = String(bounds.min);
    num.max = String(bounds.max);
    num.step = String(bounds.step);
    num.value = String(Number.isFinite(cur) ? cur : 0);

    slider.addEventListener('input', () => {
      num.value = slider.value;
    });
    num.addEventListener('input', () => {
      const v = Number(num.value);
      if (!Number.isFinite(v)) return;
      const clamped = Math.max(bounds.min, Math.min(bounds.max, v));
      slider.value = String(clamped);
    });

    row.appendChild(slider);
    row.appendChild(num);
    return { row, getValue: () => Number(num.value) };
  }

  function renderMenuControlItem(deps, control, currentValue, opts = {}) {
    const { sendControl } = deps;
    const wrap = document.createElement('div');
    wrap.className = 'menu-item';

    const label = document.createElement('div');
    label.className = 'menu-item-title';
    label.textContent = menuFieldLabel(control.label);
    wrap.appendChild(label);

    const hintText = menuControlHint(control.label);
    if (hintText) {
      const hint = document.createElement('div');
      hint.className = 'menu-item-hint';
      hint.textContent = hintText;
      wrap.appendChild(hint);
    }

    const fieldHost = document.createElement('div');
    fieldHost.className = 'menu-item-field';
    wrap.appendChild(fieldHost);

    let valueReader = null;
    const choiceValues = controlChoiceValues(deps, control);
    if (isNetworkIpLabel(control.label)) {
      const field = document.createElement('input');
      field.type = 'text';
      field.inputMode = 'numeric';
      field.autocomplete = 'off';
      field.spellcheck = false;
      field.placeholder = '0.0.0.0';
      field.pattern = '^\\d{1,3}(\\.\\d{1,3}){3}$';
      field.value = signedIntToIp(currentValue);
      field.dataset.menuControlLabel = control.label;
      field.dataset.menuControlIp = '1';
      fieldHost.appendChild(field);
      valueReader = () => field.value;
    } else if (isNetworkMacLabel(control.label)) {
      const field = document.createElement('input');
      field.type = 'text';
      field.inputMode = 'text';
      field.autocomplete = 'off';
      field.spellcheck = false;
      field.placeholder = '00000000';
      field.pattern = '^[0-9a-fA-F]{1,8}$';
      field.value = signedIntToHex(currentValue);
      field.dataset.menuControlLabel = control.label;
      field.dataset.menuControlMac = '1';
      fieldHost.appendChild(field);
      valueReader = () => field.value;
    } else if (Array.isArray(choiceValues) && choiceValues.length > 0) {
      const field = document.createElement('select');
      for (const opt of choiceValues) {
        const option = document.createElement('option');
        option.value = String(opt.id);
        option.textContent = String(opt.label);
        field.appendChild(option);
      }
      field.value = String(currentValue ?? 0);
      field.dataset.menuControlLabel = control.label;
      fieldHost.appendChild(field);
      valueReader = () => field.value;
    } else if (control.type === 'string') {
      const field = document.createElement('input');
      field.type = 'text';
      field.value = String(currentValue ?? '');
      field.dataset.menuControlLabel = control.label;
      fieldHost.appendChild(field);
      valueReader = () => field.value;
    } else if (isNetworkLabel(control.label)) {
      const field = document.createElement('input');
      field.type = 'number';
      field.step = '1';
      field.value = String(Math.round(Number(currentValue ?? 0)));
      field.dataset.menuControlLabel = control.label;
      fieldHost.appendChild(field);
      valueReader = () => field.value;
    } else if (opts.preferNumber === true) {
      const field = document.createElement('input');
      field.type = 'number';
      field.step = control.type === 'float' ? '0.01' : '1';
      field.value = String(Number(currentValue ?? 0));
      field.dataset.menuControlLabel = control.label;
      fieldHost.appendChild(field);
      valueReader = () => field.value;
    } else {
      const pair = createSliderNumberPair(control, currentValue);
      const sliderEl = pair.row.querySelector('.slider-sync');
      const numEl = pair.row.querySelector('.num-sync');
      if (sliderEl) sliderEl.dataset.menuControlLabel = control.label;
      if (numEl) numEl.dataset.menuControlLabel = control.label;
      fieldHost.appendChild(pair.row);
      valueReader = pair.getValue;
    }

    const setBtn = document.createElement('button');
    setBtn.className = 'muted menu-set-btn';
    setBtn.textContent = t('menu.set');
    setBtn.addEventListener('click', async () => {
      try {
        await sendControl(control.label, normalizeMenuValue(control, valueReader()));
      } catch (err) {
        console.error(`${t('action.failed')}: ${err.message}`);
      }
    });
    wrap.appendChild(setBtn);
    return wrap;
  }
  function getMenuControlValue(deps, label) {
    return deps?.state?.values?.[label];
  }
  function renderKeyCards(deps, root, items, titlePrefix, includeChroma) {
    root.innerHTML = '';
    for (let key = 1; key <= 4; key += 1) {
      const card = document.createElement('div');
      card.className = 'card window-card keychroma-card';
      const title = document.createElement('h2');
      title.className = 'menu-card-title';
      title.textContent = `${titlePrefix} ${key}`;
      card.appendChild(title);

      const body = document.createElement('div');
      body.className = 'menu-grid';
      const keyItems = items
        .filter((item) => {
          const idx = extractKeyIndex(item.control.label);
          if (idx !== key) return false;
          const isChroma = String(item.control.label).includes('_CHROMA_');
          return includeChroma ? isChroma : !isChroma;
        })
        .sort((a, b) => String(a.control.label).localeCompare(String(b.control.label)));
      for (const item of keyItems) {
        body.appendChild(renderMenuControlItem(deps, item.control, getMenuControlValue(deps, item.control.label)));
      }
      card.appendChild(body);
      root.appendChild(card);
    }
  }

  function setupBucketId(label) {
    const l = String(label || '');
    if (l.startsWith('SWITCHER_WIPE_') || l.startsWith('SWITCHER_TRANS_') || l === 'SWITCHER_TRANS_TYPE' || l === 'SWITCHER_DVE_TRANS_NUM' || l.startsWith('ME_TRANS_')) return 'transition';
    if (l.startsWith('SWITCHER_DSK') || l.startsWith('DSK_')) return 'dsk';
    if (l.startsWith('SWITCHER_FTB') || l.startsWith('FTB_')) return 'ftb';
    if (l.startsWith('SYSTEM_')) return 'system';
    if (l.startsWith('STREAMER_')) return 'streamer';
    return 'other';
  }

  function setupBucketTitle(bucketId) {
    switch (bucketId) {
      case 'transition': return 'Transition';
      case 'dsk': return 'DSK';
      case 'ftb': return 'FTB';
      case 'system': return 'System';
      case 'streamer': return 'Streamer';
      default: return 'Other';
    }
  }

  function renderSetupGroups(deps, root, items) {
    root.innerHTML = '';
    const order = ['transition', 'dsk', 'ftb', 'system', 'streamer', 'other'];
    const buckets = new Map(order.map((k) => [k, []]));
    for (const item of items) {
      const bucket = setupBucketId(item?.control?.label);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(item);
    }

    for (const bucketId of order) {
      const groupItems = buckets.get(bucketId) || [];
      if (groupItems.length === 0) continue;

      const group = document.createElement('div');
      group.className = 'setup-group';

      const title = document.createElement('h3');
      title.className = 'setup-group-title';
      title.textContent = setupBucketTitle(bucketId);
      group.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'menu-grid';
      groupItems.sort((a, b) => String(a.control.label).localeCompare(String(b.control.label)));
      for (const item of groupItems) {
        grid.appendChild(renderMenuControlItem(deps, item.control, getMenuControlValue(deps, item.control.label), { preferNumber: true }));
      }
      group.appendChild(grid);
      root.appendChild(group);
    }
  }

  function bucketFromLabel(groupId, label) {
    const l = String(label || '');
    const parts = l.split('_');
    if (groupId === 'inputs') {
      if (parts[0] !== 'INPUT') return 'other';
      return (parts[1] || 'OTHER').toLowerCase();
    }
    if (groupId === 'outputs') {
      if (parts[0] !== 'OUTPUT') return 'other';
      if (parts[1] === 'AUX' && parts[2] === 'CTRL') return 'aux_ctrl';
      return (parts[1] || 'OTHER').toLowerCase();
    }
    if (groupId === 'audio') {
      if (parts[0] !== 'AUDIO') return 'other';
      const p1 = parts[1] || 'OTHER';
      if (/^INPUT\d+$/i.test(p1)) return 'inputs';
      if (/^SDI\d+$/i.test(p1)) return 'sdi';
      if (/^HDMI\d+$/i.test(p1)) return 'hdmi';
      if (p1 === 'MASTER') return 'master';
      if (p1 === 'AUDIO') return 'io';
      return p1.toLowerCase();
    }
    if (groupId === 'files') {
      const p0 = parts[0] || 'OTHER';
      if (p0 === 'MEMORY') return 'memory';
      if (p0 === 'STILL') return 'still';
      if (p0 === 'CLIP') return 'clip';
      if (p0 === 'LOGO') return 'logo';
      if (p0 === 'ANI') return 'ani_logo';
      return p0.toLowerCase();
    }
    return 'other';
  }

  function titleFromBucket(groupId, bucket) {
    const b = String(bucket || 'other');
    if (groupId === 'inputs') {
      if (b === 'proc') return 'Proc';
      if (b === 'input') return 'Input';
      if (b === 'audio') return 'Audio';
      if (b === 'clip0') return 'Clip 0';
      if (b === 'clip1') return 'Clip 1';
      if (b === 'still0') return 'Still 0';
      if (b === 'still1') return 'Still 1';
      if (b === 'logo0') return 'Logo 0';
      if (b === 'logo1') return 'Logo 1';
      if (b === 'freeze') return 'Freeze';
      if (b === 'dvi') return 'DVI';
      if (b === 'enable') return 'Enable';
      return 'Other';
    }
    if (groupId === 'outputs') {
      if (b === 'aux_ctrl') return 'AUX';
      if (b === 'hdmi1') return 'HDMI 1';
      if (b === 'hdmi2') return 'HDMI 2';
      if (b === 'hdmi3') return 'HDMI 3';
      if (b === 'sdi') return 'SDI';
      if (b === 'gpi') return 'GPI';
      if (b === 'analog') return 'Analog';
      if (b === 'tally') return 'Tally';
      return b.toUpperCase();
    }
    if (groupId === 'audio') {
      if (b === 'master') return 'Master';
      if (b === 'inputs') return 'Input Channels';
      if (b === 'sdi') return 'SDI Channels';
      if (b === 'hdmi') return 'HDMI Channels';
      if (b === 'io') return 'I/O';
      return b.charAt(0).toUpperCase() + b.slice(1);
    }
    if (groupId === 'files') {
      if (b === 'memory') return 'Memory';
      if (b === 'still') return 'Still';
      if (b === 'clip') return 'Clip';
      if (b === 'logo') return 'Logo';
      if (b === 'ani_logo') return 'Ani Logo';
      return b.toUpperCase();
    }
    return b.toUpperCase();
  }

  function renderBucketedGroup(deps, root, items, groupId) {
    root.innerHTML = '';
    const buckets = new Map();
    for (const item of items) {
      const bucket = bucketFromLabel(groupId, item?.control?.label);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(item);
    }

    const order = [...buckets.keys()].sort((a, b) => String(a).localeCompare(String(b)));
    for (const bucket of order) {
      const groupItems = buckets.get(bucket) || [];
      if (groupItems.length === 0) continue;

      const group = document.createElement('div');
      group.className = 'setup-group';

      const title = document.createElement('h3');
      title.className = 'setup-group-title';
      title.textContent = titleFromBucket(groupId, bucket);
      group.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'menu-grid';
      groupItems.sort((a, b) => String(a.control.label).localeCompare(String(b.control.label)));
      for (const item of groupItems) {
        grid.appendChild(renderMenuControlItem(deps, item.control, getMenuControlValue(deps, item.control.label)));
      }
      group.appendChild(grid);
      root.appendChild(group);
    }
  }
  function syncMenuControlValues(deps) {
    const { state } = deps;
    document.querySelectorAll('[data-menu-control-label]').forEach((el) => {
      if (document.activeElement === el) return;
      const label = el.dataset.menuControlLabel;
      if (!label) return;
      const value = state?.values?.[label];
      if (value === undefined || value === null) return;
      if (el.dataset.menuControlIp === '1') {
        el.value = signedIntToIp(value);
      } else if (el.dataset.menuControlMac === '1') {
        el.value = signedIntToHex(value);
      } else {
        el.value = String(value);
      }
    });
  }

  function buildMenuControls(deps) {
    const { byId, state, isControlVisible } = deps || {};
    if (typeof byId !== 'function') return;

    const tabTargets = [
      { group: 'keyer', id: 'keyerControls' },
      { group: 'chroma', id: 'chromaControls' },
      { group: 'inputs', id: 'inputsControls' },
      { group: 'outputs', id: 'outputsControls' },
      { group: 'audio', id: 'audioControls' },
      { group: 'files', id: 'filesControls' },
      { group: 'setup', id: 'setupControls' },
    ];

    const availableTargets = tabTargets.filter((x) => !!byId(x.id));
    if (availableTargets.length === 0) return;
    const menuVisibility = new Map();

    function setMenuTabVisible(groupId, visible) {
      if (global.DVIPUiCore && typeof global.DVIPUiCore.setTabVisible === 'function') {
        global.DVIPUiCore.setTabVisible(byId, groupId, visible);
      } else {
        const btn = document.querySelector(`.tabs button[data-tab="${groupId}"]`);
        const section = byId(`tab-${groupId}`);
        if (btn) btn.style.display = visible ? '' : 'none';
        if (section) section.style.display = visible ? '' : 'none';
      }
      menuVisibility.set(groupId, !!visible);
    }

    const groupBuckets = new Map(tabTargets.map((x) => [x.group, []]));
    const sections = (state && state.catalog && Array.isArray(state.catalog.sections)) ? state.catalog.sections : [];
    for (const section of sections) {
      for (const control of section.controls || []) {
        if (shouldSkipMenuControl(section, control)) continue;

        if (typeof isControlVisible === 'function' && !isControlVisible(section, control)) continue;
        const groupId = menuGroupIdForControl(section, control);
        if (!groupBuckets.has(groupId)) continue;
        groupBuckets.get(groupId).push({ section, control });
      }
    }

    for (const target of availableTargets) {
      const root = byId(target.id);
      if (!root) continue;
      const items = groupBuckets.get(target.group) || [];
      const hasItems = items.length > 0;

      if (!hasItems) {
        setMenuTabVisible(target.group, false);
        root.innerHTML = '';
        continue;
      }

      setMenuTabVisible(target.group, true);

      if (target.group === 'keyer') {
        renderKeyCards(deps, root, items, 'Key', false);
        continue;
      }
      if (target.group === 'chroma') {
        renderKeyCards(deps, root, items, 'Chroma', true);
        continue;
      }
      root.innerHTML = '';
      if (target.group === 'setup') {
        renderSetupGroups(deps, root, items);
        continue;
      }
      if (target.group === 'inputs' || target.group === 'outputs' || target.group === 'audio' || target.group === 'files') {
        renderBucketedGroup(deps, root, items, target.group);
        continue;
      }
      items.sort((a, b) => String(a.control.label).localeCompare(String(b.control.label)));
      for (const item of items) {
        root.appendChild(renderMenuControlItem(deps, item.control, getMenuControlValue(deps, item.control.label)));
      }
    }

    const activeTab = (global.DVIPUiCore && typeof global.DVIPUiCore.getActiveTabId === 'function')
      ? global.DVIPUiCore.getActiveTabId()
      : (document.querySelector('.tabs button.active')?.dataset?.tab || null);
    if (activeTab && menuVisibility.has(activeTab) && menuVisibility.get(activeTab) === false) {
      if (global.DVIPUiCore && typeof global.DVIPUiCore.activateTab === 'function') {
        global.DVIPUiCore.activateTab('connect');
      } else {
        const connectBtn = document.querySelector('.tabs button[data-tab="connect"]');
        if (connectBtn) connectBtn.click();
      }
    }

    syncMenuControlValues(deps);
  }

  global.DVIPPanelsUi = {
    buildMultiview,
    buildFlex,
    updateMemoryStatus,
    buildMemoryControls,
    buildCameraNames,
    buildRawControls,
    buildMenuControls,
    syncMenuControlValues,
  };
}(window));




