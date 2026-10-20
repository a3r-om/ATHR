#!/usr/bin/env python3
"""
حروف وألوان — مقاسات خط Amiri
خط Amiri يظهر أصغر من الخطوط العادية بنفس المقاس، فنكبّر كل مقاسات الخط في css/store.css
داخل القالب tpl-huroof فقط (بدون لمس القوالب الثانية).
الاستعمال: python3 tools/amiri-scale.py   (يعيد كتابة الجزء المولّد في آخر css/store.css)
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = ROOT / "css" / "store.css"
START = "/* ===== AMIRI-SCALE:START (مولّد تلقائياً — لا تعدّله يدوياً) ===== */"
END = "/* ===== AMIRI-SCALE:END ===== */"

def scale_px(n):
    n = float(n)
    f = 1.16 if n < 16 else 1.12 if n < 22 else 1.06
    v = round(n * f * 2) / 2
    return ("%g" % v) + "px"

def scale_value(val):
    return re.sub(r"(\d+(?:\.\d+)?)px", lambda m: scale_px(m.group(1)), val)

def prefix(sel):
    out = []
    for part in sel.split(","):
        p = part.strip()
        if not p or "tpl-" in p or p.startswith(":root") or p.startswith("@"):
            continue
        if p.startswith("html"):
            p = "html.tpl-huroof" + p[4:]
        else:
            p = "html.tpl-huroof " + p
        out.append(p)
    return ", ".join(out)

def rules(text):
    """يرجع [(media, selector, font-size)] من أعلى الملف ومن داخل @media."""
    res = []
    i = 0
    n = len(text)
    def parse_block(s, media):
        j = 0
        while j < len(s):
            if s.startswith("/*", j):
                k = s.find("*/", j)
                j = k + 2 if k >= 0 else len(s)
                continue
            b = s.find("{", j)
            if b < 0:
                break
            head = s[j:b].strip()
            # نهاية الكتلة المطابقة
            depth, k = 1, b + 1
            while k < len(s) and depth:
                if s[k] == "{": depth += 1
                elif s[k] == "}": depth -= 1
                k += 1
            body = s[b + 1:k - 1]
            if head.startswith("@media"):
                parse_block(body, head)
            elif head.startswith("@"):
                pass  # keyframes / supports / font-face
            else:
                for m in re.finditer(r"font-size\s*:\s*([^;}]+)", body):
                    val = m.group(1).strip()
                    if "px" in val and "var(" not in val:
                        res.append((media, head, val))
            j = k
    parse_block(text, None)
    return res

src = CSS.read_text(encoding="utf8")
TPL = "/* ===== HUROOF-TEMPLATE ===== */"
if START in src:
    src = src[:src.index(START)].rstrip() + "\n" + src[src.index(END) + len(END):].lstrip("\n")
# القالب اليدوي يبقى بعد المقاسات المولّدة حتى تغلب مقاساته
tail = ""
if TPL in src:
    tail = src[src.index(TPL):]
    src = src[:src.index(TPL)].rstrip() + "\n"
found = rules(re.sub(r"/\*.*?\*/", "", src, flags=re.S))
blocks = {}
for media, sel, val in found:
    ps = prefix(sel)
    if not ps:
        continue
    blocks.setdefault(media, []).append(f"{ps} {{ font-size: {scale_value(val)}; }}")
out = [START]
for media, lines in blocks.items():
    if media:
        out.append(media + " {")
        out += ["    " + l for l in lines]
        out.append("}")
    else:
        out += lines
out.append(END)
CSS.write_text(src + "\n" + "\n".join(out) + "\n\n" + tail, encoding="utf8")
print(f"✓ {sum(len(v) for v in blocks.values())} مقاس خط في {len(blocks)} كتلة")
