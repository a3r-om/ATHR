/* =====================================================
   ATHR STORE — نقل المنتجات من المتجر القديم (مرة واحدة)
   يقرأ البيانات العامة من المتجر السابق وينسخها مع الصور
   إلى قاعدة بيانات هذا المتجر. لا يغيّر شيئًا في المتجر القديم.
===================================================== */

const OLD_STORE = {
    url: "https://ojhnobjphdrwlpxerlco.supabase.co",
    key: "sb_publishable_q-EqL8SXNZpTRt1hEmslBA_xhGF5d18"
};

let importRunning = false;
let importShowingResult = false;

function refreshImportBox() {
    const box = $("importBox");
    if (!box) return;

    const sameProject = typeof ATHR_SUPABASE_URL !== "undefined" && ATHR_SUPABASE_URL === OLD_STORE.url;
    const show = importRunning || importShowingResult || (!sameProject && allProducts.length === 0);

    box.classList.toggle("hidden", !show);
}

function setImportProgress(done, total, text) {
    $("importProgress")?.classList.remove("hidden");
    const bar = $("importBar");
    if (bar) bar.style.width = total ? `${Math.round((done / total) * 100)}%` : "0%";
    const status = $("importStatus");
    if (status) status.textContent = text;
}

async function runPool(items, size, worker) {
    let next = 0;
    const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
        while (next < items.length) {
            const item = items[next++];
            await worker(item);
        }
    });
    await Promise.all(runners);
}

function isOldStoreFile(url) {
    return typeof url === "string" && url.startsWith(`${OLD_STORE.url}/storage/`);
}

