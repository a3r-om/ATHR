"""موسيقى ومؤثرات أصلية لإعلان روا (نيون بيج مع لمسات إضافية، 44.4 ثانية، 100 نبضة/دقيقة) على نفس توقيت ad.html.

python3 marketing/ads/2026-10-13-neon-plus/music.py <out_dir>
يكتب: music.wav (الموسيقى) و sfx.wav (المؤثرات) و mix.wav (النسخة النهائية) و mix_vo.wav (موسيقى أخفض لمن يبي يضيف صوته)
"""
import os
import sys
import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as ss

SR = 44100
DUR = 44.4
N = int(SR * DUR)
rng = np.random.default_rng(7)
BEAT = 0.6
BAR = BEAT * 4
GRID0 = 0.6                      # أول ضربة في المقياس الموسيقي (كل المشاهد تبدأ على ضربة)

# نفس توقيت ad.html
T = dict(sw=[0.9, 1.8, 2.7], put=3.6, q=4.1, s2=5.4, h2=5.55, items=[6.3, 7.5, 8.7, 9.9, 11.1], zoom=12.6,
         t3a=12.75, logo=13.2, box=14.1, shine3=[14.7, 16.3], s5=17.4, h5=17.55, ph=[17.9, 19.3, 20.7],
         s4=22.2, h4=22.35, steps=[23.4, 24.6, 25.8], f=[27.0, 29.4, 31.8, 34.2], lid=35.2,
         s6=36.6, w6a=36.7, w6b=36.9, land=37.35, lift=37.55, t6b=37.75, s7=39.0,
         logo7=39.1, t7a=39.35, t7b=40.1, t7c=40.7, t7d=41.2, shine7=42.3, end=43.8)
SP3 = [13.35, 13.5, 13.7, 13.9, 14.3]
SP6 = [37.9, 38.05, 38.2, 38.35]
SP7 = [39.4, 39.6, 41.0, 41.3, 41.6]
WHIPS = [5.4, 17.4, 22.2, 27.0, 29.4, 31.8, 34.2, 36.6, 39.0]


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, t0, sig, gain=1.0, pan=0.0, other=None):
        i = int(round(t0 * SR))
        if i >= N:
            return
        a = sig if other is None else sig
        b = sig if other is None else other
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


def reverb_ir(d=2.2, decay=0.55, seed=1):
    r = np.random.default_rng(seed)
    t = tt(d)
    irs = []
    for _ in range(2):
        x = r.standard_normal(len(t)) * np.exp(-t / decay)
        x = filt(x, "low", 6000)
        x[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        irs.append(x / np.sqrt(np.sum(x ** 2)))
    return irs


def reverb(st, wet=0.25, d=2.2, decay=0.55):
    irl, irr = reverb_ir(d, decay)
    m = filt(st.mean(1), "high", 250)
    wl = ss.fftconvolve(m, irl)[:N]
    wr = ss.fftconvolve(m, irr)[:N]
    return st + wet * np.stack([wl, wr], 1)


# ---------- الأصوات ----------
def kick(f0=160, f1=46, d=0.45, tau=0.14):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.028)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
    click = filt(noise(d), "high", 2500) * np.exp(-t / 0.003) * 0.35
    return np.tanh((body + click) * 1.4)


def clap(d=0.3):
    t = tt(d)
    env = np.zeros_like(t)
    for k, off in enumerate([0, 0.01, 0.021, 0.03]):
        env += np.where(t >= off, np.exp(-(t - off) / (0.005 if k < 3 else 0.09)), 0)
    return filt(noise(d), "band", [1000, 4200]) * env * 0.75


def hat(open_=False):
    d = 0.3 if open_ else 0.07
    t = tt(d)
    return filt(noise(d), "high", 7500) * np.exp(-t / (0.09 if open_ else 0.014)) * 0.5


def sub808(f, d, glide_from=None):
    t = tt(d)
    fr = np.full_like(t, f)
    if glide_from:
        fr = f + (glide_from - f) * np.exp(-t / 0.06)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    env = np.clip(t / 0.006, 0, 1) * np.exp(-t / (d * 0.7)) * np.clip((d - t) / 0.03, 0, 1)
    x = np.sin(ph) + 0.18 * np.sin(2 * ph)
    return np.tanh(x * 1.6) * env


