const http = require('http');
const path = require('path');

const { MergeEngine } = require('./lib/merge-engine');
const { handleMergeApiRoute } = require('./lib/routes/merge-routes');
const { handleModelApiRoute } = require('./lib/routes/model-routes');
const { handleControlApiRoute } = require('./lib/routes/control-routes');
const { handleSystemRoute } = require('./lib/routes/system-routes');
const { initModelBootstrap } = require('./lib/bootstrap/model-bootstrap');
const { DvipClient } = require('./lib/dvip-client');
const { json, readBody } = require('./lib/http-utils');

const publicDir = path.join(__dirname, 'public');

const modelRuntime = initModelBootstrap({ requestedModelId: process.env.DV_MODEL || 'auto' });
const activeModel = modelRuntime.activeModel;
const catalog = modelRuntime.catalog;
const profiles = modelRuntime.profiles;

const client = new DvipClient(catalog, {
  onStateChanged: ({ state }) => {
    if (modelRuntime.handleStateChanged(state)) {
      client.broadcast({
        type: 'model',
        data: modelRuntime.getModelSelection(),
      });
    }
  },
}, { dataDir: path.join(__dirname, 'data') });
const mergeEngine = new MergeEngine({
  client,
  catalog,
  storagePath: path.join(__dirname, 'data', 'merge-presets.json'),
});
modelRuntime.refreshDetectedModel(client.state);
client.hooks.bootstrapData = () => ({
  model: modelRuntime.getDetectedModel(),
  modelSelection: modelRuntime.getModelSelection(),
});

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url, 'http://localhost');
    const { pathname } = parsed;



    if (await handleModelApiRoute({
      req,
      res,
      pathname,
      json,
      readBody,
      client,
      catalog,
      profiles,
      activeModel,
      getDetectedModel: modelRuntime.getDetectedModel,
      getDetection: modelRuntime.getDetection,
      refreshDetectedModel: modelRuntime.refreshDetectedModel,
      getModelList: modelRuntime.getModelList,
    })) {
      return;
    }

    if (await handleControlApiRoute({
      req,
      res,
      pathname,
      readBody,
      json,
      client,
      catalog,
    })) {
      return;
    }

    if (await handleMergeApiRoute({
      req,
      res,
      pathname,
      readBody,
      json,
      mergeEngine,
    })) {
      return;
    }

    if (await handleSystemRoute({
      req,
      res,
      pathname,
      json,
      client,
      publicDir,
    })) {
      return;
    }
  } catch (err) {
    return json(res, 500, { error: err.message });
  }
});

const PORT = Number(process.env.PORT || 9999);
server.listen(PORT, () => {
  console.log(`DataVideo Control Center running on http://localhost:${PORT}`);
});

