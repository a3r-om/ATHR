"""موسيقى ومؤثرات أصلية لإعلان منتجات أثر (42.6 ثانية، 100 نبضة/دقيقة) على نفس توقيت ad.html.

python3 marketing/ads/2026-10-13-products/music.py <out.wav>
"""
import sys
import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as ss

SR = 44100
DUR = 42.6
N = int(SR * DUR)
rng = np.random.default_rng(21)
L = np.zeros(N)
R = np.zeros(N)
BEAT = 0.5


def add(t0, sig, gain=1.0, pan=0.0, other=None):
    i = int(round(t0 * SR))
    if i >= N or i < 0:
        return
    sig = sig[: N - i] * gain
    gl, gr = np.sqrt((1 - pan) / 2) * np.sqrt(2), np.sqrt((1 + pan) / 2) * np.sqrt(2)
    L[i:i + len(sig)] += sig * gl
    o = sig if other is None else other[: len(sig)] * gain
    R[i:i + len(o)] += o * gr


def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, f, order=2):
    b, a = ss.butter(order, np.array(f) / (SR / 2), kind)
    return ss.lfilter(b, a, x)


def noise(d):
    return rng.standard_normal(int(d * SR))


# ---------- الأصوات ----------
def kick(f0=150, f1=48, d=0.38, tau=0.11):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
    click = filt(noise(d), "high", 2000) * np.exp(-t / 0.003) * 0.3
    return body + click


def clap(d=0.25):
    t = tt(d)
    env = np.zeros_like(t)
    for k, off in enumerate([0, 0.011, 0.022]):
        env += np.where(t >= off, np.exp(-(t - off) / (0.006 if k < 2 else 0.07)), 0)
    return filt(noise(d), "band", [900, 3500]) * env * 0.8


def hat(d=0.06, open_=False):
    t = tt(0.25 if open_ else d)
    return filt(noise(len(t) / SR), "high", 7000) * np.exp(-t / (0.08 if open_ else 0.012)) * 0.5


def bass(f, d=0.22):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * f * n * t) / n for n in range(1, 9))
    x = filt(x, "low", 900)
    env = np.clip(t / 0.005, 0, 1) * np.exp(-t / 0.12)
    sub = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.18)
    return (x * 0.55 + sub * 0.7) * env


def pad(freqs, d):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) + 0.3 * np.sin(2 * np.pi * 2.003 * f * t) for f in freqs)
    env = np.clip(t / 0.35, 0, 1) * np.clip((d - t) / 0.3, 0, 1)
    return filt(x, "low", 2200) * env / len(freqs)


def pluck(f, d=0.6, tau=0.25):
    t = tt(d)
    env = np.clip(t / 0.003, 0, 1) * np.exp(-t / tau)
    return env * (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.12))


def stab(freqs, d=0.3):
    return sum(pluck(f, d, 0.09) for f in freqs) / len(freqs)


def key(amp=1.0):
    t = tt(0.03)
    return amp * (filt(noise(0.03), "band", [1800, 6000]) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.008) * 0.6)


def whoosh(d, f_lo=400, f_hi=5000, peak=0.75):
    n = int(d * SR)
    outs = []
    for _ in range(2):
        f, tm, Z = ss.stft(rng.standard_normal(n), SR, nperseg=1024)
        prog = np.clip(tm / d, 0, 1)
        c = f_lo * (f_hi / f_lo) ** prog
        mask = np.exp(-0.5 * (np.log((f[:, None] + 1) / c[None, :]) / 0.55) ** 2)
        _, x = ss.istft(Z * mask, SR, nperseg=1024)
        x = x[:n]
        u = np.arange(len(x)) / SR / d
        env = np.where(u < peak, (u / peak) ** 2.2, np.clip(1 - (u - peak) / (1 - peak), 0, 1) ** 1.5)
        outs.append(x / (np.abs(x).max() + 1e-9) * env)
    return outs


def riser(d):
    a, b = whoosh(d, 300, 7000, peak=0.97)
    return a, b


def boom(d=1.6, f=48, tail=0.2):
    t = tt(d)
    fr = f + 26 * np.exp(-t / 0.06)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.55)
    burst = filt(noise(d), "low", 7000) * np.exp(-t / 0.035) * 0.6
    room = [filt(noise(d), "low", 900) * np.exp(-t / 0.35) * tail for _ in range(2)]
    return body + burst + room[0], body + burst + room[1]


