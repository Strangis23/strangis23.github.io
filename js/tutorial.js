// Per-role interactive tutorials: intro → place demo piece → demo wave → matchup summary.

const ROLE_TUTORIAL_ORDER = [
  'wall', 'shooter', 'sniper', 'splash', 'slow', 'gunner', 'piercer', 'multishot',
];

const TUTORIAL_BASE_HP = 180;
const TUTORIAL_WAVE_MAX_SEC = 18;
const TUTORIAL_DEMO_GAP_ROWS = 1;

const ENEMY_TYPE_LABELS = {
  walker: 'Walker',
  flyer: 'Flyer',
  brute: 'Brute',
  shielded: 'Shielded',
  rusher: 'Rusher',
  boss: 'Boss',
};

const ROLE_TUTORIALS = {
  wall: {
    title: 'Wall',
    glyph: '▧',
    rarity: 'common',
    shape: 'O',
    shapeRot: 0,
    intro:
      'Walls are your backbone: very high HP, no attack, and passive point income at the start of each wave. They block ground enemies and give brutes a costly path through your stack. This demo uses a real home base with HP — enemies that reach it will siege the base until the wave ends.',
    placementNote: 'A wall block is placed in front of your home base to channel enemies.',
    demoShape: 'O',
    demoRot: 0,
    wave: [
      { type: 'walker', col: 2, at: 0.6 },
      { type: 'walker', col: 6, at: 1.4 },
      { type: 'walker', col: 10, at: 2.2 },
      { type: 'walker', col: 4, at: 3.2 },
      { type: 'walker', col: 8, at: 4.0 },
      { type: 'brute', col: 6, at: 5.5 },
    ],
  },
  shooter: {
    title: 'Shooter',
    glyph: '•',
    rarity: 'common',
    shape: 'I',
    shapeRot: 1,
    intro:
      'Shooters are reliable single-target turrets. They fire at the nearest enemy in range with steady damage — the workhorse of any defense line.',
    placementNote: 'A shooter tower is placed above your base to fire on incoming waves.',
    demoShape: 'I',
    demoRot: 1,
    wave: [
      { type: 'walker', col: 3, at: 0.5 },
      { type: 'walker', col: 7, at: 1.2 },
      { type: 'walker', col: 11, at: 1.9 },
      { type: 'flyer', col: 5, at: 2.8 },
      { type: 'flyer', col: 9, at: 3.5 },
      { type: 'walker', col: 6, at: 4.5 },
    ],
  },
  sniper: {
    title: 'Sniper',
    glyph: '⊙',
    rarity: 'rare',
    shape: 'I',
    shapeRot: 1,
    intro:
      'Snipers hit hard from long range with a slower fire rate. Many shots can pierce one extra target at higher rarities. Ideal for picking off flyers before they slip past your walls.',
    placementNote: 'A sniper tower is placed with a clear firing lane toward the spawn zone.',
    demoShape: 'I',
    demoRot: 1,
    wave: [
      { type: 'flyer', col: 4, at: 0.5 },
      { type: 'flyer', col: 8, at: 1.2 },
      { type: 'flyer', col: 6, at: 2.0 },
      { type: 'walker', col: 5, at: 3.2 },
      { type: 'walker', col: 9, at: 4.0 },
    ],
  },
  splash: {
    title: 'Splash',
    glyph: '✺',
    rarity: 'rare',
    shape: 'O',
    shapeRot: 0,
    intro:
      'Splash towers launch shells that explode in an area. Clumped enemies take heavy damage from one shot — great for dense walker waves and breaking shields.',
    placementNote: 'A splash mortar is placed where enemies will bunch up on the path.',
    demoShape: 'O',
    demoRot: 0,
    wave: [
      { type: 'walker', col: 5, at: 0.4 },
      { type: 'walker', col: 6, at: 0.7 },
      { type: 'walker', col: 7, at: 1.0 },
      { type: 'walker', col: 5, at: 2.5 },
      { type: 'walker', col: 6, at: 2.8 },
      { type: 'shielded', col: 6, at: 4.2 },
    ],
  },
  slow: {
    title: 'Slow',
    glyph: '❄',
    rarity: 'rare',
    shape: 'T',
    shapeRot: 0,
    intro:
      'Slow towers weaken nearby enemies — they do not need line of sight. Rushers and bosses lose their biggest advantage when caught in the aura. Rare frost towers do not kill on their own; watch enemies slow down, then reach your home base (with HP) before the demo ends.',
    placementNote: 'A frost tower is placed where fast enemies must pass.',
    demoShape: 'T',
    demoRot: 0,
    wave: [
      { type: 'rusher', col: 6, at: 0.4 },
      { type: 'rusher', col: 8, at: 0.9 },
      { type: 'rusher', col: 6, at: 1.5 },
      { type: 'walker', col: 3, at: 2.8 },
      { type: 'walker', col: 10, at: 3.3 },
    ],
  },
  gunner: {
    title: 'Gunner',
    glyph: '⁂',
    rarity: 'rare',
    shape: 'I',
    shapeRot: 0,
    intro:
      'Gunners spray bullets in all four directions at a very high fire rate. They excel when enemies approach from multiple lanes — less ideal when only one direction matters.',
    placementNote: 'A gatling tower is placed at a junction so enemies pass on several sides.',
    demoShape: 'I',
    demoRot: 0,
    wave: [
      { type: 'walker', col: 2, at: 0.5 },
      { type: 'walker', col: 11, at: 0.8 },
      { type: 'walker', col: 6, at: 1.5 },
      { type: 'walker', col: 4, at: 2.5 },
      { type: 'walker', col: 9, at: 2.8 },
      { type: 'walker', col: 7, at: 3.8 },
    ],
  },
  piercer: {
    title: 'Piercer',
    glyph: '➤',
    rarity: 'epic',
    shape: 'I',
    shapeRot: 1,
    intro:
      'Piercers fire shots that pass through multiple enemies in a line. Line up a column of targets — especially brutes — to maximize each shot.',
    placementNote: 'A rail gun is placed to shoot down a long lane of enemies.',
    demoShape: 'I',
    demoRot: 1,
    wave: [
      { type: 'brute', col: 6, at: 0.8 },
      { type: 'walker', col: 6, at: 1.6 },
      { type: 'walker', col: 6, at: 2.4 },
      { type: 'brute', col: 6, at: 4.0 },
    ],
  },
  multishot: {
    title: 'Multishot',
    glyph: '✹',
    rarity: 'epic',
    shape: 'T',
    shapeRot: 0,
    intro:
      'Multishot towers fire a spread of projectiles at once. They shred shielded units and bosses when many shots connect, but struggle against single fast targets.',
    placementNote: 'A scattergun is placed to fan shots into a wide approach.',
    demoShape: 'T',
    demoRot: 0,
    wave: [
      { type: 'shielded', col: 4, at: 0.6 },
      { type: 'shielded', col: 9, at: 1.2 },
      { type: 'walker', col: 5, at: 2.2 },
      { type: 'walker', col: 7, at: 2.5 },
      { type: 'walker', col: 6, at: 3.5 },
    ],
  },
};

