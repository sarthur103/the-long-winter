const CACHE = 'long-winter-v5';
const ASSETS = ['./','./index.html','./styles.css','./turns.css?v=5','./cinematic.css?v=5','./app.js?v=5','./simulation.js?v=4','./storage.js?v=4','./scene.js?v=5','./cinematic.js?v=5','./manifest.webmanifest','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('long-winter-')&&k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));
  else event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
