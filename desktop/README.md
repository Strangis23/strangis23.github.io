# Stackwave Defense — Desktop / Steam

Electron wrapper for Windows and Linux (Steam Deck) builds.

## Prerequisites

- Node.js 20+
- Steam client (for local Steam API testing)
- Steamworks partner account and App ID (use `480` / Spacewar for dev)
- ImageMagick (`magick` or `convert`) optional — icons fall back to Node script

## Development

```bash
cd desktop
npm install
npm run start:steam
```

Environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `STEAM_APP_ID` | `480` | Steam App ID |
| `SWD_REQUIRE_STEAM` | off (dev) / **on** (packaged) | Exit if Steam API fails to init |
| `SWD_DEVTOOLS` | off | Open Chromium DevTools |
| `SWD_ALLOW_RESIZE` | off | Allow resizing **packaged** window (dev/testing) |
| `SWD_FIXED_WINDOW` | off | Lock size during **unpackaged** `npm start` |
| `SWD_REQUIRE_STEAM=0` | — | Packaged build: run without Steam (testing only) |

Copy [`.env.example`](../.env.example) for Steam upload credentials.

## Window size

Shipping builds use a **fixed 1280×800** client area (Steam Deck landscape). Unpackaged dev is resizable unless `SWD_FIXED_WINDOW=1`. Packaged builds are fixed unless `SWD_ALLOW_RESIZE=1`. Edit [`window-config.js`](window-config.js) to change dimensions.

## Icons

```bash
npm run icons   # build/icon.png + icon.ico from build/icon.svg
```

Icons are generated automatically before `npm run build`.

## Production builds

```bash
cd desktop
npm run build:release   # Windows zip + Linux tar.gz (Steam depot layout)
npm run build:win
npm run build:linux
```

Output: `desktop/dist/`

### Stage and upload to Steam

```bash
npm run steam:ship      # build:release + copy into steam/content/
# Configure steam/content/*.vdf (see ../steam/SETUP.md)
SWD_STEAM_USER=... SWD_STEAM_PASS=... npm run steam:upload
```

`stage-steam-content.sh` puts:

- **Windows** — unpacked zip under `steam/content/windows/`
- **Linux** — `linux-unpacked` tree only (executable `stackwave-defense`), not AppImage

## Steamworks setup

See [`../steam/SETUP.md`](../steam/SETUP.md) for App ID, achievements, cloud, and launch options.

## QA checklist (Steam Deck)

Use [`QA.md`](QA.md) before submitting a build.
