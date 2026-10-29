(function(){
const L = WSL, { W, H, PAL, ri, pick, shuffle, rr, chunk, txt, emo, card, blank, enTxt } = L, X = WSX;
const KC = PAL.kid, PK = PAL.pink, SKY = PAL.ar, GR = PAL.sci, PU = PAL.en;
const pg = (c, col, t, s, m, n, lab) => X.page(c, col, t, s, m, n, lab);
const circ = (c, x, y, r, fill, stroke, lw) => { c.beginPath(); c.arc(x, y, r, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 4; c.strokeStyle = stroke; c.stroke(); } };
const dashed = (c, col, f) => { c.save(); c.strokeStyle = col; c.lineWidth = 6; c.setLineDash([4, 14]); c.lineCap = "round"; f(); c.stroke(); c.restore(); };
// ---- كتاب الأرقام ----
const NUMS = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠"];
const AEMO = ["🍎", "⭐", "🎈", "🐟", "🚗", "🌸", "🐥", "🍪", "🦋", "🍓"];
function k1(i, c) {
    const lab = "أرقام وأعداد · 1-10", col = KC; L.setSeed(500 + i * 11);
    if (i === 0) return X.cover(c, { col: KC, title: "أرقام وأعداد", title2: "١ ـ ١٠", sub: "عدّ · تتبّع · لوّن · صِل", hero: "🐥", around: ["🍎", "⭐", "🎈", "🐟", "🚗", "🦋"], tags: ["تتبّع الأرقام", "ألعاب عدّ", "شهادة"], foot: "للأطفال من 3 إلى 6 سنوات · جاهز للطباعة A4" });
    if (i === 1) { pg(c, col, "عُدّ واختر الرقم", "عُدّ الصور ثم ضع دائرة حول الرقم الصحيح", "🐥", 2, lab); for (let k = 0; k < 6; k++) { const n = ri(1, 9), cc = k % 2, row = Math.floor(k / 2), x = cc ? 90 : 640, y = 360 + row * 400; card(c, x, y, 510, 360, col); const e = AEMO[k]; for (let j = 0; j < n; j++) emo(c, e, x + 440 - (j % 5) * 80, y + 70 + Math.floor(j / 5) * 85, 70, { shadow: false }); const opts = shuffle([n, n % 9 + 1, (n + 3) % 9 + 1].filter((v, ix, a) => a.indexOf(v) === ix)); while (opts.length < 3) opts.push(ri(1, 10)); const O = shuffle([...new Set([n, ...opts])]).slice(0, 3); if (!O.includes(n)) O[0] = n; O.forEach((v, j) => { const cx = x + 400 - j * 140, cy = y + 270; circ(c, cx, cy, 52, "#FFF1D6", KC[0], 5); enTxt(c, String(v), cx, cy + 2, { size: 56, color: KC[2] }); }); } return []; }
    if (i === 2 || i === 3) { const s = i === 2 ? 1 : 6; pg(c, col, "تتبّع الأرقام", `ارسم فوق الخط المنقّط · الأرقام ${s} إلى ${s + 4}`, "✏️", i + 1, lab); for (let k = 0; k < 5; k++) { const n = s + k, y = 360 + k * 255; card(c, 90, y, W - 180, 225, col); emo(c, AEMO[(n - 1) % 10], W - 170, y + 112, 110); for (let j = 0; j < 4; j++) { const x = W - 360 - j * 220; if (j === 0) enTxt(c, String(n), x, y + 118, { size: 190, color: KC[0], stroke: KC[2], sw: 6 }); else { c.save(); c.font = `800 190px "Nunito","Arial Rounded MT Bold",Arial,sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.strokeStyle = KC[0]; c.lineWidth = 5; c.setLineDash([4, 14]); c.lineCap = "round"; c.strokeText(String(n), x, y + 118); c.restore(); } } } return []; }
    if (i === 4) { pg(c, col, "لوّن بالعدد", "لوّن العدد المطلوب من الدوائر", "🎨", 5, lab); const want = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 6); want.forEach((n, k) => { const y = 370 + k * 200; card(c, 90, y, W - 180, 160, col); txt(c, `لوّن ${n}`, W - 160, y + 80, { size: 52, color: KC[2], align: "right" }); for (let j = 0; j < 10; j++) circ(c, 640 - j * 52, y + 80, 22, "#FFF", KC[0], 4); }); return []; }
    if (i === 5) { pg(c, col, "صِل العدد بالصورة", "ارسم خطاً بين الرقم والصور", "🔗", 6, lab); const ns = shuffle([1, 2, 3, 4, 5]), grp = shuffle(ns); ns.forEach((n, k) => { const y = 400 + k * 235; card(c, 90, y, 280, 200, col); enTxt(c, String(n), 230, y + 100, { size: 120, color: KC[2] }); card(c, 560, y, 590, 200, col); const g = grp[k]; for (let j = 0; j < g; j++) emo(c, AEMO[g - 1], 1100 - j * 100, y + 100, 80, { shadow: false }); circ(c, 400, y + 100, 14, KC[0]); circ(c, 540, y + 100, 14, KC[0]); }); return []; }
    if (i === 6) { pg(c, col, "ما الرقم الناقص؟", "اكتب الرقم الناقص في الخانة", "🔍", 7, lab); const starts = [1, 2, 3, 4, 5, 6]; starts.forEach((s, k) => { const y = 370 + k * 200; card(c, 90, y, W - 180, 170, col); const hole = ri(1, 4); for (let j = 0; j < 5; j++) { const x = W - 200 - j * 190; if (j === hole) blank(c, x - 60, y + 30, 120, 110, col); else { rr(c, x - 60, y + 30, 120, 110, 20, KC[1]); enTxt(c, String(s + j), x, y + 88, { size: 70, color: KC[2] }); } } }); return []; }
    if (i === 7) { pg(c, col, "الأكبر والأصغر", "ضع دائرة حول المجموعة الأكبر", "⚖️", 8, lab); for (let k = 0; k < 4; k++) { const a = ri(1, 8), b = ri(1, 8, ), y = 360 + k * 320; card(c, 90, y, W - 180, 280, col); const bb = a === b ? (b % 8) + 1 : b; [[a, 900], [bb, 340]].forEach(([n, x0], t) => { rr(c, x0 - 260, y + 24, 520, 232, 24, KC[1]); for (let j = 0; j < n; j++) emo(c, AEMO[k + t], x0 + 190 - (j % 4) * 120, y + 85 + Math.floor(j / 4) * 90, 80, { shadow: false }); }); } return []; }
    return X.cert(c, { col: KC, cert: "أتقن الأرقام من ١ إلى ١٠", hero: "🐥" }, i + 1);
}
// ---- كتاب الأشكال ----
const SH = [["دائرة", "circle"], ["مربّع", "square"], ["مثلّث", "tri"], ["مستطيل", "rect"], ["نجمة", "star"], ["قلب", "heart"], ["معيّن", "diamond"], ["بيضاوي", "oval"]];
function shape(c, t, x, y, s, fill, stroke, lw) {
    c.save(); c.beginPath();
    if (t === "circle") c.arc(x, y, s / 2, 0, 7);
    else if (t === "square") c.roundRect(x - s / 2, y - s / 2, s, s, s * .08);
    else if (t === "rect") c.roundRect(x - s * .65, y - s * .38, s * 1.3, s * .76, s * .08);
    else if (t === "tri") { c.moveTo(x, y - s / 2); c.lineTo(x + s / 2, y + s / 2); c.lineTo(x - s / 2, y + s / 2); c.closePath(); }
    else if (t === "diamond") { c.moveTo(x, y - s / 2); c.lineTo(x + s / 2, y); c.lineTo(x, y + s / 2); c.lineTo(x - s / 2, y); c.closePath(); }
    else if (t === "oval") c.ellipse(x, y, s * .6, s * .38, 0, 0, 7);
    else if (t === "star") { for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .22 : s * .5, a = -Math.PI / 2 + i * Math.PI / 5; c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
    else if (t === "heart") { const w = s * .5; c.moveTo(x, y + s * .42); c.bezierCurveTo(x - w * 1.5, y + s * .05, x - w * 1.1, y - s * .5, x, y - s * .15); c.bezierCurveTo(x + w * 1.1, y - s * .5, x + w * 1.5, y + s * .05, x, y + s * .42); c.closePath(); }
    if (fill) { c.shadowColor = "rgba(40,20,80,.25)"; c.shadowBlur = 10; c.shadowOffsetY = 5; c.fillStyle = fill; c.fill(); c.shadowColor = "transparent"; }
    if (stroke) { c.lineWidth = lw || 8; c.strokeStyle = stroke; c.lineJoin = "round"; c.stroke(); }
    c.restore();
}
const SCOL = ["#F26B5B", "#34B67A", "#4FA3F7", "#F5A623", "#8B5CF6", "#EC5FA0", "#2FC9B8", "#FF8F5B"];
function k2(i, c) {
    const lab = "أشكال وألوان", col = PU; L.setSeed(700 + i * 13);
    if (i === 0) return X.cover(c, { col: PU, title: "أشكال وألوان", sub: "تعرّف · لوّن · صِل · اكتشف", hero: "🎨", around: ["⭐", "❤️", "🔷", "🟢", "🟠", "🔺"], tags: ["8 أشكال", "ألعاب ذكاء", "شهادة"], foot: "للأطفال من 3 إلى 6 سنوات · جاهز للطباعة A4" });
    if (i === 1) { pg(c, col, "تعرّف على الأشكال", "هذه أشكال نراها كل يوم", "🔷", 2, lab); SH.forEach(([n, t], k) => { const cc = k % 2, row = Math.floor(k / 2), x = cc ? 90 : 640, y = 360 + row * 300; card(c, x, y, 510, 260, col); shape(c, t, x + 355, y + 120, 140, SCOL[k], "#FFF", 6); txt(c, n, x + 140, y + 130, { size: 64, color: col[2] }); }); return []; }
    if (i === 2) { pg(c, col, "لوّن الأشكال", "لوّن كل شكل باللون المكتوب", "🖍️", 3, lab); const cn = [["أحمر", "#F26B5B"], ["أخضر", "#34B67A"], ["أزرق", "#4FA3F7"], ["أصفر", "#F5C451"], ["بنفسجي", "#8B5CF6"], ["برتقالي", "#FF8F5B"]]; shuffle(SH).slice(0, 6).forEach(([n, t], k) => { const cc = k % 2, row = Math.floor(k / 2), x = cc ? 90 : 640, y = 360 + row * 400; card(c, x, y, 510, 360, col); shape(c, t, x + 255, y + 140, 190, null, "#2B1B4F", 7); txt(c, `${n} ${cn[k][0]}`, x + 255, y + 295, { size: 54, color: col[2] }); circ(c, x + 255 + 150, y + 295, 0, null); }); return []; }
    if (i === 3) { pg(c, col, "صِل الشيء بشكله", "ارسم خطاً بين الصورة وشكلها", "🔗", 4, lab); const P = [["⚽", "circle"], ["🎁", "square"], ["⛺", "tri"], ["🚪", "rect"], ["⭐", "star"], ["❤️", "heart"]]; const rs = shuffle(P); P.forEach(([e], k) => { const y = 420 + k * 200; card(c, 90, y, 330, 170, col); emo(c, e, 255, y + 85, 110); card(c, 820, y, 330, 170, col); shape(c, rs[k][1], 985, y + 85, 100, SCOL[k], "#FFF", 5); circ(c, 440, y + 85, 14, col[0]); circ(c, 800, y + 85, 14, col[0]); }); return []; }
    if (i === 4) { pg(c, col, "ما الشكل المختلف؟", "ضع دائرة حول الشكل المختلف", "🕵️", 5, lab); for (let k = 0; k < 6; k++) { const [a, b] = shuffle(SH).slice(0, 2), odd = ri(0, 3), y = 370 + k * 200; card(c, 90, y, W - 180, 170, col); for (let j = 0; j < 4; j++) shape(c, j === odd ? b[1] : a[1], W - 220 - j * 250, y + 85, 100, SCOL[(k + j * 3) % 8], "#FFF", 5); } return []; }
    if (i === 5) { pg(c, col, "أكمل النمط", "ماذا يأتي بعد ذلك؟ ارسم أو لوّن", "🧩", 6, lab); const E = ["🍎", "🍌", "🍇", "⭐", "🌙", "🐟", "🐱", "🌸"]; const pats = [[0, 1], [0, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1], [0, 1, 2]]; pats.forEach((p, k) => { const es = shuffle(E).slice(0, 3), y = 370 + k * 200; card(c, 90, y, W - 180, 170, col); const total = 6; for (let j = 0; j < total; j++) { const x = W - 190 - j * 170; if (j >= total - 2) blank(c, x - 60, y + 25, 120, 120, col); else emo(c, es[p[j % p.length]], x, y + 85, 90); } }); return []; }
    if (i === 6) { pg(c, col, "الألوان الجميلة", "تعرّف على الألوان ولوّن الفراشة", "🌈", 7, lab); const cn = [["أحمر", "#F26B5B"], ["برتقالي", "#FF9A3D"], ["أصفر", "#F5C451"], ["أخضر", "#34B67A"], ["أزرق", "#4FA3F7"], ["بنفسجي", "#8B5CF6"], ["وردي", "#EC5FA0"], ["بنّي", "#9C6B43"]]; cn.forEach(([n, h], k) => { const cc = k % 4, row = Math.floor(k / 4), x = W - 90 - cc * 285 - 130, y = 360 + row * 190; chunk(c, x - 125, y, 250, 150, 30, h, "rgba(0,0,0,.25)"); txt(c, n, x, y + 75, { size: 48, color: "#FFF", stroke: "rgba(0,0,0,.25)", sw: 6 }); }); L.outline(c, "🦋", W / 2, 1060, 700, { thr: 30 }); return []; }
    if (i === 7) { pg(c, col, "أين ظلّي؟", "صِل الصورة بظلّها", "🌗", 8, lab); const E = ["🐘", "🚗", "🦆", "🍎", "🏠", "🐢"]; const rs = shuffle(E); E.forEach((e, k) => { const y = 380 + k * 200; card(c, 90, y, 380, 170, col); emo(c, e, 280, y + 85, 120); card(c, 770, y, 380, 170, col); c.save(); c.filter = "brightness(0)"; c.globalAlpha = .85; c.font = `120px ${L.EF}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(rs[k], 960, y + 92); c.restore(); circ(c, 490, y + 85, 14, col[0]); circ(c, 750, y + 85, 14, col[0]); }); return []; }
    return X.cert(c, { col: PU, cert: "أتقن الأشكال والألوان", hero: "🎨" }, i + 1);
}
// ---- كتاب حيوانات للتلوين ----
const AN = [["🦁", "الأسد", "ملك الغابة"], ["🐘", "الفيل", "أكبر حيوان على اليابسة"], ["🐼", "الباندا", "يحب أكل الخيزران"], ["🐢", "السلحفاة", "تحمل بيتها على ظهرها"], ["🐬", "الدلفين", "ذكي ويحب القفز"], ["🦒", "الزرافة", "أطول حيوان في العالم"], ["🐰", "الأرنب", "يحب الجزر ويقفز بسرعة"], ["🦋", "الفراشة", "جناحاتها ملوّنة وجميلة"]];
function k3(i, c) {
    const lab = "حيوانات للتلوين", col = GR; L.setSeed(900 + i);
    if (i === 0) return X.cover(c, { col: GR, title: "حيوانات", title2: "للتلوين", sub: "8 رسومات كبيرة بخطوط واضحة", hero: "🦁", around: ["🐘", "🐼", "🐢", "🐬", "🦒", "🦋"], tags: ["8 حيوانات", "خطوط عريضة", "شهادة"], foot: "للأطفال من 3 إلى 8 سنوات · جاهز للطباعة A4" });
    if (i >= 1 && i <= 8) { const [e, n, f] = AN[i - 1]; pg(c, col, n, f, e, i + 1, lab); L.outline(c, e, W / 2, 900, 1000, { thr: 30 }); c.save(); [["#F26B5B"], ["#F5C451"], ["#34B67A"], ["#4FA3F7"], ["#8B5CF6"], ["#EC5FA0"]].forEach(([h], k) => { circ(c, 200 + k * 110, 1500, 34, h, "#FFF", 5); }); c.restore(); txt(c, "ألواني المفضّلة", W - 160, 1500, { size: 30, color: "#6A5F85", weight: 400, align: "right" }); return []; }
    return X.cert(c, { col: GR, cert: "رسم ولوّن ببراعة", hero: "🦁" }, i + 1);
}
// ---- كتاب المتاهات والتوصيل ----
function maze(c, x0, y0, cols, rows, cell, seed) {
    L.setSeed(seed); const g = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ v: 0, w: [1, 1, 1, 1] }))); // N E S W
    const st = [[0, 0]]; g[0][0].v = 1; const D = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
    while (st.length) { const [cx, cy] = st[st.length - 1]; const nb = shuffle(D).filter(([dx, dy]) => cx + dx >= 0 && cx + dx < cols && cy + dy >= 0 && cy + dy < rows && !g[cy + dy][cx + dx].v); if (!nb.length) { st.pop(); continue; } const [dx, dy, a, b] = nb[0]; g[cy][cx].w[a] = 0; g[cy + dy][cx + dx].w[b] = 0; g[cy + dy][cx + dx].v = 1; st.push([cx + dx, cy + dy]); }
    c.save(); c.strokeStyle = "#2B1B4F"; c.lineWidth = 8; c.lineCap = "round";
    c.beginPath(); for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const px = x0 + x * cell, py = y0 + y * cell, w = g[y][x].w; if (w[0] && !(x === 0 && y === 0)) { c.moveTo(px, py); c.lineTo(px + cell, py); } if (w[3]) { c.moveTo(px, py); c.lineTo(px, py + cell); } if (y === rows - 1 && w[2] && !(x === cols - 1)) { c.moveTo(px, py + cell); c.lineTo(px + cell, py + cell); } if (x === cols - 1 && w[1]) { c.moveTo(px + cell, py); c.lineTo(px + cell, py + cell); } }
    c.stroke(); c.restore();
}
function dots(c, pts, cx, cy, sc, col, emoEnd) {
    c.save(); c.strokeStyle = "rgba(0,0,0,.08)"; c.restore();
    pts.forEach(([x, y], k) => { const X0 = cx + x * sc, Y0 = cy + y * sc; circ(c, X0, Y0, 22, col, "#FFF", 5); enTxt(c, String(k + 1), X0 + (x >= 0 ? 38 : -38), Y0 - 4, { size: 40, color: "#2B1B4F" }); });
    c.save(); c.font = `110px ${L.EF}`; c.textAlign = "center"; c.textBaseline = "middle"; c.restore();
}
function k4(i, c) {
    const lab = "متاهات وتوصيل", col = SKY; L.setSeed(1100 + i);
    if (i === 0) return X.cover(c, { col: SKY, title: "متاهات", title2: "وتوصيل النقاط", sub: "ساعد الأصدقاء في الوصول ثم وصِل النقاط", hero: "🐰", around: ["🥕", "🐝", "🌸", "🚀", "🪐", "⭐"], tags: ["3 متاهات", "3 توصيل نقاط", "شهادة"], foot: "للأطفال من 4 إلى 8 سنوات · جاهز للطباعة A4" });
    if (i >= 1 && i <= 3) { const M = [["🐰", "🥕", "ساعد الأرنب ليصل إلى الجزرة", 9, 11, 98, "🐰"], ["🐝", "🌸", "ساعد النحلة لتصل إلى الزهرة", 10, 13, 90, "🐝"], ["🚀", "🪐", "ساعد الصاروخ ليصل إلى الكوكب", 11, 13, 88, "🚀"]][i - 1]; pg(c, col, "متاهة " + ["١", "٢", "٣"][i - 1], M[2], M[0], i + 1, lab); const [, , , cols, rows, cell] = M; const x0 = (W - cols * cell) / 2, y0 = 380; maze(c, x0, y0, cols, rows, cell, 40 + i * 7); emo(c, M[0], x0 + cell / 2, y0 + cell / 2 - 2, cell * .62, { shadow: false }); emo(c, M[1], x0 + cols * cell - cell / 2, y0 + rows * cell - cell / 2, cell * .62, { shadow: false }); txt(c, "بداية", x0 + cell / 2, y0 - 34, { size: 34, color: col[2] }); txt(c, "نهاية", x0 + cols * cell - cell / 2, y0 + rows * cell + 40, { size: 34, color: col[2] }); return []; }
    if (i >= 4 && i <= 6) {
        const star = []; for (let k = 0; k < 10; k++) { const r = k % 2 ? 150 : 340, a = -Math.PI / 2 + k * Math.PI / 5; star.push([Math.cos(a) * r, Math.sin(a) * r]); }
        const hp = []; for (let q = 0; q <= 800; q++) { const t = q / 800 * 2 * Math.PI; hp.push([16 * Math.pow(Math.sin(t), 3) * 22, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 22]); } const cum = [0]; for (let q = 1; q < hp.length; q++) cum.push(cum[q - 1] + Math.hypot(hp[q][0] - hp[q - 1][0], hp[q][1] - hp[q - 1][1])); const heart = []; for (let m = 0; m < 20; m++) { const tgt = cum[cum.length - 1] * m / 20; let q = cum.findIndex((v) => v >= tgt); heart.push(hp[Math.max(0, q)]); }
        const house = [[-300, 250], [-300, -50], [-380, -50], [0, -330], [380, -50], [300, -50], [300, 250], [100, 250], [100, 50], [-100, 50], [-100, 250]];
        const D = [[star, "نجمة", 1.45, "⭐"], [heart, "قلب", 1.3, "❤️"], [house, "بيت", 1.2, "🏠"]][i - 4];
        pg(c, col, "وصِّل النقاط", `وصِّل النقاط من ١ ثم لوّن الـ${D[1]}`, D[3], i + 1, lab);
        const pts = D[0]; c.save(); c.strokeStyle = "rgba(0,0,0,.0)"; c.restore(); dots(c, pts, W / 2, 950, D[2], col[0]); txt(c, "ابدأ من النقطة 1 ثم 2 ثم 3 ...", W / 2, 1560, { size: 40, color: "#6A5F85", weight: 400 }); return [];
    }
    return X.cert(c, { col: SKY, cert: "حلّ المتاهات ووصّل النقاط", hero: "🐰" }, i + 1);
}
const B = WSB.BOOKS;
B.k1 = { n: 9, draw: async (i, c) => k1(i, c) };
B.k2 = { n: 9, draw: async (i, c) => k2(i, c) };
B.k3 = { n: 10, draw: async (i, c) => k3(i, c) };
B.k4 = { n: 8, draw: async (i, c) => k4(i, c) };
})();
