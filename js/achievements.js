// localStorage achievements — cosmetic/meta only, no gameplay boosts.

const ACHIEVEMENTS_STORAGE_KEY = 'ttd-achievements';

const ACHIEVEMENT_CATEGORIES = {
  campaign: 'Campaign',
  combat: 'Combat',
  stacking: 'Stacking',
  economy: 'Economy & deck',
  mastery: 'Mastery',
  modes: 'Mode victories',
  lifetime: 'Lifetime',
  career: 'Career (long-term)',
  moments: 'Moments',
};

const ACHIEVEMENT_DEFS = [
  // —— Campaign ——
  { id: 'first_win', category: 'campaign', title: 'Centurion', desc: 'Clear all 100 waves.' },
  { id: 'wave_10', category: 'campaign', title: 'Getting Started', desc: 'Reach wave 10 in a run.' },
  { id: 'wave_25', category: 'campaign', title: 'Quarter Stack', desc: 'Reach wave 25 in a run.' },
  { id: 'wave_50', category: 'campaign', title: 'Halfway There', desc: 'Reach wave 50 in a run.' },
  { id: 'wave_75', category: 'campaign', title: 'Deep Run', desc: 'Reach wave 75 in a run.' },
  { id: 'wave_90', category: 'campaign', title: 'Final Approach', desc: 'Reach wave 90 in a run.' },
  { id: 'win_casual', category: 'campaign', title: 'Casual Victor', desc: 'Win on Casual difficulty.' },
  { id: 'brutal_win', category: 'campaign', title: 'Iron Stack', desc: 'Win on Brutal difficulty.' },
  { id: 'close_call', category: 'campaign', title: 'Barely Standing', desc: 'Win with base HP under 25%.' },
  { id: 'fortified_victory', category: 'campaign', title: 'Bunker Supreme', desc: 'Win with base HP at 100%.' },
  { id: 'glass_cannon', category: 'campaign', title: 'Glass Cannon', desc: 'Win on Brutal without fortifying the base.' },
  { id: 'boss_wave_clear', category: 'campaign', title: 'Elite Slayer', desc: 'Clear a boss wave (every 10 waves).' },

  // —— Combat ——
  { id: 'first_blood', category: 'combat', title: 'First Blood', desc: 'Destroy your first enemy in a run.' },
  { id: 'kills_100', category: 'combat', title: 'Pest Control', desc: 'Score 100+ kills in one run.' },
  { id: 'kills_500', category: 'combat', title: 'Exterminator', desc: 'Score 500+ kills in one run.' },
  { id: 'kills_1500', category: 'combat', title: 'Annihilator', desc: 'Score 1,500+ kills in one run.' },
  { id: 'kills_2500', category: 'combat', title: 'Extinction Event', desc: 'Score 2,500+ kills in one run.' },
  { id: 'elite_hunter', category: 'combat', title: 'Elite Hunter', desc: 'Kill 15 elite enemies in one run.' },
  { id: 'boss_slayer', category: 'combat', title: 'Boss Slayer', desc: 'Clear 5 boss waves in one run.' },
  { id: 'wave_massacre', category: 'combat', title: 'Wave Massacre', desc: 'Get 30+ kills in a single wave.' },

  // —— Stacking ——
  { id: 'double_clear', category: 'stacking', title: 'Double Stack', desc: 'Clear 2 lines at once.' },
  { id: 'triple_clear', category: 'stacking', title: 'Triple Stack', desc: 'Clear 3 lines at once.' },
  { id: 'tetris', category: 'stacking', title: 'Quad Clear!', desc: 'Clear 4 lines at once.' },
  { id: 'line_10', category: 'stacking', title: 'Row Worker', desc: 'Clear 10+ lines total in one run.' },
  { id: 'line_50', category: 'stacking', title: 'Demolition Crew', desc: 'Clear 50+ lines total in one run.' },
  { id: 'clear_five', category: 'stacking', title: 'Chain Reaction', desc: 'Trigger 5 separate line clears in one run.' },
  { id: 'quad_twice', category: 'stacking', title: 'Back-to-Back', desc: 'Clear 4 lines at once twice in one run.' },

  // —— Economy ——
  { id: 'shop_swap', category: 'economy', title: 'Deck Doctor', desc: 'Complete a shop card swap.' },
  { id: 'shopaholic', category: 'economy', title: 'Shopaholic', desc: 'Complete 5 shop swaps in one run.' },
  { id: 'fortify_1', category: 'economy', title: 'Reinforced', desc: 'Fortify base once in a run.' },
  { id: 'fortify_3', category: 'economy', title: 'Bunker Mindset', desc: 'Fortify base 3 times in one run.' },
  { id: 'fortify_5', category: 'economy', title: 'Citadel Builder', desc: 'Fortify base 5 times in one run.' },
  { id: 'big_spender', category: 'economy', title: 'War Chest', desc: 'Earn 10,000+ points in one run.' },
  { id: 'wall_tycoon', category: 'economy', title: 'Wall Street', desc: 'Earn 800+ passive wall income in one run.' },
  { id: 'deck_shuffle', category: 'economy', title: 'Chaos Shuffle', desc: 'Trigger a random-mode deck reshuffle.' },

  // —— Mastery ——
  { id: 'hold_once', category: 'mastery', title: 'Hold the Line', desc: 'Use hold for the first time in a run.' },
  { id: 'hold_10', category: 'mastery', title: 'Swap Meet', desc: 'Use hold 10 times in one run.' },
  { id: 'repair_5', category: 'mastery', title: 'Field Medic', desc: 'Repair blocks 5 times in one run.' },
  { id: 'repair_spend', category: 'mastery', title: 'Repair Bill', desc: 'Spend 500+ points on repairs in one run.' },
  { id: 'synergy_3', category: 'mastery', title: 'Synergy Spark', desc: 'Reach 3+ synergy links on one cell.' },
  { id: 'synergy_max', category: 'mastery', title: 'Full Grid', desc: 'Reach 4 synergy links on one cell.' },
  { id: 'pieces_40', category: 'mastery', title: 'Architect', desc: 'Place 40 pieces in one run.' },
  { id: 'daily_run', category: 'mastery', title: 'Daily Defender', desc: 'Finish a daily seeded run (win or lose).' },

  // —— Mode victories ——
  { id: 'win_classic', category: 'modes', title: 'Classic Victor', desc: 'Win on Classic mode.' },
  { id: 'win_straights', category: 'modes', title: 'Line Rider', desc: 'Win Straights Only mode.' },
  { id: 'win_bendy', category: 'modes', title: 'Snake Charmer', desc: 'Win Bendy Only mode.' },
  { id: 'win_lebron', category: 'modes', title: 'Lebron James', desc: 'Win Lebron James mode.' },
  { id: 'win_big_o', category: 'modes', title: 'Big O Energy', desc: 'Win Big O mode.' },
  { id: 'win_t_piece', category: 'modes', title: 'T Marks the Spot', desc: 'Win T-piece mode.' },
  { id: 'win_random', category: 'modes', title: 'Chaos Theory', desc: 'Win Random mode.' },

  // —— Lifetime (early career) ——
  { id: 'games_10', category: 'lifetime', title: 'Regular', desc: 'Play 10 runs.' },
  { id: 'games_50', category: 'lifetime', title: 'Veteran', desc: 'Play 50 runs.' },
  { id: 'lifetime_wins_5', category: 'lifetime', title: 'Seasoned Commander', desc: 'Win 5 runs total.' },
  { id: 'lifetime_wins_15', category: 'lifetime', title: 'Battle Hardened', desc: 'Win 15 runs total.' },
  { id: 'lifetime_kills_2500', category: 'lifetime', title: 'Career Hunter', desc: 'Earn 2,500 total kills across all runs.' },
  { id: 'lifetime_kills_10000', category: 'lifetime', title: 'Crowd Control', desc: 'Earn 10,000 total kills across all runs.' },
  { id: 'lifetime_lines_100', category: 'lifetime', title: 'Career Demolisher', desc: 'Trigger 100 line clears across all runs.' },
  { id: 'lifetime_lines_500', category: 'lifetime', title: 'Wrecking Crew', desc: 'Trigger 500 line clears across all runs.' },
  { id: 'lifetime_points_100k', category: 'lifetime', title: 'Treasury', desc: 'Earn 100,000 total points across all runs.' },
  { id: 'lifetime_points_500k', category: 'lifetime', title: 'War Economy', desc: 'Earn 500,000 total points across all runs.' },
  { id: 'best_wave_75', category: 'lifetime', title: 'Deep Space', desc: 'Reach wave 75 in any run.' },

  // —— Career (long-term grind) ——
  { id: 'games_100', category: 'career', title: 'Centurion Pilot', desc: 'Play 100 runs.' },
  { id: 'games_250', category: 'career', title: 'Eternal Defender', desc: 'Play 250 runs.' },
  { id: 'career_wins_25', category: 'career', title: 'Admiral', desc: 'Win 25 runs total.' },
  { id: 'career_wins_100', category: 'career', title: 'Fleet Commander', desc: 'Win 100 runs total.' },
  { id: 'career_brutal_10', category: 'career', title: 'Pain Artist', desc: 'Win 10 runs on Brutal difficulty.' },
  { id: 'daily_runs_30', category: 'career', title: 'Calendar Warrior', desc: 'Finish 30 daily seed runs.' },
  { id: 'career_kills_50k', category: 'career', title: 'Galaxy Pest Control', desc: 'Earn 50,000 total kills across all runs.' },
  { id: 'career_kills_100k', category: 'career', title: 'Extinction Protocol', desc: 'Earn 100,000 total kills across all runs.' },
  { id: 'career_elite_2500', category: 'career', title: 'Elite Eradicator', desc: 'Kill 2,500 elite enemies across all runs.' },
  { id: 'career_points_1m', category: 'career', title: 'Millionaire', desc: 'Earn 1,000,000 total points across all runs.' },
  { id: 'career_points_5m', category: 'career', title: 'Galactic Tycoon', desc: 'Earn 5,000,000 total points across all runs.' },
  { id: 'career_lines_2500', category: 'career', title: 'Continental Clear', desc: 'Trigger 2,500 line clears across all runs.' },
  { id: 'career_lines_10000', category: 'career', title: 'Tectonic Shift', desc: 'Trigger 10,000 line clears across all runs.' },
  { id: 'career_quads_250', category: 'career', title: 'Quad Master', desc: 'Clear 4 lines at once 250 times across all runs.' },
  { id: 'career_shops_200', category: 'career', title: 'Card Shark', desc: 'Complete 200 shop swaps across all runs.' },
  { id: 'career_fortify_100', category: 'career', title: 'Fortress Architect', desc: 'Fortify your base 100 times across all runs.' },
  { id: 'career_income_250k', category: 'career', title: 'Rent Collector', desc: 'Earn 250,000 passive wall income across all runs.' },
  { id: 'career_pieces_5000', category: 'career', title: 'Master Builder', desc: 'Place 5,000 pieces across all runs.' },
  { id: 'career_holds_2000', category: 'career', title: 'Swap Veteran', desc: 'Use hold 2,000 times across all runs.' },
  { id: 'career_repairs_1000', category: 'career', title: 'Combat Medic', desc: 'Repair blocks 1,000 times across all runs.' },
  { id: 'career_waves_5000', category: 'career', title: 'Wave Rider', desc: 'Clear 5,000 waves across all runs.' },
  { id: 'career_boss_waves_500', category: 'career', title: 'Boss Veteran', desc: 'Clear 500 boss waves across all runs.' },
  { id: 'best_wave_100', category: 'career', title: 'Wave Centurion', desc: 'Reach wave 100 in any run (win or lose).' },

  // —— Moments ——
  { id: 'top_out', category: 'moments', title: 'Stack Overflow', desc: 'Lose to a top-out.' },
  { id: 'base_destroyed', category: 'moments', title: 'Core Breach', desc: 'Lose because your home base was destroyed.' },
];

