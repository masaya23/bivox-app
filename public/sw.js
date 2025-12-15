const CACHE_NAME = 'english-app-v2';
const urlsToCache = [
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
];

// インストール時
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// アクティベーション時
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// フェッチ時（ネットワーク優先、フォールバックでキャッシュ）
self.addEventListener('fetch', (event) => {
  // GET以外はそのまま（POSTのAPIなどを壊さない）
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 外部リソースは触らない
  if (url.origin !== self.location.origin) return;

  // Next.js内部・API・RSCはキャッシュしない（壊れやすい）
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) return;
  if (url.searchParams.has('_rsc')) return;

  // HTMLナビゲーションはキャッシュしない
  const accept = event.request.headers.get('accept') || '';
  if (event.request.mode === 'navigate' || accept.includes('text/html')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // レスポンスをクローンしてキャッシュに保存
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // ネットワークエラー時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});
