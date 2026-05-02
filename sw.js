const CACHE_NAME = 'driving-report-v34';
const ASSETS = [
    'index.html',
    'css/style.css?v=34',
    'js/state.js?v=34',
    'js/ui.js?v=34',
    'js/info.js?v=34',
    'js/master.js?v=34',
    'js/qr.js?v=34',
    'js/ss.js?v=34',
    'js/app.js?v=34',
    'js/form.js?v=34',
    'js/gas.js?v=34',
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
        caches.keys().then((keys) => {
            const oldKeys = keys.filter((key) => key !== CACHE_NAME);
            const isUpdate = oldKeys.length > 0;
            return Promise.all([
                ...oldKeys.map((key) => caches.delete(key)),
                self.clients.claim()
            ]).then(() => {
                // アップデート時のみ全クライアントにリロードを通知
                if (isUpdate) {
                    return self.clients.matchAll({ type: 'window' }).then((clients) => {
                        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
                    });
                }
            });
        })
    );
});

// フェッチ時にキャッシュがあれば返し、なければネットワーク
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
