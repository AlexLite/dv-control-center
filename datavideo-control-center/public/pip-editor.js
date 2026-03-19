(function exposePipEditor() {
  function enablePipMouse(deps) {
    const {
      state,
      byId,
      toCanvas,
      pipFromCanvasRect,
      pctToRawPos,
      pctToRawScale,
      rawPosToPct,
      rawScaleToPct,
      markEditLock,
      markEditorDirty,
      pushEditorHistory,
      drawPipCanvas,
      getGuidePixelsFromList,
      saveFlexEditorState,
      renderPipGuidesList,
      snapRectGeneric,
      isGuideSnapActive,
      pickValues,
      clamp,
    } = deps;
  const canvas = byId('pipCanvas');
  let drag = null;
  let dragDirty = false;
  const edge = 8;
  let guideDrag = null;

  function pipRectAt(i) {
    return toCanvas(
      pctToRawPos(byId(`pip${i}-x`).value),
      pctToRawPos(byId(`pip${i}-y`).value),
      pctToRawScale(byId(`pip${i}-s`).value),
      pctToRawScale(byId(`pip${i}-s`).value),
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

  function showSourceDropdownForPip(pipIndex, clientX, clientY) {
    let dd = byId('frameSourceDropdownPip');
    if (!dd) {
      dd = document.createElement('select');
      dd.id = 'frameSourceDropdownPip';
      dd.style.position = 'fixed';
      dd.style.zIndex = '9999';
      dd.style.width = '220px';
      dd.style.display = 'none';
      document.body.appendChild(dd);
      dd.addEventListener('change', async () => {
        const idx = Number(dd.dataset.index);
        const value = Number(dd.value);
        if (byId(`pip${idx}-src`)) byId(`pip${idx}-src`).value = String(value);
        markEditorDirty('pip');
        pushEditorHistory('pip');
        dd.style.display = 'none';
      });
      dd.addEventListener('blur', () => { dd.style.display = 'none'; });
    }
    const values = pickValues('SWITCHER_KEY1_KEY_SRC');
    dd.innerHTML = '';
    for (const item of values) {
      const op = document.createElement('option');
      op.value = item.id;
      op.textContent = `${item.id}: ${item.label}`;
      dd.appendChild(op);
    }
    dd.dataset.index = String(pipIndex);
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

    if (state.pipShowGuides !== false) {
      const guidesPx = getGuidePixelsFromList(state.pipGuides, canvas.width, canvas.height);
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

    const activeIdx = Number(state.pipActive) || 0;
    if (activeIdx >= 1 && activeIdx <= 4 && byId(`pip${activeIdx}-en`)?.checked) {
      const ar = pipRectAt(activeIdx);
      const insideActive = x >= ar.x && x <= ar.x + ar.w && y >= ar.y && y <= ar.y + ar.h;
      if (!insideActive) {
        // Keep selection stable: outside click clears selection first.
        state.pipActive = null;
        drawPipCanvas();
        return;
      }
    }

    const attachDrag = (i, r, mode) => {
      state.pipActive = i;
      drag = {
        idx: i,
        mode,
        startX: x,
        startY: y,
        rect: { ...r },
        cropStart: {
          cl: Number(byId(`pip${i}-cl`).value || 0),
          cr: Number(byId(`pip${i}-cr`).value || 0),
          ct: Number(byId(`pip${i}-ct`).value || 0),
          cb: Number(byId(`pip${i}-cb`).value || 0),
        },
      };
      dragDirty = false;
    };

    if (activeIdx >= 1 && activeIdx <= 4 && byId(`pip${activeIdx}-en`)?.checked) {
      const r = pipRectAt(activeIdx);
      const mode = hitMode(r, x, y);
      if (mode) attachDrag(activeIdx, r, mode);
      drawPipCanvas();
      return;
    }

    for (let i = 4; i >= 1; i -= 1) {
      if (!byId(`pip${i}-en`)?.checked) continue;
      const r = pipRectAt(i);
      const mode = hitMode(r, x, y);
      if (!mode) continue;
      attachDrag(i, r, mode);
      break;
    }
    drawPipCanvas();
  });
  canvas.addEventListener('mousemove', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;

    if (guideDrag) {
      if (guideDrag.axis === 'v') {
        if (x < 0 || x > canvas.width) {
          state.pipGuides.v.splice(guideDrag.index, 1);
          guideDrag = null;
        } else {
          state.pipGuides.v[guideDrag.index] = clamp((x / canvas.width) * 100, 0, 100);
        }
      } else {
        if (y < 0 || y > canvas.height) {
          state.pipGuides.h.splice(guideDrag.index, 1);
          guideDrag = null;
        } else {
          state.pipGuides.h[guideDrag.index] = clamp((y / canvas.height) * 100, 0, 100);
        }
      }
      saveFlexEditorState();
      renderPipGuidesList();
      drawPipCanvas();
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

      const activeHover = Number(state.pipActive) || 0;
      if (activeHover >= 1 && activeHover <= 4 && byId(`pip${activeHover}-en`)?.checked) {
        const r = pipRectAt(activeHover);
        canvas.style.cursor = cursorForMode(hitMode(r, x, y));
        return;
      }

      let cursor = 'default';
      for (let i = 4; i >= 1; i -= 1) {
        if (!byId(`pip${i}-en`)?.checked) continue;
        const r = pipRectAt(i);
        const mode = hitMode(r, x, y);
        if (mode) {
          cursor = cursorForMode(mode);
          break;
        }
      }
      canvas.style.cursor = cursor;
      return;
    }
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
      markEditLock('pip', drag.idx);
      const curL = drag.cropStart.cl;
      const curR = drag.cropStart.cr;
      const curT = drag.cropStart.ct;
      const curB = drag.cropStart.cb;
      const maxPair = 99;
      if (drag.mode === 'crop-l') {
        const nextL = clamp(curL + ((dx / Math.max(1, drag.rect.w)) * 100), 0, maxPair - curR);
        byId(`pip${drag.idx}-cl`).value = nextL.toFixed(2);
      } else if (drag.mode === 'crop-r') {
        const nextR = clamp(curR - ((dx / Math.max(1, drag.rect.w)) * 100), 0, maxPair - curL);
        byId(`pip${drag.idx}-cr`).value = nextR.toFixed(2);
      } else if (drag.mode === 'crop-t') {
        const nextT = clamp(curT + ((dy / Math.max(1, drag.rect.h)) * 100), 0, maxPair - curB);
        byId(`pip${drag.idx}-ct`).value = nextT.toFixed(2);
      } else if (drag.mode === 'crop-b') {
        const nextB = clamp(curB - ((dy / Math.max(1, drag.rect.h)) * 100), 0, maxPair - curT);
        byId(`pip${drag.idx}-cb`).value = nextB.toFixed(2);
      }
      dragDirty = true;
      drawPipCanvas();
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
    let rw = right - left;
    let rh = bottom - top;
    if (rw < minW) rw = minW;
    if (rh < minH) rh = minH;
    rh = rw * (canvas.height / canvas.width);
    if (drag.mode.includes('t')) {
      top = bottom - rh;
    } else {
      bottom = top + rh;
    }
    right = left + rw;

    ({ left, top, right, bottom } = snapRectGeneric(
      left, top, right, bottom, drag.mode, canvas.width, canvas.height,
      state.pipGuides, isGuideSnapActive('pip'), state.pipSnapDistance
    ));
    if (drag.mode !== 'move' && !drag.mode.startsWith('crop-')) {
      const rw2 = right - left;
      const rh2 = rw2 * (canvas.height / canvas.width);
      if (drag.mode.includes('t')) top = bottom - rh2;
      else bottom = top + rh2;
      right = left + rw2;
    }    const ww = right - left;
    const hh = bottom - top;
    const world = (typeof pipFromCanvasRect === 'function')
      ? pipFromCanvasRect({ x: left, y: top, w: ww, h: hh }, canvas.width, canvas.height)
      : {
        x: ((left + (ww * 0.5)) / canvas.width) * 2 - 1,
        y: ((1 - ((top + (hh * 0.5)) / canvas.height)) * 2) - 1,
        w: ww / canvas.width,
        h: ww / canvas.width,
      };
    const rawX = world.x;
    const rawY = world.y;
    const rawS = world.w;
    markEditLock('pip', drag.idx);
    byId(`pip${drag.idx}-x`).value = rawPosToPct(rawX).toFixed(2);
    byId(`pip${drag.idx}-y`).value = rawPosToPct(rawY).toFixed(2);
    byId(`pip${drag.idx}-w`).value = rawS.toFixed(4);
    byId(`pip${drag.idx}-h`).value = rawS.toFixed(4);
    byId(`pip${drag.idx}-s`).value = rawScaleToPct(rawS).toFixed(2);
    drawPipCanvas();
  });
  canvas.addEventListener('mouseup', () => {
    const historyKind = drag && dragDirty ? 'pip' : null;
    drag = null;
    dragDirty = false;
    guideDrag = null;
    canvas.style.cursor = 'default';
    if (historyKind) {
      markEditorDirty('pip');
      pushEditorHistory('pip');
    }
  });
  canvas.addEventListener('mouseleave', () => {
    if (guideDrag) {
      if (guideDrag.axis === 'v') state.pipGuides.v.splice(guideDrag.index, 1);
      else state.pipGuides.h.splice(guideDrag.index, 1);
      saveFlexEditorState();
      renderPipGuidesList();
      drawPipCanvas();
    }
    const historyKind = drag && dragDirty ? 'pip' : null;
    drag = null;
    dragDirty = false;
    guideDrag = null;
    canvas.style.cursor = 'default';
    if (historyKind) {
      markEditorDirty('pip');
      pushEditorHistory('pip');
    }
  });
  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    for (let i = 4; i >= 1; i -= 1) {
      if (!byId(`pip${i}-en`).checked) continue;
      const r = toCanvas(
        pctToRawPos(byId(`pip${i}-x`).value),
        pctToRawPos(byId(`pip${i}-y`).value),
        pctToRawScale(byId(`pip${i}-s`).value),
        pctToRawScale(byId(`pip${i}-s`).value),
        canvas.width,
        canvas.height,
      );
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        showSourceDropdownForPip(i, ev.clientX, ev.clientY);
        return;
      }
    }
  });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    let targetIdx = null;
    const activeWheel = Number(state.pipActive) || 0;
    if (activeWheel >= 1 && activeWheel <= 4 && byId(`pip${activeWheel}-en`)?.checked) {
      targetIdx = activeWheel;
    } else {
      for (let i = 4; i >= 1; i -= 1) {
        if (!byId(`pip${i}-en`)?.checked) continue;
        const r = pipRectAt(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          targetIdx = i;
          break;
        }
      }
    }
    if (targetIdx === null) targetIdx = 1;
    const delta = ev.deltaY < 0 ? 1 : -1;
    if (byId(`pip${targetIdx}-en`)?.checked) {
      markEditLock('pip', targetIdx);
      const nextPct = clamp(Number(byId(`pip${targetIdx}-s`).value) + delta, 0, 100);
      const nw = pctToRawScale(nextPct);
      byId(`pip${targetIdx}-w`).value = nw.toFixed(4);
      byId(`pip${targetIdx}-h`).value = nw.toFixed(4);
      byId(`pip${targetIdx}-s`).value = nextPct.toFixed(2);
      state.pipActive = targetIdx;
    }
    drawPipCanvas();
  }, { passive: false });
}

  window.DVIPPipEditor = {
    enablePipMouse,
  };
})();







