// يجعل التطبيق يعمل بدون إنترنت عند تثبيته كتطبيق ويب (PWA)
const CACHE = 'tarabbusat-v5';
const FILES = ['./', './index.html', './css/app.css', './js/i18n.js', './js/grid-i18n.js', './js/grids.js', './js/structure.js', './js/decree.js', './js/scoring.js', './js/files.js', './js/icons.js', './js/app.js',
  './vendor/xlsx.full.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js', './fonts/noto-sans-arabic-arabic-400-normal.woff2',
  './fonts/noto-sans-arabic-arabic-700-normal.woff2', './icons/icon.svg', './icons/icon-512.png', './icons/apple-touch-icon.png', './manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
