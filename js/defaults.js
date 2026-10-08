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
        visitor_mode: true,
        template: "classic",
        header: "color",
        page_size: 12,
        home_filter: true
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
        favorites: true,
        pdp_perks: true,
        restock: true,
        coupons: true,
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
        marketing_default: true,
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

    // بطاقة الإهداء: نصوصها وألوانها وخطها ورسالة واتساب للمُهدى إليه (كلها تتعدل من لوحة التحكم ← الهدية)
    // بكسل الإعلانات: رقم Meta Pixel (إنستغرام وفيسبوك) ورقم TikTok Pixel. الفارغ = متوقف
    tracking: {
        meta_pixel: "",
        tiktok_pixel: ""
    },

    gift: {
        kicker: "هدية خاصة لك",
        title: "{to}، وصلتك هدية!",
        button: "افتح هديتك",
        hint: "اضغط على الصندوق لتفتحها",
        closing: "مع خالص المحبة،",
        footer: "هديتك في الطريق إليك من {store} 🎁",
        empty_msg: "هدية مختارة لك بكل حب",
        font: "Aref Ruqaa",
        colors: { bg: "#4A0A14", box: "#8E1A2C", ribbon: "#F2C964", paper: "#FFF8EC", ink: "#3B2A20", accent: "#8E1A2C" },
        stars: true,
        confetti: true,
        tag: true,
        vibrate: true,
        wa: "🎁✨ *{to}، وصلتك هدية!* ✨🎁\n\nهدية مختارة لك بكل حب من *{from}* 💝\n{occasion}\n\n💌 *رسالة لك:*\n«{message}»\n\n👇 افتح بطاقة هديتك:\n{link}\n\n🚚 هديتك في الطريق إليك من {store}",
        banner_title: "أرسلها هدية لمن تحب",
        banner_text: "نوصلها باسمك مع بطاقة إهداء رقمية فيها رسالتك، وبدون ذكر السعر.",
        banner_button: "ابدأ",
        cta_title: "أرسله هدية",
        cta_sub: "بطاقة إهداء رقمية باسمك، وبدون ذكر السعر",
        // الزبون يختار: الهدية لولد (أزرق وأبيض) أو لبنت (وردي وأبيض) فتتلوّن البطاقة والصندوق
        genders: {
            enabled: true,
            boy: { label: "ولد", emoji: "👦", colors: { bg: "#0D3B7D", box: "#2F7DE1", ribbon: "#FFFFFF", paper: "#FFFFFF", ink: "#14325A", accent: "#1F64C8" } },
            girl: { label: "بنت", emoji: "👧", colors: { bg: "#B23C74", box: "#F27DAE", ribbon: "#FFFFFF", paper: "#FFFFFF", ink: "#55203F", accent: "#D23F7C" } }
        },
        occasions: {
            birthday: { enabled: true, emoji: "", name: "", title: "", for: "", msgs: "" },
            graduation: { enabled: true, emoji: "", name: "", title: "", for: "", msgs: "" },
            wedding: { enabled: true, emoji: "", name: "", title: "", for: "", msgs: "" },
            newborn: { enabled: true, emoji: "", name: "", title: "", for: "", msgs: "" },
            eid: { enabled: true, emoji: "", name: "", title: "", for: "", msgs: "" },
            thanks: { enabled: true, emoji: "", name: "", title: "", for: "", msgs: "" },
            other: { enabled: true, emoji: "", name: "", title: "", for: "", msgs: "" }
        }
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

// المناسبات بعد تعديلاتك من لوحة التحكم (الخانة الفارغة تأخذ النص الأصلي)
ATHR.giftOccasions = function (config, { all = true } = {}) {
    const own = (config && config.gift && config.gift.occasions) || {};
    const list = ATHR.GIFT_OCCASIONS.map((base) => {
        const o = own[base.id] || {};
        const pick = (k) => (typeof o[k] === "string" && o[k].trim() ? o[k].trim() : base[k]);
        const msgs = typeof o.msgs === "string" && o.msgs.trim() ? o.msgs.split("\n").map((m) => m.trim()).filter(Boolean) : base.msgs;
        const changed = (k) => typeof o[k] === "string" && o[k].trim();
        return {
            ...base,
            emoji: pick("emoji"),
            name: pick("name"),
            title: pick("title"),
            for: pick("for"),
            msgs,
            // إذا غيّرت النص العربي نستعمله بالإنجليزي أيضاً بدل الترجمة القديمة
            ...(changed("name") ? { name_en: "" } : {}),
            ...(changed("title") ? { title_en: "" } : {}),
            ...(changed("for") ? { for_en: "" } : {}),
            ...(typeof o.msgs === "string" && o.msgs.trim() ? { msgs_en: [] } : {}),
            enabled: o.enabled !== false || base.id === "other"
        };
    });
    return all ? list : list.filter((o) => o.enabled);
};

ATHR.giftOccasion = (id, config) => {
    const list = ATHR.giftOccasions(config);
    return list.find((o) => o.id === id) || list[list.length - 1];
};

// الهدية لولد أو لبنت: الاسم والإيموجي والألوان (من لوحة التحكم، والفارغ يأخذ الأصلي)
ATHR.GIFT_FOR = ["boy", "girl"];
ATHR.giftGendersOn = (config) => !(config && config.gift && config.gift.genders && config.gift.genders.enabled === false);
ATHR.giftFor = function (id, config) {
    if (!ATHR.GIFT_FOR.includes(id)) return null;
    const D = ATHR_DEFAULTS.gift.genders[id];
    const o = (config && config.gift && config.gift.genders && config.gift.genders[id]) || {};
    const label = typeof o.label === "string" && o.label.trim() ? o.label.trim() : D.label;
    const colors = {};
    Object.keys(D.colors).forEach((k) => { colors[k] = ATHR.isHex(o.colors && o.colors[k]) ? o.colors[k] : D.colors[k]; });
    return {
        id,
        label,
        label_en: label === D.label ? (id === "boy" ? "Boy" : "Girl") : "",
        emoji: typeof o.emoji === "string" && o.emoji.trim() ? o.emoji.trim() : D.emoji,
        heart: id === "boy" ? "💙" : "💗",
        colors
    };
};

// ألوان بطاقة الإهداء: ألوان الولد/البنت إن اختارها الزبون، وإلا ألوان الهدية العامة
ATHR.giftColors = function (config, gender) {
    const f = ATHR.giftGendersOn(config) ? ATHR.giftFor(gender, config) : null;
    if (f) return f.colors;
    const D = ATHR_DEFAULTS.gift.colors;
    const c = (config && config.gift && config.gift.colors) || {};
    const out = {};
    Object.keys(D).forEach((k) => { out[k] = ATHR.isHex(c[k]) ? c[k] : D[k]; });
    return out;
};

// تعبئة نص البطاقة: {to} {from} {store}
ATHR.giftFill = (text, vars) => String(text ?? "").replace(/\{(to|from|store)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));

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
    o: String(card.occasion || "other").slice(0, 20),
    ...(card.gender === "boy" ? { g: "b" } : card.gender === "girl" ? { g: "g" } : {})
}));

