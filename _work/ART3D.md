# المجموعة الجديدة: 4 قصص ثلاثية الأبعاد (astro, sea, dino, oman) — ملف التسليم

## أين وصلنا (28 أكتوبر 2026)
- ✅ النصوص جاهزة في js/stories.js (Object.assign(STORIES, {astro, sea, dino, oman})) — illustrated: true، الكتاب عرضي A4 (1754×1240)، و book.ready: false للأربع.
- ✅ **كل الرسومات (104 صورة) مولّدة في Canva Pro** (حساب صاحب المتجر). أرقامها في `_work/canva.json`:
  - `refs`: أوراق الشخصيات (base/m و base/f للطفل، و{story}/side للشخصيات، و astro/m و astro/f).
  - `pages`: `{story}/{m|f}/{cover|p1..p10|end|color}` → رقم Canva (MAH...). كل صورة 1536×1024.
  - `alt`: نسخ بديلة غير مستخدمة.
- ✅ المتجر منشور بصفحة «قصصنا الجديدة قريباً» (القصص القديمة مخفية is_visible=false، لا تُحذف).
- ⛔ ما بقي متوقف على تنزيل الصور بالدقة الكاملة: الجلسة السابقة كانت تمنع media.canva.com (403).
  صاحب المتجر فعّل «Allow network egress» — يسري على الجلسات الجديدة.

## الخطوات الباقية (بالترتيب)
1. **تأكد من الوصول**: `curl -sS -o /dev/null -w '%{http_code}' https://media.canva.com/` (أي رد غير 403 من البروكسي = جيد).
2. **تنزيل الـ104 صورة** إلى مجلد خام جديد (مثلاً /tmp/raw) بأسماء `{story}__{g}__{key}.png`:
   - `mcp__Canva__get-assets` لكل رقم يعطي `thumbnail.url` (رابط media.canva.com/v2/image-resize موقّع، بمقاس 200).
     جرّب نفس الرابط بعد تغيير width/height إلى 1536/1024؛ إن رفض التوقيع: ضع الصور في تصميم Canva
     (صفحة لكل صورة) ثم `export-design` بصيغة png بعرض 1536 ونزّل الروابط.
   - لا تلتف على أي منع من البروكسي؛ إن بقي المنع أخبر صاحب المتجر.
3. **التجهيز**: `python3 -I _work/process.py /tmp/raw images/stories` → يكتب `images/stories/{id}/{m|f}/{key}.jpg` (عرض 1754) و `s/{key}.jpg` (900).
4. راجع كل صفحة بالعين (book_test.py يرسم الكتاب)، ثم اجعل `book.ready: true` للقصص الأربع في js/stories.js.
5. **سطر توضيح**: أضف في صفحة النهاية أو الغلاف الخلفي سطراً صغيراً «الرسومات مُنشأة بمساعدة الذكاء الاصطناعي» (شروط Canva).
6. **صور المنتجات**: موكب كتاب لكل قصة من غلاف الولد/البنت → `images/p/st-{id}-0.jpg` (+ صور إضافية للمعرض).
7. **قاعدة البيانات** (Supabase zcnwzpevehudhnsuljdy): 4 منتجات جديدة بنفس شكل المنتجات القديمة في seed.json
   (`name`: «قصة باسم طفلك: …»، `price`: 2، نفس `category_id`، `story`: astro/sea/dino/oman، is_visible: true).
   استخدم insert فقط؛ لا DELETE ولا DROP. ثم `config.stories.pro_stories` = ["astro","sea","dino","oman"] إن كانت النسخة الاحترافية متاحة لها.
8. حدّث `_work/seed.json` بنفس التغييرات (المنتجات + الإعداد).
9. **البناء**: `_work/build_site.sh` (يتوقع المصدر في /home/claude/huroof والبيانات في /home/claude/gen/seed.json؛ عدّل المسارات).
   يحذف images/stories/space من النسخة المنشورة (رسومات خطة مجانية ممنوع بيعها).
10. **الاختبار**: _work/test/ks_test.py و ks_pro.py و admin_v21.py و book_test.py (mock.py يحتاج ملف كوبونات تجريبي فارغ `[]`).
11. **النشر**: انسخ build-athr/huroof إلى مجلد huroof/ في مستودع a3r-om/ATHR (فرع main) ثم commit و push.
    واحفظ المصدر: `git push https://github.com/a3r-om/ATHR.git main:huroof-src`.

## قواعد ثابتة
- لا تلمس أي شيء في مستودع ATHR خارج مجلد huroof/. لا تنسخ بيانات بنكية/IBAN أبداً.
- إخفاء المنتجات فقط (is_visible=false)، لا حذف.
- لا تقييمات أو أرقام أو استعجال مختلق. لا شخصيات أو علامات محمية (Disney/Marvel/Elfink…).
- صاحب المتجر يعمل من الجوال: ردود عربية، أرقام إنجليزية، خط Amiri. واتساب المتجر 96877336242.
- صورة الطفل على الغلاف: helmet (astro/sea) أو frame (dino/oman) في الزاوية اليمنى السفلية.
