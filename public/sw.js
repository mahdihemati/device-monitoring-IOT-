const CACHE_VERSION = 'blood-refrigerator-monitor-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = '/offline.html';
const STATIC_ASSETS = [
    OFFLINE_URL,
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/maskable-icon-512.png',
    '/icons/apple-touch-icon.png',
];

function isApiRequest(url) {
    return url.pathname.startsWith('/api/');
}

function isStaticAsset(url) {
    return url.pathname.startsWith('/build/')
        || url.pathname.startsWith('/icons/')
        || url.pathname === '/manifest.webmanifest'
        || url.pathname === '/favicon.ico';
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith('blood-refrigerator-monitor-') && key !== STATIC_CACHE)
                    .map((key) => caches.delete(key)),
            ))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin || isApiRequest(url)) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match(OFFLINE_URL)),
        );

        return;
    }

    if (isStaticAsset(url)) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then((networkResponse) => {
                    if (networkResponse.ok) {
                        const responseCopy = networkResponse.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseCopy);
                        });
                    }

                    return networkResponse;
                });
            }),
        );
    }
});