def bloop(f0=600, f1=1300, d=0.18):
    t = tt(d)
    f = f0 * (f1 / f0) ** np.clip(t / 0.12, 0, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.06) * (np.sin(ph) + 0.2 * np.sin(2 * ph))


def zip_(d=0.16):
    t = tt(d)
    return filt(noise(d), "band", [2500, 9000]) * np.sin(np.pi * np.clip(t / d, 0, 1)) * 0.6


# ---------- التوزيع الموسيقي (100 نبضة/دقيقة: النبضة 0.6 ث) ----------
BEAT = 0.6
TL = dict(q1=0.4, s2=2.4, w2=3.0, thumbs=[3.6, 4.2, 4.8, 5.4], run=6.0, scene=2.4, n=7,
          q2=22.8, cards=[24.0, 26.4, 28.8], upto=31.2, offer=32.4, cups=[32.4, 33.0, 33.6, 34.2],
          eq=34.8, trust=36.0, cta=37.8, taps=[38.6, 39.0], end=39.6)
RUN_END = TL["run"] + TL["scene"] * TL["n"]
AM = [220.0, 261.63, 329.63]
FM = [174.61, 220.0, 261.63]
CM = [261.63, 329.63, 392.0]
GM = [196.0, 246.94, 293.66]
PROG = [(AM, 110.0), (FM, 87.31), (CM, 130.81), (GM, 98.0)]
BAR = BEAT * 4


