import asyncio, json, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API

BASE = "http://127.0.0.1:8811/huroof/"
SHOT = "/home/claude/shots/a-"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
# طلب سابق في الدفتر
mock.db["orders"].append({"id": "o1", "order_no": "HW-12001", "created_at": "2026-10-19T09:00:00Z", "ordered_at": "2026-10-19T09:00:00Z", "source": "web", "country": "OM",
    "customer_name": "فاطمة علي", "phone": "92223334", "delivery_name": "استلام الملفات على واتساب", "delivery_type": "digital", "delivery_price": 0,
    "payment_name": "تحويل بنكي", "payment_type": "bank", "items": [{"id": mock.db["products"][0]["id"], "name": "حروف عربية للتلوين", "label": "حروف عربية للتلوين", "qty": 1, "price": 1, "total": 1}],
    "subtotal": 1, "discount": 0, "total": 1, "status": "new", "hidden": False, "gift": False, "coupon": None, "coupon_discount": 0, "channel": "direct"})
errors = []

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
        page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))
        page.on("console", lambda m: errors.append(f"{m.type}: {m.text[:220]}") if m.type == "error" and "Failed to load resource" not in m.text else None)
        async def shot(n, full=False):
            await page.wait_for_timeout(600)
            await page.screenshot(path=f"{SHOT}{n}.png", full_page=full)

        await page.goto(BASE + "#admin", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await shot("login")
        await page.fill("#loginEmail", "owner@example.com")
        await page.fill("#loginPass", "temp-pass-123")
        await page.click("#loginBtn")
        await page.wait_for_timeout(2500)
        await shot("first-login")
        # كلمة مرور جديدة
        if await page.locator("#newPassword").count():
            await page.fill("#newPassword", "MyNewPass-2026")
            await page.fill("#confirmPassword", "MyNewPass-2026")
            await page.click("#savePassword")
            await page.wait_for_timeout(800)
            print("password msg:", await page.text_content("#passwordMsg"))
            print("user meta after:", mock.user["user_metadata"])
            await page.wait_for_timeout(1500)
            print("sheet closed:", await page.locator("#passwordForm").count() == 0)
        await shot("home", full=True)
        tabs = await page.evaluate("Array.from(document.querySelectorAll('.adm-grid [data-tab]')).map(b=>b.dataset.tab)")
        print("tabs:", tabs)
        for t in ["products", "order", "look", "templates", "texts", "sales", "gift", "contact"]:
            await page.click(f".adm-grid [data-tab={t}]") if await page.locator(f".adm-grid [data-tab={t}]").count() else await page.click(f"[data-tab={t}]")
            await page.wait_for_timeout(800)
            await shot("tab-" + t, full=True)
            # back to home
            if await page.locator(".adm-back").count():
                await page.click(".adm-back")
                await page.wait_for_timeout(400)
        # تعديل سعر أول منتج ثم نشر
        await page.click(".adm-grid [data-tab=products]")
        await page.wait_for_timeout(800)
        html = await page.evaluate("document.querySelector('#adm').innerText.slice(0,1500)")
        print("products tab text:", html[:700].replace("\n", " | "))
        await b.close()
    print("\nERRORS:", len(errors))
    for e in errors[:20]: print(" ", e)
    print("calls:", [(c[0], c[1]) for c in mock.log if "/rest/" in c[1] or "/auth/" in c[1]][:40])

asyncio.run(main())
