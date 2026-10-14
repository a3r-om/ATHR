// عامل الخدمة لتطبيق أثر: يفتح المتجر كتطبيق، ويعرض صفحة بديلة إذا انقطع الإنترنت
// يبنيه tools/build.mjs تلقائياً، لا تعدّله يدوياً
const VERSION = "882f8af8e1";
const BASE = "/ATHR/";
const PAGES = "athr-pages-" + VERSION;
const ASSETS = "athr-assets-" + VERSION;
const OFFLINE = BASE + "offline.html";

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(ASSETS).then((c) => c.addAll([OFFLINE, BASE + "images/logo.png", BASE + "images/app/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k.startsWith("athr-") && k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});

async function trim(name, max) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function keep(name, request, response, max) {
    if (!response || !response.ok || response.type !== "basic") return;
    const copy = response.clone();
    caches.open(name).then((c) => c.put(request, copy)).then(() => (Math.random() < 0.15 ? trim(name, max) : null)).catch(() => {});
}

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    // الطلبات الخارجية (قاعدة البيانات، الخطوط، الصور المرفوعة) يتعامل معها المتصفح مباشرة
    if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE) || url.pathname.startsWith(BASE + "backup/")) return;
    // الفيديو يتركه للمتصفح (آيفون يطلبه على أجزاء، والتخزين هنا يوقفه)
    if (req.headers.has("range") || /.(mp4|webm|mov|m4v)$/i.test(url.pathname)) return;

    // الصفحات: من الإنترنت دائماً (أحدث سعر ومخزون)، والنسخة المحفوظة فقط إذا انقطع الاتصال
    if (req.mode === "navigate") {
        event.respondWith(fetch(req)
            .then((res) => { keep(PAGES, req, res, 40); return res; })
            .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match(OFFLINE))));
        return;
    }

    // الملفات بإصدار (?v=) ثابتة: من المحفوظ أولاً
    if (url.searchParams.has("v")) {
        event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { keep(ASSETS, req, res, 80); return res; })));
        return;
    }

    // الصور المصغّرة (أسماؤها ثابتة المحتوى): من المحفوظ دائماً
    if (url.pathname.startsWith(BASE + "images/t/") || url.pathname.startsWith(BASE + "images/ad/")) {
        event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { keep(ASSETS, req, res, 250); return res; })));
        return;
    }

    // الباقي: المحفوظ فوراً، ونحدّثه من الإنترنت بالخلفية إذا صار له أكثر من 6 ساعات
    event.respondWith(caches.match(req).then((hit) => {
        const age = hit ? Date.now() - (Date.parse(hit.headers.get("date") || "") || 0) : Infinity;
        if (hit && age < 6 * 3600e3) return hit;
        const net = fetch(req).then((res) => { keep(ASSETS, req, res, 250); return res; }).catch(() => hit || Response.error());
        return hit || net;
    }));
});

// ---------- إشعارات العروض ----------
self.addEventListener("push", (event) => {
    let d = {};
    try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : "" }; }
    event.waitUntil(self.registration.showNotification(d.title || "أثر", {
        body: d.body || "",
        icon: BASE + "images/app/icon-192.png",
        badge: BASE + "images/app/badge-96.png",
        image: d.image || undefined,
        dir: "rtl",
        lang: "ar",
        tag: d.tag || "athr",
        data: { url: d.url || BASE }
    }));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    let target;
    try { target = new URL((event.notification.data && event.notification.data.url) || BASE, self.location.origin); } catch (e) { target = new URL(BASE, self.location.origin); }
    if (target.origin !== self.location.origin || !target.pathname.startsWith(BASE)) target = new URL(BASE, self.location.origin);
    target.searchParams.set("src", "push");
    event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        const win = list.find((c) => c.url.startsWith(self.location.origin + BASE));
        if (win) return win.focus().then((c) => (c || win).navigate(target.href)).catch(() => self.clients.openWindow(target.href));
        return self.clients.openWindow(target.href);
    }));
});
