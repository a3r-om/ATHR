"""مؤثرات صوتية أصلية لإعلان أثر «بطاقة المتجر» (17.4 ثانية) على نفس توقيت ad.html.

مثل الفيديو المرجعي: بدون موسيقى، الصوت كله مؤثرات واجهة:
ووش منخفض، ضربات عميقة مع التقريب، فرقعات ناعمة (~1.2 كيلوهيرتز) لظهور الكلام،
نقرات أزرار، تكّات حادة خفيفة لعناصر القائمة، وووش كبير لما تصغر البطاقة.
بدون أي طقطقة أو ضجيج عريض (ملاحظة صاحب المتجر).

python3 marketing/ads/2026-10-14-card/sfx.py <out_dir>
"""
import os
import sys
import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as ss

SR = 44100
DUR = 17.4
N = int(SR * DUR)
rng = np.random.default_rng(11)

# نفس توقيت ad.html
T = dict(line=0.15, thick=0.55, sq=1.15, panel=1.45, grow=2.0, land=2.42,
         st1=2.55, st2=2.85, tag=2.6, hd=3.35, w=[4.45, 4.75, 5.05],
         chip=5.8, box=5.95, gico=6.75, gq=6.85, gbtn=7.35, gpress=7.6,
         cod=8.35, order=8.7, opress=9.0, ph=[9.6, 9.75, 9.9, 10.05],
         li=[10.65, 10.95, 11.25, 11.55, 11.95, 12.2, 12.45, 12.7],
         out=12.85, shrink=14.25, gone=14.7, logo=14.85, e1=15.2, e2=15.7, e3=15.95, end=17.4)
# حركات الكاميرا السريعة (بداية، نهاية)
WHIPS = [(5.30, 5.75), (7.80, 8.25), (9.15, 9.55), (10.20, 10.55), (11.55, 11.88)]


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, t0, sig, gain=1.0, pan=0.0):
        if isinstance(sig, tuple):
            a, b = sig
        else:
            a = b = sig
        i = int(round(t0 * SR))
        if i >= N:
            return
        if i < 0:
            a, b, i = a[-i:], b[-i:], 0
        a = a[: N - i] * gain
        b = b[: N - i] * gain
        gl, gr = np.sqrt(1 - pan), np.sqrt(1 + pan)
        self.L[i:i + len(a)] += a * gl
        self.R[i:i + len(b)] += b * gr

    def st(self):
        return np.stack([self.L, self.R], axis=1)


