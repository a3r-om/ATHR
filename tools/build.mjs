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
// أسعار صرف عملات الخليج (تُحدَّث تلقائيًا مع كل بناء)
// مصدر مجاني بدون مفتاح، ويُرفض أي سعر غريب (فرق أكثر من 30% عن السعر المرجعي)
// =====================================================

const RATE_URLS = [
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/omr.json",
    "https://latest.currency-api.pages.dev/v1/currencies/omr.json"
];

function readRatesFile() {
    for (const dir of [OUT, ROOT]) {
        try {
            const src = fs.readFileSync(path.join(dir, "js/rates.js"), "utf8");
            return JSON.parse(src.replace(/^window\.ATHR_RATES\s*=\s*/, "").replace(/;\s*$/, ""));
        } catch {
            /* جرّب المكان التالي */
        }
    }
    return null;
}

async function fetchRates(reference) {
    const previous = readRatesFile();
    if (args["no-rates"]) return previous;
    for (const url of RATE_URLS) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) continue;
            const json = await res.json();
            const src = json && json.omr;
            if (!src) continue;
            const rates = {};
            let ok = true;
            for (const [code, ref] of Object.entries(reference)) {
                const r = Number(src[code.toLowerCase()]);
                if (!(r > 0) || !Number.isFinite(r) || Math.abs(r - ref) / ref > 0.3) { ok = false; break; }
                rates[code] = Math.round(r * 10000) / 10000;
            }
            if (!ok) continue;
            return { date: String(json.date || "").slice(0, 10), rates };
        } catch {
            /* نجرب المصدر التالي */
        }
    }
    if (previous) console.warn("! تعذر تحديث أسعار الصرف، أبقيت آخر أسعار محفوظة");
    return previous;
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
    const productCols = "id,name,name_en,slug,price,old_price,category_id,image_url,thumb_url,is_available,is_visible,is_best_seller,is_new_arrival,description,description_en,color_id,sort_order,video_url,weight_g,stock,created_at";
    const [settings, categories, products, reviews, media] = await Promise.all([
        rest("store_settings?select=config&id=eq.1"),
        rest("categories?select=id,name,name_en,slug,sort_order,image_url,description,description_en&order=sort_order.asc"),
        rest(`products?select=${productCols}&is_visible=eq.true&order=sort_order.asc`),
        rest("reviews?select=id,product_id,name,rating,text,created_at,verified&status=eq.approved&order=created_at.desc&limit=500")
            .catch(() => rest("reviews?select=id,product_id,name,rating,text,created_at&status=eq.approved&order=created_at.desc&limit=500"))
            .catch(() => []),
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
    // روابط كاملة، أو صور داخل المتجر (images/...)
    const unique = Array.from(new Set(urls.filter((u) => u && (/^https?:\/\//i.test(u) || (/^[a-z0-9][^:]*\.(jpe?g|png|webp)$/i.test(u) && exists(path.join(OUT, u)))))));
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
                    let buf;
                    if (/^https?:/i.test(url)) {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        buf = Buffer.from(await res.arrayBuffer());
                    } else {
                        buf = fs.readFileSync(path.join(OUT, url));
                    }
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
// فيديو الإعلان: نسخة خفيفة تشتغل في كل الجوالات (H.264 + بداية سريعة) مع صورة غلاف
// يُخدم من نفس موقع المتجر بدل رابط الرفع الأصلي
// =====================================================

async function findFfmpeg() {
    try {
        const mod = await import(path.join(ROOT, "tools/node_modules/ffmpeg-static/index.js"));
        if (mod && mod.default && exists(mod.default)) return mod.default;
    } catch { /* نجرب نسخة الجهاز */ }
    for (const p of ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"]) if (exists(p)) return p;
    return "";
}

function run(bin, argv) {
    return new Promise((resolve) => {
        import("node:child_process").then(({ spawn }) => {
            const child = spawn(bin, argv, { stdio: ["ignore", "ignore", "pipe"] });
            let err = "";
            child.stderr.on("data", (d) => { err += d; if (err.length > 200000) err = err.slice(-100000); });
            child.on("close", (code) => resolve({ code, err }));
            child.on("error", (e) => resolve({ code: -1, err: String(e) }));
        });
    });
}

async function makeAdVideo(cfg) {
    const ad = cfg.ad || {};
    const dir = path.join(OUT, "images/ad");
    const keep = new Set();
    const out = {};
    const url = ad.show !== false && ad.type === "video" ? String(ad.video_url || "") : "";
    if (url && !args["no-media"]) {
        const h = hashOf(url);
        const mp4 = `images/ad/${h}.mp4`, jpg = `images/ad/${h}.jpg`;
        if (exists(path.join(OUT, mp4)) && exists(path.join(OUT, jpg))) {
            let prev = {};
            try { prev = JSON.parse(fs.readFileSync(path.join(OUT, "js/catalog.js"), "utf8").replace(/^window\.ATHR_CATALOG=/, "").replace(/;\s*$/, "")).ad[url] || {}; } catch { /* أول مرة */ }
            out[url] = { v: mp4, p: jpg, w: prev.w || 0, h: prev.h || 0 };
        } else {
            const ffmpeg = await findFfmpeg();
            if (!ffmpeg) console.warn("  ! ما لقينا ffmpeg، فيديو الإعلان يبقى من الرابط الأصلي");
            else {
                try {
                    fs.mkdirSync(dir, { recursive: true });
                    const src = path.join(dir, `${h}.src`);
                    if (/^https?:/i.test(url)) {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        fs.writeFileSync(src, Buffer.from(await res.arrayBuffer()));
                    } else fs.copyFileSync(path.join(OUT, url.replace(/^\//, "")), src);
                    const probe = await run(ffmpeg, ["-hide_banner", "-i", src]);
                    probe.err.split("\n").filter((l) => /Duration|Stream #/.test(l)).forEach((l) => console.log(`  • فيديو الإعلان الأصلي: ${l.trim()}`));
                    const enc = await run(ffmpeg, ["-hide_banner", "-y", "-i", src, "-an", "-t", "60",
                        "-vf", "scale='min(720,iw)':-2:flags=lanczos,fps=30,format=yuv420p",
                        "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-profile:v", "main", "-level", "3.1",
                        "-movflags", "+faststart", path.join(OUT, mp4)]);
                    if (enc.code !== 0) throw new Error(enc.err.split("\n").slice(-4).join(" "));
                    const shot = await run(ffmpeg, ["-hide_banner", "-y", "-ss", "0.4", "-i", path.join(OUT, mp4), "-frames:v", "1", "-q:v", "4", path.join(OUT, jpg)]);
                    if (shot.code !== 0 || !exists(path.join(OUT, jpg))) await run(ffmpeg, ["-hide_banner", "-y", "-i", path.join(OUT, mp4), "-frames:v", "1", "-q:v", "4", path.join(OUT, jpg)]);
                    fs.unlinkSync(src);
                    if (!exists(path.join(OUT, jpg))) throw new Error("poster");
                    const dims = ((await run(ffmpeg, ["-hide_banner", "-i", path.join(OUT, mp4)])).err.match(/Video:.*?(\d{2,5})x(\d{2,5})/) || []);
                    out[url] = { v: mp4, p: jpg, w: Number(dims[1]) || 0, h: Number(dims[2]) || 0 };
                    console.log(`• فيديو الإعلان: ${(fs.statSync(path.join(OUT, mp4)).size / 1024).toFixed(0)}KB بعد الضغط`);
                } catch (error) {
                    console.warn(`  ! تعذر تجهيز فيديو الإعلان: ${error.message}`);
                    [mp4, jpg].forEach((f) => { try { fs.unlinkSync(path.join(OUT, f)); } catch { /* */ } });
                    try { fs.unlinkSync(path.join(dir, `${h}.src`)); } catch { /* */ }
                }
            }
        }
        if (out[url]) { keep.add(path.basename(out[url].v)); keep.add(path.basename(out[url].p)); }
    }
    // حذف فيديوهات الإعلانات القديمة (فقط في البناء الكامل)
    if (!args["no-media"] && exists(dir)) fs.readdirSync(dir).forEach((f) => { if (!keep.has(f)) fs.unlinkSync(path.join(dir, f)); });
    return out;
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

    // نسخة احتياطية للمنتجات والأقسام والإعدادات (بيانات عامة فقط، بدون طلبات أو عملاء).
    // تُحفظ في Git مع كل تغيير، فكل نسخة سابقة موجودة في سجل المستودع ويمكن الرجوع لها.
    if (!args.data) {
        const byId = (a, b) => String(a.id || a.product_id).localeCompare(String(b.id || b.product_id));
        const backup = {
            app: "athr",
            kind: "catalog",
            note: "نسخة تلقائية من بناء المتجر: الأقسام والمنتجات الظاهرة وصورها والإعدادات. الطلبات والعملاء في النسخة الكاملة من لوحة التحكم.",
            config: data.config || {},
            categories: (data.categories || []).slice().sort(byId),
            products: (data.products || []).slice().sort(byId),
            product_media: (data.media || []).slice().sort((a, b) => byId(a, b) || (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.media_url).localeCompare(String(b.media_url)))
        };
        writeFile("backup/catalog.json", JSON.stringify(backup, null, 1) + "\n");
    }

    // الصور المصغّرة
    const imageUrls = [];
    products.forEach((p) => { if (p.image_url) imageUrls.push(p.image_url); });
    media.filter((m) => m.media_type === "image").forEach((m) => imageUrls.push(m.media_url));
    categories.forEach((c) => { if (c.image_url) imageUrls.push(c.image_url); });
    const thumbs = await makeThumbs(ATHR, imageUrls);
    sandbox.ATHR_THUMBS = thumbs;
    writeFile("js/thumbs.js", `window.ATHR_THUMBS=${JSON.stringify(thumbs)};\n`);

    // أسعار الصرف اليومية
    const reference = Object.fromEntries(ATHR.countries({ order: {} }).filter((c) => c.code !== ATHR.BASE_COUNTRY).map((c) => [c.currency, c.rate]));
    const rates = await fetchRates(reference);
    if (rates) {
        writeFile("js/rates.js", `window.ATHR_RATES=${JSON.stringify(rates)};\n`);
        sandbox.ATHR_RATES = rates;
    }

    // نسخة جاهزة من بيانات المتجر داخل الموقع: المتجر يشتغل فوراً بدون انتظار قاعدة البيانات،
    // وبعدها يتحدّث بالخلفية. (بيانات عامة فقط: نفس اللي يقرأه أي زائر)
    const adMedia = await makeAdVideo(cfg);
    const mediaOf = {};
    media.forEach((m) => { (mediaOf[m.product_id] = mediaOf[m.product_id] || []).push({ media_type: m.media_type, media_url: m.media_url, sort_order: m.sort_order }); });
    const catalog = {
        data: {
            config: data.config || {},
            categories: data.categories || [],
            products: (data.products || []).filter((p) => p.is_visible !== false),
            reviews: (data.reviews || []).slice(0, 300)
        },
        media: mediaOf,
        ad: adMedia
    };
    const catalogSrc = `window.ATHR_CATALOG=${JSON.stringify(catalog)};\n`;
    writeFile("js/catalog.js", catalogSrc);
    sandbox.ATHR_CATALOG = catalog;
    const ratesSrc = exists(path.join(OUT, "js/rates.js")) ? fs.readFileSync(path.join(OUT, "js/rates.js"), "utf8") : "";

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
        if (!o.robots || o.og) {
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
        V_I18N: hashOf(read("js/i18n-en.js")),
        V_THUMBS: hashOf(JSON.stringify(thumbs)),
        V_RATES: hashOf(ratesSrc),
        V_CATALOG: hashOf(catalogSrc),
        V_STORE: hashOf(read("js/store.js"), read("js/admin-panel.js"), read("css/admin-panel.css"))
    };
    // شاشات البداية لتطبيق آيفون (عرض × طول بالبكسل، والمقاس المنطقي، ونسبة البكسل)
    const SPLASH = [[1320, 2868, 440, 956, 3], [1290, 2796, 430, 932, 3], [1206, 2622, 402, 874, 3], [1179, 2556, 393, 852, 3], [1284, 2778, 428, 926, 3],
        [1170, 2532, 390, 844, 3], [1125, 2436, 375, 812, 3], [1242, 2688, 414, 896, 3], [828, 1792, 414, 896, 2], [750, 1334, 375, 667, 2]];
    const splashHTML = SPLASH.map(([w, h, cw, ch, r]) => `<link rel="apple-touch-startup-image" media="(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="${BASE}images/app/splash-${w}x${h}.png">`).join("\n");
    // شريط الحالة في آيفون: لون ثابت (من theme-color) والمحتوى يبدأ تحته، عشان يكون الهيدر واضح بدون تغبيش
    const statusStyle = "default";
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
        if (cfg.sales.free_bar_show && eligible && !["done", "checkout", "gift"].includes(route)) {
            parts.push(`<div class="bar bar-ship"><div>${esc(fill(cfg.sales.free_before))}</div></div>`);
        }
        return parts.join("");
    }

    function page({ route, headHTML, view, prerendered = true }) {
        const values = {
            MODE: ATHR.themeMode(cfg),
            HTML_CLASS: ATHR.themeClasses(cfg).join(" "),
            HEAD: headHTML,
            THEME_COLOR: ATHR.headColor(cfg),
            STATUS_STYLE: statusStyle,
            SPLASH: splashHTML,
            BASE,
            API_ORIGIN: new URL(supabaseConfig().url).origin,
            FONT_HREF: ATHR.fontHref(cfg) || "data:text/css,",
            THEME_CSS: ATHR.themeVars(cfg),
            TOPROW_CLASS: `${cfg.theme.show_search === false ? " no-search" : ""}${cfg.contact.menu_show ? "" : " no-menu"}`,
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
            WA_CLASS: ["product", "cart", "checkout", "done", "review", "gift"].includes(route) ? " off" : "",
            WA_ATTRS: waOk ? `href="${esc(ATHR.waLink(cfg.order.whatsapp, fill(cfg.contact.wa_float_msg)))}"` : "hidden",
            ...versions
        };
        return shell.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, key) => {
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

    ["cart", "checkout", "done", "review", "search", "gift", "fav", "points"].forEach((route) => {
        // بطاقة الإهداء: معاينة جميلة عند إرسال رابطها في واتساب
        const giftHead = route === "gift" ? {
            og: true,
            ogTitle: `🎁 ${V.titles(v, { name: "gift" }).replace(/^🎁\s*/, "")}`,
            description: `افتح بطاقة هديتك 🎁 هدية مختارة لك بكل حب من ${name}`,
            canonical: `${SITE}gift/`,
            image: `${SITE}images/gift-og.jpg`,
            imageAlt: "صندوق هدية"
        } : {};
        writeFile(`${route}/index.html`, page({
            route,
            headHTML: head({ title: V.titles(v, { name: route }), robots: "noindex,follow", ...giftHead }),
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
    writeFile("robots.txt", `User-agent: *\nAllow: /\nDisallow: /backup/\n\nSitemap: ${SITE}sitemap.xml\n`);
    writeFile(".nojekyll", "");

    // =====================================================
    // التطبيق (PWA): ملف التعريف + عامل الخدمة + صفحة بدون إنترنت
    // =====================================================
    const colors = ATHR.themeColors(cfg);
    const appDesc = clamp((cfg.seo && cfg.seo.home_description) || endDot(fill(cfg.texts.about || "").trim() || `متجر ${name}`));
    const appIcon = (file, size, purpose = "any") => ({ src: `${BASE}images/app/${file}`, sizes: `${size}x${size}`, type: "image/png", purpose });
    writeFile("manifest.webmanifest", JSON.stringify({
        id: BASE,
        name,
        short_name: name.slice(0, 12),
        description: appDesc,
        lang: "ar",
        dir: "rtl",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        orientation: "portrait",
        background_color: colors.primary,
        theme_color: ATHR.headColor(cfg),
        categories: ["shopping", "lifestyle"],
        icons: [appIcon("icon-192.png", 192), appIcon("icon-512.png", 512), appIcon("maskable-512.png", 512, "maskable")],
        shortcuts: [
            { name: "السلة", short_name: "السلة", url: `${BASE}cart/`, icons: [appIcon("icon-192.png", 192)] },
            cfg.sales.gift_enabled ? { name: "إرسال هدية", short_name: "هدية", url: `${BASE}gift/`, icons: [appIcon("icon-192.png", 192)] } : null
        ].filter(Boolean)
    }, null, 1) + "\n");

    writeFile("offline.html", `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="${esc(ATHR.headColor(cfg))}">
<title>${esc(name)} | بدون إنترنت</title>
<style>
html,body{margin:0;height:100%}
body{display:grid;place-items:center;background:${esc(colors.primary)};color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;padding:24px;box-sizing:border-box}
img{width:110px;height:auto;opacity:.95}
h1{font-size:20px;margin:22px 0 8px}
p{margin:0 0 22px;opacity:.85;line-height:1.7}
button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:12px 26px;background:#fff;color:${esc(colors.primary)};cursor:pointer}
</style>
</head>
<body>
<main>
<img src="${BASE}images/logo.png" alt="${esc(name)}">
<h1>ما فيه اتصال بالإنترنت</h1>
<p>تأكد من الإنترنت وارجع جرّب، وسلتك محفوظة.</p>
<button type="button" onclick="location.reload()">حاول مرة ثانية</button>
</main>
</body>
</html>
`);

    const swVersion = hashOf(Object.values(versions).join("|"), shell, name);
    writeFile("sw.js", `// عامل الخدمة لتطبيق ${name}: يفتح المتجر كتطبيق، ويعرض صفحة بديلة إذا انقطع الإنترنت
// يبنيه tools/build.mjs تلقائياً، لا تعدّله يدوياً
const VERSION = "${swVersion}";
const BASE = "${BASE}";
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
    if (req.headers.has("range") || /\.(mp4|webm|mov|m4v)$/i.test(url.pathname)) return;

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
    event.waitUntil(self.registration.showNotification(d.title || ${JSON.stringify(name)}, {
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
`);

    console.log(`✓ بُنيت صفحات ${SITE}`);
    console.log(`  الرئيسية + ${catCount} قسم + ${v.products.length} منتج + سياسة الشحن، و${sitemap.length} رابط في خريطة الموقع`);
    console.log(`  صور مصغّرة: ${Object.keys(thumbs).length} · المدة ${((Date.now() - started) / 1000).toFixed(1)} ث`);
}

main().catch((error) => {
    console.error("✗ فشل البناء:", error && error.stack ? error.stack : error);
    process.exit(1);
});
