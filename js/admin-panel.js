/* =====================================================
   ATHR STORE — لوحة التحكم ودفتر الطلبيات (للمالك فقط)
   التعديلات تُحفظ مسودة على الجوال حتى تضغط «نشر التغييرات».
===================================================== */

(function () {
    "use strict";

    const esc = ATHR.escape;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const sb = athrSupabase;
    const BUCKET = "product-images";
    const DRAFT_KEY = "athr_admin_draft_v2";

    const A = {
        view: null,
        server: null,
        draft: null,
        tab: "products",
        editing: null,
        productFilter: "",
        errors: [],
        busy: false,
        orders: [],
        ordersLoaded: false,
        filter: { q: "", status: "all", pay: "all" }
    };

    const TABS = [
        ["products", "المنتجات"],
        ["ad", "الإعلان"],
        ["catalog", "الأقسام والألوان"],
        ["look", "المظهر"],
        ["texts", "النصوص"],
        ["order", "الطلب والتوصيل"],
        ["sales", "المبيعات"],
        ["contact", "التواصل والآراء"]
    ];

    const HEAD_FONTS = ["Reem Kufi", "Cairo", "El Messiri", "Lalezar", "Noto Kufi Arabic", "Amiri", "Changa", "Readex Pro", "IBM Plex Sans Arabic", "Tajawal"];
    const BODY_FONTS = ["IBM Plex Sans Arabic", "Cairo", "Tajawal", "Almarai", "Noto Sans Arabic", "Readex Pro", "Mada", "system"];

    const storage = {
        get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
        set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
        del(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
    };

    const toast = (msg) => ATHR.store.toast(msg);
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
        if (location.hash === "#admin" || location.hash === "#orders") location.hash = "#/";
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
                    <div class="adm-login-logo"><img src="${esc(config.logo_url || "images/logo.png")}" alt=""></div>
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
            sb.from("store_settings").select("config").eq("id", 1).maybeSingle(),
            sb.from("categories").select("id,name,slug,sort_order").order("sort_order", { ascending: true }),
            sb.from("products").select("id,name,price,old_price,category_id,image_url,is_available,is_visible,description,color_id,sort_order,video_url,created_at").order("sort_order", { ascending: true }),
            sb.from("product_media").select("product_id,media_type,media_url,sort_order").order("sort_order", { ascending: true })
        ]);
        const failed = [s, c, p, m].find((r) => r.error);
        if (failed) throw failed.error;

        const media = new Map();
        (m.data || []).forEach((row) => {
            if (!media.has(row.product_id)) media.set(row.product_id, []);
            media.get(row.product_id).push({ type: row.media_type === "video" ? "video" : "image", url: row.media_url });
        });

        A.server = {
            config: ATHR.fullConfig(s.data?.config || {}),
            categories: (c.data || []).map((x) => ({ id: x.id, name: x.name, slug: x.slug })),
            products: (p.data || []).map((x) => ({
                id: x.id,
                name: x.name || "",
                price: Number(x.price),
                old_price: x.old_price === null ? null : Number(x.old_price),
                category_id: x.category_id,
                image_url: x.image_url || "",
                is_available: x.is_available !== false,
                is_visible: x.is_visible !== false,
                description: x.description || "",
                color_id: x.color_id || "",
                video_url: x.video_url || "",
                media: media.get(x.id) || []
            }))
        };
    }

    function restoreDraft() {
        const saved = storage.get(DRAFT_KEY);
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
                    <h1>لوحة التحكم</h1>
                    <div class="adm-top-actions">
                        <button class="ab ab-light ab-sm" type="button" data-a="preview">معاينة المتجر</button>
                        <button class="adm-icon" type="button" data-a="account" aria-label="الحساب">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5"/></svg>
                        </button>
                        <button class="adm-icon" type="button" data-a="close" aria-label="إغلاق">×</button>
                    </div>
                </header>
                <nav class="adm-tabs" role="tablist" aria-label="أقسام اللوحة">
                    ${TABS.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${A.tab === id}">${label}</button>`).join("")}
                </nav>
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
    }

    function renderTab({ keepScroll = false } = {}) {
        const body = $("#admBody");
        if (!body) return;
        const scroll = body.scrollTop;
        $$(".adm-tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === A.tab)));
        const errors = A.errors.length ? `<div class="adm-errors" role="alert"><strong>لم يتم النشر. صحّح التالي:</strong><ul>${A.errors.map((e) => `<li><button type="button" class="adm-link" data-tab="${e.tab}">${esc(tabLabel(e.tab))}</button>: ${esc(e.msg)}</li>`).join("")}</ul></div>` : "";
        const banner = isDirty() && !A.errors.length ? `<div class="adm-note">لديك تعديلات غير منشورة. لن يراها الزبائن حتى تضغط «نشر التغييرات».</div>` : "";
        const views = { products: tabProducts, ad: tabAd, catalog: tabCatalog, look: tabLook, texts: tabTexts, order: tabOrder, sales: tabSales, contact: tabContact };
        body.innerHTML = errors + banner + views[A.tab]();
        if (keepScroll) body.scrollTop = scroll;
        else body.scrollTop = 0;
    }

    const tabLabel = (id) => (TABS.find((t) => t[0] === id) || [id, id])[1];

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
            ${current ? `<div class="up-prev">${/\.(mp4|webm|mov)(\?|$)/i.test(current) ? `<video src="${esc(current)}" muted playsinline></video>` : `<img src="${esc(current)}" alt="">`}</div>` : ""}
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
                    <button class="ab ab-primary ab-sm" type="button" data-a="add-product">+ إضافة منتج</button>
                </div>
                <input class="ai" type="search" id="productFilter" placeholder="ابحث باسم المنتج أو القسم" value="${esc(A.productFilter)}">
                <ul class="plist">
                    ${list.map(({ p, i }) => `
                        <li class="prow${p.is_visible ? "" : " is-hidden"}">
                            <img src="${esc(p.image_url || "images/logo2.jpeg")}" alt="" loading="lazy">
                            <div class="prow-info">
                                <b>${esc(p.name || "منتج بدون اسم")}</b>
                                <span class="adm-muted">${money(p.price)} · ${esc(catName(p.category_id))}${p.is_visible ? "" : " · مخفي"}${p.is_available ? "" : " · نفد"}</span>
                            </div>
                            <div class="prow-actions">
                                <button type="button" class="ab ab-soft ab-sm" data-edit="${esc(p.id)}">كل التفاصيل</button>
                                ${q ? "" : `<button type="button" class="ab-mini" data-move="products" data-i="${i}" data-dir="-1" aria-label="تحريك للأعلى"${i === 0 ? " disabled" : ""}>▲</button>
                                <button type="button" class="ab-mini" data-move="products" data-i="${i}" data-dir="1" aria-label="تحريك للأسفل"${i === products.length - 1 ? " disabled" : ""}>▼</button>`}
                                <button type="button" class="ab-mini" data-toggle-visible="${esc(p.id)}">${p.is_visible ? "إخفاء" : "إظهار"}</button>
                                <button type="button" class="ab-mini" data-copy-product="${esc(p.id)}">نسخ</button>
                                <button type="button" class="ab-mini danger" data-del-product="${esc(p.id)}">حذف</button>
                            </div>
                        </li>`).join("") || `<li class="adm-empty">لا توجد منتجات مطابقة.</li>`}
                </ul>
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
                    <small class="adm-muted">يفضّل صورة عمودية بنسبة 4:5.</small>
                </div>
                ${text(`${base}.name`, "اسم المنتج", { max: 120 })}
                <div class="two">
                    ${number(`${base}.price`, "السعر")}
                    ${number(`${base}.old_price`, "السعر قبل الخصم (اختياري)", { help: "يظهر مشطوباً بجانب السعر." })}
                </div>
                <div class="two">
                    ${select(`${base}.category_id`, "القسم", cats)}
                    ${select(`${base}.color_id`, "لون الكاسة", colors)}
                </div>
                ${area(`${base}.description`, "الوصف", { rows: 3 })}
                ${toggle(`${base}.is_visible`, "ظاهر في المتجر")}
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
                <button class="ab ab-primary ab-block" type="button" data-a="close-sheet">تم</button>
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
        }
    }

    function editProduct(id) {
        A.editing = id;
        openSheet(productEditor(id));
    }

    function addProduct() {
        const p = {
            id: crypto.randomUUID(),
            name: "",
            price: null,
            old_price: null,
            category_id: A.draft.categories[0]?.id || null,
            image_url: "",
            is_available: true,
            is_visible: true,
            description: "",
            color_id: cfg().colors[0]?.id || "",
            video_url: "",
            media: []
        };
        A.draft.products.unshift(p);
        A.productFilter = "";
        saveDraft();
        renderTab();
        editProduct(p.id);
    }

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
            placeholder: "https://  أو  #/c/clubs",
            help: ad.type === "text" ? "إن لم تكتب رابطاً، يفتح الزر قسم المنتجات." : "يمكنك وضع رابط قسم مثل #/c/clubs"
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
            <ul class="lst">${cats.map((c, i) => `<li class="lst-row">
                <input class="ai" data-bind="categories.#${esc(c.id)}.name" value="${esc(c.name)}" placeholder="اسم القسم" aria-label="اسم القسم">
                <span class="adm-muted nowrap">${counts.get(c.id) || 0} منتج</span>
                ${listControls("categories", i, cats.length)}
            </li>`).join("")}</ul>
            <button class="ab ab-ghost ab-sm" type="button" data-a="add-category">+ إضافة قسم</button>`, "رتّبها كما تريد ظهورها في المتجر. حذف قسم لا يحذف منتجاته، تصبح بدون قسم.")
        + card("ألوان الكاسات", `
            <ul class="lst">${colors.map((c, i) => `<li class="lst-row">
                <input type="color" data-bind="config.colors.${i}.hex" value="${esc(c.hex || "#ffffff")}" aria-label="درجة اللون">
                <input class="ai" data-bind="config.colors.${i}.name" value="${esc(c.name)}" placeholder="اسم اللون" aria-label="اسم اللون">
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
                ${toggle("config.show_name", "إظهار اسم المتجر بجانب الشعار")}
                ${select("config.logo_shape", "شكل الشعار", [["rounded", "زوايا مدوّرة"], ["circle", "دائري"], ["square", "مربع"]])}`)
            + card("الشكل العام", `
                ${select("config.theme.radius", "استدارة الزوايا", [["sharp", "حادة"], ["medium", "متوسطة"], ["round", "مدوّرة كثيراً"]])}
                ${select("config.theme.grid_mobile", "عدد المنتجات في الصف على الجوال", [["2", "منتجان"], ["1", "منتج واحد"]], { type: "number" })}
                ${toggle("config.theme.show_search", "إظهار البحث")}
                ${toggle("config.theme.show_sort", "إظهار الترتيب حسب السعر")}`)
            + card("الخطوط", `
                ${select("config.theme.font_head", "خط العناوين", HEAD_FONTS.map((f) => [f, f]))}
                ${select("config.theme.font_body", "خط النصوص", BODY_FONTS.map((f) => [f, f === "system" ? "خط الجهاز" : f]))}`)
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
                ${text("config.texts.hero_button", "نص الزر", { placeholder: d.hero_button, help: "اتركه فارغاً لإخفاء الزر.", max: 30 })}
                <div class="af"><span>المزايا الصغيرة تحت النص (حتى 6)</span>
                    <ul class="lst">${t.hero_features.map((f, i) => `<li class="lst-row">
                        <input class="ai" data-bind="config.texts.hero_features.${i}" value="${esc(f)}" aria-label="ميزة ${i + 1}" maxlength="40">
                        ${listControls("config.texts.hero_features", i, t.hero_features.length)}
                    </li>`).join("")}</ul>
                    ${t.hero_features.length < 6 ? `<button class="ab ab-ghost ab-sm" type="button" data-add-item="config.texts.hero_features">+ إضافة ميزة</button>` : ""}
                </div>`)
            + card("المنتجات والبحث", `
                ${text("config.texts.search_placeholder", "النص داخل خانة البحث", { placeholder: d.search_placeholder })}
                ${text("config.texts.all_label", "اسم قسم «الكل»", { placeholder: d.all_label })}
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
                ${area("config.texts.wa_last_line", "آخر سطر في رسالة واتساب (اختياري)", { rows: 2, placeholder: "مثال: شكراً لتسوقكم من متجر أثر ✨" })}`);
    }

    // =====================================================
    // TAB 6: ORDER & DELIVERY
    // =====================================================

    function tabOrder() {
        const o = cfg().order;
        const deliveries = o.delivery.map((d, i) => `<li class="item-card${d.enabled ? "" : " off"}">
            ${toggle(`config.order.delivery.${i}.enabled`, d.enabled ? "مفعّلة" : "متوقفة", { rerender: true })}
            ${text(`config.order.delivery.${i}.name`, "الاسم الذي يراه العميل")}
            <div class="two">
                ${select(`config.order.delivery.${i}.type`, "النوع", [["home", "توصيل إلى بيت العميل"], ["office", "استلام من مكتب (مثل مكتب جيناكم)"]])}
                ${number(`config.order.delivery.${i}.price`, "السعر")}
            </div>
            ${text(`config.order.delivery.${i}.note`, "شرح قصير (اختياري)")}
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
                ${extra}
                ${listControls("config.order.payments", i, o.payments.length)}
            </li>`;
        }).join("");

        return card("واتساب", text("config.order.whatsapp", "رقم واتساب الذي تصلك عليه الطلبات", { dir: "ltr", type: "tel", help: "اكتبه مع رمز الدولة. إن كتبت 8 أرقام فقط يُضاف رمز عُمان 968." }))
            + card("العملة", `<div class="two">
                ${text("config.order.currency", "رمز العملة", { max: 8 })}
                ${select("config.order.decimals", "عدد الخانات العشرية", [["3", "3 خانات (مثل 3.500)"], ["2", "خانتان"], ["1", "خانة واحدة"], ["0", "بدون كسور"]], { type: "number" })}
            </div>`)
            + card("التوصيل", `
                <ul class="items">${deliveries}</ul>
                <button class="ab ab-ghost ab-sm" type="button" data-add-item="config.order.delivery">+ إضافة طريقة توصيل</button>
                <hr>
                ${toggle("config.order.free_enabled", "توصيل مجاني عند حد معيّن", { rerender: true })}
                ${o.free_enabled ? number("config.order.free_min", "حد التوصيل المجاني (قيمة الطلب)", { help: "يُطبَّق على كل طرق التوصيل." }) : ""}
                <div class="af"><span>المحافظات المتاحة للتوصيل</span>
                    <ul class="lst">${o.governorates.map((g, i) => `<li class="lst-row">
                        <input class="ai" data-bind="config.order.governorates.${i}" value="${esc(g)}" aria-label="المحافظة">
                        ${listControls("config.order.governorates", i, o.governorates.length)}
                    </li>`).join("")}</ul>
                    <button class="ab ab-ghost ab-sm" type="button" data-add-item="config.order.governorates">+ إضافة محافظة</button>
                </div>`)
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

        return card("شريط الشحن المجاني", `
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
                ${area("config.sales.reminder_msg", "رسالة تذكير الطلبات في دفتر الطلبيات", { rows: 3, placeholder: d.reminder_msg, help: "{client} اسم العميل، {no} رقم الطلب، {total} المبلغ." })}`)
            + card("شارات الثقة", `
                ${toggle("config.sales.trust_show", "إظهار شارات الثقة تحت أزرار الشراء")}
                <p class="adm-muted">شارات تلقائية تُبنى من إعداداتك: تحويل بنكي مباشر، دفع إلكتروني آمن، الدفع عند الاستلام، توصيل داخل سلطنة عُمان، تواصل مباشر عبر واتساب.</p>
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
                ${text("config.contact.share_url", "رابط متجرك للمشاركة", { dir: "ltr", placeholder: "https://", help: "بدونه لا يظهر خيار «مشاركة المتجر» للزوار." })}`)
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
        "config.contact.reviews": () => ({ id: ATHR.uid("r-"), name: "", text: "", stars: 5, images: [], video: "" })
    };

    // =====================================================
    // UPLOADS
    // =====================================================

    const IMAGE_SIZES = { product: 1600, ad: 1800, hero: 1920, logo: 512, review: 1200 };

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
        if (t.dataset.bind) {
            bindValue(t);
            if (t.dataset.rerender !== undefined) {
                if (A.editing) refreshSheet();
                renderTab({ keepScroll: true });
            }
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
            renderTab();
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
                A.draft.categories.push({ id: crypto.randomUUID(), name: "", slug: "" });
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

        if (!String(c.name || "").trim()) add("look", "اسم المتجر فارغ.");
        if (!ATHR.isValidWhatsapp(c.order.whatsapp)) add("order", "رقم واتساب غير صحيح.");
        if (!String(c.order.currency || "").trim()) add("order", "رمز العملة فارغ.");
        if (c.order.free_enabled && !(num(c.order.free_min) && c.order.free_min > 0)) add("order", "حد التوصيل المجاني غير صحيح.");
        if (!(Number.isInteger(c.order.max_qty) && c.order.max_qty >= 1 && c.order.max_qty <= 99)) add("order", "أقصى كمية يجب أن تكون بين 1 و99.");
        if (!c.order.governorates.length) add("order", "لا توجد محافظة.");
        if (c.order.governorates.some((g) => !String(g || "").trim())) add("order", "توجد محافظة بلا اسم.");
        const deliveries = c.order.delivery.filter((d) => d.enabled);
        if (!deliveries.length) add("order", "لا توجد طريقة توصيل مفعّلة.");
        deliveries.forEach((d, i) => {
            if (!String(d.name || "").trim()) add("order", `طريقة توصيل مفعّلة بلا اسم (${i + 1}).`);
            if (!(num(d.price) && d.price >= 0)) add("order", `سعر توصيل غير صحيح في «${d.name || i + 1}».`);
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

        c.contact.reviews.forEach((r, i) => {
            if (!String(r.text || "").trim()) add("contact", `الرأي ${i + 1} بدون نص.`);
        });
        A.draft.categories.forEach((cat, i) => { if (!String(cat.name || "").trim()) add("catalog", `القسم ${i + 1} بلا اسم.`); });
        c.colors.forEach((col, i) => { if (!String(col.name || "").trim()) add("catalog", `اللون ${i + 1} بلا اسم.`); });

        A.draft.products.forEach((p, i) => {
            const label = p.name ? `«${p.name}»` : `المنتج ${i + 1}`;
            if (!String(p.name || "").trim()) add("products", `${label} بلا اسم.`);
            if (!(num(p.price) && p.price > 0)) add("products", `${label}: السعر يجب أن يزيد على صفر.`);
            if (p.old_price !== null && p.old_price !== undefined && !(num(p.old_price) && p.old_price > (p.price || 0))) {
                add("products", `${label}: السعر قبل الخصم يجب أن يكون أكبر من السعر.`);
            }
        });
        return errors;
    }

    async function publish() {
        if (A.busy) return;
        A.errors = validate();
        if (A.errors.length) {
            A.tab = A.errors[0].tab;
            renderTab();
            toast("لم يتم النشر، راجع الأخطاء");
            return;
        }
        A.busy = true;
        renderStatus();
        busyMessage("جاري النشر...");

        const draft = A.draft;
        const server = A.server;

        try {
            // 1) الإعدادات
            draft.config.order.whatsapp = ATHR.normalizePhone(draft.config.order.whatsapp);
            const cfgRes = await sb.from("store_settings").update({ config: draft.config }).eq("id", 1).select("id");
            if (cfgRes.error) throw cfgRes.error;
            if (!cfgRes.data || !cfgRes.data.length) throw new Error("no-permission");

            // 2) الأقسام
            const catRows = draft.categories.map((c, i) => ({
                id: c.id,
                name: c.name.trim(),
                slug: c.slug || `cat-${c.id.slice(0, 8)}`,
                sort_order: i + 1
            }));
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
            const prodRows = draft.products.map((p, i) => ({
                id: p.id,
                name: p.name.trim(),
                price: Number(p.price),
                old_price: p.old_price === null || p.old_price === undefined ? null : Number(p.old_price),
                category_id: p.category_id || null,
                image_url: p.image_url || null,
                is_available: p.is_available !== false,
                is_visible: p.is_visible !== false,
                description: p.description || null,
                color_id: p.color_id || null,
                video_url: p.video_url || null,
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
            toast("نُشرت التغييرات ✅");
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
        renderOrders();
    }

    async function loadOrders() {
        const { data, error } = await sb.from("orders").select("*").order("ordered_at", { ascending: false }).limit(1000);
        if (error) throw error;
        A.orders = data || [];
        A.ordersLoaded = true;
    }

    function renderOrders() {
        root().innerHTML = `
            <div class="adm-shell">
                <header class="adm-top">
                    <h1>دفتر الطلبيات</h1>
                    <div class="adm-top-actions">
                        <button class="ab ab-light ab-sm" type="button" data-a="open-panel">لوحة التحكم</button>
                        <button class="adm-icon" type="button" data-a="close" aria-label="إغلاق">×</button>
                    </div>
                </header>
                <div class="ob-tools">
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
                </div>
                <main class="adm-body" id="ordersBody"></main>
                <footer class="adm-foot ob-foot">
                    <button class="ab ab-ghost" type="button" data-a="orders-paste">لصق رسالة طلب من واتساب</button>
                    <button class="ab ab-primary" type="button" data-a="orders-manual">+ طلب يدوي</button>
                    <button class="ab ab-ghost" type="button" data-a="orders-close">إغلاق</button>
                </footer>
            </div>
            <div class="adm-sheet" id="admSheet" hidden></div>`;
        renderOrdersList();
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
            const hay = [o.order_no, o.customer_name, o.phone, o.wilaya, o.governorate, o.address, o.office, o.items_text,
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
                    <div><b dir="ltr">${esc(o.order_no)}</b> <span class="tag">${o.source === "web" ? "من المتجر" : o.source === "paste" ? "من واتساب" : "يدوي"}</span></div>
                    <span class="oc-wait${o.status === "new" ? " new" : ""}">${esc(waiting(o))}</span>
                </header>
                <p class="adm-muted oc-when">${esc(when.day)} ${esc(when.date)} — ${esc(when.time)}</p>
                <div class="oc-cust">
                    <b>${esc(o.customer_name || "بدون اسم")}</b>
                    ${o.phone ? `<span dir="ltr">${esc(o.phone)}</span>` : ""}
                    <span>${esc([o.governorate, o.wilaya].filter(Boolean).join(" — "))}</span>
                    ${o.address || o.office ? `<span>${o.office ? `المكتب: ${esc(o.office)}` : esc(o.address)}</span>` : ""}
                </div>
                <ul class="oc-items">${itemsList(o).map((l) => `<li>${esc(l.replace(/^•\s*/, ""))}</li>`).join("")}</ul>
                <div class="oc-sum">
                    ${Number(o.discount) > 0 ? `<span>خصم الباقة: -${money(o.discount)}</span>` : ""}
                    ${o.delivery_name ? `<span>${esc(o.delivery_name)}: ${Number(o.delivery_price) > 0 ? money(o.delivery_price) : "مجاني"}</span>` : ""}
                    <b>الإجمالي: ${money(o.total)}</b>
                </div>
                ${o.notes ? `<p class="oc-note">ملاحظة العميل: ${esc(o.notes)}</p>` : ""}
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
                    ${o.phone ? `<button type="button" class="ab-mini wa" data-order-wa="${esc(o.id)}">واتساب</button>` : ""}
                    ${o.status === "new" && o.phone ? `<button type="button" class="ab-mini" data-order-remind="${esc(o.id)}">تذكير بالطلب</button>` : ""}
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
        return ATHR.waLink(ATHR.localPhone(o.phone).length === 8 ? "968" + ATHR.localPhone(o.phone) : o.phone, text);
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
            `الاسم: ${o.customer_name || ""}`,
            `الهاتف: ${o.phone || ""}`,
            `المحافظة: ${o.governorate || ""}`
        ];
        if (o.wilaya) lines.push(`الولاية: ${o.wilaya}`);
        if (o.office) lines.push(`المكتب: ${o.office}`);
        else if (o.address) lines.push(`العنوان: ${o.address}`);
        if (o.notes) lines.push(`الملاحظات: ${o.notes}`);
        if (o.delivery_name) lines.push(`طريقة التوصيل: ${o.delivery_name}`);
        lines.push("المنتجات:", ...itemsList(o).map((l) => (l.startsWith("•") ? l : `• ${l}`)));
        if (Number(o.discount) > 0) lines.push(`خصم الباقة: -${money(o.discount)}`);
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
                <label class="af"><span>رقم الهاتف</span><input class="ai" name="phone" type="tel" dir="ltr" value="${esc(o ? o.phone || "" : "")}"></label>
                <div class="two">
                    <label class="af"><span>المحافظة</span><input class="ai" name="governorate" list="govList" value="${esc(o ? o.governorate || "" : "")}"></label>
                    <label class="af"><span>الولاية</span><input class="ai" name="wilaya" value="${esc(o ? o.wilaya || "" : "")}"></label>
                </div>
                <datalist id="govList">${c.order.governorates.map((g) => `<option value="${esc(g)}">`).join("")}</datalist>
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
            phone: ATHR.localPhone(v.phone) || null,
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
            return {
                order_no: noMatch ? noMatch[0].toUpperCase() : null,
                ordered_at: orderedAt,
                source: "paste",
                customer_name: get("الاسم") || null,
                phone: ATHR.localPhone(get("الهاتف")) || null,
                governorate: get("المحافظة") || null,
                wilaya: get("الولاية") || null,
                address: office ? null : (get("العنوان") || null),
                office: office || null,
                notes: get("الملاحظات") || null,
                delivery_name: get("طريقة التوصيل") || null,
                delivery_price: /مجاني/.test(deliveryText) ? 0 : parseNumber(deliveryText),
                discount: Math.abs(parseNumber(get("خصم الباقة"))),
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
