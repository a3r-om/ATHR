// =====================================================
// ATHR — تصميم صور المنتجات والإعلانات بالذكاء الاصطناعي
// يستقبل طلبًا من لوحة التحكم (المدير فقط)، ويقرأ مفتاح الذكاء الاصطناعي
// من قاعدة البيانات عبر المفتاح السري، ثم يعيد الصورة الناتجة.
// المفتاح لا يصل للمتصفح أبدًا.
// =====================================================

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI = "https://api.openai.com/v1";
const ASPECTS = ["1:1", "4:5", "5:4", "3:4", "4:3", "2:3", "3:2", "9:16", "16:9", "21:9"];
const MAX_IMAGES = 4;
const MAX_IMAGE_B64 = 7_000_000;
const DEADLINE_MS = 115_000;

class AiError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

function reply(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function envKey(jsonName: string, legacy: string): string {
    try {
        const all = JSON.parse(Deno.env.get(jsonName) || "{}");
        if (all && typeof all === "object") {
            if (typeof all.default === "string" && all.default) return all.default;
            const first = Object.values(all).find((v) => typeof v === "string" && v);
            if (first) return first as string;
        }
    } catch { /* fall back to the legacy key */ }
    return Deno.env.get(legacy) || "";
}

function apiHeaders(key: string, bearer?: string): Record<string, string> {
    const h: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
    if (bearer) h.Authorization = bearer;
    else if (!key.startsWith("sb_")) h.Authorization = `Bearer ${key}`;
    return h;
}

// المدير فقط: نتحقق بجلسة المستخدم نفسها (is_admin)
async function isAdmin(auth: string): Promise<boolean> {
    if (!/^Bearer\s+\S{20,}$/.test(auth)) return false;
    const key = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: "POST", headers: apiHeaders(key, auth), body: "{}" });
    if (!res.ok) return false;
    return (await res.json()) === true;
}

