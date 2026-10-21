import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
BASE = "http://127.0.0.1:8813/ATHR/huroof/"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
async def router(route):
    u = route.request.url
    if u.startswith(API): return await mock.handle(route)
    if u.startswith("http://127.0.0.1"): return await route.continue_()
    return await route.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1.5, is_mobile=True, has_touch=True, locale="ar")
        await ctx.route("**/*", router)
        page = await ctx.new_page(); errs=[]
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(900)
        await page.screenshot(path="/home/claude/shots/h-home.png", full_page=True)
        await page.goto(BASE + "p/%D9%82%D8%B5%D8%A9-%D8%A8%D8%A7%D8%B3%D9%85-%D8%B7%D9%81%D9%84%D9%83-%D8%B1%D8%AD%D9%84%D8%A9-%D8%A5%D9%84%D9%89-%D8%A7%D9%84%D9%81%D8%B6%D8%A7%D8%A1/", wait_until="networkidle"); await page.wait_for_timeout(1500)
        await page.screenshot(path="/home/claude/shots/h-prod.png", full_page=True)
        print("buttons:", await page.eval_on_selector_all("#buyBox button, #buyBox a.btn", "e=>e.map(x=>x.textContent.trim()).filter(Boolean)"))
        print("ded field:", await page.locator("textarea[name=st_ded]").count(), "| points chip:", await page.locator(".pchip.pts").count())
        await b.close()
    print("errors:", errs)
asyncio.run(main())