def saw(f, t, phase=0.0):
    # سو بحدود محدودة (جمع توافقيات) حتى ما يطلع تشويش
    x = np.zeros_like(t)
    nmax = int(min(30, 16000 / max(f, 1)))
    for n in range(1, nmax + 1):
        x += np.sin(2 * np.pi * f * n * t + phase * n) / n
    return x


def pad(freqs, d, cutoff=1800, att=0.4, rel=0.5):
    t = tt(d)
    xl = np.zeros_like(t)
    xr = np.zeros_like(t)
    for f in freqs:
        for det, side in ((-0.09, 0), (0.0, 2), (0.08, 1)):
            ff = f * (2 ** (det / 12 * 1.0))
            v = saw(ff, t, rng.uniform(0, 6.28))
            if side in (0, 2):
                xl += v
            if side in (1, 2):
                xr += v
    env = np.clip(t / att, 0, 1) * np.clip((d - t) / rel, 0, 1)
    k = 1.0 / (len(freqs) * 3)
    return filt(xl, "low", cutoff) * env * k, filt(xr, "low", cutoff) * env * k


def pluck(f, d=0.35, tau=0.12, bright=3500):
    t = tt(d)
    x = saw(f, t) * 0.6 + np.sin(2 * np.pi * f * t)
    x = filt(x, "low", bright)
    return x * np.clip(t / 0.002, 0, 1) * np.exp(-t / tau)


def bell(f, d=1.4):
    t = tt(d)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.6) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.25)
         + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.1))
    return x * np.clip(t / 0.002, 0, 1)


def whoosh(d, f_lo=300, f_hi=6000, peak=0.75, width=0.6):
    n = int(d * SR)
    outs = []
    for _ in range(2):
        f, tm, Z = ss.stft(rng.standard_normal(n), SR, nperseg=1024)
        prog = np.clip(tm / d, 0, 1)
        c = f_lo * (f_hi / f_lo) ** prog
        mask = np.exp(-0.5 * (np.log((f[:, None] + 1) / c[None, :]) / width) ** 2)
        _, x = ss.istft(Z * mask, SR, nperseg=1024)
        x = x[:n]
        if len(x) < n:
            x = np.pad(x, (0, n - len(x)))
        u = np.arange(n) / SR / d
        env = np.where(u < peak, (u / peak) ** 2.4, np.clip(1 - (u - peak) / (1 - peak), 0, 1) ** 1.6)
        outs.append(x / (np.abs(x).max() + 1e-9) * env)
    return outs


def impact(d=1.8, f=44, room=0.25):
    t = tt(d)
    fr = f + 40 * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.6)
    burst = filt(noise(d), "low", 9000) * np.exp(-t / 0.04) * 0.7
    tails = [filt(noise(d), "band", [200, 2500]) * np.exp(-t / 0.45) * room for _ in range(2)]
    a = np.tanh((body * 0.8 + burst + tails[0] * 1.6) * 1.2)
    b = np.tanh((body * 0.8 + burst + tails[1] * 1.6) * 1.2)
    return a, b


def hit(amp=1.0):
    """ضربة قصيرة لظهور الكلام"""
    t = tt(0.5)
    fr = 70 + 90 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.12)
    snap = filt(noise(0.5), "band", [1500, 7000]) * np.exp(-t / 0.018) * 0.8
    tok = np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.025) * 0.5
    return amp * np.tanh((body * 0.6 + snap + tok) * 1.3)


def neon_on(d=0.9):
    """صوت تشغيل ناعم (بدون تشويش): نغمة تطلع أوكتاف وتثبت مع ارتعاش خفيف"""
    t = tt(d)
    f = 220 * 2 ** np.clip(t / 0.16, 0, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
    trem = 0.85 + 0.15 * np.sin(2 * np.pi * 6 * t)
    env = np.clip(t / 0.03, 0, 1) * np.exp(-t / (d * 0.45)) * np.clip((d - t) / 0.08, 0, 1)
    return filt(x, "low", 2200) * trem * env * 0.45


def blip(f0=900, f1=1800, d=0.12):
    t = tt(d)
    f = f0 * (f1 / f0) ** np.clip(t / 0.06, 0, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.clip(t / 0.002, 0, 1) * np.exp(-t / 0.035) * (np.sin(ph) + 0.3 * np.sign(np.sin(ph)) * 0.4)


def tick(amp=1.0):
    t = tt(0.04)
    return amp * (np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.006) + filt(noise(0.04), "high", 4000) * np.exp(-t / 0.003) * 0.4)


def stretch(d=0.5, f0=300, f1=1400):
    """صوت تمدد الكشيدة"""
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = filt(saw(1, t) * 0 + np.sign(np.sin(ph)) * 0.3 + np.sin(ph), "low", 4000)
    return x * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7 * 0.5


def ceramic(amp=1.0):
    """نقرة كوب سيراميك"""
    t = tt(1.0)
    parts = [(2140, 0.22), (3420, 0.12), (5260, 0.07), (1210, 0.28), (6890, 0.04)]
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in parts)
    tap = filt(noise(1.0), "band", [2000, 9000]) * np.exp(-t / 0.003) * 0.7
    return amp * (x / 3.2 + tap)


