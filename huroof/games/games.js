(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const wait = (ms) => Promise.all([new Promise((r) => setTimeout(r, ms)), voiceIdle()]);

const LETTERS = [["ا","ألف"],["ب","باء"],["ت","تاء"],["ث","ثاء"],["ج","جيم"],["ح","حاء"],["خ","خاء"],["د","دال"],["ذ","ذال"],["ر","راء"],["ز","زاي"],["س","سين"],["ش","شين"],["ص","صاد"],["ض","ضاد"],["ط","طاء"],["ظ","ظاء"],["ع","عين"],["غ","غين"],["ف","فاء"],["ق","قاف"],["ك","كاف"],["ل","لام"],["م","ميم"],["ن","نون"],["ه","هاء"],["و","واو"],["ي","ياء"]];
const LN = Object.fromEntries(LETTERS);
const norm = (c) => ({ "أ": "ا", "إ": "ا", "آ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي" }[c] || c);
const WORDS = [["🍎","تفاحة"],["🐱","قطة"],["🦆","بطة"],["🐪","جمل"],["🐟","سمكة"],["☀️","شمس"],["🌙","قمر"],["⭐","نجمة"],["🏠","بيت"],["📖","كتاب"],["🌹","وردة"],["🐘","فيل"],["🦁","أسد"],["🍌","موزة"],["🍋","ليمون"],["🍇","عنب"],["🚗","سيارة"],["✈️","طائرة"],["✏️","قلم"],["⚽","كرة"],["🐴","حصان"],["🐰","أرنب"],["🦋","فراشة"],["🌴","نخلة"],["🚢","سفينة"],["🐻","دب"],["🐓","ديك"],["🦒","زرافة"],["🐊","تمساح"],["🖐️","يد"],["🐢","سلحفاة"],["🐝","نحلة"],["🐦","عصفور"],["🥕","جزرة"],["🍉","بطيخ"],["🥛","حليب"],["👁️","عين"],["🌧️","مطر"],["🔑","مفتاح"],["🕌","مسجد"],["🐑","خروف"],["🐺","ذئب"],["🦊","ثعلب"],["🐋","حوت"],["🍯","عسل"],["🎈","بالون"],["🍞","خبز"],["✉️","ظرف"],["🐸","ضفدع"],["🦅","صقر"],["☁️","غيمة"],["🥁","طبل"],["🌸","زهرة"],["🧸","دمية"],["🎒","حقيبة"],["🍪","بسكويت"]];
const first = (w) => norm(w[1][0]);
const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#14B8A6", "#F97316"];

/* ---------- الصوت والنطق ---------- */
// أصوات مصنوعة بالكود وتُشغَّل بعناصر <audio> (تعمل حتى في وضع الصامت في الآيفون)
let muted = false;
try { muted = localStorage.getItem("hg_mute") === "1"; } catch { /* */ }
try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* */ }
const SR = 22050;
const SND = {}; // name -> {els:[Audio], i}
let unlocked = false;
function wavUrl(parts, dur) {
  const n = Math.floor(SR * dur), f = new Float32Array(n);
  for (const p of parts) {
    const t0 = Math.floor((p.t || 0) * SR), len = Math.floor(p.d * SR), v = p.v == null ? 0.5 : p.v;
    let ph = 0;
    for (let i = 0; i < len && t0 + i < n; i++) {
      const x = i / len, fr = p.f2 ? p.f + (p.f2 - p.f) * x : p.f, vib = p.vib ? Math.sin(i / SR * 40) * p.vib : 0;
      ph += 2 * Math.PI * (fr + vib) / SR;
      let s2;
      if (p.w === "noise") s2 = (Math.random() * 2 - 1);
      else if (p.w === "square") s2 = Math.sign(Math.sin(ph)) * 0.6;
      else if (p.w === "saw") s2 = ((ph / Math.PI) % 2) - 1;
      else s2 = Math.sin(ph) + 0.28 * Math.sin(ph * 2) + 0.1 * Math.sin(ph * 3);
      const env = Math.min(1, i / (SR * 0.006)) * Math.pow(1 - x, p.dec == null ? 1.6 : p.dec);
      f[t0 + i] += s2 * env * v;
    }
  }
  let mx = 0; for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(f[i]));
  const k = mx > 0.95 ? 0.95 / mx : 1;
  const buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
  const wr = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
  wr(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); wr(8, "WAVE"); wr(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); wr(36, "data"); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, f[i] * k)) * 32767, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349];
