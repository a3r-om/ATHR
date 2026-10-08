/* =====================================================
   ATHR STORE — لوحة التحكم ودفتر الطلبيات (للمالك فقط)
   التعديلات تُحفظ مسودة على الجوال حتى تضغط «نشر التغييرات».
===================================================== */

(function () {
    "use strict";

    const esc = ATHR.escape;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const sb = window.athrSupabase;
    const BUCKET = "product-images";
    const DRAFT_KEY = "athr_admin_draft_v2";

    const A = {
        view: null,
        server: null,
        draft: null,
        tab: "home",
        rowMenu: null,
        editing: null,
        productFilter: "",
        errors: [],
        busy: false,
        orders: [],
        ordersLoaded: false,
        filter: { q: "", status: "all", pay: "all" },
        book: "orders",
        reviews: [],
        reviewsLoaded: false,
        statsDays: 30,
        stats: null,
        prevTheme: null,
        customers: [],
        customersLoaded: false,
        custFilter: { q: "", kind: "all" },
        offer: null,
        promo: null,
        restockRun: null,
        couponEdit: null
    };

    const CHANNELS = {
        direct: "مباشر",
        instagram: "إنستغرام",
        tiktok: "تيك توك",
        whatsapp: "واتساب",
        google: "جوجل",
        snapchat: "سناب شات",
        facebook: "فيسبوك",
        x: "X (تويتر)",
        offer: "عروض واتساب",
        other: "مواقع أخرى"
    };

    const TABS = [
        ["products", "المنتجات", "box", "إضافة وتعديل المنتجات والصور والأسعار"],
        ["ad", "الإعلان", "megaphone", "صورة أو فيديو أعلى المتجر"],
        ["catalog", "الأقسام والألوان", "grid", "أقسام المتجر وصورها وألوان المنتجات"],
        ["templates", "القوالب", "layout", "قوالب جاهزة بضغطة: شكل كامل للمتجر"],
        ["look", "المظهر", "palette", "الألوان والخطوط والشعار والوضع الداكن"],
        ["texts", "النصوص", "text", "العناوين والجمل ورسائل واتساب"],
        ["order", "الطلب والتوصيل", "truck", "التوصيل والدفع والدول والعملات"],
        ["sales", "المبيعات والعروض", "tag", "أكواد المؤثرين والخصومات والمفضلة"],
        ["gift", "الهدية", "gift", "شكل البطاقة والألوان والخط والرسالة"],
        ["ads", "تتبع الإعلانات", "chart", "Meta Pixel و TikTok Pixel ونتائج إعلاناتك"],
        ["contact", "التواصل والآراء", "chat", "واتساب والقائمة وآراء العملاء"]
    ];

    const ICONS = {
        box: '<path d="M12 3.2 20 7.6v8.8l-8 4.4-8-4.4V7.6l8-4.4Z"/><path d="M4 7.6 12 12l8-4.4M12 12v8.8"/>',
        megaphone: '<path d="M4 10.5v3a1.5 1.5 0 0 0 1.5 1.5H7l5 4V5L7 9H5.5A1.5 1.5 0 0 0 4 10.5Z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>',
        grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
        palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.9-.9 1.6-2-.3-1.3.5-2.3 1.8-2.3h1.9a3.2 3.2 0 0 0 3.2-3.2C20.5 7.2 16.7 3.5 12 3.5Z"/><circle cx="7.8" cy="11" r="1.1"/><circle cx="10.5" cy="7.5" r="1.1"/><circle cx="14.8" cy="7.8" r="1.1"/>',
        text: '<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>',
        truck: '<path d="M3 6.5h11v9H3zM14 9.5h3.6l3 3.2v2.8H14"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
        tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.7 6.7a1.4 1.4 0 0 1-2 0l-8.3-8.3Z"/><circle cx="8.2" cy="8.2" r="1.5"/>',
        chat: '<path d="M4 5.5h16v10H9l-5 4v-14Z"/><path d="M8 9.5h8M8 12.5h5"/>',
        receipt: '<path d="M6 3.5h12v17l-2.5-1.6-2 1.6-1.5-1.6-1.5 1.6-2-1.6L6 20.5v-17Z"/><path d="M9 8h6M9 11.5h6M9 15h4"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        layout: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9h17M10 9v11"/>',
        chart: '<path d="M4 19.5h16"/><path d="M7 16v-4M12 16V8M17 16v-6"/><path d="M6 9.5l5-4 3 2.5 5-4"/>',
        sparkle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8 1.8-5Z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/>',
        eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
        back: '<path d="M9.5 6l6 6-6 6"/>',
        dots: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
        users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.8-3.4 3.2-5 6-5s5.2 1.6 6 5"/><circle cx="17" cy="9.5" r="2.6"/><path d="M16 14.6c2.6 0 4.4 1.4 5 4.4"/>',
        gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5C10 4 6.5 5 7.5 7.2 8.2 8.5 12 8.5 12 8.5ZM12 8.5c2-4.5 5.5-3.5 4.5-1.3-.7 1.3-4.5 1.3-4.5 1.3Z"/>'
    };
    const icon = (key) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[key] || ""}</svg>`;

    // خطوط بسيطة وواضحة ومشهورة تدعم العربي والإنجليزي
    const SIMPLE_FONTS = ["IBM Plex Sans Arabic", "Cairo", "Tajawal", "Almarai", "Rubik", "Alexandria", "Vazirmatn", "Noto Sans Arabic", "Noto Kufi Arabic", "Noto Naskh Arabic", "Readex Pro", "Mada", "Changa", "Zain", "Baloo Bhaijaan 2"];
    const HEAD_FONTS = [...SIMPLE_FONTS, "Reem Kufi", "El Messiri", "Amiri", "Lalezar"];
    const BODY_FONTS = [...SIMPLE_FONTS, "system"];

    const storage = {
        get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
        set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
        del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
    };

    const toast = (msg) => ATHR.store.toast(msg);
    const asset = (src) => ATHR.views.asset(src);
    const siteLink = (path) => new URL(path, location.origin).href;
    const cfg = () => A.draft.config;
    const money = (v) => ATHR.money(v, A.draft ? A.draft.config : ATHR.fullConfig({}));

    // =====================================================
    // ROOT / OPEN / CLOSE
    // =====================================================

    function root() {
        let el = $("#adm");
        if (!el) {
            el = document.createElement("div");
            el.id = "adm";
            el.className = "adm";
            el.setAttribute("role", "dialog");
            el.setAttribute("aria-modal", "true");
            el.setAttribute("aria-label", "لوحة التحكم");
            el.setAttribute("dir", "rtl");
            el.setAttribute("lang", "ar");
            document.body.appendChild(el);
            el.addEventListener("click", onClick);
            el.addEventListener("input", onInput);
            el.addEventListener("change", onChange);
            el.addEventListener("submit", onSubmit);
        }
        return el;
    }

    async function open(name) {
        const el = root();
        el.hidden = false;
        document.body.classList.add("locked");
        A.view = name;

        const { data } = await sb.auth.getSession();
        if (!data || !data.session) {
            renderLogin();
            return;
        }
        const isAdmin = await verifyAdmin(data.session.user.id);
        if (!isAdmin) {
            await sb.auth.signOut();
            renderLogin("هذا الحساب ليس لديه صلاحية إدارة المتجر.");
            return;
        }
        ATHR.store.setAdmin(true);

        if (name === "orders") {
            await openOrders();
        } else {
            await openPanel();
        }
    }

    function close() {
        const el = $("#adm");
        if (el) {
            el.hidden = true;
            el.innerHTML = "";
        }
        document.body.classList.remove("locked");
        A.view = null;
        A.editing = null;
        ATHR.store.closeOwner();
    }

    async function verifyAdmin(userId) {
        const { data, error } = await sb.from("admin_users").select("id").eq("id", userId).maybeSingle();
        return !error && Boolean(data);
    }

    // =====================================================
    // LOGIN
    // =====================================================

    function renderLogin(error = "") {
        const config = ATHR.store.state().config;
        root().innerHTML = `
            <div class="adm-login">
                <form class="adm-card adm-login-card" id="loginForm" novalidate>
                    <div class="adm-login-logo"><img src="${esc(asset(config.logo_url || "images/logo.png"))}" alt=""></div>
                    <h1>لوحة التحكم</h1>
                    <p class="adm-muted">ادخل بحساب المتجر لتعديل المتجر ومتابعة الطلبات.</p>
                    <label class="af"><span>البريد الإلكتروني</span><input class="ai" id="loginEmail" type="email" autocomplete="email" dir="ltr" required></label>
                    <label class="af"><span>كلمة المرور</span><input class="ai" id="loginPass" type="password" autocomplete="current-password" dir="ltr" required></label>
                    <p class="adm-error" id="loginError" role="alert">${esc(error)}</p>
                    <button class="ab ab-primary ab-block" type="submit" id="loginBtn">دخول</button>
                    <button class="ab ab-ghost ab-block" type="button" data-a="close">رجوع للمتجر</button>
                </form>
            </div>`;
        setTimeout(() => $("#loginEmail")?.focus(), 50);
    }

    async function doLogin() {
        const email = $("#loginEmail").value.trim();
        const password = $("#loginPass").value;
        const err = $("#loginError");
        const btn = $("#loginBtn");
        if (!email || !password) {
            err.textContent = "اكتب البريد الإلكتروني وكلمة المرور.";
            return;
        }
        btn.disabled = true;
        btn.textContent = "جاري الدخول...";
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        btn.disabled = false;
        btn.textContent = "دخول";
        if (error) {
            err.textContent = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
            return;
        }
        if (!(await verifyAdmin(data.user.id))) {
            await sb.auth.signOut();
            err.textContent = "هذا الحساب ليس لديه صلاحية إدارة المتجر.";
            return;
        }
        open(A.view || "admin");
    }

    // =====================================================
    // SERVER STATE & DRAFT
    // =====================================================

    async function loadServer() {
        const [s, c, p, m] = await Promise.all([
            sb.from("store_settings").select("config,updated_at").eq("id", 1).maybeSingle(),
            sb.from("categories").select("id,name,name_en,slug,sort_order,description,description_en,image_url").order("sort_order", { ascending: true }),
            sb.from("products").select("id,name,name_en,slug,price,old_price,category_id,image_url,is_available,is_visible,is_best_seller,is_new_arrival,description,description_en,color_id,sort_order,video_url,weight_g,created_at").order("sort_order", { ascending: true }),
            sb.from("product_media").select("product_id,media_type,media_url,sort_order").order("sort_order", { ascending: true })
        ]);
        const failed = [s, c, p, m].find((r) => r.error);
        if (failed) throw failed.error;

        const media = new Map();
        (m.data || []).forEach((row) => {
            if (!media.has(row.product_id)) media.set(row.product_id, []);
            media.get(row.product_id).push({ type: row.media_type === "video" ? "video" : "image", url: row.media_url });
        });

        A.serverUpdated = Date.parse(s.data?.updated_at || "") || 0;
        A.server = {
            config: ATHR.fullConfig(s.data?.config || {}),
            categories: (c.data || []).map((x) => ({ id: x.id, name: x.name, name_en: x.name_en || "", slug: x.slug, description: x.description || "", description_en: x.description_en || "", image_url: x.image_url || "" })),
            products: (p.data || []).map((x) => ({
                id: x.id,
                name: x.name || "",
                name_en: x.name_en || "",
                slug: x.slug || "",
                price: Number(x.price),
                old_price: x.old_price === null ? null : Number(x.old_price),
                category_id: x.category_id,
                image_url: x.image_url || "",
                is_available: x.is_available !== false,
                is_visible: x.is_visible !== false,
                is_best_seller: x.is_best_seller === true,
                is_new_arrival: x.is_new_arrival === true,
                description: x.description || "",
                description_en: x.description_en || "",
                color_id: x.color_id || "",
                video_url: x.video_url || "",
                weight_g: x.weight_g === null || x.weight_g === undefined ? null : Number(x.weight_g),
                media: media.get(x.id) || []
            }))
        };
    }

    function restoreDraft() {
        const saved = storage.get(DRAFT_KEY);
        // إن تغيّر المتجر بعد حفظ المسودة (من جهاز آخر)، نفتح آخر نسخة منشورة حتى لا تُرجع المسودة القديمة شيئًا
        if (saved && saved.saved && A.serverUpdated && saved.saved < A.serverUpdated) {
            storage.del(DRAFT_KEY);
            A.draft = ATHR.clone(A.server);
            setTimeout(() => toast("تم تحديث المتجر من مكان آخر، فتحنا لك آخر نسخة منشورة"), 300);
            return;
        }
        if (saved && saved.data && saved.data.config) {
            A.draft = saved.data;
            A.draft.config = ATHR.fullConfig(A.draft.config);
        } else {
            A.draft = ATHR.clone(A.server);
        }
    }

    function isDirty() {
        return JSON.stringify(A.draft) !== JSON.stringify(A.server);
    }

    let saveTimer;
    function saveDraft() {
        A.errors = [];
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            if (isDirty()) storage.set(DRAFT_KEY, { saved: Date.now(), data: A.draft });
            else storage.del(DRAFT_KEY);
            renderStatus();
        }, 250);
        renderStatus();
    }

    function renderStatus() {
        const el = $("#admStatus");
        if (!el) return;
        const dirty = isDirty();
        el.textContent = dirty ? "تعديلات غير منشورة، محفوظة على جوالك" : "كل شيء منشور";
        el.classList.toggle("dirty", dirty);
        const pub = $("#publishBtn");
        const dis = $("#discardBtn");
        if (pub) pub.disabled = !dirty || A.busy;
        if (dis) dis.disabled = !dirty || A.busy;
    }

    // ---------- paths: "config.texts.hero_title" / "products.#<id>.name" ----------

    function resolve(path, create = false) {
        const parts = String(path).split(".");
        let obj = A.draft;
        for (let i = 0; i < parts.length - 1; i++) {
            let key = parts[i];
            if (key.startsWith("#") && Array.isArray(obj)) {
                obj = obj.find((x) => x && x.id === key.slice(1));
            } else {
                if (obj[key] === undefined && create) obj[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
                obj = obj[key];
            }
            if (obj === undefined || obj === null) return { parent: null, key: null };
        }
        let last = parts[parts.length - 1];
        if (last.startsWith("#") && Array.isArray(obj)) {
            const idx = obj.findIndex((x) => x && x.id === last.slice(1));
            last = idx;
        }
        return { parent: obj, key: last };
    }

    function getPath(path) {
        const { parent, key } = resolve(path);
        return parent ? parent[key] : undefined;
    }

    function setPath(path, value) {
        const { parent, key } = resolve(path, true);
        if (parent) parent[key] = value;
    }

    // =====================================================
    // PANEL
    // =====================================================

    async function openPanel() {
        root().innerHTML = `<div class="adm-loading">جاري تحميل لوحة التحكم...</div>`;
        try {
            if (!A.server) await loadServer();
            if (!A.draft) restoreDraft();
        } catch (error) {
            console.error(error);
            root().innerHTML = `<div class="adm-loading"><p>تعذر تحميل بيانات المتجر. تأكد من الإنترنت.</p><button class="ab ab-primary" data-a="retry">إعادة المحاولة</button> <button class="ab ab-ghost" data-a="close">إغلاق</button></div>`;
            return;
        }
        renderPanel();
    }

    function renderPanel() {
        root().innerHTML = `
            <div class="adm-shell">
                <header class="adm-top">
                    ${A.tab === "home"
                        ? `<h1>لوحة التحكم</h1>`
                        : `<div class="adm-title"><button class="adm-back" type="button" data-tab="home" aria-label="رجوع للرئيسية">${icon("back")}<span>الرئيسية</span></button><h1>${esc(tabLabel(A.tab))}</h1></div>`}
                    <div class="adm-top-actions">
                        <button class="ab ab-light ab-sm" type="button" data-a="preview">معاينة المتجر</button>
                        <button class="adm-icon" type="button" data-a="account" aria-label="الحساب">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/></svg>
                        </button>
                        <button class="adm-icon" type="button" data-a="close" aria-label="إغلاق">×</button>
                    </div>
                </header>
                ${A.tab === "home" ? "" : `<nav class="adm-tabs adm-chips" role="tablist" aria-label="أقسام اللوحة">
                    ${TABS.map(([id, label, ic]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${A.tab === id}">${icon(ic)}${label}</button>`).join("")}
                </nav>`}
                <main class="adm-body" id="admBody"></main>
                <footer class="adm-foot">
                    <span class="adm-status" id="admStatus"></span>
                    <div class="adm-foot-actions">
                        <button class="ab ab-ghost" type="button" id="discardBtn" data-a="discard">تجاهل التعديلات</button>
                        <button class="ab ab-primary" type="button" id="publishBtn" data-a="publish">نشر التغييرات</button>
                    </div>
                </footer>
            </div>
            <div class="adm-sheet" id="admSheet" hidden></div>`;
        renderTab();
        renderStatus();
        $(".adm-chips [aria-selected=true]")?.scrollIntoView({ block: "nearest", inline: "center" });
    }

    function renderTab({ keepScroll = false } = {}) {
        const body = $("#admBody");
        if (!body) return;
        const scroll = body.scrollTop;
        $$(".adm-tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === A.tab)));
        const errors = A.errors.length ? `<div class="adm-errors" role="alert"><strong>لم يتم النشر. صحّح التالي:</strong><ul>${A.errors.map((e) => `<li><button type="button" class="adm-link" data-tab="${e.tab}">${esc(tabLabel(e.tab))}</button>: ${esc(e.msg)}</li>`).join("")}</ul></div>` : "";
        const banner = isDirty() && !A.errors.length ? `<div class="adm-note">لديك تعديلات غير منشورة. لن يراها الزبائن حتى تضغط «نشر التغييرات».</div>` : "";
        const views = { home: tabHome, products: tabProducts, ad: tabAd, catalog: tabCatalog, templates: tabTemplates, look: tabLook, texts: tabTexts, order: tabOrder, sales: tabSales, gift: tabGift, ads: tabAds, contact: tabContact };
        body.innerHTML = errors + banner + views[A.tab]();
        if (keepScroll) body.scrollTop = scroll;
        else body.scrollTop = 0;
        if (A.tab === "home") loadHomeCounts();
    }

    const tabLabel = (id) => (id === "home" ? "الرئيسية" : (TABS.find((t) => t[0] === id) || [id, id])[1]);

    // =====================================================
    // HOME: صفحة رئيسية واضحة بمربعات كبيرة واختصارات سريعة
    // =====================================================

    function tabHome() {
        const products = A.draft.products;
        const hidden = products.filter((p) => !p.is_visible).length;
        const out = products.filter((p) => !p.is_available).length;
        const quick = [
            ["data-a", "add-product", "plus", "إضافة منتج"],
            ["data-tab", "templates", "layout", "قوالب المتجر"],
            ["data-tab", "gift", "gift", "إعدادات الهدية"],
            ["data-a", "preview", "eye", "معاينة المتجر"]
        ];
        return `
            <button class="adm-orders-tile" type="button" data-a="open-orders">
                <span class="aot-ico">${icon("receipt")}</span>
                <span class="aot-txt"><b>الطلبات والتقييمات والأداء</b><small id="homeOrders">دفتر الطلبيات</small></span>
                <span class="aot-go">${icon("back")}</span>
            </button>
            <button class="adm-orders-tile alt" type="button" data-a="open-customers">
                <span class="aot-ico">${icon("users")}</span>
                <span class="aot-txt"><b>العملاء والعروض</b><small>أسماء وأرقام زبائنك، وأرسل لهم الخصومات</small></span>
                <span class="aot-go">${icon("back")}</span>
            </button>
            <div class="adm-quick">${quick.map(([attr, a, ic, label]) => `<button class="aq" type="button" ${attr}="${a}">${icon(ic)}<span>${label}</span></button>`).join("")}</div>
            <h2 class="adm-sec">أقسام المتجر</h2>
            <div class="adm-grid">${TABS.map(([id, label, ic, hint]) => `<button class="ag" type="button" data-tab="${id}">
                <span class="ag-ico">${icon(ic)}</span>
                <b>${label}</b>
                <small>${id === "products" ? `${products.length} منتج${hidden ? ` · ${hidden} مخفي` : ""}${out ? ` · ${out} نفد` : ""}` : hint}</small>
            </button>`).join("")}</div>
            <div class="adm-home-foot">
                <button class="ab-mini" type="button" data-a="account">الحساب وكلمة المرور</button>
                <button class="ab-mini" type="button" data-a="signout">تسجيل الخروج</button>
            </div>`;
    }

    async function loadHomeCounts() {
        try {
            const { data, error } = await sb.from("orders").select("id,status,hidden").eq("status", "new").limit(500);
            const el = $("#homeOrders");
            if (error || !el) return;
            const n = (data || []).filter((o) => !o.hidden).length;
            el.textContent = n ? `${n === 1 ? "طلب جديد واحد" : n === 2 ? "طلبان جديدان" : `${n} طلبات جديدة`} بانتظارك` : "لا توجد طلبات جديدة الآن";
            el.classList.toggle("hot", n > 0);
        } catch {
            /* العدد اختياري */
        }
    }

    // ---------- form helpers ----------

    function text(path, label, { placeholder = "", help = "", type = "text", dir = "", max = "" } = {}) {
        const value = getPath(path);
        return `<label class="af"><span>${label}</span><input class="ai" type="${type}" data-bind="${path}" value="${esc(value ?? "")}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}${dir ? ` dir="${dir}"` : ""}${max ? ` maxlength="${max}"` : ""}>${help ? `<small>${help}</small>` : ""}</label>`;
    }

    function number(path, label, { step = "0.001", min = "0", help = "", placeholder = "" } = {}) {
        const value = getPath(path);
        return `<label class="af"><span>${label}</span><input class="ai" type="number" inputmode="decimal" step="${step}" min="${min}" data-bind="${path}" data-type="number" value="${value === null || value === undefined ? "" : esc(value)}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}>${help ? `<small>${help}</small>` : ""}</label>`;
    }

    function area(path, label, { rows = 3, help = "", placeholder = "" } = {}) {
        return `<label class="af"><span>${label}</span><textarea class="ai" rows="${rows}" data-bind="${path}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}>${esc(getPath(path) ?? "")}</textarea>${help ? `<small>${help}</small>` : ""}</label>`;
    }

    function toggle(path, label, { help = "", rerender = false } = {}) {
        return `<label class="at"><input type="checkbox" data-bind="${path}" data-type="bool"${getPath(path) ? " checked" : ""}${rerender ? " data-rerender" : ""}><span class="at-ui" aria-hidden="true"></span><span class="at-text"><b>${label}</b>${help ? `<small>${help}</small>` : ""}</span></label>`;
    }

    function select(path, label, options, { rerender = false, type = "", help = "" } = {}) {
        const value = String(getPath(path) ?? "");
        return `<label class="af"><span>${label}</span><select class="ai" data-bind="${path}"${type ? ` data-type="${type}"` : ""}${rerender ? " data-rerender" : ""}>${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === value ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>${help ? `<small>${help}</small>` : ""}</label>`;
    }

    function colorField(path, label) {
        const value = getPath(path) || "#000000";
        return `<label class="af af-color"><span>${label}</span><span class="ac"><input type="color" data-bind="${path}" value="${esc(value)}"><code dir="ltr">${esc(value)}</code></span></label>`;
    }

    function countryChecks(path, label, help = "") {
        const value = getPath(path);
        const list = Array.isArray(value) && value.length ? value : ATHR_COUNTRIES.map((c) => c.code);
        return `<div class="af"><span>${label}</span><div class="cchecks">${ATHR_COUNTRIES.map((c) => `<label class="cchip"><input type="checkbox" data-country-path="${path}" value="${c.code}"${list.includes(c.code) ? " checked" : ""}><span>${c.flag} ${esc(c.name)}</span></label>`).join("")}</div>${help ? `<small>${help}</small>` : ""}</div>`;
    }

    // معاينة الخطين المختارين بدون نشر
    function fontSample() {
        const t = cfg().theme;
        const href = ATHR.fontHref(cfg());
        let link = document.getElementById("admFontPreview");
        if (href) {
            if (!link) {
                link = document.createElement("link");
                link.id = "admFontPreview";
                link.rel = "stylesheet";
                document.head.appendChild(link);
            }
            if (link.getAttribute("href") !== href) link.setAttribute("href", href);
        }
        const fam = (f) => (ATHR.FONT_PARAMS[f] ? `"${f}", system-ui` : "system-ui");
        return `<div class="font-sample">
            <b style="font-family:${esc(fam(t.font_head))}">كاسات تترك أثراً · Cups that leave a mark</b>
            <span style="font-family:${esc(fam(t.font_body))}">كوب ريال مدريد بملمس مطفي، السعر 3.500 ر.ع · Real Madrid Cup 3.500 OMR</span>
        </div>`;
    }

    function card(title, body, help = "") {
        return `<section class="adm-card"><h2>${title}</h2>${help ? `<p class="adm-muted">${help}</p>` : ""}<div class="af-stack">${body}</div></section>`;
    }

    function listControls(path, i, length) {
        return `<div class="row-ctrl">
            <button type="button" class="ab-mini" data-move="${path}" data-i="${i}" data-dir="-1" aria-label="تحريك للأعلى"${i === 0 ? " disabled" : ""}>▲</button>
            <button type="button" class="ab-mini" data-move="${path}" data-i="${i}" data-dir="1" aria-label="تحريك للأسفل"${i === length - 1 ? " disabled" : ""}>▼</button>
            <button type="button" class="ab-mini danger" data-del="${path}" data-i="${i}" aria-label="حذف">حذف</button>
        </div>`;
    }

    function uploadButton(label, attrs, { accept = "image/*", current = "", remove = "" } = {}) {
        return `<div class="up">
            ${current ? `<div class="up-prev">${/\.(mp4|webm|mov)(\?|$)/i.test(current) ? `<video src="${esc(asset(current))}" muted playsinline></video>` : `<img src="${esc(asset(current))}" alt="">`}</div>` : ""}
            <label class="ab ab-soft ab-sm">${label}<input type="file" accept="${accept}" ${attrs} hidden></label>
            ${remove ? `<button type="button" class="ab-mini danger" ${remove}>إزالة</button>` : ""}
        </div>`;
    }

    // =====================================================
    // TAB 1: PRODUCTS
    // =====================================================

    function tabProducts() {
        const products = A.draft.products;
        promoMaybeLoad();
        const q = A.productFilter.trim().toLowerCase();
        const catName = (id) => (A.draft.categories.find((c) => c.id === id) || {}).name || "بدون قسم";
        const list = products.map((p, i) => ({ p, i })).filter(({ p }) => !q || p.name.toLowerCase().includes(q) || catName(p.category_id).toLowerCase().includes(q));

        return `
            <section class="adm-card">
                <div class="adm-row-between">
                    <h2>المنتجات <small class="adm-muted">(${products.length})</small></h2>
                    <button class="ab ab-primary ab-sm" type="button" data-a="add-product">+ إضافة منتج</button>
                </div>
                <input class="ai" type="search" id="productFilter" placeholder="ابحث باسم المنتج أو القسم" value="${esc(A.productFilter)}">
                <ul class="plist">
                    ${list.map(({ p, i }) => `
                        <li class="prow${p.is_visible ? "" : " is-hidden"}${A.rowMenu === p.id ? " open" : ""}">
                            <button type="button" class="prow-main" data-edit="${esc(p.id)}">
                                <img src="${esc(ATHR.thumb(p.image_url, "s") || asset("images/logo2.jpeg"))}" alt="" loading="lazy">
                                <span class="prow-info">
                                    <b>${esc(p.name || "منتج بدون اسم")}</b>
                                    <span class="adm-muted">${money(p.price)} · ${esc(catName(p.category_id))}</span>
                                    ${p.is_visible && p.is_available && !pctOf(p) && !promoFavs(p.id) && !promoWaiting(p.id) ? "" : `<span class="prow-tags">${pctOf(p) ? `<span class="tag sale">خصم ${pctOf(p)}%</span>` : ""}${p.is_visible ? "" : `<span class="tag">مخفي</span>`}${p.is_available ? "" : `<span class="tag warn">نفد</span>`}${promoFavs(p.id) ? `<span class="tag fav" title="أضافه زبائن للمفضلة">❤️ ${promoFavs(p.id)}</span>` : ""}${promoWaiting(p.id) ? `<span class="tag bell" title="ينتظرون توفره">🔔 ${promoWaiting(p.id)}</span>` : ""}</span>`}
                                </span>
                            </button>
                            <button type="button" class="vis-switch" role="switch" aria-checked="${p.is_visible}" data-toggle-visible="${esc(p.id)}" title="${p.is_visible ? "ظاهر في المتجر — اضغط للإخفاء" : "مخفي — اضغط للإظهار"}" aria-label="ظاهر في المتجر"><span></span></button>
                            <button type="button" class="ab-mini prow-more" data-row-menu="${esc(p.id)}" aria-expanded="${A.rowMenu === p.id}" aria-label="خيارات أخرى">${icon("dots")}</button>
                            ${A.rowMenu === p.id ? `<div class="prow-menu">
                                ${q ? "" : `<button type="button" class="ab-mini" data-move="products" data-i="${i}" data-dir="-1"${i === 0 ? " disabled" : ""}>▲ للأعلى</button>
                                <button type="button" class="ab-mini" data-move="products" data-i="${i}" data-dir="1"${i === products.length - 1 ? " disabled" : ""}>▼ للأسفل</button>`}
                                <button type="button" class="ab-mini" data-copy-product="${esc(p.id)}">نسخ</button>
                                <button type="button" class="ab-mini danger" data-del-product="${esc(p.id)}">حذف</button>
                            </div>` : ""}
                        </li>`).join("") || `<li class="adm-empty">لا توجد منتجات مطابقة.</li>`}
                </ul>
                <p class="adm-muted">اضغط على المنتج لتعديله. المفتاح يُظهر أو يخفي المنتج، و«⋯» للترتيب والنسخ والحذف.</p>
            </section>
            ${card("سعر موحّد", `
                <div class="inline">
                    <input class="ai" type="number" inputmode="decimal" step="0.001" min="0" id="unifiedPrice" placeholder="اكتب سعراً لتطبيقه على كل المنتجات">
                    <button class="ab ab-ghost" type="button" data-a="unified-price">تطبيق على الكل</button>
                </div>`, "يغيّر سعر كل المنتجات دفعة واحدة. يمكنك التراجع بـ«تجاهل التعديلات» قبل النشر.")}`;
    }

    function productEditor(id) {
        const p = A.draft.products.find((x) => x.id === id);
        if (!p) return "";
        const base = `products.#${p.id}`;
        const images = p.media.filter((m) => m.type === "image");
        const video = p.media.find((m) => m.type === "video");
        const cats = [["", "بدون قسم"], ...A.draft.categories.map((c) => [c.id, c.name || "قسم بدون اسم"])];
        const colors = [["", "بدون لون"], ...cfg().colors.map((c) => [c.id, c.name || "لون بدون اسم"])];

        return `
            <div class="adm-sheet-head">
                <h2>${esc(p.name || "منتج جديد")}</h2>
                <button class="adm-icon" type="button" data-a="close-sheet" aria-label="إغلاق">×</button>
            </div>
            <div class="af-stack">
                <div class="adm-card flat">
                    <h3>صورة المنتج</h3>
                    ${uploadButton(p.image_url ? "تغيير الصورة" : "اختيار صورة", `data-upload="${base}.image_url" data-kind="product"`, { current: p.image_url })}
                    <small class="adm-muted">يفضّل صورة عمودية بنسبة 4:5 بخلفية نظيفة وإضاءة جيدة.</small>
                </div>
                ${text(`${base}.name`, "اسم المنتج", { max: 120 })}
                ${text(`${base}.name_en`, "اسم المنتج بالإنجليزي (لزوار المتجر بالإنجليزي)", { max: 160, dir: "ltr", placeholder: "Real Madrid Cup" })}
                <div class="adm-card flat price-box">
                    <div class="two">
                        <label class="af"><span>السعر الأصلي</span><input class="ai" type="number" inputmode="decimal" step="0.001" min="0" data-price-base="${esc(p.id)}" value="${basePrice(p) === null || basePrice(p) === undefined ? "" : esc(basePrice(p))}"></label>
                        <label class="af"><span>الخصم %</span><input class="ai" type="number" inputmode="decimal" step="1" min="0" max="90" data-price-pct="${esc(p.id)}" value="${pctOf(p) || ""}" placeholder="بدون خصم"></label>
                    </div>
                    <div class="pct-chips">${[10, 15, 20, 25, 30, 50].map((n) => `<button type="button" class="ab-mini${pctOf(p) === n ? " on" : ""}" data-price-quick="${n}" data-id="${esc(p.id)}">${n}%</button>`).join("")}${pctOf(p) ? `<button type="button" class="ab-mini danger" data-price-quick="0" data-id="${esc(p.id)}">إزالة الخصم</button>` : ""}</div>
                    <p class="price-note" id="priceNote">${priceNote(p)}</p>
                </div>
                <div class="two">
                    ${select(`${base}.category_id`, "القسم", cats)}
                    ${select(`${base}.color_id`, "لون الكاسة", colors)}
                </div>
                ${area(`${base}.description`, "الوصف", { rows: 3 })}
                ${area(`${base}.description_en`, "الوصف بالإنجليزي (اختياري)", { rows: 2 })}
                ${cfg().order.delivery.some((d) => d.enabled && d.pricing === "per_kg") ? number(`${base}.weight_g`, "الوزن مع التغليف (غرام)", { step: "10", min: "1", help: "يُستخدم لحساب التوصيل بالكيلو." }) : ""}
                ${toggle(`${base}.is_visible`, "ظاهر في المتجر")}
                ${toggle(`${base}.is_best_seller`, "من «الأكثر طلباً»", { help: "يظهر في قسم الأكثر طلباً أعلى الصفحة الرئيسية مع شارة على صورته (يحتاج منتجين على الأقل)." })}
                ${toggle(`${base}.is_new_arrival`, "من «وصل حديثاً»")}
                <label class="at"><input type="checkbox" data-sold-out="${esc(p.id)}"${p.is_available ? "" : " checked"}><span class="at-ui" aria-hidden="true"></span><span class="at-text"><b>نفد من المخزون</b><small>يبقى ظاهرًا مع شارة «نفد المخزون» ولا يمكن طلبه.</small></span></label>

                <div class="adm-card flat">
                    <h3>صور وفيديو إضافية</h3>
                    <ul class="media-list">
                        ${images.map((m, i) => `<li>
                            <img src="${esc(m.url)}" alt="">
                            <div class="row-ctrl">
                                <button type="button" class="ab-mini" data-media-move="${esc(p.id)}" data-i="${i}" data-dir="-1"${i === 0 ? " disabled" : ""} aria-label="تحريك للأعلى">▲</button>
                                <button type="button" class="ab-mini" data-media-move="${esc(p.id)}" data-i="${i}" data-dir="1"${i === images.length - 1 ? " disabled" : ""} aria-label="تحريك للأسفل">▼</button>
                                <button type="button" class="ab-mini danger" data-media-del="${esc(p.id)}" data-i="${i}">حذف</button>
                            </div>
                        </li>`).join("")}
                    </ul>
                    ${images.length < 5 ? uploadButton(`إضافة صور (${images.length} من 5)`, `data-media-add="${esc(p.id)}" multiple`) : `<small class="adm-muted">وصلت للحد الأقصى: 5 صور.</small>`}
                    <hr>
                    <h3>فيديو المنتج</h3>
                    ${video ? `<video class="vid-prev" src="${esc(video.url)}" controls playsinline muted></video>` : ""}
                    <div class="inline">
                        <label class="ab ab-soft ab-sm">${video ? "استبدال الفيديو" : "رفع فيديو"}<input type="file" accept="video/*" data-video-for="${esc(p.id)}" hidden></label>
                        ${video ? `<button type="button" class="ab-mini danger" data-video-del="${esc(p.id)}">إزالة الفيديو</button>` : ""}
                    </div>
                    ${videoQuality("productVideoQuality", "720")}
                    ${text(`${base}.video_url`, "رابط فيديو خارجي (اختياري)", { dir: "ltr", placeholder: "https://", help: "لفيديو طويل ضع رابط يوتيوب أو إنستغرام، فيظهر زر «شاهد فيديو المنتج»." })}
                </div>
                ${productLinkBox(p)}
                <button class="ab ab-primary ab-block" type="button" data-a="close-sheet">تم</button>
            </div>`;
    }

    // رابط صفحة المنتج للمشاركة في إنستغرام وتيك توك وواتساب
    function productLinkBox(p) {
        const published = A.server && A.server.products.some((x) => x.id === p.id) && p.slug;
        if (!published) return `<p class="adm-muted">بعد النشر يصبح لهذا المنتج رابط خاص تشاركه في إنستغرام وتيك توك وواتساب، ويظهر في جوجل.</p>`;
        const url = siteLink(ATHR.url.product(p));
        return `<div class="adm-card flat">
            <h3>رابط المنتج</h3>
            <code class="adm-link-box" dir="ltr">${esc(decodeURI(url))}</code>
            <div class="inline">
                <button class="ab ab-soft ab-sm" type="button" data-copy-text="${esc(url)}">نسخ الرابط</button>
                <a class="ab ab-ghost ab-sm" href="${esc(url)}" target="_blank" rel="noopener">فتح الصفحة</a>
            </div>
            <small class="adm-muted">للإعلانات: أضف في آخر الرابط <code dir="ltr">?ref=instagram</code> أو <code dir="ltr">?ref=tiktok</code> لتعرف من أين جاءت الطلبات.</small>
        </div>`;
    }

    function videoQuality(id, def) {
        const current = storage.get(id) || def;
        const opts = [["0", "الأصلية (بدون ضغط)"], ["1080", "عالية 1080p"], ["720", "متوسطة 720p"], ["480", "خفيفة 480p"]];
        return `<label class="af"><span>جودة الفيديو</span><select class="ai" data-pref="${id}">${opts.map(([v, l]) => `<option value="${v}"${v === String(current) ? " selected" : ""}>${l}</option>`).join("")}</select><small>الجودة الأخف ترفع أسرع ويفتحها الزبون أسرع.</small></label>`;
    }

    function openSheet(html) {
        const sheet = $("#admSheet");
        sheet.innerHTML = `<div class="adm-sheet-backdrop" data-a="close-sheet"></div><div class="adm-sheet-panel" role="dialog" aria-modal="true">${html}</div>`;
        sheet.hidden = false;
    }

    function refreshSheet() {
        const panel = $("#admSheet .adm-sheet-panel");
        if (!panel || !A.editing) return;
        const scroll = panel.scrollTop;
        panel.innerHTML = productEditor(A.editing);
        panel.scrollTop = scroll;
    }

    function closeSheet() {
        const sheet = $("#admSheet");
        if (!sheet) return;
        sheet.hidden = true;
        sheet.innerHTML = "";
        if (A.editing) {
            A.editing = null;
            renderTab({ keepScroll: true });
        } else if (A.restockRun || A.couponEdit) {
            A.restockRun = null;
            A.couponEdit = null;
            renderTab({ keepScroll: true });
        }
    }

    function editProduct(id) {
        A.editing = id;
        openSheet(productEditor(id));
    }

    function addProduct() {
        const p = newProduct();
        A.draft.products.unshift(p);
        A.productFilter = "";
        saveDraft();
        renderTab();
        editProduct(p.id);
    }

    // ---------- خصم المنتج: تكتب النسبة ويُحسب السعر الجديد تلقائياً ----------
    function pctOf(p) {
        return Number(p.old_price) > Number(p.price) && Number(p.old_price) > 0 ? Math.round((1 - p.price / p.old_price) * 1000) / 10 : 0;
    }

    function basePrice(p) {
        return Number(p.old_price) > Number(p.price) ? Number(p.old_price) : p.price;
    }

    function applyDiscount(p, base, pct) {
        const decimals = Number.isInteger(Number(cfg().order.decimals)) ? Number(cfg().order.decimals) : 3;
        const f = 10 ** decimals;
        if (!(base > 0)) {
            p.price = base > 0 || base === 0 ? base : null;
            p.old_price = null;
            return;
        }
        if (pct > 0 && pct <= 90) {
            p.old_price = Math.round(base * f) / f;
            p.price = Math.round(base * (1 - pct / 100) * f) / f;
        } else {
            p.price = Math.round(base * f) / f;
            p.old_price = null;
        }
    }

    function priceNote(p) {
        const pct = pctOf(p);
        if (!(Number(p.price) > 0)) return "اكتب السعر الأصلي للمنتج.";
        return pct
            ? `<span class="tag sale">خصم ${pct}%</span> الزبون يرى: <b>${money(p.price)}</b> <s>${money(p.old_price)}</s>`
            : "بدون خصم. اكتب نسبة الخصم أو اختر من الأزرار، ويُحسب السعر الجديد تلقائياً.";
    }

    function priceFromSheet(id, pctOverride) {
        const p = A.draft.products.find((x) => x.id === id);
        if (!p) return;
        const baseEl = $(`#admSheet [data-price-base="${id}"]`);
        const pctEl = $(`#admSheet [data-price-pct="${id}"]`);
        const base = baseEl && baseEl.value !== "" ? Number(ATHR.digits(baseEl.value)) : null;
        let pct = pctOverride !== undefined ? pctOverride : pctEl && pctEl.value !== "" ? Number(ATHR.digits(pctEl.value)) : 0;
        if (pct > 90) {
            pct = 90;
            toast("أقصى خصم 90%");
        }
        if (pct < 0 || Number.isNaN(pct)) pct = 0;
        if (pctEl && pctOverride !== undefined) pctEl.value = pct ? String(pct) : "";
        applyDiscount(p, base, pct);
        const note = $("#priceNote");
        if (note) note.innerHTML = priceNote(p);
        $$("#admSheet [data-price-quick]").forEach((b) => b.classList.toggle("on", Number(b.dataset.priceQuick) === pct && pct > 0));
        saveDraft();
    }

    function newProduct() {
        return {
            id: crypto.randomUUID(),
            name: "",
            price: null,
            old_price: null,
            category_id: A.draft.categories[0]?.id || null,
            image_url: "",
            is_available: true,
            is_visible: true,
            is_best_seller: false,
            is_new_arrival: true,
            slug: "",
            description: "",
            color_id: cfg().colors[0]?.id || "",
            video_url: "",
            weight_g: Number(cfg().order.default_weight_g) || 400,
            media: []
        };
    }


    // =====================================================
    // TAB: GIFT — تحكم كامل في الهدية وبطاقة الإهداء
    // =====================================================

    const GIFT_FONTS = ["Aref Ruqaa", "Reem Kufi", "Amiri", "El Messiri", "Lalezar", "Rakkas", "Lemonada", "Marhey", "Cairo", "Tajawal", "Changa", "IBM Plex Sans Arabic"];
    const GIFT_SAMPLE = { to: "سارة", from: "مريم", msg: "كل عام وأنت بخير يا أغلى الناس ❤️", occasion: "birthday" };

    function giftFontLink() {
        const param = ATHR.FONT_PARAMS[cfg().gift.font];
        let link = document.getElementById("admGiftFont");
        if (!param) return;
        const href = `https://fonts.googleapis.com/css2?family=${param}&display=swap`;
        if (!link) {
            link = document.createElement("link");
            link.id = "admGiftFont";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    }

    function giftMini(gender = "") {
        const g = cfg().gift;
        return `<div class="gift-mini gift-page" id="giftMini${gender ? `-${gender}` : ""}" style="${esc(ATHR.views.giftStyle({ cfg: cfg() }, gender))}">
            <div class="gm-stage">
                <div class="gm-box"><span class="gm-lid"></span><span class="gm-body"></span></div>
                <b class="gm-title">${esc(ATHR.giftFill(g.title, { to: GIFT_SAMPLE.to, from: GIFT_SAMPLE.from, store: ATHR.storeName(cfg()) }))}</b>
            </div>
            <div class="gm-card">
                <small>${esc("إلى")}</small>
                <b class="gm-name">${esc(GIFT_SAMPLE.to)}</b>
                <span class="gm-msg">${esc(GIFT_SAMPLE.msg)}</span>
                <small>${esc(g.closing)} <b class="gm-from">${esc(GIFT_SAMPLE.from)}</b></small>
            </div>
        </div>`;
    }

    function giftWaSample() {
        return ATHR.withLang("ar", () => ATHR.giftWhatsApp({
            ...GIFT_SAMPLE,
            link: siteLink(`${ATHR.base()}gift/?c=…`),
            store: ATHR.storeName(cfg()),
            config: cfg()
        }));
    }

    function refreshGiftPreview() {
        ["", "boy", "girl"].forEach((g) => {
            const mini = document.getElementById(`giftMini${g ? `-${g}` : ""}`);
            if (mini) mini.outerHTML = giftMini(g);
        });
        const wa = $("#giftWaPreview");
        if (wa) wa.textContent = giftWaSample();
    }

    function tabGift() {
        const s = cfg().sales;
        const D = ATHR_DEFAULTS.gift;
        giftFontLink();
        const occ = ATHR.GIFT_OCCASIONS.map((o) => {
            const base = `config.gift.occasions.${o.id}`;
            return `<li class="item-card">
                ${o.id === "other" ? `<b>${o.emoji} ${esc(o.name)} <small class="adm-muted">(يظهر دائماً)</small></b>` : toggle(`${base}.enabled`, `${o.emoji} ${o.name}`)}
                <div class="two">
                    ${text(`${base}.emoji`, "الرمز", { placeholder: o.emoji, max: 8 })}
                    ${text(`${base}.name`, "الاسم في صفحة الطلب", { placeholder: o.name, max: 30 })}
                </div>
                ${text(`${base}.title`, "العنوان في البطاقة", { placeholder: o.title, max: 40 })}
                ${o.id === "other" ? "" : text(`${base}.for`, "سطر المناسبة في رسالة واتساب", { placeholder: o.for, max: 60 })}
                ${area(`${base}.msgs`, "رسائل مقترحة للزبون (كل سطر رسالة)", { rows: 2, placeholder: o.msgs.join("\n") })}
            </li>`;
        }).join("");
        return `
            <section class="adm-card gift-top">
                <div class="adm-row-between">
                    <div><h2>🎁 الهدية وبطاقة الإهداء</h2><p class="adm-muted">غيّر الشكل والألوان والخط والنصوص والرسالة، ثم شاهدها قبل النشر.</p></div>
                </div>
                ${giftMini()}
                <button class="ab ab-primary ab-block" type="button" data-a="gift-preview">👁️ معاينة البطاقة كاملة (قبل النشر)</button>
            </section>
            ${card("التشغيل", `
                ${toggle("config.sales.gift_enabled", "تفعيل «هدية لشخص» في إتمام الطلب", { rerender: true, help: "يختار الزبون «لي» أو «هدية لشخص»، ويكتب رقمه ورقم المُهدى إليه وولايته وعنوانه ورسالة الهدية." })}
                ${s.gift_enabled ? `${toggle("config.sales.gift_card", "بطاقة إهداء رقمية للمُهدى إليه", { help: "صفحة الصندوق والبطاقة التي تتحكم في شكلها هنا. يرسلها صاحب الهدية بعد الطلب، ورابطها يصلك في رسالة الطلب." })}
                ${toggle("config.sales.gift_banner", "بنر «أرسلها هدية» في الصفحة الرئيسية")}
                ${toggle("config.sales.gift_button", "زر «أرسله هدية» في صفحة المنتج والسلة")}
                ${toggle("config.sales.gift_prepaid", "الهدايا بالدفع المسبق فقط", { help: "يُخفي «الدفع عند الاستلام» في طلبات الهدايا حتى لا يُطلب المبلغ من المُهدى إليه." })}` : ""}`)}
            ${card("👦 ولد أو 👧 بنت", `
                ${toggle("config.gift.genders.enabled", "الزبون يختار: الهدية لولد أو لبنت", { rerender: true, help: "خانة إجبارية في طلب الهدية. بطاقة الإهداء والصندوق يتلوّنان حسب الاختيار، ويظهر في رسالة الطلب حتى تغلّف الهدية بنفس اللون." })}
                ${cfg().gift.genders.enabled === false ? "" : ["boy", "girl"].map((id) => {
                    const base = `config.gift.genders.${id}`;
                    const D = ATHR_DEFAULTS.gift.genders[id];
                    return `<div class="item-card gfor-admin ${id}">
                        <b>${D.emoji} ${id === "boy" ? "الولد — أزرق وأبيض" : "البنت — وردي وأبيض"}</b>
                        ${giftMini(id)}
                        <div class="two">
                            ${text(`${base}.label`, "الاسم في صفحة الطلب", { placeholder: D.label, max: 20 })}
                            ${text(`${base}.emoji`, "الرمز", { placeholder: D.emoji, max: 8 })}
                        </div>
                        <div class="two">
                            ${colorField(`${base}.colors.bg`, "خلفية الصفحة")}
                            ${colorField(`${base}.colors.box`, "لون الصندوق")}
                        </div>
                        <div class="two">
                            ${colorField(`${base}.colors.ribbon`, "لون الشريطة")}
                            ${colorField(`${base}.colors.accent`, "لون الاسم")}
                        </div>
                        <div class="inline">
                            <button class="ab ab-ghost ab-sm" type="button" data-a="gift-preview" data-gender="${id}">👁️ معاينة بطاقة ${id === "boy" ? "الولد" : "البنت"}</button>
                            <button class="ab-mini" type="button" data-gfor-reset="${id}">الألوان الأصلية</button>
                        </div>
                    </div>`;
                }).join("")}`, "الولد أزرق مع أبيض، والبنت وردي مع أبيض. تقدر تغيّر أي لون.")}
            ${card("الألوان العامة", `
                <p class="adm-muted" style="margin:0">${cfg().gift.genders.enabled === false ? "ألوان بطاقة الإهداء." : "تُستخدم فقط إذا أطفأت اختيار الولد والبنت."}</p>
                <div class="two">
                    ${colorField("config.gift.colors.bg", "خلفية الصفحة")}
                    ${colorField("config.gift.colors.box", "لون الصندوق")}
                </div>
                <div class="two">
                    ${colorField("config.gift.colors.ribbon", "لون الشريطة والذهبي")}
                    ${colorField("config.gift.colors.paper", "لون ورقة البطاقة")}
                </div>
                <div class="two">
                    ${colorField("config.gift.colors.ink", "لون الكتابة")}
                    ${colorField("config.gift.colors.accent", "لون الاسم")}
                </div>
                <div class="inline">
                    <button class="ab-mini" type="button" data-gift-theme="classic">عنابي وذهبي</button>
                    <button class="ab-mini" type="button" data-gift-theme="night">كحلي وفضي</button>
                    <button class="ab-mini" type="button" data-gift-theme="rose">وردي ناعم</button>
                    <button class="ab-mini" type="button" data-gift-theme="green">أخضر ملكي</button>
                    <button class="ab-mini" type="button" data-gift-theme="black">أسود فاخر</button>
                </div>`, "اختر ألواناً جاهزة أو لوّن كل جزء بنفسك.")}
            ${card("الخط", `
                ${select("config.gift.font", "خط الاسم والعنوان والرسالة", [...GIFT_FONTS.map((f) => [f, f === "Aref Ruqaa" ? "Aref Ruqaa (رقعة مزخرف)" : f]), ["system", "خط الجوال العادي"]], { rerender: true })}`)}
            ${card("المؤثرات", `
                ${toggle("config.gift.stars", "نجوم تلمع في الخلفية")}
                ${toggle("config.gift.confetti", "قصاصات ملونة عند الفتح")}
                ${toggle("config.gift.tag", "بطاقة صغيرة باسم المُهدى إليه على الصندوق")}
                ${toggle("config.gift.vibrate", "اهتزاز خفيف للجوال عند الفتح")}`)}
            ${card("نصوص صفحة البطاقة", `
                ${text("config.gift.kicker", "الجملة الصغيرة فوق العنوان", { placeholder: D.kicker, max: 60 })}
                ${text("config.gift.title", "العنوان", { placeholder: D.title, max: 80 })}
                ${text("config.gift.button", "زر الفتح", { placeholder: D.button, max: 30 })}
                ${text("config.gift.hint", "التلميح تحت الزر", { placeholder: D.hint, max: 60 })}
                ${text("config.gift.closing", "قبل اسم صاحب الهدية", { placeholder: D.closing, max: 40 })}
                ${text("config.gift.empty_msg", "الرسالة إذا لم يكتب الزبون رسالة", { placeholder: D.empty_msg, max: 120 })}
                ${text("config.gift.footer", "السطر الأخير في البطاقة", { placeholder: D.footer, max: 80 })}`,
                "{to} = اسم المُهدى إليه · {from} = اسم صاحب الهدية · {store} = اسم المتجر")}
            ${card("رسالة واتساب للمُهدى إليه", `
                ${area("config.gift.wa", "نص الرسالة", { rows: 12, placeholder: D.wa })}
                <div class="offer-preview"><small class="adm-muted">هكذا تصل (مثال):</small><pre id="giftWaPreview">${esc(giftWaSample())}</pre></div>
                <button class="ab-mini" type="button" data-gift-wa-reset>الرجوع للرسالة الأصلية</button>`,
                "{to} المُهدى إليه · {from} صاحب الهدية · {occasion} سطر المناسبة · {message} رسالة صاحب الهدية · {link} رابط البطاقة · {store} المتجر. السطر الذي قيمته فارغة يُحذف تلقائياً، والكلام بين *نجمتين* يظهر عريضاً في واتساب.")}
            ${card("المناسبات", `<ul class="items">${occ}</ul>`, "اترك الخانة فارغة لتبقى على النص الأصلي. أطفئ أي مناسبة لا تريدها في صفحة الطلب.")}
            ${card("البنر وزر الهدية", `
                ${text("config.gift.banner_title", "عنوان البنر في الصفحة الرئيسية", { placeholder: D.banner_title, max: 60 })}
                ${text("config.gift.banner_text", "النص تحت العنوان", { placeholder: D.banner_text, max: 120 })}
                ${text("config.gift.banner_button", "زر البنر", { placeholder: D.banner_button, max: 20 })}
                ${text("config.gift.cta_title", "زر الهدية في صفحة المنتج", { placeholder: D.cta_title, max: 30 })}
                ${text("config.gift.cta_sub", "السطر الصغير تحت زر الهدية", { placeholder: D.cta_sub, max: 80 })}`)}`;
    }

    const GIFT_THEMES = {
        classic: { bg: "#4A0A14", box: "#8E1A2C", ribbon: "#F2C964", paper: "#FFF8EC", ink: "#3B2A20", accent: "#8E1A2C" },
        night: { bg: "#0E1B33", box: "#1F3B70", ribbon: "#D9DEE8", paper: "#F7F8FB", ink: "#1F2A3D", accent: "#1F3B70" },
        rose: { bg: "#7A2E4A", box: "#E07A9A", ribbon: "#FFE1A8", paper: "#FFF5F7", ink: "#4A2533", accent: "#C24D74" },
        green: { bg: "#0D3B2E", box: "#16664F", ribbon: "#E8C66A", paper: "#FBF8EE", ink: "#21342C", accent: "#16664F" },
        black: { bg: "#111111", box: "#222222", ribbon: "#D4AF37", paper: "#FFFDF7", ink: "#1E1E1E", accent: "#8C6A12" }
    };

    // =====================================================
    // TAB 2: AD
    // =====================================================

    function tabAd() {
        const ad = cfg().ad;
        let body = toggle("config.ad.show", "إظهار الإعلان في المتجر");
        body += select("config.ad.type", "نوع الإعلان", [["image", "صورة جاهزة (تصميمي الخاص)"], ["video", "فيديو جاهز"], ["text", "تصميم نصي أعدّله هنا"]], { rerender: true });
        if (ad.type === "image") {
            body += `<div class="af"><span>صورة الإعلان</span>${uploadButton(ad.image_url ? "تغيير الصورة" : "اختيار صورة", `data-upload="config.ad.image_url" data-kind="ad"`, { current: ad.image_url, remove: ad.image_url ? `data-clear="config.ad.image_url"` : "" })}</div>`;
            body += text("config.ad.image_alt", "وصف قصير للصورة (للقارئات الصوتية)");
        } else if (ad.type === "video") {
            body += `<div class="af"><span>فيديو الإعلان</span>${uploadButton(ad.video_url ? "استبدال الفيديو" : "رفع فيديو", `data-upload="config.ad.video_url" data-kind="adVideo"`, { accept: "video/*", current: ad.video_url, remove: ad.video_url ? `data-clear="config.ad.video_url"` : "" })}</div>`;
            body += videoQuality("adVideoQuality", "480");
            body += `<small class="adm-muted">الإعلان يظهر أول الصفحة، لذلك الأفضل جودة خفيفة ومدة قصيرة. يعمل تلقائياً بدون صوت وبتكرار.</small>`;
            body += text("config.ad.video_alt", "وصف قصير للفيديو (للقارئات الصوتية)");
        } else {
            body += text("config.ad.title", "العنوان", { max: 80 });
            body += area("config.ad.text", "النص تحت العنوان", { rows: 2 });
            body += text("config.ad.button", "نص الزر (اختياري)", { max: 30 });
            body += colorField("config.ad.bg", "لون خلفية الإعلان");
        }
        body += text("config.ad.link", "رابط عند الضغط على الإعلان (اختياري)", {
            dir: "ltr",
            placeholder: "https://  أو  c/clubs/",
            help: ad.type === "text" ? "إن لم تكتب رابطاً، يفتح الزر قسم المنتجات. لرابط قسم اكتب مثلاً c/clubs/" : "لرابط قسم اكتب مثلاً c/clubs/ ولمنتج انسخ رابطه من صفحة المنتج."
        });
        return card("الإعلان", body, "مستطيل يظهر أعلى الصفحة الرئيسية قبل الواجهة.");
    }

    // =====================================================
    // TAB 3: CATEGORIES & COLORS
    // =====================================================

    function tabCatalog() {
        const counts = new Map();
        A.draft.products.forEach((p) => counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1));
        const cats = A.draft.categories;
        const colorCounts = new Map();
        A.draft.products.forEach((p) => colorCounts.set(p.color_id, (colorCounts.get(p.color_id) || 0) + 1));
        const colors = cfg().colors;

        return card("الأقسام", `
            <ul class="items">${cats.map((c, i) => `<li class="item-card">
                <div class="lst-row">
                    <input class="ai" data-bind="categories.#${esc(c.id)}.name" value="${esc(c.name)}" placeholder="اسم القسم" aria-label="اسم القسم">
                    <input class="ai" data-bind="categories.#${esc(c.id)}.name_en" value="${esc(c.name_en || "")}" placeholder="English name" aria-label="اسم القسم بالإنجليزي" dir="ltr">
                    <span class="adm-muted nowrap">${counts.get(c.id) || 0} منتج</span>
                </div>
                <div class="af"><span>صورة القسم</span>${uploadButton(c.image_url ? "تغيير الصورة" : "اختيار صورة", `data-upload="categories.#${esc(c.id)}.image_url" data-kind="category"`, { current: c.image_url ? ATHR.thumb(c.image_url, "s") : "", remove: c.image_url ? `data-clear="categories.#${esc(c.id)}.image_url"` : "" })}<small>تظهر في أعلى المتجر وفي القائمة. الأفضل صورة عمودية بنسبة 3:4 بخلفية بيج مثل باقي الأقسام.</small></div>
                <label class="af"><span>وصف القسم (يظهر في صفحته وفي جوجل)</span><textarea class="ai" rows="2" maxlength="300" data-bind="categories.#${esc(c.id)}.description" placeholder="مثال: أكواب سيراميك بملمس مطفي بشعارات الأندية، هدية مثالية لكل مشجع.">${esc(c.description || "")}</textarea></label>
                <label class="af"><span>وصف القسم بالإنجليزي (اختياري)</span><textarea class="ai" rows="2" maxlength="600" dir="ltr" data-bind="categories.#${esc(c.id)}.description_en">${esc(c.description_en || "")}</textarea></label>
                ${c.slug ? `<small class="adm-muted" dir="ltr">${esc(decodeURI(siteLink(ATHR.url.category(c))))}</small>` : ""}
                ${listControls("categories", i, cats.length)}
            </li>`).join("")}</ul>
            <button class="ab ab-ghost ab-sm" type="button" data-a="add-category">+ إضافة قسم</button>`, "رتّبها كما تريد ظهورها في المتجر. حذف قسم لا يحذف منتجاته، تصبح بدون قسم. اكتب لكل قسم وصفاً قصيراً بالكلمات التي يبحث بها الناس، فيساعد على الظهور في جوجل.")
        + card("ألوان الكاسات", `
            <ul class="lst">${colors.map((c, i) => `<li class="lst-row">
                <input type="color" data-bind="config.colors.${i}.hex" value="${esc(c.hex || "#ffffff")}" aria-label="درجة اللون">
                <input class="ai" data-bind="config.colors.${i}.name" value="${esc(c.name)}" placeholder="اسم اللون" aria-label="اسم اللون">
                <input class="ai sm" data-bind="config.colors.${i}.name_en" value="${esc(c.name_en || "")}" placeholder="English" aria-label="اسم اللون بالإنجليزي" dir="ltr">
                <span class="adm-muted nowrap">${colorCounts.get(c.id) || 0}</span>
                ${listControls("config.colors", i, colors.length)}
            </li>`).join("")}</ul>
            <button class="ab ab-ghost ab-sm" type="button" data-a="add-color">+ إضافة لون</button>`, "يظهر اسم اللون ودائرته على بطاقة المنتج.");
    }

    // =====================================================
    // TEMPLATES: قوالب جاهزة للمتجر (معاينة مصغّرة + تطبيق + تراجع)
    // =====================================================

    const TPL_RADIUS = { sharp: "3px", medium: "8px", round: "15px" };

    function loadTemplateFonts() {
        const families = [...new Set(ATHR.TEMPLATES.flatMap((tp) => [tp.theme.font_head, tp.theme.font_body]))].filter((f) => ATHR.FONT_PARAMS[f]);
        const href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${ATHR.FONT_PARAMS[f]}`).join("&")}&display=swap`;
        let link = document.getElementById("admTplFonts");
        if (!link) {
            link = document.createElement("link");
            link.id = "admTplFonts";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    }

    function templateMock(tp) {
        const t = tp.theme;
        const c = cfg();
        const logo = c.logo_url || ATHR_DEFAULTS.logo_url;
        const photo = !/logo\.png$/.test(logo);
        const thumb = (url) => ATHR.thumb(url, "s") || asset(url);
        const prods = A.draft.products.filter((p) => p.is_visible && p.image_url);
        const imgs = prods.slice(0, 3).map((p) => thumb(p.image_url));
        while (imgs.length < 3) imgs.push(asset("images/logo2.jpeg"));
        const cats = A.draft.categories.map((cat) => {
            const p = prods.find((x) => x.category_id === cat.id);
            const img = cat.image_url ? thumb(cat.image_url) : p ? thumb(p.image_url) : "";
            return img && cat.name ? { name: cat.name, img } : null;
        }).filter(Boolean).slice(0, 4);
        const vars = `--p:${t.primary};--h:${t.hero};--b:${t.bg};--t:${t.text};--op:${ATHR.onColor(t.primary)};--fh:'${t.font_head}';--fb:'${t.font_body}';--rr:${TPL_RADIUS[t.radius] || "8px"}`;
        const title = (c.texts && c.texts.hero_title) || ATHR_DEFAULTS.texts.hero_title;
        const card = (src) => `<div class="tm-card"><span class="tm-img"><img src="${esc(src)}" alt="" loading="lazy"><i class="tm-plus">+</i></span><span class="tm-info"><span class="tm-name"></span><span class="tm-price">${esc(money(3.5))}</span><span class="tm-add">أضف للسلة</span></span></div>`;
        return `<div class="tm tm-${tp.id}${t.header === "light" ? " tm-light" : ""}" style="${esc(vars)}" aria-hidden="true">
            <div class="tm-top"><i class="tm-ic tm-menu"></i><i class="tm-ic tm-ic1"></i><span class="tm-logo${photo ? " photo" : ""}"><img src="${esc(asset(logo))}" alt=""></span><i class="tm-ic tm-ic2"></i><i class="tm-ic tm-cart"></i><span class="tm-search"></span></div>
            <div class="tm-hero${t.hero_pattern ? " pat" : ""}"><div class="tm-ht"><b>${esc(title)}</b><span class="tm-chips"><i></i><i></i></span><span class="tm-shots">${imgs.map((src) => `<img src="${esc(src)}" alt="" loading="lazy">`).join("")}</span></div></div>
            ${cats.length ? `<div class="tm-tiles">${cats.map((x, i) => `<span class="tm-tile${i === 0 ? " on" : ""}"><img src="${esc(x.img)}" alt="" loading="lazy"><i>${esc(x.name)}</i></span>`).join("")}</div>` : ""}
            <div class="tm-grid">${imgs.map(card).join("")}</div>
        </div>`;
    }

    function tabTemplates() {
        loadTemplateFonts();
        const c = cfg();
        const cur = ATHR.template(c);
        const edited = ATHR.templateEdited(c);
        return `
            ${A.prevTheme
                ? `<div class="adm-note tpl-undo"><span>✓ طبّقت قالب «${esc(cur.name)}»</span><button class="ab-mini" type="button" data-a="tpl-undo">تراجع</button></div>`
                : `<p class="adm-sentence">اختر شكلاً جاهزاً لمتجرك. القالب يغيّر الألوان والخطوط وشكل البطاقات والشريط العلوي، ومنتجاتك وصورك ونصوصك تبقى كما هي.</p>`}
            <div class="tpl-grid">${ATHR.TEMPLATES.map((tp) => {
                const on = tp.id === cur.id;
                const t = tp.theme;
                return `<article class="tpl-card${on ? " on" : ""}">
                    ${templateMock(tp)}
                    <div class="tpl-info">
                        <h3>${esc(tp.name)}${on ? ` <span class="tag ok">${edited ? "الحالي (معدّل)" : "الحالي"}</span>` : ""}</h3>
                        <p>${esc(tp.desc)}</p>
                        <div class="tpl-meta">${[t.primary, t.hero, t.bg].map((x) => `<span class="tpl-dot" style="background:${esc(x)}"></span>`).join("")}<small>${esc(t.font_head)}</small></div>
                        <div class="inline">
                            ${on && !edited
                                ? `<button class="ab ab-soft ab-sm" type="button" disabled>✓ مطبّق</button>`
                                : `<button class="ab ab-primary ab-sm" type="button" data-a="tpl-apply" data-id="${tp.id}">${on ? "إرجاع ألوانه الأصلية" : "تطبيق القالب"}</button>`}
                            <button class="ab ab-ghost ab-sm" type="button" data-a="tpl-preview" data-id="${tp.id}">${icon("eye")} معاينة</button>
                        </div>
                    </div>
                </article>`;
            }).join("")}</div>
            <p class="adm-muted">بعد التطبيق تقدر تغيّر أي لون أو خط من «المظهر». لن يرى الزبائن أي تغيير حتى تضغط «نشر التغييرات».</p>`;
    }

    function templateTheme(id, base) {
        const tp = ATHR.TEMPLATES.find((x) => x.id === id);
        if (!tp) return null;
        return { ...ATHR.clone(base), ...ATHR.clone(tp.theme), template: tp.id };
    }

    function applyTemplate(id) {
        const next = templateTheme(id, cfg().theme);
        if (!next) return;
        if (!A.prevTheme) A.prevTheme = ATHR.clone(cfg().theme);
        cfg().theme = next;
        saveDraft();
        renderTab();
        toast(`طُبّق قالب «${ATHR.template(cfg()).name}» ✓ — اضغط «نشر التغييرات» ليظهر للزبائن`);
    }

    function undoTemplate() {
        if (!A.prevTheme) return;
        cfg().theme = A.prevTheme;
        A.prevTheme = null;
        saveDraft();
        renderTab({ keepScroll: true });
        toast("رجع الشكل السابق");
    }

    function previewTemplate(id) {
        const theme = templateTheme(id, cfg().theme);
        if (!theme) return;
        preview(undefined, { ...cfg(), theme });
    }

    // =====================================================
    // TAB 4: LOOK
    // =====================================================

    function tabLook() {
        const c = cfg();
        const tp = ATHR.template(c);
        return `<button class="adm-orders-tile alt look-tpl" type="button" data-tab="templates">
                <span class="aot-ico">${icon("layout")}</span>
                <span class="aot-txt"><b>القالب: ${esc(tp.name)}${ATHR.templateEdited(c) ? " (معدّل)" : ""}</b><small>غيّر شكل المتجر كاملاً بضغطة من «القوالب»</small></span>
                <span class="aot-go">${icon("back")}</span>
            </button>`
            + card("الألوان", `
                <div class="two">
                    ${colorField("config.theme.primary", "اللون الأساسي")}
                    ${colorField("config.theme.hero", "لون الواجهة الرئيسية (الهيرو)")}
                    ${colorField("config.theme.bg", "لون خلفية الصفحة")}
                    ${colorField("config.theme.text", "لون النصوص")}
                </div>
                ${select("config.theme.mode", "وضع العرض", [["auto", "تلقائي حسب جهاز الزائر"], ["light", "فاتح دائماً"], ["dark", "داكن دائماً"]], { help: "في الوضع الداكن تُستخدم خلفية ونصوص داكنة تلقائياً مع لونك الأساسي." })}
                <button class="ab ab-ghost ab-sm" type="button" data-a="reset-colors">إرجاع ألوان أثر الأصلية</button>`)
            + card("الاسم والشعار", `
                ${text("config.name", "اسم المتجر", { max: 40 })}
                <div class="af"><span>الشعار</span>${uploadButton("تغيير الشعار", `data-upload="config.logo_url" data-kind="logo"`, { current: c.logo_url })}<small>الشعار الحالي أبيض بخلفية شفافة ويظهر على اللون الأساسي.</small>${c.logo_url !== ATHR_DEFAULTS.logo_url ? `<button class="ab-mini" type="button" data-reset-logo>الرجوع للشعار الأصلي</button>` : ""}</div>
                ${toggle("config.show_name", "إظهار اسم المتجر بجانب الشعار", { help: "أوقفه إذا كان الشعار نفسه فيه اسم المتجر. يبقى الاسم في جوجل ورسائل الطلب." })}
                ${select("config.logo_shape", "شكل الشعار", [["rounded", "زوايا مدوّرة"], ["circle", "دائري"], ["square", "مربع"]])}`)
            + card("الشكل العام", `
                ${select("config.theme.header", "الشريط العلوي", [["color", "بلون المتجر الأساسي"], ["light", "أبيض فاتح (الشعار يصير غامقاً)"]])}
                ${select("config.theme.radius", "استدارة الزوايا", [["sharp", "حادة"], ["medium", "متوسطة"], ["round", "مدوّرة كثيراً"]])}
                ${select("config.theme.grid_mobile", "عدد المنتجات في الصف على الجوال", [["2", "منتجان"], ["1", "منتج واحد"]], { type: "number" })}
                ${toggle("config.theme.show_search", "إظهار البحث")}
                ${text("config.texts.search_placeholder", "الكلمة داخل خانة البحث", { placeholder: "ابحث", max: 40 })}
                ${toggle("config.theme.visitor_mode", "زر المظهر للزائر (فاتح / داكن / تلقائي) في قائمة النقاط الثلاث", { help: "الزائر يختار ما يريحه، ويُحفظ اختياره على جهازه. «وضع العرض» أعلاه هو الافتراضي لمن لم يختر." })}
                ${toggle("config.theme.show_sort", "إظهار الترتيب حسب السعر")}
                ${toggle("config.theme.home_filter", "أزرار الأقسام السريعة فوق المنتجات في الرئيسية", { help: "الزائر يضغط على القسم فتظهر منتجاته فوراً بدون ما يتنقل." })}
                ${select("config.theme.page_size", "عدد المنتجات قبل زر «عرض المزيد»", [["8", "8 منتجات"], ["12", "12 منتجاً"], ["16", "16 منتجاً"], ["24", "24 منتجاً"], ["0", "الكل بدون زر (صفحة طويلة)"]], { type: "number", help: "صفحة أخف وأسرع على الجوال. الزائر يضغط «عرض المزيد» ليكمل." })}`)
            + card("الخطوط", `
                ${select("config.theme.font_head", "خط العناوين", HEAD_FONTS.map((f) => [f, f]), { rerender: true })}
                ${select("config.theme.font_body", "خط النصوص", BODY_FONTS.map((f) => [f, f === "system" ? "خط الجهاز" : f]), { rerender: true })}
                ${fontSample()}`, "كلها خطوط مجانية من Google تدعم العربي والإنجليزي. الأولى في القائمة هي الأبسط والأوضح للقراءة.")
            + card("الواجهة الرئيسية", `
                ${toggle("config.theme.hero_show", "إظهار الواجهة الرئيسية")}
                ${toggle("config.theme.hero_pattern", "زخرفة المعيّنات في الخلفية")}
                <div class="af"><span>صورة خلفية للواجهة (اختياري)</span>${uploadButton(c.theme.hero_image ? "تغيير الصورة" : "اختيار صورة", `data-upload="config.theme.hero_image" data-kind="hero"`, { current: c.theme.hero_image, remove: c.theme.hero_image ? `data-clear="config.theme.hero_image"` : "" })}<small>تظهر خلف النص مع طبقة من لون الواجهة حتى يبقى النص واضحاً.</small></div>`);
    }

    // =====================================================
    // TAB 5: TEXTS
    // =====================================================

    function tabTexts() {
        const t = cfg().texts;
        const d = ATHR_DEFAULTS.texts;
        const tip = `<p class="adm-tokens">يمكنك كتابة هذه الرموز فتتحدّث تلقائياً: <code>{free}</code> حد التوصيل المجاني، <code>{ship}</code> سعر التوصيل، <code>{name}</code> اسم المتجر، <code>{phone}</code> رقم الواتساب.</p>`;
        return tip
            + card("شريط الإعلان أعلى الصفحة", `
                ${toggle("config.texts.announce_show", "إظهار شريط الإعلان")}
                ${text("config.texts.announce_text", "نص الإعلان", { placeholder: "مثال: خصم 20% على أكواب الأندية حتى نهاية الأسبوع", max: 140 })}`)
            + card("الواجهة الرئيسية", `
                ${text("config.texts.hero_title", "العنوان الرئيسي", { placeholder: d.hero_title, max: 60 })}
                ${area("config.texts.hero_text", "النص التعريفي", { rows: 3, placeholder: d.hero_text })}
                <div class="af"><span>المزايا الصغيرة تحت النص (حتى 4)</span>
                    <ul class="lst">${t.hero_features.map((f, i) => `<li class="lst-row">
                        <input class="ai" data-bind="config.texts.hero_features.${i}" value="${esc(f)}" aria-label="ميزة ${i + 1}" maxlength="40">
                        ${listControls("config.texts.hero_features", i, t.hero_features.length)}
                    </li>`).join("")}</ul>
                    ${t.hero_features.length < 4 ? `<button class="ab ab-ghost ab-sm" type="button" data-add-item="config.texts.hero_features">+ إضافة ميزة</button>` : ""}
                </div>`)
            + card("المنتجات والبحث", `
                ${text("config.texts.add_to_cart", "نص زر الإضافة للسلة", { placeholder: d.add_to_cart })}
                ${text("config.texts.sold_out", "نص «نفد المخزون»", { placeholder: d.sold_out })}`)
            + card("أسفل الصفحة", `
                ${area("config.texts.about", "نبذة عن المتجر", { rows: 2, placeholder: d.about })}
                ${text("config.texts.footer_delivery_title", "عنوان قسم التوصيل", { placeholder: d.footer_delivery_title })}
                ${area("config.texts.footer_delivery_text", "نص التوصيل والدفع", { rows: 3, help: "كل سطر فقرة مستقلة. اتركه فارغاً ليُكتب تلقائياً من أسعار التوصيل وطرق الدفع." })}
                ${text("config.texts.footer_contact_title", "عنوان قسم التواصل", { placeholder: d.footer_contact_title })}
                <div class="af"><span>روابط التواصل الاجتماعي</span>
                    <ul class="lst">${t.socials.map((s, i) => `<li class="lst-row wrap">
                        <input class="ai sm" data-bind="config.texts.socials.${i}.name" value="${esc(s.name)}" placeholder="الاسم" aria-label="الاسم">
                        <input class="ai" data-bind="config.texts.socials.${i}.url" value="${esc(s.url)}" placeholder="https://" dir="ltr" aria-label="الرابط">
                        ${listControls("config.texts.socials", i, t.socials.length)}
                    </li>`).join("")}</ul>
                    <button class="ab ab-ghost ab-sm" type="button" data-add-item="config.texts.socials">+ إضافة رابط</button>
                </div>`)
            + card("رسالة الطلب", `
                ${area("config.texts.thanks_text", "نص الخطوة الأخيرة بعد إتمام الطلب", { rows: 2, placeholder: d.thanks_text })}
                ${text("config.texts.wa_first_line", "أول سطر في رسالة واتساب", { placeholder: d.wa_first_line })}
                ${area("config.texts.wa_last_line", "آخر سطر في رسالة واتساب (اختياري)", { rows: 2, placeholder: "مثال: شكراً لتسوقكم من متجر أثر ✨" })}`)
            + tabTextsEn();
    }

    // نصوص المتجر للزائر الذي يحوّل اللغة إلى الإنجليزي (الفارغ يُكتب تلقائياً)
    function tabTextsEn() {
        const en = cfg().en || {};
        const feats = (cfg().texts.hero_features || []).filter(Boolean).slice(0, 4);
        const enFeats = (en.texts && en.texts.hero_features) || [];
        const ex = (path) => ATHR.withLang("en", () => ATHR.ct({ ...cfg(), en: {} }, path)) || "";
        const ltr = (path, label, opts = {}) => text(path, label, { dir: "ltr", ...opts });
        return card("النصوص بالإنجليزي", `
                ${ltr("config.en.name", "اسم المتجر بالإنجليزي", { placeholder: "ATHR", max: 40 })}
                ${ltr("config.en.texts.hero_title", "العنوان الرئيسي", { placeholder: ex("texts.hero_title"), max: 60 })}
                ${area("config.en.texts.hero_text", "النص التعريفي", { rows: 2, placeholder: ex("texts.hero_text") })}
                <div class="af"><span>المزايا الصغيرة تحت النص</span>
                    ${feats.map((f, i) => `<input class="ai" dir="ltr" data-bind="config.en.texts.hero_features.${i}" value="${esc(enFeats[i] || "")}" placeholder="${esc(f)}" aria-label="ميزة ${i + 1} بالإنجليزي">`).join("")}
                </div>
                ${area("config.en.texts.about", "نبذة عن المتجر", { rows: 2, placeholder: ex("texts.about") })}
                ${ltr("config.en.texts.announce_text", "نص شريط الإعلان", { max: 140 })}
                ${(cfg().sales.trust_custom || []).filter(Boolean).map((tc, i) => ltr(`config.en.sales.trust_custom.${i}`, `شارة الثقة ${i + 1}`, { placeholder: tc, max: 80 })).join("")}
                ${ltr("config.en.seo.home_title", "عنوان المتجر في جوجل بالإنجليزي", { max: 70 })}`,
            "يظهر للزائر عندما يضغط زر EN أعلى المتجر. أسماء المنتجات والأقسام بالإنجليزي تكتبها في تفاصيل كل منتج وفي «الأقسام والألوان». رسائل الطلب تصلك بالعربي دائماً.");
    }

    // =====================================================
    // TAB 6: ORDER & DELIVERY
    // =====================================================

    function tabOrder() {
        const o = cfg().order;
        const live = window.ATHR_RATES && window.ATHR_RATES.rates ? window.ATHR_RATES : null;
        const deliveries = o.delivery.map((d, i) => `<li class="item-card${d.enabled ? "" : " off"}">
            ${toggle(`config.order.delivery.${i}.enabled`, d.enabled ? "مفعّلة" : "متوقفة", { rerender: true })}
            ${text(`config.order.delivery.${i}.name`, "الاسم الذي يراه العميل")}
            <div class="two">
                ${select(`config.order.delivery.${i}.type`, "النوع", [["home", "توصيل إلى بيت العميل"], ["office", "استلام من مكتب (مثل مكتب جيناكم)"]])}
                ${select(`config.order.delivery.${i}.pricing`, "طريقة السعر", [["fixed", "سعر ثابت للطلب"], ["per_kg", "لكل كيلو (حسب الوزن)"]], { rerender: true })}
            </div>
            ${number(`config.order.delivery.${i}.price`, d.pricing === "per_kg" ? "السعر لكل كيلو" : "السعر", { help: d.pricing === "per_kg" ? "يُقرَّب الوزن لأعلى كيلو، والحد الأدنى كيلو واحد." : "" })}
            ${countryChecks(`config.order.delivery.${i}.countries`, "متاحة لـ")}
            ${text(`config.order.delivery.${i}.note`, "شرح قصير (اختياري)")}
            <div class="two">
                ${text(`config.order.delivery.${i}.name_en`, "الاسم بالإنجليزي", { dir: "ltr" })}
                ${text(`config.order.delivery.${i}.note_en`, "الشرح بالإنجليزي", { dir: "ltr" })}
            </div>
            ${text(`config.order.delivery.${i}.duration`, "مدة التوصيل (اختياري)", { placeholder: "مثال: 2 إلى 4 أيام" })}
            ${listControls("config.order.delivery", i, o.delivery.length)}
        </li>`).join("");

        const payments = o.payments.map((p, i) => {
            const base = `config.order.payments.${i}`;
            let extra = "";
            if (p.type === "bank") {
                extra = `<div class="two">
                    ${text(`${base}.bank.number`, "الرقم المفعّل للتحويل", { dir: "ltr" })}
                    ${text(`${base}.bank.bank`, "اسم البنك")}
                    ${text(`${base}.bank.holder`, "اسم صاحب الحساب")}
                    ${text(`${base}.bank.account`, "رقم الحساب", { dir: "ltr" })}
                    ${text(`${base}.bank.swift`, "رمز SWIFT", { dir: "ltr" })}
                    ${text(`${base}.bank.iban`, "IBAN", { dir: "ltr" })}
                </div><small class="adm-muted">اترك ما لا تريده فارغاً فلا يظهر للعميل.</small>`;
            } else if (p.type === "online") {
                extra = text(`${base}.link`, "رابط الدفع الإلكتروني", { dir: "ltr", placeholder: "https://", help: "لا تُفعّل الطريقة قبل كتابة الرابط." });
            }
            return `<li class="item-card${p.enabled ? "" : " off"}">
                ${toggle(`${base}.enabled`, p.enabled ? "مفعّلة" : "متوقفة", { rerender: true })}
                <div class="two">
                    ${text(`${base}.name`, "الاسم")}
                    ${select(`${base}.type`, "نوع الطريقة", [["cod", "عند الاستلام"], ["bank", "تحويل بنكي"], ["online", "دفع إلكتروني"], ["other", "أخرى"]], { rerender: true })}
                </div>
                ${area(`${base}.note`, "الشرح الذي يظهر للعميل", { rows: 2 })}
                <div class="two">
                    ${text(`${base}.name_en`, "الاسم بالإنجليزي", { dir: "ltr" })}
                    ${text(`${base}.note_en`, "الشرح بالإنجليزي", { dir: "ltr" })}
                </div>
                ${countryChecks(`${base}.countries`, "متاحة لـ")}
                ${extra}
                ${listControls("config.order.payments", i, o.payments.length)}
            </li>`;
        }).join("");

        return card("واتساب", text("config.order.whatsapp", "رقم واتساب الذي تصلك عليه الطلبات", { dir: "ltr", type: "tel", help: "اكتبه مع رمز الدولة. إن كتبت 8 أرقام فقط يُضاف رمز عُمان 968." }))
            + card("العملة", `<div class="two">
                ${text("config.order.currency", "رمز العملة", { max: 8 })}
                ${select("config.order.decimals", "عدد الخانات العشرية", [["3", "3 خانات (مثل 3.500)"], ["2", "خانتان"], ["1", "خانة واحدة"], ["0", "بدون كسور"]], { type: "number" })}
            </div>`)
            + card("دول الخليج والعملات", `
                ${toggle("config.order.auto_rates", "تحديث أسعار الصرف تلقائياً كل يوم", { rerender: true, help: "تتغير أسعار العملات في المتجر حسب السوق بدون أي تدخل منك. أطفئه إذا تريد تكتب الأسعار بنفسك." })}
                ${o.auto_rates !== false ? `<p class="adm-sentence">${live ? `آخر تحديث للأسعار: <b dir="ltr">${esc(live.date || "")}</b>` : "تُجلب الأسعار مع التحديث القادم للمتجر (خلال ساعة)."}</p>` : ""}
                <ul class="items">${o.countries.map((c, i) => {
                    const base = ATHR_COUNTRIES.find((x) => x.code === c.code) || c;
                    const liveRate = live && live.rates[base.currency];
                    return `<li class="item-card">
                    <b class="ctitle">${c.flag} ${esc(c.name)} <small class="adm-muted">${esc(c.currency_name)} (${esc(c.currency)})</small></b>
                    ${c.code === "OM" ? `<small class="adm-muted">العملة الأساسية للمتجر، والطلبات تُحسب بها.</small>` : `
                    ${toggle(`config.order.countries.${i}.enabled`, "متاحة في المتجر", { rerender: true })}
                    <div class="two">
                        ${text(`config.order.countries.${i}.symbol`, "رمز العملة", { max: 6 })}
                        ${o.auto_rates !== false && liveRate
                            ? `<div class="af"><span>سعر الصرف اليوم (تلقائي)</span><div class="adm-rate" dir="ltr">1 OMR = ${esc(String(liveRate))} ${esc(base.currency)}</div></div>`
                            : number(`config.order.countries.${i}.rate`, `سعر الصرف: 1 ر.ع = ؟ ${esc(c.symbol)}`, { step: "0.0001" })}
                    </div>`}
                </li>`;
                }).join("")}</ul>`, "الزبون يختار دولته من أعلى المتجر فتظهر الأسعار بعملتها تقريباً، وتظهر له طرق التوصيل والدفع المتاحة لدولته فقط.")
            + card("التوصيل", `
                <ul class="items">${deliveries}</ul>
                <button class="ab ab-ghost ab-sm" type="button" data-add-item="config.order.delivery">+ إضافة طريقة توصيل</button>
                <hr>
                ${toggle("config.order.free_enabled", "توصيل مجاني عند حد معيّن", { rerender: true })}
                ${o.free_enabled ? number("config.order.free_min", "حد التوصيل المجاني (قيمة الطلب)", { help: "يُطبَّق على كل طرق التوصيل في الدول المختارة." }) + countryChecks("config.order.free_countries", "التوصيل المجاني متاح لـ") : ""}
`)
            + card("نموذج الطلب", `
                ${number("config.order.max_qty", "أقصى كمية من المنتج الواحد", { step: "1", min: "1" })}
                ${toggle("config.order.show_wilaya", "إظهار حقل الولاية", { rerender: true })}
                ${o.show_wilaya ? toggle("config.order.wilaya_required", "جعل الولاية إلزامية على العميل") : ""}
                ${toggle("config.order.show_notes", "إظهار حقل الملاحظات")}`)
            + card("طرق الدفع", `
                <ul class="items">${payments}</ul>
                <button class="ab ab-ghost ab-sm" type="button" data-add-item="config.order.payments">+ إضافة طريقة دفع</button>`);
    }

    // =====================================================
    // TAB 7: SALES
    // =====================================================

    function tabSales() {
        const s = cfg().sales;
        const d = ATHR_DEFAULTS.sales;
        const productOptions = [["", "اختر منتجاً"], ...A.draft.products.map((p) => [p.id, ATHR.productLabel(p, cfg()) + (p.is_visible ? "" : " (مخفي)")])];
        const name = (id) => {
            const p = A.draft.products.find((x) => x.id === id);
            return p ? ATHR.productLabel(p, cfg()) : "";
        };
        const bundles = s.bundles.map((b, i) => `<li class="item-card${b.enabled ? "" : " off"}">
            ${toggle(`config.sales.bundles.${i}.enabled`, b.enabled ? "مفعّلة" : "متوقفة", { rerender: true })}
            ${select(`config.sales.bundles.${i}.a`, "المنتج الأول (يشتريه العميل)", productOptions, { rerender: true })}
            ${select(`config.sales.bundles.${i}.b`, "المنتج الثاني (يحصل على الخصم)", productOptions, { rerender: true })}
            ${number(`config.sales.bundles.${i}.pct`, "نسبة الخصم على المنتج الثاني (%)", { step: "1", min: "1" })}
            ${b.a && b.b && b.a !== b.b ? `<p class="adm-sentence">اشترِ «${esc(name(b.a))}» واحصل على «${esc(name(b.b))}» بخصم ${esc(b.pct || 0)}%</p>` : ""}
            ${listControls("config.sales.bundles", i, s.bundles.length)}
        </li>`).join("");

        const vol = s.volume || { enabled: false, tiers: [] };
        const tiers = (vol.tiers || []).map((t, i) => `<li class="lst-row">
            <label class="af sm"><span>من عدد قطع</span><input class="ai" type="number" inputmode="numeric" step="1" min="2" data-bind="config.sales.volume.tiers.${i}.min" data-type="number" value="${esc(t.min ?? "")}"></label>
            <label class="af sm"><span>الخصم %</span><input class="ai" type="number" inputmode="numeric" step="1" min="1" max="90" data-bind="config.sales.volume.tiers.${i}.pct" data-type="number" value="${esc(t.pct ?? "")}"></label>
            ${listControls("config.sales.volume.tiers", i, vol.tiers.length)}
        </li>`).join("");
        const volText = ATHR.volumeTiers(cfg()).map((t) => `${ATHR.piecesText(t.min)} خصم ${t.pct}%`).join("، ");

        promoMaybeLoad();
        return couponsCard() + restockCard() + favCard()
            + card("خصم الكمية (يرفع قيمة الطلب)", `
                ${toggle("config.sales.volume.enabled", "تفعيل خصم الكمية", { rerender: true })}
                <ul class="lst">${tiers}</ul>
                ${(vol.tiers || []).length < 4 ? `<button class="ab ab-ghost ab-sm" type="button" data-add-item="config.sales.volume.tiers">+ إضافة شريحة</button>` : ""}
                ${vol.enabled && volText ? `<p class="adm-sentence">${esc(volText)} — يُطبَّق تلقائياً في السلة على كل المنتجات.</p>` : ""}`,
                "الخصم على مجموع الطلب حسب عدد القطع. لا يجتمع مع خصم الباقات، ويُطبَّق تلقائياً الأفضل للزبون. يظهر للزبون في صفحة المنتج وفي السلة («أضف قطعة ووفّر 10%»).")
            + card("بعد الإضافة للسلة", `
                ${toggle("config.sales.cart_float", "زر السلة العائم في كل صفحات المتجر", { help: "دائرة السلة مع عدد القطع، وحلقة خضراء تمتلئ كلما اقترب الزبون من الشحن المجاني، ثم «شحن مجاني» عند الوصول." })}
                ${toggle("config.sales.upsell_show", "نافذة «أُضيف إلى سلتك» مع اقتراحات وإكمال الطقم", { help: "تقترح على الزبون إكمال الطقم ومنتجات مناسبة، وتوضح كم بقي للتوصيل المجاني أو للخصم التالي." })}`)
            + card("👥 العملاء والعروض", `
                ${toggle("config.sales.marketing_default", "خيار «أرسلوا لي العروض والخصومات» مفعّل تلقائياً للزبون", { help: "يظهر للزبون في صفحة الطلب، ويقدر يطفئه. من يطفئه لا يدخل في إرسال العروض." })}
                <button class="ab ab-soft ab-sm" type="button" data-a="open-customers">فتح قائمة العملاء</button>`,
                "كل زبون يطلب يُحفظ اسمه ورقمه تلقائياً في «العملاء»، وتقدر ترسل له العروض والخصومات عبر واتساب.")
            + card("🎁 الهدية", `<button class="ab ab-soft ab-sm" type="button" data-tab="gift">فتح إعدادات الهدية</button>`, "كل إعدادات الهدية (التشغيل، شكل البطاقة، الألوان، الخط، الرسالة، المناسبات) صارت في قسم «الهدية».")
            + card("عناوين أقسام الصفحة الرئيسية", `
                ${text("config.sales.best_title", "عنوان الأكثر طلباً", { placeholder: d.best_title })}
                ${text("config.sales.sets_title", "عنوان الأطقم", { placeholder: d.sets_title })}
                ${text("config.sales.new_title", "عنوان وصل حديثاً", { placeholder: d.new_title })}`,
                "حدّد «الأكثر طلباً» و«وصل حديثاً» من تفاصيل كل منتج. الأطقم تظهر من الباقات المفعّلة.")
            + card("شريط الشحن المجاني", `
                ${toggle("config.sales.free_bar_show", "إظهار شريط الشحن المجاني أعلى المتجر")}
                ${text("config.sales.free_before", "الجملة قبل أن يضيف الزائر شيئاً", { placeholder: d.free_before })}
                ${text("config.sales.free_during", "الجملة أثناء التسوق", { placeholder: d.free_during, help: "{left} المبلغ المتبقي." })}
                ${text("config.sales.free_done", "الجملة عند بلوغ الحد", { placeholder: d.free_done })}`,
                cfg().order.free_enabled ? "" : "التوصيل المجاني متوقف من تبويب «الطلب والتوصيل»، لذلك لن يظهر الشريط.")
            + card("الباقات والخصومات", `
                <ul class="items">${bundles}</ul>
                ${s.bundles.length < 12 ? `<button class="ab ab-ghost ab-sm" type="button" data-add-item="config.sales.bundles">+ إضافة باقة</button>` : ""}`,
                "الخصم يُطبَّق تلقائياً في السلة ويدخل في رسالة واتساب، ويُحسب قبل حد التوصيل المجاني.")
            + card("منتجات قد تعجبك", `
                ${toggle("config.sales.related_show", "إظهار قسم «منتجات قد تعجبك»")}
                ${text("config.sales.related_title", "عنوان القسم", { placeholder: d.related_title })}
                ${select("config.sales.related_count", "عدد المنتجات المقترحة", [["2", "2"], ["3", "3"], ["4", "4"], ["6", "6"]], { type: "number" })}`)
            + card("الطلب السريع", `
                ${toggle("config.sales.buy_now", "زر «اشترِ الآن» داخل المنتج")}
                ${toggle("config.sales.wa_quick", "زر «اطلب عبر واتساب» بنقرة واحدة")}
                ${toggle("config.sales.remember_customer", "تذكّر بيانات الزائر على جهازه لتسريع طلبه القادم", { help: "تُحفظ على جهاز الزائر وحده، ولا تصلك ولا تصل لأحد غيره." })}`)
            + card("السلات غير المكتملة", `
                ${toggle("config.sales.abandoned_show", "تذكير الزائر العائد بسلته غير المكتملة")}
                ${text("config.sales.abandoned_text", "نص التذكير", { placeholder: d.abandoned_text, help: "{n} عدد المنتجات في السلة." })}
                ${area("config.sales.reminder_msg", "رسالة تذكير الطلبات في دفتر الطلبيات", { rows: 3, placeholder: d.reminder_msg, help: "{client} اسم العميل، {no} رقم الطلب، {total} المبلغ." })}
                ${area("config.sales.review_request_msg", "رسالة طلب التقييم بعد التسليم", { rows: 3, placeholder: d.review_request_msg, help: "{client} اسم العميل، {link} رابط صفحة التقييم." })}`)
            + card("شارات الثقة", `
                ${toggle("config.sales.pdp_perks", "شريط المزايا تحت صورة المنتج", { help: "«✓ شحن مجاني فوق 20 ر.ع | ✓ الدفع عند الاستلام». يُكتب تلقائياً من إعدادات التوصيل والدفع، ويصير «✓ الشحن مجاناً» للمنتج الذي سعره فوق حد التوصيل المجاني." })}
                ${toggle("config.sales.trust_show", "إظهار شارات الثقة تحت أزرار الشراء")}
                <p class="adm-muted">شارات تلقائية تُبنى من إعداداتك لدولة الزائر: الدفع عند الاستلام، التحويل البنكي، التوصيل لدول الخليج، التواصل عبر واتساب.</p>
                <div class="af"><span>شارات تكتبها بنفسك (حتى 3)</span>
                    <ul class="lst">${s.trust_custom.map((t, i) => `<li class="lst-row">
                        <input class="ai" data-bind="config.sales.trust_custom.${i}" value="${esc(t)}" maxlength="50" aria-label="شارة ${i + 1}">
                        ${listControls("config.sales.trust_custom", i, s.trust_custom.length)}
                    </li>`).join("")}</ul>
                    ${s.trust_custom.length < 3 ? `<button class="ab ab-ghost ab-sm" type="button" data-add-item="config.sales.trust_custom">+ إضافة شارة</button>` : ""}
                </div>`);
    }

    // =====================================================
    // أكواد المؤثرين + المفضلة + «أخبرني عند التوفر»
    // تُحفظ في قاعدة البيانات مباشرة (بدون «نشر»)
    // =====================================================

    const COUPON_KINDS = [["pct", "نسبة %"], ["fixed", "مبلغ ثابت"], ["ship", "توصيل مجاني"]];
    const RESTOCK_KEY = "athr_restock_msg";
    const RESTOCK_MSG = "هلا {name} 👋\n\n🎉 رجع *{product}* في {store}\n💰 السعر: *{price}*\n\nطلبت منّا نخبرك أول ما يتوفر، احجز قطعتك قبل لا يخلص 👇\n{link}";
    const TRANSLIT = { "ا": "A", "أ": "A", "إ": "I", "آ": "A", "ب": "B", "ت": "T", "ث": "TH", "ج": "J", "ح": "H", "خ": "KH", "د": "D", "ذ": "TH", "ر": "R", "ز": "Z", "س": "S", "ش": "SH", "ص": "S", "ض": "D", "ط": "T", "ظ": "Z", "ع": "A", "غ": "GH", "ف": "F", "ق": "Q", "ك": "K", "ل": "L", "م": "M", "ن": "N", "ه": "H", "ة": "A", "و": "W", "ي": "Y", "ى": "A", "ئ": "E", "ؤ": "O" };

    const promoFavs = (id) => (A.promo && A.promo.favs ? A.promo.favs[id] || 0 : 0);
    const promoWaiting = (id) => (A.promo && A.promo.restock ? A.promo.restock.filter((r) => r.product_id === id && !r.notified_at).length : 0);
    const findCoupon = (code) => ((A.promo && A.promo.coupons) || []).find((k) => k.code === code) || null;
    const waitText = (n) => (n === 1 ? "شخص واحد ينتظر" : n === 2 ? "شخصان ينتظران" : `${n} ينتظرون`);
    const couponLink = (code) => `${siteLink(ATHR.base())}?code=${encodeURIComponent(code)}`;

    // نحمّل البيانات عند فتح القسم، ونحدّثها إذا مرّت دقيقة
    function promoMaybeLoad() {
        const st = A.promo;
        if (!st || (!st.loading && Date.now() - (st.at || 0) > 60000)) loadPromo();
    }

    async function loadPromo() {
        A.promo = { ...(A.promo || {}), loading: true };
        try {
            const [k, o, f, r] = await Promise.all([
                sb.from("coupons").select("*").order("created_at", { ascending: false }),
                sb.from("orders").select("coupon,total,coupon_discount,hidden").not("coupon", "is", null).limit(5000),
                sb.from("product_stats").select("product_id,favs").gt("favs", 0),
                sb.from("restock_requests").select("*").order("created_at", { ascending: true }).limit(3000)
            ]);
            const failed = [k, o, f, r].find((x) => x.error);
            if (failed) throw failed.error;
            const uses = {};
            (o.data || []).forEach((x) => {
                if (x.hidden || !x.coupon) return;
                const u = uses[x.coupon] || (uses[x.coupon] = { orders: 0, sales: 0, disc: 0 });
                u.orders++;
                u.sales += Number(x.total || 0);
                u.disc += Number(x.coupon_discount || 0);
            });
            A.promo = {
                at: Date.now(),
                coupons: k.data || [],
                uses,
                favs: Object.fromEntries((f.data || []).map((x) => [x.product_id, Number(x.favs) || 0])),
                restock: r.data || []
            };
        } catch (error) {
            console.warn("Promo data failed:", error);
            A.promo = { ...(A.promo || {}), loading: false, error: true, at: Date.now() };
        }
        refreshPromoTab();
    }

    function refreshPromoTab() {
        if (A.view !== "admin" || !["sales", "products"].includes(A.tab)) return;
        const active = document.activeElement;
        const keep = active && active.id === "productFilter" ? active.selectionStart : null;
        renderTab({ keepScroll: true });
        if (keep !== null) {
            const input = $("#productFilter");
            if (input) {
                input.focus();
                try { input.setSelectionRange(keep, keep); } catch { /* ignore */ }
            }
        }
    }

    function promoState(empty) {
        const st = A.promo || {};
        if (st.error && !st.coupons) return `<p class="adm-note">تعذر التحميل. تأكد من الإنترنت. <button class="ab-mini" type="button" data-a="promo-reload">إعادة المحاولة</button></p>`;
        if (!st.coupons) return `<p class="adm-muted">جاري التحميل...</p>`;
        return empty;
    }

    // ---------- 🎟️ أكواد الخصم ----------

    function couponState(k) {
        const used = ((A.promo && A.promo.uses) || {})[k.code];
        if (!k.enabled) return ["", "متوقف"];
        if (k.ends_at && new Date(k.ends_at).getTime() <= Date.now()) return ["warn", "انتهى"];
        if (k.max_uses && used && used.orders >= k.max_uses) return ["warn", "اكتمل العدد"];
        return ["ok", "فعّال"];
    }

    function couponsCard() {
        const st = A.promo || {};
        const list = st.coupons || [];
        const uses = st.uses || {};
        const sum = list.reduce((a, k) => {
            const u = uses[k.code];
            if (u) { a.orders += u.orders; a.sales += u.sales; }
            return a;
        }, { orders: 0, sales: 0 });
        const rows = list.map((k) => {
            const u = uses[k.code] || { orders: 0, sales: 0, disc: 0 };
            const [cls, label] = couponState(k);
            const bits = [k.owner ? `👤 ${esc(k.owner)}` : "", esc(ATHR.couponText(k, cfg())), Number(k.min_total) > 0 ? `للطلبات من ${money(k.min_total)}` : "", k.ends_at ? `حتى ${esc(ATHR.muscatParts(k.ends_at).date)}` : "", k.max_uses ? `${u.orders} من ${k.max_uses} استخدام` : ""].filter(Boolean).join(" · ");
            return `<li class="cp-row${k.enabled ? "" : " off"}">
                <div class="cp-top">
                    <div class="cp-main"><span class="cp-code"><b dir="ltr">${esc(k.code)}</b> <span class="tag ${cls}">${label}</span></span><small>${bits}</small></div>
                    <button type="button" class="vis-switch" role="switch" aria-checked="${Boolean(k.enabled)}" data-cp-toggle="${esc(k.code)}" aria-label="تفعيل الكود ${esc(k.code)}"><span></span></button>
                </div>
                <div class="cp-stats"><span><small>طلبات</small><b>${u.orders}</b></span><span><small>مبيعات</small><b>${money(u.sales)}</b></span><span><small>خصومات</small><b>${money(u.disc)}</b></span></div>
                <div class="cp-btns">
                    <button type="button" class="ab-mini" data-cp-link="${esc(k.code)}">🔗 نسخ الرابط</button>
                    <button type="button" class="ab-mini wa" data-cp-msg="${esc(k.code)}">💬 رسالة للمؤثر</button>
                    <button type="button" class="ab-mini" data-cp-edit="${esc(k.code)}">تعديل</button>
                </div>
            </li>`;
        }).join("");
        const off = cfg().sales.coupons === false;
        return card("🎟️ أكواد الخصم والمؤثرين", `
            ${toggle("config.sales.coupons", "خانة «عندك كود خصم؟» في صفحة الطلب", { rerender: true, help: "أوقفها لإخفاء الخانة وإيقاف كل الأكواد عند الزبائن (تحتاج «نشر التغييرات»)." })}
            ${off ? `<p class="adm-note">الخانة متوقفة، فلن تعمل الأكواد عند الزبائن حتى تفعّلها وتنشر.</p>` : ""}
            ${promoState(`${list.length ? `<div class="ob-stats cp-sum"><div><small>طلبات بالأكواد</small><b>${sum.orders}</b></div><div><small>مبيعاتها</small><b>${money(sum.sales)}</b></div></div>
                <ul class="cp-list">${rows}</ul>` : `<p class="adm-muted cp-empty">لا توجد أكواد بعد. أنشئ أول كود لمؤثر، مثل SARA10.</p>`}
                <button class="ab ab-primary ab-sm" type="button" data-a="coupon-new">+ كود جديد</button>`)}`,
            "أعطِ كل مؤثر كوداً باسمه (مثل SARA10) ورابطاً يفعّل الكود تلقائياً، وتعرف كم طلب ومبيعات جاب كل واحد. الخصم يُحسب بعد خصومات المتجر، والخادم يتحقق منه فلا يمكن التلاعب به. الأكواد تُحفظ فوراً بدون «نشر».");
    }

    function suggestCode(owner, kind, value) {
        const raw = String(owner || "").trim().replace(/^@/, "").split(/\s+/)[0] || "";
        const base = (/[a-z]/i.test(raw) ? raw.toUpperCase().replace(/[^A-Z0-9]/g, "") : [...raw].map((ch) => TRANSLIT[ch] || "").join("")).slice(0, 12);
        if (!base) return "";
        const n = Math.round(Number(ATHR.digits(String(value || ""))) || 0);
        return (base + (kind === "ship" ? "FREE" : n > 0 ? String(n) : "")).slice(0, 20);
    }

    function couponSummary(form) {
        const get = (n) => String((form.elements.namedItem(n) || {}).value || "");
        const kind = (form.querySelector("input[name=kind]:checked") || {}).value || "pct";
        const code = ATHR.couponCode(get("code")) || "…";
        const who = get("owner").trim();
        const min = Number(ATHR.digits(get("min_total"))) || 0;
        const ends = get("ends");
        const what = ATHR.couponText({ kind, value: Number(ATHR.digits(get("value"))) || 0 }, cfg());
        return `${who ? `متابعو ${who} يكتبون` : "الزبون يكتب"} ${code} ${who ? "فيحصلون" : "فيحصل"} على ${what}${min > 0 ? ` للطلبات من ${money(min)}` : ""}${ends ? ` حتى ${ends.split("-").reverse().join("/")}` : ""}.`;
    }

    function couponSheet(k) {
        const isNew = !k;
        const c = k || { code: "", owner: "", kind: "pct", value: 10, min_total: 0, ends_at: null, max_uses: null, enabled: true };
        A.couponEdit = { orig: isNew ? null : c.code, auto: isNew };
        const ends = c.ends_at ? toMuscatInputs(c.ends_at).date : "";
        openSheet(`
            <div class="adm-sheet-head"><h2>${isNew ? "🎟️ كود خصم جديد" : `تعديل الكود <span dir="ltr">${esc(c.code)}</span>`}</h2><button class="adm-icon" type="button" data-a="close-sheet" aria-label="إغلاق">×</button></div>
            <form class="af-stack" id="couponForm" novalidate>
                <label class="af"><span>اسم المؤثر أو صاحب الكود</span><input class="ai" name="owner" maxlength="80" value="${esc(c.owner || "")}" placeholder="مثال: سارة"><small>لتعرف مبيعات كل مؤثر.</small></label>
                <label class="af"><span>الكود</span><input class="ai cp-input" name="code" dir="ltr" maxlength="20" autocapitalize="characters" autocomplete="off" spellcheck="false" value="${esc(c.code)}" placeholder="SARA10"${isNew ? "" : " readonly"}>
                    <small>${isNew ? "حروف إنجليزية وأرقام فقط (3 إلى 20)، مثل SARA10. الزبون يكتبه في صفحة الطلب، أو يفتح رابط المؤثر فيتفعّل وحده." : "لا يتغيّر الكود بعد إنشائه حتى لا تضيع مبيعاته. لكود مختلف أنشئ كوداً جديداً."}</small></label>
                <div class="af"><span>نوع الخصم</span><div class="cp-kind" role="radiogroup" aria-label="نوع الخصم">${COUPON_KINDS.map(([v, l]) => `<label><input type="radio" name="kind" value="${v}"${c.kind === v ? " checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
                <label class="af" id="cpValueBox"${c.kind === "ship" ? " hidden" : ""}><span id="cpValueLabel">${c.kind === "fixed" ? "المبلغ (ر.ع)" : "النسبة %"}</span><input class="ai" name="value" id="cpValue" type="number" inputmode="decimal" step="${c.kind === "fixed" ? "0.001" : "1"}" min="0" value="${c.kind === "ship" ? "" : esc(c.value ?? "")}"></label>
                <div class="two">
                    <label class="af"><span>أقل مبلغ للطلب</span><input class="ai" name="min_total" type="number" inputmode="decimal" step="0.001" min="0" value="${Number(c.min_total) > 0 ? esc(c.min_total) : ""}" placeholder="بدون حد"></label>
                    <label class="af"><span>عدد مرات الاستخدام</span><input class="ai" name="max_uses" type="number" inputmode="numeric" step="1" min="1" value="${c.max_uses ? esc(c.max_uses) : ""}" placeholder="بلا حد"></label>
                </div>
                <label class="af"><span>ينتهي في (اختياري)</span><input class="ai" name="ends" type="date" value="${esc(ends)}"><small>آخر يوم يعمل فيه الكود، بتوقيت مسقط.</small></label>
                <label class="at"><input type="checkbox" name="enabled"${c.enabled ? " checked" : ""}><span class="at-ui" aria-hidden="true"></span><span class="at-text"><b>الكود مفعّل</b></span></label>
                <p class="adm-sentence" id="cpSum"></p>
                <p class="adm-error" id="cpErr" role="alert"></p>
                <button class="ab ab-primary ab-block" type="submit">${isNew ? "إنشاء الكود" : "حفظ"}</button>
                ${isNew ? "" : `<button class="ab ab-ghost ab-block danger cp-del" type="button" data-a="coupon-delete">حذف الكود</button>`}
            </form>`);
        $("#cpSum").textContent = couponSummary($("#couponForm"));
    }

    function couponFormInput(t) {
        const form = $("#couponForm");
        const ed = A.couponEdit;
        if (!form || !ed) return;
        if (t.name === "code") {
            const clean = ATHR.couponCode(ATHR.digits(t.value)).replace(/[^A-Z0-9_-]/g, "");
            if (clean !== t.value) t.value = clean;
            ed.auto = !clean;
        }
        const kind = (form.querySelector("input[name=kind]:checked") || {}).value || "pct";
        const value = form.elements.namedItem("value");
        if (t.name === "kind") {
            $("#cpValueBox").hidden = kind === "ship";
            $("#cpValueLabel").textContent = kind === "fixed" ? "المبلغ (ر.ع)" : "النسبة %";
            value.step = kind === "fixed" ? "0.001" : "1";
            if (kind !== "ship" && !value.value) value.value = kind === "fixed" ? "1" : "10";
        }
        if (ed.auto && !ed.orig && ["owner", "kind", "value"].includes(t.name)) {
            form.elements.namedItem("code").value = suggestCode(form.elements.namedItem("owner").value, kind, value.value);
        }
        $("#cpSum").textContent = couponSummary(form);
    }

    async function saveCoupon(form) {
        const f = Object.fromEntries(new FormData(form).entries());
        const err = $("#cpErr");
        const fail = (msg) => { err.textContent = msg; return false; };
        const ed = A.couponEdit || {};
        const num = (x) => (String(x ?? "").trim() === "" ? null : Number(ATHR.digits(String(x))));
        const code = ed.orig || ATHR.couponCode(ATHR.digits(f.code || ""));
        const kind = COUPON_KINDS.some(([v]) => v === f.kind) ? f.kind : "pct";
        const value = kind === "ship" ? 0 : num(f.value);
        const minTotal = num(f.min_total) || 0;
        const maxUses = num(f.max_uses);
        if (!ATHR.couponValid(code)) return fail("اكتب الكود بالحروف الإنجليزية والأرقام فقط (3 إلى 20)، مثل SARA10.");
        if (kind === "pct" && !(value >= 1 && value <= 90)) return fail("اكتب نسبة الخصم بين 1% و 90%.");
        if (kind === "fixed" && !(value > 0)) return fail("اكتب مبلغ الخصم.");
        if (!(minTotal >= 0)) return fail("أقل مبلغ للطلب غير صحيح.");
        if (maxUses !== null && !(Number.isInteger(maxUses) && maxUses > 0)) return fail("عدد مرات الاستخدام رقم صحيح أكبر من صفر.");
        const row = {
            owner: String(f.owner || "").trim().slice(0, 80) || null,
            kind,
            value: Math.round(value * 1000) / 1000,
            min_total: Math.round(minTotal * 1000) / 1000,
            ends_at: /^\d{4}-\d{2}-\d{2}$/.test(f.ends || "") ? `${f.ends}T23:59:59+04:00` : null,
            max_uses: maxUses,
            enabled: Boolean(f.enabled)
        };
        err.textContent = "";
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        const { error } = ed.orig ? await sb.from("coupons").update(row).eq("code", code) : await sb.from("coupons").insert({ code, ...row });
        btn.disabled = false;
        if (error) {
            if (error.code === "23505") return fail("هذا الكود موجود من قبل. اختر كوداً آخر.");
            console.warn("Coupon save failed:", error);
            return fail("تعذر الحفظ. تأكد من الإنترنت وحاول مرة أخرى.");
        }
        A.couponEdit = null;
        closeSheet();
        toast(ed.orig ? "حُفظ الكود ✓" : `أُنشئ الكود ${code} ✓ انسخ رابطه أو رسالته للمؤثر`);
        await loadPromo();
        return true;
    }

    async function toggleCoupon(code) {
        const k = findCoupon(code);
        if (!k) return;
        k.enabled = !k.enabled;
        refreshPromoTab();
        const { error } = await sb.from("coupons").update({ enabled: k.enabled }).eq("code", code);
        if (error) {
            k.enabled = !k.enabled;
            refreshPromoTab();
            toast("تعذر الحفظ. تأكد من الإنترنت.");
        } else toast(k.enabled ? `الكود ${code} مفعّل` : `أُوقف الكود ${code}`);
    }

    async function deleteCoupon() {
        const code = A.couponEdit && A.couponEdit.orig;
        if (!code) return;
        const used = (((A.promo && A.promo.uses) || {})[code] || {}).orders || 0;
        if (!confirm(used ? `حذف الكود ${code}؟ عليه ${used} طلب، وبعد الحذف تختفي أرقامه من هنا. الأفضل «إيقافه» بالمفتاح.` : `حذف الكود ${code}؟`)) return;
        const { error } = await sb.from("coupons").delete().eq("code", code);
        if (error) {
            toast("تعذر الحذف. تأكد من الإنترنت.");
            return;
        }
        A.couponEdit = null;
        closeSheet();
        toast(`حُذف الكود ${code}`);
        await loadPromo();
    }

    // رسالة جاهزة للمؤثر: كوده، ورابطه، ونص للستوري
    function couponMessage(k) {
        const store = ATHR.storeName(cfg());
        const link = couponLink(k.code);
        const what = ATHR.couponText(k, cfg());
        const first = String(k.owner || "").trim().split(/\s+/)[0];
        const cond = [Number(k.min_total) > 0 ? `للطلبات من ${money(k.min_total)}` : "على كل الطلبات", k.ends_at ? `حتى ${ATHR.muscatParts(k.ends_at).date}` : ""].filter(Boolean).join(" ");
        return [
            `هلا${first ? ` ${first}` : ""} 👋`,
            `هذا كود الخصم الخاص فيك من ${store} 🎟️`,
            "",
            `الكود: *${k.code}*`,
            `يعطي متابعينك ${what} ${cond}`,
            "",
            "🔗 رابطك الخاص (الكود يتفعّل تلقائياً عند الطلب):",
            link,
            "",
            "✨ نص جاهز للستوري:",
            `كود خصم لمتابعيني من ${store} 😍`,
            `استخدموا الكود ${k.code} واحصلوا على ${what}`,
            "اطلبوا من هنا 👇",
            link
        ].join("\n");
    }

    // ---------- 🔔 أخبرني عند التوفر ----------

    // المنتج كما هو منشور الآن (لأن الرابط يجب أن يعمل عند الزبون)
    function publishedProduct(id) {
        const visible = (A.server ? A.server.products : []).filter((p) => p.is_visible !== false);
        return ATHR.assignSlugs(visible, cfg()).find((p) => p.id === id) || null;
    }

    function restockGroups() {
        const map = new Map();
        ((A.promo && A.promo.restock) || []).forEach((r) => {
            const g = map.get(r.product_id) || { pid: r.product_id, wait: [], done: 0 };
            if (r.notified_at) g.done++;
            else g.wait.push(r);
            map.set(r.product_id, g);
        });
        return [...map.values()]
            .map((g) => ({ ...g, p: A.draft.products.find((x) => x.id === g.pid), live: publishedProduct(g.pid) }))
            .filter((g) => g.p)
            .sort((a, b) => b.wait.length - a.wait.length);
    }

    function restockCard() {
        const groups = restockGroups();
        const waiting = groups.reduce((n, g) => n + g.wait.length, 0);
        const rows = groups.map((g) => {
            const ready = g.live && g.live.is_available !== false;
            const [cls, label] = ready ? ["ok", "✅ متوفر الآن"] : !g.live ? ["", "مخفي"] : g.p.is_available !== false ? ["warn", "انشر التغييرات ثم أرسل"] : ["", "ما زال نافداً"];
            return `<li class="rs-row">
                <img src="${esc(ATHR.thumb(g.p.image_url, "s") || asset("images/logo2.jpeg"))}" alt="" loading="lazy">
                <span class="op-info"><b>${esc(g.p.name)}</b><small>${g.wait.length ? `🔔 ${waitText(g.wait.length)}` : "لا أحد ينتظر"}${g.done ? ` · أُبلغ ${g.done}` : ""}</small><span><span class="tag ${cls}">${label}</span></span></span>
                <span class="rs-btns">
                    ${ready && g.wait.length ? `<button class="ab ab-primary ab-sm" type="button" data-restock-send="${esc(g.pid)}">أرسل لهم (${g.wait.length})</button>` : ""}
                    ${g.live && g.p.is_available === false && g.wait.length ? `<button class="ab-mini" type="button" data-restock-avail="${esc(g.pid)}">صار متوفراً</button>` : ""}
                    ${g.done ? `<button class="ab-mini" type="button" data-restock-clear="${esc(g.pid)}">مسح من أُبلغوا</button>` : ""}
                </span>
            </li>`;
        }).join("");
        return card(`🔔 أخبرني عند التوفر${waiting ? ` <span class="tag warn">${waitText(waiting)}</span>` : ""}`, `
            ${toggle("config.sales.restock", "زر «أخبرني عند التوفر» على المنتجات النافدة", { help: "الزبون يترك اسمه ورقمه، وأول ما يتوفر المنتج ترسل له رسالة واتساب جاهزة بضغطة." })}
            ${promoState(groups.length ? `<ul class="rs-list">${rows}</ul>` : `<p class="adm-muted">لا أحد ينتظر منتجاً الآن. يظهر هنا كل من يضغط «أخبرني عند التوفر».</p>`)}`,
            "عند توفر المنتج: أطفئ «نفد من المخزون» (أو اضغط «صار متوفراً» هنا) ثم «نشر التغييرات»، وبعدها «أرسل لهم».");
    }

    function restockText(st, r) {
        const first = String((r && r.name) || "").trim().split(/\s+/)[0] || "";
        const p = st.product;
        return fillOffer(st.text, { name: first, store: ATHR.storeName(cfg()), product: p.name, price: money(p.price), link: `${siteLink(ATHR.url.product(p))}?ref=whatsapp`, old: "", pct: "", save: "", ends: "" });
    }

    function openRestock(pid) {
        const g = restockGroups().find((x) => x.pid === pid);
        if (!g || !g.live || !g.wait.length) return;
        A.restockRun = { pid, product: g.live, list: g.wait.slice(), i: 0, sent: 0, step: "compose", text: storage.get(RESTOCK_KEY) || RESTOCK_MSG };
        renderRestock();
    }

    function renderRestock() {
        const st = A.restockRun;
        if (!st) return;
        const p = st.product;
        const head = (title) => `<div class="adm-sheet-head"><h2>${title}</h2><button class="adm-icon" type="button" data-a="close-sheet" aria-label="إغلاق">×</button></div>`;
        if (st.step === "compose") {
            openSheet(`${head("🔔 أخبرهم أنه رجع")}
                <div class="af-stack">
                    <div class="op-chosen"><img src="${esc(ATHR.thumb(p.image_url, "s") || asset(p.image_url))}" alt=""><span class="op-info"><b>${esc(p.name)}</b><small>${waitText(st.list.length)} · ${money(p.price)}</small></span></div>
                    <label class="af"><span>نص الرسالة (تقدر تعدّله)</span><textarea class="ai" id="restockText" rows="8">${esc(st.text)}</textarea><small>{name} اسم الزبون · {product} المنتج · {price} السعر · {link} رابط المنتج.</small></label>
                    <div class="af"><span>👀 هكذا تصل الرسالة</span><div id="restockPreview">${waBubble(restockText(st, st.list[0]), st)}</div></div>
                    <button class="ab ab-primary ab-block" type="button" data-a="restock-start">ابدأ الإرسال (${st.list.length})</button>
                    <p class="adm-muted">تضغط «أرسل» لكل شخص وننقلك للتالي تلقائياً. من تُرسل له يُعلَّم «أُبلغ» حتى لا تكرر عليه.</p>
                </div>`);
            return;
        }
        const r = st.list[st.i];
        if (!r) {
            openSheet(`${head("تم ✅")}
                <div class="af-stack">
                    <div class="offer-done"><span aria-hidden="true">🎉</span><p class="adm-sentence">أبلغت <b>${st.sent}</b> من ${st.list.length} أن «${esc(p.name)}» رجع.</p></div>
                    <button class="ab ab-primary ab-block" type="button" data-a="close-sheet">إغلاق</button>
                </div>`);
            return;
        }
        const first = String(r.name || "").trim().split(/\s+/)[0];
        openSheet(`${head("🔔 إرسال التنبيه")}
            <div class="af-stack offer-run">
                <div class="offer-progress"><span style="width:${Math.round((st.i / st.list.length) * 100)}%"></span></div>
                <p class="adm-muted">الشخص ${st.i + 1} من ${st.list.length} · أُرسل ${st.sent}</p>
                <div class="offer-who"><b>${esc(r.name || "بدون اسم")}</b><span dir="ltr">+${esc(r.phone)}</span></div>
                ${waBubble(restockText(st, r), st)}
                <button class="ab ab-primary ab-block offer-send" type="button" data-a="restock-send">${ATHR.views.waIcon()}أرسل${first ? ` لـ${esc(first)}` : ""} في واتساب</button>
                <div class="inline"><button class="ab-mini" type="button" data-a="restock-skip">تخطي</button><button class="ab-mini" type="button" data-a="restock-stop">إيقاف</button></div>
            </div>`);
    }

    function restockSend() {
        const st = A.restockRun;
        const r = st && st.list[st.i];
        if (!r) return;
        window.open(ATHR.waLink(r.phone, restockText(st, r)), "_blank", "noopener");
        st.sent++;
        st.i++;
        const at = new Date().toISOString();
        r.notified_at = at;
        sb.from("restock_requests").update({ notified_at: at }).eq("product_id", r.product_id).eq("phone", r.phone).then(() => {}, () => {});
        renderRestock();
    }

    async function clearRestock(pid) {
        const g = restockGroups().find((x) => x.pid === pid);
        if (!g || !g.done || !confirm(`مسح ${g.done} ممن أُبلغوا عن «${g.p.name}» من القائمة؟`)) return;
        const { error } = await sb.from("restock_requests").delete().eq("product_id", pid).not("notified_at", "is", null);
        if (error) {
            toast("تعذر المسح. تأكد من الإنترنت.");
            return;
        }
        A.promo.restock = A.promo.restock.filter((r) => r.product_id !== pid || !r.notified_at);
        refreshPromoTab();
        toast("مُسحت القائمة");
    }

    // ---------- ❤️ المفضلة ----------

    function favCard() {
        const favs = (A.promo && A.promo.favs) || {};
        const top = Object.entries(favs)
            .map(([pid, n]) => ({ p: A.draft.products.find((x) => x.id === pid), n }))
            .filter((x) => x.p && x.n > 0)
            .sort((a, b) => b.n - a.n)
            .slice(0, 8);
        const offerIds = new Set(offerProducts().map((p) => p.id));
        const rows = top.map(({ p, n }, i) => `<li class="ft-row">
            <span class="ft-rank">${i + 1}</span>
            <img src="${esc(ATHR.thumb(p.image_url, "s") || asset("images/logo2.jpeg"))}" alt="" loading="lazy">
            <span class="op-info"><b>${esc(p.name)}</b><small>${money(p.price)}${p.is_available === false ? " · نفد" : ""}</small></span>
            <span class="ft-n">❤️ ${n}</span>
            ${offerIds.has(p.id) ? `<button class="ab-mini gift" type="button" data-fav-offer="${esc(p.id)}">📣 عرض</button>` : ""}
        </li>`).join("");
        return card("❤️ المفضلة", `
            ${toggle("config.sales.favorites", "زر القلب ♥ على المنتجات وصفحة «المفضلة»", { help: "الزبون يحفظ التصاميم التي أعجبته ويرجع لها من القائمة أو من الصفحة الرئيسية." })}
            ${promoState(top.length ? `<p class="adm-muted ft-head">الأكثر إعجاباً عند زبائنك:</p><ol class="ft-list">${rows}</ol>` : `<p class="adm-muted">لم يُضف أحد منتجاً للمفضلة بعد.</p>`)}`,
            "نعرض لك عدد الإعجابات فقط، بدون أي بيانات عن الزوار. أرسل عرضاً على التصميم الأكثر إعجاباً، أو استخدمه في إعلانك القادم.");
    }

    // فتح استوديو العروض على منتج من المفضلة مباشرة
    async function offerFor(pid) {
        A.book = "customers";
        location.hash = "#orders";
        await open("orders");
        if (A.view !== "orders") return;
        if (!A.customersLoaded) {
            try {
                await loadCustomers();
                renderCustomers();
            } catch {
                return;
            }
        }
        openOffer();
        offerChoose(pid);
    }

    async function promoClick(d) {
        const st = A.restockRun;
        switch (d.a) {
            case "coupon-new": couponSheet(null); return;
            case "coupon-delete": await deleteCoupon(); return;
            case "promo-reload": loadPromo(); refreshPromoTab(); return;
            case "restock-start": if (st) { st.step = "run"; renderRestock(); } return;
            case "restock-send": restockSend(); return;
            case "restock-skip": if (st) { st.i++; renderRestock(); } return;
            case "restock-stop": if (st) { st.i = st.list.length; renderRestock(); } return;
            default: break;
        }
        if (d.cpToggle) { toggleCoupon(d.cpToggle); return; }
        if (d.cpEdit) { const k = findCoupon(d.cpEdit); if (k) couponSheet(k); return; }
        if (d.cpLink) { ATHR.store.copyText(couponLink(d.cpLink), "نُسخ رابط الكود ✓"); return; }
        if (d.cpMsg) { const k = findCoupon(d.cpMsg); if (k) ATHR.store.copyText(couponMessage(k), "نُسخت رسالة المؤثر ✓ الصقها له في واتساب أو إنستغرام"); return; }
        if (d.restockSend) { openRestock(d.restockSend); return; }
        if (d.restockClear) { clearRestock(d.restockClear); return; }
        if (d.restockAvail) {
            const p = A.draft.products.find((x) => x.id === d.restockAvail);
            if (p) {
                p.is_available = true;
                afterChange();
                toast("صار متوفراً في المسودة. اضغط «نشر التغييرات» ثم «أرسل لهم».");
            }
            return;
        }
        if (d.favOffer) offerFor(d.favOffer);
    }

    // =====================================================
    // TAB 8: CONTACT & REVIEWS
    // =====================================================

    // =====================================================
    // TAB: تتبع الإعلانات (Meta Pixel + TikTok Pixel + نتائج كل منصة)
    // =====================================================

    const AD_CHANNELS = [["instagram", "إنستغرام", "📸"], ["tiktok", "تيك توك", "🎵"], ["snapchat", "سناب شات", "👻"], ["facebook", "فيسبوك", "📘"]];

    async function loadAdStats() {
        A.adStats = { loading: true };
        try {
            const since = new Date(Date.now() - 30 * 864e5);
            const sinceDay = new Date(since.getTime() + 4 * 36e5).toISOString().slice(0, 10);
            const chs = AD_CHANNELS.map((c) => c[0]);
            const [st, od] = await Promise.all([
                sb.from("stats_daily").select("key,n").in("key", chs.map((c) => `visit:${c}`)).gte("day", sinceDay),
                sb.from("orders").select("channel,total,hidden,ordered_at").in("channel", chs).gte("ordered_at", since.toISOString())
            ]);
            if (st.error || od.error) throw st.error || od.error;
            const sum = (key) => (st.data || []).filter((r) => r.key === key).reduce((n, r) => n + Number(r.n || 0), 0);
            A.adStats = {
                rows: AD_CHANNELS.map(([ch, label, emoji]) => {
                    const orders = (od.data || []).filter((o) => o.channel === ch && !o.hidden);
                    return { ch, label, emoji, visits: sum(`visit:${ch}`), orders: orders.length, sales: orders.reduce((n, o) => n + Number(o.total || 0), 0) };
                })
            };
        } catch (error) {
            console.warn("Ad stats failed:", error);
            A.adStats = { error: true };
        }
        if (A.view === "admin" && A.tab === "ads") renderTab({ keepScroll: true });
    }

    function adResults() {
        const st = A.adStats;
        if (!st || st.loading) return `<section class="adm-card ad-results"><h2>📈 نتائج إعلاناتك <small class="adm-muted">آخر 30 يوم</small></h2><p class="adm-muted">جاري التحميل...</p></section>`;
        if (st.error) return "";
        const rows = st.rows.filter((r) => r.visits || r.orders || r.ch === "instagram" || r.ch === "tiktok");
        return `<section class="adm-card ad-results"><h2>📈 نتائج إعلاناتك <small class="adm-muted">آخر 30 يوم · حسب متجرك</small></h2>
            <div class="ad-rows">${rows.map((r) => `<div class="ad-row">
                <b><span aria-hidden="true">${r.emoji}</span> ${r.label}</b>
                <span><small>زيارات</small><b>${r.visits}</b></span>
                <span><small>طلبات</small><b>${r.orders}</b></span>
                <span><small>مبيعات</small><b>${money(r.sales)}</b></span>
                <span><small>تحويل</small><b>${r.visits ? `${Math.round((r.orders / r.visits) * 1000) / 10}%` : "—"}</b></span>
            </div>`).join("")}</div>
            <p class="adm-muted">تُحسب الزيارة لإنستغرام أو تيك توك تلقائياً عند الفتح من التطبيق أو من الروابط الجاهزة بالأسفل. تفاصيل أكثر في دفتر الطلبيات ← «الأداء».</p>
        </section>`;
    }

    function tabAds() {
        const t = cfg().tracking || {};
        const metaId = ATHR.metaPixelId(t.meta_pixel);
        const ttId = ATHR.tiktokPixelId(t.tiktok_pixel);
        if (!A.adStats) loadAdStats();
        const status = (id, raw) => (id ? `<span class="tag ok">✅ مفعّل</span>` : String(raw || "").trim() ? `<span class="tag warn">الرقم غير صحيح</span>` : `<span class="tag">غير مفعّل</span>`);
        const base = siteLink(ATHR.base());
        const link = (ref, label) => `<div class="ad-link"><span><b>${label}</b><code dir="ltr">${esc(decodeURI(base))}?ref=${ref}</code></span><button class="ab ab-soft ab-sm" type="button" data-copy-text="${esc(`${base}?ref=${ref}`)}">نسخ</button></div>`;
        return `
            <p class="adm-sentence">اربط متجرك بإعلانات إنستغرام وتيك توك: تعرف كم شخص شاف المنتج وأضاف للسلة واشترى من كل إعلان، والمنصة نفسها تتعلم وتوصّل إعلانك لناس أكثر احتمالاً للشراء.</p>
            ${adResults()}
            ${card(`Meta Pixel <small class="adm-muted">(إنستغرام وفيسبوك)</small> ${status(metaId, t.meta_pixel)}`, `
                <label class="af"><span>رقم البكسل (Pixel ID)</span><input class="ai" dir="ltr" data-pixel="meta" value="${esc(t.meta_pixel || "")}" placeholder="1234567890123456" autocomplete="off" spellcheck="false">
                    <small>الصق الرقم وحده، أو الصق الكود كاملاً ونطلع الرقم منه تلقائياً.${metaId ? ` الرقم: <b dir="ltr">${esc(metaId)}</b>` : ""}</small></label>
                <details class="howto"><summary>من أين أحصل على الرقم؟</summary><ol>
                    <li>افتح <b dir="ltr">business.facebook.com</b> بحسابك المرتبط بصفحة إنستغرام.</li>
                    <li>ادخل «مدير الأحداث» (Events Manager) ← «ربط مصادر البيانات» ← «ويب» ← Meta Pixel.</li>
                    <li>سمِّه «أثر»، واختر الإعداد اليدوي، ثم انسخ رقم Pixel ID (15–16 رقماً) والصقه هنا.</li>
                    <li>اضغط «نشر التغييرات». لا تحتاج تضيف أي كود آخر.</li>
                </ol></details>`)}
            ${card(`TikTok Pixel ${status(ttId, t.tiktok_pixel)}`, `
                <label class="af"><span>رقم البكسل (Pixel ID)</span><input class="ai" dir="ltr" data-pixel="tiktok" value="${esc(t.tiktok_pixel || "")}" placeholder="C4ABCD1234EFGH5678IJ" autocomplete="off" autocapitalize="characters" spellcheck="false">
                    <small>الصق الرقم وحده، أو الكود كاملاً.${ttId ? ` الرقم: <b dir="ltr">${esc(ttId)}</b>` : ""}</small></label>
                <details class="howto"><summary>من أين أحصل على الرقم؟</summary><ol>
                    <li>افتح <b dir="ltr">ads.tiktok.com</b>.</li>
                    <li>من «الأدوات» (Tools) اختر «الأحداث» (Events) ← «أحداث الويب» (Web Events).</li>
                    <li>أنشئ بكسل جديد واختر «تثبيت الكود يدوياً» (Manually install pixel code).</li>
                    <li>انسخ رقم البكسل (حروف وأرقام) أو الكود كاملاً والصقه هنا، ثم «نشر التغييرات».</li>
                </ol></details>`)}
            ${card("ماذا يُرسل للمنصات؟", `
                <ul class="px-events">
                    <li>👀 <b>زيارة صفحة</b> <small dir="ltr">PageView</small></li>
                    <li>🛍️ <b>مشاهدة منتج</b> <small dir="ltr">ViewContent</small></li>
                    <li>🛒 <b>إضافة للسلة</b> <small dir="ltr">AddToCart</small></li>
                    <li>📝 <b>بدء الطلب</b> <small dir="ltr">InitiateCheckout</small></li>
                    <li>✅ <b>الشراء مع قيمته</b> <small dir="ltr">Purchase</small></li>
                    <li>🔍 <b>بحث</b> · 💬 <b>تواصل واتساب</b> <small dir="ltr">Search · Contact</small></li>
                </ul>
                <small class="adm-muted">القيم تُرسل بالدولار (1 ر.ع = 2.60 $) لأن المنصات تدعمه دائماً. لا نرسل أسماء أو أرقام العملاء. وزياراتك أنت من جوالك (المسجّل كصاحب المتجر) لا تُرسل، حتى لا تختلط بنتائج الإعلانات.</small>`)}
            ${card("روابط جاهزة لإعلاناتك", `
                ${link("instagram", "📸 إنستغرام (البايو والإعلانات والستوري)")}
                ${link("tiktok", "🎵 تيك توك")}
                ${link("snapchat", "👻 سناب شات")}
                <small class="adm-muted">لرابط منتج معيّن: انسخ رابطه من «المنتجات» وأضف في آخره <code dir="ltr">?ref=instagram</code> أو <code dir="ltr">?ref=tiktok</code>.</small>`, "استخدمها في البايو والإعلانات، حتى يُعرف من أين جاء كل زائر وكل طلب.")}
            ${card("كيف تتأكد أنه يعمل؟", `
                <ol class="howto-ol">
                    <li>اضغط «نشر التغييرات».</li>
                    <li>افتح المتجر من جوال آخر (ليس جوالك)، وافتح منتجاً وأضفه للسلة.</li>
                    <li>في Meta: مدير الأحداث ← «اختبار الأحداث» (Test events). وفي TikTok: Web Events ← «اختبار الأحداث». تظهر الأحداث خلال دقائق.</li>
                </ol>`)}`;
    }

    // لصق الرقم أو الكود كاملاً: نحفظ الرقم فقط
    function setPixel(input) {
        const kind = input.dataset.pixel;
        const raw = input.value;
        const id = kind === "meta" ? ATHR.metaPixelId(raw) : ATHR.tiktokPixelId(raw);
        setPath(`config.tracking.${kind === "meta" ? "meta_pixel" : "tiktok_pixel"}`, id || raw.trim());
        saveDraft();
        if (id && id !== raw.trim()) input.value = id;
        renderTab({ keepScroll: true });
        if (raw.trim()) toast(id ? "✅ تم التعرّف على رقم البكسل. اضغط «نشر التغييرات»." : "الرقم غير صحيح. انسخه من جديد.");
    }

    function tabContact() {
        const c = cfg().contact;
        const d = ATHR_DEFAULTS.contact;
        const reviews = c.reviews.map((r, i) => {
            const base = `config.contact.reviews.${i}`;
            const images = r.images || [];
            return `<li class="item-card">
                <div class="two">
                    ${text(`${base}.name`, "اسم العميل (اختياري)")}
                    ${select(`${base}.stars`, "التقييم", [["5", "★★★★★ (5)"], ["4", "★★★★ (4)"], ["3", "★★★ (3)"], ["2", "★★ (2)"], ["1", "★ (1)"]], { type: "number" })}
                </div>
                ${area(`${base}.text`, "نص الرأي", { rows: 2 })}
                <div class="af"><span>صور العميل (اختياري، حتى 3)</span>
                    <div class="thumb-row">${images.map((src, n) => `<span class="thumb"><img src="${esc(src)}" alt=""><button type="button" class="ab-mini danger" data-review-img-del="${i}" data-n="${n}" aria-label="حذف الصورة">×</button></span>`).join("")}</div>
                    ${images.length < 3 ? uploadButton("إضافة صورة", `data-review-img="${i}" multiple`) : ""}
                </div>
                <div class="af"><span>فيديو العميل (اختياري)</span>
                    ${uploadButton(r.video ? "استبدال الفيديو" : "رفع فيديو", `data-upload="${base}.video" data-kind="reviewVideo"`, { accept: "video/*", current: r.video, remove: r.video ? `data-clear="${base}.video"` : "" })}
                </div>
                ${listControls("config.contact.reviews", i, c.reviews.length)}
            </li>`;
        }).join("");

        return card("قائمة النقاط الثلاث (⋮) أعلى المتجر", `
                ${toggle("config.contact.menu_show", "إظهار قائمة النقاط الثلاث")}
                ${toggle("config.contact.menu_home", "زر «الصفحة الرئيسية» في القائمة")}
                ${text("config.contact.share_url", "رابط متجرك", { dir: "ltr", placeholder: "https://", help: "يُستعمل في روابط التقييم والمشاركة. غيّره فقط إذا ربطت دومينك الخاص." })}`)
            + card("الظهور في جوجل", `
                ${text("config.seo.home_title", "عنوان المتجر في نتائج جوجل", { max: 70, placeholder: `${cfg().name} | ${cfg().texts.hero_title}`, help: "أفضل طول 50 إلى 60 حرفاً، وفيه الكلمات التي يبحث بها الناس مثل «أكواب» و«عُمان»." })}
                ${area("config.seo.home_description", "وصف المتجر في نتائج جوجل", { rows: 3, help: "أفضل طول 120 إلى 155 حرفاً. اتركه فارغاً ليُكتب تلقائياً من النبذة وطرق التوصيل والدفع." })}
                ${text("config.seo.google_verification", "رمز التحقق من Google Search Console", { dir: "ltr", placeholder: "الصق الرمز أو وسم meta كاملاً", help: "من Search Console اختر طريقة «علامة HTML» وانسخ الرمز هنا، ثم انشر وانتظر حتى ساعة قبل الضغط على «تحقق»." })}
                <p class="adm-muted">لكل منتج وقسم صفحة خاصة يقرؤها جوجل، تُحدَّث تلقائياً كل ساعة بعد النشر. خريطة الموقع: <code dir="ltr">${esc(siteLink(ATHR.base() + "sitemap.xml"))}</code></p>`,
                "عناوين المنتجات وأوصافها تؤثر على ظهورك في البحث. اكتب وصفاً لكل قسم في «الأقسام والألوان».")
            + card("زر واتساب السريع", `
                ${toggle("config.contact.wa_float", "إظهار زر واتساب العائم في كل الصفحة")}
                ${text("config.contact.wa_float_msg", "الرسالة الجاهزة عند ضغط الزائر على الزر", { placeholder: d.wa_float_msg })}`)
            + card("سياسة الشحن والتوصيل", `
                ${toggle("config.contact.policy_show", "إظهار رابط «سياسة الشحن والتوصيل» للعميل")}
                ${text("config.contact.policy_title", "عنوان السياسة", { placeholder: d.policy_title })}
                ${area("config.contact.policy_notes", "ملاحظات إضافية في السياسة", { rows: 3, help: "أسعار التوصيل وطرق الدفع تُسحب تلقائياً من تبويب الطلب والتوصيل. كل سطر فقرة." })}`)
            + card("آراء العملاء", `
                ${text("config.contact.reviews_title", "عنوان قسم الآراء", { placeholder: d.reviews_title })}
                ${toggle("config.contact.reviews_share_btn", "زر «شاركنا رأيك» لإرسال الصور والفيديو عبر واتساب")}
                ${text("config.contact.reviews_share_text", "نص زر المشاركة", { placeholder: d.reviews_share_text })}
                ${text("config.contact.reviews_share_msg", "الرسالة الجاهزة التي يبدأ بها العميل", { placeholder: d.reviews_share_msg })}
                <ul class="items">${reviews}</ul>
                ${c.reviews.length < 12 ? `<button class="ab ab-ghost ab-sm" type="button" data-add-item="config.contact.reviews">+ إضافة رأي</button>` : ""}`,
                "يظهر القسم في المتجر بمجرد إضافة أول رأي، ويختفي إن لم يكن فيه شيء.");
    }

    // =====================================================
    // LIST TEMPLATES
    // =====================================================

    const NEW_ITEM = {
        "config.texts.hero_features": () => "",
        "config.texts.socials": () => ({ name: "", url: "" }),
        "config.order.delivery": () => ({ id: ATHR.uid("d-"), enabled: true, name: "", type: "home", price: 0, note: "", duration: "" }),
        "config.order.governorates": () => "",
        "config.order.payments": () => ({ id: ATHR.uid("p-"), enabled: false, name: "", type: "other", note: "", bank: { number: "", bank: "", holder: "", account: "", swift: "", iban: "" }, link: "" }),
        "config.sales.bundles": () => ({ id: ATHR.uid("b-"), enabled: true, a: "", b: "", pct: 10 }),
        "config.sales.trust_custom": () => "",
        "config.sales.volume.tiers": () => ({ min: 4, pct: 15 }),
        "config.contact.reviews": () => ({ id: ATHR.uid("r-"), name: "", text: "", stars: 5, images: [], video: "" })
    };

    // =====================================================
    // UPLOADS
    // =====================================================

    const IMAGE_SIZES = { product: 1600, ad: 1800, hero: 1920, logo: 512, review: 1200, category: 1100 };

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve({ img, url });
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تعذر قراءة الصورة. جرّب صورة JPG أو PNG.")); };
            img.src = url;
        });
    }

    async function prepareImage(file, kind) {
        const max = IMAGE_SIZES[kind] || 1600;
        const keepPng = kind === "logo" && file.type === "image/png";
        const { img, url } = await loadImage(file);
        const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * ratio);
        const h = Math.round(img.naturalHeight * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!keepPng) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const type = keepPng ? "image/png" : "image/jpeg";
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.86));
        if (!blob) throw new Error("تعذر تجهيز الصورة.");
        return { blob, ext: keepPng ? "png" : "jpg", type };
    }

    async function compressVideo(file, maxSide, onProgress) {
        if (!maxSide || !window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return file;
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        try {
            await new Promise((resolve, reject) => {
                video.onloadedmetadata = resolve;
                video.onerror = () => reject(new Error("meta"));
                setTimeout(() => reject(new Error("meta timeout")), 15000);
            });
            const short = Math.min(video.videoWidth, video.videoHeight);
            if (!short || short <= maxSide * 1.05) return file;
            const scale = maxSide / short;
            const w = Math.round(video.videoWidth * scale / 2) * 2;
            const h = Math.round(video.videoHeight * scale / 2) * 2;
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
            if (!mime) return file;
            const bitrate = maxSide >= 1080 ? 4500000 : maxSide >= 720 ? 2500000 : 1200000;
            const stream = canvas.captureStream(30);
            const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
            const chunks = [];
            recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
            const done = new Promise((resolve) => { recorder.onstop = resolve; });
            let running = true;
            const draw = () => {
                if (!running) return;
                ctx.drawImage(video, 0, 0, w, h);
                if (video.duration) onProgress(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
                requestAnimationFrame(draw);
            };
            recorder.start(1000);
            await video.play();
            draw();
            await new Promise((resolve) => { video.onended = resolve; });
            running = false;
            recorder.stop();
            await done;
            const blob = new Blob(chunks, { type: mime.split(";")[0] });
            return blob.size && blob.size < file.size ? blob : file;
        } catch (error) {
            console.warn("Video compression skipped:", error);
            return file;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function uploadBlob(blob, ext, type) {
        const path = `${Date.now()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}.${ext}`;
        const { error } = await sb.storage.from(BUCKET).upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: type });
        if (error) throw error;
        return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    async function uploadImage(file, kind) {
        const { blob, ext, type } = await prepareImage(file, kind);
        return uploadBlob(blob, ext, type);
    }

    async function uploadVideo(file, qualityPref, label) {
        const maxSide = Number(storage.get(qualityPref) ?? (qualityPref === "adVideoQuality" ? 480 : 720)) || 0;
        let blob = file;
        if (maxSide) {
            blob = await compressVideo(file, maxSide, (pct) => busyMessage(`جاري ضغط ${label} ${pct}%`));
        }
        if (blob.size > 50 * 1024 * 1024) throw new Error("الفيديو أكبر من 50 ميغابايت. اختر جودة أخف أو فيديو أقصر.");
        busyMessage(`جاري رفع ${label}...`);
        const type = blob.type || "video/mp4";
        const ext = type.includes("webm") ? "webm" : type.includes("quicktime") ? "mov" : "mp4";
        return uploadBlob(blob, ext, type);
    }

    function busyMessage(msg) {
        let el = $("#admBusy");
        if (!el) {
            el = document.createElement("div");
            el.id = "admBusy";
            el.className = "adm-busy";
            el.setAttribute("role", "status");
            root().appendChild(el);
        }
        el.textContent = msg;
        el.hidden = !msg;
    }

    async function withBusy(msg, fn) {
        busyMessage(msg);
        try {
            await fn();
        } catch (error) {
            console.error(error);
            toast(error && error.message && /[؀-ۿ]/.test(error.message) ? error.message : "تعذر الرفع. تأكد من الإنترنت وحاول مرة أخرى.");
        } finally {
            busyMessage("");
        }
    }

    function afterChange({ sheet = false } = {}) {
        saveDraft();
        if (sheet || A.editing) refreshSheet();
        renderTab({ keepScroll: true });
    }

    // =====================================================
    // EVENTS (panel + orders)
    // =====================================================

    function onInput(e) {
        const t = e.target;
        if (t.id === "productFilter") {
            A.productFilter = t.value;
            const pos = t.selectionStart;
            renderTab({ keepScroll: true });
            const input = $("#productFilter");
            input.focus();
            try { input.setSelectionRange(pos, pos); } catch { /* ignore */ }
            return;
        }
        if (t.id === "ordersSearch") {
            A.filter.q = t.value;
            renderOrdersList();
            return;
        }
        if (t.id === "custSearch") {
            A.custFilter.q = t.value;
            renderCustomers();
            return;
        }
        if (t.closest && t.closest("#couponForm")) {
            couponFormInput(t);
            return;
        }
        if (t.id === "restockText" && A.restockRun) {
            A.restockRun.text = t.value;
            storage.set(RESTOCK_KEY, t.value);
            const box = $("#restockPreview");
            if (box) box.innerHTML = waBubble(restockText(A.restockRun, A.restockRun.list[0]), A.restockRun);
            return;
        }
        if (t.id === "offerText" && A.offer) {
            A.offer.text = t.value;
            refreshOfferPreview();
            return;
        }
        if (t.id === "offerProdQ" && A.offer) {
            A.offer.q = t.value;
            const list = $("#opList");
            if (list) list.innerHTML = offerProductItems(A.offer);
            return;
        }
        if (t.dataset.priceBase || t.dataset.pricePct) {
            priceFromSheet(t.dataset.priceBase || t.dataset.pricePct);
            return;
        }
        if (t.dataset.bind && t.type !== "checkbox" && t.tagName !== "SELECT") {
            bindValue(t);
            if (t.type === "color") {
                const code = t.parentElement.querySelector("code");
                if (code) code.textContent = t.value;
            }
            if (/\.name$/.test(t.dataset.bind) && A.editing) {
                const head = $("#admSheet .adm-sheet-head h2");
                if (head) head.textContent = t.value || "منتج جديد";
            }
        }
    }

    function bindValue(t) {
        let value;
        if (t.dataset.type === "bool") value = t.checked;
        else if (t.dataset.type === "number") value = t.value === "" ? null : Number(ATHR.digits(t.value));
        else value = t.value;
        setPath(t.dataset.bind, value);
        saveDraft();
        if (t.dataset.bind.startsWith("config.gift.")) refreshGiftPreview();
    }

    async function onChange(e) {
        const t = e.target;
        if (t.dataset.pixel) {
            setPixel(t);
            return;
        }
        if (t.closest && t.closest("#couponForm")) {
            couponFormInput(t);
            return;
        }
        if (t.id === "offerSkip" && A.offer) {
            A.offer.skipRecent = t.checked;
            saveOfferPref(A.offer);
            renderOffer({ keepScroll: true });
            return;
        }

        if (t.dataset.pref) {
            storage.set(t.dataset.pref, t.value);
            return;
        }
        if (t.dataset.priceBase || t.dataset.pricePct) {
            priceFromSheet(t.dataset.priceBase || t.dataset.pricePct);
            renderTab({ keepScroll: true });
            return;
        }
        if (t.dataset.bind) {
            bindValue(t);
            if (t.dataset.rerender !== undefined) {
                if (A.editing) refreshSheet();
                renderTab({ keepScroll: true });
            }
            return;
        }
        if (t.dataset.countryPath) {
            const current = getPath(t.dataset.countryPath);
            const list = new Set(Array.isArray(current) && current.length ? current : ATHR_COUNTRIES.map((c) => c.code));
            if (t.checked) list.add(t.value);
            else list.delete(t.value);
            setPath(t.dataset.countryPath, ATHR_COUNTRIES.map((c) => c.code).filter((code) => list.has(code)));
            saveDraft();
            return;
        }
        if (t.dataset.soldOut) {
            const p = A.draft.products.find((x) => x.id === t.dataset.soldOut);
            if (p) p.is_available = !t.checked;
            saveDraft();
            return;
        }
        if (t.type === "file" && t.files && t.files.length) {
            const files = Array.from(t.files);
            t.value = "";
            await handleFiles(t, files);
            return;
        }
        if (t.dataset.orderField) {
            updateOrderField(t.dataset.orderId, t.dataset.orderField, t.value);
            return;
        }
        if (t.id === "payFilter") {
            A.filter.pay = t.value;
            renderOrdersList();
        }
    }

    async function handleFiles(input, files) {
        const d = input.dataset;

        if (d.upload) {
            const kind = d.kind || "product";
            const isVideo = /video/i.test(kind);
            await withBusy(isVideo ? "جاري تجهيز الفيديو..." : "جاري رفع الصورة...", async () => {
                const url = isVideo
                    ? await uploadVideo(files[0], kind === "adVideo" ? "adVideoQuality" : "productVideoQuality", "الفيديو")
                    : await uploadImage(files[0], kind);
                setPath(d.upload, url);
                afterChange();
                toast(isVideo ? "رُفع الفيديو" : "رُفعت الصورة");
            });
            return;
        }

        if (d.mediaAdd) {
            const p = A.draft.products.find((x) => x.id === d.mediaAdd);
            if (!p) return;
            const room = 5 - p.media.filter((m) => m.type === "image").length;
            const pick = files.slice(0, Math.max(0, room));
            if (files.length > room) toast(`يمكن إضافة ${room} صور فقط (الحد 5).`);
            await withBusy("جاري رفع الصور...", async () => {
                for (let i = 0; i < pick.length; i++) {
                    busyMessage(`جاري رفع الصور ${i + 1} من ${pick.length}...`);
                    const url = await uploadImage(pick[i], "product");
                    const video = p.media.filter((m) => m.type === "video");
                    p.media = [...p.media.filter((m) => m.type === "image"), { type: "image", url }, ...video];
                }
                afterChange({ sheet: true });
            });
            return;
        }

        if (d.videoFor) {
            const p = A.draft.products.find((x) => x.id === d.videoFor);
            if (!p) return;
            await withBusy("جاري تجهيز الفيديو...", async () => {
                const url = await uploadVideo(files[0], "productVideoQuality", "الفيديو");
                p.media = [...p.media.filter((m) => m.type === "image"), { type: "video", url }];
                afterChange({ sheet: true });
                toast("رُفع الفيديو");
            });
            return;
        }

        if (d.reviewImg !== undefined) {
            const r = cfg().contact.reviews[Number(d.reviewImg)];
            if (!r) return;
            r.images = r.images || [];
            const pick = files.slice(0, 3 - r.images.length);
            await withBusy("جاري رفع الصور...", async () => {
                for (const file of pick) r.images.push(await uploadImage(file, "review"));
                afterChange();
            });
        }
    }

    function moveItem(arr, i, dir) {
        const j = i + dir;
        if (j < 0 || j >= arr.length) return;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    async function onClick(e) {
        const t = e.target.closest("button, [data-a], [data-tab]");
        if (!t) return;
        const d = t.dataset;

        if (d.tab) {
            A.tab = d.tab;
            A.rowMenu = null;
            renderPanel();
            return;
        }
        if (d.gforReset && ATHR_DEFAULTS.gift.genders[d.gforReset]) {
            cfg().gift.genders[d.gforReset].colors = { ...ATHR_DEFAULTS.gift.genders[d.gforReset].colors };
            afterChange();
            return;
        }
        if (d.giftTheme && GIFT_THEMES[d.giftTheme]) {
            cfg().gift.colors = { ...GIFT_THEMES[d.giftTheme] };
            afterChange();
            return;
        }
        if (d.giftWaReset !== undefined) {
            cfg().gift.wa = ATHR_DEFAULTS.gift.wa;
            afterChange();
            return;
        }
        if (d.priceQuick !== undefined && d.id) {
            priceFromSheet(d.id, Number(d.priceQuick));
            refreshSheet();
            return;
        }
        if (d.rowMenu) {
            A.rowMenu = A.rowMenu === d.rowMenu ? null : d.rowMenu;
            renderTab({ keepScroll: true });
            return;
        }

        if (d.a && /^(offer|cust)-/.test(d.a) && await customersClick(d)) return;
        if (d.custKind) {
            A.custFilter.kind = d.custKind;
            $$("[data-cust-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.custKind === d.custKind)));
            renderCustomers();
            return;
        }
        if (d.custMk) { toggleMarketing(d.custMk); return; }
        if (d.custWa) {
            const c = A.customers.find((x) => x.phone === d.custWa);
            if (c) window.open(ATHR.waLink(custWa(c), ""), "_blank", "noopener");
            return;
        }
        if ((d.custOffer || d.offerProduct || d.offerTpl !== undefined || d.offerEnds !== undefined || d.offerAud) && offerOptionClick(d)) return;
        if ((d.a && /^(coupon|restock|promo)-/.test(d.a)) || d.cpToggle || d.cpEdit || d.cpLink || d.cpMsg || d.restockSend || d.restockClear || d.restockAvail || d.favOffer) {
            await promoClick(d);
            return;
        }

        switch (d.a) {
            case "close": close(); return;
            case "retry": open(A.view); return;
            case "close-sheet": closeSheet(); return;
            case "preview": preview(); return;
            case "tpl-apply": applyTemplate(d.id); return;
            case "tpl-undo": undoTemplate(); return;
            case "tpl-preview": previewTemplate(d.id); return;
            case "gift-preview": preview(`${ATHR.base()}gift/?c=${ATHR.giftCode({ ...GIFT_SAMPLE, gender: d.gender || "" })}`); return;
            case "account": openAccount(); return;
            case "discard": discard(); return;
            case "publish": publish(); return;
            case "add-product": addProduct(); return;
            case "unified-price": unifiedPrice(); return;
            case "add-category":
                A.draft.categories.push({ id: crypto.randomUUID(), name: "", slug: "", description: "", image_url: "" });
                afterChange();
                setTimeout(() => { const inputs = $$('#admBody .lst input[data-bind^="categories."]'); inputs[inputs.length - 1]?.focus(); }, 30);
                return;
            case "add-color":
                cfg().colors.push({ id: ATHR.uid("c-"), name: "", hex: "#cccccc" });
                afterChange();
                return;
            case "reset-colors":
                ["primary", "hero", "bg", "text"].forEach((k) => { cfg().theme[k] = ATHR_DEFAULTS.theme[k]; });
                afterChange();
                return;
            case "signout":
                await sb.auth.signOut();
                ATHR.store.setAdmin(false);
                A.server = null;
                A.draft = null;
                A.orders = [];
                A.ordersLoaded = false;
                close();
                toast("تم تسجيل الخروج");
                return;
            case "orders-close": close(); return;
            case "orders-paste": openPaste(); return;
            case "orders-manual": openOrderForm(null); return;
            case "orders-sheet-close": closeOrderSheet(); return;
            case "paste-import": importPasted(); return;
            case "open-panel": location.hash = "#admin"; open("admin"); return;
            case "open-orders": A.book = "orders"; location.hash = "#orders"; open("orders"); return;
            case "open-customers": A.book = "customers"; location.hash = "#orders"; open("orders"); return;
            default: break;
        }

        if (d.copyText) { ATHR.store.copyText(d.copyText, "نُسخ الرابط"); return; }
        if (d.book) { A.book = d.book; renderBook(); return; }
        if (d.days) { A.statsDays = Number(d.days); renderBook(); return; }
        if (d.reviewSet) { setReviewStatus(d.reviewSet, d.value); return; }
        if (d.reviewDel) { deleteReview(d.reviewDel); return; }
        if (d.orderReview) { const o = A.orders.find((x) => x.id === d.orderReview); if (o) window.open(customerWa(o, reviewRequestText(o)), "_blank", "noopener"); return; }
        if (d.edit) { editProduct(d.edit); return; }
        if (d.toggleVisible) {
            const p = A.draft.products.find((x) => x.id === d.toggleVisible);
            if (p) p.is_visible = !p.is_visible;
            afterChange();
            return;
        }
        if (d.copyProduct) {
            const i = A.draft.products.findIndex((x) => x.id === d.copyProduct);
            if (i < 0) return;
            const copy = ATHR.clone(A.draft.products[i]);
            copy.id = crypto.randomUUID();
            copy.slug = "";
            copy.name = `${copy.name} (نسخة)`;
            A.draft.products.splice(i + 1, 0, copy);
            afterChange();
            toast("نُسخ المنتج");
            return;
        }
        if (d.delProduct) {
            const p = A.draft.products.find((x) => x.id === d.delProduct);
            if (p && confirm(`حذف «${p.name || "المنتج"}»؟ يُحذف من المتجر عند النشر.`)) {
                A.draft.products = A.draft.products.filter((x) => x.id !== d.delProduct);
                cfg().sales.bundles.forEach((b) => {
                    if (b.a === d.delProduct) b.a = "";
                    if (b.b === d.delProduct) b.b = "";
                });
                afterChange();
            }
            return;
        }
        if (d.move) {
            const arr = getPath(d.move);
            if (Array.isArray(arr)) moveItem(arr, Number(d.i), Number(d.dir));
            afterChange();
            return;
        }
        if (d.del) {
            const arr = getPath(d.del);
            if (!Array.isArray(arr)) return;
            const item = arr[Number(d.i)];
            const label = d.del === "categories" ? `القسم «${item?.name || ""}»` : "هذا العنصر";
            if (!confirm(`حذف ${label}؟`)) return;
            arr.splice(Number(d.i), 1);
            if (d.del === "categories" && item) {
                A.draft.products.forEach((p) => { if (p.category_id === item.id) p.category_id = null; });
            }
            if (d.del === "config.colors" && item) {
                A.draft.products.forEach((p) => { if (p.color_id === item.id) p.color_id = ""; });
            }
            afterChange();
            return;
        }
        if (d.addItem) {
            const arr = getPath(d.addItem);
            const make = NEW_ITEM[d.addItem];
            if (Array.isArray(arr) && make) arr.push(make());
            afterChange();
            return;
        }
        if (d.clear) {
            setPath(d.clear, "");
            afterChange();
            return;
        }
        if (d.resetLogo !== undefined) {
            cfg().logo_url = ATHR_DEFAULTS.logo_url;
            afterChange();
            return;
        }
        if (d.mediaMove) {
            const p = A.draft.products.find((x) => x.id === d.mediaMove);
            if (!p) return;
            const images = p.media.filter((m) => m.type === "image");
            moveItem(images, Number(d.i), Number(d.dir));
            p.media = [...images, ...p.media.filter((m) => m.type === "video")];
            afterChange({ sheet: true });
            return;
        }
        if (d.mediaDel) {
            const p = A.draft.products.find((x) => x.id === d.mediaDel);
            if (!p) return;
            const images = p.media.filter((m) => m.type === "image");
            images.splice(Number(d.i), 1);
            p.media = [...images, ...p.media.filter((m) => m.type === "video")];
            afterChange({ sheet: true });
            return;
        }
        if (d.videoDel) {
            const p = A.draft.products.find((x) => x.id === d.videoDel);
            if (p) p.media = p.media.filter((m) => m.type !== "video");
            afterChange({ sheet: true });
            return;
        }
        if (d.reviewImgDel !== undefined) {
            const r = cfg().contact.reviews[Number(d.reviewImgDel)];
            if (r && r.images) r.images.splice(Number(d.n), 1);
            afterChange();
            return;
        }

        // ---------- orders ----------
        if (d.status) { A.filter.status = d.status; renderOrdersList(); return; }
        if (d.orderEdit) { openOrderForm(A.orders.find((o) => o.id === d.orderEdit)); return; }
        if (d.orderWa) { const o = A.orders.find((x) => x.id === d.orderWa); if (o) window.open(customerWa(o, ""), "_blank", "noopener"); return; }
        if (d.orderGiftCard) {
            const o = A.orders.find((x) => x.id === d.orderGiftCard);
            if (o && o.gift_phone) {
                const link = siteLink(ATHR.giftCardPath(o));
                const from = String(o.customer_name || "").trim().split(/\s+/)[0];
                const text = ATHR.withLang("ar", () => ATHR.giftWhatsApp({ to: o.gift_name, from, msg: o.gift_message, occasion: o.gift_occasion, link, store: ATHR.storeName(cfg()), config: cfg() }));
                window.open(ATHR.waLink(ATHR.customerWhatsapp(o.gift_phone, o.country || "OM"), text), "_blank", "noopener");
            }
            return;
        }
        if (d.orderWaGift) { const o = A.orders.find((x) => x.id === d.orderWaGift); if (o && o.gift_phone) window.open(ATHR.waLink(ATHR.customerWhatsapp(o.gift_phone, o.country || "OM"), ""), "_blank", "noopener"); return; }
        if (d.orderRemind) { const o = A.orders.find((x) => x.id === d.orderRemind); if (o) window.open(customerWa(o, reminderText(o)), "_blank", "noopener"); return; }
        if (d.orderCopy) { const o = A.orders.find((x) => x.id === d.orderCopy); if (o) ATHR.store.copyText(orderText(o), "نُسخ الطلب"); return; }
        if (d.orderHide) { const o = A.orders.find((x) => x.id === d.orderHide); if (o) updateOrderField(o.id, "hidden", !o.hidden); return; }
        if (d.orderDelete) { deleteOrder(d.orderDelete); return; }
    }

    function onSubmit(e) {
        e.preventDefault();
        if (e.target.id === "loginForm") doLogin();
        if (e.target.id === "passwordForm") changePassword(e.target);
        if (e.target.id === "orderForm") saveOrderForm(e.target);
        if (e.target.id === "couponForm") saveCoupon(e.target);
    }

    // =====================================================
    // ACTIONS
    // =====================================================

    function unifiedPrice() {
        const value = Number(ATHR.digits($("#unifiedPrice").value));
        if (!(value > 0)) {
            toast("اكتب سعراً أكبر من صفر.");
            return;
        }
        if (!confirm(`تطبيق السعر ${money(value)} على كل المنتجات (${A.draft.products.length})؟ المنتجات التي عليها خصم تبقى بنفس نسبة الخصم.`)) return;
        A.draft.products.forEach((p) => applyDiscount(p, value, pctOf(p)));
        afterChange();
        toast("طُبّق السعر على كل المنتجات");
    }

    function discard() {
        if (!confirm("تجاهل كل التعديلات غير المنشورة والرجوع لآخر نسخة منشورة؟")) return;
        A.draft = ATHR.clone(A.server);
        A.errors = [];
        A.prevTheme = null;
        storage.del(DRAFT_KEY);
        renderTab();
        renderStatus();
        toast("رجعت لآخر نسخة منشورة");
    }

    function preview(path, config) {
        const data = {
            config: config || A.draft.config,
            categories: A.draft.categories.map((c, i) => ({ ...c, sort_order: i + 1 })),
            products: A.draft.products.map((p, i) => ({ ...p, sort_order: i + 1 }))
        };
        const el = $("#adm");
        el.hidden = true;
        el.innerHTML = "";
        document.body.classList.remove("locked");
        A.view = null;
        ATHR.store.preview(data, path);
    }

    function openAccount() {
        openSheet(`
            <div class="adm-sheet-head"><h2>الحساب</h2><button class="adm-icon" type="button" data-a="close-sheet" aria-label="إغلاق">×</button></div>
            <form class="af-stack" id="passwordForm" novalidate>
                <h3>تغيير كلمة المرور</h3>
                <label class="af"><span>كلمة المرور الجديدة</span><input class="ai" id="newPassword" type="password" autocomplete="new-password" dir="ltr"><small>8 أحرف على الأقل، والأفضل خليط من حروف وأرقام.</small></label>
                <label class="af"><span>تأكيد كلمة المرور</span><input class="ai" id="confirmPassword" type="password" autocomplete="new-password" dir="ltr"></label>
                <p class="adm-error" id="passwordMsg" role="alert"></p>
                <button class="ab ab-primary" type="submit" id="savePassword">حفظ كلمة المرور</button>
            </form>
            <hr>
            <div class="af-stack">
                <button class="ab ab-ghost" type="button" data-a="open-orders">دفتر الطلبيات</button>
                <button class="ab ab-ghost danger" type="button" data-a="signout">تسجيل الخروج</button>
            </div>`);
    }

    async function changePassword(form) {
        const pass = $("#newPassword", form).value;
        const confirmPass = $("#confirmPassword", form).value;
        const msg = $("#passwordMsg", form);
        msg.classList.remove("ok");
        if (pass.length < 8) { msg.textContent = "كلمة المرور يجب أن تكون 8 أحرف على الأقل."; return; }
        if (pass !== confirmPass) { msg.textContent = "كلمتا المرور غير متطابقتين."; return; }
        const btn = $("#savePassword", form);
        btn.disabled = true;
        btn.textContent = "جاري الحفظ...";
        const { error } = await sb.auth.updateUser({ password: pass });
        btn.disabled = false;
        btn.textContent = "حفظ كلمة المرور";
        if (error) {
            msg.textContent = /different/i.test(error.message) ? "اختر كلمة مرور مختلفة عن الحالية." : "تعذر تغيير كلمة المرور. سجّل الخروج وادخل مرة أخرى ثم حاول.";
            return;
        }
        msg.textContent = "تم تغيير كلمة المرور ✅";
        msg.classList.add("ok");
        form.reset();
    }

    // =====================================================
    // VALIDATION & PUBLISH
    // =====================================================

    function validate() {
        const c = cfg();
        const errors = [];
        const add = (tab, msg) => errors.push({ tab, msg });
        const num = (v) => typeof v === "number" && Number.isFinite(v);

        const tr = c.tracking || {};
        if (String(tr.meta_pixel || "").trim() && !ATHR.metaPixelId(tr.meta_pixel)) add("ads", "رقم Meta Pixel غير صحيح: أرقام فقط (15–16 رقماً تقريباً).");
        if (String(tr.tiktok_pixel || "").trim() && !ATHR.tiktokPixelId(tr.tiktok_pixel)) add("ads", "رقم TikTok Pixel غير صحيح: حروف إنجليزية وأرقام فقط.");
        if (!/[\p{L}]/u.test(String(c.name || ""))) add("look", "اكتب اسم المتجر (يظهر في جوجل ورسائل واتساب). لإخفائه من أعلى المتجر أوقف «إظهار اسم المتجر بجانب الشعار».");
        if (!ATHR.isValidWhatsapp(c.order.whatsapp)) add("order", "رقم واتساب غير صحيح.");
        if (!String(c.order.currency || "").trim()) add("order", "رمز العملة فارغ.");
        if (c.order.free_enabled && !(num(c.order.free_min) && c.order.free_min > 0)) add("order", "حد التوصيل المجاني غير صحيح.");
        if (!(Number.isInteger(c.order.max_qty) && c.order.max_qty >= 1 && c.order.max_qty <= 99)) add("order", "أقصى كمية يجب أن تكون بين 1 و99.");
        const deliveries = c.order.delivery.filter((d) => d.enabled);
        if (!deliveries.length) add("order", "لا توجد طريقة توصيل مفعّلة.");
        deliveries.forEach((d, i) => {
            if (!String(d.name || "").trim()) add("order", `طريقة توصيل مفعّلة بلا اسم (${i + 1}).`);
            if (!(num(d.price) && d.price >= 0)) add("order", `سعر توصيل غير صحيح في «${d.name || i + 1}».`);
        });
        deliveries.forEach((d) => {
            if (d.pricing === "per_kg" && !(num(d.price) && d.price > 0)) add("order", `سعر الكيلو غير صحيح في «${d.name || "طريقة توصيل"}».`);
            if (Array.isArray(d.countries) && !d.countries.length) add("order", `«${d.name || "طريقة توصيل"}» غير متاحة لأي دولة.`);
        });
        ATHR.countries(c).filter((x) => x.enabled).forEach((x) => {
            if (!ATHR.deliveriesFor(c, x.code).length) add("order", `لا توجد طريقة توصيل مفعّلة لـ${x.name}.`);
            if (!ATHR.paymentsFor(c, x.code).length) add("order", `لا توجد طريقة دفع مفعّلة لـ${x.name}.`);
        });
        c.order.countries.forEach((x) => {
            if (x.code !== "OM" && x.enabled !== false && !(Number(x.rate) > 0) && !ATHR.liveRates(c)) add("order", `سعر صرف ${x.name} غير صحيح.`);
        });
        const payments = c.order.payments.filter((p) => p.enabled);
        if (!payments.length) add("order", "لا توجد طريقة دفع مفعّلة.");
        payments.forEach((p, i) => {
            if (!String(p.name || "").trim()) add("order", `طريقة دفع مفعّلة بلا اسم (${i + 1}).`);
            if (p.type === "online" && !ATHR.isUrl(p.link)) add("order", `الدفع الإلكتروني «${p.name || ""}» مفعّل بدون رابط صحيح.`);
        });

        if (c.ad.show) {
            if (c.ad.type === "image" && !c.ad.image_url) add("ad", "الإعلان مفعّل بدون صورة.");
            if (c.ad.type === "video" && !c.ad.video_url) add("ad", "الإعلان مفعّل بدون فيديو.");
            if (c.ad.type === "text" && !String(c.ad.title || c.ad.text || "").trim()) add("ad", "الإعلان مفعّل بدون نص.");
        }
        if (c.ad.link && !ATHR.isSafeLink(c.ad.link)) add("ad", "رابط الإعلان غير صحيح.");
        if (c.contact.share_url && !ATHR.isUrl(c.contact.share_url)) add("contact", "رابط المتجر للمشاركة غير صحيح.");
        A.draft.products.forEach((p) => {
            if (p.video_url && !ATHR.isUrl(p.video_url)) add("products", `رابط الفيديو الخارجي غير صحيح في «${p.name || "منتج"}».`);
        });
        c.texts.socials.forEach((s) => {
            if (!String(s.name || "").trim() || !ATHR.isUrl(s.url)) add("texts", `رابط تواصل اجتماعي غير صحيح${s.name ? ` («${s.name}»)` : ""}.`);
        });

        c.sales.bundles.filter((b) => b.enabled).forEach((b, i) => {
            if (!b.a || !b.b) add("sales", `الباقة ${i + 1} ينقصها منتج.`);
            else if (b.a === b.b) add("sales", `الباقة ${i + 1}: المنتجان متطابقان.`);
            else if (!A.draft.products.some((p) => p.id === b.a) || !A.draft.products.some((p) => p.id === b.b)) add("sales", `الباقة ${i + 1} فيها منتج محذوف.`);
            if (!(Number.isInteger(b.pct) && b.pct >= 1 && b.pct <= 90)) add("sales", `نسبة خصم الباقة ${i + 1} يجب أن تكون من 1 إلى 90.`);
        });

        if (c.sales.volume && c.sales.volume.enabled) {
            const tiers = c.sales.volume.tiers || [];
            if (!tiers.length) add("sales", "خصم الكمية مفعّل بدون شرائح.");
            tiers.forEach((t, i) => {
                if (!(Number.isInteger(t.min) && t.min >= 2 && t.min <= 50)) add("sales", `شريحة خصم الكمية ${i + 1}: عدد القطع يجب أن يكون من 2 إلى 50.`);
                if (!(Number.isInteger(t.pct) && t.pct >= 1 && t.pct <= 90)) add("sales", `شريحة خصم الكمية ${i + 1}: النسبة يجب أن تكون من 1 إلى 90.`);
            });
            const mins = tiers.map((t) => t.min);
            if (new Set(mins).size !== mins.length) add("sales", "شرائح خصم الكمية فيها عدد قطع مكرر.");
        }
        if (c.seo && c.seo.google_verification && !/^[A-Za-z0-9_-]{10,100}$/.test(String(c.seo.google_verification).trim().replace(/^.*content=["']?([^"'\s>]+).*$/i, "$1"))) {
            add("contact", "رمز التحقق من جوجل غير صحيح. انسخ الرمز فقط أو وسم meta كاملاً.");
        }
        c.contact.reviews.forEach((r, i) => {
            if (!String(r.text || "").trim()) add("contact", `الرأي ${i + 1} بدون نص.`);
        });
        A.draft.categories.forEach((cat, i) => { if (!String(cat.name || "").trim()) add("catalog", `القسم ${i + 1} بلا اسم.`); });
        c.colors.forEach((col, i) => { if (!String(col.name || "").trim()) add("catalog", `اللون ${i + 1} بلا اسم.`); });

        A.draft.products.forEach((p, i) => {
            const label = p.name ? `«${p.name}»` : `المنتج ${i + 1}`;
            if (!String(p.name || "").trim()) add("products", `${label} بلا اسم.`);
            if (!(num(p.price) && p.price > 0)) add("products", `${label}: السعر يجب أن يزيد على صفر.`);
            if (p.weight_g !== null && p.weight_g !== undefined && !(num(p.weight_g) && p.weight_g > 0 && p.weight_g <= 50000)) add("products", `${label}: الوزن غير صحيح.`);
            if (p.old_price !== null && p.old_price !== undefined && !(num(p.old_price) && p.old_price > (p.price || 0))) {
                add("products", `${label}: راجع الخصم، السعر الأصلي يجب أن يكون أكبر من السعر بعد الخصم.`);
            }
        });
        return errors;
    }

    // دمج ثلاثي: ما غيّرته أنت (المسودة مقابل الأصل) يُطبَّق فوق أحدث نسخة على الخادم
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    function mergeValue(base, mine, theirs) {
        if (same(mine, base)) return ATHR.clone(theirs === undefined ? mine : theirs);
        if (ATHR.isPlainObject(base) && ATHR.isPlainObject(mine) && ATHR.isPlainObject(theirs)) {
            const out = {};
            new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]).forEach((k) => {
                const v = mergeValue(base[k], mine[k], theirs[k]);
                if (v !== undefined) out[k] = v;
            });
            return out;
        }
        return ATHR.clone(mine);
    }
    function mergeRows(baseRows, mineRows, theirRows) {
        const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
        const b = byId(baseRows);
        const t = byId(theirRows);
        const mineIds = new Set(mineRows.map((r) => r.id));
        const merged = mineRows.map((row) => (b.has(row.id) && t.has(row.id) ? mergeValue(b.get(row.id), row, t.get(row.id)) : row));
        // ما أُضيف من مكان آخر يبقى
        theirRows.forEach((r) => { if (!b.has(r.id) && !mineIds.has(r.id)) merged.push(ATHR.clone(r)); });
        return merged;
    }
    function mergeDraft(base, mine, theirs) {
        return {
            config: ATHR.fullConfig(mergeValue(base.config, mine.config, theirs.config)),
            categories: mergeRows(base.categories, mine.categories, theirs.categories),
            products: mergeRows(base.products, mine.products, theirs.products)
        };
    }

    async function publish() {
        if (A.busy) return;
        A.errors = validate();
        if (A.errors.length) {
            A.tab = A.errors[0].tab;
            renderPanel();
            toast("لم يتم النشر، راجع الأخطاء");
            return;
        }
        A.busy = true;
        renderStatus();
        busyMessage("جاري النشر...");

        // إن تغيّر المتجر من مكان آخر بعد فتح اللوحة: ندمج تعديلاتك فقط فوق النسخة الأحدث
        try {
            const { data: fresh } = await sb.from("store_settings").select("updated_at").eq("id", 1).maybeSingle();
            const freshTime = Date.parse(fresh?.updated_at || "") || 0;
            if (A.serverUpdated && freshTime > A.serverUpdated) {
                const base = A.server;
                await loadServer();
                A.draft = mergeDraft(base, A.draft, A.server);
            }
        } catch (error) {
            console.warn("freshness check skipped", error);
        }

        const draft = A.draft;
        const server = A.server;

        try {
            // 1) الإعدادات
            draft.config.order.whatsapp = ATHR.normalizePhone(draft.config.order.whatsapp);
            const cfgRes = await sb.from("store_settings").update({ config: draft.config }).eq("id", 1).select("id");
            if (cfgRes.error) throw cfgRes.error;
            if (!cfgRes.data || !cfgRes.data.length) throw new Error("no-permission");

            // 2) الأقسام
            const catTaken = new Set([...draft.categories, ...server.categories].map((c) => c.slug).filter(Boolean));
            const catRows = draft.categories.map((c, i) => {
                let slug = c.slug;
                if (!slug) {
                    slug = ATHR.uniqueSlug(ATHR.slugify(c.name) || `cat-${c.id.slice(0, 8)}`, catTaken);
                    catTaken.add(slug);
                }
                return {
                    id: c.id,
                    name: c.name.trim(),
                    name_en: String(c.name_en || "").trim() || null,
                    description_en: String(c.description_en || "").trim() || null,
                    slug,
                    image_url: c.image_url || null,
                    description: String(c.description || "").trim() || null,
                    sort_order: i + 1
                };
            });
            draft.categories.forEach((c, i) => { c.slug = catRows[i].slug; });
            if (catRows.length) {
                const r = await sb.from("categories").upsert(catRows, { onConflict: "id" });
                if (r.error) throw r.error;
            }
            const goneCats = server.categories.filter((c) => !draft.categories.some((x) => x.id === c.id)).map((c) => c.id);
            if (goneCats.length) {
                const r = await sb.from("categories").delete().in("id", goneCats);
                if (r.error) throw r.error;
            }

            // 3) المنتجات
            busyMessage("جاري نشر المنتجات...");
            const slugTaken = new Set([...draft.products, ...server.products].map((p) => p.slug).filter(Boolean));
            draft.products.forEach((p) => {
                if (p.slug) return;
                p.slug = ATHR.uniqueSlug(ATHR.productSlugBase(p, draft.config) || `p-${p.id.slice(0, 8)}`, slugTaken);
                slugTaken.add(p.slug);
            });
            const prodRows = draft.products.map((p, i) => ({
                id: p.id,
                name: p.name.trim(),
                name_en: String(p.name_en || "").trim() || null,
                description_en: String(p.description_en || "").trim() || null,
                slug: p.slug,
                price: Number(p.price),
                old_price: p.old_price === null || p.old_price === undefined ? null : Number(p.old_price),
                category_id: p.category_id || null,
                image_url: p.image_url || null,
                is_available: p.is_available !== false,
                is_visible: p.is_visible !== false,
                is_best_seller: p.is_best_seller === true,
                is_new_arrival: p.is_new_arrival === true,
                description: p.description || null,
                color_id: p.color_id || null,
                video_url: p.video_url || null,
                weight_g: Number(p.weight_g) > 0 ? Math.round(Number(p.weight_g)) : null,
                sort_order: i + 1
            }));
            for (let i = 0; i < prodRows.length; i += 100) {
                const r = await sb.from("products").upsert(prodRows.slice(i, i + 100), { onConflict: "id" });
                if (r.error) throw r.error;
            }
            const goneProducts = server.products.filter((p) => !draft.products.some((x) => x.id === p.id)).map((p) => p.id);
            if (goneProducts.length) {
                const r = await sb.from("products").delete().in("id", goneProducts);
                if (r.error) throw r.error;
            }

            // 4) الصور والفيديو الإضافية
            busyMessage("جاري نشر الصور...");
            for (const p of draft.products) {
                const before = server.products.find((x) => x.id === p.id);
                if (before && JSON.stringify(before.media) === JSON.stringify(p.media)) continue;
                const del = await sb.from("product_media").delete().eq("product_id", p.id);
                if (del.error) throw del.error;
                if (p.media.length) {
                    const rows = p.media.map((m, i) => ({ product_id: p.id, media_type: m.type, media_url: m.url, sort_order: i }));
                    const ins = await sb.from("product_media").insert(rows);
                    if (ins.error) throw ins.error;
                }
            }

            A.server = ATHR.clone(draft);
            A.errors = [];
            storage.del(DRAFT_KEY);
            busyMessage("");
            toast("نُشرت التغييرات ✅ تظهر للزبائن فوراً، وفي جوجل خلال ساعة");
            ATHR.store.reload().catch(() => {});
        } catch (error) {
            console.error("Publish error:", error);
            busyMessage("");
            const msg = String(error && error.message || "");
            toast(msg === "no-permission" || /row-level security/i.test(msg)
                ? "ليس لديك صلاحية النشر. سجّل الدخول مرة أخرى."
                : "تعذر النشر. تأكد من الإنترنت وحاول مرة أخرى، تعديلاتك محفوظة على جوالك.");
        } finally {
            A.busy = false;
            renderTab({ keepScroll: true });
            renderStatus();
        }
    }

    // =====================================================
    // ORDERS BOOK
    // =====================================================

    async function openOrders() {
        root().innerHTML = `<div class="adm-loading">جاري تحميل الطلبات...</div>`;
        try {
            if (!A.server) await loadServer();
            if (!A.draft) restoreDraft();
            await loadOrders();
        } catch (error) {
            console.error(error);
            root().innerHTML = `<div class="adm-loading"><p>تعذر تحميل الطلبات. تأكد من الإنترنت.</p><button class="ab ab-primary" data-a="retry">إعادة المحاولة</button> <button class="ab ab-ghost" data-a="close">إغلاق</button></div>`;
            return;
        }
        renderBook();
    }

    async function loadOrders() {
        const { data, error } = await sb.from("orders").select("*").order("ordered_at", { ascending: false }).limit(1000);
        if (error) throw error;
        A.orders = data || [];
        A.ordersLoaded = true;
    }

    function renderBook() {
        const pending = A.reviews.filter((r) => r.status === "pending").length;
        const tabs = [["orders", "الطلبات"], ["customers", "العملاء"], ["reviews", `التقييمات${pending ? ` (${pending})` : ""}`], ["stats", "الأداء"]];
        root().innerHTML = `
            <div class="adm-shell">
                <header class="adm-top">
                    <h1>دفتر الطلبيات</h1>
                    <div class="adm-top-actions">
                        <button class="ab ab-light ab-sm" type="button" data-a="open-panel">لوحة التحكم</button>
                        <button class="adm-icon" type="button" data-a="close" aria-label="إغلاق">×</button>
                    </div>
                </header>
                <nav class="adm-tabs" role="tablist" aria-label="أقسام الدفتر">
                    ${tabs.map(([id, label]) => `<button type="button" role="tab" data-book="${id}" aria-selected="${A.book === id}">${label}</button>`).join("")}
                </nav>
                ${A.book === "orders" ? `<div class="ob-tools">
                    <input class="ai" type="search" id="ordersSearch" placeholder="ابحث بالاسم أو الرقم أو الولاية أو المحافظة أو العنوان أو المنتج" value="${esc(A.filter.q)}">
                    <div class="ob-filters">
                        <div class="seg" role="group" aria-label="الحالة">
                            ${[["all", "الكل"], ["new", "جديد"], ["delivered", "تم التسليم"], ["hidden", "مخفي"]].map(([v, l]) => `<button type="button" data-status="${v}" aria-pressed="${A.filter.status === v}">${l}</button>`).join("")}
                        </div>
                        <select class="ai sm" id="payFilter" aria-label="طريقة الدفع">
                            <option value="all"${A.filter.pay === "all" ? " selected" : ""}>كل طرق الدفع</option>
                            <option value="bank"${A.filter.pay === "bank" ? " selected" : ""}>تحويل بنكي</option>
                            <option value="cod"${A.filter.pay === "cod" ? " selected" : ""}>عند الاستلام</option>
                        </select>
                    </div>
                </div>` : ""}
                ${A.book === "customers" ? `<div class="ob-tools">
                    <input class="ai" type="search" id="custSearch" placeholder="ابحث باسم العميل أو رقمه" value="${esc(A.custFilter.q)}">
                    <div class="seg" role="group" aria-label="تصفية العملاء">
                        ${[["all", "الكل"], ["marketing", "يقبلون العروض"], ["vip", "💎 المميزون"], ["repeat", "رجعوا مرة ثانية"], ["away", "غائبون +60 يوم"], ["new", "🆕 الجدد"]].map(([v, l]) => `<button type="button" data-cust-kind="${v}" aria-pressed="${A.custFilter.kind === v}">${l}</button>`).join("")}
                    </div>
                </div>` : ""}
                <main class="adm-body" id="ordersBody"></main>
                ${A.book === "orders" ? `<footer class="adm-foot ob-foot">
                    <button class="ab ab-ghost" type="button" data-a="orders-paste">لصق رسالة طلب من واتساب</button>
                    <button class="ab ab-primary" type="button" data-a="orders-manual">+ طلب يدوي</button>
                </footer>` : ""}
            </div>
            <div class="adm-sheet" id="admSheet" hidden></div>`;
        if (A.book === "reviews") renderReviews();
        else if (A.book === "stats") renderStats();
        else if (A.book === "customers") renderCustomers();
        else renderOrdersList();
        if (!A.reviewsLoaded) loadReviews().then(() => { if (A.view === "orders") { const tab = $('[data-book="reviews"]'); const n = A.reviews.filter((r) => r.status === "pending").length; if (tab) tab.textContent = `التقييمات${n ? ` (${n})` : ""}`; } }).catch(() => {});
    }

    // =====================================================
    // CUSTOMERS: قائمة العملاء + استوديو العروض
    // رسالة جذابة جاهزة، ورابط خاص لكل عميل باسمه مع عدّاد تنازلي لانتهاء العرض
    // =====================================================

    const OFFER_PREF = "athr_offer_pref";
    const OPT_OUT_LINE = "(لإيقاف العروض أرسل: إيقاف)";
    // عروض المنتج: السطر الذي فيه معلومة غير موجودة (الخصم أو المدة) يُحذف تلقائياً
    const PRODUCT_OFFERS = [
        ["🔥 خصم حصري", "هلا {name} 👋\n\n🔥 *عرض خاص لك من {store}*\n\n🛍️ *{product}*\n❌ بدل {old}\n✅ صار بـ *{price}* فقط\n🎉 توفّر {save} (خصم {pct}%)\n\n⏳ العرض ينتهي {ends}\n\n👇 اطلبه الآن من رابطك الخاص:\n{link}"],
        ["⏰ آخر فرصة", "⏰ *آخر فرصة يا {name}!*\n\nخصم {pct}% على *{product}* ينتهي {ends} 😱\n💰 بـ *{price}* بدل {old}\n\nالكمية محدودة، احجز قطعتك قبل لا تخلص 👇\n{link}"],
        ["🎁 هدية مثالية", "🎁 تدوّر هدية تفرّح فيها أحد غالي يا {name}؟\n\n*{product}* هدية أنيقة ومختلفة ✨\n💰 بـ *{price}* فقط\n🎉 خصم {pct}% بدل {old}\n\nنوصلها باسمك مع بطاقة إهداء رقمية 💌\n👇 اطلبها من هنا:\n{link}"],
        ["💎 لعملائنا المميزين", "{name}، أنت من عملائنا المميزين 💎\n\nجهّزنا لك عرضاً خاصاً على *{product}*\n✨ *{price}* بدل {old}\n🎉 خصم {pct}%\n⏳ ينتهي {ends}\n\nرابطك الخاص 👇\n{link}"],
        ["✨ وصل جديد", "هلا {name} 👋\n\n✨ وصل جديد في {store}:\n🛍️ *{product}*\n💰 السعر: *{price}*\n🎉 وبخصم {pct}% لفترة محدودة\n\nشوفه قبل لا يخلص 🔥\n{link}"]
    ];
    // رسائل عامة بدون منتج محدد
    const OFFER_TEMPLATES = [
        ["🎉 خصم عام", "هلا {name} 👋\n\n🎉 *عرض خاص من {store}*\n✨ خصم 10% على كل الكاسات لمدة 3 أيام فقط\n\n🛍️ تسوّق الآن 👇\n{link}"],
        ["✨ تصاميم جديدة", "هلا {name} 👋\n\n🔥 *وصلت تصاميم جديدة في {store}*\nأندية وجامعات وشخصيات… شوفها قبل لا تخلص 👇\n{link}"],
        ["💙 اشتقنا لك", "{name}، اشتقنا لك 💙\n\nمرّ وقت من آخر طلب لك في {store}، وجهّزنا تصاميم جديدة بتعجبك ✨\n\n👇 شوفها من هنا:\n{link}"],
        ["🌙 عرض العيد", "عيدكم مبارك يا {name} 🌙✨\n\nبمناسبة العيد: 🎁 هدية مع كل طلب من {store}\n\nاطلب الآن 👇\n{link}"],
        ["🤍 شكراً لك", "شكراً لك يا {name} على ثقتك في {store} 🤍\n\nإذا عجبك طلبك شاركنا رأيك، ونسعد نخدمك دائماً 👇\n{link}"]
    ];
    const OFFER_ENDS = [[0, "بدون مدة"], [24, "24 ساعة"], [72, "3 أيام"], [168, "أسبوع"]];
    const OFFER_AUDIENCE = [["marketing", "الكل"], ["vip", "💎 المميزون"], ["repeat", "🔁 رجعوا للشراء"], ["away", "💤 الغائبون"], ["new", "🆕 الجدد"]];
    const VIP_SPENT = 15;

    async function loadCustomers() {
        const { data, error } = await sb.from("customers").select("*").order("last_order_at", { ascending: false }).limit(5000);
        if (error) throw error;
        A.customers = data || [];
        A.customersLoaded = true;
    }

    function custWa(c) {
        return ATHR.customerWhatsapp(c.phone, "XX");
    }

    const daysSince = (date) => (date ? (Date.now() - new Date(date).getTime()) / 864e5 : Infinity);
    const isVip = (c) => c.orders_count >= 3 || Number(c.total_spent) >= VIP_SPENT;
    const isAway = (c) => daysSince(c.last_order_at) > 60;
    const isNew = (c) => c.orders_count <= 1 && daysSince(c.first_order_at || c.last_order_at) <= 14;
    const recentOffer = (c) => daysSince(c.last_offer_at) < 3;
    const KIND_TEST = { marketing: (c) => c.marketing, vip: isVip, repeat: (c) => c.orders_count > 1, away: isAway, new: isNew };

    // شارات العميل: مميز / عاد للشراء / جديد / غائب
    function custTags(c) {
        const tags = [];
        if (isVip(c)) tags.push(["vip", "💎 مميز"]);
        else if (c.orders_count > 1) tags.push(["back", "🔁 عاد للشراء"]);
        else if (isNew(c)) tags.push(["new", "🆕 جديد"]);
        if (isAway(c)) tags.push(["away", "💤 غائب"]);
        return tags;
    }

    function filteredCustomers() {
        const q = (A.custFilter.q || "").trim().toLowerCase();
        const test = KIND_TEST[A.custFilter.kind];
        return A.customers.filter((c) => {
            if (test && !test(c)) return false;
            if (!q) return true;
            return `${c.name || ""} ${c.phone}`.toLowerCase().includes(q);
        });
    }

    function sinceText(date) {
        if (!date) return "";
        const days = Math.floor((Date.now() - new Date(date).getTime()) / 864e5);
        return days <= 0 ? "اليوم" : days === 1 ? "أمس" : days < 30 ? `منذ ${days} يوم` : `منذ ${Math.round(days / 30)} شهر`;
    }

    // نتائج العروض آخر 30 يوم: من وصله عرض، من فتح الرابط، الطلبات والمبيعات
    async function loadOfferVisits() {
        A.offerVisits = 0;
        try {
            const since = new Date(Date.now() - 30 * 864e5 + 4 * 36e5).toISOString().slice(0, 10);
            const { data } = await sb.from("stats_daily").select("n").eq("key", "visit:offer").gte("day", since);
            A.offerVisits = (data || []).reduce((sum, r) => sum + Number(r.n || 0), 0);
        } catch {
            /* اختياري */
        }
        const el = $("#offerVisits");
        if (el) el.textContent = A.offerVisits;
    }

    function offerResults() {
        const since = Date.now() - 30 * 864e5;
        const orders = A.orders.filter((o) => o.channel === "offer" && !o.hidden && new Date(o.ordered_at || o.created_at).getTime() > since);
        const sent = A.customers.filter((c) => c.last_offer_at && new Date(c.last_offer_at).getTime() > since).length;
        if (A.offerVisits === undefined) loadOfferVisits();
        return `<section class="offer-results">
            <div class="or-head"><b>📈 نتائج العروض</b><small class="adm-muted">آخر 30 يوم</small></div>
            <div class="or-grid">
                <div><small>وصلهم عرض</small><b>${sent}</b></div>
                <div><small>فتحوا الرابط</small><b id="offerVisits">${A.offerVisits === undefined ? "…" : A.offerVisits}</b></div>
                <div><small>طلبوا</small><b>${orders.length}</b></div>
                <div><small>المبيعات</small><b>${money(orders.reduce((sum, o) => sum + Number(o.total || 0), 0))}</b></div>
            </div>
        </section>`;
    }

    function renderCustomers() {
        const body = $("#ordersBody");
        if (!body) return;
        if (!A.customersLoaded) {
            body.innerHTML = `<div class="adm-empty">جاري تحميل العملاء...</div>`;
            loadCustomers().then(() => { if (A.view === "orders" && A.book === "customers") renderCustomers(); })
                .catch(() => { body.innerHTML = `<div class="adm-empty">تعذر تحميل العملاء. تأكد من الإنترنت.</div>`; });
            return;
        }
        const all = A.customers;
        const list = filteredCustomers();
        const optedIn = all.filter((c) => c.marketing);
        const flag = (code) => (ATHR_COUNTRIES.find((x) => x.code === code) || ATHR_COUNTRIES[0]).flag;
        body.innerHTML = `
            <div class="ob-stats cust-stats">
                <div><small>العملاء</small><b>${all.length}</b></div>
                <div><small>يقبلون العروض</small><b>${optedIn.length}</b></div>
                <div><small>💎 المميزون</small><b>${all.filter(isVip).length}</b></div>
                <div><small>🔁 رجعوا للشراء</small><b>${all.filter((c) => c.orders_count > 1).length}</b></div>
            </div>
            ${all.length ? `<div class="offer-hero">
                <div class="oh-txt"><b>📣 استوديو العروض</b><small>اختر منتجاً، ورسالة جذابة جاهزة، ورابط خاص لكل عميل باسمه مع عدّاد لانتهاء العرض.</small></div>
                <button class="ab ab-primary" type="button" data-a="offer-open"${optedIn.length ? "" : " disabled"}>أرسل عرضاً (${optedIn.length})</button>
            </div>
            ${offerResults()}
            <div class="cust-actions">
                <button class="ab-mini" type="button" data-a="cust-copy"${optedIn.length ? "" : " disabled"}>نسخ الأرقام</button>
                <button class="ab-mini" type="button" data-a="cust-csv">تنزيل ملف العملاء</button>
            </div>` : ""}
            ${list.length ? `<ul class="cust-list">${list.map((c) => `<li class="cust${c.marketing ? "" : " off"}">
                <div class="cust-main">
                    <b>${esc(c.name || "بدون اسم")}${c.country && c.country !== "OM" ? ` <span aria-hidden="true">${flag(c.country)}</span>` : ""}</b>
                    ${custTags(c).length ? `<span class="cust-tags">${custTags(c).map(([k, l]) => `<span class="ctag ${k}">${l}</span>`).join("")}</span>` : ""}
                    <span dir="ltr" class="cust-phone">+${esc(c.phone)}</span>
                    <small class="adm-muted">${c.orders_count} ${c.orders_count === 1 ? "طلب" : c.orders_count === 2 ? "طلبان" : "طلبات"} · ${money(c.total_spent)} · آخر طلب ${esc(sinceText(c.last_order_at))}${c.last_offer_at ? ` · آخر عرض ${esc(sinceText(c.last_offer_at))}` : ""}</small>
                </div>
                <div class="cust-ctrl">
                    <button type="button" class="vis-switch" role="switch" aria-checked="${Boolean(c.marketing)}" data-cust-mk="${esc(c.phone)}" aria-label="يستقبل العروض" title="${c.marketing ? "يستقبل العروض" : "لا يستقبل العروض"}"><span></span></button>
                    <small>العروض</small>
                </div>
                <div class="cust-btns">
                    ${c.marketing ? `<button type="button" class="ab-mini gift" data-cust-offer="${esc(c.phone)}">🎁 عرض</button>` : ""}
                    <button type="button" class="ab-mini wa" data-cust-wa="${esc(c.phone)}">واتساب</button>
                </div>
            </li>`).join("")}</ul>` : `<div class="adm-empty">${all.length ? "لا يوجد عملاء مطابقون." : "يظهر هنا كل زبون يطلب من المتجر: اسمه ورقمه وعدد طلباته، وتقدر ترسل لهم العروض من هنا."}</div>`}
            <p class="adm-muted cust-note">يُحفظ العميل تلقائياً مع أول طلب. 💎 المميز: 3 طلبات أو أكثر أو مشتريات من ${money(VIP_SPENT)}. من يطفئ «أرسلوا لي العروض» في صفحة الطلب، أو تطفئ أنت مفتاح «العروض» عنده، لا يدخل في إرسال العروض.</p>`;
    }

    // ---------- استوديو العروض ----------

    function offerPref() {
        const p = storage.get(OFFER_PREF) || {};
        return { hours: OFFER_ENDS.some(([h]) => h === p.hours) ? p.hours : 72, skip: p.skip !== false, ptpl: Number(p.ptpl) || 0, gtpl: Number(p.gtpl) || 0 };
    }

    function saveOfferPref(st) {
        storage.set(OFFER_PREF, { hours: st.hours, skip: st.skipRecent, ...(st.product ? { ptpl: st.tpl } : { gtpl: st.tpl }), ...(st.product ? { gtpl: offerPref().gtpl } : { ptpl: offerPref().ptpl }) });
    }

    // المنتجات المنشورة فقط (لأن الرابط يجب أن يعمل عند العميل)، والمخفّضة أولاً
    function offerProducts() {
        const visible = (A.server ? A.server.products : []).filter((p) => p.is_visible !== false);
        const list = ATHR.assignSlugs(visible, cfg()).filter((p) => p.is_available !== false && p.image_url);
        const pct = (p) => (Number(p.old_price) > Number(p.price) ? Math.round((1 - p.price / p.old_price) * 100) : 0);
        return list.map((p, i) => ({ p, i, pct: pct(p) })).sort((a, b) => (b.pct > 0) - (a.pct > 0) || (b.p.is_best_seller ? 1 : 0) - (a.p.is_best_seller ? 1 : 0) || a.i - b.i).map((x) => ({ ...x.p, pct: x.pct }));
    }

    function openOffer(single = null) {
        const pref = offerPref();
        A.offer = { step: "pick", product: null, tpl: 0, text: "", hours: pref.hours, audience: "marketing", skipRecent: pref.skip, single, q: "", i: 0, sent: 0, targets: [], endsAt: 0 };
        renderOffer();
    }

    function offerChoose(productId) {
        const st = A.offer;
        const pref = offerPref();
        st.product = productId ? offerProducts().find((p) => p.id === productId) || null : null;
        st.tpl = st.product ? Math.min(pref.ptpl, PRODUCT_OFFERS.length - 1) : Math.min(pref.gtpl, OFFER_TEMPLATES.length - 1);
        if (!st.product && st.single) {
            const c = A.customers.find((x) => x.phone === st.single);
            if (c && isAway(c)) st.tpl = 2;
        }
        st.text = (st.product ? PRODUCT_OFFERS : OFFER_TEMPLATES)[st.tpl][1];
        st.step = "compose";
        renderOffer();
    }

    function offerTargets(st) {
        if (st.single) return A.customers.filter((c) => c.phone === st.single);
        const test = KIND_TEST[st.audience] || KIND_TEST.marketing;
        return A.customers.filter((c) => c.marketing && test(c) && !(st.skipRecent && recentOffer(c)));
    }

    function endsText(h) {
        return h <= 24 ? "خلال 24 ساعة" : h <= 72 ? "خلال 3 أيام" : "خلال أسبوع";
    }

    function offerUrl(st, first) {
        if (!st.product) return siteLink(`${ATHR.base()}?ref=offer`);
        const ends = st.hours ? (st.endsAt || Date.now() + st.hours * 36e5) : 0;
        return siteLink(ATHR.offerLink(st.product, { name: first, ends }));
    }

    function offerVars(st, c) {
        const first = String((c && c.name) || "").trim().split(/\s+/)[0] || "";
        const vars = { name: first, store: ATHR.storeName(cfg()), ends: st.product && st.hours ? endsText(st.hours) : "", link: offerUrl(st, first), product: "", price: "", old: "", pct: "", save: "" };
        const p = st.product;
        if (p) {
            vars.product = p.name;
            vars.price = money(p.price);
            if (p.pct) Object.assign(vars, { old: money(p.old_price), pct: String(p.pct), save: money(p.old_price - p.price) });
        }
        return vars;
    }

    // تعبئة الرسالة: الاسم والمنتج والسعر والرابط، وحذف السطر الذي معلومته غير موجودة
    function fillOffer(text, vars) {
        let out = String(text || "")
            .replace(/\s*يا\s*\{name\}/g, vars.name ? ` يا ${vars.name}` : "")
            .replace(/\{name\}،\s*/g, vars.name ? `${vars.name}، ` : "");
        out = out.split("\n").filter((line) => !["old", "pct", "save", "ends", "product", "price"].some((k) => line.includes(`{${k}}`) && !vars[k])).join("\n");
        out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
        return out.replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").replace(/^(هلا|مرحبا|أهلاً)\s+👋/m, "$1 👋").trim();
    }

    function offerText(st, c, { broadcast = false } = {}) {
        const text = fillOffer(st.text, offerVars(st, broadcast ? { name: "" } : c));
        return broadcast || text.includes("إيقاف") ? text : `${text}\n\n${OPT_OUT_LINE}`;
    }

    // معاينة بشكل رسالة واتساب، مع بطاقة الرابط (صورة المنتج) كما تظهر عند العميل
    function waBubble(text, st) {
        const p = st.product;
        const img = p ? (ATHR.thumb(p.image_url, "m") || asset(p.image_url)) : asset("images/logo2.jpeg");
        const html = esc(text)
            .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
            .replace(/(https?:\/\/[^\s<]+)/g, (u) => {
                let shown = u;
                try { shown = esc(decodeURI(u.replace(/&amp;/g, "&"))); } catch { /* keep */ }
                return `<span class="wa-url" dir="ltr">${shown}</span>`;
            });
        const now = new Date();
        return `<div class="wa-chat"><div class="wa-bubble">
            <div class="wa-card"><img src="${esc(img)}" alt=""><div><b>${esc(p ? p.name : ATHR.storeName(cfg()))}</b><small dir="ltr">${esc(location.host)}</small></div></div>
            <div class="wa-text">${html}</div>
            <span class="wa-time">${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} ✓✓</span>
        </div></div>`;
    }

    function offerSheetHead(title) {
        return `<div class="adm-sheet-head"><h2>${title}</h2><button class="adm-icon" type="button" data-a="orders-sheet-close" aria-label="إغلاق">×</button></div>`;
    }

    function offerProductItems(st) {
        const q = st.q.trim().toLowerCase();
        const list = offerProducts().filter((p) => !q || p.name.toLowerCase().includes(q));
        return list.map((p) => `<button type="button" class="op-item" data-offer-product="${esc(p.id)}">
            <img src="${esc(ATHR.thumb(p.image_url, "s") || asset(p.image_url))}" alt="" loading="lazy">
            <span class="op-info"><b>${esc(p.name)}</b><small>${money(p.price)}${p.pct ? ` <s>${money(p.old_price)}</s>` : ""}</small></span>
            ${p.pct ? `<span class="tag sale">خصم ${p.pct}%</span>` : p.is_best_seller ? `<span class="tag">🔥 الأكثر طلباً</span>` : ""}
        </button>`).join("") || `<div class="adm-empty">لا توجد منتجات مطابقة.</div>`;
    }

    function renderOffer({ keepScroll = false } = {}) {
        const st = A.offer;
        if (!st) return;
        const prevScroll = keepScroll ? ($("#admSheet .adm-sheet-panel") || {}).scrollTop || 0 : 0;
        const single = st.single ? A.customers.find((c) => c.phone === st.single) : null;
        const who = single ? ` لـ${esc(String(single.name || "العميل").split(" ")[0])}` : "";

        if (st.step === "pick") {
            const discounted = offerProducts().filter((p) => p.pct).length;
            openOrderSheet(`${offerSheetHead(`📣 أرسل عرضاً${who}`)}
                <div class="af-stack">
                    <p class="adm-sentence">اختر المنتج الذي تريد ترويجه، ونجهّز لك رسالة جذابة ورابطاً خاصاً لكل عميل.${discounted ? "" : " 💡 لا يوجد منتج عليه خصم الآن: تقدر تضيف الخصم من لوحة التحكم ← المنتجات ← «الخصم %»."}</p>
                    <button type="button" class="op-general" data-a="offer-general"><span aria-hidden="true">📣</span><span><b>رسالة عامة بدون منتج</b><small>تصاميم جديدة، خصم عام، اشتقنا لك، عرض العيد…</small></span></button>
                    <input class="ai" type="search" id="offerProdQ" placeholder="ابحث عن منتج" value="${esc(st.q)}">
                    <div class="op-list" id="opList">${offerProductItems(st)}</div>
                </div>`);
            return;
        }

        if (st.step === "compose") {
            const p = st.product;
            const targets = offerTargets(st);
            const sample = targets[0] || single || { name: "أحمد" };
            const tpls = p ? PRODUCT_OFFERS : OFFER_TEMPLATES;
            const recentSkipped = st.single ? 0 : A.customers.filter((c) => c.marketing && (KIND_TEST[st.audience] || KIND_TEST.marketing)(c) && recentOffer(c)).length;
            openOrderSheet(`${offerSheetHead(`📣 ${p ? "عرض على منتج" : "رسالة عامة"}${who}`)}
                <div class="af-stack offer-compose">
                    ${p ? `<div class="op-chosen">
                        <img src="${esc(ATHR.thumb(p.image_url, "s") || asset(p.image_url))}" alt="">
                        <span class="op-info"><b>${esc(p.name)}</b><small>${money(p.price)}${p.pct ? ` <s>${money(p.old_price)}</s> <span class="tag sale">خصم ${p.pct}%</span>` : ""}</small></span>
                        <button class="ab-mini" type="button" data-a="offer-back">تغيير</button>
                    </div>
                    ${p.pct ? "" : `<p class="adm-note">💡 هذا المنتج بدون خصم، فتُحذف أسطر الخصم من الرسالة تلقائياً. لإضافة خصم: لوحة التحكم ← المنتجات ← «الخصم %» ثم انشر.</p>`}` : `<button class="ab-mini" type="button" data-a="offer-back">← اختيار منتج بدلاً من ذلك</button>`}
                    <div class="af"><span>أسلوب الرسالة</span><div class="pct-chips">${tpls.map(([label], i) => `<button type="button" class="ab-mini${st.tpl === i ? " on" : ""}" data-offer-tpl="${i}" aria-pressed="${st.tpl === i}">${esc(label)}</button>`).join("")}</div></div>
                    <label class="af"><span>نص الرسالة (تقدر تعدّله)</span><textarea class="ai" id="offerText" rows="9">${esc(st.text)}</textarea>
                        <small>{name} اسم العميل · {product} المنتج · {price} السعر · {old} السعر قبل الخصم · {pct} نسبة الخصم · {save} التوفير · {ends} انتهاء العرض · {link} الرابط الخاص. السطر الذي معلومته غير موجودة يُحذف تلقائياً، ويُضاف سطر «لإيقاف العروض».</small></label>
                    ${p ? `<div class="af"><span>⏳ مدة العرض <small class="adm-muted">(عدّاد تنازلي يظهر للعميل في صفحة المنتج)</small></span><div class="pct-chips">${OFFER_ENDS.map(([h, l]) => `<button type="button" class="ab-mini${st.hours === h ? " on" : ""}" data-offer-ends="${h}" aria-pressed="${st.hours === h}">${l}</button>`).join("")}</div></div>` : ""}
                    ${st.single ? (single && recentOffer(single) ? `<p class="adm-note">وصله عرض ${esc(sinceText(single.last_offer_at))}. لا تكثر عليه حتى لا ينزعج.</p>` : "") : `<div class="af"><span>👥 لمن ترسل؟</span><div class="pct-chips">${OFFER_AUDIENCE.map(([k, l]) => {
                        const n = A.customers.filter((c) => c.marketing && KIND_TEST[k](c) && !(st.skipRecent && recentOffer(c))).length;
                        return `<button type="button" class="ab-mini${st.audience === k ? " on" : ""}" data-offer-aud="${k}" aria-pressed="${st.audience === k}">${l} (${n})</button>`;
                    }).join("")}</div></div>
                    <label class="at"><input type="checkbox" id="offerSkip"${st.skipRecent ? " checked" : ""}><span class="at-ui" aria-hidden="true"></span><span class="at-text"><b>تخطَّ من وصله عرض خلال آخر 3 أيام</b><small>${recentSkipped ? `${recentSkipped} عميل وصلهم عرض قريباً. ` : ""}حتى لا يشعر العميل بالإزعاج ويحظر الرقم.</small></span></label>`}
                    <div class="af"><span>👀 هكذا تصل الرسالة لـ${esc(String(sample.name || "العميل").split(" ")[0])}</span><div id="offerPreview">${waBubble(offerText(st, sample), st)}</div></div>
                    <button class="ab ab-primary ab-block" type="button" data-a="offer-start"${targets.length ? "" : " disabled"}>${targets.length ? `ابدأ الإرسال ${targets.length === 1 ? `لـ${esc(String(targets[0].name || "العميل").split(" ")[0])}` : `(${targets.length} عميل)`}` : "لا يوجد عملاء في هذا الاختيار"}</button>
                    <button class="ab ab-ghost ab-block" type="button" data-a="offer-copy">📋 نسخ الرسالة لحالة واتساب أو قائمة البث</button>
                    <p class="adm-muted">واتساب لا يسمح بالإرسال الجماعي التلقائي، لذلك تضغط «أرسل» لكل عميل وننقلك للتالي تلقائياً. كل عميل يصله رابط باسمه يفتح له العرض الخاص.</p>
                </div>`);
            if (prevScroll) $("#admSheet .adm-sheet-panel").scrollTop = prevScroll;
            return;
        }

        const c = st.targets[st.i];
        if (!c) {
            openOrderSheet(`${offerSheetHead("تم ✅")}
                <div class="af-stack">
                    <div class="offer-done"><span aria-hidden="true">🎉</span><p class="adm-sentence">أرسلت العرض لـ <b>${st.sent}</b> عميل من ${st.targets.length}.</p></div>
                    <p class="adm-muted">📈 تابع النتائج في خانة العملاء: كم شخص فتح الرابط، وكم طلب جاء من العروض.</p>
                    <button class="ab ab-primary ab-block" type="button" data-a="orders-sheet-close">إغلاق</button>
                </div>`);
            renderCustomers();
            return;
        }
        openOrderSheet(`${offerSheetHead("📣 إرسال العرض")}
            <div class="af-stack offer-run">
                <div class="offer-progress"><span style="width:${Math.round((st.i / st.targets.length) * 100)}%"></span></div>
                <p class="adm-muted">العميل ${st.i + 1} من ${st.targets.length} · أُرسل ${st.sent}</p>
                <div class="offer-who"><b>${esc(c.name || "بدون اسم")}${custTags(c).map(([k, l]) => ` <span class="ctag ${k}">${l}</span>`).join("")}</b><span dir="ltr">+${esc(c.phone)}</span></div>
                ${waBubble(offerText(st, c), st)}
                <button class="ab ab-primary ab-block offer-send" type="button" data-a="offer-send">${ATHR.views.waIcon()}أرسل لـ${esc(String(c.name || "العميل").split(" ")[0])} في واتساب</button>
                <div class="inline"><button class="ab-mini" type="button" data-a="offer-skip">تخطي</button><button class="ab-mini" type="button" data-a="offer-stop">إيقاف</button></div>
            </div>`);
    }

    function refreshOfferPreview() {
        const st = A.offer;
        const box = $("#offerPreview");
        if (!st || !box) return;
        const targets = offerTargets(st);
        const single = st.single ? A.customers.find((c) => c.phone === st.single) : null;
        box.innerHTML = waBubble(offerText(st, targets[0] || single || { name: "أحمد" }), st);
    }

    async function offerSend() {
        const st = A.offer;
        const c = st && st.targets[st.i];
        if (!c) return;
        window.open(ATHR.waLink(custWa(c), offerText(st, c)), "_blank", "noopener");
        st.sent++;
        st.i++;
        const at = new Date().toISOString();
        c.last_offer_at = at;
        sb.from("customers").update({ last_offer_at: at }).eq("phone", c.phone).then(() => {}, () => {});
        renderOffer();
    }

    function customersCsv() {
        const rows = [["الاسم", "الرقم", "الدولة", "عدد الطلبات", "المجموع", "أول طلب", "آخر طلب", "يقبل العروض", "التصنيف"]];
        filteredCustomers().forEach((c) => rows.push([c.name || "", `+${c.phone}`, c.country || "", c.orders_count, Number(c.total_spent).toFixed(3), (c.first_order_at || "").slice(0, 10), (c.last_order_at || "").slice(0, 10), c.marketing ? "نعم" : "لا", custTags(c).map((x) => x[1]).join(" ")]));
        const csv = "﻿" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `athr-customers-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    async function toggleMarketing(phone) {
        const c = A.customers.find((x) => x.phone === phone);
        if (!c) return;
        c.marketing = !c.marketing;
        renderCustomers();
        const { error } = await sb.from("customers").update({ marketing: c.marketing }).eq("phone", phone);
        if (error) {
            c.marketing = !c.marketing;
            renderCustomers();
            toast("تعذر الحفظ. تأكد من الإنترنت.");
        } else toast(c.marketing ? "سيستقبل العروض" : "لن يستقبل العروض");
    }

    // أزرار الاستوديو والاختيارات داخل الورقة
    function offerOptionClick(d) {
        const st = A.offer;
        if (d.custOffer) { openOffer(d.custOffer); return true; }
        if (!st) return false;
        if (d.offerProduct) { offerChoose(d.offerProduct); return true; }
        if (d.offerTpl !== undefined) {
            const tpls = st.product ? PRODUCT_OFFERS : OFFER_TEMPLATES;
            const tpl = tpls[Number(d.offerTpl)];
            if (tpl) {
                st.tpl = Number(d.offerTpl);
                st.text = tpl[1];
                saveOfferPref(st);
                renderOffer({ keepScroll: true });
            }
            return true;
        }
        if (d.offerEnds !== undefined) { st.hours = Number(d.offerEnds); saveOfferPref(st); renderOffer({ keepScroll: true }); return true; }
        if (d.offerAud) { st.audience = d.offerAud; renderOffer({ keepScroll: true }); return true; }
        return false;
    }

    async function customersClick(d) {
        const st = A.offer;
        switch (d.a) {
            case "offer-open": openOffer(); return true;
            case "offer-general": offerChoose(null); return true;
            case "offer-back": st.step = "pick"; st.product = null; renderOffer(); return true;
            case "offer-start":
                st.targets = offerTargets(st);
                st.endsAt = st.product && st.hours ? Date.now() + st.hours * 36e5 : 0;
                st.i = 0;
                st.sent = 0;
                st.step = "run";
                saveOfferPref(st);
                renderOffer();
                return true;
            case "offer-copy":
                if (!st) return true;
                st.endsAt = st.endsAt || (st.product && st.hours ? Date.now() + st.hours * 36e5 : 0);
                ATHR.store.copyText(offerText(st, null, { broadcast: true }), "نُسخت الرسالة ✓ الصقها في حالة واتساب أو قائمة البث");
                return true;
            case "offer-send": await offerSend(); return true;
            case "offer-skip": st.i++; renderOffer(); return true;
            case "offer-stop": st.i = st.targets.length; renderOffer(); return true;
            case "cust-copy": {
                const list = filteredCustomers().filter((c) => c.marketing);
                ATHR.store.copyText(list.map((c) => `+${c.phone}`).join("\n"), `نُسخت ${list.length} أرقام`);
                return true;
            }
            case "cust-csv": customersCsv(); return true;
            default: return false;
        }
    }

    // ---------- reviews ----------

    async function loadReviews() {
        const { data, error } = await sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(500);
        if (error) throw error;
        A.reviews = data || [];
        A.reviewsLoaded = true;
    }

    async function renderReviews() {
        const body = $("#ordersBody");
        if (!body) return;
        if (!A.reviewsLoaded) {
            body.innerHTML = `<div class="adm-loading">جاري تحميل التقييمات...</div>`;
            try { await loadReviews(); } catch { body.innerHTML = `<div class="adm-empty">تعذر تحميل التقييمات. تأكد من الإنترنت.</div>`; return; }
            if (A.book !== "reviews") return;
        }
        const productName = (id) => {
            const p = (A.server ? A.server.products : []).find((x) => x.id === id);
            return p ? ATHR.productLabel(p, cfg()) : "";
        };
        const order = { pending: 0, approved: 1, rejected: 2 };
        const list = A.reviews.slice().sort((a, b) => (order[a.status] - order[b.status]) || String(b.created_at).localeCompare(String(a.created_at)));
        const label = { pending: "بانتظار موافقتك", approved: "ظاهر في المتجر", rejected: "مخفي" };
        body.innerHTML = `<p class="adm-note">التقييمات التي يرسلها الزبائن من صفحة «قيّم تجربتك» تظهر هنا، ولا تظهر في المتجر حتى توافق عليها. أرسل رابط التقييم للزبون من زر «اطلب تقييم» في بطاقة الطلب بعد التسليم.</p>`
            + (list.length ? list.map((r) => `<article class="oc rv ${r.status}">
                <header class="oc-head">
                    <div><b>${esc(r.name)}</b> <span class="stars-txt" aria-label="${r.rating} من 5">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span></div>
                    <span class="tag">${label[r.status] || r.status}</span>
                </header>
                <p class="rv-text">${esc(r.text)}</p>
                <p class="adm-muted oc-when">${r.product_id ? `${esc(productName(r.product_id) || "منتج محذوف")} · ` : "تقييم عام للمتجر · "}${r.order_no ? `طلب ${esc(r.order_no)} · ` : ""}${esc(ATHR.muscatParts(r.created_at).date)}</p>
                <div class="oc-actions">
                    ${r.status !== "approved" ? `<button type="button" class="ab-mini ok" data-review-set="${esc(r.id)}" data-value="approved">إظهار في المتجر</button>` : ""}
                    ${r.status !== "rejected" ? `<button type="button" class="ab-mini" data-review-set="${esc(r.id)}" data-value="rejected">إخفاء</button>` : ""}
                    <button type="button" class="ab-mini danger" data-review-del="${esc(r.id)}">حذف</button>
                </div>
            </article>`).join("") : `<div class="adm-empty">لا توجد تقييمات بعد.</div>`);
    }

    async function setReviewStatus(id, status) {
        const r = A.reviews.find((x) => x.id === id);
        if (!r) return;
        const { error } = await sb.from("reviews").update({ status }).eq("id", id);
        if (error) { toast("تعذر الحفظ. تأكد من الإنترنت."); return; }
        r.status = status;
        toast(status === "approved" ? "ظهر التقييم في المتجر" : "أُخفي التقييم");
        renderBook();
        ATHR.store.reload().catch(() => {});
    }

    async function deleteReview(id) {
        if (!confirm("حذف هذا التقييم نهائياً؟")) return;
        const { error } = await sb.from("reviews").delete().eq("id", id);
        if (error) { toast("تعذر الحذف."); return; }
        A.reviews = A.reviews.filter((x) => x.id !== id);
        toast("حُذف التقييم");
        renderBook();
        ATHR.store.reload().catch(() => {});
    }

    function reviewRequestText(o) {
        const first = (o.items || []).find((it) => it.id);
        const p = first && A.server ? A.server.products.find((x) => x.id === first.id) : null;
        const query = [`o=${encodeURIComponent(o.order_no)}`, p && p.slug ? `p=${encodeURIComponent(p.slug)}` : ""].filter(Boolean).join("&");
        const link = siteLink(ATHR.url.page("review", query));
        return ATHR.fill(cfg().sales.review_request_msg, cfg(), { client: (o.customer_name || "").split(" ")[0], link });
    }

    // ---------- performance ----------

    async function renderStats() {
        const body = $("#ordersBody");
        if (!body) return;
        const days = A.statsDays;
        const since = new Date(Date.now() - (days - 1) * 864e5 + 4 * 3600e3).toISOString().slice(0, 10);
        body.innerHTML = `<div class="adm-loading">جاري حساب الأداء...</div>`;
        let rows = [];
        try {
            const { data, error } = await sb.from("stats_daily").select("day,key,n").gte("day", since).limit(5000);
            if (error) throw error;
            rows = data || [];
        } catch {
            body.innerHTML = `<div class="adm-empty">تعذر تحميل الأرقام. تأكد من الإنترنت.</div>`;
            return;
        }
        if (A.book !== "stats" || A.statsDays !== days) return;
        const sum = (key) => rows.filter((r) => r.key === key).reduce((s2, r) => s2 + Number(r.n || 0), 0);
        const visits = sum("visit");
        const views = sum("view");
        const adds = sum("add");
        const checkouts = sum("checkout");
        const sinceTime = new Date(`${since}T00:00:00+04:00`).getTime();
        const inRange = A.orders.filter((o) => !o.hidden && new Date(o.ordered_at).getTime() >= sinceTime);
        const web = inRange.filter((o) => o.source === "web");
        const revenue = (list) => list.reduce((s2, o) => s2 + Number(o.total || 0), 0);
        const aov = (list) => (list.length ? revenue(list) / list.length : 0);
        const pct = (a, b) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "—");
        const step = (label, n, base) => `<div class="fn-row"><span>${label}</span><div class="fn-bar"><i style="width:${base > 0 ? Math.max(2, Math.round((n / base) * 100)) : 0}%"></i></div><b>${n}</b><small>${base > 0 && n !== base ? pct(n, base) : ""}</small></div>`;

        const channels = Object.keys(CHANNELS).map((k) => ({
            k,
            visits: sum(`visit:${k}`),
            orders: web.filter((o) => (o.channel || "direct") === k).length,
            revenue: revenue(web.filter((o) => (o.channel || "direct") === k))
        })).filter((c) => c.visits || c.orders).sort((a, b) => b.visits - a.visits || b.orders - a.orders);

        const counts = new Map();
        inRange.forEach((o) => (o.items || []).forEach((it) => {
            const key = it.label || it.name;
            if (!key) return;
            const cur = counts.get(key) || { qty: 0, total: 0 };
            cur.qty += Number(it.qty) || 0;
            cur.total += Number(it.total) || 0;
            counts.set(key, cur);
        }));
        const top = Array.from(counts.entries()).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);
        const discounts = web.filter((o) => Number(o.discount) > 0).length;
        const gifts = web.filter((o) => o.gift).length;
        const countries = new Map();
        web.forEach((o) => countries.set(o.country || "OM", (countries.get(o.country || "OM") || 0) + 1));

        body.innerHTML = `
            <div class="seg" role="group" aria-label="المدة">${[[7, "7 أيام"], [30, "30 يوماً"], [90, "90 يوماً"]].map(([d, l]) => `<button type="button" data-days="${d}" aria-pressed="${days === d}">${l}</button>`).join("")}</div>
            <div class="ob-stats">
                <div><small>زيارات</small><b>${visits}</b></div>
                <div><small>طلبات من المتجر</small><b>${web.length}</b></div>
                <div><small>نسبة التحويل</small><b>${pct(web.length, visits)}</b></div>
                <div><small>متوسط قيمة الطلب</small><b>${money(aov(web))}</b></div>
                <div><small>مبيعات المتجر</small><b>${money(revenue(web))}</b></div>
                <div><small>كل الطلبات (مع اليدوية)</small><b>${inRange.length} · ${money(revenue(inRange))}</b></div>
            </div>
            <section class="adm-card">
                <h2>رحلة الزبون</h2>
                <p class="adm-muted">كم زائراً وصل لكل خطوة (مرة واحدة لكل زيارة). أكبر نزول بين خطوتين هو أول ما يستحق التحسين.</p>
                <div class="funnel">
                    ${step("دخل المتجر", visits, visits)}
                    ${step("فتح صفحة منتج", views, visits)}
                    ${step("أضاف للسلة", adds, visits)}
                    ${step("بدأ إتمام الطلب", checkouts, visits)}
                    ${step("أرسل الطلب", web.length, visits)}
                </div>
            </section>
            <section class="adm-card">
                <h2>من أين يأتي الزبائن؟</h2>
                ${channels.length ? `<table class="adm-table"><thead><tr><th>المصدر</th><th>زيارات</th><th>طلبات</th><th>مبيعات</th></tr></thead><tbody>
                    ${channels.map((c) => `<tr><td>${esc(CHANNELS[c.k])}</td><td>${c.visits}</td><td>${c.orders}</td><td>${money(c.revenue)}</td></tr>`).join("")}
                </tbody></table>` : `<p class="adm-muted">لا توجد زيارات مسجّلة في هذه المدة بعد.</p>`}
                <p class="adm-muted">لتعرف أثر كل منصة بدقة، أضف في آخر رابط المتجر أو المنتج الذي تنشره <code dir="ltr">?ref=instagram</code> أو <code dir="ltr">?ref=tiktok</code>.</p>
            </section>
            <section class="adm-card">
                <h2>الأكثر مبيعاً</h2>
                ${top.length ? `<table class="adm-table"><thead><tr><th>المنتج</th><th>القطع</th><th>المبلغ</th></tr></thead><tbody>
                    ${top.map(([name, c]) => `<tr><td>${esc(name)}</td><td>${c.qty}</td><td>${money(c.total)}</td></tr>`).join("")}
                </tbody></table>` : `<p class="adm-muted">لا توجد طلبات في هذه المدة.</p>`}
                ${web.length ? `<p class="adm-muted">طلبات فيها خصم (كمية أو طقم): ${discounts} من ${web.length} · طلبات هدايا: ${gifts}${countries.size > 1 || !countries.has("OM") ? ` · ${Array.from(countries.entries()).map(([c, n]) => `${countryLabel(c)}: ${n}`).join("، ")}` : ""}</p>` : ""}
            </section>
            <p class="adm-muted">لا تُحسب زياراتك أنت من جهازك المسجّل في اللوحة. الأرقام تقريبية ولا تحفظ أي بيانات شخصية للزوار.</p>`;
    }

    function filteredOrders() {
        const f = A.filter;
        const q = f.q.trim().toLowerCase();
        return A.orders.filter((o) => {
            if (f.status === "hidden") { if (!o.hidden) return false; }
            else {
                if (o.hidden) return false;
                if (f.status !== "all" && o.status !== f.status) return false;
            }
            if (f.pay !== "all" && o.payment_type !== f.pay) return false;
            if (!q) return true;
            const hay = [o.order_no, o.customer_name, o.phone, o.gift_name, o.gift_phone, o.wilaya, o.governorate, o.address, o.office, o.items_text, countryLabel(o.country),
                ...(o.items || []).map((it) => it.label || it.name)].filter(Boolean).join(" ").toLowerCase();
            return hay.includes(q);
        });
    }

    function waiting(o) {
        if (o.status === "delivered") return "تم التسليم";
        const mins = Math.max(0, Math.round((Date.now() - new Date(o.ordered_at).getTime()) / 60000));
        if (mins < 60) return `منذ ${mins} دقيقة`;
        const hours = Math.round(mins / 60);
        if (hours < 48) return `منذ ${hours} ساعة`;
        return `منذ ${Math.round(hours / 24)} يوم`;
    }

    function itemsList(o) {
        if (o.items_text && o.items_text.trim()) return o.items_text.split("\n").filter(Boolean);
        return (o.items || []).map((it) => `${it.label || it.name} × ${it.qty} = ${money(it.total)}`);
    }

    function renderOrdersList() {
        const body = $("#ordersBody");
        if (!body) return;
        $$(".seg [data-status]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.status === A.filter.status)));
        const list = filteredOrders();
        const sum = (arr) => arr.reduce((s, o) => s + Number(o.total || 0), 0);
        const bank = list.filter((o) => o.payment_type === "bank");
        const cod = list.filter((o) => o.payment_type === "cod");

        const stats = `<div class="ob-stats">
            <div><small>عدد الطلبات</small><b>${list.length}</b></div>
            <div><small>المجموع</small><b>${money(sum(list))}</b></div>
            ${bank.length && cod.length ? `<div><small>تحويل بنكي</small><b>${money(sum(bank))}</b></div><div><small>عند الاستلام</small><b>${money(sum(cod))}</b></div>` : ""}
        </div>`;

        if (!list.length) {
            body.innerHTML = stats + `<div class="adm-empty">${A.orders.length ? "لا توجد طلبات مطابقة." : "لا توجد طلبات بعد. أي طلب يرسله الزبون من المتجر يظهر هنا تلقائياً، ويمكنك أيضاً لصق رسالة طلب من واتساب."}</div>`;
            return;
        }

        body.innerHTML = stats + list.map((o) => {
            const when = ATHR.muscatParts(o.ordered_at);
            return `<article class="oc${o.status === "delivered" ? " delivered" : ""}${o.hidden ? " is-hidden" : ""}">
                <header class="oc-head">
                    <div><b dir="ltr">${esc(o.order_no)}</b> <span class="tag">${o.source === "web" ? "من المتجر" : o.source === "paste" ? "من واتساب" : "يدوي"}</span>${o.source === "web" && o.channel && o.channel !== "direct" ? ` <span class="tag ch">عبر ${esc(CHANNELS[o.channel] || o.channel)}</span>` : ""}${o.gift ? ` <span class="tag gift">🎁 هدية</span>` : ""}${o.coupon ? ` <span class="tag cp" dir="ltr">🎟️ ${esc(o.coupon)}</span>` : ""}</div>
                    <span class="oc-wait${o.status === "new" ? " new" : ""}">${esc(waiting(o))}</span>
                </header>
                <p class="adm-muted oc-when">${esc(when.day)} ${esc(when.date)} — ${esc(when.time)}</p>
                <div class="oc-cust">
                    ${giftTo(o) ? `<small class="adm-muted">صاحب الهدية</small>` : ""}
                    <b>${esc(o.customer_name || "بدون اسم")}</b>
                    ${o.phone ? `<span dir="ltr">${esc(ATHR.phoneText(o.phone, o.country))}</span>` : ""}
                    ${giftTo(o) ? `</div><div class="oc-cust oc-gift"><small class="adm-muted">🎁 المُهدى إليه${ATHR.giftFor(o.gift_for, cfg()) ? ` · <span class="gfor-tag ${o.gift_for}">${esc(ATHR.giftFor(o.gift_for, cfg()).emoji)} ${esc(ATHR.giftFor(o.gift_for, cfg()).label)}</span>` : ""}${o.gift_occasion && o.gift_occasion !== "other" ? ` · ${esc(ATHR.giftOccasion(o.gift_occasion, cfg()).emoji)} ${esc(ATHR.giftOccasion(o.gift_occasion, cfg()).name)}` : ""}${o.gift_hide_price ? " · لا تذكر السعر" : ""}</small>
                    <b>${esc(o.gift_name || "")}</b>
                    ${o.gift_phone ? `<span dir="ltr">${esc(ATHR.phoneText(o.gift_phone, o.country))}</span>` : ""}` : ""}
                    <span>${(o.country || "OM") === "OM" ? "" : `${esc(countryLabel(o.country))} — `}${esc([o.governorate, o.wilaya].filter(Boolean).join(" — "))}</span>
                    ${o.address || o.office ? `<span>${o.office ? `المكتب: ${esc(o.office)}` : esc(o.address)}</span>` : ""}
                </div>
                <ul class="oc-items">${itemsList(o).map((l) => `<li>${esc(l.replace(/^•\s*/, ""))}</li>`).join("")}</ul>
                <div class="oc-sum">
                    ${Number(o.discount) > 0 ? `<span>${esc(o.discount_label || "الخصم")}: -${money(o.discount)}</span>` : ""}
                    ${o.coupon ? `<span>🎟️ كود ${esc(o.coupon)}${Number(o.coupon_discount) > 0 ? `: -${money(o.coupon_discount)}` : Number(o.delivery_price) === 0 ? " (توصيل مجاني)" : ""}</span>` : ""}
                    ${o.delivery_name ? `<span>${esc(o.delivery_name)}: ${Number(o.delivery_price) > 0 ? money(o.delivery_price) : "مجاني"}</span>` : ""}
                    <b>الإجمالي: ${money(o.total)}</b>
                </div>
                ${o.notes ? `<p class="oc-note">ملاحظة العميل: ${esc(o.notes)}</p>` : ""}
                ${o.gift && o.gift_message ? `<p class="oc-note">🎁 رسالة الهدية: ${esc(o.gift_message)}</p>` : ""}
                <div class="oc-ctrl">
                    <label><span class="sr">الدفع</span><select class="ai sm" data-order-id="${esc(o.id)}" data-order-field="payment_type">
                        ${[["bank", "تحويل بنكي"], ["cod", "عند الاستلام"], ["online", "دفع إلكتروني"], ["other", "أخرى"]].map(([v, l]) => `<option value="${v}"${o.payment_type === v ? " selected" : ""}>${l}</option>`).join("")}
                    </select></label>
                    <label><span class="sr">الحالة</span><select class="ai sm" data-order-id="${esc(o.id)}" data-order-field="status">
                        <option value="new"${o.status === "new" ? " selected" : ""}>جديد</option>
                        <option value="delivered"${o.status === "delivered" ? " selected" : ""}>تم التسليم</option>
                    </select></label>
                </div>
                <label class="af"><span>ملاحظتي (لا يراها العميل)</span><textarea class="ai" rows="1" data-order-id="${esc(o.id)}" data-order-field="admin_note">${esc(o.admin_note || "")}</textarea></label>
                <div class="oc-actions">
                    <button type="button" class="ab-mini" data-order-edit="${esc(o.id)}">ملاحظة وتعديل</button>
                    ${o.phone ? `<button type="button" class="ab-mini wa" data-order-wa="${esc(o.id)}">${giftTo(o) ? "واتساب صاحب الهدية" : "واتساب"}</button>` : ""}
                    ${giftTo(o) && o.gift_phone ? `<button type="button" class="ab-mini wa" data-order-wa-gift="${esc(o.id)}">واتساب المُهدى إليه</button>` : ""}
                    ${giftTo(o) && o.gift_phone && cfg().sales.gift_card !== false ? `<button type="button" class="ab-mini wa" data-order-gift-card="${esc(o.id)}">💌 أرسل بطاقة الإهداء</button>` : ""}
                    ${o.status === "new" && o.phone ? `<button type="button" class="ab-mini" data-order-remind="${esc(o.id)}">تذكير بالطلب</button>` : ""}
                    ${o.status === "delivered" && o.phone ? `<button type="button" class="ab-mini wa" data-order-review="${esc(o.id)}">اطلب تقييم</button>` : ""}
                    <button type="button" class="ab-mini" data-order-copy="${esc(o.id)}">نسخ</button>
                    <button type="button" class="ab-mini" data-order-hide="${esc(o.id)}">${o.hidden ? "إظهار في الدفتر" : "إخفاء"}</button>
                </div>
            </article>`;
        }).join("");
    }

    async function updateOrderField(id, field, value) {
        const o = A.orders.find((x) => x.id === id);
        if (!o) return;
        const before = o[field];
        o[field] = field === "admin_note" ? (String(value).trim() || null) : value;
        const { error } = await sb.from("orders").update({ [field]: o[field] }).eq("id", id);
        if (error) {
            o[field] = before;
            toast("تعذر الحفظ. تأكد من الإنترنت.");
        } else if (field !== "admin_note") {
            toast(field === "hidden" ? (value ? "أُخفي الطلب" : "أُظهر الطلب") : "حُفظ");
        }
        if (field !== "admin_note") renderOrdersList();
    }

    function customerWa(o, text) {
        return ATHR.waLink(ATHR.customerWhatsapp(o.phone, o.country || "OM"), text);
    }

    function giftTo(o) {
        return Boolean(o.gift && (o.gift_name || o.gift_phone));
    }

    function countryLabel(code) {
        const c = ATHR_COUNTRIES.find((x) => x.code === (code || "OM")) || ATHR_COUNTRIES[0];
        return `${c.flag} ${c.name}`;
    }

    function reminderText(o) {
        return ATHR.fill(cfg().sales.reminder_msg, cfg(), {
            client: (o.customer_name || "").split(" ")[0],
            no: o.order_no,
            total: money(o.total)
        });
    }

    function orderText(o) {
        const card = giftTo(o) && cfg().sales.gift_card !== false;
        return ATHR.orderText(o, cfg(), { cardUrl: card ? siteLink(ATHR.giftCardPath(o)) : "" });
    }

    // ---------- order sheet (manual / edit / paste) ----------

    function openOrderSheet(html) {
        const sheet = $("#admSheet");
        sheet.innerHTML = `<div class="adm-sheet-backdrop" data-a="orders-sheet-close"></div><div class="adm-sheet-panel" role="dialog" aria-modal="true">${html}</div>`;
        sheet.hidden = false;
    }

    function closeOrderSheet() {
        const sheet = $("#admSheet");
        if (sheet) {
            sheet.hidden = true;
            sheet.innerHTML = "";
        }
    }

    function toMuscatInputs(iso) {
        const d = new Date(iso || Date.now());
        const shifted = new Date(d.getTime() + 4 * 3600 * 1000);
        return { date: shifted.toISOString().slice(0, 10), time: shifted.toISOString().slice(11, 16) };
    }

    function openOrderForm(o) {
        const isNew = !o;
        const c = cfg();
        const when = toMuscatInputs(o && o.ordered_at);
        const items = o ? itemsList(o).join("\n") : "";
        const deliveries = c.order.delivery.map((d) => d.name).filter(Boolean);
        openOrderSheet(`
            <div class="adm-sheet-head"><h2>${isNew ? "طلب يدوي" : `تعديل ${esc(o.order_no)}`}</h2><button class="adm-icon" type="button" data-a="orders-sheet-close" aria-label="إغلاق">×</button></div>
            <form class="af-stack" id="orderForm" data-id="${esc(o ? o.id : "")}" novalidate>
                <div class="two">
                    <label class="af"><span>التاريخ</span><input class="ai" type="date" name="date" value="${when.date}"></label>
                    <label class="af"><span>الوقت</span><input class="ai" type="time" name="time" value="${when.time}"></label>
                </div>
                <label class="af"><span>اسم العميل</span><input class="ai" name="customer_name" value="${esc(o ? o.customer_name || "" : "")}"></label>
                <div class="two">
                    <label class="af"><span>الدولة</span><select class="ai" name="country">${ATHR_COUNTRIES.map((c) => `<option value="${c.code}"${(o ? o.country || "OM" : "OM") === c.code ? " selected" : ""}>${c.flag} ${esc(c.name)}</option>`).join("")}</select></label>
                    <label class="af"><span>رقم الهاتف</span><input class="ai" name="phone" type="tel" dir="ltr" value="${esc(o ? o.phone || "" : "")}"></label>
                </div>
                <div class="two">
                    <label class="af"><span>المدينة (لطلبات الخليج)</span><input class="ai" name="governorate" value="${esc(o ? o.governorate || "" : "")}"></label>
                    <label class="af"><span>الولاية</span><input class="ai" name="wilaya" value="${esc(o ? o.wilaya || "" : "")}"></label>
                </div>
                <label class="af"><span>العنوان</span><input class="ai" name="address" value="${esc(o ? (o.office ? `المكتب: ${o.office}` : o.address || "") : "")}"></label>
                <label class="af"><span>تفاصيل الطلب</span><textarea class="ai" name="items_text" rows="4" placeholder="كل منتج في سطر">${esc(items)}</textarea></label>
                <div class="two">
                    <label class="af"><span>المبلغ</span><input class="ai" name="total" type="number" inputmode="decimal" step="0.001" min="0" value="${o ? esc(o.total) : ""}"></label>
                    <label class="af"><span>الدفع</span><select class="ai" name="payment_type">
                        ${[["bank", "تحويل بنكي"], ["cod", "عند الاستلام"], ["online", "دفع إلكتروني"], ["other", "أخرى"]].map(([v, l]) => `<option value="${v}"${(o ? o.payment_type : "bank") === v ? " selected" : ""}>${l}</option>`).join("")}
                    </select></label>
                </div>
                <div class="two">
                    <label class="af"><span>طريقة التوصيل</span><input class="ai" name="delivery_name" list="delList" value="${esc(o ? o.delivery_name || "" : "")}"></label>
                    <label class="af"><span>الحالة</span><select class="ai" name="status">
                        <option value="new"${!o || o.status === "new" ? " selected" : ""}>جديد</option>
                        <option value="delivered"${o && o.status === "delivered" ? " selected" : ""}>تم التسليم</option>
                    </select></label>
                </div>
                <datalist id="delList">${deliveries.map((d) => `<option value="${esc(d)}">`).join("")}</datalist>
                <label class="af"><span>ملاحظاتي</span><textarea class="ai" name="admin_note" rows="2">${esc(o ? o.admin_note || "" : "")}</textarea></label>
                <p class="adm-error" id="orderFormErr" role="alert"></p>
                <button class="ab ab-primary" type="submit">${isNew ? "إضافة الطلب" : "حفظ التعديلات"}</button>
                ${isNew ? "" : `<button class="ab ab-ghost danger" type="button" data-order-delete="${esc(o.id)}">حذف الطلب</button>`}
            </form>`);
    }

    async function saveOrderForm(form) {
        const v = Object.fromEntries(new FormData(form).entries());
        const id = form.dataset.id;
        const err = $("#orderFormErr");
        if (!String(v.customer_name || "").trim() && !String(v.items_text || "").trim()) {
            err.textContent = "اكتب اسم العميل أو تفاصيل الطلب على الأقل.";
            return;
        }
        const total = Number(ATHR.digits(v.total || "0"));
        if (!(total >= 0)) {
            err.textContent = "المبلغ غير صحيح.";
            return;
        }
        const isOffice = /^المكتب:\s*/.test(v.address || "");
        const row = {
            ordered_at: new Date(`${v.date || toMuscatInputs().date}T${v.time || "12:00"}:00+04:00`).toISOString(),
            customer_name: String(v.customer_name || "").trim() || null,
            country: v.country || "OM",
            phone: v.phone ? (ATHR.parsePhone(v.phone, v.country || "OM").stored || null) : null,
            governorate: String(v.governorate || "").trim() || null,
            wilaya: String(v.wilaya || "").trim() || null,
            address: isOffice ? null : String(v.address || "").trim() || null,
            office: isOffice ? v.address.replace(/^المكتب:\s*/, "").trim() : null,
            items_text: String(v.items_text || "").trim() || null,
            total,
            payment_type: v.payment_type,
            payment_name: { bank: "تحويل بنكي", cod: "الدفع عند الاستلام", online: "دفع إلكتروني", other: "أخرى" }[v.payment_type],
            delivery_name: String(v.delivery_name || "").trim() || null,
            status: v.status,
            admin_note: String(v.admin_note || "").trim() || null
        };

        let res;
        if (id) {
            res = await sb.from("orders").update(row).eq("id", id).select("*").single();
        } else {
            let attempt = 0;
            do {
                res = await sb.from("orders").insert({ ...row, order_no: ATHR.newOrderNo(), source: "manual" }).select("*").single();
                attempt++;
            } while (res.error && String(res.error.code) === "23505" && attempt < 3);
        }
        if (res.error) {
            console.error(res.error);
            err.textContent = "تعذر الحفظ. تأكد من الإنترنت وحاول مرة أخرى.";
            return;
        }
        if (id) A.orders = A.orders.map((o) => (o.id === id ? res.data : o));
        else A.orders.unshift(res.data);
        A.orders.sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));
        closeOrderSheet();
        renderOrdersList();
        toast(id ? "حُفظت التعديلات" : "أُضيف الطلب");
    }

    async function deleteOrder(id) {
        const o = A.orders.find((x) => x.id === id);
        if (!o || !confirm(`حذف الطلب ${o.order_no} نهائياً؟`)) return;
        const { error } = await sb.from("orders").delete().eq("id", id);
        if (error) {
            toast("تعذر الحذف.");
            return;
        }
        A.orders = A.orders.filter((x) => x.id !== id);
        closeOrderSheet();
        renderOrdersList();
        toast("حُذف الطلب");
    }

    // ---------- paste from WhatsApp ----------

    function openPaste() {
        openOrderSheet(`
            <div class="adm-sheet-head"><h2>لصق رسالة طلب من واتساب</h2><button class="adm-icon" type="button" data-a="orders-sheet-close" aria-label="إغلاق">×</button></div>
            <div class="af-stack">
                <p class="adm-muted">انسخ رسالة الطلب من واتساب والصقها هنا. يمكنك لصق عدة طلبات معاً.</p>
                <textarea class="ai" id="pasteBox" rows="10" placeholder="الصق الرسالة هنا"></textarea>
                <p class="adm-error" id="pasteErr" role="alert"></p>
                <button class="ab ab-primary" type="button" data-a="paste-import">إضافة إلى الدفتر</button>
            </div>`);
        setTimeout(() => $("#pasteBox")?.focus(), 50);
    }

    function parseNumber(text) {
        const m = ATHR.digits(String(text || "")).replace(/[,٬]/g, "").match(/-?\d+(?:[.٫]\d+)?/);
        return m ? Number(m[0].replace("٫", ".")) : 0;
    }

    // يقرأ رسالة الطلب بالشكل الجديد (👤 من: … · رقم) والقديم (الاسم: / الهاتف:)
    function parseOrders(raw) {
        const text = ATHR.digits(raw).replace(/\r/g, "");
        const starts = [];
        const re = /رقم الطلب\s*[:：]/g;
        let m;
        while ((m = re.exec(text))) {
            const lineStart = text.lastIndexOf("\n", m.index) + 1;
            starts.push(lineStart);
        }
        if (!starts.length) return [];
        const strip = (l) => l.replace(/^[^؀-ۿA-Za-z0-9•*\-+]+/, "").trim();
        return starts.map((start, i) => {
            const end = i + 1 < starts.length ? starts[i + 1] : text.length;
            const rawLines = text.slice(start, end).split("\n").map((l) => l.trim());
            const block = rawLines.map(strip);
            const get = (label) => {
                const line = block.find((l) => l.startsWith(label));
                return line ? line.slice(label.length).replace(/^\s*[:：]\s*/, "").trim() : "";
            };
            const byIcon = (icon) => {
                const line = rawLines.find((l) => l.startsWith(icon));
                return line ? strip(line) : "";
            };
            const split = (line) => line.split("·").map((x) => x.trim()).filter(Boolean);
            const items = block.filter((l) => /^[•\-*]/.test(l)).map((l) => l.replace(/^[•\-*]\s*/, ""));

            // التاريخ والوقت: «🗓️ الأربعاء 07/10/2026 · 9:29 م» أو «التاريخ:» و«الوقت:»
            const whenLine = block.find((l) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(l) && !/^رقم/.test(l)) || "";
            const date = get("التاريخ") || whenLine;
            const time = get("الوقت") || (whenLine.match(/\d{1,2}:\d{2}\s*(ص|م)?/) || [""])[0];
            let orderedAt = new Date().toISOString();
            const dm = date.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dm) {
                let hh = 12;
                let mm = 0;
                const tm = time.match(/(\d{1,2}):(\d{2})\s*(ص|م)?/);
                if (tm) {
                    hh = Number(tm[1]) % 12;
                    mm = Number(tm[2]);
                    if (tm[3] === "م") hh += 12;
                    if (!tm[3]) hh = Number(tm[1]);
                }
                const iso = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+04:00`;
                const d = new Date(iso);
                if (!Number.isNaN(d.getTime())) orderedAt = d.toISOString();
            }

            // الزبون والهدية
            const who = split(byIcon("👤").replace(/^من\s*[:：]\s*/, ""));
            const giftLine = byIcon("🎁");
            const to = /^إلى\s*[:：]/.test(giftLine) ? split(giftLine.replace(/^إلى\s*[:：]\s*/, "")) : [];
            const isGift = Boolean(giftLine) || Boolean(get("صاحب الهدية"));

            // المكان والتوصيل
            const place = byIcon("📍");
            const countryText = get("الدولة") || place;
            const country = (ATHR_COUNTRIES.find((c) => countryText.includes(c.name) || countryText.includes(c.flag)) || ATHR_COUNTRIES[0]).code;
            const placeParts = split(place).filter((x) => !ATHR_COUNTRIES.some((c) => x.includes(c.name)));
            const isOm = country === "OM";
            const phoneOf = (v) => (v ? ATHR.parsePhone(v, country).stored : null);
            const name = who[0] || get("الاسم") || get("صاحب الهدية") || null;
            const phone = who[1] || get("الهاتف") || get("رقم صاحب الهدية");

            const payText = get("الدفع");
            const payType = /تحويل|بنك/.test(payText) ? "bank" : /استلام|كاش|نقد/.test(payText) ? "cod" : /إلكتروني|الكتروني|بطاقة/.test(payText) ? "online" : payText ? "other" : "bank";
            const office = get("المكتب");
            const deliveryText = get("التوصيل");
            const noMatch = get("رقم الطلب").match(/[A-Z]{1,4}-[0-9A-Z]{3,10}/i);
            const discountLine = block.find((l) => /^(خصم|الخصم)/.test(l)) || "";
            const giftName = to[0] || get("المُهدى إليه") || null;
            const forText = get("الهدية لـ") || get("الهدية ل");
            const giftFor = forText ? (ATHR.GIFT_FOR.find((id) => forText.includes(ATHR.giftFor(id, cfg()).label)) || (/بنت/.test(forText) ? "girl" : /ولد/.test(forText) ? "boy" : null)) : null;
            const giftPhone = to[1] || get("رقم المُهدى إليه");
            return {
                order_no: noMatch ? noMatch[0].toUpperCase() : null,
                ordered_at: orderedAt,
                source: "paste",
                customer_name: name,
                country,
                phone: phone ? phoneOf(phone) : null,
                governorate: get("المحافظة") || get("المدينة") || (!isOm ? placeParts[0] || null : null),
                wilaya: get("الولاية") || (isOm ? placeParts[0] || null : null),
                address: office ? null : (get("العنوان") || null),
                office: office || null,
                notes: get("الملاحظات") || get("ملاحظة") || null,
                delivery_name: get("طريقة التوصيل") || byIcon("🚚") || null,
                delivery_price: /مجاني/.test(deliveryText) ? 0 : parseNumber(deliveryText),
                discount: Math.abs(parseNumber(discountLine.replace(/^[^:：]*[:：]/, ""))),
                discount_label: (discountLine.split(/[:：]/)[0] || "").trim().slice(0, 80) || null,
                total: parseNumber(get("الإجمالي")),
                payment_name: payText || null,
                payment_type: payType,
                items_text: items.join("\n") || null,
                gift: isGift,
                gift_name: isGift ? giftName : null,
                gift_phone: isGift && giftPhone ? phoneOf(giftPhone) : null,
                gift_message: isGift ? (get("رسالة الهدية") || null) : null,
                gift_hide_price: isGift && block.some((l) => l.includes("لا تذكر السعر")),
                gift_for: isGift ? giftFor : null,
                status: "new"
            };
        });
    }

    async function importPasted() {
        const raw = $("#pasteBox").value;
        const err = $("#pasteErr");
        const parsed = parseOrders(raw);
        if (!parsed.length) {
            err.textContent = "لم أجد طلباً في النص. تأكد أن الرسالة فيها سطر «رقم الطلب:».";
            return;
        }
        const existing = new Set(A.orders.map((o) => o.order_no));
        let added = 0;
        let skipped = 0;
        for (const row of parsed) {
            if (row.order_no && existing.has(row.order_no)) { skipped++; continue; }
            let res;
            let attempt = 0;
            const base = { ...row };
            do {
                const no = attempt === 0 && base.order_no ? base.order_no : ATHR.newOrderNo();
                res = await sb.from("orders").insert({ ...base, order_no: no }).select("*").single();
                attempt++;
            } while (res.error && String(res.error.code) === "23505" && attempt < 4);
            if (res.error) {
                console.error(res.error);
                continue;
            }
            A.orders.push(res.data);
            existing.add(res.data.order_no);
            added++;
        }
        A.orders.sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));
        closeOrderSheet();
        renderOrdersList();
        toast(`أُضيف ${added} طلب${skipped ? `، و${skipped} موجود مسبقاً` : ""}`);
    }

    window.ATHR_ADMIN = { open, close };
})();
