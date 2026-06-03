# Steamworks setup — Stackwave Defense

## 1. App ID and depot IDs

1. Create the app in the [Steamworks partner site](https://partner.steamgames.com/).
2. Note your **App ID** and **depot IDs** (Windows + Linux).
3. Copy config templates:
   ```bash
   cp steam/content/app_build.vdf.example steam/content/app_build.vdf
   cp steam/content/depot_build_win.vdf.example steam/content/depot_build_win.vdf
   cp steam/content/depot_build_linux.vdf.example steam/content/depot_build_linux.vdf
   ```
4. Replace `YOUR_APP_ID` and depot IDs in those three files.
5. Set the same App ID in repo root `steam_appid.txt` (one line, digits only).

Dev testing can keep `480` (Spacewar) via `STEAM_APP_ID=480 npm run start:steam`.

## 2. Achievements and Steam Cloud

- Import definitions from [`achievements.json`](achievements.json) (86 achievements).
- Enable **Steam Cloud** with root `SWD`.
- Cloud files must match `cloudFiles` in `achievements.json` (settings, high scores, achievements, lifetime stats).

## 3. Build and upload

```bash
cd desktop
npm install
npm run steam:ship          # build:release + stage to steam/content/
# Edit steam/content/*.vdf with real IDs, then:
SWD_STEAM_USER=... SWD_STEAM_PASS=... npm run steam:upload
```

`upload-steam.sh` defaults to `steam/content/app_build.vdf` at the repo root (not under `desktop/`).

## 4. Linux launch configuration (partner site)

After staging, the Linux depot root contains the unpacked Electron app:

| Path | Purpose |
|------|---------|
| `stackwave-defense` | **Launch executable** (set in Steamworks → Installation → Launch Options) |
| `locales/`, `resources/`, `lib*.so`, etc. | Bundled runtime |

**Do not** upload the AppImage to the depot; `stage-steam-content.sh` only copies the `linux-unpacked` tree from `*.tar.gz`.

Example launch option:

- Executable: `stackwave-defense`
- Working directory: `%INSTALLDIR%` (default)

## 5. Windows launch

Staged zip contents live under `steam/content/windows/`. Set the launch executable to `Stackwave Defense.exe` (or the name produced by electron-builder portable/zip).

## 6. Shipping build behavior

Packaged builds from `npm run build:release`:

- Fixed **1280×800** window (unless built with `SWD_ALLOW_RESIZE=1` at runtime)
- **Require Steam** by default (`app.isPackaged`); override with `SWD_REQUIRE_STEAM=0` for local testing of the packaged binary