const DEFS = {
  ok: () => wavUrl([{ f: 523, d: .16, t: 0 }, { f: 659, d: .16, t: .09 }, { f: 784, d: .16, t: .18 }, { f: 1047, d: .34, t: .27 }, { f: 2093, d: .2, t: .3, v: .15 }], .7),
  bad: () => wavUrl([{ f: 300, f2: 190, d: .22, t: 0, w: "saw", v: .35 }, { f: 220, f2: 130, d: .3, t: .2, w: "saw", v: .35 }], .55),
  tap: () => wavUrl([{ f: 900, f2: 700, d: .05, v: .35, dec: 2.5 }], .08),
  pop: () => wavUrl([{ f: 380, f2: 1100, d: .1, v: .5, dec: 1.2 }, { f: 1500, d: .05, t: .06, v: .2 }], .2),
  flip: () => wavUrl([{ f: 320, f2: 520, d: .07, w: "square", v: .2 }], .12),
  star: () => wavUrl([{ f: 1319, d: .14, t: 0 }, { f: 1568, d: .14, t: .08 }, { f: 2093, d: .28, t: .16 }], .5),
  win: () => wavUrl([{ f: 523, d: .14, t: 0 }, { f: 523, d: .14, t: .14 }, { f: 523, d: .14, t: .28 }, { f: 659, d: .2, t: .42 }, { f: 784, d: .2, t: .6 }, { f: 1047, d: .6, t: .8 }, { f: 1319, d: .6, t: .8, v: .25 }], 1.5),
  unlock: () => wavUrl([{ f: 392, d: .12, t: 0 }, { f: 523, d: .12, t: .1 }, { f: 659, d: .12, t: .2 }, { f: 784, d: .12, t: .3 }, { f: 1047, d: .5, t: .4 }, { f: 1319, d: .5, t: .4, v: .3 }, { f: 1568, d: .5, t: .4, v: .25 }], 1.0),
  whoosh: () => wavUrl([{ f: 100, d: .3, w: "noise", v: .35, dec: 1 }, { f: 300, f2: 900, d: .3, v: .12, dec: .8 }], .35),
  boing: () => wavUrl([{ f: 180, f2: 520, d: .28, v: .5, vib: 25, dec: 1 }], .32),
  coin: () => wavUrl([{ f: 988, d: .08, t: 0, w: "square", v: .25 }, { f: 1319, d: .3, t: .07, w: "square", v: .25 }], .4),
  tick: () => wavUrl([{ f: 1400, d: .03, v: .3, dec: 2 }], .05),
  clap: () => wavUrl([{ f: 800, d: .06, w: "noise", v: .4, dec: 2 }, { f: 800, d: .06, t: .12, w: "noise", v: .4, dec: 2 }, { f: 800, d: .08, t: .24, w: "noise", v: .4, dec: 2 }], .4)
};
NOTES.forEach((f, i) => { DEFS["n" + i] = () => wavUrl([{ f, d: .22, v: .5 }, { f: f * 2, d: .1, v: .1 }], .28); });
function makeSnd(name) {
  if (SND[name]) return SND[name];
  const url = DEFS[name]();
  const els = [0, 1].map(() => { const a = new Audio(url); a.preload = "auto"; a.volume = 1; return a; });
  return (SND[name] = { els, i: 0 });
}
function unlockAudio() {
  if (unlocked) return; unlocked = true;
  // خفيف: عنصر واحد لأصوات الحروف والجمل، ولا نولّد كل الأصوات دفعة واحدة
  try { if (!AEL) AEL = new Audio(); AEL.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="; const p = AEL.play(); if (p && p.catch) p.catch(() => {}); } catch { /* */ }
  // تسخين الأصوات تدريجياً في أوقات الفراغ (صوت كل 150ms) بدل تجميد الشاشة
  const names = Object.keys(DEFS); let i = 0;
  const step = () => { if (i >= names.length) return; try { makeSnd(names[i++]); } catch { /* */ } setTimeout(step, 150); };
  setTimeout(step, 600);
}
function play(name) {
  if (muted) return;
  try {
    const sn = makeSnd(name), a = sn.els[sn.i++ % sn.els.length];
    a.muted = false; a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {});
  } catch { /* */ }
}
const buzz = (p) => { try { if (!muted && navigator.vibrate) navigator.vibrate(p); } catch { /* */ } };
const sfx = {
  ok() { play("ok"); buzz(25); }, bad() { play("bad"); buzz([60, 40, 60]); }, pop() { play("pop"); }, flip() { play("flip"); },
  win() { play("win"); buzz([40, 30, 40, 30, 90]); }, tap() { play("tap"); }, star() { play("star"); }, unlock() { play("unlock"); buzz([50, 40, 50, 40, 120]); },
  whoosh() { play("whoosh"); }, boing() { play("boing"); }, coin() { play("coin"); }, tick() { play("tick"); }, clap() { play("clap"); },
  note(i) { play("n" + (Math.max(0, i) % NOTES.length)); }
};
["pointerdown", "touchstart", "click", "keydown"].forEach((ev) => addEventListener(ev, unlockAudio, { once: false, passive: true }));
// أي زر يُضغط يصدر نقرة خفيفة (والألعاب تضيف أصواتها الخاصة)
addEventListener("pointerdown", (e) => { const b = e.target.closest && e.target.closest("button, a.pill, a.cta"); if (b && !b.classList.contains("opt") && !b.classList.contains("tile") && !b.classList.contains("ord") && !b.classList.contains("bubble") && !b.classList.contains("card") && !b.classList.contains("seqbtn")) sfx.tap(); }, true);
/* اسم الطفل وعبارات التشجيع */
let CHILD = "";
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CHEERS_N = ["أحسنت يا {n}", "بارك الله فيك يا {n}", "ممتاز يا {n}", "رائع يا {n}", "شاطر يا {n}", "برافو يا {n}", "أحسنت وبارك الله فيك يا {n}"];
const TRY_N = ["حاول مرة ثانية يا {n}", "لا بأس يا {n}، جرّب مرة أخرى", "أنت تستطيع يا {n}"];
const cheer = () => { const has = AMAN && AMAN.praise[anorm(CHILD)]; return (has && Math.random() < 0.7 ? CHEERS_N[0] : CHEERS_N[rnd(CHEERS_N.length)]).replace("{n}", CHILD); };
const tryAgain = () => TRY_N[rnd(TRY_N.length)].replace("{n}", CHILD);
/* ---------- صوت وئام (تسجيلات حقيقية فقط، بلا صوت الجهاز) ---------- */
let AMAN = null, AEL = null, AKEYS = [], AQ = [], AGEN = {};
fetch("audio/manifest.json?v=10").then((r) => r.json()).then((m) => { AMAN = m; AGEN = m.gen || {}; AKEYS = Object.assign({}, m.w, AGEN); }).catch(() => { /* */ });
const anorm = (t) => String(t).replace(/[ً-ٰٟـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^ء-يa-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
function segment(t) {
  const tok = t.split(" "), out = []; let all = true;
  for (let i = 0; i < tok.length;) {
    let hit = null, n = 0;
    for (let j = Math.min(tok.length, i + 5); j > i; j--) { const k = tok.slice(i, j).join(" "); if (AKEYS[k]) { hit = AKEYS[k]; n = j - i; break; } }
    if (hit) { out.push(hit); i += n; } else { all = false; i++; }
  }
  return { out, all };
}
/* ---------- صوت حي لأي نص أو اسم (يُحفظ بعد أول مرة) ---------- */
const LIVE_URL = "https://zcnwzpevehudhnsuljdy.supabase.co/functions/v1/wiam-tts";
const LIVE = new Map(); let PEND = 0, SEQ = 0;
const clean = (t) => String(t).replace(/[^؀-ۿ0-9 .!?,]/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
function liveUrl(text) {
  text = clean(text); if (!text) return Promise.resolve(null);
  if (LIVE.has(text)) return LIVE.get(text);
  const p = fetch(LIVE_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) })
    .then((r) => (r.ok ? r.json() : null)).then((j) => (j && j.url) || null).catch(() => null);
  LIVE.set(text, p); p.then((u) => { if (!u) LIVE.delete(text); });
  return p;
}
function planFor(text) {
  const raw = String(text).trim(); if (!AMAN) return { local: [] };
  const t = anorm(raw);
  const mm = raw.match(/(?:^|\s)يا\s+([^،.!؟?]+)/);
  if (mm) {
    const nm = mm[1].trim(), nn = anorm(nm), pre = t.split(" يا ")[0];
    if (nn) {
      if (/حاول|جرب|لا باس|تستطيع/.test(pre)) return { live: `حَاوِلْ مَرَّةً أُخْرَى يَا ${nm}!`, fallback: [AGEN["حاول مره اخري"]].filter(Boolean) };
      if (/^مرحبا/.test(pre)) return { live: `مَرْحَبًا يَا ${nm}، هَيَّا نَلْعَبْ!`, fallback: [AGEN["هيا نلعب"]].filter(Boolean) };
      if (/احسنت|بارك الله|ممتاز|رائع|شاطر|برافو|جميل|بطل/.test(pre)) {
        const pk = AMAN.praise[nn] || AMAN.praise[nn.split(" ")[0]];
        if (pk) return { local: [pk] };
        const k = /وبارك|بارك الله/.test(pre) ? "احسنت وبارك الله فيك" : /ممتاز/.test(pre) ? "ممتاز" : /رائع/.test(pre) ? "رائع" : "احسنت";
        return { live: `أَحْسَنْتَ يَا ${nm}!`, fallback: [AGEN[k]].filter(Boolean) };
      }
    }
  }
  if (AKEYS[t]) return { local: [AKEYS[t]] };
  const sg = segment(t);
  if (sg.all && sg.out.length) return { local: sg.out };
  return { live: raw, fallback: sg.out };
}
function clipsFor(text) { const p = planFor(text); return p.local || p.fallback || []; }
const clipFor = (t) => clipsFor(t)[0] || null;
window.__hg = { clipFor, clipsFor: (t) => clipsFor(t), planFor, speak: (t) => speak(t) };
function prefetch(text) { try { const p = planFor(text); if (p.live) liveUrl(p.live); } catch { /* */ } }
function voiceIdle() {
  return new Promise((res) => {
    const t0 = Date.now();
    (function chk() {
      const busy = PEND || AQ.length || (AEL && !AEL.paused && !AEL.ended);
      if (!busy || Date.now() - t0 > 8000) setTimeout(res, 150); else setTimeout(chk, 80);
    })();
  });
}
function stopVoice() { SEQ++; AQ = []; try { if (AEL) AEL.pause(); } catch { /* */ } }
function nextClip() {
  const fn = AQ.shift(); if (!fn) return;
  try { AEL.src = /^https?:/.test(fn) ? fn : "audio/" + fn + "?v=10"; const p = AEL.play(); if (p && p.catch) p.catch(() => {}); } catch { /* */ }
}
function playQ(q) {
  if (!q.length) return;
  try {
    if (!AEL) { AEL = new Audio(); AEL.preload = "auto"; AEL.addEventListener("ended", nextClip); }
    AEL.pause(); AQ = q.slice(0, 6); nextClip();
  } catch { /* */ }
}
function speak(text) {
  if (muted) return;
  const my = ++SEQ, p = planFor(text);
  if (p.local) { playQ(p.local); return; }
  try { if (AEL) AEL.pause(); } catch { /* */ } AQ = [];
  PEND++;
  liveUrl(p.live).then((u) => { PEND--; if (my !== SEQ || muted) return; playQ(u ? [u] : (p.fallback || [])); });
}

/* ---------- الاحتفال ---------- */
const cv = $("#confetti"), cx = cv.getContext("2d");
let parts = [], raf = 0;
const DPR = Math.min(devicePixelRatio || 1, 1.5);
function sizeCv() { cv.width = innerWidth * DPR; cv.height = innerHeight * DPR; }
addEventListener("resize", sizeCv); sizeCv();
function confetti(x = innerWidth / 2, y = innerHeight / 3, n = 70) {
  n = Math.min(n, 60); if (parts.length > 160) return;
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 3, g: .35, s: 6 + Math.random() * 7, c: COLORS[rnd(COLORS.length)], r: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 70 + rnd(40) });
  if (!raf) loop();
}
function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => p.life > 0);
  const k = DPR;
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.r += p.vr; p.life--;
    cx.save(); cx.translate(p.x * k, p.y * k); cx.rotate(p.r); cx.fillStyle = p.c; cx.globalAlpha = Math.min(1, p.life / 25);
    cx.fillRect(-p.s * k / 2, -p.s * k / 3, p.s * k, p.s * k * .66); cx.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : 0;
  if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
}

/* ---------- التقدّم ---------- */
let prog = {};
let dly = { last: "", streak: 0, done: 0 };
const PK = (k) => `${k}:${CHILD}`;
const readJ = (k, d) => { try { return Object.assign(Array.isArray(d) ? [] : {}, JSON.parse(localStorage.getItem(k) || "null") || d); } catch { return d; } };
const writeJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } };
const profiles = () => { try { const p = JSON.parse(localStorage.getItem("hg_profiles") || "[]"); return Array.isArray(p) ? p : []; } catch { return []; } };
function loadProfile(name) {
  CHILD = name; prefetch(`أحسنت يا ${name}`); prefetch(`مرحباً يا ${name}، هيا نلعب`);
  if (!profiles().includes(name)) {
    const first = profiles().length === 0;
    writeJ("hg_profiles", [...profiles(), name]);
    if (first) { /* نقل التقدّم القديم (قبل تسجيل الدخول) إلى أول طفل */ try { const op = localStorage.getItem("hg_prog"), od = localStorage.getItem("hg_daily"); if (op) localStorage.setItem(PK("hg_prog"), op); if (od) localStorage.setItem(PK("hg_daily"), od); } catch { /* */ } }
  }
  try { localStorage.setItem("hg_cur", name); } catch { /* */ }
  prog = readJ(PK("hg_prog"), {});
  dly = Object.assign({ last: "", streak: 0, done: 0 }, readJ(PK("hg_daily"), {}));
}
const saveStars = (id, n) => { if ((prog[id] || 0) < n) { prog[id] = n; writeJ(PK("hg_prog"), prog); } };
const saveDly = () => writeJ(PK("hg_daily"), dly);
const totalStars = () => Object.values(prog).reduce((a, b) => a + b, 0) + dly.done * 3;
const CHARS = [["🐣", "كتكوت"], ["🐰", "أرنوب"], ["🐱", "قطوة"], ["🐶", "جرجور"], ["🐼", "باندا"], ["🦊", "ثعلوب"], ["🦁", "الأسد ليو"], ["🐯", "نمرود"], ["🐨", "كوالا"], ["🐸", "قفقف"], ["🐵", "قرقور"], ["🦄", "يونيكورن"], ["🐬", "دلفين"], ["🐙", "أخطوط"], ["🦋", "فراشة"], ["🐢", "سلحوف"], ["🦉", "بومة الحكمة"], ["🐘", "دمبو"], ["🦒", "زرافة"], ["🐧", "بطريق"], ["🦕", "ديناصور"], ["🐲", "التنين"], ["🚀", "الصاروخ"], ["👑", "تاج الأبطال"]];
const thr = (k) => k * 3;
const unlockedCount = () => CHARS.filter((_, k) => totalStars() >= thr(k)).length;
function checkUnlock(before) {
  const after = totalStars(), nw = CHARS.map((c, k) => [c, k]).filter(([, k]) => thr(k) > before && thr(k) <= after);
  if (!nw.length) return;
  const [c] = nw[nw.length - 1];
  setTimeout(() => {
    sfx.unlock(); confetti(innerWidth / 2, innerHeight / 2, 100);
    const el = document.createElement("div"); el.className = "unlock";
    el.innerHTML = `<div class="u-in"><div class="u-e">${c[0]}</div><b>فتحت شخصية جديدة!</b><span>${c[1]}</span><small>شاهدها في «حديقة الشخصيات»</small></div>`;
    document.body.appendChild(el); el.onclick = () => el.remove(); setTimeout(() => el.remove(), 4500);
  }, 900);
}

