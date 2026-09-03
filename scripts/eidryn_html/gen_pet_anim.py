#!/usr/bin/env python3
"""gen_pet_anim.py — POSTURAS DOS PETS (v1.3.0 "Tempestade Viva").
10 pets × 8 frames = 80 PNGs 96×96: idle(4) · cheer(2) · sad(2).

Estratégia: engine de transformações paramétricas (shift/squash/shear/dim)
aplicadas SOBRE a arte base autoral de gen_sprites_v2 — identidade visual de
cada pet preservada — + FX por espécie (faíscas, lágrima, poeira, brilho).
Escopo: apenas arte. Nenhuma lógica de jogo é afetada."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import gen_sprites_v2 as g2

ROOT = '/home/z/my-project/eidryn/assets/sprites/pets'

# ---------------- engine de transformação ----------------
def shift(im, dx=0, dy=0):
    if dx == 0 and dy == 0:
        return im
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.paste(im, (int(dx), int(dy)), im)
    return out

def squash(im, f):
    """achata (f<1) / estica (f>1) verticalmente, ancorado no fundo do canvas."""
    if f == 1.0:
        return im
    w, h = im.size
    nh = max(4, int(round(h * f)))
    sc = im.resize((w, nh), Image.NEAREST)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.paste(sc, (0, h - nh), sc)
    return out

def band_shear(im, amp, k=0.10, phase=0.0, band=4):
    """desloca faixas horizontais em onda senoidal (rastejar / ondular)."""
    if not amp:
        return im
    w, h = im.size
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for y0 in range(0, h, band):
        off = int(round(math.sin(y0 * k + phase) * amp))
        row = im.crop((0, y0, w, min(h, y0 + band)))
        out.paste(row, (off, y0), row)
    return out

def adjust(im, sat=1.0, br=1.0):
    """dessatura + escurece (tristeza) preservando alfa."""
    if sat == 1.0 and br == 1.0:
        return im
    a = np.array(im).astype(np.float32)
    m = a[:, :, 3] > 0
    lum = a[:, :, 0] * 0.3 + a[:, :, 1] * 0.59 + a[:, :, 2] * 0.11
    for c in range(3):
        ch = a[:, :, c]
        a[:, :, c] = np.where(m, np.clip((lum + (ch - lum) * sat) * br, 0, 255), ch)
    return Image.fromarray(a.astype(np.uint8))

def lift_region(im, box, dy, dx=0):
    """ergue uma região isolada do sprite (espada/objeto) sem romper o corpo."""
    region = im.crop(box)
    out = im.copy()
    d = ImageDraw.Draw(out)
    d.rectangle([box[0], box[1], box[2] - 1, box[3] - 1], fill=(0, 0, 0, 0))
    out.paste(region, (box[0] + int(dx), box[1] + int(dy)), region)
    return out

# ---------------- FX ----------------
def fx_draw(im, fn):
    fn(ImageDraw.Draw(im))

def sparkle(d, x, y, col, s=1):
    d.rectangle([x - s, y, x + s, y], fill=col)
    d.rectangle([x, y - s, x, y + s], fill=col)
    d.point([x, y], fill=(255, 255, 250, 255))

def puff(d, x, y, col):
    d.rectangle([x, y, x + 2, y + 2], fill=col)
    d.rectangle([x + 3, y - 1, x + 4, y + 1], fill=col)

def tear(d, x, y):
    d.rectangle([x, y, x, y + 2], fill=(168, 214, 255, 225))
    d.rectangle([x, y + 3, x, y + 3], fill=(168, 214, 255, 140))

SIGH = (196, 202, 214, 110)

# ---------------- perfil por espécie ----------------
# olho (origem da lágrima) · cor das faíscas · construção dos frames
P = {
 'pet_lobo': dict(eye=(64, 52), acc=(110, 240, 216, 255)),
 'pet_corvo': dict(eye=(56, 50), acc=(232, 163, 58, 255)),
 'pet_grilo': dict(eye=(60, 57), acc=(150, 220, 235, 255)),
 'pet_golem': dict(eye=(52, 40), acc=(110, 240, 216, 255)),
 'pet_serpente': dict(eye=(77, 57), acc=(244, 158, 76, 255)),
 'pet_fada': dict(eye=(50, 37), acc=(250, 200, 110, 255)),
 'cmp_cavaleiro': dict(eye=(52, 38), acc=(196, 130, 250, 255)),
 'cmp_arquivista': dict(eye=(53, 36), acc=(235, 222, 190, 255)),
 'cmp_feiticeira': dict(eye=(53, 35), acc=(196, 130, 250, 255)),
 'cmp_ferreiro': dict(eye=(54, 37), acc=(244, 158, 76, 255)),
}

def burst(d, pts, col):
    for (x, y, s) in pts:
        sparkle(d, x, y, col, s)

def idle_frame(key, f):
    im = g2.PETS[key]().im
    a = P[key]['acc']
    if key == 'pet_lobo':
        im = shift(im, 0, [0, 1, 2, 1][f]); im = squash(im, [1, 1.008, 1.014, 1.004][f])
        if f == 2:
            fx_draw(im, lambda d: d.rectangle([72, 44, 72, 45], fill=a))
    elif key == 'pet_corvo':
        im = squash(im, [1, 0.985, 1, 1.012][f])
        if f == 3:
            fx_draw(im, lambda d: sparkle(d, 55, 43, (255, 230, 150, 200), 1))
    elif key == 'pet_grilo':
        im = band_shear(im, 0.6, phase=f * 1.5)
        dy, sq = [(0, 1), (1, 0.96), (-3, 1.04), (-1, 1.01)][f]
        im = shift(squash(im, sq), 0, dy)
    elif key == 'pet_golem':
        im = shift(squash(im, [1, 1, 1.01, 1.01][f]), 0, [0, 0, 1, 1][f])
        if f == 2:
            fx_draw(im, lambda d: puff(d, 28, 82, (168, 160, 176, 120)))
    elif key == 'pet_serpente':
        im = band_shear(im, [1.6, 0, -1.6, 0][f], phase=f * 1.2)
        im = shift(im, 0, [0, 1, 0, 1][f])
        if f == 1:
            fx_draw(im, lambda d: d.rectangle((44, 42, 44, 43), fill=(255, 190, 110, 160)))
    elif key == 'pet_fada':
        im = shift(im, 0, [0, -2, -4, -2][f])
        if f % 2 == 0:
            fx_draw(im, lambda d: sparkle(d, [24, 0, 20, 0][f], [58, 0, 48, 0][f], a, 1))
    elif key == 'cmp_cavaleiro':
        im = shift(im, 0, [0, 1, 2, 1][f])
        if f == 2:
            fx_draw(im, lambda d: sparkle(d, 67, 26, (255, 255, 245, 210), 1))
    elif key == 'cmp_arquivista':
        im = shift(im, 0, [0, 1, 2, 1][f])
        if f == 1:
            fx_draw(im, lambda d: (d.rectangle([73, 48, 74, 51], fill=(235, 222, 190, 220)),
                                   d.rectangle([75, 45, 75, 47], fill=(235, 222, 190, 160))))
    elif key == 'cmp_feiticeira':
        im = shift(im, 0, [0, 1, 2, 1][f])
        if f in (1, 2):
            fx_draw(im, lambda d: sparkle(d, 70, 40, a if f == 1 else (255, 240, 255, 230), 1))
    elif key == 'cmp_ferreiro':
        im = shift(im, 0, [0, 1, 2, 1][f])
        if f == 1:
            fx_draw(im, lambda d: sparkle(d, 32, 29, (255, 244, 214, 210), 1))
        elif f == 2:
            fx_draw(im, lambda d: puff(d, 64, 34, (244, 158, 76, 150)))
    return im

def cheer_frame(key, f):
    im = g2.PETS[key]().im
    a = P[key]['acc']
    ex, ey = P[key]['eye']
    if f == 0:  # antecipação: agacha
        im = squash(im, 0.955)
        im = shift(im, 0, 2)
        return adjust(im, 1.02, 1.03)
    # salto de alegria
    dy = -7 if key not in ('pet_fada', 'pet_corvo') else -9
    if key == 'pet_golem': dy = -4
    im = squash(im, 1.045)
    im = shift(im, 0, dy)
    if key == 'cmp_cavaleiro':
        # espada erguida em 2 lifts: lâmina (x66-68) + guarda (y62-64) — sem tocar o braço (x≤65, y44-59)
        im = lift_region(im, (66, 26, 69, 66), -6)
        im = lift_region(im, (63, 60, 72, 65), -6)
    pts = [(20, 44, 1), (26, 36, 1), (74, 40, 1), (68, 30, 1), (47, 22, 2)]
    if key == 'pet_golem':
        pts = [(20, 50, 1), (74, 48, 1), (47, 26, 2)]
    if key == 'cmp_feiticeira':
        pts = [(64, 32, 2), (78, 36, 1), (58, 26, 1), (47, 16, 1)]
    def _fx(d):
        burst(d, pts, a)
        puff(d, 36, 84, (170, 158, 175, 120))
        puff(d, 58, 85, (170, 158, 175, 100))
    fx_draw(im, _fx)
    return im

def sad_frame(key, f):
    im = g2.PETS[key]().im
    ex, ey = P[key]['eye']
    if f == 0:
        im = squash(im, 0.955); im = shift(im, 0, 3)
        im = adjust(im, 0.84, 0.90)
        fx_draw(im, lambda d: tear(d, ex, ey + 2))
    else:
        im = squash(im, 0.938); im = shift(im, 0, 4)
        im = adjust(im, 0.72, 0.82)
        def _fx(d):
            tear(d, ex, ey + 3)
            puff(d, ex + 4, ey - 4, SIGH)
        fx_draw(im, _fx)
    return im

POSES = {'idle': (idle_frame, 4), 'cheer': (cheer_frame, 2), 'sad': (sad_frame, 2)}

def main():
    os.makedirs(ROOT, exist_ok=True)
    n = 0
    for key in P:
        for pose, (fn, cnt) in POSES.items():
            for f in range(cnt):
                im = fn(key, f)
                # garantia: contorno residual nas bordas cortadas do lift
                im.save(f'{ROOT}/{key}_{pose}_{f}.png', optimize=True)
                n += 1
    print(f'pet anim ok — {n} PNGs')
    # contact sheet p/ inspeção (10 linhas × 8 colunas)
    cols = 8
    from PIL import Image as I
    rows = len(P)
    sheet = I.new('RGBA', (cols * 100, rows * 116), (22, 16, 32, 255))
    d = ImageDraw.Draw(sheet)
    for r, key in enumerate(P):
        c = 0
        for pose, (fn, cnt) in POSES.items():
            for f in range(cnt):
                im = I.open(f'{ROOT}/{key}_{pose}_{f}.png').convert('RGBA')
                x, y = c * 100 + 2, r * 116 + 2
                sheet.paste(im, (x, y), im)
                c += 1
        d.text((4, r * 116 + 100), key, fill=(232, 224, 208, 255))
    sheet.save('/home/z/my-project/scripts/eidryn_html/sheet_pet_anim.png')
    print('sheet ok')

if __name__ == '__main__':
    main()
