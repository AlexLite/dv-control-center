(function exposeFlexEditor() {
  function enableFlexMouse(deps) {
    const {
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
      clamp,
      FLEX_WINDOW_COUNT,
    } = deps;  const canvas = byId('flexCanvas');
  let drag = null;
  let dragDirty = false;
  let guideDrag = null;
  let pendingBackgroundMenu = null;
  const edge = 9;

  function flexRectAt(i) {
    return flexToCanvas(
      pctToRawPos(byId(`flex${i}-x`).value),
      pctToRawPos(byId(`flex${i}-y`).value),
      pctToRawScale(byId(`flex${i}-s`).value),
      pctToRawScale(byId(`flex${i}-s`).value),
      canvas.width,
      canvas.height,
    );
  }

  function hitMode(r, px, py) {
    const cx = r.x + (r.w * 0.5);
    const cy = r.y + (r.h * 0.5);
    const cropHit = 7;
    if (Math.abs(px - cx) <= cropHit && Math.abs(py - r.y) <= cropHit) return 'crop-t';
    if (Math.abs(px - cx) <= cropHit && Math.abs(py - (r.y + r.h)) <= cropHit) return 'crop-b';
    if (Math.abs(px - r.x) <= cropHit && Math.abs(py - cy) <= cropHit) return 'crop-l';
    if (Math.abs(px - (r.x + r.w)) <= cropHit && Math.abs(py - cy) <= cropHit) return 'crop-r';
    const nearL = Math.abs(px - r.x) <= edge;
    const nearR = Math.abs(px - (r.x + r.w)) <= edge;
    const nearT = Math.abs(py - r.y) <= edge;
    const nearB = Math.abs(py - (r.y + r.h)) <= edge;
    if (nearR && nearB) return 'rb';
    if (nearL && nearB) return 'lb';
    if (nearR && nearT) return 'rt';
    if (nearL && nearT) return 'lt';
    if (nearL) return 'l';
    if (nearR) return 'r';
    if (nearT) return 't';
    if (nearB) return 'b';
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return 'move';
    return null;
  }

  function showSourceDropdownForFlex(index, clientX, clientY) {
    let dd = byId('frameSourceDropdownFlex');
    if (!dd) {
      dd = document.createElement('select');
      dd.id = 'frameSourceDropdownFlex';
      dd.style.position = 'fixed';
      dd.style.zIndex = '9999';
      dd.style.width = '220px';
      dd.style.display = 'none';
      document.body.appendChild(dd);
      dd.addEventListener('blur', () => { dd.style.display = 'none'; });
    }
    const values = pickValues('SWITCHER_FLEX_SRC_BGND_SRC');
    dd.innerHTML = '';
    for (const item of values) {
      const op = document.createElement('option');
      op.value = item.id;
      op.textContent = `${item.id}: ${item.label}`;
      dd.appendChild(op);
    }
    dd.onchange = async () => {
      const next = Number(dd.value);
      if (byId(`flex${index}-src`)) byId(`flex${index}-src`).value = String(next);
      markEditorDirty('flex');
      pushEditorHistory('flex');
      dd.style.display = 'none';
    };
    dd.style.left = `${clientX + 8}px`;
    dd.style.top = `${clientY + 8}px`;
    dd.style.display = 'block';
    dd.focus();
  }

  function showBackgroundDropdownForFlex(clientX, clientY) {
    let dd = byId('frameSourceDropdownFlex');
    if (!dd) {
      dd = document.createElement('select');
      dd.id = 'frameSourceDropdownFlex';
      dd.style.position = 'fixed';
      dd.style.zIndex = '9999';
      dd.style.width = '220px';
      dd.style.display = 'none';
      document.body.appendChild(dd);
      dd.addEventListener('blur', () => { dd.style.display = 'none'; });
    }
    const values = pickValues('SWITCHER_FLEX_SRC_BGND_SRC');
    dd.innerHTML = '';
    for (const item of values) {
      const op = document.createElement('option');
      op.value = item.id;
      op.textContent = `${item.id}: ${item.label}`;
      dd.appendChild(op);
    }
    dd.onchange = async () => {
      const next = Number(dd.value);
      if (byId('flexBg')) byId('flexBg').value = String(next);
      markEditorDirty('flex');
      pushEditorHistory('flex');
      dd.style.display = 'none';
    };
    dd.style.left = `${clientX + 8}px`;
    dd.style.top = `${clientY + 8}px`;
    dd.style.display = 'block';
    dd.focus();
  }

  canvas.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    pendingBackgroundMenu = null;

    if (state.flexShowGuides !== false) {
      const guidesPx = getGuidePixelsFromList(state.flexGuides, canvas.width, canvas.height);
      for (let i = 0; i < guidesPx.vertical.length; i += 1) {
        if (Math.abs(x - guidesPx.vertical[i]) <= 6) {
          guideDrag = { axis: 'v', index: i };
          return;
        }
      }
      for (let i = 0; i < guidesPx.horizontal.length; i += 1) {
        if (Math.abs(y - guidesPx.horizontal[i]) <= 6) {
          guideDrag = { axis: 'h', index: i };
          return;
        }
      }
    }

    const activeIdx = Number(state.flexActive) || 0;
    if (activeIdx >= 1 && activeIdx <= FLEX_WINDOW_COUNT && byId(`flex${activeIdx}-en`)?.checked) {
      const ar = flexRectAt(activeIdx);
      const insideActive = x >= ar.x && x <= ar.x + ar.w && y >= ar.y && y <= ar.y + ar.h;
      if (!insideActive) {
        // Keep selection stable: outside click clears selection first.
        state.flexActive = null;
        drawFlexCanvas();
        return;
      }
    }

    const attachDrag = (i, r, mode) => {
      state.flexActive = i;
      drag = {
        idx: i,
        mode,
        startX: x,
        startY: y,
        rect: { ...r },
        cropStart: {
          cl: Number(byId(`flex${i}-cl`).value || 0),
          cr: Number(byId(`flex${i}-cr`).value || 0),
          ct: Number(byId(`flex${i}-ct`).value || 0),
          cb: Number(byId(`flex${i}-cb`).value || 0),
        },
      };
      dragDirty = false;
    };

    if (activeIdx >= 1 && activeIdx <= FLEX_WINDOW_COUNT && byId(`flex${activeIdx}-en`)?.checked) {
      const r = flexRectAt(activeIdx);
      const mode = hitMode(r, x, y);
      if (mode) attachDrag(activeIdx, r, mode);
      else pendingBackgroundMenu = { clientX: ev.clientX, clientY: ev.clientY };
      drawFlexCanvas();
      return;
    }

    for (let i = FLEX_WINDOW_COUNT; i >= 1; i -= 1) {
      if (!byId(`flex${i}-en`)?.checked) continue;
      const r = flexRectAt(i);
      const mode = hitMode(r, x, y);
      if (!mode) continue;
      attachDrag(i, r, mode);
      break;
    }
    if (!drag) pendingBackgroundMenu = { clientX: ev.clientX, clientY: ev.clientY };
    drawFlexCanvas();
  });

  canvas.addEventListener('mousemove', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;

    if (guideDrag) {
      if (guideDrag.axis === 'v') {
        if (x < 0 || x > canvas.width) {
          state.flexGuides.v.splice(guideDrag.index, 1);
          guideDrag = null;
        } else {
          state.flexGuides.v[guideDrag.index] = clamp((x / canvas.width) * 100, 0, 100);
        }
      } else {
        if (y < 0 || y > canvas.height) {
          state.flexGuides.h.splice(guideDrag.index, 1);
          guideDrag = null;
        } else {
          state.flexGuides.h[guideDrag.index] = clamp((y / canvas.height) * 100, 0, 100);
        }
      }
      saveFlexEditorState();
      renderGuidesList();
      drawFlexCanvas();
      return;
    }

    if (!drag) {
      const cursorForMode = (mode) => {
        if (!mode) return 'default';
        if (mode === 'move') return 'move';
        if (mode.startsWith('crop-')) return 'crosshair';
        if (mode === 'l' || mode === 'r') return 'ew-resize';
        if (mode === 't' || mode === 'b') return 'ns-resize';
        if (mode === 'lt' || mode === 'rb') return 'nwse-resize';
        if (mode === 'rt' || mode === 'lb') return 'nesw-resize';
        return 'default';
      };

      const activeHover = Number(state.flexActive) || 0;
      if (activeHover >= 1 && activeHover <= FLEX_WINDOW_COUNT && byId(`flex${activeHover}-en`)?.checked) {
        const r = flexRectAt(activeHover);
        canvas.style.cursor = cursorForMode(hitMode(r, x, y));
        return;
      }

      let cursor = 'default';
      for (let i = FLEX_WINDOW_COUNT; i >= 1; i -= 1) {
        if (!byId(`flex${i}-en`)?.checked) continue;
        const r = flexRectAt(i);
        const mode = hitMode(r, x, y);
        if (mode) {
          cursor = cursorForMode(mode);
          break;
        }
      }
      canvas.style.cursor = cursor;
      return;
    }

    if (!drag) return;
    const dx = x - drag.startX;
    const dy = y - drag.startY;

    let left = drag.rect.x;
    let top = drag.rect.y;
    let right = drag.rect.x + drag.rect.w;
    let bottom = drag.rect.y + drag.rect.h;

    if (drag.mode === 'move') {
      left += dx; right += dx; top += dy; bottom += dy;
      dragDirty = true;
    } else if (drag.mode.startsWith('crop-')) {
      markEditLock('flex', drag.idx);
      const curL = drag.cropStart.cl;
      const curR = drag.cropStart.cr;
      const curT = drag.cropStart.ct;
      const curB = drag.cropStart.cb;
      const maxPair = 99;
      if (drag.mode === 'crop-l') {
        const nextL = clamp(curL + ((dx / Math.max(1, drag.rect.w)) * 100), 0, maxPair - curR);
        byId(`flex${drag.idx}-cl`).value = nextL.toFixed(2);
      } else if (drag.mode === 'crop-r') {
        const nextR = clamp(curR - ((dx / Math.max(1, drag.rect.w)) * 100), 0, maxPair - curL);
        byId(`flex${drag.idx}-cr`).value = nextR.toFixed(2);
      } else if (drag.mode === 'crop-t') {
        const nextT = clamp(curT + ((dy / Math.max(1, drag.rect.h)) * 100), 0, maxPair - curB);
        byId(`flex${drag.idx}-ct`).value = nextT.toFixed(2);
      } else if (drag.mode === 'crop-b') {
        const nextB = clamp(curB - ((dy / Math.max(1, drag.rect.h)) * 100), 0, maxPair - curT);
        byId(`flex${drag.idx}-cb`).value = nextB.toFixed(2);
      }
      dragDirty = true;
      drawFlexCanvas();
      return;
    } else {
      if (drag.mode.includes('l')) left += dx;
      if (drag.mode.includes('r')) right += dx;
      if (drag.mode.includes('t')) top += dy;
      if (drag.mode.includes('b')) bottom += dy;
      dragDirty = true;
    }

    const minW = 12;
    const minH = minW * (canvas.height / canvas.width);
    if (right - left < minW) right = left + minW;
    if (bottom - top < minH) bottom = top + minH;

    // lock 16:9 aspect ratio
    let rw = right - left;
    let rh = rw * (canvas.height / canvas.width);
    if (drag.mode.includes('t')) {
      top = bottom - rh;
    } else {
      bottom = top + rh;
    }
    right = left + rw;

    ({ left, top, right, bottom } = snapRectGeneric(
      left,
      top,
      right,
      bottom,
      drag.mode,
      canvas.width,
      canvas.height,
      state.flexGuides,
      isGuideSnapActive('flex'),
      state.flexSnapDistance,
    ));
    if (drag.mode !== 'move' && !drag.mode.startsWith('crop-')) {
      const rwSnap = right - left;
      const rhSnap = rwSnap * (canvas.height / canvas.width);
      if (drag.mode.includes('t')) top = bottom - rhSnap;
      else bottom = top + rhSnap;
      right = left + rwSnap;
    }

    const cx = (left + right) * 0.5;
    const cy = (top + bottom) * 0.5;
    const rw2 = right - left;
    const rh2 = bottom - top;

    const world = flexFromCanvasRect({ x: left, y: top, w: rw2, h: rh2 }, canvas.width, canvas.height);
    markEditLock('flex', drag.idx);
    byId(`flex${drag.idx}-x`).value = rawPosToPct(world.x).toFixed(2);
    byId(`flex${drag.idx}-y`).value = rawPosToPct(world.y).toFixed(2);
    byId(`flex${drag.idx}-w`).value = world.w.toFixed(4);
    byId(`flex${drag.idx}-h`).value = world.h.toFixed(4);
    byId(`flex${drag.idx}-s`).value = rawScaleToPct(world.w).toFixed(2);
    drawFlexCanvas();
  });

  canvas.addEventListener('mouseup', () => {
    const historyKind = drag && dragDirty ? 'flex' : null;
    if (!drag && !guideDrag && pendingBackgroundMenu) {
      showBackgroundDropdownForFlex(pendingBackgroundMenu.clientX, pendingBackgroundMenu.clientY);
    }
    drag = null;
    dragDirty = false;
    guideDrag = null;
    pendingBackgroundMenu = null;
    canvas.style.cursor = 'default';
    if (historyKind) {
      markEditorDirty('flex');
      pushEditorHistory('flex');
    }
  });
  canvas.addEventListener('mouseleave', () => {
    if (guideDrag) {
      if (guideDrag.axis === 'v') state.flexGuides.v.splice(guideDrag.index, 1);
      else state.flexGuides.h.splice(guideDrag.index, 1);
      saveFlexEditorState();
      renderGuidesList();
      drawFlexCanvas();
    }
    const historyKind = drag && dragDirty ? 'flex' : null;
    drag = null;
    dragDirty = false;
    guideDrag = null;
    pendingBackgroundMenu = null;
    canvas.style.cursor = 'default';
    if (historyKind) {
      markEditorDirty('flex');
      pushEditorHistory('flex');
    }
  });
  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    for (let i = FLEX_WINDOW_COUNT; i >= 1; i -= 1) {
      if (!byId(`flex${i}-en`) || !byId(`flex${i}-en`).checked) continue;
      const r = flexToCanvas(
        pctToRawPos(byId(`flex${i}-x`).value),
        pctToRawPos(byId(`flex${i}-y`).value),
        pctToRawScale(byId(`flex${i}-s`).value),
        pctToRawScale(byId(`flex${i}-s`).value),
        canvas.width,
        canvas.height,
      );
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        showSourceDropdownForFlex(i, ev.clientX, ev.clientY);
        return;
      }
    }
    showBackgroundDropdownForFlex(ev.clientX, ev.clientY);
  });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    let targetIdx = null;
    const activeWheel = Number(state.flexActive) || 0;
    if (activeWheel >= 1 && activeWheel <= FLEX_WINDOW_COUNT && byId(`flex${activeWheel}-en`)?.checked) {
      targetIdx = activeWheel;
    } else {
      for (let i = FLEX_WINDOW_COUNT; i >= 1; i -= 1) {
        if (!byId(`flex${i}-en`)?.checked) continue;
        const r = flexRectAt(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          targetIdx = i;
          break;
        }
      }
    }
    if (targetIdx === null) targetIdx = 1;
    const delta = ev.deltaY < 0 ? 1 : -1;
    if (byId(`flex${targetIdx}-en`)?.checked) {
      markEditLock('flex', targetIdx);
      const nextPct = clamp(Number(byId(`flex${targetIdx}-s`).value) + delta, 0, 100);
      const nw = pctToRawScale(nextPct);
      byId(`flex${targetIdx}-w`).value = nw.toFixed(4);
      byId(`flex${targetIdx}-h`).value = nw.toFixed(4);
      byId(`flex${targetIdx}-s`).value = nextPct.toFixed(2);
      state.flexActive = targetIdx;
    }
    drawFlexCanvas();
  }, { passive: false });

}

  window.DVIPFlexEditor = {
    enableFlexMouse,
  };
})();
