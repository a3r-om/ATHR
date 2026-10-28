import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
BASE = "http://127.0.0.1:8813/ATHR/huroof/"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
mock.user["user_metadata"]["must_change_password"] = False
mock.photo_bytes = open("/tmp/claude-0/-home-claude/f8f16bbd-fb86-5b0f-ab89-39a21cbeece6/scratchpad/kid.jpg", "rb").read()
PATH = "20261027/0af805fd-52bc-47ef-a79c-64a638e1f0ae.jpg"
mock.photos[PATH] = {"size": 1, "at": 0}
mock.clean_list = ["20261001/11111111-2222-4333-8444-555555555555.jpg"]
mock.photos[mock.clean_list[0]] = {"size": 1, "at": 0}
pid = [p for p in mock.db["products"] if p.get("story") == "letters"][0]["id"]
mock.db["orders"].append({"id": "o-3", "order_no": "HW-10021", "source": "web", "customer_name": "مريم سالم", "phone": "91234567", "country": "OM",
    "status": "new", "hidden": False, "ordered_at": "2026-10-27T20:00:00Z", "created_at": "2026-10-27T20:00:00Z", "payment_type": "bank", "payment_name": "تحويل بنكي",
    "delivery_name": "توصيل القصة المطبوعة", "delivery_type": "home", "delivery_price": 2, "address": "السيب", "subtotal": 8, "discount": 0, "total": 10,
    "items": [{"id": pid, "name": "قصة باسم طفلك: حديقة الحروف", "label": "قصة باسم طفلك: حديقة الحروف", "qty": 1, "price": 8, "total": 8,
               "custom": {"name": "سارة", "g": "f", "age": 6, "photo": True, "photo_path": PATH, "likes": ["draw"], "lesson": "teeth", "tier": "std", "fmt": "print", "wrap": True,
                          "ded_t": "d1", "ded": "إلى بطلتنا الصغيرة سارة: كتبنا هذه القصة لأجلك، فأنت أجمل حكاية في حياتنا. نحبك كثيراً.", "ded_from": "ماما وبابا"}}]})
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
        page.on("console", lambda m: errs.append(m.text[:200]) if m.type in ("error", "warning") else None)
        page.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
        await page.goto(BASE + "#orders", wait_until="networkidle"); await page.wait_for_timeout(1200)
        if await page.locator("#loginEmail").count():
            await page.fill("#loginEmail", "o@e.com"); await page.fill("#loginPass", "x12345678"); await page.click("#loginBtn")
            await page.wait_for_timeout(2500)
        art = page.locator("article.oc").first
        await art.scroll_into_view_if_needed(); await art.screenshot(path="/home/claude/shots/a21-order.png")
        print("order text:", (await page.locator(".oc-story").first.inner_text()).replace("\n", " | "))
        await page.wait_for_timeout(4500)
        print("cleanup deleted:", mock.deleted_photos)
        await page.click("[data-photo-view]"); await page.wait_for_timeout(1500)
        await page.screenshot(path="/home/claude/shots/a21-photo.png")
        print("photo img:", await page.locator("#phImg img").count(), "| down:", (await page.locator("#phDown").get_attribute("href"))[:90])
        await page.click("#phDel"); await page.wait_for_timeout(800)
        print("deleted after button:", mock.deleted_photos)
        mock.photos[PATH] = {"size": 1, "at": 0}
        await page.click("[data-story-make]"); await page.wait_for_timeout(3000)
        await page.screenshot(path="/home/claude/shots/a21-maker.png")
        print("maker:", await page.locator("#smPhotoName").inner_text(), "|", await page.locator(".sm-body .adm-muted, .sm-print").all_inner_texts())
        await page.click("[data-sm=make]"); await page.wait_for_timeout(9000)
        print("ready:", await page.locator(".sm-ready").all_inner_texts())
        await page.goto(BASE + "#admin", wait_until="networkidle"); await page.wait_for_timeout(1500)
        t = page.locator(".adm-grid [data-tab=sales]")
        if await t.count(): await t.click()
        else: await page.click("[data-tab=sales]")
        await page.wait_for_timeout(800)
        card = page.locator(".adm-card, section").filter(has_text="القصص: المؤلفة خصيصاً والمطبوعة").first
        if await card.count():
            await card.scroll_into_view_if_needed(); await card.screenshot(path="/home/claude/shots/a21-settings.png")
        print("errors:", errs)
        await b.close()
asyncio.run(main())
