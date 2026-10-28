"""يرسم صفحات محددة بحجم أكبر: render_some.py OUT_DIR story:g:kind[:key] ..."""
import asyncio, base64, io, sys
from playwright.async_api import async_playwright
from PIL import Image

BASE = "http://127.0.0.1:8814/ATHR/huroof/"
OUT = sys.argv[1]
SPECS = sys.argv[2:]

JS = """async ([sid, g, kind, key]) => {
    const L = window.HUROOF_STORIES;
    const custom = {name: g === 'f' ? 'مريم' : 'عبدالله', g, age: 6, likes: ['football']};
    const pg = L.bookPages(sid, custom).find(p => p.kind === kind && (!key || p.key === key));
    const c = await L.renderPage(sid, custom, pg, {width: 1200});
    return c.toDataURL('image/jpeg', .85);
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        await page.goto(BASE + "404.html")
        await page.add_script_tag(url=BASE + "js/defaults.js")
        await page.add_script_tag(url=BASE + "js/stories.js")
        ims = []
        for s in SPECS:
            parts = s.split(":") + [""]
            u = await page.evaluate(JS, parts[:4])
            ims.append(Image.open(io.BytesIO(base64.b64decode(u.split(",")[1]))))
        cols = 2
        w, h = ims[0].width, ims[0].height
        sheet = Image.new("RGB", (w * min(cols, len(ims)), h * ((len(ims) + cols - 1) // cols)), "white")
        for i, im in enumerate(ims):
            sheet.paste(im, ((i % cols) * w, (i // cols) * h))
        sheet.save(OUT, quality=82)
        await b.close()

asyncio.run(main())
