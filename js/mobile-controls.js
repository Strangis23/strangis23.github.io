// Optional wave-phase overlay (pause / speed). Piece control is swipe-on-canvas (see input.js).
class MobileControls {
  constructor(game, input, canvasWrap) {
    this.game = game;
    this.input = input;
    this.canvasWrap = canvasWrap;
    this.root = document.getElementById('mobile-controls');
    this.toggleEl = document.getElementById('mobile-controls-toggle');
    this.waveSpeedBtn = this.root?.querySelector('[data-action="waveSpeed"]');

    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const stored = localStorage.getItem('ttd-mobile-controls');
    this.enabled = stored === '1' || (stored == null && coarse);

    if (this.toggleEl) {
      this.toggleEl.addEventListener('change', () => {
        this.setEnabled(this.toggleEl.checked);
      });
    }

    this._bindButtons();
    this._syncToggleUi();
    this.syncVisibility();
  }

  setEnabled(on) {
    this.enabled = !!on;
    localStorage.setItem('ttd-mobile-controls', this.enabled ? '1' : '0');
    this._syncToggleUi();
    this.syncVisibility();
  }

  isEnabled() { return this.enabled; }

  _syncToggleUi() {
    if (this.toggleEl) this.toggleEl.checked = this.enabled;
  }

  syncVisibility() {
    if (!this.root) return;
    const phase = this.game.phase;
    const show = this.enabled && phase === 'WAVE';
    this.root.classList.toggle('hidden', !show);
    this.root.classList.toggle('mode-wave', show);

    if (this.canvasWrap) {
      this.canvasWrap.classList.remove('mobile-active');
    }

    if (this.waveSpeedBtn) {
      const def = CONFIG.DEFAULT_WAVE_SPEED ?? 3;
      this.waveSpeedBtn.textContent = `${this.game.waveSpeed || def}x`;
    }

    requestAnimationFrame(() => window.TTD?.fitGameCanvas?.());
  }

  _bindButtons() {
    if (!this.root) return;
    const globalActions = new Set(['pause', 'waveSpeed']);
    for (const btn of this.root.querySelectorAll('[data-action]')) {
      const action = btn.dataset.action;
      btn.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        if (!this.enabled) return;
        if (!globalActions.has(action)) return;
        this.input.performAction(action);
        if (action === 'waveSpeed') this.syncVisibility();
      });
    }
  }
}
