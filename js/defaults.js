/* =====================================================
   ATHR STORE — الإعدادات الافتراضية والأدوات المشتركة
   أي إعداد غير محفوظ في قاعدة البيانات يأخذ قيمته من هنا.
   يعمل في المتصفح وفي سكربت بناء الصفحات (tools/build.mjs).
===================================================== */

/* eslint-disable no-var */
var ATHR_ROOT = typeof window !== "undefined" ? window : globalThis;

const ATHR_GOVERNORATES = [
    "مسقط", "شمال الباطنة", "جنوب الباطنة", "الداخلية", "الظاهرة", "البريمي",
    "شمال الشرقية", "جنوب الشرقية", "الوسطى", "ظفار", "مسندم"
];

// دول الخليج: العلم والعملة وسعر الصرف (1 ريال عماني = rate من عملة الدولة)
const ATHR_COUNTRIES = [
    { code: "OM", name: "سلطنة عُمان", name_en: "Oman", currency_name_en: "Omani rial", currency_def_en: "Omani rials", flag: "🇴🇲", currency: "OMR", currency_name: "ريال عماني", currency_def: "الريال العماني", symbol: "ر.ع", decimals: 3, rate: 1, dial: "968", enabled: true },
    { code: "AE", name: "الإمارات", name_en: "UAE", currency_name_en: "UAE dirham", currency_def_en: "UAE dirhams", flag: "🇦🇪", currency: "AED", currency_name: "درهم إماراتي", currency_def: "الدرهم الإماراتي", symbol: "د.إ", decimals: 2, rate: 9.5514, dial: "971", enabled: true },
    { code: "SA", name: "السعودية", name_en: "Saudi Arabia", currency_name_en: "Saudi riyal", currency_def_en: "Saudi riyals", flag: "🇸🇦", currency: "SAR", currency_name: "ريال سعودي", currency_def: "الريال السعودي", symbol: "ر.س", decimals: 2, rate: 9.7529, dial: "966", enabled: true },
    { code: "KW", name: "الكويت", name_en: "Kuwait", currency_name_en: "Kuwaiti dinar", currency_def_en: "Kuwaiti dinars", flag: "🇰🇼", currency: "KWD", currency_name: "دينار كويتي", currency_def: "الدينار الكويتي", symbol: "د.ك", decimals: 3, rate: 0.8048, dial: "965", enabled: true },
    { code: "QA", name: "قطر", name_en: "Qatar", currency_name_en: "Qatari riyal", currency_def_en: "Qatari riyals", flag: "🇶🇦", currency: "QAR", currency_name: "ريال قطري", currency_def: "الريال القطري", symbol: "ر.ق", decimals: 2, rate: 9.4669, dial: "974", enabled: true },
    { code: "BH", name: "البحرين", name_en: "Bahrain", currency_name_en: "Bahraini dinar", currency_def_en: "Bahraini dinars", flag: "🇧🇭", currency: "BHD", currency_name: "دينار بحريني", currency_def: "الدينار البحريني", symbol: "د.ب", decimals: 3, rate: 0.9779, dial: "973", enabled: true }
];

// أرقام الجوال المحلية لكل دولة (بدون رمز الدولة)
const ATHR_PHONE_RULES = {
    OM: { re: /^[79]\d{7}$/, hint: "8 أرقام يبدأ بـ7 أو 9", hint_en: "8 digits starting with 7 or 9", example: "9XXXXXXX" },
    AE: { re: /^5\d{8}$/, hint: "9 أرقام يبدأ بـ5 (مثل 50XXXXXXX)", hint_en: "9 digits starting with 5 (e.g. 50XXXXXXX)", example: "5XXXXXXXX" },
    SA: { re: /^5\d{8}$/, hint: "9 أرقام يبدأ بـ5 (مثل 55XXXXXXX)", hint_en: "9 digits starting with 5 (e.g. 55XXXXXXX)", example: "5XXXXXXXX" },
    KW: { re: /^[569]\d{7}$/, hint: "8 أرقام يبدأ بـ5 أو 6 أو 9", hint_en: "8 digits starting with 5, 6 or 9", example: "XXXXXXXX" },
    QA: { re: /^[3567]\d{7}$/, hint: "8 أرقام يبدأ بـ3 أو 5 أو 6 أو 7", hint_en: "8 digits starting with 3, 5, 6 or 7", example: "XXXXXXXX" },
    BH: { re: /^[36]\d{7}$/, hint: "8 أرقام يبدأ بـ3 أو 6", hint_en: "8 digits starting with 3 or 6", example: "XXXXXXXX" }
};

