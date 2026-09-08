#!/usr/bin/env python3
"""gen_new_pets.py — v1.6.0 "Sangue e Eclipse": 3 novos companions (C1).
   pet_raposa     — Raposa de Vidro Lunar   (MÍTICA, pet)
   pet_devorador  — Filhote do Devorador    (DIVINA, pet)
   cmp_oraculo    — Oráculo do Eclipse      (MÍTICA, companheiro)
3 sprites base 96×96 + 8 frames cada (idle 4 · cheer 2 · sad 2) = 27 PNGs.
Reutiliza a engine paramétrica do gen_pet_anim e o pxkit do gen_sprites_v2.
Escopo: apenas arte. Nenhuma lógica de jogo é afetada."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
import gen_sprites_v2 as g2
import gen_pet_anim as ga
from pxkit import CV, ramp

ROOT = '/home/z/my-project/eidryn/assets/sprites/pets'

# =============== ARTE BASE (96×96, estilo pixel autoral) ===============
def pet_raposa():   # raposa de vidro lunar — cristal azulado + ouro pálido
    cv = CV(96); b = ramp((150, 190, 215)); moon = (245, 235, 190, 255)
    # cauda em vidro (atrás, esquerda)
    cv.poly([(26, 62), (8, 42), (18, 38), (32, 54)], b[1])
    cv.poly([(28, 58), (16, 44), (24, 46), (32, 56)], b[3])
    # corpo + peito
    cv.ell(48, 60, 17, 11, b[2]); cv.ell(54, 62, 7, 6, b[4])
    # patas
    for lx in (38, 46, 54, 60): cv.r(lx, 68, 5, 12, b[1])
    # cabeça + focinho
    cv.r(56, 38, 18, 15, b[2])
    cv.tri(74, 46, 9, 6, b[3], flip=True)
    cv.p(79, 48, (20, 30, 44, 255), 2)
    # orelhas grandes (ponta p/ cima) c/ interior lunar
    cv.tri(56, 26, 7, 12, b[1], flip=True); cv.tri(68, 26, 7, 12, b[1], flip=True)
    cv.tri(58, 32, 3, 5, moon, flip=True); cv.tri(70, 32, 3, 5, moon, flip=True)
    # olhos de luar
    cv.r(62, 44, 3, 3, (20, 30, 44, 255)); cv.p(63, 45, (255, 255, 255, 255))
    # marcas lunares + fragmentos flutuantes
    cv.p(40, 58, moon, 2); cv.p(34, 62, moon)
    cv.p(26, 36, moon, 2); cv.p(20, 48, b[3]); cv.p(38, 30, b[3])
    return g2._pet_fin(cv)

def pet_devorador():  # filhote do devorador — esfera do vazio c/ corona de eclipse
    cv = CV(96); b = ramp((70, 58, 96)); cor = (245, 230, 200, 255)
    # corona de eclipse (halo pálido)
    cv.ell(48, 50, 26, 26, (245, 230, 200, 55))
    cv.ell(48, 50, 21, 21, (245, 230, 200, 90))
    # corpo + barriga
    cv.ell(48, 52, 16, 14, b[3]); cv.ell(48, 58, 9, 6, b[4])
    # chifrinhos
    cv.tri(34, 32, 6, 10, b[2], flip=True); cv.tri(56, 32, 6, 10, b[2], flip=True)
    # olho ciclope dourado
    cv.ell(48, 46, 6, 6, (255, 220, 120, 255))
    cv.p(47, 45, (255, 255, 240, 255), 2); cv.p(46, 44, (80, 50, 20, 255))
    # boquinha c/ dentinhos
    cv.r(42, 58, 12, 4, (12, 8, 18, 255))
    for dx in (44, 48, 52): cv.r(dx, 58, 2, 2, cor)
    # patinhas
    cv.r(38, 64, 6, 8, b[2]); cv.r(52, 64, 6, 8, b[2])
    # rabinho de fumaça
    cv.poly([(62, 58), (78, 52), (72, 64)], b[1]); cv.p(80, 50, b[2])
    return g2._pet_fin(cv)

def cmp_oraculo():  # oráculo do eclipse — vidente encapuzado, terceiro olho e orbe
    cv = CV(96); b = ramp((96, 82, 150)); gold = (245, 230, 200, 255)
    # manto + dobra
    cv.poly([(32, 72), (64, 72), (60, 34), (36, 34)], b[2])
    cv.poly([(40, 72), (50, 72), (48, 38)], b[1])
    # capuz pontudo
    cv.poly([(33, 36), (63, 36), (48, 14)], b[3])
    # rosto em sombra + olhos dourados
    cv.ell(48, 32, 10, 8, (18, 13, 28, 255))
    cv.r(43, 31, 3, 2, gold); cv.r(51, 31, 3, 2, gold)
    # terceiro olho + diadema
    cv.r(46, 25, 4, 2, gold); cv.p(47, 24, (255, 255, 240, 255))
    cv.r(42, 20, 12, 2, gold)
    # mãos postas
    cv.r(30, 50, 6, 14, b[2]); cv.r(60, 50, 6, 14, b[2])
    # orbe do eclipse flutuante (anel + disco escuro)
    cv.ell(72, 44, 7, 7, gold); cv.ell(72, 44, 3, 3, (18, 13, 28, 255))
    return g2._pet_fin(cv)

# =============== registro nas engines ===============
g2.PETS['pet_raposa'] = pet_raposa
g2.PETS['pet_devorador'] = pet_devorador
g2.PETS['cmp_oraculo'] = cmp_oraculo

ga.P['pet_raposa'] = dict(eye=(63, 45), acc=(245, 235, 190, 255))
ga.P['pet_devorador'] = dict(eye=(48, 46), acc=(245, 230, 200, 255))
ga.P['cmp_oraculo'] = dict(eye=(48, 32), acc=(245, 230, 200, 255))

# =============== idle específico por espécie (cheer/sad usam a engine geral) ===============
def idle_raposa(f):
    im = g2.PETS['pet_raposa']().im
    im = ga.shift(im, 0, [0, 1, 2, 1][f]); im = ga.squash(im, [1, 1.006, 1.012, 1.004][f])
    if f == 2:   # orelha treme
        ga.fx_draw(im, lambda d: d.rectangle([69, 26, 70, 27], fill=(110, 160, 190, 255)))
    if f == 1:   # faísca lunar
        ga.fx_draw(im, lambda d: ga.sparkle(d, 26, 36, (245, 235, 190, 210), 1))
    return im

def idle_devorador(f):
    im = g2.PETS['pet_devorador']().im
    im = ga.shift(im, 0, [0, -2, -3, -1][f])  # flutua
    if f == 1:   # corona pulsa
        ga.fx_draw(im, lambda d: d.ellipse([26, 28, 70, 72], outline=(245, 230, 200, 70)))
    if f == 3:   # piscada
        ga.fx_draw(im, lambda d: d.rectangle([42, 45, 55, 46], fill=(18, 13, 28, 255)))
    return im

def idle_oraculo(f):
    im = g2.PETS['cmp_oraculo']().im
    im = ga.shift(im, 0, [0, 1, 2, 1][f])
    if f in (0, 2):  # brilho do orbe orbita a borda
        ox, oy = [(66, 40), (66, 40), (78, 40), (78, 40)][f], 0
        ga.fx_draw(im, lambda d: ga.sparkle(d, [66, 66, 78, 78][f], [40, 48, 48, 40][f],
                                            (255, 255, 240, 220), 1))
    if f == 2:       # terceiro olho cintila
        ga.fx_draw(im, lambda d: ga.sparkle(d, 47, 24, (255, 255, 240, 230), 1))
    return im

IDLE = {'pet_raposa': idle_raposa, 'pet_devorador': idle_devorador, 'cmp_oraculo': idle_oraculo}
NEW = ['pet_raposa', 'pet_devorador', 'cmp_oraculo']

def main():
    os.makedirs(ROOT, exist_ok=True)
    n = 0
    for key in NEW:
        # sprite base = ícone no catálogo/summons
        g2.PETS[key]().im.save(f'{ROOT}/{key}.png', optimize=True); n += 1
        for f in range(4):
            IDLE[key](f).save(f'{ROOT}/{key}_idle_{f}.png', optimize=True); n += 1
        for f in range(2):
            ga.cheer_frame(key, f).save(f'{ROOT}/{key}_cheer_{f}.png', optimize=True); n += 1
        for f in range(2):
            ga.sad_frame(key, f).save(f'{ROOT}/{key}_sad_{f}.png', optimize=True); n += 1
    print(f'novos pets ok — {n} PNGs')
    # contact sheet p/ inspeção (3 linhas × 9 colunas: base + 8 frames)
    cols = 9
    sheet = Image.new('RGBA', (cols * 100, len(NEW) * 116), (22, 16, 32, 255))
    d = ImageDraw.Draw(sheet)
    for r, key in enumerate(NEW):
        files = [f'{key}.png'] + [f'{key}_idle_{f}.png' for f in range(4)] + \
                [f'{key}_cheer_{f}.png' for f in range(2)] + [f'{key}_sad_{f}.png' for f in range(2)]
        for c, fn in enumerate(files):
            im = Image.open(f'{ROOT}/{fn}').convert('RGBA')
            sheet.paste(im, (c * 100 + 2, r * 116 + 2), im)
        d.text((4, r * 116 + 100), key, fill=(232, 224, 208, 255))
    sheet.save('/home/z/my-project/scripts/eidryn_html/sheet_new_pets.png')
    print('sheet ok')

if __name__ == '__main__':
    main()
