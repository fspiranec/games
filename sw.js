// Service worker: sprema sve igre na uređaj da rade i bez interneta.
// NE UREĐUJ sw.js ručno – napravi ga s:  node tools/update-sw.js
const VERSION = '65c38c779f';
const CACHE = 'igre-' + VERSION;
const FONTS = 'igre-fonts';
const FILES = [
  "./games/_shared/kids.js",
  "./games/balonci/",
  "./games/balonci/thumb.svg",
  "./games/bijeg-od-kita/",
  "./games/bijeg-od-kita/thumb.svg",
  "./games/bojanka/",
  "./games/bojanka/thumb.svg",
  "./games/hrani-dinosaura/",
  "./games/hrani-dinosaura/thumb.svg",
  "./games/izlegni-jaje/",
  "./games/izlegni-jaje/thumb.svg",
  "./games/jan-i-trex-lava/",
  "./games/jan-i-trex-lava/thumb.svg",
  "./games/mali-doktor/",
  "./games/mali-doktor/thumb.svg",
  "./games/memorija/",
  "./games/memorija/thumb.svg",
  "./games/pronadi-sjenu/",
  "./games/pronadi-sjenu/thumb.svg",
  "./games/slagalica/",
  "./games/slagalica/thumb.svg",
  "./games/tko-se-skriva/",
  "./games/tko-se-skriva/thumb.svg",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./",
  "./manifest.webmanifest"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('igre-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (err) => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google fontovi: iz spremnika odmah, osvježi u pozadini
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Sve datoteke: s interneta ako ga ima (tako uvijek stigne nova verzija igara),
  // a bez interneta iz spremnika na uređaju. Ponovna instalacija nikad nije potrebna.
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await withTimeout(fetch(req, { cache: 'no-cache' }), 4000);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await c.match('./')) || Response.error();
      return Response.error();
    }
  })());
});
