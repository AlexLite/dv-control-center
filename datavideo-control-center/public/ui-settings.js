/* global window, fetch */
(function initUiSettings(global) {
  const EMPTY = Object.freeze({});
  let cache = null;
  let loadingPromise = null;

  async function request(path, method = 'GET', body) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function ensureLoaded() {
    if (cache) return cache;
    if (loadingPromise) return loadingPromise;
    loadingPromise = request('/api/ui/settings')
      .then((data) => {
        cache = (data && typeof data === 'object') ? data : {};
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      })
      .finally(() => {
        loadingPromise = null;
      });
    return loadingPromise;
  }

  async function savePatch(patch) {
    const result = await request('/api/ui/settings', 'POST', patch || {});
    cache = (result && result.settings && typeof result.settings === 'object') ? result.settings : (cache || {});
    return cache;
  }

  async function getEditorSettings() {
    const data = await ensureLoaded();
    return (data.editor && typeof data.editor === 'object') ? data.editor : EMPTY;
  }

  async function saveEditorSettings(editorPatch) {
    const current = await getEditorSettings();
    const nextEditor = { ...current, ...(editorPatch && typeof editorPatch === 'object' ? editorPatch : {}) };
    return savePatch({ editor: nextEditor });
  }

  async function getFlexBanks() {
    const data = await ensureLoaded();
    return (data.flexBanks && typeof data.flexBanks === 'object') ? data.flexBanks : {};
  }

  async function saveFlexBanks(flexBanks) {
    return savePatch({ flexBanks: (flexBanks && typeof flexBanks === 'object') ? flexBanks : {} });
  }

  async function getLanguage() {
    const data = await ensureLoaded();
    return (data.language === 'en' || data.language === 'ru') ? data.language : null;
  }

  async function saveLanguage(lang) {
    if (lang !== 'en' && lang !== 'ru') return cache || {};
    return savePatch({ language: lang });
  }

  global.DVCCUiSettings = {
    ensureLoaded,
    getEditorSettings,
    saveEditorSettings,
    getFlexBanks,
    saveFlexBanks,
    getLanguage,
    saveLanguage,
  };
}(window));
