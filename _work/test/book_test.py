import asyncio, base64, io
from playwright.async_api import async_playwright
from PIL import Image
BASE = "http://127.0.0.1:8813/ATHR/huroof/"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page()
        errs=[]; page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(BASE + "404.html"); await page.wait_for_timeout(300)
        await page.add_script_tag(url=BASE + "js/defaults.js"); await page.add_script_tag(url=BASE + "js/stories.js")
        urls = await page.evaluate("""async () => {
            const L = window.HUROOF_STORIES; const out = [];
            const pages = L.bookPages('astro', {name:'عبدالله', g:'m', age:5});
            const img = new Image(); img.src = '/ATHR/huroof/images/stories/astro/m/p1.jpg'; await img.decode();
            for (const [pg, ph] of [[pages[0], img], [pages[1], null]]) {
                const c = await L.renderPage('astro', {name:'عبدالله', g:'m', age:5, likes:['football']}, pg, {width: 1000, photo: ph});
                out.push(c.toDataURL('image/jpeg', .85));
            }
            return out;
        }""")
        ims=[Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))) for u in urls]
        out=Image.new('RGB',(ims[0].width, sum(i.height for i in ims))); y=0
        for i in ims: out.paste(i,(0,y)); y+=i.height
        out.save('/tmp/claude-0/-home-claude/f8f16bbd-fb86-5b0f-ab89-39a21cbeece6/scratchpad/book.jpg', quality=85)
        print("errors:", errs)
        await b.close()
asyncio.run(main())
