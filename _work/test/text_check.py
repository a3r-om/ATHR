import asyncio, subprocess, time
from playwright.async_api import async_playwright
async def main():
    srv = subprocess.Popen(["python3","-m","http.server","8837","--bind","127.0.0.1"],cwd="/home/claude/storytest",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(); page=await b.new_page()
            await page.goto("http://127.0.0.1:8837/_story_test.html")
            out=await page.evaluate("""() => { const S=window.HUROOF_STORIES, res=[];
              for (const g of ['m','f']) for (const st of Object.values(S.STORIES)) st.pages.forEach(([sc,t],i)=>{
                const x=S.fill(t,{name:g==='f'?'ريم':'حمد',g,age:g==='f'?4:11,ded:''});
                if (/[\\[\\]{}|]/.test(x)) res.push('LEFTOVER '+st.id+i+': '+x);
                if (g==='f') res.push(st.id+' '+(i+1)+': '+x);
              }); return res; }""")
            print("\n".join(out))
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
