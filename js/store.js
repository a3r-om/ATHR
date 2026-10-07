/* =====================================================
   ATHR STORE — واجهة المتجر للزبون
   صفحات حقيقية لكل منتج وقسم (تُبنى مسبقًا لجوجل)، ثم يكمل
   المتجر في المتصفح بدون إعادة تحميل.
===================================================== */

(function () {
    "use strict";

    const V = ATHR.views;
    const esc = ATHR.escape;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const BASE = ATHR.base();

    const API = {
        url: window.ATHR_SUPABASE_URL,
        key: window.ATHR_SUPABASE_PUBLISHABLE_KEY
    };

    const KEYS = {
        cache: "athr_cache_v3",
        cart: "athr_cart_v2",
        customer: "athr_customer",
        lastOrder: "athr_last_order",
        lastSeen: "athr_last_seen",
        cartBarClosed: "athr_cart_bar_closed",
        country: "athr_country",
        channel: "athr_ch",
        channelLast: "athr_ch_last",
        sort: "athr_sort"
    };

    // أسماء ولايات عُمان (اقتراحات فقط، ويمكن للعميل كتابة غيرها)
    const WILAYAS = {
        "مسقط": ["مسقط", "مطرح", "بوشر", "السيب", "العامرات", "قريات"],
        "ظفار": ["صلالة", "طاقة", "مرباط", "رخيوت", "ثمريت", "ضلكوت", "المزيونة", "مقشن", "شليم وجزر الحلانيات", "سدح"],
        "مسندم": ["خصب", "دبا", "بخا", "مدحاء"],
        "البريمي": ["البريمي", "محضة", "السنينة"],
        "الداخلية": ["نزوى", "بهلاء", "منح", "الحمراء", "أدم", "إزكي", "سمائل", "بدبد", "الجبل الأخضر"],
        "شمال الباطنة": ["صحار", "شناص", "لوى", "صحم", "الخابورة", "السويق"],
        "جنوب الباطنة": ["الرستاق", "العوابي", "نخل", "وادي المعاول", "بركاء", "المصنعة"],
        "جنوب الشرقية": ["صور", "الكامل والوافي", "جعلان بني بو حسن", "جعلان بني بو علي", "مصيرة"],
        "شمال الشرقية": ["إبراء", "المضيبي", "بدية", "القابل", "وادي بني خالد", "دماء والطائيين", "سناو"],
        "الظاهرة": ["عبري", "ينقل", "ضنك"],
        "الوسطى": ["هيماء", "محوت", "الدقم", "الجازر"]
    };

    const S = {
        config: ATHR.fullConfig({}),
        categories: [],
        products: [],
        reviews: [],
        loaded: false,
        preview: false,
        isAdmin: false,
        sort: "default",
        media: new Map(),
        returningGap: 0,
        country: "OM",
        route: { name: "home" },
        ctx: null,
        lastAdded: []
    };

    let readyResolve;
    const ready = new Promise((resolve) => { readyResolve = resolve; });

    // ---------- safe storage ----------
    const storage = {
        get(key, fallback = null) {
            try {
                const raw = localStorage.getItem(key);
                return raw === null ? fallback : JSON.parse(raw);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
        },
        del(key) {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
        }
    };

    const session = {
        get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
        set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* ignore */ } }
    };

    const C = () => S.config;
    const money = (value) => ATHR.money(value, C());
    const CC = () => ATHR.country(C(), S.country);
    const isBase = () => S.country === ATHR.BASE_COUNTRY;
    const local = (value) => ATHR.moneyIn(value, C(), S.country);
    const approx = (value) => (isBase() ? "" : ` (≈ ${local(value)})`);
    const fill = (text, extra) => ATHR.fill(text, C(), extra);
    const v = () => {
        if (!S.ctx) {
            S.ctx = V.ctx({
                cfg: S.config,
                products: S.products,
                categories: S.categories,
                reviews: S.reviews,
                country: S.country,
                cartQty
            });
        }
        return S.ctx;
    };

    // ---------- toast ----------
    let toastTimer;
    function toast(message) {
        const el = $("#toast");
        el.textContent = message;
        el.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
    }

    async function copyText(text, label = "تم النسخ") {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const area = document.createElement("textarea");
            area.value = text;
            area.setAttribute("readonly", "");
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();
            try { document.execCommand("copy"); } catch { /* ignore */ }
            area.remove();
        }
        toast(label);
    }

    // =====================================================
    // API (بدون مكتبة، أخف وأسرع على الجوال)
    // =====================================================

    async function rest(path, { method = "GET", body, prefer, timeout = 12000 } = {}) {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), timeout) : null;
        try {
            const headers = { apikey: API.key, Accept: "application/json" };
            if (body !== undefined) headers["Content-Type"] = "application/json";
            if (prefer) headers.Prefer = prefer;
            const res = await fetch(`${API.url}/rest/v1/${path}`, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: ctrl ? ctrl.signal : undefined
            });
            const text = await res.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch { data = null; }
            if (!res.ok) {
                const error = new Error((data && data.message) || `HTTP ${res.status}`);
                error.code = data && data.code;
                error.status = res.status;
                throw error;
            }
            return data;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    function sendBeacon(k) {
        try {
            fetch(`${API.url}/rest/v1/rpc/track`, {
                method: "POST",
                headers: { apikey: API.key, "Content-Type": "application/json" },
                body: JSON.stringify({ k }),
                keepalive: true
            }).catch(() => {});
        } catch { /* ignore */ }
    }

    // =====================================================
    // CART
    // =====================================================

    function getCart() {
        const cart = storage.get(KEYS.cart, null);
        if (!cart || !Array.isArray(cart.items)) return { items: [], updated: 0 };
        return cart;
    }

    function cartItems() {
        const ids = new Set(S.products.map((p) => p.id));
        return getCart().items.filter((item) => !S.loaded || ids.has(item.id));
    }

    function saveCart(items) {
        storage.set(KEYS.cart, { items, updated: Date.now() });
        updateCartUI();
    }

    function cartQty(id) {
        const item = getCart().items.find((i) => i.id === id);
        return item ? item.qty : 0;
    }

    function maxQty() {
        return Math.max(1, Math.min(99, Number(C().order.max_qty) || 10));
    }

    function setQty(id, qty, { silent = false } = {}) {
        const product = productById(id);
        const items = getCart().items.filter((i) => i.id !== id || qty > 0);
        const limit = maxQty();
        const clamped = Math.min(qty, limit);
        const existing = items.find((i) => i.id === id);
        if (clamped > 0) {
            if (product && product.is_available === false) {
                toast(C().texts.sold_out);
                return false;
            }
            if (existing) existing.qty = clamped;
            else items.push({ id, qty: clamped });
        }
        saveCart(items);
        if (!silent && qty > limit) toast(`أقصى كمية من المنتج الواحد ${limit}`);
        return true;
    }

    function addToCart(id, qty = 1) {
        const product = productById(id);
        if (!product) return false;
        if (product.is_available === false) {
            toast(C().texts.sold_out);
            return false;
        }
        const current = cartQty(id);
        if (current >= maxQty()) {
            toast(`أقصى كمية من المنتج الواحد ${maxQty()}`);
            return false;
        }
        setQty(id, current + qty, { silent: true });
        track("add");
        const count = $("#cartCount");
        count.classList.remove("bump");
        void count.offsetWidth;
        count.classList.add("bump");
        return true;
    }

    function computeCart() {
        return ATHR.computeCart(cartItems(), S.products, C(), S.country);
    }

    function updateCartUI() {
        const totals = computeCart();
        const count = $("#cartCount");
        count.textContent = totals.count;
        count.hidden = totals.count === 0;
        if (!S.loaded) return;

        $$("[data-action-for]").forEach((el) => {
            const product = productById(el.dataset.actionFor);
            if (product) el.innerHTML = V.cardAction(v(), product);
        });
        renderBars();
        const name = S.route.name;
        if (name === "cart") renderCart({ keep: true });
        if (name === "checkout") updateCheckoutSummary();
        if (name === "product") renderBuyBar();
        if (!$("#sheet").hidden && $("#sheet").dataset.kind === "added") openAdded(S.lastAdded, { refresh: true });
    }

    // =====================================================
    // COUNTRY
    // =====================================================

    function guessCountry() {
        const saved = storage.get(KEYS.country, null);
        if (saved) return saved;
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            return { "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Kuwait": "KW", "Asia/Qatar": "QA", "Asia/Bahrain": "BH" }[tz] || "OM";
        } catch {
            return "OM";
        }
    }

    function setCountry(code, { silent = false } = {}) {
        const c = ATHR.countries(C()).find((x) => x.code === code && x.enabled);
        if (!c) return;
        S.country = c.code;
        S.ctx = null;
        storage.set(KEYS.country, c.code);
        renderChrome();
        if (!silent) {
            render({ scroll: "keep" });
            toast(c.code === "OM" ? "الأسعار بالريال العماني" : `الأسعار الآن ب${c.currency_def} تقريبًا`);
        }
    }

    // =====================================================
    // DATA
    // =====================================================

    function productById(id) {
        return S.products.find((p) => p.id === id);
    }

    const nfc = (s) => {
        try { return String(s || "").normalize("NFC"); } catch { return String(s || ""); }
    };

    function findProduct(slug) {
        const key = nfc(slug);
        return S.products.find((p) => nfc(p.slug) === key) || S.products.find((p) => p.id === key) || null;
    }

    function findCategory(slug) {
        const key = nfc(slug);
        return S.categories.find((c) => nfc(c.slug) === key) || null;
    }

    function colorById(id) {
        return (C().colors || []).find((c) => c.id === id);
    }

    function applyData(data, { fromCache = false } = {}) {
        S.config = ATHR.fullConfig(data.config || {});
        S.categories = (data.categories || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const sorted = (data.products || []).filter((p) => p.is_visible !== false)
            .slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        S.products = ATHR.assignSlugs(sorted, S.config);
        S.reviews = data.reviews || [];
        S.loaded = true;
        S.ctx = null;
        if (!ATHR.countries(S.config).some((c) => c.code === S.country && c.enabled)) S.country = ATHR.BASE_COUNTRY;
        applyTheme();
        renderChrome();
        render({ scroll: "keep", hydrate: true, fromCache });
        readyResolve();
    }

    async function fetchData() {
        const productCols = "id,name,slug,price,old_price,category_id,image_url,thumb_url,is_available,is_visible,is_best_seller,is_new_arrival,description,color_id,sort_order,video_url,weight_g,created_at";
        const [settings, categories, products, reviews] = await Promise.all([
            rest("store_settings?select=config&id=eq.1"),
            rest("categories?select=id,name,slug,sort_order,image_url,description&order=sort_order.asc"),
            rest(`products?select=${productCols}&is_visible=eq.true&order=sort_order.asc`),
            rest("reviews?select=id,product_id,name,rating,text,created_at&status=eq.approved&order=created_at.desc&limit=300").catch(() => [])
        ]);
        return {
            config: (settings && settings[0] && settings[0].config) || {},
            categories: categories || [],
            products: products || [],
            reviews: reviews || []
        };
    }

    async function loadData() {
        const cached = storage.get(KEYS.cache, null);
        if (cached && cached.products) applyData(cached, { fromCache: true });
        try {
            const fresh = await fetchData();
            storage.set(KEYS.cache, fresh);
            if (!S.preview) applyData(fresh);
        } catch (error) {
            console.error("Store load error:", error);
            if (!cached && !$("#view").dataset.prerendered) {
                $("#view").innerHTML = `<div class="wrap empty"><p>تعذر تحميل المتجر. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.</p><button class="btn btn-primary" type="button" onclick="location.reload()">إعادة المحاولة</button></div>`;
            }
        }
    }

    async function loadMedia(productId) {
        if (S.media.has(productId)) return S.media.get(productId);
        let rows = [];
        try {
            rows = await rest(`product_media?select=media_type,media_url,sort_order&product_id=eq.${encodeURIComponent(productId)}&order=sort_order.asc`) || [];
        } catch {
            rows = [];
        }
        S.media.set(productId, rows);
        return rows;
    }

    // =====================================================
    // THEME
    // =====================================================

    // لوحة التحكم تعتمد على هذا الصنف للوضع الداكن
    const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    function syncDark() {
        const mode = document.documentElement.dataset.mode;
        document.documentElement.classList.toggle("theme-dark", mode === "dark" || (mode === "auto" && Boolean(darkQuery && darkQuery.matches)));
    }
    if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", syncDark);

    function applyTheme() {
        const cfg = C();
        const root = document.documentElement;
        const vars = ATHR.themeVars(cfg);
        const style = $("#themeVars");
        if (style && style.textContent !== vars) style.textContent = vars;
        root.dataset.mode = ATHR.themeMode(cfg);
        syncDark();
        root.classList.toggle("r-sharp", cfg.theme.radius === "sharp");
        root.classList.toggle("r-round", cfg.theme.radius === "round");
        const href = ATHR.fontHref(cfg);
        const link = $("#fontLink");
        if (link && href && link.getAttribute("href") !== href) link.setAttribute("href", href);
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", ATHR.themeColors(cfg).primary);
    }

    // =====================================================
    // CHROME: header, bars, footer, float
    // =====================================================

    function renderChrome() {
        const cfg = C();
        const brand = $("#brand");
        const brandHTML = V.brand(v());
        if (brand.dataset.html !== brandHTML) {
            brand.innerHTML = brandHTML;
            brand.dataset.html = brandHTML;
        }
        brand.setAttribute("aria-label", `${cfg.name || "المتجر"} — الرئيسية`);

        const showSearch = cfg.theme.show_search !== false;
        $("#searchBox").hidden = !showSearch;
        $(".top-row").classList.toggle("no-search", !showSearch);
        $("#searchInput").placeholder = cfg.texts.search_placeholder || "";
        $("#menuBtn").hidden = !(cfg.contact.menu_show || S.isAdmin);

        const multi = ATHR.countries(cfg).filter((c) => c.enabled).length > 1;
        const cur = CC();
        $("#curBtn").hidden = !multi;
        $("#curFlag").textContent = cur.flag;
        $("#curSym").textContent = cur.symbol;
        $("#curBtn").setAttribute("aria-label", `الدولة والعملة: ${cur.name}، ${cur.currency_name}`);

        const float = $("#waFloat");
        float.hidden = !(cfg.contact.wa_float && ATHR.isValidWhatsapp(cfg.order.whatsapp));
        float.href = ATHR.waLink(cfg.order.whatsapp, fill(cfg.contact.wa_float_msg));

        const footer = V.footer(v());
        const f = $("#footer");
        if (f.dataset.html !== footer) {
            f.innerHTML = footer;
            f.dataset.html = footer;
        }
        renderBars();
        updateCartUI();
    }

    function renderBars() {
        const cfg = C();
        const parts = [];
        if (S.preview) {
            parts.push(`<div class="preview-flag">أنت تشاهد المسودة قبل النشر <button type="button" data-exit-preview>رجوع للوحة</button></div>`);
        }
        if (cfg.texts.announce_show && cfg.texts.announce_text) {
            parts.push(`<div class="bar bar-announce">${esc(fill(cfg.texts.announce_text))}</div>`);
        }
        const totals = computeCart();
        const freeMin = Number(cfg.order.free_min) || 0;
        const routeName = S.route.name;
        if (cfg.sales.free_bar_show && totals.freeEligible && freeMin > 0 && !["done", "checkout"].includes(routeName)) {
            let text;
            let pct = 0;
            let done = false;
            if (totals.count === 0) {
                text = fill(cfg.sales.free_before);
            } else if (totals.freeShipping) {
                text = fill(cfg.sales.free_done);
                pct = 100;
                done = true;
            } else {
                text = fill(cfg.sales.free_during, { left: money(totals.leftForFree) });
                pct = Math.min(100, (totals.afterDiscount / freeMin) * 100);
            }
            parts.push(`<div class="bar bar-ship${done ? " done" : ""}"><div>${esc(text)}</div>${totals.count ? `<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${pct}%"></span></div>` : ""}</div>`);
        }
        if (cfg.sales.abandoned_show && S.returningGap >= 10 * 60 * 1000 && totals.count > 0
            && !session.get(KEYS.cartBarClosed) && !["cart", "checkout", "done"].includes(routeName)) {
            const n = totals.count === 1 ? "منتج واحد" : totals.count === 2 ? "منتجان" : `${totals.count} منتجات`;
            parts.push(`<div class="bar bar-cart"><span>${esc(fill(cfg.sales.abandoned_text, { n }))}</span><a href="${BASE}cart/">أكمل الطلب</a><button type="button" data-close-cartbar aria-label="إخفاء">×</button></div>`);
        }
        const html = parts.join("");
        const bars = $("#bars");
        if (bars.innerHTML !== html) bars.innerHTML = html;
    }

    // =====================================================
    // ROUTER (روابط حقيقية بدون إعادة تحميل)
    // =====================================================

    function parseRoute(loc = location) {
        let path = loc.pathname;
        try { path = decodeURIComponent(path); } catch { /* keep raw */ }
        let rel = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\//, "");
        rel = rel.replace(/(^|\/)index\.html$/, "").replace(/^\/+|\/+$/g, "");
        const params = new URLSearchParams(loc.search);
        const [a, b] = rel.split("/");
        switch (a || "") {
            case "": return { name: "home" };
            case "p": return { name: "product", slug: b || "" };
            case "c": return { name: "category", slug: b || "" };
            case "cart":
            case "checkout":
            case "shipping":
                return { name: a };
            case "done": return { name: "done", no: params.get("no") || "" };
            case "review": return { name: "review", p: params.get("p") || "", o: params.get("o") || "" };
            case "search": return { name: "search", q: params.get("q") || "" };
            default: return { name: "notfound" };
        }
    }

    // روابط الإصدار السابق (#/p/..) تتحول للروابط الجديدة
    function convertLegacyHash() {
        const h = location.hash;
        if (!h.startsWith("#/")) return;
        let rest = h.slice(2);
        try { rest = decodeURIComponent(rest); } catch { /* keep */ }
        const [a, b] = rest.split("/");
        let target = BASE;
        if (a === "p" && b) target = `${BASE}p/${encodeURIComponent(b)}/`;
        else if (a === "c" && b) target = `${BASE}c/${encodeURIComponent(b)}/`;
        else if (a === "cart") target = `${BASE}cart/`;
        else if (a === "checkout") target = `${BASE}checkout/`;
        else if (a === "done" && b) target = `${BASE}done/?no=${encodeURIComponent(b)}`;
        else if (a === "search") target = `${BASE}search/`;
        else if (a === "reviews") target = `${BASE}#reviews`;
        history.replaceState(null, "", target);
    }

    function saveScroll() {
        try {
            history.replaceState({ ...(history.state || {}), scroll: window.scrollY }, "");
        } catch { /* ignore */ }
    }

    function navigate(path, { replace = false } = {}) {
        closeSheet();
        if (!replace) saveScroll();
        const url = new URL(path, location.href);
        history[replace ? "replaceState" : "pushState"]({}, "", url.pathname + url.search + url.hash);
        render({ scroll: replace ? "keep" : url.hash ? "hash" : "top" });
    }

    function internalUrl(a) {
        if (!a || a.target || a.hasAttribute("download") || a.dataset.native !== undefined) return null;
        const href = a.getAttribute("href");
        if (!href || href.startsWith("#") || /^(mailto|tel|https?:\/\/wa\.me)/i.test(href)) return null;
        let url;
        try { url = new URL(a.href, location.href); } catch { return null; }
        if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return null;
        if (/\.[a-z0-9]{2,5}$/i.test(url.pathname) && !/\/index\.html$/i.test(url.pathname)) return null;
        return url;
    }

    let lastRouteKey = "";

    function render({ scroll = "top", hydrate = false } = {}) {
        const route = parseRoute();
        S.route = route;
        const owner = location.hash === "#admin" || location.hash === "#orders";
        if (owner) openOwnerArea(location.hash.slice(1));
        if (!S.loaded) return;

        const key = JSON.stringify(route);
        const changed = key !== lastRouteKey;
        lastRouteKey = key;

        const view = $("#view");
        view.dataset.route = route.name;
        delete view.dataset.prerendered;

        switch (route.name) {
            case "home": renderHome(); break;
            case "category": renderCategory(route); break;
            case "product": renderProduct(route, { changed }); break;
            case "search": renderSearch(route); break;
            case "shipping": view.innerHTML = V.shipping(v()); break;
            case "cart": renderCart(); break;
            case "checkout": renderCheckout(); break;
            case "done": renderDone(route.no); break;
            case "review": renderReview(route); break;
            default: renderNotFound();
        }

        document.title = V.titles(v(), { ...route, product: route.name === "product" ? findProduct(route.slug) : null, cat: route.name === "category" ? findCategory(route.slug) : null });
        renderBars();
        renderBuyBar();
        const float = $("#waFloat");
        float.classList.toggle("off", ["product", "cart", "checkout", "done", "review"].includes(route.name));
        const input = $("#searchInput");
        if (route.name === "search" && document.activeElement !== input) input.value = route.q;
        if (route.name !== "search" && !hydrate && document.activeElement !== input) input.value = "";
        startDeferredMedia();

        if (!hydrate && changed) {
            if (scroll === "top") window.scrollTo(0, 0);
            else if (scroll === "restore") window.scrollTo(0, (history.state && history.state.scroll) || 0);
            else if (scroll === "hash" && location.hash.length > 1) {
                const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
                if (target) setTimeout(() => target.scrollIntoView({ block: "start" }), 20);
            }
            if (scroll !== "keep") $("#view").focus({ preventScroll: true });
        }

        if (route.name === "product") track("view");
        if (route.name === "checkout" && computeCart().count) track("checkout");
    }

    window.addEventListener("popstate", () => {
        closeSheet();
        render({ scroll: "restore" });
    });

    window.addEventListener("hashchange", () => {
        if (location.hash === "#admin" || location.hash === "#orders") openOwnerArea(location.hash.slice(1));
        else if (location.hash.startsWith("#/")) {
            convertLegacyHash();
            render();
        }
    });

    // الصور الكبيرة والفيديو بعد ظهور النصوص
    function startDeferredMedia() {
        const run = () => {
            $$("[data-deferred-src]").forEach((el) => {
                el.src = el.dataset.deferredSrc;
                el.removeAttribute("data-deferred-src");
                if (el.tagName === "VIDEO") {
                    el.load();
                    const play = el.play();
                    if (play && play.catch) play.catch(() => {});
                }
            });
        };
        if (document.readyState === "complete") (window.requestIdleCallback || ((fn) => setTimeout(fn, 120)))(run);
        else window.addEventListener("load", () => setTimeout(run, 60), { once: true });
    }

    // =====================================================
    // PAGES: home, category, search, not found
    // =====================================================

    function renderHome() {
        $("#view").innerHTML = V.home(v(), { sort: S.sort });
    }

    function renderCategory(route) {
        const cat = findCategory(route.slug);
        if (!cat) return renderNotFound();
        $("#view").innerHTML = V.category(v(), cat, { sort: S.sort });
        const on = $(".tile.on");
        if (on && on.scrollIntoView) on.scrollIntoView({ inline: "center", block: "nearest" });
    }

    function renderSearch(route) {
        $("#view").innerHTML = V.search(v(), route.q, { sort: S.sort });
    }

    function renderNotFound() {
        const best = V.bestSellers(v());
        $("#view").innerHTML = `<div class="wrap empty page"><h1>الصفحة غير موجودة</h1><p>ربما تغيّر رابط المنتج أو لم يعد متوفرًا. تصفّح أقسامنا:</p><a class="btn btn-primary" href="${BASE}">العودة للمتجر</a></div>
            ${V.tiles(v())}
            ${best.length ? V.rail(v(), { id: "best", title: C().sales.best_title, items: best }) : ""}`;
    }

    function rerenderGrid() {
        const box = $("#gridBox");
        if (!box) return;
        const r = S.route;
        const vv = v();
        let list = [];
        if (r.name === "home") list = V.listings(vv, vv.products);
        else if (r.name === "category") {
            const cat = findCategory(r.slug);
            if (cat) list = V.listings(vv, vv.products.filter((p) => p.category_id === cat.id));
        } else if (r.name === "search") list = V.searchResults(vv, r.q);
        box.innerHTML = V.grid(vv, V.sortList(list, S.sort));
    }

    // =====================================================
    // PRODUCT PAGE
    // =====================================================

    let gallery = { items: [], index: 0, product: null };

    function renderProduct(route, { changed }) {
        const p = findProduct(route.slug);
        if (!p) return renderNotFound();
        const canonical = ATHR.url.product(p);
        if (nfc(route.slug) !== nfc(p.slug) && p.slug) history.replaceState(history.state, "", canonical + location.hash);
        $("#view").innerHTML = V.product(v(), p);

        const keepIndex = !changed && gallery.product === p.id;
        gallery = { items: p.image_url ? [{ type: "image", url: p.image_url }] : [], index: keepIndex ? gallery.index : 0, product: p.id };
        renderGallery(p);
        loadMedia(p.id).then((rows) => {
            if (S.route.name !== "product" || findProduct(S.route.slug) !== p) return;
            const images = rows.filter((r) => r.media_type === "image").slice(0, 5).map((r) => ({ type: "image", url: r.media_url }));
            const video = rows.find((r) => r.media_type === "video");
            gallery.items = [...(p.image_url ? [{ type: "image", url: p.image_url }] : []), ...images, ...(video ? [{ type: "video", url: video.media_url }] : [])];
            renderGallery(p);
        });
        watchBuyBox();
    }

    function renderGallery(p) {
        const el = $("#gallery");
        if (!el) return;
        const items = gallery.items;
        if (items.length < 2) {
            if (!el.querySelector(".stage img") && items[0]) el.innerHTML = V.galleryStage(v(), p);
            return;
        }
        const i = Math.max(0, Math.min(gallery.index, items.length - 1));
        const item = items[i];
        const label = V.label(v(), p);
        const arrow = (dir) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir === "prev" ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}"/></svg>`;
        el.innerHTML = `
            <div class="stage" id="stage">
                ${item.type === "video"
                    ? `<video src="${esc(item.url)}" controls playsinline autoplay muted loop></video>`
                    : `<img src="${esc(ATHR.thumb(item.url, "m"))}" alt="${esc(label)}${i ? ` (${i + 1})` : ""}" width="800" height="1000">`}
                <button class="stage-nav prev" type="button" data-gal="-1" aria-label="السابق">${arrow("prev")}</button>
                <button class="stage-nav next" type="button" data-gal="1" aria-label="التالي">${arrow("next")}</button>
                <span class="stage-count">${i + 1} من ${items.length}</span>
            </div>
            <div class="thumbs" role="tablist" aria-label="صور المنتج">
                ${items.map((it, n) => `<button type="button" data-gal-to="${n}" aria-current="${n === i}" aria-label="${it.type === "video" ? "فيديو المنتج" : `صورة ${n + 1}`}">
                    ${it.type === "video" ? `${p.image_url ? `<img src="${esc(V.img(p))}" alt="">` : ""}<span class="play">▶</span>` : `<img src="${esc(ATHR.thumb(it.url, "s"))}" alt="" loading="lazy">`}
                </button>`).join("")}
            </div>`;
        const stage = $("#stage");
        let startX = null;
        stage.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
        stage.addEventListener("touchend", (e) => {
            if (startX === null) return;
            const dx = e.changedTouches[0].clientX - startX;
            startX = null;
            if (Math.abs(dx) > 40) moveGallery(dx > 0 ? 1 : -1);
        });
    }

    function moveGallery(step) {
        const n = gallery.items.length;
        if (n < 2) return;
        gallery.index = (gallery.index + step + n) % n;
        const p = productById(gallery.product);
        if (p) renderGallery(p);
    }

    // شريط الشراء الثابت أسفل الشاشة (الجوال)
    let buyObserver = null;
    let buyBoxVisible = true;

    function watchBuyBox() {
        if (buyObserver) buyObserver.disconnect();
        const box = $("#buyBox");
        buyBoxVisible = true;
        if (!box || typeof IntersectionObserver === "undefined") return;
        buyObserver = new IntersectionObserver((entries) => {
            buyBoxVisible = entries[0].isIntersecting;
            renderBuyBar();
        }, { rootMargin: "0px 0px -40px 0px" });
        buyObserver.observe(box);
    }

    function renderBuyBar() {
        const bar = $("#buyBar");
        const r = S.route.name;
        let html = "";
        if (S.loaded && r === "product") {
            const p = findProduct(S.route.slug);
            if (p && p.is_available !== false && !buyBoxVisible) {
                const inCart = cartQty(p.id);
                html = `<div class="buybar-inner">
                    <div class="bb-info"><b>${local(p.price)}</b><small>${esc(V.label(v(), p))}</small></div>
                    ${inCart
                        ? `<a class="btn btn-primary" href="${BASE}checkout/">إتمام الطلب (${computeCart().count})</a>`
                        : `<button class="btn btn-primary" type="button" data-pdp-add="${esc(p.id)}">${esc(C().texts.add_to_cart)}</button>`}
                </div>`;
            }
        } else if (S.loaded && r === "cart") {
            const t = computeCart();
            if (t.count) html = `<div class="buybar-inner"><div class="bb-info"><b>${money(t.afterDiscount)}</b><small>${ATHR.piecesText(t.count)}</small></div><a class="btn btn-primary" href="${BASE}checkout/">متابعة الطلب</a></div>`;
        } else if (S.loaded && r === "checkout") {
            if (computeCart().count) {
                const t = checkoutTotals();
                html = `<div class="buybar-inner"><div class="bb-info"><b>${money(t.total)}</b><small>الإجمالي مع التوصيل</small></div><button class="btn btn-primary" type="submit" form="checkoutForm">تأكيد الطلب</button></div>`;
            }
        }
        if (bar.innerHTML !== html) bar.innerHTML = html;
        bar.hidden = !html;
        document.body.classList.toggle("has-buybar", Boolean(html));
    }

    // =====================================================
    // «أُضيف إلى سلتك» + الطقم + اقتراحات (رفع قيمة الطلب)
    // =====================================================

    function miniItem(p, { action = "add" } = {}) {
        return `<div class="mini">
            <a href="${ATHR.url.product(p)}">${V.img(p) ? `<img src="${esc(V.img(p))}" alt="" width="64" height="80" loading="lazy">` : ""}</a>
            <div class="mini-info"><a href="${ATHR.url.product(p)}">${esc(V.label(v(), p))}</a><b>${local(p.price)}</b></div>
            ${action === "add" ? `<button class="btn btn-ghost btn-sm" type="button" data-add-mini="${esc(p.id)}" aria-label="أضف ${esc(p.name)}">+ أضف</button>` : ""}
        </div>`;
    }

    function progressHTML(totals) {
        const cfg = C();
        const parts = [];
        const freeMin = Number(cfg.order.free_min) || 0;
        if (totals.freeEligible && freeMin > 0) {
            const pct = Math.min(100, (totals.afterDiscount / freeMin) * 100);
            parts.push(`<div class="progress${totals.freeShipping ? " done" : ""}">
                <span>${esc(totals.freeShipping ? fill(cfg.sales.free_done) : fill(cfg.sales.free_during, { left: money(totals.leftForFree) }))}</span>
                <div class="meter"><span style="width:${pct}%"></span></div>
            </div>`);
        }
        const vol = totals.volume;
        if (vol && vol.tiers.length) {
            if (vol.next) {
                const need = vol.next.min - totals.count;
                parts.push(`<p class="vol-hint">${V.icon.tag}<span>${vol.tier && totals.discountType === "volume" ? `خصمك الآن ${vol.tier.pct}%. ` : ""}أضف ${ATHR.piecesText(need)} ووفّر <b>${vol.next.pct}%</b> على طلبك كله</span></p>`);
            } else if (vol.tier && totals.discountType === "volume") {
                parts.push(`<p class="vol-hint ok">${V.icon.check}<span>حصلت على خصم الكمية ${vol.tier.pct}%</span></p>`);
            }
        }
        return parts.join("");
    }

    function openAdded(ids, { refresh = false } = {}) {
        const cfg = C();
        const vv = v();
        S.lastAdded = ids;
        if (!cfg.sales.upsell_show) {
            toast("أُضيف إلى السلة");
            return;
        }
        const added = ids.map(productById).filter(Boolean);
        if (!added.length) return;
        const totals = computeCart();
        const inCart = new Set(cartItems().map((i) => i.id));
        const offer = V.validBundles(vv).find((b) => ids.includes(b.a) && !inCart.has(b.b));
        const suggestions = V.relatedFor(vv, Array.from(inCart), 8)
            .filter((p) => !inCart.has(p.id) && !(offer && p.id === offer.b))
            .slice(0, 3);
        const offerHTML = offer ? (() => {
            const t = productById(offer.b);
            return `<div class="added-offer">
                <b>أكمل الطقم ووفّر ${Number(offer.pct)}%</b>
                ${miniItem(t, { action: "none" })}
                <button class="btn btn-primary btn-sm" type="button" data-add-mini="${esc(t.id)}">أضف بخصم ${Number(offer.pct)}%</button>
            </div>`;
        })() : "";
        const html = `
            <div class="sheet-head">
                <h2>${V.icon.check} ${ids.length > 1 ? "أُضيف الطقم إلى سلتك" : "أُضيف إلى سلتك"}</h2>
                <button class="close" type="button" data-close-sheet aria-label="إغلاق">×</button>
            </div>
            <div class="added-items">${added.map((p) => miniItem(p, { action: "none" })).join("")}</div>
            ${progressHTML(totals)}
            ${offerHTML}
            ${suggestions.length ? `<h3 class="added-title">${esc(cfg.sales.related_title || "قد يعجبك أيضاً")}</h3><div class="added-list">${suggestions.map((p) => miniItem(p)).join("")}</div>` : ""}
            <div class="added-actions">
                <a class="btn btn-primary btn-block" href="${BASE}checkout/">إتمام الطلب · ${money(totals.afterDiscount)}</a>
                <a class="btn btn-ghost btn-block" href="${BASE}cart/">عرض السلة (${totals.count})</a>
                <button class="link-btn" type="button" data-close-sheet>مواصلة التسوق</button>
            </div>`;
        if (refresh) {
            const panel = $("#sheet .sheet-panel");
            if (panel) {
                const top = panel.scrollTop;
                panel.innerHTML = html;
                panel.scrollTop = top;
                return;
            }
        }
        openSheet(html, { modal: true, label: "أُضيف إلى السلة", kind: "added" });
    }

    // =====================================================
    // WHATSAPP MESSAGES
    // =====================================================

    function productLines(lines) {
        return lines.map((l) => `• ${ATHR.productLabel(l.product, C())} × ${l.qty} = ${money(l.total)}`);
    }

    function quickOrderMessage(lines, totals) {
        const cfg = C();
        const no = ATHR.newOrderNo();
        const when = ATHR.muscatParts();
        const c = CC();
        const out = [fill(cfg.texts.wa_first_line), `رقم الطلب: ${no}`, `اليوم: ${when.day}`, `التاريخ: ${when.date}`, `الوقت: ${when.time}`];
        if (!isBase()) out.push(`الدولة: ${c.flag} ${c.name}`);
        out.push("", "المنتجات:", ...productLines(lines));
        if (totals.discount > 0) out.push(`${totals.discountLabel}: -${money(totals.discount)}`);
        out.push(`الإجمالي: ${money(totals.afterDiscount)} (بدون التوصيل)${approx(totals.afterDiscount)}`);
        out.push("", isBase() ? "اسمي ومحافظتي وولايتي وعنواني:" : "اسمي ومدينتي وعنواني:");
        return out.join("\n");
    }

    function quickOrder(lines) {
        const cfg = C();
        const totals = ATHR.computeCart(lines.map((l) => ({ id: l.product.id, qty: l.qty })), S.products, cfg, S.country);
        window.open(ATHR.waLink(cfg.order.whatsapp, quickOrderMessage(totals.lines, totals)), "_blank", "noopener");
    }

    function orderMessage(order) {
        const cfg = C();
        const when = ATHR.muscatParts(order.ordered_at);
        const c = ATHR.country(cfg, order.country);
        const isOm = c.code === "OM";
        const out = [
            fill(cfg.texts.wa_first_line),
            `رقم الطلب: ${order.order_no}`,
            `اليوم: ${when.day}`,
            `التاريخ: ${when.date}`,
            `الوقت: ${when.time}`,
            "",
            `الاسم: ${order.customer_name}`,
            `الهاتف: ${isOm ? order.phone : `+${order.phone}`}`,
            `الدولة: ${c.flag} ${c.name}`,
            `${isOm ? "المحافظة" : "المدينة"}: ${order.governorate}`
        ];
        if (order.wilaya) out.push(`الولاية: ${order.wilaya}`);
        out.push(order.delivery_type === "office" ? `المكتب: ${order.office}` : `العنوان: ${order.address}`);
        if (order.notes) out.push(`الملاحظات: ${order.notes}`);
        out.push(`طريقة التوصيل: ${order.delivery_name}`);
        if (order.gift) {
            out.push("🎁 الطلب هدية");
            if (order.gift_message) out.push(`رسالة الهدية: ${order.gift_message}`);
        }
        out.push("", "المنتجات:");
        order.items.forEach((it) => out.push(`• ${it.label} × ${it.qty} = ${money(it.total)}`));
        if (order.discount > 0) out.push(`${order.discount_label || "الخصم"}: -${money(order.discount)}`);
        out.push(`التوصيل: ${order.delivery_price > 0 ? money(order.delivery_price) : "مجاني"}${order.ship_kg ? ` (${order.ship_kg} كيلو تقريبًا)` : ""}`);
        out.push(`الإجمالي: ${money(order.total)}${isOm ? "" : ` (≈ ${ATHR.moneyIn(order.total, cfg, c.code)})`}`);
        out.push(`الدفع: ${order.payment_name}`);
        const last = fill(cfg.texts.wa_last_line || "").trim();
        if (last) out.push("", last);
        return out.join("\n");
    }

    // =====================================================
    // CART PAGE
    // =====================================================

    // منتجات تقرّب العميل من التوصيل المجاني أو الشريحة التالية
    function cartSuggestions(totals) {
        const vv = v();
        const inCart = new Set(totals.lines.map((l) => l.product.id));
        const pool = V.listings(vv, vv.products.filter((p) => p.is_available !== false && !inCart.has(p.id)));
        if (totals.freeEligible && totals.leftForFree > 0) {
            const left = totals.leftForFree;
            const list = pool.slice().sort((a, b) => {
                const da = a.price >= left ? a.price - left : 100 + (left - a.price);
                const db = b.price >= left ? b.price - left : 100 + (left - b.price);
                return da - db || (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0);
            });
            return { title: `أضف ${money(left)} واحصل على توصيل مجاني`, items: list.slice(0, 4) };
        }
        const related = V.relatedFor(vv, Array.from(inCart), 4);
        if (totals.volume && totals.volume.next) {
            return { title: `أضف ${ATHR.piecesText(totals.volume.next.min - totals.count)} ووفّر ${totals.volume.next.pct}%`, items: related };
        }
        return { title: C().sales.related_title, items: related };
    }

    function renderCart({ keep = false } = {}) {
        const cfg = C();
        const totals = computeCart();
        const view = $("#view");
        const top = window.scrollY;

        if (!totals.lines.length) {
            const best = V.bestSellers(v());
            view.innerHTML = `<div class="wrap"><h1 class="page-title">السلة</h1>
                <div class="panel empty"><p>سلتك فارغة. اختر تصميمك وأضفه للسلة.</p><a class="btn btn-primary" href="${BASE}">تصفّح المنتجات</a></div></div>
                ${best.length ? V.rail(v(), { id: "best", title: cfg.sales.best_title, items: best }) : ""}`;
            return;
        }

        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const delivery = ATHR.deliveriesFor(cfg, S.country);
        const c = CC();
        const sug = cfg.sales.related_show ? cartSuggestions(totals) : { items: [] };

        view.innerHTML = `
            <div class="wrap">
                <h1 class="page-title">السلة <small class="muted">(${ATHR.piecesText(totals.count)})</small></h1>
                <div class="layout-2">
                    <div>
                        <div class="panel">
                            ${totals.lines.map((l) => `
                                <div class="cart-line">
                                    <a href="${ATHR.url.product(l.product)}">${V.img(l.product) ? `<img src="${esc(V.img(l.product))}" alt="" width="74" height="92">` : ""}</a>
                                    <div>
                                        <a class="name" href="${ATHR.url.product(l.product)}">${esc(l.product.name)}</a>
                                        <div>${V.colorTag(v(), l.product)}</div>
                                        <div class="muted small">${money(l.product.price)} للقطعة</div>
                                        <div class="cart-line-foot">
                                            <div class="stepper" role="group" aria-label="الكمية">
                                                <button type="button" data-inc="${esc(l.product.id)}" aria-label="زيادة"${l.qty >= maxQty() ? " disabled" : ""}>+</button>
                                                <output>${l.qty}</output>
                                                <button type="button" data-dec="${esc(l.product.id)}" aria-label="إنقاص">−</button>
                                            </div>
                                            <b>${money(l.total)}</b>
                                        </div>
                                        <button class="remove" type="button" data-remove="${esc(l.product.id)}">حذف</button>
                                    </div>
                                </div>`).join("")}
                        </div>
                        ${progressHTML(totals) ? `<div class="panel">${progressHTML(totals)}</div>` : ""}
                        ${totals.savings.length || totals.hints.length ? `<div class="panel">
                            ${totals.savings.map((s) => `<div class="save-line"><span>وفر الطقم: ${esc(s.b.name)} بخصم ${s.pct}%${s.pairs > 1 ? ` × ${s.pairs}` : ""}</span><span>-${money(s.amount)}</span></div>`).join("")}
                            ${totals.hints.map((h) => `<div class="hint"><span>أكمل الطقم ووفّر: «${esc(ATHR.productLabel(h.b, cfg))}» بخصم ${h.pct}%</span><button class="btn btn-primary btn-sm" type="button" data-add-quiet="${esc(h.b.id)}">أضف</button></div>`).join("")}
                        </div>` : ""}
                        ${sug.items.length ? `<div class="panel"><h2>${esc(sug.title)}</h2><div class="added-list">${sug.items.map((p) => miniItem(p).replace("data-add-mini", "data-add-quiet")).join("")}</div></div>` : ""}
                    </div>
                    <aside>
                        <div class="panel">
                            <h2>ملخص الطلب</h2>
                            <div class="rows">
                                <div class="row"><span>المنتجات (${totals.count})</span><span>${money(totals.subtotal)}</span></div>
                                ${totals.discount > 0 ? `<div class="row ok"><span>${esc(totals.discountLabel)}</span><span>-${money(totals.discount)}</span></div>` : ""}
                                <div class="row"><span>التوصيل إلى ${esc(c.flag)} ${esc(c.name)}</span><span class="muted">${totals.freeShipping ? "مجاني" : delivery.length ? "يُحدَّد في الخطوة التالية" : "غير متاح حاليًا"}</span></div>
                                ${totals.freeShipping || !delivery.length ? "" : `<ul class="ship-list">${delivery.map((d) => `<li><span class="muted">${esc(d.name)}</span><span>${esc(V.deliveryPriceLabel(v(), d))}</span></li>`).join("")}</ul>`}
                                <div class="row total"><span>المجموع</span><span>${money(totals.afterDiscount)}</span></div>
                                ${isBase() ? "" : `<div class="row muted"><span>بعملتك تقريبًا</span><span>≈ ${local(totals.afterDiscount)}</span></div>`}
                            </div>
                            <div class="cart-actions">
                                <a class="btn btn-primary btn-block" href="${BASE}checkout/">متابعة الطلب</a>
                                ${cfg.sales.wa_quick && wa ? `<button class="btn btn-wa btn-block" type="button" data-wa-cart>${V.waIcon()}اطلب عبر واتساب</button>` : ""}
                                <a class="link-btn center" href="${BASE}">مواصلة التسوق</a>
                            </div>
                            ${V.trust(v())}
                        </div>
                    </aside>
                </div>
            </div>`;
        if (keep) window.scrollTo(0, top);
        renderBuyBar();
    }

    // =====================================================
    // CHECKOUT
    // =====================================================

    function savedCustomer() {
        return C().sales.remember_customer ? storage.get(KEYS.customer, null) : null;
    }

    function field(name, label, control, help = "") {
        return `<label class="field" data-field="${name}"><span>${label}</span>${control}${help ? `<small>${help}</small>` : ""}<span class="err" data-err="${name}"></span></label>`;
    }

    function wilayaOptions(gov) {
        return (WILAYAS[gov] || []).map((w) => `<option value="${esc(w)}">`).join("");
    }

    function renderCheckout(keep = null) {
        const cfg = C();
        const totals = computeCart();
        if (!totals.lines.length) {
            navigate(`${BASE}cart/`, { replace: true });
            return;
        }
        const saved = keep || savedCustomer() || {};
        const c = CC();
        const isOm = c.code === "OM";
        const rule = ATHR.PHONE_RULES[c.code] || ATHR.PHONE_RULES.OM;
        const delivery = ATHR.deliveriesFor(cfg, c.code);
        const payments = ATHR.paymentsFor(cfg, c.code);
        const pickDelivery = delivery.find((d) => d.id === saved.delivery) || delivery[0];
        const pickPayment = payments.find((p) => p.id === saved.payment) || payments[0];
        const countries = ATHR.countries(cfg).filter((x) => x.enabled);
        const savedPhone = saved.country && saved.country !== c.code ? "" : (saved.phoneLocal || (isOm ? saved.phone : "") || "");

        $("#view").innerHTML = `
            <div class="wrap">
                <h1 class="page-title">إتمام الطلب</h1>
                <details class="sum-mobile">
                    <summary><span>ملخص الطلب (${ATHR.piecesText(totals.count)})</span><b id="sumMobileTotal"></b></summary>
                    <div id="checkoutSummaryM"></div>
                </details>
                <form class="layout-2" id="checkoutForm" novalidate>
                    <div class="form">
                        ${saved.name && !keep ? `<div class="saved-note"><span>عبّأنا بياناتك من طلبك السابق.</span><button class="link-btn" type="button" data-forget-me>مسح بياناتي</button></div>` : ""}
                        <div class="panel form">
                            <h2>بياناتك</h2>
                            ${countries.length > 1 ? field("country", "الدولة", `<select class="input" name="country" id="countrySelect">${countries.map((x) => `<option value="${x.code}"${x.code === c.code ? " selected" : ""}>${x.flag} ${esc(x.name)}</option>`).join("")}</select>`) : ""}
                            ${field("name", "الاسم الكامل", `<input class="input" name="name" autocomplete="name" value="${esc(saved.name || "")}" required>`)}
                            ${field("phone", "رقم الهاتف (واتساب)", `<span class="phone-wrap"><span class="dial" dir="ltr">+${c.dial}</span><input class="input" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" dir="ltr" placeholder="${rule.example}" value="${esc(savedPhone)}" required></span>`, `رقم ${esc(c.name)}: ${rule.hint}`)}
                            ${isOm ? `<div class="two">
                                ${field("gov", "المحافظة", `<select class="input" name="gov" id="govSelect" required><option value="">اختر المحافظة</option>${(cfg.order.governorates || []).filter(Boolean).map((g) => `<option${saved.gov === g ? " selected" : ""}>${esc(g)}</option>`).join("")}</select>`)}
                                ${cfg.order.show_wilaya ? field("wilaya", `الولاية${cfg.order.wilaya_required ? "" : " (اختياري)"}`, `<input class="input" name="wilaya" list="wilayaList" autocomplete="off" value="${esc(saved.wilaya || "")}"><datalist id="wilayaList">${wilayaOptions(saved.gov)}</datalist>`) : ""}
                            </div>` : field("gov", c.code === "AE" ? "الإمارة / المدينة" : "المدينة", `<input class="input" name="gov" autocomplete="address-level2" value="${esc(saved.country === c.code ? saved.gov || "" : "")}" required>`)}
                        </div>
                        <div class="panel form">
                            <h2>طريقة التوصيل</h2>
                            ${delivery.length ? `<div class="choice" role="radiogroup">
                                ${delivery.map((d) => `<label class="option">
                                    <input type="radio" name="delivery" value="${esc(d.id)}"${pickDelivery && pickDelivery.id === d.id ? " checked" : ""}>
                                    <span><b>${esc(d.name)}</b>${d.note ? `<small>${esc(d.note)}</small>` : ""}${d.duration ? `<small>المدة: ${esc(d.duration)}</small>` : ""}</span>
                                    <span class="opt-price" data-ship-price="${esc(d.id)}"></span>
                                </label>`).join("")}
                            </div>` : `<p class="err">التوصيل إلى ${esc(c.name)} غير متاح حاليًا. تواصل معنا عبر واتساب.</p>`}
                            <div id="addressField"></div>
                            ${cfg.sales.gift_enabled ? `<label class="check-line"><input type="checkbox" name="gift" id="giftToggle"${keep && keep.gift ? " checked" : ""}> ${V.icon.gift}<span>هذا الطلب هدية</span></label>
                            <div id="giftBox"${keep && keep.gift ? "" : " hidden"}>${field("gift_message", "رسالة الهدية (اختياري)", `<textarea class="input" name="gift_message" rows="2" maxlength="300" placeholder="مثال: كل عام وأنت بخير يا أحمد">${esc(keep ? keep.gift_message || "" : "")}</textarea>`, "نرفقها مع طلبك للمُهدى إليه.")}</div>` : ""}
                            ${cfg.order.show_notes ? field("notes", "ملاحظات (اختياري)", `<textarea class="input" name="notes" rows="2" maxlength="500">${esc(keep ? keep.notes || "" : "")}</textarea>`) : ""}
                        </div>
                        <div class="panel form">
                            <h2>طريقة الدفع</h2>
                            ${payments.length ? `<div class="choice" role="radiogroup">
                                ${payments.map((p) => `<label class="option">
                                    <input type="radio" name="payment" value="${esc(p.id)}"${pickPayment && pickPayment.id === p.id ? " checked" : ""}>
                                    <span><b>${esc(p.name)}</b>${p.note ? `<small>${esc(fill(p.note))}</small>` : ""}</span>
                                    <span></span>
                                </label>`).join("")}
                            </div>` : `<p class="err">لا توجد طريقة دفع متاحة لـ${esc(c.name)} حاليًا.</p>`}
                            <div id="payExtra"></div>
                        </div>
                    </div>
                    <aside>
                        <div class="panel">
                            <h2>ملخص الطلب</h2>
                            <div id="checkoutSummary"></div>
                            <div class="cart-actions">
                                <button class="btn btn-primary btn-block" type="submit" id="placeOrder"${delivery.length && payments.length ? "" : " disabled"}>تأكيد الطلب</button>
                                <a class="link-btn center" href="${BASE}cart/">رجوع للسلة</a>
                            </div>
                            <div class="err" id="formErr" role="alert"></div>
                            ${V.trust(v())}
                        </div>
                    </aside>
                </form>
            </div>`;

        renderAddressField(saved);
        renderPayExtra();
        updateCheckoutSummary();
    }

    function selectedDelivery() {
        const id = $('input[name="delivery"]:checked')?.value;
        return ATHR.deliveriesFor(C(), S.country).find((d) => d.id === id);
    }

    function selectedPayment() {
        const id = $('input[name="payment"]:checked')?.value;
        return ATHR.paymentsFor(C(), S.country).find((p) => p.id === id);
    }

    function renderAddressField(saved = {}) {
        const box = $("#addressField");
        if (!box) return;
        const d = selectedDelivery();
        const isOffice = d && d.type === "office";
        const current = box.querySelector("textarea, input")?.value;
        const value = current ?? (isOffice ? saved.office : saved.address) ?? "";
        box.innerHTML = isOffice
            ? field("office", "اسم المكتب", `<input class="input" name="office" value="${esc(value)}" placeholder="مثال: مكتب جيناكم - السيب">`)
            : field("address", "العنوان", `<textarea class="input" name="address" rows="2" autocomplete="street-address" placeholder="المنطقة، رقم البيت أو أقرب معلم">${esc(value)}</textarea>`);
    }

    function bankRows(p) {
        const b = p.bank || {};
        const rows = [
            ["الرقم المفعّل للتحويل", b.number],
            ["اسم البنك", b.bank],
            ["اسم صاحب الحساب", b.holder],
            ["رقم الحساب", b.account],
            ["رمز SWIFT", b.swift],
            ["IBAN", b.iban]
        ].filter(([, value]) => value && String(value).trim());
        const hasAccount = [b.number, b.account, b.iban].some((value) => value && String(value).trim());
        if (!hasAccount) return `<p class="muted" style="margin:10px 0 0">نرسل لك بيانات الحساب للتحويل عبر واتساب بعد إرسال الطلب.</p>`;
        return `<div class="bank">${rows.map(([label, value]) => `
            <div class="bank-row"><div><small>${label}</small><strong>${esc(value)}</strong></div>
            <button class="copy" type="button" data-copy="${esc(value)}">نسخ</button></div>`).join("")}</div>`;
    }

    function renderPayExtra() {
        const box = $("#payExtra");
        if (!box) return;
        const p = selectedPayment();
        if (p && p.type === "bank") box.innerHTML = bankRows(p);
        else if (p && p.type === "online") box.innerHTML = `<p class="muted" style="margin:10px 0 0">بعد تأكيد الطلب يظهر لك زر الانتقال لصفحة الدفع.</p>`;
        else box.innerHTML = "";
    }

    function checkoutTotals() {
        const totals = computeCart();
        const d = selectedDelivery() || ATHR.deliveriesFor(C(), S.country)[0];
        const shipping = ATHR.shippingFor(d, totals.lines, C());
        const ship = totals.freeShipping ? 0 : shipping.cost;
        return { ...totals, ship, kg: totals.freeShipping ? 0 : shipping.kg, total: Math.round((totals.afterDiscount + ship) * 1000) / 1000, delivery: d };
    }

    function updateCheckoutSummary() {
        const box = $("#checkoutSummary");
        if (!box) return;
        const t = checkoutTotals();
        if (!t.lines.length) {
            navigate(`${BASE}cart/`, { replace: true });
            return;
        }
        $$("[data-ship-price]").forEach((el) => {
            const d = ATHR.deliveriesFor(C(), S.country).find((x) => x.id === el.dataset.shipPrice);
            const s = ATHR.shippingFor(d, t.lines, C());
            el.textContent = t.freeShipping || !(s.cost > 0) ? "مجاني" : money(s.cost);
        });
        const html = `<div class="rows">
            ${t.lines.map((l) => `<div class="row"><span>${esc(ATHR.productLabel(l.product, C()))} × ${l.qty}</span><span>${money(l.total)}</span></div>`).join("")}
            ${t.discount > 0 ? `<div class="row ok"><span>${esc(t.discountLabel)}</span><span>-${money(t.discount)}</span></div>` : ""}
            <div class="row"><span>التوصيل${t.kg ? ` (${t.kg} كيلو تقريبًا)` : ""}</span><span>${t.ship > 0 ? money(t.ship) : "مجاني"}</span></div>
            <div class="row total"><span>الإجمالي</span><span>${money(t.total)}</span></div>
            ${isBase() ? "" : `<div class="row muted"><span>بعملتك تقريبًا</span><span>≈ ${local(t.total)}</span></div>`}
            ${t.kg ? `<p class="muted small" style="margin:4px 0 0">سعر التوصيل حسب الوزن التقريبي، ونؤكد لك الوزن النهائي قبل الشحن.</p>` : ""}
        </div>`;
        box.innerHTML = html;
        const m = $("#checkoutSummaryM");
        if (m) m.innerHTML = html;
        const mt = $("#sumMobileTotal");
        if (mt) mt.textContent = money(t.total);
        renderBuyBar();
    }

    function validateCheckout(form) {
        const cfg = C();
        const values = Object.fromEntries(new FormData(form).entries());
        const errors = {};
        const isOm = S.country === "OM";
        const name = String(values.name || "").trim();
        const phone = ATHR.parsePhone(values.phone, S.country);
        const d = selectedDelivery();
        const p = selectedPayment();

        if (name.length < 3) errors.name = "اكتب اسمك الكامل (3 أحرف على الأقل).";
        if (!phone.valid) errors.phone = `اكتب رقم ${CC().name} الصحيح: ${phone.rule.hint}.`;
        if (!String(values.gov || "").trim()) errors.gov = isOm ? "اختر المحافظة." : "اكتب المدينة.";
        if (isOm && cfg.order.show_wilaya && cfg.order.wilaya_required && !String(values.wilaya || "").trim()) errors.wilaya = "اكتب الولاية.";
        if (!d) errors.delivery = "اختر طريقة التوصيل.";
        else if (d.type === "office") {
            if (String(values.office || "").trim().length < 3) errors.office = "اكتب اسم المكتب (3 أحرف على الأقل).";
        } else if (String(values.address || "").trim().length < 6) errors.address = "اكتب عنوانك بوضوح (6 أحرف على الأقل).";
        if (!p) errors.payment = "اختر طريقة الدفع.";

        $$("[data-err]", form).forEach((el) => { el.textContent = ""; });
        $$(".field.invalid", form).forEach((el) => el.classList.remove("invalid"));
        Object.entries(errors).forEach(([k, message]) => {
            const err = form.querySelector(`[data-err="${k}"]`);
            if (err) {
                err.textContent = message;
                err.closest(".field")?.classList.add("invalid");
            }
        });
        const keys = Object.keys(errors);
        $("#formErr").textContent = keys.length ? (errors.delivery || errors.payment || "راجع الخانات المظللة بالأحمر.") : "";
        if (keys.length) {
            const first = form.querySelector(".field.invalid .input");
            if (first) {
                first.focus({ preventScroll: true });
                first.scrollIntoView({ block: "center" });
            }
        }
        return keys.length ? null : { values, name, phone, d, p };
    }

    let placing = false;

    async function placeOrder(form) {
        if (placing) return;
        const ok = validateCheckout(form);
        if (!ok) return;
        placing = true;
        const cfg = C();
        const { values, name, phone, d, p } = ok;
        const isOm = S.country === "OM";
        const t = checkoutTotals();
        const button = $("#placeOrder");
        button.disabled = true;
        button.textContent = "جاري تأكيد الطلب...";
        const gift = Boolean(cfg.sales.gift_enabled && values.gift);
        const channel = orderChannel();

        const order = {
            order_no: ATHR.newOrderNo(),
            ordered_at: new Date().toISOString(),
            source: "web",
            country: S.country,
            channel,
            customer_name: name,
            phone: phone.stored,
            governorate: String(values.gov || "").trim(),
            wilaya: isOm && cfg.order.show_wilaya ? String(values.wilaya || "").trim() || null : null,
            address: d.type === "office" ? null : String(values.address || "").trim(),
            office: d.type === "office" ? String(values.office || "").trim() : null,
            notes: cfg.order.show_notes ? String(values.notes || "").trim() || null : null,
            gift,
            gift_message: gift ? String(values.gift_message || "").trim().slice(0, 300) || null : null,
            delivery_name: d.name,
            delivery_type: d.type === "office" ? "office" : "home",
            delivery_price: t.ship,
            payment_name: p.name,
            payment_type: ["cod", "bank", "online", "other"].includes(p.type) ? p.type : "other",
            items: t.lines.map((l) => ({
                id: l.product.id,
                name: l.product.name,
                color: colorById(l.product.color_id)?.name || null,
                label: ATHR.productLabel(l.product, cfg),
                qty: l.qty,
                price: Number(l.product.price),
                total: l.total
            })),
            subtotal: t.subtotal,
            discount: t.discount,
            discount_label: t.discount > 0 ? t.discountLabel : null,
            total: t.total
        };

        let saved = false;
        for (let attempt = 0; attempt < 3 && !saved; attempt++) {
            try {
                await rest("orders", { method: "POST", body: order, prefer: "return=minimal", timeout: 8000 });
                saved = true;
            } catch (error) {
                if (String(error.code) === "23505" || error.status === 409) order.order_no = ATHR.newOrderNo();
                else {
                    console.warn("Order save failed:", error);
                    break;
                }
            }
        }

        if (cfg.sales.remember_customer) {
            storage.set(KEYS.customer, {
                name, country: S.country, phone: isOm ? phone.local : "", phoneLocal: phone.local,
                gov: values.gov, wilaya: values.wilaya || "", address: values.address || "", office: values.office || "",
                delivery: d.id, payment: p.id
            });
        }

        track("order");
        const message = orderMessage({ ...order, ship_kg: t.kg });
        storage.set(KEYS.lastOrder, { order, message, payment: p, saved });
        placing = false;
        history.pushState({}, "", `${BASE}done/?no=${encodeURIComponent(order.order_no)}`);
        storage.set(KEYS.cart, { items: [], updated: Date.now() });
        render({ scroll: "top" });
        updateCartUI();
    }

    // =====================================================
    // THANK YOU
    // =====================================================

    function renderDone(no) {
        const cfg = C();
        const last = storage.get(KEYS.lastOrder, null);
        if (!last || last.order.order_no !== no) {
            $("#view").innerHTML = `<div class="wrap empty page"><p>لا توجد تفاصيل لهذا الطلب على هذا الجهاز.</p><a class="btn btn-primary" href="${BASE}">العودة للمتجر</a></div>`;
            return;
        }
        const { order, message, payment } = last;
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const isOnline = payment && payment.type === "online" && ATHR.isUrl(payment.link);
        const code = order.country || "OM";
        $("#view").innerHTML = `
            <div class="wrap thanks">
                <div class="thanks-head">
                    <div class="check">${V.icon.check}</div>
                    <h1>شكرًا لك، ${esc(order.customer_name.split(" ")[0])}</h1>
                    <span class="muted">رقم طلبك</span>
                    <span class="order-no">${esc(order.order_no)}</span>
                </div>
                <div class="step">
                    <p>الخطوة الأخيرة: ${esc(fill(cfg.texts.thanks_text))}</p>
                    ${wa ? `<a class="btn btn-wa btn-block" href="${esc(ATHR.waLink(cfg.order.whatsapp, message))}" target="_blank" rel="noopener">${V.waIcon()}أرسل الطلب عبر واتساب</a>` : ""}
                    ${isOnline ? `<a class="btn btn-primary btn-block" href="${esc(payment.link)}" target="_blank" rel="noopener">ادفع الآن (${money(order.total)})</a>` : ""}
                    ${payment && payment.type === "bank" ? `<div><p class="muted" style="font-weight:500">حوّل ${money(order.total)}${code === "OM" ? "" : ` (≈ ${ATHR.moneyIn(order.total, cfg, code)})`}:</p>${bankRows(payment)}</div>` : ""}
                </div>
                <div class="panel">
                    <h2>ملخص الطلب</h2>
                    <div class="rows">
                        ${order.items.map((it) => `<div class="row"><span>${esc(it.label)} × ${it.qty}</span><span>${money(it.total)}</span></div>`).join("")}
                        ${order.discount > 0 ? `<div class="row ok"><span>${esc(order.discount_label || "الخصم")}</span><span>-${money(order.discount)}</span></div>` : ""}
                        <div class="row"><span>التوصيل (${esc(order.delivery_name)})</span><span>${order.delivery_price > 0 ? money(order.delivery_price) : "مجاني"}</span></div>
                        <div class="row total"><span>الإجمالي</span><span>${money(order.total)}</span></div>
                        ${code === "OM" ? "" : `<div class="row muted"><span>بعملتك تقريبًا</span><span>≈ ${ATHR.moneyIn(order.total, cfg, code)}</span></div>`}
                        <div class="row"><span class="muted">الدفع</span><span>${esc(order.payment_name)}</span></div>
                        <div class="row"><span class="muted">${order.delivery_type === "office" ? "المكتب" : "العنوان"}</span><span>${esc(order.office || order.address || "")}</span></div>
                        ${order.gift ? `<div class="row"><span class="muted">هدية</span><span>${esc(order.gift_message || "نعم")}</span></div>` : ""}
                    </div>
                </div>
                <a class="btn btn-ghost" href="${BASE}">العودة للمتجر</a>
            </div>`;
    }

    // =====================================================
    // REVIEW PAGE (تقييم العميل، يظهر بعد موافقتك)
    // =====================================================

    function renderReview(route, { sent = false } = {}) {
        const vv = v();
        if (sent) {
            $("#view").innerHTML = `<div class="wrap thanks">
                <div class="thanks-head"><div class="check">${V.icon.check}</div><h1>شكرًا لتقييمك</h1>
                <p class="muted">يظهر تقييمك في المتجر بعد مراجعته. رأيك يساعد غيرك يختار.</p></div>
                <a class="btn btn-primary" href="${BASE}">العودة للمتجر</a></div>`;
            return;
        }
        const chosen = route.p ? findProduct(route.p) : null;
        const saved = storage.get(KEYS.customer, null) || {};
        const options = vv.products.map((p) => `<option value="${esc(p.id)}"${chosen && chosen.id === p.id ? " selected" : ""}>${esc(V.label(vv, p))}</option>`).join("");
        $("#view").innerHTML = `<div class="wrap page review-page">
            <h1>قيّم تجربتك مع ${esc(C().name)}</h1>
            <p class="muted">رأيك يساعد غيرك يختار، ويساعدنا نتحسن. يظهر تقييمك بعد مراجعته.</p>
            ${chosen ? `<div class="review-product">${miniItem(chosen, { action: "none" })}</div>` : ""}
            <form class="panel form" id="reviewForm" novalidate>
                ${field("product", "المنتج (اختياري)", `<select class="input" name="product"><option value="">تقييم عام للمتجر</option>${options}</select>`)}
                <fieldset class="rate-input" aria-label="التقييم">
                    <legend>تقييمك</legend>
                    ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="rate${n}" value="${n}"${n === 5 ? " checked" : ""}><label for="rate${n}" title="${n} من 5">★</label>`).join("")}
                </fieldset>
                ${field("name", "اسمك", `<input class="input" name="name" maxlength="60" value="${esc(saved.name ? saved.name.split(" ")[0] : "")}" autocomplete="given-name">`, "يظهر الاسم الأول فقط.")}
                ${field("text", "رأيك", `<textarea class="input" name="text" rows="4" maxlength="1000" placeholder="كيف كانت الجودة والتغليف والتوصيل؟"></textarea>`)}
                <input type="hidden" name="order_no" value="${esc(/^[A-Z]{1,4}-[0-9A-Z]{3,10}$/.test(route.o) ? route.o : "")}">
                <p class="err" id="reviewErr" role="alert"></p>
                <button class="btn btn-primary btn-block" type="submit" id="reviewSend">إرسال التقييم</button>
            </form>
        </div>`;
    }

    async function sendReview(form) {
        const values = Object.fromEntries(new FormData(form).entries());
        const err = $("#reviewErr");
        const name = String(values.name || "").trim();
        const text = String(values.text || "").trim();
        const rating = Math.max(1, Math.min(5, Number(values.rating) || 5));
        if (name.length < 2) { err.textContent = "اكتب اسمك (حرفان على الأقل)."; return; }
        if (text.length < 3) { err.textContent = "اكتب رأيك في سطر على الأقل."; return; }
        const btn = $("#reviewSend");
        btn.disabled = true;
        btn.textContent = "جاري الإرسال...";
        try {
            await rest("reviews", {
                method: "POST",
                prefer: "return=minimal",
                body: { product_id: values.product || null, order_no: values.order_no || null, name: name.slice(0, 60), rating, text: text.slice(0, 1000), status: "pending" }
            });
            renderReview(S.route, { sent: true });
            window.scrollTo(0, 0);
        } catch (error) {
            console.warn(error);
            err.textContent = "تعذر الإرسال. تأكد من الإنترنت وحاول مرة أخرى.";
            btn.disabled = false;
            btn.textContent = "إرسال التقييم";
        }
    }

    // =====================================================
    // SHEETS: menu, currency
    // =====================================================

    let lastFocus = null;

    function openSheet(html, { modal = false, label = "", kind = "" } = {}) {
        const sheet = $("#sheet");
        lastFocus = document.activeElement;
        sheet.className = `sheet${modal ? " modal" : ""}${kind ? ` sheet-${kind}` : ""}`;
        sheet.dataset.kind = kind;
        sheet.innerHTML = `<div class="sheet-backdrop" data-close-sheet></div><div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
        sheet.hidden = false;
        document.body.classList.add("locked");
        setTimeout(() => sheet.querySelector(".close")?.focus(), 30);
    }

    function closeSheet() {
        const sheet = $("#sheet");
        if (sheet.hidden) return;
        sheet.hidden = true;
        sheet.innerHTML = "";
        sheet.dataset.kind = "";
        document.body.classList.remove("locked");
        if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    }

    function openMenu() {
        const cfg = C();
        const vv = v();
        const cats = vv.categories.filter((c) => vv.counts.get(c.id));
        const totals = computeCart();
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const socials = (cfg.texts.socials || []).filter((s) => s.name && ATHR.isUrl(s.url));
        const items = [];
        const li = (inner) => `<li>${inner}</li>`;
        if (cfg.contact.menu_show || S.isAdmin) {
            items.push(li(`<a href="${BASE}">الرئيسية</a>`));
            if (cfg.theme.show_search !== false) items.push(li(`<a href="${BASE}search/">بحث في المنتجات</a>`));
            items.push(`<li class="menu-label">الأقسام</li>`);
            cats.forEach((c) => items.push(li(`<a class="menu-sub" href="${ATHR.url.category(c)}">${esc(c.name)} <small>${vv.counts.get(c.id)}</small></a>`)));
            items.push(`<li class="menu-label">المتجر</li>`);
            if (V.setCards(vv)) items.push(li(`<a href="${BASE}#sets">${esc(cfg.sales.sets_title)}</a>`));
            if (V.storeReviews(vv)) items.push(li(`<a href="${BASE}#reviews">${esc(cfg.contact.reviews_title)}</a>`));
            items.push(li(`<a href="${BASE}cart/">السلة <small>${totals.count || ""}</small></a>`));
            if (wa) items.push(li(`<a href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(cfg.contact.wa_float_msg)))}" target="_blank" rel="noopener">تواصل معنا عبر واتساب</a>`));
            if (cfg.contact.policy_show) items.push(li(`<a href="${BASE}shipping/">${esc(cfg.contact.policy_title)}</a>`));
            if (ATHR.countries(cfg).filter((c) => c.enabled).length > 1) items.push(li(`<button type="button" data-open-currency>الدولة والعملة <small>${esc(CC().flag)} ${esc(CC().symbol)}</small></button>`));
            items.push(li(`<button type="button" data-share>مشاركة المتجر</button>`));
            items.push(li(`<a href="${BASE}review/" rel="nofollow">${esc(cfg.contact.reviews_share_text || "شاركنا رأيك")}</a>`));
            if (socials.length) {
                items.push(`<li class="menu-label">حساباتنا</li>`);
                socials.forEach((s) => items.push(li(`<a class="menu-sub" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`)));
            }
        }
        if (S.isAdmin) {
            items.push(`<li class="menu-label">لك وحدك</li>`);
            items.push(`<li class="menu-owner"><a href="#admin" data-native>تعديل المتجر</a></li>`);
            items.push(`<li class="menu-owner"><a href="#orders" data-native>دفتر الطلبيات والتقييمات والأداء</a></li>`);
        }
        openSheet(`
            <div class="sheet-head"><h2>${esc(cfg.name)}</h2><button class="close" type="button" data-close-sheet aria-label="إغلاق">×</button></div>
            <ul class="menu-list">${items.join("")}</ul>`, { label: "القائمة" });
    }

    function openCurrency() {
        const cfg = C();
        const countries = ATHR.countries(cfg).filter((c) => c.enabled);
        openSheet(`
            <div class="sheet-head"><h2>الدولة والعملة</h2><button class="close" type="button" data-close-sheet aria-label="إغلاق">×</button></div>
            <p class="muted" style="margin:0 0 10px">اختر دولتك لتظهر الأسعار بعملتها وطرق التوصيل والدفع المتاحة لك. الأسعار تقريبية، ويُحسب الطلب بالريال العماني.</p>
            <ul class="cur-list">
                ${countries.map((c) => `<li><button type="button" data-set-country="${c.code}" aria-pressed="${c.code === S.country}">
                    <span class="cur-flag" aria-hidden="true">${c.flag}</span>
                    <span class="cur-name"><b>${esc(c.name)}</b><small>${esc(c.currency_name)} (${esc(c.symbol)})</small></span>
                    <span class="cur-rate">${c.code === "OM" ? "" : `<bdi>1 ر.ع</bdi> ≈ <bdi>${ATHR.moneyIn(1, cfg, c.code)}</bdi>`}</span>
                </button></li>`).join("")}
            </ul>`, { modal: true, label: "الدولة والعملة" });
    }

    async function shareUrl(url, title, text) {
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                return;
            } catch (error) {
                if (error && error.name === "AbortError") return;
            }
        }
        copyText(url, "نُسخ الرابط، الصقه في واتساب أو إنستغرام");
    }

    // =====================================================
    // TRACKING (عدّاد بسيط للزيارات والطلبات بدون بيانات شخصية)
    // =====================================================

    const AUTH_KEY = (() => {
        try { return `sb-${new URL(API.url).hostname.split(".")[0]}-auth-token`; } catch { return ""; }
    })();

    const ownerDevice = () => {
        try { return Boolean(AUTH_KEY && localStorage.getItem(AUTH_KEY)); } catch { return false; }
    };

    function detectChannel() {
        const params = new URLSearchParams(location.search);
        const src = (params.get("utm_source") || params.get("ref") || params.get("src") || "").toLowerCase();
        const ref = (document.referrer || "").toLowerCase();
        const ua = (navigator.userAgent || "").toLowerCase();
        const test = (s) => {
            if (!s) return "";
            if (/instagram|(^|[^a-z])ig([^a-z]|$)/.test(s)) return "instagram";
            if (/tiktok|musical_ly|bytedance/.test(s)) return "tiktok";
            if (/whatsapp|wa\.me/.test(s)) return "whatsapp";
            if (/snapchat/.test(s)) return "snapchat";
            if (/facebook|fban|fbav|fb\.com/.test(s)) return "facebook";
            if (/google/.test(s)) return "google";
            if (/(^|\.|\/)x\.com|twitter|t\.co\//.test(s)) return "x";
            return "";
        };
        let ch = test(src) || test(ref) || test(ua);
        if (!ch && src) ch = "other";
        if (!ch && ref && !ref.includes(location.host)) ch = "other";
        return ch || "direct";
    }

    function sessionChannel() {
        let ch = session.get(KEYS.channel);
        const params = new URLSearchParams(location.search);
        const tagged = ["utm_source", "ref", "src"].some((k) => params.get(k));
        if (!ch || (tagged && ch === "direct")) {
            ch = detectChannel();
            session.set(KEYS.channel, ch);
            if (ch !== "direct") storage.set(KEYS.channelLast, { ch, t: Date.now() });
        }
        return ch;
    }

    // الطلب يُنسب لآخر مصدر خلال 7 أيام (مثلاً: رأى المنتج في إنستغرام ثم رجع مباشرة)
    function orderChannel() {
        const ch = sessionChannel();
        if (ch !== "direct") return ch;
        const last = storage.get(KEYS.channelLast, null);
        return last && Date.now() - last.t < 7 * 864e5 ? last.ch : "direct";
    }

    function trackingOff() {
        return S.preview || S.isAdmin || ownerDevice() || (navigator.webdriver && !window.__ATHR_TRACK_TEST);
    }

    function track(stage) {
        if (trackingOff()) return;
        const key = `athr_tr_${stage}`;
        if (session.get(key)) return;
        session.set(key, "1");
        sendBeacon(stage);
        if (stage === "visit") sendBeacon(`visit:${sessionChannel()}`);
        if (stage === "order") sendBeacon(`order:${orderChannel()}`);
    }

    // =====================================================
    // EVENTS
    // =====================================================

    function afterReady(fn) {
        if (S.loaded) fn();
        else ready.then(fn);
    }

    document.addEventListener("click", (e) => {
        const t = e.target.closest("button, a");
        if (!t) {
            if (e.target.closest("[data-close-sheet]")) closeSheet();
            return;
        }
        const d = t.dataset;

        // روابط داخل المتجر بدون إعادة تحميل
        if (t.tagName === "A" && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            const href = t.getAttribute("href") || "";
            if (href.startsWith("#") && href.length > 1 && !["#admin", "#orders"].includes(href)) {
                const target = document.getElementById(decodeURIComponent(href.slice(1)));
                if (target) {
                    e.preventDefault();
                    closeSheet();
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                return;
            }
            const url = internalUrl(t);
            if (url) {
                e.preventDefault();
                if (!S.loaded) {
                    location.href = url.href;
                    return;
                }
                const sameRoute = url.pathname === location.pathname && url.search === location.search;
                if (sameRoute && url.hash) {
                    closeSheet();
                    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
                    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                }
                navigate(url.pathname + url.search + url.hash, { replace: d.replace !== undefined });
                return;
            }
            if (d.closeSheet !== undefined) closeSheet();
            return;
        }

        if (d.closeSheet !== undefined) { closeSheet(); return; }
        if (t.id === "menuBtn") { afterReady(openMenu); return; }
        if (d.openCurrency !== undefined || t.id === "curBtn") { afterReady(openCurrency); return; }
        if (d.setCountry) { closeSheet(); setCountry(d.setCountry); return; }
        if (d.add) {
            const id = d.add;
            afterReady(() => { if (addToCart(id)) openAdded([id]); });
            return;
        }
        if (d.addQuiet) {
            const id = d.addQuiet;
            afterReady(() => { if (addToCart(id)) toast("أُضيف إلى السلة"); });
            return;
        }
        if (d.addMini) {
            const id = d.addMini;
            afterReady(() => {
                if (addToCart(id)) {
                    toast("أُضيف إلى السلة");
                    openAdded(S.lastAdded, { refresh: true });
                }
            });
            return;
        }
        if (d.inc) { const id = d.inc; afterReady(() => addToCart(id)); return; }
        if (d.dec) { const id = d.dec; afterReady(() => setQty(id, cartQty(id) - 1)); return; }
        if (d.remove) { const id = d.remove; afterReady(() => { setQty(id, 0); toast("حُذف من السلة"); }); return; }
        if (d.swap) {
            afterReady(() => {
                const card = t.closest("[data-card]");
                const p = productById(d.swap);
                if (card && p) {
                    const html = V.card(v(), p, { eager: true });
                    const tmp = document.createElement("div");
                    tmp.innerHTML = html.trim();
                    card.replaceWith(tmp.firstElementChild);
                }
            });
            return;
        }
        if (d.addBundle) {
            const [a, b] = d.addBundle.split("|");
            afterReady(() => {
                const okA = cartQty(a) ? true : addToCart(a);
                const okB = cartQty(b) ? true : addToCart(b);
                if (okA && okB) openAdded([a, b]);
            });
            return;
        }
        if (d.gal) { moveGallery(Number(d.gal)); return; }
        if (d.galTo) {
            gallery.index = Number(d.galTo);
            const p = productById(gallery.product);
            if (p) renderGallery(p);
            return;
        }
        if (d.pdpStep) {
            const out = $("#pdpQty");
            if (out) out.textContent = Math.max(1, Math.min(maxQty(), Number(out.textContent) + Number(d.pdpStep)));
            return;
        }
        if (d.pdpAdd) {
            const id = d.pdpAdd;
            afterReady(() => {
                const qty = Number($("#pdpQty")?.textContent) || 1;
                const current = cartQty(id);
                if (current + qty > maxQty()) toast(`أقصى كمية من المنتج الواحد ${maxQty()}`);
                if (current >= maxQty()) return;
                if (setQty(id, current + qty, { silent: true })) {
                    track("add");
                    openAdded([id]);
                }
            });
            return;
        }
        if (d.buyNow) {
            const id = d.buyNow;
            afterReady(() => {
                const qty = Number($("#pdpQty")?.textContent) || 1;
                if (cartQty(id) < qty) setQty(id, qty, { silent: true });
                track("add");
                navigate(`${BASE}checkout/`);
            });
            return;
        }
        if (d.waProduct) {
            const id = d.waProduct;
            afterReady(() => {
                const p = productById(id);
                const qty = Number($("#pdpQty")?.textContent) || 1;
                if (p) quickOrder([{ product: p, qty }]);
            });
            return;
        }
        if (d.waCart !== undefined) { quickOrder(computeCart().lines); return; }
        if (d.copy) { copyText(d.copy); return; }
        if (d.forgetMe !== undefined) {
            storage.del(KEYS.customer);
            toast("مُسحت بياناتك من هذا الجهاز");
            renderCheckout();
            return;
        }
        if (d.share !== undefined) {
            shareUrl(new URL(BASE, location.origin).href, C().name, fill(C().texts.hero_title));
            return;
        }
        if (d.shareProduct) {
            const p = productById(d.shareProduct);
            if (p) shareUrl(new URL(ATHR.url.product(p), location.origin).href, V.label(v(), p), `${V.label(v(), p)} من ${C().name}`);
            return;
        }
        if (d.closeCartbar !== undefined) { session.set(KEYS.cartBarClosed, "1"); renderBars(); return; }
        if (d.exitPreview !== undefined) { ATHR.store.exitPreview(true); }
    });

    document.addEventListener("change", (e) => {
        const t = e.target;
        if (t.id === "sortSelect") {
            S.sort = t.value;
            rerenderGrid();
            return;
        }
        if (t.id === "countrySelect") {
            const form = $("#checkoutForm");
            const keep = Object.fromEntries(new FormData(form).entries());
            keep.delivery = null;
            keep.payment = null;
            keep.gov = "";
            keep.phoneLocal = "";
            keep.country = t.value;
            setCountry(t.value, { silent: true });
            renderCheckout(keep);
            renderBars();
            toast(`التوصيل والدفع الآن لـ${CC().name}`);
            return;
        }
        if (t.id === "govSelect") {
            const list = $("#wilayaList");
            if (list) list.innerHTML = wilayaOptions(t.value);
            return;
        }
        if (t.id === "giftToggle") {
            const box = $("#giftBox");
            if (box) box.hidden = !t.checked;
            return;
        }
        if (t.name === "delivery") {
            renderAddressField();
            updateCheckoutSummary();
            return;
        }
        if (t.name === "payment") renderPayExtra();
    });

    document.addEventListener("input", (e) => {
        const fieldEl = e.target.closest && e.target.closest("form .field.invalid");
        if (fieldEl) {
            fieldEl.classList.remove("invalid");
            const err = fieldEl.querySelector("[data-err]");
            if (err) err.textContent = "";
            const form = fieldEl.closest("form");
            if (form && !form.querySelector(".field.invalid") && $("#formErr")) $("#formErr").textContent = "";
        }
    });

    document.addEventListener("submit", (e) => {
        const f = e.target;
        if (f.id === "checkoutForm") {
            e.preventDefault();
            afterReady(() => placeOrder(f));
        } else if (f.id === "reviewForm") {
            e.preventDefault();
            sendReview(f);
        } else if (f.id === "searchBox") {
            e.preventDefault();
            const q = $("#searchInput").value.trim();
            $("#searchInput").blur();
            afterReady(() => navigate(`${BASE}search/${q ? `?q=${encodeURIComponent(q)}` : ""}`, { replace: S.route.name === "search" }));
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSheet();
    });

    let searchTimer;
    $("#searchInput").addEventListener("input", (e) => {
        clearTimeout(searchTimer);
        const q = e.target.value.trim();
        searchTimer = setTimeout(() => {
            afterReady(() => {
                const target = `${BASE}search/${q ? `?q=${encodeURIComponent(q)}` : ""}`;
                const onSearch = S.route.name === "search";
                if (!q && !onSearch) return;
                saveScroll();
                history[onSearch ? "replaceState" : "pushState"]({}, "", target);
                render({ scroll: onSearch ? "keep" : "top" });
            });
        }, 250);
    });

    // =====================================================
    // OWNER AREA (لوحة التحكم ودفتر الطلبيات)
    // =====================================================

    let adminLoading = null;
    const assetVersion = (() => {
        const s = $$("script[src*='store.js']")[0];
        const m = s && s.src.match(/[?&]v=([^&]+)/);
        return m ? m[1] : "3";
    })();

    function loadAdminScripts() {
        if (window.ATHR_ADMIN) return Promise.resolve();
        if (adminLoading) return adminLoading;
        adminLoading = window.athrLoadSupabase().then(() => new Promise((resolve, reject) => {
            const css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = `${BASE}css/admin-panel.css?v=${assetVersion}`;
            document.head.appendChild(css);
            const script = document.createElement("script");
            script.src = `${BASE}js/admin-panel.js?v=${assetVersion}`;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("admin script"));
            document.body.appendChild(script);
        })).catch((error) => {
            adminLoading = null;
            throw error;
        });
        return adminLoading;
    }

    let ownerOpening = false;
    async function openOwnerArea(name) {
        if (ownerOpening) return;
        ownerOpening = true;
        try {
            await ready;
            await loadAdminScripts();
            window.ATHR_ADMIN.open(name);
        } catch {
            toast("تعذر فتح لوحة التحكم. تأكد من الإنترنت.");
        } finally {
            ownerOpening = false;
        }
    }

    async function checkAdmin() {
        if (!ownerDevice()) return;
        try {
            const sb = await window.athrLoadSupabase();
            const { data } = await sb.auth.getSession();
            if (!data || !data.session) return;
            const { data: row } = await sb.from("admin_users").select("id").eq("id", data.session.user.id).maybeSingle();
            S.isAdmin = Boolean(row);
            renderChrome();
        } catch { /* not signed in */ }
    }

    // واجهة تستعملها لوحة التحكم
    ATHR.store = {
        state: () => S,
        reload: async () => {
            const fresh = await fetchData();
            storage.set(KEYS.cache, fresh);
            S.media.clear();
            S.preview = false;
            applyData(fresh);
        },
        preview(data) {
            S.preview = true;
            S.media.clear();
            (data.products || []).forEach((p) => {
                if (Array.isArray(p.media)) S.media.set(p.id, p.media.map((m, i) => ({ media_type: m.type, media_url: m.url, sort_order: i })));
            });
            history.replaceState(null, "", BASE);
            applyData({ ...data, reviews: S.reviews });
            window.scrollTo(0, 0);
        },
        exitPreview(reopen) {
            S.preview = false;
            S.media.clear();
            const cached = storage.get(KEYS.cache, null);
            if (cached) applyData(cached);
            if (reopen) location.hash = "#admin";
        },
        closeOwner() {
            if (location.hash === "#admin" || location.hash === "#orders") history.replaceState(history.state, "", location.pathname + location.search);
        },
        setAdmin(value) {
            S.isAdmin = Boolean(value);
            renderChrome();
        },
        render,
        toast,
        copyText
    };

    // =====================================================
    // START
    // =====================================================

    function trackVisit() {
        const lastSeen = Number(storage.get(KEYS.lastSeen, 0)) || 0;
        S.returningGap = lastSeen ? Date.now() - lastSeen : 0;
        const mark = () => storage.set(KEYS.lastSeen, Date.now());
        mark();
        setInterval(() => { if (document.visibilityState === "visible") mark(); }, 30000);
        document.addEventListener("visibilitychange", mark);
        window.addEventListener("pagehide", mark);
    }

    convertLegacyHash();
    S.route = parseRoute();
    trackVisit();
    S.country = guessCountry();
    updateCartUI();
    sessionChannel();
    track("visit");
    loadData().then(checkAdmin);
})();
