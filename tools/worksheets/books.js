(function(){
const L = WSL, { W, H, PAL, ri, pick, shuffle, rr, chunk, txt, emo, card, blank, enTxt } = L;
const AR_DIG = (n) => String(n); // أرقام غربية
const GRADE = ["", "الأول", "الثاني", "الثالث", "الرابع"];
// ---------- أدوات مشتركة ----------
function page(c, col, title, sub, mascot, n, label) { L.bg(c, col); L.header(c, title, sub, col, mascot); L.nameLine(c, col); L.footer(c, n, col, label); }
function cover(c, o) {
    const col = o.col; L.bg(c, col);
    // شريط علوي
    chunk(c, 90, 90, W - 180, 120, 36, col[2], "rgba(0,0,0,.3)");
    txt(c, o.top || "حروف وألوان", W / 2, 150, { size: 54, color: "#FFF" });
    // عنوان ضخم
    const y0 = 330; c.save(); c.shadowColor = "rgba(40,20,80,.3)"; c.shadowBlur = 18; c.shadowOffsetY = 10; c.restore();
    rr(c, 110, y0 - 70, W - 220, 330, 60, "#FFFFFF", col[0], 8, { y: 12, b: 28 });
    txt(c, o.title, W / 2, y0 + (o.title2 ? 15 : 75), { size: 118, color: col[0], stroke: col[2], sw: 0, max: W - 340 });
    if (o.title2) txt(c, o.title2, W / 2, y0 + 130, { size: 90, color: col[2], max: W - 340 });
    txt(c, o.sub, W / 2, y0 + (o.title2 ? 225 : 200), { size: 40, color: "#5C5075", weight: 400, max: W - 300 });
    // مجموعة إيموجي
    const cx = W / 2, cy = 1010; c.save(); c.beginPath(); c.arc(cx, cy, 320, 0, 7); c.fillStyle = col[1]; c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(cx, cy, 320, 0, 7); c.strokeStyle = col[0]; c.lineWidth = 8; c.setLineDash([2, 22]); c.lineCap = "round"; c.stroke(); c.restore();
    emo(c, o.hero, cx, cy, 460);
    (o.around || []).forEach((e, k, a) => { const ang = -Math.PI / 2 + k * 2 * Math.PI / a.length + .3; emo(c, e, cx + Math.cos(ang) * 365, cy + Math.sin(ang) * 365, 110, { rot: (k % 2 ? 1 : -1) * .15 }); });
    // شارات
    const tags = o.tags || []; const tw = 300, gap = 24, total = tags.length * tw + (tags.length - 1) * gap;
    tags.forEach((t, k) => { const x = (W - total) / 2 + k * (tw + gap); chunk(c, x, 1420, tw, 90, 30, col[0], col[2]); txt(c, t, x + tw / 2, 1466, { size: 38, color: "#FFF", max: tw - 30 }); });
    txt(c, o.foot || "جاهز للطباعة A4", W / 2, 1620, { size: 36, color: "#6A5F85", weight: 400 });
    txt(c, "حروف وألوان", W / 2, 1690, { size: 38, color: col[2] });
    return [];
}
function cert(c, o, n) {
    const col = o.col; L.bg(c, col);
    rr(c, 90, 120, W - 180, H - 240, 60, "#FFFFFF", col[0], 12, { y: 10, b: 24 });
    c.save(); c.strokeStyle = "#F5C451"; c.lineWidth = 6; c.setLineDash([2, 18]); c.lineCap = "round"; c.strokeRect(130, 160, W - 260, H - 320); c.restore();
    emo(c, "🏆", W / 2, 400, 280); emo(c, "⭐", 260, 330, 110, { rot: -.3 }); emo(c, "⭐", W - 260, 330, 110, { rot: .3 }); emo(c, "🎉", 240, 600, 100); emo(c, "🎉", W - 240, 600, 100);
    txt(c, "شهادة تقدير", W / 2, 700, { size: 120, color: col[0], stroke: col[2], sw: 0 });
    txt(c, "تُمنح هذه الشهادة للبطل / للبطلة", W / 2, 830, { size: 48, color: "#5C5075", weight: 400 });
    c.save(); c.strokeStyle = col[0]; c.lineWidth = 5; c.setLineDash([2, 14]); c.lineCap = "round"; c.beginPath(); c.moveTo(280, 960); c.lineTo(W - 280, 960); c.stroke(); c.restore();
    txt(c, o.cert, W / 2, 1060, { size: 56, color: col[2], max: W - 340 });
    txt(c, "أحسنت! أنت نجم مبدع ⭐", W / 2, 1160, { size: 54, color: "#2B1B4F" });
    txt(c, "التوقيع: ..................", W - 190, 1500, { size: 40, color: "#5C5075", weight: 400, align: "right" });
    txt(c, "التاريخ: ..................", 600, 1500, { size: 40, color: "#5C5075", weight: 400, align: "right" });
    emo(c, o.hero || "🦉", W / 2, 1330, 170);
    txt(c, "حروف وألوان", W / 2, 1620, { size: 40, color: col[2] });
    return [];
}
function answersPage(c, o, n, collect) {
    const col = PAL.pink; page(c, col, "ورقة الإجابات", "للمعلّم أو ولي الأمر", "🧑‍🏫", n, o.label);
    const colW = 510; let xr = W - 90, y = 350, colI = 0;
    const lineH = 40;
    const flow = (list) => {
        // يلفّ الإجابات في أسطر
        const lines = []; let cur = "";
        c.save(); c.font = `400 30px ${L.FONT}, sans-serif`;
        list.forEach((a, i) => { const tk = `${i + 1}) ${a}`; const t2 = cur ? cur + "   ·   " + tk : tk; if (c.measureText(t2).width > colW - 20 && cur) { lines.push(cur); cur = tk; } else cur = t2; });
        if (cur) lines.push(cur); c.restore(); return lines;
    };
    collect.forEach(({ title, ans }) => {
        const lines = flow(ans); const need = 60 + lines.length * lineH + 26;
        if (y + need > H - 150 && colI === 0) { colI = 1; xr = W / 2 - 25; y = 350; }
        rr(c, xr - colW, y - 24, colW, 48, 14, col[1]); txt(c, title, xr - 14, y, { size: 32, color: col[2], align: "right" }); y += 50;
        lines.forEach((ln) => { const isEn = /^[\x00-\x7F]/.test(ln.replace(/^\d+\) /, "")); txt(c, ln, xr - 10, y, { size: 30, color: "#2B1B4F", weight: 400, align: "right", max: colW - 20, dir: isEn ? "ltr" : "rtl" }); y += lineH; });
        y += 26;
    });
    return [];
}
// بطاقة من ثلاثة خيارات (دوائر)
function choices(c, x, y, opts, col, o = {}) { const gap = o.gap || 96; opts.forEach((s, k) => { const cx = x - k * gap; c.save(); c.beginPath(); c.arc(cx, y, 40, 0, 7); c.fillStyle = col[1]; c.fill(); c.lineWidth = 4; c.strokeStyle = col[0]; c.stroke(); c.restore(); if (o.en) enTxt(c, s, cx, y + 1, { size: o.size || 40, color: col[2] }); else txt(c, s, cx, y, { size: o.size || 42, color: col[2] }); }); }

// ========== أوراق الصفوف ==========
const MATH_COL = PAL.math, AR_COL = PAL.ar, EN_COL = PAL.en, SC_COL = PAL.sci;
const OBJ = ["🍎", "⭐", "🎈", "🐟", "🍪", "🚗", "🌸", "🐥"];
function groupDraw(c, e, n, x, y, size, perRow) { for (let k = 0; k < n; k++) emo(c, e, x - (k % perRow) * size * 1.05, y + Math.floor(k / perRow) * size * 1.05, size, { shadow: false }); }

function mathA(c, g, n) {
    page(c, MATH_COL, "حساب سريع", "احسب بسرعة وبدقّة", "🧮", n, `الصف ${GRADE[g]} · رياضيات`);
    const probs = [], ans = [];
    for (let k = 0; k < 12; k++) {
        let s, a;
        if (g === 1) { const add = k < 6; if (add) { const a1 = ri(1, 9), b1 = ri(1, 10 - a1); s = `${a1} + ${b1}`; a = a1 + b1; } else { const a1 = ri(3, 10), b1 = ri(1, a1 - 1); s = `${a1} − ${b1}`; a = a1 - b1; } }
        else if (g === 2) { if (k < 6) { const a1 = ri(11, 60), b1 = ri(5, 39); s = `${a1} + ${b1}`; a = a1 + b1; } else { const a1 = ri(40, 99), b1 = ri(11, a1 - 5); s = `${a1} − ${b1}`; a = a1 - b1; } }
        else if (g === 3) { if (k < 6) { const a1 = ri(2, 5), b1 = ri(2, 10); s = `${a1} × ${b1}`; a = a1 * b1; } else { const d = ri(2, 5), q = ri(2, 10); s = `${d * q} ÷ ${d}`; a = q; } }
        else { if (k < 4) { const a1 = ri(12, 49), b1 = ri(2, 9); s = `${a1} × ${b1}`; a = a1 * b1; } else if (k < 8) { if (k % 2) { const a1 = ri(300, 700), b1 = ri(120, 290); s = `${a1} + ${b1}`; a = a1 + b1; } else { const a1 = ri(600, 990), b1 = ri(120, 590); s = `${a1} − ${b1}`; a = a1 - b1; } } else { const d = ri(3, 9), q = ri(12, 40); s = `${d * q} ÷ ${d}`; a = q; } }
        probs.push(s); ans.push(String(a));
    }
    probs.forEach((s, k) => { const col = k % 2, row = Math.floor(k / 2); const x = col ? 90 : 640, y = 360 + row * 190; card(c, x, y, 510, 150, MATH_COL); emo(c, OBJ[(k + g) % 8], x + 470, y + 40, 44); enTxt(c, s + " =", x + 340, y + 78, { size: s.length > 9 ? 48 : 60, color: "#2B1B4F" }); blank(c, x + 22, y + 38, 130, 76, MATH_COL); });
    return ans;
}
function mathB(c, g, n) {
    const ans = [];
    if (g === 1) {
        page(c, MATH_COL, "مسائل مصوّرة", "عُدّ الصور ثم اجمع", "🧮", n, `الصف ${GRADE[g]} · رياضيات`);
        for (let k = 0; k < 4; k++) { const a = ri(1, 5), b = ri(1, 5), e = OBJ[k], y = 350 + k * 310; card(c, 90, y, W - 180, 270, MATH_COL); groupDraw(c, e, a, W - 150, y + 70, 70, 5); txt(c, "+", W / 2 + 25, y + 90, { size: 90, color: MATH_COL[0] }); groupDraw(c, e, b, W / 2 - 80, y + 70, 70, 5); txt(c, "الناتج:", W - 160, y + 215, { size: 42, color: MATH_COL[2], align: "right" }); blank(c, W / 2 - 80, y + 175, 170, 80, MATH_COL); ans.push(`${a} + ${b} = ${a + b}`); }
    } else if (g === 2) {
        page(c, MATH_COL, "العدّ بالقفز", "أكمل الأعداد الناقصة", "🐸", n, `الصف ${GRADE[g]} · رياضيات`);
        const steps = [2, 5, 10, 3]; steps.forEach((s, k) => { const y = 380 + k * 320; card(c, 90, y, W - 180, 280, MATH_COL); txt(c, `عدّ بالقفز ${s}`, W - 140, y + 55, { size: 44, color: MATH_COL[2], align: "right" }); emo(c, "🐸", 160, y + 60, 70); const start = s * ri(0, 2), seq = [0, 1, 2, 3, 4, 5].map((i) => start + s * i); const holes = shuffle([1, 2, 3, 4, 5]).slice(0, 3); seq.forEach((v, i) => { const x = W - 190 - i * 170, yy = y + 175; if (holes.includes(i)) { blank(c, x - 65, yy - 45, 130, 90, MATH_COL); } else { rr(c, x - 65, yy - 45, 130, 90, 20, MATH_COL[1]); enTxt(c, String(v), x, yy, { size: 50, color: MATH_COL[2] }); } }); ans.push(`بالقفز ${s}: ${seq.join("، ")}`); });
    } else if (g === 3) {
        page(c, MATH_COL, "المصفوفات", "اكتب جملة الضرب ثم الناتج", "🍪", n, `الصف ${GRADE[g]} · رياضيات`);
        for (let k = 0; k < 4; k++) { const r = ri(2, 4), cc = ri(3, 6), y = 350 + k * 310; card(c, 90, y, W - 180, 270, MATH_COL); for (let i = 0; i < r; i++) for (let j = 0; j < cc; j++) emo(c, OBJ[k], W - 170 - j * 76, y + 60 + i * 66, 56, { shadow: false }); blank(c, 430, y + 190, 100, 70, MATH_COL); txt(c, "×", 395, y + 225, { size: 56, color: MATH_COL[0] }); blank(c, 270, y + 190, 100, 70, MATH_COL); txt(c, "=", 235, y + 225, { size: 56, color: MATH_COL[0] }); blank(c, 100, y + 190, 100, 70, MATH_COL); ans.push(`${r} × ${cc} = ${r * cc}`); }
    } else {
        page(c, MATH_COL, "مسائل كلامية", "اقرأ المسألة ثم احسب", "🤔", n, `الصف ${GRADE[g]} · رياضيات`);
        const names = ["سالم", "مريم", "أحمد", "فاطمة", "خالد", "ليلى"], items = ["كتاباً", "قلماً", "تفاحة", "ملصقاً", "كرة", "وردة"];
        const T = [
            () => { const a = ri(25, 60), b = ri(12, 35), nm = pick(names), it = pick(items); return [`مع ${nm} ${a} ${it}، واشترى ${b} أخرى. كم أصبح معه؟`, a + b]; },
            () => { const a = ri(60, 95), b = ri(12, 40), nm = pick(names), it = pick(items); return [`كان مع ${nm} ${a} ${it}، وأعطى صديقه ${b}. كم بقي معه؟`, a - b]; },
            () => { const a = ri(4, 9), b = ri(6, 12), nm = pick(names); return [`في كل صندوق ${b} قطعة، وعند ${nm} ${a} صناديق. كم قطعة عنده؟`, a * b]; },
            () => { const d = ri(3, 8), q = ri(6, 12), nm = pick(names); return [`وزّعت ${nm} ${d * q} قطعة حلوى على ${d} أطفال بالتساوي. كم قطعة لكل طفل؟`, q]; }
        ];
        T.forEach((f, k) => { const [q, a] = f(), y = 360 + k * 320; card(c, 90, y, W - 180, 280, MATH_COL); emo(c, ["📚", "🍎", "📦", "🍬"][k], W - 170, y + 80, 80); txt(c, q, W - 250, y + 80, { size: 40, color: "#2B1B4F", align: "right", max: W - 440 }); txt(c, "الجواب:", W - 190, y + 205, { size: 40, color: MATH_COL[2], align: "right" }); blank(c, 340, y + 165, 520, 80, MATH_COL); ans.push(String(a)); });
    }
    return ans;
}
function mathC(c, g, n) {
    const ans = [];
    if (g === 1) {
        page(c, MATH_COL, "أكبر أم أصغر؟", "ضع الإشارة المناسبة  >  <  =", "🦉", n, `الصف ${GRADE[g]} · رياضيات`);
        for (let k = 0; k < 10; k++) { const a = ri(1, 20), b = k % 5 === 0 ? a : ri(1, 20), col = k % 2, row = Math.floor(k / 2), x = col ? 90 : 640, y = 360 + row * 230; card(c, x, y, 510, 190, MATH_COL); enTxt(c, String(a), x + 400, y + 95, { size: 76 }); enTxt(c, String(b), x + 110, y + 95, { size: 76 }); blank(c, x + 205, y + 55, 100, 80, MATH_COL); ans.push(a > b ? `${a} > ${b}` : a < b ? `${a} < ${b}` : `${a} = ${b}`); }
    } else if (g === 2) {
        page(c, MATH_COL, "ما الوقت؟", "اكتب الوقت الذي تشير إليه الساعة", "⏰", n, `الصف ${GRADE[g]} · رياضيات`);
        for (let k = 0; k < 6; k++) { const hh = ri(1, 12), mm = pick([0, 30]), col = k % 2, row = Math.floor(k / 2), x = col ? 330 : 910, y = 530 + row * 380; L.clock(c, x, y, 130, hh, mm); blank(c, x - 130, y + 140, 260, 70, MATH_COL); ans.push(`${hh}:${mm === 0 ? "00" : "30"}`); }
    } else if (g === 3) {
        page(c, MATH_COL, "الكسور", "اكتب الكسر الذي يمثّله الجزء الملوّن", "🍕", n, `الصف ${GRADE[g]} · رياضيات`);
        const defs = [[2, 1], [4, 3], [3, 2], [4, 1], [8, 3], [6, 5]]; shuffle(defs).forEach(([d, nn], k) => { const col = k % 2, row = Math.floor(k / 2), x = col ? 330 : 910, y = 520 + row * 370, r = 110; for (let i = 0; i < d; i++) { c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, i * 2 * Math.PI / d - Math.PI / 2, (i + 1) * 2 * Math.PI / d - Math.PI / 2); c.closePath(); c.fillStyle = i < nn ? "#FFB84D" : "#FFF"; c.fill(); c.strokeStyle = "#C9811A"; c.lineWidth = 5; c.stroke(); } blank(c, x - 40, y + 122, 80, 46, MATH_COL); c.save(); c.strokeStyle = MATH_COL[0]; c.lineWidth = 5; c.beginPath(); c.moveTo(x - 50, y + 176); c.lineTo(x + 50, y + 176); c.stroke(); c.restore(); blank(c, x - 40, y + 184, 80, 46, MATH_COL); ans.push(`${nn}/${d}`); });
    } else {
        page(c, MATH_COL, "المحيط والمساحة", "المحيط = مجموع الأضلاع · المساحة = الطول × العرض", "📐", n, `الصف ${GRADE[g]} · رياضيات`);
        for (let k = 0; k < 4; k++) { const w = ri(3, 8), h = ri(2, 5), y = 380 + k * 310; card(c, 90, y, W - 180, 270, MATH_COL); const u = 30; const x0 = W - 140 - w * u - 40, y0 = y + 60; c.fillStyle = "#FFE7A8"; c.fillRect(x0, y0, w * u, h * u); c.strokeStyle = "#C9811A"; c.lineWidth = 3; for (let i = 0; i <= w; i++) { c.beginPath(); c.moveTo(x0 + i * u, y0); c.lineTo(x0 + i * u, y0 + h * u); c.stroke(); } for (let j = 0; j <= h; j++) { c.beginPath(); c.moveTo(x0, y0 + j * u); c.lineTo(x0 + w * u, y0 + j * u); c.stroke(); } enTxt(c, `${w} cm`, x0 + w * u / 2, y0 - 22, { size: 30, color: MATH_COL[2] }); enTxt(c, `${h} cm`, x0 - 45, y0 + h * u / 2, { size: 30, color: MATH_COL[2] }); txt(c, "المحيط =", 700, y + 90, { size: 40, color: MATH_COL[2] }); blank(c, 420, y + 55, 200, 72, MATH_COL); txt(c, "المساحة =", 700, y + 190, { size: 40, color: MATH_COL[2] }); blank(c, 420, y + 155, 200, 72, MATH_COL); ans.push(`المحيط ${2 * (w + h)} سم، المساحة ${w * h} سم²`); }
    }
    return ans;
}
// ---- عربي ----
const WORDS = [["أسد", "🦁"], ["بطة", "🦆"], ["تفاحة", "🍎"], ["ثعلب", "🦊"], ["جمل", "🐪"], ["حصان", "🐴"], ["خروف", "🐑"], ["دجاجة", "🐔"], ["زرافة", "🦒"], ["سمكة", "🐟"], ["شمس", "☀️"], ["عنب", "🍇"], ["قمر", "🌙"], ["فيل", "🐘"], ["كتاب", "📖"], ["ليمون", "🍋"], ["موز", "🍌"], ["نحلة", "🐝"], ["وردة", "🌹"], ["بيت", "🏠"], ["قلم", "✏️"], ["سيارة", "🚗"], ["طائرة", "✈️"], ["ساعة", "⏰"], ["باب", "🚪"], ["كرة", "⚽"], ["شجرة", "🌳"], ["قطة", "🐱"], ["كلب", "🐶"], ["بقرة", "🐄"], ["ضفدع", "🐸"]];
const ALEF = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";
const sp = (w) => w.split("").join("  ");
function arA(c, g, n) {
    const ans = [], label = `الصف ${GRADE[g]} · لغة عربية`;
    if (g === 1) {
        page(c, AR_COL, "ما الحرف الأول؟", "انظر إلى الصورة واختر الحرف الأول لاسمها", "🦜", n, label);
        shuffle(WORDS).slice(0, 6).forEach(([w, e], k) => { const col = k % 2, row = Math.floor(k / 3), x = col ? 90 : 640; });
        const list = shuffle(WORDS).slice(0, 8); list.forEach(([w, e], k) => { const col = k % 2, row = Math.floor(k / 2), x = col ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, AR_COL); emo(c, e, x + 400, y + 130, 130); const first = w[0] === "أ" ? "أ" : w[0]; const wrong = shuffle(ALEF.split("").filter((ch) => ch !== first)).slice(0, 2); choices(c, x + 270, y + 130, shuffle([first, ...wrong]), AR_COL, { gap: 88, size: 40 }); ans.push(`${w} ← ${first}`); });
    } else if (g === 2) {
        page(c, AR_COL, "أكمل الكلمة", "اكتب الحرف الناقص في الخانة", "🦜", n, label);
        const list = shuffle(WORDS.filter(([w]) => w.length >= 3)).slice(0, 8); list.forEach(([w, e], k) => { const col = k % 2, row = Math.floor(k / 2), x = col ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, AR_COL); emo(c, e, x + 410, y + 90, 110); const hole = ri(0, w.length - 1); const parts = w.split("").map((ch, i) => (i === hole ? "▢" : ch)); txt(c, parts.join("  "), x + 255, y + 205, { size: 58, color: "#2B1B4F", dir: "rtl", max: 470 }); ans.push(`${w} ← ${w[hole]}`); });
    } else if (g === 3) {
        page(c, AR_COL, "المفرد والجمع", "اكتب جمع الكلمة", "📚", n, label);
        const P = [["كتاب", "كتب", "📖"], ["قلم", "أقلام", "✏️"], ["بيت", "بيوت", "🏠"], ["شجرة", "أشجار", "🌳"], ["نجمة", "نجوم", "⭐"], ["ولد", "أولاد", "👦"], ["باب", "أبواب", "🚪"], ["كلب", "كلاب", "🐶"], ["قمر", "أقمار", "🌙"], ["جمل", "جمال", "🐪"]];
        shuffle(P).slice(0, 8).forEach(([s, p, e], k) => { const col = k % 2, row = Math.floor(k / 2), x = col ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, AR_COL); emo(c, e, x + 420, y + 90, 100); txt(c, s, x + 290, y + 90, { size: 62, color: AR_COL[2] }); txt(c, "←", x + 190, y + 90, { size: 50, color: AR_COL[0] }); txt(c, "الجمع:", x + 440, y + 200, { size: 36, color: "#6A5F85", weight: 400 }); blank(c, x + 40, y + 160, 330, 80, AR_COL); ans.push(`${s} ← ${p}`); });
    } else {
        page(c, AR_COL, "اسم أم فعل؟", "ضع دائرة حول النوع الصحيح", "🧠", n, label);
        const A = [["يكتب", "فعل"], ["قلم", "اسم"], ["ذهب", "فعل"], ["مدرسة", "اسم"], ["يلعب", "فعل"], ["حديقة", "اسم"], ["جلس", "فعل"], ["كتاب", "اسم"], ["يقرأ", "فعل"], ["سيارة", "اسم"]];
        shuffle(A).slice(0, 10).forEach(([w, t], k) => { const col = k % 2, row = Math.floor(k / 2), x = col ? 90 : 640, y = 360 + row * 230; card(c, x, y, 510, 190, AR_COL); txt(c, w, x + 400, y + 95, { size: 66, color: "#2B1B4F", max: 190 }); [["اسم", 0], ["فعل", 1]].forEach(([s, i]) => { const cx = x + 230 - i * 150; c.save(); c.beginPath(); c.arc(cx, y + 95, 55, 0, 7); c.fillStyle = AR_COL[1]; c.fill(); c.lineWidth = 4; c.strokeStyle = AR_COL[0]; c.stroke(); c.restore(); txt(c, s, cx, y + 95, { size: 42, color: AR_COL[2] }); }); ans.push(`${w} ← ${t}`); });
    }
    return ans;
}
function arB(c, g, n) {
    const ans = [], label = `الصف ${GRADE[g]} · لغة عربية`;
    if (g <= 2) {
        page(c, AR_COL, "رتّب الحروف", "رتّب الحروف لتكوّن الكلمة ثم اكتبها", "🔤", n, label);
        const pool = WORDS.filter(([w]) => (g === 1 ? w.length <= 4 && w.length >= 3 : w.length >= 4));
        shuffle(pool).slice(0, 6).forEach(([w, e], k) => { const y = 360 + k * 215; card(c, 90, y, W - 180, 180, AR_COL); emo(c, e, W - 180, y + 90, 110); let letters = shuffle(w.split("")); if (letters.join("") === w.split("").join("")) letters = letters.reverse(); letters.forEach((ch, i) => { const x = W - 330 - i * 100; c.save(); c.beginPath(); c.arc(x, y + 90, 40, 0, 7); c.fillStyle = AR_COL[1]; c.fill(); c.lineWidth = 4; c.strokeStyle = AR_COL[0]; c.stroke(); c.restore(); txt(c, ch, x, y + 94, { size: 48, color: AR_COL[2] }); }); blank(c, 125, y + 45, 270, 90, AR_COL); ans.push(w); });
    } else if (g === 3) {
        page(c, AR_COL, "الأضداد", "اكتب ضدّ كل كلمة", "↔️", n, label);
        const P = [["كبير", "صغير"], ["طويل", "قصير"], ["حارّ", "بارد"], ["سريع", "بطيء"], ["فوق", "تحت"], ["قوي", "ضعيف"], ["جديد", "قديم"], ["سعيد", "حزين"]];
        shuffle(P).forEach(([a, b], k) => { const col = k % 2, row = Math.floor(k / 2), x = col ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, AR_COL); txt(c, a, x + 255, y + 80, { size: 66, color: AR_COL[2] }); txt(c, "↕", x + 255, y + 145, { size: 40, color: AR_COL[0] }); blank(c, x + 95, y + 170, 320, 70, AR_COL); ans.push(`${a} ↔ ${b}`); });
    } else {
        page(c, AR_COL, "أكمل الجملة", "اختر الكلمة المناسبة وضع دائرة حولها", "💡", n, label);
        const S = [["تشرق ____ في الصباح", "الشمس", "القمر"], ["أشرب ____ عندما أعطش", "الماء", "الخبز"], ["أكتب بـ ____", "القلم", "الكوب"], ["نسافر في الجو بـ ____", "الطائرة", "السيارة"], ["يعيش السمك في ____", "البحر", "الصحراء"], ["نرى ____ في الليل", "النجوم", "الشمس"], ["أغسل أسناني بـ ____", "الفرشاة", "المقص"], ["يطير ____ في السماء", "الطائر", "الحوت"]];
        shuffle(S).forEach(([q, a, b], k) => { const y = 360 + k * 165, flip = ri(0, 1); card(c, 90, y, W - 180, 135, AR_COL); txt(c, q, W - 140, y + 68, { size: 46, color: "#2B1B4F", align: "right" }); const opts = flip ? [b, a] : [a, b]; opts.forEach((o, i) => { chunk(c, 330 - i * 230, y + 28, 210, 76, 24, AR_COL[1], AR_COL[0]); txt(c, o, 330 - i * 230 + 105, y + 66, { size: 38, color: AR_COL[2], max: 190 }); }); ans.push(`${q.replace("____", a)}`); });
    }
    return ans;
}
// ---- إنجليزي ----
const EW = [["apple", "🍎"], ["ball", "⚽"], ["cat", "🐱"], ["dog", "🐶"], ["egg", "🥚"], ["fish", "🐟"], ["hat", "🎩"], ["sun", "☀️"], ["bus", "🚌"], ["book", "📖"], ["cow", "🐄"], ["bee", "🐝"], ["car", "🚗"], ["cup", "☕"], ["tree", "🌳"], ["star", "⭐"], ["moon", "🌙"], ["pen", "🖊️"], ["bed", "🛏️"], ["key", "🔑"], ["milk", "🥛"], ["bird", "🐦"], ["frog", "🐸"], ["boat", "⛵"], ["cake", "🎂"], ["duck", "🦆"], ["lion", "🦁"], ["pizza", "🍕"], ["house", "🏠"], ["clock", "⏰"], ["flower", "🌸"], ["banana", "🍌"], ["rabbit", "🐰"]];
const ABC = "abcdefghijklmnopqrstuvwxyz".split("");
function enA(c, g, n) {
    const ans = [], label = `Grade ${g} · English`;
    const col = EN_COL;
    if (g === 1) {
        page(c, col, "First Letter", "ما الحرف الأول؟  Circle the first letter", "🐼", n, label);
        shuffle(EW.filter(([w]) => w.length <= 5)).slice(0, 8).forEach(([w, e], k) => { const cc = k % 2, row = Math.floor(k / 2), x = cc ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, col); emo(c, e, x + 400, y + 130, 130); const f = w[0], wrong = shuffle(ABC.filter((a) => a !== f)).slice(0, 2); choices(c, x + 270, y + 130, shuffle([f, ...wrong]).map((s) => s), col, { gap: 88, en: true, size: 50 }); ans.push(`${w} → ${f}`); });
    } else if (g === 2) {
        page(c, col, "Match the Word", "اختر الكلمة الصحيحة للصورة", "🐼", n, label);
        shuffle(EW).slice(0, 8).forEach(([w, e], k) => { const cc = k % 2, row = Math.floor(k / 2), x = cc ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, col); emo(c, e, x + 400, y + 130, 130); const wrong = shuffle(EW.filter(([a]) => a !== w)).slice(0, 2).map(([a]) => a); shuffle([w, ...wrong]).forEach((o, i) => { enTxt(c, o, x + 210, y + 55 + i * 75, { size: 44, color: col[2] }); c.save(); c.beginPath(); c.arc(x + 70, y + 55 + i * 75, 24, 0, 7); c.lineWidth = 4; c.strokeStyle = col[0]; c.stroke(); c.restore(); }); ans.push(w); });
    } else if (g === 3) {
        page(c, col, "Unscramble", "رتّب الحروف لتكوّن الكلمة", "🐼", n, label);
        shuffle(EW.filter(([w]) => w.length >= 3 && w.length <= 6)).slice(0, 6).forEach(([w, e], k) => { const y = 360 + k * 215; card(c, 90, y, W - 180, 180, col); emo(c, e, 180, y + 90, 110); let ls = shuffle(w.split("")); if (ls.join("") === w) ls.reverse(); ls.forEach((ch, i) => { const x = 330 + i * 100; c.save(); c.beginPath(); c.arc(x, y + 90, 40, 0, 7); c.fillStyle = col[1]; c.fill(); c.lineWidth = 4; c.strokeStyle = col[0]; c.stroke(); c.restore(); enTxt(c, ch, x, y + 92, { size: 46, color: col[2] }); }); blank(c, W - 440, y + 45, 330, 90, col); ans.push(w); });
    } else {
        page(c, col, "Choose the Word", "Circle the correct word", "🐼", n, label);
        const Q = [["She ___ a book.", "read", "reads", 1], ["They ___ happy.", "is", "are", 1], ["I ___ a boy.", "am", "is", 0], ["He ___ football.", "play", "plays", 1], ["We ___ at school.", "is", "are", 1], ["The cat ___ milk.", "drink", "drinks", 1], ["I ___ two eyes.", "have", "has", 0], ["It ___ a sunny day.", "is", "are", 0]];
        shuffle(Q).forEach(([q, a, b, ok], k) => { const y = 360 + k * 165; card(c, 90, y, W - 180, 135, col); enTxt(c, q, W - 140, y + 68, { size: 46, color: "#2B1B4F", align: "right" }); [a, b].forEach((o, i) => { chunk(c, 520 - i * 270, y + 28, 250, 76, 24, col[1], col[0]); enTxt(c, o, 520 - i * 270 + 125, y + 66, { size: 40, color: col[2] }); }); ans.push(q.replace("___", ok ? b : a)); });
    }
    return ans;
}
function enB(c, g, n) {
    const ans = [], label = `Grade ${g} · English`, col = EN_COL;
    if (g === 1) {
        page(c, col, "ABC Order", "اكتب الحرف الناقص", "🐼", n, label);
        const rows = [["A", "B", "_", "D", "E"], ["F", "_", "H", "I", "J"], ["K", "L", "M", "_", "O"], ["P", "Q", "_", "S", "T"], ["U", "V", "W", "_", "Y"], ["_", "b", "c", "d", "e"], ["f", "g", "_", "i", "j"], ["k", "_", "m", "n", "o"]];
        const full = (r) => r;
        const answers = ["C", "G", "N", "R", "X", "a", "h", "l"];
        rows.forEach((r, k) => { const y = 360 + k * 165; card(c, 90, y, W - 180, 135, col); r.forEach((ch, i) => { const x = 220 + i * 200; if (ch === "_") blank(c, x - 55, y + 25, 110, 85 + 0, col); else enTxt(c, ch, x, y + 68, { size: 70, color: col[2] }); }); ans.push(answers[k]); });
    } else if (g === 2) {
        page(c, col, "Missing Letter", "اكتب الحرف الناقص", "🐼", n, label);
        shuffle(EW.filter(([w]) => w.length >= 3 && w.length <= 5)).slice(0, 8).forEach(([w, e], k) => { const cc = k % 2, row = Math.floor(k / 2), x = cc ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, col); emo(c, e, x + 400, y + 90, 110); const h = ri(0, w.length - 1); enTxt(c, w.split("").map((ch, i) => (i === h ? "_" : ch)).join(" "), x + 255, y + 205, { size: 64, color: col[2] }); ans.push(`${w}  (${w[h]})`); });
    } else if (g === 3) {
        page(c, col, "Opposites", "اكتب الضدّ", "🐼", n, label);
        const O = [["big", "small"], ["hot", "cold"], ["up", "down"], ["happy", "sad"], ["fast", "slow"], ["open", "close"], ["old", "new"], ["tall", "short"]];
        shuffle(O).forEach(([a, b], k) => { const cc = k % 2, row = Math.floor(k / 2), x = cc ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, col); enTxt(c, a, x + 255, y + 80, { size: 62, color: col[2] }); txt(c, "↕", x + 255, y + 140, { size: 40, color: col[0] }); blank(c, x + 95, y + 170, 320, 70, col); ans.push(`${a} ↔ ${b}`); });
    } else {
        page(c, col, "Plurals", "اكتب الجمع", "🐼", n, label);
        const P = [["cat", "cats"], ["box", "boxes"], ["child", "children"], ["man", "men"], ["bus", "buses"], ["baby", "babies"], ["book", "books"], ["foot", "feet"]];
        shuffle(P).forEach(([a, b], k) => { const cc = k % 2, row = Math.floor(k / 2), x = cc ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, col); enTxt(c, a, x + 255, y + 80, { size: 62, color: col[2] }); txt(c, "←", x + 255, y + 140, { size: 40, color: col[0] }); blank(c, x + 95, y + 170, 320, 70, col); ans.push(`${a} → ${b}`); });
    }
    return ans;
}
// ---- علوم ----
function sci(c, g, n) {
    const ans = [], col = SC_COL, label = `الصف ${GRADE[g]} · علوم`;
    const T = {
        1: ["حيّ أم غير حيّ؟", "ضع دائرة حول الإجابة الصحيحة", "🌱", ["حيّ", "غير حيّ"], [["🐱", 0], ["🪨", 1], ["🌳", 0], ["⚽", 1], ["🐟", 0], ["🚗", 1], ["🌷", 0], ["🪑", 1]]],
        2: ["أين يعيش؟", "اختر مكان معيشة الحيوان", "🐬", ["البرّ", "البحر", "الجوّ"], [["🐪", 0], ["🐬", 1], ["🦅", 2], ["🐘", 0], ["🐙", 1], ["🦜", 2], ["🦈", 1], ["🐎", 0]]],
        3: ["حالات المادة", "صلب أم سائل أم غاز؟", "🧊", ["صلب", "سائل", "غاز"], [["🧊", 0], ["💧", 1], ["💨", 2], ["🪨", 0], ["🥛", 1], ["🎈", 2], ["🧱", 0], ["🌊", 1]]]
    };
    if (g <= 3) {
        const [t, s, m, opts, items] = T[g]; page(c, col, t, s, m, n, label);
        items.forEach(([e, a], k) => { const cc = k % 2, row = Math.floor(k / 2), x = cc ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, col); emo(c, e, x + 400, y + 130, 130); opts.forEach((o, i) => { const yy = y + 130 + (i - (opts.length - 1) / 2) * 80; chunk(c, x + 60, yy - 30, 230, 56, 20, col[1], col[0]); txt(c, o, x + 175, yy - 2, { size: 34, color: col[2], max: 200 }); }); ans.push(`${e} ${opts[a]}`); });
    } else {
        page(c, col, "صح أم خطأ؟", "اقرأ الجملة ثم اختر الإجابة", "🔬", n, label);
        const Q = [["الشمس نجم", 1], ["القمر يدور حول الأرض", 1], ["الأرض أكبر من الشمس", 0], ["يغلي الماء عند 100 درجة مئوية", 1], ["النبات يصنع غذاءه بالضوء", 1], ["الحوت سمكة", 0], ["الخفّاش طائر", 0], ["القلب يضخّ الدم في الجسم", 1]];
        shuffle(Q).forEach(([q, ok], k) => { const y = 360 + k * 165; card(c, 90, y, W - 180, 135, col); txt(c, q, W - 140, y + 68, { size: 44, color: "#2B1B4F", align: "right", max: 620 }); [["صح ✓", 0], ["خطأ ✗", 1]].forEach(([s, i]) => { chunk(c, 400 - i * 250, y + 28, 220, 76, 24, i ? "#FFE3E3" : col[1], i ? "#E5484D" : col[0]); txt(c, s, 400 - i * 250 + 110, y + 66, { size: 40, color: i ? "#C03030" : col[2] }); }); ans.push(`${q}: ${ok ? "صح" : "خطأ"}`); });
    }
    return ans;
}
const GRADE_PAGES = [
    (c, g, n) => cover(c, { col: [PAL.math, PAL.ar, PAL.en, PAL.sci][g - 1], title: "كرّاس الأنشطة", title2: `للصف ${GRADE[g]}`, sub: "رياضيات · لغة عربية · إنجليزي · علوم", hero: ["🦉", "🦊", "🐼", "🦁"][g - 1], around: ["📚", "✏️", "🔬", "🧮", "🌍", "🎨"], tags: ["أوراق عمل ملوّنة", "مع الحلول", "شهادة تقدير"] }),
    mathA, mathB, mathC, arA, arB, enA, enB, sci,
    (c, g, n) => cert(c, { col: [PAL.math, PAL.ar, PAL.en, PAL.sci][g - 1], cert: `أتمّ كرّاس الأنشطة للصف ${GRADE[g]}`, hero: ["🦉", "🦊", "🐼", "🦁"][g - 1] }, n)
];
function gradeBook(g) {
    return { n: 11, draw: async (i, c) => {
        L.setSeed(g * 1000 + i * 17 + 3);
        if (i === 0) return GRADE_PAGES[0](c, g, 1);
        if (i === 9) return GRADE_PAGES[9](c, g, 10);
        if (i === 10) { const coll = []; const t = ["حساب سريع", "مسائل", "أكبر/أصغر · الوقت · الكسور · المحيط", "عربي ١", "عربي ٢", "English 1", "English 2", "علوم"]; const scratch = document.createElement("canvas").getContext("2d"); for (let k = 1; k <= 8; k++) { L.setSeed(g * 1000 + k * 17 + 3); const a = GRADE_PAGES[k](scratch, g, k + 1); coll.push({ title: `صفحة ${k + 1}: ` + ["حساب سريع", ["مسائل مصوّرة", "العدّ بالقفز", "المصفوفات", "مسائل كلامية"][g - 1], ["أكبر أم أصغر", "الوقت", "الكسور", "المحيط والمساحة"][g - 1], ["الحرف الأول", "أكمل الكلمة", "المفرد والجمع", "اسم أم فعل"][g - 1], ["رتّب الحروف", "رتّب الحروف", "الأضداد", "أكمل الجملة"][g - 1], ["First Letter", "Match the Word", "Unscramble", "Choose the Word"][g - 1], ["ABC Order", "Missing Letter", "Opposites", "Plurals"][g - 1], ["حيّ أم غير حيّ", "أين يعيش؟", "حالات المادة", "صح أم خطأ"][g - 1]][k - 1], ans: a }); } L.setSeed(1); return answersPage(c, { label: `الصف ${GRADE[g]}` }, 11, coll); }
        return GRADE_PAGES[i](c, g, i + 1);
    } };
}
window.WSB = { count: (b) => BOOKS[b].n, draw: async (b, i, c) => BOOKS[b].draw(i, c), BOOKS: null };
const BOOKS = { g1: gradeBook(1), g2: gradeBook(2), g3: gradeBook(3), g4: gradeBook(4) };
window.WSB.BOOKS = BOOKS;
window.WSX = { cover, cert, page, choices, answersPage, GRADE, groupDraw, OBJ };
})();
