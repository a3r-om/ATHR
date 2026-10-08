/* =====================================================
   ATHR STORE — قوالب الصفحات (HTML)
   دوال نقية تستعملها واجهة المتجر في المتصفح، وسكربت بناء
   صفحات جوجل (tools/build.mjs) لتطابق الصفحة قبل وبعد التحميل.
   كل نص للزائر يمر عبر t() ليظهر بالعربي أو الإنجليزي.
===================================================== */

(function (root) {
    "use strict";

    const ATHR = root.ATHR;
    const esc = ATHR.escape;
    const t = ATHR.t;
    const L = ATHR.L;
    const V = ATHR.views = {};

    // =====================================================
    // CONTEXT
    // =====================================================

    // v = { cfg, products, categories, reviews, country, cartQty(id), prerender }
    V.ctx = function (o) {
        const cfg = o.cfg;
        const products = (o.products || []).filter((p) => p.is_visible !== false)
            .slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const categories = (o.categories || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const byId = new Map(products.map((p) => [p.id, p]));
        const catById = new Map(categories.map((c) => [c.id, c]));
        const counts = new Map();
        const groups = ATHR.buildGroups(products, cfg);
        const seenGroup = new Set();
        products.forEach((p) => {
            const g = groups.get(p.id);
            if (g) {
                if (seenGroup.has(g)) return;
                seenGroup.add(g);
            }
            counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);
        });
        const reviews = (o.reviews || []).filter((r) => r && r.text);
        const reviewsByProduct = new Map();
        reviews.forEach((r) => {
            if (!r.product_id) return;
            const g = groups.get(r.product_id);
            const keys = g ? g.map((p) => p.id) : [r.product_id];
            keys.forEach((k) => {
                if (!reviewsByProduct.has(k)) reviewsByProduct.set(k, []);
                reviewsByProduct.get(k).push(r);
            });
        });
        return {
            cfg,
            products,
            categories,
            reviews,
            country: o.country || ATHR.BASE_COUNTRY,
            cartQty: o.cartQty || (() => 0),
            prerender: Boolean(o.prerender),
            byId,
            catById,
            counts,
            groups,
            reviewsByProduct,
            colorById: new Map((cfg.colors || []).map((c) => [c.id, c]))
        };
    };

    // =====================================================
    // SMALL HELPERS
    // =====================================================

    const fill = (v, text, extra) => ATHR.fill(text, v.cfg, extra);
    const ct = (v, path) => ATHR.ct(v.cfg, path);
    const money = (v, n) => ATHR.money(n, v.cfg);
    const isBase = (v) => v.country === ATHR.BASE_COUNTRY;
    const local = (v, n) => ATHR.moneyIn(n, v.cfg, v.country);
    const sep = () => t("، ");
    V.money = money;
    V.local = local;
    V.fill = fill;
    V.ct = ct;

    const ICON = {
        truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h11v9.5H3z"/><path d="M14 9.5h4l3 3.2V16h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
        card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
        share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4"/></svg>',
        gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5C10 4 6.5 5 7.5 7.2 8.2 8.5 12 8.5 12 8.5ZM12 8.5c2-4.5 5.5-3.5 4.5-1.3-.7 1.3-4.5 1.3-4.5 1.3Z"/></svg>',
        tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7z"/><circle cx="8" cy="9" r="1.4"/></svg>',
        chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>',
        home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5"/><path d="M6 9v10.5h4.5V14h3v5.5H18V9"/></svg>',
        sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
        moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z"/></svg>',
        auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16a8 8 0 0 0 0-16Z" class="fill"/></svg>',
        user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/></svg>',
        grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg>',
        globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5Z"/></svg>',
        side: '<svg class="side" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>',
        instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" class="fill"/></svg>',
        tiktok: '<svg class="solid" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'
    };
    V.icon = ICON;

    V.waIcon = () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6a9.3 9.3 0 0 0-8 14.1L2.7 21.4l4.8-1.3A9.3 9.3 0 1 0 12 2.6Z"/><path class="wa-glyph" d="M8.4 7.6c.2-.4.4-.4.7-.4h.6c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.7.8c.7 1.3 1.7 2.3 3 3l.8-.7c.2-.2.4-.2.7-.1l1.8.8c.3.1.4.3.4.5v.6c0 .3-.1.5-.4.7-.4.3-1 .5-1.6.5-1.4 0-3.2-.8-4.7-2.3S8 9.9 8 8.5c0-.4.1-.7.4-.9Z"/></svg>';

    // روابط حسابات التواصل: إنستغرام وتيك توك بأيقونتيهما، والباقي بالاسم
    // الأيقونات من مكتبة Simple Icons العامة
    const SOCIAL = [
        { re: /instagram\.com/i, key: "instagram", label: "Instagram" },
        { re: /tiktok\.com/i, key: "tiktok", label: "TikTok" },
        { re: /snapchat\.com/i, key: "snapchat", label: "Snapchat" },
        { re: /(^|\/\/|\.)(x|twitter)\.com/i, key: "x", label: "X" },
        { re: /facebook\.com/i, key: "facebook", label: "Facebook" },
        { re: /youtube\.com|youtu\.be/i, key: "youtube", label: "YouTube" }
    ];
    V.socials = function (v, cls = "soc") {
        return (v.cfg.texts.socials || []).filter((s) => s.name && ATHR.isUrl(s.url)).map((s) => {
            const known = SOCIAL.find((x) => x.re.test(s.url));
            if (!known) return `<a class="${cls}" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`;
            const label = s.name || known.label;
            return `<a class="${cls} ${cls}-icon" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(label)}" title="${esc(label)}"><span class="soc-ico" style="--icon:url('https://cdn.jsdelivr.net/npm/simple-icons@13/icons/${known.key}.svg')" aria-hidden="true"></span></a>`;
        }).join("");
    };

    V.colorOf = (v, p) => v.colorById.get(p.color_id) || null;
    V.label = (v, p) => ATHR.displayLabel(p, v.cfg);
    V.pname = (p) => L(p, "name");
    V.cname = (c) => L(c, "name");
    V.img = (p) => p.thumb_url || ATHR.thumb(p.image_url, "s");
    V.big = (p) => ATHR.thumb(p.image_url, "m");
    V.catOf = (v, p) => v.catById.get(p.category_id) || null;
    V.description = (v, p) => {
        const own = String(L(p, "description") || "").trim();
        if (own) return own;
        const cat = V.catOf(v, p);
        return cat ? String(L(cat, "description") || "").trim() : "";
    };
    V.countryName = (c) => L(c, "name");

    // قائمة البطاقات: لون واحد فقط من كل تصميم
    V.listings = function (v, list) {
        const seen = new Set();
        const out = [];
        list.forEach((p) => {
            const g = v.groups.get(p.id);
            if (g) {
                if (seen.has(g)) return;
                seen.add(g);
                const firstAvailable = g.find((x) => x.is_available !== false && list.includes(x)) || p;
                out.push(firstAvailable);
                return;
            }
            out.push(p);
        });
        return out;
    };

    V.sortList = function (list, sort) {
        const out = list.slice();
        if (sort === "asc") out.sort((a, b) => a.price - b.price);
        if (sort === "desc") out.sort((a, b) => b.price - a.price);
        return out;
    };

    V.reviewStats = function (list) {
        if (!list || !list.length) return null;
        const avg = list.reduce((s, r) => s + Number(r.rating || 0), 0) / list.length;
        return { avg: Math.round(avg * 10) / 10, count: list.length };
    };

    V.stars = function (rating, cls = "") {
        const r = Math.max(0, Math.min(5, Number(rating) || 0));
        const full = Math.round(r);
        return `<span class="stars ${cls}" role="img" aria-label="${esc(t("{r} من 5", { r }))}">${"★".repeat(full)}<span class="off">${"★".repeat(5 - full)}</span></span>`;
    };

    V.reviewCount = (n) => (ATHR.isEn()
        ? (n === 1 ? "1 review" : `${n} reviews`)
        : (n === 1 ? "تقييم واحد" : n === 2 ? "تقييمان" : `${n} تقييمات`));

    // =====================================================
    // PRICE / COLOR / CARD
    // =====================================================

    V.priceHTML = function (v, p, { big = false } = {}) {
        const old = Number(p.old_price) > Number(p.price);
        const save = old ? Number(p.old_price) - Number(p.price) : 0;
        return `<div class="price${big ? " big" : ""}">
            <b>${local(v, p.price)}</b>
            ${old ? `<s>${local(v, p.old_price)}</s>` : ""}
            ${old && big ? `<span class="save">${esc(t("وفّر {amount}", { amount: local(v, save) }))}</span>` : ""}
            ${isBase(v) ? "" : `<small class="base-price">${money(v, p.price)}</small>`}
        </div>`;
    };

    V.dot = function (color) {
        const hex = color && /^#[0-9a-f]{6}$/i.test(color.hex || "") ? color.hex : "#cccccc";
        return `<span class="dot" style="background:${hex}"></span>`;
    };

    V.colorTag = function (v, p) {
        const c = V.colorOf(v, p);
        return c ? `<span class="color-tag">${V.dot(c)}${esc(L(c, "name"))}</span>` : "";
    };

    // دوائر الألوان داخل البطاقة (تبدّل الصورة والزر)
    V.cardSwatches = function (v, p) {
        const g = v.groups.get(p.id);
        if (!g) return V.colorTag(v, p);
        return `<div class="swatches" role="group" aria-label="${esc(t("الألوان"))}">
            ${g.map((x) => {
                const c = V.colorOf(v, x);
                return `<button type="button" class="sw${x.id === p.id ? " on" : ""}" data-swap="${esc(x.id)}" aria-pressed="${x.id === p.id}" aria-label="${esc(c ? L(c, "name") : "")}"${x.is_available === false ? ' data-out="1"' : ""}>${V.dot(c)}</button>`;
            }).join("")}
            <span class="sw-name">${esc(L(V.colorOf(v, p) || {}, "name"))}</span>
        </div>`;
    };

    V.maxQty = (v) => Math.max(1, Math.min(99, Number(v.cfg.order.max_qty) || 10));

    V.cardAction = function (v, p) {
        if (p.is_available === false) {
            return `<button class="btn btn-ghost" type="button" disabled>${esc(ct(v, "texts.sold_out"))}</button>`;
        }
        const qty = v.cartQty(p.id);
        if (qty > 0) {
            return `<div class="stepper" role="group" aria-label="${esc(t("الكمية في السلة"))}">
                <button type="button" data-inc="${esc(p.id)}" aria-label="${esc(t("زيادة"))}"${qty >= V.maxQty(v) ? " disabled" : ""}>+</button>
                <output aria-live="polite">${qty}</output>
                <button type="button" data-dec="${esc(p.id)}" aria-label="${esc(t("إنقاص"))}">−</button>
            </div>`;
        }
        return `<button class="btn btn-primary" type="button" data-add="${esc(p.id)}">${esc(ct(v, "texts.add_to_cart"))}</button>`;
    };

    V.card = function (v, p, { eager = false, high = false } = {}) {
        const out = p.is_available === false;
        const sale = !out && Number(p.old_price) > Number(p.price);
        const pct = sale ? Math.round((1 - p.price / p.old_price) * 100) : 0;
        const url = ATHR.url.product(p);
        const stats = V.reviewStats(v.reviewsByProduct.get(p.id));
        let badge = "";
        if (out) badge = `<span class="badge out">${esc(ct(v, "texts.sold_out"))}</span>`;
        else if (sale) badge = `<span class="badge sale">${esc(t("خصم {pct}%", { pct }))}</span>`;
        else if (p.is_best_seller) badge = `<span class="badge hot">${esc(ATHR.isEn() ? "Best seller" : ct(v, "sales.best_title") || t("الأكثر طلباً"))}</span>`;
        const src = V.img(p);
        return `<article class="card${out ? " soldout" : ""}" data-card="${esc(p.id)}">
            <a class="card-img" href="${url}" tabindex="-1" aria-hidden="true">
                ${src ? `<img src="${esc(src)}" alt="" width="400" height="500"${eager ? "" : ' loading="lazy"'}${high ? ' fetchpriority="high"' : ""} decoding="async">` : ""}
                ${badge}
            </a>
            <div class="card-body">
                <a class="card-name" href="${url}">${esc(V.pname(p))}</a>
                ${stats ? `<span class="card-rate">${V.stars(stats.avg, "sm")}<small>(${stats.count})</small></span>` : ""}
                ${V.cardSwatches(v, p)}
                ${V.priceHTML(v, p)}
            </div>
            <div class="card-action" data-action-for="${esc(p.id)}">${V.cardAction(v, p)}</div>
        </article>`;
    };

    V.grid = function (v, list, { eagerCount = 4 } = {}) {
        if (!list.length) return "";
        const one = Number(v.cfg.theme.grid_mobile) === 1;
        return `<div class="grid${one ? " one" : ""}">${list.map((p, i) => V.card(v, p, { eager: i < eagerCount, high: i < 2 })).join("")}</div>`;
    };

    V.rail = function (v, { id, title, link, items, cards }) {
        const inner = cards || (items || []).map((p) => V.card(v, p)).join("");
        if (!inner) return "";
        return `<section class="section" id="${id}" aria-labelledby="${id}-t">
            <div class="wrap">
                <div class="section-head">
                    <h2 id="${id}-t">${esc(title)}</h2>
                    ${link ? `<a class="more" href="${link.href}">${esc(link.text)}</a>` : ""}
                </div>
                <div class="rail">${inner}</div>
            </div>
        </section>`;
    };

    // =====================================================
    // BUNDLES (الأطقم)
    // =====================================================

    V.validBundles = function (v) {
        return (v.cfg.sales.bundles || []).filter((b) => {
            if (!b.enabled || !b.a || !b.b || b.a === b.b) return false;
            const a = v.byId.get(b.a);
            const bb = v.byId.get(b.b);
            return a && bb && a.is_available !== false && bb.is_available !== false;
        });
    };

    const bundlePrice = (a, b, pct) => Math.round((Number(a.price) + Number(b.price) * (1 - pct / 100)) * 1000) / 1000;

    V.bundleCard = function (v, b) {
        const a = v.byId.get(b.a);
        const other = v.byId.get(b.b);
        const pct = Math.max(1, Math.min(90, Number(b.pct) || 0));
        const full = Number(a.price) + Number(other.price);
        return `<article class="set-card">
            <a class="set-imgs" href="${ATHR.url.product(a)}" aria-label="${esc(V.label(v, a))}">
                <span>${V.img(a) ? `<img src="${esc(V.img(a))}" alt="" loading="lazy" decoding="async" width="300" height="375">` : ""}</span>
                <i aria-hidden="true">+</i>
                <span>${V.img(other) ? `<img src="${esc(V.img(other))}" alt="" loading="lazy" decoding="async" width="300" height="375">` : ""}</span>
            </a>
            <div class="set-body">
                <b class="set-name">${esc(V.pname(a))} + ${esc(V.pname(other))}</b>
                <div class="price"><b>${local(v, bundlePrice(a, other, pct))}</b><s>${local(v, full)}</s></div>
                <span class="set-save">${esc(t("{name} بخصم {pct}%", { name: V.pname(other), pct }))}</span>
            </div>
            <button class="btn btn-primary btn-sm" type="button" data-add-bundle="${esc(b.a)}|${esc(b.b)}">${esc(t("أضف الطقم"))}</button>
        </article>`;
    };

    // طقم واحد لكل تصميم (مثلاً: كوب ريال مدريد بلونيه + المحفظة = طقم واحد)
    V.setCards = function (v, max = 12) {
        const seen = new Set();
        const out = [];
        V.validBundles(v).forEach((b) => {
            const g = v.groups.get(b.a);
            const key = `${g ? g[0].id : b.a}|${b.b}`;
            if (seen.has(key)) return;
            seen.add(key);
            out.push(b);
        });
        return out.slice(0, max).map((b) => V.bundleCard(v, b)).join("");
    };

    // عروض الطقم في صفحة المنتج
    V.bundleOffers = function (v, p) {
        return V.validBundles(v).filter((b) => b.a === p.id || b.b === p.id).map((b) => {
            const a = v.byId.get(b.a);
            const other = v.byId.get(b.b);
            const show = b.a === p.id ? other : a;
            const pct = Number(b.pct) || 0;
            const full = Number(a.price) + Number(other.price);
            const text = b.a === p.id
                ? t("أكمل الطقم: «{name}» بخصم {pct}%", { name: V.label(v, other), pct })
                : t("اشترِ «{name}» واحصل على هذا المنتج بخصم {pct}%", { name: V.label(v, a), pct });
            return `<div class="offer">
                <a href="${ATHR.url.product(show)}">${V.img(show) ? `<img src="${esc(V.img(show))}" alt="" loading="lazy" width="104" height="130">` : ""}</a>
                <div>
                    <strong>${esc(text)}</strong>
                    <span class="price"><b>${esc(t("الطقم {price}", { price: local(v, bundlePrice(a, other, pct)) }))}</b><s>${local(v, full)}</s></span>
                </div>
                <button class="btn btn-primary btn-sm" type="button" data-add-bundle="${esc(b.a)}|${esc(b.b)}">${esc(t("أضف الطقم"))}</button>
            </div>`;
        }).join("");
    };

    V.volumeTeaser = function (v) {
        const tiers = ATHR.volumeTiers(v.cfg);
        if (!tiers.length) return "";
        const parts = tiers.map((x, i) => t(i === tiers.length - 1 ? "{pieces} أو أكثر خصم {pct}%" : "{pieces} خصم {pct}%", { pieces: ATHR.piecesText(x.min), pct: x.pct }));
        return `<div class="volume">${ICON.tag}<span><b>${esc(t("وفّر أكثر كلما زادت القطع:"))}</b> ${esc(parts.join(sep()))}. ${esc(t("يُطبَّق تلقائيًا في السلة."))}</span></div>`;
    };

    // =====================================================
    // DELIVERY / PAYMENT TEXT
    // =====================================================

    V.deliveryPriceLabel = function (v, d) {
        if (d.pricing === "per_kg") return t("{price} لكل كيلو", { price: money(v, d.price) });
        return Number(d.price) > 0 ? money(v, d.price) : t("مجاني");
    };

    V.countriesText = (list) => list.map((c) => `${c.flag} ${V.countryName(c)}`).join(sep());

    V.flagsFor = (v, item) => ATHR.countries(v.cfg).filter((c) => c.enabled && ATHR.inCountries(item, c.code));

    V.paymentGroups = function (v) {
        const groups = new Map();
        ATHR.countries(v.cfg).filter((c) => c.enabled).forEach((c) => {
            const names = ATHR.paymentsFor(v.cfg, c.code).map((p) => L(p, "name"));
            if (!names.length) return;
            const key = names.join(sep());
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(c);
        });
        return Array.from(groups.entries()).map(([names, countries]) => ({ names, countries }));
    };

    V.freeLine = function (v) {
        const cfg = v.cfg;
        if (!cfg.order.free_enabled || !(Number(cfg.order.free_min) > 0)) return "";
        const enabled = ATHR.countries(cfg).filter((c) => c.enabled);
        const list = enabled.filter((c) => ATHR.freeAppliesTo(cfg, c.code));
        const where = list.length === 1 && list[0].code === "OM" ? t("داخل عُمان") : list.length < enabled.length ? t("إلى {countries}", { countries: V.countriesText(list) }) : "";
        return t("التوصيل مجاني {where} للطلبات من {free} أو أكثر.", { where, free: money(v, cfg.order.free_min) }).replace(/\s+/g, " ");
    };

    V.deliveryLines = function (v) {
        const enabledCount = ATHR.countries(v.cfg).filter((c) => c.enabled).length;
        const lines = (v.cfg.order.delivery || []).filter((d) => d.enabled).map((d) => {
            const list = V.flagsFor(v, d);
            const where = list.length && list.length < enabledCount ? ` — ${list.map((c) => c.flag).join(" ")}` : "";
            return `${L(d, "name")}: ${V.deliveryPriceLabel(v, d)}${d.duration ? ` (${ATHR.duration(d.duration)})` : ""}${where}`;
        });
        const free = V.freeLine(v);
        if (free) lines.push(free);
        const groups = V.paymentGroups(v);
        if (groups.length === 1) lines.push(t("طرق الدفع: {names}.", { names: groups[0].names }));
        else groups.forEach((g) => lines.push(t("{flags} الدفع: {names}.", { flags: g.countries.map((c) => c.flag).join(" "), names: g.names })));
        return lines;
    };

    // صندوق «التوصيل والدفع» لدولة الزائر
    V.deliveryBox = function (v, p) {
        const cfg = v.cfg;
        const c = ATHR.country(cfg, v.country);
        const methods = ATHR.deliveriesFor(cfg, c.code);
        const pays = ATHR.paymentsFor(cfg, c.code);
        const multi = ATHR.countries(cfg).filter((x) => x.enabled).length > 1;
        const free = cfg.order.free_enabled && Number(cfg.order.free_min) > 0 && ATHR.freeAppliesTo(cfg, c.code);
        const lines = methods.map((d) => {
            let price = V.deliveryPriceLabel(v, d);
            if (d.pricing === "per_kg" && p) {
                const s = ATHR.shippingFor(d, [{ product: p, qty: 1 }], cfg);
                price = t("{price} لكل كيلو (هذا المنتج {cost})", { price: money(v, d.price), cost: money(v, s.cost) });
            }
            return `<span>${esc(L(d, "name"))}: <b>${esc(price)}</b>${d.duration ? ` · ${esc(ATHR.duration(d.duration))}` : ""}</span>`;
        });
        return `<div class="info-box">
            <div class="info-row">${ICON.truck}<div>
                <b>${esc(t("التوصيل إلى {flag} {country}", { flag: c.flag, country: V.countryName(c) }))}</b>
                ${lines.length ? lines.join("") : `<span>${esc(t("غير متاح حاليًا، تواصل معنا عبر واتساب."))}</span>`}
                ${free ? `<span class="ok">${esc(t("مجاني للطلبات من {free} أو أكثر", { free: money(v, cfg.order.free_min) }))}</span>` : ""}
            </div></div>
            ${pays.length ? `<div class="info-row">${ICON.card}<div><b>${esc(t("الدفع"))}</b><span>${esc(pays.map((x) => L(x, "name")).join(sep()))}</span></div></div>` : ""}
            ${multi ? `<button class="link-btn" type="button" data-open-currency>${esc(t("لست في {country}؟ غيّر الدولة", { country: V.countryName(c) }))}</button>` : ""}
        </div>`;
    };

    V.trust = function (v) {
        const cfg = v.cfg;
        if (!cfg.sales.trust_show) return "";
        const pays = ATHR.paymentsFor(cfg, v.country);
        const items = [];
        (ct(v, "sales.trust_custom") || []).filter(Boolean).slice(0, 3).forEach((x) => items.push(fill(v, x)));
        if (pays.some((p) => p.type === "cod")) items.push(t("الدفع عند الاستلام"));
        if (pays.some((p) => p.type === "bank")) items.push(pays.some((p) => p.type === "bank" && /دولي/.test(p.name)) ? t("تحويل بنكي دولي") : t("تحويل بنكي مباشر"));
        if (pays.some((p) => p.type === "online")) items.push(t("دفع إلكتروني آمن"));
        const gulf = (cfg.order.delivery || []).some((d) => d.enabled && Array.isArray(d.countries) && d.countries.some((x) => x !== "OM"));
        items.push(gulf ? t("توصيل لكل دول الخليج") : t("توصيل داخل سلطنة عُمان"));
        if (ATHR.isValidWhatsapp(cfg.order.whatsapp)) items.push(t("تواصل مباشر عبر واتساب"));
        return `<ul class="trust">${items.map((x) => `<li>${ICON.check}${esc(x)}</li>`).join("")}</ul>`;
    };

    // =====================================================
    // HOME
    // =====================================================

    V.ad = function (v) {
        const ad = v.cfg.ad;
        if (!ad.show) return "";
        const raw = ATHR.isSafeLink(ad.link) && ad.link ? ad.link : "";
        const link = raw && !/^https?:/i.test(raw) && !raw.startsWith("#") ? ATHR.base() + raw.replace(/^\//, "") : raw;
        const ext = /^https?:/i.test(link);
        const open = (inner, cls) => link
            ? `<a class="${cls}" href="${esc(link)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${inner}</a>`
            : `<div class="${cls}">${inner}</div>`;
        if (ad.type === "image" && ad.image_url) {
            return `<section class="ad wrap" id="ad">${open(`<img src="${esc(V.asset(ad.image_url))}" alt="${esc(ct(v, "ad.image_alt"))}" fetchpriority="high">`, "ad-media")}</section>`;
        }
        if (ad.type === "video" && ad.video_url) {
            return `<section class="ad wrap" id="ad">${open(`<video muted loop playsinline autoplay preload="none" data-deferred-src="${esc(ad.video_url)}" aria-label="${esc(ct(v, "ad.video_alt"))}"></video>`, "ad-media")}</section>`;
        }
        const title = ct(v, "ad.title");
        const text = ct(v, "ad.text");
        const button = ct(v, "ad.button");
        if (ad.type === "text" && (title || text)) {
            const bg = /^#[0-9a-f]{6}$/i.test(ad.bg) ? ad.bg : v.cfg.theme.primary;
            const btnHref = link || "#catalog";
            return `<section class="ad wrap" id="ad"><div class="ad-text" style="background:${esc(bg)}">
                ${title ? `<h2>${esc(fill(v, title))}</h2>` : ""}
                ${text ? `<p>${esc(fill(v, text))}</p>` : ""}
                ${button ? `<a class="btn" href="${esc(btnHref)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${esc(fill(v, button))}</a>` : ""}
            </div></section>`;
        }
        return "";
    };

    V.hero = function (v) {
        const cfg = v.cfg;
        if (!cfg.theme.hero_show) return `<h1 class="sr-only">${esc(ATHR.storeName(cfg))}</h1>`;
        const features = (ct(v, "texts.hero_features") || []).filter(Boolean).slice(0, 4).map((f) => `<li>${ICON.check}${esc(fill(v, f))}</li>`).join("");
        const image = cfg.theme.hero_image && (ATHR.isUrl(cfg.theme.hero_image) || !cfg.theme.hero_image.includes(":")) ? cfg.theme.hero_image : "";
        const text = ct(v, "texts.hero_text");
        return `<section class="hero${cfg.theme.hero_pattern ? " pattern" : ""}${image ? " has-image" : ""}">
            ${image ? `<div class="hero-bg"><img data-deferred-src="${esc(V.asset(image))}" alt=""></div>` : ""}
            <div class="wrap hero-inner">
                <h1>${esc(fill(v, ct(v, "texts.hero_title")))}</h1>
                ${text ? `<p>${esc(fill(v, text))}</p>` : ""}
                ${features ? `<ul class="hero-features">${features}</ul>` : ""}
                ${image ? "" : V.heroShots(v)}
            </div>
        </section>`;
    };

    // صور منتجات صغيرة داخل الواجهة: مخفية في القالب الكلاسيكي، وتظهر بأشكال مختلفة في بعض القوالب
    V.heroShots = function (v) {
        const list = V.listings(v, v.products.filter((p) => p.is_available !== false && V.img(p)));
        const best = list.filter((p) => p.is_best_seller);
        const pick = (best.length >= 3 ? best : list).slice(0, 3);
        if (pick.length < 3) return "";
        return `<div class="hero-shots" aria-hidden="true">${pick.map((p, i) => `<span class="hs hs${i + 1}"><img src="${esc(V.img(p))}" alt="" loading="lazy" decoding="async" width="200" height="250"></span>`).join("")}</div>`;
    };

    // صورة القسم: صورته إن وُجدت، وإلا صورة أول منتج فيه
    V.categoryImage = function (v, c) {
        if (c.image_url) return ATHR.thumb(c.image_url, "s");
        const p = v.products.find((x) => x.category_id === c.id && V.img(x));
        return p ? V.img(p) : "";
    };

    V.tiles = function (v, current) {
        const cats = v.categories.filter((c) => v.counts.get(c.id));
        if (!cats.length) return "";
        return `<nav class="tiles wrap" aria-label="${esc(t("الأقسام"))}">
            ${cats.map((c) => {
                const img = V.categoryImage(v, c);
                return `<a class="tile${current && current.id === c.id ? " on" : ""}" href="${ATHR.url.category(c)}"${current && current.id === c.id ? ' aria-current="page"' : ""}>
                    <span class="tile-img">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" width="180" height="236">` : ""}</span>
                    <span class="tile-name">${esc(V.cname(c))}</span>
                </a>`;
            }).join("")}
        </nav>`;
    };

    V.sortSelect = function (v, sort) {
        if (v.cfg.theme.show_sort === false) return "";
        return `<label class="sr-only" for="sortSelect">${esc(t("ترتيب حسب السعر"))}</label>
            <select class="select" id="sortSelect">
                <option value="default"${sort === "default" || !sort ? " selected" : ""}>${esc(t("الترتيب الافتراضي"))}</option>
                <option value="asc"${sort === "asc" ? " selected" : ""}>${esc(t("السعر: الأقل أولاً"))}</option>
                <option value="desc"${sort === "desc" ? " selected" : ""}>${esc(t("السعر: الأعلى أولاً"))}</option>
            </select>`;
    };

    V.curNote = function (v) {
        if (isBase(v)) return "";
        const c = ATHR.country(v.cfg, v.country);
        return `<p class="cur-note">${esc(t("{flag} الأسعار ب{currency} تقريبية، ويُحسب الطلب بالريال العماني.", { flag: c.flag, currency: L(c, "currency_def") }))} <button class="link-btn" type="button" data-open-currency>${esc(t("تغيير"))}</button></p>`;
    };

    V.bestSellers = function (v) {
        const flagged = V.listings(v, v.products.filter((p) => p.is_best_seller && p.is_available !== false));
        return flagged.length >= 2 ? flagged.slice(0, 12) : [];
    };

    V.newArrivals = function (v) {
        let list = V.listings(v, v.products.filter((p) => p.is_new_arrival && p.is_available !== false));
        if (list.length < 2) {
            list = V.listings(v, v.products.filter((p) => p.is_available !== false)
                .slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))));
        }
        return list.slice(0, 10);
    };

    V.storeReviews = function (v) {
        const c = v.cfg.contact;
        const own = (c.reviews || []).filter((r) => r.text).map((r) => ({ ...r, rating: r.stars, curated: true }));
        const customer = v.reviews.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))).slice(0, 10);
        const all = own.concat(customer);
        if (!all.length) return "";
        return `<section class="section reviews" id="reviews" aria-labelledby="reviews-t">
            <div class="wrap">
                <div class="section-head"><h2 id="reviews-t">${esc(ct(v, "contact.reviews_title"))}</h2></div>
                <div class="rail">${all.map((r) => V.reviewCard(v, r, { withProduct: true })).join("")}</div>
            </div>
        </section>`;
    };

    V.reviewCard = function (v, r, { withProduct = false } = {}) {
        const product = withProduct && r.product_id ? v.byId.get(r.product_id) : null;
        return `<figure class="review">
            ${V.stars(r.rating || r.stars || 5)}
            <blockquote>${esc(r.text)}</blockquote>
            ${(r.images || []).length || r.video ? `<div class="review-media">
                ${(r.images || []).slice(0, 3).map((src) => `<img src="${esc(src)}" alt="${esc(t("صورة من العميل"))}" loading="lazy">`).join("")}
                ${r.video ? `<video src="${esc(r.video)}" controls playsinline preload="metadata"></video>` : ""}
            </div>` : ""}
            <figcaption>${r.name ? esc(r.name) : esc(t("عميل"))}${product ? ` · <a href="${ATHR.url.product(product)}">${esc(V.pname(product))}</a>` : ""}</figcaption>
        </figure>`;
    };

    // =====================================================
    // GIFT (بنر الهدية، زر الهدية المميز، وبطاقة الإهداء)
    // =====================================================

    V.giftSub = (v) => (v.cfg.sales.gift_card !== false ? ct(v, "gift.cta_sub") || t("بطاقة إهداء رقمية باسمك، وبدون ذكر السعر") : t("نوصلها باسمك، وبدون ذكر السعر"));

    V.giftCta = function (v, { attrs = "", href = "", title, sub = V.giftSub(v) }) {
        const inner = `<span class="gcta-ico">${V.icon.gift}</span><span class="gcta-txt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="gcta-go">${V.icon.side}</span>`;
        return href ? `<a class="gift-cta" href="${href}" ${attrs}>${inner}</a>` : `<button class="gift-cta" type="button" ${attrs}>${inner}</button>`;
    };

    V.giftBanner = function (v) {
        const s = v.cfg.sales;
        if (!s.gift_enabled || s.gift_banner === false) return "";
        return `<section class="wrap gift-promo" aria-label="${esc(t("أرسل هدية"))}">
            <a class="gp" href="${ATHR.url.page("checkout", "gift=1")}" data-gift-start>
                <span class="gp-art" aria-hidden="true">${V.icon.gift}</span>
                <span class="gp-text"><b>${esc(ct(v, "gift.banner_title") || t("أرسلها هدية لمن تحب"))}</b><small>${esc(ct(v, "gift.banner_text") || (s.gift_card !== false ? t("نوصلها باسمك مع بطاقة إهداء رقمية فيها رسالتك، وبدون ذكر السعر.") : t("نوصلها باسمك مع رسالتك، وبدون ذكر السعر.")))}</small></span>
                <span class="gp-go">${esc(ct(v, "gift.banner_button") || t("ابدأ"))}${V.icon.side}</span>
            </a>
        </section>`;
    };

    // بطاقة الإهداء: صندوق هدية فاخر يتفتح، ثم بطاقة ورقية بإطار ذهبي
    // ألوان وخط بطاقة الإهداء من لوحة التحكم
    V.giftStyle = function (v, gender = "") {
        const g = v.cfg.gift || {};
        const c = ATHR.giftColors(v.cfg, gender);
        const font = ATHR.FONT_PARAMS[g.font] ? `"${g.font}"` : g.font === "system" ? "system-ui" : `"Aref Ruqaa"`;
        return `--g-bg:${c.bg};--g-box:${c.box};--g-ribbon:${c.ribbon};--g-paper:${c.paper};--g-ink:${c.ink};--g-accent:${c.accent};--g-font:${font}`;
    };

    // ألوان الورق المتطاير: ذهبي ملوّن عادةً، وأزرق للولد، ووردي للبنت
    const CONFETTI = { "": [44, 350, 330, 160, 200, 30], boy: [208, 196, 220, 188, 214, 202], girl: [330, 340, 320, 350, 325, 345] };

    // بطاقة الإهداء: صندوق فاخر يتفتح، ثم بطاقة ورقية بإطار ذهبي
    V.giftPage = function (v, card) {
        const cfg = v.cfg;
        const g = cfg.gift || {};
        const store = ATHR.storeName(cfg);
        if (!card || !card.to) {
            return `<div class="wrap empty page"><p>${esc(t("رابط بطاقة الإهداء غير صحيح."))}</p><a class="btn btn-primary" href="${ATHR.base()}">${esc(t("العودة للمتجر"))}</a></div>`;
        }
        const vars = { to: card.to, from: card.from || "", store };
        const txt = (key, fallback) => ATHR.giftFill(ct(v, `gift.${key}`) || fallback, vars);
        const o = ATHR.giftOccasion(card.occasion, cfg);
        const logo = V.asset(cfg.logo_url || ATHR.DEFAULTS.logo_url);
        const gender = ATHR.giftGendersOn(cfg) && ATHR.giftFor(card.gender, cfg) ? card.gender : "";
        const hues = CONFETTI[gender];
        const stars = g.stars === false ? "" : Array.from({ length: 16 }, (_, i) => `<i style="--x:${(i * 61) % 100}%;--y:${(i * 37) % 100}%;--d:${(i * 0.37) % 3}s;--s:${0.6 + ((i * 7) % 6) / 10}"></i>`).join("");
        const party = g.confetti !== false;
        const burst = party ? Array.from({ length: 28 }, (_, i) => `<i style="--a:${i * (360 / 28)}deg;--r:${120 + ((i * 47) % 90)}px;--h:${hues[i % 6]};--d:${(i % 4) * 40}ms"></i>`).join("") : "";
        const confetti = party ? Array.from({ length: 30 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--h:${hues[i % 6]};--d:${(i * 131) % 900}ms;--t:${(2 + ((i * 7) % 10) / 8).toFixed(2)}s;--r:${(i % 2 ? 1 : -1) * (200 + ((i * 53) % 360))}deg"></i>`).join("") : "";
        const msg = String(card.msg || "").trim() || txt("empty_msg", t("هدية مختارة لك بكل حب"));
        return `<div class="gift-page${gender ? ` gift-${gender}` : ""}" data-occ="${esc(o.id)}" style="${esc(V.giftStyle(v, gender))}">
            <section class="gx" id="giftStage">
                ${stars ? `<div class="gx-stars" aria-hidden="true">${stars}</div>` : ""}
                <p class="gx-kicker">${esc(txt("kicker", t("هدية خاصة لك")))}</p>
                <h1 class="gx-title">${esc(txt("title", t("{name}، وصلتك هدية!", { name: card.to })))}</h1>
                <button class="gx-box" type="button" data-gift-open aria-label="${esc(txt("button", t("افتح هديتك")))}">
                    <span class="gx-glow" aria-hidden="true"></span>
                    <span class="gx-burst" aria-hidden="true">${burst}</span>
                    <span class="gx-body" aria-hidden="true"></span>
                    <span class="gx-lid" aria-hidden="true"><span class="gx-bow"><i></i><i></i><b></b></span></span>
                    ${g.tag === false ? "" : `<span class="gx-tag" aria-hidden="true">${esc(card.to)}</span>`}
                </button>
                <button class="gx-cta" type="button" data-gift-open>✨ ${esc(txt("button", t("افتح هديتك")))}</button>
                <p class="gx-hint">${esc(txt("hint", t("اضغط على الصندوق لتفتحها")))}</p>
            </section>
            <section class="gx gx-open" id="giftCard" hidden>
                ${stars ? `<div class="gx-stars" aria-hidden="true">${stars}</div>` : ""}
                ${confetti ? `<div class="confetti" aria-hidden="true">${confetti}</div>` : ""}
                <article class="gcard">
                    <span class="gc-corner tl" aria-hidden="true"></span><span class="gc-corner tr" aria-hidden="true"></span><span class="gc-corner bl" aria-hidden="true"></span><span class="gc-corner br" aria-hidden="true"></span>
                    <div class="gc-seal" aria-hidden="true">${esc(o.emoji)}</div>
                    <p class="gc-to">${esc(t("إلى"))}</p>
                    <h2 class="gc-name">${esc(card.to)}</h2>
                    <p class="gc-occ">${esc(L(o, "title"))}</p>
                    <div class="gc-line" aria-hidden="true"><span>✦</span></div>
                    <blockquote class="gc-msg">${esc(msg)}</blockquote>
                    ${card.from ? `<p class="gc-from"><span>${esc(txt("closing", t("مع خالص المحبة،")))}</span><b>${esc(card.from)}</b></p>` : ""}
                    <div class="gc-foot"><span class="gc-logo"><img src="${esc(logo)}" alt="" width="30" height="30"></span><span>${esc(txt("footer", t("هديتك في الطريق إليك من {store} 🎁", { store })))}</span></div>
                </article>
                <div class="gx-actions">
                    <button class="gx-again" type="button" data-gift-replay>↻ ${esc(t("افتحها مرة ثانية"))}</button>
                    <a class="gx-shop" href="${ATHR.base()}">${esc(t("تسوّق من {store}", { store }))}</a>
                </div>
            </section>
        </div>`;
    };

    V.home = function (v, { sort = "default" } = {}) {
        const all = V.sortList(V.listings(v, v.products), sort);
        const best = V.bestSellers(v);
        const sets = V.setCards(v);
        const fresh = V.newArrivals(v);
        const about = ct(v, "texts.about");
        const intro = about ? `<p class="intro">${esc(fill(v, about))}</p>` : "";
        return `${V.ad(v)}
            ${V.hero(v)}
            ${V.tiles(v)}
            ${V.giftBanner(v)}
            ${best.length ? V.rail(v, { id: "best", title: ct(v, "sales.best_title") || t("الأكثر طلباً"), items: best }) : ""}
            ${sets ? V.rail(v, { id: "sets", title: ct(v, "sales.sets_title") || t("أطقم بسعر أقل"), cards: sets }) : ""}
            <section class="catalog section" id="catalog" aria-labelledby="catalog-t">
                <div class="wrap">
                    <div class="section-head">
                        <h2 id="catalog-t">${esc(t("كل المنتجات"))} <small class="muted">(${all.length})</small></h2>
                        ${V.sortSelect(v, sort)}
                    </div>
                    ${V.curNote(v)}
                    <div id="gridBox">${V.grid(v, all)}</div>
                </div>
            </section>
            ${fresh.length && !best.length ? V.rail(v, { id: "new", title: ct(v, "sales.new_title") || t("وصل حديثاً"), items: fresh }) : ""}
            ${V.storeReviews(v)}
            <section class="wrap seo-intro">${intro}</section>`;
    };

    // =====================================================
    // CATEGORY / SEARCH
    // =====================================================

    V.crumbs = function (items) {
        return `<nav class="crumbs wrap" aria-label="${esc(t("مسار التصفح"))}">
            ${items.map((it, i) => (it.href && i < items.length - 1
                ? `<a href="${it.href}">${esc(it.name)}</a>`
                : `<span aria-current="page">${esc(it.name)}</span>`)).join('<span class="sep" aria-hidden="true">›</span>')}
        </nav>`;
    };

    V.category = function (v, cat, { sort = "default" } = {}) {
        const list = V.sortList(V.listings(v, v.products.filter((p) => p.category_id === cat.id)), sort);
        const desc = L(cat, "description");
        return `${V.crumbs([{ name: t("الرئيسية"), href: ATHR.url.home() }, { name: V.cname(cat) }])}
            ${V.tiles(v, cat)}
            <section class="catalog section" id="catalog">
                <div class="wrap">
                    <div class="section-head">
                        <h1>${esc(V.cname(cat))} <small class="muted">(${list.length})</small></h1>
                        ${V.sortSelect(v, sort)}
                    </div>
                    ${desc ? `<p class="cat-desc">${esc(desc)}</p>` : ""}
                    ${V.curNote(v)}
                    <div id="gridBox">${list.length ? V.grid(v, list) : `<div class="empty"><p>${esc(t("لا توجد منتجات في هذا القسم حاليًا."))}</p><a class="btn btn-primary" href="${ATHR.url.home()}">${esc(t("تصفّح كل المنتجات"))}</a></div>`}</div>
                </div>
            </section>`;
    };

    V.searchResults = function (v, q) {
        const term = ATHR.normName(q);
        if (!term) return [];
        const words = term.split(" ").filter(Boolean);
        return V.listings(v, v.products.filter((p) => {
            const cat = V.catOf(v, p);
            const color = V.colorOf(v, p);
            const hay = ATHR.normName([p.name, p.name_en, p.description, p.description_en, cat && cat.name, cat && cat.name_en, color && color.name, color && color.name_en].filter(Boolean).join(" "));
            return words.every((w) => hay.includes(w));
        }));
    };

    V.search = function (v, q, { sort = "default" } = {}) {
        const list = V.sortList(V.searchResults(v, q), sort);
        const has = String(q || "").trim();
        return `<section class="catalog section" id="catalog">
            <div class="wrap">
                <div class="section-head">
                    <h1>${has ? `${esc(t("نتائج «{q}»", { q }))} <small class="muted">(${list.length})</small>` : esc(t("ابحث في المنتجات"))}</h1>
                    ${list.length ? V.sortSelect(v, sort) : ""}
                </div>
                ${V.curNote(v)}
                <div id="gridBox">${list.length ? V.grid(v, list) : `<div class="empty"><p>${esc(has ? t("لا توجد نتائج. جرّب اسم فريق أو شخصية أو قسم.") : t("اكتب اسم فريق أو شخصية أو جامعة في خانة البحث بالأعلى."))}</p></div>`}</div>
            </div>
        </section>
        ${list.length ? "" : V.tiles(v)}`;
    };

    // =====================================================
    // PRODUCT PAGE
    // =====================================================

    V.relatedFor = function (v, ids, count) {
        const set = new Set();
        ids.forEach((id) => {
            set.add(id);
            const g = v.groups.get(id);
            if (g) g.forEach((x) => set.add(x.id));
        });
        const sources = ids.map((id) => v.byId.get(id)).filter(Boolean);
        if (!sources.length) return [];
        const partners = new Set();
        V.validBundles(v).forEach((b) => {
            if (set.has(b.a)) partners.add(b.b);
            if (set.has(b.b)) partners.add(b.a);
        });
        const avg = sources.reduce((s, p) => s + Number(p.price), 0) / sources.length;
        const scored = v.products
            .filter((p) => !set.has(p.id) && p.is_available !== false)
            .map((p) => {
                let score = 0;
                if (partners.has(p.id)) score += 1000;
                if (sources.some((s) => s.category_id && s.category_id === p.category_id)) score += 100;
                if (p.is_best_seller) score += 20;
                if (sources.some((s) => s.color_id && s.color_id === p.color_id)) score += 5;
                score += Math.max(0, 9 - Math.abs(Number(p.price) - avg));
                return { p, score };
            })
            .sort((a, b) => b.score - a.score)
            .map((x) => x.p);
        return V.listings(v, scored).slice(0, count);
    };

    V.variantPicker = function (v, p) {
        const g = v.groups.get(p.id);
        if (!g) return "";
        const current = V.colorOf(v, p);
        return `<div class="variants">
            <span class="variants-label">${esc(t("اللون:"))} <b>${esc(current ? L(current, "name") : "")}</b></span>
            <div class="variant-list">
                ${g.map((x) => {
                    const c = V.colorOf(v, x);
                    const on = x.id === p.id;
                    return `<a class="variant${on ? " on" : ""}${x.is_available === false ? " out" : ""}" href="${ATHR.url.product(x)}" data-replace${on ? ' aria-current="true"' : ""}>
                        ${V.img(x) ? `<img src="${esc(V.img(x))}" alt="" width="56" height="70" loading="lazy">` : ""}
                        <span>${V.dot(c)}${esc(c ? L(c, "name") : "")}</span>
                    </a>`;
                }).join("")}
            </div>
        </div>`;
    };

    V.galleryStage = function (v, p) {
        const label = V.label(v, p);
        return `<div class="stage">${p.image_url ? `<img src="${esc(V.big(p))}" alt="${esc(label)}" fetchpriority="high" width="800" height="1000">` : ""}</div>`;
    };

    V.buyBox = function (v, p) {
        const cfg = v.cfg;
        if (p.is_available === false) {
            return `<div class="out-note" id="buyBox">${esc(ct(v, "texts.sold_out"))}. ${ATHR.isValidWhatsapp(cfg.order.whatsapp) ? esc(t("تواصل معنا لمعرفة موعد توفره.")) : ""}</div>`;
        }
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp) && cfg.sales.wa_quick;
        const buyNow = cfg.sales.buy_now;
        return `<div class="buy" id="buyBox">
            <div class="buy-row">
                <div class="stepper lg" role="group" aria-label="${esc(t("الكمية"))}">
                    <button type="button" data-pdp-step="1" aria-label="${esc(t("زيادة"))}">+</button>
                    <output id="pdpQty" aria-live="polite">1</output>
                    <button type="button" data-pdp-step="-1" aria-label="${esc(t("إنقاص"))}">−</button>
                </div>
                <button class="btn btn-primary" type="button" data-pdp-add="${esc(p.id)}">${esc(ct(v, "texts.add_to_cart"))}</button>
            </div>
            ${buyNow || wa ? `<div class="buy-alt${buyNow && wa ? "" : " single"}">
                ${buyNow ? `<button class="btn btn-ghost" type="button" data-buy-now="${esc(p.id)}">${esc(t("اشترِ الآن"))}</button>` : ""}
                ${wa ? `<button class="btn btn-wa" type="button" data-wa-product="${esc(p.id)}">${V.waIcon()}${esc(t("اطلب عبر واتساب"))}</button>` : ""}
            </div>` : ""}
            ${cfg.sales.gift_enabled && cfg.sales.gift_button ? V.giftCta(v, { attrs: `data-gift-now="${esc(p.id)}"`, title: ct(v, "gift.cta_title") || t("أرسله هدية") }) : ""}
        </div>`;
    };

    V.productReviews = function (v, p) {
        const list = (v.reviewsByProduct.get(p.id) || []).slice()
            .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
        const stats = V.reviewStats(list);
        const writeHref = ATHR.url.page("review", `p=${encodeURIComponent(p.slug || p.id)}`);
        return `<section class="section reviews-block" id="reviews" aria-labelledby="pr-t">
            <div class="section-head"><h2 id="pr-t">${esc(t("تقييمات العملاء"))}</h2></div>
            ${stats ? `<div class="rate-summary"><b>${stats.avg.toFixed(1)}</b>${V.stars(stats.avg)}<span>${esc(V.reviewCount(stats.count))}</span></div>
                <div class="review-list">${list.slice(0, 6).map((r) => V.reviewCard(v, r)).join("")}</div>`
            : `<p class="muted">${esc(t("لا توجد تقييمات لهذا التصميم بعد. اشتريته؟ شاركنا رأيك."))}</p>`}
            <a class="btn btn-ghost btn-sm" href="${writeHref}" rel="nofollow">${esc(t("اكتب تقييمك"))}</a>
        </section>`;
    };

    V.product = function (v, p) {
        const cfg = v.cfg;
        const cat = V.catOf(v, p);
        const stats = V.reviewStats(v.reviewsByProduct.get(p.id));
        const desc = V.description(v, p);
        const related = cfg.sales.related_show ? V.relatedFor(v, [p.id], Number(cfg.sales.related_count) || 4) : [];
        const crumbs = [{ name: t("الرئيسية"), href: ATHR.url.home() }];
        if (cat) crumbs.push({ name: V.cname(cat), href: ATHR.url.category(cat) });
        crumbs.push({ name: V.pname(p) });
        return `${V.crumbs(crumbs)}
            <div class="wrap">
                <div class="pdp">
                    <div class="gallery" id="gallery">${V.galleryStage(v, p)}</div>
                    <div class="pdp-info">
                        <h1>${esc(V.pname(p))}</h1>
                        ${stats ? `<a class="pdp-rate" href="#reviews">${V.stars(stats.avg)}<span>${stats.avg.toFixed(1)} · ${esc(V.reviewCount(stats.count))}</span></a>` : ""}
                        ${V.priceHTML(v, p, { big: true })}
                        ${v.groups.get(p.id) ? V.variantPicker(v, p) : (V.colorOf(v, p) ? `<div class="pdp-color">${esc(t("اللون:"))} ${V.colorTag(v, p)}</div>` : "")}
                        ${V.buyBox(v, p)}
                        ${p.is_available === false ? "" : V.volumeTeaser(v)}
                        ${V.bundleOffers(v, p)}
                        ${V.deliveryBox(v, p)}
                        ${V.trust(v)}
                        ${desc || p.video_url ? `<div class="pdp-details">
                            <h2>${esc(t("تفاصيل المنتج"))}</h2>
                            ${desc ? `<p>${esc(desc)}</p>` : ""}
                            ${p.video_url && ATHR.isUrl(p.video_url) ? `<a class="btn btn-ghost btn-sm" href="${esc(p.video_url)}" target="_blank" rel="noopener">▶ ${esc(t("شاهد فيديو المنتج"))}</a>` : ""}
                        </div>` : ""}
                        <div class="share-row">
                            <button class="link-btn" type="button" data-share-product="${esc(p.id)}">${ICON.share} ${esc(t("شارك المنتج مع صديق"))}</button>
                        </div>
                    </div>
                </div>
                ${V.productReviews(v, p)}
            </div>
            ${related.length ? V.rail(v, { id: "related", title: ct(v, "sales.related_title"), items: related }) : ""}`;
    };

    // =====================================================
    // SHIPPING / POLICY PAGE
    // =====================================================

    V.shipping = function (v) {
        const cfg = v.cfg;
        const enabledCount = ATHR.countries(cfg).filter((c) => c.enabled).length;
        const delivery = (cfg.order.delivery || []).filter((d) => d.enabled);
        const notes = String(ct(v, "contact.policy_notes") || "").split("\n").map((s) => s.trim()).filter(Boolean);
        const free = V.freeLine(v);
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const custom = (ct(v, "sales.trust_custom") || []).filter(Boolean);
        const title = ct(v, "contact.policy_title");
        return `${V.crumbs([{ name: t("الرئيسية"), href: ATHR.url.home() }, { name: title }])}
            <article class="wrap page policy">
                <h1>${esc(title)}</h1>
                <h2>${esc(t("طرق التوصيل وأسعارها"))}</h2>
                ${delivery.map((d) => {
                    const list = V.flagsFor(v, d);
                    const note = L(d, "note");
                    return `<p><b>${esc(L(d, "name"))}</b>: ${esc(V.deliveryPriceLabel(v, d))}${d.duration ? esc(t("، المدة {d}", { d: ATHR.duration(d.duration) })) : ""}${list.length && list.length < enabledCount ? `<br><span class="muted">${esc(t("إلى: {countries}", { countries: V.countriesText(list) }))}</span>` : ""}${note ? `<br><span class="muted">${esc(note)}</span>` : ""}</p>`;
                }).join("")}
                ${free ? `<p>${esc(free)}</p>` : ""}
                <p class="muted">${esc(t("نوصّل لكل ولايات سلطنة عُمان."))}</p>
                <h2>${esc(t("طرق الدفع"))}</h2>
                ${V.paymentGroups(v).map((g) => `<p>${g.countries.length < enabledCount ? `<b>${esc(V.countriesText(g.countries))}:</b> ` : ""}${esc(g.names)}</p>`).join("")}
                ${(cfg.order.payments || []).filter((p) => p.enabled && L(p, "note")).map((p) => `<p class="muted">${esc(L(p, "name"))}: ${esc(fill(v, L(p, "note")))}</p>`).join("")}
                ${custom.length ? `<h2>${esc(t("ضماننا لك"))}</h2>${custom.map((x) => `<p>${esc(fill(v, x))}</p>`).join("")}` : ""}
                <h2>${esc(t("كيف أطلب؟"))}</h2>
                <ol>
                    <li>${esc(t("اختر تصميمك وأضفه للسلة."))}</li>
                    <li>${esc(t("اكتب اسمك ورقمك وعنوانك واختر طريقة التوصيل والدفع، بدون تسجيل حساب."))}</li>
                    <li>${esc(t("أرسل الطلب عبر واتساب بضغطة، ونؤكده ونجهّزه لك."))}</li>
                </ol>
                <h2>${esc(t("العملات"))}</h2>
                <p class="muted">${esc(t("نعرض الأسعار بعملة دولتك تقريبيًا، ويُحسب الطلب بالريال العماني."))}</p>
                ${notes.length ? `<h2>${esc(t("ملاحظات"))}</h2>${notes.map((n) => `<p>${esc(fill(v, n))}</p>`).join("")}` : ""}
                ${wa ? `<p><a class="btn btn-wa" href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(v, ct(v, "contact.wa_float_msg"))))}" target="_blank" rel="noopener">${V.waIcon()}${esc(t("اسألنا عبر واتساب"))}</a></p>` : ""}
            </article>`;
    };

    // =====================================================
    // FOOTER
    // =====================================================

    // تذييل مختصر: نبذة، ثلاث مزايا، أقسام وتوصيل قابلة للفتح، وأيقونات التواصل
    V.footerDelivery = function (v) {
        const cfg = v.cfg;
        const own = String(ct(v, "texts.footer_delivery_text") || "").trim();
        if (own) return own.split("\n").filter(Boolean).map((line) => fill(v, line));
        const lines = (cfg.order.delivery || []).filter((d) => d.enabled)
            .map((d) => `${L(d, "name")} · ${V.deliveryPriceLabel(v, d)}${d.duration ? ` · ${ATHR.duration(d.duration)}` : ""}`);
        const free = V.freeLine(v);
        if (free) lines.push(free);
        V.paymentGroups(v).forEach((g, i, all) => {
            lines.push(all.length === 1
                ? t("الدفع: {names}", { names: g.names })
                : t("الدفع في {countries}: {names}", { countries: g.countries.map((c) => L(c, "name")).join(sep()), names: g.names }));
        });
        return lines;
    };

    V.footer = function (v) {
        const cfg = v.cfg;
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const cats = v.categories.filter((c) => v.counts.get(c.id));
        const about = ct(v, "texts.about");
        const enabled = ATHR.countries(cfg).filter((c) => c.enabled);
        const gulf = enabled.some((c) => c.code !== ATHR.BASE_COUNTRY);
        const free = cfg.order.free_enabled && Number(cfg.order.free_min) > 0;
        const cod = (cfg.order.payments || []).some((p) => p.enabled && p.type === "cod");
        const points = [
            [V.icon.truck, gulf ? t("توصيل لكل دول الخليج") : t("توصيل لكل ولايات عُمان")],
            free ? [V.icon.tag, gulf && enabled.filter((c) => ATHR.freeAppliesTo(cfg, c.code)).every((c) => c.code === ATHR.BASE_COUNTRY)
                ? t("توصيل مجاني في عُمان فوق {amount}", { amount: money(v, cfg.order.free_min) })
                : t("توصيل مجاني فوق {amount}", { amount: money(v, cfg.order.free_min) })] : null,
            [V.icon.card, cod ? t("الدفع عند الاستلام") : t("تحويل بنكي آمن")]
        ].filter(Boolean);
        const socials = (cfg.texts.socials || []).filter((x) => ATHR.isUrl(x.url));
        const ig = socials.find((x) => /instagram\.com/i.test(x.url));
        const tt = socials.find((x) => /tiktok\.com/i.test(x.url));
        const follow = [
            ig ? `<a href="${esc(ig.url)}" target="_blank" rel="noopener" aria-label="${esc(t("إنستغرام"))}">${V.icon.instagram}</a>` : "",
            tt ? `<a href="${esc(tt.url)}" target="_blank" rel="noopener" aria-label="${esc(t("تيك توك"))}">${V.icon.tiktok}</a>` : "",
            wa ? `<a class="wa" href="${esc(ATHR.waLink(cfg.order.whatsapp))}" target="_blank" rel="noopener" aria-label="${esc(t("واتساب"))}">${V.waIcon()}</a>` : ""
        ].join("");
        const others = V.socials({ ...v, cfg: { ...cfg, texts: { ...cfg.texts, socials: socials.filter((x) => x !== ig && x !== tt) } } }, "fsoc");
        const bottom = [
            `© ${new Date().getFullYear()} ${esc(ATHR.storeName(cfg))}`,
            cfg.contact.policy_show ? `<a href="${ATHR.url.page("shipping")}">${esc(ct(v, "contact.policy_title"))}</a>` : "",
            cfg.contact.reviews_share_btn ? `<a href="${ATHR.url.page("review")}" rel="nofollow">${esc(ct(v, "contact.reviews_share_text"))}</a>` : ""
        ].filter(Boolean);
        return `<div class="wrap foot">
            <div class="foot-head">
                <div class="footer-brand"><img src="${esc(V.asset(cfg.logo_url || ATHR.DEFAULTS.logo_url))}" alt="${esc(ATHR.storeName(cfg))}" width="40" height="40"></div>
                ${about ? `<p class="foot-about">${esc(fill(v, about))}</p>` : ""}
            </div>
            <ul class="foot-points">${points.map(([ic, text]) => `<li>${ic}<span>${esc(text)}</span></li>`).join("")}</ul>
            ${cats.length ? `<details class="foot-acc">
                <summary>${esc(t("الأقسام"))}${V.icon.chevron}</summary>
                <ul class="footer-cats">${cats.map((c) => `<li><a href="${ATHR.url.category(c)}">${esc(V.cname(c))}</a></li>`).join("")}</ul>
            </details>` : ""}
            <details class="foot-acc">
                <summary>${esc(ct(v, "texts.footer_delivery_title"))}${V.icon.chevron}</summary>
                <ul class="foot-lines">${V.footerDelivery(v).map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
                ${cfg.contact.policy_show ? `<a class="foot-more" href="${ATHR.url.page("shipping")}">${esc(t("التفاصيل كاملة"))}</a>` : ""}
            </details>
            ${follow || others ? `<div class="foot-follow"><span>${esc(ct(v, "texts.footer_contact_title"))}</span><div class="foot-icons">${follow}</div>${others ? `<div class="footer-social">${others}</div>` : ""}</div>` : ""}
            <div class="footer-bottom">${bottom.join(" · ")}</div>
        </div>`;
    };

    // مسار صورة داخل المتجر (images/...) أو رابط كامل
    V.asset = (src) => (!src || /^https?:|^data:|^\//i.test(src) ? src : ATHR.base() + src);

    V.brand = function (v) {
        const cfg = v.cfg;
        const logo = cfg.logo_url || ATHR.DEFAULTS.logo_url;
        const photo = !/logo\.png$/.test(logo);
        return `<span class="brand-logo shape-${esc(cfg.logo_shape || "rounded")}${photo ? " has-photo" : ""}" id="brandLogo"><img src="${esc(V.asset(logo))}" alt="" width="44" height="44"></span>
            <span class="brand-name" id="brandName"${cfg.show_name ? "" : " hidden"}>${esc(ATHR.storeName(cfg))}</span>`;
    };

    // =====================================================
    // TITLES
    // =====================================================

    V.titles = function (v, route) {
        const cfg = v.cfg;
        const name = ATHR.storeName(cfg) || t("المتجر");
        switch (route.name) {
            case "product": {
                const p = route.product;
                const c = p ? V.colorOf(v, p) : null;
                return p ? `${V.pname(p)}${c ? ` ${L(c, "name")}` : ""} | ${name}` : name;
            }
            case "category": return route.cat ? `${V.cname(route.cat)} | ${name}` : name;
            case "shipping": return `${ct(v, "contact.policy_title")} | ${name}`;
            case "cart": return `${t("السلة")} | ${name}`;
            case "checkout": return `${t("إتمام الطلب")} | ${name}`;
            case "done": return `${t("تم استلام طلبك")} | ${name}`;
            case "review": return `${t("قيّم تجربتك")} | ${name}`;
            case "search": return `${t("بحث")} | ${name}`;
            case "gift": return `${t("🎁 وصلتك هدية")} | ${name}`;
            default: {
                const seo = ct(v, "seo.home_title");
                return seo || `${name} | ${fill(v, ct(v, "texts.hero_title"))}`;
            }
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