def suction(d=0.5):
    """سحب للداخل قبل الزووم (عكس صوت الصنج)"""
    t = tt(d)
    x = filt(noise(d), "high", 1500) * (t / d) ** 3
    return x * 0.8


# ---------- الهارموني: Dm - Bb - F - C ----------
def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


CHORDS = [([62, 65, 69], 38), ([58, 62, 65], 34), ([57, 60, 65], 41), ([55, 60, 64], 36)]   # (نوتات الباد، جذر الباص)
ARP = [[74, 77, 81, 77], [70, 74, 77, 74], [72, 77, 81, 77], [72, 76, 79, 76]]


def bar_index(t):
    return int(np.floor((t - GRID0 + 1e-6) / BAR))


def chord(t):
    return CHORDS[bar_index(t) % 4]


# أصوات إضافية لهذي النسخة
def pour(d=0.6):
    """صب مشروب: فقاعات صغيرة + خرير"""
    t = tt(d)
    x = filt(noise(d), "band", [400, 2600]) * 0.25 * np.sin(np.pi * np.clip(t / d, 0, 1))
    r = np.random.default_rng(int(d * 1000))
    for _ in range(int(d * 26)):
        t0 = r.uniform(0, d * 0.9)
        f0 = r.uniform(380, 1100)
        tb = tt(0.05)
        bub = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.2 * tb / 0.05)) / SR) * np.exp(-tb / 0.012)
        i = int(t0 * SR)
        x[i:i + len(bub)] += bub[: len(x) - i] * r.uniform(0.2, 0.45)
    return x


def chime(f, d=0.9):
    x = bell(f, d) * 0.7
    y = bell(f * 2.01, d * 0.6) * 0.25
    x[: len(y)] += y
    return x


def pop(amp=1.0):
    t = tt(0.25)
    f = 900 * np.exp(-t / 0.02) + 180
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    click = filt(noise(0.25), "high", 3000) * np.exp(-t / 0.004) * 0.5
    return amp * (body + click)


def shing(d=0.7):
    a, b = whoosh(d, 3000, 12000, peak=0.5, width=0.35)
    c = chime(hz(98), d)[: len(a)] * 0.25
    return a[: len(c)] * 0.8 + c, b[: len(c)] * 0.8 + c


def flip(d=0.28):
    """قلبة كرت ناعمة"""
    a, _ = whoosh(d, 600, 4500, peak=0.45, width=0.5)
    return a * 0.7


music = Bus()
sfx = Bus()


# الأقسام: المقدمة هادئة (كوب ومشروب)، والطبول تدخل مع «عندنا أكواب»
def drums_on(t):
    return (T["s2"] - 1e-6 <= t < T["zoom"] - 0.6) or (T["logo"] - 1e-6 <= t < T["s6"]) or (T["s7"] - 1e-6 <= t < T["end"])


b = -1
while True:
    t0 = GRID0 + b * BAR
    if t0 >= DUR:
        break
    notes, root = CHORDS[b % 4]
    cut = 1100 if t0 < T["s2"] - 1e-6 else (2400 if t0 < T["s6"] - 1e-6 or t0 >= T["s7"] else 1500)
    d = min(BAR + 0.35, DUR - max(t0, 0))
    pl, pr = pad([hz(n) for n in notes] + [hz(notes[0] - 12)], d, cutoff=cut)
    music.add(t0, pl, 0.55 if t0 >= T["s2"] - 1e-6 else 0.45, other=pr)
    b += 1

