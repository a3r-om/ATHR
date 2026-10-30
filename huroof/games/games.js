(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const LETTERS = [["ا","ألف"],["ب","باء"],["ت","تاء"],["ث","ثاء"],["ج","جيم"],["ح","حاء"],["خ","خاء"],["د","دال"],["ذ","ذال"],["ر","راء"],["ز","زاي"],["س","سين"],["ش","شين"],["ص","صاد"],["ض","ضاد"],["ط","طاء"],["ظ","ظاء"],["ع","عين"],["غ","غين"],["ف","فاء"],["ق","قاف"],["ك","كاف"],["ل","لام"],["م","ميم"],["ن","نون"],["ه","هاء"],["و","واو"],["ي","ياء"]];
const LN = Object.fromEntries(LETTERS);
const norm = (c) => ({ "أ": "ا", "إ": "ا", "آ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي" }[c] || c);
const WORDS = [["🍎","تفاحة"],["🐱","قطة"],["🦆","بطة"],["🐪","جمل"],["🐟","سمكة"],["☀️","شمس"],["🌙","قمر"],["⭐","نجمة"],["🏠","بيت"],["📖","كتاب"],["🌹","وردة"],["🐘","فيل"],["🦁","أسد"],["🍌","موزة"],["🍋","ليمون"],["🍇","عنب"],["🚗","سيارة"],["✈️","طائرة"],["✏️","قلم"],["⚽","كرة"],["🐴","حصان"],["🐰","أرنب"],["🦋","فراشة"],["🌴","نخلة"],["🚢","سفينة"],["🐻","دب"],["🐓","ديك"],["🦒","زرافة"],["🐊","تمساح"],["🖐️","يد"],["🐢","سلحفاة"],["🐝","نحلة"],["🐦","عصفور"],["🥕","جزرة"],["🍉","بطيخ"],["🥛","حليب"],["👁️","عين"],["🌧️","مطر"],["🔑","مفتاح"],["🕌","مسجد"],["🐑","خروف"],["🐺","ذئب"],["🦊","ثعلب"],["🐋","حوت"],["🍯","عسل"],["🎈","بالون"],["🍞","خبز"],["✉️","ظرف"],["🐸","ضفدع"],["🦅","صقر"],["☁️","غيمة"],["🥁","طبل"],["🌸","زهرة"],["🧸","دمية"],["🎒","حقيبة"],["🍪","بسكويت"]];
const first = (w) => norm(w[1][0]);
const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#14B8A6", "#F97316"];

/* ---------- الصوت والنطق ---------- */
let muted = false, actx = null;
try { muted = localStorage.getItem("hg_mute") === "1"; } catch { /* */ }
function tone(freq, dur = 0.14, type = "sine", delay = 0, vol = 0.16) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + delay;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch { /* */ }
}
const sfx = {
  ok() { tone(660, .12); tone(880, .16, "sine", .1); },
  bad() { tone(180, .22, "sawtooth", 0, .1); },
  pop() { tone(520, .08, "triangle"); tone(780, .08, "triangle", .05); },
  flip() { tone(400, .05, "triangle"); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, "sine", i * .12)); }
};
function speak(text) {
  if (muted || !("speechSynthesis" in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA"; u.rate = 0.85; u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch { /* */ }
}

/* ---------- الاحتفال ---------- */
const cv = $("#confetti"), cx = cv.getContext("2d");
let parts = [], raf = 0;
function sizeCv() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
addEventListener("resize", sizeCv); sizeCv();
function confetti(x = innerWidth / 2, y = innerHeight / 3, n = 70) {
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 3, g: .35, s: 6 + Math.random() * 7, c: COLORS[rnd(COLORS.length)], r: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 70 + rnd(40) });
  if (!raf) loop();
}
function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => p.life > 0);
  const k = devicePixelRatio;
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
try { prog = JSON.parse(localStorage.getItem("hg_prog") || "{}") || {}; } catch { prog = {}; }
const saveStars = (id, n) => { if ((prog[id] || 0) < n) { prog[id] = n; try { localStorage.setItem("hg_prog", JSON.stringify(prog)); } catch { /* */ } } };
const totalStars = () => Object.values(prog).reduce((a, b) => a + b, 0);

