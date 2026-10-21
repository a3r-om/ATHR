import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
async def router(route):
    u = route.request.url
    if u.startswith(API): return await mock.handle(route)
    if u.startswith("http://127.0.0.1"): return await route.continue_()
    return await route.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={"width":390,"height":844})
        await ctx.route("**/*", router)
        page = await ctx.new_page()
        bad=set()
        page.on("response", lambda r: bad.add((r.status, r.url)) if r.status >= 400 else None)
        page.on("requestfailed", lambda r: bad.add(("FAIL", r.url[:120])))
        for path in ["", "cart/", "checkout/", "points/"]:
            await page.goto("http://127.0.0.1:8811/huroof/"+path, wait_until="networkidle")
        for x in sorted(bad, key=str): print(x)
        await b.close()
asyncio.run(main())
