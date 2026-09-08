#!/usr/bin/env python3
"""make_cover.py — capa 630×500 para itch.io + banner 460×215 (keeps identidade do jogo:
eclipse dourado, herói, Filhote do Devorador, paleta dark fantasy)."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math

OUT = '/home/z/my-project/download/publish/itch_kit/'
SPR = '/home/z/my-project/eidryn/assets/sprites/'
GOLD = (232, 163, 58)
GOLD2 = (245, 220, 150)
BG = (11, 7, 16)

def rr(draw, xy, r, fill):
    draw.rounded_rectangle(xy, radius=r, fill=fill)

def base(w, h):
    im = Image.new('RGBA', (w, h), BG)
    d = ImageDraw.Draw(im)
    # gradiente vertical roxo→preto
    for y in range(h):
        t = y / h
        c = (int(11 + 30 * (1 - t)), int(7 + 16 * (1 - t)), int(16 + 44 * (1 - t)))
        d.line([(0, y), (w, y)], fill=c)
    # estrelas determinísticas
    st = ((31, 54, 255), (83, 112, 9), (171, 205, 66), (243, 17, 165), (60, 143, 72),
          (122, 44, 229), (11, 87, 216), (200, 91, 38), (91, 12, 250), (144, 230, 5),
          (36, 198, 240), (250, 210, 90), (180, 60, 200), (70, 150, 255), (255, 240, 200))
    for i in range(90):
        x = (i * 127 + (i * i * 31) % 211) % w
        y = (i * 73 + (i * i * 17) % 149) % int(h * 0.62)
        a = 90 + (i * 37) % 140
        d.point([x, y], fill=(235, 230, 250, a))
        if i % 7 == 0:
            d.point([x + 1, y], fill=(235, 230, 250, a // 2))
    return im, d

def eclipse(im, cx, cy, r):
    glow = Image.new('RGBA', im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for gr, ga in ((r * 1.9, 40), (r * 1.55, 70), (r * 1.28, 110)):
        gd.ellipse([cx - gr, cy - gr, cx + gr, cy + gr], fill=(232, 163, 58, ga))
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    im.alpha_composite(glow)
    d = ImageDraw.Draw(im)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD, width=6)
    d.ellipse([cx - r + 9, cy - r + 9, cx + r - 9, cy + r - 9], fill=(6, 3, 10, 255))
    # corpo celeste recortado no anel (lua escura)
    d.ellipse([cx - r * 0.42, cy - r * 0.42, cx + r * 0.42, cy + r * 0.42], fill=(28, 20, 40, 255))

def sprite(im, path, box):
    s = Image.open(path).convert('RGBA')
    w, h = box
    s = s.resize((w, h), Image.NEAREST)
    im.alpha_composite(s)

def text_layer(im, xy, s, size, fill, anchor='la', serif=True):
    f = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf', size)
    d = ImageDraw.Draw(im)
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=max(1, size // 22), stroke_fill=(8, 4, 12))

def footer(im, w, h, s):
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 17)
    tw = d.textlength(s, font=f)
    rr(d, [(w - tw) / 2 - 14, h - 46, (w + tw) / 2 + 14, h - 14], 8, (20, 12, 30, 210))
    d.text((w / 2, h - 30), s, font=f, fill=(226, 214, 235), anchor='mm')

def cover630():
    w, h = 630, 500
    im, d = base(w, h)
    # chão
    d.rectangle([0, h - 92, w, h], fill=(16, 10, 24, 255))
    d.line([(0, h - 92), (w, h - 92)], fill=(58, 42, 85, 255), width=2)
    eclipse(im, w // 2, 168, 96)
    # elenco (sombra + sprites na linha do chão)
    d = ImageDraw.Draw(im)
    d.ellipse([110, h - 104, 330, h - 84], fill=(0, 0, 0, 120))
    d.ellipse([w - 240, h - 100, w - 150, h - 86], fill=(0, 0, 0, 110))
    d.ellipse([34, h - 98, 104, h - 86], fill=(0, 0, 0, 110))
    im.alpha_composite(_hero_big(), (86, h - 92 - 208))
    im.alpha_composite(_pet('pets/pet_devorador.png', 84), (w - 236, h - 92 - 76))
    im.alpha_composite(_pet('pets/pet_raposa.png', 64), (34, h - 92 - 58))
    # título
    text_layer(im, (w / 2, 62), 'EIDRYN', 74, GOLD2, anchor='mm')
    d = ImageDraw.Draw(im)
    d.line([(w / 2 - 170, 108), (w / 2 + 170, 108)], fill=GOLD, width=2)
    text_layer(im, (w / 2, 132), 'O  C I C L O  D O  E C L I P S E', 24, (226, 214, 235), anchor='mm')
    footer(im, w, h, 'RPG Idle Dark Fantasy · 500 fases · 7 regiões · Clima vivo')
    im.convert('RGB').save(OUT + 'cover_630x500.png', optimize=True)

def _hero_big():
    im = Image.new('RGBA', (208, 208), (0, 0, 0, 0))
    s = Image.open(SPR + 'hero/hero.png').convert('RGBA').resize((192, 192), Image.NEAREST)
    im.alpha_composite(s, (8, 10))
    return im

def _pet(path, size):
    return Image.open(SPR + path).convert('RGBA').resize((size, size), Image.NEAREST)

def banner460():
    w, h = 460, 215
    im, d = base(w, h)
    eclipse(im, w - 96, 66, 46)
    im.alpha_composite(_hero_big().resize((150, 150), Image.NEAREST), (14, h - 152))
    im.alpha_composite(_pet('pets/pet_devorador.png', 62), (166, h - 74))
    text_layer(im, (206, 52), 'EIDRYN', 46, GOLD2, anchor='mm')
    text_layer(im, (206, 86), 'O Ciclo do Eclipse', 19, (226, 214, 235), anchor='mm')
    d = ImageDraw.Draw(im)
    d.line([(160, 106), (400, 106)], fill=GOLD, width=2)
    text_layer(im, (206, 126), 'RPG Idle · Dark Fantasy', 15, (196, 184, 210), anchor='mm')
    im.convert('RGB').save(OUT + 'banner_460x215.png', optimize=True)

import os
os.makedirs(OUT, exist_ok=True)
cover630()
banner460()
print('capa + banner ok')
