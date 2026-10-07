/* =====================================================
   ATHR STORE — واجهة المتجر للزبون (صفحة واحدة)
===================================================== */

(function () {
    "use strict";

    const esc = ATHR.escape;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const KEYS = {
        cache: "athr_cache_v2",
        cart: "athr_cart_v2",
        customer: "athr_customer",
        lastOrder: "athr_last_order",
        lastSeen: "athr_last_seen",
        cartBarClosed: "athr_cart_bar_closed",
        country: "athr_country"
    };

    const S = {
        config: ATHR.fullConfig({}),
        categories: [],
        products: [],
        loaded: false,
        preview: false,
        isAdmin: false,
        query: "",
        cat: "all",
        sort: "default",
        media: new Map(),
        returningGap: 0,
        country: "OM"
    };

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

    // ---------- toast ----------
    let toastTimer;
    function toast(message) {
        const el = $("#toast");
        el.textContent = message;
        el.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
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
                return;
            }
            if (existing) existing.qty = clamped;
            else items.push({ id, qty: clamped });
        }
        saveCart(items);
        if (!silent && qty > limit) toast(`أقصى كمية من المنتج الواحد ${limit}`);
    }

    function addToCart(id, qty = 1, { silent = false } = {}) {
        const product = productById(id);
        if (!product) return;
        if (product.is_available === false) {
            toast(C().texts.sold_out);
            return;
        }
        const current = cartQty(id);
        if (current >= maxQty()) {
            toast(`أقصى كمية من المنتج الواحد ${maxQty()}`);
            return;
        }
        setQty(id, current + qty, { silent: true });
        if (!silent) toast("أُضيف إلى السلة");
        const count = $("#cartCount");
        count.classList.remove("bump");
        void count.offsetWidth;
        count.classList.add("bump");
    }

    function computeCart() {
        return ATHR.computeCart(cartItems(), S.products, C(), S.country);
    }

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
        storage.set(KEYS.country, c.code);
        renderChrome();
        if (!silent) {
            render({ keepScroll: true });
            toast(c.code === "OM" ? "الأسعار بالريال العماني" : `الأسعار الآن ب${c.currency_def} تقريبًا`);
        }
    }

    function updateCartUI() {
        const totals = computeCart();
        const count = $("#cartCount");
        count.textContent = totals.count;
        count.hidden = totals.count === 0;

        // تحديث أزرار البطاقات في الصفحة
        $$("[data-action-for]").forEach((el) => {
            const product = productById(el.dataset.actionFor);
            if (product) el.innerHTML = cardActionHTML(product);
        });
        renderBars();

        const route = parseRoute();
        if (route.name === "cart") renderCart();
        if (route.name === "checkout") updateCheckoutSummary();
    }

    // =====================================================
    // DATA
    // =====================================================

    function productById(id) {
        return S.products.find((p) => p.id === id);
    }

    function categoryById(id) {
        return S.categories.find((c) => c.id === id);
    }

    function colorById(id) {
        return (C().colors || []).find((c) => c.id === id);
    }

    function applyData(data, { fromCache = false } = {}) {
        S.config = ATHR.fullConfig(data.config || {});
        S.categories = (data.categories || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        S.products = (data.products || [])
            .filter((p) => p.is_visible !== false)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        S.loaded = true;
        if (!ATHR.countries(S.config).some((c) => c.code === S.country && c.enabled)) S.country = ATHR.BASE_COUNTRY;
        applyTheme();
        renderChrome();
        render({ keepScroll: !fromCache });
    }

    async function fetchData() {
        const [settingsRes, catsRes, prodsRes] = await Promise.all([
            athrSupabase.from("store_settings").select("config").eq("id", 1).maybeSingle(),
            athrSupabase.from("categories").select("id,name,slug,sort_order").order("sort_order", { ascending: true }),
            athrSupabase.from("products")
                .select("id,name,price,old_price,category_id,image_url,is_available,is_visible,description,color_id,sort_order,video_url,weight_g,created_at")
                .order("sort_order", { ascending: true })
        ]);
        if (settingsRes.error) throw settingsRes.error;
        if (catsRes.error) throw catsRes.error;
        if (prodsRes.error) throw prodsRes.error;
        return {
            config: settingsRes.data?.config || {},
            categories: catsRes.data || [],
            products: (prodsRes.data || []).filter((p) => p.is_visible !== false)
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
            if (!cached) {
                $("#view").innerHTML = `<div class="wrap empty"><p>تعذر تحميل المتجر. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.</p><button class="btn btn-primary" type="button" onclick="location.reload()">إعادة المحاولة</button></div>`;
            }
        }
    }

    async function loadMedia(productId) {
        if (S.media.has(productId)) return S.media.get(productId);
        const { data, error } = await athrSupabase
            .from("product_media")
            .select("id,media_type,media_url,sort_order")
            .eq("product_id", productId)
            .order("sort_order", { ascending: true });
        const rows = error ? [] : (data || []);
        S.media.set(productId, rows);
        return rows;
    }

    // =====================================================
    // THEME
    // =====================================================

    const FONT_PARAMS = {
        "Reem Kufi": "Reem+Kufi:wght@500;600;700",
        "Cairo": "Cairo:wght@400;600;700",
        "El Messiri": "El+Messiri:wght@500;600;700",
        "Lalezar": "Lalezar",
        "Noto Kufi Arabic": "Noto+Kufi+Arabic:wght@500;600;700",
        "Amiri": "Amiri:wght@400;700",
        "Changa": "Changa:wght@500;600;700",
        "Readex Pro": "Readex+Pro:wght@400;500;600;700",
        "IBM Plex Sans Arabic": "IBM+Plex+Sans+Arabic:wght@400;500;600;700",
        "Tajawal": "Tajawal:wght@400;500;700",
        "Almarai": "Almarai:wght@400;700",
        "Noto Sans Arabic": "Noto+Sans+Arabic:wght@400;500;600;700",
        "Mada": "Mada:wght@400;500;600;700"
    };

    const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    function applyTheme() {
        const t = C().theme;
        const root = document.documentElement;
        const isColor = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ""));

        root.style.setProperty("--primary", isColor(t.primary) ? t.primary : ATHR_DEFAULTS.theme.primary);
        root.style.setProperty("--hero", isColor(t.hero) ? t.hero : ATHR_DEFAULTS.theme.hero);

        const dark = t.mode === "dark" || (t.mode === "auto" && darkQuery && darkQuery.matches);
        root.classList.toggle("theme-dark", dark);
        if (!dark) {
            root.style.setProperty("--bg", isColor(t.bg) ? t.bg : ATHR_DEFAULTS.theme.bg);
            root.style.setProperty("--text", isColor(t.text) ? t.text : ATHR_DEFAULTS.theme.text);
        } else {
            root.style.removeProperty("--bg");
            root.style.removeProperty("--text");
        }

        root.classList.toggle("r-sharp", t.radius === "sharp");
        root.classList.toggle("r-round", t.radius === "round");

        const head = FONT_PARAMS[t.font_head] ? `"${t.font_head}"` : "system-ui";
        const body = FONT_PARAMS[t.font_body] ? `"${t.font_body}"` : "system-ui";
        root.style.setProperty("--font-head", `${head}, ${body}, system-ui, sans-serif`);
        root.style.setProperty("--font-body", `${body}, system-ui, -apple-system, "Segoe UI", sans-serif`);

        const families = [t.font_head, t.font_body].filter((f, i, arr) => FONT_PARAMS[f] && arr.indexOf(f) === i);
        const href = families.length
            ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${FONT_PARAMS[f]}`).join("&")}&display=swap`
            : "";
        const link = $("#fontLink");
        if (href && link.getAttribute("href") !== href) link.setAttribute("href", href);

        const meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", isColor(t.primary) ? t.primary : ATHR_DEFAULTS.theme.primary);
    }

    if (darkQuery && darkQuery.addEventListener) {
        darkQuery.addEventListener("change", () => { if (C().theme.mode === "auto") applyTheme(); });
    }

    // =====================================================
    // CHROME: header, bars, footer, float
    // =====================================================

    function renderChrome() {
        const cfg = C();
        const logo = $("#brandLogo");
        const logoUrl = cfg.logo_url || ATHR_DEFAULTS.logo_url;
        logo.innerHTML = `<img src="${esc(logoUrl)}" alt="">`;
        logo.className = `brand-logo shape-${esc(cfg.logo_shape || "rounded")}${/logo\.png$/.test(logoUrl) ? "" : " has-photo"}`;
        const name = $("#brandName");
        name.textContent = cfg.name || "";
        name.hidden = !cfg.show_name;
        $("#brand").setAttribute("aria-label", `${cfg.name || "المتجر"} — الرئيسية`);

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

        document.title = `${cfg.name || "المتجر"} | ${cfg.texts.hero_title || ""}`.trim();

        renderBars();
        renderFooter();
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
        const routeName = parseRoute().name;
        if (cfg.sales.free_bar_show && totals.freeEligible && freeMin > 0 && routeName !== "done") {
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
            parts.push(`<div class="bar bar-cart"><span>${esc(fill(cfg.sales.abandoned_text, { n }))}</span><a href="#/cart">أكمل الطلب</a><button type="button" data-close-cartbar aria-label="إخفاء">×</button></div>`);
        }

        $("#bars").innerHTML = parts.join("");
    }

    function deliveryLines() {
        const cfg = C();
        const enabledCount = ATHR.countries(cfg).filter((c) => c.enabled).length;
        const lines = (cfg.order.delivery || []).filter((d) => d.enabled).map((d) => {
            const list = flagsFor(d);
            const where = list.length && list.length < enabledCount ? ` — ${list.map((c) => c.flag).join(" ")}` : "";
            return `${d.name}: ${deliveryPriceLabel(d)}${d.duration ? ` (${d.duration})` : ""}${where}`;
        });
        const free = freeLine();
        if (free) lines.push(free);
        const groups = paymentGroups();
        if (groups.length === 1) lines.push(`طرق الدفع: ${groups[0].names}.`);
        else groups.forEach((g) => lines.push(`${g.countries.map((c) => c.flag).join(" ")} الدفع: ${g.names}.`));
        return lines;
    }

    function deliveryPriceLabel(d) {
        if (d.pricing === "per_kg") return `${money(d.price)} لكل كيلو`;
        return Number(d.price) > 0 ? money(d.price) : "مجاني";
    }

    function flagsFor(item) {
        const countries = ATHR.countries(C()).filter((c) => c.enabled && ATHR.inCountries(item, c.code));
        return countries;
    }

    function countriesText(list) {
        return list.map((c) => `${c.flag} ${c.name}`).join("، ");
    }

    function paymentGroups() {
        const cfg = C();
        const groups = new Map();
        ATHR.countries(cfg).filter((c) => c.enabled).forEach((c) => {
            const names = ATHR.paymentsFor(cfg, c.code).map((p) => p.name);
            if (!names.length) return;
            const key = names.join("، ");
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(c);
        });
        return Array.from(groups.entries()).map(([names, countries]) => ({ names, countries }));
    }

    function freeLine() {
        const cfg = C();
        if (!cfg.order.free_enabled || !(Number(cfg.order.free_min) > 0)) return "";
        const list = ATHR.countries(cfg).filter((c) => c.enabled && ATHR.freeAppliesTo(cfg, c.code));
        const where = list.length === 1 && list[0].code === "OM" ? "داخل عُمان " : list.length < ATHR.countries(cfg).filter((c) => c.enabled).length ? `إلى ${countriesText(list)} ` : "";
        return `التوصيل مجاني ${where}للطلبات من ${money(cfg.order.free_min)} أو أكثر.`;
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

    function renderFooter() {
        const cfg = C();
        const t = cfg.texts;
        const deliveryText = (t.footer_delivery_text || "").trim()
            ? t.footer_delivery_text.split("\n").filter(Boolean).map((line) => fill(line))
            : deliveryLines();
        const socials = (t.socials || []).filter((s) => s.name && ATHR.isUrl(s.url));
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const shareReview = cfg.contact.reviews_share_btn && wa;

        $("#footer").innerHTML = `
            <div class="wrap">
                <div class="footer-grid">
                    <div>
                        <div class="footer-brand"><img src="${esc(cfg.logo_url || ATHR_DEFAULTS.logo_url)}" alt=""><strong>${esc(cfg.name)}</strong></div>
                        ${t.about ? `<p>${esc(fill(t.about))}</p>` : ""}
                        ${cfg.contact.policy_show ? `<p><button class="link-btn" style="color:#fff" type="button" data-open-policy>${esc(cfg.contact.policy_title)}</button></p>` : ""}
                    </div>
                    <div>
                        <h2>${esc(t.footer_delivery_title)}</h2>
                        ${deliveryText.map((line) => `<p>${esc(line)}</p>`).join("")}
                    </div>
                    <div>
                        <h2>${esc(t.footer_contact_title)}</h2>
                        ${wa ? `<p>واتساب: <a href="${esc(ATHR.waLink(cfg.order.whatsapp))}" target="_blank" rel="noopener" dir="ltr">${esc(ATHR.localPhone(cfg.order.whatsapp))}</a></p>` : ""}
                        <div class="footer-links">
                            ${shareReview ? `<a href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(cfg.contact.reviews_share_msg)))}" target="_blank" rel="noopener">${esc(cfg.contact.reviews_share_text)}</a>` : ""}
                            ${socials.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join("")}
                        </div>
                    </div>
                </div>
                <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(cfg.name)}</div>
            </div>`;
    }

    // =====================================================
    // ROUTER
    // =====================================================

    function parseRoute() {
        const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
        if (hash === "admin" || hash === "orders") return { name: hash };
        const parts = hash.replace(/^\/?/, "").split("/");
        switch (parts[0]) {
            case "p": return { name: "product", id: parts[1] };
            case "cart": return { name: "cart" };
            case "checkout": return { name: "checkout" };
            case "done": return { name: "done", no: parts[1] };
            case "c": return { name: "home", cat: parts[1] || "all" };
            case "search": return { name: "home", search: true };
            case "offers": return { name: "home", anchor: "ad" };
            case "reviews": return { name: "home", anchor: "reviews" };
            default: return { name: "home" };
        }
    }

    function go(hash) {
        if (location.hash === hash) render();
        else location.hash = hash;
    }

    let lastRouteKey = "";

    function render({ keepScroll = false } = {}) {
        if (!S.loaded) return;
        const route = parseRoute();

        if (route.name === "admin" || route.name === "orders") {
            openOwnerArea(route.name);
            if (!$("#view").dataset.rendered) renderHome({});
            return;
        }

        const key = JSON.stringify(route);
        const sameRoute = key === lastRouteKey;
        lastRouteKey = key;
        $("#view").dataset.rendered = "1";

        switch (route.name) {
            case "product": renderProduct(route.id); break;
            case "cart": renderCart(); break;
            case "checkout": renderCheckout(); break;
            case "done": renderDone(route.no); break;
            default: renderHome(route);
        }

        renderBars();
        const float = $("#waFloat");
        float.classList.toggle("off", ["cart", "checkout", "done"].includes(route.name));
        if (!sameRoute && !keepScroll && !route.anchor && !(route.name === "home" && route.cat)) window.scrollTo(0, 0);
    }

    window.addEventListener("hashchange", () => render());

    // =====================================================
    // HOME
    // =====================================================

    function renderHome(route) {
        const cfg = C();
        if (!route.anchor && !route.search) S.cat = route.cat || "all";

        $("#view").innerHTML = `
            ${adHTML()}
            ${heroHTML()}
            <section class="catalog wrap" id="catalog" aria-label="المنتجات">
                <div class="chips" role="toolbar" aria-label="الأقسام" id="chips"></div>
                <div class="catalog-bar">
                    <span class="count" id="resultCount"></span>
                    ${cfg.theme.show_sort !== false ? `
                    <label class="sr-only" for="sortSelect">ترتيب حسب السعر</label>
                    <select class="select" id="sortSelect">
                        <option value="default">الترتيب الافتراضي</option>
                        <option value="asc">السعر: الأقل أولاً</option>
                        <option value="desc">السعر: الأعلى أولاً</option>
                    </select>` : ""}
                </div>
                <p class="cur-note" id="curNote" hidden></p>
                <div class="grid${Number(cfg.theme.grid_mobile) === 1 ? " one" : ""}" id="grid"></div>
            </section>
            ${reviewsHTML()}`;

        const sort = $("#sortSelect");
        if (sort) sort.value = S.sort;
        renderCatalog();
        startDeferredMedia();

        if (route.search) {
            const input = $("#searchInput");
            if (input && !$("#searchBox").hidden) setTimeout(() => input.focus(), 50);
        }
        if (route.anchor) {
            const target = document.getElementById(route.anchor);
            if (target) setTimeout(() => target.scrollIntoView({ block: "start" }), 30);
        } else if (route.cat && route.cat !== "all") {
            setTimeout(() => $("#catalog")?.scrollIntoView({ block: "start" }), 30);
        }
    }

    function adHTML() {
        const ad = C().ad;
        if (!ad.show) return "";
        const link = ATHR.isSafeLink(ad.link) && ad.link ? ad.link : "";
        const open = (inner, cls) => link
            ? `<a class="${cls}" href="${esc(link)}"${link.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${inner}</a>`
            : `<div class="${cls}">${inner}</div>`;

        if (ad.type === "image" && ad.image_url) {
            return `<section class="ad wrap" id="ad">${open(`<img src="${esc(ad.image_url)}" alt="${esc(ad.image_alt)}" fetchpriority="high">`, "ad-media")}</section>`;
        }
        if (ad.type === "video" && ad.video_url) {
            return `<section class="ad wrap" id="ad">${open(`<video muted loop playsinline autoplay preload="none" data-deferred-src="${esc(ad.video_url)}" aria-label="${esc(ad.video_alt)}"></video>`, "ad-media")}</section>`;
        }
        if (ad.type === "text" && (ad.title || ad.text)) {
            const button = ad.button ? `<a class="btn" href="${esc(link || "#catalog")}" data-ad-btn${link.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(fill(ad.button))}</a>` : "";
            return `<section class="ad wrap" id="ad"><div class="ad-text" style="background:${esc(/^#[0-9a-f]{6}$/i.test(ad.bg) ? ad.bg : C().theme.primary)}">
                ${ad.title ? `<h2>${esc(fill(ad.title))}</h2>` : ""}
                ${ad.text ? `<p>${esc(fill(ad.text))}</p>` : ""}
                ${button}
            </div></section>`;
        }
        return "";
    }

    function heroHTML() {
        const cfg = C();
        if (!cfg.theme.hero_show) return "";
        const t = cfg.texts;
        const features = (t.hero_features || []).filter(Boolean).slice(0, 6)
            .map((f) => `<li>${esc(fill(f))}</li>`).join("");
        const image = cfg.theme.hero_image && ATHR.isUrl(cfg.theme.hero_image) ? cfg.theme.hero_image
            : (cfg.theme.hero_image && !cfg.theme.hero_image.includes(":") ? cfg.theme.hero_image : "");
        return `
            <section class="hero${cfg.theme.hero_pattern ? " pattern" : ""}${image ? " has-image" : ""}">
                ${image ? `<div class="hero-bg"><img data-deferred-src="${esc(image)}" alt=""></div>` : ""}
                <div class="wrap hero-inner">
                    <h1>${esc(fill(t.hero_title))}</h1>
                    ${t.hero_text ? `<p>${esc(fill(t.hero_text))}</p>` : ""}
                    ${features ? `<ul class="hero-features">${features}</ul>` : ""}
                    ${t.hero_button ? `<a class="btn" href="#catalog" data-scroll-catalog>${esc(fill(t.hero_button))}</a>` : ""}
                </div>
            </section>`;
    }

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
        if (document.readyState === "complete") {
            (window.requestIdleCallback || ((fn) => setTimeout(fn, 120)))(run);
        } else {
            window.addEventListener("load", () => setTimeout(run, 60), { once: true });
        }
    }

    function visibleProducts() {
        const q = S.query.trim().toLowerCase();
        let list = S.products.slice();
        if (S.cat !== "all") {
            const cat = S.categories.find((c) => c.slug === S.cat);
            list = cat ? list.filter((p) => p.category_id === cat.id) : list;
        }
        if (q) {
            list = list.filter((p) => {
                const cat = categoryById(p.category_id);
                const color = colorById(p.color_id);
                return [p.name, p.description, cat && cat.name, color && color.name]
                    .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
            });
        }
        if (S.sort === "asc") list.sort((a, b) => a.price - b.price);
        if (S.sort === "desc") list.sort((a, b) => b.price - a.price);
        return list;
    }

    function renderCatalog() {
        const chips = $("#chips");
        const grid = $("#grid");
        if (!chips || !grid) return;
        const cfg = C();
        const counts = new Map();
        S.products.forEach((p) => counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1));
        const cats = S.categories.filter((c) => counts.get(c.id));
        if (S.cat !== "all" && !cats.some((c) => c.slug === S.cat)) S.cat = "all";

        chips.innerHTML = [
            `<button class="chip" type="button" data-cat="all" aria-pressed="${S.cat === "all"}">${esc(cfg.texts.all_label || "الكل")} <small>${S.products.length}</small></button>`,
            ...cats.map((c) => `<button class="chip" type="button" data-cat="${esc(c.slug)}" aria-pressed="${S.cat === c.slug}">${esc(c.name)} <small>${counts.get(c.id)}</small></button>`)
        ].join("");

        const note = $("#curNote");
        if (note) {
            note.hidden = isBase();
            note.innerHTML = isBase() ? "" : `${CC().flag} الأسعار ب${esc(CC().currency_def)} تقريبية، ويُحسب الطلب بالريال العماني. <button class="link-btn" type="button" data-open-currency>تغيير</button>`;
        }

        const list = visibleProducts();
        const n = list.length;
        $("#resultCount").textContent = n === 0 ? "لا توجد منتجات" : n === 1 ? "منتج واحد" : n === 2 ? "منتجان" : `${n} منتجات`;

        if (!n) {
            grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><p>${S.query ? `لا توجد نتائج لـ «${esc(S.query)}». جرّب كلمة أخرى أو تصفّح الأقسام.` : "لا توجد منتجات في هذا القسم حاليًا."}</p>${S.query ? `<button class="btn btn-ghost btn-sm" type="button" data-clear-search>مسح البحث</button>` : ""}</div>`;
            return;
        }
        grid.innerHTML = list.map((p, i) => cardHTML(p, i < 4)).join("");

        const active = chips.querySelector('[aria-pressed="true"]');
        if (active && active.scrollIntoView && S.cat !== "all") active.scrollIntoView({ inline: "center", block: "nearest" });
    }

    function priceHTML(p) {
        const old = Number(p.old_price) > Number(p.price) ? `<s>${local(p.old_price)}</s>` : "";
        const base = isBase() ? "" : `<small class="base-price">${money(p.price)}</small>`;
        return `<div class="price"><b>${local(p.price)}</b>${old}${base}</div>`;
    }

    function colorHTML(p) {
        const color = colorById(p.color_id);
        if (!color) return "";
        const hex = /^#[0-9a-f]{6}$/i.test(color.hex || "") ? color.hex : "#cccccc";
        return `<span class="color-tag"><span class="dot" style="background:${hex}"></span>${esc(color.name)}</span>`;
    }

    function cardActionHTML(p) {
        const cfg = C();
        if (p.is_available === false) {
            return `<button class="btn btn-ghost" type="button" disabled>${esc(cfg.texts.sold_out)}</button>`;
        }
        const qty = cartQty(p.id);
        if (qty > 0) {
            return `<div class="stepper" role="group" aria-label="الكمية في السلة">
                <button type="button" data-inc="${esc(p.id)}" aria-label="زيادة" ${qty >= maxQty() ? "disabled" : ""}>+</button>
                <output aria-live="polite">${qty}</output>
                <button type="button" data-dec="${esc(p.id)}" aria-label="إنقاص">−</button>
            </div>`;
        }
        return `<button class="btn btn-primary" type="button" data-add="${esc(p.id)}">${esc(cfg.texts.add_to_cart)}</button>`;
    }

    function cardHTML(p, eager = false) {
        const cfg = C();
        const out = p.is_available === false;
        const sale = !out && Number(p.old_price) > Number(p.price);
        const pct = sale ? Math.round((1 - p.price / p.old_price) * 100) : 0;
        return `
            <article class="card${out ? " soldout" : ""}">
                <a class="card-img" href="#/p/${esc(p.id)}" tabindex="-1" aria-hidden="true">
                    ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" ${eager ? "" : 'loading="lazy"'} decoding="async">` : ""}
                    ${out ? `<span class="badge out">${esc(cfg.texts.sold_out)}</span>` : sale ? `<span class="badge sale">خصم ${pct}%</span>` : ""}
                </a>
                <div class="card-body">
                    <a class="card-name" href="#/p/${esc(p.id)}">${esc(p.name)}</a>
                    ${colorHTML(p)}
                    ${priceHTML(p)}
                </div>
                <div class="card-action" data-action-for="${esc(p.id)}">${cardActionHTML(p)}</div>
            </article>`;
    }

    function reviewsHTML() {
        const c = C().contact;
        const reviews = (c.reviews || []).filter((r) => r.text);
        if (!reviews.length) return "";
        const stars = (n) => {
            const v = Math.max(1, Math.min(5, Number(n) || 5));
            return `<span class="stars" aria-label="${v} من 5">${"★".repeat(v)}<span class="off">${"★".repeat(5 - v)}</span></span>`;
        };
        return `
            <section class="section reviews wrap" id="reviews" aria-labelledby="reviewsTitle">
                <div class="section-head"><h2 id="reviewsTitle">${esc(c.reviews_title)}</h2></div>
                <div class="rail">
                    ${reviews.map((r) => `
                        <figure class="review" style="margin:0">
                            ${stars(r.stars)}
                            <p>${esc(r.text)}</p>
                            ${(r.images || []).length || r.video ? `<div class="review-media">
                                ${(r.images || []).slice(0, 3).map((src) => `<img src="${esc(src)}" alt="صورة من العميل" loading="lazy">`).join("")}
                                ${r.video ? `<video src="${esc(r.video)}" controls playsinline preload="metadata"></video>` : ""}
                            </div>` : ""}
                            ${r.name ? `<cite>${esc(r.name)}</cite>` : ""}
                        </figure>`).join("")}
                </div>
                ${c.reviews_share_btn && ATHR.isValidWhatsapp(C().order.whatsapp) ? `<p style="margin-top:12px"><a class="btn btn-ghost btn-sm" href="${esc(ATHR.waLink(C().order.whatsapp, fill(c.reviews_share_msg)))}" target="_blank" rel="noopener">${esc(c.reviews_share_text)}</a></p>` : ""}
            </section>`;
    }

    // =====================================================
    // PRODUCT PAGE
    // =====================================================

    function relatedFor(ids, count) {
        const cfg = C();
        const set = new Set(ids);
        const sources = ids.map(productById).filter(Boolean);
        if (!sources.length) return [];
        const bundlePartners = new Set();
        (cfg.sales.bundles || []).filter((b) => b.enabled).forEach((b) => {
            if (set.has(b.a)) bundlePartners.add(b.b);
            if (set.has(b.b)) bundlePartners.add(b.a);
        });
        const avg = sources.reduce((s, p) => s + Number(p.price), 0) / sources.length;
        return S.products
            .filter((p) => !set.has(p.id) && p.is_available !== false)
            .map((p) => {
                let score = 0;
                if (bundlePartners.has(p.id)) score += 1000;
                if (sources.some((s) => s.category_id && s.category_id === p.category_id)) score += 100;
                if (sources.some((s) => s.color_id && s.color_id === p.color_id)) score += 10;
                score += Math.max(0, 9 - Math.abs(Number(p.price) - avg));
                return { p, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, count)
            .map((x) => x.p);
    }

    function trustHTML() {
        const cfg = C();
        if (!cfg.sales.trust_show) return "";
        const pays = ATHR.paymentsFor(cfg, S.country);
        const items = [];
        if (pays.some((p) => p.type === "bank")) items.push(pays.some((p) => p.type === "bank" && /دولي/.test(p.name)) ? "تحويل بنكي دولي" : "تحويل بنكي مباشر");
        if (pays.some((p) => p.type === "online")) items.push("دفع إلكتروني آمن");
        if (pays.some((p) => p.type === "cod")) items.push("الدفع عند الاستلام");
        const gulf = (cfg.order.delivery || []).some((d) => d.enabled && Array.isArray(d.countries) && d.countries.some((c) => c !== "OM"));
        items.push(gulf ? "توصيل لكل دول الخليج" : "توصيل داخل سلطنة عُمان");
        if (ATHR.isValidWhatsapp(cfg.order.whatsapp)) items.push("تواصل مباشر عبر واتساب");
        (cfg.sales.trust_custom || []).filter(Boolean).slice(0, 3).forEach((t) => items.push(fill(t)));
        const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
        return `<ul class="trust">${items.map((t) => `<li>${icon}${esc(t)}</li>`).join("")}</ul>`;
    }

    function bundleOffersHTML(p) {
        const cfg = C();
        const offers = (cfg.sales.bundles || []).filter((b) => b.enabled && b.a && b.b && b.a !== b.b && (b.a === p.id || b.b === p.id));
        return offers.map((b) => {
            const a = productById(b.a);
            const other = productById(b.a === p.id ? b.b : b.a);
            const target = productById(b.b);
            if (!a || !other || !target || other.is_available === false) return "";
            const text = b.a === p.id
                ? `اشترِ هذا المنتج واحصل على «${ATHR.productLabel(target, cfg)}» بخصم ${b.pct}%`
                : `عند شراء «${ATHR.productLabel(a, cfg)}» تحصل على هذا المنتج بخصم ${b.pct}%`;
            return `<div class="offer">
                ${other.image_url ? `<img src="${esc(other.image_url)}" alt="" loading="lazy">` : "<span></span>"}
                <div>
                    <strong>${esc(text)}</strong>
                    <small>الخصم يُطبَّق تلقائيًا في السلة.</small><br>
                    <button class="link-btn" type="button" data-add-bundle="${esc(b.a)}|${esc(b.b)}">أضف الاثنين للسلة</button>
                </div>
            </div>`;
        }).join("");
    }

    let gallery = { items: [], index: 0 };

    function renderProduct(id) {
        const p = productById(id);
        const cfg = C();
        if (!p) {
            $("#view").innerHTML = `<div class="wrap empty"><p>هذا المنتج غير متوفر حاليًا.</p><a class="btn btn-primary" href="#/">تصفّح المنتجات</a></div>`;
            return;
        }
        const cat = categoryById(p.category_id);
        const out = p.is_available === false;
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const related = cfg.sales.related_show ? relatedFor([p.id], Number(cfg.sales.related_count) || 4) : [];
        const showBuyNow = cfg.sales.buy_now && !out;
        const showWa = cfg.sales.wa_quick && wa && !out;

        $("#view").innerHTML = `
            <div class="wrap">
                <a class="back" href="#/${cat ? `c/${esc(cat.slug)}` : ""}" data-back>‹ ${cat ? esc(cat.name) : "كل المنتجات"}</a>
                <div class="pdp">
                    <div class="gallery" id="gallery"></div>
                    <div class="pdp-info">
                        <div class="pdp-meta">
                            ${cat ? `<a href="#/c/${esc(cat.slug)}">${esc(cat.name)}</a>` : ""}
                            ${colorHTML(p)}
                        </div>
                        <h1>${esc(p.name)}</h1>
                        ${priceHTML(p)}
                        ${p.description ? `<p class="pdp-desc">${esc(p.description)}</p>` : ""}
                        ${p.video_url && ATHR.isUrl(p.video_url) ? `<a class="btn btn-ghost" href="${esc(p.video_url)}" target="_blank" rel="noopener">▶ شاهد فيديو المنتج</a>` : ""}
                        ${out ? `<div class="out-note">${esc(cfg.texts.sold_out)}. تواصل معنا لمعرفة موعد توفره.</div>` : `
                        <div class="pdp-actions">
                            <div class="pdp-buy">
                                <div class="stepper lg" role="group" aria-label="الكمية">
                                    <button type="button" data-pdp-step="1" aria-label="زيادة">+</button>
                                    <output id="pdpQty" aria-live="polite">1</output>
                                    <button type="button" data-pdp-step="-1" aria-label="إنقاص">−</button>
                                </div>
                                <button class="btn btn-primary" type="button" data-pdp-add="${esc(p.id)}">${esc(cfg.texts.add_to_cart)}</button>
                            </div>
                            ${showBuyNow || showWa ? `<div class="pdp-alt${showBuyNow && showWa ? "" : " single"}">
                                ${showBuyNow ? `<button class="btn btn-ghost" type="button" data-buy-now="${esc(p.id)}">اشترِ الآن</button>` : ""}
                                ${showWa ? `<button class="btn btn-wa" type="button" data-wa-product="${esc(p.id)}">${waIcon()}اطلب عبر واتساب</button>` : ""}
                            </div>` : ""}
                        </div>`}
                        ${bundleOffersHTML(p)}
                        ${trustHTML()}
                    </div>
                </div>
                ${related.length ? `<section class="section" aria-labelledby="relTitle">
                    <div class="section-head"><h2 id="relTitle">${esc(cfg.sales.related_title)}</h2></div>
                    <div class="rail">${related.map((r) => cardHTML(r)).join("")}</div>
                </section>` : ""}
            </div>`;

        gallery = { items: p.image_url ? [{ type: "image", url: p.image_url }] : [], index: 0 };
        renderGallery(p);
        loadMedia(p.id).then((rows) => {
            if (parseRoute().id !== p.id) return;
            const images = rows.filter((r) => r.media_type === "image").slice(0, 5).map((r) => ({ type: "image", url: r.media_url }));
            const video = rows.find((r) => r.media_type === "video");
            gallery.items = [...(p.image_url ? [{ type: "image", url: p.image_url }] : []), ...images, ...(video ? [{ type: "video", url: video.media_url }] : [])];
            renderGallery(p);
        });
    }

    function renderGallery(p) {
        const el = $("#gallery");
        if (!el) return;
        const items = gallery.items;
        if (!items.length) {
            el.innerHTML = `<div class="stage"></div>`;
            return;
        }
        const i = Math.max(0, Math.min(gallery.index, items.length - 1));
        const item = items[i];
        const arrow = (dir) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir === "prev" ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}"/></svg>`;
        el.innerHTML = `
            <div class="stage" id="stage">
                ${item.type === "video"
                    ? `<video src="${esc(item.url)}" controls playsinline autoplay muted loop></video>`
                    : `<img src="${esc(item.url)}" alt="${esc(p.name)}">`}
                ${items.length > 1 ? `
                    <button class="stage-nav prev" type="button" data-gal="-1" aria-label="السابق">${arrow("prev")}</button>
                    <button class="stage-nav next" type="button" data-gal="1" aria-label="التالي">${arrow("next")}</button>
                    <span class="stage-count">${i + 1} من ${items.length}</span>` : ""}
            </div>
            ${items.length > 1 ? `<div class="thumbs" role="tablist" aria-label="صور المنتج">
                ${items.map((it, n) => `<button type="button" data-gal-to="${n}" aria-current="${n === i}" aria-label="${it.type === "video" ? "فيديو المنتج" : `صورة ${n + 1}`}">
                    ${it.type === "video" ? `${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : ""}<span class="play">▶</span>` : `<img src="${esc(it.url)}" alt="" loading="lazy">`}
                </button>`).join("")}
            </div>` : ""}`;

        const stage = $("#stage");
        let startX = null;
        stage.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
        stage.addEventListener("touchend", (e) => {
            if (startX === null) return;
            const dx = e.changedTouches[0].clientX - startX;
            startX = null;
            if (Math.abs(dx) > 40) moveGallery(dx > 0 ? 1 : -1, p);
        });
    }

    function moveGallery(step, p) {
        const n = gallery.items.length;
        if (n < 2) return;
        gallery.index = (gallery.index + step + n) % n;
        renderGallery(p || productById(parseRoute().id));
    }

    function waIcon() {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6a9.3 9.3 0 0 0-8 14.1L2.7 21.4l4.8-1.3A9.3 9.3 0 1 0 12 2.6Z"/><path class="wa-glyph" d="M8.4 7.6c.2-.4.4-.4.7-.4h.6c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.7.8c.7 1.3 1.7 2.3 3 3l.8-.7c.2-.2.4-.2.7-.1l1.8.8c.3.1.4.3.4.5v.6c0 .3-.1.5-.4.7-.4.3-1 .5-1.6.5-1.4 0-3.2-.8-4.7-2.3S8 9.9 8 8.5c0-.4.1-.7.4-.9Z"/></svg>`;
    }

    // =====================================================
    // WHATSAPP MESSAGES
    // =====================================================

    function productLines(lines) {
        return lines.map((l) => `• ${ATHR.productLabel(l.product, C())} × ${l.qty} = ${money(l.total)}`);
    }

    // الطلب السريع: بدون نموذج
    function quickOrderMessage(lines, totals) {
        const cfg = C();
        const no = ATHR.newOrderNo();
        const when = ATHR.muscatParts();
        const c = CC();
        const out = [
            fill(cfg.texts.wa_first_line),
            `رقم الطلب: ${no}`,
            `اليوم: ${when.day}`,
            `التاريخ: ${when.date}`,
            `الوقت: ${when.time}`
        ];
        if (!isBase()) out.push(`الدولة: ${c.flag} ${c.name}`);
        out.push("", "المنتجات:", ...productLines(lines));
        if (totals.discount > 0) out.push(`خصم الباقة: -${money(totals.discount)}`);
        out.push(`الإجمالي: ${money(totals.afterDiscount)} (بدون التوصيل)${approx(totals.afterDiscount)}`);
        out.push("", isBase() ? "اسمي ومحافظتي وولايتي وعنواني:" : "اسمي ومدينتي وعنواني:");
        return out.join("\n");
    }

    function quickOrder(lines) {
        const cfg = C();
        const totals = ATHR.computeCart(lines.map((l) => ({ id: l.product.id, qty: l.qty })), S.products, cfg, S.country);
        const message = quickOrderMessage(totals.lines, totals);
        window.open(ATHR.waLink(cfg.order.whatsapp, message), "_blank", "noopener");
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
        out.push("", "المنتجات:");
        order.items.forEach((it) => out.push(`• ${it.label} × ${it.qty} = ${money(it.total)}`));
        if (order.discount > 0) out.push(`خصم الباقة: -${money(order.discount)}`);
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

    function renderCart() {
        const cfg = C();
        const totals = computeCart();
        const view = $("#view");

        if (!totals.lines.length) {
            view.innerHTML = `<div class="wrap"><h1 class="page-title">السلة</h1>
                <div class="panel empty"><p>سلتك فارغة. اختر تصميمك وأضفه للسلة.</p><a class="btn btn-primary" href="#/">تصفّح المنتجات</a></div></div>`;
            return;
        }

        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const suggested = cfg.sales.related_show
            ? relatedFor(totals.lines.map((l) => l.product.id), Number(cfg.sales.related_count) || 4)
            : [];
        const delivery = ATHR.deliveriesFor(cfg, S.country);
        const freeMin = Number(cfg.order.free_min) || 0;
        const c = CC();

        view.innerHTML = `
            <div class="wrap">
                <h1 class="page-title">السلة</h1>
                <div class="layout-2">
                    <div>
                        <div class="panel">
                            ${totals.lines.map((l) => `
                                <div class="cart-line">
                                    <a href="#/p/${esc(l.product.id)}">${l.product.image_url ? `<img src="${esc(l.product.image_url)}" alt="">` : ""}</a>
                                    <div>
                                        <a class="name" href="#/p/${esc(l.product.id)}">${esc(l.product.name)}</a>
                                        <div>${colorHTML(l.product)}</div>
                                        <div class="muted" style="font-size:13.5px">${money(l.product.price)} للقطعة</div>
                                        <div class="cart-line-foot">
                                            <div class="stepper" role="group" aria-label="الكمية">
                                                <button type="button" data-inc="${esc(l.product.id)}" aria-label="زيادة" ${l.qty >= maxQty() ? "disabled" : ""}>+</button>
                                                <output>${l.qty}</output>
                                                <button type="button" data-dec="${esc(l.product.id)}" aria-label="إنقاص">−</button>
                                            </div>
                                            <b>${money(l.total)}</b>
                                        </div>
                                        <button class="remove" type="button" data-remove="${esc(l.product.id)}">حذف</button>
                                    </div>
                                </div>`).join("")}
                        </div>
                        ${totals.savings.length || totals.hints.length ? `<div class="panel">
                            ${totals.savings.map((s) => `<div class="save-line"><span>وفر الباقة: ${esc(s.b.name)} بخصم ${s.pct}%${s.pairs > 1 ? ` × ${s.pairs}` : ""}</span><span>-${money(s.amount)}</span></div>`).join("")}
                            ${totals.savings.length && totals.hints.length ? `<div style="height:10px"></div>` : ""}
                            ${totals.hints.map((h) => `<div class="hint"><span>أكمل الباقة ووفّر: أضف «${esc(ATHR.productLabel(h.b, cfg))}» بخصم ${h.pct}%</span><button class="btn btn-primary btn-sm" type="button" data-add="${esc(h.b.id)}">أضف</button></div>`).join("")}
                        </div>` : ""}
                    </div>
                    <aside>
                        <div class="panel">
                            <h2>ملخص الطلب</h2>
                            <div class="rows">
                                <div class="row"><span>المنتجات (${totals.count})</span><span>${money(totals.subtotal)}</span></div>
                                ${totals.discount > 0 ? `<div class="row" style="color:var(--ok)"><span>خصم الباقات</span><span>-${money(totals.discount)}</span></div>` : ""}
                                <div class="row"><span>التوصيل إلى ${esc(c.flag)} ${esc(c.name)}</span><span class="muted">${totals.freeShipping ? "مجاني" : delivery.length ? "يُحدَّد في الخطوة التالية" : "غير متاح حاليًا"}</span></div>
                                ${totals.freeShipping || !delivery.length ? "" : `<ul class="ship-list">${delivery.map((d) => `<li><span class="muted">${esc(d.name)}</span><span>${deliveryPriceLabel(d)}</span></li>`).join("")}</ul>`}
                                ${totals.freeEligible && freeMin > 0 ? `<div class="${totals.freeShipping ? "done" : ""}" style="font-size:13.5px">
                                    <div style="margin-bottom:6px;${totals.freeShipping ? "color:var(--ok);font-weight:600" : ""}">${esc(totals.freeShipping ? fill(cfg.sales.free_done) : fill(cfg.sales.free_during, { left: money(totals.leftForFree) }))}</div>
                                    <div class="meter"><span style="width:${Math.min(100, totals.afterDiscount / freeMin * 100)}%"></span></div>
                                </div>` : ""}
                                <div class="row total"><span>المجموع</span><span>${money(totals.afterDiscount)}</span></div>
                                ${isBase() ? "" : `<div class="row muted"><span>بعملتك تقريبًا</span><span>≈ ${local(totals.afterDiscount)}</span></div>`}
                            </div>
                            <div class="cart-actions">
                                <a class="btn btn-primary btn-block" href="#/checkout">متابعة الطلب</a>
                                ${cfg.sales.wa_quick && wa ? `<button class="btn btn-wa btn-block" type="button" data-wa-cart>${waIcon()}اطلب عبر واتساب</button>` : ""}
                                <a class="btn btn-ghost btn-block" href="#/">مواصلة التسوق</a>
                            </div>
                        </div>
                    </aside>
                </div>
                ${suggested.length ? `<section class="section" aria-labelledby="sugTitle">
                    <div class="section-head"><h2 id="sugTitle">${esc(cfg.sales.related_title)}</h2></div>
                    <div class="rail">${suggested.map((r) => cardHTML(r)).join("")}</div>
                </section>` : ""}
            </div>`;
    }

    // =====================================================
    // CHECKOUT
    // =====================================================

    function savedCustomer() {
        return C().sales.remember_customer ? storage.get(KEYS.customer, null) : null;
    }

    function renderCheckout(keep = null) {
        const cfg = C();
        const totals = computeCart();
        if (!totals.lines.length) {
            go("#/cart");
            return;
        }
        const saved = keep || savedCustomer() || {};
        const c = CC();
        const isOm = c.code === "OM";
        const rule = ATHR_PHONE_RULES[c.code] || ATHR_PHONE_RULES.OM;
        const delivery = ATHR.deliveriesFor(cfg, c.code);
        const payments = ATHR.paymentsFor(cfg, c.code);
        const pickDelivery = delivery.find((d) => d.id === saved.delivery) || delivery[0];
        const pickPayment = payments.find((p) => p.id === saved.payment) || payments[0];
        const countries = ATHR.countries(cfg).filter((x) => x.enabled);
        const savedPhone = saved.country && saved.country !== c.code ? "" : (saved.phoneLocal || (isOm ? saved.phone : "") || "");

        $("#view").innerHTML = `
            <div class="wrap">
                <h1 class="page-title">إتمام الطلب</h1>
                <form class="layout-2" id="checkoutForm" novalidate>
                    <div class="form">
                        ${saved.name && !keep ? `<div class="saved-note"><span>عبّأنا بياناتك من طلبك السابق.</span><button class="link-btn" type="button" data-forget-me>مسح بياناتي</button></div>` : ""}
                        <div class="panel form">
                            <h2>بياناتك</h2>
                            ${countries.length > 1 ? field("country", "الدولة", `<select class="input" name="country" id="countrySelect">${countries.map((x) => `<option value="${x.code}"${x.code === c.code ? " selected" : ""}>${x.flag} ${esc(x.name)}</option>`).join("")}</select>`) : ""}
                            ${field("name", "الاسم الكامل", `<input class="input" name="name" autocomplete="name" value="${esc(saved.name || "")}" required>`)}
                            ${field("phone", "رقم الهاتف", `<span class="phone-wrap"><span class="dial" dir="ltr">+${c.dial}</span><input class="input" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" dir="ltr" placeholder="${rule.example}" value="${esc(savedPhone)}" required></span>`, `رقم ${esc(c.name)}: ${rule.hint}`)}
                            ${isOm ? `<div class="two">
                                ${field("gov", "المحافظة", `<select class="input" name="gov" required><option value="">اختر المحافظة</option>${(cfg.order.governorates || []).filter(Boolean).map((g) => `<option${saved.gov === g ? " selected" : ""}>${esc(g)}</option>`).join("")}</select>`)}
                                ${cfg.order.show_wilaya ? field("wilaya", `الولاية${cfg.order.wilaya_required ? "" : " (اختياري)"}`, `<input class="input" name="wilaya" value="${esc(saved.wilaya || "")}">`) : ""}
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
                                <a class="btn btn-ghost btn-block" href="#/cart">رجوع للسلة</a>
                            </div>
                            <div class="err" id="formErr" role="alert"></div>
                            ${trustHTML()}
                        </div>
                    </aside>
                </form>
            </div>`;

        renderAddressField(saved);
        renderPayExtra();
        updateCheckoutSummary();
    }

    function field(name, label, control, help = "") {
        return `<label class="field" data-field="${name}"><span>${label}</span>${control}${help ? `<small>${help}</small>` : ""}<span class="err" data-err="${name}"></span></label>`;
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
            : field("address", "العنوان", `<textarea class="input" name="address" rows="2" placeholder="المنطقة، رقم البيت أو أقرب معلم">${esc(value)}</textarea>`);
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
        ].filter(([, v]) => v && String(v).trim());
        const hasAccount = [b.number, b.account, b.iban].some((v) => v && String(v).trim());
        if (!hasAccount) {
            return `<p class="muted" style="margin:10px 0 0">نرسل لك بيانات الحساب للتحويل عبر واتساب بعد إرسال الطلب.</p>`;
        }
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
        const d = selectedDelivery();
        const shipping = ATHR.shippingFor(d, totals.lines, C());
        const ship = totals.freeShipping ? 0 : shipping.cost;
        return { ...totals, ship, kg: totals.freeShipping ? 0 : shipping.kg, total: totals.afterDiscount + ship, delivery: d };
    }

    function updateCheckoutSummary() {
        const box = $("#checkoutSummary");
        if (!box) return;
        const t = checkoutTotals();
        if (!t.lines.length) {
            go("#/cart");
            return;
        }
        $$("[data-ship-price]").forEach((el) => {
            const d = ATHR.deliveriesFor(C(), S.country).find((x) => x.id === el.dataset.shipPrice);
            const s = ATHR.shippingFor(d, t.lines, C());
            el.textContent = t.freeShipping || !(s.cost > 0) ? "مجاني" : money(s.cost);
        });
        box.innerHTML = `<div class="rows">
            ${t.lines.map((l) => `<div class="row"><span>${esc(ATHR.productLabel(l.product, C()))} × ${l.qty}</span><span>${money(l.total)}</span></div>`).join("")}
            ${t.discount > 0 ? `<div class="row" style="color:var(--ok)"><span>خصم الباقات</span><span>-${money(t.discount)}</span></div>` : ""}
            <div class="row"><span>التوصيل${t.kg ? ` (${t.kg} كيلو تقريبًا)` : ""}</span><span>${t.ship > 0 ? money(t.ship) : "مجاني"}</span></div>
            <div class="row total"><span>الإجمالي</span><span>${money(t.total)}</span></div>
            ${isBase() ? "" : `<div class="row muted"><span>بعملتك تقريبًا</span><span>≈ ${local(t.total)}</span></div>`}
            ${t.kg ? `<p class="muted" style="margin:4px 0 0;font-size:12.5px">سعر التوصيل حسب الوزن التقريبي، ونؤكد لك الوزن النهائي قبل الشحن.</p>` : ""}
        </div>`;
    }

    function validateCheckout(form) {
        const cfg = C();
        const v = Object.fromEntries(new FormData(form).entries());
        const errors = {};
        const isOm = S.country === "OM";
        const name = String(v.name || "").trim();
        const phone = ATHR.parsePhone(v.phone, S.country);
        const d = selectedDelivery();
        const p = selectedPayment();

        if (name.length < 3) errors.name = "اكتب اسمك الكامل (3 أحرف على الأقل).";
        if (!phone.valid) errors.phone = `اكتب رقم ${CC().name} الصحيح: ${phone.rule.hint}.`;
        if (!String(v.gov || "").trim()) errors.gov = isOm ? "اختر المحافظة." : "اكتب المدينة.";
        if (isOm && cfg.order.show_wilaya && cfg.order.wilaya_required && !String(v.wilaya || "").trim()) errors.wilaya = "اكتب الولاية.";
        if (!d) errors.delivery = "اختر طريقة التوصيل.";
        else if (d.type === "office") {
            if (String(v.office || "").trim().length < 3) errors.office = "اكتب اسم المكتب (3 أحرف على الأقل).";
        } else if (String(v.address || "").trim().length < 6) errors.address = "اكتب عنوانك بوضوح (6 أحرف على الأقل).";
        if (!p) errors.payment = "اختر طريقة الدفع.";

        $$("[data-err]", form).forEach((el) => { el.textContent = ""; });
        $$(".field.invalid", form).forEach((el) => el.classList.remove("invalid"));
        Object.entries(errors).forEach(([key, message]) => {
            const err = form.querySelector(`[data-err="${key}"]`);
            if (err) {
                err.textContent = message;
                err.closest(".field")?.classList.add("invalid");
            }
        });
        const formErr = $("#formErr");
        const keys = Object.keys(errors);
        formErr.textContent = keys.length ? (errors.delivery || errors.payment || "راجع الخانات المظللة بالأحمر.") : "";
        if (keys.length) {
            const first = form.querySelector(".field.invalid .input");
            if (first) first.focus({ preventScroll: false });
        }
        return keys.length ? null : { v, name, phone, d, p };
    }

    async function placeOrder(form) {
        const ok = validateCheckout(form);
        if (!ok) return;
        const cfg = C();
        const { v, name, phone, d, p } = ok;
        const isOm = S.country === "OM";
        const t = checkoutTotals();
        const button = $("#placeOrder");
        button.disabled = true;
        button.textContent = "جاري تأكيد الطلب...";

        const order = {
            order_no: ATHR.newOrderNo(),
            ordered_at: new Date().toISOString(),
            source: "web",
            country: S.country,
            customer_name: name,
            phone: phone.stored,
            governorate: String(v.gov || "").trim(),
            wilaya: isOm && cfg.order.show_wilaya ? String(v.wilaya || "").trim() || null : null,
            address: d.type === "office" ? null : String(v.address || "").trim(),
            office: d.type === "office" ? String(v.office || "").trim() : null,
            notes: cfg.order.show_notes ? String(v.notes || "").trim() || null : null,
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
            total: t.total
        };

        // حفظ الطلب في الدفتر (لا يمنع إتمام الطلب لو فشل)
        let saved = false;
        for (let attempt = 0; attempt < 3 && !saved; attempt++) {
            try {
                const result = await Promise.race([
                    athrSupabase.from("orders").insert({ ...order }),
                    new Promise((resolve) => setTimeout(() => resolve({ error: { message: "timeout" } }), 7000))
                ]);
                if (!result.error) saved = true;
                else if (String(result.error.code) === "23505") order.order_no = ATHR.newOrderNo();
                else break;
            } catch (error) {
                console.warn("Order save failed:", error);
                break;
            }
        }

        if (cfg.sales.remember_customer) {
            storage.set(KEYS.customer, {
                name, country: S.country, phone: isOm ? phone.local : "", phoneLocal: phone.local,
                gov: v.gov, wilaya: v.wilaya || "", address: v.address || "", office: v.office || "",
                delivery: d.id, payment: p.id
            });
        }

        const message = orderMessage({ ...order, ship_kg: t.kg });
        storage.set(KEYS.lastOrder, { order, message, payment: p, saved });
        location.hash = `#/done/${order.order_no}`;
        saveCart([]);
    }

    // =====================================================
    // THANK YOU
    // =====================================================

    function renderDone(no) {
        const cfg = C();
        const last = storage.get(KEYS.lastOrder, null);
        if (!last || last.order.order_no !== no) {
            $("#view").innerHTML = `<div class="wrap empty"><p>لا توجد تفاصيل لهذا الطلب على هذا الجهاز.</p><a class="btn btn-primary" href="#/">العودة للمتجر</a></div>`;
            return;
        }
        const { order, message, payment } = last;
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const isOnline = payment && payment.type === "online" && ATHR.isUrl(payment.link);
        const code = order.country || "OM";
        const approxTotal = code === "OM" ? "" : `<div class="row muted"><span>بعملتك تقريبًا</span><span>≈ ${ATHR.moneyIn(order.total, cfg, code)}</span></div>`;

        $("#view").innerHTML = `
            <div class="wrap thanks">
                <div class="thanks-head">
                    <div class="check"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
                    <h1 style="font-size:24px">شكرًا لك، ${esc(order.customer_name.split(" ")[0])}</h1>
                    <span class="muted">رقم طلبك</span>
                    <span class="order-no">${esc(order.order_no)}</span>
                </div>
                <div class="step">
                    <p>الخطوة الأخيرة: ${esc(fill(cfg.texts.thanks_text))}</p>
                    ${wa ? `<a class="btn btn-wa btn-block" href="${esc(ATHR.waLink(cfg.order.whatsapp, message))}" target="_blank" rel="noopener">${waIcon()}أرسل الطلب عبر واتساب</a>` : ""}
                    ${isOnline ? `<a class="btn btn-primary btn-block" href="${esc(payment.link)}" target="_blank" rel="noopener">ادفع الآن (${money(order.total)})</a>` : ""}
                    ${payment && payment.type === "bank" ? `<div><p class="muted" style="font-weight:500">حوّل ${money(order.total)}${code === "OM" ? "" : ` (≈ ${ATHR.moneyIn(order.total, cfg, code)})`}:</p>${bankRows(payment)}</div>` : ""}
                </div>
                <div class="panel">
                    <h2>ملخص الطلب</h2>
                    <div class="rows">
                        ${order.items.map((it) => `<div class="row"><span>${esc(it.label)} × ${it.qty}</span><span>${money(it.total)}</span></div>`).join("")}
                        ${order.discount > 0 ? `<div class="row" style="color:var(--ok)"><span>خصم الباقات</span><span>-${money(order.discount)}</span></div>` : ""}
                        <div class="row"><span>التوصيل (${esc(order.delivery_name)})</span><span>${order.delivery_price > 0 ? money(order.delivery_price) : "مجاني"}</span></div>
                        <div class="row total"><span>الإجمالي</span><span>${money(order.total)}</span></div>
                        ${approxTotal}
                        <div class="row"><span class="muted">الدفع</span><span>${esc(order.payment_name)}</span></div>
                        <div class="row"><span class="muted">${order.delivery_type === "office" ? "المكتب" : "العنوان"}</span><span>${esc(order.office || order.address || "")}</span></div>
                    </div>
                </div>
                <a class="btn btn-ghost" href="#/">العودة للمتجر</a>
            </div>`;
    }

    // =====================================================
    // MENU & POLICY SHEETS
    // =====================================================

    let lastFocus = null;

    function openSheet(html, { modal = false, label = "" } = {}) {
        const sheet = $("#sheet");
        lastFocus = document.activeElement;
        sheet.className = `sheet${modal ? " modal" : ""}`;
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
        document.body.classList.remove("locked");
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function openMenu() {
        const cfg = C();
        const counts = new Map();
        S.products.forEach((p) => counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1));
        const cats = S.categories.filter((c) => counts.get(c.id));
        const totals = computeCart();
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const socials = (cfg.texts.socials || []).filter((s) => s.name && ATHR.isUrl(s.url));
        const hasAd = adHTML() !== "";
        const hasReviews = (cfg.contact.reviews || []).some((r) => r.text);
        const items = [];
        const li = (inner) => `<li>${inner}</li>`;

        if (cfg.contact.menu_show || S.isAdmin) {
            items.push(li(`<a href="#/" data-close-sheet>الرئيسية</a>`));
            if (cfg.theme.show_search !== false) items.push(li(`<a href="#/search" data-close-sheet>بحث في المنتجات</a>`));
            items.push(`<li class="menu-label">الأقسام</li>`);
            cats.forEach((c) => items.push(li(`<a class="menu-sub" href="#/c/${esc(c.slug)}" data-close-sheet>${esc(c.name)} <small>${counts.get(c.id)}</small></a>`)));
            items.push(`<li class="menu-label">المتجر</li>`);
            if (hasAd) items.push(li(`<a href="#/offers" data-close-sheet>العروض</a>`));
            if (hasReviews) items.push(li(`<a href="#/reviews" data-close-sheet>${esc(cfg.contact.reviews_title)}</a>`));
            items.push(li(`<a href="#/cart" data-close-sheet>السلة <small>${totals.count ? totals.count : ""}</small></a>`));
            if (wa) items.push(li(`<a href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(cfg.contact.wa_float_msg)))}" target="_blank" rel="noopener">تواصل معنا عبر واتساب</a>`));
            if (cfg.contact.policy_show) items.push(li(`<button type="button" data-open-policy>${esc(cfg.contact.policy_title)}</button>`));
            items.push(li(`<button type="button" data-open-info>معلومات المتجر والتواصل</button>`));
            if (ATHR.countries(cfg).filter((c) => c.enabled).length > 1) items.push(li(`<button type="button" data-open-currency>الدولة والعملة <small>${esc(CC().flag)} ${esc(CC().symbol)}</small></button>`));
            if (cfg.contact.share_url && ATHR.isUrl(cfg.contact.share_url)) items.push(li(`<button type="button" data-share>مشاركة المتجر</button>`));
            if (socials.length) {
                items.push(`<li class="menu-label">حساباتنا</li>`);
                socials.forEach((s) => items.push(li(`<a class="menu-sub" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`)));
            }
        }
        if (S.isAdmin) {
            items.push(`<li class="menu-label">لك وحدك</li>`);
            items.push(`<li class="menu-owner"><a href="#admin" data-close-sheet>تعديل المتجر</a></li>`);
            items.push(`<li class="menu-owner"><a href="#orders" data-close-sheet>دفتر الطلبيات</a></li>`);
        }

        openSheet(`
            <div class="sheet-head"><h2>${esc(cfg.name)}</h2><button class="close" type="button" data-close-sheet aria-label="إغلاق">×</button></div>
            <ul class="menu-list">${items.join("")}</ul>`, { label: "القائمة" });
    }

    function openPolicy() {
        const cfg = C();
        const notes = String(cfg.contact.policy_notes || "").split("\n").map((s) => s.trim()).filter(Boolean);
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const enabledCount = ATHR.countries(cfg).filter((c) => c.enabled).length;
        const delivery = (cfg.order.delivery || []).filter((d) => d.enabled);
        const free = freeLine();
        openSheet(`
            <div class="sheet-head"><h2>${esc(cfg.contact.policy_title)}</h2><button class="close" type="button" data-close-sheet aria-label="إغلاق">×</button></div>
            <div class="policy">
                <h3>طرق التوصيل</h3>
                ${delivery.map((d) => {
                    const list = flagsFor(d);
                    return `<p><b>${esc(d.name)}</b> — ${deliveryPriceLabel(d)}${d.duration ? `، المدة: ${esc(d.duration)}` : ""}${list.length && list.length < enabledCount ? `<br><span class="muted">إلى: ${esc(countriesText(list))}</span>` : ""}${d.note ? `<br><span class="muted">${esc(d.note)}</span>` : ""}</p>`;
                }).join("")}
                ${free ? `<p>${esc(free)}</p>` : ""}
                <p class="muted">داخل عُمان نوصّل إلى: ${esc((cfg.order.governorates || []).join("، "))}.</p>
                <h3>طرق الدفع</h3>
                ${paymentGroups().map((g) => `<p>${g.countries.length < enabledCount ? `<b>${esc(countriesText(g.countries))}:</b> ` : ""}${esc(g.names)}</p>`).join("")}
                ${(cfg.order.payments || []).filter((p) => p.enabled && p.note).map((p) => `<p class="muted">${esc(p.name)}: ${esc(fill(p.note))}</p>`).join("")}
                <h3>العملات</h3>
                <p class="muted">نعرض الأسعار بعملة دولتك تقريبيًا، ويُحسب الطلب بالريال العماني.</p>
                ${notes.length ? `<h3>ملاحظات</h3>${notes.map((n) => `<p>${esc(fill(n))}</p>`).join("")}` : ""}
                ${wa ? `<p style="margin-top:16px"><a class="btn btn-wa btn-block" href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(cfg.contact.wa_float_msg)))}" target="_blank" rel="noopener">${waIcon()}اسألنا عبر واتساب</a></p>` : ""}
            </div>`, { modal: true, label: cfg.contact.policy_title });
    }

    function openInfo() {
        const cfg = C();
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const socials = (cfg.texts.socials || []).filter((s) => s.name && ATHR.isUrl(s.url));
        openSheet(`
            <div class="sheet-head"><h2>معلومات المتجر</h2><button class="close" type="button" data-close-sheet aria-label="إغلاق">×</button></div>
            <div class="policy">
                ${cfg.texts.about ? `<p>${esc(fill(cfg.texts.about))}</p>` : ""}
                ${deliveryLines().map((l) => `<p class="muted">${esc(l)}</p>`).join("")}
                ${wa ? `<h3>واتساب</h3><p dir="ltr" style="text-align:right">${esc(ATHR.localPhone(cfg.order.whatsapp))}</p>` : ""}
                ${socials.length ? `<h3>حساباتنا</h3><div class="footer-links" style="margin:0">${socials.map((s) => `<a class="btn btn-ghost btn-sm" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join("")}</div>` : ""}
                ${wa ? `<p style="margin-top:16px"><a class="btn btn-wa btn-block" href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(cfg.contact.wa_float_msg)))}" target="_blank" rel="noopener">${waIcon()}راسلنا عبر واتساب</a></p>` : ""}
            </div>`, { modal: true, label: "معلومات المتجر" });
    }

    async function shareStore() {
        const cfg = C();
        const data = { title: cfg.name, text: fill(cfg.texts.hero_title), url: cfg.contact.share_url };
        if (navigator.share) {
            try { await navigator.share(data); } catch { /* cancelled */ }
        } else {
            copyText(cfg.contact.share_url, "تم نسخ رابط المتجر");
        }
    }

    // =====================================================
    // EVENTS
    // =====================================================

    document.addEventListener("click", (e) => {
        const t = e.target.closest("button, a");
        if (!t) {
            if (e.target.closest("[data-close-sheet]")) closeSheet();
            return;
        }
        const d = t.dataset;

        if (d.closeSheet !== undefined) { closeSheet(); }
        if (t.id === "menuBtn") { openMenu(); return; }
        if (d.add) { addToCart(d.add); return; }
        if (d.inc) { addToCart(d.inc, 1, { silent: true }); return; }
        if (d.dec) { setQty(d.dec, cartQty(d.dec) - 1); return; }
        if (d.remove) { setQty(d.remove, 0); toast("حُذف من السلة"); return; }
        if (d.cat) {
            S.cat = d.cat;
            history.replaceState(null, "", d.cat === "all" ? "#/" : `#/c/${encodeURIComponent(d.cat)}`);
            lastRouteKey = JSON.stringify(parseRoute());
            renderCatalog();
            return;
        }
        if (d.clearSearch !== undefined) { S.query = ""; $("#searchInput").value = ""; renderCatalog(); return; }
        if (d.scrollCatalog !== undefined || d.adBtn !== undefined && t.getAttribute("href") === "#catalog") {
            e.preventDefault();
            $("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        if (d.gal) { moveGallery(Number(d.gal)); return; }
        if (d.galTo) { gallery.index = Number(d.galTo); renderGallery(productById(parseRoute().id)); return; }
        if (d.pdpStep) {
            const out = $("#pdpQty");
            const next = Math.max(1, Math.min(maxQty(), Number(out.textContent) + Number(d.pdpStep)));
            out.textContent = next;
            return;
        }
        if (d.pdpAdd) {
            const qty = Number($("#pdpQty")?.textContent) || 1;
            const current = cartQty(d.pdpAdd);
            setQty(d.pdpAdd, current + qty);
            toast("أُضيف إلى السلة");
            return;
        }
        if (d.buyNow) {
            const qty = Number($("#pdpQty")?.textContent) || 1;
            if (cartQty(d.buyNow) < qty) setQty(d.buyNow, qty, { silent: true });
            go("#/checkout");
            return;
        }
        if (d.waProduct) {
            const p = productById(d.waProduct);
            const qty = Number($("#pdpQty")?.textContent) || 1;
            if (p) quickOrder([{ product: p, qty }]);
            return;
        }
        if (d.waCart !== undefined) { quickOrder(computeCart().lines); return; }
        if (d.addBundle) {
            const [a, b] = d.addBundle.split("|");
            if (!cartQty(a)) addToCart(a, 1, { silent: true });
            if (!cartQty(b)) addToCart(b, 1, { silent: true });
            toast("أُضيف المنتجان، والخصم يظهر في السلة");
            return;
        }
        if (d.copy) { copyText(d.copy); return; }
        if (d.forgetMe !== undefined) {
            storage.del(KEYS.customer);
            toast("مُسحت بياناتك من هذا الجهاز");
            renderCheckout();
            return;
        }
        if (d.openPolicy !== undefined) { openPolicy(); return; }
        if (d.openInfo !== undefined) { openInfo(); return; }
        if (d.openCurrency !== undefined || t.id === "curBtn") { openCurrency(); return; }
        if (d.setCountry) { closeSheet(); setCountry(d.setCountry); return; }
        if (d.share !== undefined) { shareStore(); return; }
        if (d.closeCartbar !== undefined) { session.set(KEYS.cartBarClosed, "1"); renderBars(); return; }
        if (d.exitPreview !== undefined) { ATHR.store.exitPreview(true); return; }
    });

    document.addEventListener("change", (e) => {
        const t = e.target;
        if (t.id === "sortSelect") { S.sort = t.value; renderCatalog(); return; }
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
        if (t.name === "delivery") { renderAddressField(); updateCheckoutSummary(); return; }
        if (t.name === "payment") { renderPayExtra(); return; }
    });

    document.addEventListener("input", (e) => {
        const fieldEl = e.target.closest && e.target.closest("#checkoutForm .field.invalid");
        if (fieldEl) {
            fieldEl.classList.remove("invalid");
            const err = fieldEl.querySelector("[data-err]");
            if (err) err.textContent = "";
        }
    });

    document.addEventListener("submit", (e) => {
        if (e.target.id === "checkoutForm") {
            e.preventDefault();
            placeOrder(e.target);
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSheet();
    });

    let searchTimer;
    $("#searchInput").addEventListener("input", (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            S.query = e.target.value;
            if (parseRoute().name !== "home") {
                location.hash = "#/";
                return;
            }
            renderCatalog();
        }, 150);
    });
    $("#searchInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.target.blur();
            $("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    // =====================================================
    // OWNER AREA (لوحة التحكم ودفتر الطلبيات)
    // =====================================================

    let adminLoading = null;

    function loadAdminScripts() {
        if (window.ATHR_ADMIN) return Promise.resolve();
        if (adminLoading) return adminLoading;
        adminLoading = new Promise((resolve, reject) => {
            const css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = "css/admin-panel.css?v=2";
            document.head.appendChild(css);
            const script = document.createElement("script");
            script.src = "js/admin-panel.js?v=2";
            script.onload = () => resolve();
            script.onerror = () => { adminLoading = null; reject(new Error("admin script")); };
            document.body.appendChild(script);
        });
        return adminLoading;
    }

    async function openOwnerArea(name) {
        try {
            await loadAdminScripts();
            window.ATHR_ADMIN.open(name);
        } catch {
            toast("تعذر فتح لوحة التحكم. تأكد من الإنترنت.");
        }
    }

    async function checkAdmin() {
        try {
            const { data } = await athrSupabase.auth.getSession();
            if (!data || !data.session) return;
            const { data: row } = await athrSupabase.from("admin_users").select("id").eq("id", data.session.user.id).maybeSingle();
            S.isAdmin = Boolean(row);
            renderChrome();
            if (S.isAdmin) {
                const fresh = await fetchData();
                if (!S.preview) applyData(fresh);
            }
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
            history.replaceState(null, "", "#/");
            applyData(data);
            window.scrollTo(0, 0);
        },
        exitPreview(reopen) {
            S.preview = false;
            S.media.clear();
            const cached = storage.get(KEYS.cache, null);
            if (cached) applyData(cached);
            if (reopen) location.hash = "#admin";
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

    trackVisit();
    S.country = guessCountry();
    applyTheme();
    loadData().then(checkAdmin);
})();
