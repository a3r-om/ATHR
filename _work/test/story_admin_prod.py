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
            await page.fill("#loginEmail", "o@e.com"); await page.fill("#loginPass", "x12345678"); await page.click("#loginBtn"); await page.wait_for_timeout(2500)
        await page.click("[data-tab=products]"); await page.wait_for_timeout(800)
        html = await page.evaluate("document.querySelector('.adm-body').innerHTML")
        import re
        m = re.findall(r'data-[a-z-]*="([0-9a-f-]{36})"', html)
        pid = [p for p in mock.db["products"] if p.get("story") == "space"][0]["id"]
        btn = page.locator(f'[data-edit="{pid}"], [data-product="{pid}"], [data-open-product="{pid}"]').first
        print("edit btn count:", await btn.count())
        attrs = set(re.findall(r'(data-[a-z-]+)="' + pid, html)); print("attrs for product:", attrs)
        if attrs:
            await page.click(f'[data-edit="{pid}"]'); await page.wait_for_timeout(1000)
            sel = page.locator(f"select[data-bind='products.#{pid}.story']")
            print("story select:", await sel.count(), await sel.input_value() if await sel.count() else "")
            print("colors in cfg:", await page.evaluate("ATHR_ADMIN && 0") if False else "")
            if await sel.count():
                await sel.scroll_into_view_if_needed(); await page.wait_for_timeout(300)
                await page.screenshot(path="/home/claude/shots/sa-prod.png")
        await b.close()
    print("errors:", errs)
asyncio.run(main())
