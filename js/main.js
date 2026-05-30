// Bootstrap & RAF loop. Globals expected: CONFIG, Game, Renderer, Input, UI.
(function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  loadSettings();
  if (typeof AudioEngine !== 'undefined') AudioEngine.init();

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

  window.TTD = { game, renderer, ui, input, mobileControls, CONFIG };

  const dailyLabel = document.getElementById('daily-seed-label');
  if (dailyLabel && typeof getDailySeedLabel === 'function') {
    dailyLabel.textContent = getDailySeedLabel();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
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
