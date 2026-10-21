import asyncio, subprocess, time, base64, sys
from playwright.async_api import async_playwright
ROOT="/home/claude/huroof"; PORT=8835
async def main():
    import shutil; shutil.copy("/home/claude/test/fake_photo.jpg", ROOT + "/_fake_photo.jpg")
    srv = subprocess.Popen(["python3","-m","http.server",str(PORT),"--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(); page=await b.new_page()
            errs=[]; page.on("pageerror", lambda e: errs.append(str(e)))
            await page.goto(f"http://127.0.0.1:{PORT}/_story_test.html")
            t0=time.time()
            res=await page.evaluate("""async () => {
              const S=window.HUROOF_STORIES;
              const blob=await (await fetch('/_fake_photo.jpg')).blob();
              const photo=await S.readPhoto(blob);
              const prog=[];
              const pdf=await S.buildPDF('school',{name:'عبد الله',g:'m',age:7,ded:'إلى بطلنا عبد الله في أول يوم مدرسة، من ماما وبابا'}, {photo, onProgress:(i,n)=>prog.push(i)});
              const buf=new Uint8Array(await pdf.arrayBuffer());
              let bin=''; for (let i=0;i<buf.length;i+=32768) bin+=String.fromCharCode.apply(null, buf.subarray(i,i+32768));
              return {b64:btoa(bin), size:buf.length, prog:prog.length, name:S.fileName('school',{name:'عبد الله',g:'m'})};
            }""")
            print("time", round(time.time()-t0,1), "s size", res["size"], "progress", res["prog"], "file", res["name"], errs)
            open("/home/claude/shots/story/test.pdf","wb").write(base64.b64decode(res["b64"]))
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
