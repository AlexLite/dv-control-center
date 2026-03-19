(function exposeStateFactory() {
  function createDefaultState() {
    return {
      catalog: null,
      controlsByLabel: new Map(),
      values: {},
      stateById: {},
      connection: {},
      model: null,
      modelSelection: null,
      pipWindows: {},
      editLocks: { pip: {}, flex: {} },
      editor: {
        pip: { dirty: false, baseline: null, history: [], future: [] },
        flex: { dirty: false, baseline: null, history: [], future: [] },
      },
    };
  }

  window.DVIPStateFactory = {
    createDefaultState,
  };
})();

