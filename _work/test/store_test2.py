import asyncio, json, sys, re
from urllib.parse import quote
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API

BASE = "http://127.0.0.1:8813/ATHR/huroof/"
SHOT = "/home/claude/shots/t-"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
errors = []

async def router(route):
    u = route.request.url
    if u.startswith(API):
        return await mock.handle(route)
    if u.startswith("http://127.0.0.1"):
        return await route.continue_()
    return await route.abort()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1.5, is_mobile=True, has_touch=True, locale="ar")
        await ctx.route("**/*", lambda r: asyncio.ensure_future(router(r)) if False else router(r))
        page = await ctx.new_page()
        page.on("console", lambda m: errors.append(f"{m.type}: {m.text[:200]}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))

        async def shot(name, full=True):
            await page.wait_for_timeout(500)
            await page.screenshot(path=f"{SHOT}{name}.png", full_page=full)

        # 1) home
        await page.goto(BASE, wait_until="networkidle")
        await shot("home")
        sw = await page.evaluate("document.documentElement.scrollWidth")
        print("home scrollWidth", sw)
        # 2) category
        await page.goto(BASE + "c/" + quote("تلوين-للأطفال") + "/", wait_until="networkidle")
        await shot("cat", full=False)
        # 3) product
        await page.goto(BASE + "p/" + quote("حروف-عربية-للتلوين") + "/", wait_until="networkidle")
        await shot("prod")
        await page.click("[data-pdp-add]")
        await page.wait_for_timeout(700)
        await shot("prod-added", full=False)
        # close any sheet
        await page.keyboard.press("Escape")
        # add a bundle from category page
        await page.goto(BASE + "c/" + quote("حزم-التوفير") + "/", wait_until="networkidle")
        btn = page.locator("[data-add]").first
        await btn.click()
        await page.wait_for_timeout(600)
        await page.keyboard.press("Escape")
        await shot("bundles", full=False)
        # 4) cart
        await page.goto(BASE + "cart/", wait_until="networkidle")
        await shot("cart")
        # coupon
        # 5) checkout
        await page.goto(BASE + "checkout/", wait_until="networkidle")
        await shot("checkout")
        names = await page.evaluate("Array.from(document.querySelectorAll('#checkoutForm [name]')).map(e=>e.name)")
        print("checkout fields:", sorted(set(names)))
        await page.fill("input[name=name]", "مريم سالم")
        await page.fill("input[name=phone]", "91234567")
        await page.click("#placeOrder")
        await page.wait_for_timeout(1500)
        print("after order url:", page.url)
        await shot("done")
        posted = [c for c in mock.calls("POST", "/rest/v1/orders")]
        if posted:
            o = posted[-1][3]
            print("ORDER:", json.dumps({k: o.get(k) for k in ["order_no", "delivery_type", "delivery_name", "address", "wilaya", "governorate", "payment_type", "total", "delivery_price"]}, ensure_ascii=False))
            print("items:", [i["name"] for i in o["items"]])
        wa = await page.evaluate("Array.from(document.querySelectorAll('a[href*=\"wa.me\"]')).map(a=>decodeURIComponent(a.href)).find(h=>h.includes('text='))")
        print("WA message:\n", (wa or "").split("text=")[-1])
        # 6) points
        await page.goto(BASE + "points/", wait_until="networkidle")
        await page.wait_for_timeout(800)
        await shot("points", full=False)
        # 7) shipping/policy page
        await page.goto(BASE + "shipping/", wait_until="networkidle")
        await shot("policy")
        # 8) search
        await page.goto(BASE + "search/?q=" + quote("رياضيات"), wait_until="networkidle")
        await page.wait_for_timeout(600)
        cnt = await page.locator(".card").count()
        print("search رياضيات results:", cnt)
        await page.goto(BASE + "search/?q=coloring", wait_until="networkidle")
        await page.wait_for_timeout(600)
        print("search coloring results:", await page.locator(".card").count())
        # 9) English
        await page.goto(BASE, wait_until="networkidle")
        await page.click("#langBtn")
        await page.wait_for_timeout(900)
        await shot("home-en", full=False)
        await page.click("#langBtn")
        await page.wait_for_timeout(500)
        # 10) gift checkout
        await page.goto(BASE + "p/" + quote("قصة-زقزوق-في-حديقة-الحروف") + "/", wait_until="networkidle")
        if await page.locator("[data-gift-now]").count():
            await page.click("[data-gift-now]")
            await page.wait_for_timeout(1200)
            print("gift url:", page.url)
            await shot("gift-checkout")
            gnames = await page.evaluate("Array.from(document.querySelectorAll('#checkoutForm [name]')).map(e=>e.name)")
            print("gift fields:", sorted(set(gnames)))
        # 11) review page
        await page.goto(BASE + "review/", wait_until="networkidle")
        await shot("review", full=False)
        await b.close()
    print("\nERRORS:", len(errors))
    for e in errors[:30]: print(" ", e)

asyncio.run(main())
