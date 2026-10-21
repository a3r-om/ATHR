import asyncio, subprocess, time, json
from playwright.async_api import async_playwright
ROOT="/home/claude/huroof"; PORT=8834
async def main():
    srv = subprocess.Popen(["python3","-m","http.server",str(PORT),"--bind","127.0.0.1"],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b=await p.chromium.launch(); page=await b.new_page()
            await page.goto(f"http://127.0.0.1:{PORT}/_story_test.html")
            res=await page.evaluate("""() => {
              const S=window.HUROOF_STORIES, out=[];
              for (const g of ['m','f']) for (const [id,fn] of Object.entries(S._scenes)) {
                const d={name:'محمد',g,age:6,ded:''};
                let sc; try { sc=fn(d,{photo:false,story:S.STORIES.letters}); } catch(e){ out.push([id,g,'THROW '+e.message]); continue; }
                const doc=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${sc.svg}</svg>`,'image/svg+xml');
                const err=doc.querySelector('parsererror');
                if(err) out.push([id,g,err.textContent.slice(0,200)]);
                if(/NaN|undefined/.test(sc.svg)) out.push([id,g,'NaN/undefined: '+(sc.svg.match(/.{40}(NaN|undefined).{20}/)||[''])[0]]);
              }
              return out;
            }""")
            for r in res: print(r)
            print("checked")
            await b.close()
    finally: srv.terminate()
asyncio.run(main())
