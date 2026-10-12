"""يحوّل تصاميم HTML إلى صور كاروسيل أو فيديو ريلز.

كاروسيل:  python3 marketing/kit/render.py carousel <file.html> <out_dir>
    كل عنصر .slide في الصفحة = صورة JPG بمقاس 1080×1350 (01.jpg، 02.jpg، ...)

معاينة:   python3 marketing/kit/render.py frames <file.html> <sheet.jpg> 0.5,2,4,8

ريلز:     python3 marketing/kit/render.py reel <file.html> <out.mp4>
    الصفحة فيها عنصر .reel (1080×1920) ودالة window.render(t) تضبط شكل كل لحظة t بالثواني،
    و window.DURATION بالثواني. نصوّر كل إطار (30 في الثانية) ونجمعها بـ ffmpeg في MP4 بدون صوت
    (الصوت يُضاف من إنستغرام: صوت رائج يرفع الوصول). ويُحفظ غلاف الريلز cover.jpg بجانب الفيديو.
"""
import os
import subprocess
import sys
from playwright.sync_api import sync_playwright

FPS = 30


def carousel(html, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=1)
        page.goto("file://" + os.path.abspath(html))
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(500)
        slides = page.locator(".slide")
        n = slides.count()
        for i in range(n):
            path = os.path.join(out_dir, f"{i + 1:02d}.jpg")
            slides.nth(i).screenshot(path=path, type="jpeg", quality=93)
            print(path)
        b.close()


def reel(html, out_mp4):
    os.makedirs(os.path.dirname(os.path.abspath(out_mp4)), exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
        page.goto("file://" + os.path.abspath(html))
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(600)
        duration = float(page.evaluate("window.DURATION || 10"))
        cover_t = float(page.evaluate("window.COVER_T || 0"))
        frames = int(round(duration * FPS))
        ff = subprocess.Popen([
            "ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "medium", "-profile:v", "high",
            "-movflags", "+faststart", out_mp4
        ], stdin=subprocess.PIPE)
        el = page.locator(".reel").first
        for f in range(frames):
            page.evaluate(f"window.render({f / FPS})")
            ff.stdin.write(el.screenshot(type="jpeg", quality=92))
        ff.stdin.close()
        ff.wait()
        page.evaluate(f"window.render({cover_t})")
        el.screenshot(path=os.path.splitext(out_mp4)[0] + "-cover.jpg", type="jpeg", quality=93)
        b.close()
    print(out_mp4, f"{duration}s", f"{os.path.getsize(out_mp4) / 1e6:.1f}MB")


def frames(html, out_jpg, times):
    """معاينة سريعة للريلز: لقطات عند أوقات محددة في صورة واحدة"""
    from PIL import Image
    import io
    shots = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
        page.goto("file://" + os.path.abspath(html))
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(600)
        el = page.locator(".reel").first
        for t in times:
            page.evaluate(f"window.render({t})")
            shots.append(Image.open(io.BytesIO(el.screenshot(type="jpeg", quality=85))).resize((270, 480)))
        b.close()
    sheet = Image.new("RGB", (280 * len(shots), 480), "white")
    for i, im in enumerate(shots):
        sheet.paste(im, (i * 280, 0))
    sheet.save(out_jpg, quality=85)
    print(out_jpg)


if __name__ == "__main__":
    kind, src, out = sys.argv[1:4]
    if kind == "frames":
        frames(src, out, [float(x) for x in sys.argv[4].split(",")])
    else:
        (carousel if kind == "carousel" else reel)(src, out)
