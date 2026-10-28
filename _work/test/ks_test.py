"""اختبار تصميم Kasaty: الرئيسية، صفحة القصة ونموذج «بيانات التخصيص» مع رفع الصورة والإهداء والتغليف، ثم الطلب."""
import asyncio, sys, json
from urllib.parse import quote, unquote
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
from PIL import Image, ImageDraw

BASE = "http://127.0.0.1:8813/ATHR/huroof/"
OUT = "/home/claude/shots/ks-"
PHOTO = "/tmp/claude-0/-home-claude/f8f16bbd-fb86-5b0f-ab89-39a21cbeece6/scratchpad/kid.jpg"
im = Image.new("RGB", (1600, 2000), "#9ED1F2"); d = ImageDraw.Draw(im)
d.ellipse((450, 400, 1150, 1200), fill="#F1C7A3"); d.ellipse((620, 700, 700, 780), fill="#333"); d.ellipse((900, 700, 980, 780), fill="#333"); d.arc((650, 850, 950, 1050), 20, 160, fill="#B5523B", width=18)
d.rectangle((350, 1250, 1250, 2000), fill="#E9744F"); im.save(PHOTO, quality=90)

mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
errors = []
FAIL = "--fail" in sys.argv
mock.fail_upload = FAIL

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
        page.on("console", lambda m: errors.append(m.text[:200]) if m.type in ("error", "warning") and "ERR_FAILED" not in m.text else None)
        shot = lambda n, full=False: page.screenshot(path=f"{OUT}{n}.png", full_page=full)

        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(900)
        for sel in [".ks-best", ".sh-live", ".sh-gifts", ".ks-tips"]:
            if await page.locator(sel).count():
                await page.locator(sel).scroll_into_view_if_needed(); await page.wait_for_timeout(1200)
        await page.evaluate("window.scrollTo(0,0)"); await page.wait_for_timeout(300)
        await shot("home", True)
        print("cards:", await page.locator(".ks-card").count(), "| why:", await page.locator(".ks-why-c").count(), "| tips:", await page.locator(".ks-tip").count())
        print("announce:", await page.locator(".bar-announce").all_inner_texts())
        await page.click("[data-tip=read]"); await page.wait_for_timeout(500)
        await shot("tip")
        await page.click(".sheet [data-close-sheet].close"); await page.wait_for_timeout(300)

        # بطاقة القصة → صفحة القصة عند «بيانات التخصيص»
        await page.locator(".ks-card .ks-cta").nth(1).click(); await page.wait_for_timeout(1800)
        print("url:", unquote(page.url))
        await shot("pdp-form")
        await page.evaluate("window.scrollTo(0,0)"); await page.wait_for_timeout(300)
        await shot("pdp", True)

        # بدون بيانات: رسالة الخطأ
        await page.click("[data-sf=add]"); await page.wait_for_timeout(600)
        print("err1:", await page.locator("#sfErr").inner_text())
        await page.fill("#sfName", "مريم"); await page.wait_for_timeout(200)
        await page.click("[data-sf=add]"); await page.wait_for_timeout(500)
        print("err2:", await page.locator("#sfErr").inner_text())
        await page.click("[data-sf-g=f]"); await page.wait_for_timeout(300)
        await page.select_option("#sfAge", "5"); await page.wait_for_timeout(300)

        # رفع الصورة
        await page.set_input_files("#sfPhoto", PHOTO); await page.wait_for_timeout(2500)
        print("photo box:", (await page.locator("#sfPhotoF").inner_text()).replace("\n", " | ")[:160])
        print("uploads:", json.dumps(mock.photos, ensure_ascii=False))

        # خصّصها أكثر
        await page.click("#sfMore summary"); await page.wait_for_timeout(200)
        await page.click("[data-sf-like=draw]"); await page.click("[data-sf-like=animals]")
        await page.select_option("#sfLesson", "teeth")
        # مطبوعة + تغليف + إهداء
        await page.click("[data-sf-fmt=print]"); await page.wait_for_timeout(300)
        await page.check("[name=sf_wrap]"); await page.wait_for_timeout(200)
        await page.check("[name=sf_ded_on]"); await page.wait_for_timeout(300)
        await page.click("[data-sf-ded=d2]"); await page.wait_for_timeout(200)
        await page.fill("[name=sf_ded_from]", "ماما وبابا"); await page.wait_for_timeout(2600)
        print("ded quote:", await page.locator("#sfDedQ").inner_text())
        print("sum:", (await page.locator("#sfSum").inner_text()).replace("\n", " | "))
        await page.locator("#sfFields").scroll_into_view_if_needed()
        await page.locator("#personalize").evaluate("e=>e.scrollIntoView()"); await page.wait_for_timeout(300)
        await shot("form-1")
        await page.locator("#storyPrev").evaluate("e=>e.scrollIntoView({block:'center'})"); await page.wait_for_timeout(500)
        await shot("form-prev")
        await page.locator(".sf-ded").evaluate("e=>e.scrollIntoView({block:'center'})"); await page.wait_for_timeout(300)
        await shot("form-ded")
        await page.click("[data-sf=add]"); await page.wait_for_timeout(900)
        await shot("added")
        cart = await page.evaluate("JSON.parse(localStorage.getItem('huroof_cart_v2'))")
        print("cart:", json.dumps(cart, ensure_ascii=False))

        # الطلب
        await page.goto(BASE + "checkout/", wait_until="networkidle"); await page.wait_for_timeout(900)
        await page.fill("input[name=name]", "مريم سالم")
        await page.fill("input[name=phone]", "91234567")
        if await page.locator("textarea[name=address]").count():
            await page.fill("textarea[name=address]", "السيب، الحيل الشمالية، بيت 12")
        await shot("checkout", True)
        await page.click("#placeOrder"); await page.wait_for_timeout(1800)
        print("after order:", unquote(page.url))
        await shot("done", True)
        posted = mock.calls("POST", "/rest/v1/orders")
        if posted:
            o = posted[-1][3]
            print("ORDER items:", json.dumps(o["items"], ensure_ascii=False))
        wa = await page.evaluate("Array.from(document.querySelectorAll('a[href*=\"wa.me\"]')).map(a=>decodeURIComponent(a.href))")
        print("WA:\n", "\n---\n".join(x.split("text=")[-1] for x in wa[:2]))
        print("LAST:", await page.evaluate("(JSON.parse(localStorage.getItem('huroof_last_order')||'{}').message||'')"))

        # قصة ثانية: الصورة والاسم معبّأة مسبقاً
        await page.goto(BASE, wait_until="networkidle"); await page.wait_for_timeout(600)
        await page.locator(".ks-card .ks-cta").nth(0).click(); await page.wait_for_timeout(1500)
        print("prefill:", await page.locator("#sfName").input_value(), "| photo:", await page.locator(".sf-ph").count())
        await b.close()
    print("ERRORS:", errors)

asyncio.run(main())