def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, f, order=2):
    b, a = ss.butter(order, np.array(f) / (SR / 2), kind)
    return ss.lfilter(b, a, x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def reverb(st, wet=0.15, d=1.4, decay=0.35):
    r = np.random.default_rng(3)
    t = tt(d)
    irs = []
    for _ in range(2):
        x = r.standard_normal(len(t)) * np.exp(-t / decay)
        x = filt(x, "low", 6000)
        x[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        irs.append(x / np.sqrt(np.sum(x ** 2)))
    m = filt(st.mean(1), "high", 250)
    return st + wet * np.stack([ss.fftconvolve(m, irs[0])[:N], ss.fftconvolve(m, irs[1])[:N]], 1)


# ---------- الأصوات ----------
def whoosh(d, f_lo=300, f_hi=6000, peak=0.6, width=0.6):
    """ووش ناعم: ضجيج مفلتر بتردد متحرك وغلاف ناعم (ما فيه طقطقة)"""
    n = int(d * SR)
    outs = []
    for _ in range(2):
        f, tm, Z = ss.stft(rng.standard_normal(n), SR, nperseg=1024)
        prog = np.clip(tm / d, 0, 1)
        c = f_lo * (f_hi / f_lo) ** np.sin(np.pi * prog)
        mask = np.exp(-0.5 * (np.log((f[:, None] + 1) / c[None, :]) / width) ** 2)
        _, x = ss.istft(Z * mask, SR, nperseg=1024)
        x = x[:n]
        if len(x) < n:
            x = np.pad(x, (0, n - len(x)))
        u = np.arange(n) / SR / d
        env = np.where(u < peak, (u / peak) ** 2.2, np.clip(1 - (u - peak) / (1 - peak), 0, 1) ** 1.8)
        outs.append(x / (np.abs(x).max() + 1e-9) * env)
    return outs[0], outs[1]


def rumble(d, f0=48, f1=72, peak=0.6):
    """هدير منخفض مع الحركة: نغمة عميقة تتمدد + ووش منخفض"""
    t = tt(d)
    u = t / d
    f = f0 + (f1 - f0) * np.sin(np.pi * np.clip(u, 0, 1) * 0.5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.where(u < peak, (u / peak) ** 2, np.clip(1 - (u - peak) / (1 - peak), 0, 1) ** 1.5)
    tone = (np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.18 * np.sin(3 * ph)) * env * 0.6
    a, b = whoosh(d, 90, 700, peak, 0.7)
    return tone + a * 0.55, tone + b * 0.55


def thud(f0=150, f1=58, d=0.45, amp=1.0):
    """ضربة عميقة (تسمع في الجوال لأن فيها توافقيات)"""
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)) * np.exp(-t / 0.13)
    knock = filt(noise(d), "band", [300, 1800]) * np.exp(-t / 0.008) * 0.25
    return amp * np.tanh((body + knock) * 1.3) * np.clip(t / 0.002, 0, 1)


def pop(f=1240, amp=1.0, d=0.16):
    """فرقعة واجهة ناعمة: نغمة قصيرة تنزل شوي"""
    t = tt(d)
    fr = f * (1 + 0.35 * np.exp(-t / 0.012))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = (np.sin(ph) + 0.2 * np.sin(2 * ph)) * np.exp(-t / 0.035)
    return amp * x * np.clip(t / 0.0015, 0, 1)


def click(amp=1.0, f=2600):
    """نقرة زر: نقرتين قصيرتين"""
    t = tt(0.09)
    x = np.zeros_like(t)
    for off, a in ((0.0, 1.0), (0.022, 0.55)):
        i = int(off * SR)
        tb = t[: len(t) - i]
        x[i:] += a * (np.sin(2 * np.pi * f * tb) * np.exp(-tb / 0.006) + np.sin(2 * np.pi * f * 2.03 * tb) * np.exp(-tb / 0.003) * 0.5)
    return amp * x * 0.8


def tick(amp=1.0, f=6600):
    """تكّة حادة خفيفة لعناصر القائمة"""
    t = tt(0.05)
    return amp * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.007) * np.clip(t / 0.0008, 0, 1)


def keys(d, rate=14, amp=1.0):
    """كتابة ناعمة: نقرات صغيرة متتابعة (مو ضجيج)"""
    x = np.zeros(int(d * SR))
    r = np.random.default_rng(int(d * 100))
    k = 0.0
    while k < d - 0.03:
        tb = tt(0.03)
        f = r.uniform(1700, 2600)
        c = np.sin(2 * np.pi * f * tb) * np.exp(-tb / 0.004) * r.uniform(0.5, 1.0)
        i = int(k * SR)
        x[i:i + len(c)] += c[: len(x) - i]
        k += 1 / rate * r.uniform(0.75, 1.25)
    return x * amp


def bubble(d=0.4, f0=380, f1=900):
    """صوت تمدد ناعم (لما يكبر صندوق الهدية)"""
    t = tt(d)
    f = f0 * (f1 / f0) ** np.clip(t / d, 0, 1) ** 0.6
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2
    return (np.sin(ph) + 0.15 * np.sin(2 * ph)) * env * 0.35


def ceramic(amp=1.0):
    """نقرة كوب سيراميك"""
    t = tt(1.2)
    parts = [(2140, 0.25), (3420, 0.13), (5260, 0.07), (1210, 0.32), (6890, 0.04)]
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in parts)
    tap = filt(noise(1.2), "band", [2000, 8000]) * np.exp(-t / 0.002) * 0.5
    return amp * (x / 3.2 + tap)


def chime(f=523.25, d=1.6):
    t = tt(d)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.7) + 0.4 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.35)
         + 0.15 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / 0.18))
    return x * np.clip(t / 0.003, 0, 1)


