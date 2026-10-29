// مكتبة رسم الأوراق: كرتونية ملوّنة، 1240×1754
(function () {
const W = 1240, H = 1754, FONT = "HWS";
const EF = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
const PAL = { math: ["#F26B5B", "#FDE8E3", "#C9473A"], ar: ["#2FA7C9", "#DDF1F8", "#1D7FA0"], en: ["#8B5CF6", "#EEE7FF", "#6A3FD0"], sci: ["#34B67A", "#DDF6E9", "#238A59"], kid: ["#F5A623", "#FFF1D6", "#C9811A"], pink: ["#EC5FA0", "#FDE4F0", "#C03F7E"] };
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const toAr = (n) => String(n);

function rr(c, x, y, w, h, r, fill, stroke, lw, shadow) {
    c.save();
    if (shadow) { c.shadowColor = shadow.c || "rgba(60,30,100,.22)"; c.shadowBlur = shadow.b ?? 16; c.shadowOffsetY = shadow.y ?? 6; }
    c.beginPath(); c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    c.restore();
    if (stroke) { c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.strokeStyle = stroke; c.lineWidth = lw || 4; c.stroke(); c.restore(); }
}
// زر مجسّم (حافة سفلية أغمق)
function chunk(c, x, y, w, h, r, col, dark) { rr(c, x, y + 8, w, h, r, dark); rr(c, x, y, w, h, r, col); c.save(); c.beginPath(); c.roundRect(x + 6, y + 5, w - 12, h * .42, r * .7); c.fillStyle = "rgba(255,255,255,.22)"; c.fill(); c.restore(); }
function txt(c, s, x, y, o = {}) {
    c.save(); c.font = `${o.weight || 700} ${o.size || 40}px ${FONT}, serif`; c.fillStyle = o.color || "#2B1B4F"; c.textAlign = o.align || "center"; c.textBaseline = o.base || "middle"; c.direction = o.dir || "rtl";
    if (o.stroke) { c.lineWidth = o.sw || 8; c.strokeStyle = o.stroke; c.lineJoin = "round"; c.strokeText(s, x, y); }
    if (o.max) { const w = c.measureText(s).width; if (w > o.max) { c.font = `${o.weight || 700} ${(o.size || 40) * o.max / w}px ${FONT}, serif`; } }
    c.fillText(s, x, y); c.restore();
}
function emo(c, e, x, y, size, o = {}) {
    c.save(); c.font = `${size}px ${EF}`; c.textAlign = "center"; c.textBaseline = "middle"; c.direction = "ltr";
    if (o.shadow !== false) { c.shadowColor = "rgba(40,20,80,.28)"; c.shadowBlur = size * .12; c.shadowOffsetY = size * .07; }
    if (o.rot) { c.translate(x, y); c.rotate(o.rot); c.fillText(e, 0, 0); } else c.fillText(e, x, y);
    c.restore();
}
function bg(c, col) {
    c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col[1]); g.addColorStop(.18, "#FFFFFF"); g.addColorStop(.85, "#FFFFFF"); g.addColorStop(1, col[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = .55; c.fillStyle = col[1];
    [[80, 1500, 90], [1180, 1560, 70], [1120, 330, 50], [60, 380, 40]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
    c.restore();
    c.save(); c.strokeStyle = col[0]; c.lineWidth = 6; c.globalAlpha = .35; c.setLineDash([2, 16]); c.lineCap = "round"; c.strokeRect(28, 28, W - 56, H - 56); c.restore();
}
function header(c, title, sub, col, mascot) {
    chunk(c, 70, 70, W - 140, 150, 40, col[0], col[2]);
    txt(c, title, W / 2 + 40, 130, { size: 74, color: "#FFFFFF", stroke: col[2], sw: 10, max: 760 });
    txt(c, sub || "", W / 2 + 40, 192, { size: 34, color: "rgba(255,255,255,.95)", weight: 400, max: 760 });
    c.save(); c.beginPath(); c.arc(170, 132, 78, 0, 7); c.fillStyle = "#FFFFFF"; c.shadowColor = "rgba(0,0,0,.25)"; c.shadowBlur = 12; c.shadowOffsetY = 5; c.fill(); c.restore();
    emo(c, mascot || "🦉", 170, 138, 100);
    // نجوم
    emo(c, "⭐", W - 150, 118, 54); emo(c, "✨", W - 215, 180, 36);
}
function nameLine(c, col) {
    txt(c, "الاسم:", W - 100, 276, { size: 36, color: col[2], align: "right" });
    c.save(); c.strokeStyle = col[0]; c.lineWidth = 4; c.setLineDash([2, 12]); c.lineCap = "round"; c.beginPath(); c.moveTo(W - 190, 292); c.lineTo(W - 520, 292); c.stroke();
    c.restore();
    txt(c, "التاريخ:", 470, 276, { size: 36, color: col[2], align: "right" });
    c.save(); c.strokeStyle = col[0]; c.lineWidth = 4; c.setLineDash([2, 12]); c.lineCap = "round"; c.beginPath(); c.moveTo(380, 292); c.lineTo(100, 292); c.stroke(); c.restore();
}
function footer(c, n, col, label) {
    c.save(); c.strokeStyle = col[0]; c.globalAlpha = .4; c.lineWidth = 3; c.beginPath(); c.moveTo(90, H - 118); c.lineTo(W - 90, H - 118); c.stroke(); c.restore();
    txt(c, "حروف وألوان", W / 2, H - 78, { size: 34, color: col[2], weight: 700 });
    txt(c, label || "", W - 100, H - 78, { size: 28, color: "#6A5F85", weight: 400, align: "right" });
    c.save(); c.beginPath(); c.arc(100, H - 78, 26, 0, 7); c.fillStyle = col[0]; c.fill(); c.restore();
    txt(c, toAr(n), 100, H - 76, { size: 30, color: "#FFF" });
}
function section(c, y, title, col, emoji) {
    chunk(c, W - 520, y, 450, 64, 32, col[2], "rgba(0,0,0,.25)");
    txt(c, title, W - 295, y + 34, { size: 38, color: "#FFF", max: 380 });
    if (emoji) emo(c, emoji, W - 560, y + 34, 54);
}
// خط منقّط لتتبّع الأرقام/الحروف
function trace(c, s, x, y, size, col) {
    c.save(); c.font = `900 ${size}px ${FONT}, serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.direction = "rtl";
    c.fillStyle = "#FFFFFF"; c.strokeStyle = col; c.lineWidth = 5; c.setLineDash([4, 14]); c.lineCap = "round"; c.strokeText(s, x, y); c.restore();
}
// حروف الإنجليزية بخط واضح
function enTxt(c, s, x, y, o = {}) { c.save(); c.font = `${o.weight || 800} ${o.size || 40}px "Nunito","Arial Rounded MT Bold","Trebuchet MS",Arial,sans-serif`; c.fillStyle = o.color || "#2B1B4F"; c.textAlign = o.align || "center"; c.textBaseline = "middle"; c.direction = "ltr"; if (o.stroke) { c.lineWidth = o.sw || 8; c.strokeStyle = o.stroke; c.lineJoin = "round"; c.strokeText(s, x, y); } c.fillText(s, x, y); c.restore(); }
// بطاقة سؤال
function card(c, x, y, w, h, col) { rr(c, x, y, w, h, 28, "#FFFFFF", col[0], 5, { y: 6, b: 14 }); }
function blank(c, x, y, w, h, col) { rr(c, x, y, w, h, 16, "#FFFFFF", col[0], 4); }
// رسم ساعة
function clock(c, x, y, r, hh, mm) {
    c.save(); c.shadowColor = "rgba(40,20,80,.25)"; c.shadowBlur = 14; c.shadowOffsetY = 6; c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = "#FFD36B"; c.fill(); c.restore();
    c.beginPath(); c.arc(x, y, r * .9, 0, 7); c.fillStyle = "#FFFFFF"; c.fill();
    for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6 - Math.PI / 2; enTxt(c, String(i), x + Math.cos(a) * r * .72, y + Math.sin(a) * r * .72, { size: r * .24, color: "#2B1B4F" }); }
    const hand = (ang, len, wd, col) => { c.save(); c.strokeStyle = col; c.lineWidth = wd; c.lineCap = "round"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); c.stroke(); c.restore(); };
    hand(((hh % 12) + mm / 60) * Math.PI / 6 - Math.PI / 2, r * .45, r * .085, "#2B1B4F");
    hand(mm * Math.PI / 30 - Math.PI / 2, r * .68, r * .055, "#F26B5B");
    c.beginPath(); c.arc(x, y, r * .07, 0, 7); c.fillStyle = "#2B1B4F"; c.fill();
}
// خطوط خارجية من إيموجي (للتلوين): حواف سوبل على لوحة مصغّرة
function outline(c, e, x, y, size, o = {}) {
    const S = 420, a = document.createElement("canvas"); a.width = a.height = S; const g = a.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#fff"; g.fillRect(0, 0, S, S); g.font = `${S * .8}px ${EF}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(e, S / 2, S / 2 + S * .04);
    const d = g.getImageData(0, 0, S, S).data, gray = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) gray[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
    // أي بكسل غير أبيض = داخل الشكل
    const inside = new Uint8Array(S * S); for (let i = 0; i < S * S; i++) inside[i] = (d[i * 4] < 250 || d[i * 4 + 1] < 250 || d[i * 4 + 2] < 250) ? 1 : 0;
    const out = g.createImageData(S, S), od = out.data, thr = o.thr || 38;
    for (let yy = 1; yy < S - 1; yy++) for (let xx = 1; xx < S - 1; xx++) {
        const i = yy * S + xx;
        const gx = -gray[i - S - 1] - 2 * gray[i - 1] - gray[i + S - 1] + gray[i - S + 1] + 2 * gray[i + 1] + gray[i + S + 1];
        const gy = -gray[i - S - 1] - 2 * gray[i - S] - gray[i - S + 1] + gray[i + S - 1] + 2 * gray[i + S] + gray[i + S + 1];
        const m = Math.sqrt(gx * gx + gy * gy);
        const edge = m > thr || (inside[i] && (!inside[i - 1] || !inside[i + 1] || !inside[i - S] || !inside[i + S]));
        const j = i * 4; od[j] = od[j + 1] = od[j + 2] = edge ? 40 : 255; od[j + 3] = edge ? 255 : 0;
    }
    // تثخين بسيط
    const b = document.createElement("canvas"); b.width = b.height = S; const bg2 = b.getContext("2d"); bg2.putImageData(out, 0, 0);
    const t = document.createElement("canvas"); t.width = t.height = S; const tg = t.getContext("2d");
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) tg.drawImage(b, dx, dy);
    c.save(); c.imageSmoothingQuality = "high"; c.drawImage(t, x - size / 2, y - size / 2, size, size); c.restore();
}
window.WSL = { W, H, FONT, EF, PAL, rnd, ri, pick, shuffle, rr, chunk, txt, emo, bg, header, nameLine, footer, section, trace, enTxt, card, blank, clock, outline, setSeed: (s) => { seed = s; } };
})();
