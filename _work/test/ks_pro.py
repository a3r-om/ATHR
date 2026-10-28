import asyncio, sys
from urllib.parse import unquote
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
        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(600)
        # الغلاف الحي → صفحة القصة بالاسم
        await page.locator(".sh-live").scroll_into_view_if_needed()
        await page.fill("input[name=live_name]", "يوسف"); await page.click("[data-live-go]"); await page.wait_for_timeout(1500)
        print("live→", unquote(page.url).split("/p/")[-1], "| name:", await page.locator("#sfName").input_value())
        await page.click("[data-sf-g=m]"); await page.select_option("#sfAge", "4")
        await page.click("[data-sf-tier=pro]"); await page.wait_for_timeout(300)
        await page.click("[data-sf=add]"); await page.wait_for_timeout(600)
        print("pro err:", await page.locator("#sfErr").inner_text())
        await page.screenshot(path="/home/claude/shots/ks-pro.png")
        # تصفح القصة ثم «اصنع»
        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(500)
        await page.locator(".ks-peek").first.click(); await page.wait_for_timeout(1500)
        await page.screenshot(path="/home/claude/shots/ks-flip.png")
        await page.click("[data-fb=make]"); await page.wait_for_timeout(1500)
        print("flip make →", unquote(page.url).split("/huroof/")[-1])
        # السلة: رابط التعديل
        await page.goto(BASE + "cart/", wait_until="networkidle"); await page.wait_for_timeout(600)
        print("cart meta:", await page.locator(".cl-story").all_inner_texts())
        print("errors:", errs)
        await b.close()
asyncio.run(main())
