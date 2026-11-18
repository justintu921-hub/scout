// 離線快取：先用手機裡的版本開，有網路時在背景更新，下次打開就是新版
const CACHE = "scout-1.2.2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("scout-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate";
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = isPage ? (await cache.match("./index.html")) || (await cache.match("./")) : await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res && res.ok && res.type === "basic") cache.put(isPage ? "./index.html" : req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { try { e.waitUntil(net) } catch (_) {} return hit }
    return (await net) || new Response("離線中，而且這個檔案還沒存到手機裡", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  })());
});
