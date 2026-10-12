// أدوات حركة للريلز: كل شكل يُحسب من الوقت t (بالثواني) حتى يطلع كل إطار ثابتاً ونظيفاً
(function () {
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const A = {
        clamp,
        // تقدم من 0 إلى 1 بين اللحظتين a و b
        p: (t, a, b) => clamp((t - a) / (b - a)),
        out: (x) => 1 - Math.pow(1 - x, 3),
        inout: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
        // ارتداد خفيف عند الظهور
        back: (x) => { const c = 1.5; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
        // ظهور عند a واختفاء عند b
        win: (t, a, b, fade = 0.25) => Math.min(clamp((t - a) / fade), 1 - clamp((t - (b - fade)) / fade)),
        $: (s) => document.querySelector(s),
        $$: (s) => [...document.querySelectorAll(s)],
        set(el, { o = 1, x = 0, y = 0, s = 1, r = 0 } = {}) {
            if (typeof el === "string") el = document.querySelector(el);
            if (!el) return;
            el.style.opacity = String(o);
            el.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
        },
        // ظهور بارتداد: مكان ثابت + حجم يكبر من 0.85
        pop(el, t, at, dur = 0.45, extra = {}) {
            const k = A.p(t, at, at + dur);
            A.set(el, { o: clamp(k * 2), s: 0.85 + 0.15 * A.back(k), ...extra });
            return k;
        },
        // دخول من الأسفل
        rise(el, t, at, dur = 0.5, dist = 60, extra = {}) {
            const k = A.out(A.p(t, at, at + dur));
            A.set(el, { o: k, y: (1 - k) * dist, ...extra });
            return k;
        }
    };
    window.A = A;
})();
