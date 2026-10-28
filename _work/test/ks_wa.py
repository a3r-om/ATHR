import asyncio, sys, json
from urllib.parse import unquote
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/test")
from mock import Mock, API
BASE = "http://127.0.0.1:8813/ATHR/huroof/"
mock = Mock("/home/claude/gen/seed.json", "/home/claude/gen/coupons.json")
async def router(route):
    u = route.request.url
    if u.startswith(API): return await mock.handle(route)
    if u.startswith("http://127.0.0.1"): return await route.continue_()
    return await route.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, locale="ar")
        await ctx.route("**/*", router)
        page = await ctx.new_page()
        await page.goto(BASE, wait_until="networkidle")
        await page.evaluate("""localStorage.setItem('huroof_cart_v2', JSON.stringify({items:[{id:'fa958620-42a9-5dd2-94e7-471ba3677506',qty:1,custom:{name:'مريم',g:'f',age:5,photo:true,likes:['draw'],lesson:'teeth',tier:'std',fmt:'pdf',ded_t:'d1',ded:'إلى مريم',ded_from:'ماما'}}],updated:Date.now()}))""")
        await page.goto(BASE + "checkout/", wait_until="networkidle"); await page.wait_for_timeout(800)
        await page.fill("input[name=name]", "مريم سالم"); await page.fill("input[name=phone]", "91234567")
        await page.click("#placeOrder"); await page.wait_for_timeout(1500)
        hrefs = await page.evaluate("Array.from(document.querySelectorAll('a[href*=\"wa.me\"], a[href*=\"whatsapp\"]')).map(a=>a.href)")
        for h in hrefs: print(unquote(h)[:900]); print("=====")
        print(await page.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('huroof_last_order')||'null'))"))
        await b.close()
asyncio.run(main())
