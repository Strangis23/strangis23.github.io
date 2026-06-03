#!/usr/bin/env bash
# Package the web build into downloads/ for the current branch.
# Desktop builds stay in desktop/dist/ (see desktop/README.md).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DESKTOP="$ROOT/desktop"
DL="$ROOT/downloads"
VERSION="$(node -p "require('$DESKTOP/package.json').version")"
BRANCH="$(git -C "$ROOT" branch --show-current 2>/dev/null || echo unknown)"
BUILD_LINUX=0
BUILD_WIN=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [--build-linux] [--build-win]

  (default)         Create downloads/stackwave-defense-<version>-web.zip only
  --build-linux     Also run npm run build:linux  -> desktop/dist/
  --build-win       Also run npm run build:win    -> desktop/dist/

Desktop packages are not copied into downloads/ (they exceed GitHub file limits).
See desktop/README.md for running and distributing Electron builds.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-linux) BUILD_LINUX=1; shift ;;
    --build-win) BUILD_WIN=1; shift ;;
    --build-desktop)
      BUILD_LINUX=1
      BUILD_WIN=1
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

mkdir -p "$DL"

if [[ "$BUILD_LINUX" -eq 1 ]]; then
  echo "Building Linux desktop packages -> desktop/dist/"
  (cd "$DESKTOP" && npm run build:linux)
fi

if [[ "$BUILD_WIN" -eq 1 ]]; then
  echo "Building Windows desktop packages -> desktop/dist/"
  (cd "$DESKTOP" && npm run build:win)
fi

WEB_ZIP="$DL/stackwave-defense-${VERSION}-web.zip"
echo "Packaging web bundle -> $(basename "$WEB_ZIP")"
rm -f "$WEB_ZIP"
(
  cd "$ROOT"
  zip -rq "$WEB_ZIP" \
    index.html highscores.html privacy.html styles.css manifest.json sw.js ads.txt \
    js assets audio steam_appid.txt \
    -x "*.DS_Store" "*/.*" "desktop/*" "steam/content/windows/*" "steam/content/linux/*"
)

python3 - "$DL/manifest.json" "$VERSION" "$BRANCH" <<'PY'
import json, sys, hashlib
from datetime import datetime, timezone
from pathlib import Path

out_path, version, branch = sys.argv[1:4]
dl = Path(out_path).parent
entries = []

for path in sorted(dl.iterdir()):
    if path.name in ("manifest.json", "README.md") or not path.is_file():
        continue
    data = path.read_bytes()
    entries.append({
        "file": path.name,
        "sizeBytes": path.stat().st_size,
        "sha256": hashlib.sha256(data).hexdigest(),
    })

manifest = {
    "product": "Stackwave Defense",
    "version": version,
    "branch": branch,
    "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "downloads": entries,
}

Path(out_path).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {out_path} ({len(entries)} file(s))")
PY

echo "Done. Commit downloads/ and push."
