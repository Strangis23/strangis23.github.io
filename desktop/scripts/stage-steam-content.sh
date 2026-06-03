#!/usr/bin/env bash
# Copy electron-builder output into SteamPipe content folders.
# Linux depot: unpacked tar.gz only (Steam launch target), not AppImage.
#
# Usage: ./scripts/stage-steam-content.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
CONTENT="$(cd "$ROOT/.." && pwd)/steam/content"

mkdir -p "$CONTENT/windows" "$CONTENT/linux"

win_zip=$(find "$DIST" -maxdepth 1 -name '*win*.zip' 2>/dev/null | head -1)
linux_tar=$(find "$DIST" -maxdepth 1 -name '*.tar.gz' 2>/dev/null | head -1)

if [[ -n "$win_zip" ]]; then
  echo "Staging Windows build from $win_zip"
  rm -rf "$CONTENT/windows"/*
  unzip -q -o "$win_zip" -d "$CONTENT/windows"
else
  echo "No Windows zip in $DIST (skip)"
fi

if [[ -n "$linux_tar" ]]; then
  echo "Staging Linux unpacked build from $linux_tar"
  rm -rf "$CONTENT/linux"/*
  tmp=$(mktemp -d)
  tar -xzf "$linux_tar" -C "$tmp"
  # electron-builder tar.gz contains one top-level folder (linux-unpacked)
  inner=$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -1)
  if [[ -z "$inner" ]]; then
    echo "Could not find unpacked folder in $linux_tar"
    rm -rf "$tmp"
    exit 1
  fi
  cp -a "$inner"/* "$CONTENT/linux/"
  rm -rf "$tmp"
  exe="$CONTENT/linux/stackwave-defense"
  if [[ ! -x "$exe" ]]; then
    echo "Warning: expected Linux executable at $exe"
    echo "Set Steam launch option to the correct binary under the linux depot root."
  else
    echo "Linux Steam launch executable: stackwave-defense (depot root)"
  fi
else
  echo "No Linux tar.gz in $DIST — run: npm run build:linux"
fi

echo ""
echo "Staged to $CONTENT"
echo "Next: edit steam/content/app_build.vdf, then: npm run steam:upload"
