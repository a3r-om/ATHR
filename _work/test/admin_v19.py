import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
BASE = "http://127.0.0.1:8813/ATHR/huroof/"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
mock.user["user_metadata"]["must_change_password"] = False
pid = [p for p in mock.db["products"] if p.get("story") == "space"][0]["id"]
mock.db["orders"].append({"id": "o-2", "order_no": "HW-75579", "source": "web", "customer_name": "مريم سالم", "phone": "91234567", "country": "OM",
    "status": "new", "hidden": False, "ordered_at": "2026-10-27T20:00:00Z", "created_at": "2026-10-27T20:00:00Z", "payment_type": "bank", "payment_name": "تحويل بنكي",
    "delivery_name": "توصيل القصة المطبوعة", "delivery_type": "home", "delivery_price": 2, "address": "السيب، الحيل الشمالية، بيت 12", "subtotal": 13, "discount": 0, "total": 15,
    "items": [{"id": pid, "name": "قصة باسم طفلك: رحلة إلى الفضاء", "label": "قصة باسم طفلك: رحلة إلى الفضاء", "qty": 1, "price": 13, "total": 13,
               "custom": {"name": "سارة", "g": "f", "age": 6, "photo": True, "likes": ["draw", "football"], "lesson": "teeth", "tier": "pro", "fmt": "print", "family": "ماما مريم، بابا خالد، أختها لين", "friend": "ريم", "note": "تحب الفراشات", "hijab": True}}]})
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
        await page.goto(BASE + "#orders", wait_until="networkidle"); await page.wait_for_timeout(1200)
        if await page.locator("#loginEmail").count():
            await page.fill("#loginEmail", "o@e.com"); await page.fill("#loginPass", "x12345678"); await page.click("#loginBtn")
            await page.wait_for_timeout(2500)
        art = page.locator("article.oc").first
        await art.scroll_into_view_if_needed(); await art.screenshot(path="/home/claude/shots/a19-order.png")
        print("order text:", (await page.locator(".oc-story").first.inner_text()).replace("\n", " | "))
        await page.click("[data-story-make]"); await page.wait_for_timeout(2000)
        await page.screenshot(path="/home/claude/shots/a19-maker.png")
        print("maker notes:", await page.locator(".sm-pro, .sm-print").all_inner_texts())
        await page.click(".adm-sheet-head button") if await page.locator(".adm-sheet-head button").count() else None
        await page.goto(BASE + "#admin", wait_until="networkidle"); await page.wait_for_timeout(1500)
        t = page.locator(".adm-grid [data-tab=sales]")
        if await t.count(): await t.click()
        else: await page.click("[data-tab=sales]")
        await page.wait_for_timeout(800)
        card = page.locator(".adm-card, section").filter(has_text="القصص: المميّزة والمطبوعة").first
        print("stories card:", await card.count())
        if await card.count():
            await card.scroll_into_view_if_needed(); await card.screenshot(path="/home/claude/shots/a19-settings.png")
        print("errors:", errs)
        await b.close()
asyncio.run(main())
