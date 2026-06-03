// Banner ads (Google AdSense). Disabled in desktop/Steam builds via Platform.hasAds.
(function () {
  if (typeof Platform !== 'undefined' && !Platform.hasAds) return;

  const ADS = {
    enabled: true,
    clientId: 'ca-pub-6914309383865227',
    // Override via <div id="ad-slot" data-ad-slot="..."> or <meta name="swd-ad-slot" content="...">
    bannerSlot: '',
  };

  const slot = document.getElementById('ad-slot');
  if (!slot) return;

  const metaSlot = document.querySelector('meta[name="swd-ad-slot"]')?.getAttribute('content');
  const bannerSlot = (slot.dataset.adSlot || metaSlot || ADS.bannerSlot || '').trim();

  function isLocalDev() {
    const host = location.hostname;
    return !host || host === 'localhost' || host === '127.0.0.1' || location.protocol === 'file:';
  }

  function showDevPlaceholder() {
    slot.innerHTML =
      '<p class="ad-placeholder muted">Ad banner · set <code>data-ad-slot</code> on #ad-slot (see docs/ADSENSE.md)</p>';
  }

  function loadBanner() {
    if (!ADS.enabled || !ADS.clientId || !bannerSlot) {
      if (isLocalDev()) showDevPlaceholder();
      return;
    }

    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', ADS.clientId);
    ins.setAttribute('data-ad-slot', bannerSlot);
    ins.setAttribute('data-ad-format', 'horizontal');
    ins.setAttribute('data-full-width-responsive', 'true');
    slot.appendChild(ins);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn('adsbygoogle init failed:', err);
    }
  }

  if (isLocalDev() && !bannerSlot) {
    showDevPlaceholder();
  } else {
    loadBanner();
  }
})();
