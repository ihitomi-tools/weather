// 画面のファイルだけを保存する。通信(天気・Firebase)には触れない。
const CACHE = 'shell-v103';
const FILES = [
  './', 'index.html', 'css/style.css', 'css/moon.css', 'css/shelf.css', 'css/ticket.css', 'css/diary.css', 'manifest.webmanifest',
  'js/app.js', 'js/crypto.js', 'js/cities.js', 'js/weather.js', 'js/emoji.js', 'js/cycle.js', 'js/card.js', 'js/share.js', 'js/qa.js', 'js/dates.js', 'js/export.js', 'js/news.js', 'js/moon.js', 'js/moonlogic.js', 'js/demo-boot.js', 'js/chara.js', 'js/similar.js', 'js/hitorigoto.js', 'js/shelf.js', 'js/ticket.js', 'js/diary.js', 'js/room.js', 'js/config.js', 'js/store.js',
  'img/leather.webp', 'img/moon1.webp', 'img/moon2.webp', 'img/moon3.webp', 'img/moon4.webp', 'img/moon5.webp', 'img/room/n1.webp', 'img/room/n2.webp', 'img/room/n3.webp', 'img/room/n4.webp', 'img/room/d2.webp', 'img/room/d3.webp', 'img/room/d4.webp', 'img/room/d5.webp', 'img/room/book.webp', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'robots.txt',
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