function getRoleTutorial(role) {
  return ROLE_TUTORIALS[role] || null;
}

function shapeCellsAt(shape, rot, ox, oy) {
  const m = SHAPES[shape][rot];
  const out = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (m[r][c]) out.push({ x: ox + c, y: oy + r });
    }
  }
  return out;
}

function getRoleMatchupSummary(role) {
  const table = CONFIG.ENEMY_MATCHUPS || {};
  const weakMult = CONFIG.MATCHUP_WEAK_MULT ?? 1.5;
  const resistMult = CONFIG.MATCHUP_RESIST_MULT ?? 0.55;
  const strong = [];
  const weak = [];
  for (const [type, entry] of Object.entries(table)) {
    if (entry.weak && entry.weak.includes(role)) strong.push(type);
    if (entry.resist && entry.resist.includes(role)) weak.push(type);
  }
  const label = (t) => ENEMY_TYPE_LABELS[t] || t;
  return {
    strong,
    weak,
    strongText: strong.length
      ? strong.map(label).join(', ')
      : 'No bonus matchups',
    weakText: weak.length
      ? weak.map(label).join(', ')
      : 'No penalty matchups',
    weakMult,
    resistMult,
  };
}

const ROLE_MATCHUP_HINTS = {
  wall: {
    extraStrong: ['Blocks ground paths, high HP, passive income each wave, synergy with adjacent walls'],
    extraWeak: ['No attack — pair with damage dealers'],
  },
  shooter: {
    extraStrong: ['Reliable single-target DPS in range'],
    extraWeak: ['Poor vs flyers, shielded units, and heavy tanks'],
  },
  sniper: {
    extraStrong: ['Long range; prefers highest-HP target in range'],
    extraWeak: ['Slow fire — inefficient vs cheap swarms unless they are your bonus matchup'],
  },
  splash: {
    extraStrong: ['AoE shells — best when enemies clump or stack on the path'],
    extraWeak: ['Single fast targets and bosses absorb AoE poorly'],
  },
  slow: {
    extraStrong: ['Aura slow needs no line of sight — strongest vs rushers and bosses'],
    extraWeak: ['Rare/epic tiers do not deal damage; legendary only applies matchup bonuses'],
  },
  gunner: {
    extraStrong: ['Very high fire rate — shreds swarms and shielded layers'],
    extraWeak: ['Low per-shot damage — struggles vs brutes and bosses'],
  },
  piercer: {
    extraStrong: ['Shots pierce — line up flyers and brutes in a column'],
    extraWeak: ['Wasted pierce on lone targets; weak vs fast rushers'],
  },
  multishot: {
    extraStrong: ['Spread hits many targets — great vs shielded and bosses'],
    extraWeak: ['Spread damage diluted vs single flyers or rushers'],
  },
};