const ATHR_DEFAULTS = {
    name: "أثر",
    logo_url: "images/logo.png",
    show_name: true,
    logo_shape: "rounded",

    theme: {
        primary: "#7D1420",
        hero: "#4A0D12",
        bg: "#EBDDC9",
        text: "#251A1B",
        mode: "auto",
        radius: "medium",
        grid_mobile: 2,
        show_search: true,
        show_sort: true,
        font_head: "Reem Kufi",
        font_body: "IBM Plex Sans Arabic",
        hero_show: true,
        hero_pattern: true,
        hero_image: "",
        visitor_mode: true
    },

    texts: {
        announce_show: false,
        announce_text: "",
        hero_title: "كاسات تترك أثراً",
        hero_text: "أكواب ومجات ومحافظ بتصاميم الأندية والجامعات والشخصيات. اختر تصميمك ويوصلك أينما كنت في الخليج.",
        hero_button: "تصفّح المنتجات",
        hero_features: ["توصيل لكل دول الخليج", "مجاني داخل عُمان فوق {free}", "الدفع عند الاستلام في عُمان والإمارات"],
        search_placeholder: "ابحث",
        all_label: "الكل",
        add_to_cart: "أضف للسلة",
        sold_out: "نفد المخزون",
        about: "أثر متجر عُماني لأكواب سيراميك مطبوعة بتصاميم الأندية والجامعات والشخصيات، ومجات ومحافظ وهدايا. نوصّل لكل مناطق عُمان ودول الخليج.",
        footer_delivery_title: "التوصيل والدفع",
        footer_delivery_text: "",
        footer_contact_title: "تواصل معنا",
        socials: [],
        thanks_text: "أرسل طلبك عبر واتساب بالضغط على الزر بالأسفل، وسنؤكده ونجهّزه لك.",
        wa_first_line: "طلب جديد من متجر {name}",
        wa_last_line: ""
    },

    ad: {
        show: false,
        type: "text",
        image_url: "",
        image_alt: "",
        video_url: "",
        video_alt: "",
        title: "",
        text: "",
        button: "",
        bg: "#7D1420",
        link: ""
    },

    colors: [],

    order: {
        whatsapp: "",
        currency: "ر.ع",
        auto_rates: true,
        decimals: 3,
        delivery: [
            { id: "home", enabled: true, name: "توصيل إلى البيت", type: "home", pricing: "fixed", price: 2, countries: ["OM"], note: "يصلك الطلب إلى باب بيتك.", duration: "2 إلى 4 أيام" },
            { id: "office", enabled: true, name: "استلام من مكتب جيناكم", type: "office", pricing: "fixed", price: 1, countries: ["OM"], note: "تستلم طلبك من أقرب مكتب لك.", duration: "2 إلى 3 أيام" }
        ],
        free_enabled: true,
        free_min: 20,
        free_countries: ["OM"],
        countries: ATHR_COUNTRIES.map((c) => ({ ...c })),
        default_weight_g: 400,
        governorates: ATHR_GOVERNORATES.slice(),
        max_qty: 10,
        show_wilaya: true,
        wilaya_required: true,
        show_notes: true,
        payments: [
            { id: "cod", enabled: true, name: "الدفع عند الاستلام", type: "cod", countries: ["OM"], note: "تدفع نقدًا عند استلام طلبك." }
        ]
    },

    sales: {
        free_bar_show: true,
        free_before: "توصيل مجاني داخل عُمان للطلبات من {free} أو أكثر",
        free_during: "أضف {left} أخرى للحصول على توصيل مجاني",
        free_done: "مبروك! توصيل طلبك مجاني",
        bundles: [],
        related_show: true,
        related_title: "منتجات قد تعجبك",
        related_count: 4,
        buy_now: true,
        wa_quick: true,
        remember_customer: true,
        abandoned_show: true,
        abandoned_text: "لديك {n} في سلتك. أكمل طلبك قبل أن يفوتك.",
        reminder_msg: "السلام عليكم {client}، نذكّرك بطلبك رقم {no} من متجر {name} بمبلغ {total}. هل ترغب في إتمامه؟ نحن بخدمتك.",
        trust_show: true,
        trust_custom: [],
        volume: { enabled: false, tiers: [{ min: 2, pct: 5 }, { min: 3, pct: 10 }] },
        gift_enabled: true,
        gift_button: true,
        gift_prepaid: false,
        gift_banner: true,
        gift_card: true,
        best_title: "الأكثر طلباً",
        new_title: "وصل حديثاً",
        sets_title: "أطقم وهدايا بسعر أقل",
        upsell_show: true,
        review_request_msg: "السلام عليكم {client}، نتمنى أن طلبك من متجر {name} وصلك بخير 🤍 يسعدنا تقييمك في دقيقة من هنا: {link}"
    },

    seo: {
        google_verification: "",
        home_title: "",
        home_description: ""
    },

    contact: {
        menu_show: true,
        menu_home: true,
        share_url: "",
        wa_float: true,
        wa_float_msg: "السلام عليكم، لدي استفسار عن منتجات {name}",
        policy_show: true,
        policy_title: "سياسة الشحن والتوصيل",
        policy_notes: "",
        reviews_title: "آراء عملائنا",
        reviews_share_btn: true,
        reviews_share_text: "شاركنا رأيك",
        reviews_share_msg: "السلام عليكم، هذا رأيي في منتجات {name}:",
        reviews: []
    },

    // تصميم الصور بالذكاء الاصطناعي (المفتاح نفسه محفوظ بسرية في قاعدة البيانات وليس هنا)
    ai: {
        provider: "gemini",
        quality: "best",
        model: ""
    }
};

const ATHR = ATHR_ROOT.ATHR = ATHR_ROOT.ATHR || {};
ATHR.COUNTRIES = ATHR_COUNTRIES;
ATHR.PHONE_RULES = ATHR_PHONE_RULES;
ATHR.DEFAULTS = ATHR_DEFAULTS;

// =====================================================
// اللغة: عربي (الأساس) أو English
// نصوص الواجهة الإنجليزية في js/i18n-en.js (المفتاح هو النص العربي نفسه)
// =====================================================

ATHR.lang = "ar";
ATHR.EN = ATHR.EN || {};
ATHR.EN_TEXTS = ATHR.EN_TEXTS || {};
ATHR.isEn = () => ATHR.lang === "en";

ATHR.t = function (s, vars) {
    let out = ATHR.lang === "en" && Object.prototype.hasOwnProperty.call(ATHR.EN, s) ? ATHR.EN[s] : s;
    if (vars) out = String(out).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return out;
};

// تنفيذ شيء بلغة معيّنة (رسائل واتساب للمالك تبقى بالعربي دائمًا)
ATHR.withLang = function (lang, fn) {
    const prev = ATHR.lang;
    ATHR.lang = lang;
    try { return fn(); } finally { ATHR.lang = prev; }
};

