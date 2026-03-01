const CACHE_NAME = 'driving-report-v18';
const ASSETS = [
    'index.html',
    'css/style.css?v=18',
    'js/state.js?v=18',
    'js/ui.js?v=18',
    'js/info.js?v=18',
    'js/master.js?v=18',
    'js/qr.js?v=18',
    'js/app.js?v=18',
    'js/form.js?v=18',
    'js/gas.js?v=18',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

// インストール時にリソースをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

// キャッシュを更新
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
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
