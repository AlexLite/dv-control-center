async function handleControlApiRoute(ctx) {
  const {
    req,
    res,
    pathname,
    readBody,
    json,
    client,
    catalog,
  } = ctx;

  if (req.method === 'POST' && pathname === '/api/connect') {
    const body = await readBody(req);
    client.connect(body);
    json(res, 200, { ok: true, connection: client.connection });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/disconnect') {
    client.disconnect();
    json(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/control') {
    const body = await readBody(req);
    let control = null;
    if (body.label) control = catalog.byLabel.get(body.label);
    if (!control && Number.isInteger(body.sectionId) && Number.isInteger(body.controlId)) {
      control = {
        sectionId: body.sectionId,
        controlId: body.controlId,
        subSectionId: body.subSectionId || 0,
        type: body.type || 'int',
        label: `${body.sectionId}:${body.subSectionId || 0}:${body.controlId}`,
      };
    }
    if (!control) {
      json(res, 404, { error: 'Control not found' });
      return true;
    }
    client.sendSet(control, body.value);
    json(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/control/batch') {
    const MAX_BATCH = 50;
    const body = await readBody(req);
    const updates = Array.isArray(body.updates) ? body.updates.slice(0, MAX_BATCH) : [];
    const socket = client.cmdSocket;
    if (socket) socket.cork();
    try {
      for (const item of updates) {
        const control = catalog.byLabel.get(item.label);
        if (control) client.sendSet(control, item.value);
      }
    } finally {
      if (socket) process.nextTick(() => { try { socket.uncork(); } catch (_) {} });
    }
    json(res, 200, { ok: true, count: updates.length });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/control/get') {
    const body = await readBody(req);
    const labels = Array.isArray(body.labels) ? body.labels : [];
    for (const label of labels) {
      const control = catalog.byLabel.get(label);
      if (control) client.sendGet(control);
    }
    json(res, 200, { ok: true, count: labels.length });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/input-name') {
    const body = await readBody(req);
    client.setInputName(body.input, body.name || '');
    json(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/input-name/get') {
    const body = await readBody(req);
    client.requestInputName(body.input);
    json(res, 200, { ok: true });
    return true;
  }



  if (req.method === 'POST' && pathname === '/api/file-name/get') {
    const body = await readBody(req);
    client.requestFileName(body.kind, body.num);
    json(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/file-name') {
    const body = await readBody(req);
    client.setFileName(body.kind, body.num, body.name || '');
    json(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/file-name/get-range') {
    const body = await readBody(req);
    client.requestFileNamesRange(body.kind, body.start, body.count);
    json(res, 200, { ok: true });
    return true;
  }
  return false;
}

module.exports = {
  handleControlApiRoute,
};