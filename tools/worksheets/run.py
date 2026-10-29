import sys, asyncio, base64, subprocess, time, json, os
from playwright.async_api import async_playwright
# usage: run.py <book> <outdir> [pageIndexCSV]
book, outdir = sys.argv[1], sys.argv[2]
only = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else None
os.makedirs(outdir, exist_ok=True)
srv = subprocess.Popen(["python3","-m","http.server","8841","--directory","/home/claude"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
HTML = """<!doctype html><meta charset=utf-8><body><canvas id=c width=1240 height=1754></canvas>"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        pg.on("console", lambda m: print("console:", m.text) if m.type in ("error",) else None)
        pg.on("pageerror", lambda e: print("PAGEERR", e))
        await pg.goto("http://127.0.0.1:8841/gen/ws/blank.html")
        await pg.evaluate("""async()=>{for (const [f,w] of [['amiri-regular',400],['amiri-bold',700]]){const face=new FontFace('HWS','url(/huroof/fonts/'+f+'.woff) format("woff")',{weight:String(w)});await face.load();document.fonts.add(face);} }""")
        for f in ["lib.js","books.js","kids.js"]:
            await pg.add_script_tag(url=f"http://127.0.0.1:8841/gen/ws/{f}")
        n = await pg.evaluate(f"WSB.count({json.dumps(book)})")
        print("pages", n)
        for i in range(n):
            if only and i not in only: continue
            data = await pg.evaluate("""async([bk,i])=>{const cv=document.getElementById('c');const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);await WSB.draw(bk,i,c);return cv.toDataURL('image/jpeg',0.9).split(',')[1];}""",[book,i])
            open(f"{outdir}/{i:02d}.jpg","wb").write(base64.b64decode(data))
        await b.close()
asyncio.run(main())
srv.terminate()
