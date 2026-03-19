const fs = require('fs');
const path = require('path');

function loadSignatures() {
  const filePath = path.join(__dirname, '..', 'data', 'model-signatures.json');
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (_) {
    // ignore malformed file, fallback to defaults
  }
  return {
    byProductVersion: {},
    byBoardVersion: {},
  };
}

function getStatusValue(state, key) {
  const v = state ? state[key] : undefined;
  return v === undefined || v === null ? null : Number(v);
}

function detectModelFromState(state, requestedModelId = 'auto') {
  const signatures = loadSignatures();
  const product = getStatusValue(state, 'STATUS_PRODUCT_VERSION');
  const sub = getStatusValue(state, 'STATUS_PRODUCT_SUBVERSION');
  const board = getStatusValue(state, 'STATUS_BOARD_ID_VERSION');

  if (Number.isFinite(product)) {
    const byProduct = signatures.byProductVersion || {};
    const exact = byProduct[String(product)];
    if (exact) {
      return {
        modelId: String(exact),
        confidence: 1,
        reason: `Matched STATUS_PRODUCT_VERSION=${product}`,
        raw: { product, sub, board },
      };
    }
    if (Number.isFinite(sub)) {
      const composite = byProduct[`${product}:${sub}`];
      if (composite) {
        return {
          modelId: String(composite),
          confidence: 1,
          reason: `Matched STATUS_PRODUCT_VERSION:SUBVERSION=${product}:${sub}`,
          raw: { product, sub, board },
        };
      }
    }
  }

  if (Number.isFinite(board)) {
    const byBoard = signatures.byBoardVersion || {};
    const exact = byBoard[String(board)];
    if (exact) {
      return {
        modelId: String(exact),
        confidence: 0.9,
        reason: `Matched STATUS_BOARD_ID_VERSION=${board}`,
        raw: { product, sub, board },
      };
    }
  }

  // Heuristic: Flex/MultiView controls are strong SE-3200 indicators in this project scope.
  if (
    state &&
    (
      state.SWITCHER_FLEX_SRC_BGND_SRC !== undefined ||
      state.SWITCHER_FLEX_SRC_DVE1_SRC !== undefined ||
      state.OUTPUT_MULTIVIEWER_MODE !== undefined
    )
  ) {
    return {
      modelId: 'se3200',
      confidence: 0.7,
      reason: 'Detected SE-3200-only control labels in state',
      raw: { product, sub, board },
    };
  }

  return {
    modelId: requestedModelId && requestedModelId !== 'auto' ? requestedModelId : 'auto',
    confidence: 0.2,
    reason: 'No model signature matched, using fallback',
    raw: { product, sub, board },
  };
}

module.exports = {
  detectModelFromState,
};
