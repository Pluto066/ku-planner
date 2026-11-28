/* مخطط التسجيل الذكي: عامل الخدمة
   الصفحة والشعب: من الشبكة أولاً دائماً (فلا يعلق أحد على نسخة قديمة)، ومن النسخة المحفوظة فقط إن انقطع الاتصال.
   الأيقونات والخط: من المحفوظ، وتُحدَّث في الخلفية. */
const V = 'ku-v1';
const CORE = ['./', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// الشبكة أولاً؛ إن تأخرت أكثر من ms وعندنا نسخة محفوظة نعرضها، ونكمل التحديث في الخلفية
function netFirst(e, key, ms) {
  const net = fetch(e.request).then(r => {
    if (r && r.ok) { const cp = r.clone(); e.waitUntil(caches.open(V).then(c => c.put(key, cp))); }
    return r;
  });
  const cached = caches.open(V).then(c => c.match(key));
  return new Promise(res => {
    let done = false;
    const give = r => { if (!done && r) { done = true; res(r); } };
    const t = setTimeout(() => cached.then(give), ms);
    net.then(r => { clearTimeout(t); give(r); })
       .catch(() => { clearTimeout(t); cached.then(r => r ? give(r) : res(Response.error())); });
  });
}

function cacheFirst(e) {
  return caches.open(V).then(c => c.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
}

self.addEventListener('fetch', e => {
  const q = e.request;
  if (q.method !== 'GET') return;
  const u = new URL(q.url);
  if (u.origin === location.origin) {
    if (q.mode === 'navigate') return e.respondWith(netFirst(e, './', 4000));
    if (u.pathname.endsWith('/sections.json')) return e.respondWith(netFirst(e, 'sections.json', 8000));
    if (/\.(png|svg|json)$/.test(u.pathname)) return e.respondWith(cacheFirst(e));
    return; // bm.js وغيره: من الشبكة كالمعتاد
  }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') return e.respondWith(cacheFirst(e));
});
