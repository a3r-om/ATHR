"""موسيقى ومؤثرات أصلية لإعلان أثر العام «كل كوب يترك أثر» (35 ثانية، 90 نبضة/دقيقة) على نفس توقيت ad.html.

python3 marketing/ads/2026-10-13-brand/music.py <out.wav>
"""
import sys
import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as ss

SR = 44100
DUR = 35.0
N = int(SR * DUR)
rng = np.random.default_rng(33)
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




def ceramic(amp=1.0):
    """نقرة كوب سيراميك"""
    t = tt(0.6)
    parts = [(2140, 0.18), (3420, 0.1), (5260, 0.06), (1210, 0.22)]
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in [(f, dd) for f, dd in parts] for a in [1.0])
    tap = filt(noise(0.6), "band", [2000, 8000]) * np.exp(-t / 0.003) * 0.6
    return amp * (x / 3 + tap)


# ---------- التوزيع (90 نبضة/دقيقة) ----------
BEAT = 60 / 90
BAR = BEAT * 4
TL = dict(a1=0.5, b=4.0, lift=4.6, b1=5.33, b2=6.33, dots=7.33, iris=8.0,
          d=[8.67, 11.33, 14.0, 16.67, 19.33], d3swap=15.33, e=22.0, facts=[23.33, 24.0, 24.67, 25.33],
          f=26.67, words=[26.67, 27.33, 28.0, 28.67], g=29.33, h=32.0)
AM = [220.0, 261.63, 329.63]
FM = [174.61, 220.0, 261.63]
CM = [261.63, 329.63, 392.0]
GM = [196.0, 246.94, 293.66]
PROG = [(AM, 110.0), (FM, 87.31), (CM, 130.81), (GM, 98.0)]
MOTIF = [659.25, 587.33, 523.25, 440.0, 523.25]       # لحن قصير يتكرر مع اللحظات


