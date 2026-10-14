// دالة الخادم: إشعارات العروض (Web Push)
// - الزائر يشترك من التطبيق (بدون تسجيل دخول): نحفظ اشتراكه في المخزن الخاص athr-private (ملف لكل جهاز)
// - المدير فقط يرسل الإشعار للكل أو لجهازه للتجربة، ونشيل الاشتراكات المنتهية تلقائياً
// - مفاتيح VAPID تنولد هنا أول مرة وتنحفظ في المخزن الخاص، والمفتاح السري ما يطلع من الخادم أبداً
// - التشفير حسب RFC 8291 (aes128gcm) والتوقيع حسب RFC 8292، بأدوات WebCrypto فقط

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const BUCKET = "athr-private";
const SUBJECT = "https://a3r-om.github.io/ATHR/";
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|push\.apple\.com|notify\.windows\.com)$/;

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

// ---------- أدوات ----------
const enc = new TextEncoder();
export function b64u(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(str: string): Uint8Array {
  const s = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
async function sha256hex(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- التشفير (RFC 8291) ----------
// asKeys و salt اختيارية للاختبار بالقيم الثابتة في RFC
export async function encryptPayload(
  payload: Uint8Array, p256dh: string, auth: string,
  asKeys?: { privateKey: CryptoKey; publicRaw: Uint8Array }, salt?: Uint8Array,
): Promise<Uint8Array> {
  const uaPublic = unb64u(p256dh);
  const authSecret = unb64u(auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error("bad_keys");
  let as = asKeys;
  if (!as) {
    const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
    as = { privateKey: kp.privateKey, publicRaw: new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey)) };
  }
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(authSecret, ecdh);
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, as.publicRaw, new Uint8Array([1]));
  const ikm = await hmac(prkKey, keyInfo);
  const s = salt || crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(s, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const aes = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const padded = concat(payload, new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, padded));
  const header = new Uint8Array(21);
  header.set(s, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = 65;
  return concat(header, as.publicRaw, cipher);
}

// ---------- VAPID (RFC 8292) ----------
type Vapid = { publicKey: string; jwk: JsonWebKey };
let vapidCache: Vapid | null = null;
const jwtCache = new Map<string, { token: string; exp: number }>();

async function storageGet(path: string): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}?t=${Date.now()}`, { headers: headers(SECRET_KEY) });
}
async function storagePut(path: string, body: unknown, upsert = true): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers(SECRET_KEY), "Content-Type": "application/json", "x-upsert": upsert ? "true" : "false", "cache-control": "no-cache" },
    body: JSON.stringify(body),
  });
}
async function storageDelete(paths: string[]) {
  if (!paths.length) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: "DELETE", headers: { ...headers(SECRET_KEY), "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: paths }),
  });
}
const notFound = async (res: Response) => res.status === 404 || (res.status === 400 && /not.?found/i.test(await res.clone().text()));

async function getVapid(): Promise<Vapid> {
  if (vapidCache) return vapidCache;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await storageGet("keys/vapid.json");
    if (res.ok) { vapidCache = await res.json(); return vapidCache!; }
    if (!(await notFound(res))) throw new Error(`vapid_read_${res.status}`);
    // أول مرة: نولّد المفتاحين ونحفظهم (بدون استبدال لو سبقنا طلب ثاني)
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
    const publicKey = b64u(new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey)));
    const put = await storagePut("keys/vapid.json", { publicKey, jwk, created_at: new Date().toISOString() }, false);
    if (put.ok) { vapidCache = { publicKey, jwk }; return vapidCache; }
  }
  throw new Error("vapid_init");
}

async function vapidAuth(endpoint: string, v: Vapid): Promise<string> {
  const aud = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const hit = jwtCache.get(aud);
  if (hit && hit.exp - now > 600) return `vapid t=${hit.token}, k=${v.publicKey}`;
  const exp = now + 12 * 3600;
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp, sub: SUBJECT })));
  const key = await crypto.subtle.importKey("jwk", { ...v.jwk, key_ops: ["sign"], ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${body}`)));
  const token = `${head}.${body}.${b64u(sig)}`;
  jwtCache.set(aud, { token, exp });
  return `vapid t=${token}, k=${v.publicKey}`;
}

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

async function sendOne(sub: Sub, payload: Uint8Array, v: Vapid, ttl: number): Promise<number> {
  const body = await encryptPayload(payload, sub.keys.p256dh, sub.keys.auth);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuth(sub.endpoint, v),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttl),
      Urgency: "normal",
    },
    body,
  });
  await res.body?.cancel();
  return res.status;
}

function cleanSub(raw: unknown): Sub | null {
  const s = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (!s || typeof s.endpoint !== "string" || s.endpoint.length > 1000) return null;
  let url: URL;
  try { url = new URL(s.endpoint); } catch { return null; }
  if (url.protocol !== "https:" || !PUSH_HOSTS.test(url.hostname)) return null;
  const p256dh = String(s.keys?.p256dh || "");
  const auth = String(s.keys?.auth || "");
  if (!/^[A-Za-z0-9_-]{86,88}$/.test(p256dh) || !/^[A-Za-z0-9_-]{21,24}$/.test(auth)) return null;
  return { endpoint: url.href, keys: { p256dh, auth } };
}

