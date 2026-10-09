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

BG = (255, 241, 247)
PINK_TOP = (244, 120, 170)     # gradient across the heart
PINK_BOTTOM = (214, 58, 124)


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

    qr_on = lambda u, v: cells.get((u, v)) == "qr" and not in_finder(u, v)

    def tiny_heart(cx, cy, size, fill):
        k = size / 2
        d.polygon([(cx, cy + k * .95), (cx - k, cy - k * .05), (cx - k * .55, cy - k * .7),
                   (cx, cy - k * .3), (cx + k * .55, cy - k * .7), (cx + k, cy - k * .05)], fill=fill)
        d.ellipse([cx - k, cy - k * .75, cx, cy + k * .2], fill=fill)
        d.ellipse([cx, cy - k * .75, cx + k, cy + k * .2], fill=fill)

    for (u, v), kind in cells.items():
        if kind == "qr" and in_finder(u, v):
            continue
        X, Y = xy(u, v)
        c = colour(u, v)
        if kind == "qr":
            # "liquid" style: rounded blobs that stay joined to their neighbours (still solid for scanners)
            d.rounded_rectangle([X, Y, X + cell - 1, Y + cell - 1], radius=cell * .38, fill=c)
            if qr_on(u + 1, v):
                d.rectangle([X + cell // 2, Y, X + cell + cell // 2, Y + cell - 1], fill=c)
            if qr_on(u, v + 1):
                d.rectangle([X, Y + cell // 2, X + cell - 1, Y + cell + cell // 2], fill=c)
        else:
            # decorative lobes: a mix of little hearts and soft dots
            if rnd.random() < .45:
                tiny_heart(X + cell / 2, Y + cell / 2, cell * .9, c)
            else:
                g = cell * .14
                d.ellipse([X + g, Y + g, X + cell - g, Y + cell - g], fill=c)
    for fx, fy in finders:
        X, Y = xy(fx, fy)
        c = colour(fx + 3, fy + 3)
        d.rounded_rectangle([X, Y, X + 7 * cell - 1, Y + 7 * cell - 1], radius=cell * 1.6, fill=c)
        d.rounded_rectangle([X + cell, Y + cell, X + 6 * cell - 1, Y + 6 * cell - 1], radius=cell * 1.1, fill=(255, 255, 255, 255))
        d.rounded_rectangle([X + 2 * cell, Y + 2 * cell, X + 5 * cell - 1, Y + 5 * cell - 1], radius=cell * .9, fill=c)

    heart = canvas.rotate(-45, resample=Image.BICUBIC, expand=True)   # lobes up, QR corner (n, n) points down
    heart = heart.crop(heart.getbbox())

    # ---- smooth white heart "sticker" behind, just big enough to hold every dot ----
    alpha = heart.split()[3]
    pts = [(x, y) for y in range(0, alpha.size[1], 6) for x in range(0, alpha.size[0], 6) if alpha.getpixel((x, y)) > 40]
    bx0, by0, bx1, by1 = heart.getbbox()

    def heart_poly(cx, cy, sc):
        return [(cx + sc * 16 * math.sin(t) ** 3,
                 cy - sc * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)))
                for t in [i * 2 * math.pi / 720 for i in range(720)]]

    from PIL import ImageDraw as _D
    cx = (bx0 + bx1) / 2
    best = None
    for sc in [((bx1 - bx0) / 32) * (1 + k * .01) for k in range(0, 60)]:
        for cy in [by0 + (by1 - by0) * f for f in (.30, .33, .36, .39, .42)]:
            m_ = Image.new("L", alpha.size, 0)
            _D.Draw(m_).polygon(heart_poly(cx, cy, sc), fill=255)
            if all(m_.getpixel(p_) for p_ in pts):
                best = (cy, sc)
                break
        if best:
            break
    cy, sc = best
    sc *= 1.06                                         # a little white margin
    poly = heart_poly(cx, cy, sc)
    px0 = min(x for x, _ in poly); py0 = min(y for _, y in poly)
    px1 = max(x for x, _ in poly); py1 = max(y for _, y in poly)
    o = int(max(0, -px0, -py0, px1 - heart.size[0], py1 - heart.size[1])) + cell
    hw, hh = heart.size[0] + o * 2, heart.size[1] + o * 2
    outline = Image.new("L", (hw, hh), 0)
    _D.Draw(outline).polygon([(x + o, y + o) for x, y in heart_poly(cx, cy, sc)], fill=255)
    outline = outline.filter(ImageFilter.GaussianBlur(1.5))

    W = H = int(max(hw, hh) * 1.12)
    img = Image.new("RGB", (W, H), BG)
    # pastel polka dots on the background
    dd = ImageDraw.Draw(img)
    step = cell * 3
    for yy in range(0, H, step):
        for xx in range((yy // step) % 2 * step // 2, W, step):
            dd.ellipse([xx - 4, yy - 4, xx + 4, yy + 4], fill=(252, 222, 234))
    # pink glow
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse([W * .1, H * .08, W * .9, H * .88], fill=190)
    glow = glow.filter(ImageFilter.GaussianBlur(W * .07))
    img.paste(Image.new("RGB", (W, H), (255, 206, 226)), (0, 0), glow)

    ox, oy = (W - hw) // 2, (H - hh) // 2
    shadow = outline.filter(ImageFilter.GaussianBlur(cell * .9)).point(lambda a: int(a * .45))
    img.paste(Image.new("RGB", (hw, hh), (214, 80, 140)), (ox, oy + int(cell * .8)), shadow)
    img.paste(Image.new("RGB", (hw, hh), (255, 255, 255)), (ox, oy), outline)
    img.paste(heart, (ox + o, oy + o), heart)

    # a few sparkles around the heart
    sd = ImageDraw.Draw(img)
    for (fx, fy, sz) in [(.1, .14, 1.2), (.88, .12, 1), (.92, .5, .8), (.07, .55, .9), (.22, .9, .7), (.8, .86, .9)]:
        cx, cy, r = W * fx, H * fy, cell * sz
        sd.polygon([(cx, cy - r * 1.6), (cx + r * .35, cy - r * .35), (cx + r * 1.6, cy), (cx + r * .35, cy + r * .35),
                    (cx, cy + r * 1.6), (cx - r * .35, cy + r * .35), (cx - r * 1.6, cy), (cx - r * .35, cy - r * .35)],
                   fill=(255, 255, 255), outline=(244, 150, 190))
    img.save(out)
    return out

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: python make_qr.py https://your-site.vercel.app")
    print("saved", make(sys.argv[1]))
