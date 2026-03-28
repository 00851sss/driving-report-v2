const CACHE_NAME = 'driving-report-v27';
const ASSETS = [
    'index.html',
    'css/style.css?v=27',
    'js/state.js?v=27',
    'js/ui.js?v=27',
    'js/info.js?v=27',
    'js/master.js?v=27',
    'js/qr.js?v=27',
    'js/ss.js?v=27',
    'js/app.js?v=27',
    'js/form.js?v=27',
    'js/gas.js?v=27',
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
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                );
            }),
            self.clients.claim() // 全てのクライアントを新しいSWの制御下に置く
        ])
    );
});

// フェッチ時にキャッシュがあれば返し、なければネットワーク
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
