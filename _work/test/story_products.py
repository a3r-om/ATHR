import asyncio, subprocess, time, base64, io
from playwright.async_api import async_playwright
from PIL import Image, ImageFilter, ImageDraw

ROOT = "/home/claude/storytest"; PORT = 8836; OUT = "/home/claude/gen/storyimg"
STORIES = ["letters", "space", "school", "turtle"]
JOBS = []
for st in STORIES:
    JOBS += [(st, "m", "سالم", 0), (st, "f", "سارة", 0), (st, "m", "سالم", 1), (st, "f", "سارة", 4), (st, "m", "سالم", 6), (st, "f", "سارة", 12)]

async def render():
    srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); page = await b.new_page()
            await page.goto(f"http://127.0.0.1:{PORT}/_story_test.html")
            for st, g, name, idx in JOBS:
                u = await page.evaluate("""async ([st, g, name, idx]) => {
                    const S = window.HUROOF_STORIES; const pages = S.bookPages(st);
                    const c = await S.renderPage(st, { name, g, age: 6, ded: "" }, pages[idx], { width: 900 });
                    return c.toDataURL("image/png"); }""", [st, g, name, idx])
                open(f"{OUT}/{st}-{g}-{idx}.png", "wb").write(base64.b64decode(u.split(",")[1]))
            await b.close()
    finally:
        srv.terminate()

BG = (238, 226, 214); STRIPE = (210, 97, 74)

def canvas(w, h):
    im = Image.new("RGB", (w, h), BG)
    ImageDraw.Draw(im).rectangle((0, 0, w, int(h * 0.02)), fill=STRIPE)
    return im

def place(base, page, cx, cy, width, angle=0):
    pg = page.convert("RGBA")
    ratio = width / pg.width
    pg = pg.resize((int(pg.width * ratio), int(pg.height * ratio)), Image.LANCZOS)
    pad = 40
    shadow = Image.new("RGBA", (pg.width + pad * 2, pg.height + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle((pad, pad + 8, pad + pg.width, pad + pg.height + 8), fill=(60, 40, 30, 95))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    layer = shadow.copy(); layer.alpha_composite(pg, (pad, pad))
    if angle: layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    base.paste(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)), layer)

from PIL import ImageFont
def badge(im, text):
    f = ImageFont.truetype("/root/.fonts/Amiri-Bold.ttf", 34, layout_engine=ImageFont.Layout.RAQM)
    d = ImageDraw.Draw(im)
    bb = d.textbbox((0, 0), text, font=f, direction="rtl", language="ar")
    w = bb[2] - bb[0] + 56
    x0 = (im.width - w) // 2
    d.rounded_rectangle((x0, 52, x0 + w, 112), radius=30, fill=(255, 255, 255), outline=(43, 38, 32), width=3)
    d.text((im.width // 2, 80), text, font=f, fill=(210, 97, 74), anchor="mm", direction="rtl", language="ar")

def main():
    asyncio.run(render())
    W, H = 600, 750
    for st in STORIES:
        L = lambda g, i: Image.open(f"{OUT}/{st}-{g}-{i}.png")
        im = canvas(W, H); place(im, L("m", 0), 222, 410, 300, -7); place(im, L("f", 0), 384, 420, 318, 5); badge(im, "باسم طفلك · ولد أو بنت")
        im.save(f"{ROOT}/images/p/st-{st}-0.jpg", quality=86, optimize=True)
        for k, (g, i) in enumerate([("m", 1), ("f", 4), ("m", 6), ("f", 12)], start=1):
            im = canvas(W, H); place(im, L(g, i), W / 2, H / 2 + 8, 440, 0)
            im.save(f"{ROOT}/images/p/st-{st}-{k}.jpg", quality=86, optimize=True)
    # صورة القسم
    im = canvas(336, 432)
    place(im, Image.open(f"{OUT}/space-f-0.png"), 120, 225, 165, 9)
    place(im, Image.open(f"{OUT}/turtle-m-0.png"), 220, 225, 165, -8)
    place(im, Image.open(f"{OUT}/letters-f-0.png"), 168, 230, 185, 0)
    im.save(f"{ROOT}/images/categories/personal.jpg", quality=86, optimize=True)
    print("done")

main()
