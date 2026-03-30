const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { MergeEngine } = require('./lib/merge-engine');
const { handleMergeApiRoute } = require('./lib/routes/merge-routes');
const { handleModelApiRoute } = require('./lib/routes/model-routes');
const { handleControlApiRoute } = require('./lib/routes/control-routes');
const { handleSystemRoute } = require('./lib/routes/system-routes');
const { initModelBootstrap } = require('./lib/bootstrap/model-bootstrap');
const { DvipClient } = require('./lib/dvip-client');
const { UiSettingsStore } = require('./lib/ui-settings-store');
const { json, readBody } = require('./lib/http-utils');

const publicDir = path.join(__dirname, 'public');
function isWritableDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const probe = path.join(dirPath, `.write-test-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probe, 'ok', 'utf8');
    fs.unlinkSync(probe);
    return true;
  } catch (_) {
    return false;
  }
}

function resolveDataDir() {
  const localDataDir = path.join(__dirname, 'data');
  if (isWritableDir(localDataDir)) return localDataDir;

  const appDataBase = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const fallbackDataDir = path.join(appDataBase, 'DV Control Center', 'data');
  if (isWritableDir(fallbackDataDir)) {
    console.warn(`Data dir '${localDataDir}' is not writable, using fallback '${fallbackDataDir}'`);
    return fallbackDataDir;
  }

  throw new Error(`No writable data directory. Tried '${localDataDir}' and '${fallbackDataDir}'`);
}

const dataDir = resolveDataDir();

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
}, { dataDir });
const mergeEngine = new MergeEngine({
  client,
  catalog,
  storagePath: path.join(dataDir, 'merge-presets.json'),
});
const uiSettingsStore = new UiSettingsStore(path.join(dataDir, 'ui-settings.json'));
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
      readBody,
      json,
      client,
      publicDir,
      uiSettingsStore,
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


