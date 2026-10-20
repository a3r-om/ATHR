// ميزة تصميم الصور بالذكاء الاصطناعي أُلغيت بطلب صاحب المتجر.
// الدالة متوقفة نهائياً: لا تتصل بأي خدمة خارجية ولا تقرأ أي مفتاح.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  return new Response(JSON.stringify({ error: "disabled" }), {
    status: 410,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
