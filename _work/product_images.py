"""صور المنتجات للقصص الأربع الجديدة: موكب كتاب (ولد + بنت) + 4 صور للمعرض، وصورة القسم.
الاستخدام: python3 product_images.py BASE_URL SITE_ROOT WORK_DIR"""
import asyncio, base64, io, math, os, random, sys
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE, ROOT, WORK = sys.argv[1], sys.argv[2], sys.argv[3]
STORIES = ["astro", "sea", "dino", "oman"]
NAMES = {"m": "سالم", "f": "سارة"}
# (الجنس، رقم الصفحة في الكتاب بدون إهداء): 1 أول صفحة، 4، 6، 12 صفحة التلوين
GALLERY = [("m", 1), ("f", 4), ("m", 6), ("f", 12)]
FONT = os.path.join(ROOT, "fonts/amiri-bold.woff")

JS = """async ([sid, g, name, idx]) => {
    const S = window.HUROOF_STORIES;
    const custom = {name, g, age: 6, ded: ''};
    const pages = S.bookPages(sid, custom);
    const c = await S.renderPage(sid, custom, pages[idx], {width: 1200});
    return c.toDataURL('image/png');
}"""

async def render():
    os.makedirs(WORK, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        await page.goto(BASE + "404.html")
        await page.add_script_tag(url=BASE + "js/defaults.js")
        await page.add_script_tag(url=BASE + "js/stories.js")
        jobs = [(s, g, 0) for s in STORIES for g in "mf"] + [(s, g, i) for s in STORIES for g, i in GALLERY]
        for s, g, i in jobs:
            u = await page.evaluate(JS, [s, g, NAMES[g], i])
            open(f"{WORK}/{s}-{g}-{i}.png", "wb").write(base64.b64decode(u.split(",")[1]))
        await b.close()

def night(w, h, seed=1):
    """خلفية ليلية بنفسجية بنجوم ذهبية، مثل ثيم المتجر"""
    top, bot = (23, 13, 43), (46, 24, 92)
    im = Image.new("RGB", (w, h))
    px = im.load()
    for y in range(h):
        t = y / (h - 1)
        c = tuple(round(top[k] + (bot[k] - top[k]) * t) for k in range(3))
        for x in range(w):
            px[x, y] = c
    d = ImageDraw.Draw(im, "RGBA")
    rnd = random.Random(seed)
    for _ in range(int(w * h / 2600)):
        x, y, r = rnd.uniform(0, w), rnd.uniform(0, h), rnd.uniform(0.6, 1.9)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 236, 180, rnd.randint(90, 220)))
    for cx, cy, r in [(w * 0.1, h * 0.86, 12), (w * 0.9, h * 0.2, 9), (w * 0.86, h * 0.9, 7)]:
        star(d, cx, cy, r)
    return im

def star(d, cx, cy, r):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=(255, 210, 63, 235))

def book(page, width, spine=True):
    """يحوّل صفحة الغلاف إلى كتاب مقوّى: زوايا ناعمة، كعب على اليمين (كتاب عربي)، وحواف صفحات"""
    pg = page.convert("RGBA")
    pg = pg.resize((width, round(pg.height * width / pg.width)), Image.LANCZOS)
    w, h = pg.size
    if spine:
        sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        sw = max(10, w // 22)
        for i in range(sw):
            a = int(110 * (1 - i / sw) ** 1.6)
            sd.line((w - 1 - i, 0, w - 1 - i, h), fill=(10, 6, 30, a))
        sd.line((w - sw - 2, 0, w - sw - 2, h), fill=(255, 255, 255, 60), width=2)
        pg.alpha_composite(sh)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=max(6, w // 70), fill=255)
    pg.putalpha(mask)
    return pg

def place(base, layer, cx, cy, angle=0, edges=True):
    pad = 46
    w, h = layer.size
    holder = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", holder.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((pad + 6, pad + 14, pad + w + 6, pad + h + 14), radius=12, fill=(5, 2, 18, 150))
    holder.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    if edges:  # حواف الصفحات البيضاء تحت الغلاف
        ed = ImageDraw.Draw(holder)
        for k, col in [(6, (214, 206, 228, 255)), (3, (246, 242, 252, 255))]:
            ed.rounded_rectangle((pad + k, pad + k, pad + w - 2 + k, pad + h - 2 + k), radius=8, fill=col)
    holder.alpha_composite(layer, (pad, pad))
    if angle:
        holder = holder.rotate(angle, resample=Image.BICUBIC, expand=True)
    base.paste(holder, (int(cx - holder.width / 2), int(cy - holder.height / 2)), holder)

def badge(im, text, y=78, size=34):
    f = ImageFont.truetype(FONT, size, layout_engine=ImageFont.Layout.RAQM)
    d = ImageDraw.Draw(im)
    bb = d.textbbox((0, 0), text, font=f, direction="rtl", language="ar")
    w = bb[2] - bb[0] + 60
    x0 = (im.width - w) // 2
    d.rounded_rectangle((x0, y - 31, x0 + w, y + 31), radius=31, fill=(255, 210, 63), outline=(255, 243, 166), width=3)
    d.text((im.width // 2, y), text, font=f, fill=(42, 22, 80), anchor="mm", direction="rtl", language="ar")

def main():
    asyncio.run(render())
    L = lambda s, g, i: Image.open(f"{WORK}/{s}-{g}-{i}.png")
    W, H = 600, 750
    out = os.path.join(ROOT, "images/p")
    for n, s in enumerate(STORIES):
        im = night(W, H, seed=n + 3)
        place(im, book(L(s, "m", 0), 440), 262, 330, 5)
        place(im, book(L(s, "f", 0), 440), 340, 545, -4)
        badge(im, "باسم طفلك، ولد أو بنت")
        im.save(f"{out}/st-{s}-0.jpg", quality=88, optimize=True, progressive=True)
        for k, (g, i) in enumerate(GALLERY, start=1):
            im = night(W, H, seed=n * 10 + k)
            pg = book(L(s, g, i), 540, spine=False)
            place(im, pg, W / 2, H / 2, 0, edges=False)
            im.save(f"{out}/st-{s}-{k}.jpg", quality=88, optimize=True, progressive=True)
    # صورة القسم «قصص باسم طفلك»
    im = night(336, 432, seed=99)
    place(im, book(L("sea", "f", 0), 230), 168, 118, 4)
    place(im, book(L("dino", "m", 0), 230), 168, 228, -3)
    place(im, book(L("astro", "m", 0), 230), 168, 330, 3)
    im.save(os.path.join(ROOT, "images/categories/personal.jpg"), quality=88, optimize=True)
    print("done")

main()