for k in range(int((DUR - GRID0) / (BEAT / 2))):
    t0 = GRID0 + k * BEAT / 2
    if t0 >= T["end"]:
        break
    if T["zoom"] - 0.6 <= t0 < T["logo"]:
        continue
    bi = bar_index(t0) % 4
    m = ARP[bi][k % 4]
    bright = 2000 if t0 < T["s2"] else 3800
    gain = 0.13 if t0 < T["s2"] else (0.1 if T["s6"] <= t0 < T["s7"] else 0.16)
    music.add(t0, pluck(hz(m), 0.32, 0.1, bright), gain, pan=0.35 if k % 2 else -0.35)

# نقرة خفيفة في المقدمة (بدون طبول كاملة)
for k in range(int((T["s2"] - GRID0) / (BEAT / 2))):
    t0 = GRID0 + k * BEAT / 2
    if k % 2 == 1:
        music.add(t0, hat(), 0.06, pan=-0.2)
    if k % 4 == 0 and t0 >= T["put"] - 1e-6:
        music.add(t0, kick(120, 45, 0.35, 0.1), 0.35)

for k in range(int((DUR - GRID0) / (BEAT / 4)) + 1):
    t0 = GRID0 + k * BEAT / 4
    if t0 >= DUR or not drums_on(t0):
        continue
    step = k % 16
    _, root = chord(t0)
    if step in (0, 6, 10):
        music.add(t0, kick(), 0.7)
        music.add(t0, sub808(hz(root + 12), 0.5 if step != 6 else 0.35, glide_from=hz(root + 24) if step == 0 else None), 0.3)
    if step in (4, 12):
        music.add(t0, clap(), 0.42, pan=0.05)
    if step % 2 == 0:
        music.add(t0, hat(), 0.16 if step % 4 else 0.1, pan=-0.25)
    elif T["f"][0] <= t0 < T["s6"] or t0 >= T["s7"]:
        music.add(t0, hat(), 0.07, pan=0.25)
    if step == 14:
        music.add(t0, hat(True), 0.1, pan=0.2)

for j in range(8):
    t0 = T["zoom"] - 1.2 + j * BEAT / 4
    music.add(t0, hat(), 0.08 + 0.02 * j, pan=0.1 * (j % 2 * 2 - 1))

pl, pr = pad([hz(n) for n in CHORDS[0][0]] + [hz(50)], DUR - T["end"] + 0.2, cutoff=2600, att=0.01, rel=0.5)
music.add(T["end"], pl, 0.6, other=pr)
music.add(T["end"], kick(150, 42, 0.8, 0.3), 0.8)
music.add(T["end"], sub808(hz(50), 0.8), 0.4)

# ---------- المؤثرات ----------
a, b2 = whoosh(1.2, 120, 2500, peak=0.85, width=0.7)
sfx.add(0.0, a, 0.35, other=b2)
sfx.add(0.0, sub808(hz(33), 1.4), 0.14)
sfx.add(0.25, neon_on(0.85), 0.24)
sfx.add(1.05, ceramic(0.6), 0.2)                        # الكوب يكتمل
for i, at in enumerate(T["sw"]):                        # قهوتك… كركك… شايك…
    sfx.add(at - 0.1, pour(0.62), 0.32)
    sfx.add(at, hit(0.6), 0.35)
    sfx.add(at + 0.05, chime(hz([79, 83, 86][i]), 1.0), 0.13)
    a, b2 = whoosh(0.3, 1500, 9000, peak=0.5, width=0.4)
    sfx.add(at - 0.05, a, 0.12, other=b2)
sfx.add(T["put"], hit(0.9), 0.5)
sfx.add(T["q"], hit(1.0), 0.58)
sfx.add(T["q"], ceramic(0.6), 0.18)
a, b2 = whoosh(1.2, 500, 7000, peak=0.5, width=0.5)
sfx.add(T["q"] + 0.1, a, 0.2, pan=-0.3, other=b2)

for W in WHIPS:
    a, b2 = whoosh(0.5, 250, 6500, peak=0.62, width=0.55)
    sfx.add(W - 0.31, a, 0.42, other=b2)
    sfx.add(W, hit(0.6), 0.28)

