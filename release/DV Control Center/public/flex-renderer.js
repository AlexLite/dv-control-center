(function exposeFlexRenderer() {
  function drawFlexCanvas(deps) {
    const {
      state,
      byId,
      flexToCanvas,
      pctToRawPos,
      pctToRawScale,
      getGuidePixelsFromList,
      clamp,
      FLEX_WINDOW_COUNT,
      normalizeFlexAspect,
      syncCanvasResolution,
    } = deps;  normalizeFlexAspect();
  syncCanvasResolution('flexCanvas');
  const canvas = byId('flexCanvas');
  const ctx = canvas.getContext('2d');
  const view = state.flexView || 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#192733';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const density = Math.max(4, Number(state.flexGridDensity) || 24);
  ctx.strokeStyle = '#274355';
  ctx.lineWidth = 1;
  for (let i = 1; i < density; i += 1) {
    ctx.beginPath();
    ctx.moveTo((canvas.width / density) * i, 0);
    ctx.lineTo((canvas.width / density) * i, canvas.height);
    ctx.stroke();
  }
  const densityY = Math.max(4, Math.round(density * (canvas.height / canvas.width)));
  for (let i = 1; i < densityY; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, (canvas.height / densityY) * i);
    ctx.lineTo(canvas.width, (canvas.height / densityY) * i);
    ctx.stroke();
  }

  if (state.flexSafeMargins) {
    const m90x = canvas.width * 0.05;
    const m90y = canvas.height * 0.05;
    const m80x = canvas.width * 0.1;
    const m80y = canvas.height * 0.1;
    ctx.strokeStyle = '#90f0ff';
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(m90x, m90y, canvas.width - 2 * m90x, canvas.height - 2 * m90y);
    ctx.strokeStyle = '#7de0aa';
    ctx.strokeRect(m80x, m80y, canvas.width - 2 * m80x, canvas.height - 2 * m80y);
    ctx.setLineDash([]);
  }

  if (state.flexShowGuides !== false) {
    const guides = getGuidePixelsFromList(state.flexGuides, canvas.width, canvas.height);
    ctx.strokeStyle = '#8f9aa4';
    ctx.setLineDash([4, 4]);
    for (const gx of guides.vertical) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }
    for (const gy of guides.horizontal) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvas.width, gy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  const colors = ['#00e0b8', '#ffb347', '#8fd3ff', '#d4b3ff'];
  const active = Number(state.flexActive) || 0;
  let visibleCount = 0;

  function drawHandle(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 1; i <= FLEX_WINDOW_COUNT; i += 1) {
    if (!byId(`flex${i}-en`) || !byId(`flex${i}-en`).checked) continue;
    visibleCount += 1;
    const r = flexToCanvas(
      pctToRawPos(byId(`flex${i}-x`).value),
      pctToRawPos(byId(`flex${i}-y`).value),
      pctToRawScale(byId(`flex${i}-s`).value),
      pctToRawScale(byId(`flex${i}-s`).value),
      canvas.width,
      canvas.height,
    );
    const isActive = i === active;
    const borderOn = Number(byId(`flex${i}-bs`)?.value || 0) > 0;
    const borderPct = clamp(Number(byId(`flex${i}-bw`)?.value || 0), 0, 100) / 100;
    const borderPx = clamp(Math.min(r.w, r.h) * borderPct, 1, 14);
    ctx.strokeStyle = colors[i - 1];
    if (borderOn) {
      ctx.lineWidth = isActive ? Math.max(borderPx, 2) : borderPx;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    const cl = clamp(Number(byId(`flex${i}-cl`)?.value || 0), 0, 100) / 100;
    const cr = clamp(Number(byId(`flex${i}-cr`)?.value || 0), 0, 100) / 100;
    const ct = clamp(Number(byId(`flex${i}-ct`)?.value || 0), 0, 100) / 100;
    const cb = clamp(Number(byId(`flex${i}-cb`)?.value || 0), 0, 100) / 100;
    const innerX = r.x + (r.w * cl);
    const innerY = r.y + (r.h * ct);
    const innerW = Math.max(1, r.w * (1 - cl - cr));
    const innerH = Math.max(1, r.h * (1 - ct - cb));
    ctx.fillStyle = 'rgba(130, 138, 145, 0.28)';
    ctx.fillRect(r.x, r.y, r.w, Math.max(0, innerY - r.y));
    ctx.fillRect(r.x, innerY + innerH, r.w, Math.max(0, (r.y + r.h) - (innerY + innerH)));
    ctx.fillRect(r.x, innerY, Math.max(0, innerX - r.x), innerH);
    ctx.fillRect(innerX + innerW, innerY, Math.max(0, (r.x + r.w) - (innerX + innerW)), innerH);
    ctx.strokeStyle = 'rgba(210, 218, 224, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(innerX, innerY, innerW, innerH);
    ctx.fillStyle = colors[i - 1];
    ctx.fillText(`FLEX PinP ${i}`, r.x + 6, r.y + 16);

    const handleColor = isActive ? '#ffffff' : colors[i - 1];
    const hs = isActive ? 7 : 5;
    // corners
    drawHandle(r.x, r.y, hs, handleColor);
    drawHandle(r.x + r.w, r.y, hs, handleColor);
    drawHandle(r.x, r.y + r.h, hs, handleColor);
    drawHandle(r.x + r.w, r.y + r.h, hs, handleColor);
    // edge centers
    drawHandle(r.x + r.w * 0.5, r.y, hs - 2, handleColor);
    drawHandle(r.x + r.w * 0.5, r.y + r.h, hs - 2, handleColor);
    drawHandle(r.x, r.y + r.h * 0.5, hs - 2, handleColor);
    drawHandle(r.x + r.w, r.y + r.h * 0.5, hs - 2, handleColor);
  }

  ctx.fillStyle = '#dce8f3';
  if (state.flexSafeMargins) {
    const m90x = canvas.width * 0.05;
    const m90y = canvas.height * 0.05;
    ctx.strokeStyle = 'rgba(190, 205, 216, 0.35)';
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.5, m90y);
    ctx.lineTo(canvas.width * 0.5, canvas.height - m90y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(m90x, canvas.height * 0.5);
    ctx.lineTo(canvas.width - m90x, canvas.height * 0.5);
    ctx.stroke();
  }
  if (visibleCount === 0) {
    ctx.fillStyle = '#e6f0f7';
    ctx.font = '16px Segoe UI';
    ctx.fillText('No windows enabled. Turn on checkbox for Flex 1..4.', 230, canvas.height * 0.5);
  }
}

  window.DVIPFlexRenderer = {
    drawFlexCanvas,
  };
})();