/* ---------- الألعاب ---------- */
const CATS = [["abc", "🔤 الحروف والكلمات"], ["num", "🔢 الأرقام والحساب"], ["col", "🎨 الألوان والأشكال"], ["ani", "🐾 الحيوانات والمعاني"], ["rel", "🕌 القرآن والأدعية"], ["time", "📅 الأيام والأشهر"]];
const GAMES = [
  { q: true, cat: "abc", id: "letters", ic: "🔤", t: "أين الحرف؟", s: "اسمع الحرف واختره", c: "linear-gradient(135deg,#8B5CF6,#6D3FE0)", run: gLetters },
  { q: true, cat: "abc", id: "first", ic: "🍎", t: "الحرف الأول", s: "بماذا تبدأ الصورة؟", c: "linear-gradient(135deg,#F97316,#EA580C)", run: gFirst },
  { cat: "abc", id: "build", ic: "🧩", t: "رتّب الكلمة", s: "كوّن الكلمة من الحروف", c: "linear-gradient(135deg,#10B981,#059669)", run: gBuild },
  { cat: "abc", id: "match", ic: "🔗", t: "وصّل بخط", s: "وصّل الصورة بالكلمة", c: "linear-gradient(135deg,#EC4899,#DB2777)", run: gMatch },
  { q: true, cat: "abc", id: "missing", ic: "✍️", t: "أكمل الكلمة", s: "ما الحرف الناقص؟", c: "linear-gradient(135deg,#3B82F6,#2563EB)", run: gMissing },
  { cat: "abc", id: "memory", ic: "🃏", t: "لعبة الذاكرة", s: "اعثر على الأزواج", c: "linear-gradient(135deg,#14B8A6,#0D9488)", run: gMemory },
  { cat: "abc", id: "bubbles", ic: "🫧", t: "فقاعات الحروف", s: "فرقع الحرف المطلوب", c: "linear-gradient(135deg,#06B6D4,#0891B2)", run: gBubbles },
  { q: true, cat: "num", id: "count", ic: "🔢", t: "عدّ معي", s: "كم عددها؟", c: "linear-gradient(135deg,#F59E0B,#D97706)", run: gCount },
  { q: true, cat: "num", id: "add", ic: "➕", t: "الجمع", s: "اجمع الأعداد", c: "linear-gradient(135deg,#22C55E,#15803D)", run: gAdd },
  { q: true, cat: "num", id: "sub", ic: "➖", t: "الطرح", s: "اطرح الأعداد", c: "linear-gradient(135deg,#F43F5E,#BE123C)", run: gSub },
  { q: true, cat: "num", id: "seq", ic: "🔟", t: "أكمل العدد", s: "ما الرقم الناقص؟", c: "linear-gradient(135deg,#6366F1,#4338CA)", run: gSeq },
  { q: true, cat: "num", id: "cmp", ic: "⚖️", t: "أيهما أكثر؟", s: "قارن بين المجموعتين", c: "linear-gradient(135deg,#0EA5E9,#0369A1)", run: gCompare },
  { cat: "num", id: "order", ic: "🏃", t: "رتّب الأرقام", s: "المس الأرقام بالترتيب", c: "linear-gradient(135deg,#D946EF,#A21CAF)", run: gOrder },
  { q: true, cat: "col", id: "color", ic: "🌈", t: "ما هذا اللون؟", s: "تعرّف على الألوان", c: "linear-gradient(135deg,#F97316,#DB2777)", run: gColor },
  { q: true, cat: "col", id: "coloritem", ic: "🍓", t: "أي شيء بهذا اللون؟", s: "اختر الشيء الملوّن", c: "linear-gradient(135deg,#EF4444,#B91C1C)", run: gColorItem },
  { q: true, cat: "col", id: "shape", ic: "🔷", t: "ما هذا الشكل؟", s: "دائرة، مربع، مثلث...", c: "linear-gradient(135deg,#3B82F6,#1D4ED8)", run: gShape },
  { q: true, cat: "ani", id: "animal", ic: "🦁", t: "اسم الحيوان", s: "ما اسم هذا الحيوان؟", c: "linear-gradient(135deg,#EAB308,#A16207)", run: gAnimal },
  { q: true, cat: "ani", id: "sound", ic: "🔊", t: "ما صوته؟", s: "صوت كل حيوان", c: "linear-gradient(135deg,#14B8A6,#0F766E)", run: gSound },
  { q: true, cat: "ani", id: "shadow", ic: "👤", t: "من هو الظل؟", s: "خمّن الحيوان من ظله", c: "linear-gradient(135deg,#475569,#1E293B)", run: gShadow },
  { q: true, cat: "ani", id: "opp", ic: "↔️", t: "الأضداد", s: "ما عكس الكلمة؟", c: "linear-gradient(135deg,#A855F7,#7E22CE)", run: gOpposite },
  { cat: "rel", id: "surahorder", ic: "📖", t: "رتّب آيات السورة", s: "الإخلاص، الكوثر، العصر...", c: "linear-gradient(135deg,#059669,#065F46)", run: gSurahOrder },
  { q: true, cat: "rel", id: "ayahend", ic: "✨", t: "أكمل الآية", s: "ما الكلمة الناقصة؟", c: "linear-gradient(135deg,#0D9488,#115E59)", run: gAyahEnd },
  { q: true, cat: "rel", id: "whichsurah", ic: "🕋", t: "من أي سورة؟", s: "اعرف السورة من آيتها", c: "linear-gradient(135deg,#16A34A,#14532D)", run: gWhichSurah },
  { q: true, cat: "rel", id: "duawhen", ic: "🤲", t: "ماذا نقول؟", s: "الدعاء المناسب لكل موقف", c: "linear-gradient(135deg,#7C3AED,#4C1D95)", run: gDuaWhen },
  { q: true, cat: "rel", id: "duaend", ic: "🌙", t: "أكمل الدعاء", s: "ما الكلمة الناقصة؟", c: "linear-gradient(135deg,#6366F1,#3730A3)", run: gDuaEnd },
  { cat: "time", id: "dayorder", get ic() { return calIcon(); }, t: "رتّب أيام الأسبوع", s: "الأحد، الاثنين...", c: "linear-gradient(135deg,#F59E0B,#B45309)", run: gDayOrder },
  { q: true, cat: "time", id: "daynext", ic: "🗓️", t: "ما اليوم؟", s: "قبل وبعد وترتيب الأيام", c: "linear-gradient(135deg,#EA580C,#9A3412)", run: gDayNext },
  { cat: "time", id: "monthorder", ic: "🌙", t: "رتّب الأشهر الهجرية", s: "محرم، صفر، ربيع...", c: "linear-gradient(135deg,#0EA5E9,#075985)", run: gMonthOrder },
  { q: true, cat: "time", id: "monthnext", ic: "🌛", t: "ما الشهر؟", s: "الأشهر الهجرية بالترتيب", c: "linear-gradient(135deg,#2563EB,#1E3A8A)", run: gMonthNext },
  { cat: "time", id: "gregorder", get ic() { return calIcon(); }, t: "رتّب أشهر السنة", s: "يناير، فبراير، مارس...", c: "linear-gradient(135deg,#DB2777,#831843)", run: gGregOrder }
];
let cleanup = null;
function go(fn) { if (cleanup) { cleanup(); cleanup = null; } stopVoice(); fn(); window.scrollTo(0, 0); }

const CATSTY = { abc: ["#8B5CF6", "#5B21B6", "ابدأ بالحروف والكلمات"], num: ["#10B981", "#047857", "أعداد وجمع وطرح"], col: ["#F59E0B", "#B45309", "ألوان وأشكال جميلة"], ani: ["#EC4899", "#9D174D", "حيوانات وأصوات ومعاني"], rel: ["#14B8A6", "#0F766E", "سور قصيرة وأدعية"], time: ["#3B82F6", "#1D4ED8", "أيام الأسبوع والأشهر"] };
const catIcon = (name) => name.split(" ")[0], catTitle = (name) => name.split(" ").slice(1).join(" ");
const muteBtn = () => { const m = $("#mute"); if (!m) return; m.onclick = () => { muted = !muted; try { localStorage.setItem("hg_mute", muted ? "1" : "0"); } catch { /* */ } m.textContent = muted ? "🔇" : "🔊"; }; };

function login() {
  const ps = profiles();
  app.innerHTML = `<div class="top"><a class="pill" href="../">🏪 المتجر</a><button class="pill btn" id="mute">${muted ? "🔇" : "🔊"}</button></div>
    <div class="hero"><div class="mascot">🦉</div><h1>أهلاً بك!</h1><p>ما اسمك أيها البطل؟</p></div>
    <form class="login" id="lf"><input id="nm" maxlength="14" autocomplete="off" placeholder="اكتب اسمك هنا" aria-label="اسم الطفل"><button class="btn-big" type="submit">🚀 هيا نلعب</button></form>
    ${ps.length ? `<h2 class="cat">أو اختر اسمك</h2><div class="plist">${ps.map((p) => `<button class="pchip" data-p="${esc(p)}">👤 ${esc(p)}</button>`).join("")}</div>` : ""}`;
  muteBtn();
  const enter = (name) => { loadProfile(name); sfx.win(); confetti(innerWidth / 2, innerHeight / 3, 60); go(home); setTimeout(() => speak(`مرحباً يا ${name}، هيا نلعب`), 500); };
  $("#lf").onsubmit = (e) => { e.preventDefault(); const v = $("#nm").value.trim().replace(/\s+/g, " ").slice(0, 14); if (!v) { sfx.bad(); $("#nm").classList.add("no"); setTimeout(() => $("#nm").classList.remove("no"), 400); return; } enter(v); };
  app.querySelectorAll(".pchip").forEach((b) => b.onclick = () => enter(b.dataset.p));
  if (!ps.length) setTimeout(() => $("#nm") && $("#nm").focus(), 300);
}

