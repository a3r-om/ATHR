import sys, os
from PIL import Image, ImageDraw, ImageFont
raw, story, out = sys.argv[1], sys.argv[2], sys.argv[3]
order = ['cover'] + [f'p{i}' for i in range(1, 11)] + ['end', 'color']
W, H = 300, 200
sheet = Image.new('RGB', (W * 13, (H + 24) * 2), 'white')
d = ImageDraw.Draw(sheet)
for r, g in enumerate('mf'):
    for c, k in enumerate(order):
        p = os.path.join(raw, f'{story}__{g}__{k}.png')
        im = Image.open(p).convert('RGB').resize((W, H))
        sheet.paste(im, (c * W, r * (H + 24) + 24))
        d.text((c * W + 5, r * (H + 24) + 5), f'{g}/{k}', fill='black')
sheet.save(out, quality=85)
