/* =====================================================
   ATHR STORE — واجهة المتجر للزبون
   صفحات حقيقية لكل منتج وقسم (تُبنى مسبقًا لجوجل)، ثم يكمل
   المتجر في المتصفح بدون إعادة تحميل.
===================================================== */

(function () {
    "use strict";

    const V = ATHR.views;
    const esc = ATHR.escape;
    const t = ATHR.t;
    const L = ATHR.L;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const BASE = ATHR.base();

    const API = {
        url: window.ATHR_SUPABASE_URL,
        key: window.ATHR_SUPABASE_PUBLISHABLE_KEY
    };

    const KEYS = {
        cache: "athr_cache_v4",
        cart: "athr_cart_v2",
        customer: "athr_customer",
        lastOrder: "athr_last_order",
        lastSeen: "athr_last_seen",
        cartBarClosed: "athr_cart_bar_closed",
        country: "athr_country",
        channel: "athr_ch",
        channelLast: "athr_ch_last",
        sort: "athr_sort",
        lang: "athr_lang",
        mode: "athr_mode",
        giftIntent: "athr_gift_intent",
        offer: "athr_offer",
        favs: "athr_favs",
        restock: "athr_restock",
        coupon: "athr_coupon"
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
        lastAdded: [],
        homeCat: "",
        shown: {},
        coupon: null
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
        set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* ignore */ } },
        del(key) { try { sessionStorage.removeItem(key); } catch { /* ignore */ } }
    };

    const C = () => S.config;
    const money = (value) => ATHR.money(value, C());
    const CC = () => ATHR.country(C(), S.country);
    const isBase = () => S.country === ATHR.BASE_COUNTRY;
    const local = (value) => ATHR.moneyIn(value, C(), S.country);
    const approx = (value) => (isBase() ? "" : ` (≈ ${local(value)})`);
    const fill = (text, extra) => ATHR.fill(text, C(), extra);
    const ct = (path) => ATHR.ct(C(), path);
    // اسم الخصم المحفوظ بالعربي ← بلغة الزائر
    const discountText = (label) => {
        const m = String(label || "").match(/^خصم الكمية\s+([\d.]+)%/);
        if (m) return t("خصم الكمية {pct}%", { pct: m[1] });
        if (label === "خصم الباقة") return t("خصم الباقة");
        return label ? label : t("الخصم");
    };
    const v = () => {
        if (!S.ctx) {
            S.ctx = V.ctx({
                cfg: S.config,
                products: S.products,
                categories: S.categories,
                reviews: S.reviews,
                country: S.country,
                cartQty,
                isFav: (id) => favSet().has(id)
            });
        }
        return S.ctx;
    };

    // ---------- toast ----------
    let toastTimer;
    function toast(message, link = null) {
        const el = $("#toast");
        if (link) el.innerHTML = `<span>${esc(message)}</span> <a href="${esc(link.href)}">${esc(link.text)}</a>`;
        else el.textContent = message;
        el.classList.toggle("has-link", Boolean(link));
        el.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("show"), link ? 3600 : 2400);
    }

    async function copyText(text, label = t("تم النسخ")) {
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
        if (!silent && qty > limit) toast(t("أقصى كمية من المنتج الواحد {n}", { n: limit }));
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
            toast(t("أقصى كمية من المنتج الواحد {n}", { n: maxQty() }));
            return false;
        }
        setQty(id, current + qty, { silent: true });
        track("add");
        pixelAdd(id, qty);
        const count = $("#cartCount");
        count.classList.remove("bump");
        void count.offsetWidth;
        count.classList.add("bump");
        setTimeout(() => renderCartFloat({ bump: true }), 0);
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
        renderCartFloat();
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
            toast(c.code === "OM" ? t("الأسعار بالريال العماني") : t("الأسعار الآن ب{currency} تقريبًا", { currency: L(c, "currency_def") }));
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
        const productCols = "id,name,name_en,slug,price,old_price,category_id,image_url,thumb_url,is_available,is_visible,is_best_seller,is_new_arrival,description,description_en,color_id,sort_order,video_url,weight_g,created_at";
        const [settings, categories, products, reviews] = await Promise.all([
            rest("store_settings?select=config&id=eq.1"),
            rest("categories?select=id,name,name_en,slug,sort_order,image_url,description,description_en&order=sort_order.asc"),
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

    // عند مغادرة الصفحة يلغي المتصفح الطلبات الجارية؛ هذا ليس خطأ
    let leavingPage = false;
    window.addEventListener("beforeunload", () => { leavingPage = true; });
    window.addEventListener("pagehide", () => { leavingPage = true; });

    async function loadData() {
        const cached = storage.get(KEYS.cache, null);
        if (cached && cached.products) applyData(cached, { fromCache: true });
        try {
            const fresh = await fetchData();
            storage.set(KEYS.cache, fresh);
            if (!S.preview) applyData(fresh);
        } catch (error) {
            if (leavingPage) return;
            console.error("Store load error:", error);
            if (!cached && !$("#view").dataset.prerendered) {
                $("#view").innerHTML = `<div class="wrap empty"><p>${esc(t("تعذر تحميل المتجر. تأكد من اتصالك بالإنترنت ثم أعد المحاولة."))}</p><button class="btn btn-primary" type="button" onclick="location.reload()">${esc(t("إعادة المحاولة"))}</button></div>`;
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

    // اختيار الزائر للمظهر (فاتح / داكن / تلقائي) إن سمحت به من لوحة التحكم
    function visitorMode() {
        if (C().theme.visitor_mode === false) return "";
        const m = storage.get(KEYS.mode, "");
        return ["light", "dark", "auto"].includes(m) ? m : "";
    }

    function setMode(mode) {
        storage.set(KEYS.mode, mode);
        applyTheme();
        $$("[data-set-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setMode === mode)));
    }

    function applyTheme() {
        const cfg = C();
        const root = document.documentElement;
        const vars = ATHR.themeVars(cfg);
        const style = $("#themeVars");
        if (style && style.textContent !== vars) style.textContent = vars;
        root.dataset.mode = visitorMode() || ATHR.themeMode(cfg);
        syncDark();
        const keep = Array.from(root.classList).filter((c) => !/^(r-sharp|r-round|head-light|tpl-[\w-]+)$/.test(c));
        const next = [...keep, ...ATHR.themeClasses(cfg)].join(" ");
        if (root.className !== next) root.className = next;
        const href = ATHR.fontHref(cfg);
        const link = $("#fontLink");
        if (link && href && link.getAttribute("href") !== href) link.setAttribute("href", href);
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", ATHR.headColor(cfg));
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
        brand.setAttribute("aria-label", `${ATHR.storeName(cfg) || t("المتجر")} — ${t("الرئيسية")}`);

        const showSearch = cfg.theme.show_search !== false;
        $("#searchBox").hidden = !showSearch;
        $(".top-row").classList.toggle("no-search", !showSearch);
        $("#searchInput").placeholder = ct("texts.search_placeholder") || "";
        $("#searchInput").setAttribute("aria-label", t("بحث في المنتجات"));
        $("#menuBtn").setAttribute("aria-label", t("القائمة"));
        $(".cart-btn").setAttribute("aria-label", t("السلة"));
        $(".skip-link").textContent = t("انتقل إلى المحتوى");
        $("#waFloat").setAttribute("aria-label", t("تواصل عبر واتساب"));
        const langBtn = $("#langBtn");
        if (langBtn) {
            langBtn.textContent = ATHR.isEn() ? "عربي" : "EN";
            langBtn.setAttribute("lang", ATHR.isEn() ? "ar" : "en");
            langBtn.setAttribute("aria-label", ATHR.isEn() ? "التبديل إلى العربية" : "Switch to English");
        }
        $("#menuBtn").hidden = !(cfg.contact.menu_show || S.isAdmin);

        const multi = ATHR.countries(cfg).filter((c) => c.enabled).length > 1;
        const cur = CC();
        $("#curBtn").hidden = !multi;
        $("#curFlag").textContent = cur.flag;
        $("#curSym").textContent = cur.symbol;
        $("#curSym").textContent = ATHR.isEn() ? cur.currency : cur.symbol;
        $("#curBtn").setAttribute("aria-label", t("الدولة والعملة: {country}، {currency}", { country: L(cur, "name"), currency: L(cur, "currency_name") }));

        const float = $("#waFloat");
        float.hidden = !(cfg.contact.wa_float && ATHR.isValidWhatsapp(cfg.order.whatsapp));
        float.href = ATHR.waLink(cfg.order.whatsapp, fill(ct("contact.wa_float_msg")));

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
            parts.push(`<div class="preview-flag">${esc(t("أنت تشاهد المسودة قبل النشر"))} <button type="button" data-exit-preview>${esc(t("رجوع للوحة"))}</button></div>`);
        }
        if (cfg.texts.announce_show && ct("texts.announce_text")) {
            parts.push(`<div class="bar bar-announce">${esc(fill(ct("texts.announce_text")))}</div>`);
        }
        // تذكير بالعرض الخاص في كل الصفحات (ما عدا صفحة المنتج نفسه والطلب)
        const offer = !S.preview && activeOffer();
        if (offer && !(S.route.name === "product" && findProduct(S.route.slug) === offer.product) && !["checkout", "done", "gift"].includes(S.route.name)) {
            parts.push(`<div class="bar bar-offer"><span aria-hidden="true">🎁</span> <span>${esc(offer.name ? t("عرضك الخاص يا {name}:", { name: offer.name }) : t("عرضك الخاص:"))}</span> <a href="${ATHR.url.product(offer.product)}">${esc(V.pname(offer.product))}</a>${offer.ends ? ` <span class="bo-left">⏳ <b data-offer-left="${offer.ends}">${offerClock(offer.ends)}</b></span>` : ""}</div>`);
        }
        // كود المؤثر مفعّل: تذكير بسيط حتى يكمل الطلب
        if (S.coupon && cfg.sales.coupons !== false && !["checkout", "done", "gift"].includes(S.route.name)) {
            parts.push(`<div class="bar bar-coupon"><span aria-hidden="true">🎟️</span> ${esc(t("كود {code} مفعّل: {desc} عند إتمام الطلب", { code: S.coupon.code, desc: couponDesc(S.coupon) }))}</div>`);
        }
        const totals = computeCart();
        const freeMin = Number(cfg.order.free_min) || 0;
        const routeName = S.route.name;
        if (cfg.sales.free_bar_show && totals.freeEligible && freeMin > 0 && !["done", "checkout", "gift"].includes(routeName)) {
            let text;
            let pct = 0;
            let done = false;
            if (totals.count === 0) {
                text = fill(ct("sales.free_before"));
            } else if (totals.freeShipping) {
                text = fill(ct("sales.free_done"));
                pct = 100;
                done = true;
            } else {
                text = fill(ct("sales.free_during"), { left: money(totals.leftForFree) });
                pct = Math.min(100, (totals.afterDiscount / freeMin) * 100);
            }
            parts.push(`<div class="bar bar-ship${done ? " done" : ""}"><div>${esc(text)}</div>${totals.count ? `<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${pct}%"></span></div>` : ""}</div>`);
        }
        if (cfg.sales.abandoned_show && S.returningGap >= 10 * 60 * 1000 && totals.count > 0
            && !session.get(KEYS.cartBarClosed) && !["cart", "checkout", "done", "gift"].includes(routeName)) {
            const n = ATHR.isEn() ? (totals.count === 1 ? "1 item" : `${totals.count} items`) : totals.count === 1 ? "منتج واحد" : totals.count === 2 ? "منتجان" : `${totals.count} منتجات`;
            parts.push(`<div class="bar bar-cart"><span>${esc(fill(ct("sales.abandoned_text"), { n }))}</span><a href="${BASE}cart/">${esc(t("أكمل الطلب"))}</a><button type="button" data-close-cartbar aria-label="${esc(t("إخفاء"))}">×</button></div>`);
        }
        if (session.get(KEYS.giftIntent) && cfg.sales.gift_enabled && !["checkout", "done", "gift"].includes(routeName)) {
            parts.push(`<div class="bar bar-gift">${V.icon.gift}<span>${esc(t("تجهّز هدية: اختر المنتج ثم اضغط «أرسله هدية»"))}</span>${totals.count ? `<a href="${BASE}checkout/?gift=1">${esc(t("أكمل الهدية"))}</a>` : ""}<button type="button" data-gift-cancel aria-label="${esc(t("إلغاء"))}">×</button></div>`);
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
            case "fav": return { name: "fav" };
            case "gift": return { name: "gift", c: params.get("c") || "" };
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
            case "fav": renderFav(); break;
            case "shipping": view.innerHTML = V.shipping(v()); break;
            case "cart": renderCart(); break;
            case "checkout": renderCheckout(); break;
            case "done": renderDone(route.no); break;
            case "review": renderReview(route); break;
            case "gift": giftFont(); view.innerHTML = V.giftPage(v(), ATHR.giftDecode(route.c)); break;
            default: renderNotFound();
        }

        document.documentElement.classList.remove("i18n-wait");
        document.title = V.titles(v(), { ...route, product: route.name === "product" ? findProduct(route.slug) : null, cat: route.name === "category" ? findCategory(route.slug) : null });
        renderBars();
        renderBuyBar();
        renderCartFloat();
        const float = $("#waFloat");
        float.classList.toggle("off", ["product", "cart", "checkout", "done", "review", "gift"].includes(route.name));
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
        pixelRoute(route);
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

    const shownKey = () => (S.route.name === "home" ? `home:${S.homeCat}` : `${S.route.name}:${S.route.slug || ""}`);

    function renderHome() {
        $("#view").innerHTML = V.home(v(), { sort: S.sort, cat: S.homeCat, shown: S.shown[shownKey()] || 0 });
        homeFavRail();
    }

    // «مفضلتك» في الرئيسية لمن حفظ تصاميم
    function homeFavRail() {
        if (C().sales.favorites === false) return;
        const vv = v();
        const items = favIds().map((id) => vv.byId.get(id)).filter(Boolean).slice(0, 12);
        if (!items.length) return;
        const html = V.rail(vv, { id: "favs", title: `♥ ${t("مفضلتك")}`, link: { href: `${BASE}fav/`, text: t("عرض الكل") }, items });
        const anchor = $("#view .gift-promo") || $("#view .tiles");
        if (anchor) anchor.insertAdjacentHTML(anchor.classList.contains("tiles") ? "afterend" : "beforebegin", html);
    }

    function renderFav() {
        $("#view").innerHTML = V.favPage(v(), favIds());
    }

    function renderCategory(route) {
        const cat = findCategory(route.slug);
        if (!cat) return renderNotFound();
        $("#view").innerHTML = V.category(v(), cat, { sort: S.sort, shown: S.shown[shownKey()] || 0 });
        const on = $(".tile.on");
        if (on && on.scrollIntoView) on.scrollIntoView({ inline: "center", block: "nearest" });
    }

    function renderSearch(route) {
        $("#view").innerHTML = V.search(v(), route.q, { sort: S.sort });
    }

    function renderNotFound() {
        const best = V.bestSellers(v());
        $("#view").innerHTML = `<div class="wrap empty page"><h1>${esc(t("الصفحة غير موجودة"))}</h1><p>${esc(t("ربما تغيّر رابط المنتج أو لم يعد متوفرًا. تصفّح أقسامنا:"))}</p><a class="btn btn-primary" href="${BASE}">${esc(t("العودة للمتجر"))}</a></div>
            ${V.tiles(v())}
            ${best.length ? V.rail(v(), { id: "best", title: ct("sales.best_title"), items: best }) : ""}`;
    }

    function rerenderGrid() {
        const box = $("#gridBox");
        if (!box) return;
        const r = S.route;
        const vv = v();
        if (r.name === "home") {
            const inner = $("#catalogInner");
            if (inner) inner.innerHTML = V.catalogHome(vv, { sort: S.sort, cat: S.homeCat, shown: S.shown[shownKey()] || 0 });
            return;
        }
        if (r.name === "fav") {
            renderFav();
            return;
        }
        let list = [];
        if (r.name === "category") {
            const cat = findCategory(r.slug);
            if (cat) list = V.listings(vv, vv.products.filter((p) => p.category_id === cat.id));
            box.innerHTML = V.limitedGrid(vv, V.sortList(list, S.sort), S.shown[shownKey()] || 0);
            return;
        }
        if (r.name === "search") list = V.searchResults(vv, r.q);
        box.innerHTML = V.grid(vv, V.sortList(list, S.sort));
    }

    // «عرض المزيد»: نضيف الدفعة التالية تحت الموجود بدون قفز الصفحة
    function showMore() {
        const box = $("#gridBox");
        const grid = box && box.querySelector(".grid");
        if (!grid) return;
        const vv = v();
        const r = S.route;
        let list = [];
        if (r.name === "home") list = V.listings(vv, vv.products.filter((p) => !S.homeCat || p.category_id === S.homeCat));
        else if (r.name === "category") {
            const cat = findCategory(r.slug);
            if (cat) list = V.listings(vv, vv.products.filter((p) => p.category_id === cat.id));
        }
        list = V.sortList(list, S.sort);
        const size = V.pageSize(vv) || list.length;
        const now = grid.children.length;
        const next = Math.min(list.length, now + size);
        grid.insertAdjacentHTML("beforeend", list.slice(now, next).map((p) => V.card(vv, p)).join(""));
        S.shown[shownKey()] = next;
        const more = box.querySelector(".more-wrap");
        if (more) more.outerHTML = V.moreBtn(vv, list.length, next);
        startDeferredMedia();
    }

    // =====================================================
    // المفضلة (على جهاز الزبون فقط) + عدّاد بسيط لكل منتج لصاحب المتجر
    // =====================================================

    function favIds() {
        const list = storage.get(KEYS.favs, []);
        return Array.isArray(list) ? list.filter((id) => typeof id === "string").slice(0, 200) : [];
    }
    function favSet() {
        return new Set(favIds());
    }

    function toggleFav(id) {
        const p = productById(id);
        if (!p) return;
        const list = favIds();
        const on = !list.includes(id);
        const next = on ? [id, ...list] : list.filter((x) => x !== id);
        storage.set(KEYS.favs, next);
        $$(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => {
            b.classList.toggle("on", on);
            b.setAttribute("aria-pressed", String(on));
            b.setAttribute("aria-label", on ? t("إزالة من المفضلة") : t("أضف للمفضلة"));
            const label = b.querySelector("span");
            if (label) label.textContent = on ? t("في المفضلة") : t("أضف للمفضلة");
            if (on) {
                b.classList.remove("pop");
                void b.offsetWidth;
                b.classList.add("pop");
            }
        });
        toast(on ? t("أُضيف للمفضلة ♥") : t("أُزيل من المفضلة"), on ? { href: `${BASE}fav/`, text: t("عرض المفضلة") } : null);
        if (on) pixelSend("AddToWishlist", [{ product: p, qty: 1 }]);
        if (!trackingOff()) rest("rpc/fav", { method: "POST", body: { p: id, d: on ? 1 : -1 } }).catch(() => {});
        if (S.route.name === "fav" && !on) renderFav();
    }

    // =====================================================
    // «أخبرني عند التوفر»: الاسم والرقم يُحفظان لصاحب المتجر فقط
    // =====================================================

    function restockDone(id) {
        const list = storage.get(KEYS.restock, []);
        return Array.isArray(list) && list.includes(id);
    }

    function markRestockButtons() {
        $$("[data-notify]").forEach((b) => {
            if (restockDone(b.dataset.notify)) {
                b.classList.add("done");
                b.innerHTML = `${V.icon.check}${esc(t("سنخبرك عند التوفر ✓"))}`;
            }
        });
    }

    function openNotify(id) {
        const p = productById(id);
        if (!p) return;
        const saved = storage.get(KEYS.customer, null) || {};
        const countries = ATHR.countries(C()).filter((c) => c.enabled);
        const code = countries.some((c) => c.code === S.country) ? S.country : (countries[0] || ATHR.country(C(), "OM")).code;
        const dial = countries.length > 1
            ? `<select class="dial dial-pick" id="notifyCountry" dir="ltr" aria-label="${esc(t("مفتاح الدولة"))}">${countries.map((x) => `<option value="${x.code}"${x.code === code ? " selected" : ""}>${x.flag} +${x.dial}</option>`).join("")}</select>`
            : `<span class="dial" dir="ltr">+${ATHR.country(C(), code).dial}</span>`;
        openSheet(`
            <div class="sheet-head"><h2>${V.icon.bell}${esc(t("أخبرني عند التوفر"))}</h2><button class="close" type="button" data-close-sheet aria-label="${esc(t("إغلاق"))}">×</button></div>
            <form class="notify-form" id="notifyForm" data-product="${esc(p.id)}" novalidate>
                <div class="notify-item">${V.img(p) ? `<img src="${esc(V.img(p))}" alt="" width="56" height="70">` : ""}<div><b>${esc(V.label(v(), p))}</b><small>${esc(t("أول ما يتوفر نرسل لك رسالة على واتساب."))}</small></div></div>
                <label class="field"><span>${esc(t("الاسم"))}</span><input class="input" name="n" maxlength="80" autocomplete="name" value="${esc(saved.name || "")}"></label>
                <label class="field"><span>${esc(t("رقم الواتساب"))}</span><span class="phone-wrap">${dial}<input class="input" name="ph" type="tel" inputmode="numeric" dir="ltr" autocomplete="tel-national" value="${esc(saved.phoneLocal || "")}" required></span></label>
                <p class="err" id="notifyErr" role="alert"></p>
                <button class="btn btn-primary btn-block" type="submit">${esc(t("نبّهني"))}</button>
                <small class="muted">${esc(t("نستخدم رقمك لهذا التنبيه فقط."))}</small>
            </form>`, { label: t("أخبرني عند التوفر"), kind: "notify" });
    }

    async function submitNotify(form) {
        const id = form.dataset.product;
        const code = $("#notifyCountry") ? $("#notifyCountry").value : S.country;
        const values = Object.fromEntries(new FormData(form).entries());
        const phone = ATHR.parsePhone(values.ph, code);
        const err = $("#notifyErr");
        if (!phone.valid) {
            err.textContent = t("اكتب رقم {country} الصحيح: {hint}.", { country: L(ATHR.country(C(), code), "name"), hint: L(phone.rule, "hint") });
            return;
        }
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        try {
            await rest("rpc/request_restock", { method: "POST", body: { p: id, n: String(values.n || "").trim(), ph: ATHR.country(C(), code).dial + phone.local, c: code } });
            const list = storage.get(KEYS.restock, []);
            storage.set(KEYS.restock, [...new Set([...(Array.isArray(list) ? list : []), id])].slice(-100));
            form.outerHTML = `<div class="notify-done"><span aria-hidden="true">🔔</span><b>${esc(t("تم! سنخبرك أول ما يتوفر"))}</b><small>${esc(t("تصلك رسالة على واتساب. وتقدر تحفظه في المفضلة ♥ حتى ترجع له."))}</small><button class="btn btn-ghost btn-block" type="button" data-close-sheet>${esc(t("تم"))}</button></div>`;
            markRestockButtons();
        } catch (error) {
            console.warn("Restock request failed:", error);
            err.textContent = t("تعذر الإرسال. تأكد من الإنترنت وحاول مرة أخرى.");
            btn.disabled = false;
        }
    }

    // =====================================================
    // كود الخصم: من خانة الطلب أو من رابط المؤثر (?code=SARA10)
    // =====================================================

    async function applyCoupon(raw, { quiet = false } = {}) {
        const code = ATHR.couponCode(raw);
        if (!ATHR.couponValid(code)) return { error: t("اكتب الكود بالحروف الإنجليزية والأرقام.") };
        try {
            const data = await rest("rpc/check_coupon", { method: "POST", body: { c: code } });
            if (!data || !data.code) return { error: t("الكود غير صحيح أو انتهت صلاحيته.") };
            S.coupon = { code: data.code, kind: data.kind, value: Number(data.value), min_total: Number(data.min_total) || 0 };
            session.set(KEYS.coupon, JSON.stringify(S.coupon));
            if (!quiet) toast(t("تم تفعيل الكود {code} ✓", { code: data.code }));
            return { ok: true };
        } catch {
            return { error: t("تعذر التحقق من الكود. حاول مرة أخرى.") };
        }
    }

    function removeCoupon() {
        S.coupon = null;
        session.del(KEYS.coupon);
    }

    function captureCouponParam() {
        const raw = new URLSearchParams(location.search).get("code");
        if (!raw || C().sales.coupons === false) return;
        applyCoupon(raw, { quiet: true }).then((r) => {
            if (r.ok) {
                renderBars();
                if (S.route.name === "checkout") { renderCouponBox(); updateCheckoutSummary(); }
            }
        });
    }

    function couponDesc(c) {
        if (!c) return "";
        if (c.kind === "ship") return t("توصيل مجاني");
        if (c.kind === "fixed") return t("خصم {amount}", { amount: money(c.value) });
        return t("خصم {pct}%", { pct: Number(c.value) });
    }

    function renderCouponBox() {
        const box = $("#couponBox");
        if (!box) return;
        if (C().sales.coupons === false) {
            box.innerHTML = "";
            return;
        }
        const c = S.coupon;
        if (c) {
            const tt = checkoutTotals();
            box.innerHTML = `<div class="coupon-on">
                <span class="cp-ico" aria-hidden="true">🎟️</span>
                <span class="cp-txt"><b dir="ltr">${esc(c.code)}</b><small>${esc(couponDesc(c))}${tt.couponShort > 0 ? ` · ${esc(t("أضف {amount} لتفعيله", { amount: money(tt.couponShort) }))}` : ""}</small></span>
                <button class="link-btn" type="button" data-coupon-remove>${esc(t("إزالة"))}</button>
            </div>`;
            return;
        }
        box.innerHTML = `<details class="coupon-box">
            <summary>🎟️ ${esc(t("عندك كود خصم؟"))}</summary>
            <div class="coupon-row">
                <input class="input" id="couponInput" dir="ltr" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="SARA10" maxlength="20">
                <button class="btn btn-ghost btn-sm" type="button" data-coupon-apply>${esc(t("تطبيق"))}</button>
            </div>
            <small class="err" id="couponErr" role="alert"></small>
        </details>`;
    }



    // =====================================================
    // PRODUCT PAGE
    // =====================================================

    let gallery = { items: [], index: 0, product: null };

    // =====================================================
    // العرض الخاص: من رابط أرسله صاحب المتجر للعميل في واتساب
    // =====================================================

    function captureOffer(p) {
        const code = new URLSearchParams(location.search).get("o");
        if (!code) return;
        const o = ATHR.offerDecode(code);
        if (!o) return;
        if (o.ends && o.ends <= Date.now()) return;
        storage.set(KEYS.offer, { pid: p.id, name: o.name, ends: o.ends, at: Date.now() });
    }

    function activeOffer() {
        const o = storage.get(KEYS.offer, null);
        if (!o || !o.pid) return null;
        const until = o.ends || (o.at || 0) + 7 * 864e5;
        if (Date.now() > until) {
            storage.del(KEYS.offer);
            return null;
        }
        const p = S.products.find((x) => x.id === o.pid);
        return p && p.is_available !== false ? { ...o, product: p } : null;
    }

    // أقل من يومين: ساعة رقمية تعدّ تنازلياً (05:12:09)، وأكثر: «3 أيام و5 ساعات»
    function offerClock(ends) {
        const ms = Math.max(0, ends - Date.now());
        if (ms > 48 * 36e5) return esc(ATHR.leftText(ms));
        const sec = Math.floor(ms / 1000);
        const parts = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map((n) => String(n).padStart(2, "0"));
        return `<span class="clock" dir="ltr">${parts.map((n) => `<i>${n}</i>`).join("<em>:</em>")}</span>`;
    }

    function offerBanner(p) {
        const o = activeOffer();
        if (!o || o.product.id !== p.id) return "";
        const sale = Number(p.old_price) > Number(p.price);
        const pct = sale ? Math.round((1 - p.price / p.old_price) * 100) : 0;
        return `<div class="offer-banner" id="offerBanner">
            <div class="ob-head">
                <span class="ob-ico" aria-hidden="true">🎁</span>
                <div class="ob-txt">
                    <b>${esc(o.name ? t("عرض خاص لك يا {name}!", { name: o.name }) : t("عرض خاص لك!"))}</b>
                    <span>${sale ? esc(t("خصم {pct}%: بدل {old} صار {price}", { pct, old: local(p.old_price), price: local(p.price) })) : esc(t("اخترناه لك خصيصاً"))}</span>
                </div>
                ${sale ? `<span class="ob-pct" dir="ltr">-${pct}%</span>` : ""}
            </div>
            ${o.ends ? `<div class="ob-left"><small>${esc(t("ينتهي العرض خلال"))}</small><b data-offer-left="${o.ends}">${offerClock(o.ends)}</b></div>` : ""}
        </div>`;
    }

    function tickOffers() {
        const els = $$("[data-offer-left]");
        if (!els.length) return;
        els.forEach((el) => {
            const ends = Number(el.dataset.offerLeft);
            if (ends - Date.now() <= 0) {
                el.closest(".offer-banner, .bar-offer")?.remove();
                storage.del(KEYS.offer);
            } else el.innerHTML = offerClock(ends);
        });
    }
    setInterval(tickOffers, 1000);

    function renderProduct(route, { changed }) {
        const p = findProduct(route.slug);
        if (!p) return renderNotFound();
        const canonical = ATHR.url.product(p);
        captureOffer(p);
        if (nfc(route.slug) !== nfc(p.slug) && p.slug) history.replaceState(history.state, "", canonical + location.search + location.hash);
        $("#view").innerHTML = V.product(v(), p);
        const banner = offerBanner(p);
        if (banner) $("#view .pdp")?.insertAdjacentHTML("beforebegin", banner);
        markRestockButtons();
        if (location.hash === "#notify" && p.is_available === false && C().sales.restock !== false) {
            history.replaceState(history.state, "", location.pathname + location.search);
            setTimeout(() => openNotify(p.id), 60);
        }

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
                <button class="stage-nav prev" type="button" data-gal="-1" aria-label="${esc(t("السابق"))}">${arrow("prev")}</button>
                <button class="stage-nav next" type="button" data-gal="1" aria-label="${esc(t("التالي"))}">${arrow("next")}</button>
                <span class="stage-count">${esc(t("{i} من {n}", { i: i + 1, n: items.length }))}</span>
            </div>
            <div class="thumbs" role="tablist" aria-label="${esc(t("صور المنتج"))}">
                ${items.map((it, n) => `<button type="button" data-gal-to="${n}" aria-current="${n === i}" aria-label="${esc(it.type === "video" ? t("فيديو المنتج") : t("صورة {n}", { n: n + 1 }))}">
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

    // =====================================================
    // زر السلة العائم في كل المتجر: العدد + حلقة تتقدّم نحو الشحن المجاني
    // =====================================================

    const CART_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 4h2.4l2.2 10.3a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.5-1.2L20.6 8H6"/><circle cx="9.6" cy="19.6" r="1.5"/><circle cx="17.2" cy="19.6" r="1.5"/></svg>';

    function renderCartFloat({ bump = false } = {}) {
        let el = $("#cartFloat");
        const cfg = C();
        const off = !S.loaded || cfg.sales.cart_float === false || ["cart", "checkout", "done", "gift"].includes(S.route.name);
        if (off) {
            if (el) el.hidden = true;
            return;
        }
        if (!el) {
            el = document.createElement("a");
            el.id = "cartFloat";
            el.className = "cart-float";
            document.body.appendChild(el);
        }
        const tt = computeCart();
        const pct = tt.freeEligible ? Math.min(100, Math.round(((Number(cfg.order.free_min) - tt.leftForFree) / Number(cfg.order.free_min)) * 100)) : (tt.count ? 100 : 0);
        const short = (n) => ATHR.trimZeros(local(n));
        const pill = !tt.count ? ""
            : tt.freeShipping ? `<span class="cf-pill ok">${esc(t("شحن مجاني"))}</span>`
            : tt.freeEligible ? `<span class="cf-pill">${esc(t("باقي {amount}", { amount: short(tt.leftForFree) }))}</span>`
            : `<span class="cf-pill">${esc(local(tt.total !== undefined ? tt.total : tt.afterDiscount))}</span>`;
        el.href = ATHR.url.page("cart");
        el.hidden = false;
        el.classList.toggle("has-items", tt.count > 0);
        el.setAttribute("aria-label", `${t("السلة")} (${tt.count})`);
        el.innerHTML = `<span class="cf-ring" style="--p:${Math.max(0, pct)}%"><span class="cf-in">${CART_ICON}<small>${esc(t("السلة"))}</small></span></span>
            ${tt.count ? `<b class="cf-count">${tt.count > 99 ? "99+" : tt.count}</b>` : ""}${pill}`;
        if (bump) {
            el.classList.remove("bump");
            void el.offsetWidth;
            el.classList.add("bump");
        }
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
                        ? `<a class="btn btn-primary" href="${BASE}checkout/">${esc(t("إتمام الطلب ({n})", { n: computeCart().count }))}</a>`
                        : `<button class="btn btn-primary" type="button" data-pdp-add="${esc(p.id)}">${esc(ct("texts.add_to_cart"))}</button>`}
                </div>`;
            }
        } else if (S.loaded && r === "cart") {
            const tt = computeCart();
            if (tt.count) html = `<div class="buybar-inner"><div class="bb-info"><b>${money(tt.afterDiscount)}</b><small>${ATHR.piecesText(tt.count)}</small></div><a class="btn btn-primary" href="${BASE}checkout/">${esc(t("متابعة الطلب"))}</a></div>`;
        } else if (S.loaded && r === "checkout") {
            if (computeCart().count) {
                const tt = checkoutTotals();
                html = `<div class="buybar-inner"><div class="bb-info"><b>${money(tt.total)}</b><small>${esc(t("الإجمالي مع التوصيل"))}</small></div><button class="btn btn-primary" type="submit" form="checkoutForm">${esc(t("تأكيد الطلب"))}</button></div>`;
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
            ${action === "add" ? `<button class="btn btn-ghost btn-sm" type="button" data-add-mini="${esc(p.id)}" aria-label="${esc(t("أضف {name}", { name: V.pname(p) }))}">+ ${esc(t("أضف"))}</button>` : ""}
        </div>`;
    }

    function progressHTML(totals) {
        const cfg = C();
        const parts = [];
        const freeMin = Number(cfg.order.free_min) || 0;
        if (totals.freeEligible && freeMin > 0) {
            const pct = Math.min(100, (totals.afterDiscount / freeMin) * 100);
            parts.push(`<div class="progress${totals.freeShipping ? " done" : ""}">
                <span>${esc(totals.freeShipping ? fill(ct("sales.free_done")) : fill(ct("sales.free_during"), { left: money(totals.leftForFree) }))}</span>
                <div class="meter"><span style="width:${pct}%"></span></div>
            </div>`);
        }
        const vol = totals.volume;
        if (vol && vol.tiers.length) {
            if (vol.next) {
                const need = vol.next.min - totals.count;
                const now = vol.tier && totals.discountType === "volume" ? `${esc(t("خصمك الآن {pct}%.", { pct: vol.tier.pct }))} ` : "";
                parts.push(`<p class="vol-hint">${V.icon.tag}<span>${now}${t("أضف {pieces} ووفّر <b>{pct}%</b> على طلبك كله", { pieces: esc(ATHR.piecesText(need)), pct: vol.next.pct })}</span></p>`);
            } else if (vol.tier && totals.discountType === "volume") {
                parts.push(`<p class="vol-hint ok">${V.icon.check}<span>${esc(t("حصلت على خصم الكمية {pct}%", { pct: vol.tier.pct }))}</span></p>`);
            }
        }
        return parts.join("");
    }

    function openAdded(ids, { refresh = false } = {}) {
        const cfg = C();
        const vv = v();
        S.lastAdded = ids;
        if (!cfg.sales.upsell_show) {
            toast(t("أُضيف إلى السلة"));
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
            const other = productById(offer.b);
            return `<div class="added-offer">
                <b>${esc(t("أكمل الطقم ووفّر {pct}%", { pct: Number(offer.pct) }))}</b>
                ${miniItem(other, { action: "none" })}
                <button class="btn btn-primary btn-sm" type="button" data-add-mini="${esc(other.id)}">${esc(t("أضف بخصم {pct}%", { pct: Number(offer.pct) }))}</button>
            </div>`;
        })() : "";
        const html = `
            <div class="sheet-head">
                <h2>${V.icon.check} ${esc(ids.length > 1 ? t("أُضيف الطقم إلى سلتك") : t("أُضيف إلى سلتك"))}</h2>
                <button class="close" type="button" data-close-sheet aria-label="${esc(t("إغلاق"))}">×</button>
            </div>
            <div class="added-items">${added.map((p) => miniItem(p, { action: "none" })).join("")}</div>
            ${progressHTML(totals)}
            ${offerHTML}
            ${suggestions.length ? `<h3 class="added-title">${esc(ct("sales.related_title") || t("قد يعجبك أيضاً"))}</h3><div class="added-list">${suggestions.map((p) => miniItem(p)).join("")}</div>` : ""}
            <div class="added-actions">
                ${cfg.sales.gift_enabled && session.get(KEYS.giftIntent) ? V.giftCta(vv, { href: `${BASE}checkout/?gift=1`, title: t("أكمل طلب الهدية"), sub: money(totals.afterDiscount) }) : ""}
                <a class="btn btn-primary btn-block" href="${BASE}checkout/">${esc(t("إتمام الطلب"))} · ${money(totals.afterDiscount)}</a>
                <a class="btn btn-ghost btn-block" href="${BASE}cart/">${esc(t("عرض السلة ({n})", { n: totals.count }))}</a>
                <button class="link-btn" type="button" data-close-sheet>${esc(t("مواصلة التسوق"))}</button>
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
        openSheet(html, { modal: true, label: t("أُضيف إلى السلة"), kind: "added" });
    }

    // =====================================================
    // WHATSAPP MESSAGES
    // =====================================================

    function quickOrderMessage(lines, totals) {
        return ATHR.withLang("ar", () => quickOrderMessageAr(lines, totals));
    }

    function quickOrderMessageAr(lines, totals) {
        const cfg = C();
        const c = CC();
        const decimals = Number.isInteger(Number(cfg.order.decimals)) ? Number(cfg.order.decimals) : 3;
        const num = (v) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        const out = [fill(cfg.texts.wa_first_line), `🧾 رقم الطلب: ${ATHR.newOrderNo()}`];
        if (!isBase()) out.push(`📍 ${c.flag} ${c.name}`);
        out.push("", ...lines.map((l) => `• ${ATHR.productLabel(l.product, cfg)}${l.qty > 1 ? ` ×${l.qty}` : ""} · ${num(l.total)}`));
        if (totals.discount > 0) out.push(`${totals.discountLabel}: -${num(totals.discount)}`);
        out.push(`💰 المجموع: ${money(totals.afterDiscount)} (بدون التوصيل)${approx(totals.afterDiscount)}`);
        out.push("", isBase() ? "اسمي وولايتي وعنواني:" : "اسمي ومدينتي وعنواني:");
        return out.filter((l, i) => l !== "" || i > 0).join("\n");
    }

    function quickOrder(lines) {
        const cfg = C();
        const totals = ATHR.computeCart(lines.map((l) => ({ id: l.product.id, qty: l.qty })), S.products, cfg, S.country);
        window.open(ATHR.waLink(cfg.order.whatsapp, quickOrderMessage(totals.lines, totals)), "_blank", "noopener");
    }

    function orderMessage(order) {
        return ATHR.withLang("ar", () => orderMessageAr(order));
    }

    function orderMessageAr(order) {
        const cfg = C();
        const card = order.gift && order.gift_name && cfg.sales.gift_card !== false;
        return ATHR.orderText(order, cfg, {
            first: fill(cfg.texts.wa_first_line),
            last: fill(cfg.texts.wa_last_line || ""),
            cardUrl: card ? new URL(ATHR.giftCardPath(order), location.origin).href : ""
        });
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
            return { title: t("أضف {amount} واحصل على توصيل مجاني", { amount: money(left) }), items: list.slice(0, 4) };
        }
        const related = V.relatedFor(vv, Array.from(inCart), 4);
        if (totals.volume && totals.volume.next) {
            return { title: t("أضف {pieces} ووفّر {pct}%", { pieces: ATHR.piecesText(totals.volume.next.min - totals.count), pct: totals.volume.next.pct }), items: related };
        }
        return { title: ct("sales.related_title"), items: related };
    }

    function renderCart({ keep = false } = {}) {
        const cfg = C();
        const totals = computeCart();
        const view = $("#view");
        const top = window.scrollY;

        if (!totals.lines.length) {
            const best = V.bestSellers(v());
            view.innerHTML = `<div class="wrap"><h1 class="page-title">${esc(t("السلة"))}</h1>
                <div class="panel empty"><p>${esc(t("سلتك فارغة. اختر تصميمك وأضفه للسلة."))}</p><a class="btn btn-primary" href="${BASE}">${esc(t("تصفّح المنتجات"))}</a></div></div>
                ${best.length ? V.rail(v(), { id: "best", title: ct("sales.best_title"), items: best }) : ""}`;
            return;
        }

        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const delivery = ATHR.deliveriesFor(cfg, S.country);
        const c = CC();
        const sug = cfg.sales.related_show ? cartSuggestions(totals) : { items: [] };

        view.innerHTML = `
            <div class="wrap">
                <h1 class="page-title">${esc(t("السلة"))} <small class="muted">(${ATHR.piecesText(totals.count)})</small></h1>
                <div class="layout-2">
                    <div>
                        <div class="panel">
                            ${totals.lines.map((l) => `
                                <div class="cart-line">
                                    <a href="${ATHR.url.product(l.product)}">${V.img(l.product) ? `<img src="${esc(V.img(l.product))}" alt="" width="74" height="92">` : ""}</a>
                                    <div>
                                        <a class="name" href="${ATHR.url.product(l.product)}">${esc(V.pname(l.product))}</a>
                                        <div>${V.colorTag(v(), l.product)}</div>
                                        <div class="muted small">${esc(t("{price} للقطعة", { price: money(l.product.price) }))}</div>
                                        <div class="cart-line-foot">
                                            <div class="stepper" role="group" aria-label="${esc(t("الكمية"))}">
                                                <button type="button" data-inc="${esc(l.product.id)}" aria-label="${esc(t("زيادة"))}"${l.qty >= maxQty() ? " disabled" : ""}>+</button>
                                                <output>${l.qty}</output>
                                                <button type="button" data-dec="${esc(l.product.id)}" aria-label="${esc(t("إنقاص"))}">−</button>
                                            </div>
                                            <b>${money(l.total)}</b>
                                        </div>
                                        <button class="remove" type="button" data-remove="${esc(l.product.id)}">${esc(t("حذف"))}</button>
                                    </div>
                                </div>`).join("")}
                        </div>
                        ${progressHTML(totals) ? `<div class="panel">${progressHTML(totals)}</div>` : ""}
                        ${totals.savings.length || totals.hints.length ? `<div class="panel">
                            ${totals.savings.map((s) => `<div class="save-line"><span>${esc(t("وفر الطقم: {name} بخصم {pct}%", { name: V.pname(s.b), pct: s.pct }))}${s.pairs > 1 ? ` × ${s.pairs}` : ""}</span><span>-${money(s.amount)}</span></div>`).join("")}
                            ${totals.hints.map((h) => `<div class="hint"><span>${esc(t("أكمل الطقم ووفّر: «{name}» بخصم {pct}%", { name: V.label(v(), h.b), pct: h.pct }))}</span><button class="btn btn-primary btn-sm" type="button" data-add-quiet="${esc(h.b.id)}">${esc(t("أضف"))}</button></div>`).join("")}
                        </div>` : ""}
                        ${sug.items.length ? `<div class="panel"><h2>${esc(sug.title)}</h2><div class="added-list">${sug.items.map((p) => miniItem(p).replace("data-add-mini", "data-add-quiet")).join("")}</div></div>` : ""}
                    </div>
                    <aside>
                        <div class="panel">
                            <h2>${esc(t("ملخص الطلب"))}</h2>
                            <div class="rows">
                                <div class="row"><span>${esc(t("المنتجات ({n})", { n: totals.count }))}</span><span>${money(totals.subtotal)}</span></div>
                                ${totals.discount > 0 ? `<div class="row ok"><span>${esc(ATHR.discountName(totals))}</span><span>-${money(totals.discount)}</span></div>` : ""}
                                <div class="row"><span>${esc(t("التوصيل إلى {flag} {country}", { flag: c.flag, country: L(c, "name") }))}</span><span class="muted">${esc(totals.freeShipping ? t("مجاني") : delivery.length ? t("يُحدَّد في الخطوة التالية") : t("غير متاح حاليًا"))}</span></div>
                                ${totals.freeShipping || !delivery.length ? "" : `<ul class="ship-list">${delivery.map((d) => `<li><span class="muted">${esc(L(d, "name"))}</span><span>${esc(V.deliveryPriceLabel(v(), d))}</span></li>`).join("")}</ul>`}
                                <div class="row total"><span>${esc(t("المجموع"))}</span><span>${money(totals.afterDiscount)}</span></div>
                                ${isBase() ? "" : `<div class="row muted"><span>${esc(t("بعملتك تقريبًا"))}</span><span>≈ ${local(totals.afterDiscount)}</span></div>`}
                            </div>
                            <div class="cart-actions">
                                <a class="btn btn-primary btn-block" href="${BASE}checkout/">${esc(t("متابعة الطلب"))}</a>
                                ${cfg.sales.gift_enabled && cfg.sales.gift_button ? V.giftCta(v(), { href: `${BASE}checkout/?gift=1`, attrs: "data-gift-start", title: t("أرسل الطلب هدية") }) : ""}
                                ${cfg.sales.wa_quick && wa ? `<button class="btn btn-wa btn-block" type="button" data-wa-cart>${V.waIcon()}${esc(t("اطلب عبر واتساب"))}</button>` : ""}
                                <a class="link-btn center" href="${BASE}">${esc(t("مواصلة التسوق"))}</a>
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

    function wilayaOptions() {
        return Object.values(WILAYAS).flat().map((w) => `<option value="${esc(w)}">`).join("");
    }

    // هدية: الطلب يُرسل لشخص آخر (رقم صاحب الهدية ورقم المُهدى إليه وعنوانه)
    function giftOn() {
        return Boolean(C().sales.gift_enabled);
    }

    function giftMode(keep) {
        if (!giftOn()) return false;
        if (keep && keep.gift !== undefined) return keep.gift === "1";
        return new URLSearchParams(location.search).get("gift") === "1" || Boolean(session.get(KEYS.giftIntent));
    }

    // «أرسل هدية» من الرئيسية أو القائمة أو السلة: نجهّز وضع الهدية
    function giftStart() {
        session.set(KEYS.giftIntent, "1");
        closeSheet();
        locStash.self = null;
        locStash.gift = null;
        if (computeCart().count) {
            navigate(`${BASE}checkout/?gift=1`);
            return;
        }
        if (S.route.name !== "home") navigate(`${BASE}#catalog`);
        else document.getElementById("catalog")?.scrollIntoView({ block: "start", behavior: "smooth" });
        renderBars();
        toast(t("اختر الهدية ثم اضغط «أرسله هدية» 🎁"));
    }

    // خط عربي مزخرف لبطاقة الإهداء فقط
    function giftFont() {
        const font = (C().gift || {}).font || "Aref Ruqaa";
        const param = ATHR.FONT_PARAMS[font];
        let link = document.getElementById("giftFont");
        if (!param) {
            if (link) link.remove();
            return;
        }
        const href = `https://fonts.googleapis.com/css2?family=${param}&display=swap`;
        if (!link) {
            link = document.createElement("link");
            link.id = "giftFont";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    }

    function giftEnd() {
        session.del(KEYS.giftIntent);
    }

    function giftPayments(list, gift) {
        if (!gift || !C().sales.gift_prepaid) return list;
        const prepaid = list.filter((p) => p.type !== "cod");
        return prepaid.length ? prepaid : list;
    }

    const LOC_KEYS = ["wilaya", "gov", "address", "office"];
    const GIFT_KEYS = ["gift_name", "gift_phone", "gift_message", "gift_hide_price", "gift_seen", "sender_country", "gift_occasion", "gift_for"];

    // اختيار الزبون: الهدية لولد (أزرق) أو لبنت (وردي)
    function giftForField(saved) {
        const cfg = C();
        if (!ATHR.giftGendersOn(cfg)) return "";
        const opt = (id) => {
            const f = ATHR.giftFor(id, cfg);
            return `<label class="gfor-opt gfor-${id}" style="--gf:${esc(f.colors.box)};--gf-bg:${esc(f.colors.bg)}"><input type="radio" name="gift_for" value="${id}"${saved.gift_for === id ? " checked" : ""}><span><i aria-hidden="true">${esc(f.emoji)}</i><b>${esc(L(f, "label"))}</b><em aria-hidden="true"><s></s><s></s></em></span></label>`;
        };
        return `<div class="field gfor-field" data-field="gift_for"><span>${esc(t("الهدية لـ"))}</span>
            <div class="gfor" role="radiogroup" aria-label="${esc(t("الهدية لـ"))}">${opt("boy")}${opt("girl")}</div>
            <small>${esc(t("نلوّن بطاقة الإهداء على حسب اختيارك."))}</small>
            <span class="err" data-err="gift_for"></span>
        </div>`;
    }

    function giftSugs(occasion) {
        const o = ATHR.giftOccasion(occasion, C());
        return L(o, "msgs").map((m) => `<button type="button" class="sug" data-gift-sug="${esc(m)}">${esc(m)}</button>`).join("");
    }
    const locStash = { self: null, gift: null };

    function locationField(c, saved, gift) {
        const cfg = C();
        if (c.code === "OM") {
            if (!gift && !cfg.order.show_wilaya) return "";
            const required = gift || cfg.order.wilaya_required;
            return field("wilaya", required ? (gift ? t("ولاية المُهدى إليه") : t("الولاية")) : t("الولاية (اختياري)"), `<input class="input" name="wilaya" list="wilayaList" autocomplete="off" placeholder="${esc(t("مثال: السيب"))}" value="${esc(saved.wilaya || "")}"><datalist id="wilayaList">${wilayaOptions()}</datalist>`);
        }
        const label = c.code === "AE" ? t("الإمارة / المدينة") : t("المدينة");
        return field("gov", gift ? t("{label} (للمُهدى إليه)", { label }) : label, `<input class="input" name="gov" autocomplete="${gift ? "off" : "address-level2"}" value="${esc(saved.country === c.code ? saved.gov || "" : "")}" required>`);
    }

    function renderCheckout(keep = null) {
        const cfg = C();
        const totals = computeCart();
        if (!totals.lines.length) {
            navigate(`${BASE}cart/`, { replace: true });
            return;
        }
        const base = savedCustomer() || {};
        const gift = giftMode(keep);
        const saved = keep || (gift ? { ...base, wilaya: "", gov: "", address: "", office: "" } : base);
        const c = CC();
        const rule = ATHR.PHONE_RULES[c.code] || ATHR.PHONE_RULES.OM;
        const delivery = ATHR.deliveriesFor(cfg, c.code);
        const payments = giftPayments(ATHR.paymentsFor(cfg, c.code), gift);
        const pickDelivery = delivery.find((d) => d.id === saved.delivery) || delivery[0];
        const pickPayment = payments.find((p) => p.id === saved.payment) || payments[0];
        const countries = ATHR.countries(cfg).filter((x) => x.enabled);
        const senderCode = gift ? ((keep && keep.sender_country) || base.country || c.code) : c.code;
        const sender = ATHR.country(cfg, senderCode);
        const senderRule = ATHR.PHONE_RULES[sender.code] || rule;
        const myPhone = keep ? (keep.phone || "") : (base.country && base.country !== senderCode ? "" : (base.phoneLocal || (senderCode === "OM" ? base.phone : "") || ""));
        const hidePrice = keep && keep.gift_seen ? Boolean(keep.gift_hide_price) : true;
        const countryField = countries.length > 1
            ? field("country", gift ? t("دولة المُهدى إليه") : t("الدولة"), `<select class="input" name="country" id="countrySelect">${countries.map((x) => `<option value="${x.code}"${x.code === c.code ? " selected" : ""}>${x.flag} ${esc(L(x, "name"))}</option>`).join("")}</select>`)
            : "";
        const senderDial = gift && countries.length > 1
            ? `<select class="dial dial-pick" name="sender_country" id="senderCountry" dir="ltr" aria-label="${esc(t("مفتاح الدولة"))}">${countries.map((x) => `<option value="${x.code}"${x.code === sender.code ? " selected" : ""}>${x.flag} +${x.dial}</option>`).join("")}</select>`
            : `<span class="dial" dir="ltr">+${sender.dial}</span>`;

        $("#view").innerHTML = `
            <div class="wrap">
                <h1 class="page-title">${esc(gift ? t("إرسال هدية") : t("إتمام الطلب"))}</h1>
                <details class="sum-mobile">
                    <summary><span>${esc(t("ملخص الطلب ({pieces})", { pieces: ATHR.piecesText(totals.count) }))}</span><b id="sumMobileTotal"></b></summary>
                    <div id="checkoutSummaryM"></div>
                </details>
                <form class="layout-2" id="checkoutForm" novalidate>
                    <div class="form">
                        ${saved.name && !keep ? `<div class="saved-note"><span>${esc(t("عبّأنا بياناتك من طلبك السابق."))}</span><button class="link-btn" type="button" data-forget-me>${esc(t("مسح بياناتي"))}</button></div>` : ""}
                        ${giftOn() ? `<div class="panel who-pick">
                            <h2>${esc(t("لمن الطلب؟"))}</h2>
                            <div class="seg2" role="radiogroup" aria-label="${esc(t("لمن الطلب؟"))}">
                                <label><input type="radio" name="gift" value="0"${gift ? "" : " checked"}><span>${V.icon.user}${esc(t("لي"))}</span></label>
                                <label><input type="radio" name="gift" value="1"${gift ? " checked" : ""}><span>${V.icon.gift}${esc(t("هدية لشخص"))}</span></label>
                            </div>
                            ${gift ? `<p class="muted small" style="margin:8px 0 0">${esc(t("نوصل الهدية للمُهدى إليه، ونتواصل معك لتأكيد الطلب."))}</p>` : ""}
                        </div>` : ""}
                        <div class="panel form">
                            <h2>${esc(gift ? t("بياناتك (صاحب الهدية)") : t("بياناتك"))}</h2>
                            ${gift ? "" : countryField}
                            ${field("name", gift ? t("اسمك") : t("الاسم الكامل"), `<input class="input" name="name" autocomplete="name" value="${esc(saved.name || "")}" required>`)}
                            ${field("phone", gift ? t("رقمك (واتساب)") : t("رقم الهاتف (واتساب)"), `<span class="phone-wrap">${senderDial}<input class="input" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" dir="ltr" placeholder="${senderRule.example}" value="${esc(myPhone)}" required></span>`, esc(t("رقم {country}: {hint}", { country: L(sender, "name"), hint: L(senderRule, "hint") })))}
                            ${gift ? "" : locationField(c, saved, false)}
                            <input type="hidden" name="mk_seen" value="1">
                            <label class="check-line mk-line"><input type="checkbox" name="marketing_ok" value="1"${(keep && keep.mk_seen ? Boolean(keep.marketing_ok) : base.marketing_ok !== undefined ? base.marketing_ok !== false : cfg.sales.marketing_default !== false) ? " checked" : ""}><span>${esc(t("أرسلوا لي العروض والخصومات على واتساب"))}</span></label>
                        </div>
                        ${gift ? `<div class="panel form gift-panel">
                            <h2>${V.icon.gift}${esc(t("بيانات المُهدى إليه"))}</h2>
                            <input type="hidden" name="gift_seen" value="1">
                            ${giftForField(saved)}
                            ${countryField}
                            ${field("gift_name", t("اسم المُهدى إليه"), `<input class="input" name="gift_name" maxlength="120" autocomplete="off" value="${esc(saved.gift_name || "")}" required>`)}
                            ${field("gift_phone", t("رقم المُهدى إليه"), `<span class="phone-wrap"><span class="dial" dir="ltr">+${c.dial}</span><input class="input" name="gift_phone" type="tel" inputmode="numeric" autocomplete="off" dir="ltr" placeholder="${rule.example}" value="${esc(saved.gift_phone || "")}" required></span>`, esc(t("نتواصل معه لتنسيق التوصيل فقط.")))}
                            ${locationField(c, saved, true)}
                            <div class="field occ-field"><span>${esc(t("المناسبة"))}</span>
                                <div class="occ-chips" role="radiogroup" aria-label="${esc(t("المناسبة"))}">${ATHR.giftOccasions(cfg, { all: false }).map((o) => `<label class="occ"><input type="radio" name="gift_occasion" value="${o.id}"${(saved.gift_occasion || "other") === o.id ? " checked" : ""}><span>${o.emoji} ${esc(L(o, "name"))}</span></label>`).join("")}</div>
                            </div>
                            ${field("gift_message", t("رسالة الهدية (اختياري)"), `<textarea class="input" name="gift_message" rows="2" maxlength="300" placeholder="${esc(t("اكتب رسالتك أو اختر من المقترحات"))}">${esc(saved.gift_message || "")}</textarea>`)}
                            <div class="msg-sugs" id="msgSugs">${giftSugs(saved.gift_occasion)}</div>
                            ${cfg.sales.gift_card !== false ? `<p class="gift-card-note">💌 ${esc(t("يستلم المُهدى إليه بطاقة إهداء رقمية جميلة فيها اسمه ورسالتك، ترسلها له بعد تأكيد الطلب."))}</p>` : ""}
                            <label class="check-line"><input type="checkbox" name="gift_hide_price" value="1"${hidePrice ? " checked" : ""}><span>${esc(t("لا تذكر السعر للمُهدى إليه"))}</span></label>
                        </div>` : ""}
                        <div class="panel form">
                            <h2>${esc(t("طريقة التوصيل"))}</h2>
                            ${delivery.length ? `<div class="choice" role="radiogroup">
                                ${delivery.map((d) => `<label class="option">
                                    <input type="radio" name="delivery" value="${esc(d.id)}"${pickDelivery && pickDelivery.id === d.id ? " checked" : ""}>
                                    <span><b>${esc(L(d, "name"))}</b>${L(d, "note") ? `<small>${esc(L(d, "note"))}</small>` : ""}${d.duration ? `<small>${esc(t("المدة: {d}", { d: ATHR.duration(d.duration) }))}</small>` : ""}</span>
                                    <span class="opt-price" data-ship-price="${esc(d.id)}"></span>
                                </label>`).join("")}
                            </div>` : `<p class="err">${esc(t("التوصيل إلى {country} غير متاح حاليًا. تواصل معنا عبر واتساب.", { country: L(c, "name") }))}</p>`}
                            <div id="addressField"></div>
                            ${cfg.order.show_notes ? field("notes", t("ملاحظات (اختياري)"), `<textarea class="input" name="notes" rows="2" maxlength="500">${esc(keep ? keep.notes || "" : "")}</textarea>`) : ""}
                        </div>
                        <div class="panel form">
                            <h2>${esc(t("طريقة الدفع"))}</h2>
                            ${payments.length ? `<div class="choice" role="radiogroup">
                                ${payments.map((p) => `<label class="option">
                                    <input type="radio" name="payment" value="${esc(p.id)}"${pickPayment && pickPayment.id === p.id ? " checked" : ""}>
                                    <span><b>${esc(L(p, "name"))}</b>${L(p, "note") ? `<small>${esc(fill(L(p, "note")))}</small>` : ""}</span>
                                    <span></span>
                                </label>`).join("")}
                            </div>` : `<p class="err">${esc(t("لا توجد طريقة دفع متاحة لـ{country} حاليًا.", { country: L(c, "name") }))}</p>`}
                            <div id="payExtra"></div>
                        </div>
                    </div>
                    <aside>
                        <div class="panel">
                            <h2>${esc(t("ملخص الطلب"))}</h2>
                            <div id="couponBox"></div>
                            <div id="checkoutSummary"></div>
                            <div class="cart-actions">
                                <button class="btn btn-primary btn-block" type="submit" id="placeOrder"${delivery.length && payments.length ? "" : " disabled"}>${esc(gift ? t("تأكيد طلب الهدية") : t("تأكيد الطلب"))}</button>
                                <a class="link-btn center" href="${BASE}cart/">${esc(t("رجوع للسلة"))}</a>
                            </div>
                            <div class="err" id="formErr" role="alert"></div>
                            ${V.trust(v())}
                        </div>
                    </aside>
                </form>
            </div>`;

        renderAddressField(saved);
        renderPayExtra();
        renderCouponBox();
        updateCheckoutSummary();
    }

    function isGiftForm() {
        return $('#checkoutForm input[name="gift"]:checked')?.value === "1";
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
        const gift = isGiftForm();
        box.innerHTML = isOffice
            ? field("office", gift ? t("المكتب الذي يستلم منه المُهدى إليه") : t("اسم المكتب"), `<input class="input" name="office" value="${esc(value)}" placeholder="${esc(t("مثال: مكتب جيناكم - السيب"))}">`)
            : field("address", gift ? t("عنوان المُهدى إليه") : t("العنوان"), `<textarea class="input" name="address" rows="2" autocomplete="${gift ? "off" : "street-address"}" placeholder="${esc(t("المنطقة، رقم البيت أو أقرب معلم"))}">${esc(value)}</textarea>`);
    }

    function bankRows(p) {
        const b = p.bank || {};
        const rows = [
            [t("الرقم المفعّل للتحويل"), b.number],
            [t("اسم البنك"), ATHR.isEn() && /صحار الدولي/.test(b.bank || "") ? "Sohar International" : b.bank],
            [t("اسم صاحب الحساب"), b.holder],
            [t("رقم الحساب"), b.account],
            [t("رمز SWIFT"), b.swift],
            ["IBAN", b.iban]
        ].filter(([, value]) => value && String(value).trim());
        const hasAccount = [b.number, b.account, b.iban].some((value) => value && String(value).trim());
        if (!hasAccount) return `<p class="muted" style="margin:10px 0 0">${esc(t("نرسل لك بيانات الحساب للتحويل عبر واتساب بعد إرسال الطلب."))}</p>`;
        return `<div class="bank">${rows.map(([label, value]) => `
            <div class="bank-row"><div><small>${label}</small><strong>${esc(value)}</strong></div>
            <button class="copy" type="button" data-copy="${esc(value)}">${esc(t("نسخ"))}</button></div>`).join("")}</div>`;
    }

    function renderPayExtra() {
        const box = $("#payExtra");
        if (!box) return;
        const p = selectedPayment();
        if (p && p.type === "bank") box.innerHTML = bankRows(p);
        else if (p && p.type === "online") box.innerHTML = `<p class="muted" style="margin:10px 0 0">${esc(t("بعد تأكيد الطلب يظهر لك زر الانتقال لصفحة الدفع."))}</p>`;
        else if (p && p.type === "cod" && isGiftForm()) box.innerHTML = `<p class="muted gift-cod" style="margin:10px 0 0">${esc(t("بالدفع عند الاستلام يُدفع المبلغ عند تسليم الهدية. لتكون مفاجأة كاملة اختر الدفع المسبق."))}</p>`;
        else box.innerHTML = "";
    }

    function checkoutTotals() {
        const totals = computeCart();
        const d = selectedDelivery() || ATHR.deliveriesFor(C(), S.country)[0];
        const shipping = ATHR.shippingFor(d, totals.lines, C());
        const coupon = C().sales.coupons === false ? null : S.coupon;
        const eff = ATHR.couponEffect(coupon, totals.afterDiscount);
        const freeShip = totals.freeShipping || eff.freeShip;
        const ship = freeShip ? 0 : shipping.cost;
        return {
            ...totals, ship, kg: freeShip ? 0 : shipping.kg, delivery: d,
            coupon: coupon && coupon.code ? coupon : null, couponAmount: eff.amount, couponFree: eff.freeShip, couponShort: eff.short,
            total: Math.round((totals.afterDiscount - eff.amount + ship) * 1000) / 1000
        };
    }

    function updateCheckoutSummary() {
        const box = $("#checkoutSummary");
        if (!box) return;
        const tt = checkoutTotals();
        if (!tt.lines.length) {
            navigate(`${BASE}cart/`, { replace: true });
            return;
        }
        $$("[data-ship-price]").forEach((el) => {
            const d = ATHR.deliveriesFor(C(), S.country).find((x) => x.id === el.dataset.shipPrice);
            const s = ATHR.shippingFor(d, tt.lines, C());
            el.textContent = tt.freeShipping || !(s.cost > 0) ? t("مجاني") : money(s.cost);
        });
        const html = `<div class="rows">
            ${tt.lines.map((l) => `<div class="row"><span>${esc(V.label(v(), l.product))} × ${l.qty}</span><span>${money(l.total)}</span></div>`).join("")}
            ${tt.discount > 0 ? `<div class="row ok"><span>${esc(ATHR.discountName(tt))}</span><span>-${money(tt.discount)}</span></div>` : ""}
            ${tt.couponAmount > 0 ? `<div class="row ok"><span>🎟️ ${esc(t("كود {code}", { code: tt.coupon.code }))}</span><span>-${money(tt.couponAmount)}</span></div>` : ""}
            <div class="row"><span>${esc(tt.kg ? t("التوصيل ({kg} كيلو تقريبًا)", { kg: tt.kg }) : t("التوصيل"))}</span><span>${tt.ship > 0 ? money(tt.ship) : esc(t("مجاني"))}</span></div>
            <div class="row total"><span>${esc(t("الإجمالي"))}</span><span>${money(tt.total)}</span></div>
            ${isBase() ? "" : `<div class="row muted"><span>${esc(t("بعملتك تقريبًا"))}</span><span>≈ ${local(tt.total)}</span></div>`}
            ${tt.kg ? `<p class="muted small" style="margin:4px 0 0">${esc(t("سعر التوصيل حسب الوزن التقريبي، ونؤكد لك الوزن النهائي قبل الشحن."))}</p>` : ""}
        </div>`;
        box.innerHTML = html;
        if (S.coupon && $("#couponBox .coupon-on")) renderCouponBox();
        const m = $("#checkoutSummaryM");
        if (m) m.innerHTML = html;
        const mt = $("#sumMobileTotal");
        if (mt) mt.textContent = money(tt.total);
        renderBuyBar();
    }

    function validateCheckout(form) {
        const cfg = C();
        const values = Object.fromEntries(new FormData(form).entries());
        const errors = {};
        const isOm = S.country === "OM";
        const gift = giftOn() && values.gift === "1";
        const senderCode = gift && values.sender_country ? values.sender_country : S.country;
        const name = String(values.name || "").trim();
        const phone = ATHR.parsePhone(values.phone, senderCode);
        const giftPhone = gift ? ATHR.parsePhone(values.gift_phone, S.country) : null;
        const d = selectedDelivery();
        const p = selectedPayment();

        if (name.length < 3) errors.name = t("اكتب اسمك الكامل (3 أحرف على الأقل).");
        if (!phone.valid) errors.phone = t("اكتب رقم {country} الصحيح: {hint}.", { country: L(ATHR.country(cfg, senderCode), "name"), hint: L(phone.rule, "hint") });
        if (gift) {
            if (ATHR.giftGendersOn(cfg) && !ATHR.GIFT_FOR.includes(values.gift_for)) errors.gift_for = t("اختر: الهدية لولد أو لبنت.");
            if (String(values.gift_name || "").trim().length < 2) errors.gift_name = t("اكتب اسم المُهدى إليه.");
            if (!giftPhone.valid) errors.gift_phone = t("اكتب رقم المُهدى إليه الصحيح: {hint}.", { hint: L(giftPhone.rule, "hint") });
            else if (phone.valid && ATHR.storePhone(giftPhone.local, S.country, "XX") === ATHR.storePhone(phone.local, senderCode, "XX")) errors.gift_phone = t("رقم المُهدى إليه نفس رقمك. اكتب رقم الشخص الذي ستصله الهدية.");
        }
        if (!isOm && !String(values.gov || "").trim()) errors.gov = t("اكتب المدينة.");
        if (isOm && (gift || (cfg.order.show_wilaya && cfg.order.wilaya_required)) && !String(values.wilaya || "").trim()) errors.wilaya = gift ? t("اكتب ولاية المُهدى إليه.") : t("اكتب الولاية.");
        if (!d) errors.delivery = t("اختر طريقة التوصيل.");
        else if (d.type === "office") {
            if (String(values.office || "").trim().length < 3) errors.office = t("اكتب اسم المكتب (3 أحرف على الأقل).");
        } else if (String(values.address || "").trim().length < 6) errors.address = gift ? t("اكتب عنوان المُهدى إليه بوضوح (6 أحرف على الأقل).") : t("اكتب عنوانك بوضوح (6 أحرف على الأقل).");
        if (!p) errors.payment = t("اختر طريقة الدفع.");

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
        $("#formErr").textContent = keys.length ? (errors.delivery || errors.payment || t("راجع الخانات المظللة بالأحمر.")) : "";
        if (keys.length) {
            const first = form.querySelector(".field.invalid .input, .field.invalid input[type=radio]");
            if (first) {
                first.focus({ preventScroll: true });
                first.scrollIntoView({ block: "center" });
            }
        }
        return keys.length ? null : { values, name, phone, d, p, gift, senderCode, giftPhone };
    }

    let placing = false;

    async function placeOrder(form) {
        if (placing) return;
        const ok = validateCheckout(form);
        if (!ok) return;
        placing = true;
        try {
            await submitOrder(ok);
        } catch (error) {
            console.error("Order failed:", error);
            const button = $("#placeOrder");
            if (button) {
                button.disabled = false;
                button.textContent = t("تأكيد الطلب");
            }
            toast(t("تعذر إرسال الطلب. حاول مرة أخرى."));
        } finally {
            placing = false;
        }
    }

    async function submitOrder(ok) {
        const cfg = C();
        const { values, name, phone, d, p, gift, senderCode, giftPhone } = ok;
        const isOm = S.country === "OM";
        const tt = checkoutTotals();
        const button = $("#placeOrder");
        button.disabled = true;
        button.textContent = t("جاري تأكيد الطلب...");
        const channel = orderChannel();

        const order = {
            order_no: ATHR.newOrderNo(),
            ordered_at: new Date().toISOString(),
            source: "web",
            country: S.country,
            channel,
            customer_name: name,
            phone: ATHR.storePhone(phone.local, senderCode, S.country),
            governorate: isOm ? null : String(values.gov || "").trim(),
            wilaya: isOm && (gift || cfg.order.show_wilaya) ? String(values.wilaya || "").trim() || null : null,
            address: d.type === "office" ? null : String(values.address || "").trim(),
            office: d.type === "office" ? String(values.office || "").trim() : null,
            notes: cfg.order.show_notes ? String(values.notes || "").trim() || null : null,
            gift,
            gift_message: gift ? String(values.gift_message || "").trim().slice(0, 300) || null : null,
            gift_name: gift ? String(values.gift_name || "").trim().slice(0, 120) : null,
            gift_phone: gift ? giftPhone.stored : null,
            gift_hide_price: gift && Boolean(values.gift_hide_price),
            gift_occasion: gift ? ATHR.giftOccasion(values.gift_occasion, cfg).id : null,
            gift_for: gift && ATHR.giftGendersOn(cfg) && ATHR.GIFT_FOR.includes(values.gift_for) ? values.gift_for : null,
            marketing_ok: Boolean(values.marketing_ok),
            delivery_name: d.name,
            delivery_type: d.type === "office" ? "office" : "home",
            delivery_price: tt.ship,
            payment_name: p.name,
            payment_type: ["cod", "bank", "online", "other"].includes(p.type) ? p.type : "other",
            items: tt.lines.map((l) => ({
                id: l.product.id,
                name: l.product.name,
                color: colorById(l.product.color_id)?.name || null,
                label: ATHR.productLabel(l.product, cfg),
                qty: l.qty,
                price: Number(l.product.price),
                total: l.total
            })),
            subtotal: tt.subtotal,
            discount: tt.discount,
            discount_label: tt.discount > 0 ? tt.discountLabel : null,
            coupon: tt.coupon ? tt.coupon.code : null,
            coupon_discount: tt.couponAmount || 0,
            total: tt.total
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
            // في الهدية نحفظ اسمك ورقمك فقط، ويبقى عنوانك السابق كما هو
            const prev = storage.get(KEYS.customer, null) || {};
            storage.set(KEYS.customer, gift
                ? { ...prev, name, marketing_ok: Boolean(values.marketing_ok), country: senderCode, phone: senderCode === "OM" ? phone.local : "", phoneLocal: phone.local, ...(prev.country && prev.country !== senderCode ? { gov: "", wilaya: "", address: "", office: "" } : {}) }
                : {
                    name, marketing_ok: Boolean(values.marketing_ok), country: S.country, phone: isOm ? phone.local : "", phoneLocal: phone.local,
                    gov: isOm ? "" : values.gov, wilaya: values.wilaya || "", address: values.address || "", office: values.office || "",
                    delivery: d.id, payment: p.id
                });
        }
        locStash.self = null;
        locStash.gift = null;
        giftEnd();

        track("order");
        pixelSend("Purchase", tt.lines, { value: order.total, eventId: order.order_no });
        const message = orderMessage({ ...order, ship_kg: tt.kg });
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

    function deliveryName(name) {
        const d = (C().order.delivery || []).find((x) => x.name === name);
        return d ? L(d, "name") : name;
    }

    // بطاقة الإهداء الرقمية بعد طلب الهدية: معاينة وإرسال للمُهدى إليه عبر واتساب
    function giftDoneHTML(order, code) {
        const cfg = C();
        if (!order.gift || !order.gift_name || cfg.sales.gift_card === false) return "";
        const occ = ATHR.giftOccasion(order.gift_occasion, cfg);
        const cardUrl = new URL(ATHR.giftCardPath(order), location.origin).href;
        const from = String(order.customer_name || "").trim().split(/\s+/)[0];
        const text = ATHR.giftWhatsApp({ to: order.gift_name, from, msg: order.gift_message, occasion: order.gift_occasion, link: cardUrl, store: ATHR.storeName(cfg), config: cfg });
        const wa = order.gift_phone ? ATHR.waLink(ATHR.customerWhatsapp(order.gift_phone, code), text) : "";
        const gf = ATHR.giftGendersOn(cfg) ? ATHR.giftFor(order.gift_for, cfg) : null;
        return `<div class="panel gift-done${gf ? ` gd-${gf.id}` : ""}"${gf ? ` style="--gd:${esc(gf.colors.box)};--gd-bg:${esc(gf.colors.bg)}"` : ""}>
            <div class="gd-card">
                <span class="gd-emoji" aria-hidden="true">${gf ? gf.emoji : occ.emoji}</span>
                <div><b>${esc(t("بطاقة إهداء لـ{name}", { name: order.gift_name }))}${gf ? ` ${gf.heart}` : ""}</b><small>${esc(order.gift_message || L(occ, "title"))}</small></div>
            </div>
            ${wa ? `<a class="btn btn-wa btn-block" href="${esc(wa)}" target="_blank" rel="noopener">${V.waIcon()}${esc(t("أرسل البطاقة لـ{name} عبر واتساب", { name: order.gift_name }))}</a>` : ""}
            <div class="gd-row">
                <a class="link-btn" href="${esc(cardUrl)}" target="_blank" rel="noopener">${esc(t("معاينة البطاقة"))}</a>
                <button class="link-btn" type="button" data-copy="${esc(cardUrl)}">${esc(t("نسخ رابط البطاقة"))}</button>
            </div>
            <p class="muted small">${esc(t("أرسلها الآن، أو احتفظ بالرابط وأرسلها يوم وصول الهدية."))}</p>
        </div>`;
    }

    function renderDone(no) {
        const cfg = C();
        const last = storage.get(KEYS.lastOrder, null);
        if (!last || last.order.order_no !== no) {
            $("#view").innerHTML = `<div class="wrap empty page"><p>${esc(t("لا توجد تفاصيل لهذا الطلب على هذا الجهاز."))}</p><a class="btn btn-primary" href="${BASE}">${esc(t("العودة للمتجر"))}</a></div>`;
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
                    <h1>${esc(t("شكرًا لك، {name}", { name: order.customer_name.split(" ")[0] }))}</h1>
                    <span class="muted">${esc(t("رقم طلبك"))}</span>
                    <span class="order-no">${esc(order.order_no)}</span>
                </div>
                <div class="step">
                    <p>${esc(t("الخطوة الأخيرة:"))} ${esc(fill(ct("texts.thanks_text")))}</p>
                    ${wa ? `<a class="btn btn-wa btn-block" href="${esc(ATHR.waLink(cfg.order.whatsapp, message))}" target="_blank" rel="noopener">${V.waIcon()}${esc(t("أرسل الطلب عبر واتساب"))}</a>` : ""}
                    ${isOnline ? `<a class="btn btn-primary btn-block" href="${esc(payment.link)}" target="_blank" rel="noopener">${esc(t("ادفع الآن ({amount})", { amount: money(order.total) }))}</a>` : ""}
                    ${payment && payment.type === "bank" ? `<div><p class="muted" style="font-weight:500">${esc(t("حوّل {amount}:", { amount: `${money(order.total)}${code === "OM" ? "" : ` (≈ ${ATHR.moneyIn(order.total, cfg, code)})`}` }))}</p>${bankRows(payment)}</div>` : ""}
                </div>
                ${giftDoneHTML(order, code)}
                <div class="panel">
                    <h2>${esc(t("ملخص الطلب"))}</h2>
                    <div class="rows">
                        ${order.items.map((it) => {
                            const p = productById(it.id);
                            return `<div class="row"><span>${esc(p ? V.label(v(), p) : it.label)} × ${it.qty}</span><span>${money(it.total)}</span></div>`;
                        }).join("")}
                        ${order.discount > 0 ? `<div class="row ok"><span>${esc(discountText(order.discount_label))}</span><span>-${money(order.discount)}</span></div>` : ""}
                        <div class="row"><span>${esc(t("التوصيل ({name})", { name: deliveryName(order.delivery_name) }))}</span><span>${order.delivery_price > 0 ? money(order.delivery_price) : esc(t("مجاني"))}</span></div>
                        <div class="row total"><span>${esc(t("الإجمالي"))}</span><span>${money(order.total)}</span></div>
                        ${code === "OM" ? "" : `<div class="row muted"><span>${esc(t("بعملتك تقريبًا"))}</span><span>≈ ${ATHR.moneyIn(order.total, cfg, code)}</span></div>`}
                        <div class="row"><span class="muted">${esc(t("الدفع"))}</span><span>${esc(payment ? L(payment, "name") : order.payment_name)}</span></div>
                        <div class="row"><span class="muted">${esc(order.delivery_type === "office" ? t("المكتب") : t("العنوان"))}</span><span>${esc(order.office || order.address || "")}</span></div>
                        ${order.gift && order.gift_name ? `<div class="row"><span class="muted">${esc(t("المُهدى إليه"))}</span><span>${esc(order.gift_name)} · <span dir="ltr">${esc(ATHR.phoneText(order.gift_phone, code))}</span></span></div>` : ""}
                        ${order.gift ? `<div class="row"><span class="muted">${esc(t("هدية"))}</span><span>${esc(order.gift_message || t("نعم"))}</span></div>` : ""}
                    </div>
                </div>
                <a class="btn btn-ghost" href="${BASE}">${esc(t("العودة للمتجر"))}</a>
            </div>`;
    }

    // =====================================================
    // REVIEW PAGE (تقييم العميل، يظهر بعد موافقتك)
    // =====================================================

    function renderReview(route, { sent = false } = {}) {
        const vv = v();
        if (sent) {
            $("#view").innerHTML = `<div class="wrap thanks">
                <div class="thanks-head"><div class="check">${V.icon.check}</div><h1>${esc(t("شكرًا لتقييمك"))}</h1>
                <p class="muted">${esc(t("يظهر تقييمك في المتجر بعد مراجعته. رأيك يساعد غيرك يختار."))}</p></div>
                <a class="btn btn-primary" href="${BASE}">${esc(t("العودة للمتجر"))}</a></div>`;
            return;
        }
        const chosen = route.p ? findProduct(route.p) : null;
        const saved = storage.get(KEYS.customer, null) || {};
        const options = vv.products.map((p) => `<option value="${esc(p.id)}"${chosen && chosen.id === p.id ? " selected" : ""}>${esc(V.label(vv, p))}</option>`).join("");
        $("#view").innerHTML = `<div class="wrap page review-page">
            <h1>${esc(t("قيّم تجربتك مع {name}", { name: ATHR.storeName(C()) }))}</h1>
            <p class="muted">${esc(t("رأيك يساعد غيرك يختار، ويساعدنا نتحسن. يظهر تقييمك بعد مراجعته."))}</p>
            ${chosen ? `<div class="review-product">${miniItem(chosen, { action: "none" })}</div>` : ""}
            <form class="panel form" id="reviewForm" novalidate>
                ${field("product", t("المنتج (اختياري)"), `<select class="input" name="product"><option value="">${esc(t("تقييم عام للمتجر"))}</option>${options}</select>`)}
                <fieldset class="rate-input" aria-label="${esc(t("التقييم"))}">
                    <legend>${esc(t("تقييمك"))}</legend>
                    ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="rate${n}" value="${n}"${n === 5 ? " checked" : ""}><label for="rate${n}" title="${esc(t("{r} من 5", { r: n }))}">★</label>`).join("")}
                </fieldset>
                ${field("name", t("اسمك"), `<input class="input" name="name" maxlength="60" value="${esc(saved.name ? saved.name.split(" ")[0] : "")}" autocomplete="given-name">`, esc(t("يظهر الاسم الأول فقط.")))}
                ${field("text", t("رأيك"), `<textarea class="input" name="text" rows="4" maxlength="1000" placeholder="${esc(t("كيف كانت الجودة والتغليف والتوصيل؟"))}"></textarea>`)}
                <input type="hidden" name="order_no" value="${esc(/^[A-Z]{1,4}-[0-9A-Z]{3,10}$/.test(route.o) ? route.o : "")}">
                <p class="err" id="reviewErr" role="alert"></p>
                <button class="btn btn-primary btn-block" type="submit" id="reviewSend">${esc(t("إرسال التقييم"))}</button>
            </form>
        </div>`;
    }

    async function sendReview(form) {
        const values = Object.fromEntries(new FormData(form).entries());
        const err = $("#reviewErr");
        const name = String(values.name || "").trim();
        const text = String(values.text || "").trim();
        const rating = Math.max(1, Math.min(5, Number(values.rating) || 5));
        if (name.length < 2) { err.textContent = t("اكتب اسمك (حرفان على الأقل)."); return; }
        if (text.length < 3) { err.textContent = t("اكتب رأيك في سطر على الأقل."); return; }
        const btn = $("#reviewSend");
        btn.disabled = true;
        btn.textContent = t("جاري الإرسال...");
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
            err.textContent = t("تعذر الإرسال. تأكد من الإنترنت وحاول مرة أخرى.");
            btn.disabled = false;
            btn.textContent = t("إرسال التقييم");
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

    // قائمة النقاط الثلاث: أقسام تنفتح بسهم + اختصارات قليلة + حساباتنا
    let menuCatsOpen = false;

    function openMenu() {
        const cfg = C();
        const vv = v();
        const cats = vv.categories.filter((c) => vv.counts.get(c.id));
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const multi = ATHR.countries(cfg).filter((c) => c.enabled).length > 1;
        const cur = CC();
        const chev = `<span class="mchev">${V.icon.side}</span>`;
        const row = (inner, { href = "", attrs = "", cls = "" } = {}) => href
            ? `<a class="mrow${cls}" href="${href}" ${attrs}>${inner}${chev}</a>`
            : `<button class="mrow${cls}" type="button" ${attrs}>${inner}${chev}</button>`;
        const ico = (svg, extra = "") => `<span class="mi${extra}">${svg}</span>`;
        const parts = [];
        if (cfg.contact.menu_show || S.isAdmin) {
            const main = [];
            if (cfg.contact.menu_home !== false) main.push(row(`${ico(V.icon.home)}<span class="ml">${esc(t("الصفحة الرئيسية"))}</span>`, { href: BASE }));
            if (cfg.sales.favorites !== false) main.push(row(`${ico(V.icon.heart, " fav")}<span class="ml">${esc(t("المفضلة"))}</span>${favIds().length ? `<small class="mval">${favIds().length}</small>` : ""}`, { href: `${BASE}fav/` }));
            if (cats.length) {
                main.push(`<button class="mrow" type="button" data-menu-cats aria-expanded="${menuCatsOpen}" aria-controls="menuCats">${ico(V.icon.grid)}<span class="ml">${esc(t("تسوّق حسب القسم"))}</span><small class="mval">${cats.length}</small><span class="mchev down">${V.icon.chevron}</span></button>
                    <div class="menu-cats" id="menuCats"${menuCatsOpen ? "" : " hidden"}>${cats.map((c) => {
                        const img = V.categoryImage(vv, c);
                        return `<a class="menu-cat" href="${ATHR.url.category(c)}"><span class="mc-img">${img ? `<img src="${esc(img)}" alt="" loading="lazy" width="40" height="40">` : ""}</span><span class="mc-name">${esc(V.cname(c))}</span><small class="mc-n">${vv.counts.get(c.id)}</small></a>`;
                    }).join("")}</div>`);
            }
            if (cfg.sales.gift_enabled) main.push(row(`${ico(V.icon.gift, " gift")}<span class="ml">${esc(t("أرسل هدية"))}<small>${esc(V.giftSub(vv))}</small></span>`, { attrs: "data-gift-start", cls: " mrow-gift" }));
            if (cfg.contact.policy_show) main.push(row(`${ico(V.icon.truck)}<span class="ml">${esc(t("التوصيل والدفع"))}</span>`, { href: `${BASE}shipping/` }));
            parts.push(`<div class="mgroup">${main.join("")}</div>`);

            const settings = [];
            settings.push(`<div class="mrow mrow-set">${ico(V.icon.globe)}<span class="ml">${esc(t("اللغة"))}</span>
                <span class="mini-seg" role="group" aria-label="${esc(t("اللغة"))}">
                    <button type="button" data-set-lang="ar" aria-pressed="${!ATHR.isEn()}" lang="ar">العربية</button>
                    <button type="button" data-set-lang="en" aria-pressed="${ATHR.isEn()}" lang="en">English</button>
                </span></div>`);
            if (multi) settings.push(row(`<span class="mi flag">${esc(cur.flag)}</span><span class="ml">${esc(t("الدولة والعملة"))}</span><small class="mval">${esc(ATHR.isEn() ? cur.currency : cur.symbol)}</small>`, { attrs: "data-open-currency" }));
            if (cfg.theme.visitor_mode !== false) {
                const mode = document.documentElement.dataset.mode || "auto";
                const opt = (m, icon, label) => `<button type="button" data-set-mode="${m}" aria-pressed="${mode === m}" aria-label="${esc(t(label))}">${icon}<span>${esc(t(label))}</span></button>`;
                settings.push(`<div class="mrow mrow-set">${ico(mode === "dark" ? V.icon.moon : V.icon.sun)}<span class="ml">${esc(t("المظهر"))}</span>
                    <span class="mini-seg mode-seg" role="group" aria-label="${esc(t("المظهر"))}">${opt("light", V.icon.sun, "فاتح")}${opt("dark", V.icon.moon, "داكن")}${opt("auto", V.icon.auto, "تلقائي")}</span></div>`);
            }
            parts.push(`<p class="menu-label">${esc(t("الإعدادات"))}</p><div class="mgroup">${settings.join("")}</div>`);

            // آخر سطر: إنستغرام، تيك توك، واتساب (مع أيقوناتها)
            const follow = [];
            const socials = (cfg.texts.socials || []).filter((x) => ATHR.isUrl(x.url));
            const ig = socials.find((x) => /instagram\.com/i.test(x.url));
            const tt = socials.find((x) => /tiktok\.com/i.test(x.url));
            if (ig) follow.push(`<a class="mf ig" href="${esc(ig.url)}" target="_blank" rel="noopener">${V.icon.instagram}<span>${esc(t("إنستغرام"))}</span></a>`);
            if (tt) follow.push(`<a class="mf tt" href="${esc(tt.url)}" target="_blank" rel="noopener">${V.icon.tiktok}<span>${esc(t("تيك توك"))}</span></a>`);
            if (wa) follow.push(`<a class="mf wa" href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(ct("contact.wa_float_msg"))))}" target="_blank" rel="noopener">${V.waIcon()}<span>${esc(t("واتساب"))}</span></a>`);
            const others = V.socials({ ...vv, cfg: { ...cfg, texts: { ...cfg.texts, socials: socials.filter((x) => x !== ig && x !== tt) } } }, "msoc");
            if (follow.length || others) parts.push(`<p class="menu-label">${esc(t("تابعنا وتواصل معنا"))}</p><div class="mfollow">${follow.join("")}</div>${others ? `<div class="menu-social">${others}</div>` : ""}`);
        }
        if (S.isAdmin) {
            parts.push(`<p class="menu-label">${esc(t("لك وحدك"))}</p>
                <div class="mgroup owner">
                    <a class="mrow" href="#admin" data-native><span class="ml">تعديل المتجر</span></a>
                    <a class="mrow" href="#orders" data-native><span class="ml">دفتر الطلبيات والتقييمات والأداء</span></a>
                </div>`);
        }
        const logo = cfg.logo_url ? `<span class="menu-logo"><img src="${esc(V.asset(cfg.logo_url))}" alt="${esc(ATHR.storeName(cfg))}" height="26"></span>` : `<b>${esc(ATHR.storeName(cfg))}</b>`;
        openSheet(`
            <div class="sheet-head menu-head"><a class="menu-brand" href="${BASE}" aria-label="${esc(ATHR.storeName(cfg))}">${logo}</a><button class="close" type="button" data-close-sheet aria-label="${esc(t("إغلاق"))}">×</button></div>
            <nav class="menu" aria-label="${esc(t("القائمة"))}">${parts.join("")}</nav>`, { label: t("القائمة"), kind: "menu" });
    }

    function openCurrency() {
        const cfg = C();
        const countries = ATHR.countries(cfg).filter((c) => c.enabled);
        openSheet(`
            <div class="sheet-head"><h2>${esc(t("الدولة والعملة"))}</h2><button class="close" type="button" data-close-sheet aria-label="${esc(t("إغلاق"))}">×</button></div>
            <p class="muted" style="margin:0 0 10px">${esc(t("اختر دولتك لتظهر الأسعار بعملتها وطرق التوصيل والدفع المتاحة لك. الأسعار تقريبية، ويُحسب الطلب بالريال العماني."))}${ATHR.liveRates(cfg) ? ` ${esc(t("أسعار الصرف تُحدَّث تلقائياً كل يوم."))}` : ""}</p>
            <ul class="cur-list">
                ${countries.map((c) => `<li><button type="button" data-set-country="${c.code}" aria-pressed="${c.code === S.country}">
                    <span class="cur-flag" aria-hidden="true">${c.flag}</span>
                    <span class="cur-name"><b>${esc(c.name)}</b><small>${esc(c.currency_name)} (${esc(c.symbol)})</small></span>
                    <span class="cur-rate">${c.code === "OM" ? "" : `<bdi>${esc(ATHR.money(1, cfg).replace(/^1\.0+\s*/, "1 "))}</bdi> ≈ <bdi>${ATHR.moneyIn(1, cfg, c.code)}</bdi>`}</span>
                </button></li>`).join("")}
            </ul>`, { modal: true, label: t("الدولة والعملة") });
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
        copyText(url, t("نُسخ الرابط، الصقه في واتساب أو إنستغرام"));
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
        const src = (params.get("utm_source") || params.get("ref") || params.get("src") || (params.get("o") ? "offer" : "")).toLowerCase();
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
        let ch = (/^offer/.test(src) ? "offer" : "") || test(src) || test(ref) || test(ua);
        if (!ch && src) ch = "other";
        if (!ch && ref && !ref.includes(location.host)) ch = "other";
        return ch || "direct";
    }

    function sessionChannel() {
        let ch = session.get(KEYS.channel);
        const params = new URLSearchParams(location.search);
        const tagged = ["utm_source", "ref", "src", "o"].some((k) => params.get(k));
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

    // =====================================================
    // بكسل الإعلانات (Meta / TikTok): يعمل فقط إذا أضاف صاحب المتجر الرقم،
    // ولا يعمل على جهاز صاحب المتجر حتى لا تختلط زياراته بنتائج الإعلانات
    // =====================================================

    const PX = { meta: "", tiktok: "", on: false, lastUrl: "" };

    function setupPixels() {
        if (PX.on) return;
        const t = C().tracking || {};
        const meta = ATHR.metaPixelId(t.meta_pixel);
        const tiktok = ATHR.tiktokPixelId(t.tiktok_pixel);
        if ((!meta && !tiktok) || trackingOff()) return;
        Object.assign(PX, { meta, tiktok, on: true });
        try {
            if (meta) {
                /* eslint-disable */
                !function (f, b, e, v, n, tt, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; tt = b.createElement(e); tt.async = !0; tt.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(tt, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
                /* eslint-enable */
                window.fbq("init", meta);
            }
            if (tiktok) {
                /* eslint-disable */
                !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"], ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; }, ttq.load = function (e, n) { var r = "https://analytics.tiktok.com/i18n/pixel/events.js", o = n && n.partner; ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = r, ttq._t = ttq._t || {}, ttq._t[e] = +new Date, ttq._o = ttq._o || {}, ttq._o[e] = n || {}; n = document.createElement("script"); n.type = "text/javascript", n.async = !0, n.src = r + "?sdkid=" + e + "&lib=" + t; e = document.getElementsByTagName("script")[0]; e.parentNode.insertBefore(n, e); }; }(window, document, "ttq");
                /* eslint-enable */
                window.ttq.load(tiktok);
            }
        } catch (error) {
            console.warn("Pixel setup failed:", error);
        }
    }

    // نفس البيانات بصيغة كل منصة. القيم بالدولار (المنصات تدعمه دائماً)
    function pixelSend(event, lines = [], { value, eventId, extra = {} } = {}) {
        if (!PX.on) return;
        const items = lines.filter((l) => l && l.product);
        const usd = ATHR.toUSD(value !== undefined ? value : items.reduce((sum, l) => sum + Number(l.product.price) * l.qty, 0));
        try {
            if (PX.meta && window.fbq) {
                const data = items.length ? { content_ids: items.map((l) => l.product.id), contents: items.map((l) => ({ id: l.product.id, quantity: l.qty })), content_type: "product", content_name: items.length === 1 ? items[0].product.name : undefined, num_items: items.reduce((n, l) => n + l.qty, 0), value: usd, currency: "USD", ...extra } : { ...extra };
                if (eventId) window.fbq("track", event, data, { eventID: eventId });
                else window.fbq("track", event, data);
            }
            if (PX.tiktok && window.ttq) {
                const data = items.length ? { contents: items.map((l) => ({ content_id: l.product.id, content_type: "product", content_name: l.product.name, quantity: l.qty, price: ATHR.toUSD(l.product.price) })), content_ids: items.map((l) => l.product.id), content_type: "product", value: usd, currency: "USD", ...extra } : { ...extra };
                if (eventId) window.ttq.track(event, data, { event_id: eventId });
                else window.ttq.track(event, data);
            }
        } catch (error) {
            console.warn("Pixel event failed:", error);
        }
    }

    // زيارة صفحة + مشاهدة منتج / بحث / بدء الطلب (مرة لكل صفحة)
    function pixelRoute(route) {
        setupPixels();
        if (!PX.on) return;
        const url = location.pathname + location.search;
        if (url === PX.lastUrl) return;
        PX.lastUrl = url;
        try {
            if (PX.meta && window.fbq) window.fbq("track", "PageView");
            if (PX.tiktok && window.ttq) window.ttq.page();
        } catch { /* ignore */ }
        if (route.name === "product") {
            const p = findProduct(route.slug);
            if (p) pixelSend("ViewContent", [{ product: p, qty: 1 }]);
        } else if (route.name === "search" && route.q) {
            pixelSend("Search", [], { extra: { search_string: String(route.q).slice(0, 100) } });
        } else if (route.name === "checkout") {
            const tt = computeCart();
            if (tt.count) pixelSend("InitiateCheckout", tt.lines, { value: tt.afterDiscount });
        }
    }

    function pixelAdd(id, qty = 1) {
        const p = productById(id);
        if (p) pixelSend("AddToCart", [{ product: p, qty }]);
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
        const el = e.target.closest("button, a");
        if (!el) {
            if (e.target.closest("[data-close-sheet]")) closeSheet();
            return;
        }
        const d = el.dataset;
        // تواصل عبر واتساب (زر واتساب العائم أو أزرار واتساب)
        if (el.id === "waFloat" || el.classList.contains("btn-wa")) pixelSend("Contact");

        if (d.fav) {
            e.preventDefault();
            afterReady(() => toggleFav(d.fav));
            return;
        }
        if (d.favAll !== undefined) {
            afterReady(() => {
                const ids = favIds().filter((id) => { const p = productById(id); return p && p.is_available !== false; });
                let n = 0;
                ids.forEach((id) => { if (!cartQty(id) && setQty(id, 1, { silent: true })) { n++; track("add"); pixelAdd(id, 1); } });
                updateCartUI();
                toast(n ? t("أُضيف {n} للسلة", { n: ATHR.piecesText(n) }) : t("كلها موجودة في سلتك"), { href: `${BASE}cart/`, text: t("السلة") });
            });
            return;
        }
        if (d.notify) {
            afterReady(() => openNotify(d.notify));
            return;
        }
        if (d.more !== undefined) {
            showMore();
            return;
        }
        if (d.homeCat !== undefined) {
            S.homeCat = d.homeCat;
            rerenderGrid();
            // الزر المختار يبقى ظاهراً في وسط شريط الأقسام
            const row = $(".cat-chips");
            const on = row && row.querySelector(".chip.on");
            if (on && row.scrollBy) {
                const a = on.getBoundingClientRect();
                const b = row.getBoundingClientRect();
                row.scrollBy({ left: (a.left + a.width / 2) - (b.left + b.width / 2) });
            }
            const head = $("#catalog");
            if (head && head.getBoundingClientRect().top < 0) head.scrollIntoView({ block: "start" });
            return;
        }
        if (d.couponApply !== undefined) {
            const input = $("#couponInput");
            const err = $("#couponErr");
            el.disabled = true;
            applyCoupon(input ? input.value : "").then((r) => {
                el.disabled = false;
                if (r.ok) {
                    renderCouponBox();
                    updateCheckoutSummary();
                } else if (err) err.textContent = r.error;
            });
            return;
        }
        if (d.couponRemove !== undefined) {
            removeCoupon();
            renderCouponBox();
            updateCheckoutSummary();
            renderBars();
            return;
        }

        if (d.giftStart !== undefined) {
            e.preventDefault();
            afterReady(giftStart);
            return;
        }
        if (d.giftOpen !== undefined) {
            const stage = $("#giftStage");
            const card = $("#giftCard");
            if (stage && card && !stage.classList.contains("opening")) {
                stage.classList.add("opening");
                try { if ((C().gift || {}).vibrate !== false && navigator.vibrate) navigator.vibrate([30, 60, 40]); } catch { /* اختياري */ }
                setTimeout(() => {
                    stage.hidden = true;
                    card.hidden = false;
                    card.classList.remove("show");
                    void card.offsetWidth;
                    card.classList.add("show");
                    window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
                }, 1350);
            }
            return;
        }
        if (d.giftReplay !== undefined) {
            const stage = $("#giftStage");
            const card = $("#giftCard");
            if (stage && card) {
                card.hidden = true;
                card.classList.remove("show");
                stage.classList.remove("opening");
                stage.hidden = false;
                window.scrollTo({ top: stage.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
            }
            return;
        }
        if (d.giftSug) {
            const box = $('#checkoutForm textarea[name="gift_message"]');
            if (box) {
                box.value = d.giftSug;
                box.dispatchEvent(new Event("input", { bubbles: true }));
            }
            return;
        }
        if (d.giftCancel !== undefined) {
            giftEnd();
            renderBars();
            return;
        }

        // روابط داخل المتجر بدون إعادة تحميل
        if (el.tagName === "A" && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            const href = el.getAttribute("href") || "";
            if (href.startsWith("#") && href.length > 1 && !["#admin", "#orders"].includes(href)) {
                const target = document.getElementById(decodeURIComponent(href.slice(1)));
                if (target) {
                    e.preventDefault();
                    closeSheet();
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                return;
            }
            const url = internalUrl(el);
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
        if (el.id === "menuBtn") { afterReady(openMenu); return; }
        if (el.id === "langBtn") { afterReady(() => setLang(ATHR.isEn() ? "ar" : "en")); return; }
        if (d.setLang) { const l = d.setLang; afterReady(() => setLang(l)); return; }
        if (d.setMode) { setMode(d.setMode); return; }
        if (d.menuCats !== undefined) {
            menuCatsOpen = !menuCatsOpen;
            el.setAttribute("aria-expanded", String(menuCatsOpen));
            const box = $("#menuCats");
            if (box) box.hidden = !menuCatsOpen;
            return;
        }
        if (d.openCurrency !== undefined || el.id === "curBtn") { afterReady(openCurrency); return; }
        if (d.setCountry) { closeSheet(); setCountry(d.setCountry); return; }
        if (d.add) {
            const id = d.add;
            afterReady(() => { if (addToCart(id)) openAdded([id]); });
            return;
        }
        if (d.addQuiet) {
            const id = d.addQuiet;
            afterReady(() => { if (addToCart(id)) toast(t("أُضيف إلى السلة")); });
            return;
        }
        if (d.addMini) {
            const id = d.addMini;
            afterReady(() => {
                if (addToCart(id)) {
                    toast(t("أُضيف إلى السلة"));
                    openAdded(S.lastAdded, { refresh: true });
                }
            });
            return;
        }
        if (d.inc) { const id = d.inc; afterReady(() => addToCart(id)); return; }
        if (d.dec) { const id = d.dec; afterReady(() => setQty(id, cartQty(id) - 1)); return; }
        if (d.remove) { const id = d.remove; afterReady(() => { setQty(id, 0); toast(t("حُذف من السلة")); }); return; }
        if (d.swap) {
            afterReady(() => {
                const card = el.closest("[data-card]");
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
                if (current + qty > maxQty()) toast(t("أقصى كمية من المنتج الواحد {n}", { n: maxQty() }));
                if (current >= maxQty()) return;
                if (setQty(id, current + qty, { silent: true })) {
                    track("add");
                    pixelAdd(id, qty);
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
                pixelAdd(id, qty);
                navigate(`${BASE}checkout/`);
            });
            return;
        }
        if (d.giftNow) {
            const id = d.giftNow;
            afterReady(() => {
                const qty = Number($("#pdpQty")?.textContent) || 1;
                if (cartQty(id) < qty) setQty(id, qty, { silent: true });
                track("add");
                pixelAdd(id, qty);
                locStash.self = null;
                locStash.gift = null;
                session.set(KEYS.giftIntent, "1");
                navigate(`${BASE}checkout/?gift=1`);
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
            toast(t("مُسحت بياناتك من هذا الجهاز"));
            renderCheckout();
            return;
        }
        if (d.share !== undefined) {
            shareUrl(new URL(BASE, location.origin).href, ATHR.storeName(C()), fill(ct("texts.hero_title")));
            return;
        }
        if (d.shareProduct) {
            const p = productById(d.shareProduct);
            if (p) shareUrl(new URL(ATHR.url.product(p), location.origin).href, V.label(v(), p), t("{name} من {store}", { name: V.label(v(), p), store: ATHR.storeName(C()) }));
            return;
        }
        if (d.closeCartbar !== undefined) { session.set(KEYS.cartBarClosed, "1"); renderBars(); return; }
        if (d.exitPreview !== undefined) { ATHR.store.exitPreview(true); }
    });

    document.addEventListener("change", (e) => {
        const el = e.target;
        if (el.id === "sortSelect") {
            S.sort = el.value;
            rerenderGrid();
            return;
        }
        if (el.id === "countrySelect") {
            const form = $("#checkoutForm");
            const keep = Object.fromEntries(new FormData(form).entries());
            keep.delivery = null;
            keep.payment = null;
            keep.gov = "";
            keep.wilaya = "";
            keep.gift_phone = "";
            if (keep.gift !== "1") keep.phone = "";
            keep.country = el.value;
            locStash.self = null;
            locStash.gift = null;
            setCountry(el.value, { silent: true });
            renderCheckout(keep);
            renderBars();
            toast(t("التوصيل والدفع الآن لـ{country}", { country: L(CC(), "name") }));
            return;
        }
        if (el.name === "gift_occasion") {
            const box = $("#msgSugs");
            if (box) box.innerHTML = giftSugs(el.value);
            return;
        }
        if (el.name === "gift" && el.closest("#checkoutForm")) {
            if (el.value !== "1") giftEnd();
            const form = $("#checkoutForm");
            const keep = Object.fromEntries(new FormData(form).entries());
            const next = keep.gift === "1" ? "gift" : "self";
            const was = next === "gift" ? "self" : "gift";
            const keys = (mode) => (mode === "gift" ? [...LOC_KEYS, ...GIFT_KEYS] : LOC_KEYS);
            locStash[was] = Object.fromEntries(keys(was).map((k) => [k, keep[k] || ""]));
            const base = savedCustomer() || {};
            const restore = locStash[next] || (next === "self" && (!base.country || base.country === S.country) ? base : {});
            keys(next).forEach((k) => { keep[k] = restore[k] || ""; });
            keep.country = S.country;
            if (next === "self" && keep.sender_country && keep.sender_country !== S.country) keep.phone = "";
            const url = new URL(location.href);
            if (next === "gift") url.searchParams.set("gift", "1");
            else url.searchParams.delete("gift");
            history.replaceState(history.state, "", url.pathname + url.search + url.hash);
            renderCheckout(keep);
            renderBars();
            return;
        }
        if (el.id === "senderCountry") {
            const form = $("#checkoutForm");
            const keep = Object.fromEntries(new FormData(form).entries());
            keep.country = S.country;
            renderCheckout(keep);
            return;
        }
        if (el.name === "delivery") {
            renderAddressField();
            updateCheckoutSummary();
            return;
        }
        if (el.name === "payment") renderPayExtra();
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

    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target && e.target.id === "couponInput") {
            e.preventDefault();
            $("[data-coupon-apply]")?.click();
        }
    });

    document.addEventListener("submit", (e) => {
        const f = e.target;
        if (f.id === "notifyForm") {
            e.preventDefault();
            submitNotify(f);
            return;
        }
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
            // لوحة التحكم بالعربي دائمًا
            if (ATHR.isEn()) {
                S.langBeforeOwner = "en";
                applyLang("ar");
                render({ scroll: "keep" });
            }
            window.ATHR_ADMIN.open(name);
        } catch {
            toast(t("تعذر فتح لوحة التحكم. تأكد من الإنترنت."));
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
        preview(data, path) {
            S.preview = true;
            S.media.clear();
            (data.products || []).forEach((p) => {
                if (Array.isArray(p.media)) S.media.set(p.id, p.media.map((m, i) => ({ media_type: m.type, media_url: m.url, sort_order: i })));
            });
            history.replaceState(null, "", path || BASE);
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
            if (S.langBeforeOwner) {
                const back = S.langBeforeOwner;
                S.langBeforeOwner = null;
                setLang(back, { persist: false });
            }
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
    // LANGUAGE (عربي / English)
    // =====================================================

    function applyLang(lang) {
        const l = lang === "en" ? "en" : "ar";
        ATHR.lang = l;
        const root = document.documentElement;
        root.lang = l;
        root.dir = l === "en" ? "ltr" : "rtl";
        S.ctx = null;
    }

    function setLang(lang, { persist = true } = {}) {
        applyLang(lang);
        if (persist) storage.set(KEYS.lang, ATHR.lang);
        closeSheet();
        if (S.loaded) {
            // في صفحة إتمام الطلب نحتفظ بما كتبه الزبون عند تغيير اللغة
            const form = S.route && S.route.name === "checkout" ? $("#checkoutForm") : null;
            const keep = form ? { ...Object.fromEntries(new FormData(form).entries()), country: S.country } : null;
            renderChrome();
            render({ scroll: "keep" });
            if (keep && $("#checkoutForm")) renderCheckout(keep);
        }
    }

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

    applyLang(storage.get(KEYS.lang, "ar"));
    convertLegacyHash();
    S.route = parseRoute();
    trackVisit();
    S.country = guessCountry();
    updateCartUI();
    sessionChannel();
    track("visit");
    try { S.coupon = JSON.parse(session.get(KEYS.coupon) || "null"); } catch { S.coupon = null; }
    loadData().then(() => { captureCouponParam(); return checkAdmin(); });
})();