function home() {
  const cnt = (k) => GAMES.filter((g) => g.cat === k);
  app.innerHTML = `
    <div class="top"><button class="pill btn" id="who">👤 ${esc(CHILD)}</button><button class="pill btn" id="mute" aria-label="الصوت">${muted ? "🔇" : "🔊"}</button><span class="pill">⭐ ${totalStars()}</span></div>
    <div class="hero"><div class="mascot">🦉</div><h1>مرحباً يا ${esc(CHILD)}!</h1><p>اختر قسماً والعب واجمع النجوم</p></div>
    <div class="feat">
      <button class="gcard daily" data-g="daily"><span class="ic">${calIcon(true)}</span><b>التحدي اليومي</b><small>${dly.last === todayKey() ? "✅ أنجزته اليوم، عُد غداً" : "10 أسئلة + 3 نجوم هدية"}</small><span class="st">🔥 ${streakNow()} ${streakNow() === 1 ? "يوم" : "أيام"}</span></button>
      <button class="gcard garden" data-g="garden"><span class="ic">🏆</span><b>حديقة الشخصيات</b><small>افتح شخصيات جديدة</small><span class="st">${unlockedCount()} / ${CHARS.length}</span></button>
    </div>
    <h2 class="cat">الأقسام</h2>
    <div class="cats">${CATS.map(([k, name]) => { const gs = cnt(k), got = gs.reduce((a, g) => a + (prog[g.id] || 0), 0), all = gs.length * 3, st = CATSTY[k]; return `<button class="catcard" data-c="${k}" style="background:linear-gradient(135deg,${st[0]},${st[1]})"><span class="ci">${catIcon(name)}</span><span class="ct"><b>${catTitle(name)}</b><small>${st[2]}</small><span class="cbar"><i style="width:${Math.round(got / all * 100)}%"></i></span></span><span class="cn">${gs.length}<small>ألعاب</small></span></button>`; }).join("")}</div>
    <a class="cta" href="../#stories">📚 أعجبتك الألعاب؟ شاهد <b>قصصنا باسم طفلك</b></a>`;
  muteBtn();
  $("#who").onclick = () => go(login);
  app.querySelectorAll(".catcard").forEach((b) => b.onclick = () => { sfx.whoosh(); go(() => catView(b.dataset.c)); });
  app.querySelectorAll(".gcard").forEach((b) => b.onclick = () => { sfx.whoosh(); if (b.dataset.g === "garden") return go(garden); go(() => frame(DAILYGAME)); });
}
function catView(k) {
  const [, name] = CATS.find((c) => c[0] === k), st = CATSTY[k], gs = GAMES.filter((g) => g.cat === k);
  app.innerHTML = `
    <div class="top"><button class="pill btn" id="back">→ الأقسام</button><button class="pill btn" id="mute">${muted ? "🔇" : "🔊"}</button><span class="pill">⭐ ${totalStars()}</span></div>
    <div class="cathead" style="background:linear-gradient(135deg,${st[0]},${st[1]})"><span>${catIcon(name)}</span><h1>${catTitle(name)}</h1><p>${st[2]}</p></div>
    <div class="grid">${gs.map((g) => `<button class="gcard" data-g="${g.id}" style="background:${g.c}"><span class="ic">${g.ic}</span><b>${g.t}</b><small>${g.s}</small><span class="st">${stars(prog[g.id] || 0)}</span></button>`).join("")}</div>`;
  muteBtn();
  $("#back").onclick = () => go(home);
  app.querySelectorAll(".gcard").forEach((b) => b.onclick = () => { sfx.whoosh(); const g = GAMES.find((x) => x.id === b.dataset.g); go(() => frame(g)); });
}
/* ---------- */
const backFn = () => (cur && cur.cat ? () => catView(cur.cat) : home);
const stars = (n) => "⭐".repeat(n) + "☆".repeat(3 - n);

