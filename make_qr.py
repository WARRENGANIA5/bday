"""
Make a pink heart-shaped QR code that opens the birthday website.

    python make_qr.py https://your-site.vercel.app

Writes  qr_heart.png  (needs:  pip install qrcode pillow)
The real QR sits in the middle of the heart with a clean border around it;
the rest of the heart is decorative dots, so phones still scan it easily.
"""

import random
import sys

import qrcode
from PIL import Image, ImageDraw, ImageFont

PINK = (232, 79, 140)
BG = (255, 240, 246)


def in_heart(x, y):
    # classic heart curve, x/y roughly in [-1.3, 1.3]
    return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0


def make(url, out="qr_heart.png", cell=24, title="Happy birthday!! 🎂", note="Open when alone"):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=0)
    qr.add_data(url)
    qr.make(fit=True)
    m = qr.get_matrix()
    n = len(m)

    quiet = 2                             # clean border around the real QR
    rnd = random.Random(1114)

    def heart_mask(grid):
        mask = [[False] * grid for _ in range(grid)]
        for gy in range(grid):
            for gx in range(grid):
                hx = (gx + .5 - grid / 2) / (grid / 2) * 1.2
                hy = -((gy + .5 - grid * .42) / (grid / 2) * 1.2)
                mask[gy][gx] = in_heart(hx, hy)
        return mask

    # grow the heart until the whole QR (plus its clean border) fits inside it
    side = n + 2 * quiet
    grid = n + 8
    while True:
        mask = heart_mask(grid)
        ox = (grid - n) // 2
        fits = [oy for oy in range(quiet, grid - n - quiet)
                if all(mask[y][x] for y in range(oy - quiet, oy - quiet + side) for x in range(ox - quiet, ox - quiet + side))]
        if fits:
            oy = fits[len(fits) // 2]
            break
        grid += 2

    filled = [[False] * grid for _ in range(grid)]
    for gy in range(grid):
        for gx in range(grid):
            if not mask[gy][gx]:
                continue
            qx, qy = gx - ox, gy - oy
            if -quiet <= qx < n + quiet and -quiet <= qy < n + quiet:
                filled[gy][gx] = 0 <= qx < n and 0 <= qy < n and m[qy][qx]
            else:
                filled[gy][gx] = rnd.random() < .5
    # trim empty rows at the top/bottom of the heart
    rows = [y for y in range(grid) if any(mask[y])]
    y0, y1 = rows[0], rows[-1] + 1

    pad = cell * 3
    top = 140
    W = grid * cell + pad * 2
    H = (y1 - y0) * cell + pad * 2 + top + 90
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    def finder(x, y):
        # rounded finder pattern so the corners look cute but still scan
        X, Y = pad + x * cell, top + pad + (y - y0) * cell
        d.rounded_rectangle([X, Y, X + 7 * cell - 1, Y + 7 * cell - 1], radius=cell * .6, fill=PINK)
        d.rounded_rectangle([X + cell, Y + cell, X + 6 * cell - 1, Y + 6 * cell - 1], radius=cell * .4, fill=BG)
        d.rounded_rectangle([X + 2 * cell, Y + 2 * cell, X + 5 * cell - 1, Y + 5 * cell - 1], radius=cell * .4, fill=PINK)

    finders = [(0, 0), (n - 7, 0), (0, n - 7)]
    skip = {(ox + fx + i, oy + fy + j) for fx, fy in finders for i in range(7) for j in range(7)}
    for gy in range(grid):
        for gx in range(grid):
            if filled[gy][gx] and (gx, gy) not in skip:
                X, Y = pad + gx * cell, top + pad + (gy - y0) * cell
                if 0 <= gx - ox < n and 0 <= gy - oy < n:
                    # real QR modules: solid squares that touch, so every scanner reads them
                    d.rectangle([X, Y, X + cell - 1, Y + cell - 1], fill=PINK)
                else:
                    # decoration around it: little rounded dots
                    g = cell * .08
                    d.rounded_rectangle([X + g, Y + g, X + cell - g, Y + cell - g], radius=cell * .3, fill=PINK)
    for fx, fy in finders:
        finder(ox + fx, oy + fy)

    try:
        f1 = ImageFont.truetype("seguiemj.ttf", 64)
        f2 = ImageFont.truetype("segoeui.ttf", 46)
    except OSError:
        f1 = f2 = ImageFont.load_default()
    d.text((W / 2, 70), title, font=f1, fill=(90, 40, 70), anchor="mm", embedded_color=True)
    d.text((W / 2, H - 70), note, font=f2, fill=(150, 70, 110), anchor="mm")
    img.save(out)
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: python make_qr.py https://your-site.vercel.app")
    print("saved", make(sys.argv[1]))
