# حالة رسومات Canva: أرقام الصور المرجعية والصفحات
import json, sys, os
F = "/home/claude/gen/art3d/canva.json"
def load():
    return json.load(open(F)) if os.path.exists(F) else {"refs": {"astro/m": "MAHYnrthL9o", "astro/f": "MAHYnrhS490", "astro/side": "MAHYnk1AG3Q"}, "pages": {"astro/m/cover": "MAHYnqVqtdg", "astro/m/p1": "MAHYnoCT7_s", "astro/m/p2": "MAHYnizTw8g", "astro/m/p3": "MAHYnjeXuEo"}, "jobs": {}}
def save(s): json.dump(s, open(F, "w"), ensure_ascii=False, indent=1)
if __name__ == "__main__":
    s = load(); save(s); print(json.dumps(s, ensure_ascii=False, indent=1))