let cur = null;
function frame(g) {
  cur = g;
  app.innerHTML = `
    <div class="bar"><button class="pill btn" id="back">→ رجوع</button><div class="title">${g.ic} ${g.t}</div><button class="pill btn" id="mute">${muted ? "🔇" : "🔊"}</button></div>
    <div class="dots" id="dots"></div>
    <div class="stage" id="stage"></div>`;
  $("#back").onclick = () => go(backFn());
  $("#mute").onclick = () => { muted = !muted; try { localStorage.setItem("hg_mute", muted ? "1" : "0"); } catch { /* */ } $("#mute").textContent = muted ? "🔇" : "🔊"; };
  g.run($("#stage"));
}
function setDots(n, done, curI) {
  $("#dots").innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < done ? "on" : ""}${i === curI ? " cur" : ""}"></i>`).join("");
}
function finish(stage, score, total, msg = "") {
  const ratio = score / total;
  const st = ratio >= 0.9 ? 3 : ratio >= 0.65 ? 2 : ratio >= 0.35 ? 1 : 0;
  const before = totalStars();
  saveStars(cur.id, st); checkUnlock(before);
  setTimeout(() => speak(st >= 2 ? `أحسنت وبارك الله فيك يا ${CHILD}` : st === 1 ? `جميل يا ${CHILD}، حاول مرة ثانية` : `لا بأس يا ${CHILD}، جرّب مرة أخرى`), 1200);
  sfx.win(); setTimeout(() => sfx.clap(), 700); confetti(innerWidth / 2, innerHeight / 3, 120); setTimeout(() => confetti(innerWidth * .2, innerHeight / 2, 60), 250); setTimeout(() => confetti(innerWidth * .8, innerHeight / 2, 60), 450);
  stage.innerHTML = `<div class="win"><div class="trophy">${st === 3 ? "🏆" : st === 2 ? "🥈" : st === 1 ? "🥉" : "💪"}</div>
    <h2>${st === 3 ? "ممتاز! أنت بطل!" : st === 2 ? "أحسنت!" : st === 1 ? "جميل! حاول مرة ثانية" : "لا بأس، جرّب مرة أخرى"}</h2>
    <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= st ? "" : "off"}">⭐</span>`).join("")}</div>
    ${msg ? `<p class="prompt">${msg}</p>` : `<p class="prompt">${score} من ${total}</p>`}
    <div class="row"><button class="btn-big" id="again">🔄 العب مرة أخرى</button><button class="btn-big alt" id="menu">🏠 الألعاب</button></div></div>`;
  $("#again").onclick = () => go(() => frame(cur));
  $("#menu").onclick = () => go(backFn());
}

/* ---------- محرّك الأسئلة ---------- */
const DAILY = { active: false, n: 2, offset: 0, totalAll: 10, cb: null };
function quiz(stage, rounds, make, opt = {}) {
  let i = 0, score = 0, lock = false;
  const total = DAILY.active ? DAILY.n : rounds;
  function next() {
    if (i >= total) { if (DAILY.active) { const cb = DAILY.cb; return cb(score); } return finish(stage, score, total); }
    if (DAILY.active) setDots(DAILY.totalAll, DAILY.offset + i, DAILY.offset + i); else setDots(total, i, i);
    const q = make(i);
    let firstTry = true;
    stage.innerHTML = `${q.html}<div class="opts ${q.one ? "one" : q.answers.length === 3 ? "three" : ""}" id="opts">${q.answers.map((a, k) => `<button class="opt ${a.txt ? "txt" : ""} ${q.one ? "long" : ""}" data-k="${k}">${a.label}</button>`).join("")}</div>`;
    const say = $("#say"); if (say) say.onclick = () => speak(q.say);
    if (q.say) setTimeout(() => speak(q.say), 250);
    if (q.after) prefetch(q.after);
    if (q.onload) q.onload();
    lock = false;
    stage.querySelectorAll(".opt").forEach((b) => b.onclick = async () => {
      if (lock) return;
      const a = q.answers[+b.dataset.k];
      if (a.ok) {
        lock = true; b.classList.add("ok"); sfx.ok();
        const sh = stage.querySelector(".shadow"); if (sh) { sh.classList.remove("shadow"); setTimeout(() => sfx.whoosh(), 120); }
        const r = b.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 28);
        if (firstTry) { score++; setTimeout(() => sfx.star(), 260); }
        if (q.after) speak(q.after); else if (Math.random() < 0.6) speak(cheer());
        await wait(q.after ? 1300 : 900); i++; next();
      } else { b.classList.add("no"); sfx.bad(); if (firstTry && Math.random() < 0.35) speak(tryAgain()); firstTry = false; setTimeout(() => b.classList.remove("no"), 450); }
    });
  }
  next();
}
const lbl = (l) => `<span>${l}</span>`;
function letterOpts(correct, n = 4) {
  const others = pick(LETTERS.map((x) => x[0]).filter((x) => x !== correct), n - 1);
  return shuffle([correct, ...others]).map((l) => ({ label: lbl(l), ok: l === correct }));
}

/* 1) أين الحرف؟ */
function gLetters(stage) {
  const seq = pick(LETTERS.map((x) => x[0]), 10);
  quiz(stage, 10, (i) => {
    const L = seq[i];
    return { say: `أين حرف ${LN[L]}؟`, html: `<div class="prompt">أين حرف <b style="color:var(--pri)">${LN[L]}</b>؟</div><button class="say" id="say">🔊 اسمع</button>`, answers: letterOpts(L, 4) };
  });
}
/* 2) الحرف الأول */
function gFirst(stage) {
  const seq = pick(WORDS, 10);
  quiz(stage, 10, (i) => {
    const w = seq[i], L = first(w);
    return { say: `${w[1]}. بأي حرف تبدأ ${w[1]}؟`, after: `${w[1]} تبدأ بحرف ${LN[L]}`, html: `<div class="emo">${w[0]}</div><div class="prompt">بأي حرف تبدأ؟</div><button class="say" id="say">🔊 اسمع</button>`, answers: letterOpts(L, 4) };
  });
}
/* 3) الحرف الناقص */
function gMissing(stage) {
  const seq = pick(WORDS.filter((w) => w[1].length >= 3), 10);
  quiz(stage, 10, (i) => {
    const w = seq[i], word = w[1];
    const pos = 1 + rnd(word.length - 1);
    const L = norm(word[pos]);
    const shown = [...word].map((c, k) => k === pos ? "＿" : c).join(" ");
    return { say: `${word}. ما الحرف الناقص؟`, after: word, html: `<div class="emo">${w[0]}</div><div class="bigw">${shown}</div><div class="prompt">ما الحرف الناقص؟</div>`, answers: letterOpts(L, 3).map((a) => ({ ...a, label: lbl(a.label.replace(/<\/?span>/g, "")) })) };
  });
}
/* 4) عدّ معي */
function gCount(stage) {
  const em = ["🍎", "⭐", "🐟", "🎈", "🍌", "🦋", "🚗", "🌸", "🐥", "⚽"];
  quiz(stage, 10, (i) => {
    const n = 1 + rnd(10), e = em[rnd(em.length)];
    const opts = shuffle([n, ...pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => x !== n), 2)]);
    return { onload: () => { for (let k = 0; k < n; k++) setTimeout(() => sfx.note(k), 120 + k * 150); }, say: "كم عددها؟", html: `<div class="count-box">${Array.from({ length: n }, (_, k) => `<span style="animation-delay:${k * 60}ms">${e}</span>`).join("")}</div><div class="prompt">كم عددها؟</div>`, answers: opts.map((x) => ({ label: lbl(x), ok: x === n })) };
  });
}

/* 5) رتّب الكلمة */
function gBuild(stage) {
  const seq = pick(WORDS.filter((w) => w[1].length >= 3 && w[1].length <= 5), 6);
  let i = 0, score = 0;
  function next() {
    if (i >= seq.length) return finish(stage, score, seq.length);
    setDots(seq.length, i, i);
    const w = seq[i], word = w[1], chars = [...word];
    let filled = 0, mistakes = 0;
    stage.innerHTML = `<div class="emo">${w[0]}</div><button class="say" id="say">🔊 اسمع</button>
      <div class="slots" id="slots">${chars.map(() => `<div class="slot"></div>`).join("")}</div>
      <div class="tiles" id="tiles">${shuffle(chars.map((c, k) => ({ c, k }))).map((t) => `<button class="tile" data-c="${t.c}">${t.c}</button>`).join("")}</div>`;
    $("#say").onclick = () => speak(word);
    setTimeout(() => speak(word), 250);
    stage.querySelectorAll(".tile").forEach((t) => t.onclick = async () => {
      if (t.classList.contains("used")) return;
      if (t.dataset.c === chars[filled]) {
        const slot = stage.querySelectorAll(".slot")[filled];
        slot.textContent = t.dataset.c; slot.classList.add("f"); t.classList.add("used"); sfx.note(filled); filled++;
        if (filled === chars.length) {
          if (!mistakes) score++;
          sfx.ok(); speak(word); confetti(innerWidth / 2, innerHeight / 3, 60);
          $("#slots").innerHTML = `<div class="bigw">${word}</div>`;
          await wait(1400); i++; next();
        }
      } else { mistakes++; sfx.bad(); t.classList.add("no"); setTimeout(() => t.classList.remove("no"), 450); }
    });
  }
  next();
}

/* 6) التوصيل */
function gMatch(stage) {
  const rounds = 3;
  let r = 0, good = 0, bad = 0;
  function next() {
    if (r >= rounds) return finish(stage, Math.max(0, rounds * 4 - bad), rounds * 4);
    setDots(rounds, r, r);
    const items = pick(WORDS, 4);
    const left = shuffle(items), right = shuffle(items);
    stage.innerHTML = `<div class="prompt">اسحب خطاً من الصورة إلى كلمتها</div>
      <div class="match" id="mt">
        <svg class="lines" id="lines"></svg>
        ${left.map((w, k) => `<div class="m-it e" data-w="${w[1]}"><span>${w[0]}</span><i class="m-dot"></i></div>`).join("")}
        ${right.map((w) => `<div class="m-it w" data-w="${w[1]}"><span>${w[1]}</span><i class="m-dot"></i></div>`).join("")}
      </div>`;
    // ترتيب الشبكة: عمود الصور ثم عمود الكلمات
    const mt = $("#mt"), svg = $("#lines");
    const els = [...mt.querySelectorAll(".m-it")], E = els.filter((e) => e.classList.contains("e")), W = els.filter((e) => e.classList.contains("w"));
    mt.innerHTML = `<svg class="lines" id="lines"></svg>`;
    const colE = document.createElement("div"), colW = document.createElement("div");
    [colE, colW].forEach((c) => { c.style.cssText = "display:grid;gap:14px"; });
    E.forEach((e) => colE.appendChild(e)); W.forEach((e) => colW.appendChild(e));
    mt.append(colE, colW);
    const svgEl = $("#lines");
    let drag = null, selected = null, matched = 0;
    const pos = (el, side) => { const a = el.getBoundingClientRect(), b = mt.getBoundingClientRect(); return [(side === "l" ? a.left : a.right) - b.left, a.top + a.height / 2 - b.top]; };
    const line = (x1, y1, x2, y2, col) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="8" stroke-linecap="round"/>`;
    let doneLines = "";
    function draw(tmp) { svgEl.innerHTML = doneLines + (tmp || ""); }
    function tryMatch(eEl, wEl) {
      if (!eEl || !wEl || eEl.classList.contains("done") || wEl.classList.contains("done")) return false;
      if (eEl.dataset.w === wEl.dataset.w) {
        eEl.classList.add("done"); wEl.classList.add("done"); eEl.classList.remove("sel"); sfx.ok();
        const [x1, y1] = pos(eEl, "l"), [x2, y2] = pos(wEl, "r");
        // الصورة عمودها على اليمين (RTL) والكلمة على اليسار
        const a = eEl.getBoundingClientRect(), b = wEl.getBoundingClientRect(), m = mt.getBoundingClientRect();
        doneLines += line(a.left - m.left, a.top + a.height / 2 - m.top, b.right - m.left, b.top + b.height / 2 - m.top, "#22B45E");
        draw(); good++; matched++; const rr = wEl.getBoundingClientRect(); confetti(rr.left + rr.width / 2, rr.top, 24);
        if (matched === 4) wait(1100).then(() => { r++; next(); });
        return true;
      }
      bad++; sfx.bad(); wEl.classList.add("no"); setTimeout(() => wEl.classList.remove("no"), 450); return false;
    }
    E.forEach((e) => {
      e.addEventListener("pointerdown", (ev) => {
        if (e.classList.contains("done")) return;
        e.setPointerCapture(ev.pointerId); drag = { el: e, moved: false };
        E.forEach((x) => x.classList.remove("sel")); e.classList.add("sel"); selected = e; sfx.tap(); speak(e.dataset.w);
      });
      e.addEventListener("pointermove", (ev) => {
        if (!drag || drag.el !== e) return; drag.moved = true;
        const a = e.getBoundingClientRect(), m = mt.getBoundingClientRect();
        draw(line(a.left - m.left, a.top + a.height / 2 - m.top, ev.clientX - m.left, ev.clientY - m.top, "#8B5CF6"));
      });
      e.addEventListener("pointerup", (ev) => {
        if (!drag || drag.el !== e) return;
        const moved = drag.moved; drag = null; draw();
        const t = document.elementFromPoint(ev.clientX, ev.clientY), wEl = t && t.closest(".m-it.w");
        if (wEl) { tryMatch(e, wEl); e.classList.remove("sel"); selected = null; }
        else if (moved) { e.classList.remove("sel"); selected = null; }
      });
    });
    W.forEach((w) => w.addEventListener("click", () => { if (selected) { tryMatch(selected, w); selected.classList.remove("sel"); selected = null; } }));
  }
  next();
}

/* 7) الذاكرة */
function gMemory(stage) {
  const pairs = pick(WORDS, 6);
  const cards = shuffle(pairs.flatMap((w) => [{ k: w[1], f: w[0], w: false }, { k: w[1], f: w[1], w: true }]));
  let opened = [], moves = 0, matched = 0, lock = false;
  setDots(0, 0, -1);
  stage.innerHTML = `<div class="prompt">اعثر على الصورة وكلمتها</div><div class="hud"><span>الحركات: <b id="mv">0</b></span><span>الأزواج: <b id="pr">0</b>/6</span></div>
    <div class="mem">${cards.map((c, i) => `<button class="card" data-i="${i}"><div class="in"><div class="b">❔</div><div class="f ${c.w ? "w" : ""}">${c.f}</div></div></button>`).join("")}</div>`;
  stage.querySelectorAll(".card").forEach((el) => el.onclick = async () => {
    if (lock || el.classList.contains("flip")) return;
    el.classList.add("flip"); sfx.flip(); opened.push(el);
    if (opened.length === 2) {
      moves++; $("#mv").textContent = moves; lock = true;
      const [a, b] = opened.map((x) => cards[+x.dataset.i]);
      if (a.k === b.k) { opened.forEach((x) => x.classList.add("done")); matched++; $("#pr").textContent = matched; sfx.ok(); setTimeout(() => sfx.star(), 200); speak(a.k); confetti(innerWidth / 2, innerHeight / 2, 30); opened = []; lock = false; if (matched === 6) { await wait(900); finish(stage, Math.max(0, 14 - moves), 14, `أنهيتها في ${moves} حركة`); } }
      else { await wait(900); opened.forEach((x) => x.classList.remove("flip")); opened = []; lock = false; }
    }
  });
}

/* 8) فقاعات الحروف */
function gBubbles(stage) {
  let target = LETTERS[rnd(28)][0], score = 0, left = 45, popped = 0, alive = true;
  stage.innerHTML = `<div class="hud"><span>⏱️ <b id="tm">45</b></span><span>الهدف: <span class="target" id="tg">${target}</span></span><span>⭐ <b id="sc">0</b></span></div>
    <div class="prompt">فرقع الفقاعات التي عليها هذا الحرف</div><div class="bub-area" id="area"></div>`;
  setDots(0, 0, -1);
  const area = $("#area");
  speak(`فرقع حرف ${LN[target]}`);
  function spawn() {
    if (!alive) return;
    const isT = Math.random() < 0.38;
    const L = isT ? target : pick(LETTERS.map((x) => x[0]).filter((x) => x !== target), 1)[0];
    const b = document.createElement("button");
    b.className = "bubble"; b.textContent = L;
    const w = area.clientWidth || 320;
    b.style.left = `${rnd(Math.max(10, w - 90))}px`;
    b.style.setProperty("--bc", COLORS[rnd(COLORS.length)]);
    b.style.setProperty("--d", `${5.5 + Math.random() * 3}s`);
    b.style.setProperty("--sw", `${rnd(60) - 30}px`);
    b.onpointerdown = (ev) => {
      ev.preventDefault();
      if (b.classList.contains("pop")) return;
      b.classList.add("pop"); setTimeout(() => b.remove(), 260);
      if (L === target) {
        score++; popped++; $("#sc").textContent = score; sfx.note(2 + rnd(9)); const r = b.getBoundingClientRect(); confetti(r.left + 40, r.top + 40, 14);
        if (popped % 5 === 0) { target = LETTERS[rnd(28)][0]; $("#tg").textContent = target; speak(`الآن فرقع حرف ${LN[target]}`); }
      } else { sfx.boing(); score = Math.max(0, score - 1); $("#sc").textContent = score; }
    };
    area.appendChild(b);
    setTimeout(() => b.remove(), 9000);
  }
  const t1 = setInterval(spawn, 650);
  const t2 = setInterval(() => { left--; $("#tm").textContent = left; if (left <= 0) end(); }, 1000);
  function end() { alive = false; clearInterval(t1); clearInterval(t2); cleanup = null; finish(stage, Math.min(score, 24), 24, `فرقعت ${score} فقاعة`); }
  cleanup = () => { alive = false; clearInterval(t1); clearInterval(t2); };
}

