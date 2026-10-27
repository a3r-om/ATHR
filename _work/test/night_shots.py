import asyncio, sys, json
from urllib.parse import quote
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
BASE = "http://127.0.0.1:8813/ATHR/huroof/"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
errors = []
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
        page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))
        page.on("console", lambda m: errors.append(m.text[:160]) if m.type == "error" and "ERR_FAILED" not in m.text else None)
        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(900)
        for sel in [".sh-live", ".sh-gifts"]:
            await page.locator(sel).scroll_into_view_if_needed(); await page.wait_for_timeout(1800)
        await page.fill("input[name=live_name]", "محمد"); await page.wait_for_timeout(1500)
        await page.evaluate("window.scrollTo(0,0)"); await page.wait_for_timeout(400)
        await page.screenshot(path="/home/claude/shots/n-home.png", full_page=True)
        print("classes:", await page.evaluate("document.documentElement.className"))
        print("top cta:", await page.locator("#wizTop").count())
        await page.click("[data-wiz-age='4-5']"); await page.wait_for_timeout(500)
        await page.screenshot(path="/home/claude/shots/n-wz1.png")
        await page.click("[data-wz-g=m]"); await page.wait_for_timeout(700)
        await page.fill("input[name=wz_name]", "محمد"); await page.keyboard.press("Enter"); await page.wait_for_timeout(500)
        print("age options:", await page.locator("[data-wz-age]").all_inner_texts())
        await page.screenshot(path="/home/claude/shots/n-wz-age.png")
        await page.click("[data-wz-age='5']"); await page.wait_for_timeout(700)
        await page.click("[data-wz-like=football]"); await page.click("[data-wz-like=cars]")
        await page.screenshot(path="/home/claude/shots/n-wz-likes.png")
        await page.click("[data-wz=next]"); await page.wait_for_timeout(300)
        await page.click("[data-wz-lesson=sleep]"); await page.click("[data-wz=next]"); await page.wait_for_timeout(300)
        await page.screenshot(path="/home/claude/shots/n-wz-story.png")
        sid = await page.evaluate("Array.from(document.querySelectorAll('[data-wz-story]')).find(b=>b.textContent.includes('الفضاء')).dataset.wzStory")
        await page.click(f"[data-wz-story='{sid}']"); await page.wait_for_timeout(700)
        await page.screenshot(path="/home/claude/shots/n-wz-tier.png")
        await page.click("[data-wz=next]"); await page.wait_for_timeout(300)
        await page.click("[data-wz=next]"); await page.wait_for_timeout(2600)
        await page.screenshot(path="/home/claude/shots/n-wz-review.png")
        await page.click("[data-wz=order]"); await page.wait_for_timeout(1500)
        await page.screenshot(path="/home/claude/shots/n-checkout.png", full_page=True)
        await page.goto(BASE + "p/" + quote("قصة-باسم-طفلك-رحلة-إلى-الفضاء") + "/", wait_until="networkidle"); await page.wait_for_timeout(1800)
        await page.screenshot(path="/home/claude/shots/n-pdp.png", full_page=True)
        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(800)
        await page.locator("[data-flip]").first.click(); await page.wait_for_timeout(1600)
        await page.screenshot(path="/home/claude/shots/n-flip.png")
        await b.close()
    print("ERRORS:", errors)
asyncio.run(main())
