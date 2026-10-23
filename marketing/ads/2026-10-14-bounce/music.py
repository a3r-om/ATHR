"""موسيقى ومؤثرات أصلية لإعلان روا «المعيّن الذهبي» (19.6 ثانية، 75 نبضة/دقيقة بإحساس 150) على نفس توقيت ad.html.

python3 marketing/ads/2026-10-14-bounce/music.py <out_dir>
بدون أي طقطقة أو ضجيج عريض (ملاحظة صاحب المتجر).
"""
import os
import sys
import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as ss

SR = 44100
DUR = 19.6
N = int(SR * DUR)
rng = np.random.default_rng(7)
BEAT = 0.8
BAR = BEAT * 4
GRID0 = 0.0                      # أول ضربة في المقياس الموسيقي (كل المشاهد تبدأ على ضربة)

# نفس توقيت ad.html
T = dict(words=[0.4, 0.8, 1.6, 2.0, 2.4], bounces=[0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8], B=3.2,
         swings=[3.2, 4.0, 4.8, 5.6, 6.4, 7.2], wipe=7.65, C=8.0, glow=8.4, sweep=8.8, open=9.6, full=10.4,
         rise=11.2, D=12.0, cut=0.4, E=15.6, F=17.2, end=19.6, land=[17.65, 18.0, 18.22])


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




def switch(amp=1.0):
    """زر نور: طقّتين قصيرتين"""
    t = tt(0.12)
    x = np.zeros_like(t)
    for off, a in ((0.0, 1.0), (0.018, 0.6)):
        i = int(off * SR)
        tb = t[: len(t) - i]
        x[i:] += a * (filt(noise(len(tb) / SR), "band", [1500, 7000]) * np.exp(-tb / 0.004) + np.sin(2 * np.pi * 420 * tb) * np.exp(-tb / 0.01) * 0.4)
    return amp * x



music = Bus()
sfx = Bus()


def drums_on(t):
    return (T["B"] - 1e-6 <= t < T["wipe"]) or (T["D"] - 1e-6 <= t < T["E"])


