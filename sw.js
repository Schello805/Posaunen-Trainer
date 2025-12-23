const CACHE_NAME = 'posaune-trainer-v30'; // Force Fresh Start
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './js/main.js',
    './js/data.js',
    './js/state.js',
    './js/audio.js',
    './js/score-renderer.js',
    './js/gamification.js',
    './js/theory.js',
    './js/app-core.js',
    './js/ui.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/vexflow@4.2.3/build/cjs/vexflow.js',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Install Event: Cache Files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing new version...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching all assets');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// Fetch Event: Network First, then Cache (für Updates)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone response to cache it
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request);
            })
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new version...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim()) // Take control immediately
    );
});