def chord_at(t):
    b = int(max(0, t - TL["s2"]) // BAR)
    return PROG[b % 4]


DRUMS = [(TL["run"], RUN_END), (TL["cards"][0], TL["upto"]), (TL["eq"], TL["end"])]
in_drums = lambda t: any(a - 1e-6 <= t < b - 1e-6 for a, b in DRUMS)

# باد هادئ طول الفيديو (المقدمة أخف)
add(0.0, pad([f / 2 for f in AM], TL["s2"] + 0.1), 0.1)
for bar_t in np.arange(TL["s2"], TL["end"], BAR):
    ch, _ = chord_at(bar_t + 0.01)
    add(bar_t, pad(ch, min(BAR + 0.1, TL["end"] - bar_t)), 0.16)

# الطبول والباص (أهدأ: الهاي هات على نصف النبضة فقط، والكيك على كل نبضة)
k = 0
while True:
    t = TL["run"] + k * BEAT
    k += 1
    if t >= TL["end"]:
        break
    if not in_drums(t):
        continue
    beat_in_bar = int(round((t - TL["run"]) / BEAT)) % 4
    add(t, kick(140, 46, 0.42, 0.13), 0.6)
    if beat_in_bar in (1, 3):
        add(t, clap(0.3), 0.36, pan=0.05)
    add(t + BEAT / 2, hat(), 0.22, pan=-0.2)
    if beat_in_bar == 3:
        add(t + BEAT / 2, hat(open_=True), 0.14, pan=0.2)
    _, root = chord_at(t)
    add(t + BEAT / 2, bass(root, 0.28), 0.45)
    if beat_in_bar == 0:
        add(t, bass(root, 0.26), 0.32)
    if beat_in_bar == 2:
        ch, _ = chord_at(t)
        add(t + BEAT / 2, stab([f * 2 for f in ch], 0.4), 0.1, pan=0.25)

# ---------- المؤثرات على المشاهد ----------
add(0.0, pluck(2400, 0.05, 0.008), 0.25)
for i in range(9):                                   # «عندك ذوق؟»
    add(TL["q1"] + i / 9 + rng.uniform(-0.004, 0.004), key(rng.uniform(0.7, 1.0)), 0.2, pan=rng.uniform(-0.3, 0.3))
ra, rb = riser(0.8)
add(TL["s2"] - 0.8, ra, 0.24, other=rb)
ba, bb = boom(1.2, 50, 0.15)                          # «عندنا»
add(TL["s2"], ba, 0.75, other=bb)
add(TL["s2"], kick(160, 45), 0.55)
add(TL["w2"], kick(140, 46), 0.6)                     # «كوبه.»
for i, f in enumerate([440.0, 523.25, 587.33, 659.25]):   # 4 صور
    add(TL["thumbs"][i], pluck(f * 2, 0.5, 0.18), 0.22)
    add(TL["thumbs"][i], bloop(500 + i * 120, 1100 + i * 150, 0.2), 0.1)
ra, rb = riser(0.7)
add(TL["run"] - 0.7, ra, 0.28, other=rb)
ba, bb = boom(1.1, 52, 0.12)                          # بداية الجولة
add(TL["run"], ba, 0.65, other=bb)

for i in range(TL["n"]):                             # جولة المنتجات
    T = TL["run"] + i * TL["scene"]
    if i > 0:
        wa, wb = whoosh(0.6, 450, 6000, peak=0.5)
        add(T - 0.15, wa, 0.26, other=wb)
    if i < TL["n"] - 1:
        for j in range(5):
            add(T + 0.35 + j * 0.12, key(0.8), 0.05, pan=rng.uniform(-0.3, 0.3))
        if i != 2:
            add(T + 0.9, bloop(650, 1350, 0.2), 0.09)
LAST = TL["run"] + (TL["n"] - 1) * TL["scene"]
for j, d in enumerate([0, 0.8, 1.6]):                # أندية / جامعات / شخصيات
    add(LAST + d, stab([f * 2 for f in [CM, GM, AM][j]], 0.5), 0.26)
ra, rb = riser(0.8)
add(TL["q2"] - 0.8, ra, 0.26, other=rb)
ba, bb = boom(1.1, 50, 0.12)                          # «والأسعار؟»
add(TL["q2"], ba, 0.7, other=bb)
for i in range(9):
    add(TL["q2"] + 0.1 + i / 12, key(rng.uniform(0.7, 1.0)), 0.12, pan=rng.uniform(-0.3, 0.3))

for T in TL["cards"]:                                # بطاقات الأسعار
    wa, wb = whoosh(0.6, 450, 5000, peak=0.45)
    add(T - 0.1, wa, 0.28, other=wb)
    add(T + 0.9, zip_(0.32), 0.22)
    add(T + 1.3, bloop(850, 1700, 0.2), 0.15)
    add(T + 1.3, pluck(1318.5, 0.4, 0.1), 0.09)
ra, rb = riser(0.8)
add(TL["upto"] - 0.8, ra, 0.26, other=rb)
ba, bb = boom(1.1, 52, 0.12)                          # «خصومات حتى 40%»
add(TL["upto"], ba, 0.75, other=bb)
add(TL["upto"], stab([f * 2 for f in AM], 0.5), 0.26)

ba, bb = boom(1.0, 48, 0.12)                          # 4 أكواب
add(TL["offer"], ba, 0.6, other=bb)
for i, f in enumerate([523.25, 587.33, 659.25, 783.99]):
    add(TL["cups"][i], pluck(f, 0.7, 0.3), 0.38)
    add(TL["cups"][i], kick(130, 46), 0.38)
ra, rb = riser(0.6)
add(TL["eq"] - 0.6, ra, 0.22, other=rb)
ba, bb = boom(1.2, 46, 0.15)                          # «= التوصيل مجاني»
add(TL["eq"], ba, 0.85, other=bb)
add(TL["eq"], pluck(880.0, 1.0, 0.35), 0.32)
for i in range(3):                                   # الثقة
    add(TL["trust"] + 0.15 + i * 0.45, bloop(800 + i * 150, 1600 + i * 200, 0.18), 0.14)
ra, rb = riser(0.7)
add(TL["cta"] - 0.7, ra, 0.26, other=rb)
add(TL["cta"], kick(160, 45), 0.65)                   # «اطلب الحين»
add(TL["cta"], stab([f * 2 for f in CM], 0.5), 0.28)
for T in TL["taps"]:
    add(T + 0.08, key(1.0), 0.18)
ra, rb = riser(0.5)
add(TL["end"] - 0.5, ra, 0.26, other=rb)
ba, bb = boom(2.6, 45, 0.22)                          # الشعار
add(TL["end"], ba, 0.95, other=bb)
add(TL["end"], pluck(440.0, 2.6, 0.9), 0.17)
add(TL["end"], pluck(659.25, 2.6, 0.9), 0.11)

mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / np.abs(mix).max() * 0.89
fade = int(0.4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
wf.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
print(sys.argv[1], DUR, "s")
