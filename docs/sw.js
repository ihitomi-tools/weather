// 画面のファイルだけを保存する。通信(天気・Firebase)には触れない。
const CACHE = 'shell-v17';
const FILES = [
  './', 'index.html', 'css/style.css', 'css/moon.css', 'manifest.webmanifest',
  'js/app.js', 'js/crypto.js', 'js/cities.js', 'js/weather.js', 'js/emoji.js', 'js/cycle.js', 'js/card.js', 'js/share.js', 'js/qa.js', 'js/dates.js', 'js/export.js', 'js/news.js', 'js/moon.js', 'js/moonlogic.js', 'js/demo-boot.js', 'js/chara.js', 'js/config.js', 'js/store.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'robots.txt',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 毎回サーバーに最新かを確かめ(ブラウザの一時保存を使わない)、つながらないときだけ保存分を使う
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('index.html'))),
  );
});