// حقل مترجم: name ← name_en عند الإنجليزي إن وُجد
ATHR.L = function (obj, field) {
    if (!obj) return "";
    if (ATHR.lang === "en") {
        const en = obj[`${field}_en`];
        if (en !== undefined && en !== null && String(en).trim()) return en;
    }
    return obj[field] ?? "";
};

// نص من إعدادات المتجر: بالإنجليزي من config.en، وإلا النص الإنجليزي الافتراضي
ATHR.ct = function (config, path) {
    const get = (obj, keys) => keys.split(".").reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
    const value = get(config, path);
    if (ATHR.lang !== "en") return value;
    const own = get((config && config.en) || {}, path);
    const empty = own === undefined || own === null || (typeof own === "string" && !own.trim()) || (Array.isArray(own) && !own.filter(Boolean).length);
    if (!empty) return own;
    return Object.prototype.hasOwnProperty.call(ATHR.EN_TEXTS, path) ? ATHR.EN_TEXTS[path] : value;
};

ATHR.storeName = (config) => ATHR.ct(config, "name") || (config && config.name) || "";

ATHR.clone = (value) => JSON.parse(JSON.stringify(value ?? null));

ATHR.isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// دمج عميق: الكائنات تُدمج، والقوائم تُستبدل كاملة
ATHR.merge = function merge(base, over) {
    if (!ATHR.isPlainObject(base)) return over === undefined ? ATHR.clone(base) : ATHR.clone(over);
    const out = ATHR.clone(base);
    if (!ATHR.isPlainObject(over)) return out;
    Object.keys(over).forEach((key) => {
        const value = over[key];
        if (value === undefined) return;
        out[key] = ATHR.isPlainObject(out[key]) && ATHR.isPlainObject(value)
            ? merge(out[key], value)
            : ATHR.clone(value);
    });
    return out;
};

ATHR.fullConfig = (saved) => ATHR.merge(ATHR_DEFAULTS, saved || {});

ATHR.escape = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

ATHR.uid = (prefix = "") => prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

// رقم واتساب: 8 أرقام ← يضاف رمز عُمان
// أرقام عربية ← إنجليزية
ATHR.digits = (value) => String(value ?? "")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

ATHR.normalizePhone = function (value) {
    let digits = ATHR.digits(value).replace(/[^\d]/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.length === 8) digits = "968" + digits;
    return digits;
};

ATHR.isValidWhatsapp = (value) => /^\d{10,15}$/.test(ATHR.normalizePhone(value));

ATHR.localPhone = (value) => ATHR.digits(value).replace(/[^\d]/g, "").replace(/^(00968|968)(?=\d{8}$)/, "");

ATHR.isOmaniMobile = (value) => /^[79]\d{7}$/.test(ATHR.localPhone(value));

