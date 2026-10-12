// دالة الخادم: كتابة نصوص المتجر بالذكاء الاصطناعي (وصف المنتجات ورسائل العروض)
// - تقبل الطلب من مدير المتجر فقط (تتحقق بنفسها عبر is_admin)
// - تقرأ مفتاح Gemini أو OpenAI من قاعدة البيانات بالمفتاح السري، ولا يصل المفتاح للمتصفح أبداً
// - تختار أحدث نموذج سريع متاح للمفتاح تلقائياً، حتى لا تتعطل عند تغيّر أسماء النماذج

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

// مفاتيح المشروع: الجديدة (JSON) أو القديمة
function envKey(jsonName: string, legacy: string): string {
  try {
    const all = JSON.parse(Deno.env.get(jsonName) || "{}");
    if (all && typeof all === "object") {
      if (typeof all.default === "string" && all.default) return all.default;
      const first = Object.values(all).find((v) => typeof v === "string" && v);
      if (first) return first as string;
    }
  } catch { /* نرجع للمفتاح القديم */ }
  return Deno.env.get(legacy) || "";
}
const PUBLIC_KEY = envKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
const SECRET_KEY = envKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function rpc(name: string, args: Record<string, unknown>, key: string, bearer?: string) {
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (bearer) headers.Authorization = bearer;
  else if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: "POST", headers, body: JSON.stringify(args) });
  if (!res.ok) return null;
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

// ---------- اختيار النموذج ----------
const modelCache: Record<string, { id: string; at: number }> = {};

async function geminiModel(key: string) {
  const c = modelCache.gemini;
  if (c && Date.now() - c.at < 6 * 3600e3) return c.id;
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
    if (r.ok) {
      const data = await r.json();
      const names: string[] = (data.models || [])
        .filter((m: { supportedGenerationMethods?: string[] }) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: { name: string }) => String(m.name).replace(/^models\//, ""));
      const ver = (n: string) => { const m = n.match(/^gemini-(\d+(?:\.\d+)?)-flash$/); return m ? parseFloat(m[1]) : -1; };
      const best = names.filter((n) => ver(n) > 0).sort((a, b) => ver(b) - ver(a))[0]
        || names.find((n) => n === "gemini-flash-latest")
        || names.find((n) => /flash/.test(n) && !/lite|image|tts|live|audio|exp|preview/.test(n))
        || names.find((n) => /^gemini/.test(n));
      if (best) { modelCache.gemini = { id: best, at: Date.now() }; return best; }
    }
  } catch { /* نكمل بالاسم العام */ }
  return "gemini-flash-latest";
}

async function openaiModel(key: string) {
  const c = modelCache.openai;
  if (c && Date.now() - c.at < 6 * 3600e3) return c.id;
  try {
    const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (r.ok) {
      const ids: string[] = ((await r.json()).data || []).map((m: { id: string }) => m.id);
      const ver = (n: string) => { const m = n.match(/^gpt-(\d+(?:\.\d+)?)o?-mini$/); return m ? parseFloat(m[1]) : -1; };
      const best = ids.filter((n) => ver(n) > 0).sort((a, b) => ver(b) - ver(a))[0] || ids.find((n) => /^gpt-.*mini/.test(n));
      if (best) { modelCache.openai = { id: best, at: Date.now() }; return best; }
    }
  } catch { /* نكمل بالاسم العام */ }
  return "gpt-4o-mini";
}

class ProviderError extends Error {
  constructor(public code: string, public status = 0) { super(code); }
}

async function generate(provider: string, key: string, system: string, user: string) {
  if (provider === "gemini") {
    const model = await geminiModel(key);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new ProviderError("rate_limit", 429);
      if (res.status === 400 && /API key|API_KEY/i.test(body)) throw new ProviderError("bad_key", 400);
      if (res.status === 403 || res.status === 401) throw new ProviderError("bad_key", res.status);
      throw new ProviderError("provider", res.status);
    }
    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
  }
  const model = await openaiModel(key);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new ProviderError("rate_limit", 429);
    if (res.status === 401 || res.status === 403) throw new ProviderError("bad_key", res.status);
    throw new ProviderError("provider", res.status);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJson(text: string) {
  const raw = String(text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(raw); } catch { /* نحاول قص أول كائن */ }
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* فشل */ } }
  return null;
}