/* ---------- الألعاب ---------- */
const CATS = [["abc", "🔤 الحروف والكلمات"], ["num", "🔢 الأرقام والحساب"], ["col", "🎨 الألوان والأشكال"], ["ani", "🐾 الحيوانات والمعاني"]];
const GAMES = [
  { cat: "abc", id: "letters", ic: "🔤", t: "أين الحرف؟", s: "اسمع الحرف واختره", c: "linear-gradient(135deg,#8B5CF6,#6D3FE0)", run: gLetters },
  { cat: "abc", id: "first", ic: "🍎", t: "الحرف الأول", s: "بماذا تبدأ الصورة؟", c: "linear-gradient(135deg,#F97316,#EA580C)", run: gFirst },
  { cat: "abc", id: "build", ic: "🧩", t: "رتّب الكلمة", s: "كوّن الكلمة من الحروف", c: "linear-gradient(135deg,#10B981,#059669)", run: gBuild },
  { cat: "abc", id: "match", ic: "🔗", t: "وصّل بخط", s: "وصّل الصورة بالكلمة", c: "linear-gradient(135deg,#EC4899,#DB2777)", run: gMatch },
  { cat: "abc", id: "missing", ic: "✍️", t: "أكمل الكلمة", s: "ما الحرف الناقص؟", c: "linear-gradient(135deg,#3B82F6,#2563EB)", run: gMissing },
  { cat: "abc", id: "memory", ic: "🃏", t: "لعبة الذاكرة", s: "اعثر على الأزواج", c: "linear-gradient(135deg,#14B8A6,#0D9488)", run: gMemory },
  { cat: "abc", id: "bubbles", ic: "🫧", t: "فقاعات الحروف", s: "فرقع الحرف المطلوب", c: "linear-gradient(135deg,#06B6D4,#0891B2)", run: gBubbles },
  { cat: "num", id: "count", ic: "🔢", t: "عدّ معي", s: "كم عددها؟", c: "linear-gradient(135deg,#F59E0B,#D97706)", run: gCount },
  { cat: "num", id: "add", ic: "➕", t: "الجمع", s: "اجمع الأعداد", c: "linear-gradient(135deg,#22C55E,#15803D)", run: gAdd },
  { cat: "num", id: "sub", ic: "➖", t: "الطرح", s: "اطرح الأعداد", c: "linear-gradient(135deg,#F43F5E,#BE123C)", run: gSub },
  { cat: "num", id: "seq", ic: "🔟", t: "أكمل العدد", s: "ما الرقم الناقص؟", c: "linear-gradient(135deg,#6366F1,#4338CA)", run: gSeq },
  { cat: "num", id: "cmp", ic: "⚖️", t: "أيهما أكثر؟", s: "قارن بين المجموعتين", c: "linear-gradient(135deg,#0EA5E9,#0369A1)", run: gCompare },
  { cat: "num", id: "order", ic: "🏃", t: "رتّب الأرقام", s: "المس الأرقام بالترتيب", c: "linear-gradient(135deg,#D946EF,#A21CAF)", run: gOrder },
  { cat: "col", id: "color", ic: "🌈", t: "ما هذا اللون؟", s: "تعرّف على الألوان", c: "linear-gradient(135deg,#F97316,#DB2777)", run: gColor },
  { cat: "col", id: "coloritem", ic: "🍓", t: "أي شيء بهذا اللون؟", s: "اختر الشيء الملوّن", c: "linear-gradient(135deg,#EF4444,#B91C1C)", run: gColorItem },
  { cat: "col", id: "shape", ic: "🔷", t: "ما هذا الشكل؟", s: "دائرة، مربع، مثلث...", c: "linear-gradient(135deg,#3B82F6,#1D4ED8)", run: gShape },
  { cat: "ani", id: "animal", ic: "🦁", t: "اسم الحيوان", s: "ما اسم هذا الحيوان؟", c: "linear-gradient(135deg,#EAB308,#A16207)", run: gAnimal },
  { cat: "ani", id: "sound", ic: "🔊", t: "ما صوته؟", s: "صوت كل حيوان", c: "linear-gradient(135deg,#14B8A6,#0F766E)", run: gSound },
  { cat: "ani", id: "shadow", ic: "👤", t: "من هو الظل؟", s: "خمّن الحيوان من ظله", c: "linear-gradient(135deg,#475569,#1E293B)", run: gShadow },
  { cat: "ani", id: "opp", ic: "↔️", t: "الأضداد", s: "ما عكس الكلمة؟", c: "linear-gradient(135deg,#A855F7,#7E22CE)", run: gOpposite }
];
let cleanup = null;
function go(fn) { if (cleanup) { cleanup(); cleanup = null; } try { speechSynthesis.cancel(); } catch { /* */ } fn(); window.scrollTo(0, 0); }

