/* Service worker : reçoit les notifications du potager et ouvre l'app au toucher. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Mon petit potager', {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    tag: d.tag || 'potager',
    data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { if ('navigate' in c) c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});

/* Hors ligne (site web) : l'app reste ouverte sans réseau. Les pages passent d'abord par le réseau, les fichiers de l'app sont gardés. */
const SHELL = 'potager-shell-v1';
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('potager-') && k !== SHELL).map(k => caches.delete(k))))));

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Seulement les fichiers du site, jamais l'API ni le serveur de développement
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.hostname === 'localhost' || url.pathname === '/sw.js') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(SHELL).then(c => c.put('/', copy)); return res; }).catch(() => caches.match('/').then(r => r || Response.error())));
    return;
  }
  e.respondWith(caches.open(SHELL).then(async cache => {
    const hit = await cache.match(req);
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
    // Fichiers à empreinte (/assets/…) : jamais modifiés, on sert la copie ; le reste est rafraîchi en arrière-plan
    if (hit) { if (!url.pathname.startsWith('/assets/')) net.catch(() => {}); return hit; }
    return net;
  }));
});
