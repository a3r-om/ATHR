import asyncio, sys, base64, json, os, subprocess, time
from playwright.async_api import async_playwright
from PIL import Image

ROOT = "/home/claude/storytest"
PORT = 8833
OUT = "/home/claude/shots/story"
stories = sys.argv[1].split(",") if len(sys.argv) > 1 else ["letters", "space", "school", "turtle"]
genders = sys.argv[2].split(",") if len(sys.argv) > 2 else ["m", "f"]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 560
only = sys.argv[4].split(",") if len(sys.argv) > 4 and sys.argv[4] else None

HTML = """<!doctype html><html><head><meta charset="utf-8"></head><body><script src="/js/stories.js"></script></body></html>"""
pass

async def main():
    srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    errors = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            page = await b.new_page()
            page.on("console", lambda m: errors.append(m.text) if m.type in ("error", "warning") else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto(f"http://127.0.0.1:{PORT}/_story_test.html")
            for st in stories:
                for g in genders:
                    name = {"m": "محمد", "f": "ريم"}[g] if g in "mf" else g
                    data = {"name": "عبد الله" if g == "m" and "--long" in sys.argv else name, "g": g, "age": 6, "ded": ""}
                    urls = await page.evaluate("""async ([st, data, width, only]) => {
                        const S = window.HUROOF_STORIES;
                        const pages = S.bookPages(st);
                        const out = [];
                        for (let i = 0; i < pages.length; i++) {
                            if (only && !only.includes(String(i))) continue;
                            const c = await S.renderPage(st, data, pages[i], { width });
                            out.push([i, c.toDataURL("image/jpeg", 0.85)]);
                        }
                        return out;
                    }""", [st, data, width, only])
                    imgs = []
                    for i, u in urls:
                        fn = f"{OUT}/{st}-{g}-{i:02d}.jpg"
                        open(fn, "wb").write(base64.b64decode(u.split(",")[1]))
                        imgs.append(Image.open(fn))
                    # contact sheet
                    if imgs:
                        cols = 7 if len(imgs) > 7 else len(imgs)
                        rows = (len(imgs) + cols - 1) // cols
                        w, h = imgs[0].size
                        sheet = Image.new("RGB", (cols * w + (cols + 1) * 10, rows * h + (rows + 1) * 10), (90, 90, 90))
                        for k, im in enumerate(imgs):
                            sheet.paste(im, (10 + (k % cols) * (w + 10), 10 + (k // cols) * (h + 10)))
                        sheet.save(f"{OUT}/sheet-{st}-{g}.jpg", quality=80)
                        print("sheet", st, g, len(imgs))
            await b.close()
    finally:
        srv.terminate()
    print("ERRORS:", errors[:10])

asyncio.run(main())