# ---------- التركيب ----------
s = Bus()
# خط ← بطاقة
s.add(0.05, rumble(1.35, 44, 70, 0.55), 0.9)
s.add(T["thick"] - 0.02, pop(520, 0.5, 0.2), 0.5)
# اللوحة الكريمية تطلع
s.add(T["panel"] - 0.05, whoosh(0.55, 500, 2400, 0.55, 0.5), 0.18, -0.2)
# تقريب + ضربة
s.add(T["grow"] - 0.08, rumble(0.42, 50, 90, 0.85), 0.75)
s.add(T["land"] - 0.14, thud(150, 58, 0.5), 1.0)
# الوسم
s.add(T["st1"], pop(1240, 0.9), 0.5, 0.25)
s.add(T["st2"], pop(1240, 0.9), 0.5, -0.25)
s.add(T["tag"] + 0.02, keys(0.38, 22, 0.5), 0.12)
# العنوان ينكتب
s.add(T["hd"] - 0.05, rumble(1.0, 40, 52, 0.5), 0.45)
s.add(T["hd"], keys(0.85, 13, 1.0), 0.14)
# الكلمات الرمادية
for i, at in enumerate(T["w"]):
    s.add(at, pop(1240, 1.0), 0.55, [0.2, 0.0, -0.2][i])
# حركات الكاميرا
for a, b in WHIPS:
    d = b - a + 0.15
    s.add(a - 0.05, rumble(d, 50, 66, 0.55), 0.5)
    s.add(a - 0.02, whoosh(d, 350, 2600, 0.55, 0.55), 0.16)
# الشريحة + صندوق الهدية
s.add(T["chip"], pop(1500, 0.8), 0.4, -0.2)
s.add(T["box"], bubble(0.5, 300, 760), 0.6, -0.2)
s.add(T["gico"], click(1.0, 2230), 0.42, -0.2)
s.add(T["gq"], keys(0.38, 16, 0.8), 0.13, -0.2)
s.add(T["gbtn"], click(1.0, 2230), 0.42, -0.2)
s.add(T["gpress"], click(1.0, 5280), 0.32, -0.2)
# الدفع + زر الطلب
s.add(T["cod"] + 0.08, thud(120, 70, 0.3, 0.7), 0.55, 0.2)
s.add(T["cod"] + 0.1, pop(1240, 1.0), 0.45, 0.2)
s.add(T["order"], pop(1240, 1.0), 0.5, 0.2)
s.add(T["opress"], pop(1240, 0.9), 0.45, 0.2)
s.add(T["opress"] + 0.01, click(0.7, 2600), 0.2, 0.2)
# صور المنتجات: فرقعة + نقرة سيراميك خفيفة
for i, at in enumerate(T["ph"]):
    s.add(at, pop([1480, 1660, 1480, 1860][i], 0.8), 0.38, [0.3, 0.1, -0.1, -0.3][i])
    s.add(at + 0.01, ceramic(0.35), 0.16, [0.3, 0.1, -0.1, -0.3][i])
# القائمة
for i, at in enumerate(T["li"]):
    s.add(at, tick(1.0, 6600), 0.32, 0.25 if i < 4 else -0.25)
# تبعيد للبطاقة كاملة
s.add(T["out"] - 0.05, whoosh(0.35, 700, 160, 0.5, 0.7), 0.25)
s.add(13.0, thud(170, 62, 0.55, 1.0), 0.95)
# البطاقة تصغر وتختفي
s.add(T["shrink"] - 0.2, rumble(0.65, 40, 100, 0.75), 1.0)
s.add(T["shrink"] - 0.15, whoosh(0.6, 200, 1800, 0.78, 0.6), 0.35)
s.add(T["gone"] - 0.08, thud(160, 50, 0.6, 0.9), 0.85)
# الختام
s.add(T["logo"], ceramic(1.0), 0.42)
s.add(T["logo"] + 0.02, thud(140, 70, 0.35, 0.6), 0.45)
s.add(T["logo"] + 0.05, chime(659.25, 1.8), 0.08, 0.15)
s.add(T["e1"], keys(0.42, 16, 0.8), 0.12)
s.add(T["e2"], pop(1240, 0.9), 0.45)
s.add(T["e3"], pop(1240, 1.0), 0.5)
s.add(T["e3"] + 0.02, click(0.6, 2600), 0.18)


def master(st, target_peak=0.89):
    out = []
    for ch in st.T:
        x = filt(ch, "high", 30)
        out.append(x)
    st = np.stack(out, 1)
    st = np.tanh(st * 1.1) / np.tanh(1.1)
    st = st / (np.abs(st).max() + 1e-9) * target_peak
    fade = int(0.5 * SR)
    st[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return st


mix = reverb(s.st(), 0.14, 1.4, 0.32)
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
wf.write(os.path.join(out, "sfx.wav"), SR, (np.clip(master(mix), -1, 1) * 32767).astype(np.int16))
print("ok", out)
