import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
BASE = "http://127.0.0.1:8811/huroof/"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
mock.user["user_metadata"]["must_change_password"] = False
async def router(route):
    u = route.request.url
    if u.startswith(API): return await mock.handle(route)
    if u.startswith("http://127.0.0.1"): return await route.continue_()
    return await route.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1.5, is_mobile=True, has_touch=True)
        await ctx.route("**/*", router)
        page = await ctx.new_page()
        errs=[]; page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(BASE + "#admin", wait_until="networkidle"); await page.wait_for_timeout(1200)
        await page.fill("#loginEmail", "o@e.com"); await page.fill("#loginPass", "x12345678"); await page.click("#loginBtn")
        await page.wait_for_timeout(2500)
        await page.click(".adm-grid [data-tab=order]"); await page.wait_for_timeout(800)
        sel = page.locator("select[data-bind='config.order.delivery.0.type']")
        print("delivery type select:", await sel.count(), await sel.input_value() if await sel.count() else None)
        card = page.locator(".adm-card", has_text="التوصيل").last
        await card.scroll_into_view_if_needed(); await page.wait_for_timeout(300)
        await card.screenshot(path="/home/claude/shots/a-delivery.png")
        # تعديل سعر منتج والنشر
        await page.click("[data-tab=products]"); await page.wait_for_timeout(800)
        first = page.locator(".adm-body [data-edit-product], .adm-body .prow, .adm-body li").first
        print("products tab html sample:", (await page.evaluate("document.querySelector('.adm-body').innerHTML.slice(0,600)"))[:600])
        await b.close()
    print("errors:", errs)
asyncio.run(main())
