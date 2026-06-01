// Standalone high scores page (highscores.html).

(function () {
  const hero = document.getElementById('highscore-hero');
  const none = document.getElementById('highscore-none');
  const heroLabel = document.getElementById('hero-label');
  const heroWave = document.getElementById('hero-wave');
  const heroPoints = document.getElementById('hero-points');
  const heroTotalEarned = document.getElementById('hero-total-earned');
  const heroResult = document.getElementById('hero-result');
  const heroDate = document.getElementById('hero-date');
  const listEl = document.getElementById('highscores-list');
  const emptyList = document.getElementById('highscores-empty-list');
  const clearBtn = document.getElementById('highscores-clear');
  const allRuns = document.getElementById('highscores-all-runs');
  const dailyDisplay = document.getElementById('daily-seed-display');
  const achievementsList = document.getElementById('achievements-list');
  const achievementsCount = document.getElementById('achievements-count');
  const achievementsTotal = document.getElementById('achievements-total');
  const lifetimeStatsEl = document.getElementById('lifetime-stats');
  const filterMode = document.getElementById('filter-mode');
  const filterDifficulty = document.getElementById('filter-difficulty');
  const filterDaily = document.getElementById('filter-daily');
  const sortBy = document.getElementById('sort-by');
  const filterSummary = document.getElementById('highscores-filter-summary');

  if (dailyDisplay && typeof getDailySeedLabel === 'function') {
    dailyDisplay.textContent = getDailySeedLabel();
  }

  function populateModeFilter() {
    if (!filterMode) return;
    filterMode.innerHTML = '<option value="all">All modes</option>';
    if (typeof getGameModeList === 'function') {
      for (const mode of getGameModeList()) {
        const opt = document.createElement('option');
        opt.value = mode.id;
        opt.textContent = mode.name;
        filterMode.appendChild(opt);
      }
    }
  }

  function readControls() {
    return {
      gameMode: filterMode ? filterMode.value : 'all',
      difficulty: filterDifficulty ? filterDifficulty.value : 'all',
      dailySeed: filterDaily ? filterDaily.value : 'all',
      sortBy: sortBy ? sortBy.value : 'wave',
    };
  }

  function applyControlsToDom(prefs) {
    if (filterMode && prefs.gameMode) filterMode.value = prefs.gameMode;
    if (filterDifficulty && prefs.difficulty) filterDifficulty.value = prefs.difficulty;
    if (filterDaily && prefs.dailySeed) filterDaily.value = prefs.dailySeed;
    if (sortBy && prefs.sortBy) sortBy.value = prefs.sortBy;
  }

  function appendAchievementItems(target, items) {
    for (const a of items) {
      const li = document.createElement('li');
      li.className = 'achievement-item' + (a.unlocked ? ' unlocked' : '');
      li.innerHTML = `<strong>${a.title}</strong><span class="muted">${a.desc}</span>`;
      target.appendChild(li);
    }
  }

  function renderAchievements() {
    if (!achievementsList || typeof getAchievementProgress !== 'function') return;
    const progress = getAchievementProgress();
    if (achievementsTotal) achievementsTotal.textContent = String(progress.length);
    if (achievementsCount) {
      achievementsCount.textContent = String(progress.filter((a) => a.unlocked).length);
    }
    achievementsList.innerHTML = '';

    const groups = typeof getAchievementsGrouped === 'function'
      ? getAchievementsGrouped()
      : null;

    if (groups && groups.length > 0) {
      for (const group of groups) {
        const heading = document.createElement('li');
        heading.className = 'achievement-group-heading';
        const unlockedInGroup = group.items.filter((a) => a.unlocked).length;
        heading.textContent = `${group.label} (${unlockedInGroup}/${group.items.length})`;
        achievementsList.appendChild(heading);
        appendAchievementItems(achievementsList, group.items);
      }
      return;
    }

    const heading = document.createElement('li');
    heading.className = 'achievement-group-heading';
    heading.textContent = 'Achievements';
    achievementsList.appendChild(heading);
    appendAchievementItems(achievementsList, progress);
  }

  function renderLifetimeStats() {
    if (!lifetimeStatsEl || typeof loadLifetimeStats !== 'function') return;
    const s = loadLifetimeStats();
    const winRate = s.gamesPlayed > 0 ? Math.round((s.wins / s.gamesPlayed) * 100) : 0;
    lifetimeStatsEl.innerHTML = `
      <div>Games played: ${s.gamesPlayed.toLocaleString()}</div>
      <div>Wins: ${s.wins.toLocaleString()} (${winRate}%)</div>
      <div>Total points earned: ${(s.totalPointsAccumulated || 0).toLocaleString()}</div>
      <div>Total kills: ${(s.totalKills || 0).toLocaleString()}</div>
      <div>Elite kills: ${(s.totalEliteKills || 0).toLocaleString()}</div>
      <div>Line clears: ${(s.totalLineClears || 0).toLocaleString()} (${(s.totalLinesCleared || 0).toLocaleString()} rows)</div>
      <div>Quad clears: ${(s.totalQuadClears || 0).toLocaleString()}</div>
      <div>Waves cleared: ${(s.totalWavesCleared || 0).toLocaleString()}</div>
      <div>Best wave reached: ${s.bestWave}</div>
      <div>Shop swaps: ${(s.totalShopSwaps || 0).toLocaleString()} · Fortifies: ${(s.totalBaseFortifies || 0).toLocaleString()}</div>
      <div>Pieces placed: ${(s.totalPiecesPlaced || 0).toLocaleString()} · Holds: ${(s.totalHolds || 0).toLocaleString()}</div>
    `;
  }

  function describeFilters(prefs) {
    const parts = [];
    if (prefs.gameMode !== 'all' && typeof formatGameModeName === 'function') {
      parts.push(formatGameModeName(prefs.gameMode));
    }
    if (prefs.difficulty !== 'all' && typeof formatDifficultyLabel === 'function') {
      parts.push(formatDifficultyLabel(prefs.difficulty));
    }
    if (prefs.dailySeed === 'daily') parts.push('daily seed');
    else if (prefs.dailySeed === 'standard') parts.push('standard runs');
    return parts.length ? parts.join(' · ') : 'All runs';
  }

  function render() {
    const prefs = readControls();
    if (typeof saveHighScorePrefs === 'function') saveHighScorePrefs(prefs);

    const all = typeof loadHighScores === 'function' ? loadHighScores() : [];
    const list = typeof queryHighScores === 'function' ? queryHighScores(prefs) : all;
    const hasAnyScores = all.length > 0;
    const hasFilteredScores = list.length > 0;

    if (hero) hero.classList.toggle('hidden', !hasFilteredScores);
    if (none) none.classList.toggle('hidden', hasAnyScores);
    if (allRuns) allRuns.classList.remove('hidden');

    const sortLabel = typeof HIGHSCORE_SORTS !== 'undefined'
      ? (HIGHSCORE_SORTS[prefs.sortBy] || 'Wave reached')
      : 'Wave reached';
    if (heroLabel) heroLabel.textContent = `Top run · ${sortLabel}`;
    if (filterSummary) {
      filterSummary.textContent = `${list.length} run${list.length === 1 ? '' : 's'} · ${describeFilters(prefs)} · sorted by ${sortLabel.toLowerCase()}`;
    }

    if (hasFilteredScores) {
      const best = list[0];
      if (heroWave) heroWave.textContent = String(best.wave);
      if (heroPoints) heroPoints.textContent = best.score.toLocaleString();
      if (heroTotalEarned) heroTotalEarned.textContent = (best.totalEarned || 0).toLocaleString();
      if (heroResult && typeof formatRunSummary === 'function') {
        heroResult.textContent = formatRunSummary(best);
      }
      if (heroDate) {
        heroDate.textContent = ` · ${formatHighScoreDate(best.at)}`;
      }
    }

    if (listEl) {
      listEl.innerHTML = '';
      list.forEach((entry, i) => {
        const row = document.createElement('tr');
        const summary = typeof formatRunSummary === 'function' ? formatRunSummary(entry) : (entry.win ? 'Victory' : 'Defeat');
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${entry.wave}</td>
          <td>${entry.score.toLocaleString()}</td>
          <td>${(entry.totalEarned || 0).toLocaleString()}</td>
          <td>${summary}</td>
          <td>${formatHighScoreDate(entry.at)}</td>
        `;
        listEl.appendChild(row);
      });
    }
    if (emptyList) emptyList.classList.toggle('hidden', hasFilteredScores);
    renderAchievements();
    renderLifetimeStats();
  }

  populateModeFilter();
  applyControlsToDom(typeof loadHighScorePrefs === 'function' ? loadHighScorePrefs() : {});

  for (const el of [filterMode, filterDifficulty, filterDaily, sortBy]) {
    if (el) el.addEventListener('change', render);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('Clear all high scores? This cannot be undone.')) return;
      if (typeof clearHighScores === 'function') clearHighScores();
      render();
    });
  }

  render();
})();
