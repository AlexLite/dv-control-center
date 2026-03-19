/* global window */
(function initNamespaceAlias(global) {
  const pairs = [
    ['ApiClient', 'ApiClient'],
    ['StateFactory', 'StateFactory'],
    ['Constants', 'Constants'],
    ['Shared', 'Shared'],
    ['UiCore', 'UiCore'],
    ['Mapping', 'Mapping'],
    ['TransportApi', 'TransportApi'],
    ['AppShell', 'AppShell'],
    ['PanelsUi', 'PanelsUi'],
    ['StateSyncUi', 'StateSyncUi'],
    ['EditorState', 'EditorState'],
    ['EditorPersistence', 'EditorPersistence'],
    ['EditorUiUtils', 'EditorUiUtils'],
    ['RuntimeHelpers', 'RuntimeHelpers'],
    ['ControlsUi', 'ControlsUi'],
    ['ControlActions', 'ControlActions'],
    ['AppBootstrap', 'AppBootstrap'],
    ['PipRenderer', 'PipRenderer'],
    ['FlexRenderer', 'FlexRenderer'],
    ['PipEditor', 'PipEditor'],
    ['FlexEditor', 'FlexEditor'],
  ];

  for (const [legacy, modern] of pairs) {
    const oldKey = `SE3200${legacy}`;
    const newKey = `DVIP${modern}`;
    if (!global[newKey] && global[oldKey]) global[newKey] = global[oldKey];
    if (!global[oldKey] && global[newKey]) global[oldKey] = global[newKey];
  }
}(window));
