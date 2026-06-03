# Deploying Stackwave Defense (GitHub Pages)

## Site layout

Production GitHub Pages uses a **landing page at the site root** and the **game under `/tetrisGame/`**:

| URL | Content |
|-----|---------|
| `https://strangis23.github.io/` | Landing (`github-pages-root/`) |
| `https://strangis23.github.io/tetrisGame/` | Playable game (`index.html`) |
| `https://strangis23.github.io/tetrisGame/highscores.html` | High scores |
| `https://strangis23.github.io/downloads/` | Offline zip + `manifest.json` |
| `https://strangis23.github.io/ads.txt` | AdSense verification (repo root file) |

Local preview of the same layout:

```bash
./scripts/build-pages-site.sh
python3 -m http.server 8000 --directory _site
# http://localhost:8000/  → landing
# http://localhost:8000/tetrisGame/  → game
```

## Automated deploy

Push to `main` (or `master`) runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which builds `_site` and publishes to GitHub Pages.

**One-time repo settings:** Settings → Pages → Source: **GitHub Actions**.

## Manual / alternate hosting

- **Game only at domain root:** serve the repo root as-is (`index.html` at `/`). Ignore `github-pages-root/` or use it as a separate site.
- **Full Pages layout without Actions:** run `./scripts/build-pages-site.sh` and upload `_site/` to any static host.

## Web zip (`downloads/`)

```bash
./scripts/package-downloads.sh
```

Includes `ads.txt`, `sw.js`, all `js/` (including `platform.js`, `tutorial.js`), fonts, and assets. Commit `downloads/` after version bumps.

## AdSense

1. Create a **display banner** unit in AdSense for `strangis23.github.io`.
2. Set the slot ID on the ad container in `index.html` and `highscores.html`:
   ```html
   <div id="ad-slot" class="ad-slot" data-ad-slot="YOUR_SLOT_ID"></div>
   ```
3. Keep [`ads.txt`](ads.txt) at the **site root** (deploy copies it next to the landing page).
4. See [`docs/ADSENSE.md`](docs/ADSENSE.md) for troubleshooting.

## Service worker

`sw.js` lives with the game (`/tetrisGame/sw.js`). Bump `CACHE_NAME` in `sw.js` when shipping a release so clients pick up new assets. Scripts/CSS use **stale-while-revalidate**; HTML uses **network-first**.

## Version tags (optional)

Pushing a tag `v*` runs [`.github/workflows/release.yml`](.github/workflows/release.yml) to rebuild the web zip and attach it to a GitHub Release.
