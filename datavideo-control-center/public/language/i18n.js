/* global window, document */
(function initI18n(global) {
  const STORAGE_KEY = 'dvcc_lang';
  const dictionaries = global.DVIPTranslations || { en: {}, ru: {} };

  function detectInitialLanguage() {
    const saved = String(localStorage.getItem(STORAGE_KEY) || '').toLowerCase();
    if (saved === 'en' || saved === 'ru') return saved;
    const browser = String(navigator.language || 'en').toLowerCase();
    return browser.startsWith('ru') ? 'ru' : 'en';
  }

  const state = { language: detectInitialLanguage() };

  function format(template, vars) {
    if (!vars) return template;
    return String(template).replace(/\{([^}]+)\}/g, (_, key) => (vars[key] ?? `{${key}}`));
  }

  function t(key, vars) {
    const langDict = dictionaries[state.language] || dictionaries.en || {};
    const fallback = (dictionaries.en && dictionaries.en[key]) || key;
    return format(langDict[key] || fallback, vars);
  }

  function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key);
    });
    const select = document.getElementById('langSelect');
    if (select) select.value = state.language;
    document.documentElement.lang = state.language;
  }

  function setLanguage(nextLang) {
    const lang = String(nextLang || '').toLowerCase();
    if (lang !== 'en' && lang !== 'ru') return;
    if (state.language === lang) return;
    state.language = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    if (global.DVCCUiSettings && typeof global.DVCCUiSettings.saveLanguage === 'function') {
      global.DVCCUiSettings.saveLanguage(lang).catch(() => {});
    }
    applyStaticTranslations();
    document.dispatchEvent(new CustomEvent('dvcc:lang-changed', { detail: { lang } }));
  }

  async function syncLanguageFromBackend() {
    try {
      if (!global.DVCCUiSettings || typeof global.DVCCUiSettings.getLanguage !== 'function') return;
      const remote = await global.DVCCUiSettings.getLanguage();
      if (remote === 'en' || remote === 'ru') {
        state.language = remote;
        localStorage.setItem(STORAGE_KEY, remote);
      } else {
        global.DVCCUiSettings.saveLanguage(state.language).catch(() => {});
      }
      applyStaticTranslations();
      document.dispatchEvent(new CustomEvent('dvcc:lang-changed', { detail: { lang: state.language } }));
    } catch (_) {
      // ignore backend sync errors
    }
  }

  function bindLanguageSelect() {
    const select = document.getElementById('langSelect');
    if (!select) return;
    select.value = state.language;
    select.addEventListener('change', () => setLanguage(select.value));
  }

  function init() {
    applyStaticTranslations();
    bindLanguageSelect();
    syncLanguageFromBackend().catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  global.DVIPI18n = {
    t,
    getLanguage: () => state.language,
    setLanguage,
    applyStaticTranslations,
  };
}(window));


