// دالة الخادم: بيانات خاصة بمدير المتجر (المصاريف)
// - تقبل الطلب من مدير المتجر فقط (تتحقق بنفسها عبر is_admin)
// - تحفظ البيانات كملف JSON في مخزن خاص (athr-private) لا يصل له الزوار ولا ينفتح برابط عام
// - كل حفظ يحمل رقم نسخة (rev) حتى ما يمسح جهاز تعديلات جهاز ثاني

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const BUCKET = "athr-private";
const DOCS = ["expenses"];
const CATS = ["stock", "pack", "ship", "ads", "subs", "other"];

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

function headers(key: string, bearer?: string): Record<string, string> {
  const h: Record<string, string> = { apikey: key };
  if (bearer) h.Authorization = bearer;
  else if (!key.startsWith("sb_")) h.Authorization = `Bearer ${key}`;
  return h;
}

async function isAdmin(auth: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: "POST", headers: { ...headers(PUBLIC_KEY, auth), "Content-Type": "application/json" }, body: "{}",
  });
  if (!res.ok) return false;
  try { return (await res.json()) === true; } catch { return false; }
}

// يرجّع المستند، أو null إذا ما انحفظ شي للحين، أو يرمي خطأ إذا تعذرت القراءة
async function readDoc(doc: string): Promise<{ rev: number; saved_at?: string; data: unknown } | null> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${doc}.json?t=${Date.now()}`, { headers: headers(SECRET_KEY) });
  if (res.ok) {
    const out = await res.json();
    return { rev: Number(out?.rev) || 0, saved_at: out?.saved_at, data: out?.data ?? null };
  }
  const text = await res.text();
  if (res.status === 404 || (res.status === 400 && /not.?found/i.test(text))) return null;
  throw new Error(`read_${res.status}`);
}

async function writeDoc(doc: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${doc}.json`, {
    method: "POST",
    headers: { ...headers(SECRET_KEY), "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`write_${res.status}`);
}

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

// تنظيف المصاريف قبل الحفظ
function cleanExpenses(data: unknown) {
  const items = (data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items))
    ? (data as { items: Record<string, unknown>[] }).items : [];
  const seen = new Set<string>();
  const out = [];
  for (const x of items.slice(0, 5000)) {
    if (!x || typeof x !== "object") continue;
    const id = String(x.id ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    const d = String(x.d ?? "");
    const a = Math.round(Number(x.a) * 1000) / 1000;
    if (!id || seen.has(id) || !DAY.test(d) || !(a > 0 && a < 100000)) continue;
    seen.add(id);
    const item: Record<string, unknown> = { id, d, a, c: CATS.includes(String(x.c)) ? String(x.c) : "other" };
    const n = String(x.n ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (n) item.n = n;
    if (x.m === true) {
      item.m = true;
      if (MONTH.test(String(x.u ?? ""))) item.u = String(x.u);
    }
    out.push(item);
  }
  return { items: out };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S{20,}$/.test(auth)) return json({ error: "not_admin" }, 401);
  if (!(await isAdmin(auth))) return json({ error: "not_admin" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const doc = String(body.doc || "");
  if (!DOCS.includes(doc)) return json({ error: "bad_request" }, 400);

  try {
    const current = await readDoc(doc);
    if (body.action === "get") return json({ rev: current?.rev || 0, saved_at: current?.saved_at || null, data: current?.data ?? null });

    if (body.action === "put") {
      const rev = current?.rev || 0;
      if (Number(body.rev) !== rev) return json({ error: "conflict", rev, data: current?.data ?? null }, 409);
      const data = cleanExpenses(body.data);
      const next = { rev: rev + 1, saved_at: new Date().toISOString(), data };
      if (JSON.stringify(next).length > 900_000) return json({ error: "too_big" }, 413);
      await writeDoc(doc, next);
      return json({ rev: next.rev, saved_at: next.saved_at, data });
    }
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
  return json({ error: "bad_request" }, 400);
});
