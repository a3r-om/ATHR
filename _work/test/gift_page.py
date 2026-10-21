import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
mock = Mock("/home/claude/gen/seed.json")
async def router(route):
    u = route.request.url
    if u.startswith(API): return await mock.handle(route)
    if u.startswith("http://127.0.0.1"): return await route.continue_()
    return await route.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1.5, is_mobile=True)
        await ctx.route("**/*", router)
        page = await ctx.new_page()
        await page.goto("http://127.0.0.1:8811/huroof/", wait_until="networkidle")
        code = await page.evaluate("ATHR.giftCode({to:'سارة', from:'مريم', msg:'كل عام وأنتِ بخير، هذه ملفات تلوين لك 🎨', occasion:'birthday', gender:'girl'})")
        await page.goto("http://127.0.0.1:8811/huroof/gift/?c=" + code, wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="/home/claude/shots/g-closed.png")
        await page.click(".gx-cta", force=True)
        await page.wait_for_timeout(2500)
        await page.screenshot(path="/home/claude/shots/g-open.png")
        await b.close()
asyncio.run(main())
