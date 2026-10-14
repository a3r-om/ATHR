// تم إلغاء التطبيق: هذا الملف يمسح نفسه والمحفوظ منه من جهاز الزائر، وبعدها المتجر يشتغل كموقع عادي
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k.startsWith("athr-")).map((k) => caches.delete(k))))
        .then(() => self.registration.unregister()));
});
