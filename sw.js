/* Service worker del Diario.
   Cambia CACHE a ogni aggiornamento dei file per forzare il refresh. */
var CACHE = 'diario-v1';

var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(ev){
  ev.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(SHELL);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(ev){
  ev.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(ev){
  var req = ev.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // La pagina: prima la rete, così un aggiornamento arriva subito.
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copy); });
        return res;
      }).catch(function(){
        return caches.match('./index.html');
      })
    );
    return;
  }

  // I font di Google e il resto: prima la cache, poi la rete.
  ev.respondWith(
    caches.match(req).then(function(hit){
      if (hit) return hit;
      return fetch(req).then(function(res){
        if (res && res.status === 200 && (url.origin === location.origin || url.hostname.indexOf('gstatic') > -1 || url.hostname.indexOf('googleapis') > -1)) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
    })
  );
});
