"""يرسم كل صفحات الكتب الأربعة (ولد/بنت) ويجمعها في أوراق مراجعة."""
import asyncio, base64, io, sys
from playwright.async_api import async_playwright
from PIL import Image

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8814/ATHR/huroof/"
OUT = sys.argv[2]
STORIES = sys.argv[3].split(",") if len(sys.argv) > 3 else ["astro", "sea", "dino", "oman"]

JS = """async ([sid, g, name, ded]) => {
    const L = window.HUROOF_STORIES;
    const custom = {name, g, age: 6, likes: ['football'], ded: ded ? 'نحبك كثيراً يا بطل' : ''};
    const pages = L.bookPages(sid, custom);
    const ph = new Image(); ph.src = '/ATHR/huroof/images/stories/' + sid + '/' + g + '/s/p2.jpg'; await ph.decode();
    const out = [];
    for (const pg of pages) {
        const c = await L.renderPage(sid, custom, pg, {width: 640, photo: pg.kind === 'bcover' ? ph : null});
        out.push([pg.kind + (pg.key ? ':' + pg.key : ''), c.toDataURL('image/jpeg', .8)]);
    }
    return out;
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("requestfailed", lambda r: errs.append("FAILED " + r.url))
        await page.goto(BASE + "404.html")
        await page.wait_for_timeout(300)
        await page.add_script_tag(url=BASE + "js/defaults.js")
        await page.add_script_tag(url=BASE + "js/stories.js")
        for sid in STORIES:
            for g, name in (("m", "عبدالله"), ("f", "مريم")):
                res = await page.evaluate(JS, [sid, g, name, g == "f"])
                ims = [Image.open(io.BytesIO(base64.b64decode(u.split(",")[1]))) for _, u in res]
                cols = 4
                w, h = ims[0].width, max(i.height for i in ims)
                rows = (len(ims) + cols - 1) // cols
                sheet = Image.new("RGB", (w * cols, h * rows), "white")
                for i, im in enumerate(ims):
                    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
                sheet.save(f"{OUT}/book_{sid}_{g}.jpg", quality=80)
                print(sid, g, len(ims), [k for k, _ in res])
        print("errors:", errs)
        await b.close()

asyncio.run(main())
