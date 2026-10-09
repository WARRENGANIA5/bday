"""
Make a pink heart-shaped QR code that opens the birthday website.

    python make_qr.py https://your-site.vercel.app

Writes  qr_heart.png  (needs:  pip install qrcode pillow)

Like the TikTok style: the QR itself is turned 45 degrees so it becomes the
bottom point of the heart, and two round "lobes" of decorative dots on its
upper edges finish the heart shape. A small clean gap keeps it scannable.
"""

import math
import random
import sys

import qrcode
from PIL import Image, ImageDraw, ImageFilter

BG = (253, 236, 244)
PINK_TOP = (226, 64, 138)     # gradient across the heart
PINK_BOTTOM = (226, 64, 138)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make(url, out="qr_heart.png", cell=26, gap=2.2, seed=1114):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=0)
    qr.add_data(url)
    qr.make(fit=True)
    m = qr.get_matrix()
    n = len(m)
    rnd = random.Random(seed)

    # ---- module grid (u = column, v = row), with room for the two lobes ----
    r = n / 2 + 0.6                     # lobe radius
    lo = -math.ceil(r + 1)              # lobes stick out on the u<0 and v<0 sides
    hi = n
    cells = {}                          # (u, v) -> "qr" | "deco"
    for v in range(lo, hi):
        for u in range(lo, hi):
            if 0 <= u < n and 0 <= v < n:
                if m[v][u]:
                    cells[(u, v)] = "qr"
                continue
            cx, cy = u + .5, v + .5
            # lobe on the v<0 edge (centre at middle of the top edge) and on the u<0 edge
            in_lobe = (cy < -gap and (cx - n / 2) ** 2 + cy ** 2 <= r * r) or \
                      (cx < -gap and cx ** 2 + (cy - n / 2) ** 2 <= r * r)
            if in_lobe and rnd.random() < .55:
                cells[(u, v)] = "deco"

    # ---- draw unrotated, then turn 45 degrees so the QR becomes the heart's point ----
    size = (hi - lo) * cell
    pad = cell * 4
    canvas = Image.new("RGBA", (size + pad * 2, size + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    finders = [(0, 0), (n - 7, 0), (0, n - 7)]
    in_finder = lambda u, v: any(fx <= u < fx + 7 and fy <= v < fy + 7 for fx, fy in finders)

    def xy(u, v):
        return pad + (u - lo) * cell, pad + (v - lo) * cell

    def colour(u, v):
        # top of the heart lighter, the point deeper
        t = (u + v - 2 * lo) / (2 * (hi - lo))
        return mix(PINK_TOP, PINK_BOTTOM, max(0, min(1, t))) + (255,)

    for (u, v), kind in cells.items():
        if kind == "qr" and in_finder(u, v):
            continue
        X, Y = xy(u, v)
        c = colour(u, v)
        if kind == "qr":
            d.rectangle([X, Y, X + cell - 1, Y + cell - 1], fill=c)   # solid, touching: easy to scan
        else:
            d.rectangle([X, Y, X + cell - 1, Y + cell - 1], fill=c)   # same square style as the QR
    for fx, fy in finders:
        X, Y = xy(fx, fy)
        c = colour(fx + 3, fy + 3)
        d.rounded_rectangle([X, Y, X + 7 * cell - 1, Y + 7 * cell - 1], radius=cell * .25, fill=c)
        d.rounded_rectangle([X + cell, Y + cell, X + 6 * cell - 1, Y + 6 * cell - 1], radius=cell * .15, fill=BG + (255,))
        d.rounded_rectangle([X + 2 * cell, Y + 2 * cell, X + 5 * cell - 1, Y + 5 * cell - 1], radius=cell * .15, fill=c)

    heart = canvas.rotate(-45, resample=Image.BICUBIC, expand=True)   # lobes up, QR corner (n, n) points down
    heart = heart.crop(heart.getbbox())

    # ---- soft card with a glow behind the heart ----
    W = H = int(max(heart.size) * 1.22)
    img = Image.new("RGB", (W, H), BG)
    img.paste(heart, ((W - heart.size[0]) // 2, (H - heart.size[1]) // 2 + int(H * .01)), heart)
    img.save(out)
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: python make_qr.py https://your-site.vercel.app")
    print("saved", make(sys.argv[1]))
