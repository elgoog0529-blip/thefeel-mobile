// v2.47.47 SW — .json/.enc/.html은 network-first, 자산은 cache-first
const CACHE = 'thefeel-mobile-v2.47.47';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './secure/_meta.json',
  './secure/data.enc',
  './secure/inventory.enc',
  './secure/md.enc',
  './secure/transactions.enc',
  './secure/daily.enc',
  './secure/naver-realtime.enc',
  './icon.png',
  './icon-512.png',
  './fonts/PretendardVariable.woff2',
  './fonts/JetBrainsMono-Regular.woff2',
];

// v2.46.34: 페이지에서 SKIP_WAITING 메시지 받으면 즉시 활성화
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache:'reload'}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const isFresh = /\.(json|html)(\?|$)/i.test(url.pathname) || url.pathname === '/' || url.pathname.endsWith('/');

  if (isFresh) {
    // network-first — 항상 최신
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request, {ignoreSearch:true}).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  // 정적 자산 cache-first
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => new Response('', {status: 504}));
    })
  );
});
