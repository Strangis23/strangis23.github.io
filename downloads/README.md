# Branch downloads

Pre-built **web** packages for the **current branch** live in this folder. Download the zip, unzip it anywhere on your computer, and open `index.html` in a browser (or serve the folder over HTTP).

See [`manifest.json`](manifest.json) for the current version, file size, and SHA-256 checksum.

## Web bundle

| File | How to run |
| --- | --- |
| `stackwave-defense-*-web.zip` | Unzip, then open `index.html` |

Replace `*` with the version in `manifest.json` (currently **1.0.0**).

## Desktop builds (Linux / Windows)

Desktop packages are **not** stored here — they are too large for GitHub. To build them locally:

```bash
cd desktop
npm install
npm run build:linux   # AppImage + tar.gz -> desktop/dist/
npm run build:win     # zip + portable   -> desktop/dist/
npm run build         # both platforms
```

Or from the repo root:

```bash
./scripts/package-downloads.sh --build-linux   # desktop/dist/ + refresh web zip
./scripts/package-downloads.sh --build-win
./scripts/package-downloads.sh --build-desktop # both platforms + web zip
```

See [`desktop/README.md`](../desktop/README.md) for Steam / Electron details.

## Refreshing the web download

```bash
./scripts/package-downloads.sh
```

Then commit `downloads/` and push.