/* ===== الأرقام ===== */
const nopts = (n, lo = 0, hi = 20, k = 3) => { const set = new Set([n]); let g = 0; while (set.size < k && g++ < 60) { const d = n + (rnd(7) - 3); if (d >= lo && d <= hi) set.add(d); } return shuffle([...set]).map((x) => ({ label: lbl(x), ok: x === n })); };
const EM = ["🍎", "⭐", "🐟", "🎈", "🍌", "🦋", "🚗", "🌸", "🐥", "⚽", "🍓", "🍪"];
function gAdd(stage) {
  quiz(stage, 10, () => {
    const a = 1 + rnd(7), b = 1 + rnd(Math.min(8, 10 - a)), e = EM[rnd(EM.length)];
    return { say: `${a} زائد ${b} يساوي كم؟`, after: `${a} زائد ${b} يساوي ${a + b}`, html: `<div class="count-box sm">${e.repeat(a)} ➕ ${e.repeat(b)}</div><div class="eq">${a} + ${b} = ؟</div>`, answers: nopts(a + b, 2, 12) };
  });
}
function gSub(stage) {
  quiz(stage, 10, () => {
    const a = 3 + rnd(8), b = 1 + rnd(a - 1), e = EM[rnd(EM.length)];
    return { say: `${a} ناقص ${b} يساوي كم؟`, after: `${a} ناقص ${b} يساوي ${a - b}`, html: `<div class="count-box sm">${e.repeat(a)}</div><div class="prompt">أخذنا ${b}</div><div class="eq">${a} − ${b} = ؟</div>`, answers: nopts(a - b, 0, 10) };
  });
}
function gSeq(stage) {
  quiz(stage, 10, () => {
    const step = Math.random() < 0.7 ? 1 : 2, start = step === 2 ? 2 * (1 + rnd(5)) : 1 + rnd(8);
    const arr = [0, 1, 2, 3].map((i) => start + i * step), m = 1 + rnd(2), ans = arr[m];
    return { say: "ما الرقم الناقص؟", html: `<div class="seq">${arr.map((x, i) => `<span class="${i === m ? "q" : ""}">${i === m ? "؟" : x}</span>`).join("")}</div><div class="prompt">ما الرقم الناقص؟</div>`, answers: nopts(ans, 0, 20) };
  });
}
function gCompare(stage) {
  quiz(stage, 10, () => {
    const a = 1 + rnd(9); let b = 1 + rnd(9); while (b === a) b = 1 + rnd(9);
    const more = Math.random() < 0.7, e = EM[rnd(EM.length)], e2 = EM[rnd(EM.length)];
    const okA = more ? a > b : a < b;
    return { say: more ? "أيهما أكثر؟" : "أيهما أقل؟", html: `<div class="prompt">${more ? "أيهما <b style='color:var(--ok)'>أكثر</b>؟" : "أيهما <b style='color:var(--bad)'>أقل</b>؟"}</div>`, answers: [{ label: `<span class="grp">${e.repeat(a)}</span>`, ok: okA }, { label: `<span class="grp">${(e2 === e ? "🍉" : e2).repeat(b)}</span>`, ok: !okA }] };
  });
}
function gOrder(stage) {
  const sizes = [5, 7, 9];
  let r = 0, mistakes = 0;
  function next() {
    if (r >= sizes.length) return finish(stage, Math.max(0, 3 - Math.floor(mistakes / 3)), 3, mistakes ? `أخطأت ${mistakes} مرة` : "بدون أخطاء!");
    setDots(sizes.length, r, r);
    const n = sizes[r]; let need = 1;
    stage.innerHTML = `<div class="prompt">المس الأرقام من <b>1</b> إلى <b>${n}</b> بالترتيب</div><div class="ordgrid">${shuffle(Array.from({ length: n }, (_, i) => i + 1)).map((x) => `<button class="ord" data-n="${x}" style="background:${COLORS[x % COLORS.length]}">${x}</button>`).join("")}</div>`;
    stage.querySelectorAll(".ord").forEach((b) => b.onclick = async () => {
      if (+b.dataset.n === need) { b.classList.add("hit"); sfx.note(need - 1); speak(String(need)); need++; if (need > n) { sfx.ok(); confetti(innerWidth / 2, innerHeight / 3, 50); await wait(900); r++; next(); } }
      else { mistakes++; sfx.bad(); b.classList.add("no"); setTimeout(() => b.classList.remove("no"), 400); }
    });
  }
  next();
}

/* ===== الألوان والأشكال ===== */
const COLS = [["أحمر", "#EF4444"], ["أزرق", "#3B82F6"], ["أخضر", "#22C55E"], ["أصفر", "#FACC15"], ["برتقالي", "#F97316"], ["بنفسجي", "#8B5CF6"], ["وردي", "#EC4899"], ["بني", "#92400E"], ["أسود", "#111827"], ["أبيض", "#FFFFFF"], ["رمادي", "#9CA3AF"]];
function gColor(stage) {
  const seq = pick(COLS, 10).length ? Array.from({ length: 10 }, () => COLS[rnd(COLS.length)]) : [];
  quiz(stage, 10, (i) => {
    const c = seq[i], others = pick(COLS.filter((x) => x[0] !== c[0]), 3);
    return { say: "ما هذا اللون؟", after: c[0], html: `<div class="swatch" style="background:${c[1]}"></div><div class="prompt">ما هذا اللون؟</div>`, answers: shuffle([c, ...others]).map((x) => ({ label: lbl(x[0]), txt: true, ok: x[0] === c[0] })) };
  });
}
const CITEMS = [["🍎", "أحمر"], ["🍓", "أحمر"], ["🌹", "أحمر"], ["🍌", "أصفر"], ["🌻", "أصفر"], ["🐥", "أصفر"], ["🍊", "برتقالي"], ["🥕", "برتقالي"], ["🎃", "برتقالي"], ["🍏", "أخضر"], ["🐸", "أخضر"], ["🥒", "أخضر"], ["🐢", "أخضر"], ["🫐", "أزرق"], ["🐳", "أزرق"], ["🦋", "أزرق"], ["🍇", "بنفسجي"], ["🍆", "بنفسجي"], ["🐻", "بني"], ["🍫", "بني"], ["🐧", "أسود"], ["🕷️", "أسود"], ["☁️", "أبيض"], ["🐑", "أبيض"], ["🌸", "وردي"], ["🐷", "وردي"]];
function gColorItem(stage) {
  quiz(stage, 10, () => {
    const t = CITEMS[rnd(CITEMS.length)], col = t[1];
    const wrong = pick(CITEMS.filter((x) => x[1] !== col), 2);
    return { say: `أي شيء لونه ${col}؟`, html: `<div class="prompt">أي شيء لونه <b class="cname" style="background:${COLS.find((x) => x[0] === col)[1]};${col === "أبيض" ? "color:#333;border:2px solid #ccc" : ""}">${col}</b>؟</div>`, answers: shuffle([t, ...wrong]).map((x) => ({ label: lbl(x[0]), ok: x[1] === col })) };
  });
}
const SHAPES = [["دائرة", (f) => `<circle cx="50" cy="50" r="40" fill="${f}"/>`], ["مربع", (f) => `<rect x="12" y="12" width="76" height="76" rx="4" fill="${f}"/>`], ["مثلث", (f) => `<polygon points="50,10 92,88 8,88" fill="${f}"/>`], ["مستطيل", (f) => `<rect x="6" y="26" width="88" height="48" rx="4" fill="${f}"/>`], ["نجمة", (f) => `<polygon points="50,6 62,38 95,38 68,58 78,92 50,72 22,92 32,58 5,38 38,38" fill="${f}"/>`], ["قلب", (f) => `<path d="M50 88 C10 56 6 28 28 18 C40 13 50 22 50 30 C50 22 60 13 72 18 C94 28 90 56 50 88Z" fill="${f}"/>`], ["معيّن", (f) => `<polygon points="50,6 92,50 50,94 8,50" fill="${f}"/>`], ["نصف دائرة", (f) => `<path d="M8 70 A42 42 0 0 1 92 70Z" fill="${f}"/>`]];
function gShape(stage) {
  quiz(stage, 10, () => {
    const sh = SHAPES[rnd(SHAPES.length)], col = COLS[rnd(8)][1];
    const others = pick(SHAPES.filter((x) => x[0] !== sh[0]), 3);
    return { say: "ما هذا الشكل؟", after: sh[0], html: `<svg class="shape" viewBox="0 0 100 100">${sh[1](col)}</svg><div class="prompt">ما هذا الشكل؟</div>`, answers: shuffle([sh, ...others]).map((x) => ({ label: lbl(x[0]), txt: true, ok: x[0] === sh[0] })) };
  });
}

