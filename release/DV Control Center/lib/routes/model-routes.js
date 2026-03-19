async function handleModelApiRoute(ctx) {
  const {
    req,
    res,
    pathname,
    json,
    readBody,
    client,
    catalog,
    profiles,
    activeModel,
    getDetectedModel,
    getDetection,
    refreshDetectedModel,
    getModelList,
  } = ctx;

  if (req.method === 'GET' && pathname === '/api/catalog') {
    json(res, 200, {
      sections: catalog.sections,
      profiles,
      model: getDetectedModel(),
      modelSelection: {
        requested: activeModel,
        detected: getDetectedModel(),
        detection: getDetection(),
      },
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/models') {
    json(res, 200, {
      current: getDetectedModel(),
      requested: activeModel,
      detection: getDetection(),
      available: getModelList(),
      note: 'Use DV_MODEL=auto for autodetect or set fixed model and restart.',
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/state') {
    const detect = refreshDetectedModel(client.state);
    const detection = getDetection();
    json(res, 200, {
      connection: client.connection,
      connectionConfig: client.savedConnectionConfig || null,
      state: client.state,
      stateById: client.stateById,
      model: getDetectedModel(),
      modelSelection: {
        requested: activeModel,
        detected: getDetectedModel(),
        detection: {
          ...detection,
          result: detect || detection.result,
        },
      },
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/model/detect') {
    const result = refreshDetectedModel(client.state);
    json(res, 200, {
      ok: true,
      result,
      model: getDetectedModel(),
      modelSelection: {
        requested: activeModel,
        detected: getDetectedModel(),
        detection: getDetection(),
      },
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/state/refresh') {
    await readBody(req);
    client.requestStateSnapshot();
    json(res, 200, { ok: true });
    return true;
  }

  return false;
}

module.exports = {
  handleModelApiRoute,
};