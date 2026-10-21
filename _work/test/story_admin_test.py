import asyncio, sys, json, base64, shutil
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
BASE = "http://127.0.0.1:8813/ATHR/huroof/"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
mock.user["user_metadata"]["must_change_password"] = False
pid = [p for p in mock.db["products"] if p.get("story") == "turtle"][0]["id"]
mock.db["orders"].append({"id": "o-1", "order_no": "HW-55501", "source": "web", "customer_name": "مريم سالم", "phone": "91234567", "country": "OM",
    "status": "new", "hidden": False, "ordered_at": "2026-10-21T02:00:00Z", "created_at": "2026-10-21T02:00:00Z", "payment_type": "bank", "payment_name": "تحويل بنكي",
    "delivery_name": "استلام الملفات على واتساب", "delivery_type": "digital", "delivery_price": 0, "subtotal": 2, "discount": 0, "total": 2,
    "items": [{"id": pid, "name": "قصة باسم طفلك: السلحفاة الصغيرة", "label": "قصة باسم طفلك: السلحفاة الصغيرة", "qty": 1, "price": 2, "total": 2,
               "custom": {"name": "ريم", "g": "f", "age": 4, "ded": "إلى حبيبتنا ريم، من ماما وبابا", "photo": True}}]})
async def router(route):
    u = route.request.url
    if u.startswith(API): return await mock.handle(route)
    if u.startswith("http://127.0.0.1"): return await route.continue_()
    return await route.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1.5, is_mobile=True, has_touch=True, accept_downloads=True)
        await ctx.route("**/*", router)
        page = await ctx.new_page()
        errs = []; page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append(m.text[:200]) if m.type == "error" and "ERR_FAILED" not in m.text else None)
        await page.goto(BASE + "#orders", wait_until="networkidle"); await page.wait_for_timeout(1200)
        if await page.locator("#loginEmail").count():
            await page.fill("#loginEmail", "o@e.com"); await page.fill("#loginPass", "x12345678"); await page.click("#loginBtn")
            await page.wait_for_timeout(2500)
        print("hash:", await page.evaluate("location.hash"))
        blk = page.locator(".oc-story").first
        print("story blocks:", await page.locator(".oc-story").count())
        if await blk.count():
            await blk.scroll_into_view_if_needed(); await page.wait_for_timeout(300)
            await page.locator("article.oc").first.screenshot(path="/home/claude/shots/sa-order.png")
            await page.click("[data-story-make]"); await page.wait_for_timeout(2500)
            await page.screenshot(path="/home/claude/shots/sa-maker.png")
            await page.set_input_files("#smPhoto", "/home/claude/test/fake_photo.jpg"); await page.wait_for_timeout(1500)
            print("photo:", await page.inner_text("#smPhotoName"))
            await page.click("[data-sm=make]"); await page.wait_for_timeout(5000)
            print("ready:", await page.inner_text("#smActions"))
            await page.screenshot(path="/home/claude/shots/sa-ready.png", full_page=False)
            async with page.expect_download() as dl:
                await page.click("#smActions a[download]")
            d = await dl.value
            await d.save_as("/home/claude/shots/story/admin.pdf")
            print("downloaded:", d.suggested_filename)
        # footer maker
        await page.click("#admSheet .adm-sheet-head [data-a=orders-sheet-close]")
        await page.click("[data-a=story-maker]"); await page.wait_for_timeout(1500)
        print("standalone story options:", await page.eval_on_selector_all("#smStory option", "e=>e.map(x=>x.textContent)"))
        # product editor
        await b.close()
    print("errors:", errs)
asyncio.run(main())
