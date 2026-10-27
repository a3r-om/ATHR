import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
BASE = "http://127.0.0.1:8813/ATHR/huroof/"
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
        errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(BASE + "#admin", wait_until="networkidle"); await page.wait_for_timeout(1200)
        if await page.locator("#loginEmail").count():
            await page.fill("#loginEmail", "o@e.com"); await page.fill("#loginPass", "x12345678"); await page.click("#loginBtn")
            await page.wait_for_timeout(2500)
        await page.screenshot(path="/home/claude/shots/an-admin.png")
        t = page.locator(".adm-grid [data-tab=templates]")
        if await t.count(): await t.click()
        else: await page.click("[data-tab=templates]")
        await page.wait_for_timeout(800)
        await page.screenshot(path="/home/claude/shots/an-tpl.png")
        print("errors:", errs)
        await b.close()
asyncio.run(main())
