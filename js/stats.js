// Lifetime stats + per-run stat helpers.

const LIFETIME_STATS_KEY = 'ttd-lifetime-stats';

function emptyLifetimeStats() {
  return {
    gamesPlayed: 0,
    wins: 0,
    brutalWins: 0,
    dailyRuns: 0,
    totalKills: 0,
    totalEliteKills: 0,
    totalLineClears: 0,
    totalLinesCleared: 0,
    totalQuadClears: 0,
    totalPointsAccumulated: 0,
    totalPassiveIncome: 0,
    totalShopSwaps: 0,
    totalBaseFortifies: 0,
    totalPiecesPlaced: 0,
    totalHolds: 0,
    totalRepairs: 0,
    totalRepairSpend: 0,
    totalWavesCleared: 0,
    totalBossWavesCleared: 0,
    bestWave: 0,
    rolePlacements: {},
  };
}

function loadLifetimeStats() {
  try {
    const raw = localStorage.getItem(LIFETIME_STATS_KEY);
    if (raw) return { ...emptyLifetimeStats(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return emptyLifetimeStats();
}

function saveLifetimeStats(stats) {
  const json = JSON.stringify(stats);
  if (typeof Platform !== 'undefined' && Platform.persistKey) {
    Platform.persistKey(LIFETIME_STATS_KEY, json);
  } else {
    localStorage.setItem(LIFETIME_STATS_KEY, json);
  }
}

function createRunStats() {
  return {
    totalKills: 0,
    eliteKills: 0,
    bossKills: 0,
    lineClears: 0,
    linesCleared: 0,
    maxLinesAtOnce: 0,
    doubleClears: 0,
    tripleClears: 0,
    quadClears: 0,
    cardsBought: 0,
    baseUpgrades: 0,
    maxSynergyLinks: 0,
    totalPointsEarned: 0,
    passiveIncomeTotal: 0,
    holdsUsed: 0,
    repairs: 0,
    repairSpend: 0,
    piecesPlaced: 0,
    wavesCleared: 0,
    bossWavesCleared: 0,
    maxKillsOneWave: 0,
    minBaseHp: Infinity,
    deckReshuffles: 0,
    lossReason: '',
  };
}

function recordLifetimeRunEnd(detail, runStats) {
  const stats = loadLifetimeStats();
  const rs = runStats || {};
  stats.gamesPlayed += 1;
  if (detail.win) {
    stats.wins += 1;
    if (detail.difficulty === 'brutal') stats.brutalWins += 1;
  }
  if (detail.dailySeed) stats.dailyRuns += 1;
  stats.totalKills += rs.totalKills || 0;
  stats.totalEliteKills += rs.eliteKills || 0;
  stats.totalLineClears += rs.lineClears || 0;
  stats.totalLinesCleared += rs.linesCleared || 0;
  stats.totalQuadClears += rs.quadClears || 0;
  stats.totalPointsAccumulated += rs.totalPointsEarned || 0;
  stats.totalPassiveIncome += rs.passiveIncomeTotal || 0;
  stats.totalShopSwaps += rs.cardsBought || 0;
  stats.totalBaseFortifies += rs.baseUpgrades || 0;
  stats.totalPiecesPlaced += rs.piecesPlaced || 0;
  stats.totalHolds += rs.holdsUsed || 0;
  stats.totalRepairs += rs.repairs || 0;
  stats.totalRepairSpend += rs.repairSpend || 0;
  stats.totalWavesCleared += rs.wavesCleared || 0;
  stats.totalBossWavesCleared += rs.bossWavesCleared || 0;
  stats.bestWave = Math.max(stats.bestWave, detail.wave || 0);
  saveLifetimeStats(stats);
}

function formatRunStatsBlock(runStats, detail) {
  if (!runStats) return '';
  const lines = [
    `Total earned: ${(runStats.totalPointsEarned || 0).toLocaleString()} pts`,
    `Points remaining: ${(detail.score ?? 0).toLocaleString()}`,
    `Kills: ${runStats.totalKills}`,
    `Line clears: ${runStats.lineClears} (${runStats.linesCleared} rows)`,
    `Shop swaps: ${runStats.cardsBought}`,
    `Base fortify: ${runStats.baseUpgrades}`,
    `Best synergy: ${runStats.maxSynergyLinks} links`,
    `Holds used: ${runStats.holdsUsed || 0}`,
    `Repairs: ${runStats.repairs || 0}`,
  ];
  if (detail.difficulty && detail.difficulty !== 'normal') {
    lines.unshift(`Difficulty: ${detail.difficulty}`);
  }
  if (detail.dailySeed) {
    lines.unshift(`Daily seed: ${getDailySeedLabel()}`);
  }
  if (detail.gameMode && detail.gameMode !== 'classic' && typeof formatGameModeName === 'function') {
    lines.unshift(`Mode: ${formatGameModeName(detail.gameMode)}`);
  }
  return lines.join('\n');
}