const MODE_WIN_ACHIEVEMENT_IDS = [
  'win_classic',
  'win_straights',
  'win_bendy',
  'win_lebron',
  'win_big_o',
  'win_t_piece',
  'win_random',
];

const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENT_DEFS.map((a) => [a.id, a]));

function loadAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveAchievements(map) {
  const json = JSON.stringify(map);
  if (typeof Platform !== 'undefined' && Platform.persistKey) {
    Platform.persistKey(ACHIEVEMENTS_STORAGE_KEY, json);
  } else {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, json);
  }
}

function unlockAchievement(id) {
  const map = loadAchievements();
  if (map[id]) return null;
  const def = ACHIEVEMENT_BY_ID[id];
  if (!def) return null;
  map[id] = { at: new Date().toISOString() };
  saveAchievements(map);
  if (typeof Platform !== 'undefined' && Platform.unlockAchievement) {
    Platform.unlockAchievement(id);
  }
  return def;
}

function notifyAchievementUnlock(game, id) {
  const def = unlockAchievement(id);
  if (def && game && typeof game.setBanner === 'function') {
    game.setBanner(`Achievement: ${def.title}`, 1.6);
  }
  return def;
}

function lt(c, key, n) {
  return c.lifetime && (c.lifetime[key] || 0) >= n;
}

