// Player settings persisted in localStorage.
const SETTINGS_STORAGE_KEY = 'ttd-settings';

const DEFAULT_SETTINGS = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.4,
  musicMuted: false,
  reduceMotion: false,
  pathPreview: true,
  colorblindPatterns: false,
  defaultWaveSpeed: 1,
};

let _settings = null;

function loadSettings() {
  if (_settings) return _settings;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      _settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      return _settings;
    }
  } catch { /* ignore */ }
  _settings = { ...DEFAULT_SETTINGS };
  return _settings;
}

function saveSettings(next) {
  _settings = { ...loadSettings(), ...next };
  const json = JSON.stringify(_settings);
  if (typeof Platform !== 'undefined' && Platform.persistKey) {
    Platform.persistKey(SETTINGS_STORAGE_KEY, json);
  } else {
    localStorage.setItem(SETTINGS_STORAGE_KEY, json);
  }
  window.dispatchEvent(new CustomEvent('ttd-settings-changed', { detail: _settings }));
  return _settings;
}

function getSetting(key) {
  return loadSettings()[key];
}

function activeSettingsForm() {
  const modal = document.getElementById('settings-modal');
  if (modal && !modal.classList.contains('hidden')) {
    return document.getElementById('settings-form');
  }
  const gameRoot = document.getElementById('game-root');
  if (gameRoot?.dataset.mobileTab === 'settings') {
    return document.getElementById('settings-form-mobile');
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mobile = window.matchMedia('(max-width: 1100px), (hover: none) and (pointer: coarse)').matches
      && !document.documentElement.classList.contains('platform-desktop');
    if (mobile) return document.getElementById('settings-form-mobile');
  }
  return document.getElementById('settings-form') || document.getElementById('settings-form-mobile');
}

function querySettingInputs(root) {
  const scope = root || document;
  return scope.querySelectorAll('[data-setting]');
}

function invalidateSettingsCache() {
  _settings = null;
}

function applySettingsToForm() {
  const s = loadSettings();
  for (const el of querySettingInputs()) {
    const key = el.dataset.setting;
    if (!(key in s)) continue;
    const val = s[key];
    if (el.type === 'checkbox') el.checked = !!val;
    else if (el.type === 'radio') el.checked = Number(el.value) === Number(val);
    else el.value = String(val);
  }
}

function readSettingsFromForm() {
  const form = activeSettingsForm();
  const next = { ...loadSettings() };
  for (const el of querySettingInputs(form || document)) {
    const key = el.dataset.setting;
    if (!key) continue;
    if (el.type === 'checkbox') next[key] = el.checked;
    else if (el.type === 'radio') {
      if (el.checked) next[key] = parseFloat(el.value);
    } else if (el.type === 'range' || el.type === 'number') {
      next[key] = parseFloat(el.value);
    }
  }
  const saved = saveSettings(next);
  applySettingsToForm();
  return saved;
}