async function listSubs(): Promise<string[]> {
  const names: string[] = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST", headers: { ...headers(SECRET_KEY), "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "push", limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`list_${res.status}`);
    const rows = await res.json() as { name: string }[];
    rows.forEach((r) => { if (/^[a-f0-9]{40}\.json$/.test(r.name)) names.push(`push/${r.name}`); });
    if (rows.length < 1000) break;
  }
  return names;
}

async function readLog(): Promise<unknown[]> {
  const res = await storageGet("push-log.json");
  if (!res.ok) return [];
  try { const d = await res.json(); return Array.isArray(d) ? d : []; } catch { return []; }
}

async function isAdmin(auth: string) {
  if (!/^Bearer\s+\S{20,}$/.test(auth)) return false;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: "POST", headers: { ...headers(PUBLIC_KEY, auth), "Content-Type": "application/json" }, body: "{}",
  });
  if (!res.ok) return false;
  try { return (await res.json()) === true; } catch { return false; }
}

const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  try {
    // ---- للزوار ----
    if (body.action === "key") return json({ key: (await getVapid()).publicKey });

    if (body.action === "subscribe") {
      const sub = cleanSub(body.sub);
      if (!sub) return json({ error: "bad_subscription" }, 400);
      const id = (await sha256hex(sub.endpoint)).slice(0, 40);
      const put = await storagePut(`push/${id}.json`, {
        ...sub, lang: body.lang === "en" ? "en" : "ar", country: /^[A-Z]{2}$/.test(String(body.country)) ? body.country : "OM",
        device: ["ios", "android", "other"].includes(String(body.device)) ? body.device : "other", at: new Date().toISOString(),
      });
      if (!put.ok) throw new Error(`save_${put.status}`);
      return json({ ok: true });
    }

    if (body.action === "unsubscribe") {
      let endpoint = "";
      try {
        const u = new URL(String((body.sub as { endpoint?: string } | undefined)?.endpoint || body.endpoint || ""));
        if (u.protocol === "https:" && PUSH_HOSTS.test(u.hostname)) endpoint = u.href;
      } catch { /* رابط غير صالح */ }
      if (endpoint) await storageDelete([`push/${(await sha256hex(endpoint)).slice(0, 40)}.json`]);
      return json({ ok: true });
    }

    // ---- للمدير فقط ----
    if (!(await isAdmin(req.headers.get("Authorization") || ""))) return json({ error: "not_admin" }, 403);

    if (body.action === "count") {
      const [names, log] = await Promise.all([listSubs(), readLog()]);
      return json({ count: names.length, log: log.slice(0, 10) });
    }

    if (body.action === "send") {
      const title = clip(body.title, 60);
      const text = clip(body.body, 180);
      let url = String(body.url || "");
      if (!/^\/[A-Za-z0-9_\-./%?=&]*$/.test(url) || url.length > 300) url = "/ATHR/";
      const image = /^https:\/\/[^\s"'<>]{8,400}$/.test(String(body.image || "")) ? String(body.image) : undefined;
      if (!title || !text) return json({ error: "bad_request" }, 400);
      const payload = enc.encode(JSON.stringify({ title, body: text, url, image, tag: `offer-${Date.now()}` }));
      if (payload.length > 3000) return json({ error: "too_big" }, 413);
      const v = await getVapid();
      const testSub = body.test ? cleanSub(body.test) : null;
      let targets: string[] = [];
      if (body.test) {
        if (!testSub) return json({ error: "bad_subscription" }, 400);
      } else {
        targets = await listSubs();
      }
      let sent = 0, failed = 0;
      const gone: string[] = [];
      const ttl = Math.min(7 * 86400, Math.max(3600, Number(body.ttl) || 2 * 86400));
      const deliver = async (sub: Sub, path?: string) => {
        try {
          const status = await sendOne(sub, payload, v, ttl);
          if (status >= 200 && status < 300) sent++;
          else { failed++; if ((status === 404 || status === 410) && path) gone.push(path); }
        } catch { failed++; }
      };
      if (testSub) await deliver(testSub);
      else {
        await pool(targets, 10, async (path) => {
          const res = await storageGet(path);
          if (!res.ok) { failed++; return; }
          const sub = cleanSub(await res.json());
          if (sub) await deliver(sub, path); else { failed++; gone.push(path); }
        });
        await storageDelete(gone);
        const log = await readLog();
        log.unshift({ at: new Date().toISOString(), title, body: text, url, sent, failed, removed: gone.length });
        await storagePut("push-log.json", log.slice(0, 30));
      }
      return json({ sent, failed, removed: gone.length, total: testSub ? 1 : targets.length });
    }
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
  return json({ error: "bad_request" }, 400);
});