function formatTutorialOutroHtml(role) {
  const def = ROLE_TUTORIALS[role];
  const m = getRoleMatchupSummary(role);
  const hints = ROLE_MATCHUP_HINTS[role] || {};
  const weakPct = Math.round((m.weakMult - 1) * 100);
  const resistPct = Math.round((1 - m.resistMult) * 100);
  let html = '<p><strong>Strengths</strong></p><ul>';
  if (role === 'wall') {
    for (const line of hints.extraStrong || []) html += `<li>${line}</li>`;
  } else {
    html += `<li>Deals <strong>+${weakPct}%</strong> damage to: ${m.strongText}</li>`;
    for (const line of hints.extraStrong || []) html += `<li>${line}</li>`;
  }
  html += '</ul><p><strong>Weaknesses</strong></p><ul>';
  if (role === 'wall') {
    for (const line of hints.extraWeak || []) html += `<li>${line}</li>`;
  } else {
    html += `<li>Deals <strong>−${resistPct}%</strong> damage to: ${m.weakText}</li>`;
    for (const line of hints.extraWeak || []) html += `<li>${line}</li>`;
  }
  html += '</ul>';
  return html;
}

// Place a shape so its lowest cell sits on bottomRow and it is centered on the grid.
function computeShapePlacement(shape, rot, bottomRow) {
  const local = shapeCellsAt(shape, rot, 0, 0);
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of local) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const ox = Math.floor((CONFIG.GRID_W - (maxX - minX + 1)) / 2) - minX;
  const oy = bottomRow - maxY;
  const cells = shapeCellsAt(shape, rot, ox, oy);
  let minY = Infinity;
  let maxYOut = -Infinity;
  for (const { y } of cells) {
    minY = Math.min(minY, y);
    maxYOut = Math.max(maxYOut, y);
  }
  return { ox, oy, cells, minY, maxY: maxYOut };
}

function setupTutorialBoard(game, role) {
  const def = getRoleTutorial(role);
  if (!def) return;
  game.grid = new Grid(CONFIG.GRID_W, CONFIG.GRID_H);
  const bottomRow = CONFIG.GRID_H - 1;
  const basePl = computeShapePlacement('O', 0, bottomRow);
  const baseCard = makeCard('wall', 'common', 'O');
  game.grid.registerPlacement(basePl.cells, baseCard, true);
  game.initBasePoolFromPlacement(baseCard, basePl.cells.length);
  game.baseMaxHp = Math.max(game.baseMaxHp, TUTORIAL_BASE_HP);
  game.baseHp = game.baseMaxHp;
  game.baseHpBonus = 0;
  game.baseWallBonus = 0;
  game.recomputeBasePool();

  const demoBottom = basePl.minY - 1 - TUTORIAL_DEMO_GAP_ROWS;
  const demoPl = computeShapePlacement(def.demoShape, def.demoRot, demoBottom);
  const demoCard = makeCard(role, def.rarity, def.demoShape);
  game.grid.registerPlacement(demoPl.cells, demoCard, false);
}

function tutorialWaveTimedOut(game) {
  return (game._tutorialWaveElapsed || 0) >= TUTORIAL_WAVE_MAX_SEC;
}

function forceEndTutorialWaveEnemies(game) {
  for (const e of game.enemies) {
    if (!e.dead) {
      e.dead = true;
      e.despawned = true;
    }
  }
  game.enemies = [];
}

function composeTutorialWave(role) {
  const def = ROLE_TUTORIALS[role];
  if (!def || !def.wave) return [];
  return def.wave.map((e) => ({ type: e.type, at: e.at, col: e.col, elite: !!e.elite }));
}

function makeTutorialEnemy(type, grid, wave, col) {
  return makeEnemy(type, grid, wave, { spawnCol: col });
}

function tutorialRoleLabel(role) {
  const def = ROLE_TUTORIALS[role];
  if (!def) return role;
  return `${def.glyph} ${def.title}`;
}

function nextTutorialRole(role) {
  const i = ROLE_TUTORIAL_ORDER.indexOf(role);
  if (i < 0 || i >= ROLE_TUTORIAL_ORDER.length - 1) return null;
  return ROLE_TUTORIAL_ORDER[i + 1];
}
