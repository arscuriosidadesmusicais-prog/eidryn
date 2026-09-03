#!/usr/bin/env python3
"""pxkit — mini engine de pixel art para a Edição do Eclipse (v1.1.0).
Recursos: rampas de material, contorno automático, iluminação direcional,
luz de borda (rim light), dithering, simetria e quantização para PNG pequeno."""
import math, random
import numpy as np
from PIL import Image, ImageDraw

# ---------------- materiais globais ----------------
M = {
    'obsidian': (38, 32, 50), 'steel': (118, 126, 148), 'gold': (232, 163, 58),
    'blood': (160, 48, 72), 'teal': (70, 200, 178), 'arc': (155, 89, 208),
    'bone': (216, 205, 178), 'leather': (107, 74, 52), 'dark': (14, 10, 20),
    'white': (245, 240, 226),
}

def clamp8(v):
    return 0 if v < 0 else (255 if v > 255 else int(v))

def mix(c1, c2, t):
    return (clamp8(c1[0]+(c2[0]-c1[0])*t), clamp8(c1[1]+(c2[1]-c1[1])*t), clamp8(c1[2]+(c2[2]-c1[2])*t), 255)

def shade(c, f):
    return (clamp8(c[0]*f), clamp8(c[1]*f), clamp8(c[2]*f), c[3] if len(c) > 3 else 255)

def ramp(c, n=5, lo=0.38, hi=1.42):
    """rampa escura→clara (índice 0 = sombra profunda, n-1 = brilho)"""
    return [shade(c, lo + (hi-lo)*i/(n-1)) for i in range(n)]