# Dm - Bb - F - C ، كل مقياس 3.2 ث
def chord_i(t):
    return CHORDS[int(max(0, t) // (BEAT * 4)) % 4]

# الطبول: الجزء الأول خفيف، البندول نص-إيقاع، الضوء بدون طبول، المونتاج كامل
for k in range(int(DUR / 0.2) + 1):
    t0 = k * 0.2
    notes, root = chord_i(t0)
    if T["words"][0] <= t0 < T["B"] - 0.1:
        if k % 2 == 0:
            music.add(t0, hat(), 0.08, pan=-0.2)
    elif T["B"] <= t0 < T["wipe"]:
        step = k % 4                          # 4 خطوات في الضربة
        if step == 0:
            music.add(t0, kick(), 0.75)
            music.add(t0, sub808(hz(root + 12), 0.7, glide_from=hz(root + 24)), 0.32)
        if step == 2:
            music.add(t0, clap(), 0.38, pan=0.05)
        music.add(t0, hat(), 0.12 if step % 2 == 0 else 0.07, pan=-0.25 if step % 2 else 0.25)
    elif T["D"] <= t0 < T["E"] - 0.1:
        step = k % 4
        if step in (0, 2):
            music.add(t0, kick(), 0.75)
            music.add(t0, sub808(hz(root + 12), 0.35), 0.3)
        if step == 2:
            music.add(t0, clap(), 0.42, pan=0.05)
        music.add(t0, hat(), 0.13, pan=-0.25 if step % 2 else 0.25)
        music.add(t0 + 0.1, hat(), 0.06, pan=0.2)
    elif T["E"] <= t0 < T["F"] and k % 4 == 0:
        music.add(t0, kick(140, 44, 0.5, 0.18), 0.6)

# باد
for i in range(int(DUR / 3.2) + 1):
    t0 = i * 3.2
    notes, root = CHORDS[i % 4]
    if t0 >= DUR:
        break
    cut = 900 if T["C"] <= t0 < T["D"] else (1600 if t0 < T["B"] else 2400)
    d = min(3.2 + 0.35, DUR - t0)
    pl, pr = pad([hz(n) for n in notes] + [hz(notes[0] - 12)], d, cutoff=cut)
    music.add(t0, pl, 0.42 if t0 < T["B"] else (0.36 if T["C"] <= t0 < T["D"] else 0.5), other=pr)

# أربيجيو خفيف في البندول والمونتاج
for k in range(int(DUR / 0.4)):
    t0 = k * 0.4
    if not (T["B"] <= t0 < T["wipe"] or T["D"] <= t0 < T["E"] or T["F"] + 0.6 <= t0 < DUR - 0.8):
        continue
    m = ARP[int(t0 // 3.2) % 4][k % 4]
    music.add(t0, pluck(hz(m), 0.32, 0.1, 3500), 0.13, pan=0.35 if k % 2 else -0.35)

# ---------- المؤثرات ----------
# 1) المعيّن ينطّ مع كل كلمة
a, b2 = whoosh(0.4, 400, 4000, peak=0.9, width=0.5)
sfx.add(0.0, a, 0.2, other=b2)
NOTES = [74, 77, 79, 81, 84, 86, 89]
for i, at in enumerate(T["bounces"]):
    sfx.add(at, pluck(hz(NOTES[i]), 0.5, 0.12, 6000), 0.2, pan=(-0.3 if i % 2 else 0.3))
    sfx.add(at, bell(hz(NOTES[i] + 12), 0.6), 0.06)
for at in T["words"]:
    sfx.add(at, hit(0.85), 0.45)
    sfx.add(at, sub808(hz(38 + 12), 0.45), 0.3)
for at in (1.6, 2.4, T["B"]):                     # قطع الخلفية
    sfx.add(at - 0.01, pop(0.6), 0.18)

# 2) البندول: ووش في كل مرجحة + ضربة مع كل جملة
for i, at in enumerate(T["swings"]):
    a, b2 = whoosh(0.8, 300, 5000, peak=0.5, width=0.5)
    sfx.add(at, a, 0.22, pan=(0.4 if i % 2 else -0.4), other=b2)
    sfx.add(at, hit(0.75), 0.42)
    sfx.add(at, bell(hz([81, 84, 86, 88, 89, 93][i]), 0.9), 0.08)
a, b2 = whoosh(0.4, 200, 6000, peak=0.85, width=0.6)
sfx.add(T["wipe"] - 0.05, a, 0.4, other=b2)
a, b2 = impact(1.6, 42, 0.2)
sfx.add(T["C"], a, 0.6, other=b2)

# 3) الضوء
t_ = tt(4.0)
drone = (np.sin(2 * np.pi * 73.42 * t_) + 0.5 * np.sin(2 * np.pi * 110 * t_)) * np.clip(t_ / 0.8, 0, 1) * np.clip((4.0 - t_) / 0.3, 0, 1)
sfx.add(T["C"], filt(drone, "low", 600), 0.11)
sfx.add(T["glow"], neon_on(1.2), 0.32)
sfx.add(T["glow"], switch(1.0), 0.4)
sfx.add(T["glow"] + 0.05, chime(hz(86), 1.4), 0.12)
for at, d in ((T["sweep"], 0.8), (T["open"], 0.8)):
    a, b2 = whoosh(d, 250, 3500, peak=0.5, width=0.6)
    sfx.add(at, a, 0.2, other=b2)
for at in (9.6, 10.4, 11.2):
    sfx.add(at, kick(90, 40, 0.5, 0.16), 0.32)
sfx.add(T["full"], chime(hz(81), 1.8), 0.12)
sfx.add(T["full"], chime(hz(86), 1.8), 0.09)
sfx.add(T["full"], chime(hz(89), 1.8), 0.07)
# صعود نظيف قبل المونتاج
t_ = tt(0.8)
f = 220 * 2 ** (2.2 * t_ / 0.8)
sweep = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t_ / 0.8) ** 2
sfx.add(T["rise"], filt(sweep, "low", 5000), 0.12)
a, b2 = whoosh(0.8, 200, 7000, peak=0.95, width=0.6)
sfx.add(T["rise"], a, 0.3, other=b2)
for j in range(8):
    sfx.add(11.6 + j * 0.05, clap(0.1), 0.05 + 0.03 * j)

# 4) المونتاج: ضربة وطقة مع كل قطع
a, b2 = impact(1.4, 44, 0.25)
sfx.add(T["D"], a, 0.8, other=b2)
for i in range(9):
    at = T["D"] + i * T["cut"]
    sfx.add(at, hit(0.6), 0.3)
    sfx.add(at, blip(800 + 120 * (i % 4), 1500 + 150 * (i % 4), 0.1), 0.1)
    if i in (1, 3, 5, 8):                          # صور المنتجات
        sfx.add(at + 0.02, ceramic(0.6), 0.12)

# 5) الفسيفساء
a, b2 = impact(1.8, 42, 0.3)
sfx.add(T["E"], a, 0.85, other=b2)
for j in range(14):
    sfx.add(T["E"] + 0.3 + j * 0.05, chime(hz([88, 91, 93, 96, 98, 100, 103][j % 7]), 0.7), 0.05, pan=(j % 3 - 1) * 0.6)
a, b2 = shing(0.6)
sfx.add(T["E"] + 1.15, a, 0.2, other=b2)

# 6) النهاية: المعيّن يطيح وينط ويستقر
a, b2 = whoosh(0.45, 300, 4000, peak=0.95, width=0.5)
sfx.add(T["F"], a, 0.25, other=b2)
for i, at in enumerate(T["land"]):
    sfx.add(at, pluck(hz([86, 81, 77][i]), 0.6, 0.15, 6000), [0.28, 0.2, 0.14][i])
    sfx.add(at, ceramic([0.8, 0.5, 0.3][i]), 0.2)
pl, pr = pad([hz(n) for n in CHORDS[0][0]] + [hz(50)], DUR - T["land"][0], cutoff=2600, att=0.05, rel=1.0)
music.add(T["land"][0], pl, 0.5, other=pr)
music.add(T["land"][0], kick(150, 42, 0.8, 0.3), 0.7)
music.add(T["land"][0], sub808(hz(50), 1.2), 0.35)


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
