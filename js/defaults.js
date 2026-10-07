/* =====================================================
   ATHR STORE — الإعدادات الافتراضية والأدوات المشتركة
   أي إعداد غير محفوظ في قاعدة البيانات يأخذ قيمته من هنا.
===================================================== */

const ATHR_GOVERNORATES = [
    "مسقط", "شمال الباطنة", "جنوب الباطنة", "الداخلية", "الظاهرة", "البريمي",
    "شمال الشرقية", "جنوب الشرقية", "الوسطى", "ظفار", "مسندم"
];

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
        hero_features: ["توصيل لكل المحافظات", "مجاني فوق {free}", "الدفع عند الاستلام"],
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
            { id: "home", enabled: true, name: "توصيل إلى البيت", type: "home", price: 2, note: "يصلك الطلب إلى باب بيتك.", duration: "2 إلى 4 أيام" },
            { id: "office", enabled: true, name: "استلام من مكتب جيناكم", type: "office", price: 1.5, note: "تستلم طلبك من أقرب مكتب لك.", duration: "2 إلى 3 أيام" }
        ],
        free_enabled: true,
        free_min: 10,
        governorates: ATHR_GOVERNORATES.slice(),
        max_qty: 10,
        show_wilaya: true,
        wilaya_required: true,
        show_notes: true,
        payments: [
            { id: "cod", enabled: true, name: "الدفع عند الاستلام", type: "cod", note: "تدفع نقدًا عند استلام طلبك." }
        ]
    },

    sales: {
        free_bar_show: true,
        free_before: "توصيل مجاني للطلبات من {free} أو أكثر",
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
    const prices = (config.order.delivery || []).filter((d) => d.enabled).map((d) => Number(d.price) || 0);
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
ATHR.computeCart = function (cartItems, products, config) {
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
    const freeShipping = Boolean(config.order.free_enabled) && freeMin > 0 && afterDiscount >= freeMin;
    const leftForFree = config.order.free_enabled && freeMin > 0 ? Math.max(0, freeMin - afterDiscount) : 0;
    const count = lines.reduce((sum, line) => sum + line.qty, 0);

    return { lines, subtotal, discount, afterDiscount, freeShipping, leftForFree, savings, hints, count };
};

// سطر منتج في الرسائل: الاسم (اللون)
ATHR.productLabel = function (product, config) {
    const color = (config.colors || []).find((c) => c.id === product.color_id);
    return color ? `${product.name} (${color.name})` : product.name;
};
