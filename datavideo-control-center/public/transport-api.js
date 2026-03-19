/* global window */
(function initTransportApi(global) {
  async function sendControl(deps, label, value) {
    const { api, state } = deps;
    await api('/api/control', 'POST', { label, value });
    if (state?.values) state.values[label] = value;
  }

  async function sendRawControl(deps, sectionId, subSectionId, controlId, type, value) {
    const { api } = deps;
    await api('/api/control', 'POST', { sectionId, subSectionId, controlId, type, value });
  }

  global.DVIPTransportApi = {
    sendControl,
    sendRawControl,
  };
}(window));