function home() {
  app.innerHTML = `
    <div class="top"><a class="pill" href="../">🏪 المتجر</a><button class="pill btn" id="mute" aria-label="الصوت">${muted ? "🔇" : "🔊"}</button><span class="pill">⭐ ${totalStars()}</span></div>
    <div class="hero"><div class="mascot">🦉</div><h1>ألعاب حروف وألوان</h1><p>العب وتعلّم واجمع النجوم!</p></div>
    ${CATS.map(([k, name]) => `<h2 class="cat">${name}</h2><div class="grid">${GAMES.filter((g) => g.cat === k).map((g) => `<button class="gcard" data-g="${g.id}" style="background:${g.c}"><span class="ic">${g.ic}</span><b>${g.t}</b><small>${g.s}</small><span class="st">${stars(prog[g.id] || 0)}</span></button>`).join("")}</div>`).join("")}
    <a class="cta" href="../#stories">📚 أعجبتك الألعاب؟ شاهد <b>قصصنا باسم طفلك</b></a>`;
  $("#mute").onclick = () => { muted = !muted; try { localStorage.setItem("hg_mute", muted ? "1" : "0"); } catch { /* */ } $("#mute").textContent = muted ? "🔇" : "🔊"; };
  app.querySelectorAll(".gcard").forEach((b) => b.onclick = () => { tone(600, .08); const g = GAMES.find((x) => x.id === b.dataset.g); go(() => frame(g)); });
}
const stars = (n) => "⭐".repeat(n) + "☆".repeat(3 - n);

