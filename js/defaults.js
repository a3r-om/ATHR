/* =====================================================
   ATHR STORE — الإعدادات الافتراضية والأدوات المشتركة
   أي إعداد غير محفوظ في قاعدة البيانات يأخذ قيمته من هنا.
===================================================== */

const ATHR_GOVERNORATES = [
    "مسقط", "شمال الباطنة", "جنوب الباطنة", "الداخلية", "الظاهرة", "البريمي",
    "شمال الشرقية", "جنوب الشرقية", "الوسطى", "ظفار", "مسندم"
];

// دول الخليج: العلم والعملة وسعر الصرف (1 ريال عماني = rate من عملة الدولة)
const ATHR_COUNTRIES = [
    { code: "OM", name: "سلطنة عُمان", flag: "🇴🇲", currency: "OMR", currency_name: "ريال عماني", currency_def: "الريال العماني", symbol: "ر.ع", decimals: 3, rate: 1, dial: "968", enabled: true },
    { code: "AE", name: "الإمارات", flag: "🇦🇪", currency: "AED", currency_name: "درهم إماراتي", currency_def: "الدرهم الإماراتي", symbol: "د.إ", decimals: 2, rate: 9.5514, dial: "971", enabled: true },
    { code: "SA", name: "السعودية", flag: "🇸🇦", currency: "SAR", currency_name: "ريال سعودي", currency_def: "الريال السعودي", symbol: "ر.س", decimals: 2, rate: 9.7529, dial: "966", enabled: true },
    { code: "KW", name: "الكويت", flag: "🇰🇼", currency: "KWD", currency_name: "دينار كويتي", currency_def: "الدينار الكويتي", symbol: "د.ك", decimals: 3, rate: 0.8048, dial: "965", enabled: true },
    { code: "QA", name: "قطر", flag: "🇶🇦", currency: "QAR", currency_name: "ريال قطري", currency_def: "الريال القطري", symbol: "ر.ق", decimals: 2, rate: 9.4669, dial: "974", enabled: true },
    { code: "BH", name: "البحرين", flag: "🇧🇭", currency: "BHD", currency_name: "دينار بحريني", currency_def: "الدينار البحريني", symbol: "د.ب", decimals: 3, rate: 0.9779, dial: "973", enabled: true }
];

// أرقام الجوال المحلية لكل دولة (بدون رمز الدولة)
const ATHR_PHONE_RULES = {
    OM: { re: /^[79]\d{7}$/, hint: "8 أرقام يبدأ بـ7 أو 9", example: "9XXXXXXX" },
    AE: { re: /^5\d{8}$/, hint: "9 أرقام يبدأ بـ5 (مثل 50XXXXXXX)", example: "5XXXXXXXX" },
    SA: { re: /^5\d{8}$/, hint: "9 أرقام يبدأ بـ5 (مثل 55XXXXXXX)", example: "5XXXXXXXX" },
    KW: { re: /^[569]\d{7}$/, hint: "8 أرقام يبدأ بـ5 أو 6 أو 9", example: "XXXXXXXX" },
    QA: { re: /^[3567]\d{7}$/, hint: "8 أرقام يبدأ بـ3 أو 5 أو 6 أو 7", example: "XXXXXXXX" },
    BH: { re: /^[36]\d{7}$/, hint: "8 أرقام يبدأ بـ3 أو 6", example: "XXXXXXXX" }
};

const ATHR_DEFAULTS = {
    name: "أثر",
    logo_url: "images/logo.png",
    show_name: true,
    logo_shape: "rounded",

    theme: {
        primary: "#7D1420",
        hero: "#4A0D12",
        bg: "#F6F3F1",
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
        hero_image: ""
    },

    texts: {
        announce_show: false,
        announce_text: "",
        hero_title: "كاسات تترك أثراً",
        hero_text: "تصاميم أندية وشخصيات على كاسات بملمس مطفي. اختر تصميمك وأرسل طلبك عبر واتساب.",
        hero_button: "تصفّح المنتجات",
        hero_features: ["توصيل لكل دول الخليج", "مجاني داخل عُمان فوق {free}", "الدفع عند الاستلام في عُمان والإمارات"],
        search_placeholder: "ابحث عن فريق أو شخصية…",
        all_label: "الكل",
        add_to_cart: "أضف للسلة",
        sold_out: "نفد المخزون",
        about: "أثر متجر لكاسات بتصاميم الأندية والشخصيات وتصاميم أخرى.",
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
        trust_custom: []
    },

    contact: {
        menu_show: true,
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
    }
};

const ATHR = window.ATHR = window.ATHR || {};

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

// رابط داخل المتجر (#/c/clubs) أو رابط https
ATHR.isSafeLink = (value) => {
    const link = String(value || "").trim();
    if (!link) return true;
    if (link.startsWith("#")) return true;
    return ATHR.isUrl(link);
};

ATHR.money = function (amount, config) {
    const order = (config && config.order) || ATHR_DEFAULTS.order;
    const decimals = Number.isInteger(Number(order.decimals)) ? Number(order.decimals) : 3;
    const value = Number(amount || 0);
    const text = value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${text} ${order.currency || ""}`.trim();
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
        name: config.name || "",
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

    const discount = Math.round(savings.reduce((sum, s) => sum + s.amount, 0) * 1000) / 1000;
    const afterDiscount = Math.max(0, subtotal - discount);
    const freeMin = Number(config.order.free_min) || 0;
    const freeEligible = Boolean(config.order.free_enabled) && freeMin > 0 && ATHR.freeAppliesTo(config, country);
    const freeShipping = freeEligible && afterDiscount >= freeMin;
    const leftForFree = freeEligible ? Math.max(0, freeMin - afterDiscount) : 0;
    const count = lines.reduce((sum, line) => sum + line.qty, 0);

    return { lines, subtotal, discount, afterDiscount, freeEligible, freeShipping, leftForFree, savings, hints, count };
};

// سطر منتج في الرسائل: الاسم (اللون)
ATHR.productLabel = function (product, config) {
    const color = (config.colors || []).find((c) => c.id === product.color_id);
    return color ? `${product.name} (${color.name})` : product.name;
};


// =====================================================
// دول الخليج والعملات
// =====================================================

ATHR.BASE_COUNTRY = "OM";

// قائمة الدول بعد دمج إعداداتك (سعر الصرف، التفعيل) مع البيانات الثابتة
ATHR.countries = function (config) {
    const saved = (config && config.order && config.order.countries) || [];
    return ATHR_COUNTRIES.map((base) => {
        const own = saved.find((c) => c && c.code === base.code) || {};
        const rate = Number(own.rate);
        return {
            ...base,
            enabled: base.code === ATHR.BASE_COUNTRY ? true : own.enabled !== false,
            rate: base.code === ATHR.BASE_COUNTRY ? 1 : (rate > 0 ? rate : base.rate),
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
    return `${text} ${c.symbol}`;
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
