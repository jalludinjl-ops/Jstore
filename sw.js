// J-STORE HIJAB — service worker
// File aplikasi disimpan di perangkat supaya bisa dibuka saat offline.
// Network-first (maks 4 detik): saat online, versi terbaru dari GitHub langsung terpakai.
// Permintaan ke Apps Script (script.google.com) tidak disentuh.
const CACHE = 'jstore-app-v7';
const SHELL = ['./', './index.html'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Apps Script & situs lain: biarkan
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const net = fetch(req).then(res => {
    if (res && res.ok) cache.put(req.mode === 'navigate' ? './index.html' : req, res.clone());
    return res;
  });
  try {
    return await Promise.race([
      net,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
    ]);
  } catch (err) {
    net.catch(() => {});
    const hit = (req.mode === 'navigate' ? await cache.match('./index.html') : null)
      || await cache.match(req, { ignoreSearch: true })
      || await cache.match('./index.html');
    if (hit) return hit;
    return net; // tidak ada simpanan: tunggu jaringan
  }
}
