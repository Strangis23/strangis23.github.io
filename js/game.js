// Central game state + phase FSM.
// Phases:
//   PLACING_BASE -> BUILD -> WAVE -> [SHOP every 5 waves] -> next BUILD
//   GAMEOVER, WIN are terminal. Pieces and enemies never share field at once.
class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.grid = new Grid(CONFIG.GRID_W, CONFIG.GRID_H);
    this.deck = null; // populated in startNewRun()
    this.activePiece = null;
    this.phase = 'IDLE';
    this.score = 0;
    this.wave = 0;
    this.piecesLeftThisBuild = 0;
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.softDropping = false;
    this.paused = false;
    this.helpOpen = false;
    this._wasPausedBeforeHelp = false;
    this.settingsModalOpen = false;
    this._wasPausedBeforeSettings = false;
    this.banner = null;
    this.waveSpawner = null;
    this.waveEnding = false;
    this.waveEndTimer = 0;
    this.input = null;
    this.shopCards = []; // currently offered shop cards (each annotated with .bought boolean)
    this.pendingShopBuyIndex = -1; // shop card awaiting deck swap (-1 = none)
    this.waveSpeed = CONFIG.DEFAULT_WAVE_SPEED ?? 1;  // player-controlled wave time-scale (1x / 2x / 3x)
    this.waveStats = { kills: 0, points: 0, income: 0 };
    this.heldCard = null;          // Tetris-style hold slot
    this.holdUsedThisPiece = false; // reset on lock so each spawn allows one hold
    this.baseHp = 0;
    this.baseMaxHp = 0;
    this.baseHpLevel = 0;
    this.baseHpBonus = 0;       // shop fortify purchases
    this.baseWallBonus = 0;     // legendary wall passive (stacked per placed cell)
    this._basePieceHp = 0;      // sum of card HP on base cells at placement
    this.runStats = createRunStats();
    this.difficulty = CONFIG.DIFFICULTY_PRESETS.normal;
    this.difficultyId = 'normal';
    this.dailySeed = false;
    this.rng = null;
    this.screenShake = null;
    this.tutorialActive = false;
    this.tutorialRole = null;
    this.tutorialStep = null;
    this._tutorialPlaceTimer = 0;
    this._tutorialWaveElapsed = 0;
  }

  // Swap the active piece with the held card (or draw a new one if hold is empty).
  // Limited to one swap per piece to prevent stalling.
  holdSwap() {
    if (this.paused) return false;
    if (this.phase !== 'BUILD' && this.phase !== 'PLACING_BASE') return false;
    if (this.difficulty && this.difficulty.holdEnabled === false) return false;
    if (!this.activePiece) return false;
    if (this.holdUsedThisPiece) return false;
    const currentCard = this.activePiece.card;
    if (this.heldCard) {
      this.activePiece = new Piece(this.heldCard);
      this.heldCard = currentCard;
    } else {
      this.heldCard = currentCard;
      const next = this.deck.draw();
      this.activePiece = new Piece(next);
    }
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.holdUsedThisPiece = true;
    if (this.activePiece.collides(this.grid)) {
      this.lose('Top-out: blocks reached the spawn area.');
      return false;
    }
    if (this.runStats) this.runStats.holdsUsed += 1;
    if (typeof notifyAchievementUnlock === 'function') {
      notifyAchievementUnlock(this, 'hold_once');
    }
    return true;
  }

  // Compute repair cost for a placed cell. Returns { cost, missing, isBase }.
  repairCost(cell) {
    const perHp = CONFIG.REPAIR_COST_PER_HP || 10;
    if (cell.isBase) {
      const missing = Math.max(0, this.baseMaxHp - this.baseHp);
      const mult = CONFIG.REPAIR_BASE_MULTIPLIER || 4;
      const cost = Math.max(1, Math.ceil(missing * perHp * mult));
      return { cost, missing, isBase: true };
    }
    const missing = Math.max(0, cell.maxHp - cell.hp);
    const rarityMult = (CONFIG.REPAIR_RARITY_MULT && CONFIG.REPAIR_RARITY_MULT[cell.rarity]) || 1;
    const cost = Math.max(1, Math.ceil(missing * perHp * rarityMult));
    return { cost, missing, isBase: false };
  }

  // Spend points to fully restore a damaged cell. Returns { ok, spent, reason }.
  repairCell(x, y) {
    if (this.paused) return { ok: false, reason: 'Game is paused' };
    if (this.phase !== 'BUILD' && this.phase !== 'PLACING_BASE') {
      return { ok: false, reason: 'Repairs only available during the build phase' };
    }
    const cell = this.grid.get(x, y);
    if (!cell) return { ok: false, reason: 'No block here' };
    const { cost, missing, isBase } = this.repairCost(cell);
    if (missing <= 0) return { ok: false, reason: 'Already at full HP' };
    if (this.score < cost) return { ok: false, reason: `Need ${cost - this.score} more points` };
    this.score -= cost;
    if (isBase) {
      this.baseHp = this.baseMaxHp;
      this.grid.syncBaseHpDisplay(this.baseHp, this.baseMaxHp);
      this.setBanner(`Base repaired (-${cost})`, 0.6);
    } else {
      cell.hp = cell.maxHp;
      const name = (ROLE_NAMES[cell.role] && ROLE_NAMES[cell.role][cell.rarity]) || cell.role;
      this.setBanner(`${name} repaired (-${cost})`, 0.6);
    }
    if (this.runStats) {
      this.runStats.repairs += 1;
      this.runStats.repairSpend += cost;
    }
    return { ok: true, spent: cost };
  }

  cycleWaveSpeed() {
    const steps = CONFIG.WAVE_SPEED_STEPS || [1, 2, 3];
    const idx = Math.max(0, steps.indexOf(this.waveSpeed));
    this.setWaveSpeed(steps[(idx + 1) % steps.length]);
  }

  setWaveSpeed(speed) {
    const steps = CONFIG.WAVE_SPEED_STEPS || [1, 2, 3];
    const n = steps.includes(speed) ? speed : steps[0];
    this.waveSpeed = n;
    if (this.phase === 'WAVE') this.setBanner(`${n}x`, 0.5);
    window.dispatchEvent(new CustomEvent('ttd-wave-speed-changed', { detail: { waveSpeed: n } }));
  }

  startNewRun(opts = {}) {
    this.reset();
    const presetId = opts.difficulty || 'normal';
    this.difficultyId = presetId;
    this.difficulty = CONFIG.DIFFICULTY_PRESETS[presetId] || CONFIG.DIFFICULTY_PRESETS.normal;
    this.dailySeed = !!opts.dailySeed;
    this.gameModeId = opts.gameMode || 'classic';
    this.gameMode = typeof getGameMode === 'function' ? getGameMode(this.gameModeId) : { shapes: null, shopEnabled: true, randomDeck: false };
    this.rng = createRunRng({ dailySeed: this.dailySeed });
    const rngFn = () => this.rng.next();
    this.runStats = createRunStats();
    const shapePool = this.gameMode.shapes;
    const starterCards = makeStarterDeck(rngFn, shapePool);
    this.deck = new Deck(starterCards, rngFn);
    if (this.difficulty.bottomWallFill) {
      applyBrutalBottomWallFill(this.grid, rngFn);
    }
    const defSpeed = typeof getSetting === 'function'
      ? getSetting('defaultWaveSpeed')
      : (CONFIG.DEFAULT_WAVE_SPEED ?? 1);
    this.waveSpeed = defSpeed;
    this.phase = 'PLACING_BASE';
    this.piecesLeftThisBuild = 1;
    this.spawnNextPiece();
    const modeLabel = this.gameMode.name && this.gameMode.id !== 'classic' ? `${this.gameMode.name} · ` : '';
    this.setBanner(`${modeLabel}Place Your Home Base`, 1.6);
    if (typeof AudioEngine !== 'undefined') AudioEngine.setMusicPhase('build');
  }

  startRoleTutorial(role) {
    const def = typeof getRoleTutorial === 'function' ? getRoleTutorial(role) : null;
    if (!def) return;
    this.reset();
    this.tutorialActive = true;
    this.tutorialRole = role;
    this.tutorialStep = 'intro';
    this.phase = 'TUTORIAL';
    this.wave = 1;
    this.score = 0;
    this.baseHp = 0;
    this.baseMaxHp = 0;
    this.difficultyId = 'casual';
    this.difficulty = CONFIG.DIFFICULTY_PRESETS.casual || CONFIG.DIFFICULTY_PRESETS.normal;
    this.gameModeId = 'tutorial';
    this.gameMode = { id: 'tutorial', name: 'Role Tutorial', shapes: null, shopEnabled: false };
    this.deck = new Deck([], () => 0.5);
    this.activePiece = null;
    this.paused = true;
    this.waveSpeed = CONFIG.DEFAULT_WAVE_SPEED ?? 1;
    this._tutorialPlaceTimer = 0;
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.unlock?.();
      AudioEngine.setMusicPhase('build');
    }
    window.dispatchEvent(new CustomEvent('ttd-tutorial-step', {
      detail: { step: 'intro', role },
    }));
  }

  advanceTutorial() {
    if (!this.tutorialActive || !this.tutorialRole) return;
    const role = this.tutorialRole;
    if (this.tutorialStep === 'intro') {
      this.tutorialStep = 'place';
      this.phase = 'TUTORIAL';
      if (typeof setupTutorialBoard === 'function') setupTutorialBoard(this, role);
      const label = typeof tutorialRoleLabel === 'function' ? tutorialRoleLabel(role) : role;
      this.setBanner(`${label} deployed — wave incoming…`, 2.2);
      this._tutorialPlaceTimer = 2.4;
      this.paused = false;
      window.dispatchEvent(new CustomEvent('ttd-tutorial-step', {
        detail: { step: 'place', role },
      }));
      return;
    }
    if (this.tutorialStep === 'outro') {
      const next = typeof nextTutorialRole === 'function' ? nextTutorialRole(role) : null;
      if (next) {
        this.startRoleTutorial(next);
      } else {
        this.exitTutorial();
      }
      return;
    }
  }

  startTutorialWave() {
    if (!this.tutorialActive || !this.tutorialRole) return;
    this.tutorialStep = 'wave';
    this.phase = 'WAVE';
    this.enemies = [];
    this.clearCombatVisuals();
    this.paused = false;
    this.waveEnding = false;
    this.waveEndTimer = 0;
    this.waveStats = { kills: 0, points: 0, income: 0 };
    this._tutorialWaveElapsed = 0;
    const schedule = typeof composeTutorialWave === 'function'
      ? composeTutorialWave(this.tutorialRole)
      : [];
    this.waveSpawner = { schedule, i: 0, t: 0 };
    const label = typeof tutorialRoleLabel === 'function'
      ? tutorialRoleLabel(this.tutorialRole)
      : this.tutorialRole;
    this.setBanner(`Demo wave — watch ${label}`, 2.0);
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.play('wave');
      AudioEngine.setMusicPhase('wave');
    }
    window.dispatchEvent(new CustomEvent('ttd-tutorial-step', {
      detail: { step: 'wave', role: this.tutorialRole },
    }));
  }

  exitTutorial() {
    this.tutorialActive = false;
    this.tutorialRole = null;
    this.tutorialStep = null;
    this._tutorialPlaceTimer = 0;
    this.reset();
    this.phase = 'IDLE';
    this.paused = false;
    window.dispatchEvent(new CustomEvent('ttd-tutorial-exit'));
  }

  addPoints(amount) {
    if (amount <= 0) return;
    this.score += amount;
    if (this.runStats) this.runStats.totalPointsEarned += amount;
  }

  setBanner(text, life = 1.4) {
    this.banner = { text, t: 0, life };
  }

  togglePause() {
    if (this.phase === 'GAMEOVER' || this.phase === 'WIN' || this.phase === 'IDLE') return;
    if (this.tutorialActive && (this.tutorialStep === 'intro' || this.tutorialStep === 'outro')) return;
    if (this.helpOpen) {
      if (window.TTD?.ui?.closeHelp) window.TTD.ui.closeHelp();
      else this.closeHelp();
      return;
    }
    if (this.settingsModalOpen) {
      if (window.TTD?.ui?.closeSettings) window.TTD.ui.closeSettings();
      return;
    }
    this.paused = !this.paused;
    if (this.paused) {
      this.input?.clearHeld?.();
      this.setBanner('Paused', 99);
    } else {
      this.banner = null;
    }
    window.dispatchEvent(new CustomEvent('ttd-pause-changed', { detail: { paused: this.paused } }));
  }

  openHelp() {
    if (this.phase === 'GAMEOVER' || this.phase === 'WIN' || this.phase === 'IDLE') return;
    if (this.helpOpen) return;
    this._wasPausedBeforeHelp = this.paused;
    this.helpOpen = true;
    this.paused = true;
    this.input?.clearHeld?.();
    this.banner = null;
  }

  closeHelp() {
    if (!this.helpOpen) return;
    this.helpOpen = false;
    this.paused = this._wasPausedBeforeHelp;
    if (!this.paused) this.banner = null;
    window.dispatchEvent(new CustomEvent('ttd-pause-changed', { detail: { paused: this.paused } }));
  }

  openSettingsModal() {
    if (this.phase === 'GAMEOVER' || this.phase === 'WIN' || this.phase === 'IDLE') return;
    this._wasPausedBeforeSettings = this.paused;
    this.settingsModalOpen = true;
    this.paused = true;
    this.input?.clearHeld?.();
    this.banner = null;
    window.dispatchEvent(new CustomEvent('ttd-pause-changed', { detail: { paused: this.paused } }));
  }

  closeSettingsModal() {
    if (!this.settingsModalOpen) return;
    this.settingsModalOpen = false;
    this.paused = this._wasPausedBeforeSettings;
    if (!this.paused) this.banner = null;
    window.dispatchEvent(new CustomEvent('ttd-pause-changed', { detail: { paused: this.paused } }));
  }

  recomputeBasePool() {
    this.baseMaxHp = Math.max(1, this._basePieceHp + this.baseHpBonus + this.baseWallBonus);
    if (this.baseHp > this.baseMaxHp) this.baseHp = this.baseMaxHp;
    if (this.baseMaxHp > 0 && this.baseHp <= 0) this.baseHp = 0;
    this.grid.syncBaseHpDisplay(this.baseHp, this.baseMaxHp);
  }

  initBasePoolFromPlacement(card, cellCount) {
    const perCell = card.stats.hp || 1;
    this._basePieceHp = perCell * cellCount;
    this.baseHp = Math.max(1, this._basePieceHp + this.baseHpBonus + this.baseWallBonus);
    this.baseMaxHp = this.baseHp;
    this.grid.syncBaseHpDisplay(this.baseHp, this.baseMaxHp);
  }

  applyWallBaseHpBonus(amount) {
    if (!amount || amount <= 0) return;
    this.baseWallBonus += amount;
    const prevMax = this.baseMaxHp;
    this.recomputeBasePool();
    if (this.baseMaxHp > prevMax) {
      this.baseHp += this.baseMaxHp - prevMax;
      this.recomputeBasePool();
    }
  }

  damageBase(dmg) {
    if (dmg <= 0 || this.baseMaxHp <= 0) return;
    this.baseHp = Math.max(0, this.baseHp - dmg);
    this.grid.syncBaseHpDisplay(this.baseHp, this.baseMaxHp);
    if (typeof AudioEngine !== 'undefined') AudioEngine.play('damage');
    if (this.tutorialActive) {
      if (this.baseHp <= 0) this.finishTutorialWaveEarly();
      return;
    }
    if (this.baseHp <= 0) {
      this.lose('Your home base was destroyed!');
    }
  }

  finishTutorialWaveEarly() {
    if (!this.tutorialActive || this.phase !== 'WAVE' || this.waveEnding) return;
    if (typeof forceEndTutorialWaveEnemies === 'function') forceEndTutorialWaveEnemies(this);
    this.projectiles = [];
    this.effects = this.effects.filter((fx) => !['muzzle', 'spark', 'splash'].includes(fx.type));
    this.waveEnding = true;
    this.waveEndTimer = CONFIG.WAVE_END_DELAY ?? 1;
    this.setBanner('Home base destroyed — demo complete!', this.waveEndTimer + 0.4);
  }

  baseUpgradeCost() {
    const cfg = CONFIG.BASE_UPGRADE || {};
    const base = cfg.baseCost ?? 180;
    const scale = cfg.costScale ?? 1.4;
    return Math.floor(base * Math.pow(scale, this.baseHpLevel));
  }

  canBuyBaseUpgrade() {
    const cfg = CONFIG.BASE_UPGRADE || {};
    const max = cfg.maxPurchases ?? 15;
    return this.baseMaxHp > 0 && this.baseHpLevel < max;
  }

  setPendingShopBuy(index) {
    this.pendingShopBuyIndex = index;
  }

  clearPendingShopBuy() {
    this.pendingShopBuyIndex = -1;
  }

  hasPendingShopBuy() {
    return this.pendingShopBuyIndex >= 0;
  }

  buyBaseUpgrade() {
    if (this.phase !== 'SHOP') return { ok: false, reason: 'Shop closed' };
    if (this.hasPendingShopBuy()) return { ok: false, reason: 'Finish or cancel card swap first' };
    if (!this.canBuyBaseUpgrade()) return { ok: false, reason: 'Max upgrades reached' };
    const cost = this.baseUpgradeCost();
    if (this.score < cost) return { ok: false, reason: 'Not enough points' };
    const cfg = CONFIG.BASE_UPGRADE || {};
    const hpGain = cfg.hpPerPurchase ?? 30;
    this.score -= cost;
    this.baseHpLevel += 1;
    this.baseHpBonus += hpGain;
    this.baseHp += hpGain;
    this.runStats.baseUpgrades += 1;
    this.recomputeBasePool();
    return { ok: true, spent: cost, hpGain };
  }

  speedTier() {
    const w = Math.max(1, this.wave);
    return Math.min(CONFIG.FALL_SPEEDS.length - 1, Math.floor((w - 1) / CONFIG.WAVES_PER_SPEEDUP));
  }

  fallInterval() {
    const mul = (this.difficulty && this.difficulty.fallSpeedMul) || 1;
    return CONFIG.FALL_SPEEDS[this.speedTier()] / mul;
  }

  /** Line-clear points scale with fall speed tier (faster drops → higher bonuses). */
  lineClearBonus(lineCount) {
    const base = CONFIG.LINE_BONUS[lineCount] || (lineCount * 200);
    const speeds = CONFIG.FALL_SPEEDS || [1];
    const tier = Math.min(speeds.length - 1, Math.max(0, this.speedTier()));
    const mul = speeds[0] / speeds[tier];
    return Math.floor(base * mul);
  }

  piecesPerBuild() {
    return (this.difficulty && this.difficulty.piecesPerWave) || CONFIG.PIECES_PER_WAVE;
  }

  wavesPerShop() {
    return (this.difficulty && this.difficulty.wavesPerShop) || CONFIG.WAVES_PER_SHOP;
  }

  _trackSynergyPeak() {
    if (!this.grid || typeof recalculateGridSynergy !== 'function') return;
    let peak = 0;
    this.grid.forEachCell((cell) => {
      if (cell.synergyRoleLinks > peak) peak = cell.synergyRoleLinks;
    });
    if (peak > this.runStats.maxSynergyLinks) this.runStats.maxSynergyLinks = peak;
  }

  _emitGameEnd(win, reason) {
    const detail = {
      win,
      reason,
      score: this.score,
      wave: this.wave,
      baseHp: this.baseHp,
      baseMaxHp: this.baseMaxHp,
      runStats: { ...this.runStats },
      difficulty: this.difficultyId,
      dailySeed: this.dailySeed,
      gameMode: this.gameModeId,
    };
    if (typeof recordLifetimeRunEnd === 'function') recordLifetimeRunEnd(detail, this.runStats);
    const unlocked = typeof checkRunAchievements === 'function'
      ? checkRunAchievements({ ...detail, ...this.runStats, win })
      : [];
    detail.newAchievements = unlocked;
    window.dispatchEvent(new CustomEvent('ttd-game-end', { detail }));
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.stopMusic();
      AudioEngine.play(win ? 'win' : 'lose');
    }
  }

  spawnNextPiece() {
    const card = this.deck.draw();
    this.activePiece = new Piece(card);
    this.fallTimer = 0;
    this.lockTimer = 0;
    this.holdUsedThisPiece = false;
    if (this.activePiece.collides(this.grid)) {
      this.lose('Top-out: blocks reached the spawn area.');
    }
  }

  // ---------- input handlers ----------
  movePiece(dx, dy) {
    if (this.paused || !this.activePiece) return;
    if (this.activePiece.tryMove(this.grid, dx, dy)) {
      this.lockTimer = 0;
      if (typeof AudioEngine !== 'undefined') AudioEngine.play('move');
    }
  }
  rotatePiece(dir) {
    if (this.paused || !this.activePiece) return;
    if (this.activePiece.tryRotate(this.grid, dir)) {
      this.lockTimer = 0;
      if (typeof AudioEngine !== 'undefined') AudioEngine.play('rotate');
    }
  }
  softDrop(on) {
    if (this.paused) {
      this.softDropping = false;
      return;
    }
    this.softDropping = on;
  }
  hardDrop() {
    if (this.paused || !this.activePiece) return;
    this.activePiece.hardDrop(this.grid);
    if (typeof AudioEngine !== 'undefined') AudioEngine.play('drop');
    this.lockPiece();
  }

  // ---------- main update ----------
  update(dt) {
    if (this.phase !== 'WAVE' && this.projectiles.length > 0) {
      this.projectiles = [];
    }
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.life) this.banner = null;
    }
    if (this.screenShake) {
      this.screenShake.t += dt;
      if (this.screenShake.t >= this.screenShake.life) this.screenShake = null;
    }
    for (const fx of this.effects) fx.t += dt;
    this.effects = this.effects.filter((fx) => fx.t < fx.life);

    if (this.tutorialActive && this.tutorialStep === 'place' && this._tutorialPlaceTimer > 0) {
      this._tutorialPlaceTimer -= dt;
      if (this._tutorialPlaceTimer <= 0) {
        this._tutorialPlaceTimer = 0;
        this.startTutorialWave();
      }
    }

    switch (this.phase) {
      case 'PLACING_BASE': this.updateBuildOrPlacing(dt, true); break;
      case 'BUILD':        this.updateBuildOrPlacing(dt, false); break;
      case 'WAVE':         this.updateWave(dt); break;
      case 'SHOP':         break;
      case 'TUTORIAL':     break;
      default: break;
    }
  }

  updateBuildOrPlacing(dt) {
    if (!this.activePiece) return;
    const interval = this.softDropping ? this.fallInterval() / CONFIG.SOFT_DROP_FACTOR : this.fallInterval();
    this.fallTimer += dt;
    if (this.fallTimer >= interval) {
      this.fallTimer = 0;
      if (!this.activePiece.tryMove(this.grid, 0, 1)) {
        this.lockTimer += interval;
        if (this.lockTimer >= CONFIG.LOCK_DELAY) this.lockPiece();
      } else {
        this.lockTimer = 0;
      }
    }
  }

  lockPiece() {
    const piece = this.activePiece;
    if (!piece) return;
    const placed = piece.cells();
    const isBase = this.phase === 'PLACING_BASE';

    const nullsBeforeRow = new Map();
    for (let y = 0; y < this.grid.h; y++) {
      let gaps = 0;
      for (let x = 0; x < this.grid.w; x++) {
        if (this.grid.cells[y][x] === null) gaps++;
      }
      nullsBeforeRow.set(y, gaps);
    }

    this.grid.registerPlacement(placed, piece.card, isBase);
    if (this.runStats) this.runStats.piecesPlaced += 1;

    if (isBase) {
      this.initBasePoolFromPlacement(piece.card, placed.length);
    } else if (piece.card.stats && piece.card.stats.baseHpBonus) {
      this.applyWallBaseHpBonus(piece.card.stats.baseHpBonus);
    }

    this.activePiece = null;
    if (this.grid.isToppedOut()) {
      this.lose('Top-out: blocks reached the spawn area.');
      return;
    }

    const lineClearOpts = this.difficulty.bottomWallFill
      ? { strictGapFill: true, nullsBeforeRow }
      : null;
    const fullRows = this.grid.findRowsClearedByPlacement(placed, lineClearOpts);
    if (fullRows.length > 0) {
      for (const y of fullRows) {
        this.effects.push({ type: 'lineClear', x: 0, y, t: 0, life: 0.4 });
      }
      this.grid.clearRows(fullRows);
      const bonus = this.lineClearBonus(fullRows.length);
      this.addPoints(bonus);
      const lineLabels = { 1: 'Line clear', 2: 'Double', 3: 'Triple', 4: 'Quad' };
      const label = lineLabels[fullRows.length] || `${fullRows.length} lines`;
      const tier = this.speedTier() + 1;
      const speedNote = tier > 1 ? ` · speed tier ${tier}` : '';
      this.setBanner(`${label}! +${bonus} pts${speedNote}`, 1.1);
      this.runStats.lineClears += 1;
      this.runStats.linesCleared += fullRows.length;
      if (fullRows.length > this.runStats.maxLinesAtOnce) {
        this.runStats.maxLinesAtOnce = fullRows.length;
      }
      if (fullRows.length === 2) this.runStats.doubleClears += 1;
      if (fullRows.length === 3) this.runStats.tripleClears += 1;
      if (fullRows.length >= 4) this.runStats.quadClears += 1;
      if (typeof notifyAchievementUnlock === 'function') {
        if (fullRows.length >= 4) notifyAchievementUnlock(this, 'tetris');
        else if (fullRows.length === 3) notifyAchievementUnlock(this, 'triple_clear');
        else if (fullRows.length === 2) notifyAchievementUnlock(this, 'double_clear');
        if (this.runStats.linesCleared >= 10) notifyAchievementUnlock(this, 'line_10');
      }
      if (typeof AudioEngine !== 'undefined') AudioEngine.play('line');
      const reduceMotion = typeof getSetting === 'function' && getSetting('reduceMotion');
      if (!reduceMotion) this.screenShake = { t: 0, life: 0.25, amp: 4 + fullRows.length };
      if (typeof recalculateGridSynergy === 'function') {
        recalculateGridSynergy(this.grid);
      }
      this._trackSynergyPeak();
    }

    if (typeof AudioEngine !== 'undefined') AudioEngine.play('lock');

    if (isBase) {
      this.phase = 'BUILD';
      this.wave = 1;
      this.piecesLeftThisBuild = this.piecesPerBuild();
      this.setBanner(`Wave ${this.wave} — Build`, 1.4);
      this.spawnNextPiece();
      return;
    }

    this.piecesLeftThisBuild--;
    if (this.piecesLeftThisBuild <= 0) {
      this.startWave();
    } else {
      this.spawnNextPiece();
    }
  }

  // ---------- wave phase ----------
  startWave() {
    this.activePiece = null;
    this.phase = 'WAVE';
    this.enemies = [];
    this.clearCombatVisuals();
    this.waveSpawner = makeWaveSpawner(this.wave, () => this.rng.next());
    const bossInfo = typeof getBossWaveInfo === 'function' ? getBossWaveInfo(this.wave) : null;
    if (bossInfo) {
      this.setBanner(`BOSS — Elite ${bossInfo.label}!`, 2.2);
    } else {
      this.setBanner(`Wave ${this.wave} — Defend!`, 1.6);
    }
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.play('wave');
      AudioEngine.setMusicPhase('wave');
    }
    this.waveStats = { kills: 0, points: 0, income: 0 };
    this.waveEnding = false;
    this.waveEndTimer = 0;
    // Wall passive income at the start of each wave (scaled by per-cell effectiveness).
    let income = 0;
    this.grid.forEachCell((cell) => {
      if (cell.role === 'wall' && cell.stats && cell.stats.passiveIncome) {
        const eff = typeof effectiveness === 'function' ? effectiveness(cell) : 1;
        income += Math.floor(cell.stats.passiveIncome * eff);
      }
    });
    if (income > 0) {
      this.addPoints(income);
      this.waveStats.income = income;
      if (this.runStats) this.runStats.passiveIncomeTotal += income;
    }
    this._trackBaseHpFloor();
  }

  _trackBaseHpFloor() {
    if (!this.runStats || this.baseMaxHp <= 0) return;
    const hp = Math.max(0, this.baseHp);
    if (hp < this.runStats.minBaseHp) this.runStats.minBaseHp = hp;
  }

  updateWave(dt) {
    const scale = CONFIG.WAVE_SPEED_SCALE ?? 1;
    const dtScaled = dt * (this.waveSpeed || 1) * scale;
    if (this.tutorialActive) {
      this._tutorialWaveElapsed = (this._tutorialWaveElapsed || 0) + dt;
      const spCheck = this.waveSpawner;
      const allSpawned = spCheck && spCheck.i >= spCheck.schedule.length;
      if (allSpawned && typeof tutorialWaveTimedOut === 'function' && tutorialWaveTimedOut(this)) {
        if (typeof forceEndTutorialWaveEnemies === 'function') forceEndTutorialWaveEnemies(this);
      }
    }
    const sp = this.waveSpawner;
    if (sp && sp.i < sp.schedule.length) {
      sp.t += dtScaled;
      while (sp.i < sp.schedule.length && sp.t >= sp.schedule[sp.i].at) {
        const item = sp.schedule[sp.i];
        if (this.tutorialActive && typeof makeTutorialEnemy === 'function') {
          this.enemies.push(makeTutorialEnemy(item.type, this.grid, this.wave, item.col));
        } else {
          this.enemies.push(makeEnemy(item.type, this.grid, this.wave, { elite: !!item.elite }));
        }
        sp.i++;
      }
    }

    for (const e of this.enemies) {
      try { e.update(dtScaled, this); }
      catch (err) { console.error('enemy.update threw:', err, e); e.dead = true; }
    }
    for (const e of this.enemies) {
      if (e.atBase && !e.dead) {
        try { e.siegeBase(dtScaled, this); }
        catch (err) { console.error('siegeBase threw:', err, e); }
      }
    }
    this._trackBaseHpFloor();
    const killed = this.enemies.filter((e) => e.dead && !e.despawned);
    for (const e of killed) {
      const scale = CONFIG.KILL_REWARD_WAVE_SCALE ?? 0.015;
      const pts = Math.floor(e.stats.reward * (1 + (this.wave - 1) * scale));
      if (!this.tutorialActive) this.addPoints(pts);
      this.waveStats.kills += 1;
      this.waveStats.points += pts;
      if (this.runStats) {
        this.runStats.totalKills += 1;
        if (e.eliteOf) this.runStats.eliteKills += 1;
        if (e.isElite) this.runStats.bossKills += 1;
        if (!this.tutorialActive && this.runStats.totalKills === 1
            && typeof notifyAchievementUnlock === 'function') {
          notifyAchievementUnlock(this, 'first_blood');
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    try { applyProximityDamage(this, dtScaled); }
    catch (err) { console.error('applyProximityDamage threw:', err); }

    try { updateTowers(this, dtScaled); }
    catch (err) { console.error('updateTowers threw:', err); }

    for (const p of this.projectiles) {
      try { p.update(dtScaled, this); }
      catch (err) { console.error('projectile.update threw:', err, p); p.dead = true; }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    if (this.waveEnding) {
      this.waveEndTimer -= dt;
      if (this.waveEndTimer <= 0) {
        this.waveEnding = false;
        this.endWave();
      }
      return;
    }

    if (sp && sp.i >= sp.schedule.length && this.enemies.length === 0) {
      const delay = CONFIG.WAVE_END_DELAY ?? 1;
      this.waveEnding = true;
      this.waveEndTimer = delay;
      const msg = this.tutorialActive ? 'Demo complete!' : `Wave ${this.wave} cleared!`;
      this.setBanner(msg, delay + 0.4);
    }
  }

  endWave() {
    this.waveEnding = false;
    this.waveEndTimer = 0;
    this.clearCombatVisuals();
    if (this.tutorialActive) {
      this.tutorialStep = 'outro';
      this.phase = 'TUTORIAL';
      this.paused = true;
      this.activePiece = null;
      if (typeof AudioEngine !== 'undefined') AudioEngine.setMusicPhase('build');
      window.dispatchEvent(new CustomEvent('ttd-tutorial-step', {
        detail: { step: 'outro', role: this.tutorialRole },
      }));
      return;
    }
    const stats = this.waveStats || { kills: 0, points: 0, income: 0 };
    if (this.runStats) {
      this.runStats.wavesCleared += 1;
      if (stats.kills > this.runStats.maxKillsOneWave) {
        this.runStats.maxKillsOneWave = stats.kills;
      }
      if (typeof isBossWave === 'function' && isBossWave(this.wave)) {
        this.runStats.bossWavesCleared += 1;
      }
      if (stats.kills >= 30) {
        if (typeof notifyAchievementUnlock === 'function') {
          notifyAchievementUnlock(this, 'wave_massacre');
        }
      }
    }
    const summary = `Wave ${this.wave} cleared — ${stats.kills} kills • +${stats.points + stats.income} pts`;
    if (this.wave >= CONFIG.TOTAL_WAVES) {
      this.phase = 'WIN';
      this.setBanner(`Victory! Final score: ${this.score}`, 99);
      this._emitGameEnd(true);
      return;
    }
    this.setBanner(summary, 2.0);
    if (this.wave % this.wavesPerShop() === 0) {
      if (this.gameMode && this.gameMode.shopEnabled === false) {
        this.reshuffleDeckRandom();
        this.advanceToNextBuild();
        return;
      }
      this.openShop();
      return;
    }
    this.advanceToNextBuild();
  }

  reshuffleDeckRandom() {
    const rngFn = () => this.rng.next();
    const cards = generateRandomDeck(
      this.wave,
      CONFIG.DECK_SIZE,
      rngFn,
      this.gameMode.shapes
    );
    this.deck.replaceAll(cards);
    this.heldCard = null;
    if (this.runStats) this.runStats.deckReshuffles += 1;
    this.setBanner('Deck reshuffled!', 2.5);
    if (typeof AudioEngine !== 'undefined') AudioEngine.play('buy');
  }

  openShop() {
    this.clearCombatVisuals();
    this.phase = 'SHOP';
    this.clearPendingShopBuy();
    const costMul = (this.difficulty && this.difficulty.shopCostMul) || 1;
    this.shopCards = generateShopCards(
      this.wave,
      CONFIG.SHOP_CARD_COUNT,
      () => this.rng.next(),
      costMul,
      this.gameMode.shapes
    ).map((c) => ({ ...c, bought: false }));
    if (typeof AudioEngine !== 'undefined') {
      AudioEngine.play('shop');
      AudioEngine.setMusicPhase('build');
    }
    window.dispatchEvent(new CustomEvent('ttd-shop-open', { detail: { wave: this.wave } }));
  }

  // Buy a shop card and replace one deck card. Returns { ok, reason }.
  buyCard(shopIndex, removeDeckCardId) {
    if (this.phase !== 'SHOP') return { ok: false, reason: 'Shop closed' };
    if (this.pendingShopBuyIndex >= 0 && this.pendingShopBuyIndex !== shopIndex) {
      return { ok: false, reason: 'Another card purchase is pending' };
    }
    const sc = this.shopCards[shopIndex];
    if (!sc) return { ok: false, reason: 'Bad shop index' };
    if (sc.bought) return { ok: false, reason: 'Already bought' };
    if (this.score < sc.cost) return { ok: false, reason: 'Not enough points' };
    if (!this.deck.has(removeDeckCardId)) return { ok: false, reason: 'Deck card not found' };
    const newCard = { id: nextCardId(), shape: sc.shape, role: sc.role, rarity: sc.rarity, name: sc.name, cost: sc.cost, stats: { ...sc.stats } };
    if (!this.deck.replace(removeDeckCardId, newCard)) return { ok: false, reason: 'Replace failed' };
    this.score -= sc.cost;
    sc.bought = true;
    this.runStats.cardsBought += 1;
    this.clearPendingShopBuy();
    if (typeof AudioEngine !== 'undefined') AudioEngine.play('buy');
    return { ok: true };
  }

  advanceToNextBuild() {
    this.clearCombatVisuals();
    this.wave += 1;
    if (this.wave > CONFIG.TOTAL_WAVES) {
      this.phase = 'WIN';
      this.setBanner(`Victory! Final score: ${this.score}`, 99);
      return;
    }
    this.phase = 'BUILD';
    this.piecesLeftThisBuild = this.piecesPerBuild();
    if (typeof AudioEngine !== 'undefined') AudioEngine.setMusicPhase('build');
    if ((this.wave - 1) % CONFIG.WAVES_PER_SPEEDUP === 0 && this.wave > 1) {
      this.setBanner(`Speed Up! Tier ${this.speedTier() + 1}`, 1.4);
    }
    // No generic "Wave N — Build" banner: the end-of-wave summary banner is more
    // useful, and the phase indicator + wave counter already convey the rest.
    this.spawnNextPiece();
  }

  closeShop() {
    if (this.phase !== 'SHOP') return;
    this.clearPendingShopBuy();
    this.advanceToNextBuild();
  }

  lose(reason) {
    this.phase = 'GAMEOVER';
    this.clearCombatVisuals();
    if (this.runStats) this.runStats.lossReason = reason || '';
    this._trackBaseHpFloor();
    this.setBanner('Game Over', 99);
    this._emitGameEnd(false, reason);
  }

  // Strip in-flight projectiles and combat VFX when leaving the wave phase.
  clearCombatVisuals() {
    this.projectiles = [];
    this.enemies = [];
    this.waveSpawner = null;
    this.waveEnding = false;
    this.waveEndTimer = 0;
    const combatFx = new Set(['muzzle', 'spark', 'splash']);
    this.effects = this.effects.filter((fx) => !combatFx.has(fx.type));
  }
}
