#!/usr/bin/env bash
# Assemble GitHub Pages layout: landing at /, game at /tetrisGame/, downloads at /downloads/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/_site"
GAME="$SITE/tetrisGame"

rm -rf "$SITE"
mkdir -p "$GAME" "$SITE/downloads"
touch "$SITE/.nojekyll"

echo "Landing -> $SITE/"
cp -a "$ROOT/github-pages-root/"* "$SITE/"

echo "ads.txt -> $SITE/"
cp -f "$ROOT/ads.txt" "$SITE/ads.txt"

echo "Game -> $GAME/"
for f in index.html highscores.html privacy.html styles.css manifest.json sw.js; do
  cp -f "$ROOT/$f" "$GAME/$f"
done
cp -a "$ROOT/js" "$ROOT/assets" "$ROOT/audio" "$GAME/"

if [[ -d "$ROOT/downloads" ]]; then
  echo "Downloads -> $SITE/downloads/"
  for f in "$ROOT/downloads"/*; do
    [[ -e "$f" ]] || continue
    base="$(basename "$f")"
    [[ "$base" == "README.md" ]] && continue
    cp -a "$f" "$SITE/downloads/"
  done
fi

echo "Built $SITE ($(du -sh "$SITE" | cut -f1))"