/* ===== الحيوانات والمعاني ===== */
const ANIMALS = [["🦁", "أسد"], ["🐘", "فيل"], ["🐵", "قرد"], ["🦒", "زرافة"], ["🐴", "حصان"], ["🐄", "بقرة"], ["🐑", "خروف"], ["🐪", "جمل"], ["🐻", "دب"], ["🐰", "أرنب"], ["🦆", "بطة"], ["🐔", "دجاجة"], ["🐸", "ضفدع"], ["🐟", "سمكة"], ["🐝", "نحلة"], ["🦋", "فراشة"], ["🐢", "سلحفاة"], ["🐊", "تمساح"], ["🐺", "ذئب"], ["🦊", "ثعلب"], ["🐋", "حوت"], ["🐬", "دلفين"], ["🐯", "نمر"], ["🐶", "كلب"], ["🐱", "قطة"], ["🐧", "بطريق"], ["🦅", "نسر"], ["🦉", "بومة"], ["🦚", "طاووس"], ["🐍", "ثعبان"], ["🐙", "أخطبوط"], ["🦀", "سرطان"], ["🐿️", "سنجاب"], ["🦓", "حمار وحشي"]];
function gAnimal(stage) {
  const seq = pick(ANIMALS, 10);
  quiz(stage, 10, (i) => {
    const a = seq[i], others = pick(ANIMALS.filter((x) => x[1] !== a[1]), 3);
    return { say: "ما اسم هذا الحيوان؟", after: a[1], html: `<div class="emo">${a[0]}</div><div class="prompt">ما اسم هذا الحيوان؟</div>`, answers: shuffle([a, ...others]).map((x) => ({ label: lbl(x[1]), txt: true, ok: x[1] === a[1] })) };
  });
}
const SOUNDS = [["🐶", "كلب", "ينبح"], ["🐱", "قطة", "تموء"], ["🐄", "بقرة", "تخور"], ["🐑", "خروف", "يثغو"], ["🐓", "ديك", "يصيح"], ["🐴", "حصان", "يصهل"], ["🦁", "أسد", "يزأر"], ["🦆", "بطة", "تقاقي"], ["🐸", "ضفدع", "ينقّ"], ["🐝", "نحلة", "تطنّ"], ["🐦", "عصفور", "يغرّد"], ["🐍", "ثعبان", "يفحّ"], ["🐺", "ذئب", "يعوي"], ["🐘", "فيل", "ينفخ"]];
function gSound(stage) {
  const seq = pick(SOUNDS, 10);
  quiz(stage, 10, (i) => {
    const a = seq[i], others = pick(SOUNDS.filter((x) => x[2] !== a[2]), 2);
    return { say: `ماذا يفعل ${a[1]}؟`, after: `${a[1]} ${a[2]}`, html: `<div class="emo">${a[0]}</div><div class="prompt">${a[1]}... ماذا يفعل؟</div>`, answers: shuffle([a, ...others]).map((x) => ({ label: lbl(x[2]), txt: true, ok: x[2] === a[2] })) };
  });
}
function gShadow(stage) {
  const seq = pick(ANIMALS, 10);
  quiz(stage, 10, (i) => {
    const a = seq[i], others = pick(ANIMALS.filter((x) => x[1] !== a[1]), 2);
    return { say: "من هو صاحب الظل؟", after: a[1], html: `<div class="emo shadow">${a[0]}</div><div class="prompt">من هو صاحب الظل؟</div>`, answers: shuffle([a, ...others]).map((x) => ({ label: lbl(x[0]), ok: x[1] === a[1] })) };
  });
}
const OPP = [["كبير", "صغير"], ["طويل", "قصير"], ["حار", "بارد"], ["فوق", "تحت"], ["سريع", "بطيء"], ["ثقيل", "خفيف"], ["نظيف", "وسخ"], ["مفتوح", "مغلق"], ["نهار", "ليل"], ["سعيد", "حزين"], ["قريب", "بعيد"], ["جديد", "قديم"], ["ممتلئ", "فارغ"], ["غني", "فقير"], ["قوي", "ضعيف"], ["أمام", "خلف"], ["داخل", "خارج"], ["ناعم", "خشن"], ["رطب", "جاف"], ["صباح", "مساء"]];
function gOpposite(stage) {
  const seq = pick(OPP, 10);
  quiz(stage, 10, (i) => {
    const p = seq[i], flip = Math.random() < 0.5, q = flip ? p[1] : p[0], a = flip ? p[0] : p[1];
    const others = pick(OPP.flatMap((x) => x).filter((x) => x !== q && x !== a), 2);
    return { say: `ما عكس ${q}؟`, after: `عكس ${q} هو ${a}`, html: `<div class="bigw">${q}</div><div class="prompt">ما عكس هذه الكلمة؟</div>`, answers: shuffle([a, ...others]).map((x) => ({ label: lbl(x), txt: true, ok: x === a })) };
  });
}