async function readSecret(provider: string): Promise<string> {
    const key = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ai_secret`, { method: "POST", headers: apiHeaders(key), body: JSON.stringify({ p: provider }) });
    if (!res.ok) throw new AiError("server", `secret lookup failed (${res.status})`, 500);
    const value = await res.json();
    return typeof value === "string" ? value : "";
}

type Img = { mime: string; data: string };

function cleanImages(list: unknown): Img[] {
    if (!Array.isArray(list)) return [];
    return list.slice(0, MAX_IMAGES).map((x) => {
        const mime = String((x as Img)?.mime || "image/jpeg").toLowerCase();
        const data = String((x as Img)?.data || "").replace(/^data:[^,]+,/, "");
        if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new AiError("bad_image", "unsupported image type");
        if (!data || data.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new AiError("bad_image", "invalid image data");
        return { mime, data };
    });
}

// ---------- Gemini (Nano Banana) ----------

let modelCache: { at: number; key: string; list: string[] } | null = null;

async function geminiModels(key: string): Promise<string[]> {
    const tag = key.slice(-6);
    if (modelCache && modelCache.key === tag && Date.now() - modelCache.at < 3_600_000) return modelCache.list;
    const found: string[] = [];
    let token = "";
    for (let page = 0; page < 5; page++) {
        const res = await fetch(`${GEMINI}/models?pageSize=1000${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`, { headers: { "x-goog-api-key": key } });
        if (res.status === 400 || res.status === 401 || res.status === 403) {
            const text = await res.text();
            if (/api[_ ]?key|permission|unauth|invalid/i.test(text)) throw new AiError("bad_key", "Gemini rejected the API key", 400);
            break;
        }
        if (!res.ok) break;
        const json = await res.json();
        for (const m of json.models || []) {
            const name = String(m.name || "").replace(/^models\//, "");
            const methods: string[] = m.supportedGenerationMethods || [];
            if (/image/i.test(name) && !/imagen|veo|embed|tts|audio/i.test(name) && methods.includes("generateContent")) found.push(name);
        }
        token = json.nextPageToken || "";
        if (!token) break;
    }
    modelCache = { at: Date.now(), key: tag, list: found };
    return found;
}

function rankGemini(list: string[], quality: string): string[] {
    const fast = quality === "fast";
    const score = (n: string) => {
        const version = Number((n.match(/(\d+(?:\.\d+)?)/) || [])[1] || 0);
        let s = version * 10;
        if (/pro/.test(n)) s += fast ? 1 : 8;
        else if (/lite/.test(n)) s += fast ? 4 : 0;
        else if (/flash|nano-banana/.test(n)) s += fast ? 8 : 5;
        if (/preview|exp/.test(n)) s -= 0.5;
        if (/generation/.test(n)) s -= 15;
        return s;
    };
    return [...new Set(list)].sort((a, b) => score(b) - score(a));
}

const GEMINI_FALLBACK = ["gemini-3-pro-image-preview", "gemini-3-pro-image", "gemini-3.1-flash-image-preview", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];

function pickImage(json: any): Img | null {
    for (const c of json?.candidates || []) {
        for (const part of c?.content?.parts || []) {
            const inline = part.inlineData || part.inline_data;
            if (inline?.data && !part.thought) return { mime: inline.mimeType || inline.mime_type || "image/png", data: inline.data };
        }
    }
    return null;
}

function blockedReason(json: any): string {
    const block = json?.promptFeedback?.blockReason;
    if (block) return String(block);
    const reason = json?.candidates?.[0]?.finishReason;
    if (reason && /SAFETY|PROHIBITED|BLOCK|RECITATION|IMAGE_SAFETY|SPII/i.test(reason)) return String(reason);
    return "";
}

async function geminiImage(key: string, prompt: string, images: Img[], aspect: string, quality: string, wanted: string, started: number) {
    let models: string[] = [];
    try {
        models = await geminiModels(key);
    } catch (error) {
        if (error instanceof AiError) throw error;
    }
    const ranked = rankGemini(models.length ? models : GEMINI_FALLBACK, quality);
    const order = wanted ? [wanted, ...ranked.filter((m) => m !== wanted)] : ranked;
    const parts = [...images.map((im) => ({ inline_data: { mime_type: im.mime, data: im.data } })), { text: prompt }];
    let lastError = "no image model available for this key";
    let lastCode = "no_model";

    for (const model of order.slice(0, 4)) {
        if (Date.now() - started > DEADLINE_MS) break;
        const big = /pro|3\.\d|nano-banana-2/.test(model);
        const configs = [
            { aspectRatio: aspect, ...(big ? { imageSize: "2K" } : {}) },
            { aspectRatio: aspect },
            null,
        ].filter((c, i, all) => i === 0 || JSON.stringify(c) !== JSON.stringify(all[i - 1]));
        for (const imageConfig of configs) {
            if (Date.now() - started > DEADLINE_MS) break;
            const body = {
                contents: [{ role: "user", parts }],
                generationConfig: { responseModalities: ["TEXT", "IMAGE"], ...(imageConfig ? { imageConfig } : {}) },
            };
            const res = await fetch(`${GEMINI}/models/${encodeURIComponent(model)}:generateContent`, {
                method: "POST",
                headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const text = await res.text();
            let json: any = null;
            try { json = JSON.parse(text); } catch { /* not json */ }
            if (res.ok) {
                const img = pickImage(json);
                if (img) return { ...img, model };
                const blocked = blockedReason(json);
                if (blocked) throw new AiError("blocked", blocked);
                lastCode = "no_image";
                lastError = String(json?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || "the model returned no image").slice(0, 300);
                break;
            }
            const message = String(json?.error?.message || text).slice(0, 300);
            if (res.status === 401 || res.status === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) throw new AiError("bad_key", message);
            if (res.status === 404) { lastCode = "no_model"; lastError = message; break; }
            if (res.status === 429) { lastCode = /billing|free tier|limit: 0|quota/i.test(message) ? "billing" : "quota"; lastError = message; break; }
            if (res.status === 400 && imageConfig && /image_?config|image_?size|aspect|invalid argument|unknown name/i.test(message)) { lastError = message; continue; }
            if (res.status === 400 && /billing|FAILED_PRECONDITION|not available in your country|location/i.test(message)) throw new AiError("billing", message);
            lastCode = "failed";
            lastError = message;
            break;
        }
    }
    throw new AiError(lastCode, lastError, 502);
}

// ---------- OpenAI (GPT Image) ----------

function b64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function openaiImage(key: string, prompt: string, images: Img[], aspect: string, quality: string, wanted: string, started: number) {
    const [w, h] = aspect.split(":").map(Number);
    const size = w === h ? "1024x1024" : w > h ? "1536x1024" : "1024x1536";
    const models = [...new Set([wanted, "gpt-image-2", "gpt-image-1.5", "gpt-image-1"].filter(Boolean))];
    let lastError = "image generation failed";
    let lastCode = "failed";
    for (const model of models) {
        if (Date.now() - started > DEADLINE_MS) break;
        let res: Response;
        if (images.length) {
            const form = new FormData();
            images.forEach((im, i) => form.append("image[]", new Blob([b64ToBytes(im.data)], { type: im.mime }), `ref-${i}.${im.mime.split("/")[1].replace("jpeg", "jpg")}`));
            form.append("model", model);
            form.append("prompt", prompt);
            form.append("size", size);
            form.append("quality", quality === "fast" ? "medium" : "high");
            form.append("n", "1");
            res = await fetch(`${OPENAI}/images/edits`, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
        } else {
            res = await fetch(`${OPENAI}/images/generations`, {
                method: "POST",
                headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model, prompt, size, quality: quality === "fast" ? "medium" : "high", n: 1 }),
            });
        }
        const text = await res.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch { /* not json */ }
        if (res.ok) {
            const b64 = json?.data?.[0]?.b64_json;
            if (b64) return { mime: "image/png", data: b64, model };
            lastCode = "no_image";
            lastError = "the model returned no image";
            continue;
        }
        const message = String(json?.error?.message || text).slice(0, 300);
        if (res.status === 401) throw new AiError("bad_key", message);
        if (/safety|moderation|content_policy/i.test(message)) throw new AiError("blocked", message);
        if (res.status === 429 || /billing|quota|insufficient/i.test(message)) throw new AiError(/billing|insufficient|hard limit/i.test(message) ? "billing" : "quota", message);
        if (res.status === 404 || /model/i.test(message)) { lastCode = "no_model"; lastError = message; continue; }
        lastError = message;
        if (res.status === 403) { lastCode = "no_model"; continue; }
        break;
    }
    throw new AiError(lastCode, lastError, 502);
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") return reply({ error: "method" }, 405);
    const started = Date.now();
    try {
        if (!(await isAdmin(req.headers.get("Authorization") || ""))) return reply({ error: "not_admin" }, 401);
        let body: any;
        try { body = await req.json(); } catch { throw new AiError("bad_request", "invalid JSON"); }
        const provider = body?.provider === "openai" ? "openai" : "gemini";
        const prompt = String(body?.prompt || "").trim().slice(0, 6000);
        if (prompt.length < 10) throw new AiError("bad_request", "prompt is too short");
        const aspect = ASPECTS.includes(body?.aspect) ? body.aspect : "1:1";
        const quality = body?.quality === "fast" ? "fast" : "best";
        const wanted = /^[a-z0-9.\-]{3,60}$/i.test(String(body?.model || "")) ? String(body.model) : "";
        const images = cleanImages(body?.images);

        const key = await readSecret(provider);
        if (!key) return reply({ error: "no_key", provider }, 400);

        const out = provider === "openai"
            ? await openaiImage(key, prompt, images, aspect, quality, wanted, started)
            : await geminiImage(key, prompt, images, aspect, quality, wanted, started);
        return reply({ image: out.data, mime: out.mime, model: out.model, provider, ms: Date.now() - started });
    } catch (error) {
        if (error instanceof AiError) return reply({ error: error.code, detail: error.message }, error.status);
        console.error(error);
        return reply({ error: "failed", detail: String((error as Error)?.message || error).slice(0, 300) }, 500);
    }
});
