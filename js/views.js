/* =====================================================
   ATHR STORE — قوالب الصفحات (HTML)
   دوال نقية تستعملها واجهة المتجر في المتصفح، وسكربت بناء
   صفحات جوجل (tools/build.mjs) لتطابق الصفحة قبل وبعد التحميل.
===================================================== */

(function (root) {
    "use strict";

    const ATHR = root.ATHR;
    const esc = ATHR.escape;
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
    const money = (v, n) => ATHR.money(n, v.cfg);
    const isBase = (v) => v.country === ATHR.BASE_COUNTRY;
    const local = (v, n) => ATHR.moneyIn(n, v.cfg, v.country);
    V.money = money;
    V.local = local;
    V.fill = fill;

    const ICON = {
        truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h11v9.5H3z"/><path d="M14 9.5h4l3 3.2V16h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
        card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
        share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4"/></svg>',
        gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5C10 4 6.5 5 7.5 7.2 8.2 8.5 12 8.5 12 8.5ZM12 8.5c2-4.5 5.5-3.5 4.5-1.3-.7 1.3-4.5 1.3-4.5 1.3Z"/></svg>',
        tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7z"/><circle cx="8" cy="9" r="1.4"/></svg>'
    };
    V.icon = ICON;

    V.waIcon = () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6a9.3 9.3 0 0 0-8 14.1L2.7 21.4l4.8-1.3A9.3 9.3 0 1 0 12 2.6Z"/><path class="wa-glyph" d="M8.4 7.6c.2-.4.4-.4.7-.4h.6c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.7.8c.7 1.3 1.7 2.3 3 3l.8-.7c.2-.2.4-.2.7-.1l1.8.8c.3.1.4.3.4.5v.6c0 .3-.1.5-.4.7-.4.3-1 .5-1.6.5-1.4 0-3.2-.8-4.7-2.3S8 9.9 8 8.5c0-.4.1-.7.4-.9Z"/></svg>';

    V.colorOf = (v, p) => v.colorById.get(p.color_id) || null;
    V.label = (v, p) => ATHR.productLabel(p, v.cfg);
    V.img = (p) => p.thumb_url || ATHR.thumb(p.image_url, "s");
    V.big = (p) => ATHR.thumb(p.image_url, "m");
    V.catOf = (v, p) => v.catById.get(p.category_id) || null;
    V.description = (v, p) => {
        const own = String(p.description || "").trim();
        if (own) return own;
        const cat = V.catOf(v, p);
        return cat && cat.description ? String(cat.description).trim() : "";
    };

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
        return `<span class="stars ${cls}" role="img" aria-label="${r} من 5">${"★".repeat(full)}<span class="off">${"★".repeat(5 - full)}</span></span>`;
    };

    V.countText = (n, one, two, many) => (n === 1 ? one : n === 2 ? two : `${n} ${many}`);

    // =====================================================
    // PRICE / COLOR / CARD
    // =====================================================

    V.priceHTML = function (v, p, { big = false } = {}) {
        const old = Number(p.old_price) > Number(p.price);
        const save = old ? Number(p.old_price) - Number(p.price) : 0;
        return `<div class="price${big ? " big" : ""}">
            <b>${local(v, p.price)}</b>
            ${old ? `<s>${local(v, p.old_price)}</s>` : ""}
            ${old && big ? `<span class="save">وفّر ${local(v, save)}</span>` : ""}
            ${isBase(v) ? "" : `<small class="base-price">${money(v, p.price)}</small>`}
        </div>`;
    };

    V.dot = function (color) {
        const hex = color && /^#[0-9a-f]{6}$/i.test(color.hex || "") ? color.hex : "#cccccc";
        return `<span class="dot" style="background:${hex}"></span>`;
    };

    V.colorTag = function (v, p) {
        const c = V.colorOf(v, p);
        return c ? `<span class="color-tag">${V.dot(c)}${esc(c.name)}</span>` : "";
    };

    // دوائر الألوان داخل البطاقة (تبدّل الصورة والزر)
    V.cardSwatches = function (v, p) {
        const g = v.groups.get(p.id);
        if (!g) return V.colorTag(v, p);
        return `<div class="swatches" role="group" aria-label="الألوان">
            ${g.map((x) => {
                const c = V.colorOf(v, x);
                return `<button type="button" class="sw${x.id === p.id ? " on" : ""}" data-swap="${esc(x.id)}" aria-pressed="${x.id === p.id}" aria-label="${esc(c ? c.name : "")}"${x.is_available === false ? ' data-out="1"' : ""}>${V.dot(c)}</button>`;
            }).join("")}
            <span class="sw-name">${esc((V.colorOf(v, p) || {}).name || "")}</span>
        </div>`;
    };

    V.maxQty = (v) => Math.max(1, Math.min(99, Number(v.cfg.order.max_qty) || 10));

    V.cardAction = function (v, p) {
        if (p.is_available === false) {
            return `<button class="btn btn-ghost" type="button" disabled>${esc(v.cfg.texts.sold_out)}</button>`;
        }
        const qty = v.cartQty(p.id);
        if (qty > 0) {
            return `<div class="stepper" role="group" aria-label="الكمية في السلة">
                <button type="button" data-inc="${esc(p.id)}" aria-label="زيادة"${qty >= V.maxQty(v) ? " disabled" : ""}>+</button>
                <output aria-live="polite">${qty}</output>
                <button type="button" data-dec="${esc(p.id)}" aria-label="إنقاص">−</button>
            </div>`;
        }
        return `<button class="btn btn-primary" type="button" data-add="${esc(p.id)}">${esc(v.cfg.texts.add_to_cart)}</button>`;
    };

    V.card = function (v, p, { eager = false, high = false } = {}) {
        const out = p.is_available === false;
        const sale = !out && Number(p.old_price) > Number(p.price);
        const pct = sale ? Math.round((1 - p.price / p.old_price) * 100) : 0;
        const url = ATHR.url.product(p);
        const stats = V.reviewStats(v.reviewsByProduct.get(p.id));
        let badge = "";
        if (out) badge = `<span class="badge out">${esc(v.cfg.texts.sold_out)}</span>`;
        else if (sale) badge = `<span class="badge sale">خصم ${pct}%</span>`;
        else if (p.is_best_seller) badge = `<span class="badge hot">${esc(v.cfg.sales.best_title || "الأكثر طلباً")}</span>`;
        const src = V.img(p);
        return `<article class="card${out ? " soldout" : ""}" data-card="${esc(p.id)}">
            <a class="card-img" href="${url}" tabindex="-1" aria-hidden="true">
                ${src ? `<img src="${esc(src)}" alt="" width="400" height="500"${eager ? "" : ' loading="lazy"'}${high ? ' fetchpriority="high"' : ""} decoding="async">` : ""}
                ${badge}
            </a>
            <div class="card-body">
                <a class="card-name" href="${url}">${esc(p.name)}</a>
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

    V.bundleCard = function (v, b) {
        const a = v.byId.get(b.a);
        const t = v.byId.get(b.b);
        const pct = Math.max(1, Math.min(90, Number(b.pct) || 0));
        const full = Number(a.price) + Number(t.price);
        const price = Math.round((Number(a.price) + Number(t.price) * (1 - pct / 100)) * 1000) / 1000;
        return `<article class="set-card">
            <a class="set-imgs" href="${ATHR.url.product(a)}" aria-label="${esc(V.label(v, a))}">
                <span>${V.img(a) ? `<img src="${esc(V.img(a))}" alt="" loading="lazy" decoding="async" width="300" height="375">` : ""}</span>
                <i aria-hidden="true">+</i>
                <span>${V.img(t) ? `<img src="${esc(V.img(t))}" alt="" loading="lazy" decoding="async" width="300" height="375">` : ""}</span>
            </a>
            <div class="set-body">
                <b class="set-name">${esc(a.name)} + ${esc(t.name)}</b>
                <div class="price"><b>${local(v, price)}</b><s>${local(v, full)}</s></div>
                <span class="set-save">${esc(t.name)} بخصم ${pct}%</span>
            </div>
            <button class="btn btn-primary btn-sm" type="button" data-add-bundle="${esc(b.a)}|${esc(b.b)}">أضف الطقم</button>
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
            const t = v.byId.get(b.b);
            const other = b.a === p.id ? t : a;
            const pct = Number(b.pct) || 0;
            const full = Number(a.price) + Number(t.price);
            const price = Math.round((Number(a.price) + Number(t.price) * (1 - pct / 100)) * 1000) / 1000;
            const text = b.a === p.id
                ? `أكمل الطقم: «${V.label(v, t)}» بخصم ${pct}%`
                : `اشترِ «${V.label(v, a)}» واحصل على هذا المنتج بخصم ${pct}%`;
            return `<div class="offer">
                <a href="${ATHR.url.product(other)}">${V.img(other) ? `<img src="${esc(V.img(other))}" alt="" loading="lazy" width="104" height="130">` : ""}</a>
                <div>
                    <strong>${esc(text)}</strong>
                    <span class="price"><b>الطقم ${local(v, price)}</b><s>${local(v, full)}</s></span>
                </div>
                <button class="btn btn-primary btn-sm" type="button" data-add-bundle="${esc(b.a)}|${esc(b.b)}">أضف الطقم</button>
            </div>`;
        }).join("");
    };

    V.volumeTeaser = function (v) {
        const tiers = ATHR.volumeTiers(v.cfg);
        if (!tiers.length) return "";
        const parts = tiers.map((t) => `${ATHR.piecesText(t.min)}${t === tiers[tiers.length - 1] ? " أو أكثر" : ""} خصم ${t.pct}%`);
        return `<div class="volume">${ICON.tag}<span><b>وفّر أكثر كلما زادت القطع:</b> ${esc(parts.join("، "))}. يُطبَّق تلقائيًا في السلة.</span></div>`;
    };

    // =====================================================
    // DELIVERY / PAYMENT TEXT
    // =====================================================

    V.deliveryPriceLabel = function (v, d) {
        if (d.pricing === "per_kg") return `${money(v, d.price)} لكل كيلو`;
        return Number(d.price) > 0 ? money(v, d.price) : "مجاني";
    };

    V.countriesText = (list) => list.map((c) => `${c.flag} ${c.name}`).join("، ");

    V.flagsFor = (v, item) => ATHR.countries(v.cfg).filter((c) => c.enabled && ATHR.inCountries(item, c.code));

    V.paymentGroups = function (v) {
        const groups = new Map();
        ATHR.countries(v.cfg).filter((c) => c.enabled).forEach((c) => {
            const names = ATHR.paymentsFor(v.cfg, c.code).map((p) => p.name);
            if (!names.length) return;
            const key = names.join("، ");
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
        const where = list.length === 1 && list[0].code === "OM" ? "داخل عُمان " : list.length < enabled.length ? `إلى ${V.countriesText(list)} ` : "";
        return `التوصيل مجاني ${where}للطلبات من ${money(v, cfg.order.free_min)} أو أكثر.`;
    };

    V.deliveryLines = function (v) {
        const enabledCount = ATHR.countries(v.cfg).filter((c) => c.enabled).length;
        const lines = (v.cfg.order.delivery || []).filter((d) => d.enabled).map((d) => {
            const list = V.flagsFor(v, d);
            const where = list.length && list.length < enabledCount ? ` — ${list.map((c) => c.flag).join(" ")}` : "";
            return `${d.name}: ${V.deliveryPriceLabel(v, d)}${d.duration ? ` (${d.duration})` : ""}${where}`;
        });
        const free = V.freeLine(v);
        if (free) lines.push(free);
        const groups = V.paymentGroups(v);
        if (groups.length === 1) lines.push(`طرق الدفع: ${groups[0].names}.`);
        else groups.forEach((g) => lines.push(`${g.countries.map((c) => c.flag).join(" ")} الدفع: ${g.names}.`));
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
                price = `${money(v, d.price)} لكل كيلو (هذا المنتج ${money(v, s.cost)})`;
            }
            return `<span>${esc(d.name)}: <b>${esc(price)}</b>${d.duration ? ` · ${esc(d.duration)}` : ""}</span>`;
        });
        return `<div class="info-box">
            <div class="info-row">${ICON.truck}<div>
                <b>التوصيل إلى ${c.flag} ${esc(c.name)}</b>
                ${lines.length ? lines.join("") : "<span>غير متاح حاليًا، تواصل معنا عبر واتساب.</span>"}
                ${free ? `<span class="ok">مجاني للطلبات من ${esc(money(v, cfg.order.free_min))} أو أكثر</span>` : ""}
            </div></div>
            ${pays.length ? `<div class="info-row">${ICON.card}<div><b>الدفع</b><span>${esc(pays.map((x) => x.name).join("، "))}</span></div></div>` : ""}
            ${multi ? `<button class="link-btn" type="button" data-open-currency>لست في ${esc(c.name)}؟ غيّر الدولة</button>` : ""}
        </div>`;
    };

    V.trust = function (v) {
        const cfg = v.cfg;
        if (!cfg.sales.trust_show) return "";
        const pays = ATHR.paymentsFor(cfg, v.country);
        const items = [];
        (cfg.sales.trust_custom || []).filter(Boolean).slice(0, 3).forEach((t) => items.push(fill(v, t)));
        if (pays.some((p) => p.type === "cod")) items.push("الدفع عند الاستلام");
        if (pays.some((p) => p.type === "bank")) items.push(pays.some((p) => p.type === "bank" && /دولي/.test(p.name)) ? "تحويل بنكي دولي" : "تحويل بنكي مباشر");
        if (pays.some((p) => p.type === "online")) items.push("دفع إلكتروني آمن");
        const gulf = (cfg.order.delivery || []).some((d) => d.enabled && Array.isArray(d.countries) && d.countries.some((x) => x !== "OM"));
        items.push(gulf ? "توصيل لكل دول الخليج" : "توصيل داخل سلطنة عُمان");
        if (ATHR.isValidWhatsapp(cfg.order.whatsapp)) items.push("تواصل مباشر عبر واتساب");
        return `<ul class="trust">${items.map((t) => `<li>${ICON.check}${esc(t)}</li>`).join("")}</ul>`;
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
            return `<section class="ad wrap" id="ad">${open(`<img src="${esc(V.asset(ad.image_url))}" alt="${esc(ad.image_alt)}" fetchpriority="high">`, "ad-media")}</section>`;
        }
        if (ad.type === "video" && ad.video_url) {
            return `<section class="ad wrap" id="ad">${open(`<video muted loop playsinline autoplay preload="none" data-deferred-src="${esc(ad.video_url)}" aria-label="${esc(ad.video_alt)}"></video>`, "ad-media")}</section>`;
        }
        if (ad.type === "text" && (ad.title || ad.text)) {
            const bg = /^#[0-9a-f]{6}$/i.test(ad.bg) ? ad.bg : v.cfg.theme.primary;
            const btnHref = link || "#catalog";
            return `<section class="ad wrap" id="ad"><div class="ad-text" style="background:${esc(bg)}">
                ${ad.title ? `<h2>${esc(fill(v, ad.title))}</h2>` : ""}
                ${ad.text ? `<p>${esc(fill(v, ad.text))}</p>` : ""}
                ${ad.button ? `<a class="btn" href="${esc(btnHref)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${esc(fill(v, ad.button))}</a>` : ""}
            </div></section>`;
        }
        return "";
    };

    V.hero = function (v) {
        const cfg = v.cfg;
        if (!cfg.theme.hero_show) return `<h1 class="sr-only">${esc(cfg.name)}</h1>`;
        const t = cfg.texts;
        const features = (t.hero_features || []).filter(Boolean).slice(0, 4).map((f) => `<li>${ICON.check}${esc(fill(v, f))}</li>`).join("");
        const image = cfg.theme.hero_image && (ATHR.isUrl(cfg.theme.hero_image) || !cfg.theme.hero_image.includes(":")) ? cfg.theme.hero_image : "";
        return `<section class="hero${cfg.theme.hero_pattern ? " pattern" : ""}${image ? " has-image" : ""}">
            ${image ? `<div class="hero-bg"><img data-deferred-src="${esc(V.asset(image))}" alt=""></div>` : ""}
            <div class="wrap hero-inner">
                <h1>${esc(fill(v, t.hero_title))}</h1>
                ${t.hero_text ? `<p>${esc(fill(v, t.hero_text))}</p>` : ""}
                ${features ? `<ul class="hero-features">${features}</ul>` : ""}
            </div>
        </section>`;
    };

    // صورة القسم: صورته إن وُجدت، وإلا صورة أول منتج فيه
    V.categoryImage = function (v, c) {
        if (c.image_url) return V.asset(c.image_url);
        const p = v.products.find((x) => x.category_id === c.id && V.img(x));
        return p ? V.img(p) : "";
    };

    V.tiles = function (v, current) {
        const cats = v.categories.filter((c) => v.counts.get(c.id));
        if (!cats.length) return "";
        return `<nav class="tiles wrap" aria-label="الأقسام">
            ${cats.map((c) => {
                const img = V.categoryImage(v, c);
                return `<a class="tile${current && current.id === c.id ? " on" : ""}" href="${ATHR.url.category(c)}"${current && current.id === c.id ? ' aria-current="page"' : ""}>
                    <span class="tile-img">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" width="160" height="160">` : ""}</span>
                    <span class="tile-name">${esc(c.name)}</span>
                </a>`;
            }).join("")}
        </nav>`;
    };

    V.sortSelect = function (v, sort) {
        if (v.cfg.theme.show_sort === false) return "";
        return `<label class="sr-only" for="sortSelect">ترتيب حسب السعر</label>
            <select class="select" id="sortSelect">
                <option value="default"${sort === "default" || !sort ? " selected" : ""}>الترتيب الافتراضي</option>
                <option value="asc"${sort === "asc" ? " selected" : ""}>السعر: الأقل أولاً</option>
                <option value="desc"${sort === "desc" ? " selected" : ""}>السعر: الأعلى أولاً</option>
            </select>`;
    };

    V.curNote = function (v) {
        if (isBase(v)) return "";
        const c = ATHR.country(v.cfg, v.country);
        return `<p class="cur-note">${c.flag} الأسعار ب${esc(c.currency_def)} تقريبية، ويُحسب الطلب بالريال العماني. <button class="link-btn" type="button" data-open-currency>تغيير</button></p>`;
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
                <div class="section-head"><h2 id="reviews-t">${esc(c.reviews_title)}</h2></div>
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
                ${(r.images || []).slice(0, 3).map((src) => `<img src="${esc(src)}" alt="صورة من العميل" loading="lazy">`).join("")}
                ${r.video ? `<video src="${esc(r.video)}" controls playsinline preload="metadata"></video>` : ""}
            </div>` : ""}
            <figcaption>${r.name ? esc(r.name) : "عميل"}${product ? ` · <a href="${ATHR.url.product(product)}">${esc(product.name)}</a>` : ""}</figcaption>
        </figure>`;
    };

    V.home = function (v, { sort = "default" } = {}) {
        const cfg = v.cfg;
        const all = V.sortList(V.listings(v, v.products), sort);
        const best = V.bestSellers(v);
        const sets = V.setCards(v);
        const fresh = V.newArrivals(v);
        const intro = cfg.texts.about ? `<p class="intro">${esc(fill(v, cfg.texts.about))}</p>` : "";
        return `${V.ad(v)}
            ${V.hero(v)}
            ${V.tiles(v)}
            ${best.length ? V.rail(v, { id: "best", title: cfg.sales.best_title || "الأكثر طلباً", items: best }) : ""}
            ${sets ? V.rail(v, { id: "sets", title: cfg.sales.sets_title || "أطقم بسعر أقل", cards: sets }) : ""}
            <section class="catalog section" id="catalog" aria-labelledby="catalog-t">
                <div class="wrap">
                    <div class="section-head">
                        <h2 id="catalog-t">كل المنتجات <small class="muted">(${all.length})</small></h2>
                        ${V.sortSelect(v, sort)}
                    </div>
                    ${V.curNote(v)}
                    <div id="gridBox">${V.grid(v, all)}</div>
                </div>
            </section>
            ${fresh.length && !best.length ? V.rail(v, { id: "new", title: cfg.sales.new_title || "وصل حديثاً", items: fresh }) : ""}
            ${V.storeReviews(v)}
            <section class="wrap seo-intro">${intro}</section>`;
    };

    // =====================================================
    // CATEGORY / SEARCH
    // =====================================================

    V.crumbs = function (items) {
        return `<nav class="crumbs wrap" aria-label="مسار التصفح">
            ${items.map((it, i) => (it.href && i < items.length - 1
                ? `<a href="${it.href}">${esc(it.name)}</a>`
                : `<span aria-current="page">${esc(it.name)}</span>`)).join('<span class="sep" aria-hidden="true">›</span>')}
        </nav>`;
    };

    V.category = function (v, cat, { sort = "default" } = {}) {
        const list = V.sortList(V.listings(v, v.products.filter((p) => p.category_id === cat.id)), sort);
        return `${V.crumbs([{ name: "الرئيسية", href: ATHR.url.home() }, { name: cat.name }])}
            ${V.tiles(v, cat)}
            <section class="catalog section" id="catalog">
                <div class="wrap">
                    <div class="section-head">
                        <h1>${esc(cat.name)} <small class="muted">(${list.length})</small></h1>
                        ${V.sortSelect(v, sort)}
                    </div>
                    ${cat.description ? `<p class="cat-desc">${esc(cat.description)}</p>` : ""}
                    ${V.curNote(v)}
                    <div id="gridBox">${list.length ? V.grid(v, list) : `<div class="empty"><p>لا توجد منتجات في هذا القسم حاليًا.</p><a class="btn btn-primary" href="${ATHR.url.home()}">تصفّح كل المنتجات</a></div>`}</div>
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
            const hay = ATHR.normName([p.name, p.description, cat && cat.name, color && color.name].filter(Boolean).join(" "));
            return words.every((w) => hay.includes(w));
        }));
    };

    V.search = function (v, q, { sort = "default" } = {}) {
        const list = V.sortList(V.searchResults(v, q), sort);
        const has = String(q || "").trim();
        return `<section class="catalog section" id="catalog">
            <div class="wrap">
                <div class="section-head">
                    <h1>${has ? `نتائج «${esc(q)}» <small class="muted">(${list.length})</small>` : "ابحث في المنتجات"}</h1>
                    ${list.length ? V.sortSelect(v, sort) : ""}
                </div>
                ${V.curNote(v)}
                <div id="gridBox">${list.length ? V.grid(v, list) : `<div class="empty"><p>${has ? "لا توجد نتائج. جرّب اسم فريق أو شخصية أو قسم." : "اكتب اسم فريق أو شخصية أو جامعة في خانة البحث بالأعلى."}</p></div>`}</div>
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
            <span class="variants-label">اللون: <b>${esc(current ? current.name : "")}</b></span>
            <div class="variant-list">
                ${g.map((x) => {
                    const c = V.colorOf(v, x);
                    const on = x.id === p.id;
                    return `<a class="variant${on ? " on" : ""}${x.is_available === false ? " out" : ""}" href="${ATHR.url.product(x)}" data-replace${on ? ' aria-current="true"' : ""}>
                        ${V.img(x) ? `<img src="${esc(V.img(x))}" alt="" width="56" height="70" loading="lazy">` : ""}
                        <span>${V.dot(c)}${esc(c ? c.name : "")}</span>
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
            return `<div class="out-note" id="buyBox">${esc(cfg.texts.sold_out)}. ${ATHR.isValidWhatsapp(cfg.order.whatsapp) ? "تواصل معنا لمعرفة موعد توفره." : ""}</div>`;
        }
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp) && cfg.sales.wa_quick;
        const buyNow = cfg.sales.buy_now;
        return `<div class="buy" id="buyBox">
            <div class="buy-row">
                <div class="stepper lg" role="group" aria-label="الكمية">
                    <button type="button" data-pdp-step="1" aria-label="زيادة">+</button>
                    <output id="pdpQty" aria-live="polite">1</output>
                    <button type="button" data-pdp-step="-1" aria-label="إنقاص">−</button>
                </div>
                <button class="btn btn-primary" type="button" data-pdp-add="${esc(p.id)}">${esc(cfg.texts.add_to_cart)}</button>
            </div>
            ${buyNow || wa ? `<div class="buy-alt${buyNow && wa ? "" : " single"}">
                ${buyNow ? `<button class="btn btn-ghost" type="button" data-buy-now="${esc(p.id)}">اشترِ الآن</button>` : ""}
                ${wa ? `<button class="btn btn-wa" type="button" data-wa-product="${esc(p.id)}">${V.waIcon()}اطلب عبر واتساب</button>` : ""}
            </div>` : ""}
        </div>`;
    };

    V.productReviews = function (v, p) {
        const list = (v.reviewsByProduct.get(p.id) || []).slice()
            .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
        const stats = V.reviewStats(list);
        const writeHref = ATHR.url.page("review", `p=${encodeURIComponent(p.slug || p.id)}`);
        return `<section class="section reviews-block" id="reviews" aria-labelledby="pr-t">
            <div class="section-head"><h2 id="pr-t">تقييمات العملاء</h2></div>
            ${stats ? `<div class="rate-summary"><b>${stats.avg.toFixed(1)}</b>${V.stars(stats.avg)}<span>${V.countText(stats.count, "تقييم واحد", "تقييمان", "تقييمات")}</span></div>
                <div class="review-list">${list.slice(0, 6).map((r) => V.reviewCard(v, r)).join("")}</div>`
            : `<p class="muted">لا توجد تقييمات لهذا التصميم بعد. اشتريته؟ شاركنا رأيك.</p>`}
            <a class="btn btn-ghost btn-sm" href="${writeHref}" rel="nofollow">اكتب تقييمك</a>
        </section>`;
    };

    V.product = function (v, p) {
        const cfg = v.cfg;
        const cat = V.catOf(v, p);
        const stats = V.reviewStats(v.reviewsByProduct.get(p.id));
        const desc = V.description(v, p);
        const related = cfg.sales.related_show ? V.relatedFor(v, [p.id], Number(cfg.sales.related_count) || 4) : [];
        const crumbs = [{ name: "الرئيسية", href: ATHR.url.home() }];
        if (cat) crumbs.push({ name: cat.name, href: ATHR.url.category(cat) });
        crumbs.push({ name: p.name });
        return `${V.crumbs(crumbs)}
            <div class="wrap">
                <div class="pdp">
                    <div class="gallery" id="gallery">${V.galleryStage(v, p)}</div>
                    <div class="pdp-info">
                        <h1>${esc(p.name)}</h1>
                        ${stats ? `<a class="pdp-rate" href="#reviews">${V.stars(stats.avg)}<span>${stats.avg.toFixed(1)} · ${V.countText(stats.count, "تقييم واحد", "تقييمان", "تقييمات")}</span></a>` : ""}
                        ${V.priceHTML(v, p, { big: true })}
                        ${v.groups.get(p.id) ? V.variantPicker(v, p) : (V.colorOf(v, p) ? `<div class="pdp-color">اللون: ${V.colorTag(v, p)}</div>` : "")}
                        ${V.buyBox(v, p)}
                        ${p.is_available === false ? "" : V.volumeTeaser(v)}
                        ${V.bundleOffers(v, p)}
                        ${V.deliveryBox(v, p)}
                        ${V.trust(v)}
                        ${desc || p.video_url ? `<div class="pdp-details">
                            <h2>تفاصيل المنتج</h2>
                            ${desc ? `<p>${esc(desc)}</p>` : ""}
                            ${p.video_url && ATHR.isUrl(p.video_url) ? `<a class="btn btn-ghost btn-sm" href="${esc(p.video_url)}" target="_blank" rel="noopener">▶ شاهد فيديو المنتج</a>` : ""}
                        </div>` : ""}
                        <div class="share-row">
                            <button class="link-btn" type="button" data-share-product="${esc(p.id)}">${ICON.share} شارك المنتج مع صديق</button>
                        </div>
                    </div>
                </div>
                ${V.productReviews(v, p)}
            </div>
            ${related.length ? V.rail(v, { id: "related", title: cfg.sales.related_title, items: related }) : ""}`;
    };

    // =====================================================
    // SHIPPING / POLICY PAGE
    // =====================================================

    V.shipping = function (v) {
        const cfg = v.cfg;
        const enabledCount = ATHR.countries(cfg).filter((c) => c.enabled).length;
        const delivery = (cfg.order.delivery || []).filter((d) => d.enabled);
        const notes = String(cfg.contact.policy_notes || "").split("\n").map((s) => s.trim()).filter(Boolean);
        const free = V.freeLine(v);
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const custom = (cfg.sales.trust_custom || []).filter(Boolean);
        return `${V.crumbs([{ name: "الرئيسية", href: ATHR.url.home() }, { name: cfg.contact.policy_title }])}
            <article class="wrap page policy">
                <h1>${esc(cfg.contact.policy_title)}</h1>
                <h2>طرق التوصيل وأسعارها</h2>
                ${delivery.map((d) => {
                    const list = V.flagsFor(v, d);
                    return `<p><b>${esc(d.name)}</b>: ${esc(V.deliveryPriceLabel(v, d))}${d.duration ? `، المدة ${esc(d.duration)}` : ""}${list.length && list.length < enabledCount ? `<br><span class="muted">إلى: ${esc(V.countriesText(list))}</span>` : ""}${d.note ? `<br><span class="muted">${esc(d.note)}</span>` : ""}</p>`;
                }).join("")}
                ${free ? `<p>${esc(free)}</p>` : ""}
                <p class="muted">داخل عُمان نوصّل إلى: ${esc((cfg.order.governorates || []).join("، "))}.</p>
                <h2>طرق الدفع</h2>
                ${V.paymentGroups(v).map((g) => `<p>${g.countries.length < enabledCount ? `<b>${esc(V.countriesText(g.countries))}:</b> ` : ""}${esc(g.names)}</p>`).join("")}
                ${(cfg.order.payments || []).filter((p) => p.enabled && p.note).map((p) => `<p class="muted">${esc(p.name)}: ${esc(fill(v, p.note))}</p>`).join("")}
                ${custom.length ? `<h2>ضماننا لك</h2>${custom.map((t) => `<p>${esc(fill(v, t))}</p>`).join("")}` : ""}
                <h2>كيف أطلب؟</h2>
                <ol>
                    <li>اختر تصميمك وأضفه للسلة.</li>
                    <li>اكتب اسمك ورقمك وعنوانك واختر طريقة التوصيل والدفع، بدون تسجيل حساب.</li>
                    <li>أرسل الطلب عبر واتساب بضغطة، ونؤكده ونجهّزه لك.</li>
                </ol>
                <h2>العملات</h2>
                <p class="muted">نعرض الأسعار بعملة دولتك تقريبيًا، ويُحسب الطلب بالريال العماني.</p>
                ${notes.length ? `<h2>ملاحظات</h2>${notes.map((n) => `<p>${esc(fill(v, n))}</p>`).join("")}` : ""}
                ${wa ? `<p><a class="btn btn-wa" href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(v, cfg.contact.wa_float_msg)))}" target="_blank" rel="noopener">${V.waIcon()}اسألنا عبر واتساب</a></p>` : ""}
            </article>`;
    };

    // =====================================================
    // FOOTER
    // =====================================================

    V.footer = function (v) {
        const cfg = v.cfg;
        const t = cfg.texts;
        const deliveryText = (t.footer_delivery_text || "").trim()
            ? t.footer_delivery_text.split("\n").filter(Boolean).map((line) => fill(v, line))
            : V.deliveryLines(v);
        const socials = (t.socials || []).filter((s) => s.name && ATHR.isUrl(s.url));
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp);
        const cats = v.categories.filter((c) => v.counts.get(c.id));
        return `<div class="wrap">
            <div class="footer-grid">
                <div>
                    <div class="footer-brand"><img src="${esc(V.asset(cfg.logo_url || ATHR.DEFAULTS.logo_url))}" alt="" width="40" height="40"><strong>${esc(cfg.name)}</strong></div>
                    ${t.about ? `<p>${esc(fill(v, t.about))}</p>` : ""}
                    ${cfg.contact.policy_show ? `<p><a href="${ATHR.url.page("shipping")}">${esc(cfg.contact.policy_title)}</a></p>` : ""}
                </div>
                <div>
                    <h2>الأقسام</h2>
                    <ul class="footer-cats">${cats.map((c) => `<li><a href="${ATHR.url.category(c)}">${esc(c.name)}</a></li>`).join("")}</ul>
                </div>
                <div>
                    <h2>${esc(t.footer_delivery_title)}</h2>
                    ${deliveryText.map((line) => `<p>${esc(line)}</p>`).join("")}
                </div>
                <div>
                    <h2>${esc(t.footer_contact_title)}</h2>
                    ${wa ? `<p>واتساب: <a href="${esc(ATHR.waLink(cfg.order.whatsapp))}" target="_blank" rel="noopener" dir="ltr">${esc(ATHR.localPhone(cfg.order.whatsapp))}</a></p>` : ""}
                    <div class="footer-links">
                        ${cfg.contact.reviews_share_btn ? `<a href="${ATHR.url.page("review")}" rel="nofollow">${esc(cfg.contact.reviews_share_text)}</a>` : ""}
                        ${socials.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join("")}
                    </div>
                </div>
            </div>
            <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(cfg.name)}</div>
        </div>`;
    };

    // مسار صورة داخل المتجر (images/...) أو رابط كامل
    V.asset = (src) => (!src || /^https?:|^data:|^\//i.test(src) ? src : ATHR.base() + src);

    V.brand = function (v) {
        const cfg = v.cfg;
        const logo = cfg.logo_url || ATHR.DEFAULTS.logo_url;
        const photo = !/logo\.png$/.test(logo);
        return `<span class="brand-logo shape-${esc(cfg.logo_shape || "rounded")}${photo ? " has-photo" : ""}" id="brandLogo"><img src="${esc(V.asset(logo))}" alt="" width="44" height="44"></span>
            <span class="brand-name" id="brandName"${cfg.show_name ? "" : " hidden"}>${esc(cfg.name)}</span>`;
    };

    // =====================================================
    // TITLES
    // =====================================================

    V.titles = function (v, route) {
        const cfg = v.cfg;
        const name = cfg.name || "المتجر";
        switch (route.name) {
            case "product": {
                const p = route.product;
                const c = p ? V.colorOf(v, p) : null;
                return p ? `${p.name}${c ? ` ${c.name}` : ""} | ${name}` : name;
            }
            case "category": return route.cat ? `${route.cat.name} | ${name}` : name;
            case "shipping": return `${cfg.contact.policy_title} | ${name}`;
            case "cart": return `السلة | ${name}`;
            case "checkout": return `إتمام الطلب | ${name}`;
            case "done": return `تم استلام طلبك | ${name}`;
            case "review": return `قيّم تجربتك | ${name}`;
            case "search": return `بحث | ${name}`;
            default: return cfg.seo && cfg.seo.home_title ? cfg.seo.home_title : `${name} | ${fill(v, cfg.texts.hero_title)}`;
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
