/* PlusOne Service Worker - Website को Offline चलाने के लिए */
const CACHE = "plusone-v1";

/* पहली बार खुलते ही ये फाइलें फोन में Save हो जाएँगी */
const SHELL = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png"];

/* Install: ज़रूरी फाइलें Cache में रखो */
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

/* Activate: पुराने Cache हटाओ */
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* इन्हीं जगहों की Request हम संभालेंगे (वीडियो, फोटो वगैरह को नहीं छूते) */
const OK_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "api.github.com"];

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;              // Publish / Delete (PUT) को नहीं छूना
  const url = new URL(req.url);
  const mine = url.origin === self.location.origin;
  if (!mine && !OK_HOSTS.includes(url.host)) return;

  /* Cache की Key: ?t=123 जैसा बदलता हिस्सा हटाकर, ताकि Offline में posts.json मिल सके */
  const key = new Request(url.origin + url.pathname);

  e.respondWith(
    /* पहले Internet से ताज़ा डेटा लो, और Cache में नया Copy रख लो */
    fetch(req)
      .then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(key, copy));
        }
        return res;
      })
      /* Internet नहीं है: Cache से दिखाओ */
      .catch(() =>
        caches.match(key).then(hit =>
          hit || (req.mode === "navigate"
            ? caches.match(new URL("./", self.registration.scope).href)   // Home Page
            : Response.error())
        )
      )
  );
});
