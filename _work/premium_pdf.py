# يصنع ملف القصة المؤلفة خصيصاً (PDF) من رسومات الطفل ونص القصة
# usage: python3 premium_pdf.py ORDER.json OUT.pdf
# ORDER.json: {"story":"space","art":"/abs/dir/with/{m|f}/key.jpg","custom":{...},"pages":[["p1","right","..."],...]}
# art dir layout: <art>/space/<m|f>/{cover,p1..p10,end,color}.jpg  (نفس ترتيب images/stories)
import asyncio, base64, json, os, subprocess, sys, time, shutil, tempfile
from playwright.async_api import async_playwright
spec = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]
root = tempfile.mkdtemp(prefix="premium-")
for d in ("js", "fonts"): os.symlink(f"/home/claude/huroof/{d}", f"{root}/{d}")
os.symlink(spec["art"], f"{root}/art")
open(f"{root}/index.html", "w").write('<!doctype html><meta charset="utf-8"><script src="/js/defaults.js"></script><script src="/js/stories.js"></script>')
PORT = 8851
async def main():
    srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); page = await b.new_page(); errs = []
            page.on("pageerror", lambda e: errs.append(str(e)))
            await page.goto(f"http://127.0.0.1:{PORT}/index.html")
            data = await page.evaluate("""async ([story, custom, pages]) => {
                window.HUROOF_ART_BASE = '/art/';
                const S = window.HUROOF_STORIES; const st = S.get(story);
                if (pages && pages.length && st.book) st.book.pages = pages;
                if (st.book) st.book.ready = true;
                const blob = await S.buildPDF(story, custom, { quality: 0.9 });
                const buf = new Uint8Array(await blob.arrayBuffer()); let s = '';
                for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
                return [btoa(s), S.fileName(story, custom), S.bookPages(story).length];
            }""", [spec["story"], spec["custom"], spec.get("pages")])
            open(out, "wb").write(base64.b64decode(data[0]))
            print("ok", out, data[1], data[2], "pages", "errors:", errs)
            await b.close()
    finally:
        srv.terminate(); shutil.rmtree(root, ignore_errors=True)
asyncio.run(main())