let cur = null;
function frame(g) {
  cur = g;
  app.innerHTML = `
    <div class="bar"><button class="pill btn" id="back">→ رجوع</button><div class="title">${g.ic} ${g.t}</div><button class="pill btn" id="mute">${muted ? "🔇" : "🔊"}</button></div>
    <div class="dots" id="dots"></div>
    <div class="stage" id="stage"></div>`;
  $("#back").onclick = () => go(home);
  $("#mute").onclick = () => { muted = !muted; try { localStorage.setItem("hg_mute", muted ? "1" : "0"); } catch { /* */ } $("#mute").textContent = muted ? "🔇" : "🔊"; };
  g.run($("#stage"));
}
function setDots(n, done, curI) {
  $("#dots").innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < done ? "on" : ""}${i === curI ? " cur" : ""}"></i>`).join("");
}
function finish(stage, score, total, msg = "") {
  const ratio = score / total;
  const st = ratio >= 0.9 ? 3 : ratio >= 0.65 ? 2 : ratio >= 0.35 ? 1 : 0;
  saveStars(cur.id, st);
  sfx.win(); confetti(innerWidth / 2, innerHeight / 3, 120); setTimeout(() => confetti(innerWidth * .2, innerHeight / 2, 60), 250); setTimeout(() => confetti(innerWidth * .8, innerHeight / 2, 60), 450);
  stage.innerHTML = `<div class="win"><div class="trophy">${st === 3 ? "🏆" : st === 2 ? "🥈" : st === 1 ? "🥉" : "💪"}</div>
    <h2>${st === 3 ? "ممتاز! أنت بطل!" : st === 2 ? "أحسنت!" : st === 1 ? "جميل! حاول مرة ثانية" : "لا بأس، جرّب مرة أخرى"}</h2>
    <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= st ? "" : "off"}">⭐</span>`).join("")}</div>
    ${msg ? `<p class="prompt">${msg}</p>` : `<p class="prompt">${score} من ${total}</p>`}
    <div class="row"><button class="btn-big" id="again">🔄 العب مرة أخرى</button><button class="btn-big alt" id="menu">🏠 الألعاب</button></div></div>`;
  $("#again").onclick = () => go(() => frame(cur));
  $("#menu").onclick = () => go(home);
}

/* ---------- محرّك الأسئلة ---------- */
function quiz(stage, rounds, make, opt = {}) {
  let i = 0, score = 0, lock = false;
  const total = rounds;
  function next() {
    if (i >= total) return finish(stage, score, total);
    setDots(total, i, i);
    const q = make(i);
    let firstTry = true;
    stage.innerHTML = `${q.html}<div class="opts ${q.answers.length === 3 ? "three" : ""}" id="opts">${q.answers.map((a, k) => `<button class="opt ${a.txt ? "txt" : ""}" data-k="${k}">${a.label}</button>`).join("")}</div>`;
    const say = $("#say"); if (say) say.onclick = () => speak(q.say);
    if (q.say) setTimeout(() => speak(q.say), 250);
    lock = false;
    stage.querySelectorAll(".opt").forEach((b) => b.onclick = async () => {
      if (lock) return;
      const a = q.answers[+b.dataset.k];
      if (a.ok) {
        lock = true; b.classList.add("ok"); sfx.ok(); const sh = stage.querySelector(".shadow"); if (sh) sh.classList.remove("shadow");
        const r = b.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 28);
        if (firstTry) score++;
        if (q.after) speak(q.after);
        await wait(q.after ? 1300 : 900); i++; next();
      } else { b.classList.add("no"); sfx.bad(); firstTry = false; setTimeout(() => b.classList.remove("no"), 450); }
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
    return { say: word, after: word, html: `<div class="emo">${w[0]}</div><div class="bigw">${shown}</div><div class="prompt">ما الحرف الناقص؟</div>`, answers: letterOpts(L, 3).map((a) => ({ ...a, label: lbl(a.label.replace(/<\/?span>/g, "")) })) };
  });
}
/* 4) عدّ معي */
function gCount(stage) {
  const em = ["🍎", "⭐", "🐟", "🎈", "🍌", "🦋", "🚗", "🌸", "🐥", "⚽"];
  quiz(stage, 10, (i) => {
    const n = 1 + rnd(10), e = em[rnd(em.length)];
    const opts = shuffle([n, ...pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => x !== n), 2)]);
    return { say: "كم عددها؟", html: `<div class="count-box">${Array.from({ length: n }, (_, k) => `<span style="animation-delay:${k * 60}ms">${e}</span>`).join("")}</div><div class="prompt">كم عددها؟</div>`, answers: opts.map((x) => ({ label: lbl(x), ok: x === n })) };
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
        slot.textContent = t.dataset.c; slot.classList.add("f"); t.classList.add("used"); sfx.pop(); filled++;
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
        if (matched === 4) setTimeout(() => { r++; next(); }, 1100);
        return true;
      }
      bad++; sfx.bad(); wEl.classList.add("no"); setTimeout(() => wEl.classList.remove("no"), 450); return false;
    }
    E.forEach((e) => {
      e.addEventListener("pointerdown", (ev) => {
        if (e.classList.contains("done")) return;
        e.setPointerCapture(ev.pointerId); drag = { el: e, moved: false };
        E.forEach((x) => x.classList.remove("sel")); e.classList.add("sel"); selected = e; speak(e.dataset.w);
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
      if (a.k === b.k) { opened.forEach((x) => x.classList.add("done")); matched++; $("#pr").textContent = matched; sfx.ok(); speak(a.k); confetti(innerWidth / 2, innerHeight / 2, 30); opened = []; lock = false; if (matched === 6) { await wait(900); finish(stage, Math.max(0, 14 - moves), 14, `أنهيتها في ${moves} حركة`); } }
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
        score++; popped++; $("#sc").textContent = score; sfx.pop(); const r = b.getBoundingClientRect(); confetti(r.left + 40, r.top + 40, 14);
        if (popped % 5 === 0) { target = LETTERS[rnd(28)][0]; $("#tg").textContent = target; speak(`الآن فرقع حرف ${LN[target]}`); }
      } else { sfx.bad(); score = Math.max(0, score - 1); $("#sc").textContent = score; }
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
      if (+b.dataset.n === need) { b.classList.add("hit"); sfx.pop(); speak(String(need)); need++; if (need > n) { sfx.ok(); confetti(innerWidth / 2, innerHeight / 3, 50); await wait(900); r++; next(); } }
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

home();
})();
