/* Compatibility shim: legacy filename retained for older integrations. */
/* global window, document */
(function initLegacyMappingShim(global) {
  function bindAlias() {
    if (global.DVIPMapping && !global.SE3200Mapping) {
      global.SE3200Mapping = global.DVIPMapping;
    }
  }

  if (global.DVIPMapping) {
    bindAlias();
    return;
  }

  // Browser fallback: lazily load the new primary mapping module.
  if (typeof document !== 'undefined' && document.createElement) {
    const script = document.createElement('script');
    script.src = './mapping-dvip.js';
    script.async = false;
    script.onload = bindAlias;
    (document.head || document.documentElement || document.body).appendChild(script);
  }
}(window));