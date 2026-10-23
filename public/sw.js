// Offline support (same approach as JobDone): pages come from the network so updates arrive,
// falling back to the saved copy after 2.5 s or when offline. Built files are cached on first use.
const CACHE = 'keepup-v5';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/manifest.webmanifest', '/icons/icon.svg'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
function pageFirst(e) {
  const net = fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; });
  const saved = () => caches.match(e.request).then(r => r || caches.match('/'));
  e.waitUntil(net.catch(() => {}));
  return new Promise(res => {
    let done = false; const t = setTimeout(() => saved().then(r => { if (r && !done) { done = true; res(r); } }), 2500);
    net.then(r => { if (!done) { done = true; clearTimeout(t); res(r); } }, () => saved().then(r => { if (!done) { done = true; clearTimeout(t); res(r || Response.error()); } }));
  });
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.searchParams.has('fresh')) return; // never cache account or database calls, or the update check
  e.respondWith(e.request.mode === 'navigate' ? pageFirst(e)
    : caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return res; })));
});

// Reminders from the server (see src/lib/push.js). Tapping one opens the app, or brings it forward.
self.addEventListener('push', e => {
  let m = {}; try { m = e.data?.json() || {}; } catch (x) { m = { body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(m.title || 'KeepUp', { body: m.body || '', tag: m.tag, renotify: !!m.tag, icon: '/icons/icon-192.png', data: { url: m.url || '/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(location.origin));
    return c ? c.focus() : self.clients.openWindow(url);
  }));
});
