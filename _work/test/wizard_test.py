import asyncio, json, sys
from urllib.parse import quote, unquote
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API

BASE = "http://127.0.0.1:8813/ATHR/huroof/"
SHOT = "/home/claude/shots/wz-"
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
            await page.wait_for_timeout(350); await page.screenshot(path=f"{SHOT}{n}.png", full_page=full)
        async def step():
            return await page.evaluate("document.querySelector('.wz-body') && document.querySelector('.wz-body').dataset.step")

        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(900)
        await page.locator(".sh-gifts").scroll_into_view_if_needed(); await page.wait_for_timeout(2500)
        await page.evaluate("window.scrollTo(0,0)"); await page.wait_for_timeout(300)
        await shot("home", True)
        await page.click("[data-wiz-new]"); await page.wait_for_timeout(500)
        print("open step:", await step())
        await shot("1-g")
        await page.click("[data-wz=next]"); await page.wait_for_timeout(300)
        print("err on empty:", await page.locator(".wz-err").inner_text())
        await page.click("[data-wz-g=f]"); await page.wait_for_timeout(700)
        print("after g:", await step())
        await page.fill("input[name=wz_name]", "سارة"); await page.wait_for_timeout(200)
        await shot("2-name")
        await page.keyboard.press("Enter"); await page.wait_for_timeout(400)
        print("after name:", await step())
        await shot("3-age")
        await page.click("[data-wz-age='6']"); await page.wait_for_timeout(700)
        await page.click("[data-wz-like=draw]"); await page.click("[data-wz-like=football]"); await page.wait_for_timeout(200)
        print("3rd like disabled:", await page.locator("[data-wz-like=read]").is_disabled())
        await shot("4-likes")
        await page.click("[data-wz=next]"); await page.wait_for_timeout(300)
        await page.click("[data-wz-lesson=teeth]"); await page.wait_for_timeout(200)
        await shot("5-lesson")
        await page.click("[data-wz=next]"); await page.wait_for_timeout(300)
        print("story step:", await step())
        await shot("6-story")
        sid = await page.evaluate("Array.from(document.querySelectorAll('[data-wz-story]')).find(b=>b.textContent.includes('الفضاء')).dataset.wzStory")
        await page.click(f"[data-wz-story='{sid}']"); await page.wait_for_timeout(700)
        print("tier step:", await step())
        await page.click("[data-wz-tier=pro]"); await page.wait_for_timeout(300)
        await page.fill("input[name=wz_family]", "ماما مريم، بابا خالد، أختها لين")
        await page.fill("input[name=wz_friend]", "ريم")
        await page.fill("textarea[name=wz_note]", "تحب الفراشات واللون البنفسجي")
        await shot("7-tier")
        await page.click("[data-wz=next]"); await page.wait_for_timeout(300)
        print("fmt step:", await step())
        await page.click("[data-wz-fmt=print]"); await page.wait_for_timeout(200)
        await shot("8-fmt")
        await page.click("[data-wz=next]"); await page.wait_for_timeout(2600)
        print("review step:", await step())
        print("review total:", await page.locator(".wz-total").inner_text())
        await shot("9-review")
        await page.locator(".wz-body").evaluate("e=>e.scrollTop=e.scrollHeight"); await shot("9-review-b")
        # edit from review then come back
        await page.click("[data-wz-go=likes]"); await page.wait_for_timeout(300)
        print("edit goes to:", await step(), "| button:", await page.locator("[data-wz=next]").inner_text())
        await page.click("[data-wz=next]"); await page.wait_for_timeout(500)
        print("back to:", await step())
        await page.click("[data-wz=order]"); await page.wait_for_timeout(1500)
        print("url:", unquote(page.url))
        cart = await page.evaluate("JSON.parse(localStorage.getItem('huroof_cart_v2'))")
        print("cart:", json.dumps(cart, ensure_ascii=False))
        print("delivery options:", await page.locator("input[name=delivery]").evaluate_all("els=>els.map(e=>e.closest('label').innerText.split('\\n')[0])"))
        print("address field:", await page.locator("textarea[name=address]").count())
        await shot("checkout", True)
        await page.fill("input[name=name]", "مريم سالم")
        await page.fill("input[name=phone]", "91234567")
        await page.fill("textarea[name=address]", "السيب، الحيل الشمالية، بيت 12")
        print("summary:", (await page.locator("#checkoutSummary").inner_text()).replace("\n", " | "))
        await page.click("#placeOrder"); await page.wait_for_timeout(1800)
        print("after order:", unquote(page.url))
        await shot("done", True)
        posted = mock.calls("POST", "/rest/v1/orders")
        if posted:
            o = posted[-1][3]
            print("ORDER:", json.dumps({k: o[k] for k in ("items", "delivery_name", "delivery_type", "delivery_price", "total", "address")}, ensure_ascii=False))
        wa = await page.evaluate("Array.from(document.querySelectorAll('a[href*=\"wa.me\"]')).map(a=>decodeURIComponent(a.href))")
        print("WA links:\n", "\n---\n".join(x.split("text=")[-1] for x in wa))

        # flip viewer + back button
        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(800)
        await page.locator("[data-flip]").first.click(); await page.wait_for_timeout(1500)
        await shot("flip-1")
        await page.click("[data-fb=next]"); await page.wait_for_timeout(1200)
        await page.fill("input[name=fb_name]", "عبدالله"); await page.wait_for_timeout(1600)
        print("flip count:", await page.locator("#fbCount").inner_text())
        await shot("flip-2")
        await page.go_back(); await page.wait_for_timeout(500)
        print("flip closed by back:", await page.locator(".fb").count() == 0, "| url:", unquote(page.url))
        # product page
        await page.goto(BASE + "p/" + quote("قصة-باسم-طفلك-حديقة-الحروف") + "/", wait_until="networkidle"); await page.wait_for_timeout(1800)
        await shot("pdp", True)
        await page.click("#buyBox [data-wiz]"); await page.wait_for_timeout(500)
        print("pdp wizard prefilled:", await step(), await page.evaluate("document.querySelector('.wz-card.on') && document.querySelector('.wz-card.on').innerText"))
        await page.go_back(); await page.wait_for_timeout(500)
        print("wizard closed by back:", await page.locator(".wz").count() == 0)
        await b.close()
    print("ERRORS:", errors)

asyncio.run(main())
