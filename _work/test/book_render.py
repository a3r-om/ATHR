import asyncio, subprocess, time, base64, sys
from playwright.async_api import async_playwright
from PIL import Image
ROOT="/home/claude/storytest"; PORT=8838; OUT="/home/claude/shots/book"
g = sys.argv[1] if len(sys.argv)>1 else "m"; name = sys.argv[2] if len(sys.argv)>2 else "محمد"
width = int(sys.argv[3]) if len(sys.argv)>3 else 900
async def main():
    import os; os.makedirs(OUT, exist_ok=True)
    srv=subprocess.Popen(["python3","-m","http.server",str(PORT),"--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(); page=await b.new_page(); errs=[]
            page.on("pageerror", lambda e: errs.append(str(e)))
            await page.goto(f"http://127.0.0.1:{PORT}/_story_test.html")
            urls=await page.evaluate("""async ([g,name,width]) => { window.HUROOF_ART_BASE='/placeholder/'; const S=window.HUROOF_STORIES; S.get('space').book.ready=true;
                const pages=S.bookPages('space'); const out=[];
                for (let i=0;i<pages.length;i++){ const c=await S.renderPage('space',{name,g,age:6},pages[i],{width}); out.push(c.toDataURL('image/jpeg',.85)); }
                return out; }""", [g,name,width])
            ims=[]
            for i,u in enumerate(urls):
                fn=f"{OUT}/{g}-{i:02d}.jpg"; open(fn,"wb").write(base64.b64decode(u.split(",")[1])); ims.append(Image.open(fn))
            w,h=ims[0].size; cols=4; rows=(len(ims)+cols-1)//cols
            sheet=Image.new("RGB",(cols*(w+12)+12,rows*(h+12)+12),(70,70,70))
            for k,im in enumerate(ims): sheet.paste(im,(12+(k%cols)*(w+12),12+(k//cols)*(h+12)))
            sheet.save(f"{OUT}/sheet-{g}.jpg",quality=80); print("pages",len(ims),"errors",errs)
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
