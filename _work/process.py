# تجهيز رسومات Canva للمتجر: من مجلد الصور الخام إلى images/stories/{id}/{m|f}/ + نسخة صغيرة s/
# الاستخدام: python3 -I process.py RAW_DIR [OUT_ROOT]
# أسماء الملفات الخام: {story}__{g}__{key}.(png|jpg)  مثل astro__m__p1.png
import sys, os, re
from PIL import Image, ImageOps

RAW = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "/home/claude/huroof/images/stories"
FULL_W = 1754          # عرض صفحة الكتاب (A4 عرضي 150dpi)
SMALL_W = 900          # للمعاينة على الجوال
PAT = re.compile(r"^(astro|sea|dino|oman)__([mf])__(cover|p(?:[1-9]|10)|end|color)\.(png|jpe?g|webp)$")

done = 0
for name in sorted(os.listdir(RAW)):
    m = PAT.match(name)
    if not m:
        print("skip", name); continue
    story, g, key, _ = m.groups()
    im = Image.open(os.path.join(RAW, name))
    im = ImageOps.exif_transpose(im).convert("RGB")
    if key == "color":
        # صفحة التلوين: أبيض وأسود نظيف
        im = ImageOps.autocontrast(im.convert("L"), cutoff=1).convert("RGB")
    d = os.path.join(OUT, story, g); s = os.path.join(d, "s")
    os.makedirs(s, exist_ok=True)
    w, h = im.size
    full = im if w >= FULL_W else im.resize((FULL_W, round(h * FULL_W / w)), Image.LANCZOS)
    full.save(os.path.join(d, f"{key}.jpg"), quality=86, optimize=True, progressive=True)
    im.resize((SMALL_W, round(h * SMALL_W / w)), Image.LANCZOS).save(os.path.join(s, f"{key}.jpg"), quality=82, optimize=True, progressive=True)
    done += 1
print("done", done)
