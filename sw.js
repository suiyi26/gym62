/* 太科新生通关宝典 · 单文件版 Service Worker（可选）
 * 说明：index.html 本身已内联全部资源，本文件只用于「离线二次访问」与「添加到主屏」。
 * 只上传 index.html 也能完整运行，只是离线缓存能力会降级为浏览器普通缓存。
 */
var CACHE = 'tyust-single-v1';
var ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (u) {
      return c.add(u).catch(function () { /* 单文件部署时可能没有 manifest.json */ });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return r;
      }).catch(function () {
        return caches.match('./index.html').then(function (r) {
          return r || caches.match('./') || new Response('离线中，请联网后重试', { status: 503 });
        });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (r) {
      if (r) return r;
      return fetch(req).then(function (net) {
        var copy = net.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return net;
      }).catch(function () { return new Response('', { status: 504 }); });
    })
  );
});
