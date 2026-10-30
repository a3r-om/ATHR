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
const GAMES = [
  { id: "letters", ic: "🔤", t: "أين الحرف؟", s: "اسمع الحرف واختره", c: "linear-gradient(135deg,#8B5CF6,#6D3FE0)", run: gLetters },
  { id: "first", ic: "🍎", t: "الحرف الأول", s: "بماذا تبدأ الصورة؟", c: "linear-gradient(135deg,#F97316,#EA580C)", run: gFirst },
  { id: "build", ic: "🧩", t: "رتّب الكلمة", s: "كوّن الكلمة من الحروف", c: "linear-gradient(135deg,#10B981,#059669)", run: gBuild },
  { id: "match", ic: "🔗", t: "وصّل بخط", s: "وصّل الصورة بالكلمة", c: "linear-gradient(135deg,#EC4899,#DB2777)", run: gMatch },
  { id: "missing", ic: "✍️", t: "أكمل الكلمة", s: "ما الحرف الناقص؟", c: "linear-gradient(135deg,#3B82F6,#2563EB)", run: gMissing },
  { id: "memory", ic: "🃏", t: "لعبة الذاكرة", s: "اعثر على الأزواج", c: "linear-gradient(135deg,#14B8A6,#0D9488)", run: gMemory },
  { id: "bubbles", ic: "🫧", t: "فقاعات الحروف", s: "فرقع الحرف المطلوب", c: "linear-gradient(135deg,#06B6D4,#0891B2)", run: gBubbles },
  { id: "count", ic: "🔢", t: "عدّ معي", s: "كم عددها؟", c: "linear-gradient(135deg,#F59E0B,#D97706)", run: gCount }
];
let cleanup = null;
function go(fn) { if (cleanup) { cleanup(); cleanup = null; } try { speechSynthesis.cancel(); } catch { /* */ } fn(); window.scrollTo(0, 0); }

function home() {
  app.innerHTML = `
    <div class="top"><a class="pill" href="../">🏪 المتجر</a><button class="pill btn" id="mute" aria-label="الصوت">${muted ? "🔇" : "🔊"}</button><span class="pill">⭐ ${totalStars()}</span></div>
    <div class="hero"><div class="mascot">🦉</div><h1>ألعاب حروف وألوان</h1><p>العب وتعلّم واجمع النجوم!</p></div>
    <div class="grid">${GAMES.map((g) => `<button class="gcard" data-g="${g.id}" style="background:${g.c}"><span class="ic">${g.ic}</span><b>${g.t}</b><small>${g.s}</small><span class="st">${stars(prog[g.id] || 0)}</span></button>`).join("")}</div>
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
        lock = true; b.classList.add("ok"); sfx.ok();
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

home();
})();
