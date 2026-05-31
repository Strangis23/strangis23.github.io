// Bootstrap & RAF loop. Globals expected: CONFIG, Game, Renderer, Input, UI.
(function () {
  if (typeof Platform === 'undefined' || Platform.hasServiceWorker) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  loadSettings();
  if (typeof AudioEngine !== 'undefined') AudioEngine.init();
  if (typeof loadBlockSprites === 'function') loadBlockSprites();
  if (typeof loadEnemySprites === 'function') loadEnemySprites();

  const canvas = document.getElementById('game-canvas');
  canvas.width = CONFIG.GRID_W * CONFIG.CELL_PX;
  canvas.height = CONFIG.GRID_H * CONFIG.CELL_PX;
  const ctx = canvas.getContext('2d');

  const game = new Game();
  const renderer = new Renderer(ctx, canvas);
  const ui = new UI(game);
  const input = new Input(game, canvas);
  const canvasWrap = document.getElementById('canvas-wrap');
  const mobileControls = new MobileControls(game, input, canvasWrap);

  const natW = CONFIG.GRID_W * CONFIG.CELL_PX;
  const natH = CONFIG.GRID_H * CONFIG.CELL_PX;
  const gameRoot = document.getElementById('game-root');

  function layoutMetrics() {
    if (typeof Platform !== 'undefined' && Platform.fixedWindow) {
      const pad = Platform.layoutPadding || 18;
      const gap = Platform.layoutGap || 18;
      const panelW = Platform.hudPanelWidth || 250;
      return {
        availW: Platform.windowWidth - pad * 2 - panelW * 2 - gap * 2,
        availH: Platform.windowHeight - pad * 2,
      };
    }
    if (!gameRoot) return { availW: natW, availH: natH };
    const rs = getComputedStyle(gameRoot);
    const padX = parseFloat(rs.paddingLeft) + parseFloat(rs.paddingRight);
    const padY = parseFloat(rs.paddingTop) + parseFloat(rs.paddingBottom);
    const gap = parseFloat(rs.gap) || 18;
    const hudLeft = document.getElementById('hud-left');
    const hudRight = document.getElementById('hud-right');
    const stacked = rs.flexDirection.startsWith('column');
    if (stacked) {
      const leftH = hudLeft ? hudLeft.offsetHeight : 0;
      const rightH = hudRight ? hudRight.offsetHeight : 0;
      const hudH = leftH + rightH + (leftH > 0 && rightH > 0 ? gap : 0);
      return {
        availW: gameRoot.clientWidth - padX,
        availH: gameRoot.clientHeight - padY - hudH - (hudH > 0 ? gap * 2 : 0),
      };
    }
    const leftW = hudLeft ? hudLeft.offsetWidth : 0;
    const rightW = hudRight ? hudRight.offsetWidth : 0;
    const sideW = leftW + rightW;
    return {
      availW: gameRoot.clientWidth - padX - sideW - (sideW > 0 ? gap * 2 : 0),
      availH: gameRoot.clientHeight - padY,
    };
  }

  function fitGameCanvas() {
    if (!canvasWrap || !canvas) return;

    const { availW, availH } = layoutMetrics();
    if (availW < 1 || availH < 1) return;

    const scale = Math.min(availW / natW, availH / natH);
    const displayW = Math.max(1, Math.floor(natW * scale));
    const displayH = Math.max(1, Math.floor(natH * scale));

    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    canvasWrap.style.width = `${displayW}px`;
    canvasWrap.style.height = `${displayH}px`;
    canvasWrap.style.flex = '0 0 auto';

    const hudLeft = document.getElementById('hud-left');
    const hudRight = document.getElementById('hud-right');
    const stacked = gameRoot && getComputedStyle(gameRoot).flexDirection.startsWith('column');
    if (stacked) {
      if (hudLeft) hudLeft.style.height = '';
      if (hudRight) hudRight.style.height = '';
    } else {
      const panelH = `${displayH}px`;
      if (hudLeft) hudLeft.style.height = panelH;
      if (hudRight) hudRight.style.height = panelH;
    }
  }

  if (typeof Platform === 'undefined' || !Platform.fixedWindow) {
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => fitGameCanvas());
      if (canvasWrap) ro.observe(canvasWrap);
      if (gameRoot) ro.observe(gameRoot);
      const hudLeft = document.getElementById('hud-left');
      const hudRight = document.getElementById('hud-right');
      if (hudLeft) ro.observe(hudLeft);
      if (hudRight) ro.observe(hudRight);
    }
    window.addEventListener('resize', fitGameCanvas);
  }
  if (typeof Platform !== 'undefined' && Platform.onWindowDisplayChange) {
    Platform.onWindowDisplayChange(() => requestAnimationFrame(fitGameCanvas));
  }
  requestAnimationFrame(fitGameCanvas);

  window.TTD = { game, renderer, ui, input, mobileControls, CONFIG, fitGameCanvas };
  window.SWD = window.TTD;

  const dailyLabel = document.getElementById('daily-seed-label');
  if (dailyLabel && typeof getDailySeedLabel === 'function') {
    dailyLabel.textContent = getDailySeedLabel();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (typeof Platform !== 'undefined' && Platform.runSteamCallbacks) {
      Platform.runSteamCallbacks();
    }
    try {
      if (!game.paused) game.update(dt);
    } catch (err) {
      console.error('game.update threw:', err);
    }
    try { renderer.draw(game); } catch (err) { console.error('render threw:', err); }
    try { ui.sync(game); } catch (err) { console.error('ui.sync threw:', err); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  ui.showTitleScreen();
})();