function buildAchievementContext(ctx) {
  const baseMaxHp = ctx.baseMaxHp ?? 0;
  const baseHp = ctx.baseHp ?? ctx.minBaseHp ?? 0;
  const minBase = ctx.minBaseHp === Infinity ? baseHp : (ctx.minBaseHp ?? baseHp);
  const loss = ctx.lossReason || '';
  const lifetime = typeof loadLifetimeStats === 'function' ? loadLifetimeStats() : null;
  return {
    ...ctx,
    baseHp,
    baseMaxHp,
    minBaseHp: minBase,
    baseHpRatio: baseMaxHp > 0 ? baseHp / baseMaxHp : 1,
    minBaseHpRatio: baseMaxHp > 0 ? minBase / baseMaxHp : 1,
    isTopOutLoss: loss.includes('Top-out'),
    isBaseLoss: loss.includes('destroyed'),
    lifetime,
  };
}

function evaluateAchievement(id, c) {
  switch (id) {
    case 'first_win': return c.win;
    case 'wave_10': return c.wave >= 10;
    case 'wave_25': return c.wave >= 25;
    case 'wave_50': return c.wave >= 50;
    case 'wave_75': return c.wave >= 75;
    case 'wave_90': return c.wave >= 90;
    case 'win_casual': return c.win && c.difficulty === 'casual';
    case 'brutal_win': return c.win && c.difficulty === 'brutal';
    case 'close_call': return c.win && c.baseMaxHp > 0 && c.baseHpRatio < 0.25;
    case 'fortified_victory': return c.win && c.baseMaxHp > 0 && c.minBaseHpRatio >= 1;
    case 'glass_cannon': return c.win && c.difficulty === 'brutal' && (c.baseUpgrades || 0) === 0;
    case 'boss_wave_clear': return (c.bossWavesCleared || 0) >= 1;

    case 'first_blood': return (c.totalKills || 0) >= 1;
    case 'kills_100': return (c.totalKills || 0) >= 100;
    case 'kills_500': return (c.totalKills || 0) >= 500;
    case 'kills_1500': return (c.totalKills || 0) >= 1500;
    case 'kills_2500': return (c.totalKills || 0) >= 2500;
    case 'elite_hunter': return (c.eliteKills || 0) >= 15;
    case 'boss_slayer': return (c.bossWavesCleared || 0) >= 5;
    case 'wave_massacre': return (c.maxKillsOneWave || 0) >= 30;

    case 'double_clear': return (c.doubleClears || 0) >= 1 || (c.maxLinesAtOnce || 0) >= 2;
    case 'triple_clear': return (c.tripleClears || 0) >= 1 || (c.maxLinesAtOnce || 0) >= 3;
    case 'tetris': return (c.quadClears || 0) >= 1 || (c.maxLinesAtOnce || 0) >= 4;
    case 'line_10': return (c.linesCleared || 0) >= 10;
    case 'line_50': return (c.linesCleared || 0) >= 50;
    case 'clear_five': return (c.lineClears || 0) >= 5;
    case 'quad_twice': return (c.quadClears || 0) >= 2;

    case 'shop_swap': return (c.cardsBought || 0) >= 1;
    case 'shopaholic': return (c.cardsBought || 0) >= 5;
    case 'fortify_1': return (c.baseUpgrades || 0) >= 1;
    case 'fortify_3': return (c.baseUpgrades || 0) >= 3;
    case 'fortify_5': return (c.baseUpgrades || 0) >= 5;
    case 'big_spender': return (c.totalPointsEarned || 0) >= 10000;
    case 'wall_tycoon': return (c.passiveIncomeTotal || 0) >= 800;
    case 'deck_shuffle': return (c.deckReshuffles || 0) >= 1;

    case 'hold_once': return (c.holdsUsed || 0) >= 1;
    case 'hold_10': return (c.holdsUsed || 0) >= 10;
    case 'repair_5': return (c.repairs || 0) >= 5;
    case 'repair_spend': return (c.repairSpend || 0) >= 500;
    case 'synergy_3': return (c.maxSynergyLinks || 0) >= 3;
    case 'synergy_max': return (c.maxSynergyLinks || 0) >= 4;
    case 'pieces_40': return (c.piecesPlaced || 0) >= 40;
    case 'daily_run': return !!c.dailySeed;

    case 'win_classic': return c.win && c.gameMode === 'classic';
    case 'win_straights': return c.win && c.gameMode === 'straights';
    case 'win_bendy': return c.win && c.gameMode === 'bendy';
    case 'win_lebron': return c.win && c.gameMode === 'lebron';
    case 'win_big_o': return c.win && c.gameMode === 'big_o';
    case 'win_t_piece': return c.win && c.gameMode === 't_piece';
    case 'win_random': return c.win && c.gameMode === 'random';

    case 'games_10': return lt(c, 'gamesPlayed', 10);
    case 'games_50': return lt(c, 'gamesPlayed', 50);
    case 'lifetime_wins_5': return lt(c, 'wins', 5);
    case 'lifetime_wins_15': return lt(c, 'wins', 15);
    case 'lifetime_kills_2500': return lt(c, 'totalKills', 2500);
    case 'lifetime_kills_10000': return lt(c, 'totalKills', 10000);
    case 'lifetime_lines_100': return lt(c, 'totalLineClears', 100);
    case 'lifetime_lines_500': return lt(c, 'totalLineClears', 500);
    case 'lifetime_points_100k': return lt(c, 'totalPointsAccumulated', 100000);
    case 'lifetime_points_500k': return lt(c, 'totalPointsAccumulated', 500000);
    case 'best_wave_75': return lt(c, 'bestWave', 75);

    case 'games_100': return lt(c, 'gamesPlayed', 100);
    case 'games_250': return lt(c, 'gamesPlayed', 250);
    case 'career_wins_25': return lt(c, 'wins', 25);
    case 'career_wins_100': return lt(c, 'wins', 100);
    case 'career_brutal_10': return lt(c, 'brutalWins', 10);
    case 'daily_runs_30': return lt(c, 'dailyRuns', 30);
    case 'career_kills_50k': return lt(c, 'totalKills', 50000);
    case 'career_kills_100k': return lt(c, 'totalKills', 100000);
    case 'career_elite_2500': return lt(c, 'totalEliteKills', 2500);
    case 'career_points_1m': return lt(c, 'totalPointsAccumulated', 1000000);
    case 'career_points_5m': return lt(c, 'totalPointsAccumulated', 5000000);
    case 'career_lines_2500': return lt(c, 'totalLineClears', 2500);
    case 'career_lines_10000': return lt(c, 'totalLineClears', 10000);
    case 'career_quads_250': return lt(c, 'totalQuadClears', 250);
    case 'career_shops_200': return lt(c, 'totalShopSwaps', 200);
    case 'career_fortify_100': return lt(c, 'totalBaseFortifies', 100);
    case 'career_income_250k': return lt(c, 'totalPassiveIncome', 250000);
    case 'career_pieces_5000': return lt(c, 'totalPiecesPlaced', 5000);
    case 'career_holds_2000': return lt(c, 'totalHolds', 2000);
    case 'career_repairs_1000': return lt(c, 'totalRepairs', 1000);
    case 'career_waves_5000': return lt(c, 'totalWavesCleared', 5000);
    case 'career_boss_waves_500': return lt(c, 'totalBossWavesCleared', 500);
    case 'best_wave_100': return lt(c, 'bestWave', 100);

    case 'top_out': return c.isTopOutLoss;
    case 'base_destroyed': return c.isBaseLoss;
    default: return false;
  }
}

