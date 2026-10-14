/* =====================================================
   ATHR STORE — SUPABASE CONNECTION
   Publishable key only. Never place a Secret key here.
   الزوار يتعاملون مع قاعدة البيانات مباشرة (بدون مكتبة)،
   ومكتبة supabase-js تُحمَّل فقط للوحة التحكم.
===================================================== */

const ATHR_SUPABASE_URL = "https://wfzcfedtebaacjdzogpj.supabase.co";
const ATHR_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pfKZbnrLO6V-qI3VlK8RBg_xvR0kplF";

window.ATHR_SUPABASE_URL = ATHR_SUPABASE_URL;
window.ATHR_SUPABASE_PUBLISHABLE_KEY = ATHR_SUPABASE_PUBLISHABLE_KEY;

window.athrLoadSupabase = (function () {
    let loading = null;
    return function () {
        if (window.athrSupabase) return Promise.resolve(window.athrSupabase);
        if (loading) return loading;
        loading = new Promise((resolve, reject) => {
            const done = () => {
                window.athrSupabase = window.supabase.createClient(ATHR_SUPABASE_URL, ATHR_SUPABASE_PUBLISHABLE_KEY);
                resolve(window.athrSupabase);
            };
            if (window.supabase && window.supabase.createClient) {
                done();
                return;
            }
            // مصدرين للمكتبة: لو تعذر الأول نجرب الثاني
            const sources = ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js"];
            const tryLoad = (i) => {
                const s = document.createElement("script");
                s.src = sources[i];
                s.onload = () => (window.supabase && window.supabase.createClient ? done() : s.onerror());
                s.onerror = () => {
                    s.remove();
                    if (i + 1 < sources.length) { tryLoad(i + 1); return; }
                    loading = null;
                    reject(new Error("supabase-js"));
                };
                document.head.appendChild(s);
            };
            tryLoad(0);
        });
        return loading;
    };
})();
