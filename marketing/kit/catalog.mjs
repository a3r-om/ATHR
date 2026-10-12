// يبني قائمة منتجات للتصاميم من صفحات المنتجات الجاهزة في المستودع (بدون قاعدة البيانات)
// الاستخدام: node marketing/kit/catalog.mjs > marketing/kit/catalog.json
// لكل منتج: الاسم، اللون، القسم، السعر، السعر قبل الخصم، ونسخة الصورة المصغرة المحلية (960px)
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "js/defaults.js"), "utf8");
const ATHR = {};
vm.runInNewContext(src.match(/ATHR\.hashStr = [\s\S]*?\n\};/)[0], { ATHR, Math });

const out = [];
for (const slug of fs.readdirSync(path.join(ROOT, "p"))) {
    const file = path.join(ROOT, "p", slug, "index.html");
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)]
        .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
        .find((x) => x && x["@type"] === "Product");
    if (!ld) continue;
    const image = (ld.image || [])[0] || "";
    const h = image ? ATHR.hashStr(image) : "";
    const thumb = h && fs.existsSync(path.join(ROOT, `images/t/${h}-m.webp`)) ? `images/t/${h}-m.webp` : "";
    const was = (html.match(/<s class="pp-was">([\d.]+)/) || [])[1] || "";
    out.push({
        slug,
        name: String(ld.name || "").replace(/\s*\([^)]*\)\s*$/, ""),
        full_name: ld.name,
        color: ld.color || "",
        category: ld.category || "",
        price: Number(ld.offers && ld.offers.price) || 0,
        old_price: Number(was) || null,
        in_stock: !/OutOfStock/.test((ld.offers && ld.offers.availability) || ""),
        image,
        thumb
    });
}
out.sort((a, b) => a.category.localeCompare(b.category, "ar") || a.full_name.localeCompare(b.full_name, "ar"));
process.stdout.write(JSON.stringify(out, null, 1) + "\n");