class CV:
    """canvas RGBA com primitivas pixel e pós-processamento numpy"""
    def __init__(self, size=96):
        self.size = size
        self.im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    # ----- primitivas -----
    def p(self, x, y, c, s=1):
        self.d.rectangle([x, y, x+s-1, y+s-1], fill=c)

    def r(self, x, y, w, h, c):
        self.d.rectangle([x, y, x+w-1, y+h-1], fill=c)

    def box(self, x, y, w, h, c, t=1):
        self.d.rectangle([x, y, x+w-1, y+h-1], outline=c, width=t)

    def ell(self, cx, cy, rx, ry, c):
        self.d.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=c)

    def poly(self, pts, c):
        self.d.polygon(pts, fill=c)

    def ln(self, x0, y0, x1, y1, c, w=1):
        self.d.line([x0, y0, x1, y1], fill=c, width=w)

    def tri(self, x, y, w, h, c, flip=False):
        """triângulo vertical (pico em cima)"""
        if flip:
            self.d.polygon([(x, y+h), (x+w, y+h), (x+w//2, y)], fill=c)
        else:
            self.d.polygon([(x, y), (x+w, y), (x+w//2, y+h)], fill=c)

    # ----- composição -----
    def mirror_right(self, x_split=None):
        """copia metade esquerda espelhada para a direita (corpo simétrico)"""
        s = self.size
        xs = x_split if x_split is not None else s//2
        arr = np.array(self.im)
        half = arr[:, :xs]
        flip = half[:, ::-1]
        need = s - xs
        arr[:, xs:s] = flip[:, -need:] if need <= xs else np.pad(flip, ((0,0),(0,need-xs),(0,0)), mode='edge')[:, -(s-xs):]
        self.im = Image.fromarray(arr)
        self.d = ImageDraw.Draw(self.im)

    def paste_under(self, other, ox, oy):
        """desenha other ATRÁS (só onde o canvas está transparente)"""
        arr = np.array(self.im); oth = np.array(other.im)
        h, w = oth.shape[:2]
        x0, y0 = max(0, ox), max(0, oy)
        x1, y1 = min(self.size, ox+w), min(self.size, oy+h)
        if x1 <= x0 or y1 <= y0: return
        region = arr[y0:y1, x0:x1]
        oreg = oth[y0-oy:y1-oy, x0-ox:x1-ox]
        empty = region[:, :, 3] == 0
        region[empty] = oreg[empty]
        arr[y0:y1, x0:x1] = region
        self.im = Image.fromarray(arr)
        self.d = ImageDraw.Draw(self.im)

    def paste_over(self, other, ox, oy):
        self.im.alpha_composite(other.im, (ox, oy))
        self.d = ImageDraw.Draw(self.im)

    # ----- pós-processamento numpy -----
    def _arr(self):
        return np.array(self.im)

    def _sync(self, arr):
        self.im = Image.fromarray(arr)
        self.d = ImageDraw.Draw(self.im)

    def outline(self, color=(16, 10, 26, 255), inner=False):
        """contorno 1px ao redor (ou dentro) da silhueta"""
        a = self._arr()
        m = a[:, :, 3] > 0
        up = np.roll(m, 1, 0); dn = np.roll(m, -1, 0)
        lf = np.roll(m, 1, 1); rt = np.roll(m, -1, 1)
        near = up | dn | lf | rt
        if inner:
            edge = m & near & self._touches_empty(m)
            a[edge] = color
        else:
            edge = (~m) & near
            a[edge] = color
        self._sync(a)

    @staticmethod
    def _touches_empty(m):
        up = ~np.roll(m, 1, 0); dn = ~np.roll(m, -1, 0)
        lf = ~np.roll(m, 1, 1); rt = ~np.roll(m, -1, 1)
        return up | dn | lf | rt

    def light_pass(self, lf=1.16, up=1.12, rt=0.80, dn=0.72, min_f=0.55):
        """iluminação direcional: clareia bordas superiores/esquerdas, escurece inferiores/direitas"""
        a = self._arr()
        m = a[:, :, 3] > 0
        mup = np.roll(m, 1, 0); mdn = np.roll(m, -1, 0)
        mlf = np.roll(m, 1, 1); mrt = np.roll(m, -1, 1)
        rgb = a[:, :, :3].astype(np.float32)
        top = m & ~mup
        bot = m & ~mdn
        lef = m & ~mlf
        rig = m & ~mrt
        for mask, f in ((top, up), (lef, lf), (bot, dn), (rig, rt)):
            rgb[mask] = np.clip(rgb[mask] * f, 0, 255)
        # cantos inferiores ainda mais escuros (AO)
        corner = bot & rig
        rgb[corner] = np.clip(rgb[corner] * min_f, 0, 255)
        a[:, :, :3] = rgb.astype(np.uint8)
        self._sync(a)

    def rim_light(self, color=(255, 240, 210, 255), strength=0.55):
        """luz de contorno na borda direita/superior (estilo moonlight)"""
        a = self._arr()
        m = a[:, :, 3] > 0
        mrt = np.roll(m, -1, 1); mup = np.roll(m, 1, 0)
        rig = m & ~mrt
        top = m & ~mup
        sel = rig | top
        rgb = a[:, :, :3].astype(np.float32)
        col = np.array(color[:3], dtype=np.float32)
        rgb[sel] = rgb[sel]*(1-strength) + col*strength
        a[:, :, :3] = rgb.astype(np.uint8)
        self._sync(a)

    def brighten(self, f=1.2, lift=6):
        a = self._arr()
        m = a[:, :, 3] > 0
        rgb = a[:, :, :3].astype(np.float32)
        rgb[m] = np.clip(rgb[m] * f + lift, 0, 255)
        a[:, :, :3] = rgb.astype(np.uint8)
        self._sync(a)

    def glow_pixels(self, color, positions, s=2):
        for (x, y) in positions:
            self.p(x, y, shade(color, 1.5), s)
            self.p(x-1, y, shade(color, 1.1))
            self.p(x+s, y, shade(color, 1.1))
            self.p(x, y-1, shade(color, 1.1))
            self.p(x, y+s, shade(color, 1.1))

    # ----- saída -----
    def save(self, path, max_colors=0, bg_check=False):
        im = self.im
        if max_colors and max_colors >= 2:
            q = im.quantize(colors=max_colors, method=Image.FASTOCTREE)
            im = q
        im.save(path, optimize=True)

    def sheet_row(self, others):
        """concatena horizontalmente para contact sheet"""
        ims = [self.im] + [o.im for o in others]
        w = sum(i.width for i in ims); h = max(i.height for i in ims)
        out = Image.new('RGBA', (w, h), (24, 18, 34, 255))
        x = 0
        for i in ims:
            out.paste(i, (x, 0), i)
            x += i.width
        return out

# ---------------- fundo/dithering ----------------
def dither_rect(d, x, y, w, h, c1, c2, density=0.5, rng=None):
    rng = rng or random
    for yy in range(y, y+h):
        for xx in range(x, x+w):
            d.point((xx, yy), fill=c2 if rng.random() < density else c1)

def vgrad(size_w, size_h, top, bot):
    im = Image.new('RGB', (size_w, size_h))
    d = ImageDraw.Draw(im)
    for y in range(size_h):
        t = y/(size_h-1) if size_h > 1 else 0
        d.line([(0, y), (size_w, y)], fill=mix(top, bot, t))
    return im

def star_field(d, w, h, rng, n=90, big_every=7):
    for i in range(n):
        x, y = rng.randrange(w), rng.randrange(int(h*0.62))
        if i % big_every == 0:
            d.point((x, y), fill=(230, 226, 210, 255))
            if x+1 < w: d.point((x+1, y), fill=(150, 150, 160, 160))
        else:
            d.point((x, y), fill=(140, 140, 158, 120))
