// عامل الخدمة لتطبيق أثر: يفتح المتجر كتطبيق، ويعرض صفحة بديلة إذا انقطع الإنترنت
// يبنيه tools/build.mjs تلقائياً، لا تعدّله يدوياً
const VERSION = "6981ec9a5e";
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
    caches.open(name).then((c) => c.put(request, copy)).then(() => trim(name, max)).catch(() => {});
}

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    // الطلبات الخارجية (قاعدة البيانات، الخطوط، الصور المرفوعة) يتعامل معها المتصفح مباشرة
    if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE) || url.pathname.startsWith(BASE + "backup/")) return;

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

    // الباقي (الصور وغيرها): المحفوظ فوراً مع تحديثه من الإنترنت بالخلفية
    event.respondWith(caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => { keep(ASSETS, req, res, 200); return res; }).catch(() => hit || Response.error());
        return hit || net;
    }));
});
