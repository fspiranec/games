// Service worker: sprema sve igre na uređaj da rade i bez interneta.
// NE UREĐUJ sw.js ručno – napravi ga s:  node tools/update-sw.js
const VERSION = '__VERSION__';
const CACHE = 'igre-' + VERSION;
const FONTS = 'igre-fonts';
const FILES = __FILES__;

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
