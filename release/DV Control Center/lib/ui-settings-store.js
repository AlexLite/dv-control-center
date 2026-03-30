const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = Object.freeze({
  language: null,
  editor: {},
  flexBanks: {},
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeSettings(input) {
  const src = input && typeof input === 'object' ? input : {};
  const language = (src.language === 'en' || src.language === 'ru') ? src.language : null;
  const editor = (src.editor && typeof src.editor === 'object') ? src.editor : {};
  const flexBanks = (src.flexBanks && typeof src.flexBanks === 'object') ? src.flexBanks : {};
  return { language, editor, flexBanks };
}

class UiSettingsStore {
  constructor(storagePath) {
    this.storagePath = storagePath || path.join(process.cwd(), 'data', 'ui-settings.json');
    this.state = cloneJson(DEFAULT_SETTINGS);
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.storagePath)) return;
      const raw = fs.readFileSync(this.storagePath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      this.state = normalizeSettings(parsed);
    } catch (_) {
      this.state = cloneJson(DEFAULT_SETTINGS);
    }
  }

  save() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.storagePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  getAll() {
    return cloneJson(this.state);
  }

  mergePatch(patch = {}) {
    const next = this.getAll();
    if (patch && typeof patch === 'object') {
      if (patch.language !== undefined) {
        next.language = (patch.language === 'en' || patch.language === 'ru') ? patch.language : null;
      }
      if (patch.editor && typeof patch.editor === 'object') {
        next.editor = { ...next.editor, ...patch.editor };
      }
      if (patch.flexBanks && typeof patch.flexBanks === 'object') {
        next.flexBanks = patch.flexBanks;
      }
    }
    this.state = normalizeSettings(next);
    this.save();
    return this.getAll();
  }
}

module.exports = {
  UiSettingsStore,
};
