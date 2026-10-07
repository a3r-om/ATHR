/* =====================================================
   ATHR STORE — SUPABASE CONNECTION
   Publishable key only. Never place a Secret key here.
   تُملأ القيمتان من مشروع Supabase الخاص بالمتجر.
===================================================== */

const ATHR_SUPABASE_URL = "https://wfzcfedtebaacjdzogpj.supabase.co";
const ATHR_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pfKZbnrLO6V-qI3VlK8RBg_xvR0kplF";

const athrSupabase = window.supabase.createClient(
    ATHR_SUPABASE_URL,
    ATHR_SUPABASE_PUBLISHABLE_KEY
);
