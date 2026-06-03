'use strict';

// Fixed client size for Windows/Linux desktop builds (matches Steam Deck landscape).
const WIDTH = 1280;
const HEIGHT = 800;

function isPackagedApp() {
  try {
    return require('electron').app.isPackaged;
  } catch {
    return false;
  }
}

const packaged = isPackagedApp();

// Dev (unpackaged): resizable unless SWD_FIXED_WINDOW=1.
// Packaged (Steam/shipping): fixed 1280×800 unless SWD_ALLOW_RESIZE=1.
const RESIZABLE = packaged
  ? process.env.SWD_ALLOW_RESIZE === '1'
  : process.env.SWD_FIXED_WINDOW !== '1';

module.exports = {
  WIDTH,
  HEIGHT,
  MIN_WIDTH: WIDTH,
  MIN_HEIGHT: HEIGHT,
  HUD_PANEL_WIDTH: 250,
  LAYOUT_PADDING: 18,
  LAYOUT_GAP: 18,
  RESIZABLE,
  /** True when layout should use fixed-window CSS vars (Steam Deck shipping). */
  FIXED_LAYOUT: !RESIZABLE,
};
