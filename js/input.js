// Keyboard input -> Game actions. Includes DAS (delayed auto-shift) so holding
// left/right repeats moves smoothly.
class Input {
  constructor(game, canvas) {
    this.game = game;
    game.input = this;
    this.canvas = canvas;
    this.held = {};   // action id -> timeHeld
    this.dasDelay = 0.16;
    this.dasInterval = 0.04;
    this.repeatTimers = {};

    this.mouseGrid = null;
    this._touchPointerId = null;
    this._touchStart = null;
    this._touchMoved = false;
    this._suppressClickUntil = 0;
    this._tapMaxPx = 14;
    this._swipeMinPx = 28;
    this._tapMaxMs = 350;
    this._holdLongMs = 450;
    this._touchHoldTimer = null;
    this._touchHoldFired = false;

    this._gpIndex = null;
    this._gpPrev = {};
    this._gpMoveHeld = { left: false, right: false, down: false };
    this._gpStickUp = false;
    this._gpDeadzone = 0.35;
    this._gpButtons = {
      A: 0, B: 1, X: 2, Y: 3,
      LB: 4, RB: 5, LT: 6, RT: 7,
      BACK: 8, START: 9,
      UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
    };

    this._keyToAction = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowDown: 'down',
      ArrowUp: 'rotate',
      KeyW: 'rotate',
      KeyR: 'rotate',
      KeyZ: 'rotateCCW',
      KeyC: 'hold',
      Space: 'hardDrop',
    };

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseleave', () => { this.mouseGrid = null; });
    canvas.addEventListener('click', (e) => this.onClick(e));

    canvas.addEventListener('pointerdown', (e) => this.onTouchPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onTouchPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onTouchPointerUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onTouchPointerUp(e));

    window.addEventListener('gamepadconnected', (e) => { this._gpIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (this._gpIndex === e.gamepad.index) {
        this._gpIndex = null;
        this._clearGamepadMoveHeld();
        this._gpPrev = {};
      }
    });

