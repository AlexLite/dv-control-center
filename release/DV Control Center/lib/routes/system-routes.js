const fs = require('fs');
const path = require('path');

function serveStatic(req, res, publicDir, json) {
  const parsed = new URL(req.url, 'http://localhost');
  let reqPath = parsed.pathname;
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(publicDir, reqPath);
  if (!filePath.startsWith(publicDir)) return json(res, 403, { error: 'Forbidden' });
  if (!fs.existsSync(filePath)) return json(res, 404, { error: 'Not found' });
  const ext = path.extname(filePath).toLowerCase();
  const typeMap = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  };
  res.writeHead(200, { 'Content-Type': typeMap[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function handleSystemRoute(ctx) {
  const {
    req,
    res,
    pathname,
    readBody,
    json,
    client,
    publicDir,
    uiSettingsStore,
  } = ctx;

  if (req.method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    client.addSseClient(res);
    req.on('close', () => client.removeSseClient(res));
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/ui/settings') {
    json(res, 200, uiSettingsStore ? uiSettingsStore.getAll() : {});
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/ui/settings') {
    const body = await readBody(req);
    const saved = uiSettingsStore ? uiSettingsStore.mergePatch(body || {}) : {};
    json(res, 200, { ok: true, settings: saved });
    return true;
  }

  if (pathname.startsWith('/api/')) {
    json(res, 404, { error: 'Unknown endpoint' });
    return true;
  }

  serveStatic(req, res, publicDir, json);
  return true;
}

module.exports = {
  serveStatic,
  handleSystemRoute,
};