sfx.add(T["h2"], blip(700, 1400, 0.12), 0.14)
PENTA = [74, 77, 79, 81, 84]
for i, at in enumerate(T["items"]):
    a, b2 = whoosh(0.32, 900, 8000, peak=0.45, width=0.45)
    sfx.add(at - 0.08, a, 0.2, pan=0.4 * (1 if i % 2 else -1), other=b2)
    sfx.add(at + 0.05, neon_on(0.5), 0.14)
    sfx.add(at + 0.12, bell(hz(PENTA[i]), 1.2), 0.12)
    sfx.add(at + 0.1, hit(0.5), 0.25)

a, b2 = whoosh(0.7, 200, 6000, peak=0.92, width=0.6)
sfx.add(T["zoom"] - 0.62, a, 0.36, other=b2)
sfx.add(T["zoom"] - 0.5, filt(suction(0.5), "low", 6000), 0.1)
sfx.add(T["t3a"], hit(0.7), 0.4)
a, b2 = whoosh(0.45, 150, 3000, peak=0.95, width=0.6)
sfx.add(T["logo"] - 0.45, a, 0.35, other=b2)
a, b2 = impact(2.2, 42, 0.3)
sfx.add(T["logo"], a, 0.95, other=b2)
sfx.add(T["logo"], ceramic(1.0), 0.32)
a, b2 = whoosh(0.3, 2000, 9000, peak=0.4, width=0.4)
sfx.add(T["box"] - 0.05, a, 0.3, other=b2)
sfx.add(T["box"], hit(0.7), 0.42)
for at in T["shine3"] + [T["shine7"]]:
    a, b2 = shing(0.75)
    sfx.add(at, a, 0.22, other=b2)
for i, at in enumerate(SP3 + SP6 + SP7):
    sfx.add(at + 0.1, chime(hz([93, 96, 98, 100, 91][i % 5]), 0.8), 0.07, pan=(i % 3 - 1) * 0.5)

# عبارات تحكي عنك
sfx.add(T["h5"], blip(800, 1500, 0.12), 0.14)
for i, at in enumerate(T["ph"]):
    sfx.add(at - 0.02, flip(0.3), 0.35, pan=0.3 * (1 if i % 2 else -1))
    sfx.add(at + 0.15, hit(0.55), 0.3)
    sfx.add(at + 0.15, chime(hz([81, 84, 86][i]), 1.0), 0.1)
    a, b2 = shing(0.6)
    sfx.add(at + 0.45, a, 0.12, other=b2)

# اختار اللي يشبهك
sfx.add(T["h4"], blip(800, 1500, 0.12), 0.14)
for s in T["steps"]:
    a, b2 = whoosh(0.55, 400, 6000, peak=0.5, width=0.5)
    sfx.add(s - 0.05, a, 0.28, pan=-0.2, other=b2)
    sfx.add(s + 0.42, tick(0.9), 0.18)
for s in [22.5] + T["steps"]:
    a, b2 = shing(0.6)
    sfx.add(s + 0.5, a, 0.1, other=b2)

# المزايا
for i, a0 in enumerate(T["f"]):
    sfx.add(a0 + 0.05, neon_on(0.75), 0.18)
    slam_at = a0 + (0.55 if i == 1 else (0.35 if i == 0 else 0.4))
    rise_at = a0 + (0.95 if i == 1 else (0.75 if i == 0 else 0.8))
    sfx.add(slam_at, hit(0.85), 0.5)
    a, b2 = whoosh(0.35, 1200, 8000, peak=0.6, width=0.45)
    sfx.add(rise_at - 0.1, a, 0.18, other=b2)
    sfx.add(rise_at, blip(1000, 1600, 0.1), 0.1)
t_ = tt(1.6)
motor = filt(saw(46, t_) + 0.3 * noise(1.6), "low", 500) * np.clip(t_ / 0.2, 0, 1) * np.clip((1.6 - t_) / 0.5, 0, 1)
sfx.add(T["f"][0], motor, 0.12)
a0 = T["f"][1]
for m in range(1, 12):                                  # العداد 0 ← 11
    k = 1 - (1 - (m - 0.5) / 11) ** (1 / 3)
    sfx.add(a0 + 0.15 + k * 1.0, tick(0.8 + 0.02 * m), 0.2)
sfx.add(a0 + 1.15, bell(hz(86), 1.4), 0.16)
sfx.add(a0 + 1.15, bell(hz(81), 1.4), 0.1)
for j in range(6):                                      # انفجار المعيّنات
    sfx.add(a0 + 1.17 + j * 0.06, chime(hz(93 + (j * 3) % 8), 0.6), 0.05, pan=(j % 3 - 1) * 0.6)
