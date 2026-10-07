#!/usr/bin/env node
/* =====================================================
   ATHR STORE — بناء صفحات المتجر لجوجل
   ينشئ صفحة HTML حقيقية لكل منتج وقسم من بيانات Supabase،
   مع العنوان والوصف وبيانات المنتج المنظمة (السعر، التوفر،
   التوصيل، التقييمات) وخريطة الموقع، وصورًا مصغّرة سريعة.

   الاستعمال:
     node tools/build.mjs                 ← يقرأ البيانات من Supabase
     node tools/build.mjs --data file.json
     node tools/build.mjs --site https://example.com/
     node tools/build.mjs --no-thumbs
===================================================== */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const OUT = path.resolve(args.out || ROOT);

function parseArgs(list) {
    const out = {};
    for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a.startsWith("--")) continue;
        const key = a.slice(2);
        const next = list[i + 1];
        if (next && !next.startsWith("--")) {
            out[key] = next;
            i++;
        } else {
            out[key] = true;
        }
    }
    return out;
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (p) => {
    try { fs.accessSync(p); return true; } catch { return false; }
};
const hashOf = (...parts) => crypto.createHash("md5").update(parts.join("\n")).digest("hex").slice(0, 10);

function writeFile(rel, content) {
    const file = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

// =====================================================
// DATA
// =====================================================

function supabaseConfig() {
    const src = read("js/supabase-config.js");
    const url = (src.match(/ATHR_SUPABASE_URL\s*=\s*"([^"]+)"/) || [])[1];
    const key = (src.match(/ATHR_SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/) || [])[1];
    if (!url || !key) throw new Error("لم أجد رابط Supabase في js/supabase-config.js");
    return { url, key };
}

async function fetchData() {
    const { url, key } = supabaseConfig();
    const rest = async (p) => {
        const res = await fetch(`${url}/rest/v1/${p}`, { headers: { apikey: key, Accept: "application/json" } });
        if (!res.ok) throw new Error(`${p.split("?")[0]}: HTTP ${res.status} ${await res.text()}`);
        return res.json();
    };
    const productCols = "id,name,slug,price,old_price,category_id,image_url,thumb_url,is_available,is_visible,is_best_seller,is_new_arrival,description,color_id,sort_order,video_url,weight_g,created_at";
    const [settings, categories, products, reviews, media] = await Promise.all([
        rest("store_settings?select=config&id=eq.1"),
        rest("categories?select=id,name,slug,sort_order,image_url,description&order=sort_order.asc"),
        rest(`products?select=${productCols}&is_visible=eq.true&order=sort_order.asc`),
        rest("reviews?select=id,product_id,name,rating,text,created_at&status=eq.approved&order=created_at.desc&limit=500").catch(() => []),
        rest("product_media?select=product_id,media_type,media_url,sort_order&order=sort_order.asc").catch(() => [])
    ]);
    return {
        config: (settings && settings[0] && settings[0].config) || {},
        categories: categories || [],
        products: products || [],
        reviews: reviews || [],
        media: media || []
    };
}

async function loadData() {
    if (args.data) return JSON.parse(fs.readFileSync(path.resolve(args.data), "utf8"));
    return fetchData();
}

// =====================================================
// SITE URL + BASE PATH
// =====================================================

function resolveSite(config) {
    if (typeof args.site === "string") return args.site.endsWith("/") ? args.site : `${args.site}/`;
    const cname = path.join(OUT, "CNAME");
    if (exists(cname)) {
        const host = fs.readFileSync(cname, "utf8").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (host) return `https://${host}/`;
    }
    const repo = process.env.GITHUB_REPOSITORY;
    if (repo && repo.includes("/")) {
        const [owner, name] = repo.split("/");
        const host = `${owner.toLowerCase()}.github.io`;
        return name.toLowerCase() === host ? `https://${host}/` : `https://${host}/${name}/`;
    }
    const share = String((config.contact && config.contact.share_url) || "").trim();
    if (/^https?:\/\//.test(share)) return share.endsWith("/") ? share : `${share}/`;
    return "https://a3r-om.github.io/ATHR/";
}

// =====================================================
// THUMBNAILS (صور خفيفة للجوال)
// =====================================================

async function makeThumbs(ATHR, urls) {
    const dir = path.join(OUT, "images/t");
    const unique = Array.from(new Set(urls.filter((u) => /^https?:\/\//i.test(u || ""))));
    const map = {};
    const have = (h) => exists(path.join(dir, `${h}.webp`)) && exists(path.join(dir, `${h}-m.webp`));

    let sharp = null;
    if (!args["no-thumbs"]) {
        try {
            sharp = (await import("sharp")).default;
        } catch {
            console.log("• مكتبة sharp غير مثبتة: أستعمل الصور المصغّرة الموجودة فقط");
        }
    }

    const todo = [];
    unique.forEach((url) => {
        const h = ATHR.hashStr(url);
        if (have(h)) map[h] = 1;
        else if (sharp) todo.push({ url, h });
    });

    if (sharp && todo.length) {
        fs.mkdirSync(dir, { recursive: true });
        let made = 0;
        let failed = 0;
        const worker = async () => {
            while (todo.length) {
                const { url, h } = todo.shift();
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const buf = Buffer.from(await res.arrayBuffer());
                    await sharp(buf).rotate().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toFile(path.join(dir, `${h}.webp`));
                    await sharp(buf).rotate().resize({ width: 960, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(dir, `${h}-m.webp`));
                    map[h] = 1;
                    made++;
                } catch (error) {
                    failed++;
                    console.warn(`  ! تعذر تصغير ${url}: ${error.message}`);
                }
            }
        };
        await Promise.all(Array.from({ length: 6 }, worker));
        console.log(`• صور مصغّرة جديدة: ${made}${failed ? ` (تعذر ${failed})` : ""}`);
    }

    // حذف الصور المصغّرة لمنتجات لم تعد موجودة (فقط عند توفر sharp)
    if (sharp && exists(dir)) {
        fs.readdirSync(dir).forEach((f) => {
            const h = f.replace(/(-m)?\.webp$/, "");
            if (!map[h]) fs.unlinkSync(path.join(dir, f));
        });
    }
    // ترتيب ثابت حتى لا يتغير الملف بدون سبب
    return Object.fromEntries(Object.keys(map).sort().map((k) => [k, 1]));
}

// =====================================================
// MAIN
// =====================================================

async function main() {
    const started = Date.now();
    const data = await loadData();

    // تشغيل ملفات المتجر نفسها (القوالب والحسابات) لتطابق الصفحة قبل وبعد التحميل
    const sandbox = { console, URL, URLSearchParams };
    vm.createContext(sandbox);
    vm.runInContext("var ATHR_BASE = '/';", sandbox);
    ["js/defaults.js", "js/views.js"].forEach((f) => vm.runInContext(read(f), sandbox, { filename: f }));
    const ATHR = sandbox.ATHR;
    const V = ATHR.views;
    const esc = ATHR.escape;

    const cfg = ATHR.fullConfig(data.config || {});
    const SITE = resolveSite(cfg);
    const BASE = new URL(SITE).pathname.replace(/\/?$/, "/");
    sandbox.ATHR_BASE = BASE;

    const products = ATHR.assignSlugs(
        (data.products || []).filter((p) => p.is_visible !== false).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        cfg
    );
    const categories = (data.categories || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const media = data.media || [];

    if (!products.length && !args["allow-empty"]) {
        throw new Error("لا توجد منتجات ظاهرة. أوقفت البناء حتى لا تُحذف صفحات المتجر بالخطأ (استعمل --allow-empty إن كان ذلك مقصودًا).");
    }

    // الصور المصغّرة
    const imageUrls = [];
    products.forEach((p) => { if (p.image_url) imageUrls.push(p.image_url); });
    media.filter((m) => m.media_type === "image").forEach((m) => imageUrls.push(m.media_url));
    categories.forEach((c) => { if (c.image_url) imageUrls.push(c.image_url); });
    const thumbs = await makeThumbs(ATHR, imageUrls);
    sandbox.ATHR_THUMBS = thumbs;
    writeFile("js/thumbs.js", `window.ATHR_THUMBS=${JSON.stringify(thumbs)};\n`);

    const v = V.ctx({ cfg, products, categories, reviews: data.reviews || [], country: ATHR.BASE_COUNTRY, prerender: true });
    const mediaBy = new Map();
    media.forEach((m) => {
        if (!mediaBy.has(m.product_id)) mediaBy.set(m.product_id, []);
        mediaBy.get(m.product_id).push(m);
    });

    const abs = (p) => ATHR.absUrl({ contact: { share_url: SITE } }, p);
    const absAsset = (src) => {
        if (!src) return "";
        if (/^https?:/i.test(src)) return src;
        return SITE + String(src).replace(/^\/+/, "").replace(new RegExp(`^${BASE.replace(/^\//, "")}`), "");
    };
    const fill = (t, extra) => ATHR.fill(t, cfg, extra);
    const name = cfg.name || "المتجر";
    const money = (n) => ATHR.money(n, cfg);
    const ldJson = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, " ");

    // ---------- نصوص الوصف ----------
    const enabled = ATHR.countries(cfg).filter((c) => c.enabled);
    const shipCountries = enabled.filter((c) => ATHR.deliveriesFor(cfg, c.code).length);
    const codCountries = enabled.filter((c) => ATHR.paymentsFor(cfg, c.code).some((p) => p.type === "cod"));
    const gulfAll = shipCountries.length === enabled.length && enabled.length > 1;
    const shipText = gulfAll ? "توصيل لكل دول الخليج" : shipCountries.length > 1 ? `توصيل إلى ${shipCountries.map((c) => c.name).join(" و")}` : "توصيل لكل محافظات عُمان";
    const freeText = cfg.order.free_enabled && Number(cfg.order.free_min) > 0
        ? (ATHR.freeAppliesTo(cfg, "OM") && !(enabled.every((c) => ATHR.freeAppliesTo(cfg, c.code))) ? `ومجاني داخل عُمان فوق ${money(cfg.order.free_min)}` : `ومجاني فوق ${money(cfg.order.free_min)}`)
        : "";
    const codText = codCountries.length
        ? `والدفع عند الاستلام${codCountries.length < shipCountries.length ? ` في ${codCountries.map((c) => c.code === "OM" ? "عُمان" : c.name).join(" و")}` : ""}`
        : "";
    const serviceLine = `${shipText}${freeText ? ` ${freeText}` : ""}${codText ? `، ${codText}` : ""}.`;

    const clamp = (text, max = 158) => {
        const t = String(text || "").replace(/\s+/g, " ").trim();
        if (t.length <= max) return t;
        const cut = t.slice(0, max - 1);
        const at = cut.lastIndexOf(" ");
        return `${(at > 80 ? cut.slice(0, at) : cut).replace(/[،,.:؛\s]+$/, "")}…`;
    };
    const designs = (n) => (n === 1 ? "تصميم واحد" : n === 2 ? "تصميمان" : n <= 10 ? `${n} تصاميم` : `${n} تصميمًا`);
    const endDot = (s) => (/[.!؟?…]$/.test(s) ? s : `${s}.`);

    // ---------- رأس الصفحة ----------
    const verification = String((cfg.seo && cfg.seo.google_verification) || "").trim()
        .replace(/^.*content=["']?([^"'\s>]+).*$/i, "$1");
    const logoAbs = absAsset(cfg.logo_url || ATHR.DEFAULTS.logo_url);
    const shareImage = absAsset("images/logo2.jpeg");

    function head(o) {
        const lines = [`<title>${esc(o.title)}</title>`];
        if (o.description) lines.push(`<meta name="description" content="${esc(o.description)}">`);
        if (o.robots) lines.push(`<meta name="robots" content="${o.robots}">`);
        if (o.canonical) lines.push(`<link rel="canonical" href="${esc(o.canonical)}">`);
        if (o.verify && verification) lines.push(`<meta name="google-site-verification" content="${esc(verification)}">`);
        if (!o.robots) {
            const img = o.image || shareImage;
            lines.push(
                `<meta property="og:site_name" content="${esc(name)}">`,
                `<meta property="og:locale" content="ar_OM">`,
                `<meta property="og:type" content="${o.ogType || "website"}">`,
                `<meta property="og:title" content="${esc(o.ogTitle || o.title)}">`,
                o.description ? `<meta property="og:description" content="${esc(o.description)}">` : "",
                `<meta property="og:url" content="${esc(o.canonical)}">`,
                `<meta property="og:image" content="${esc(img)}">`,
                o.imageAlt ? `<meta property="og:image:alt" content="${esc(o.imageAlt)}">` : "",
                `<meta name="twitter:card" content="summary_large_image">`
            );
            (o.ogExtra || []).forEach(([k, val]) => lines.push(`<meta property="${k}" content="${esc(val)}">`));
        }
        (o.jsonld || []).forEach((j) => lines.push(`<script type="application/ld+json">${ldJson(j)}</script>`));
        return lines.filter(Boolean).join("\n");
    }

    // ---------- قالب الصفحة ----------
    const shell = read("tools/shell.html");
    const versions = {
        V_CSS: hashOf(read("css/store.css")),
        V_CFG: hashOf(read("js/supabase-config.js")),
        V_DEF: hashOf(read("js/defaults.js")),
        V_VIEWS: hashOf(read("js/views.js")),
        V_THUMBS: hashOf(JSON.stringify(thumbs)),
        V_STORE: hashOf(read("js/store.js"), read("js/admin-panel.js"), read("css/admin-panel.css"))
    };
    const colors = ATHR.themeColors(cfg);
    const baseCountry = ATHR.country(cfg, ATHR.BASE_COUNTRY);
    const multi = enabled.length > 1;
    const waOk = cfg.contact.wa_float && ATHR.isValidWhatsapp(cfg.order.whatsapp);
    const brandHTML = V.brand(v);
    const footerHTML = V.footer(v);

    function bars(route) {
        const parts = [];
        if (cfg.texts.announce_show && cfg.texts.announce_text) parts.push(`<div class="bar bar-announce">${esc(fill(cfg.texts.announce_text))}</div>`);
        const freeMin = Number(cfg.order.free_min) || 0;
        const eligible = Boolean(cfg.order.free_enabled) && freeMin > 0 && ATHR.freeAppliesTo(cfg, ATHR.BASE_COUNTRY);
        if (cfg.sales.free_bar_show && eligible && !["done", "checkout"].includes(route)) {
            parts.push(`<div class="bar bar-ship"><div>${esc(fill(cfg.sales.free_before))}</div></div>`);
        }
        return parts.join("");
    }

    function page({ route, headHTML, view, prerendered = true }) {
        const values = {
            MODE: ATHR.themeMode(cfg),
            HTML_CLASS: ATHR.radiusClass(cfg),
            HEAD: headHTML,
            THEME_COLOR: colors.primary,
            BASE,
            API_ORIGIN: new URL(supabaseConfig().url).origin,
            FONT_HREF: ATHR.fontHref(cfg) || "data:text/css,",
            THEME_CSS: ATHR.themeVars(cfg),
            TOPROW_CLASS: cfg.theme.show_search === false ? " no-search" : "",
            MENU_HIDDEN: cfg.contact.menu_show ? "" : " hidden",
            BRAND: brandHTML,
            STORE_NAME: esc(name),
            SEARCH_HIDDEN: cfg.theme.show_search === false ? " hidden" : "",
            SEARCH_PLACEHOLDER: esc(cfg.texts.search_placeholder || ""),
            CUR_HIDDEN: multi ? "" : " hidden",
            CUR_FLAG: baseCountry.flag,
            CUR_SYM: esc(baseCountry.symbol),
            BARS: bars(route),
            ROUTE: route,
            VIEW_ATTRS: prerendered ? ' data-prerendered="1"' : "",
            VIEW: view,
            FOOTER: footerHTML,
            WA_CLASS: ["product", "cart", "checkout", "done", "review"].includes(route) ? " off" : "",
            WA_ATTRS: waOk ? `href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(cfg.contact.wa_float_msg)))}"` : "hidden",
            ...versions
        };
        return shell.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => {
            if (!(key in values)) throw new Error(`قيمة غير معروفة في القالب: ${key}`);
            return values[key];
        });
    }

    const loader = `<div class="wrap page-loading" aria-busy="true"><span class="spinner" aria-hidden="true"></span><span class="sr-only">جاري التحميل…</span></div>
<noscript><div class="wrap empty"><p>فعّل JavaScript في المتصفح لإكمال طلبك، أو تواصل معنا عبر واتساب.</p><a class="btn btn-primary" href="${BASE}">العودة للمتجر</a></div></noscript>`;

    // ---------- بيانات منظمة مشتركة ----------
    const storeId = `${SITE}#store`;
    const siteId = `${SITE}#website`;
    const socials = (cfg.texts.socials || []).filter((s) => s.name && ATHR.isUrl(s.url)).map((s) => s.url);
    const crumbsLd = (items) => ({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url }))
    });

    function shippingLd(p) {
        const out = [];
        const freeMin = Number(cfg.order.free_min) || 0;
        (cfg.order.delivery || []).filter((d) => d.enabled).forEach((d) => {
            const codes = enabled.filter((c) => ATHR.inCountries(d, c.code)).map((c) => c.code);
            if (!codes.length) return;
            const cost = ATHR.shippingFor(d, [{ product: p, qty: 1 }], cfg).cost;
            const free = cfg.order.free_enabled && freeMin > 0 && Number(p.price) >= freeMin && codes.every((c) => ATHR.freeAppliesTo(cfg, c));
            out.push({
                "@type": "OfferShippingDetails",
                shippingLabel: d.name,
                shippingRate: { "@type": "MonetaryAmount", value: free ? 0 : Number(cost.toFixed(3)), currency: "OMR" },
                shippingDestination: codes.map((c) => ({ "@type": "DefinedRegion", addressCountry: c }))
            });
        });
        return out;
    }

    // =====================================================
    // CLEAN OLD GENERATED PAGES
    // =====================================================
    ["p", "c"].forEach((dir) => fs.rmSync(path.join(OUT, dir), { recursive: true, force: true }));

    const sitemap = [];
    const addUrl = (loc, images = []) => sitemap.push({ loc, images });

    // =====================================================
    // HOME
    // =====================================================
    {
        const title = V.titles(v, { name: "home" });
        const about = fill(cfg.texts.about || "").trim();
        const description = clamp((cfg.seo && cfg.seo.home_description) || `${endDot(about || `متجر ${name}`)} ${serviceLine}`);
        const contactPoint = ATHR.isValidWhatsapp(cfg.order.whatsapp)
            ? [{ "@type": "ContactPoint", telephone: `+${ATHR.normalizePhone(cfg.order.whatsapp)}`, contactType: "customer service", availableLanguage: ["ar"] }]
            : undefined;
        const ld = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "OnlineStore",
                    "@id": storeId,
                    name,
                    url: SITE,
                    logo: logoAbs,
                    image: shareImage,
                    description: about || undefined,
                    sameAs: socials.length ? socials : undefined,
                    contactPoint,
                    address: { "@type": "PostalAddress", addressCountry: "OM" },
                    areaServed: shipCountries.map((c) => ({ "@type": "Country", name: c.code }))
                },
                {
                    "@type": "WebSite",
                    "@id": siteId,
                    url: SITE,
                    name,
                    inLanguage: "ar",
                    publisher: { "@id": storeId },
                    potentialAction: {
                        "@type": "SearchAction",
                        target: { "@type": "EntryPoint", urlTemplate: `${SITE}search/?q={search_term_string}` },
                        "query-input": "required name=search_term_string"
                    }
                }
            ]
        };
        writeFile("index.html", page({
            route: "home",
            headHTML: head({ title, description, canonical: SITE, verify: true, jsonld: [ld] }),
            view: V.home(v)
        }));
        addUrl(SITE);
    }

    // =====================================================
    // CATEGORIES
    // =====================================================
    let catCount = 0;
    categories.forEach((cat) => {
        if (!cat.slug) return;
        const list = V.listings(v, v.products.filter((p) => p.category_id === cat.id));
        if (!list.length) return;
        catCount++;
        const urlPath = ATHR.url.category(cat);
        const url = abs(urlPath);
        const prices = list.map((p) => Number(p.price)).filter((n) => n > 0);
        const from = prices.length ? ` تبدأ من ${money(Math.min(...prices))}` : "";
        const lead = String(cat.description || "").trim() || `تسوّق ${cat.name} من متجر ${name}.`;
        const description = clamp(`${endDot(lead)} ${designs(list.length)}${from}. ${serviceLine}`);
        const ld = [
            {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "@id": url,
                url,
                name: cat.name,
                description,
                inLanguage: "ar",
                isPartOf: { "@id": siteId },
                mainEntity: {
                    "@type": "ItemList",
                    numberOfItems: list.length,
                    itemListElement: list.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(ATHR.url.product(p)), name: V.label(v, p) }))
                }
            },
            crumbsLd([{ name, url: SITE }, { name: cat.name, url }])
        ];
        const ogImage = cat.image_url ? absAsset(cat.image_url) : (list.find((p) => p.image_url) || {}).image_url;
        writeFile(`c/${cat.slug}/index.html`, page({
            route: "category",
            headHTML: head({ title: V.titles(v, { name: "category", cat }), description, canonical: url, image: ogImage, jsonld: ld }),
            view: V.category(v, cat)
        }));
        addUrl(url);
    });

    // =====================================================
    // PRODUCTS
    // =====================================================
    v.products.forEach((p) => {
        const urlPath = ATHR.url.product(p);
        const url = abs(urlPath);
        const label = V.label(v, p);
        const cat = V.catOf(v, p);
        const color = V.colorOf(v, p);
        const desc = V.description(v, p);
        const price = money(p.price);
        const out = p.is_available === false;
        const group = v.groups.get(p.id);
        const otherColors = group ? group.filter((x) => x.id !== p.id).map((x) => (V.colorOf(v, x) || {}).name).filter(Boolean) : [];
        const metaParts = [
            `${label} بسعر ${price}${Number(p.old_price) > Number(p.price) ? ` بدل ${money(p.old_price)}` : ""}.`,
            otherColors.length ? `متوفر أيضًا ب${otherColors.join(" و")}.` : "",
            desc ? endDot(desc) : "",
            out ? "نفد المخزون حاليًا." : serviceLine
        ];
        const description = clamp(metaParts.filter(Boolean).join(" "));
        const images = [p.image_url, ...(mediaBy.get(p.id) || []).filter((m) => m.media_type === "image").map((m) => m.media_url)]
            .filter((u) => /^https?:/i.test(u || "")).slice(0, 6);
        const list = v.reviewsByProduct.get(p.id) || [];
        const stats = V.reviewStats(list);

        const offer = {
            "@type": "Offer",
            url,
            priceCurrency: "OMR",
            price: Number(p.price).toFixed(3),
            availability: out ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": storeId },
            shippingDetails: shippingLd(p)
        };
        if (Number(p.old_price) > Number(p.price)) {
            offer.priceSpecification = [{
                "@type": "UnitPriceSpecification",
                priceType: "https://schema.org/StrikethroughPrice",
                price: Number(p.old_price).toFixed(3),
                priceCurrency: "OMR"
            }];
        }
        const productLd = {
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": `${url}#product`,
            name: label,
            url,
            image: images.length ? images : undefined,
            description: desc || description,
            sku: p.id,
            brand: { "@type": "Brand", name },
            category: cat ? cat.name : undefined,
            color: color ? color.name : undefined,
            offers: offer
        };
        if (stats) {
            productLd.aggregateRating = { "@type": "AggregateRating", ratingValue: stats.avg, reviewCount: stats.count, bestRating: 5, worstRating: 1 };
            productLd.review = list.slice(0, 5).map((r) => ({
                "@type": "Review",
                reviewRating: { "@type": "Rating", ratingValue: Number(r.rating) || 5, bestRating: 5, worstRating: 1 },
                author: { "@type": "Person", name: r.name || "عميل" },
                reviewBody: r.text,
                datePublished: r.created_at ? String(r.created_at).slice(0, 10) : undefined
            }));
        }
        const crumbs = [{ name, url: SITE }];
        if (cat && cat.slug) crumbs.push({ name: cat.name, url: abs(ATHR.url.category(cat)) });
        crumbs.push({ name: label, url });

        writeFile(`p/${p.slug}/index.html`, page({
            route: "product",
            headHTML: head({
                title: V.titles(v, { name: "product", product: p }),
                description,
                canonical: url,
                ogType: "product",
                image: images[0],
                imageAlt: label,
                ogExtra: [["product:price:amount", Number(p.price).toFixed(3)], ["product:price:currency", "OMR"], ["product:availability", out ? "out of stock" : "in stock"]],
                jsonld: [productLd, crumbsLd(crumbs)]
            }),
            view: V.product(v, p)
        }));
        addUrl(url, images.slice(0, 3));
    });

    // =====================================================
    // SHIPPING POLICY + UTILITY PAGES
    // =====================================================
    {
        const url = abs(ATHR.url.page("shipping"));
        const description = clamp(`${cfg.contact.policy_title} في متجر ${name}: أسعار ومدة التوصيل لكل دولة وطرق الدفع. ${serviceLine}`);
        writeFile("shipping/index.html", page({
            route: "shipping",
            headHTML: head({ title: V.titles(v, { name: "shipping" }), description, canonical: url, jsonld: [crumbsLd([{ name, url: SITE }, { name: cfg.contact.policy_title, url }])] }),
            view: V.shipping(v)
        }));
        if (cfg.contact.policy_show) addUrl(url);
    }

    ["cart", "checkout", "done", "review", "search"].forEach((route) => {
        writeFile(`${route}/index.html`, page({
            route,
            headHTML: head({ title: V.titles(v, { name: route }), robots: "noindex,follow" }),
            view: route === "search" ? V.search(v, "") : loader,
            prerendered: route === "search"
        }));
    });

    // صفحة احتياطية لأي رابط غير موجود (منتج جديد قبل البناء القادم، أو رابط قديم)
    writeFile("404.html", page({
        route: "notfound",
        headHTML: head({ title: name, robots: "noindex" }),
        view: loader,
        prerendered: false
    }));

    // =====================================================
    // SITEMAP + ROBOTS + .nojekyll
    // =====================================================
    const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemap.map((u) => `<url><loc>${xml(u.loc)}</loc>${u.images.map((i) => `<image:image><image:loc>${xml(i)}</image:loc></image:image>`).join("")}</url>`).join("\n")}
</urlset>
`);
    writeFile("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
    writeFile(".nojekyll", "");

    console.log(`✓ بُنيت صفحات ${SITE}`);
    console.log(`  الرئيسية + ${catCount} قسم + ${v.products.length} منتج + سياسة الشحن، و${sitemap.length} رابط في خريطة الموقع`);
    console.log(`  صور مصغّرة: ${Object.keys(thumbs).length} · المدة ${((Date.now() - started) / 1000).toFixed(1)} ث`);
}

main().catch((error) => {
    console.error("✗ فشل البناء:", error && error.stack ? error.stack : error);
    process.exit(1);
});