ATHR.isUrl = function (value) {
    try {
        const url = new URL(String(value || "").trim());
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
};

// رابط داخل المتجر (c/clubs/ أو #/c/clubs) أو رابط https
ATHR.isSafeLink = (value) => {
    const link = String(value || "").trim();
    if (!link) return true;
    if (link.startsWith("#")) return true;
    if (/^[a-z0-9\u0621-\u064a][^:]*$/i.test(link) && !link.startsWith("//")) return true;
    return ATHR.isUrl(link);
};

ATHR.money = function (amount, config) {
    const order = (config && config.order) || ATHR_DEFAULTS.order;
    const decimals = Number.isInteger(Number(order.decimals)) ? Number(order.decimals) : 3;
    const value = Number(amount || 0);
    const text = value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${text} ${ATHR.lang === "en" ? "OMR" : order.currency || ""}`.trim();
};

// أقل سعر توصيل مفعّل
ATHR.lowestShipping = function (config) {
    const prices = (config.order.delivery || []).filter((d) => d.enabled && d.pricing !== "per_kg").map((d) => Number(d.price) || 0);
    return prices.length ? Math.min(...prices) : 0;
};

// الرموز {free} {ship} {name} {phone}
ATHR.fill = function (text, config, extra = {}) {
    const tokens = {
        free: ATHR.money(config.order.free_min, config),
        ship: ATHR.money(ATHR.lowestShipping(config), config),
        name: ATHR.storeName(config),
        phone: ATHR.localPhone(config.order.whatsapp),
        ...extra
    };
    return String(text ?? "").replace(/\{(\w+)\}/g, (match, key) => (key in tokens ? tokens[key] : match));
};

ATHR.waLink = function (number, text) {
    const phone = ATHR.normalizePhone(number);
    return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

// تاريخ ووقت مسقط
ATHR.muscatParts = function (date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const opt = { timeZone: "Asia/Muscat" };
    const day = new Intl.DateTimeFormat("ar-OM", { ...opt, weekday: "long" }).format(d);
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { ...opt, day: "2-digit", month: "2-digit", year: "numeric" })
        .formatToParts(d).map((p) => [p.type, p.value]));
    const timeParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { ...opt, hour: "numeric", minute: "2-digit", hour12: true })
        .formatToParts(d).map((p) => [p.type, p.value]));
    const period = String(timeParts.dayPeriod || "").toUpperCase() === "AM" ? "ص" : "م";
    return {
        day,
        date: `${parts.day}/${parts.month}/${parts.year}`,
        time: `${timeParts.hour}:${timeParts.minute} ${period}`
    };
};

ATHR.newOrderNo = () => "AT-" + String(Math.floor(10000 + Math.random() * 90000));

// حساب السلة: المجموع، خصم الباقات، التوصيل المجاني
ATHR.computeCart = function (cartItems, products, config, country = "OM") {
    const byId = new Map(products.map((p) => [p.id, p]));
    const lines = [];
    cartItems.forEach((item) => {
        const product = byId.get(item.id);
        if (!product) return;
        const qty = Math.max(1, Math.min(Number(item.qty) || 1, Number(config.order.max_qty) || 99));
        lines.push({ product, qty, total: Number(product.price) * qty });
    });

    const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
    const remaining = new Map(lines.map((line) => [line.product.id, line.qty]));
    const savings = [];
    const hints = [];

    (config.sales.bundles || []).forEach((bundle) => {
        if (!bundle.enabled || !bundle.a || !bundle.b || bundle.a === bundle.b) return;
        const a = byId.get(bundle.a);
        const b = byId.get(bundle.b);
        if (!a || !b) return;
        const pct = Math.max(0, Math.min(90, Number(bundle.pct) || 0));
        const pairs = Math.min(remaining.get(a.id) || 0, remaining.get(b.id) || 0);
        if (pairs > 0) {
            const amount = pairs * Number(b.price) * pct / 100;
            savings.push({ bundle, a, b, pct, pairs, amount });
            remaining.set(a.id, remaining.get(a.id) - pairs);
            remaining.set(b.id, remaining.get(b.id) - pairs);
        }
        if ((remaining.get(a.id) || 0) > 0 && !(remaining.get(b.id) > 0) && b.is_available !== false) {
            hints.push({ bundle, a, b, pct });
        }
    });

    const round3 = (x) => Math.round(x * 1000) / 1000;
    const count = lines.reduce((sum, line) => sum + line.qty, 0);
    const bundleAmount = round3(savings.reduce((sum, s) => sum + s.amount, 0));

    // خصم الكمية: لا يجتمع مع خصم الباقات، ويُطبَّق الأفضل للزبون
    const volume = ATHR.volumeFor(config, count, subtotal);
    let discount = 0;
    let discountType = null;
    let discountLabel = "";
    if (volume.tier && volume.amount > bundleAmount) {
        discount = volume.amount;
        discountType = "volume";
        discountLabel = `خصم الكمية ${volume.tier.pct}%`;
    } else if (bundleAmount > 0) {
        discount = bundleAmount;
        discountType = "bundle";
        discountLabel = "خصم الباقة";
    }

    const afterDiscount = Math.max(0, round3(subtotal - discount));
    const freeMin = Number(config.order.free_min) || 0;
    const freeEligible = Boolean(config.order.free_enabled) && freeMin > 0 && ATHR.freeAppliesTo(config, country);
    const freeShipping = freeEligible && afterDiscount >= freeMin;
    const leftForFree = freeEligible ? Math.max(0, round3(freeMin - afterDiscount)) : 0;
    const bundleHints = discountType === "volume" ? [] : hints;

    return {
        lines, subtotal, discount, discountType, discountLabel, discountPct: discountType === "volume" ? volume.tier.pct : 0, afterDiscount,
        freeEligible, freeShipping, leftForFree,
        savings: discountType === "bundle" ? savings : [], hints: bundleHints,
        volume, count
    };
};

// شرائح خصم الكمية المفعّلة، مرتبة من الأقل
ATHR.volumeTiers = function (config) {
    const vol = config.sales && config.sales.volume;
    if (!vol || !vol.enabled || !Array.isArray(vol.tiers)) return [];
    return vol.tiers
        .map((t) => ({ min: Math.round(Number(t.min)), pct: Number(t.pct) }))
        .filter((t) => t.min >= 2 && t.pct > 0 && t.pct <= 90)
        .sort((a, b) => a.min - b.min);
};

ATHR.volumeFor = function (config, count, subtotal) {
    const tiers = ATHR.volumeTiers(config);
    const tier = tiers.filter((t) => count >= t.min).pop() || null;
    const next = tiers.find((t) => count < t.min) || null;
    const amount = tier ? Math.round(subtotal * tier.pct * 10) / 1000 : 0;
    return { tiers, tier, next, amount };
};

// «قطعة واحدة» «قطعتين» «3 قطع»
ATHR.piecesText = (n) => {
    if (ATHR.lang === "en") return n === 1 ? "1 item" : `${n} items`;
    return n === 1 ? "قطعة واحدة" : n === 2 ? "قطعتين" : n <= 10 ? `${n} قطع` : `${n} قطعة`;
};

// اسم الخصم للعرض بلغة الزائر (discountLabel يبقى بالعربي للطلب ورسالة واتساب)
ATHR.discountName = (totals) => (totals.discountType === "volume"
    ? ATHR.t("خصم الكمية {pct}%", { pct: totals.discountPct })
    : totals.discountType === "bundle" ? ATHR.t("خصم الباقة") : "");

// مدة التوصيل بلغة الزائر: «2 إلى 4 أيام» ← "2–4 days"
ATHR.duration = function (text) {
    if (ATHR.lang !== "en" || !text) return text || "";
    const d = ATHR.parseDays(text);
    if (!d) return text;
    return d.min === d.max ? `${d.min} day${d.min === 1 ? "" : "s"}` : `${d.min}–${d.max} days`;
};

// سطر منتج في الرسائل: الاسم (اللون)
// اسم المنتج مع لونه بلغة الزائر (للعرض)
ATHR.displayLabel = function (product, config) {
    const color = (config.colors || []).find((c) => c.id === product.color_id);
    const name = ATHR.L(product, "name");
    return color ? `${name} (${ATHR.L(color, "name")})` : name;
};

// اسم المنتج مع لونه بالعربي دائمًا (للطلب ورسالة واتساب)
ATHR.productLabel = function (product, config) {
    const color = (config.colors || []).find((c) => c.id === product.color_id);
    return color ? `${product.name} (${color.name})` : product.name;
};


// =====================================================
// دول الخليج والعملات
// =====================================================

ATHR.BASE_COUNTRY = "OM";

// قائمة الدول بعد دمج إعداداتك (سعر الصرف، التفعيل) مع البيانات الثابتة
// أسعار الصرف اليومية (js/rates.js يُحدَّث تلقائيًا مع بناء الصفحات)، إلا إذا اخترت الأسعار اليدوية
ATHR.liveRates = function (config) {
    const live = ATHR_ROOT.ATHR_RATES;
    if (!live || !live.rates) return null;
    if (config && config.order && config.order.auto_rates === false) return null;
    return live;
};

ATHR.countries = function (config) {
    const saved = (config && config.order && config.order.countries) || [];
    const live = ATHR.liveRates(config);
    return ATHR_COUNTRIES.map((base) => {
        const own = saved.find((c) => c && c.code === base.code) || {};
        const rate = Number(own.rate);
        const auto = live ? Number(live.rates[base.currency]) : 0;
        return {
            ...base,
            enabled: base.code === ATHR.BASE_COUNTRY ? true : own.enabled !== false,
            rate: base.code === ATHR.BASE_COUNTRY ? 1 : (auto > 0 ? auto : rate > 0 ? rate : base.rate),
            symbol: own.symbol || base.symbol
        };
    });
};

ATHR.country = (config, code) => ATHR.countries(config).find((c) => c.code === code) || ATHR.countries(config)[0];

ATHR.inCountries = (item, code) => !Array.isArray(item.countries) || !item.countries.length || item.countries.includes(code);

ATHR.deliveriesFor = (config, code) => (config.order.delivery || []).filter((d) => d.enabled && ATHR.inCountries(d, code));

ATHR.paymentsFor = (config, code) => (config.order.payments || []).filter((p) => p.enabled && ATHR.inCountries(p, code));

ATHR.freeAppliesTo = (config, code) => {
    const list = config.order.free_countries;
    return !Array.isArray(list) || !list.length || list.includes(code);
};

// المبلغ بعملة الدولة (التحويل من الريال العماني)
ATHR.moneyIn = function (amount, config, code) {
    const c = ATHR.country(config, code);
    if (c.code === ATHR.BASE_COUNTRY) return ATHR.money(amount, config);
    const value = Number(amount || 0) * c.rate;
    const text = value.toLocaleString("en-US", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
    return `${text} ${ATHR.lang === "en" ? c.currency : c.symbol}`;
};

// وزن الطلب بالغرام
ATHR.cartWeight = function (lines, config) {
    const fallback = Number(config.order.default_weight_g) || 400;
    return lines.reduce((sum, l) => sum + (Number(l.product.weight_g) > 0 ? Number(l.product.weight_g) : fallback) * l.qty, 0);
};

// سعر التوصيل: ثابت، أو لكل كيلو (يُقرَّب لأعلى، والحد الأدنى كيلو واحد)
ATHR.shippingFor = function (method, lines, config) {
    if (!method) return { cost: 0, kg: 0, weight: 0 };
    const price = Number(method.price) || 0;
    if (method.pricing === "per_kg") {
        const weight = ATHR.cartWeight(lines, config);
        const kg = Math.max(1, Math.ceil(weight / 1000));
        return { cost: kg * price, kg, weight };
    }
    return { cost: price, kg: 0, weight: 0 };
};

// الجوال: OM يُحفظ 8 أرقام، وباقي الدول برمز الدولة
ATHR.parsePhone = function (value, code) {
    const c = ATHR_COUNTRIES.find((x) => x.code === code) || ATHR_COUNTRIES[0];
    let digits = ATHR.digits(value).replace(/[^\d]/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith(c.dial) && digits.length > c.dial.length + 6) digits = digits.slice(c.dial.length);
    if (digits.startsWith("0")) digits = digits.slice(1);
    const rule = ATHR_PHONE_RULES[c.code] || ATHR_PHONE_RULES.OM;
    const valid = rule.re.test(digits);
    return { valid, local: digits, stored: c.code === "OM" ? digits : c.dial + digits, rule };
};

// رقم واتساب الزبون من الرقم المحفوظ
ATHR.customerWhatsapp = function (phone, code) {
    const digits = ATHR.digits(phone).replace(/[^\d]/g, "");
    if ((code || "OM") === "OM" && digits.length === 8) return "968" + digits;
    return digits;
};

// =====================================================
// الهدية: المناسبات، ورسائل مقترحة، وبطاقة الإهداء الرقمية
// =====================================================

ATHR.GIFT_OCCASIONS = [
    { id: "birthday", emoji: "🎂", name: "عيد ميلاد", title: "عيد ميلاد سعيد", msgs: ["كل عام وأنت بخير، عسى أيامك كلها فرح 🎉", "عيد ميلاد سعيد يا أغلى الناس ❤️"], name_en: "Birthday", title_en: "Happy birthday", msgs_en: ["Happy birthday! Wishing you a year full of joy 🎉", "Happy birthday to someone very special ❤️"], for: "🎂 بمناسبة عيد ميلادك", for_en: "🎂 For your birthday" },
    { id: "graduation", emoji: "🎓", name: "تخرّج", title: "مبروك التخرج", msgs: ["مبروك التخرج! فخورين فيك 🎓", "ألف مبروك، والقادم أجمل بإذن الله ✨"], name_en: "Graduation", title_en: "Congratulations, graduate", msgs_en: ["Congratulations on your graduation! So proud of you 🎓", "Congrats, the best is yet to come ✨"], for: "🎓 بمناسبة تخرّجك", for_en: "🎓 For your graduation" },
    { id: "wedding", emoji: "💍", name: "زواج", title: "ألف مبروك", msgs: ["ألف مبروك، بالرفاه والبنين 💍", "مبروك الزواج، الله يتمم عليكم بخير ❤️"], name_en: "Wedding", title_en: "Congratulations", msgs_en: ["Congratulations on your wedding 💍", "Wishing you a lifetime of love and happiness ❤️"], for: "💍 بمناسبة زواجك", for_en: "💍 For your wedding" },
    { id: "newborn", emoji: "👶", name: "مولود جديد", title: "مبروك المولود", msgs: ["مبروك المولود، يتربى في عزّكم 👶", "الحمد لله على السلامة، ومبروك ما جاكم 🤍"], name_en: "New baby", title_en: "Congratulations on the new baby", msgs_en: ["Congratulations on your little one 👶", "Welcome to the world, little one 🤍"], for: "👶 بمناسبة المولود الجديد", for_en: "👶 For your new baby" },
    { id: "eid", emoji: "🌙", name: "عيد", title: "عيدكم مبارك", msgs: ["عيدكم مبارك، وكل عام وأنتم بخير 🌙", "عساكم من عوّاده، وعيدكم سعيد ✨"], name_en: "Eid", title_en: "Eid Mubarak", msgs_en: ["Eid Mubarak! Wishing you joy and blessings 🌙", "Happy Eid to you and your family ✨"], for: "🌙 بمناسبة العيد", for_en: "🌙 For Eid" },
    { id: "thanks", emoji: "💐", name: "شكر وتقدير", title: "شكراً لك", msgs: ["شكراً لأنك موجود في حياتي 💐", "هدية بسيطة تعبيراً عن شكري وتقديري 🤍"], name_en: "Thank you", title_en: "Thank you", msgs_en: ["Thank you for being in my life 💐", "A small gift to say thank you 🤍"], for: "💐 شكراً وتقديراً لك", for_en: "💐 With thanks and appreciation" },
    { id: "other", emoji: "🎁", name: "بدون مناسبة", title: "وصلتك هدية", msgs: ["هدية بسيطة لشخص غالي ❤️", "حبيت أفرحك بهذي الهدية 🎁"], name_en: "Just because", title_en: "A gift for you", msgs_en: ["A little gift for someone special ❤️", "Just wanted to make you smile 🎁"], for: "", for_en: "" }
];

ATHR.giftOccasion = (id) => ATHR.GIFT_OCCASIONS.find((o) => o.id === id) || ATHR.GIFT_OCCASIONS[ATHR.GIFT_OCCASIONS.length - 1];

function athrB64url(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function athrUnB64url(code) {
    const bin = atob(String(code).replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

// محتوى البطاقة داخل الرابط نفسه (بدون أي سعر أو رقم هاتف)
ATHR.giftCode = (card) => athrB64url(JSON.stringify({
    t: String(card.to || "").slice(0, 60),
    f: String(card.from || "").slice(0, 60),
    m: String(card.msg || "").slice(0, 300),
    o: String(card.occasion || "other").slice(0, 20)
}));

ATHR.giftDecode = function (code) {
    try {
        const d = JSON.parse(athrUnB64url(code || ""));
        return { to: String(d.t || ""), from: String(d.f || ""), msg: String(d.m || ""), occasion: String(d.o || "other") };
    } catch {
        return null;
    }
};

// رسالة واتساب للمُهدى إليه: جميلة وفيها رسالة صاحب الهدية ورابط البطاقة
ATHR.giftWhatsApp = function ({ to, from, msg, occasion, link, store }) {
    const t = ATHR.t;
    const o = ATHR.giftOccasion(occasion);
    const text = String(msg || "").trim();
    const blocks = [
        [`🎁✨ *${t("{name}، وصلتك هدية!", { name: to })}* ✨🎁`],
        [from ? t("هدية مختارة لك بكل حب من *{from}* 💝", { from }) : t("هدية مختارة لك بكل حب 💝"), ATHR.L(o, "for")],
        text ? [`💌 *${t("رسالة لك:")}*`, `«${text}»`] : [],
        [t("👇 افتح بطاقة هديتك:"), link],
        [t("🚚 هديتك في الطريق إليك من {store}", { store })]
    ];
    return blocks.map((b) => b.filter(Boolean).join("\n")).filter(Boolean).join("\n\n");
};

ATHR.giftCardPath = (order) => ATHR.url.page("gift", `c=${ATHR.giftCode({
    to: order.gift_name,
    from: String(order.customer_name || "").trim().split(/\s+/)[0],
    msg: order.gift_message,
    occasion: order.gift_occasion
})}`);

// =====================================================
// رسالة الطلب (واتساب ونسخ الطلب): قصيرة وواضحة، بالعربي دائماً
// =====================================================
ATHR.orderText = function (order, config, { first = "", last = "", cardUrl = "" } = {}) {
    return ATHR.withLang("ar", () => {
        const cfg = config;
        const c = ATHR.country(cfg, order.country || ATHR.BASE_COUNTRY);
        const isBaseCountry = c.code === ATHR.BASE_COUNTRY;
        const decimals = Number.isInteger(Number(cfg.order.decimals)) ? Number(cfg.order.decimals) : 3;
        const num = (v) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        const when = ATHR.muscatParts(order.ordered_at || new Date());
        const phone = (v) => ATHR.phoneText(v, c.code);
        const giftTo = order.gift && (order.gift_name || order.gift_phone);
        const out = [];
        const block = (lines) => {
            const list = lines.filter(Boolean);
            if (!list.length) return;
            if (out.length) out.push("");
            out.push(...list);
        };

        block([String(first || "").trim(), `🧾 رقم الطلب: ${order.order_no}`, `🗓️ ${when.day} ${when.date} · ${when.time}`]);

        const occ = ATHR.giftOccasion(order.gift_occasion);
        block([
            `👤 ${giftTo ? "من: " : ""}${order.customer_name || ""}${order.phone ? ` · ${phone(order.phone)}` : ""}`,
            giftTo ? `🎁 إلى: ${order.gift_name || ""}${order.gift_phone ? ` · ${phone(order.gift_phone)}` : ""}` : order.gift ? "🎁 الطلب هدية" : "",
            order.gift && order.gift_occasion && order.gift_occasion !== "other" ? `🎉 المناسبة: ${occ.emoji} ${occ.name}` : "",
            order.gift && order.gift_message ? `💬 رسالة الهدية: ${order.gift_message}` : "",
            giftTo && order.gift_hide_price ? "🤫 لا تذكر السعر للمُهدى إليه" : ""
        ]);

        const place = isBaseCountry
            ? [order.wilaya, order.governorate].filter(Boolean).join("، ")
            : [`${c.flag} ${c.name}`, order.governorate, order.wilaya].filter(Boolean).join(" · ");
        block([
            place ? `📍 ${place}` : "",
            order.delivery_name ? `🚚 ${order.delivery_name}` : "",
            order.office ? `🏢 المكتب: ${order.office}` : order.address ? `🏠 العنوان: ${order.address}` : "",
            order.notes ? `📝 ملاحظة: ${order.notes}` : ""
        ]);

        const items = Array.isArray(order.items) && order.items.length
            ? order.items.map((it) => `• ${it.label || it.name}${Number(it.qty) > 1 ? ` ×${it.qty}` : ""} · ${num(it.total)}`)
            : String(order.items_text || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => (l.startsWith("•") ? l : `• ${l}`));
        const local = isBaseCountry ? "" : ` (≈ ${ATHR.moneyIn(order.total, cfg, c.code)})`;
        block([
            ...items,
            Number(order.discount) > 0 ? `${order.discount_label || "الخصم"}: -${num(order.discount)}` : "",
            order.delivery_name || Number(order.delivery_price) > 0 ? `التوصيل: ${Number(order.delivery_price) > 0 ? num(order.delivery_price) : "مجاني"}` : "",
            `💰 الإجمالي: ${ATHR.money(order.total, cfg)}${local}`,
            order.payment_name ? `💳 الدفع: ${order.payment_name}` : ""
        ]);

        block([cardUrl ? `💌 بطاقة الإهداء: ${cardUrl}` : "", String(last || "").trim()]);
        return out.join("\n");
    });
};

// الرقم كما يُكتب في الرسائل: رقم عماني محلي كما هو، وغيره بالمفتاح الدولي
ATHR.phoneText = function (phone, code) {
    const digits = ATHR.digits(phone || "").replace(/[^\d]/g, "");
    if (!digits) return "";
    if ((code || "OM") === "OM" && digits.length === 8) return digits;
    return "+" + digits;
};

// رقم يُحفظ في الطلب: محلي لو الرقم والطلب كلاهما في عُمان، وإلا بالمفتاح الدولي
ATHR.storePhone = function (local, phoneCode, orderCode) {
    const c = ATHR_COUNTRIES.find((x) => x.code === phoneCode) || ATHR_COUNTRIES[0];
    return phoneCode === "OM" && (orderCode || "OM") === "OM" ? local : c.dial + local;
};


// =====================================================
// روابط الصفحات (صفحة حقيقية لكل منتج وقسم)
// =====================================================

ATHR.base = () => {
    const b = ATHR_ROOT.ATHR_BASE || "/";
    return b.endsWith("/") ? b : b + "/";
};

// رابط عربي ثابت: «كوب الهلال أبيض» ← «كوب-الهلال-أبيض»
ATHR.slugify = function (text) {
    return ATHR.digits(String(text || "").normalize("NFC").toLowerCase())
        .replace(/[ً-ْٰـ]/g, "")
        .replace(/[^0-9a-zء-ي]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 70)
        .replace(/-$/, "");
};

ATHR.uniqueSlug = function (base, taken) {
    const clean = base || "منتج";
    if (!taken.has(clean)) return clean;
    let n = 2;
    while (taken.has(`${clean}-${n}`)) n++;
    return `${clean}-${n}`;
};

ATHR.productSlugBase = function (product, config) {
    const color = (config.colors || []).find((c) => c.id === product.color_id);
    return ATHR.slugify(`${product.name || ""} ${color ? color.name : ""}`);
};

ATHR.url = {
    home: () => ATHR.base(),
    product: (p) => `${ATHR.base()}p/${encodeURIComponent(p.slug || p.id)}/`,
    category: (c) => `${ATHR.base()}c/${encodeURIComponent(c.slug)}/`,
    page: (name, query) => `${ATHR.base()}${name}/${query ? `?${query}` : ""}`
};

// الرابط الكامل للمتجر (للمشاركة وجوجل)
ATHR.siteUrl = function (config) {
    const raw = String((config && config.contact && config.contact.share_url) || "").trim();
    const url = ATHR.isUrl(raw) ? raw : "https://a3r-om.github.io/ATHR/";
    return url.endsWith("/") ? url : url + "/";
};

// يحوّل مسار داخل المتجر إلى رابط كامل
ATHR.absUrl = function (config, path) {
    const site = ATHR.siteUrl(config);
    const rel = String(path || "").startsWith(ATHR.base()) ? path.slice(ATHR.base().length) : String(path || "").replace(/^\//, "");
    return site + rel;
};

// =====================================================
// ألوان التصميم الواحد: «كوب الهلال» أبيض وأسود = منتج واحد بلونين
// =====================================================

ATHR.normName = (s) => String(s || "")
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/["'“”«»…().,!؟?\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// خريطة: رقم المنتج ← قائمة ألوان نفس التصميم (إن وُجد أكثر من لون مختلف)
ATHR.buildGroups = function (products, config) {
    const colorOrder = new Map((config.colors || []).map((c, i) => [c.id, i]));
    const byKey = new Map();
    products.forEach((p) => {
        const key = `${p.category_id || ""}|${ATHR.normName(p.name)}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(p);
    });
    const groupOf = new Map();
    byKey.forEach((list) => {
        if (list.length < 2) return;
        const colors = list.map((p) => p.color_id || "");
        if (colors.some((c) => !c) || new Set(colors).size !== colors.length) return;
        const sorted = list.slice().sort((a, b) => (colorOrder.get(a.color_id) ?? 99) - (colorOrder.get(b.color_id) ?? 99));
        sorted.forEach((p) => groupOf.set(p.id, sorted));
    });
    return groupOf;
};