ATHR.giftDecode = function (code) {
    try {
        const d = JSON.parse(athrUnB64url(code || ""));
        return { to: String(d.t || ""), from: String(d.f || ""), msg: String(d.m || ""), occasion: String(d.o || "other"), gender: d.g === "b" ? "boy" : d.g === "g" ? "girl" : "" };
    } catch {
        return null;
    }
};

// رسالة واتساب للمُهدى إليه: جميلة وفيها رسالة صاحب الهدية ورابط البطاقة
ATHR.giftWhatsApp = function ({ to, from, msg, occasion, link, store, config }) {
    const tpl = (config && ATHR.ct(config, "gift.wa")) || ATHR_DEFAULTS.gift.wa;
    const o = ATHR.giftOccasion(occasion, config);
    const values = {
        to: to || "",
        from: from || "",
        store: store || "",
        occasion: o.id === "other" ? "" : ATHR.L(o, "for") || "",
        message: String(msg || "").trim(),
        link: link || ""
    };
    const out = [];
    String(tpl).split("\n").forEach((line) => {
        const had = /\{(to|from|store|occasion|message|link)\}/.test(line);
        const filled = line.replace(/\{(to|from|store|occasion|message|link)\}/g, (m, k) => values[k]);
        // سطر صار فارغاً لأن قيمته غير موجودة (مثل رسالة لم تُكتب) يُحذف، ومعه عنوانه الذي ينتهي بنقطتين
        if (had && !filled.replace(/[\s«»"“”*_~]/g, "")) {
            if (out.length && /[:：]\**\s*$/.test(out[out.length - 1])) out.pop();
            return;
        }
        out.push(filled.replace(/\*\s*\*/g, "").replace(/(من|by)\s+💝/, "💝"));
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

// =====================================================
// كود الخصم: يُحسب بعد خصومات المتجر (نفس منطق الخادم في athr_recompute_order)
// =====================================================
ATHR.couponCode = (x) => String(x || "").trim().toUpperCase().replace(/\s+/g, "");
ATHR.couponValid = (x) => /^[A-Z0-9_-]{3,20}$/.test(ATHR.couponCode(x));
ATHR.couponEffect = function (coupon, afterDiscount) {
    if (!coupon || !coupon.code) return { amount: 0, freeShip: false, ok: false, short: 0 };
    const min = Number(coupon.min_total) || 0;
    if (afterDiscount < min) return { amount: 0, freeShip: false, ok: false, short: Math.round((min - afterDiscount) * 1000) / 1000 };
    const value = Number(coupon.value) || 0;
    if (coupon.kind === "ship") return { amount: 0, freeShip: true, ok: true, short: 0 };
    const amount = coupon.kind === "fixed" ? Math.min(value, afterDiscount) : Math.round(afterDiscount * Math.min(value, 90) * 10) / 1000;
    return { amount: Math.round(amount * 1000) / 1000, freeShip: false, ok: true, short: 0 };
};
// وصف الكود: «خصم 10%» / «خصم 1.000 ر.ع» / «توصيل مجاني»
ATHR.couponText = function (coupon, config) {
    if (!coupon) return "";
    if (coupon.kind === "ship") return "توصيل مجاني";
    if (coupon.kind === "fixed") return `خصم ${ATHR.money(coupon.value, config)}`;
    return `خصم ${Number(coupon.value)}%`;
};

// =====================================================
// بكسل الإعلانات: نقبل الرقم وحده، أو الكود كاملاً كما تنسخه من Meta أو TikTok
// =====================================================
ATHR.metaPixelId = function (raw) {
    const text = String(raw || "").trim();
    const m = text.match(/fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})/) || text.match(/[?&]id=(\d{8,20})/) || text.match(/^\s*(\d{8,20})\s*$/);
    return m ? m[1] : "";
};
ATHR.tiktokPixelId = function (raw) {
    const text = String(raw || "").trim();
    const m = text.match(/ttq\.load\(\s*['"]([A-Z0-9]{10,40})['"]/i) || text.match(/sdkid=([A-Z0-9]{10,40})/i) || text.match(/^\s*([A-Z0-9]{10,40})\s*$/i);
    return m ? m[1].toUpperCase() : "";
};
// منصات الإعلان تدعم الدولار دائماً، والريال العماني مربوط به: 1 ر.ع = 2.6008 دولار
ATHR.OMR_USD = 2.6008;
ATHR.toUSD = (omr) => Math.round(Number(omr || 0) * ATHR.OMR_USD * 100) / 100;

// =====================================================
// العرض الخاص: رابط منتج شخصي يرسله صاحب المتجر للعميل في واتساب
// فيه الاسم الأول وموعد انتهاء العرض فقط (بدون رقم هاتف أو أي بيانات أخرى)
// =====================================================
ATHR.offerCode = (o) => athrB64url(JSON.stringify({
    n: String((o && o.name) || "").slice(0, 40),
    ...(o && o.ends ? { e: Math.round(o.ends / 60000) } : {})
}));

ATHR.offerDecode = function (code) {
    try {
        const d = JSON.parse(athrUnB64url(code || ""));
        return { name: String(d.n || "").slice(0, 40), ends: Number(d.e) > 0 ? Number(d.e) * 60000 : 0 };
    } catch {
        return null;
    }
};

// رابط المنتج الخاص (o= أو ref=offer حتى تُحسب الزيارات والطلبات القادمة من العروض)
ATHR.offerLink = (p, o) => `${ATHR.url.product(p)}?${o && (o.name || o.ends) ? `o=${ATHR.offerCode(o)}` : "ref=offer"}`;

// «يومين و5 ساعات» / «3 ساعات» / «20 دقيقة»
ATHR.leftText = function (ms) {
    const en = ATHR.isEn && ATHR.isEn();
    const mins = Math.max(1, Math.round(ms / 60000));
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    const ar = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`);
    const unit = (n, k) => (en
        ? `${n} ${{ d: "day", h: "hour", m: "minute" }[k]}${n === 1 ? "" : "s"}`
        : { d: ar(n, "يوم", "يومين", "أيام", "يوماً"), h: ar(n, "ساعة", "ساعتين", "ساعات", "ساعة"), m: ar(n, "دقيقة", "دقيقتين", "دقائق", "دقيقة") }[k]);
    const parts = d ? [unit(d, "d"), h ? unit(h, "h") : ""] : h ? [unit(h, "h"), m && h < 3 ? unit(m, "m") : ""] : [unit(m, "m")];
    return parts.filter(Boolean).join(en ? " " : " و");
};

ATHR.giftCardPath = (order) => ATHR.url.page("gift", `c=${ATHR.giftCode({
    to: order.gift_name,
    from: String(order.customer_name || "").trim().split(/\s+/)[0],
    msg: order.gift_message,
    occasion: order.gift_occasion,
    gender: order.gift_for
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

        const occ = ATHR.giftOccasion(order.gift_occasion, cfg);
        const gfor = order.gift ? ATHR.giftFor(order.gift_for, cfg) : null;
        block([
            `👤 ${giftTo ? "من: " : ""}${order.customer_name || ""}${order.phone ? ` · ${phone(order.phone)}` : ""}`,
            giftTo ? `🎁 إلى: ${order.gift_name || ""}${order.gift_phone ? ` · ${phone(order.gift_phone)}` : ""}` : order.gift ? "🎁 الطلب هدية" : "",
            gfor ? `${gfor.emoji} الهدية لـ: ${gfor.label} ${gfor.heart}` : "",
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
            order.coupon ? `🎟️ كود الخصم ${order.coupon}${Number(order.coupon_discount) > 0 ? `: -${num(order.coupon_discount)}` : ""}` : "",
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
    "Baloo Bhaijaan 2": "Baloo+Bhaijaan+2:wght@400;600;700",
    "Aref Ruqaa": "Aref+Ruqaa:wght@400;700",
    "Rakkas": "Rakkas",
    "Lemonada": "Lemonada:wght@500;700",
    "Marhey": "Marhey:wght@500;700"
};

ATHR.isHex = (x) => /^#[0-9a-f]{6}$/i.test(String(x || ""));

ATHR.themeColors = function (config) {
    const t = (config && config.theme) || {};
    const D = ATHR_DEFAULTS.theme;
    const pick = (x, d) => (ATHR.isHex(x) ? x : d);
    return { primary: pick(t.primary, D.primary), hero: pick(t.hero, D.hero), bg: pick(t.bg, D.bg), text: pick(t.text, D.text) };
};

// درجة سطوع اللون (0 أسود ← 1 أبيض) لاختيار لون الكتابة المناسب فوقه تلقائياً
ATHR.luma = function (hex) {
    const n = parseInt(String(hex || "#000000").slice(1), 16) || 0;
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};

// أبيض فوق الألوان الغامقة، وغامق فوق الألوان الفاتحة (مثل الذهبي)
ATHR.onColor = function (hex) {
    const L = ATHR.luma(hex);
    return 1.05 / (L + 0.05) >= (L + 0.05) / 0.057 ? "#FFFFFF" : "#141414";
};

ATHR.themeVars = function (config) {
    const t = config.theme || {};
    const c = ATHR.themeColors(config);
    const head = ATHR.FONT_PARAMS[t.font_head] ? `"${t.font_head}"` : "system-ui";
    const body = ATHR.FONT_PARAMS[t.font_body] ? `"${t.font_body}"` : "system-ui";
    const onPrimary = ATHR.onColor(c.primary);
    let css = `:root{--primary:${c.primary};--hero:${c.hero};--bg:${c.bg};--text:${c.text};--on-primary:${onPrimary};--logo-filter:${onPrimary === "#FFFFFF" ? "none" : "brightness(0)"};--font-head:${head},${body},system-ui,sans-serif;--font-body:${body},system-ui,-apple-system,"Segoe UI",sans-serif}`;
    // اللون الأساسي أسود تقريباً: في الوضع الداكن نجعل الأزرار فاتحة حتى تبقى واضحة
    if (ATHR.luma(c.primary) < 0.025) {
        const dark = "--btn-bg:#F1EEE8;--btn-ink:#141414";
        css += `html[data-mode="dark"]{${dark}}@media (prefers-color-scheme:dark){html[data-mode="auto"]{${dark}}}`;
    }
    return css;
};

// =====================================================
// قوالب المتجر: كل قالب يغيّر الألوان والخطوط والزوايا والشريط العلوي
// وشكل البطاقات (عبر الصنف tpl-<id> في css/store.css). المنتجات والنصوص لا تتغير.
// =====================================================

ATHR.TEMPLATES = [
    {
        id: "classic",
        name: "أثر الكلاسيكي",
        desc: "الشكل الأصلي: عنابي وبيج مع زخرفة عربية، وأقسام بصور مستطيلة.",
        theme: { primary: "#7D1420", hero: "#4A0D12", bg: "#EBDDC9", text: "#251A1B", font_head: "Reem Kufi", font_body: "IBM Plex Sans Arabic", radius: "medium", header: "color", hero_pattern: true }
    },
    {
        id: "minimal",
        name: "أبيض بسيط",
        desc: "مثل الماركات العالمية: الشعار في المنتصف، أقسام بالكلمات فقط، وزر «+» صغير فوق صورة المنتج.",
        theme: { primary: "#111111", hero: "#111111", bg: "#FFFFFF", text: "#111111", font_head: "IBM Plex Sans Arabic", font_body: "IBM Plex Sans Arabic", radius: "sharp", header: "light", hero_pattern: false }
    },
    {
        id: "boutique",
        name: "بوتيك ناعم",
        desc: "واجهة كبطاقة مدوّرة فيها صور منتجاتك، أقسام دائرية، وكل شيء في المنتصف. مثالي للهدايا.",
        theme: { primary: "#9C5B45", hero: "#4E342B", bg: "#F7F1EA", text: "#2E2420", font_head: "El Messiri", font_body: "Tajawal", radius: "round", header: "light", hero_pattern: false }
    },
    {
        id: "luxe",
        name: "أسود فاخر",
        desc: "أسود وذهبي: واجهة كبيرة في المنتصف، أقسام كبطاقات مجلة، وإطار ذهبي حول صور المنتجات.",
        theme: { primary: "#121212", hero: "#0B0B0C", bg: "#F5F2EC", text: "#1A1814", font_head: "Amiri", font_body: "IBM Plex Sans Arabic", radius: "sharp", header: "color", hero_pattern: true }
    },
    {
        id: "bold",
        name: "عصري جريء",
        desc: "أزرق قوي: واجهة مقسومة فيها صورة منتج مائلة، أقسام عريضة، وأسعار كبيرة واضحة.",
        theme: { primary: "#1F4BFF", hero: "#0A0F2C", bg: "#F2F4F8", text: "#0D1020", font_head: "Alexandria", font_body: "Readex Pro", radius: "medium", header: "color", hero_pattern: false }
    },
    {
        id: "calm",
        name: "طبيعي هادئ",
        desc: "أخضر هادئ: واجهة بحافة مقوّسة، أقسام على شكل أقواس، والمنتجات قائمة أفقية سهلة التصفح.",
        theme: { primary: "#4F6B52", hero: "#2E3F31", bg: "#F1F0E8", text: "#22291F", font_head: "Almarai", font_body: "Almarai", radius: "round", header: "light", hero_pattern: false }
    },
    {
        id: "fun",
        name: "مرح ملوّن",
        desc: "بنفسجي وأصفر: صور منتجاتك كملصقات، أقسام ككبسولات ملوّنة، وحدود سوداء شبابية.",
        theme: { primary: "#6C3BE0", hero: "#2B1660", bg: "#FFF6E5", text: "#22163A", font_head: "Baloo Bhaijaan 2", font_body: "Baloo Bhaijaan 2", radius: "round", header: "color", hero_pattern: false }
    }
];

ATHR.template = function (config) {
    const id = config && config.theme && config.theme.template;
    return ATHR.TEMPLATES.find((x) => x.id === id) || ATHR.TEMPLATES[0];
};

// هل غيّر صاحب المتجر شيئاً من ألوان/خطوط القالب بعد تطبيقه؟
ATHR.templateEdited = function (config) {
    const tp = ATHR.template(config);
    const t = (config && config.theme) || {};
    return Object.keys(tp.theme).some((k) => String(t[k] ?? "").toLowerCase() !== String(tp.theme[k]).toLowerCase());
};

// أصناف <html>: الزوايا + القالب + الشريط العلوي الفاتح
ATHR.themeClasses = function (config) {
    const t = (config && config.theme) || {};
    return [
        { sharp: "r-sharp", round: "r-round" }[t.radius] || "",
        `tpl-${ATHR.template(config).id}`,
        t.header === "light" ? "head-light" : ""
    ].filter(Boolean);
};

// لون شريط المتصفح في الجوال
ATHR.headColor = (config) => (config.theme && config.theme.header === "light" ? "#FFFFFF" : ATHR.themeColors(config).primary);

ATHR.fontHref = function (config) {
    const t = config.theme || {};
    const families = [t.font_head, t.font_body].filter((f, i, arr) => ATHR.FONT_PARAMS[f] && arr.indexOf(f) === i);
    return families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${ATHR.FONT_PARAMS[f]}`).join("&")}&display=swap` : "";
};

ATHR.themeMode = (config) => (["light", "dark", "auto"].includes(config.theme && config.theme.mode) ? config.theme.mode : "auto");

ATHR.radiusClass = (config) => ATHR.themeClasses(config).join(" ");

// مدة التوصيل «2 إلى 4 أيام» ← {min:2, max:4}
ATHR.parseDays = function (text) {
    const nums = (ATHR.digits(text).match(/\d+/g) || []).map(Number);
    if (!nums.length) return null;
    return { min: Math.min(...nums), max: Math.max(...nums) };
};