    setInterval(() => this.tick(0.016), 16);
  }

  canControlPiece() {
    const p = this.game.phase;
    return p === 'PLACING_BASE' || p === 'BUILD';
  }

  canActOnPiece() {
    return this.canControlPiece() && !this.game.paused;
  }

  clearHeld() {
    this.held = {};
    this.repeatTimers = {};
    this._clearGamepadMoveHeld();
    this.game.softDrop(false);
  }

  _clearGamepadMoveHeld() {
    for (const action of ['left', 'right', 'down']) {
      if (this._gpMoveHeld[action]) {
        this._gpMoveHeld[action] = false;
        this.holdAction(action, false);
      }
    }
  }

  _activeGamepad() {
    const list = navigator.getGamepads?.();
    if (!list) return null;
    if (this._gpIndex != null && list[this._gpIndex]?.connected) return list[this._gpIndex];
    for (const gp of list) {
      if (gp?.connected) return gp;
    }
    return null;
  }

  _gpPressed(gp, idx) {
    const btn = gp.buttons[idx];
    return !!(btn && (btn.pressed || btn.value > 0.5));
  }

  _gpJustPressed(gp, idx) {
    return this._gpPressed(gp, idx) && !this._gpPrev[idx];
  }

  _setGpMove(action, on) {
    if (on) {
      if (!this._gpMoveHeld[action]) {
        this._gpMoveHeld[action] = true;
        this.holdAction(action, true);
      }
    } else if (this._gpMoveHeld[action]) {
      this._gpMoveHeld[action] = false;
      this.holdAction(action, false);
    }
  }

  _pollGamepad() {
    const gp = this._activeGamepad();
    if (!gp) {
      this._clearGamepadMoveHeld();
      this._gpPrev = {};
      this._gpStickUp = false;
      return;
    }

    const B = this._gpButtons;
    const g = this.game;
    const nextPrev = {};

    const mark = (idx) => { nextPrev[idx] = this._gpPressed(gp, idx); };
    for (const idx of Object.values(B)) mark(idx);

    const just = (idx) => this._gpPressed(gp, idx) && !this._gpPrev[idx];

    if (just(B.START)) {
      if (g.helpOpen) {
        if (window.TTD?.ui?.closeHelp) window.TTD.ui.closeHelp();
        else g.closeHelp();
      } else g.togglePause();
    } else if (just(B.BACK)) {
      g.cycleWaveSpeed();
    }

    if (g.phase === 'GAMEOVER' || g.phase === 'WIN') {
      if (just(B.A) || just(B.START)) g.startNewRun();
      this._gpPrev = nextPrev;
      return;
    }

    const moveActive = this.canControlPiece() && !g.paused;
    if (moveActive) {
      const lx = gp.axes[0] ?? 0;
      const ly = gp.axes[1] ?? 0;
      const left = this._gpPressed(gp, B.LEFT) || lx < -this._gpDeadzone;
      const right = this._gpPressed(gp, B.RIGHT) || lx > this._gpDeadzone;
      const down = this._gpPressed(gp, B.DOWN) || ly > this._gpDeadzone;
      const up = this._gpPressed(gp, B.UP) || ly < -this._gpDeadzone;

      if (left && !right) this._setGpMove('left', true);
      else this._setGpMove('left', false);
      if (right && !left) this._setGpMove('right', true);
      else this._setGpMove('right', false);
      this._setGpMove('down', down);

      if ((up && !this._gpStickUp) || just(B.UP) || just(B.Y) || just(B.RB)) {
        this.performAction('rotate');
      }
      this._gpStickUp = up;
      if (just(B.LB)) this.performAction('rotateCCW');
      if (just(B.X)) this.performAction('hold');
      if (just(B.A) || just(B.RT)) this.performAction('hardDrop');
      if (just(B.B)) this.performAction('rotateCCW');
    } else {
      this._clearGamepadMoveHeld();
      this._gpStickUp = false;
    }

    this._gpPrev = nextPrev;
  }

  _clientToGrid(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return { gx: 0, gy: 0 };
    const sx = (clientX - rect.left) / rect.width * this.canvas.width;
    const sy = (clientY - rect.top) / rect.height * this.canvas.height;
    const cellW = this.canvas.width / CONFIG.GRID_W;
    const cellH = this.canvas.height / CONFIG.GRID_H;
    return {
      gx: Math.floor(sx / cellW),
      gy: Math.floor(sy / cellH),
    };
  }

  tryRepairAt(clientX, clientY) {
    if (this.game.paused) return false;
    const { gx, gy } = this._clientToGrid(clientX, clientY);
    if (!this.game.repairCell) return false;
    const cell = this.game.grid && this.game.grid.get(gx, gy);
    if (!cell) return false;
    if (cell.isBase) {
      if (this.game.baseHp >= this.game.baseMaxHp) return false;
    } else if (cell.hp >= cell.maxHp) {
      return false;
    }
    const result = this.game.repairCell(gx, gy);
    if (result && !result.ok && result.reason) {
      this.game.setBanner(result.reason, 0.7);
    }
    return true;
  }

  onClick(e) {
    if (this.game.paused) return;
    if (Date.now() < this._suppressClickUntil) return;
    const { gx, gy } = this._clientToGrid(e.clientX, e.clientY);
    if (!this.game.repairCell) return;
    const cell = this.game.grid && this.game.grid.get(gx, gy);
    if (!cell) return;
    if (cell.isBase) {
      if (this.game.baseHp >= this.game.baseMaxHp) return;
    } else if (cell.hp >= cell.maxHp) {
      return;
    }
    const result = this.game.repairCell(gx, gy);
    if (result && !result.ok && result.reason) {
      this.game.setBanner(result.reason, 0.7);
    }
  }

  _clearTouchHoldTimer() {
    if (this._touchHoldTimer != null) {
      clearTimeout(this._touchHoldTimer);
      this._touchHoldTimer = null;
    }
  }

  onTouchPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    if (!this.canActOnPiece()) return;
    if (this._touchPointerId != null) return;
    e.preventDefault();
    this._clearTouchHoldTimer();
    this._touchHoldFired = false;
    this._touchPointerId = e.pointerId;
    this._touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    this._touchMoved = false;
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    this._touchHoldTimer = setTimeout(() => {
      if (e.pointerId !== this._touchPointerId || !this._touchStart) return;
      if (this._touchMoved || !this.canActOnPiece()) return;
      this._touchHoldFired = true;
      this.performAction('hold');
      this._haptic(10);
    }, this._holdLongMs);
  }

  onTouchPointerMove(e) {
    if (e.pointerId !== this._touchPointerId || !this._touchStart) return;
    const dx = e.clientX - this._touchStart.x;
    const dy = e.clientY - this._touchStart.y;
    if (Math.hypot(dx, dy) > this._tapMaxPx) {
      this._touchMoved = true;
      this._clearTouchHoldTimer();
    }
  }

  onTouchPointerUp(e) {
    if (e.pointerId !== this._touchPointerId || !this._touchStart) return;
    e.preventDefault();
    this._clearTouchHoldTimer();
    const dx = e.clientX - this._touchStart.x;
    const dy = e.clientY - this._touchStart.y;
    const dt = performance.now() - this._touchStart.t;
    this._touchPointerId = null;
    this._touchStart = null;
    this._suppressClickUntil = Date.now() + 400;
    try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }

    if (!this.canActOnPiece()) return;
    if (this._touchHoldFired) return;

    if (!this._touchMoved && dt < this._tapMaxMs) {
      if (this.tryRepairAt(e.clientX, e.clientY)) {
        this._haptic(6);
      }
      return;
    }

    if (!this._touchMoved && dt >= this._holdLongMs) return;

    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx < this._swipeMinPx && ady < this._swipeMinPx) return;

    if (ady >= adx) {
      if (dy <= -this._swipeMinPx) {
        this.performAction('rotate');
        this._haptic(8);
      } else if (dy >= this._swipeMinPx) {
        this.performAction('hardDrop');
        this._haptic(8);
      }
      return;
    }

    this.performAction(dx < 0 ? 'left' : 'right');
    this._haptic(6);
  }

  _haptic(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  onMouseMove(e) {
    const { gx, gy } = this._clientToGrid(e.clientX, e.clientY);
    this.mouseGrid = { x: gx, y: gy };
  }

  onKeyDown(e) {
    if (e.repeat) return;
    const k = e.code;

    if (k === 'Escape') {
      if (this.game.helpOpen) {
        if (window.TTD?.ui?.closeHelp) window.TTD.ui.closeHelp();
        else this.game.closeHelp();
      }
      return;
    }
    if (k === 'KeyP') {
      if (this.game.helpOpen) {
        if (window.TTD?.ui?.closeHelp) window.TTD.ui.closeHelp();
        else this.game.closeHelp();
      } else this.game.togglePause();
      return;
    }
    if (k === 'KeyF') { this.game.cycleWaveSpeed(); return; }

    if (this.game.phase === 'GAMEOVER' || this.game.phase === 'WIN') {
      if (k === 'Enter' || k === 'Space') { this.game.startNewRun(); }
      return;
    }
    if (!this.canControlPiece()) return;
    if (this.game.paused) return;

    const action = this._keyToAction[k];
    if (!action) return;
    e.preventDefault();
    if (action === 'rotate' || action === 'rotateCCW' || action === 'hold' || action === 'hardDrop') {
      this.performAction(action);
      return;
    }
    this.held[action] = 0;
    this.performAction(action);
  }

  onKeyUp(e) {
    const action = this._keyToAction[e.code];
    if (action) {
      delete this.held[action];
      delete this.repeatTimers[action];
    }
  }

  performAction(action) {
    const g = this.game;
    switch (action) {
      case 'pause':
        g.togglePause();
        return;
      case 'waveSpeed':
        g.cycleWaveSpeed();
        return;
      case 'left':       if (!this.canActOnPiece()) return; g.movePiece(-1, 0); break;
      case 'right':      if (!this.canActOnPiece()) return; g.movePiece(1, 0); break;
      case 'down':       if (!this.canActOnPiece()) return; g.softDrop(true); break;
      case 'rotate':     if (!this.canActOnPiece()) return; g.rotatePiece(1); break;
      case 'rotateCCW':  if (!this.canActOnPiece()) return; g.rotatePiece(-1); break;
      case 'hold':       if (!this.canActOnPiece()) return; g.holdSwap(); break;
      case 'hardDrop':   if (!this.canActOnPiece()) return; g.hardDrop(); break;
    }
  }

  holdAction(action, on) {
    if (on) {
      if (!this.canActOnPiece()) return;
      if (!(action in this.held)) this.held[action] = 0;
      this.performAction(action);
    } else {
      delete this.held[action];
      delete this.repeatTimers[action];
      if (action === 'down') this.game.softDrop(false);
    }
  }

  tick(dt) {
    this._pollGamepad();
    if (this.game.paused) return;
    const repeatActions = new Set(['left', 'right', 'down']);
    for (const action in this.held) {
      this.held[action] += dt;
      if (repeatActions.has(action)) {
        if (this.held[action] >= this.dasDelay) {
          this.repeatTimers[action] = (this.repeatTimers[action] || 0) + dt;
          if (this.repeatTimers[action] >= this.dasInterval) {
            this.repeatTimers[action] = 0;
            this.performAction(action);
          }
        }
      }
    }
    if (!('down' in this.held)) this.game.softDrop(false);
  }
}
