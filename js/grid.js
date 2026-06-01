// Grid of cells. Each cell is null (empty) or { shape, hp, isBase, towerData }.
class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array(w).fill(null));
  }

  inBounds(x, y) {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  isEmpty(x, y) {
    if (!this.inBounds(x, y)) return false;
    return this.cells[y][x] === null;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return undefined;
    return this.cells[y][x];
  }

  set(x, y, cell) {
    if (!this.inBounds(x, y)) return;
    this.cells[y][x] = cell;
  }

  // Returns true if any solid cell sits in the top SPAWN_BUFFER_ROWS (top-out).
  isToppedOut() {
    for (let y = 0; y < CONFIG.SPAWN_BUFFER_ROWS; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.cells[y][x] !== null) return true;
      }
    }
    return false;
  }

  isRowFull(y) {
    for (let x = 0; x < this.w; x++) {
      if (this.cells[y][x] === null) return false;
    }
    return true;
  }

  // Find full rows. Returns array of row indices (top-to-bottom).
  findFullRows() {
    const full = [];
    for (let y = 0; y < this.h; y++) {
      if (this.isRowFull(y)) full.push(y);
    }
    return full;
  }

  rowHasClearableBlock(y) {
    for (let x = 0; x < this.w; x++) {
      const cell = this.cells[y][x];
      if (cell && !cell.isBase) return true;
    }
    return false;
  }

  placedCellsInRow(y, placedCells) {
    return placedCells.filter(({ x, y: py }) => py === y && this.inBounds(x, py));
  }

  // True when the row is completely filled, has blocks to clear, and this piece helped complete it.
  shouldClearRow(y, placedCells, opts = null) {
    if (!this.isRowFull(y) || !this.rowHasClearableBlock(y)) return false;
    const placedHere = this.placedCellsInRow(y, placedCells);
    if (placedHere.length === 0) return false;
    // Brutal pre-fill: only clear if this piece filled every gap that was in the row before lock.
    if (opts && opts.strictGapFill) {
      const nullsBefore = opts.nullsBeforeRow && opts.nullsBeforeRow.get(y);
      if (nullsBefore !== placedHere.length) return false;
    }
    return true;
  }

  // Rows to clear this lock — evaluated one row at a time (no board-wide sweep).
  findRowsClearedByPlacement(placedCells, opts = null) {
    const placedInRow = new Set();
    for (const { x, y } of placedCells) {
      if (this.inBounds(x, y)) placedInRow.add(y);
    }
    const full = [];
    for (const y of placedInRow) {
      if (this.shouldClearRow(y, placedCells, opts)) full.push(y);
    }
    return full.sort((a, b) => a - b);
  }

  // Shift non-empty rows down as whole lines; empty rows are removed from the stack.
  compactRowsDown() {
    const kept = [];
    for (let y = 0; y < this.h; y++) {
      if (this.cells[y].some((c) => c !== null)) kept.push(this.cells[y]);
    }
    const emptyRow = () => Array(this.w).fill(null);
    while (kept.length < this.h) kept.unshift(emptyRow());
    this.cells = kept;
  }

  // Clear each qualifying full row (non-base blocks only), then compact whole rows downward.
  clearRows(rows) {
    if (rows.length === 0) return [];
    const destroyed = [];
    for (const y of rows) {
      if (!this.isRowFull(y) || !this.rowHasClearableBlock(y)) continue;
      for (let x = 0; x < this.w; x++) {
        const cell = this.cells[y][x];
        if (cell === null || cell.isBase) continue;
        destroyed.push({ x, y, cell });
        this.cells[y][x] = null;
      }
    }
    if (destroyed.length > 0) {
      this.compactRowsDown();
      if (typeof recalculateGridSynergy === 'function') {
        recalculateGridSynergy(this);
      }
    }
    return destroyed;
  }

  // For every cell of a piece that just locked, register a Cell object derived
  // from the piece's underlying card. Each cell carries its own shape, role,
  // stats, rarity and a tower runtime block.
  // `placedCells` is array of { x, y } in grid coords. `card` is the deck card.
  // `isBase` only true for the very first lock of a run.
  registerPlacement(placedCells, card, isBase) {
    const baseHp = card.stats.hp || 1;
    for (const { x, y } of placedCells) {
      if (!this.inBounds(x, y)) continue;
      const cell = {
        shape: card.shape,
        role: card.role,
        rarity: card.rarity,
        stats: { ...card.stats },
        cardId: card.id,   // for diagnostics only
        baseMaxHp: baseHp,
        hp: baseHp,
        maxHp: baseHp,
        isBase: !!isBase,
        tower: { cooldown: 0 },
        synergyMult: 1,
      };
      this.cells[y][x] = cell;
    }
    if (typeof recalculateGridSynergy === 'function') {
      recalculateGridSynergy(this);
    }
  }

  // Iterate every solid cell (for tower update / rendering).
  forEachCell(cb) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y][x];
        if (c) cb(c, x, y);
      }
    }
  }

  // Damage a cell; if hp <= 0 remove it (does NOT apply gravity; brute kills are
  // structural holes, intentionally — this rewards stacking and punishes brutes
  // that punch through the lower layers).
  damageCell(x, y, dmg) {
    const c = this.get(x, y);
    if (!c) return false;
    c.hp -= dmg;
    if (c.hp <= 0) {
      this.cells[y][x] = null;
      if (typeof recalculateGridSynergy === 'function') {
        recalculateGridSynergy(this);
      }
      return true;
    }
    return false;
  }

  // True if (x,y) is occupied (used by pathfinding as a wall test).
  isSolid(x, y) {
    if (!this.inBounds(x, y)) return false;
    return this.cells[y][x] !== null;
  }

  // Collect all base cells (for pathfinding goal set).
  baseCells() {
    const out = [];
    this.forEachCell((c, x, y) => { if (c.isBase) out.push({ x, y }); });
    return out;
  }

  countBaseCells() {
    return this.baseCells().length;
  }

  // Mirror aggregate base HP pool onto each base cell for HP bars.
  syncBaseHpDisplay(baseHp, baseMaxHp) {
    const bases = this.baseCells();
    if (bases.length === 0) return;
    const perCellMax = Math.max(1, baseMaxHp / bases.length);
    const ratio = baseMaxHp > 0 ? Math.max(0, Math.min(1, baseHp / baseMaxHp)) : 0;
    for (const { x, y } of bases) {
      const c = this.get(x, y);
      if (c && c.isBase) {
        c.maxHp = perCellMax;
        c.hp = Math.max(0, perCellMax * ratio);
      }
    }
  }
}

// Brutal difficulty: bottom half is common walls with one random gap per row (line-clearable).
function applyBrutalBottomWallFill(grid, rngFn) {
  const rng = typeof rngFn === 'function' ? rngFn : Math.random;
  const wallCard = makeCard('wall', 'common', 'O');
  const startY = Math.floor(grid.h / 2);
  const placed = [];
  for (let y = startY; y < grid.h; y++) {
    const gapX = Math.floor(rng() * grid.w);
    for (let x = 0; x < grid.w; x++) {
      if (x !== gapX) placed.push({ x, y });
    }
  }
  grid.registerPlacement(placed, wallCard, false);
}
