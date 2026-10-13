"""مؤثرات صوتية أصلية لإعلان «أثر» بنفس توقيت المشاهد في ad.html (بدون موسيقى، ضربات قصيرة وصمت بينها).

python3 marketing/ads/2026-10-13-typing/sfx.py <out.wav>
"""
import sys
import numpy as np
import scipy.io.wavfile as wf
import scipy.signal as ss

SR = 44100
DUR = 16.0
N = int(SR * DUR)
rng = np.random.default_rng(13)
L = np.zeros(N)
R = np.zeros(N)


def add(t0, sig, pan=0.0, width=None):
    """يضيف صوتاً عند t0. pan من -1 (يسار) إلى 1 (يمين). width: نسخة مختلفة للقناة الثانية (عرض ستيريو)"""
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    gl, gr = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    L[i:i + len(sig)] += sig * gl * np.sqrt(2)
    other = sig if width is None else width[: len(sig)]
    R[i:i + len(sig)] += other * gr * np.sqrt(2)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def hp(x, f):
    b, a = ss.butter(2, f / (SR / 2), "high")
    return ss.lfilter(b, a, x)


def lp(x, f):
    b, a = ss.butter(2, f / (SR / 2), "low")
    return ss.lfilter(b, a, x)


def bp(x, lo, hi):
    b, a = ss.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
    return ss.lfilter(b, a, x)


def tick(f=3200, amp=0.32):
    t = tt(0.04)
    return amp * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.007)


def click(amp=0.22):
    t = tt(0.02)
    return amp * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.0025)


def kick(f0=160, f1=46, dur=0.42, amp=0.95, tau=0.12):
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / tau)
    trans = hp(rng.standard_normal(len(t)), 1500) * np.exp(-t / 0.004) * 0.35
    return amp * (body + trans)


def whoosh(dur, f_lo=350, f_hi=4200, amp=0.5, peak=0.8):
    """ضوضاء يتحرك ترشيحها للأعلى، تعلو ثم تنقطع"""
    n = int(dur * SR)
    out = []
    for _ in range(2):
        noise = rng.standard_normal(n)
        f, tm, Z = ss.stft(noise, SR, nperseg=1024)
        prog = np.clip(tm / dur, 0, 1)
        centers = f_lo * (f_hi / f_lo) ** prog
        mask = np.exp(-0.5 * (np.log((f[:, None] + 1) / centers[None, :]) / 0.55) ** 2)
        _, x = ss.istft(Z * mask, SR, nperseg=1024)
        x = x[:n]
        t = np.arange(len(x)) / SR / dur
        env = np.where(t < peak, (t / peak) ** 2.2, np.clip(1 - (t - peak) / (1 - peak), 0, 1) ** 1.5)
        x = x / (np.abs(x).max() + 1e-9) * env * amp
        out.append(x)
    return out


def sub_boom(dur=1.6, f=50, amp=0.95, tail=0.35):
    t = tt(dur)
    fr = f + 26 * np.exp(-t / 0.06)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    body = np.sin(ph) * np.exp(-t / 0.55)
    burst = lp(rng.standard_normal(len(t)), 7000) * np.exp(-t / 0.035) * 0.6
    room = lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.32) * tail * np.clip(t / 0.02, 0, 1)
    room2 = lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.32) * tail * np.clip(t / 0.02, 0, 1)
    a = amp * (body + burst + room)
    b = amp * (body + burst + room2)
    return a, b


def bloop(f0=480, f1=1150, dur=0.3, amp=0.42):
    t = tt(dur)
    f = f0 * (f1 / f0) ** np.clip(t / 0.22, 0, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.11)
    return amp * env * (np.sin(ph) + 0.25 * np.sin(2 * ph))


def pluck(f, amp=0.5):
    t = tt(0.62)
    env = np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.26)
    tone = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.14)
    thump = np.sin(2 * np.pi * 105 * t) * np.exp(-t / 0.05) * 0.7
    tick_ = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.003) * 0.25
    return amp * (env * tone + thump + tick_)


def key(amp):
    t = tt(0.03)
    noise = bp(rng.standard_normal(len(t)), 1800, 6000) * np.exp(-t / 0.004)
    thock = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.008) * 0.6
    return amp * (noise + thock)


# ---------- ورقة التوقيت (مطابقة لمشاهد ad.html) ----------
add(0.00, tick())                                  # المؤشر في الظلام
add(0.18, click(0.12))
add(0.50, kick(amp=0.62, tau=0.09))               # قطع إلى الكريمي + «هلا»
add(0.50, click(0.25))
swa, swb = whoosh(0.16, f_lo=1500, f_hi=7000, amp=0.22, peak=0.25)
add(0.50, swa, width=swb)
for i, tk in enumerate([0.50, 0.59, 0.68]):
    add(tk + 0.004, key(0.07))
add(1.58, kick(f0=140, f1=42, amp=0.95, tau=0.14))  # الكوب يدخل بقوة
wa, wb = whoosh(0.62, amp=0.55, peak=0.82)           # زووم + تمويه
add(2.40, wa, width=wb)
add(2.65, kick(f0=120, f1=40, amp=0.7, tau=0.16))
add(4.42, tick(3400, 0.22))                          # الاسم يتفرق
add(4.79, bloop())                                   # «نطبع لك» تتجمع
ia, ib = sub_boom(1.75, f=48, amp=0.85, tail=0.18)   # الضربة الكبيرة: فم الكوب
add(6.19, ia, width=ib)
add(6.19, kick(f0=170, f1=45, amp=0.6, tau=0.1))
sa, sb = whoosh(0.34, f_lo=700, f_hi=6500, amp=0.5, peak=0.55)  # القزحية تلتفت
add(7.26, sa, pan=0.25, width=sb)
ra, rb = whoosh(0.3, f_lo=2500, f_hi=9000, amp=0.38, peak=0.5)   # انتقال للكريمي
add(8.54, ra, width=rb)
NOTES = [523.25, 587.33, 659.25, 783.99, 880.0]     # سلّم خماسي صاعد
for tm, f in zip([9.07, 9.57, 10.07, 10.60, 11.15], NOTES):
    add(tm, pluck(f, 0.4))
for i in range(16):                                  # «وش تنتظر؟» على الكيبورد
    add(12.32 + i * 0.03 + rng.uniform(-0.006, 0.006), key(rng.uniform(0.05, 0.1)), pan=rng.uniform(-0.3, 0.3))
add(13.33, kick(f0=150, f1=44, amp=0.85, tau=0.12))  # «اطلب الحين»
add(13.80, click(0.1))
add(14.10, click(0.1))
ea, eb = sub_boom(1.59, f=46, amp=0.9, tail=0.22)    # الشعار
add(14.41, ea, width=eb)
add(14.41, tick(2400, 0.12))

mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix = mix / np.abs(mix).max() * 0.89
fade = int(0.02 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
wf.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
print(sys.argv[1], f"{DUR}s", "peak", round(float(np.abs(mix).max()), 3))