# الهدية: الغطاء يطير
sfx.add(T["lid"], pop(1.0), 0.45)
a, b2 = whoosh(0.4, 1500, 9000, peak=0.25, width=0.5)
sfx.add(T["lid"], a, 0.2, other=b2)
for j in range(9):
    sfx.add(T["lid"] + 0.05 + j * 0.055, chime(hz([88, 91, 93, 96, 98, 100, 96, 93, 91][j]), 0.7), 0.06, pan=(j % 3 - 1) * 0.6)

# كل كوب… طقسٌ صغير
sfx.add(T["w6a"], hit(0.6), 0.32)
sfx.add(T["w6b"], hit(0.6), 0.32)
a, b2 = whoosh(0.4, 150, 2500, peak=0.95)
sfx.add(T["land"] - 0.4, a, 0.32, other=b2)
sfx.add(T["land"], ceramic(1.0), 0.5)                   # الكوب ينطبع على الطاولة
sfx.add(T["land"], kick(110, 40, 0.5, 0.15), 0.5)
a, b2 = whoosh(0.45, 300, 5000, peak=0.3, width=0.5)
sfx.add(T["lift"], a, 0.22, other=b2)
a, b2 = impact(1.4, 46, 0.2)
sfx.add(T["t6b"], a, 0.6, other=b2)
sfx.add(T["t6b"] + 0.3, stretch(0.5, 300, 1100), 0.12)

# اطلب الحين
sfx.add(T["logo7"], blip(600, 1200, 0.15), 0.18)
sfx.add(T["logo7"], ceramic(0.7), 0.2)
sfx.add(T["t7a"], hit(1.0), 0.55)
a, b2 = whoosh(0.55, 900, 8000, peak=0.45, width=0.45)
sfx.add(T["t7a"] + 0.25, a, 0.22, pan=0.4, other=b2)
for at in (T["t7b"], T["t7c"], T["t7d"]):
    sfx.add(at, blip(900, 1500, 0.1), 0.13)
    a, b2 = whoosh(0.25, 2000, 9000, peak=0.5, width=0.4)
    sfx.add(at - 0.05, a, 0.1, other=b2)
sfx.add(T["end"], ceramic(0.8), 0.25)


# ---------- الميكس ----------
def eq(st):
    out = []
    for ch in st.T:
        x = filt(ch, "high", 32)
        x = x - 0.6 * filt(x, "low", 70)                    # تخفيف الصب (الجوال ما يطلعه)
        x = x + 0.35 * filt(x, "band", [1400, 5000])        # وضوح
        out.append(x)
    return np.stack(out, 1)


def master(st, target_peak=0.9):
    st = eq(st)
    st = np.tanh(st * 1.15) / np.tanh(1.15)
    st = st / (np.abs(st).max() + 1e-9) * target_peak
    fade = int(0.6 * SR)
    st[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return st


m = music.st()
# ضغط جانبي بسيط: الموسيقى تنخفض لحظة كل ضربة كيك وكل مؤثر قوي
env = np.ones(N)
for k in range(int((DUR - GRID0) / (BEAT / 4)) + 1):
    t0 = GRID0 + k * BEAT / 4
    if t0 < DUR and drums_on(t0) and (k % 16) in (0, 6, 10):
        i = int(t0 * SR)
        d = int(0.22 * SR)
        seg = 1 - 0.35 * np.exp(-np.arange(d) / (0.07 * SR))
        env[i:i + d] = np.minimum(env[i:i + d], seg[: len(env[i:i + d])])
m_pad_duck = m * env[:, None]
m_pad_duck = reverb(m_pad_duck, 0.18, 2.0, 0.5)
s = reverb(sfx.st(), 0.12, 1.4, 0.35)

out = sys.argv[1]
os.makedirs(out, exist_ok=True)


def w(name, st):
    wf.write(os.path.join(out, name), SR, (np.clip(st, -1, 1) * 32767).astype(np.int16))


w("music.wav", master(m_pad_duck, 0.8))
w("sfx.wav", master(s, 0.8))
w("mix.wav", master(m_pad_duck * 0.62 + s * 1.0))
w("mix_vo.wav", master(m_pad_duck * 0.26 + s * 0.75))
print("ok", out)
