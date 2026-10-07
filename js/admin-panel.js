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
        ai: null,
        aiStatus: null
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
        other: "مواقع أخرى"
    };

    const TABS = [
        ["products", "المنتجات", "box", "إضافة وتعديل المنتجات والصور والأسعار"],
        ["ad", "الإعلان", "megaphone", "صورة أو فيديو أعلى المتجر"],
        ["catalog", "الأقسام والألوان", "grid", "أقسام المتجر وصورها وألوان المنتجات"],
        ["look", "المظهر", "palette", "الألوان والخطوط والشعار والوضع الداكن"],
        ["texts", "النصوص", "text", "العناوين والجمل ورسائل واتساب"],
        ["order", "الطلب والتوصيل", "truck", "التوصيل والدفع والدول والعملات"],
        ["sales", "المبيعات والهدايا", "tag", "الخصومات والعروض والهدايا"],
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
        sparkle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8 1.8-5Z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/>',
        eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
        back: '<path d="M9.5 6l6 6-6 6"/>',
        dots: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>'
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
        const views = { home: tabHome, products: tabProducts, ad: tabAd, catalog: tabCatalog, look: tabLook, texts: tabTexts, order: tabOrder, sales: tabSales, contact: tabContact };
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
            ["add-product", "plus", "إضافة منتج"],
            ["ai-new-product", "sparkle", "منتج بصورة ذكاء اصطناعي"],
            ["ai-ad", "sparkle", "صورة إعلانية بالذكاء"],
            ["preview", "eye", "معاينة المتجر"]
        ];
        return `
            <button class="adm-orders-tile" type="button" data-a="open-orders">
                <span class="aot-ico">${icon("receipt")}</span>
                <span class="aot-txt"><b>الطلبات والتقييمات والأداء</b><small id="homeOrders">دفتر الطلبيات</small></span>
                <span class="aot-go">${icon("back")}</span>
            </button>
            <div class="adm-quick">${quick.map(([a, ic, label]) => `<button class="aq" type="button" data-a="${a}">${icon(ic)}<span>${label}</span></button>`).join("")}</div>
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
        const q = A.productFilter.trim().toLowerCase();
        const catName = (id) => (A.draft.categories.find((c) => c.id === id) || {}).name || "بدون قسم";
        const list = products.map((p, i) => ({ p, i })).filter(({ p }) => !q || p.name.toLowerCase().includes(q) || catName(p.category_id).toLowerCase().includes(q));

        return `
            <section class="adm-card">
                <div class="adm-row-between">
                    <h2>المنتجات <small class="adm-muted">(${products.length})</small></h2>
                    <div class="inline">
                        <button class="ab ab-soft ab-sm" type="button" data-a="ai-new-product">✨ منتج بصورة ذكاء اصطناعي</button>
                        <button class="ab ab-primary ab-sm" type="button" data-a="add-product">+ إضافة منتج</button>
                    </div>
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
                                    ${p.is_visible && p.is_available ? "" : `<span class="prow-tags">${p.is_visible ? "" : `<span class="tag">مخفي</span>`}${p.is_available ? "" : `<span class="tag warn">نفد</span>`}</span>`}
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
                    <button class="ab ab-soft ab-sm ai-btn" type="button" data-a="ai-product" data-id="${esc(p.id)}">✨ صورة احترافية بالذكاء الاصطناعي</button>
                    <small class="adm-muted">يفضّل صورة عمودية بنسبة 4:5. أو صوّر المنتج بجوالك واضغط زر الذكاء الاصطناعي ليحوّلها لصورة استوديو احترافية.</small>
                </div>
                ${text(`${base}.name`, "اسم المنتج", { max: 120 })}
                ${text(`${base}.name_en`, "اسم المنتج بالإنجليزي (لزوار المتجر بالإنجليزي)", { max: 160, dir: "ltr", placeholder: "Real Madrid Cup" })}
                <div class="two">
                    ${number(`${base}.price`, "السعر")}
                    ${number(`${base}.old_price`, "السعر قبل الخصم (اختياري)", { help: "يظهر مشطوباً بجانب السعر." })}
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
        if (!panel || !(A.editing || A.ai)) return;
        const scroll = panel.scrollTop;
        const focus = document.activeElement && panel.contains(document.activeElement) && document.activeElement.dataset.aiField;
        panel.innerHTML = A.ai ? aiStudio() : productEditor(A.editing);
        panel.scrollTop = scroll;
        if (focus) panel.querySelector(`[data-ai-field="${focus}"]`)?.focus({ preventScroll: true });
    }

    function closeSheet() {
        const sheet = $("#admSheet");
        if (!sheet) return;
        aiCleanup();
        sheet.hidden = true;
        sheet.innerHTML = "";
        if (A.editing) {
            A.editing = null;
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
    // TAB 2: AD
    // =====================================================

    function tabAd() {
        const ad = cfg().ad;
        let body = `<button class="ab ab-soft ab-block ai-btn" type="button" data-a="ai-ad">✨ اعمل صورة إعلانية بالذكاء الاصطناعي</button>
            <small class="adm-muted">اكتب فكرة الإعلان واختر منتجاتك، والذكاء الاصطناعي يصمم صورة إعلانية احترافية وواقعية تضعها هنا أو تنزّلها لإنستغرام وتيك توك.</small>`;
        body += toggle("config.ad.show", "إظهار الإعلان في المتجر");
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
    // TAB 4: LOOK
    // =====================================================

    function tabLook() {
        const c = cfg();
        return card("الألوان", `
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
                ${select("config.theme.radius", "استدارة الزوايا", [["sharp", "حادة"], ["medium", "متوسطة"], ["round", "مدوّرة كثيراً"]])}
                ${select("config.theme.grid_mobile", "عدد المنتجات في الصف على الجوال", [["2", "منتجان"], ["1", "منتج واحد"]], { type: "number" })}
                ${toggle("config.theme.show_search", "إظهار البحث")}
                ${text("config.texts.search_placeholder", "الكلمة داخل خانة البحث", { placeholder: "ابحث", max: 40 })}
                ${toggle("config.theme.visitor_mode", "زر المظهر للزائر (فاتح / داكن / تلقائي) في قائمة النقاط الثلاث", { help: "الزائر يختار ما يريحه، ويُحفظ اختياره على جهازه. «وضع العرض» أعلاه هو الافتراضي لمن لم يختر." })}
                ${toggle("config.theme.show_sort", "إظهار الترتيب حسب السعر")}`)
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

        return card("خصم الكمية (يرفع قيمة الطلب)", `
                ${toggle("config.sales.volume.enabled", "تفعيل خصم الكمية", { rerender: true })}
                <ul class="lst">${tiers}</ul>
                ${(vol.tiers || []).length < 4 ? `<button class="ab ab-ghost ab-sm" type="button" data-add-item="config.sales.volume.tiers">+ إضافة شريحة</button>` : ""}
                ${vol.enabled && volText ? `<p class="adm-sentence">${esc(volText)} — يُطبَّق تلقائياً في السلة على كل المنتجات.</p>` : ""}`,
                "الخصم على مجموع الطلب حسب عدد القطع. لا يجتمع مع خصم الباقات، ويُطبَّق تلقائياً الأفضل للزبون. يظهر للزبون في صفحة المنتج وفي السلة («أضف قطعة ووفّر 10%»).")
            + card("بعد الإضافة للسلة", `
                ${toggle("config.sales.upsell_show", "نافذة «أُضيف إلى سلتك» مع اقتراحات وإكمال الطقم", { help: "تقترح على الزبون إكمال الطقم ومنتجات مناسبة، وتوضح كم بقي للتوصيل المجاني أو للخصم التالي." })}`)
            + card("🎁 إرسال هدية لشخص", `
                ${toggle("config.sales.gift_enabled", "تفعيل «هدية لشخص» في إتمام الطلب", { rerender: true, help: "يختار الزبون «لي» أو «هدية لشخص»، ثم يكتب رقمه ورقم المُهدى إليه واسمه وولايته وعنوانه ورسالة الهدية." })}
                ${cfg().sales.gift_enabled ? `${toggle("config.sales.gift_banner", "بنر «أرسلها هدية لمن تحب» في الصفحة الرئيسية", { help: "بطاقة جذابة أعلى المتجر، ويظهر «أرسل هدية» أيضاً في القائمة ⋮." })}
                ${toggle("config.sales.gift_card", "بطاقة إهداء رقمية للمُهدى إليه", { help: "صفحة جميلة يفتحها المُهدى إليه من جواله: صندوق هدية يتفتح، واسمه، والمناسبة، ورسالة الهدية، بدون أي سعر. يرسلها صاحب الهدية بعد الطلب، ورابطها يصلك في رسالة الطلب أيضاً." })}
                ${toggle("config.sales.gift_button", "زر «أرسله هدية» في صفحة المنتج والسلة", { help: "زر واضح يأخذ الزبون مباشرة لطلب الهدية." })}
                ${toggle("config.sales.gift_prepaid", "الهدايا بالدفع المسبق فقط", { help: "يُخفي «الدفع عند الاستلام» في طلبات الهدايا حتى لا يُطلب المبلغ من المُهدى إليه." })}` : ""}`,
                "يصلك طلب الهدية في واتساب ولوحة الطلبات مع رقم صاحب الهدية ورقم المُهدى إليه، وتنبيه «لا تذكر السعر» لو طلبه الزبون.")
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
    // TAB 8: CONTACT & REVIEWS
    // =====================================================

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
    // AI STUDIO: صورة منتج احترافية / صورة إعلانية بالذكاء الاصطناعي
    // المفتاح يُحفظ في قاعدة البيانات عبر دالة آمنة، ولا يُقرأ من المتصفح أبداً.
    // =====================================================

    const AI_STYLES = [
        ["beige", "استوديو بيج فاخر", "مثل صور الأقسام"],
        ["white", "خلفية بيضاء نظيفة", "مثل المتاجر العالمية"],
        ["life", "على طاولة بجو دافئ", "إضاءة صباحية وديكور بسيط"],
        ["hand", "في يد شخص", "يوضح الحجم الحقيقي"],
        ["dark", "عنابي فاخر", "بلون المتجر"],
        ["custom", "حسب وصفي فقط", "اكتب الشكل الذي تريده"]
    ];

    const AI_SCENES = {
        beige: "a warm beige seamless studio backdrop (#EBDDC9) with the product standing on a small light travertine stone block, minimal, calm and elegant, like a premium gift boutique catalogue",
        white: "a pure white seamless background (#FFFFFF), clean e-commerce catalogue look with a soft natural contact shadow under the product",
        life: "a cozy warm lifestyle scene: the product on a light oak wooden table near a window with soft morning sunlight, a few tasteful props (a small green plant, coffee beans or an open book) softly blurred in the background and never covering the product",
        hand: "held naturally in one hand with neat short nails, the printed design facing the camera, warm neutral background softly blurred, natural skin tones",
        dark: "a luxurious deep maroon backdrop (#7D1420) with soft rim light and a subtle glossy surface reflection, premium gift-shop mood",
        custom: ""
    };

    const AI_ASPECTS = [
        ["16:9", "بنر المتجر", "عريض"],
        ["1:1", "منشور مربع", "إنستغرام"],
        ["4:5", "منشور طولي", "إنستغرام"],
        ["9:16", "ستوري", "تيك توك وسناب"]
    ];

    const AI_ERRORS = {
        not_admin: "انتهت جلستك. أغلق لوحة التحكم وافتحها وسجّل الدخول من جديد.",
        no_key: "لا يوجد مفتاح ذكاء اصطناعي محفوظ. أضفه من «إعداد الذكاء الاصطناعي» أعلاه.",
        bad_key: "المفتاح غير صحيح أو غير مفعّل. انسخه من جديد واحفظه.",
        billing: "حساب الذكاء الاصطناعي يحتاج تفعيل الدفع (Billing) لتوليد الصور. فعّله من حسابك ثم جرّب مرة أخرى.",
        quota: "وصلت للحد المسموح حالياً. انتظر دقيقة وجرّب مرة أخرى.",
        blocked: "رفض الذكاء الاصطناعي هذا الطلب. غيّر الصورة أو الوصف وجرّب مرة أخرى.",
        no_image: "لم يرجع الذكاء الاصطناعي صورة هذه المرة. جرّب مرة أخرى أو وضّح الوصف أكثر.",
        no_model: "لا يوجد نموذج صور متاح لهذا المفتاح. تأكد أنه من Google AI Studio وأن الدفع (Billing) مفعّل.",
        bad_image: "تعذر قراءة الصورة. جرّب صورة JPG أو PNG.",
        bad_request: "اكتب وصفاً أوضح وجرّب مرة أخرى.",
        timeout: "تأخر الرد. تأكد من الإنترنت وجرّب مرة أخرى.",
        offline: "خدمة التصميم غير متاحة الآن. تأكد من الإنترنت وجرّب بعد قليل."
    };

    function aiCfg() {
        const c = cfg().ai || {};
        return { provider: c.provider === "openai" ? "openai" : "gemini", quality: c.quality === "fast" ? "fast" : "best", model: String(c.model || "").trim() };
    }

    function aiProductPrompt(st) {
        const scene = AI_SCENES[st.style] || "";
        const extra = String(st.prompt || "").trim();
        return [
            "You are a world-class commercial product photographer and retoucher for a premium online gift store.",
            "Use the attached photo as the exact reference of the real product and turn it into a professional, photorealistic, high-resolution e-commerce product photo.",
            "Keep the product 100% identical to the reference: same shape, proportions, size, colors, matte finish, handle and the exact printed design, logos, text and artwork. Do not redraw, simplify, translate, mirror, crop or invent anything on the print.",
            "Remove the original background, hands, clutter, glare, dust and noise from the photo (unless the scene below asks for a hand).",
            scene ? `Scene: ${scene}.` : "",
            "Lighting: soft diffused studio lighting with a gentle key light, natural soft shadows, true-to-life colors, crisp focus on the printed design, realistic materials (no CGI or plastic look).",
            "Composition: vertical 4:5 portrait framing, the product centered and filling about 65-75% of the frame, clean margins suitable for a product page.",
            "Do not add any text, letters, watermark, logo, frame or border that is not on the real product.",
            extra ? `Extra instructions from the store owner (follow them, as long as the product itself stays identical): ${extra}` : ""
        ].filter(Boolean).join("\n");
    }

    function aiAdPrompt(st, refCount) {
        const ratio = AI_ASPECTS.find((a) => a[0] === st.aspect) || AI_ASPECTS[0];
        const name = cfg().en && cfg().en.name ? `${cfg().en.name} | ${cfg().name}` : cfg().name;
        return [
            `Create a premium, eye-catching, photorealistic advertising image for "${name}", an Omani online store that sells printed matte ceramic cups, mugs and wallets (gift items with football club, university and character designs).`,
            `The store owner's idea for this ad: ${String(st.prompt || "").trim()}`,
            refCount
                ? `Use the ${refCount} attached product photo(s) as exact references: show these real products faithfully as the heroes of the ad, with exactly the same shapes, colors and printed designs. Do not change, redraw or invent any print, and do not add extra products with invented designs.`
                : "Show elegant matte ceramic cups as the hero products, with plain or simple tasteful designs (no real brand logos).",
            "Style: high-end commercial product photography, realistic lighting and shadows, tasteful props, rich but elegant colors that harmonise with the brand palette (deep maroon #7D1420 and warm beige #EBDDC9), one clear focal point and a clean, uncluttered composition with some negative space.",
            `Format: ${ratio[1]} image with a ${st.aspect} aspect ratio.`,
            st.noText
                ? "Do not write any text, letters, numbers, logos or watermarks anywhere in the image."
                : `Write only this text in the image, spelled exactly and clearly, in a clean modern font: "${String(st.adText || "").trim()}". No other text.`,
            "Ultra-detailed, sharp, high resolution, realistic, no distorted objects."
        ].join("\n");
    }

    function aiSetup() {
        const c = aiCfg();
        const status = A.aiStatus;
        const saved = status && status[c.provider];
        const providerName = c.provider === "openai" ? "OpenAI" : "Google Gemini";
        return `<details class="adm-card flat ai-setup"${status && !saved ? " open" : ""}>
            <summary>⚙️ إعداد الذكاء الاصطناعي ${status === undefined ? "" : saved ? `<span class="tag ok">✅ جاهز</span>` : `<span class="tag warn">مطلوب مرة واحدة</span>`}</summary>
            <div class="af-stack">
                ${select("config.ai.provider", "الخدمة", [["gemini", "Google Gemini (موصى به)"], ["openai", "OpenAI"]], { rerender: true })}
                ${select("config.ai.quality", "الجودة", [["best", "أعلى جودة — حوالي 0.13$ للصورة"], ["fast", "أسرع وأرخص — حوالي 0.05$ للصورة"]])}
                <p class="adm-sentence">${saved ? `✅ مفتاح ${providerName} محفوظ (ينتهي بـ <b dir="ltr">${esc(saved.last4 || "")}</b>).` : `لا يوجد مفتاح ${providerName} بعد.`}</p>
                <label class="af"><span>${saved ? "تغيير المفتاح" : "الصق المفتاح هنا"}</span><input class="ai" type="password" id="aiKey" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" placeholder="${c.provider === "openai" ? "sk-..." : "AIza..."}"></label>
                <div class="inline">
                    <button class="ab ab-primary ab-sm" type="button" data-a="ai-save-key">حفظ المفتاح</button>
                    ${saved ? `<button class="ab-mini danger" type="button" data-a="ai-del-key">حذف المفتاح</button>` : ""}
                </div>
                <small class="adm-muted">${c.provider === "openai"
                    ? "من platform.openai.com ← API keys ← Create new secret key. يحتاج رصيداً في الحساب."
                    : "افتح aistudio.google.com بحسابك في جوجل ← Get API key ← Create API key، ثم انسخه هنا. توليد الصور يحتاج تفعيل الدفع (Billing) في حسابك، والتكلفة بسيطة لكل صورة."}
                    يُحفظ المفتاح بشكل سري في قاعدة البيانات ولا يظهر مرة أخرى حتى لك، ولا يصل للزبائن.</small>
            </div>
        </details>`;
    }

    function aiStudio() {
        const st = A.ai;
        if (!st) return "";
        const isAd = st.mode === "ad";
        const p = st.productId ? A.draft.products.find((x) => x.id === st.productId) : null;
        const res = st.result;
        const title = isAd ? "✨ صورة إعلانية بالذكاء الاصطناعي" : p ? "✨ صورة احترافية للمنتج" : "✨ منتج جديد بصورة احترافية";

        let body = "";
        if (isAd) {
            const withImg = A.draft.products.filter((x) => x.image_url);
            const picked = withImg.filter((x) => st.refs.includes(x.id));
            const others = withImg.filter((x) => !st.refs.includes(x.id));
            const room = 3 - st.refs.length - st.uploads.length;
            body = `
                <label class="af"><span>فكرة الإعلان (البرومبت)</span><textarea class="ai" rows="3" data-ai-field="prompt" placeholder="مثال: عرض اليوم الوطني — كاسات الأندية بخصم 10% بأجواء احتفالية بألوان علم عُمان">${esc(st.prompt)}</textarea><small>اكتب فكرتك بالعربي أو الإنجليزي، والذكاء الاصطناعي يصمم إعلاناً واقعياً واحترافياً.</small></label>
                <div class="adm-card flat">
                    <h3>منتجات تظهر في الإعلان <small class="adm-muted">(اختياري، حتى 3)</small></h3>
                    <div class="ai-picks">
                        ${[...picked, ...others].map((x) => `<button type="button" class="ai-pick${st.refs.includes(x.id) ? " on" : ""}" data-a="ai-ref" data-id="${esc(x.id)}" aria-pressed="${st.refs.includes(x.id)}"${!st.refs.includes(x.id) && room <= 0 ? " disabled" : ""}><img src="${esc(ATHR.thumb(x.image_url, "s") || asset(x.image_url))}" alt="" loading="lazy"><span>${esc(x.name || "")}</span></button>`).join("")}
                    </div>
                    ${st.uploads.length ? `<div class="ai-ups">${st.uploads.map((u, i) => `<span class="ai-up"><img src="${esc(u.url)}" alt=""><button type="button" class="ab-mini danger" data-a="ai-up-del" data-i="${i}" aria-label="إزالة">×</button></span>`).join("")}</div>` : ""}
                    ${room > 0 ? `<label class="ab ab-soft ab-sm">رفع صور من جوالك<input type="file" accept="image/*" multiple data-ai-refs hidden></label>` : ""}
                </div>
                <div class="af"><span>المقاس</span><div class="ai-aspects">${AI_ASPECTS.map(([v, l, s]) => `<button type="button" class="ai-chip${st.aspect === v ? " on" : ""}" data-a="ai-aspect" data-v="${v}" aria-pressed="${st.aspect === v}"><b>${l}</b><small dir="ltr">${v}</small><small>${s}</small></button>`).join("")}</div></div>
                <label class="at"><input type="checkbox" data-ai-field="noText"${st.noText ? " checked" : ""}><span class="at-ui" aria-hidden="true"></span><span class="at-text"><b>بدون كتابة داخل الصورة</b><small>أنظف وأدق. اكتب العرض في المتجر أو في منشورك بدلاً من داخل الصورة.</small></span></label>
                ${st.noText ? "" : `<label class="af"><span>النص المكتوب داخل الإعلان</span><input class="ai" data-ai-field="adText" maxlength="60" value="${esc(st.adText)}" placeholder="مثال: خصم 10%"><small>اجعله قصيراً جداً. الكتابة العربية داخل الصور قد تخرج بأخطاء أحياناً.</small></label>`}`;
        } else {
            body = `
                <div class="adm-card flat">
                    <h3>1. صورة المنتج من جوالك</h3>
                    <div class="ai-src">
                        ${st.src ? `<img src="${esc(st.src.url)}" alt="">` : `<div class="ai-ph">صوّر المنتج من الأمام بإضاءة جيدة — الخلفية لا تهم</div>`}
                    </div>
                    <div class="inline">
                        <label class="ab ab-soft ab-sm">${st.src ? "تغيير الصورة" : "اختيار صورة أو تصوير"}<input type="file" accept="image/*" data-ai-src hidden></label>
                        ${p && p.image_url && !(st.src && st.src.current) ? `<button class="ab-mini" type="button" data-a="ai-use-current">استخدم صورة المنتج الحالية</button>` : ""}
                    </div>
                </div>
                <div class="adm-card flat">
                    <h3>2. شكل الصورة</h3>
                    <div class="ai-styles">${AI_STYLES.map(([v, l, s]) => `<button type="button" class="ai-chip${st.style === v ? " on" : ""}" data-a="ai-style" data-v="${v}" aria-pressed="${st.style === v}"><b>${l}</b><small>${s}</small></button>`).join("")}</div>
                </div>
                <label class="af"><span>3. وصفك (البرومبت)${st.style === "custom" ? "" : " — اختياري"}</span><textarea class="ai" rows="3" data-ai-field="prompt" placeholder="${st.style === "custom" ? "مثال: الكوب على رخام أبيض مع حبوب قهوة وإضاءة ذهبية" : "مثال: أضف بخار قهوة خفيف فوق الكوب"}">${esc(st.prompt)}</textarea><small>المنتج وطباعته يبقيان كما هما تماماً، والذكاء الاصطناعي يغيّر الخلفية والإضاءة والجو فقط.</small></label>`;
        }

        const canUse = res && !st.busy;
        return `
            <div class="adm-sheet-head">
                <h2>${title}</h2>
                <button class="adm-icon" type="button" data-a="ai-back" aria-label="رجوع">×</button>
            </div>
            <div class="af-stack ai-studio">
                ${aiSetup()}
                ${body}
                <button class="ab ab-primary ab-block" type="button" data-a="ai-generate"${st.busy ? " disabled" : ""}>${st.busy ? "جاري التصميم..." : res ? "✨ صمّم نسخة أخرى" : "✨ صمّم الصورة"}</button>
                ${st.busy ? `<p class="adm-muted center">يأخذ عادة من 10 ثوانٍ إلى دقيقة. لا تغلق الصفحة.</p>` : ""}
                ${st.error ? `<div class="adm-errors">${esc(st.error)}${st.detail ? `<small class="ai-detail" dir="ltr">${esc(st.detail)}</small>` : ""}</div>` : ""}
                ${res ? `<div class="adm-card flat ai-out">
                    <h3>النتيجة</h3>
                    <img src="${esc(res.url)}" alt="">
                    <div class="inline">
                        ${isAd
                            ? `<button class="ab ab-primary ab-sm" type="button" data-a="ai-use-ad"${canUse ? "" : " disabled"}>استخدمها في إعلان المتجر</button>`
                            : `<button class="ab ab-primary ab-sm" type="button" data-a="ai-use-main"${canUse ? "" : " disabled"}>${p ? "اجعلها الصورة الرئيسية" : "أنشئ المنتج بهذه الصورة"}</button>
                               ${p && p.media.filter((m) => m.type === "image").length < 5 ? `<button class="ab ab-soft ab-sm" type="button" data-a="ai-use-extra"${canUse ? "" : " disabled"}>أضفها للصور الإضافية</button>` : ""}`}
                        <a class="ab-mini" href="${esc(res.url)}" download="athr-ai-${Date.now()}.${res.mime === "image/jpeg" ? "jpg" : "png"}">تنزيل</a>
                    </div>
                </div>` : ""}
            </div>`;
    }

    function aiCleanup() {
        const st = A.ai;
        if (!st) return;
        [st.src, st.result, ...st.uploads].forEach((x) => { if (x && x.url && x.url.startsWith("blob:")) URL.revokeObjectURL(x.url); });
        A.ai = null;
    }

    async function aiLoadStatus() {
        try {
            const { data, error } = await sb.rpc("ai_key_status");
            A.aiStatus = error ? {} : (data || {});
        } catch {
            A.aiStatus = {};
        }
        if (A.ai) refreshSheet();
    }

    function openAi(mode, productId = null, from = "") {
        aiCleanup();
        A.ai = { mode, productId, from, src: null, style: "beige", prompt: "", aspect: "16:9", noText: true, adText: "", refs: [], uploads: [], result: null, busy: false, error: "", detail: "" };
        A.editing = null;
        openSheet(aiStudio());
        if (A.aiStatus === undefined || A.aiStatus === null) {
            A.aiStatus = undefined;
            aiLoadStatus();
        }
    }

    function aiBack() {
        const st = A.ai;
        const back = st && st.from === "editor" && st.productId && A.draft.products.some((x) => x.id === st.productId) ? st.productId : null;
        aiCleanup();
        if (back) editProduct(back);
        else closeSheet();
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ""));
            reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
            reader.readAsDataURL(blob);
        });
    }

    // نصغّر الصورة قبل الإرسال (أسرع وأرخص) مع الحفاظ على تفاصيل الطباعة
    async function aiInputImage(blob, max = 1536) {
        const { img, url } = await loadImage(blob);
        const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const out = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
        if (!out) throw new Error("تعذر تجهيز الصورة.");
        return { mime: "image/jpeg", data: await blobToBase64(out) };
    }

    async function fetchBlob(src) {
        const res = await fetch(asset(src), { cache: "force-cache" });
        if (!res.ok) throw new Error("تعذر تحميل صورة المنتج.");
        return res.blob();
    }

    function base64ToBlob(b64, mime) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: mime || "image/png" });
    }

    async function aiGenerate() {
        const st = A.ai;
        if (!st || st.busy) return;
        const c = aiCfg();
        const isAd = st.mode === "ad";
        st.error = "";
        st.detail = "";
        if (A.aiStatus && !A.aiStatus[c.provider]) st.error = AI_ERRORS.no_key;
        else if (!isAd && !st.src) st.error = "اختر صورة المنتج أولاً (من جوالك أو صورته الحالية).";
        else if (!isAd && st.style === "custom" && String(st.prompt).trim().length < 5) st.error = "اكتب وصف الشكل الذي تريده.";
        else if (isAd && String(st.prompt).trim().length < 5) st.error = "اكتب فكرة الإعلان أولاً.";
        else if (isAd && !st.noText && !String(st.adText).trim()) st.error = "اكتب النص الذي تريده داخل الإعلان، أو فعّل «بدون كتابة».";
        if (st.error) {
            refreshSheet();
            return;
        }
        st.busy = true;
        refreshSheet();
        busyMessage("✨ جاري تصميم الصورة...");
        try {
            let images = [];
            if (isAd) {
                const blobs = [];
                for (const id of st.refs) {
                    const p = A.draft.products.find((x) => x.id === id);
                    if (p && p.image_url) blobs.push(await fetchBlob(p.image_url));
                }
                st.uploads.forEach((u) => blobs.push(u.blob));
                for (const b of blobs.slice(0, 3)) images.push(await aiInputImage(b, 1280));
            } else {
                images = [await aiInputImage(st.src.blob)];
            }
            const prompt = isAd ? aiAdPrompt(st, images.length) : aiProductPrompt(st);
            const { data: sess } = await sb.auth.getSession();
            const token = sess && sess.session && sess.session.access_token;
            if (!token) throw Object.assign(new Error("not_admin"), { code: "not_admin" });
            let res;
            try {
                res = await fetch(`${window.ATHR_SUPABASE_URL}/functions/v1/ai-image`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", apikey: window.ATHR_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ provider: c.provider, quality: c.quality, model: c.model, aspect: isAd ? st.aspect : "4:5", prompt, images }),
                    signal: AbortSignal.timeout ? AbortSignal.timeout(170000) : undefined
                });
            } catch (error) {
                throw Object.assign(new Error(String(error && error.message)), { code: error && error.name === "TimeoutError" ? "timeout" : "offline" });
            }
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.image) throw Object.assign(new Error(json.detail || `HTTP ${res.status}`), { code: json.error || (res.status === 404 ? "offline" : "failed") });
            if (A.ai !== st) return;
            if (st.result && st.result.url) URL.revokeObjectURL(st.result.url);
            const blob = base64ToBlob(json.image, json.mime);
            st.result = { blob, url: URL.createObjectURL(blob), mime: json.mime || "image/png", model: json.model || "" };
        } catch (error) {
            console.warn("AI image failed:", error);
            if (A.ai !== st) return;
            st.error = AI_ERRORS[error.code] || (error && /[؀-ۿ]/.test(error.message || "") ? error.message : "تعذر تصميم الصورة. جرّب مرة أخرى.");
            st.detail = error.code && error.code !== "not_admin" && !/[؀-ۿ]/.test(error.message || "") ? String(error.message || "").slice(0, 200) : "";
            if (error.code === "no_key" || error.code === "bad_key") aiLoadStatus();
        } finally {
            busyMessage("");
            if (A.ai === st) {
                st.busy = false;
                refreshSheet();
                if (st.result && !st.error) setTimeout(() => $("#admSheet .ai-out")?.scrollIntoView({ block: "start", behavior: "smooth" }), 30);
            }
        }
    }

    async function aiUse(kind) {
        const st = A.ai;
        if (!st || !st.result || st.busy) return;
        await withBusy("جاري حفظ الصورة...", async () => {
            const { blob, ext, type } = await prepareImage(st.result.blob, kind === "ad" ? "ad" : "product");
            const url = await uploadBlob(blob, ext, type);
            if (kind === "ad") {
                const ad = cfg().ad;
                ad.type = "image";
                ad.image_url = url;
                ad.show = true;
                if (!ad.image_alt) ad.image_alt = String(st.prompt || "").trim().slice(0, 120);
                aiCleanup();
                closeSheet();
                saveDraft();
                renderTab({ keepScroll: true });
                toast("صارت صورة الإعلان. اضغط «نشر» ليراها الزبائن.");
                return;
            }
            let p = st.productId ? A.draft.products.find((x) => x.id === st.productId) : null;
            if (!p) {
                p = newProduct();
                A.draft.products.unshift(p);
                A.productFilter = "";
            }
            if (kind === "extra") {
                const video = p.media.filter((m) => m.type === "video");
                p.media = [...p.media.filter((m) => m.type === "image"), { type: "image", url }, ...video];
            } else {
                p.image_url = url;
            }
            const id = p.id;
            aiCleanup();
            saveDraft();
            renderTab({ keepScroll: true });
            editProduct(id);
            toast(kind === "extra" ? "أُضيفت الصورة للمنتج" : "صارت الصورة الرئيسية للمنتج ✨");
        });
    }

    async function aiSaveKey(remove = false) {
        const c = aiCfg();
        const input = $("#aiKey");
        const key = remove ? "" : String(input ? input.value : "").trim();
        if (!remove) {
            if (key.length < 20 || /\s/.test(key)) { toast("الصق المفتاح كاملاً بدون مسافات."); return; }
            if (c.provider === "gemini" && /^sk-/.test(key)) { toast("هذا مفتاح OpenAI. غيّر الخدمة إلى OpenAI أو الصق مفتاح Gemini (يبدأ بـ AIza)."); return; }
            if (c.provider === "openai" && /^AIza/.test(key)) { toast("هذا مفتاح Gemini. غيّر الخدمة إلى Google Gemini."); return; }
        } else if (!confirm("حذف مفتاح الذكاء الاصطناعي؟ لن تعمل أزرار التصميم حتى تضيف مفتاحاً جديداً.")) return;
        const { error } = await sb.rpc("set_ai_key", { provider: c.provider, key });
        if (input) input.value = "";
        if (error) {
            toast(/invalid/i.test(error.message || "") ? "المفتاح غير صالح. انسخه من جديد." : "تعذر حفظ المفتاح. تأكد من الإنترنت.");
            return;
        }
        toast(remove ? "حُذف المفتاح" : "حُفظ المفتاح بأمان ✅");
        if (A.ai) A.ai.error = "";
        await aiLoadStatus();
    }

    async function aiAddFiles(input, files) {
        const st = A.ai;
        if (!st) return;
        const d = input.dataset;
        if (d.aiSrc !== undefined) {
            if (st.src && st.src.url.startsWith("blob:")) URL.revokeObjectURL(st.src.url);
            st.src = { blob: files[0], url: URL.createObjectURL(files[0]), current: false };
            st.error = "";
        } else if (d.aiRefs !== undefined) {
            const room = 3 - st.refs.length - st.uploads.length;
            files.slice(0, Math.max(0, room)).forEach((f) => st.uploads.push({ blob: f, url: URL.createObjectURL(f) }));
            if (files.length > room) toast("الحد 3 صور في الإعلان.");
        }
        refreshSheet();
    }

    async function aiClick(d) {
        const st = A.ai;
        switch (d.a) {
            case "ai-product": openAi("product", d.id || A.editing || null, A.editing ? "editor" : ""); return true;
            case "ai-new-product": openAi("product", null); return true;
            case "ai-ad": openAi("ad"); return true;
            case "ai-back": aiBack(); return true;
            case "ai-save-key": await aiSaveKey(false); return true;
            case "ai-del-key": await aiSaveKey(true); return true;
            default: break;
        }
        if (!st) return false;
        switch (d.a) {
            case "ai-generate": aiGenerate(); return true;
            case "ai-style": st.style = d.v; refreshSheet(); return true;
            case "ai-aspect": st.aspect = d.v; refreshSheet(); return true;
            case "ai-ref":
                if (st.refs.includes(d.id)) st.refs = st.refs.filter((x) => x !== d.id);
                else if (st.refs.length + st.uploads.length < 3) st.refs.push(d.id);
                refreshSheet();
                return true;
            case "ai-up-del": {
                const u = st.uploads.splice(Number(d.i), 1)[0];
                if (u) URL.revokeObjectURL(u.url);
                refreshSheet();
                return true;
            }
            case "ai-use-current": {
                const p = A.draft.products.find((x) => x.id === st.productId);
                if (!p || !p.image_url) return true;
                await withBusy("جاري تحميل الصورة...", async () => {
                    const blob = await fetchBlob(p.image_url);
                    if (A.ai !== st) return;
                    if (st.src && st.src.url.startsWith("blob:")) URL.revokeObjectURL(st.src.url);
                    st.src = { blob, url: URL.createObjectURL(blob), current: true };
                    st.error = "";
                    refreshSheet();
                });
                return true;
            }
            case "ai-use-main": aiUse("main"); return true;
            case "ai-use-extra": aiUse("extra"); return true;
            case "ai-use-ad": aiUse("ad"); return true;
            default: return false;
        }
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
        if (t.dataset.aiField && A.ai && t.type !== "checkbox") {
            A.ai[t.dataset.aiField] = t.value;
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
    }

    async function onChange(e) {
        const t = e.target;

        if (t.dataset.pref) {
            storage.set(t.dataset.pref, t.value);
            return;
        }
        if (t.dataset.aiField && A.ai) {
            A.ai[t.dataset.aiField] = t.type === "checkbox" ? t.checked : t.value;
            if (t.type === "checkbox") refreshSheet();
            return;
        }
        if (t.dataset.bind) {
            bindValue(t);
            if (t.dataset.rerender !== undefined) {
                if (A.editing || A.ai) refreshSheet();
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

        if (d.aiSrc !== undefined || d.aiRefs !== undefined) {
            await aiAddFiles(input, files);
            return;
        }

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
        if (d.rowMenu) {
            A.rowMenu = A.rowMenu === d.rowMenu ? null : d.rowMenu;
            renderTab({ keepScroll: true });
            return;
        }

        if (d.a && d.a.startsWith("ai-")) {
            await aiClick(d);
            return;
        }

        switch (d.a) {
            case "close": close(); return;
            case "retry": open(A.view); return;
            case "close-sheet": closeSheet(); return;
            case "preview": preview(); return;
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
            case "open-orders": location.hash = "#orders"; open("orders"); return;
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
                const text = `🎁 ${from} أرسل لك هدية من ${ATHR.storeName(cfg())}! افتح بطاقتك: ${link}`;
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
        if (!confirm(`تطبيق السعر ${money(value)} على كل المنتجات (${A.draft.products.length})؟`)) return;
        A.draft.products.forEach((p) => {
            p.price = value;
            if (p.old_price !== null && p.old_price <= value) p.old_price = null;
        });
        afterChange();
        toast("طُبّق السعر على كل المنتجات");
    }

    function discard() {
        if (!confirm("تجاهل كل التعديلات غير المنشورة والرجوع لآخر نسخة منشورة؟")) return;
        A.draft = ATHR.clone(A.server);
        A.errors = [];
        storage.del(DRAFT_KEY);
        renderTab();
        renderStatus();
        toast("رجعت لآخر نسخة منشورة");
    }

    function preview() {
        const data = {
            config: A.draft.config,
            categories: A.draft.categories.map((c, i) => ({ ...c, sort_order: i + 1 })),
            products: A.draft.products.map((p, i) => ({ ...p, sort_order: i + 1 }))
        };
        const el = $("#adm");
        el.hidden = true;
        el.innerHTML = "";
        document.body.classList.remove("locked");
        A.view = null;
        ATHR.store.preview(data);
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
                add("products", `${label}: السعر قبل الخصم يجب أن يكون أكبر من السعر.`);
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
        const tabs = [["orders", "الطلبات"], ["reviews", `التقييمات${pending ? ` (${pending})` : ""}`], ["stats", "الأداء"]];
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
                <main class="adm-body" id="ordersBody"></main>
                ${A.book === "orders" ? `<footer class="adm-foot ob-foot">
                    <button class="ab ab-ghost" type="button" data-a="orders-paste">لصق رسالة طلب من واتساب</button>
                    <button class="ab ab-primary" type="button" data-a="orders-manual">+ طلب يدوي</button>
                </footer>` : ""}
            </div>
            <div class="adm-sheet" id="admSheet" hidden></div>`;
        if (A.book === "reviews") renderReviews();
        else if (A.book === "stats") renderStats();
        else renderOrdersList();
        if (!A.reviewsLoaded) loadReviews().then(() => { if (A.view === "orders") { const tab = $('[data-book="reviews"]'); const n = A.reviews.filter((r) => r.status === "pending").length; if (tab) tab.textContent = `التقييمات${n ? ` (${n})` : ""}`; } }).catch(() => {});
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
                    <div><b dir="ltr">${esc(o.order_no)}</b> <span class="tag">${o.source === "web" ? "من المتجر" : o.source === "paste" ? "من واتساب" : "يدوي"}</span>${o.source === "web" && o.channel && o.channel !== "direct" ? ` <span class="tag ch">عبر ${esc(CHANNELS[o.channel] || o.channel)}</span>` : ""}${o.gift ? ` <span class="tag gift">🎁 هدية</span>` : ""}</div>
                    <span class="oc-wait${o.status === "new" ? " new" : ""}">${esc(waiting(o))}</span>
                </header>
                <p class="adm-muted oc-when">${esc(when.day)} ${esc(when.date)} — ${esc(when.time)}</p>
                <div class="oc-cust">
                    ${giftTo(o) ? `<small class="adm-muted">صاحب الهدية</small>` : ""}
                    <b>${esc(o.customer_name || "بدون اسم")}</b>
                    ${o.phone ? `<span dir="ltr">${esc(ATHR.phoneText(o.phone, o.country))}</span>` : ""}
                    ${giftTo(o) ? `</div><div class="oc-cust oc-gift"><small class="adm-muted">🎁 المُهدى إليه${o.gift_occasion && o.gift_occasion !== "other" ? ` · ${esc(ATHR.giftOccasion(o.gift_occasion).emoji)} ${esc(ATHR.giftOccasion(o.gift_occasion).name)}` : ""}${o.gift_hide_price ? " · لا تذكر السعر" : ""}</small>
                    <b>${esc(o.gift_name || "")}</b>
                    ${o.gift_phone ? `<span dir="ltr">${esc(ATHR.phoneText(o.gift_phone, o.country))}</span>` : ""}` : ""}
                    <span>${(o.country || "OM") === "OM" ? "" : `${esc(countryLabel(o.country))} — `}${esc([o.governorate, o.wilaya].filter(Boolean).join(" — "))}</span>
                    ${o.address || o.office ? `<span>${o.office ? `المكتب: ${esc(o.office)}` : esc(o.address)}</span>` : ""}
                </div>
                <ul class="oc-items">${itemsList(o).map((l) => `<li>${esc(l.replace(/^•\s*/, ""))}</li>`).join("")}</ul>
                <div class="oc-sum">
                    ${Number(o.discount) > 0 ? `<span>${esc(o.discount_label || "الخصم")}: -${money(o.discount)}</span>` : ""}
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
        const when = ATHR.muscatParts(o.ordered_at);
        const lines = [
            `رقم الطلب: ${o.order_no}`,
            `اليوم: ${when.day}`,
            `التاريخ: ${when.date}`,
            `الوقت: ${when.time}`,
            ...(giftTo(o)
                ? ["🎁 الطلب هدية", `صاحب الهدية: ${o.customer_name || ""}`, `رقم صاحب الهدية: ${ATHR.phoneText(o.phone, o.country)}`, `المُهدى إليه: ${o.gift_name || ""}`, `رقم المُهدى إليه: ${ATHR.phoneText(o.gift_phone, o.country)}`]
                : [`الاسم: ${o.customer_name || ""}`, `الهاتف: ${ATHR.phoneText(o.phone, o.country)}`]),
            `الدولة: ${countryLabel(o.country)}`
        ];
        if (o.governorate) lines.push(`${(o.country || "OM") === "OM" ? "المحافظة" : "المدينة"}: ${o.governorate}`);
        if (o.wilaya) lines.push(`الولاية: ${o.wilaya}`);
        if (o.office) lines.push(`المكتب: ${o.office}`);
        else if (o.address) lines.push(`العنوان: ${o.address}`);
        if (o.notes) lines.push(`الملاحظات: ${o.notes}`);
        if (o.delivery_name) lines.push(`طريقة التوصيل: ${o.delivery_name}`);
        if (giftTo(o)) {
            if (o.gift_occasion && o.gift_occasion !== "other") lines.push(`المناسبة: ${ATHR.giftOccasion(o.gift_occasion).name}`);
            if (o.gift_message) lines.push(`رسالة الهدية: ${o.gift_message}`);
            if (o.gift_hide_price) lines.push("لا تذكر السعر للمُهدى إليه");
            if (cfg().sales.gift_card !== false) lines.push(`بطاقة الإهداء: ${siteLink(ATHR.giftCardPath(o))}`);
        } else if (o.gift) lines.push(`🎁 الطلب هدية${o.gift_message ? `: ${o.gift_message}` : ""}`);
        lines.push("المنتجات:", ...itemsList(o).map((l) => (l.startsWith("•") ? l : `• ${l}`)));
        if (Number(o.discount) > 0) lines.push(`${o.discount_label || "الخصم"}: -${money(o.discount)}`);
        lines.push(`التوصيل: ${Number(o.delivery_price) > 0 ? money(o.delivery_price) : "مجاني"}`);
        lines.push(`الإجمالي: ${money(o.total)}`);
        if (o.payment_name) lines.push(`الدفع: ${o.payment_name}`);
        return lines.join("\n");
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

    function parseOrders(raw) {
        const text = ATHR.digits(raw).replace(/\r/g, "");
        const starts = [];
        const re = /رقم الطلب\s*[:：]/g;
        let m;
        while ((m = re.exec(text))) starts.push(m.index);
        if (!starts.length) return [];
        return starts.map((start, i) => {
            const end = i + 1 < starts.length ? starts[i + 1] : text.length;
            const block = text.slice(start, end).split("\n").map((l) => l.trim());
            const get = (label) => {
                const line = block.find((l) => l.startsWith(label));
                return line ? line.slice(label.length).replace(/^\s*[:：]\s*/, "").trim() : "";
            };
            const items = block.filter((l) => /^[•\-*]/.test(l)).map((l) => l.replace(/^[•\-*]\s*/, ""));
            const date = get("التاريخ");
            const time = get("الوقت");
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
            const payText = get("الدفع");
            const payType = /تحويل|بنك/.test(payText) ? "bank" : /استلام|كاش|نقد/.test(payText) ? "cod" : /إلكتروني|الكتروني|بطاقة/.test(payText) ? "online" : payText ? "other" : "bank";
            const office = get("المكتب");
            const deliveryText = get("التوصيل");
            const noMatch = get("رقم الطلب").match(/[A-Z]{1,4}-[0-9A-Z]{3,10}/i);
            const countryText = get("الدولة");
            const country = (ATHR_COUNTRIES.find((c) => countryText.includes(c.name) || countryText.includes(c.flag)) || ATHR_COUNTRIES[0]).code;
            return {
                order_no: noMatch ? noMatch[0].toUpperCase() : null,
                ordered_at: orderedAt,
                source: "paste",
                customer_name: get("الاسم") || null,
                country,
                phone: get("الهاتف") ? ATHR.parsePhone(get("الهاتف"), country).stored : null,
                governorate: get("المحافظة") || get("المدينة") || null,
                wilaya: get("الولاية") || null,
                address: office ? null : (get("العنوان") || null),
                office: office || null,
                notes: get("الملاحظات") || null,
                delivery_name: get("طريقة التوصيل") || null,
                delivery_price: /مجاني/.test(deliveryText) ? 0 : parseNumber(deliveryText),
                discount: Math.abs(parseNumber((block.find((l) => /^(خصم|الخصم)/.test(l)) || "").replace(/^[^:：]*[:：]/, ""))),
                discount_label: ((block.find((l) => /^(خصم|الخصم)/.test(l)) || "").split(/[:：]/)[0] || "").trim().slice(0, 80) || null,
                total: parseNumber(get("الإجمالي")),
                payment_name: payText || null,
                payment_type: payType,
                items_text: items.join("\n") || null,
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
