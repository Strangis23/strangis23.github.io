# Steam Deck / desktop QA checklist

Use this list before submitting a Steam build. Run the desktop app with:

```bash
cd desktop
STEAM_APP_ID=480 npm run start:steam
```

Packaged builds require Steam by default. Set your real App ID in `steam_appid.txt` and `steam/content/app_build.vdf` (see `../steam/SETUP.md`). Dev uses `480` (Spacewar).

## Display (1280×800 fixed)

Shipping Windows/Linux builds use a **non-resizable 1280×800** window. Verify:

- [ ] Board and HUD are centered side-by-side with no empty bars or scrollbars
- [ ] Title screen fits without scrolling

## Input

- [ ] Keyboard controls work (arrows, rotate, hold, pause)
- [ ] Gamepad controls work (D-pad/stick move, A drop, X hold, Y/B rotate, Start pause, Back wave speed)
- [ ] HUD tap targets: Hold preview, Wave Speed stat, Pause stat
- [ ] Steam Overlay (Shift+Tab) opens and closes; input works afterward
- [ ] Optional: enable HUD **Pad** for touch / Deck touchscreen

## Steam integration

- [ ] App initializes Steam API when launched via Steam (or with App ID 480 in dev)
- [ ] Achievements unlock (verify in Steam client overlay → Achievements)
- [ ] Steam Cloud: change settings, quit, reinstall — settings restore
- [ ] Rich presence updates during build/wave phases

## Offline

- [ ] No requests to Google Fonts or AdSense (bundled fonts only)
- [ ] No service worker registration in desktop build
- [ ] Ad banner hidden

## Lifecycle

- [ ] **Quit Game** in Settings exits cleanly
- [ ] Window close quits the app
- [ ] Pause blocks piece movement (keyboard, touch, mobile pad)
