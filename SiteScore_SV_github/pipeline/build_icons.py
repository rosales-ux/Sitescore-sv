"""Icono (icono.png, 512 px) y imagen social (social.png, 1280 x 640) de SiteScore SV, en los colores del Formato RV.
Requiere las fuentes IBM Plex Sans Condensed y Source Serif 4 (TTF de Google Fonts) en fonts/."""
from PIL import Image, ImageDraw, ImageFont
INK, STEEL2, PAPER = (16, 24, 32), (62, 107, 140), (251, 250, 247)
mix = lambda c, a, bg=INK: tuple(round(bg[k] + (c[k] - bg[k]) * a) for k in range(3))
def base(w, h, step, cx, cy, radii, s=1):
    S = 4; im = Image.new('RGB', (w * S, h * S), INK); d = ImageDraw.Draw(im)
    g = mix(PAPER, .08)
    for x in range(0, w * S + 1, step * S): d.line([(x, 0), (x, h * S)], fill=g, width=max(1, S // 2))
    for y in range(0, h * S + 1, step * S): d.line([(0, y), (w * S, y)], fill=g, width=max(1, S // 2))
    for k, r in enumerate(radii):
        r *= S; col = mix(STEEL2, .95); wd = int(2.2 * s * S)
        if k % 2:  # anillo punteado
            import math
            n = int(2 * math.pi * r / (14 * s * S))
            for i in range(n):
                a0 = 360 * i / n; d.arc([cx * S - r, cy * S - r, cx * S + r, cy * S + r], a0, a0 + 360 / n * .55, fill=col, width=wd)
        else: d.ellipse([cx * S - r, cy * S - r, cx * S + r, cy * S + r], outline=col, width=wd)
    return im, d, S
def icon(path, n=512):
    im, d, S = base(n, n, 64, n / 2, n / 2, [70, 135, 205], s=2.4)
    c = n / 2 * S; L = 46 * S; w = int(9 * S)
    d.line([(c - L, c), (c + L, c)], fill=PAPER, width=w); d.line([(c, c - L), (c, c + L)], fill=PAPER, width=w)
    for x, y in [(150, 170), (370, 340), (340, 120), (130, 360)]:
        r = 13 * S; d.ellipse([x * S - r, y * S - r, x * S + r, y * S + r], fill=mix(STEEL2, .9))
    im.resize((n, n), Image.LANCZOS).save(path)
def social(path, W=1280, H=640):
    im, d, S = base(W, H, 40, W / 2, H / 2, [120, 210, 300, 400], s=1.2)
    im = im.resize((W, H), Image.LANCZOS); d = ImageDraw.Draw(im)
    f1 = ImageFont.truetype('fonts/f3.ttf', 104); f2 = ImageFont.truetype('fonts/f4.ttf', 34); f3 = ImageFont.truetype('fonts/f2.ttf', 19)
    def ctext(t, f, y, col, sp=0):
        if sp:
            ws = [d.textlength(ch, font=f) for ch in t]; tw = sum(ws) + sp * (len(t) - 1); x = (W - tw) / 2
            for ch, w_ in zip(t, ws): d.text((x, y), ch, font=f, fill=col); x += w_ + sp
        else: d.text(((W - d.textlength(t, font=f)) / 2, y), t, font=f, fill=col)
    from PIL import ImageFilter  # halo suave detrás del texto, sin bordes visibles
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse([W / 2 - 430, H / 2 - 105, W / 2 + 430, H / 2 + 125], fill=200)
    m = m.filter(ImageFilter.GaussianBlur(45))
    im = Image.composite(Image.new('RGB', (W, H), INK), im, m); d = ImageDraw.Draw(im)
    tw = d.textlength('SiteScore ', font=f1) + d.textlength('SV', font=f1); x = (W - tw) / 2; y = H / 2 - 92
    d.text((x, y), 'SiteScore ', font=f1, fill=PAPER); d.text((x + d.textlength('SiteScore ', font=f1), y), 'SV', font=f1, fill=mix(STEEL2, 1.35, (0, 0, 0)))
    ctext('Selección de sitios comerciales · El Salvador', f2, H / 2 + 34, mix(PAPER, .78))
    ctext('MODELO DE GRAVEDAD · POBLACIÓN 2025 · COMPETENCIA · REPORTE PDF', f3, H / 2 + 88, mix(PAPER, .5), sp=2.2)
    im.save(path)
if __name__ == '__main__':
    import sys; out = sys.argv[1] if len(sys.argv) > 1 else 'gh'
    icon(f'{out}/icono.png'); social(f'{out}/social.png'); print('ok')
