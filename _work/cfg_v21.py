# إعدادات تصميم Kasaty: تُطبَّق على seed.json (للبناء) وتطلع SQL لقاعدة البيانات
import json, sys
TEXTS = {
    "hero_title": "قصص أطفال مخصصة باسم وصورة طفلك",
    "hero_text": "قصص عربية مصوّرة يكون طفلك بطلها: اسمه وصورته في القصة، وتشوفها كاملة قبل ما تطلب. ملف PDF على واتساب، أو كتاب مطبوع بغلاف مقوّى.",
    "hero_button": "تصفّح جميع القصص",
    "announce_show": True,
    "announce_text": "🎁 تغليف هدية وإهداء مجاني  ·  👀 شوف القصة باسم طفلك قبل الطلب",
}
STORIES = {"photo_upload": True, "ded_enabled": True, "wrap_enabled": True, "pro_time": "خلال 48 ساعة"}
FAQ = [
    {"q": "ما الفرق بين القصة الجاهزة والقصة المؤلفة خصيصاً؟", "a": "الجاهزة: قصة مرسومة نكتب فيها اسم طفلك وعمره وهواياته ورسالة تختارها، وصورته على الغلاف إذا رفعتها، وتصلك خلال ساعات. المؤلفة خصيصاً: نرسم طفلك بوجهه من صورته في كل صفحة، ونكتب القصة حول أسرته وأصدقائه والعادة اللي تبيها، وتصلك خلال 48 ساعة."},
    {"q": "كيف تصلني القصة؟", "a": "بعد تأكيد الدفع نرسل لك القصة PDF على واتساب. وإذا اخترت النسخة المطبوعة، نطبعها بغلاف مقوّى ونوصلها لبيتك داخل عُمان خلال 3 إلى 5 أيام."},
    {"q": "هل التغليف والإهداء مجاني؟", "a": "نعم. تكتب إهداءك لطفلك أو تختار إهداءً جاهزاً، ونطبعه في أول صفحة من القصة. والكتاب المطبوع نغلّفه كهدية بدون أي تكلفة إضافية."},
    {"q": "هل صورة طفلي آمنة؟", "a": "ترفع الصورة في مخزن خاص لا يراه أحد غيرنا، ونستخدمها لقصة طفلك فقط، ونحذفها بعد تسليم القصة."},
    {"q": "وش لو ما عجبتني القصة؟", "a": "نعدّلها لك مجاناً، وإذا ما زالت ما عجبتك نرجّع لك المبلغ كاملاً."},
    {"q": "هل تساعد القصة في تعديل سلوك طفلي؟", "a": "نعم، تختار قيمة مثل الصدق والشجاعة، أو عادة يومية مثل تنظيف الأسنان والنوم بدري وترتيب الألعاب، ونكتبها في القصة وفي شهادة البطل. وفي القصة المؤلفة خصيصاً تدور القصة كلها حولها."},
    {"q": "كم صفحة في القصة؟", "a": "غلاف باسم طفلك وصورته، وصفحة الإهداء إذا اخترتها، و10 صفحات للقصة، وصفحة النهاية، ومعها هدايا: صفحة تلوين، وشهادة بطل القصة، وورقة ملصقات باسمه للمدرسة."},
    {"q": "لأي عمر تناسب؟", "a": "من 3 إلى 8 سنوات. الجمل قصيرة وسهلة يقرأها الطفل بنفسه أو تقرؤونها له."},
    {"q": "كيف أدفع؟", "a": "تحويل بنكي، ونرسل لك بيانات الحساب على واتساب مع تأكيد طلبك."}
]
OLD_LINE = "• قيمة أو عادة يومية تختارها، نكتبها في نهاية القصة"
NEW_LINE = "• قيمة أو عادة يومية تختارها، نكتبها في نهاية القصة\n• صورة طفلك على الغلاف، وإهداء منك في أول صفحة (مجاناً)"

def apply(seed):
    cfg = seed["config"]
    cfg.setdefault("texts", {}).update(TEXTS)
    cfg["stories"] = {**cfg.get("stories", {}), **STORIES}
    cfg.setdefault("contact", {})["faq"] = FAQ
    for p in seed["products"]:
        if p.get("story") and OLD_LINE in (p.get("description") or "") and "صورة طفلك على الغلاف" not in p["description"]:
            p["description"] = p["description"].replace(OLD_LINE, NEW_LINE)
    return seed

def sql():
    j = lambda x: json.dumps(x, ensure_ascii=False).replace("'", "''")
    return f"""update public.store_settings set config =
  jsonb_set(
    jsonb_set(
      jsonb_set(config, '{{texts}}', coalesce(config->'texts','{{}}'::jsonb) || '{j(TEXTS)}'::jsonb),
      '{{stories}}', coalesce(config->'stories','{{}}'::jsonb) || '{j(STORIES)}'::jsonb),
    '{{contact,faq}}', '{j(FAQ)}'::jsonb)
where id = 1;
update public.products set description = replace(description, '{OLD_LINE}', '{NEW_LINE.replace(chr(10), "' || chr(10) || '")}')
 where story is not null and position('صورة طفلك على الغلاف' in description) = 0;
select config#>>'{{texts,hero_title}}' as title, config->'stories' as stories, jsonb_array_length(config#>'{{contact,faq}}') as faq_n, config ? 'order' and config ? 'sales' as intact,
       (select count(*) from public.products where story is not null and position('صورة طفلك على الغلاف' in description) > 0) as described
  from public.store_settings where id = 1;"""

if __name__ == "__main__":
    if sys.argv[1:] == ["sql"]:
        print(sql())
    else:
        seed = json.load(open("seed.json"))
        json.dump(apply(seed), open("seed.json", "w"), ensure_ascii=False, indent=1)
        print("seed updated")
