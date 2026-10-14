"""مؤثرات صوتية أصلية لإعلان أثر «بطاقة المتجر» (17.4 ثانية) على نفس توقيت ad.html.

النسخة الثانية (بطلب صاحب المتجر: «أبيها واضحة وجميلة»):
بدل الهدير والضربات المنخفضة (الجوال ما يطلعها وتطلع مكتومة)، كل المؤثرات صارت نغمات نظيفة
من سلّم واحد (ري الكبير الخماسي) فتطلع متناسقة مع بعض:
ماريمبا ناعمة لظهور الكلام والأزرار، أجراس زجاجية لعناصر القائمة، وووش هوائي خفيف للحركة،
وضربة واضحة فيها «توك» مسموع، ونغمة سيراميك + كورد دافي في الختام.
بدون موسيقى (مثل الفيديو المرجعي) وبدون أي طقطقة أو ضجيج عريض.

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
WHIPS = [(5.30, 5.75), (7.80, 8.25), (9.15, 9.55), (10.20, 10.55), (11.55, 11.88)]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ري الكبير الخماسي: D E F# A B
D5, E5, Fs5, A5, B5 = hz(74), hz(76), hz(78), hz(81), hz(83)
D6, E6, Fs6, A6, B6 = hz(86), hz(88), hz(90), hz(93), hz(95)
D4, Fs4, A4 = hz(62), hz(66), hz(69)


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, t0, sig, gain=1.0, pan=0.0):
        a, b = sig if isinstance(sig, tuple) else (sig, sig)
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


def reverb(st, wet=0.2, d=2.0, decay=0.5):
    r = np.random.default_rng(3)
    t = tt(d)
    irs = []
    for _ in range(2):
        x = r.standard_normal(len(t)) * np.exp(-t / decay)
        x = filt(x, "low", 7000)
        x[: int(0.015 * SR)] *= np.linspace(0, 1, int(0.015 * SR))
        irs.append(x / np.sqrt(np.sum(x ** 2)))
    m = filt(st.mean(1), "high", 350)
    return st + wet * np.stack([ss.fftconvolve(m, irs[0])[:N], ss.fftconvolve(m, irs[1])[:N]], 1)


# ---------- الأصوات (كلها نغمات نظيفة) ----------
def att(t, a=0.002):
    return np.clip(t / a, 0, 1)


def marimba(f, amp=1.0, d=0.6):
    """ماريمبا ناعمة: أساسية + توافقية رابعة قصيرة (صوت خشبي حلو وواضح)"""
    t = tt(d)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.22)
         + 0.32 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t / 0.035)
         + 0.08 * np.sin(2 * np.pi * f * 9.9 * t) * np.exp(-t / 0.012))
    return amp * x * att(t)


def glass(f, amp=1.0, d=1.4):
    """جرس زجاجي صافي"""
    t = tt(d)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55)
         + 0.28 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.18)
         + 0.1 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.07))
    return amp * x * att(t, 0.001)


def pop(f, amp=1.0, d=0.35):
    """فرقعة فقاعة نغمية: النغمة تطلع بسرعة لمكانها مع لمعة خفيفة"""
    t = tt(d)
    fr = f * (1 - 0.32 * np.exp(-t / 0.014))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = np.sin(ph) * np.exp(-t / 0.09) + 0.22 * np.sin(2 * ph) * np.exp(-t / 0.03)
    return amp * x * att(t, 0.0015)


def tap(amp=1.0, f=3000):
    """نقرة زر واضحة (نغمية، مو ضجيج)"""
    t = tt(0.08)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.0045) + 0.6 * np.sin(2 * np.pi * f * 0.37 * t) * np.exp(-t / 0.012)
    return amp * x * att(t, 0.0005)


def thump(amp=1.0, f0=190, f1=82, d=0.4):
    """ضربة واضحة: جسم دافي + «توك» في الوسط يسمع في سماعة الجوال"""
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.exp(-t / 0.12)
    tok = np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.022) * 0.45 + np.sin(2 * np.pi * 1250 * t) * np.exp(-t / 0.006) * 0.25
    return amp * np.tanh((body + tok) * 1.2) * att(t, 0.001)


def air(d, f_lo=900, f_hi=5500, peak=0.5, width=0.45, seed=0):
    """ووش هوائي ناعم وخفيف (مركّز في الترددات المتوسطة والعالية)"""
    n = int(d * SR)
    r = np.random.default_rng(100 + seed)
    outs = []
    for _ in range(2):
        f, tm, Z = ss.stft(r.standard_normal(n), SR, nperseg=1024)
        prog = np.clip(tm / d, 0, 1)
        c = f_lo * (f_hi / f_lo) ** np.sin(np.pi * prog)
        mask = np.exp(-0.5 * (np.log((f[:, None] + 1) / c[None, :]) / width) ** 2)
        _, x = ss.istft(Z * mask, SR, nperseg=1024)
        x = x[:n]
        if len(x) < n:
            x = np.pad(x, (0, n - len(x)))
        u = np.arange(n) / SR / d
        env = np.where(u < peak, np.sin(np.pi / 2 * u / peak) ** 2, np.cos(np.pi / 2 * np.clip((u - peak) / (1 - peak), 0, 1)) ** 2)
        outs.append(x / (np.abs(x).max() + 1e-9) * env)
    return outs[0], outs[1]


def swell(d, f0, f1, amp=1.0):
    """نغمة ناعمة تنزلق (لتكوّن البطاقة)"""
    t = tt(d)
    f = f0 * (f1 / f0) ** (np.sin(np.pi / 2 * np.clip(t / d, 0, 1)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return amp * (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)) * env


def bloop(d=0.45, f0=330, f1=880, amp=1.0):
    """تمدد حلو لما يكبر صندوق الهدية"""
    t = tt(d)
    f = f0 * (f1 / f0) ** np.clip(t / (d * 0.55), 0, 1) ** 0.7
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = att(t, 0.01) * np.exp(-np.clip(t - d * 0.5, 0, None) / 0.08)
    return amp * (np.sin(ph) + 0.18 * np.sin(2 * ph)) * env


def pad(freqs, d=2.4, amp=1.0, a=0.08, decay=0.9):
    """كورد ناعم (جيبيات بس، بدون خشونة) يتوسع في الستيريو"""
    t = tt(d)
    L = np.zeros_like(t)
    R = np.zeros_like(t)
    for i, f in enumerate(freqs):
        for det, side in ((-3, 0), (3, 1), (0, 2)):
            ff = f * 2 ** (det / 1200)
            v = np.sin(2 * np.pi * ff * t + i) + 0.15 * np.sin(4 * np.pi * ff * t)
            if side in (0, 2):
                L += v
            if side in (1, 2):
                R += v
    env = np.clip(t / a, 0, 1) * np.exp(-t / decay) * np.clip((d - t) / 0.3, 0, 1)
    k = amp / (len(freqs) * 2)
    return L * env * k, R * env * k


def ceramic(amp=1.0):
    """نقرة كوب سيراميك (صافية)"""
    t = tt(1.4)
    parts = [(2140, 0.3, 1.0), (3420, 0.16, 0.6), (5260, 0.08, 0.35), (1210, 0.38, 0.8), (6890, 0.05, 0.2)]
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d, a in parts)
    return amp * x / 2.6 * att(t, 0.0008)


def arp(notes, step, amp=1.0, kind=glass):
    """سلسلة نغمات متتابعة"""
    d = step * (len(notes) - 1) + 1.4
    x = np.zeros(int(d * SR))
    for i, f in enumerate(notes):
        y = kind(f, 1.0)
        j = int(i * step * SR)
        x[j:j + len(y)] += y[: len(x) - j] * (0.85 + 0.15 * (i % 2))
    return x * amp


# ---------- التركيب ----------
s = Bus()
# خط ← بطاقة: نغمة ناعمة تطلع + نقرتين ماريمبا لما يتشكل
s.add(0.1, swell(1.2, D4, A4, 1.0), 0.22)
s.add(0.1, air(1.2, 500, 2600, 0.6, 0.5, 1), 0.10)
s.add(T["thick"] - 0.02, marimba(D5, 1.0), 0.32)
s.add(T["sq"] + 0.05, marimba(A5, 0.9), 0.26)
# اللوحة الكريمية تطلع
s.add(T["panel"] - 0.05, air(0.55, 1200, 5000, 0.6, 0.4, 2), 0.16, -0.2)
s.add(T["panel"] + 0.32, glass(Fs6, 0.8), 0.12)
# تقريب + ضربة واضحة + لمعة
s.add(T["grow"] - 0.06, air(0.42, 700, 4200, 0.85, 0.5, 3), 0.28)
s.add(T["land"] - 0.12, thump(1.0), 0.75)
s.add(T["land"] - 0.1, glass(D6, 1.0), 0.16)
# الوسم: نجمتين + نقرات خفيفة
s.add(T["st1"], pop(A5, 1.0), 0.42, 0.25)
s.add(T["st2"], pop(D6, 1.0), 0.42, -0.25)
s.add(T["tag"] + 0.05, arp([Fs6, A6, B6], 0.1, 0.5, marimba), 0.12)
# العنوان ينكتب: أجراس تطلع مع المؤشر (من اليمين لليسار)
hd_notes = [D5, E5, Fs5, A5, B5, D6, E6]
for i, f in enumerate(hd_notes):
    s.add(T["hd"] + 0.04 + i * 0.13, glass(f, 1.0), 0.17, 0.35 - i * 0.11)
# الكلمات الرمادية
for i, f in enumerate([Fs5, A5, D6]):
    s.add(T["w"][i], pop(f, 1.0), 0.42, [0.2, 0.0, -0.2][i])
# حركات الكاميرا: ووش هوائي خفيف
for k, (a, b) in enumerate(WHIPS):
    s.add(a - 0.04, air(b - a + 0.18, 900, 5200, 0.55, 0.45, 10 + k), 0.24)
# الشريحة + صندوق الهدية
s.add(T["chip"], pop(B5, 0.9), 0.36, -0.2)
s.add(T["box"], bloop(0.45, 330, 880), 0.3, -0.2)
s.add(T["gico"], tap(1.0, 3000), 0.3, -0.2)
s.add(T["gico"] + 0.01, marimba(E6, 1.0), 0.28, -0.2)
s.add(T["gq"] + 0.04, arp([A5, B5, D6], 0.12, 0.6, marimba), 0.16, -0.2)
s.add(T["gbtn"], pop(Fs5, 1.0), 0.38, -0.2)
s.add(T["gpress"], tap(1.0, 3400), 0.34, -0.2)
s.add(T["gpress"] + 0.01, glass(A6, 0.8), 0.1, -0.2)
# الدفع + زر الطلب
s.add(T["cod"] + 0.08, thump(0.7, 170, 90, 0.3), 0.45, 0.2)
s.add(T["cod"] + 0.09, marimba(D5, 1.0), 0.32, 0.2)
s.add(T["cod"] + 0.25, marimba(A5, 0.8), 0.22, 0.2)
s.add(T["order"], pop(D6, 1.0), 0.4, 0.2)
s.add(T["opress"], tap(1.0, 3400), 0.34, 0.2)
s.add(T["opress"] + 0.01, glass(Fs6, 0.8), 0.12, 0.2)
# صور المنتجات: ماريمبا تطلع + نقرة سيراميك خفيفة
for i, at in enumerate(T["ph"]):
    s.add(at, marimba([D5, Fs5, A5, D6][i], 1.0), 0.34, [0.3, 0.1, -0.1, -0.3][i])
    s.add(at + 0.005, ceramic(0.6), 0.1, [0.3, 0.1, -0.1, -0.3][i])
# القائمة: أجراس زجاجية تطلع
LI_N = [D6, E6, Fs6, A6, Fs6, A6, B6, hz(98)]
for i, at in enumerate(T["li"]):
    s.add(at, glass(LI_N[i], 1.0), 0.2, 0.3 if i < 4 else -0.3)
    s.add(at, tap(0.5, 4200), 0.12, 0.3 if i < 4 else -0.3)
# تبعيد للبطاقة كاملة: ووش + ضربة + كورد يتفتح
s.add(T["out"] - 0.05, air(0.38, 1600, 600, 0.45, 0.5, 20), 0.26)
s.add(13.0, thump(1.0, 200, 80, 0.5), 0.8)
s.add(13.0, pad([D4, Fs4, A4, D5], 2.2, 1.0, 0.04, 0.8), 0.22)
s.add(13.02, glass(A5, 1.0), 0.14, 0.3)
s.add(13.12, glass(D6, 1.0), 0.12, -0.3)
# البطاقة تصغر وتختفي: ووش يتسحب + نغمة تنزل
s.add(T["shrink"] - 0.12, air(0.55, 700, 4800, 0.8, 0.45, 21), 0.3)
s.add(T["shrink"], swell(0.45, A5, D5, 1.0), 0.14)
s.add(T["gone"] - 0.04, pop(D5, 0.9), 0.32)
# الختام: نقرة سيراميك + كورد أجراس + ضربة ناعمة
s.add(T["logo"], ceramic(1.0), 0.5)
s.add(T["logo"] + 0.01, thump(0.6, 160, 85, 0.35), 0.4)
for i, f in enumerate([D5, Fs5, A5, D6]):
    s.add(T["logo"] + 0.03 + i * 0.06, glass(f, 1.0, 2.0), 0.13, [-0.3, -0.1, 0.1, 0.3][i])
s.add(T["logo"], pad([D4, A4, D5, Fs5], 2.5, 1.0, 0.06, 1.1), 0.16)
s.add(T["e1"] + 0.04, arp([A5, B5, D6], 0.12, 0.5, marimba), 0.15)
s.add(T["e2"], pop(Fs6, 0.9), 0.32)
s.add(T["e3"], pop(D6, 1.0), 0.4)
s.add(T["e3"] + 0.01, tap(0.7, 3400), 0.2)


def master(st, target_peak=0.89):
    out = []
    for ch in st.T:
        x = filt(ch, "high", 55)                         # الجوال ما يطلع الصب، فنشيله ونخلي الصوت نظيف
        x = x + 0.25 * filt(x, "band", [2000, 6000])    # وضوح
        out.append(x)
    st = np.stack(out, 1)
    st = np.tanh(st * 1.05) / np.tanh(1.05)
    st = st / (np.abs(st).max() + 1e-9) * target_peak
    fade = int(0.5 * SR)
    st[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return st


mix = reverb(s.st(), 0.22, 2.0, 0.45)
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
wf.write(os.path.join(out, "sfx.wav"), SR, (np.clip(master(mix), -1, 1) * 32767).astype(np.int16))
print("ok", out)
