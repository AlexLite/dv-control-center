(function exposeApiClient() {
  async function request(path, method = 'GET', body) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `HTTP ${res.status}`);
    }
    return res.json();
  }

  function startEvents({
    url = '/api/events',
    onBootstrap,
    onConnection,
    onState,
    onModel,
    onMessage,
    onError,
  } = {}) {
    const events = new EventSource(url);
    events.onmessage = (ev) => {
      let msg = null;
      try {
        msg = JSON.parse(ev.data);
      } catch (_) {
        return;
      }
      if (onMessage) onMessage(msg);
      if (msg.type === 'bootstrap' && onBootstrap) onBootstrap(msg.data || {});
      if (msg.type === 'connection' && onConnection) onConnection(msg.data || {});
      if (msg.type === 'state' && onState) onState(msg.data || []);
      if (msg.type === 'model' && onModel) onModel(msg.data || {});
    };
    if (onError) events.onerror = onError;
    return events;
  }

  window.DVIPApiClient = {
    request,
    startEvents,
  };
})();

