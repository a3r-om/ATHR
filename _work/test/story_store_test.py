import asyncio, json, sys
from urllib.parse import quote, unquote
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API

BASE = "http://127.0.0.1:8813/ATHR/huroof/"
SHOT = "/home/claude/shots/st-"
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
        page.on("console", lambda m: errors.append(f"{m.type}: {m.text[:200]}") if m.type in ("error",) else None)
        page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))
        async def shot(n, full=False):
            await page.wait_for_timeout(400); await page.screenshot(path=f"{SHOT}{n}.png", full_page=full)

        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(800)
        await shot("home", True)
        cta = page.locator("a.story-cta").first
        print("story CTAs on home:", await page.locator("a.story-cta").count())
        await cta.click(); await page.wait_for_timeout(1500)
        print("url:", unquote(page.url))
        print("focused:", await page.evaluate("document.activeElement && document.activeElement.name"))
        await shot("form")
        # add without details
        await page.click("[data-pdp-add]"); await page.wait_for_timeout(600)
        print("error shown:", await page.locator("#stErr").inner_text())
        await shot("form-err")
        await page.fill("input[name=st_name]", "عبد الله")
        await page.click("input[name=st_g][value=m]", force=True)
        await page.select_option("select[name=st_age]", "6")
        await page.check("input[name=st_photo]")
        await page.wait_for_timeout(2500)
        prev = page.locator("#storyPrev")
        await prev.scroll_into_view_if_needed(); await page.wait_for_timeout(300)
        await prev.screenshot(path=f"{SHOT}preview.png")
        print("preview note:", await page.locator("#stPrevNote").inner_text())
        await page.click("#buyBox [data-pdp-add]"); await page.wait_for_timeout(900)
        await shot("added")
        await page.keyboard.press("Escape")
        cart = await page.evaluate("JSON.parse(localStorage.getItem('huroof_cart_v2'))")
        print("cart:", json.dumps(cart, ensure_ascii=False))
        # second story with saved child prefilled
        await page.goto(BASE + "p/" + quote("قصة-باسم-طفلك-رحلة-إلى-الفضاء") + "/", wait_until="networkidle"); await page.wait_for_timeout(1200)
        print("prefilled name:", await page.input_value("input[name=st_name]"), "| age:", await page.input_value("select[name=st_age]"))
        # cart page
        await page.goto(BASE + "cart/", wait_until="networkidle"); await page.wait_for_timeout(800)
        print("cart meta:", await page.locator(".cl-story").all_inner_texts())
        await shot("cart")
        await page.goto(BASE + "checkout/", wait_until="networkidle"); await page.wait_for_timeout(800)
        await page.fill("input[name=name]", "مريم سالم")
        await page.fill("input[name=phone]", "91234567")
        await page.click("#placeOrder"); await page.wait_for_timeout(1800)
        print("after order:", unquote(page.url))
        await shot("done", True)
        posted = mock.calls("POST", "/rest/v1/orders")
        if posted:
            o = posted[-1][3]
            print("ORDER items:", json.dumps(o["items"], ensure_ascii=False))
        wa = await page.evaluate("Array.from(document.querySelectorAll('a[href*=\"wa.me\"]')).map(a=>decodeURIComponent(a.href)).find(h=>h.includes('text='))")
        print("WA message:\n", (wa or "").split("text=")[-1])
        await b.close()
    print("ERRORS:", errors)

asyncio.run(main())
