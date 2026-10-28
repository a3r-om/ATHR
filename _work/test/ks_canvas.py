import asyncio, sys, json, base64
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
BASE = "http://127.0.0.1:8813/ATHR/huroof/"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
PHOTO = "/tmp/claude-0/-home-claude/f8f16bbd-fb86-5b0f-ab89-39a21cbeece6/scratchpad/kid.jpg"
async def router(route):
    u = route.request.url
    if u.startswith(API): return await mock.handle(route)
    if u.startswith("http://127.0.0.1"): return await route.continue_()
    return await route.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="ar")
        await ctx.route("**/*", router)
        page = await ctx.new_page()
        await page.goto(BASE + "p/" + sys.argv[1] + "/#personalize", wait_until="networkidle"); await page.wait_for_timeout(800)
        await page.fill("#sfName", "عبدالرحمن"); await page.click("[data-sf-g=m]"); await page.select_option("#sfAge", "6")
        await page.set_input_files("#sfPhoto", PHOTO); await page.wait_for_timeout(1500)
        await page.check("[name=sf_ded_on]"); await page.wait_for_timeout(200)
        await page.click("[data-sf-ded=own]"); await page.fill("[name=sf_ded]", "إلى حبيب قلبي عبدالرحمن، أنت أجمل هدية من الله. نحبك أكثر من كل نجوم السماء، ونتمنى أن تبقى دائماً سعيداً ومحباً للقراءة.")
        await page.fill("[name=sf_ded_from]", "ماما وبابا وأختك لين"); await page.wait_for_timeout(3500)
        urls = await page.evaluate("Array.from(document.querySelectorAll('#storyPages canvas')).map(c=>c.toDataURL('image/jpeg',.85))")
        from PIL import Image; import io
        ims=[Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))) for u in urls]
        h=max(i.height for i in ims); w=sum(i.width for i in ims)
        out=Image.new('RGB',(w,h),'white'); x=0
        for i in ims: out.paste(i,(x,0)); x+=i.width
        out.save('/tmp/claude-0/-home-claude/f8f16bbd-fb86-5b0f-ab89-39a21cbeece6/scratchpad/canv.jpg', quality=85); print(len(ims), out.size)
        await b.close()
asyncio.run(main())