// ---------- المهام ----------
const DESCRIBE_SYSTEM = `أنت كاتب محتوى لمتجر إلكتروني عُماني اسمه «{store}» يبيع أكواباً ومجات ومحافظ مطبوعة بتصاميم الأندية والشخصيات والعبارات.
اكتب لكل منتج وصفاً قصيراً جذاباً للزبون:
- بالعربية الفصحى السهلة القريبة من أهل الخليج، جملتان أو ثلاث (بين 120 و 260 حرفاً).
- استخدم المعلومات المعطاة فقط (الاسم، القسم، وصف القسم، اللون). لا تخترع مقاساً أو سعة أو مادة أو سعراً أو خصماً غير مذكور.
- اذكر لمن يناسب أو كهدية إن كان مناسباً، وبدون إيموجي أو هاشتاق أو علامات تنصيص.
- واكتب نسخة إنجليزية طبيعية بنفس المعنى (en).
أرجع JSON فقط بهذا الشكل: {"items":[{"id":"...","ar":"...","en":"..."}]}`;

const OFFER_SYSTEM = `أنت كاتب رسائل تسويق عبر واتساب لمتجر عُماني اسمه «{store}».
اكتب رسالة عرض واحدة جذابة ومحترمة بلهجة خليجية خفيفة:
- من 5 إلى 9 أسطر قصيرة، مع إيموجي مناسبة بدون مبالغة، واكتب الكلمات المهمة بين نجمتين *هكذا* (تنسيق واتساب).
- استخدم هذه المتغيرات حرفياً كما هي ولا تكتب قيمها: {name} اسم العميل (مرة واحدة في البداية)، و{link} الرابط في آخر سطر وحده.
- إذا أُعطيت منتجاً استخدم أيضاً {product} و{price}، و{old} و{pct} إن كان عليه خصم، و{ends} إن كانت للعرض مدة. لا تكتب أرقاماً أو أسعاراً بنفسك.
- بدون وعود غير صحيحة، وبدون روابط أو أرقام هواتف.
أرجع JSON فقط بهذا الشكل: {"text":"..."}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S{20,}$/.test(auth)) return json({ error: "not_admin" }, 401);
  const isAdmin = await rpc("is_admin", {}, PUBLIC_KEY, auth);
  if (isAdmin !== true) return json({ error: "not_admin" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  // المزود: المطلوب، أو أول مفتاح محفوظ
  const wanted = body.provider === "openai" ? ["openai", "gemini"] : ["gemini", "openai"];
  let provider = "";
  let key = "";
  for (const p of wanted) {
    const k = await rpc("ai_secret", { p }, SECRET_KEY);
    if (typeof k === "string" && k.length >= 20) { provider = p; key = k; break; }
  }
  if (!key) return json({ error: "no_key" }, 400);

  const store = clip(body.store, 40) || "أثر";
  try {
    if (body.task === "describe") {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 8).map((x: Record<string, unknown>) => ({
        id: clip(x.id, 64), name: clip(x.name, 120), name_en: clip(x.name_en, 120), category: clip(x.category, 80),
        category_desc: clip(x.category_desc, 300), color: clip(x.color, 40),
      })).filter((x) => x.id && x.name);
      if (!items.length) return json({ error: "bad_request" }, 400);
      const text = await generate(provider, key, DESCRIBE_SYSTEM.replace("{store}", store), `المنتجات:\n${JSON.stringify(items)}`);
      const out = parseJson(text);
      const list = Array.isArray(out?.items) ? out.items : [];
      const clean = list
        .map((x: Record<string, unknown>) => ({ id: clip(x.id, 64), ar: clip(x.ar, 500), en: clip(x.en, 500) }))
        .filter((x: { id: string; ar: string }) => x.id && x.ar && items.some((i) => i.id === x.id));
      if (!clean.length) return json({ error: "empty" }, 502);
      return json({ items: clean, provider });
    }

    if (body.task === "offer") {
      const p = (body.product || null) as Record<string, unknown> | null;
      const info = p
        ? { product: clip(p.name, 120), has_discount: Boolean(p.pct), has_end_time: Boolean(body.ends) }
        : { general: true, note: clip(body.note, 200) };
      const style = clip(body.style, 60);
      const text = await generate(provider, key, OFFER_SYSTEM.replace("{store}", store), `${JSON.stringify(info)}\nأسلوب الرسالة: ${style || "عرض خاص"}`);
      const out = parseJson(text);
      let msg = String(out?.text || "").trim().slice(0, 900);
      if (!msg) return json({ error: "empty" }, 502);
      if (!msg.includes("{link}")) msg += "\n{link}";
      return json({ text: msg, provider });
    }
  } catch (e) {
    if (e instanceof ProviderError) return json({ error: e.code, status: e.status }, 502);
    console.error(e);
    return json({ error: "server" }, 500);
  }
  return json({ error: "bad_request" }, 400);
});
