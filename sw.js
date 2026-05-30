const CACHE_NAME = 'driving-report-v41';
const ASSETS = [
    'index.html',
    'css/style.css?v=41',
    'js/state.js?v=41',
    'js/ui.js?v=41',
    'js/info.js?v=41',
    'js/master.js?v=41',
    'js/qr.js?v=41',
    'js/ss.js?v=41',
    'js/app.js?v=41',
    'js/form.js?v=41',
    'js/gas.js?v=41',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

// インストール時にリソースをキャッシュ
self.addEventListener('install', (event) => {
    self.skipWaiting(); // 新しいSWをすぐに待機状態から移行させる
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

// キャッシュを更新
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            const oldKeys = keys.filter((key) => key !== CACHE_NAME);
            const isUpdate = oldKeys.length > 0;
            await Promise.all([
                ...oldKeys.map((key) => caches.delete(key)),
                self.clients.claim()
            ]);
            // アップデート時のみ全クライアントにリロードを通知
            if (isUpdate) {
                const clients = await self.clients.matchAll({ type: 'window' });
                clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
            }
        })()
    );
});

// フェッチ時にキャッシュがあれば返し、なければネットワーク
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
