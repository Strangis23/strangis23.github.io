#!/usr/bin/env bash
# Generate desktop/build/icon.png and icon.ico from icon.svg.
# Requires ImageMagick (magick or convert) or runs the Node fallback.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/build"
SVG="$BUILD/icon.svg"
PNG="$BUILD/icon.png"
ICO="$BUILD/icon.ico"

if [[ ! -f "$SVG" ]]; then
  echo "Missing $SVG"
  exit 1
fi

if command -v magick >/dev/null 2>&1; then
  magick -background none "$SVG" -resize 512x512 "$PNG"
  magick "$PNG" -define icon:auto-resize=256,128,64,48,32,16 "$ICO"
elif command -v convert >/dev/null 2>&1; then
  convert -background none "$SVG" -resize 512x512 "$PNG"
  convert "$PNG" -define icon:auto-resize=256,128,64,48,32,16 "$ICO"
else
  echo "ImageMagick not found — using Node fallback"
  node "$ROOT/scripts/generate-icons.mjs"
fi

echo "Wrote $PNG and $ICO"