/* ===== التحدي اليومي ===== */
const GM_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const calIcon = (big) => { const d = new Date(); return `<span class="cal${big ? " big" : ""}"><i>${GM_AR[d.getMonth()]}</i><b>${d.getDate()}</b></span>`; };
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const yesterdayKey = () => { const d = new Date(Date.now() - 86400000); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const streakNow = () => (dly.last === todayKey() || dly.last === yesterdayKey()) ? dly.streak : 0;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hashStr = (s2) => { let h = 2166136261; for (const c of s2) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const DAILYGAME = { id: "daily", get ic() { return calIcon(); }, t: "التحدي اليومي", run: dailyRun };
function dailyRun(stage) {
  const qg = GAMES.filter((g) => g.q), rng = mulberry(hashStr(todayKey()));
  const list = qg.map((g) => [rng(), g]).sort((a, b) => a[0] - b[0]).slice(0, 5).map((x) => x[1]);
  let idx = 0, total = 0;
  DAILY.active = true; DAILY.n = 2; DAILY.totalAll = 10;
  const runNext = () => {
    if (idx >= list.length) { DAILY.active = false; return dailyFinish(stage, total); }
    DAILY.offset = idx * 2;
    DAILY.cb = (sc) => { total += sc; idx++; sfx.whoosh(); runNext(); };
    const t = $(".bar .title"); if (t) t.innerHTML = `${calIcon()} ${list[idx].ic} ${list[idx].t}`;
    list[idx].run(stage);
  };
  cleanup = () => { DAILY.active = false; };
  runNext();
}
function dailyFinish(stage, score) {
  const ratio = score / 10, st = ratio >= 0.9 ? 3 : ratio >= 0.65 ? 2 : ratio >= 0.35 ? 1 : 0;
  const before = totalStars();
  let bonus = false;
  if (dly.last !== todayKey() && score >= 5) { dly.streak = dly.last === yesterdayKey() ? dly.streak + 1 : 1; dly.last = todayKey(); dly.done++; saveDly(); bonus = true; }
  checkUnlock(before);
  sfx.win(); setTimeout(() => sfx.clap(), 700); confetti(innerWidth / 2, innerHeight / 3, 120); setTimeout(() => confetti(innerWidth * .2, innerHeight / 2, 60), 250); setTimeout(() => confetti(innerWidth * .8, innerHeight / 2, 60), 450);
  const t = $(".bar .title"); if (t) t.innerHTML = `${calIcon()} التحدي اليومي`;
  setDots(0, 0, -1);
  stage.innerHTML = `<div class="win"><div class="trophy">${st === 3 ? "🏆" : st === 2 ? "🥈" : st === 1 ? "🥉" : "💪"}</div>
    <h2>${score >= 5 ? `أحسنت يا ${esc(CHILD)}! أنجزت تحدي اليوم` : `حاول مرة ثانية يا ${esc(CHILD)}`}</h2>
    <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= st ? "" : "off"}">⭐</span>`).join("")}</div>
    <p class="prompt">${score} من 10</p>
    ${bonus ? `<p class="prompt bonus">🎁 ربحت 3 نجوم هدية · 🔥 ${dly.streak} ${dly.streak === 1 ? "يوم" : "أيام"} متتالية</p>` : score >= 5 ? `<p class="prompt">✅ سبق وربحت هدية اليوم</p>` : `<p class="prompt">أجب عن 5 أسئلة صحيحة على الأقل لتربح الهدية</p>`}
    <div class="row"><button class="btn-big alt" id="garden">🏆 حديقتي</button><button class="btn-big" id="menu">🏠 الألعاب</button></div></div>`;
  setTimeout(() => speak(score >= 5 ? `أحسنت وبارك الله فيك يا ${CHILD}` : `حاول مرة ثانية يا ${CHILD}`), 1200);
  $("#garden").onclick = () => go(garden); $("#menu").onclick = () => go(home);
}

/* ===== حديقة الشخصيات ===== */
function garden() {
  const tot = totalStars(), nextK = CHARS.findIndex((_, k) => tot < thr(k)), uc = unlockedCount();
  app.innerHTML = `<div class="top"><button class="pill btn" id="back">→ رجوع</button><span class="pill">⭐ ${tot}</span></div>
    <div class="hero"><div class="mascot">🏆</div><h1>حديقة الشخصيات</h1><p>${uc} من ${CHARS.length} شخصية مفتوحة</p></div>
    ${nextK >= 0 ? `<div class="gprog"><div class="gbar"><i style="width:${Math.min(100, Math.round(((tot - thr(nextK - 1 < 0 ? 0 : nextK - 1)) / (thr(nextK) - thr(nextK - 1 < 0 ? 0 : nextK - 1))) * 100))}%"></i></div><small>تحتاج ${thr(nextK) - tot} ⭐ لتفتح <b>${CHARS[nextK][0]}</b></small></div>` : `<p class="prompt">🎉 فتحت كل الشخصيات! أنت بطل حقيقي</p>`}
    <div class="chars">${CHARS.map((c, k) => tot >= thr(k) ? `<button class="chr on" data-k="${k}"><span>${c[0]}</span><b>${c[1]}</b></button>` : `<div class="chr off"><span>❓</span><b>🔒 ${thr(k)} ⭐</b></div>`).join("")}</div>`;
  $("#back").onclick = () => go(home);
  app.querySelectorAll(".chr.on").forEach((b) => b.onclick = () => { const c = CHARS[+b.dataset.k]; sfx.note(+b.dataset.k); b.classList.remove("jump"); void b.offsetWidth; b.classList.add("jump"); speak(c[1]); confetti(b.getBoundingClientRect().left + 40, b.getBoundingClientRect().top, 16); });
}

/* ===== لعبة الترتيب العامة ===== */
function seqGame(stage, sets) {
  let r = 0, mistakes = 0;
  function next() {
    if (r >= sets.length) return finish(stage, Math.max(0, sets.length - Math.floor(mistakes / 2)), sets.length, mistakes ? `أخطاء: ${mistakes}` : "بدون أخطاء!");
    setDots(sets.length, r, r);
    const set = sets[r], items = set.items; let need = 0;
    const long = items.some((x) => x.length > 16);
    stage.innerHTML = `<div class="prompt">${set.title}</div><div class="seqout ${long ? "long" : ""}" id="out"></div><div class="seqbtns ${long ? "long" : ""}">${shuffle(items.map((t, i) => ({ t, i }))).map((x) => `<button class="seqbtn" data-i="${x.i}">${x.t}</button>`).join("")}</div>`;
    stage.querySelectorAll(".seqbtn").forEach((b) => b.onclick = async () => {
      if (+b.dataset.i === need) {
        b.style.visibility = "hidden"; sfx.note(need); $("#out").insertAdjacentHTML("beforeend", `<span class="seqit">${items[need]}</span>`); speak(items[need]); need++;
        if (need === items.length) { sfx.ok(); setTimeout(() => sfx.star(), 250); confetti(innerWidth / 2, innerHeight / 3, 50); await wait(1500); r++; next(); }
      } else { mistakes++; sfx.bad(); b.classList.add("no"); setTimeout(() => b.classList.remove("no"), 400); }
    });
  }
  next();
}

/* ===== القرآن الكريم ===== */
const SURAHS = [
  ["الفاتحة", ["بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", "الرَّحْمَٰنِ الرَّحِيمِ", "مَالِكِ يَوْمِ الدِّينِ", "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ"]],
  ["الإخلاص", ["قُلْ هُوَ اللَّهُ أَحَدٌ", "اللَّهُ الصَّمَدُ", "لَمْ يَلِدْ وَلَمْ يُولَدْ", "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ"]],
  ["الفلق", ["قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", "مِن شَرِّ مَا خَلَقَ", "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ", "وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ", "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ"]],
  ["الناس", ["قُلْ أَعُوذُ بِرَبِّ النَّاسِ", "مَلِكِ النَّاسِ", "إِلَٰهِ النَّاسِ", "مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ", "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ", "مِنَ الْجِنَّةِ وَالنَّاسِ"]],
  ["الكوثر", ["إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ", "فَصَلِّ لِرَبِّكَ وَانْحَرْ", "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ"]],
  ["العصر", ["وَالْعَصْرِ", "إِنَّ الْإِنسَانَ لَفِي خُسْرٍ", "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ"]],
  ["النصر", ["إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ", "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا", "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ إِنَّهُ كَانَ تَوَّابًا"]]
];
function gSurahOrder(stage) {
  const pool = SURAHS.filter((s2) => s2[1].length <= 4);
  seqGame(stage, pick(pool, 3).map((s2) => ({ title: `رتّب آيات سورة <b style="color:var(--pri)">${s2[0]}</b>`, items: s2[1] })));
}
const lastWord = (t) => t.trim().split(/\s+/).pop();
function gAyahEnd(stage) {
  const all = SURAHS.flatMap((s2) => s2[1].filter((a) => a.trim().split(/\s+/).length >= 3).map((a) => [s2[0], a]));
  const seq = pick(all, 10);
  quiz(stage, 10, (i) => {
    const [sn, a] = seq[i], w = lastWord(a);
    const wrong = pick([...new Set(all.map((x) => lastWord(x[1])).filter((x) => x !== w))], 2);
    const shown = a.trim().split(/\s+/).slice(0, -1).join(" ") + " ＿＿＿";
    return { say: "أكمل الآية", one: false, html: `<div class="ayah">${shown}</div><div class="prompt">أكمل الآية <small>(سورة ${sn})</small></div>`, answers: shuffle([w, ...wrong]).map((x) => ({ label: lbl(x), txt: true, ok: x === w })) };
  });
}
function gWhichSurah(stage) {
  const names = SURAHS.map((x) => x[0]);
  const all = SURAHS.flatMap((s2) => s2[1].map((a) => [s2[0], a]));
  const seq = pick(all, 10);
  quiz(stage, 10, (i) => {
    const [sn, a] = seq[i];
    return { say: "من أي سورة هذه الآية؟", after: `سورة ${sn}`, html: `<div class="ayah">${a}</div><div class="prompt">من أي سورة هذه الآية؟</div>`, answers: shuffle([sn, ...pick(names.filter((x) => x !== sn), 2)]).map((x) => ({ label: lbl(x), txt: true, ok: x === sn })) };
  });
}

/* ===== الأدعية ===== */
const DUAS = [
  ["قبل الأكل", "🍽️", "بِسْمِ اللَّهِ"],
  ["بعد الأكل", "🥛", "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ"],
  ["عند النوم", "😴", "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا"],
  ["عند الاستيقاظ", "⏰", "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ"],
  ["عند العطاس", "🤧", "الْحَمْدُ لِلَّهِ"],
  ["عند دخول المسجد", "🕌", "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ"],
  ["عند الخروج من المسجد", "🚪", "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ"],
  ["عند ركوب السيارة", "🚗", "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ"],
  ["عند نزول المطر", "🌧️", "اللَّهُمَّ صَيِّبًا نَافِعًا"],
  ["عند لبس الثوب", "👕", "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ"],
  ["عند الغضب", "😠", "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ"],
  ["عند دخول المنزل", "🏠", "بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى رَبِّنَا تَوَكَّلْنَا"],
  ["عند الخروج من المنزل", "🚶", "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ"]
];
function gDuaWhen(stage) {
  const seq = pick(DUAS, 8);
  quiz(stage, 8, (i) => {
    const d = seq[i];
    return { say: `ماذا نقول ${d[0]}؟`, after: d[2], one: true, html: `<div class="emo">${d[1]}</div><div class="prompt">ماذا نقول <b style="color:var(--pri)">${d[0]}</b>؟</div>`, answers: shuffle([d, ...pick(DUAS.filter((x) => x !== d), 2)]).map((x) => ({ label: lbl(x[2]), txt: true, ok: x === d })) };
  });
}
function gDuaEnd(stage) {
  const pool = DUAS.filter((d) => d[2].split(/\s+/).length >= 3);
  const seq = pick(pool, Math.min(8, pool.length));
  quiz(stage, seq.length, (i) => {
    const d = seq[i], w = lastWord(d[2]);
    const wrong = pick([...new Set(pool.map((x) => lastWord(x[2])).filter((x) => x !== w))], 2);
    return { say: `${d[0]}. أكمل الدعاء`, after: d[2], html: `<div class="emo">${d[1]}</div><div class="prompt">${d[0]}</div><div class="ayah">${d[2].split(/\s+/).slice(0, -1).join(" ")} ＿＿＿</div>`, answers: shuffle([w, ...wrong]).map((x) => ({ label: lbl(x), txt: true, ok: x === w })) };
  });
}

/* ===== الأيام والأشهر ===== */
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const HMONTHS = ["محرّم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوّال", "ذو القعدة", "ذو الحجة"];
const GMONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const win = (arr, len, cyc) => { const st = rnd(cyc ? arr.length : arr.length - len + 1); return Array.from({ length: len }, (_, k) => arr[(st + k) % arr.length]); };
function gDayOrder(stage) {
  seqGame(stage, [{ title: "رتّب أيام الأسبوع من الأحد", items: DAYS }, { title: "رتّب هذه الأيام المتتابعة", items: win(DAYS, 4, true) }, { title: "رتّب هذه الأيام المتتابعة", items: win(DAYS, 5, true) }]);
}
function gMonthOrder(stage) {
  seqGame(stage, [{ title: "رتّب هذه الأشهر الهجرية", items: win(HMONTHS, 4, false) }, { title: "رتّب هذه الأشهر الهجرية", items: win(HMONTHS, 5, false) }, { title: "رتّب هذه الأشهر الهجرية", items: win(HMONTHS, 6, false) }]);
}
function gGregOrder(stage) {
  seqGame(stage, [{ title: "رتّب هذه الأشهر", items: win(GMONTHS, 4, false) }, { title: "رتّب هذه الأشهر", items: win(GMONTHS, 6, false) }, { title: "رتّب هذه الأشهر", items: win(GMONTHS, 8, false) }]);
}
function gDayNext(stage) {
  quiz(stage, 10, () => {
    const i = rnd(7), t = rnd(3);
    let text, ans;
    if (t === 0) { text = `ما اليوم الذي بعد ${DAYS[i]}؟`; ans = DAYS[(i + 1) % 7]; }
    else if (t === 1) { text = `ما اليوم الذي قبل ${DAYS[i]}؟`; ans = DAYS[(i + 6) % 7]; }
    else { const n = 1 + rnd(7); text = `ما ترتيب يوم ${DAYS[i]} في الأسبوع (يبدأ بالأحد)؟`; return { say: text, html: `<div class="prompt">${text}</div>`, answers: nopts(i + 1, 1, 7).map((a) => ({ ...a })) }; }
    return { say: text, after: ans, html: `<div class="emo" style="animation:none">${calIcon(true)}</div><div class="prompt">${text}</div>`, answers: shuffle([ans, ...pick(DAYS.filter((x) => x !== ans), 2)]).map((x) => ({ label: lbl(x), txt: true, ok: x === ans })) };
  });
}
function gMonthNext(stage) {
  quiz(stage, 10, () => {
    const i = rnd(12), t = rnd(3);
    if (t === 2) { const text = `ما ترتيب شهر ${HMONTHS[i]} بين الأشهر الهجرية؟`; return { say: text, html: `<div class="emo" style="animation:none">🌙</div><div class="prompt">${text}</div>`, answers: nopts(i + 1, 1, 12) }; }
    const nxt = t === 0, ans = HMONTHS[(i + (nxt ? 1 : 11)) % 12], text = `ما الشهر ${nxt ? "الذي بعد" : "الذي قبل"} ${HMONTHS[i]}؟`;
    return { say: text, after: ans, html: `<div class="emo" style="animation:none">🌙</div><div class="prompt">${text}</div>`, answers: shuffle([ans, ...pick(HMONTHS.filter((x) => x !== ans), 2)]).map((x) => ({ label: lbl(x), txt: true, ok: x === ans })) };
  });
}

const savedName = (() => { try { return localStorage.getItem("hg_cur") || ""; } catch { return ""; } })();
if (savedName && profiles().includes(savedName)) { loadProfile(savedName); home(); } else login();
})();
