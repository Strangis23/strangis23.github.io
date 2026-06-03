# AdSense setup

## Files

| File | Purpose |
|------|---------|
| [`ads.txt`](../ads.txt) | Publisher verification at **domain root** on GitHub Pages |
| [`js/ads.js`](../js/ads.js) | Loads the banner unit when configured |
| `index.html` / `highscores.html` | `data-ad-slot` on `#ad-slot` |

Publisher ID (client): `ca-pub-6914309383865227` (already in page `<script>` tags).

## Enable the banner

1. In [AdSense](https://www.google.com/adsense/), add site `strangis23.github.io` if needed.
2. Create a **Display** ad unit (horizontal / responsive banner).
3. Copy the **data-ad-slot** value (numeric slot ID).
4. Set it in both HTML files:

```html
<div id="ad-slot" class="ad-slot" data-ad-slot="1234567890"></div>
```

5. Deploy so root `ads.txt` is live: `https://strangis23.github.io/ads.txt`
6. Wait for review; until approved, production may show empty or test fills.

## Local development

On `localhost` / `file://`, with no slot ID configured, the footer shows a muted placeholder instead of calling `adsbygoogle`.

## Desktop / Steam

`Platform.hasAds` is false in the Electron build — the ad footer is removed and AdSense scripts are not required.
