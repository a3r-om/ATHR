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
        page = await ctx.new_page()
        errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(1200)
        await page.screenshot(path="/home/claude/shots/soon.png", full_page=True)
        print("soon cards:", await page.locator(".ks-soon").count(), "| gifts:", await page.locator(".sh-gifts").count(), "| live:", await page.locator(".sh-live").count())
        await page.goto(BASE + "p/%D9%82%D8%B5%D8%A9-%D8%A8%D8%A7%D8%B3%D9%85-%D8%B7%D9%81%D9%84%D9%83-%D8%AD%D8%AF%D9%8A%D9%82%D8%A9-%D8%A7%D9%84%D8%AD%D8%B1%D9%88%D9%81/", wait_until="networkidle"); await page.wait_for_timeout(1000)
        print("old product page:", (await page.locator("#view").inner_text())[:120].replace("\n"," | "))
        print("errors:", errs)
        await b.close()
asyncio.run(main())
