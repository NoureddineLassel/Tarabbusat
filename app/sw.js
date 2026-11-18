// يجعل التطبيق يعمل بدون إنترنت عند تثبيته كتطبيق ويب (PWA)
const CACHE = 'tarabbusat-v1';
const FILES = ['./', './index.html', './css/app.css', './js/grids.js', './js/scoring.js', './js/app.js',
  './vendor/xlsx.full.min.js', './fonts/noto-sans-arabic-arabic-400-normal.woff2',
  './fonts/noto-sans-arabic-arabic-700-normal.woff2', './icons/icon.svg', './icons/icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
