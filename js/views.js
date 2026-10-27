/* =====================================================
   حروف وألوان — قوالب الصفحات (HTML)
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
        // الإثبات الاجتماعي (أرقام حقيقية من social_proof): أرقام كل ألوان التصميم الواحد معاً
        const proof = o.proof && o.proof.p ? o.proof : null;
        const proofById = new Map();
        if (proof) {
            const serverNow = (Number(new Date(proof.at)) || Date.now()) + Math.max(0, Date.now() - (Number(proof.recv) || Date.now()));
            const designKey = (p) => `${p.category_id || ""}|${String(p.name || "").trim()}`;
            products.forEach((p) => {
                const g = groups.get(p.id) || [p];
                let nMax = 0;
                let f = 0;
                let last = 0;
                g.forEach((x) => {
                    const r = proof.p[x.id];
                    if (!r) return;
                    nMax = Math.max(nMax, Number(r.n) || 0);
                    f += Number(r.f) || 0;
                    const at = r.last ? Number(new Date(r.last)) || 0 : 0;
                    if (at > last) last = at;
                });
                const keys = new Set(g.map(designKey));
                const n = g.length > 1 && keys.size === 1 && proof.g && proof.g[[...keys][0]] ? Number(proof.g[[...keys][0]]) : nMax;
                if (n || f || last) proofById.set(p.id, { n, f, ago: last ? Math.max(0, serverNow - last) : null });
            });
        }
        return {
            cfg,
            products,
            categories,
            reviews,
            proof,
            proofById,
            country: o.country || ATHR.BASE_COUNTRY,
            cartQty: o.cartQty || (() => 0),
            cartCustom: o.cartCustom || (() => null),
            savedChild: o.savedChild || (() => null),
            photoThumb: o.photoThumb || (() => ""),
            isFav: o.isFav || (() => false),
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
        file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h7.5l4 4v13h-11.5z"/><path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5"/></svg>',
        inbox: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v10M8 9.8l4 3.7 4-3.7"/><path d="M4 13.5v5.5h16v-5.5"/></svg>',
        printer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3.5h10V8"/><rect x="3.5" y="8" width="17" height="8.5" rx="1.6"/><path d="M7 13.5h10V20.5H7z"/></svg>',
        chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>',
        home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5"/><path d="M6 9v10.5h4.5V14h3v5.5H18V9"/></svg>',
        sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
        moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z"/></svg>',
        auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16a8 8 0 0 0 0-16Z" class="fill"/></svg>',
        user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/></svg>',
        users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.9-3.3 3.2-4.9 6-4.9s5.1 1.6 6 4.9"/><path d="M15.2 5.6a3.2 3.2 0 0 1 0 6M17.3 14.9c1.8.6 3 2.1 3.7 4.6"/></svg>',
        clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
        verified: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-.9 2.6.9 2.6-2.2 1.6-.9 2.6-2.7-.2L12 21l-2.2-1.6-2.7.2-.9-2.6-2.2-1.6.9-2.6-.9-2.6 2.2-1.6.9-2.6 2.7.2Z"/><path d="M8.6 12.2l2.3 2.3 4.6-4.8"/></svg>',
        grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg>',
        globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5Z"/></svg>',
        side: '<svg class="side" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6"/></svg>',
        heart: '<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.8-4.6-7.8-10.3A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.8 2.7c0 5.7-7.8 10.3-7.8 10.3Z"/></svg>',
        star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>',
        bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
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

    // =====================================================
    // الإثبات الاجتماعي: أرقام حقيقية فقط، ولا يظهر رقم قبل حدّه الأدنى (من لوحة التحكم)
    // =====================================================

    V.proofOf = function (v, p) {
        const pc = v.cfg.proof || {};
        const r = v.proofById && v.proofById.get(p.id);
        if (!r) return null;
        const dayMs = 864e5;
        const out = {
            n: pc.counts !== false && r.n >= Math.max(1, Number(pc.min_buyers) || 3) ? r.n : 0,
            f: pc.favs !== false && v.cfg.sales.favorites !== false && r.f >= Math.max(1, Number(pc.min_favs) || 5) ? r.f : 0,
            ago: pc.last !== false && r.ago !== null && r.ago <= Math.max(1, Number(pc.recent_days) || 7) * dayMs ? r.ago : null
        };
        return out.n || out.f || out.ago !== null ? out : null;
    };

    // «قبل 3 ساعات»
    V.ago = function (ms) {
        const h = Math.floor(ms / 36e5);
        const d = Math.floor(ms / 864e5);
        if (ATHR.isEn()) {
            if (h < 1) return "less than an hour ago";
            if (d < 1) return h === 1 ? "1 hour ago" : `${h} hours ago`;
            return d === 1 ? "yesterday" : `${d} days ago`;
        }
        if (h < 1) return "قبل أقل من ساعة";
        if (d < 1) return h === 1 ? "قبل ساعة" : h === 2 ? "قبل ساعتين" : h <= 10 ? `قبل ${h} ساعات` : `قبل ${h} ساعة`;
        return d === 1 ? "أمس" : d === 2 ? "قبل يومين" : d <= 10 ? `قبل ${d} أيام` : `قبل ${d} يوماً`;
    };

    // «12 عميلاً طلبوه»
    V.buyersText = function (n) {
        if (ATHR.isEn()) return n === 1 ? "1 customer ordered this" : `${n} customers ordered this`;
        if (n === 1) return "عميل واحد طلبه";
        if (n === 2) return "عميلان طلباه";
        return n <= 10 ? `${n} عملاء طلبوه` : `${n} عميلاً طلبوه`;
    };

    // «أضافه 5 أشخاص للمفضلة»
    V.favsText = function (n) {
        if (ATHR.isEn()) return n === 1 ? "Saved by 1 person" : `Saved by ${n} people`;
        const who = n === 1 ? "شخص واحد" : n === 2 ? "شخصان" : n <= 10 ? `${n} أشخاص` : `${n} شخصاً`;
        return `أضافه ${who} للمفضلة`;
    };

    // «25 عميلاً طلبوا من حروف وألوان» (أعلى الصفحة الرئيسية)
    V.storeTotal = function (v) {
        const pc = v.cfg.proof || {};
        const n = v.proof && Number(v.proof.total);
        if (pc.total === false || !n || n < Math.max(1, Number(pc.min_total) || 20)) return "";
        const name = ATHR.storeName(v.cfg);
        if (ATHR.isEn()) return `${n} customers ordered from ${name}`;
        if (n === 1) return `عميل واحد طلب من ${name}`;
        if (n === 2) return `عميلان طلبا من ${name}`;
        return n <= 10 ? `${n} عملاء طلبوا من ${name}` : `${n} عميلاً طلبوا من ${name}`;
    };

    V.cardProof = function (v, p) {
        const pr = V.proofOf(v, p);
        return pr && pr.n ? `<span class="card-proof">${ICON.users}<span>${esc(V.buyersText(pr.n))}</span></span>` : "";
    };

    V.pdpProof = function (v, p) {
        const pr = V.proofOf(v, p);
        if (!pr) return "";
        const items = [];
        if (pr.n) items.push(`<li>${ICON.users}<span>${esc(V.buyersText(pr.n))}</span></li>`);
        if (pr.ago !== null) items.push(`<li>${ICON.clock}<span>${esc(ATHR.isEn() ? `Last ordered ${V.ago(pr.ago)}` : `آخر طلب ${V.ago(pr.ago)}`)}</span></li>`);
        if (pr.f) items.push(`<li>${ICON.heart}<span>${esc(V.favsText(pr.f))}</span></li>`);
        return items.length ? `<ul class="pdp-proof">${items.join("")}</ul>` : "";
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
    // أقصى كمية لمنتج: حد الطلب، أو الكمية المتوفرة في المخزون إن كانت أقل
    V.maxFor = (v, p) => {
        const stock = ATHR.stockOf(p);
        return stock === null ? V.maxQty(v) : Math.min(V.maxQty(v), stock);
    };
    // «باقي N فقط»: حقيقي من المخزون
    V.lowStock = (v, p) => {
        const stock = ATHR.stockOf(p);
        const limit = Number(v.cfg.sales.low_stock) || 0;
        return v.cfg.sales.low_stock_show !== false && stock !== null && stock > 0 && limit > 0 && stock <= limit && p.is_available !== false ? stock : 0;
    };

    V.cardAction = function (v, p) {
        if (p.is_available === false) {
            return v.cfg.sales.restock !== false
                ? `<a class="btn btn-ghost notify-link" href="${ATHR.url.product(p)}#notify">${ICON.bell}${esc(t("أخبرني عند التوفر"))}</a>`
                : `<button class="btn btn-ghost" type="button" disabled>${esc(ct(v, "texts.sold_out"))}</button>`;
        }
        const qty = v.cartQty(p.id);
        if (ATHR.isStory(p)) {
            return qty > 0
                ? `<a class="btn btn-ghost in-cart" href="${ATHR.url.page("cart")}">${ICON.check}${esc(t("في السلة"))}</a>`
                : `<a class="btn btn-primary story-cta" href="${ATHR.url.product(p)}#personalize">${esc(t("خصص القصة لطفلك"))}</a>`;
        }
        if (qty > 0 && V.maxFor(v, p) <= 1) {
            return `<a class="btn btn-ghost in-cart" href="${ATHR.url.page("cart")}">${ICON.check}${esc(t("في السلة"))}</a>`;
        }
        if (qty > 0) {
            return `<div class="stepper" role="group" aria-label="${esc(t("الكمية في السلة"))}">
                <button type="button" data-inc="${esc(p.id)}" aria-label="${esc(t("زيادة"))}"${qty >= V.maxFor(v, p) ? " disabled" : ""}>+</button>
                <output aria-live="polite">${qty}</output>
                <button type="button" data-dec="${esc(p.id)}" aria-label="${esc(t("إنقاص"))}">−</button>
            </div>`;
        }
        return `<button class="btn btn-primary" type="button" data-add="${esc(p.id)}">${esc(ct(v, "texts.add_to_cart"))}</button>`;
    };

    // بطاقة القصة (مثل Kasaty): شارة «للأولاد والبنات»، الصورة، الاسم والوصف، السعر، وزر «خصص القصة لطفلك الآن»
    V.storyCard = function (v, p, { eager = false, high = false } = {}) {
        const url = ATHR.url.product(p);
        const sale = Number(p.old_price) > Number(p.price);
        const pct = sale ? Math.round((1 - p.price / p.old_price) * 100) : 0;
        const stats = V.reviewStats(v.reviewsByProduct.get(p.id));
        const src = V.img(p);
        const pro = ATHR.proOn(v.cfg, p.story);
        const blurb = V.storyBlurb(p);
        return `<article class="ks-card" data-card="${esc(p.id)}">
            <div class="ks-media"><a class="ks-img" href="${url}" tabindex="-1" aria-hidden="true">
                ${src ? `<img src="${esc(src)}" alt="" width="400" height="500"${eager ? "" : ' loading="lazy"'}${high ? ' fetchpriority="high"' : ""} decoding="async">` : ""}
                <span class="ks-badge">👦👧 ${esc(t("للأولاد والبنات"))}</span>
                ${sale ? `<span class="ks-sale">${esc(t("خصم {pct}%", { pct }))}</span>` : pro ? `<span class="ks-sale pro">🌟 ${esc(t("متاحة بوجه طفلك"))}</span>` : ""}
            </a>
            <button class="ks-peek" type="button" data-flip="${esc(p.id)}" aria-label="${esc(t("تصفّح القصة"))}">👁</button></div>
            <div class="ks-body">
                <a class="ks-name" href="${url}">${esc(V.storyShort(p))}</a>
                ${blurb ? `<p class="ks-blurb">${esc(blurb)}</p>` : ""}
                ${stats ? `<span class="card-rate">${V.stars(stats.avg, "sm")}<small>(${stats.count})</small></span>` : ""}
                <div class="ks-price">${sale ? `<s>${local(v, p.old_price)}</s>` : ""}<b>${local(v, p.price)}</b></div>
            </div>
            ${p.is_available === false
                ? `<div class="ks-act">${V.cardAction(v, p)}</div>`
                : `<a class="ks-cta" href="${url}#personalize">✏️ ${esc(t("خصّص القصة لطفلك"))}</a>`}
        </article>`;
    };

    V.card = function (v, p, { eager = false, high = false } = {}) {
        if (ATHR.isStory(p)) return V.storyCard(v, p, { eager, high });
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
            ${V.favBtn(v, p)}
            <div class="card-body">
                <a class="card-name" href="${url}">${esc(V.pname(p))}</a>
                ${stats ? `<span class="card-rate">${V.stars(stats.avg, "sm")}<small>(${stats.count})</small></span>` : ""}
                ${V.cardProof(v, p)}
                ${V.cardSwatches(v, p)}
                ${V.priceHTML(v, p)}
                ${V.lowStock(v, p) ? `<span class="card-low">🔥 ${esc(t("باقي {n} فقط", { n: V.lowStock(v, p) }))}</span>` : ""}
            </div>
            <div class="card-action" data-action-for="${esc(p.id)}">${V.cardAction(v, p)}</div>
        </article>`;
    };

    // زر القلب (المفضلة)
    V.favBtn = function (v, p, { big = false } = {}) {
        if (v.cfg.sales.favorites === false) return "";
        const on = v.isFav(p.id);
        return `<button class="fav-btn${big ? " big" : ""}${on ? " on" : ""}" type="button" data-fav="${esc(p.id)}" aria-pressed="${on}" aria-label="${esc(on ? t("إزالة من المفضلة") : t("أضف للمفضلة"))}">${ICON.heart}${big ? `<span>${esc(on ? t("في المفضلة") : t("أضف للمفضلة"))}</span>` : ""}</button>`;
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

    // طقم واحد لكل تصميم (منتج بأكثر من لون + منتج ثاني = طقم واحد)
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
        if (ATHR.isDigital(cfg)) {
            const ways = ATHR.deliveriesFor(cfg, c.code);
            const paysD = ATHR.paymentsFor(cfg, c.code);
            const multiD = ATHR.countries(cfg).filter((x) => x.enabled).length > 1;
            return `<div class="info-box">
            <div class="info-row">${ICON.inbox}<div>
                <b>${esc(t("الاستلام"))}</b>
                ${ways.length ? ways.map((d) => `<span>${esc(L(d, "name"))}${d.duration ? ` · ${esc(ATHR.duration(d.duration))}` : ""}</span>${L(d, "note") ? `<span class="muted">${esc(L(d, "note"))}</span>` : ""}`).join("") : `<span>${esc(t("تواصل معنا عبر واتساب."))}</span>`}
            </div></div>
            ${paysD.length ? `<div class="info-row">${ICON.card}<div><b>${esc(t("الدفع"))}</b><span>${esc(paysD.map((x) => L(x, "name")).join(sep()))}</span></div></div>` : ""}
            ${multiD ? `<button class="link-btn" type="button" data-open-currency>${esc(t("لست في {country}؟ غيّر الدولة", { country: V.countryName(c) }))}</button>` : ""}
        </div>`;
        }
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
        if (ATHR.isDigital(cfg)) items.push(t("تصلك القصة على واتساب"));
        else items.push(gulf ? t("توصيل لكل دول الخليج") : t("توصيل داخل سلطنة عُمان"));
        if (ATHR.isValidWhatsapp(cfg.order.whatsapp)) items.push(t("تواصل مباشر عبر واتساب"));
        return `<ul class="trust">${items.map((x) => `<li>${ICON.check}${esc(x)}</li>`).join("")}</ul>`;
    };

    // =====================================================
    // HOME
    // =====================================================

    V.ad = function (v) {
        if (!v.cfg.ad.show) return "";
        const parts = ATHR.adSlides(v.cfg).map((s, i) => V.adSlide(v, s, i)).filter(Boolean);
        if (!parts.length) return "";
        if (parts.length === 1) return `<section class="ad wrap" id="ad">${parts[0]}</section>`;
        // أكثر من إعلان: الزبون يسحب يمين ويسار، والنقاط تحت توضح وين وصل
        const n = parts.length;
        return `<section class="ad wrap ad-multi" id="ad" aria-roledescription="carousel" aria-label="${esc(t("العروض"))}"${v.cfg.ad.auto === false ? ' data-manual=""' : ""}>
            <div class="ad-track">${parts.map((p, i) => `<div class="ad-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${n}">${p}</div>`).join("")}</div>
            <div class="ad-dots">${parts.map((_, i) => `<button type="button" data-ad-dot="${i}" aria-label="${esc(t("إعلان {n}", { n: i + 1 }))}"${i ? "" : ' aria-current="true"'}></button>`).join("")}</div>
        </section>`;
    };

    // إعلان واحد: الأول نصوصه من config.ad (وترجمته)، والإضافي من حقوله مباشرة
    V.adSlide = function (v, ad, i) {
        if (!ATHR.adReady(ad)) return "";
        const first = i === 0;
        const txt = (k) => (first ? ct(v, `ad.${k}`) : ATHR.L(ad, k));
        const raw = ATHR.isSafeLink(ad.link) && ad.link ? ad.link : "";
        const link = raw && !/^https?:/i.test(raw) && !raw.startsWith("#") ? ATHR.base() + raw.replace(/^\//, "") : raw;
        const ext = /^https?:/i.test(link);
        const open = (inner, cls) => link
            ? `<a class="${cls}" href="${esc(link)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${inner}</a>`
            : `<div class="${cls}">${inner}</div>`;
        if (ad.type === "image" && ad.image_url) {
            return open(`<img src="${esc(V.asset(ad.image_url))}" alt="${esc(txt("image_alt") || "")}"${first ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}>`, "ad-media");
        }
        if (ad.type === "video" && ad.video_url) {
            // نسخة الفيديو المضغوطة من بناء المتجر (تشتغل في كل الجوالات) + صورة غلاف تظهر فوراً
            const cat = typeof ATHR_CATALOG !== "undefined" && ATHR_CATALOG && ATHR_CATALOG.ad ? ATHR_CATALOG.ad[ad.video_url] : null;
            const src = cat ? ATHR.base() + cat.v : ad.video_url;
            const poster = cat ? ATHR.base() + cat.p : ad.image_url ? V.asset(ad.image_url) : "";
            // الفيديو الأول يشتغل تلقائياً، والباقي يشتغل لما يوصله الزبون
            return open(`<video muted loop playsinline${first ? ' autoplay preload="auto"' : ' preload="none"'} src="${esc(src)}"${poster ? ` poster="${esc(poster)}"` : ""}${cat && cat.w && cat.h ? ` width="${cat.w}" height="${cat.h}"` : ""} aria-label="${esc(txt("video_alt") || "")}"></video><span class="ad-play" aria-hidden="true"></span>`, "ad-media");
        }
        const title = txt("title");
        const text = txt("text");
        const button = txt("button");
        if (ad.type === "text" && (title || text)) {
            const bg = /^#[0-9a-f]{6}$/i.test(ad.bg) ? ad.bg : v.cfg.theme.primary;
            const btnHref = link || "#catalog";
            return `<div class="ad-text" style="background:${esc(bg)}">
                ${title ? `<h2>${esc(fill(v, title))}</h2>` : ""}
                ${text ? `<p>${esc(fill(v, text))}</p>` : ""}
                ${button ? `<a class="btn" href="${esc(btnHref)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${esc(fill(v, button))}</a>` : ""}
            </div>`;
        }
        return "";
    };

    // مزايا المتجر المختصرة من إعدادات التوصيل والدفع (دائماً صحيحة)
    V.storePoints = function (v) {
        const cfg = v.cfg;
        const gulf = ATHR.countries(cfg).some((c) => c.enabled && c.code !== ATHR.BASE_COUNTRY);
        const free = cfg.order.free_enabled && Number(cfg.order.free_min) > 0;
        const cod = (cfg.order.payments || []).some((p) => p.enabled && p.type === "cod");
        if (ATHR.isDigital(cfg)) {
            return [
                [V.icon.file, t("قصص PDF جاهزة للطباعة")],
                [V.icon.inbox, t("تصلك على واتساب")],
                [V.icon.card, cod ? t("الدفع عند الاستلام") : t("تحويل بنكي آمن")]
            ];
        }
        return [
            free ? [V.icon.tag, t("توصيل مجاني فوق {amount}", { amount: ATHR.trimZeros(money(v, cfg.order.free_min)) })] : null,
            [V.icon.card, cod ? t("الدفع عند الاستلام") : t("تحويل بنكي آمن")],
            [V.icon.truck, gulf ? t("توصيل للخليج") : t("توصيل لكل عُمان")]
        ].filter(Boolean);
    };

    V.hero = function (v) {
        const cfg = v.cfg;
        if (!cfg.theme.hero_show) return `<h1 class="sr-only">${esc(ATHR.storeName(cfg))}</h1>`;
        // الواجهة المختصرة: العنوان وسطر مزايا صغير فقط
        if (cfg.theme.hero_compact !== false && !cfg.theme.hero_image) {
            return `<section class="hero hero-compact${cfg.theme.hero_pattern ? " pattern" : ""}">
            <div class="wrap hero-inner">
                <h1>${esc(fill(v, ct(v, "texts.hero_title")))}</h1>
                <ul class="hero-mini">${V.storePoints(v).map(([ico, label]) => `<li>${ico}<span>${esc(label)}</span></li>`).join("")}</ul>
                ${V.storeTotal(v) ? `<p class="hero-proof">${ICON.users}<span>${esc(V.storeTotal(v))}</span></p>` : ""}
            </div>
        </section>`;
        }
        const features = (ct(v, "texts.hero_features") || []).filter(Boolean).slice(0, 4).map((f) => `<li>${ICON.check}${esc(fill(v, f))}</li>`).join("");
        const image = cfg.theme.hero_image && (ATHR.isUrl(cfg.theme.hero_image) || !cfg.theme.hero_image.includes(":")) ? cfg.theme.hero_image : "";
        const text = ct(v, "texts.hero_text");
        return `<section class="hero${cfg.theme.hero_pattern ? " pattern" : ""}${image ? " has-image" : ""}">
            ${image ? `<div class="hero-bg"><img data-deferred-src="${esc(V.asset(image))}" alt=""></div>` : ""}
            <div class="wrap hero-inner">
                <h1>${esc(fill(v, ct(v, "texts.hero_title")))}</h1>
                ${text ? `<p>${esc(fill(v, text))}</p>` : ""}
                ${features ? `<ul class="hero-features">${features}</ul>` : ""}
                ${V.storeTotal(v) ? `<p class="hero-proof">${ICON.users}<span>${esc(V.storeTotal(v))}</span></p>` : ""}
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
            <figcaption>${r.name ? esc(r.name) : esc(t("عميل"))}${r.verified && v.cfg.proof && v.cfg.proof.verified !== false ? ` <span class="rv-verified">${ICON.verified}${esc(ATHR.isEn() ? "Verified buyer" : "مشتري موثّق")}</span>` : ""}${product ? ` · <a href="${ATHR.url.product(product)}">${esc(V.pname(product))}</a>` : ""}</figcaption>
        </figure>`;
    };

    // =====================================================
    // GIFT (بنر الهدية، زر الهدية المميز، وبطاقة الإهداء)
    // =====================================================

    V.giftSub = (v) => (v.cfg.sales.gift_card !== false ? ct(v, "gift.cta_sub") || t("بطاقة إهداء رقمية فيها رسالتك، وبدون ذكر السعر") : t("نوصلها لمن تحب، وبدون ذكر السعر"));

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
                <span class="gp-text"><b>${esc(ct(v, "gift.banner_title") || t("أرسلها هدية لمن تحب"))}</b><small>${esc(ct(v, "gift.banner_text") || (s.gift_card !== false ? t("نوصلها لمن تحب مع بطاقة إهداء رقمية فيها رسالتك، وبدون ذكر السعر.") : t("نوصلها لمن تحب مع رسالتك، وبدون ذكر السعر.")))}</small></span>
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

    // بطاقة الإهداء: صندوق بسيط بألوان هادئة يتفتح، ثم بطاقة ورقية بإطار رفيع
    // (ألوان لوحة التحكم تُخفَّف تلقائياً في التصميم حتى تبقى هادئة)
    V.giftPage = function (v, card) {
        const cfg = v.cfg;
        const g = cfg.gift || {};
        const store = ATHR.storeName(cfg);
        if (!card || !card.to) {
            return `<div class="wrap empty page"><p>${esc(t("رابط بطاقة الإهداء غير صحيح."))}</p><a class="btn btn-primary" href="${ATHR.base()}">${esc(t("العودة للمتجر"))}</a></div>`;
        }
        const vars = { to: card.to, from: card.from || "", store };
        const txt = (key, fallback) => ATHR.giftFill(ct(v, `gift.${key}`) || fallback, vars);
        const o = ATHR.giftOccasion(card.occasion, cfg, card.occasionText);
        const logo = V.asset(cfg.logo_url || ATHR.DEFAULTS.logo_url);
        const gender = ATHR.giftGendersOn(cfg) && ATHR.giftFor(card.gender, cfg) ? card.gender : "";
        const stars = g.stars === false ? "" : Array.from({ length: 12 }, (_, i) => `<i style="--x:${(i * 61 + 7) % 100}%;--y:${(i * 37 + 11) % 100}%;--d:${((i * 0.53) % 4).toFixed(2)}s;--s:${0.6 + ((i * 7) % 5) / 10}"></i>`).join("");
        const party = g.confetti !== false;
        const burst = party ? Array.from({ length: 16 }, (_, i) => `<i style="--a:${i * (360 / 16)}deg;--r:${90 + ((i * 37) % 60)}px;--d:${(i % 4) * 50}ms"></i>`).join("") : "";
        const confetti = party ? Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 37 + 5) % 100}%;--d:${(i * 151) % 1100}ms;--t:${(2.8 + ((i * 7) % 10) / 6).toFixed(2)}s;--r:${(i % 2 ? 1 : -1) * (120 + ((i * 53) % 200))}deg"></i>`).join("") : "";
        const msg = String(card.msg || "").trim() || txt("empty_msg", t("هدية مختارة لك بكل حب"));
        return `<div class="gift-page${gender ? ` gift-${gender}` : ""}" data-occ="${esc(o.id)}" style="${esc(V.giftStyle(v, gender))}">
            <section class="gx" id="giftStage">
                ${stars ? `<div class="gx-stars" aria-hidden="true">${stars}</div>` : ""}
                <p class="gx-kicker">${esc(txt("kicker", t("هدية خاصة لك")))}</p>
                <h1 class="gx-title">${esc(txt("title", t("{name}، وصلتك هدية!", { name: card.to })))}</h1>
                <button class="gx-box" type="button" data-gift-open aria-label="${esc(txt("button", t("افتح هديتك")))}">
                    <span class="gx-shadow" aria-hidden="true"></span>
                    <span class="gx-burst" aria-hidden="true">${burst}</span>
                    <span class="gx-body" aria-hidden="true"></span>
                    <span class="gx-lid" aria-hidden="true"><span class="gx-bow"><i></i><i></i><b></b></span></span>
                    ${g.tag === false ? "" : `<span class="gx-tag" aria-hidden="true">${esc(card.to)}</span>`}
                </button>
                <button class="gx-cta" type="button" data-gift-open>${esc(txt("button", t("افتح هديتك")))}</button>
                <p class="gx-hint">${esc(txt("hint", t("اضغط على الصندوق لتفتحها")))}</p>
            </section>
            <section class="gx gx-open" id="giftCard" hidden>
                ${stars ? `<div class="gx-stars" aria-hidden="true">${stars}</div>` : ""}
                ${confetti ? `<div class="confetti" aria-hidden="true">${confetti}</div>` : ""}
                <article class="gcard">
                    <div class="gc-seal" aria-hidden="true">${V.icon.gift}</div>
                    <p class="gc-to">${esc(t("إلى"))}</p>
                    <h2 class="gc-name">${esc(card.to)}</h2>
                    <p class="gc-occ">${esc(L(o, "title"))}</p>
                    <div class="gc-line" aria-hidden="true"><span></span></div>
                    <blockquote class="gc-msg">${esc(msg)}</blockquote>
                    ${card.from ? `<p class="gc-from"><span>${esc(txt("closing", t("مع خالص المحبة،")))}</span><b>${esc(card.from)}</b></p>` : ""}
                    <div class="gc-foot"><span class="gc-logo"><img src="${esc(logo)}" alt="" width="30" height="30"></span><span>${esc(txt("footer", t("هديتك في الطريق إليك من {store} 🎁", { store })))}</span></div>
                </article>
                <div class="gx-actions">
                    <button class="gx-again" type="button" data-gift-replay>${esc(t("افتحها مرة ثانية"))}</button>
                    <a class="gx-shop" href="${ATHR.base()}">${esc(t("تسوّق من {store}", { store }))}</a>
                </div>
            </section>
        </div>`;
    };

    // عدد المنتجات قبل «عرض المزيد» (0 = الكل)
    V.pageSize = (v) => {
        const n = Number(v.cfg.theme.page_size);
        return Number.isFinite(n) && n >= 0 ? n : 12;
    };

    // «عرض المزيد» تحت الشبكة
    V.moreBtn = function (v, total, shown) {
        const left = total - shown;
        return left > 0 ? `<div class="more-wrap"><button class="btn btn-ghost more-btn" type="button" data-more>${esc(t("عرض المزيد"))} <small>(${left})</small></button></div>` : "";
    };

    V.limitedGrid = function (v, list, shown) {
        const size = V.pageSize(v);
        const n = size ? Math.max(size, shown || 0) : list.length;
        return `${V.grid(v, list.slice(0, n))}${V.moreBtn(v, list.length, Math.min(n, list.length))}`;
    };

    // كل المنتجات في الرئيسية: فلترة سريعة بالقسم + «عرض المزيد»
    V.catalogHome = function (v, { sort = "default", cat = "", shown = 0 } = {}) {
        const cats = v.categories.filter((c) => v.counts.get(c.id));
        const current = cat && cats.find((c) => c.id === cat) ? cat : "";
        const all = V.sortList(V.listings(v, v.products.filter((p) => !current || p.category_id === current)), sort);
        const total = V.listings(v, v.products).length;
        const chips = v.cfg.theme.home_filter !== false && cats.length > 1
            ? `<div class="cat-chips" role="group" aria-label="${esc(t("تصفية حسب القسم"))}">
                <button type="button" class="chip${current ? "" : " on"}" data-home-cat="" aria-pressed="${!current}">${esc(ct(v, "texts.all_label") || t("الكل"))} <small>${total}</small></button>
                ${cats.map((c) => `<button type="button" class="chip${current === c.id ? " on" : ""}" data-home-cat="${esc(c.id)}" aria-pressed="${current === c.id}">${esc(V.cname(c))} <small>${v.counts.get(c.id)}</small></button>`).join("")}
            </div>`
            : "";
        const curCat = current ? v.catById.get(current) : null;
        return `<div class="section-head">
                <h2 id="catalog-t">${esc(curCat ? V.cname(curCat) : t("كل المنتجات"))} <small class="muted">(${all.length})</small></h2>
                ${V.sortSelect(v, sort)}
            </div>
            ${chips}
            ${V.curNote(v)}
            <div id="gridBox">${V.limitedGrid(v, all, shown)}</div>`;
    };

    // متجر القصص الشخصية: واجهة بسيطة (العنوان، 3 خطوات، القصص، ليش بيحبها طفلك، الأسئلة)
    // متجر القصص: كل المنتجات قصص، أو ما فيه منتجات بعد (القصص الجديدة قيد الرسم)
    V.isStoryStore = (v) => (v.products.length ? v.products.every((p) => ATHR.isStory(p)) : Boolean(v.cfg.stories));

    // قصص قادمة (تظهر لما ما فيه قصص منشورة)
    V.SOON = [
        { e: "🚀", t: "مستكشف الفضاء", s: "صاروخ وروبوت صديق ورحلة بين الكواكب" },
        { e: "🐬", t: "أعماق البحر", s: "دلفين وشعاب مرجانية وكنز اللؤلؤ" },
        { e: "🦕", t: "أرض الديناصورات", s: "آلة زمن وديناصور صغير ضائع" },
        { e: "🏰", t: "مغامرة في عُمان", s: "قلعة وصحراء وجبال وصقر يدلّ الطريق" }
    ];

    // مقالات قصيرة للأهل في الرئيسية (تنفتح في نافذة)
    V.TIPS = [
        {
            id: "read", e: "📚", t: "كيف تجعل طفلك يحب القراءة؟",
            s: "خطوات بسيطة تحوّل القراءة من واجب إلى وقت ممتع ينتظره طفلك كل يوم.",
            p: [
                "اقرؤوا معاً كل يوم ولو عشر دقائق، وفي نفس الوقت تقريباً، مثل قبل النوم. التكرار يجعل القراءة عادةً يحبها الطفل.",
                "دعه يختار القصة بنفسه، حتى لو طلب نفس القصة كل ليلة؛ فإعادة القصة تقوّي فهمه وتزيد حصيلته من الكلمات.",
                "غيّر صوتك مع كل شخصية، وتوقّف لتسأله: «ماذا تتوقع أن يحدث الآن؟»، فهذا يجعله شريكاً في الحكاية.",
                "اجعل الكتب في متناول يده: رفّ صغير في غرفته، وكتاب في السيارة، وآخر في حقيبة السفر.",
                "وكن قدوته: حين يراك تقرأ، يفهم أن القراءة شيء ممتع يفعله الكبار أيضاً."
            ]
        },
        {
            id: "hero", e: "🦸", t: "لماذا يحب الطفل قصة يكون هو بطلها؟",
            s: "حين يرى الطفل اسمه في القصة يشعر أنها كُتبت له، فيتعلّق بها ويطلبها مرة بعد مرة.",
            p: [
                "الطفل يحب أن يرى نفسه في كل شيء حوله، ولهذا يفرح كثيراً حين يسمع اسمه داخل الحكاية، ويشعر أنها قصته هو.",
                "هذا الشعور يجعله أكثر انتباهاً للقصة وأكثر رغبة في إعادتها، وكل إعادة تعني كلمات جديدة وتعلّقاً أكبر بالكتب.",
                "وحين يكون البطل شجاعاً أو صادقاً أو مرتّباً، يسهل على الطفل أن يقلّده، لأنه يرى نفسه في هذا البطل.",
                "لذلك تساعد القصة الشخصية في غرس عادة جديدة، مثل تنظيف الأسنان أو النوم بدري: يقرأ أن البطل الذي يحمل اسمه فعلها، فيحب أن يفعلها مثله."
            ]
        },
        {
            id: "night", e: "🌙", t: "قصة قبل النوم: دقائق قليلة تصنع فرقاً",
            s: "روتين بسيط قبل النوم يهدّئ طفلك، ويقرّبكما من بعض، ويجعله ينام وهو سعيد.",
            p: [
                "اجعل للنوم روتيناً ثابتاً: تنظيف الأسنان، ثم الفراش، ثم القصة. الطفل يرتاح حين يعرف ماذا سيحدث بعد ذلك.",
                "أبعد الشاشات قبل النوم بوقت كافٍ، واجعل القصة هي آخر شيء في يومه بدلاً منها.",
                "اختر قصة هادئة بنهاية سعيدة، واقرأ بصوت منخفض وبطيء، وخفّف الأضواء.",
                "وبعد القصة، اسأله عن أجمل شيء حدث في يومه. هذه الدقائق القليلة يتذكرها طفلك طويلاً."
            ]
        }
    ];

    V.tipSheet = function (v, id) {
        const a = V.TIPS.find((x) => x.id === id);
        if (!a) return "";
        return `<div class="sheet-head"><b>${esc(t("مقالات تهمك"))}</b><button class="close" type="button" data-close-sheet aria-label="${esc(t("إغلاق"))}">✕</button></div>
            <article class="tip-read">
                <span class="tip-e" aria-hidden="true">${a.e}</span>
                <h2>${esc(t(a.t))}</h2>
                ${a.p.map((x) => `<p>${esc(t(x))}</p>`).join("")}
                <a class="btn btn-primary btn-block" href="#stories" data-close-sheet>✨ ${esc(t("اختر قصة لطفلك"))}</a>
            </article>`;
    };

    // الرئيسية (مثل Kasaty): الواجهة، القصص، بنر الهدية، الهدايا، التقييمات، الأسئلة، لماذا نحن، المقالات
    V.storyHome = function (v) {
        const cfg = v.cfg;
        const sc = ATHR.storyCfg(cfg);
        const list = V.listings(v, v.products.filter((p) => ATHR.isStory(p)));
        const live = list.filter((p) => p.is_available !== false);
        const books = live.filter((p) => V.img(p)).slice(0, 3);
        const proStory = ATHR.proOn(cfg) ? live.find((p) => ATHR.proOn(cfg, p.story)) : null;
        const print = ATHR.printOn(cfg, v.country);
        const photo = sc.photo_upload !== false;
        const raw = fill(v, ct(v, "texts.hero_title")) || t("قصص أطفال مخصصة باسم وصورة طفلك");
        const cut = raw.indexOf(" باسم ");
        const titleHtml = cut > 0 ? `${esc(raw.slice(0, cut))} <em>${esc(raw.slice(cut + 1))}</em>` : esc(raw).replace("طفلك", "<em>طفلك</em>");
        const first = live.find((p) => p.story === "space") || live[0];
        const why = [
            ["👀", t("تشوفها قبل الطلب"), t("اكتب اسم طفلك وتصفّح القصة كاملة باسمه قبل ما تدفع.")],
            [photo ? "📷" : "✏️", photo ? t("باسمه وصورته") : t("باسمه في كل صفحة"), photo ? t("اسم طفلك في كل صفحة، وصورته على الغلاف.") : t("اسم طفلك وعمره وهواياته في القصة.")],
            proStory ? ["🌟", t("بوجه طفلك"), t("في القصة المؤلفة خصيصاً نرسم طفلك من صورته في كل صفحة.")] : null,
            ["✍️", t("عربي سليم"), t("نص عربي جميل بصيغة الولد أو البنت، سهل يقرؤه الطفل.")],
            sc.ded_enabled !== false || (print && sc.wrap_enabled !== false) ? ["🎁", print && sc.wrap_enabled !== false ? t("تغليف وإهداء مجاني") : t("إهداء مجاني"), print && sc.wrap_enabled !== false ? t("نغلّف الكتاب المطبوع كهدية، ونكتب إهداءك في أول صفحة.") : t("نكتب إهداءك لطفلك في أول صفحة من القصة.")] : null,
            ["🏅", t("هدايا مع كل قصة"), t("شهادة بطل القصة، وملصقات اسمه للمدرسة، وصفحة تلوين.")],
            print ? ["📦", t("PDF أو كتاب مطبوع"), t("ملف على واتساب خلال ساعات، أو كتاب بغلاف مقوّى لباب بيتك.")] : null,
            sc.guarantee ? ["🛡️", t("ضمان الرضا"), t("إذا ما عجبتك القصة نعدّلها مجاناً، أو نرجّع لك المبلغ كاملاً.")] : null
        ].filter(Boolean).slice(0, 6);
        const giftLine = print && sc.wrap_enabled !== false ? t("كل قصة مطبوعة نغلّفها كهدية مجاناً") : t("إهداء مجاني منك في أول صفحة");
        const giftSub = print && sc.wrap_enabled !== false && sc.ded_enabled !== false ? t("ومعها إهداء منك لطفلك في أول صفحة، بدون أي تكلفة إضافية.") : t("اكتب رسالتك لطفلك، ونطبعها في صفحة خاصة بداية القصة.");
        return `<section class="sh-hero ks-hero">
                <div class="wrap sh-inner">
                    <div class="sh-text">
                        <h1>${titleHtml}</h1>
                        <p>${esc(fill(v, ct(v, "texts.hero_text")))}</p>
                        <div class="sh-btns">
                            <a class="btn btn-primary sh-cta" href="#stories">✨ ${esc(ct(v, "texts.hero_button") || t("تصفّح جميع القصص"))}</a>
                            ${first ? `<button class="btn btn-ghost sh-more" type="button" data-flip="${esc(first.id)}">📖 ${esc(t("شاهد مثال"))}</button>` : ""}
                        </div>
                        <ul class="sh-trust"><li>👀 ${esc(t("تشوفها قبل الطلب"))}</li>${sc.guarantee ? `<li>🛡️ ${esc(t("ضمان الرضا"))}</li>` : ""}${sc.ded_enabled !== false ? `<li>💌 ${esc(t("إهداء مجاني"))}</li>` : ""}</ul>
                    </div>
                    ${books.length ? `<div class="sh-books" aria-hidden="true">${books.map((p, i) => `<span class="shb shb${i + 1}"><img src="${esc(V.img(p))}" alt="" width="300" height="375"${i ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async"></span>`).join("")}<span class="sh-float">✨ ${esc(photo ? t("اسم طفلك وصورته على الغلاف") : t("اسم طفلك على الغلاف وفي كل صفحة"))}</span></div>` : ""}
                </div>
            </section>
            <section class="section ks-best" id="stories" aria-labelledby="best-t">
                <div class="wrap">
                    <div class="section-head ks-head"><h2 id="best-t">${esc(list.length ? t("قصص يكون طفلك بطلها") : t("قصصنا الجديدة قريباً"))}</h2></div>
                    <p class="sh-lead">${esc(list.length ? t("اختر القصة، واكتب بيانات طفلك، وشوفها باسمه قبل ما تطلب.") : t("نرسم الحين مغامرات جديدة بأسلوب ثلاثي الأبعاد، طفلك بطلها باسمه وصورته."))}</p>
                    ${list.length ? `<div class="ks-grid">${list.map((p, i) => V.storyCard(v, p, { eager: i < 2, high: i < 2 })).join("")}</div>`
                        : `<div class="ks-grid">${V.SOON.map((x) => `<article class="ks-card ks-soon"><span class="ks-soon-e" aria-hidden="true">${x.e}</span><div class="ks-body"><b class="ks-name">${esc(t(x.t))}</b><p class="ks-blurb">${esc(t(x.s))}</p></div><span class="ks-soon-tag">✨ ${esc(t("قريباً"))}</span></article>`).join("")}</div>
                        ${ATHR.isValidWhatsapp(cfg.order.whatsapp) ? `<a class="btn btn-wa btn-block ks-soon-wa" href="${esc(ATHR.waLink(cfg.order.whatsapp, t("السلام عليكم، خبّروني أول ما تنزل القصص الجديدة 📚")))}" target="_blank" rel="noopener">${V.waIcon()}${esc(t("خبّرني أول ما تنزل"))}</a>` : ""}`}
                </div>
            </section>
            <section class="section ks-giftban-s" aria-label="${esc(giftLine)}">
                <div class="wrap">
                    <div class="ks-giftban">
                        <span class="ks-gb-e" aria-hidden="true">🎁</span>
                        <div><b>${esc(giftLine)}</b><small>${esc(giftSub)}</small></div>
                        <a class="btn btn-primary" href="#stories">${esc(t("اختر القصة"))}</a>
                    </div>
                </div>
            </section>
            ${first ? `<section class="section sh-live" aria-labelledby="live-t">
                <div class="wrap">
                    <div class="sh-live-in" data-live-story="${esc(first.id)}">
                        <div class="section-head"><h2 id="live-t">✨ ${esc(t("اكتب اسمه… وشوف الغلاف الآن"))}</h2></div>
                        <div class="sh-live-row">
                            <input class="input" name="live_name" maxlength="22" autocomplete="off" placeholder="${esc(t("اسم طفلك"))}" aria-label="${esc(t("اسم طفلك"))}">
                            <div class="sf-seg" role="radiogroup" aria-label="${esc(t("ولد أو بنت"))}">
                                <label><input type="radio" name="live_g" value="m" checked><span>${esc(t("ولد"))}</span></label>
                                <label><input type="radio" name="live_g" value="f"><span>${esc(t("بنت"))}</span></label>
                            </div>
                        </div>
                        <div class="sh-live-cv"><canvas id="liveCover" width="420" height="594"></canvas></div>
                        <button class="btn btn-primary btn-block" type="button" data-live-go>${esc(t("خصص قصته الآن"))} ←</button>
                    </div>
                </div>
            </section>` : ""}
            ${list.length ? `<section class="section sh-gifts" aria-labelledby="gifts-t">
                <div class="wrap">
                    <div class="section-head"><h2 id="gifts-t">🎁 ${esc(t("هدايا مجانية مع كل قصة"))}</h2></div>
                    <p class="sh-lead">${esc(t("في آخر كل قصة صفحات إضافية باسم طفلك، يطبعها ويفرح فيها."))}</p>
                    <div class="sh-gift-list">
                        <figure class="sh-gift"><span class="sh-gift-c"><canvas data-gift-prev="cert" width="300" height="424"></canvas></span><figcaption><b>🏅 ${esc(t("شهادة بطل القصة"))}</b><small>${esc(t("باسمه والرسالة اللي تعلّمها"))}</small></figcaption></figure>
                        <figure class="sh-gift"><span class="sh-gift-c"><canvas data-gift-prev="labels" width="300" height="424"></canvas></span><figcaption><b>🏷️ ${esc(t("ملصقات اسمه"))}</b><small>${esc(t("لدفاتره وأغراض المدرسة"))}</small></figcaption></figure>
                        <figure class="sh-gift"><span class="sh-gift-c"><canvas data-gift-prev="color" width="300" height="424"></canvas></span><figcaption><b>🖍️ ${esc(t("صفحة تلوين"))}</b><small>${esc(t("يلوّن اسمه بنفسه"))}</small></figcaption></figure>
                    </div>
                </div>
            </section>` : ""}
            ${V.storeReviews(v)}
            ${V.homeFaq(v)}
            <section class="section ks-why" aria-labelledby="why-t">
                <div class="wrap">
                    <div class="section-head"><h2 id="why-t">${esc(t("لماذا {name}؟", { name: ATHR.storeName(cfg) }))}</h2></div>
                    <div class="ks-why-rail">${why.map(([e, b, x]) => `<div class="ks-why-c"><span class="ks-why-e" aria-hidden="true">${e}</span><b>${esc(b)}</b><small>${esc(x)}</small></div>`).join("")}</div>
                </div>
            </section>
            <section class="section ks-tips" aria-labelledby="tips-t">
                <div class="wrap">
                    <div class="section-head"><h2 id="tips-t">${esc(t("مقالات تهمك"))}</h2></div>
                    <div class="ks-tips-rail">${V.TIPS.map((a) => `<article class="ks-tip">
                        <span class="ks-tip-img ${a.id}" aria-hidden="true">${a.e}</span>
                        <h3>${esc(t(a.t))}</h3>
                        <p>${esc(t(a.s))}</p>
                        <button class="link-btn" type="button" data-tip="${a.id}">${esc(t("اقرأ المقال"))} ←</button>
                    </article>`).join("")}</div>
                </div>
            </section>`;
    };

    V.home = function (v, { sort = "default", cat = "", shown = 0 } = {}) {
        if (V.isStoryStore(v)) return V.storyHome(v);
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
                <div class="wrap" id="catalogInner">${V.catalogHome(v, { sort, cat, shown })}</div>
            </section>
            ${fresh.length && !best.length ? V.rail(v, { id: "new", title: ct(v, "sales.new_title") || t("وصل حديثاً"), items: fresh }) : ""}
            ${V.storeReviews(v)}
            ${V.homeFaq(v)}
            <section class="wrap seo-intro">${intro}</section>`;
    };

    // أسئلة متكررة مختصرة في الرئيسية (كلها في صفحة الاستلام والدفع)
    V.homeFaq = function (v) {
        const list = (ct(v, "contact.faq") || []).filter((x) => x && x.q && x.a);
        if (!list.length || v.cfg.contact.faq_home === false) return "";
        return `<section class="section home-faq" id="faq" aria-labelledby="faq-t">
            <div class="wrap">
                <div class="section-head"><h2 id="faq-t">${esc(t("أسئلة متكررة"))}</h2>${v.cfg.contact.policy_show && list.length > 5 ? `<a class="more" href="${ATHR.url.page("shipping")}">${esc(t("كل الأسئلة"))}</a>` : ""}</div>
                <div class="faq-list">${list.slice(0, 5).map((x) => `<details class="faq-item"><summary>${esc(x.q)}</summary><p>${esc(fill(v, x.a))}</p></details>`).join("")}</div>
            </div>
        </section>`;
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

    V.category = function (v, cat, { sort = "default", shown = 0 } = {}) {
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
                    <div id="gridBox">${list.length ? V.limitedGrid(v, list, shown) : `<div class="empty"><p>${esc(t("لا توجد منتجات في هذا القسم حاليًا."))}</p><a class="btn btn-primary" href="${ATHR.url.home()}">${esc(t("تصفّح كل المنتجات"))}</a></div>`}</div>
                </div>
            </section>`;
    };

    // =====================================================
    // البحث الذكي: يفهم العربي والإنجليزي، والكلمات المتقاربة، والأخطاء الإملائية البسيطة
    // =====================================================

    const SEARCH_SYN = [
        ["تلوين", "لون", "الوان", "رسم", "رسومات", "coloring", "colouring", "color"], ["قصه", "قصص", "حكايه", "حكايات", "story", "stories"],
        ["نشاط", "انشطه", "العاب", "لعب", "activity", "activities"], ["متاهه", "متاهات", "maze", "mazes"], ["توصيل", "صل", "connect", "dots"],
        ["مطابقه", "matching", "match"], ["قص", "لصق", "cut", "paste"], ["تتبع", "تتبيع", "خط", "كتابه", "tracing", "trace", "handwriting"],
        ["ورقه", "اوراق", "ورقة عمل", "worksheet", "worksheets"], ["رياضيات", "حساب", "ارقام", "رقم", "عد", "math", "maths", "numbers"],
        ["ضرب", "جدول الضرب", "multiplication", "times"], ["كسور", "كسر", "fractions"], ["انجليزي", "انقليزي", "english", "انجلش"],
        ["عربي", "لغتي", "لغه عربيه", "arabic"], ["حروف", "حرف", "هجاء", "letters", "alphabet", "abc"], ["اسلاميه", "دين", "تربيه اسلاميه", "islamic", "quran", "قران"],
        ["معلمه", "معلمات", "معلم", "مدرسه", "teacher", "teachers"], ["عرض", "عروض", "بوربوينت", "باوربوينت", "شرائح", "powerpoint", "slides", "ppt"],
        ["شهاده", "شهادات", "تقدير", "certificate", "certificates"], ["روضه", "تمهيدي", "kg", "kindergarten", "اطفال", "طفل", "kids"],
        ["حزمه", "حزم", "باقه", "bundle", "bundles"], ["حيوانات", "حيوان", "animals", "animal"], ["بحر", "سمك", "sea", "ocean"],
        ["رمضان", "عيد", "فانوس", "ramadan", "eid"], ["مهن", "مهنه", "وظائف", "jobs", "professions"], ["عادات", "سلوك", "اداب", "habits", "manners"]
    ];
    const synMap = (() => {
        const m = new Map();
        SEARCH_SYN.forEach((group) => {
            const g = group.map((w) => ATHR.normName(w));
            g.forEach((w) => m.set(w, g));
        });
        return m;
    })();
    const stripAl = (w) => (w.length > 4 && w.startsWith("ال") ? w.slice(2) : w);
    // مسافة التحرير (لأخطاء الكتابة البسيطة)
    const editDistance = (a, b, max) => {
        if (Math.abs(a.length - b.length) > max) return max + 1;
        let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
        for (let i = 1; i <= a.length; i++) {
            const cur = [i];
            let best = cur[0];
            for (let j = 1; j <= b.length; j++) {
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
                if (cur[j] < best) best = cur[j];
            }
            if (best > max) return max + 1;
            prev = cur;
        }
        return prev[b.length];
    };

    // درجة تطابق كلمة واحدة مع نص المنتج (0 = لا تطابق)
    function wordScore(w, hay, tokens) {
        if (hay.includes(w)) return 3;
        const base = stripAl(w);
        if (base !== w && hay.includes(base)) return 3;
        const syn = synMap.get(base) || synMap.get(w);
        if (syn && syn.some((x) => hay.includes(x))) return 2.5;
        if (base.length >= 4) {
            const max = base.length >= 7 ? 2 : 1;
            if (tokens.some((tk) => tk.length >= 3 && editDistance(base, stripAl(tk), max) <= max)) return 1.5;
            if (tokens.some((tk) => tk.length > base.length && tk.startsWith(base.slice(0, -1)))) return 1.2;
        }
        return 0;
    }

    V.searchIndex = function (v) {
        if (v._searchIndex) return v._searchIndex;
        v._searchIndex = v.products.map((p, i) => {
            const cat = V.catOf(v, p);
            const color = V.colorOf(v, p);
            const name = ATHR.normName([p.name, p.name_en].filter(Boolean).join(" "));
            const hay = ATHR.normName([p.name, p.name_en, p.description, p.description_en, cat && cat.name, cat && cat.name_en, color && color.name, color && color.name_en].filter(Boolean).join(" "));
            return { p, i, name, hay, tokens: hay.split(" ").filter(Boolean) };
        });
        return v._searchIndex;
    };

    // النتائج مرتبة من الأقرب. إن لم تتطابق كل الكلمات نعرض الأقرب لأي كلمة
    V.searchScored = function (v, q) {
        const term = ATHR.normName(q);
        if (!term) return { list: [], loose: false };
        const words = term.split(" ").filter(Boolean);
        const scoreOf = (row, all) => {
            let total = 0;
            for (const w of words) {
                const s = wordScore(w, row.hay, row.tokens);
                if (!s && all) return 0;
                total += s + (s && row.name.includes(stripAl(w)) ? 1 : 0);
            }
            return total;
        };
        const index = V.searchIndex(v);
        let rows = index.map((row) => ({ row, s: scoreOf(row, true) })).filter((x) => x.s > 0);
        let loose = false;
        if (!rows.length && words.length > 1) {
            rows = index.map((row) => ({ row, s: scoreOf(row, false) })).filter((x) => x.s > 0);
            loose = rows.length > 0;
        }
        rows.sort((a, b) => b.s - a.s || (b.row.p.is_available !== false) - (a.row.p.is_available !== false) || a.row.i - b.row.i);
        return { list: V.listings(v, rows.map((x) => x.row.p)), loose };
    };

    V.searchResults = (v, q) => V.searchScored(v, q).list;

    V.search = function (v, q, { sort = "default" } = {}) {
        const found = V.searchScored(v, q);
        const list = V.sortList(found.list, sort);
        const has = String(q || "").trim();
        return `<section class="catalog section" id="catalog">
            <div class="wrap">
                <div class="section-head">
                    <h1>${has ? `${esc(t("نتائج «{q}»", { q }))} <small class="muted">(${list.length})</small>` : esc(t("ابحث في المنتجات"))}</h1>
                    ${list.length ? V.sortSelect(v, sort) : ""}
                </div>
                ${V.curNote(v)}
                ${found.loose ? `<p class="search-loose">${esc(t("ما لقينا كل الكلمات، هذه أقرب النتائج:"))}</p>` : ""}
                ${!has ? `<div class="cat-chips search-chips">${v.categories.filter((c) => v.counts.get(c.id)).slice(0, 10).map((c) => `<a class="chip" href="${ATHR.url.category(c)}">${esc(V.cname(c))}</a>`).join("")}</div>` : ""}
                <div id="gridBox">${list.length ? V.grid(v, list) : `<div class="empty"><p>${esc(has ? t("لا توجد نتائج. جرّب اسم مادة أو موضوع أو قسم.") : t("اكتب اسم مادة أو موضوع في خانة البحث بالأعلى، مثل: تلوين، رياضيات، قصة."))}</p></div>`}</div>
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

    // شريط المزايا تحت صورة المنتج: الشحن المجاني (حسب إعداداتك الحقيقية) + الدفع عند الاستلام
    V.pdpPerks = function (v, p) {
        const cfg = v.cfg;
        if (cfg.sales.pdp_perks === false) return "";
        const items = [];
        const min = Number(cfg.order.free_min) || 0;
        if (ATHR.isDigital(cfg)) items.push([t("يصلك على واتساب بعد تأكيد الدفع"), true]);
        if (cfg.order.free_enabled && min > 0 && ATHR.freeAppliesTo(cfg, v.country)) {
            items.push([Number(p.price) >= min ? t("الشحن مجاناً") : t("شحن مجاني فوق {amount}", { amount: ATHR.trimZeros(local(v, min)) }), true]);
        }
        const pays = ATHR.paymentsFor(cfg, v.country);
        if (pays.some((x) => x.type === "cod")) items.push([t("الدفع عند الاستلام")]);
        (ct(v, "sales.trust_custom") || []).filter(Boolean).forEach((x) => items.push([fill(v, x)]));
        if (items.length < 2 && !ATHR.isDigital(cfg)) {
            const gulf = (cfg.order.delivery || []).some((d) => d.enabled && Array.isArray(d.countries) && d.countries.some((x) => x !== "OM"));
            items.push([gulf ? t("توصيل لكل دول الخليج") : t("توصيل داخل سلطنة عُمان")]);
        }
        const inner = items.slice(0, 2).map(([x, hot]) => `<span class="perk${hot ? " hot" : ""}">${ICON.check}<span>${esc(x)}</span></span>`).join('<i class="perk-sep" aria-hidden="true"></i>');
        return cfg.contact.policy_show
            ? `<a class="perks" href="${ATHR.url.page("shipping")}">${inner}<span class="perks-go">${ICON.chevron}</span></a>`
            : `<div class="perks">${inner}</div>`;
    };

    // السعر قبل وبعد الخصم + شارة «خصم %» + «وفّر» + «الأكثر طلباً»
    V.pdpPrice = function (v, p) {
        const sale = Number(p.old_price) > Number(p.price);
        const pct = sale ? Math.round((1 - p.price / p.old_price) * 100) : 0;
        const chips = [];
        if (sale) {
            chips.push(`<span class="pchip off">${esc(t("خصم {pct}%", { pct }))}</span>`);
            chips.push(`<span class="pchip save">${esc(t("وفّر {amount}", { amount: local(v, Math.round((p.old_price - p.price) * 1000) / 1000) }))}</span>`);
        }
        const low = V.lowStock(v, p);
        if (low) chips.push(`<span class="pchip hot">⏳ ${esc(t("باقي {n} فقط", { n: low }))}</span>`);
        else if (p.is_best_seller && p.is_available !== false) chips.push(`<span class="pchip hot">🔥 ${esc(ATHR.isEn() ? "Best seller" : ct(v, "sales.best_title") || t("الأكثر طلباً"))}</span>`);
        const pts = p.is_available === false ? 0 : ATHR.pointsFor(p.price, v.cfg);
        if (pts > 0) chips.push(`<span class="pchip pts">⭐ ${esc(t("تكسب {pts}", { pts: ATHR.pointsText(pts) }))}</span>`);
        return `<div class="pdp-price">
            <div class="pp-row">${sale ? `<s class="pp-was">${local(v, p.old_price)}</s>` : ""}<b class="pp-now">${local(v, p.price)}</b></div>
            ${isBase(v) ? "" : `<small class="base-price">${money(v, p.price)}</small>`}
            ${chips.length ? `<div class="pp-chips">${chips.join("")}</div>` : ""}
        </div>`;
    };

    V.galleryStage = function (v, p) {
        const label = V.label(v, p);
        return `<div class="stage">${p.image_url ? `<img src="${esc(V.big(p))}" alt="${esc(label)}" fetchpriority="high" width="800" height="1000">` : ""}</div>`;
    };

    // =====================================================
    // صفحة القصة (مثل Kasaty): «بيانات التخصيص» في نفس الصفحة
    // الاسم والعمر وولد/بنت، صورة الطفل، الهوايات ورسالة القصة، النوع والاستلام، تغليف الهدية والإهداء
    // =====================================================
    V.STORY_PAGES = 15;
    V.storyShort = (p) => V.pname(p).replace(/^قصة باسم طفلك:\s*/, "");
    V.storyBlurb = (p) => String(L(p, "description") || "").split("\n")[0].trim();

    // حالة النموذج: من القصة في السلة، أو آخر طفل كتبه الزبون على هذا الجهاز
    V.sfState = function (v, p) {
        const inCart = v.cartCustom(p.id);
        const saved = inCart || v.savedChild() || {};
        const c = inCart || {};
        return {
            pid: p.id,
            name: saved.name || "",
            g: saved.g === "f" || saved.g === "m" ? saved.g : "",
            age: Number(saved.age) || 0,
            likes: Array.isArray(saved.likes) ? saved.likes.slice(0, 2) : [],
            lesson: saved.lesson || "",
            tier: c.tier === "pro" ? "pro" : "std",
            fmt: c.fmt === "print" ? "print" : "pdf",
            wrap: Boolean(c.wrap),
            ded_on: Boolean(c.ded),
            ded_t: c.ded_t || "d1",
            ded: c.ded_t === "own" ? c.ded || "" : "",
            ded_from: c.ded_from || "",
            // صورة القصة في السلة، أو آخر صورة رُفعت على هذا الجهاز خلال أسبوع (لقصة ثانية لنفس الطفل)
            photo_path: inCart ? c.photo_path || "" : (saved.photo_path && Date.now() - (Number(saved.photo_at) || 0) < 7 * 864e5 ? saved.photo_path : ""),
            hijab: saved.hijab !== false,
            note: c.note || "", family: c.family || "", friend: c.friend || "",
            edit: Boolean(inCart),
            more: Boolean((saved.likes && saved.likes.length) || saved.lesson),
            up: null
        };
    };

    // بيانات القصة النهائية من حالة النموذج (نفس شكل السلة والطلب)
    V.sfCustom = function (v, p, st) {
        const cfg = v.cfg;
        const sc = ATHR.storyCfg(cfg);
        return ATHR.storyClean({
            name: st.name, g: st.g, age: st.age, likes: st.likes, lesson: st.lesson,
            tier: st.tier === "pro" && ATHR.proOn(cfg, p.story) ? "pro" : "std",
            fmt: st.fmt === "print" && ATHR.printOn(cfg, v.country) ? "print" : "pdf",
            wrap: st.wrap && sc.wrap_enabled !== false,
            ded_t: st.ded_on && sc.ded_enabled !== false ? st.ded_t : "",
            ded: st.ded, ded_from: st.ded_from,
            photo_path: sc.photo_upload !== false ? st.photo_path : "",
            hijab: st.hijab, note: st.note, family: st.family, friend: st.friend
        });
    };

    V.sfPhoto = function (v, p, st) {
        const pro = st.tier === "pro";
        const up = st.up || {};
        const thumb = up.thumb || (st.photo_path ? v.photoThumb(st.photo_path) : "");
        const tips = [["ok", "😊", t("الوجه واضح")], ["ok", "☀️", t("إضاءة جيدة")], ["no", "🕶️", t("بدون نظارة شمسية")], ["no", "👥", t("شخص واحد فقط")]];
        const input = `<input type="file" id="sfPhoto" name="sf_photo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden>`;
        let box;
        if (up.busy) {
            box = `<div class="sf-ph busy">${thumb ? `<img src="${esc(thumb)}" alt="" width="72" height="72">` : `<span class="sf-ph-e">📷</span>`}<div><b>${esc(t("نرفع الصورة…"))}</b><span class="sf-ph-bar"><i></i></span></div></div>`;
        } else if (st.photo_path || (thumb && up.err)) {
            box = `<div class="sf-ph${up.err ? " bad" : ""}">${thumb ? `<img src="${esc(thumb)}" alt="${esc(t("صورة الطفل"))}" width="72" height="72">` : `<span class="sf-ph-e">📷</span>`}<div>
                <b>${up.err ? esc(up.err) : `✓ ${esc(t("تم رفع الصورة"))}`}</b>
                <small>${esc(up.err ? t("الصورة ما وصلتنا بعد") : pro ? t("نرسم طفلك منها في كل صفحة") : t("تظهر على غلاف القصة"))}</small>
                <span class="sf-ph-act"><label class="link-btn" for="sfPhoto">${esc(up.err ? t("جرّب مرة ثانية") : t("تغيير الصورة"))}</label><button type="button" class="link-btn danger" data-sf="photo-del">${esc(t("حذف"))}</button></span>
            </div></div>`;
        } else {
            box = `<label class="sf-up${up.err ? " bad" : ""}" for="sfPhoto">
                <span class="sf-up-e" aria-hidden="true">📷</span>
                <b>${esc(t("ارفع صورة طفلك"))}</b>
                <small>${esc(up.err || (pro ? t("مطلوبة: نرسم طفلك بوجهه منها") : t("اختياري: نضعها على غلاف القصة")))}</small>
            </label>`;
        }
        return `<div class="sf-f" id="sfPhotoF">
            <span class="sf-l">${esc(t("صورة الطفل"))} ${pro ? `<i>*</i>` : `<small>${esc(t("(اختياري)"))}</small>`}</span>
            ${box}${input}
            <ul class="sf-tips">${tips.map(([k, e, x]) => `<li class="${k}"><span aria-hidden="true">${e}</span><b aria-hidden="true">${k === "ok" ? "✓" : "✕"}</b>${esc(x)}</li>`).join("")}</ul>
            <p class="sf-safe">🔒 ${esc(t("الصورة خاصة: لا يراها غيرنا، ونستخدمها لقصة طفلك فقط، ونحذفها بعد التسليم."))}</p>
        </div>`;
    };

    V.storyFields = function (v, p, st) {
        const cfg = v.cfg;
        const sc = ATHR.storyCfg(cfg);
        const pro = ATHR.proOn(cfg, p.story);
        const print = ATHR.printOn(cfg, v.country);
        const G = (m, f) => (st.g === "f" ? f : m);
        const name = ATHR.storyClean({ name: st.name }).name || G(t("طفلك"), t("طفلتك"));
        const lessons = (k) => ATHR.STORY_LESSONS.filter((l) => l.k === k).map((l) => `<option value="${l.id}"${st.lesson === l.id ? " selected" : ""}>${l.e} ${esc(t(l.t))}</option>`).join("");
        const opt = (attr, val, on, e, title, sub, price, extra = "") => `<button type="button" class="sf-opt${on ? " on" : ""}${extra}" ${attr}="${val}" aria-pressed="${on}">
            <span class="sf-opt-e" aria-hidden="true">${e}</span>
            <span class="sf-opt-t"><b>${esc(title)}</b><small>${esc(sub)}</small></span>
            <span class="sf-opt-p">${price}</span>
        </button>`;
        const ship = (cfg.order.delivery || []).find((d) => d.enabled && d.type !== "digital" && ATHR.inCountries(d, v.country));
        const dedQ = st.ded_t === "own" ? "" : ATHR.dedText(st.ded_t, { name, g: st.g });
        return `<div class="sf-f${st.bad === "name" ? " bad" : ""}" id="sfNameF">
                <label class="sf-l" for="sfName">${esc(t("اسم الطفل"))} <i>*</i></label>
                <input class="input" id="sfName" name="sf_name" maxlength="22" autocomplete="off" autocapitalize="words" enterkeyhint="done" placeholder="${esc(G(t("مثال: محمد"), t("مثال: سارة")))}" value="${esc(st.name)}">
                <small class="sf-hint">${esc(t("يظهر على الغلاف وفي كل صفحة، تأكد من الإملاء"))}</small>
            </div>
            <div class="sf-f${st.bad === "g" ? " bad" : ""}" id="sfGF">
                <span class="sf-l">${esc(t("ولد أو بنت؟"))} <i>*</i></span>
                <div class="sf-g2">${[["m", "👦", t("ولد")], ["f", "👧", t("بنت")]].map(([val, e, label]) => `<button type="button" class="sf-gc${st.g === val ? " on" : ""}" data-sf-g="${val}" aria-pressed="${st.g === val}"><span aria-hidden="true">${e}</span><b>${esc(label)}</b></button>`).join("")}</div>
            </div>
            <div class="sf-f${st.bad === "age" ? " bad" : ""}" id="sfAgeF">
                <label class="sf-l" for="sfAge">${esc(t("العمر"))} <i>*</i></label>
                <select class="input" id="sfAge" name="sf_age"><option value="">${esc(t("اختر العمر"))}</option>${ATHR.STORY_AGES.map((a) => `<option value="${a}"${st.age === a ? " selected" : ""}>${esc(ATHR.ageText(a))}</option>`).join("")}</select>
            </div>
            ${sc.photo_upload !== false ? V.sfPhoto(v, p, st) : ""}
            <details class="sf-more" id="sfMore"${st.more ? " open" : ""}>
                <summary><span>✨ ${esc(t("خصّصها أكثر"))}</span><small>${esc(t("هواياته ورسالة القصة · اختياري"))}</small></summary>
                <div class="sf-f">
                    <span class="sf-l">${esc(G(t("ماذا يحب {name}؟", { name }), t("ماذا تحب {name}؟", { name })))} <small>${esc(t("(شيئين على الأكثر)"))}</small></span>
                    <div class="sf-chips">${ATHR.STORY_LIKES.map((l) => {
                        const on = st.likes.includes(l.id);
                        return `<button type="button" class="sf-chip${on ? " on" : ""}" data-sf-like="${l.id}" aria-pressed="${on}"${!on && st.likes.length >= 2 ? " disabled" : ""}><span aria-hidden="true">${l.e}</span> ${esc(t(l.t))}</button>`;
                    }).join("")}</div>
                </div>
                <div class="sf-f">
                    <label class="sf-l" for="sfLesson">${esc(t("رسالة القصة"))}</label>
                    <select class="input" id="sfLesson" name="sf_lesson">
                        <option value="">${esc(t("رسالة القصة الأصلية"))}</option>
                        <optgroup label="${esc(t("قيم وأخلاق"))}">${lessons("v")}</optgroup>
                        <optgroup label="${esc(t("عادات يومية"))}">${lessons("h")}</optgroup>
                    </select>
                    <small class="sf-hint">${esc(t("نكتبها في نهاية القصة وفي شهادة البطل"))}</small>
                </div>
            </details>
            ${pro ? `<div class="sf-f">
                <span class="sf-l">${esc(t("نوع القصة"))}</span>
                <div class="sf-opts">
                    ${opt("data-sf-tier", "std", st.tier !== "pro", "📖", t("قصة جاهزة باسمه"), t("رسومات القصة الجميلة، و{name} البطل باسمه", { name }), local(v, p.price))}
                    ${opt("data-sf-tier", "pro", st.tier === "pro", "🌟", t("مؤلفة خصيصاً بوجهه"), `${t("نرسمه من صورته في كل صفحة")} · ${sc.pro_time}`, "+" + local(v, Number(sc.pro_price) || 0), " pro")}
                </div>
                ${st.tier === "pro" ? `<div class="sf-pro">
                    ${st.g === "f" ? `<div class="sf-f"><span class="sf-l">${esc(t("الحجاب في الرسومات"))}</span><div class="sf-seg2">
                        <button type="button" class="sf-chip${st.hijab ? " on" : ""}" data-sf-hijab="1" aria-pressed="${st.hijab}">${esc(t("بالحجاب"))}</button>
                        <button type="button" class="sf-chip${st.hijab ? "" : " on"}" data-sf-hijab="0" aria-pressed="${!st.hijab}">${esc(t("بدون حجاب"))}</button>
                    </div></div>` : ""}
                    <label class="sf-f"><span class="sf-l">${esc(t("أسماء الأسرة في القصة"))} <small>${esc(t("(اختياري)"))}</small></span><input class="input" name="sf_family" maxlength="120" autocomplete="off" placeholder="${esc(t("مثال: ماما مريم، بابا خالد، أخته لين"))}" value="${esc(st.family)}"></label>
                    <label class="sf-f"><span class="sf-l">${esc(G(t("صديقه المفضّل"), t("صديقتها المفضّلة")))} <small>${esc(t("(اختياري)"))}</small></span><input class="input" name="sf_friend" maxlength="60" autocomplete="off" placeholder="${esc(G(t("مثال: سالم"), t("مثال: ريم")))}" value="${esc(st.friend)}"></label>
                    <label class="sf-f"><span class="sf-l">${esc(t("تفاصيل خاصة"))} <small>${esc(t("(اختياري)"))}</small></span><textarea class="input" name="sf_note" rows="2" maxlength="200" placeholder="${esc(G(t("مثال: يلبس نظارة، يحب الديناصورات"), t("مثال: تلبس نظارة، تحب الفراشات")))}">${esc(st.note)}</textarea></label>
                </div>` : ""}
            </div>` : ""}
            ${print ? `<div class="sf-f">
                <span class="sf-l">${esc(t("كيف تصلك القصة؟"))}</span>
                <div class="sf-opts two">
                    ${opt("data-sf-fmt", "pdf", st.fmt !== "print", "📱", t("ملف PDF"), t("على واتساب خلال ساعات"), esc(t("ضمن السعر")))}
                    ${opt("data-sf-fmt", "print", st.fmt === "print", "📦", t("كتاب مطبوع"), `${t("غلاف مقوّى + PDF")} · ${sc.print_time}`, "+" + local(v, Number(sc.print_price) || 0))}
                </div>
                ${st.fmt === "print" && ship && Number(ship.price) > 0 ? `<small class="sf-hint">🚚 ${esc(t("التوصيل {price} يُضاف في صفحة الطلب", { price: local(v, ship.price) }))}</small>` : ""}
            </div>` : ""}
            ${print && st.fmt === "print" && sc.wrap_enabled !== false ? `<label class="sf-check${st.wrap ? " on" : ""}">
                <input type="checkbox" name="sf_wrap"${st.wrap ? " checked" : ""}>
                <span class="sf-check-e" aria-hidden="true">🎁</span>
                <span class="sf-check-t"><b>${esc(t("تغليف هدية"))}</b><small>${esc(t("نغلّف الكتاب بورق هدايا وشريطة، جاهز للإهداء"))}</small></span>
                <em>${esc(t("مجاناً"))}</em>
            </label>` : ""}
            ${sc.ded_enabled !== false ? `<label class="sf-check${st.ded_on ? " on" : ""}">
                <input type="checkbox" name="sf_ded_on"${st.ded_on ? " checked" : ""}>
                <span class="sf-check-e" aria-hidden="true">💌</span>
                <span class="sf-check-t"><b>${esc(t("إهداء في أول صفحة"))}</b><small>${esc(t("رسالة منك يقرؤها طفلك كل مرة"))}</small></span>
                <em>${esc(t("مجاناً"))}</em>
            </label>
            ${st.ded_on ? `<div class="sf-ded${st.bad === "ded" ? " bad" : ""}" id="sfDedF">
                <span class="sf-l">${esc(t("اختر إهداءً جاهزاً أو اكتب إهداءك"))}</span>
                <div class="sf-chips">${ATHR.STORY_DEDS.map((d) => `<button type="button" class="sf-chip${st.ded_t === d.id ? " on" : ""}" data-sf-ded="${d.id}" aria-pressed="${st.ded_t === d.id}"><span aria-hidden="true">${d.e}</span> ${esc(t(d.t))}</button>`).join("")}<button type="button" class="sf-chip${st.ded_t === "own" ? " on" : ""}" data-sf-ded="own" aria-pressed="${st.ded_t === "own"}">✍️ ${esc(t("اكتب إهداءك"))}</button></div>
                ${st.ded_t === "own"
                    ? `<textarea class="input" name="sf_ded" rows="3" maxlength="220" placeholder="${esc(t("اكتب رسالتك لطفلك هنا…"))}">${esc(st.ded)}</textarea><small class="sf-hint" id="sfDedLeft">${esc(t("{n} حرف متبقي", { n: 220 - String(st.ded || "").length }))}</small>`
                    : `<blockquote class="sf-ded-q" id="sfDedQ">${esc(dedQ)}</blockquote>`}
                <label class="sf-f"><span class="sf-l">${esc(t("من؟"))} <small>${esc(t("(يظهر تحت الإهداء)"))}</small></span><input class="input" name="sf_ded_from" maxlength="40" autocomplete="off" placeholder="${esc(t("مثال: ماما وبابا"))}" value="${esc(st.ded_from)}"></label>
            </div>` : ""}` : ""}`;
    };

    // ملخص السعر تحت النموذج
    V.storySum = function (v, p, st) {
        const cfg = v.cfg;
        const sc = ATHR.storyCfg(cfg);
        const c = V.sfCustom(v, p, st);
        const unit = ATHR.storyUnit(p, c, cfg);
        const rows = [[t("سعر القصة"), local(v, p.price)]];
        if (c.tier === "pro") rows.push([t("مؤلفة خصيصاً بوجهه"), "+" + local(v, Number(sc.pro_price) || 0)]);
        if (c.fmt === "print") rows.push([t("كتاب مطبوع بغلاف مقوّى"), "+" + local(v, Number(sc.print_price) || 0)]);
        if (c.wrap) rows.push([t("تغليف هدية"), `<span class="free">${esc(t("مجاناً"))}</span>`]);
        if (c.ded) rows.push([t("الإهداء"), `<span class="free">${esc(t("مجاناً"))}</span>`]);
        rows.push([t("هدايا: شهادة البطل وملصقات وتلوين"), `<span class="free">${esc(t("مجاناً"))}</span>`]);
        return `${Number(p.old_price) > Number(p.price) ? `<div class="sf-sum-save">🎉 ${esc(t("وفّرت {amount}", { amount: local(v, Math.round((p.old_price - p.price) * 1000) / 1000) }))}</div>` : ""}
            ${rows.map(([a, b]) => `<div><span>${esc(a)}</span><b>${b}</b></div>`).join("")}
            <div class="tot"><span>${esc(t("الإجمالي"))}</span><b>${local(v, unit)}</b></div>`;
    };

    // صندوق «بيانات التخصيص» كاملاً (يحل محل زر الشراء في صفحة القصة)
    V.storyForm = function (v, p, st = V.sfState(v, p)) {
        const sc = ATHR.storyCfg(v.cfg);
        const name = ATHR.storyClean({ name: st.name }).name;
        return `<section class="sf-box buy has-story" id="buyBox" data-sf-for="${esc(p.id)}" aria-labelledby="sf-t">
            <div class="sf-head" id="personalize"><h2 id="sf-t">✏️ ${esc(t("بيانات التخصيص"))}</h2><small>${esc(t("املأ بيانات طفلك، وشوف القصة باسمه قبل الطلب"))}</small></div>
            <div id="sfFields">${V.storyFields(v, p, st)}</div>
            <div class="sf-prev" id="storyPrev">
                <div class="sf-prev-head"><b id="sfPrevT">👀 ${esc(name ? t("قصة {name}", { name }) : t("معاينة القصة"))}</b><small id="stPrevNote"></small></div>
                <div class="sf-pages" id="storyPages" aria-live="polite"></div>
            </div>
            <div class="sf-sum" id="sfSum">${V.storySum(v, p, st)}</div>
            <p class="sf-err" id="sfErr" role="alert" hidden></p>
            <button class="btn btn-primary btn-block sf-add" type="button" data-sf="add">🛒 ${esc(st.edit ? t("حفظ التعديل") : t("أضف إلى السلة"))}</button>
            <button class="btn btn-ghost btn-block sf-buy" type="button" data-sf="buy">${esc(t("اطلب الآن"))} ←</button>
            ${sc.guarantee ? `<p class="sf-guard">🛡️ <span><b>${esc(t("ضمان الرضا"))}</b> ${esc(t("إذا ما عجبتك القصة نعدّلها مجاناً، أو نرجّع لك المبلغ كاملاً."))}</span></p>` : ""}
        </section>`;
    };

    // سطر صغير ببيانات الطفل تحت القصة في السلة
    V.storyMeta = function (v, p, c) {
        if (!ATHR.isStory(p)) return "";
        const href = `${ATHR.url.product(p)}#personalize`;
        if (!c || !c.name) return `<a class="cl-story warn" href="${href}">✎ ${esc(t("اكتب اسم طفلك"))}</a>`;
        const kind = ATHR.storyKind(c);
        return `<span class="cl-story">👶 ${esc(c.name)} · ${esc(c.g === "f" ? t("بنت") : t("ولد"))}${c.age ? ` · ${esc(ATHR.ageText(c.age))}` : ""}${kind ? ` · <b>${esc(kind)}</b>` : ""} <a class="link-btn" href="${href}">${esc(t("تعديل"))}</a></span>`;
    };

    V.buyBox = function (v, p) {
        const cfg = v.cfg;
        if (p.is_available === false) {
            if (cfg.sales.restock !== false) {
                return `<div class="buy out" id="buyBox">
                    <div class="out-note">${esc(ct(v, "texts.sold_out"))}. ${esc(t("نخبرك على واتساب أول ما يتوفر."))}</div>
                    <button class="btn btn-primary btn-block" type="button" data-notify="${esc(p.id)}">${ICON.bell}${esc(t("أخبرني عند التوفر"))}</button>
                </div>`;
            }
            return `<div class="out-note" id="buyBox">${esc(ct(v, "texts.sold_out"))}. ${ATHR.isValidWhatsapp(cfg.order.whatsapp) ? esc(t("تواصل معنا لمعرفة موعد توفره.")) : ""}</div>`;
        }
        const wa = ATHR.isValidWhatsapp(cfg.order.whatsapp) && cfg.sales.wa_quick;
        const buyNow = cfg.sales.buy_now;
        const story = ATHR.isStory(p);
        const single = story || V.maxFor(v, p) <= 1;
        if (story) return V.storyForm(v, p);
        return `<div class="buy${single ? " single-qty" : ""}" id="buyBox">
            <div class="buy-row">
                <div class="stepper lg" role="group" aria-label="${esc(t("الكمية"))}"${single ? " hidden" : ""}>
                    <button type="button" data-pdp-step="1" aria-label="${esc(t("زيادة"))}">+</button>
                    <output id="pdpQty" aria-live="polite">1</output>
                    <button type="button" data-pdp-step="-1" aria-label="${esc(t("إنقاص"))}">−</button>
                </div>
                <button class="btn btn-primary" type="button" data-pdp-add="${esc(p.id)}">${esc(story ? t("أضف القصة للسلة") : ct(v, "texts.add_to_cart"))}</button>
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
        if (!stats && ATHR.isStory(p)) return "";
        const writeHref = ATHR.url.page("review", `p=${encodeURIComponent(p.slug || p.id)}`);
        return `<section class="section reviews-block" id="reviews" aria-labelledby="pr-t">
            <div class="section-head"><h2 id="pr-t">${esc(t("تقييمات العملاء"))}</h2></div>
            ${stats ? `<div class="rate-summary"><b>${stats.avg.toFixed(1)}</b>${V.stars(stats.avg)}<span>${esc(V.reviewCount(stats.count))}</span></div>
                <div class="review-list">${list.slice(0, 6).map((r) => V.reviewCard(v, r)).join("")}</div>`
            : `<p class="muted">${esc(ATHR.isDigital(v.cfg) ? t("لا توجد تقييمات لهذه القصة بعد. اشتريتها؟ شاركنا رأيك.") : t("لا توجد تقييمات لهذا التصميم بعد. اشتريته؟ شاركنا رأيك."))}</p>`}
            <a class="btn btn-ghost btn-sm" href="${writeHref}" rel="nofollow">${esc(t("اكتب تقييمك"))}</a>
        </section>`;
    };

    // الوصف: فقرات، والأسطر التي تبدأ بـ • أو - تصير قائمة «يحتوي الملف على»
    V.descHTML = function (desc) {
        const lines = String(desc || "").split("\n").map((x) => x.trim()).filter(Boolean);
        const paras = lines.filter((x) => !/^[•\-–]\s*/.test(x));
        const items = lines.filter((x) => /^[•\-–]\s*/.test(x)).map((x) => x.replace(/^[•\-–]\s*/, ""));
        return `${paras.map((x) => `<p class="pdp-desc">${esc(x)}</p>`).join("")}${items.length ? `<ul class="pdp-inc">${items.map((x) => `<li>${ICON.check}<span>${esc(x)}</span></li>`).join("")}</ul>` : ""}`;
    };

    // صفحة القصة (مثل Kasaty): المعرض، العنوان والسعر، 3 خطوات، شارات، ثم «بيانات التخصيص»
    V.storyProduct = function (v, p) {
        const cfg = v.cfg;
        const sc = ATHR.storyCfg(cfg);
        const stats = V.reviewStats(v.reviewsByProduct.get(p.id));
        const desc = V.description(v, p);
        const print = ATHR.printOn(cfg, v.country);
        const related = V.listings(v, v.products.filter((x) => ATHR.isStory(x) && x.id !== p.id && x.is_available !== false)).slice(0, 6);
        const how = [
            sc.photo_upload !== false ? ["📷", t("ارفع صورة طفلك")] : ["✏️", t("اكتب اسم طفلك")],
            ["✨", sc.photo_upload !== false ? t("نضيف اسمه وصورته") : t("نكتب القصة باسمه")],
            [print ? "📦" : "📱", print ? t("تصلك PDF أو مطبوعة") : t("تصلك على واتساب")]
        ];
        const badges = [`📄 ${t("{n} صفحة", { n: V.STORY_PAGES })}`, `🧒 ${t("من 3 إلى 8 سنوات")}`, `🎁 ${t("هدايا مجانية")}`];
        return `${V.crumbs([{ name: t("الرئيسية"), href: ATHR.url.home() }, { name: V.storyShort(p) }])}
            <div class="wrap">
                <div class="pdp ks-pdp">
                    <div class="gallery" id="gallery">${V.galleryStage(v, p)}</div>
                    <div class="pdp-info">
                        <div class="pdp-title"><h1>${esc(V.pname(p))}</h1>${V.favBtn(v, p)}</div>
                        ${stats ? `<a class="pdp-rate" href="#reviews">${V.stars(stats.avg)}<span>${stats.avg.toFixed(1)} · ${esc(V.reviewCount(stats.count))}</span></a>` : ""}
                        ${V.pdpPrice(v, p)}
                        ${V.storyBlurb(p) ? `<p class="ks-lead">${esc(V.storyBlurb(p))}</p>` : ""}
                        <ol class="ks-how">${how.map(([e, x], i) => `<li><span class="ks-how-e" aria-hidden="true">${e}</span><small>${i + 1}</small><b>${esc(x)}</b></li>`).join("")}</ol>
                        <ul class="ks-badges">${badges.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
                        <button class="ks-flipbtn" type="button" data-flip="${esc(p.id)}"><span aria-hidden="true">📖</span><span><b>${esc(t("تصفّح القصة كاملة"))}</b><small>${esc(t("اقرأها صفحة صفحة قبل ما تطلب"))}</small></span><span aria-hidden="true">←</span></button>
                        ${p.is_available === false ? V.buyBox(v, p) : V.storyForm(v, p)}
                        ${V.deliveryBox(v, p)}
                        ${desc ? `<details class="ks-more"><summary>${esc(t("تفاصيل القصة"))}</summary>${V.descHTML(desc)}</details>` : ""}
                        <div class="share-row">
                            <button class="link-btn" type="button" data-share-product="${esc(p.id)}">${ICON.share} ${esc(t("شارك القصة مع صديق"))}</button>
                        </div>
                    </div>
                </div>
                ${V.productReviews(v, p)}
            </div>
            ${related.length ? V.rail(v, { id: "related", title: t("قصص أخرى لطفلك"), items: related }) : ""}`;
    };

    V.product = function (v, p) {
        if (ATHR.isStory(p)) return V.storyProduct(v, p);
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
                        ${V.pdpPerks(v, p)}
                        <div class="pdp-title"><h1>${esc(V.pname(p))}</h1>${V.favBtn(v, p)}</div>
                        ${desc ? V.descHTML(desc) : ""}
                        ${stats ? `<a class="pdp-rate" href="#reviews">${V.stars(stats.avg)}<span>${stats.avg.toFixed(1)} · ${esc(V.reviewCount(stats.count))}</span></a>` : ""}
                        ${V.pdpPrice(v, p)}
                        ${V.pdpProof(v, p)}
                        ${v.groups.get(p.id) ? V.variantPicker(v, p) : (V.colorOf(v, p) ? `<div class="pdp-color">${esc(t("اللون:"))} ${V.colorTag(v, p)}</div>` : "")}
                        ${V.buyBox(v, p)}
                        ${p.is_available === false ? "" : V.volumeTeaser(v)}
                        ${V.bundleOffers(v, p)}
                        ${V.deliveryBox(v, p)}
                        ${V.trust(v)}
                        ${p.video_url && ATHR.isUrl(p.video_url) ? `<div class="pdp-details">
                            <a class="btn btn-ghost btn-sm" href="${esc(p.video_url)}" target="_blank" rel="noopener">▶ ${esc(t("شاهد فيديو المنتج"))}</a>
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
        const digital = ATHR.isDigital(cfg);
        const faq = (ct(v, "contact.faq") || []).filter((x) => x && x.q && x.a);
        return `${V.crumbs([{ name: t("الرئيسية"), href: ATHR.url.home() }, { name: title }])}
            <article class="wrap page policy">
                <h1>${esc(title)}</h1>
                <h2>${esc(digital ? t("طريقة الاستلام") : t("طرق التوصيل وأسعارها"))}</h2>
                ${delivery.map((d) => {
                    const list = V.flagsFor(v, d);
                    const note = L(d, "note");
                    return `<p><b>${esc(L(d, "name"))}</b>: ${esc(V.deliveryPriceLabel(v, d))}${d.duration ? esc(t("، المدة {d}", { d: ATHR.duration(d.duration) })) : ""}${list.length && list.length < enabledCount ? `<br><span class="muted">${esc(t("إلى: {countries}", { countries: V.countriesText(list) }))}</span>` : ""}${note ? `<br><span class="muted">${esc(note)}</span>` : ""}</p>`;
                }).join("")}
                ${free ? `<p>${esc(free)}</p>` : ""}
                ${digital ? `<p class="muted">${esc(t("القصة ملف PDF يفتح على أي جوال أو كمبيوتر، وتطبعه في البيت أو في أي مكتبة."))}</p>` : `<p class="muted">${esc(t("نوصّل لكل ولايات سلطنة عُمان."))}</p>`}
                <h2>${esc(t("طرق الدفع"))}</h2>
                ${V.paymentGroups(v).map((g) => `<p>${g.countries.length < enabledCount ? `<b>${esc(V.countriesText(g.countries))}:</b> ` : ""}${esc(g.names)}</p>`).join("")}
                ${(cfg.order.payments || []).filter((p) => p.enabled && L(p, "note")).map((p) => `<p class="muted">${esc(L(p, "name"))}: ${esc(fill(v, L(p, "note")))}</p>`).join("")}
                ${custom.length ? `<h2>${esc(t("ضماننا لك"))}</h2>${custom.map((x) => `<p>${esc(fill(v, x))}</p>`).join("")}` : ""}
                <h2>${esc(t("كيف أطلب؟"))}</h2>
                <ol>
                    <li>${esc(digital ? t("اختر القصة واكتب اسم طفلك، وأضفها للسلة.") : t("اختر تصميمك وأضفه للسلة."))}</li>
                    <li>${esc(digital ? t("اكتب اسمك ورقم واتساب واختر طريقة الدفع، بدون تسجيل حساب.") : t("اكتب اسمك ورقمك وعنوانك واختر طريقة التوصيل والدفع، بدون تسجيل حساب."))}</li>
                    <li>${esc(digital ? t("أرسل الطلب عبر واتساب بضغطة، وبعد تأكيد الدفع نرسل لك القصة في نفس المحادثة.") : t("أرسل الطلب عبر واتساب بضغطة، ونؤكده ونجهّزه لك."))}</li>
                </ol>
                ${faq.length ? `<h2>${esc(t("أسئلة متكررة"))}</h2><div class="faq-list">${faq.map((x) => `<details class="faq-item"><summary>${esc(x.q)}</summary><p>${esc(fill(v, x.a))}</p></details>`).join("")}</div>` : ""}
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
        const points = ATHR.isDigital(cfg) ? [
            [V.icon.file, t("قصص PDF جاهزة للطباعة")],
            [V.icon.inbox, t("تصلك على واتساب")],
            [V.icon.card, cod ? t("الدفع عند الاستلام") : t("تحويل بنكي آمن")]
        ] : [
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

    // صفحة المفضلة
    V.favPage = function (v, ids) {
        const list = ids.map((id) => v.byId.get(id)).filter(Boolean);
        const avail = list.filter((p) => p.is_available !== false);
        return `<section class="catalog section fav-page" id="catalog">
            <div class="wrap">
                <div class="section-head">
                    <h1>${ICON.heart} ${esc(t("المفضلة"))} <small class="muted">(${list.length})</small></h1>
                    ${avail.length > 1 ? `<button class="btn btn-primary btn-sm" type="button" data-fav-all>${esc(t("أضف الكل للسلة"))}</button>` : ""}
                </div>
                ${list.length
                    ? `<p class="cat-desc">${esc(t("التصاميم التي أعجبتك محفوظة هنا على جهازك. ارجع لها متى ما تحب."))}</p><div id="gridBox">${V.grid(v, list)}</div>`
                    : `<div class="empty"><span class="fav-empty" aria-hidden="true">${ICON.heart}</span><p>${esc(t("لا توجد منتجات في المفضلة بعد. اضغط ♡ على أي تصميم يعجبك لتحفظه هنا."))}</p><a class="btn btn-primary" href="${ATHR.url.home()}">${esc(t("تصفّح المنتجات"))}</a></div>`}
            </div>
        </section>`;
    };

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
            case "fav": return `${t("المفضلة")} | ${name}`;
            case "points": return `${t("نقاطي")} | ${name}`;
            case "gift": return `${t("🎁 وصلتك هدية")} | ${name}`;
            default: {
                const seo = ct(v, "seo.home_title");
                return seo || `${name} | ${fill(v, ct(v, "texts.hero_title"))}`;
            }
        }
    };
})(typeof window !== "undefined" ? window : globalThis);