def chord_at(t):
    return PROG[int(max(0, t) // BAR) % 4]


# باد دافئ من البداية حتى الشعار، ثم وتر أخير طويل
for bar_t in np.arange(0.0, TL["g"], BAR):
    ch, root = chord_at(bar_t + 0.01)
    gain = 0.1 if bar_t < TL["b"] else 0.15
    add(bar_t, pad(ch if bar_t >= TL["b"] else [f / 2 for f in ch], min(BAR + 0.15, TL["g"] - bar_t + 0.1)), gain)
add(TL["g"], pad(AM, 5.6), 0.16)
add(TL["g"], pad([f / 2 for f in AM], 5.6), 0.12)

# نبض خفيف في المقدمة (مثل دقات القلب)
for t0 in (0.0, 1.33, 2.67):
    add(t0, kick(90, 40, 0.5, 0.16), 0.32)
for i in range(16):                                  # «كل يوم يبدأ بكوب»
    add(TL["a1"] + i / 10 + rng.uniform(-0.004, 0.004), key(rng.uniform(0.7, 1.0)), 0.16, pan=rng.uniform(-0.3, 0.3))
for i, f in enumerate([440.0, 523.25, 659.25]):
    add(1.0 + i * BEAT * 2, pluck(f, 1.2, 0.5), 0.14)
ra, rb = riser(1.0)
add(TL["b"] - 1.0, ra, 0.2, other=rb)

# الكوب
ba, bb = boom(1.0, 52, 0.1)
add(TL["b"], ba, 0.5, other=bb)
add(TL["b"] + 0.05, ceramic(0.9), 0.5)
wa, wb = whoosh(0.9, 300, 3500, peak=0.6)              # الكوب يرتفع
add(TL["lift"], wa, 0.22, other=wb)
for i in range(12):
    add(TL["b1"] + i / 13, key(rng.uniform(0.7, 1.0)), 0.12, pan=rng.uniform(-0.3, 0.3))
for i in range(9):
    add(TL["b2"] + i / 11, key(rng.uniform(0.7, 1.0)), 0.12, pan=rng.uniform(-0.3, 0.3))
add(TL["b2"] + 0.5, kick(120, 42, 0.5, 0.15), 0.5)    # «أثر»
for i, f in enumerate([523.25, 659.25, 783.99]):      # النقاط الثلاث
    add(TL["dots"] + i * 0.11, pluck(f * 2, 0.5, 0.15), 0.2)
ra, rb = riser(0.67)
add(TL["iris"], ra, 0.3, other=rb)
ba, bb = boom(1.0, 50, 0.12)
add(TL["d"][0], ba, 0.7, other=bb)

# الإيقاع من أول لحظة حتى الشعار
DRUMS = [(TL["d"][0], TL["g"])]
k = 0
while True:
    t = TL["d"][0] + k * BEAT
    k += 1
    if t >= TL["g"] - 1e-6:
        break
    beat_in_bar = (k - 1) % 4
    build = t >= TL["f"]
    if beat_in_bar in (0, 2) or build:
        add(t, kick(135, 45, 0.45, 0.13), 0.55 if not build else 0.62)
    if beat_in_bar in (1, 3):
        add(t, clap(0.3), 0.3, pan=0.05)
    add(t + BEAT / 2, hat(), 0.18, pan=-0.2)
    if t >= TL["e"]:
        add(t + BEAT / 4, hat(), 0.08, pan=0.2)
        add(t + 3 * BEAT / 4, hat(), 0.08, pan=0.2)
    ch, root = chord_at(t)
    add(t, bass(root, 0.32), 0.38)
    add(t + BEAT / 2, bass(root, 0.22), 0.26)

for i, T in enumerate(TL["d"]):                      # اللحظات
    if i > 0:
        wa, wb = whoosh(0.7, 400, 5000, peak=0.5)
        add(T - 0.2, wa, 0.22, other=wb)
    add(T, pluck(MOTIF[i] * 1.0, 1.0, 0.4), 0.26)
    add(T + BEAT, pluck(MOTIF[(i + 1) % 5], 0.8, 0.35), 0.16)
    for j in range(6):
        add(T + 0.35 + j / 14, key(0.8), 0.05, pan=rng.uniform(-0.3, 0.3))
    add(T + 1.1, bloop(650, 1350, 0.2), 0.08)
add(TL["d3swap"], bloop(700, 1500, 0.2), 0.14)        # الكرة ← قبعة التخرج
add(TL["d3swap"], pluck(783.99, 0.6, 0.25), 0.16)

ba, bb = boom(0.9, 52, 0.1)                           # الحقائق
add(TL["e"], ba, 0.55, other=bb)
for i, T in enumerate(TL["facts"]):
    add(T, bloop(760 + i * 140, 1500 + i * 200, 0.2), 0.14 if i < 3 else 0.2)
    add(T, pluck([523.25, 587.33, 659.25, 880.0][i], 0.5, 0.2), 0.14 if i < 3 else 0.22)

ra, rb = riser(TL["g"] - TL["f"])                    # البناء
add(TL["f"], ra, 0.3, other=rb)
for i, T in enumerate(TL["words"]):
    ch = [AM, FM, CM, GM][i]
    add(T, stab([f * 2 for f in ch], 0.5), 0.3)
n_roll = int((TL["g"] - 0.67 - TL["words"][2]) / (BEAT / 4))
for j in range(n_roll):
    add(TL["words"][2] + j * BEAT / 4, clap(0.12), 0.08 + 0.2 * j / max(1, n_roll))

ba, bb = boom(3.2, 44, 0.25)                          # الشعار
add(TL["g"], ba, 1.0, other=bb)
add(TL["g"], kick(170, 44), 0.6)
for i, f in enumerate([659.25, 783.99, 880.0]):       # النقاط الذهبية
    add(TL["g"] + 0.95 + i * 0.22, pluck(f * 2, 0.6, 0.2), 0.22)
for i in range(16):
    add(TL["g"] + 1.75 + i / 14, key(rng.uniform(0.7, 1.0)), 0.1, pan=rng.uniform(-0.3, 0.3))
add(TL["h"], kick(150, 45, 0.5, 0.15), 0.45)          # «اطلب الحين»
add(TL["h"], pluck(440.0, 2.6, 0.9), 0.2)
add(TL["h"], pluck(659.25, 2.6, 0.9), 0.14)
add(TL["h"] + 0.05, ceramic(0.8), 0.3)

mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / np.abs(mix).max() * 0.89
fade = int(0.4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
wf.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
print(sys.argv[1], DUR, "s")