// ينسخ ملفًا من مخزن المتجر القديم إلى مخزن هذا المتجر ويعيد رابطه الجديد
async function copyOldStoreFile(url) {
    if (!isOldStoreFile(url)) return url;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`download ${response.status}`);

    const blob = await response.blob();
    const type = blob.type || "image/jpeg";
    const ext = ((type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "") || "jpg").toLowerCase();
    const path = `${Date.now()}-${crypto.randomUUID().replaceAll("-", "")}.${ext}`;

    const { error } = await athrSupabase.storage
        .from(BUCKET)
        .upload(path, blob, { cacheControl: "3600", upsert: false, contentType: type });

    if (error) throw error;

    return athrSupabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function runImport() {
    if (importRunning) return;

    const ok = window.confirm("سيتم نقل الأقسام والمنتجات والصور من متجرك القديم إلى هذا المتجر. متابعة؟");
    if (!ok) return;

    const importBtn = $("importBtn");
    const closeBtn = $("importCloseBtn");
    const intro = $("importIntro");

    importRunning = true;
    importShowingResult = false;
    importBtn.disabled = true;
    importBtn.textContent = "جاري النقل...";
    closeBtn.classList.add("hidden");
    refreshImportBox();

    const old = window.supabase.createClient(OLD_STORE.url, OLD_STORE.key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "athr-old-store" }
    });

    const report = { categories: 0, products: 0, media: 0, skipped: 0, fileErrors: 0, rowErrors: 0, whatsapp: false };

    try {
        setImportProgress(0, 1, "جاري قراءة المتجر القديم...");

        const [catsRes, prodsRes, mediaRes, settingsRes] = await Promise.all([
            old.from("categories").select("*").order("created_at", { ascending: true }),
            old.from("products").select("*").order("created_at", { ascending: true }),
            old.from("product_media").select("*").order("sort_order", { ascending: true }),
            old.from("store_settings").select("whatsapp_message").eq("id", 1).maybeSingle()
        ]);

        if (catsRes.error) throw catsRes.error;
        if (prodsRes.error) throw prodsRes.error;

        const oldCategories = catsRes.data || [];
        const oldProducts = prodsRes.data || [];
        const oldMedia = mediaRes.error ? [] : (mediaRes.data || []);

        const total = oldCategories.length + oldProducts.length + oldMedia.length;
        let done = 0;
        const step = (label) => {
            done += 1;
            setImportProgress(done, total, `${label} (${done} من ${total})`);
        };

        // ---------- الأقسام ----------
        const { data: currentCats, error: currentCatsError } = await athrSupabase
            .from("categories")
            .select("id, slug");
        if (currentCatsError) throw currentCatsError;

        const categoryMap = {};
        const slugToId = Object.fromEntries((currentCats || []).map(c => [c.slug, c.id]));

        for (const cat of oldCategories) {
            if (slugToId[cat.slug]) {
                categoryMap[cat.id] = slugToId[cat.slug];
                step("الأقسام");
                continue;
            }

            let imageUrl = cat.image_url || null;
            if (imageUrl) {
                try { imageUrl = await copyOldStoreFile(imageUrl); } catch (e) { report.fileErrors++; console.warn(e); }
            }

            const { data, error } = await athrSupabase
                .from("categories")
                .insert({ name: cat.name, slug: cat.slug, image_url: imageUrl, created_at: cat.created_at })
                .select("id")
                .single();

            if (error) {
                report.rowErrors++;
                console.error("Category import error:", cat, error);
            } else {
                categoryMap[cat.id] = data.id;
                slugToId[cat.slug] = data.id;
                report.categories++;
            }
            step("الأقسام");
        }

        // ---------- المنتجات ----------
        const { data: currentProducts } = await athrSupabase
            .from("products")
            .select("id, name, created_at");

        const productKey = (p) => `${p.name}|${new Date(p.created_at).getTime()}`;
        const existing = Object.fromEntries((currentProducts || []).map(p => [productKey(p), p.id]));
        const productMap = {};

        await runPool(oldProducts, 4, async (product) => {
            const key = productKey(product);

            if (existing[key]) {
                productMap[product.id] = existing[key];
                report.skipped++;
                step("المنتجات");
                return;
            }

            let imageUrl = product.image_url || null;
            if (imageUrl) {
                try { imageUrl = await copyOldStoreFile(imageUrl); } catch (e) { report.fileErrors++; console.warn(e); }
            }

            const { data, error } = await athrSupabase
                .from("products")
                .insert({
                    name: product.name,
                    price: product.price,
                    old_price: product.old_price ?? null,
                    category_id: categoryMap[product.category_id] || null,
                    image_url: imageUrl,
                    is_best_seller: Boolean(product.is_best_seller),
                    is_new_arrival: Boolean(product.is_new_arrival),
                    is_available: product.is_available !== false,
                    created_at: product.created_at
                })
                .select("id")
                .single();

            if (error) {
                report.rowErrors++;
                console.error("Product import error:", product, error);
            } else {
                productMap[product.id] = data.id;
                report.products++;
            }
            step("المنتجات وصورها");
        });

        // ---------- الصور والفيديوهات الإضافية ----------
        await runPool(oldMedia, 3, async (media) => {
            const productId = productMap[media.product_id];

            if (!productId || existingMediaFor(productId)) {
                step("الصور الإضافية");
                return;
            }

            let url = media.media_url;
            try { url = await copyOldStoreFile(url); } catch (e) { report.fileErrors++; console.warn(e); }

            const { error } = await athrSupabase.from("product_media").insert({
                product_id: productId,
                media_type: media.media_type === "video" ? "video" : "image",
                media_url: url,
                sort_order: media.sort_order ?? 0
            });

            if (error) {
                report.rowErrors++;
                console.error("Media import error:", media, error);
            } else {
                report.media++;
            }
            step("الصور الإضافية");
        });

        // ---------- رسالة واتساب ----------
        const oldMessage = settingsRes.data?.whatsapp_message;
        if (oldMessage) {
            const { error } = await athrSupabase
                .from("store_settings")
                .update({ whatsapp_message: oldMessage })
                .eq("id", 1);
            report.whatsapp = !error;
            if (typeof loadWhatsappMessage === "function") loadWhatsappMessage();
        }

        setImportProgress(total, total, "اكتمل النقل");

        const parts = [`تم نقل ${report.products} منتج و${report.categories} قسم`];
        if (report.media) parts.push(`و${report.media} صورة/فيديو إضافي`);
        let summary = parts.join(" ") + " ✅";
        if (report.skipped) summary += ` (${report.skipped} منتج كان منقولًا مسبقًا)`;
        if (report.fileErrors) summary += `\nتعذر نسخ ${report.fileErrors} ملف، وبقي مرتبطًا بالمتجر القديم.`;
        if (report.rowErrors) summary += `\nتعذر نقل ${report.rowErrors} عنصر. اضغط «إعادة المحاولة» لإكمالها.`;

        intro.textContent = summary;
        importBtn.textContent = report.rowErrors ? "إعادة المحاولة" : "تم";
        importBtn.disabled = !report.rowErrors;
        showToast("اكتمل نقل المنتجات");
    } catch (error) {
        console.error("Import error:", error);
        intro.textContent = "تعذر قراءة المتجر القديم. تأكد من الإنترنت وحاول مرة أخرى.";
        importBtn.textContent = "إعادة المحاولة";
        importBtn.disabled = false;
        setImportProgress(0, 1, "");
    } finally {
        importRunning = false;
        importShowingResult = true;
        closeBtn.classList.remove("hidden");
        await loadCategories();
        await loadProducts();
    }
}

// صور المنتج الإضافية الموجودة قبل بدء النقل (لتجنب التكرار عند إعادة المحاولة)
let mediaBeforeImport = null;
function existingMediaFor(productId) {
    return Boolean(mediaBeforeImport && mediaBeforeImport.has(productId));
}

$("importBtn")?.addEventListener("click", async () => {
    const { data } = await athrSupabase.from("product_media").select("product_id");
    mediaBeforeImport = new Set((data || []).map(row => row.product_id));
    runImport();
});

$("importCloseBtn")?.addEventListener("click", () => {
    importShowingResult = false;
    refreshImportBox();
});
