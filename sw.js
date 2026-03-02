const CACHE_NAME = 'driving-report-v22';
const ASSETS = [
    'index.html',
    'css/style.css?v=22',
    'js/state.js?v=22',
    'js/ui.js?v=22',
    'js/info.js?v=22',
    'js/master.js?v=22',
    'js/qr.js?v=22',
    'js/app.js?v=22',
    'js/form.js?v=22',
    'js/gas.js?v=22',
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