function checkRunAchievements(ctx) {
  const unlocked = [];
  const c = buildAchievementContext(ctx);

  for (const def of ACHIEVEMENT_DEFS) {
    if (evaluateAchievement(def.id, c)) {
      const u = unlockAchievement(def.id);
      if (u) unlocked.push(u);
    }
  }
  return unlocked;
}

function getAchievementProgress() {
  const map = loadAchievements();
  return ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    categoryLabel: ACHIEVEMENT_CATEGORIES[def.category] || def.category,
    unlocked: !!map[def.id],
    at: map[def.id]?.at || null,
  }));
}

function getAchievementsGrouped() {
  const progress = getAchievementProgress();
  const groups = [];
  const order = ['campaign', 'combat', 'stacking', 'economy', 'mastery', 'modes', 'lifetime', 'career', 'moments'];
  for (const key of order) {
    const items = progress.filter((a) => a.category === key);
    if (items.length === 0) continue;
    groups.push({
      id: key,
      label: ACHIEVEMENT_CATEGORIES[key] || key,
      items,
    });
  }
  return groups;
}

function getModeWinAchievementProgress() {
  const map = loadAchievements();
  return MODE_WIN_ACHIEVEMENT_IDS.map((id) => {
    const def = ACHIEVEMENT_BY_ID[id];
    if (!def) return null;
    return {
      ...def,
      unlocked: !!map[id],
      at: map[id]?.at || null,
    };
  }).filter(Boolean);
}

function countUnlockedAchievements() {
  return getAchievementProgress().filter((a) => a.unlocked).length;
}
