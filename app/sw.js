// يجعل التطبيق يعمل بدون إنترنت عند تثبيته كتطبيق ويب (PWA)
const CACHE = 'tarabbusat-v6';
const FILES = ['./', './index.html', './css/fonts.css', './css/app.css', './js/i18n.js', './js/grid-i18n.js', './js/grids.js', './js/structure.js', './js/decree.js', './js/scoring.js', './js/files.js', './js/icons.js', './js/app.js',
  './vendor/xlsx.full.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js', './fonts/noto-sans-arabic-arabic-400-normal.woff2',
  './fonts/noto-sans-arabic-arabic-700-normal.woff2', './fonts/almarai-arabic-400-normal.woff2', './fonts/almarai-arabic-700-normal.woff2', './fonts/almarai-latin-400-normal.woff2', './fonts/almarai-latin-700-normal.woff2', './fonts/amiri-arabic-400-normal.woff2', './fonts/amiri-arabic-700-normal.woff2', './fonts/amiri-latin-400-normal.woff2', './fonts/amiri-latin-700-normal.woff2', './fonts/cairo-arabic-400-normal.woff2', './fonts/cairo-arabic-700-normal.woff2', './fonts/cairo-latin-400-normal.woff2', './fonts/cairo-latin-700-normal.woff2', './fonts/el-messiri-arabic-400-normal.woff2', './fonts/el-messiri-arabic-700-normal.woff2', './fonts/el-messiri-latin-400-normal.woff2', './fonts/el-messiri-latin-700-normal.woff2', './fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', './fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2', './fonts/ibm-plex-sans-arabic-latin-400-normal.woff2', './fonts/ibm-plex-sans-arabic-latin-700-normal.woff2', './fonts/noto-naskh-arabic-arabic-400-normal.woff2', './fonts/noto-naskh-arabic-arabic-700-normal.woff2', './fonts/noto-naskh-arabic-latin-400-normal.woff2', './fonts/noto-naskh-arabic-latin-700-normal.woff2', './fonts/readex-pro-arabic-400-normal.woff2', './fonts/readex-pro-arabic-700-normal.woff2', './fonts/readex-pro-latin-400-normal.woff2', './fonts/readex-pro-latin-700-normal.woff2', './fonts/tajawal-arabic-400-normal.woff2', './fonts/tajawal-arabic-700-normal.woff2', './fonts/tajawal-latin-400-normal.woff2', './fonts/tajawal-latin-700-normal.woff2', './icons/icon.svg', './icons/icon-512.png', './icons/apple-touch-icon.png', './manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const c = res.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); }
    return res;
  })));
});
