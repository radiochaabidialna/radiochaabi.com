/* Radio Chaabi SW v12
 * - Jamais de cache pour status 206 (Range / audio partiel)
 * - Audio : network only
 * - Images/fonts : stale-while-revalidate (200 only)
 * - JS/CSS/HTML : network first
 * - API : network only
 */
var CACHE_STATIC = 'chaabi-static-v12';
var CACHE_PAGES  = 'chaabi-pages-v12';
var CACHE_MEDIA  = 'chaabi-media-v11';
var ALL = [CACHE_STATIC, CACHE_PAGES, CACHE_MEDIA];
var PRECACHE = ['./index.html', './manifest.json', './assets/css/tailwind.built.css', './assets/css/chaabi-core.css', './assets/css/chaabi-theme-layers.css', './assets/css/qacid-poem.css', './offline.html'];

function canCache(res) {
  return !!(res && res.ok && res.status === 200 && res.type !== 'opaque');
}

function putSafe(cacheName, req, res) {
  if (!canCache(res)) return;
  try {
    var copy = res.clone();
    caches.open(cacheName).then(function (c) {
      c.put(req, copy).catch(function () {});
    });
  } catch (_) {}
}

function networkFirst(req, cacheName, timeoutMs) {
  return new Promise(function (resolve, reject) {
    var done = false;
    var t = setTimeout(function () {
      if (done) return;
      caches.match(req).then(function (c) {
        if (c) { done = true; resolve(c); }
        else reject(new Error('timeout'));
      });
    }, timeoutMs || 3500);
    fetch(req).then(function (res) {
      clearTimeout(t);
      if (done) return;
      done = true;
      putSafe(cacheName, req, res);
      resolve(res);
    }).catch(function (err) {
      clearTimeout(t);
      if (done) return;
      caches.match(req).then(function (c) {
        if (c) resolve(c);
        else reject(err);
      });
    });
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_PAGES).then(function (c) {
      return c.addAll(PRECACHE).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (ALL.indexOf(k) === -1) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d === 'SKIP_WAITING' || d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d === 'CLEAR_CACHES' || d.type === 'CLEAR_CACHES') {
    e.waitUntil(caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }));
  }
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  var path = url.pathname;
  var pathQ = path + url.search;

  // API / admin : network only
  if (path.indexOf('/api/') !== -1 || /radiochaabi\.php$/i.test(path) || path.indexOf('/admin/') !== -1) {
    e.respondWith(fetch(req));
    return;
  }

  // Range requests (seek audio) : pas de cache
  if (req.headers.get('range')) {
    e.respondWith(fetch(req));
    return;
  }

  // Fichiers audio : network only (évite 206)
  if (/\.(mp3|m4a|ogg|wav|aac|flac)(\?|$)/i.test(pathQ)) {
    e.respondWith(fetch(req));
    return;
  }

  var isJsCss = /\.(js|css)(\?|$)/i.test(pathQ);
  var isHtml = req.mode === 'navigate' || path.endsWith('.html') ||
    ((req.headers.get('accept') || '').indexOf('text/html') !== -1);
  var isImageFont = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot)(\?|$)/i.test(pathQ);

  if (isJsCss) {
    e.respondWith(
      networkFirst(req, CACHE_STATIC, 3000).catch(function () {
        return caches.match(req).then(function (c) { return c || Response.error(); });
      })
    );
    return;
  }

  if (isHtml) {
    e.respondWith(
      networkFirst(req, CACHE_PAGES, 4000).catch(function () {
        return caches.match(req).then(function (c) {
          if (c) return c;
          return caches.match('./index.html').then(function (c2) {
            if (c2) return c2;
            return caches.match('/index.html').then(function (c3) {
              if (c3) return c3;
              // Dernier recours : page hors-ligne
              return caches.match('./offline.html').then(function (off) {
                return off || caches.match('/offline.html') || Response.error();
              });
            });
          });
        });
      })
    );
    return;
  }

  if (isImageFont) {
    e.respondWith(
      caches.open(CACHE_MEDIA).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var net = fetch(req).then(function (res) {
            if (canCache(res)) {
              try { cache.put(req, res.clone()).catch(function () {}); } catch (_) {}
            }
            return res;
          }).catch(function () { return cached; });
          return cached || net;
        });
      })
    );
    return;
  }

  e.respondWith(
    fetch(req).then(function (res) {
      putSafe(CACHE_STATIC, req, res);
      return res;
    }).catch(function () {
      return caches.match(req);
    })
  );
});
