const { normalizeState } = require('../merge-engine');

function resolveMode(req, body = null) {
  const bodyMode = body && body.mode ? String(body.mode).toLowerCase() : '';
  if (bodyMode === 'pip') return 'pip';
  if (bodyMode === 'flex') return 'flex';
  try {
    const url = new URL(req.url, 'http://localhost');
    const queryMode = String(url.searchParams.get('mode') || '').toLowerCase();
    if (queryMode === 'pip') return 'pip';
  } catch (_) {
    // ignore malformed URL parsing
  }
  return 'flex';
}

function readRunOptionsFromQuery(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const durationMs = Number(url.searchParams.get('durationMs'));
    const fps = Number(url.searchParams.get('fps'));
    const easing = url.searchParams.get('easing');
    const preset = url.searchParams.get('preset');
    return {
      preset: preset ? String(preset) : null,
      durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
      fps: Number.isFinite(fps) ? fps : undefined,
      easing: easing ? String(easing) : undefined,
    };
  } catch (_) {
    return { preset: null, durationMs: undefined, fps: undefined, easing: undefined };
  }
}

async function handleMergeApiRoute(ctx) {
  const {
    req,
    res,
    pathname,
    readBody,
    json,
    mergeEngine,
  } = ctx;

  if (req.method === 'GET' && pathname === '/api/merge/state') {
    const mode = resolveMode(req);
    json(res, 200, mergeEngine.getPublicState(mode));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/merge/presets') {
    const mode = resolveMode(req);
    json(res, 200, { mode, presets: mergeEngine.getPublicState(mode).presets });
    return true;
  }

  // Simple query-based run endpoint for generic clients (Companion HTTP GET):
  // /api/merge/run?preset=Key1&mode=flex&durationMs=1200&fps=15&easing=EaseEase
  if (req.method === 'GET' && pathname === '/api/merge/run') {
    const mode = resolveMode(req);
    const queryRun = readRunOptionsFromQuery(req);
    const options = {
      durationMs: queryRun.durationMs,
      fps: queryRun.fps,
      easing: queryRun.easing,
    };
    if (queryRun.preset) {
      const run = mergeEngine.runToPreset(queryRun.preset, options, mode);
      json(res, 200, { ok: true, run });
      return true;
    }
    json(res, 400, { error: 'preset query param is required' });
    return true;
  }



  // Dynamic path-based run endpoint:
  // /api/merge/run/<presetName>?mode=flex&durationMs=1200&fps=15&easing=EaseEase
  if ((req.method === 'GET' || req.method === 'POST') && pathname.startsWith('/api/merge/run/')) {
    const mode = resolveMode(req);
    const queryRun = readRunOptionsFromQuery(req);
    const options = {
      durationMs: queryRun.durationMs,
      fps: queryRun.fps,
      easing: queryRun.easing,
    };
    const rawName = pathname.slice('/api/merge/run/'.length);
    const presetName = decodeURIComponent(String(rawName || '')).trim();
    if (!presetName) {
      json(res, 400, { error: 'preset name in path is required' });
      return true;
    }
    const run = mergeEngine.runToPreset(presetName, options, mode);
    json(res, 200, { ok: true, preset: presetName, run });
    return true;
  }
  // Ultra-simple aliases for Companion Generic HTTP GET
  // /api/merge/key1, /api/merge/key2, /api/merge/key3
  if (req.method === 'GET' && (pathname === '/api/merge/key1' || pathname === '/api/merge/key2' || pathname === '/api/merge/key3')) {
    const mode = resolveMode(req);
    const presetName = pathname.endsWith('key1') ? 'Key1' : (pathname.endsWith('key2') ? 'Key2' : 'Key3');
    const queryRun = readRunOptionsFromQuery(req);
    const options = {
      durationMs: queryRun.durationMs,
      fps: queryRun.fps,
      easing: queryRun.easing,
    };
    const run = mergeEngine.runToPreset(presetName, options, mode);
    json(res, 200, { ok: true, preset: presetName, run });
    return true;
  }
  if (req.method === 'POST' && pathname === '/api/merge/presets/save') {
    const body = await readBody(req);
    const mode = resolveMode(req, body);
    const currentState = mergeEngine.getPublicState(mode).currentState;
    const saved = mergeEngine.savePreset(body.name, body.state || currentState, mode);
    json(res, 200, { ok: true, preset: saved });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/merge/presets/delete') {
    const body = await readBody(req);
    const mode = resolveMode(req, body);
    mergeEngine.deletePreset(body.name, mode);
    json(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/merge/apply') {
    const body = await readBody(req);
    const mode = resolveMode(req, body);
    const state = normalizeState(body.state || {}, mode);
    const applied = mergeEngine.applyState(state, mode);
    json(res, 200, { ok: true, state: applied });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/merge/run') {
    const body = await readBody(req);
    const mode = resolveMode(req, body);
    const options = {
      durationMs: body.durationMs,
      fps: body.fps,
      easing: body.easing,
    };
    if (body.preset) {
      const run = mergeEngine.runToPreset(body.preset, options, mode);
      json(res, 200, { ok: true, run });
      return true;
    }
    const run = mergeEngine.runToState(body.state || {}, options, mode);
    json(res, 200, { ok: true, run });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/merge/stop') {
    const body = await readBody(req);
    const mode = resolveMode(req, body);
    mergeEngine.stop(mode);
    json(res, 200, { ok: true });
    return true;
  }

  return false;
}

module.exports = {
  handleMergeApiRoute,
};