// =====================================================
// الصور المصغّرة (تُنشأ تلقائيًا في GitHub وتُحفظ في images/t)
// =====================================================

// بصمة قصيرة ثابتة للنص (cyrb53)
ATHR.hashStr = function (str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) {
        const ch = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

// size: "s" للبطاقات، "m" لصفحة المنتج. إن لم توجد نسخة مصغّرة تُستعمل الصورة الأصلية
// يقبل رابطًا كاملًا أو صورة داخل المتجر مثل images/categories/clubs.jpg
ATHR.thumb = function (url, size = "s") {
    if (!url) return "";
    if (/^data:/i.test(url)) return url;
    const remote = /^https?:/i.test(url);
    const map = ATHR_ROOT.ATHR_THUMBS;
    const h = ATHR.hashStr(url);
    if (map && map[h]) return `${ATHR.base()}images/t/${h}${size === "m" ? "-m" : ""}.webp`;
    return remote || url.startsWith("/") ? url : ATHR.base() + url;
};

// روابط مؤقتة للمنتجات التي ليس لها رابط محفوظ (نفس النتيجة في المتصفح وسكربت البناء)
ATHR.assignSlugs = function (products, config) {
    const taken = new Set(products.map((p) => p.slug).filter(Boolean));
    return products.map((p) => {
        if (p.slug) return p;
        const slug = ATHR.uniqueSlug(ATHR.productSlugBase(p, config), taken);
        taken.add(slug);
        return { ...p, slug };
    });
};

// =====================================================
// الألوان والخطوط
// =====================================================

ATHR.FONT_PARAMS = {
    "Reem Kufi": "Reem+Kufi:wght@500;700",
    "Cairo": "Cairo:wght@400;700",
    "El Messiri": "El+Messiri:wght@500;700",
    "Lalezar": "Lalezar",
    "Noto Kufi Arabic": "Noto+Kufi+Arabic:wght@500;700",
    "Amiri": "Amiri:wght@400;700",
    "Changa": "Changa:wght@500;700",
    "Readex Pro": "Readex+Pro:wght@400;600",
    "IBM Plex Sans Arabic": "IBM+Plex+Sans+Arabic:wght@400;600;700",
    "Tajawal": "Tajawal:wght@400;700",
    "Almarai": "Almarai:wght@400;700",
    "Noto Sans Arabic": "Noto+Sans+Arabic:wght@400;600;700",
    "Mada": "Mada:wght@400;600;700",
    "Rubik": "Rubik:wght@400;500;700",
    "Alexandria": "Alexandria:wght@400;600;700",
    "Vazirmatn": "Vazirmatn:wght@400;600;700",
    "Noto Naskh Arabic": "Noto+Naskh+Arabic:wght@400;600;700",
    "Zain": "Zain:wght@400;700",
    "Baloo Bhaijaan 2": "Baloo+Bhaijaan+2:wght@400;600;700"
};

ATHR.isHex = (x) => /^#[0-9a-f]{6}$/i.test(String(x || ""));

ATHR.themeColors = function (config) {
    const t = (config && config.theme) || {};
    const D = ATHR_DEFAULTS.theme;
    const pick = (x, d) => (ATHR.isHex(x) ? x : d);
    return { primary: pick(t.primary, D.primary), hero: pick(t.hero, D.hero), bg: pick(t.bg, D.bg), text: pick(t.text, D.text) };
};

ATHR.themeVars = function (config) {
    const t = config.theme || {};
    const c = ATHR.themeColors(config);
    const head = ATHR.FONT_PARAMS[t.font_head] ? `"${t.font_head}"` : "system-ui";
    const body = ATHR.FONT_PARAMS[t.font_body] ? `"${t.font_body}"` : "system-ui";
    return `:root{--primary:${c.primary};--hero:${c.hero};--bg:${c.bg};--text:${c.text};--font-head:${head},${body},system-ui,sans-serif;--font-body:${body},system-ui,-apple-system,"Segoe UI",sans-serif}`;
};

ATHR.fontHref = function (config) {
    const t = config.theme || {};
    const families = [t.font_head, t.font_body].filter((f, i, arr) => ATHR.FONT_PARAMS[f] && arr.indexOf(f) === i);
    return families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${ATHR.FONT_PARAMS[f]}`).join("&")}&display=swap` : "";
};

ATHR.themeMode = (config) => (["light", "dark", "auto"].includes(config.theme && config.theme.mode) ? config.theme.mode : "auto");

ATHR.radiusClass = (config) => ({ sharp: "r-sharp", round: "r-round" }[config.theme && config.theme.radius] || "");

// مدة التوصيل «2 إلى 4 أيام» ← {min:2, max:4}
ATHR.parseDays = function (text) {
    const nums = (ATHR.digits(text).match(/\d+/g) || []).map(Number);
    if (!nums.length) return null;
    return { min: Math.min(...nums), max: Math.max(...nums) };
};
