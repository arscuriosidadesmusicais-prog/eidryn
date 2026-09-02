#!/usr/bin/env python3
"""gen_sprites_v2.py — Edição do Eclipse: herói (2 posturas), 35 inimigos,
7 chefes 192px, genérico e 10 pets. Pixel art 1:1 com contorno + luz direcional."""
import sys, random
sys.path.insert(0, '/home/z/my-project/scripts/eidryn_html')
from pxkit import CV, M, ramp, shade, mix, clamp8

ROOT = '/home/z/my-project/eidryn/assets/sprites'
rng = random.Random(11407)

# paletas por região: (corpo, sombra, detalhe/accent, olho)
REG = {
    'bosque_vidro':   ((58, 116, 96),  (36, 76, 62),   (70, 200, 178), (120, 240, 216)),
    'pantano':        ((104, 124, 48), (70, 86, 30),   (150, 178, 62), (210, 232, 110)),
    'cidadela':       ((112, 78, 152), (78, 52, 112),  (160, 96, 216), (200, 150, 245)),
    'deserto_cinzas': ((156, 100, 56), (112, 70, 40),  (232, 131, 58), (250, 180, 100)),
    'picos':          ((76, 104, 160), (52, 72, 118),  (86, 156, 226), (170, 214, 250)),
    'coracao':        ((148, 48, 70),  (104, 32, 50),  (214, 76, 102), (250, 140, 160)),
    'abismo':         ((52, 42, 74),   (34, 26, 52),   (235, 222, 190), (255, 250, 230)),
}

# =============== ARQUÉTIPOS DE INIMIGO (96×96) ===============
def arch_beast(cv, body, dark, acc, eye, opts=None):
    o = opts or {}
    b = ramp(body); dk = ramp(dark)
    # corpo quadrúpede (vista 3/4), cabeça à direita, tronco afunilado
    cv.poly([(20, 50), (60, 44), (76, 46), (76, 62), (58, 68), (22, 66)], b[2])
    cv.ell(26, 56, 10, 9, b[1])                # anca
    cv.r(58, 42, 18, 16, b[2])                 # peito/ombro
    cv.r(62, 40, 12, 4, b[3])                  # nuca clara
    # pernas
    for lx in (24, 34, 46, 56):
        cv.r(lx, 66, 7, 16, b[1]); cv.r(lx, 80, 9, 5, dk[1])
    # cauda espinhosa
    for i in range(3):
        cv.r(12-i*5, 40+i*4, 6, 4, b[1])
    cv.tri(4, 34, 10, 8, b[2])
    # pescoço + cabeça
    cv.r(70, 34, 12, 14, b[2])
    cv.r(78, 30, 14, 14, b[3])                 # cabeça
    cv.r(88, 36, 5, 6, b[2])                   # focinho
    cv.tri(88, 40, 5, 4, (240, 240, 240, 255), flip=True)  # presa
    # orelha/ Chifres
    cv.tri(76, 24, 6, 8, b[3]); cv.tri(84, 24, 6, 8, b[2])
    # crista dorsal
    for i in range(5):
        cv.tri(26+i*8, 40, 6, 8, dk[2])
    # olho brilhante
    cv.r(82, 34, 4, 4, (250, 250, 255, 255)); cv.r(83, 35, 2, 2, eye)
    if o.get('crystal'):  # cristais nas costas (bosque)
        for i, (cx, cy, ch) in enumerate([(30, 44, 12), (40, 40, 16), (50, 42, 10)]):
            cv.poly([(cx, cy), (cx+5, cy-ch), (cx+10, cy)], acc)
            cv.poly([(cx+2, cy), (cx+5, cy-ch), (cx+7, cy)], mix(acc, (255,255,255,255), 0.45))
    if o.get('ice'):      # gelo nas pernas (picos)
        for lx in (24, 34, 46, 56):
            cv.r(lx-1, 76, 9, 6, mix(acc, (255,255,255,255), 0.35))
    if o.get('maw'):      # boca enorme (devorador): mandíbulas extras
        cv.tri(74, 48, 20, 10, dk[2], flip=True)
        for i in range(4):
            cv.tri(76+i*4, 44, 3, 6, (250, 244, 228, 255), flip=True)

def arch_flyer(cv, body, dark, acc, eye, opts=None):
    o = opts or {}
    b = ramp(body); dk = ramp(dark)
    # asas abertas (morcego/ave) — desenho por lado com x normalizado
    for i in range(4):
        # asa esquerda (ponta em x=8)
        wx = 44 - i*10
        cv.r(wx, 30 + i*6, max(1, 44 - wx), 5, b[2 - min(i, 2)])
        # asa direita (ponta em x=88)
        rx = 52 + i*10
        cv.r(52, 30 + i*6, max(1, rx - 52 + 1), 5, b[2 - min(i, 2)])
    cv.poly([(44, 30), (8, 26), (20, 44), (40, 44)], b[1])
    cv.poly([(52, 30), (88, 26), (76, 44), (56, 44)], b[1])
    # dedos da asa
    cv.ln(44, 32, 10, 28, dk[1], 1)
    cv.ln(52, 32, 86, 28, dk[1], 1)
    # corpo
    cv.r(42, 34, 12, 26, b[3])
    cv.r(44, 58, 8, 8, b[2])
    # garras
    cv.tri(42, 64, 4, 6, (230, 226, 210, 255), flip=True)
    cv.tri(50, 64, 4, 6, (230, 226, 210, 255), flip=True)
    # cabeça
    cv.r(40, 24, 16, 14, b[3])
    cv.tri(44, 18, 8, 8, b[2])                 # topete/bico
    cv.tri(40, 30, 4, 5, (245, 200, 120, 255), flip=True)  # bico
    # olhos
    cv.r(42, 30, 3, 3, (255, 255, 255, 255)); cv.r(43, 31, 2, 2, eye)
    cv.r(51, 30, 3, 3, (255, 255, 255, 255)); cv.r(52, 31, 2, 2, eye)
    if o.get('crystal'):
        cv.r(44, 40, 8, 8, mix(acc, (255,255,255,255), 0.3)); cv.box(44, 40, 8, 8, (255,255,255,120), 1)

def arch_brute(cv, body, dark, acc, eye, opts=None):
    o = opts or {}
    b = ramp(body); dk = ramp(dark)
    # colosso corcunda
    cv.r(30, 40, 36, 30, b[2])                 # tronco
    cv.r(24, 44, 10, 22, b[1])                 # braço esq
    cv.r(62, 44, 10, 22, b[1])                 # braço dir
    cv.r(20, 60, 16, 10, b[2]); cv.r(60, 60, 16, 10, b[2])  # punhos
    cv.r(34, 68, 12, 16, dk[2]); cv.r(50, 68, 12, 16, dk[2])  # pernas curtas
    cv.r(32, 82, 16, 6, dk[1]); cv.r(48, 82, 16, 6, dk[1])
    # cabeça pequena afundada
    cv.r(38, 26, 20, 16, b[3])
    cv.r(40, 32, 6, 4, (20, 14, 24, 255)); cv.r(50, 32, 6, 4, (20, 14, 24, 255))
    cv.p(41, 33, eye); cv.p(51, 33, eye)
    # rachaduras com brilho interno
    for (x0, y0, x1, y1) in [(38, 44, 46, 54), (52, 46, 58, 56), (34, 56, 42, 64)]:
        cv.ln(x0, y0, x1, y1, dk[1], 1)
        cv.p(x1-1, y1, acc); cv.p(x0, y0, shade(acc, 0.8))
    if o.get('thorn'):    # espinhos andantes (bosque): galhos
        for (tx, ty, th) in [(28, 36, 10), (44, 32, 14), (58, 38, 9)]:
            cv.tri(tx, ty-th, 7, th, dk[2])
        cv.ln(20, 50, 12, 34, dk[2], 2); cv.ln(66, 50, 74, 32, dk[2], 2)
    if o.get('fur'):      # yeti: pelos
        for i in range(14):
            cv.p(26 + rng.randrange(40), 40 + rng.randrange(26), b[3])
        cv.r(34, 70, 12, 14, b[2]); cv.r(50, 70, 12, 14, b[2])
    if o.get('rune'):     # runas flutuantes (custódio)
        cv.p(24, 30, acc, 3); cv.p(66, 28, acc, 3); cv.p(70, 52, acc, 2)

def arch_spirit(cv, body, dark, acc, eye, opts=None):
    o = opts or {}
    b = ramp(body); dk = ramp(dark)
    # manto flutuante esfarrapado
    pts = [(36, 24), (60, 24), (64, 44), (58, 62), (60, 78), (52, 68), (48, 82),
           (44, 66), (38, 76), (36, 56), (32, 42)]
    cv.poly(pts, b[2])
    cv.poly([(40, 28), (56, 28), (58, 44), (50, 60), (46, 44), (42, 46)], dk[2])
    # capuz
    cv.r(38, 18, 20, 14, b[3])
    cv.r(41, 24, 14, 7, (12, 8, 18, 255))      # vazio do capuz
    cv.r(44, 26, 3, 3, (255, 255, 255, 255)); cv.p(45, 27, eye)
    cv.r(49, 26, 3, 3, (255, 255, 255, 255)); cv.p(50, 27, eye)
    # fragmentos orbitando
    cv.p(26, 40, acc, 3); cv.p(68, 46, acc, 2); cv.p(24, 58, acc, 2); cv.p(70, 62, acc, 3)
    # cauda espectral
    cv.poly([(44, 80), (48, 80), (46, 92)], shade(b[1], 0.9))
    if o.get('flame'):    # fogo-fátuo: chama no topo
        cv.poly([(42, 20), (48, 6), (54, 20)], acc)
        cv.poly([(44, 20), (48, 11), (52, 20)], mix(acc, (255,255,255,255), 0.5))
    if o.get('djinn'):    # corpo de fumaça (djinn)
        cv.poly([(34, 60), (40, 76), (36, 92), (56, 90), (62, 74), (58, 58)], shade(b[1], 0.95))
        cv.p(30, 70, acc, 3); cv.p(64, 66, acc, 2)
    if o.get('rift'):     # fenda viva: fenda vertical brilhante
        cv.r(45, 34, 4, 36, (255, 252, 240, 255)); cv.r(46, 34, 2, 36, acc)
        for y in range(36, 68, 8):
            cv.p(42, y, acc); cv.p(52, y+4, acc)

def arch_crawler(cv, body, dark, acc, eye, opts=None):
    o = opts or {}
    b = ramp(body); dk = ramp(dark)
    # abdômen + cefalotórax (aranha) / escorpião
    cv.ell(34, 62, 18, 14, b[2])
    cv.ell(34, 62, 11, 8, b[1])
    cv.r(52, 56, 16, 14, b[3])                 # cabeça
    # 8 pernas (4 por lado)
    for i, (x0, y0, x1, y1, x2, y2) in enumerate([
            (50, 60, 66, 48, 78, 60), (52, 64, 70, 56, 84, 70),
            (50, 68, 68, 68, 80, 80), (48, 70, 62, 74, 72, 88)]):
        cv.ln(x0, y0, x1, y1, dk[2], 2); cv.ln(x1, y1, x2, y2, dk[1], 2)
        cv.ln(50-(x0-46), y0, 96-x1, y1, dk[2], 2); cv.ln(96-x1, y1, 96-x2, y2, dk[1], 2)
    # mandíbulas
    cv.tri(66, 58, 5, 8, (240, 236, 220, 255)); cv.tri(66, 66, 5, 8, (240, 236, 220, 255))
    # olhos múltiplos
    cv.p(58, 58, eye, 2); cv.p(62, 57, eye, 2); cv.p(58, 64, eye); cv.p(62, 65, eye)
    if o.get('sting'):    # ferrão (escorpião)
        cv.ln(20, 50, 12, 34, dk[2], 3)
        cv.tri(8, 28, 9, 9, acc, flip=True)
        cv.ln(14, 60, 4, 44, dk[1], 2)
    if o.get('crystal'):
        for i in range(5):
            cx = 26 + i*5
            cv.poly([(cx, 52), (cx+2, 44-(i%3)*2), (cx+4, 52)], mix(acc, (255,255,255,255), 0.3))

def arch_worm(cv, body, dark, acc, eye, opts=None):
    b = ramp(body); dk = ramp(dark)
    # verme segmentado em curva
    segs = [(20, 70, 16), (32, 58, 15), (46, 52, 14), (60, 54, 13), (72, 62, 12)]
    for i, (x, y, r) in enumerate(segs):
        cv.ell(x, y, r, r, b[2] if i % 2 == 0 else b[1])
        cv.ell(x, y-r//3, r-4, r-5, b[3] if i % 2 == 0 else b[2])
    # boca circular com dentes (frente à esquerda? cabeça à direita-baixo)
    hx, hy = 80, 72
    cv.ell(hx, hy, 12, 10, dk[2])
    cv.ell(hx, hy, 7, 6, (14, 8, 16, 255))
    for a in range(6):
        ang = a * math_pi / 3
        tx, ty = hx + math_cos(ang)*8, hy + math_sin(ang)*7
        cv.p(tx, ty, (248, 240, 220, 255), 2)
    # olhos pequenos
    cv.p(74, 64, eye, 2); cv.p(84, 66, eye, 2)

import math as _math
math_pi = _math.pi; math_cos = _math.cos; math_sin = _math.sin

def arch_blob(cv, body, dark, acc, eye, opts=None):
    b = ramp(body); dk = ramp(dark)
    cv.ell(48, 64, 30, 22, b[2])
    cv.ell(44, 58, 20, 14, b[3])
    # protuberâncias e olhos dispersos
    for (x, y, r) in [(28, 52, 5), (62, 50, 6), (50, 42, 4), (36, 70, 4)]:
        cv.ell(x, y, r, r, b[1])
    for (x, y) in [(36, 56), (54, 52), (46, 68), (62, 66), (30, 66)]:
        cv.r(x, y, 3, 3, (250, 248, 240, 255)); cv.p(x+1, y+1, eye)
    # gosga / gotelas
    cv.poly([(24, 78), (28, 90), (32, 78)], b[1])
    cv.poly([(60, 80), (64, 88), (68, 78)], b[1])

def arch_eye(cv, body, dark, acc, eye, opts=None):
    b = ramp(body); dk = ramp(dark)
    # olho gigante flutuante com tentáculos
    cv.ell(48, 48, 26, 24, b[2])
    cv.ell(48, 48, 19, 17, b[1])
    cv.ell(48, 48, 12, 11, (250, 246, 236, 255))
    cv.ell(48, 48, 6, 6, (16, 10, 22, 255))
    cv.p(46, 46, eye, 2)
    # íris brilho
    cv.p(45, 45, (255, 255, 255, 255))
    # cílios/veias
    for a in range(8):
        ang = a * _math.pi / 4
        x0, y0 = 48 + _math.cos(ang)*24, 48 + _math.sin(ang)*22
        x1, y1 = 48 + _math.cos(ang)*30, 48 + _math.sin(ang)*28
        cv.ln(x0, y0, x1, y1, dk[2], 2)
    # tentáculos inferiores
    for (x0, y0, x1, y1) in [(36, 68, 30, 84), (48, 72, 48, 88), (60, 68, 66, 84)]:
        cv.ln(x0, y0, x1, y1, b[1], 3)

ARCH_HUMANOID_HEADS = {
    'hood': lambda cv, b, dk, acc: (
        cv.r(38, 20, 20, 16, b[3]),
        cv.r(41, 26, 14, 7, (12, 8, 18, 255)),
        cv.p(45, 28, acc), cv.p(51, 28, acc)),
    'skull': lambda cv, b, dk, acc: (
        cv.r(39, 20, 18, 15, (222, 214, 192, 255)),
        cv.r(41, 25, 5, 5, (20, 14, 24, 255)), cv.r(50, 25, 5, 5, (20, 14, 24, 255)),
        cv.ln(44, 32, 52, 32, (20, 14, 24, 255), 1)),
    'helm': lambda cv, b, dk, acc: (
        cv.r(38, 19, 20, 17, dk[3]),
        cv.r(41, 26, 14, 4, (12, 8, 18, 255)),
        cv.p(44, 27, acc), cv.p(52, 27, acc),
        cv.tri(44, 12, 8, 8, dk[3])),
    'faceless': lambda cv, b, dk, acc: (
        cv.r(38, 21, 20, 15, b[3]),
        cv.ln(42, 28, 54, 28, (12, 8, 18, 255), 1)),
    'treant': lambda cv, b, dk, acc: (
        cv.r(37, 18, 22, 17, dk[3]),
        cv.p(43, 26, acc, 2), cv.p(51, 26, acc, 2),
        cv.tri(40, 8, 6, 10, dk[2]), cv.tri(48, 10, 6, 9, dk[2])),
}
WEAPONS = {
    'staff': lambda cv, b, dk, acc: (
        cv.ln(68, 30, 68, 74, (90, 62, 40, 255), 2),
        cv.ell(68, 26, 5, 5, acc), cv.p(68, 26, (255, 255, 255, 200))),
    'bow': lambda cv, b, dk, acc: (
        cv.d.arc([64, 22, 88, 62], 300, 60, fill=(140, 108, 70, 255), width=2),
        cv.ln(76, 24, 76, 60, (200, 196, 180, 255), 1)),
    'sword': lambda cv, b, dk, acc: (
        cv.r(72, 30, 4, 36, (188, 194, 212, 255)),
        cv.r(73, 30, 2, 36, (240, 244, 252, 255)),
        cv.r(68, 66, 12, 3, acc), cv.r(73, 69, 4, 8, (90, 62, 40, 255))),
    'dagger2': lambda cv, b, dk, acc: (
        cv.r(64, 44, 3, 18, (220, 224, 236, 255)), cv.r(70, 44, 3, 18, (220, 224, 236, 255)),
        cv.r(62, 60, 7, 2, acc), cv.r(68, 60, 7, 2, acc)),
    'flask': lambda cv, b, dk, acc: (
        cv.ell(72, 52, 6, 7, mix(acc, (120, 240, 160, 255), 0.35)),
        cv.r(70, 42, 5, 6, (160, 170, 190, 255))),
    'trident': lambda cv, b, dk, acc: (
        cv.ln(72, 28, 72, 74, (110, 120, 140, 255), 2),
        cv.r(66, 24, 3, 10, (110, 120, 140, 255)), cv.r(75, 24, 3, 10, (110, 120, 140, 255)),
        cv.r(68, 30, 9, 3, (110, 120, 140, 255)), cv.p(71, 20, acc, 2)),
    'none': lambda cv, b, dk, acc: None,
}

def arch_humanoid(cv, body, dark, acc, eye, opts=None):
    o = opts or {}
    b = ramp(body); dk = ramp(dark)
    head = ARCH_HUMANOID_HEADS.get(o.get('head', 'hood'))
    # pernas
    cv.r(38, 62, 9, 22, dk[2]); cv.r(49, 62, 9, 22, dk[2])
    cv.r(36, 82, 12, 5, dk[1]); cv.r(48, 82, 12, 5, dk[1])
    # túnica/peitoral
    if o.get('robe'):
        cv.poly([(32, 38), (64, 38), (68, 72), (28, 72)], b[2])
        cv.r(30, 68, 36, 4, dk[2])
    else:
        cv.r(34, 38, 28, 26, b[2])
        cv.r(34, 38, 28, 3, b[3])
    # braços
    cv.r(28, 40, 7, 20, b[1]); cv.r(61, 40, 7, 20, b[1])
    cv.r(27, 58, 9, 6, b[2]); cv.r(60, 58, 9, 6, b[2])
    head(cv, b, dk, acc)
    WEAPONS.get(o.get('weapon', 'sword'))(cv, b, dk, acc)
    # cinto brilhante
    cv.r(34, 56, 28, 2, acc)

def draw_enemy(region_id, idx, name_hint):
    body, dark, acc, eye = REG[region_id]
    o = {}
    key = (region_id, idx)
    cv = CV(96)
    if region_id == 'bosque_vidro':
        if idx == 0: arch_beast(cv, body, dark, acc, eye)
        elif idx == 1: arch_flyer(cv, body, dark, acc, eye, {'crystal': True})
        elif idx == 2: arch_brute(cv, body, dark, acc, eye, {'thorn': True})
        elif idx == 3: arch_humanoid(cv, body, dark, acc, eye, {'head': 'treant', 'weapon': 'none', 'robe': True})
        else: arch_crawler(cv, body, dark, acc, eye, {'crystal': True})
    elif region_id == 'pantano':
        if idx == 0: arch_humanoid(cv, body, dark, acc, eye, {'head': 'faceless', 'weapon': 'sword', 'robe': True})
        elif idx == 1: arch_humanoid(cv, body, dark, acc, eye, {'head': 'hood', 'weapon': 'staff', 'robe': True})
        elif idx == 2: arch_worm(cv, body, dark, acc, eye)
        elif idx == 3: arch_spirit(cv, body, dark, acc, eye, {'flame': True})
        else: arch_beast(cv, body, dark, acc, eye, {'maw': True})
    elif region_id == 'cidadela':
        if idx == 0: arch_brute(cv, body, dark, acc, eye, {'rune': True})
        elif idx == 1: arch_humanoid(cv, body, dark, acc, eye, {'head': 'helm', 'weapon': 'sword'})
        elif idx == 2: arch_humanoid(cv, body, dark, acc, eye, {'head': 'hood', 'weapon': 'bow'})
        elif idx == 3: arch_beast(cv, body, dark, acc, eye)
        else: arch_humanoid(cv, body, dark, acc, eye, {'head': 'hood', 'weapon': 'flask', 'robe': True})
    elif region_id == 'deserto_cinzas':
        if idx == 0: arch_worm(cv, body, dark, acc, eye)
        elif idx == 1: arch_spirit(cv, body, dark, acc, eye, {'djinn': True})
        elif idx == 2: arch_humanoid(cv, body, dark, acc, eye, {'head': 'skull', 'weapon': 'staff'})
        elif idx == 3: arch_crawler(cv, body, dark, acc, eye, {'sting': True})
        else: arch_humanoid(cv, body, dark, acc, eye, {'head': 'faceless', 'weapon': 'sword', 'robe': True})
    elif region_id == 'picos':
        if idx == 0: arch_flyer(cv, body, dark, acc, eye)
        elif idx == 1: arch_brute(cv, body, dark, acc, eye, {'fur': True})
        elif idx == 2: arch_beast(cv, body, dark, acc, eye, {'ice': True})
        elif idx == 3: arch_spirit(cv, body, dark, acc, eye)
        else: arch_humanoid(cv, body, dark, acc, eye, {'head': 'hood', 'weapon': 'none', 'robe': True})
    elif region_id == 'coracao':
        if idx == 0: arch_humanoid(cv, body, dark, acc, eye, {'head': 'hood', 'weapon': 'dagger2', 'robe': True})
        elif idx == 1: arch_brute(cv, body, dark, acc, eye, {'rune': True})
        elif idx == 2: arch_spirit(cv, body, dark, acc, eye)
        elif idx == 3: arch_beast(cv, body, dark, acc, eye, {'maw': True})
        else: arch_humanoid(cv, body, dark, acc, eye, {'head': 'helm', 'weapon': 'staff', 'robe': True})
    else:  # abismo
        if idx == 0: arch_blob(cv, body, dark, acc, eye)
        elif idx == 1: arch_humanoid(cv, body, dark, acc, eye, {'head': 'helm', 'weapon': 'sword'})
        elif idx == 2: arch_beast(cv, body, dark, acc, eye, {'maw': True})
        elif idx == 3: arch_spirit(cv, body, dark, acc, eye, {'rift': True})
        else: arch_eye(cv, body, dark, acc, eye)
    cv.outline()
    cv.light_pass()
    cv.rim_light(shade(acc, 1.05), 0.30)
    return cv

# =============== HERÓI (96×96, 2 posturas) ===============
def draw_hero(attack=False):
    cv = CV(96)
    steel = ramp((126, 134, 158)); obs = ramp((46, 40, 66)); gold = ramp((232, 163, 58))
    blood = ramp((136, 44, 66)); dk = ramp((26, 22, 38))
    glow_eye = (120, 245, 220, 255)
    # ---- capa ondulada (atrás) ----
    cape = CV(96)
    if attack:
        cape.poly([(28, 28), (64, 30), (76, 64), (68, 88), (58, 70), (50, 86), (40, 68), (24, 72)], blood[1])
        cape.poly([(32, 30), (62, 32), (70, 62), (52, 58), (36, 62)], blood[0])
    else:
        cape.poly([(26, 30), (62, 30), (70, 60), (64, 84), (54, 66), (48, 88), (38, 66), (20, 70)], blood[1])
        cape.poly([(30, 32), (60, 32), (66, 58), (50, 56), (34, 60)], blood[0])
    cape.outline((18, 8, 16, 255))
    cape.light_pass(1.14, 1.08, 0.8, 0.72)
    cv.paste_under(cape, 0, 0)
    # ---- pernas + botas ----
    cv.r(38, 62, 9, 18, dk[2]); cv.r(49, 62, 9, 18, dk[2])
    cv.r(37, 66, 11, 2, gold[1]); cv.r(48, 66, 11, 2, gold[1])
    cv.r(35, 79, 13, 7, dk[1]); cv.r(48, 79, 13, 7, dk[1])
    cv.r(35, 84, 13, 2, gold[0]); cv.r(48, 84, 13, 2, gold[0])
    # ---- tasset ----
    cv.r(34, 56, 28, 7, obs[2]); cv.r(34, 62, 28, 2, gold[1])
    cv.tri(40, 62, 6, 6, obs[1]); cv.tri(50, 62, 6, 6, obs[1])
    # ---- tronco ----
    cv.r(33, 36, 30, 22, obs[3])
    cv.r(34, 37, 28, 3, obs[4] if len(obs) > 4 else shade(obs[3], 1.2))
    cv.r(33, 36, 2, 22, gold[1]); cv.r(61, 36, 2, 22, gold[1])
    cv.ln(36, 46, 60, 46, gold[0], 1)
    cv.ln(47, 38, 47, 45, obs[0], 1)
    # núcleo eclipse
    cv.ell(48, 50, 5, 5, (14, 10, 20, 255))
    cv.ell(48, 50, 3, 3, (70, 200, 178, 255))
    cv.p(47, 49, (190, 255, 244, 255))
    # ---- ombreiras 2 camadas ----
    for px_ in (24, 62):
        cv.r(px_, 30, 12, 9, steel[3])
        cv.r(px_, 30, 12, 2, steel[4] if len(steel) > 4 else shade(steel[3], 1.25))
        cv.r(px_, 38, 12, 2, gold[2])
        cv.r(px_ + 4, 34, 4, 3, steel[2])
    # ---- braços ----
    if attack:
        cv.r(58, 24, 9, 12, steel[3])           # braço erguido
        cv.r(56, 18, 9, 8, steel[3])            # mão alta
        cv.r(28, 40, 8, 16, steel[3])
        cv.r(27, 54, 10, 6, dk[2])
    else:
        cv.r(28, 40, 8, 16, steel[3])
        cv.r(27, 54, 10, 6, dk[2])
        cv.r(60, 40, 8, 12, steel[3])
        cv.r(59, 50, 10, 6, dk[2])              # luva segurando
    # ---- cabeça/elmo ----
    cv.r(38, 14, 20, 18, steel[3])
    cv.r(38, 14, 20, 3, shade(steel[3], 1.3))
    cv.r(40, 24, 16, 5, (10, 8, 16, 255))       # visor
    cv.r(42, 25, 4, 3, glow_eye); cv.r(50, 25, 4, 3, glow_eye)
    cv.r(38, 12, 20, 3, gold[2])                # faixa dourada
    cv.r(36, 18, 2, 9, steel[2]); cv.r(58, 18, 2, 9, steel[2])
    cv.tri(44, 2, 4, 11, gold[3])               # pluma
    cv.tri(48, 2, 4, 11, gold[2])
    # ---- espada ----
    if attack:
        # lâmina diagonal 45° sobre o ombro, da mão (62,20) até (88,0)
        for i in range(30):
            x = 64 + i; y = 25 - i
            f = 1.35 - i * 0.012
            c = mix((255, 244, 208, 255), (168, 176, 198, 255), min(1, i/22))
            cv.r(x, y, 3, 3, c)
            if i % 6 == 0: cv.r(x+1, y+2, 1, 1, (255, 250, 225, 200))
        cv.r(58, 22, 10, 3, gold[2])            # guarda
        cv.r(61, 25, 4, 7, dk[1])               # punho
        cv.p(91, 3, (255, 250, 230, 255), 3)    # ponta brilho
        # arco de golpe
        for i in range(12):
            a = 0.15 + i*0.05
            ax = 58 + int(28 * a); ay = 38 - int(30 * (1 - a * a) * 0.9)
            cv.p(ax, ay, (255, 240, 190, 120 + i*8))
    else:
        # lâmina levemente inclinada apoiada, da guarda (74,50) até topo (80,12)
        for i in range(38):
            y = 50 - i
            x = 74 + i // 5
            c = mix((255, 244, 208, 255), (168, 176, 198, 255), min(1, i/26))
            cv.r(x, y, 3, 1, c)
            if i % 7 == 0: cv.r(x, y, 1, 1, (255, 250, 230, 220))
        cv.r(70, 48, 12, 3, gold[2])            # guarda
        cv.r(73, 51, 4, 8, dk[1])               # punho
        cv.p(75, 52, gold[1])
    cv.outline((14, 10, 22, 255))
    cv.light_pass(1.18, 1.10, 0.78, 0.70)
    cv.rim_light((255, 224, 160, 255), 0.35)
    return cv

# =============== CHEFES (192×192) ===============
def boss_stag():
    """Guardiã do Bosque Morto — cervo espectral colossal"""
    cv = CV(192)
    b = ramp((64, 124, 104)); dk = ramp((40, 82, 68)); acc = (86, 232, 206, 255)
    # corpo
    cv.r(46, 92, 84, 42, b[2]); cv.r(38, 100, 14, 26, b[1])
    cv.r(120, 84, 26, 34, b[2])
    # pernas longas
    for lx in (48, 66, 92, 112):
        cv.r(lx, 132, 10, 40, b[1]); cv.r(lx-2, 166, 14, 8, dk[1])
    # peito/pescoço
    cv.r(138, 52, 22, 40, b[2])
    # cabeça
    cv.r(148, 40, 26, 22, b[3])
    cv.r(168, 46, 10, 8, b[2])
    # galhadas de cristal
    for (bx, by, bh) in [(146, 38, 34), (156, 34, 44), (166, 38, 30)]:
        cv.poly([(bx, by), (bx+5, by-bh), (bx+10, by)], mix(acc, (255,255,255,255), 0.25))
        cv.poly([(bx+3, by), (bx+5, by-bh), (bx+8, by)], (255, 255, 255, 190))
    # manto morto (menor e mais legível)
    cv.poly([(70, 96), (98, 96), (104, 142), (90, 134), (82, 150), (74, 132), (64, 140)], (64, 108, 92, 255))
    cv.r(48, 122, 60, 6, (96, 150, 128, 255))   # barriga iluminada
    # olho + núcleo brilhante
    cv.r(154, 46, 5, 5, (255,255,255,255)); cv.p(155, 47, acc, 3)
    cv.ell(88, 108, 8, 8, (14, 10, 20, 255)); cv.ell(88, 108, 5, 5, acc)
    cv.outline((12, 10, 18, 255)); cv.light_pass(); cv.rim_light(acc, 0.4)
    return cv

def boss_drowned():
    """Lorde Afogado Valdreth — afogado colossal com tridente"""
    cv = CV(192)
    b = ramp((74, 112, 66)); dk = ramp((48, 76, 44)); acc = (168, 232, 120, 255)
    # pernasrobustas
    cv.r(64, 118, 22, 46, dk[2]); cv.r(102, 118, 22, 46, dk[2])
    cv.r(60, 160, 30, 10, dk[1]); cv.r(98, 160, 30, 10, dk[1])
    # tronco barrigudo
    cv.ell(94, 92, 40, 34, b[2])
    cv.ell(86, 84, 28, 22, b[3])
    # casaco rasgado
    cv.poly([(58, 74), (130, 74), (138, 140), (114, 130), (100, 150), (84, 128), (56, 138)], (76, 112, 70, 255))
    # braços
    cv.r(46, 78, 16, 44, b[1]); cv.r(126, 78, 16, 40, b[1])
    cv.r(42, 118, 22, 12, b[2])
    # tridente
    cv.ln(150, 40, 150, 150, (128, 140, 156, 255), 4)
    cv.r(140, 34, 6, 16, (128, 140, 156, 255)); cv.r(154, 34, 6, 16, (128, 140, 156, 255))
    cv.r(140, 28, 20, 8, (128, 140, 156, 255)); cv.p(149, 22, acc, 3)
    # cabeça afogada
    cv.r(78, 38, 32, 28, b[3])
    cv.r(84, 48, 7, 5, (10, 14, 12, 255)); cv.r(100, 48, 7, 5, (10, 14, 12, 255))
    cv.p(86, 49, acc, 3); cv.p(102, 49, acc, 3)
    # coroa de algas
    for (cx, cy, ch) in [(76, 36, 16), (86, 32, 22), (96, 34, 18), (106, 38, 14)]:
        cv.poly([(cx, cy), (cx+4, cy-ch), (cx+8, cy)], dk[0])
    # lanterna no peito
    cv.r(88, 96, 12, 14, (30, 26, 24, 255)); cv.r(90, 98, 8, 10, acc)
    cv.outline((10, 12, 10, 255)); cv.light_pass(); cv.rim_light(acc, 0.3)
    return cv

def boss_king():
    """Regente Morvain, o Último Rei"""
    cv = CV(192)
    b = ramp((96, 70, 134)); dk = ramp((64, 46, 96)); gold = ramp((232, 163, 58)); acc = (196, 130, 250, 255)
    # capa real longa
    cv.poly([(62, 62), (130, 62), (146, 178), (110, 168), (96, 184), (82, 168), (46, 178)], (98, 72, 138, 255))
    # pernas armadura
    cv.r(74, 122, 16, 52, dk[2]); cv.r(102, 122, 16, 52, dk[2])
    cv.r(72, 170, 20, 8, gold[0]); cv.r(100, 170, 20, 8, gold[0])
    # peitoral real
    cv.r(70, 76, 52, 48, b[2])
    cv.r(70, 76, 52, 4, b[3])
    cv.r(70, 76, 4, 48, gold[1]); cv.r(118, 76, 4, 48, gold[1])
    cv.ln(74, 98, 118, 98, gold[0], 2)
    cv.ell(96, 100, 7, 7, (20, 14, 28, 255)); cv.ell(96, 100, 4, 4, acc)
    # ombreiras altas
    for px_ in (56, 118):
        cv.r(px_, 68, 18, 12, gold[1])
        cv.tri(px_, 56, 18, 14, gold[2])
    # cabeça + coroa enorme
    cv.r(80, 44, 32, 28, dk[3])
    cv.r(84, 52, 8, 6, (8, 6, 12, 255)); cv.r(100, 52, 8, 6, (8, 6, 12, 255))
    cv.p(86, 53, acc, 3); cv.p(102, 53, acc, 3)
    for (cx, ch) in [(76, 18), (86, 26), (96, 30), (106, 26), (114, 18)]:
        cv.poly([(cx, 46), (cx+5, 46-ch), (cx+10, 46)], gold[2])
    cv.r(74, 42, 44, 6, gold[3])
    # espada cravada
    cv.r(156, 60, 8, 100, (196, 202, 220, 255)); cv.r(158, 60, 3, 100, (250, 252, 255, 255))
    cv.r(148, 154, 24, 5, gold[2]); cv.r(156, 158, 8, 12, gold[0])
    cv.outline((10, 8, 16, 255)); cv.light_pass(); cv.rim_light(acc, 0.4)
    return cv

def boss_sultan():
    """Sultão de Cinzas Ahmar — djinn de cinzas"""
    cv = CV(192)
    b = ramp((170, 108, 62)); dk = ramp((122, 76, 44)); acc = (244, 158, 76, 255)
    # cauda de fumaça
    cv.poly([(70, 120), (86, 150), (76, 184), (116, 180), (108, 148), (122, 122)], (128, 82, 48, 255))
    cv.p(64, 138, acc, 3); cv.p(126, 134, acc, 2)
    # tronco forte
    cv.r(62, 66, 68, 58, b[2])
    cv.r(62, 66, 68, 6, b[3])
    cv.ell(96, 96, 12, 10, (30, 20, 18, 255)); cv.ell(96, 96, 7, 7, acc)  # núcleo brasa
    # braços com cimitarras
    cv.r(46, 70, 18, 46, b[1]); cv.r(128, 70, 18, 46, b[1])
    for i in range(30):
        cv.r(34 + i//3, 40 + i, 3, 2, (236, 240, 248, 255))
        cv.r(146 - i//3 + 10, 40 + i, 3, 2, (236, 240, 248, 255))
    # cabeça + turbante
    cv.r(80, 34, 32, 28, b[3])
    cv.r(84, 44, 7, 5, (16, 10, 12, 255)); cv.r(100, 44, 7, 5, (16, 10, 12, 255))
    cv.p(86, 45, (255, 220, 140, 255), 3); cv.p(102, 45, (255, 220, 140, 255), 3)
    cv.ell(96, 30, 22, 10, (222, 198, 156, 255))
    cv.ell(96, 26, 20, 8, (206, 180, 138, 255))
    cv.p(96, 22, acc, 4)
    # braaceiras de ombro
    for px_ in (52, 122):
        cv.r(px_, 62, 18, 8, (222, 198, 156, 255))
    cv.outline((14, 8, 10, 255)); cv.light_pass(); cv.rim_light(acc, 0.45)
    return cv

def boss_jarl():
    """Jarl Frostmourn — gigante do gelo"""
    cv = CV(192)
    b = ramp((96, 124, 172)); dk = ramp((64, 86, 130)); ice = (150, 214, 250, 255); acc = ice
    # pernas
    cv.r(66, 120, 24, 56, dk[2]); cv.r(102, 120, 24, 56, dk[2])
    cv.r(62, 170, 32, 10, dk[1]); cv.r(98, 170, 32, 10, dk[1])
    # tronco massivo peludo
    cv.r(58, 64, 76, 60, b[2])
    for i in range(24):
        cv.p(60 + rng.randrange(72), 68 + rng.randrange(52), b[3])
    # faixa cinto pele
    cv.r(58, 112, 76, 10, (74, 56, 42, 255)); cv.r(90, 112, 12, 10, (222, 196, 150, 255))
    # braços + martelo de gelo
    cv.r(40, 70, 22, 52, b[1]); cv.r(130, 70, 22, 52, b[1])
    cv.ln(152, 60, 152, 128, (120, 88, 60, 255), 6)
    cv.r(134, 40, 36, 26, mix(ice, (255, 255, 255, 255), 0.25))
    cv.r(134, 40, 36, 6, (255, 255, 255, 230))
    for (sx, sy, sw, sh) in [(134, 66, 5, 8), (150, 66, 5, 12), (164, 66, 5, 7)]:
        cv.poly([(sx, sy), (sx+2, sy+sh), (sx+sw, sy)], ice)
    # cabeça com chifres
    cv.r(78, 34, 36, 32, b[3])
    cv.r(84, 46, 8, 6, (12, 14, 22, 255)); cv.r(102, 46, 8, 6, (12, 14, 22, 255))
    cv.p(86, 47, ice, 3); cv.p(104, 47, ice, 3)
    for (cx, flip) in [(70, False), (110, True)]:
        cv.poly([(cx, 40), (cx-14, 22), (cx+4, 34)], (222, 214, 196, 255))
    # barba de gelo
    for (ix, iy, ih) in [(82, 62, 16), (90, 64, 26), (98, 64, 22), (106, 62, 14)]:
        cv.poly([(ix, iy), (ix+3, iy+ih), (ix+6, iy)], mix(ice, (255,255,255,255), 0.4))
    cv.outline((10, 12, 20, 255)); cv.light_pass(); cv.rim_light(ice, 0.4)
    return cv

def boss_heir():
    """Herdeiro do Eclipse, Nakhul — halo do eclipse"""
    cv = CV(192)
    b = ramp((44, 36, 62)); dk = ramp((28, 22, 44)); gold = ramp((232, 163, 58)); acc = (240, 96, 110, 255)
    # halo do eclipse (anel dourado + disco negro)
    cv.d.ellipse([58, 8, 134, 84], outline=gold[3], width=5)
    cv.d.ellipse([76, 26, 116, 66], fill=(8, 5, 12, 255))
    # capa longa esfarrapada
    cv.poly([(66, 66), (126, 66), (140, 182), (112, 170), (96, 188), (80, 170), (52, 182)], (118, 40, 62, 255))
    # corpo
    cv.r(78, 70, 36, 52, b[2])
    cv.r(78, 70, 36, 4, b[3])
    cv.ln(82, 92, 110, 92, gold[0], 1)
    cv.ell(96, 100, 5, 5, acc); cv.p(96, 100, (255, 220, 220, 255), 2)
    # pernas escuras
    cv.r(82, 120, 12, 52, dk[2]); cv.r(98, 120, 12, 52, dk[2])
    # braços + adagas duplas
    cv.r(66, 74, 12, 40, b[1]); cv.r(114, 74, 12, 40, b[1])
    for dx in (52, 128):
        cv.r(dx, 108, 4, 26, (230, 234, 244, 255)); cv.r(dx-3, 132, 10, 3, gold[1])
    # cabeça pálida
    cv.r(82, 40, 28, 26, (222, 210, 196, 255))
    cv.r(86, 48, 6, 5, (180, 30, 40, 255)); cv.r(100, 48, 6, 5, (180, 30, 40, 255))
    cv.r(80, 36, 32, 6, dk[3])
    cv.outline((8, 6, 12, 255)); cv.light_pass(); cv.rim_light(gold[2], 0.5)
    return cv

def boss_avatar():
    """Avatar do Devorador — horror do vazio"""
    cv = CV(192)
    b = ramp((58, 48, 86)); dk = ramp((38, 30, 60)); acc = (248, 238, 208, 255)
    # tentáculos de trás
    for (pts) in [
        [(40, 120), (16, 96), (22, 62), (44, 48)],
        [(60, 132), (34, 128), (18, 150), (30, 168)],
        [(140, 120), (168, 92), (166, 60), (146, 46)],
        [(128, 134), (158, 132), (174, 152), (160, 170)]]:
        for i in range(len(pts)-1):
            cv.ln(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], dk[1], 8)
    # massa central
    cv.ell(96, 96, 52, 48, (88, 74, 126, 255))
    cv.ell(88, 88, 36, 32, b[1])
    # BOCA colossal
    cv.ell(96, 102, 34, 24, (12, 8, 16, 255))
    for i in range(7):
        cv.tri(66 + i*9, 84, 7, 14, (240, 234, 218, 255))
        cv.tri(68 + i*9, 120, 7, 14, (240, 234, 218, 255), flip=True)
    # olhos múltiplos
    for (ex, ey, er) in [(70, 58, 7), (116, 54, 9), (96, 44, 5), (134, 76, 5), (56, 80, 5)]:
        cv.ell(ex, ey, er, er, (250, 246, 236, 255))
        cv.ell(ex, ey, er-3, er-3, (150, 30, 44, 255))
        cv.p(ex-1, ey-1, (255, 255, 255, 255), 2)
    # coroa de fragmentos do eclipse
    for (cx, cy, ch) in [(70, 26, 22), (88, 18, 32), (106, 20, 28), (124, 28, 20)]:
        cv.poly([(cx, cy), (cx+4, cy-ch), (cx+9, cy)], acc)
    cv.outline((8, 6, 14, 255)); cv.light_pass(); cv.rim_light(acc, 0.45)
    return cv

BOSS_FN = {
    'bosque_vidro': boss_stag, 'pantano': boss_drowned, 'cidadela': boss_king,
    'deserto_cinzas': boss_sultan, 'picos': boss_jarl, 'coracao': boss_heir,
    'abismo': boss_avatar,
}

# =============== PETS (96×96) ===============
def pet_wolf():   # lobo umbral
    cv = CV(96); b = ramp((84, 70, 130)); acc = (110, 240, 216, 255)
    cv.r(24, 50, 40, 20, b[2]); cv.r(58, 42, 16, 18, b[3])
    cv.r(70, 46, 8, 6, b[2])
    for lx in (26, 36, 50, 58): cv.r(lx, 68, 6, 14, b[1])
    for i in range(3): cv.r(20-i*4, 44+i*3, 5, 4, b[2])
    cv.tri(60, 32, 6, 8, b[3]); cv.tri(68, 32, 6, 8, b[2])
    cv.r(62, 48, 3, 3, (255,255,255,255)); cv.p(63, 49, acc, 2)
    cv.p(30, 54, acc); cv.p(38, 56, acc)  # marcas
    return _pet_fin(cv)
def pet_raven():  # corvo eclipse
    cv = CV(96); b = ramp((56, 50, 74)); gold = (232, 163, 58, 255)
    cv.ell(44, 56, 16, 14, b[2]); cv.r(52, 40, 12, 14, b[3])
    cv.poly([(26, 52), (6, 40), (16, 62)], b[1])
    cv.poly([(60, 52), (80, 40), (72, 62)], b[1])
    cv.r(24, 66, 5, 12, b[1]); cv.r(50, 66, 5, 12, b[1])
    cv.tri(62, 46, 8, 5, (232, 163, 58, 255), flip=True)
    cv.r(54, 44, 3, 3, (255, 220, 130, 255)); cv.p(55, 45, (255, 255, 255, 255))
    cv.ell(44, 56, 5, 5, (16, 10, 22, 255)); cv.p(43, 55, gold, 2)
    return _pet_fin(cv)
def pet_cricket(): # grilo cristal
    cv = CV(96); glass = (150, 220, 235, 255); acc = (110, 240, 216, 255)
    cv.ell(44, 60, 18, 12, glass)
    cv.ell(40, 56, 10, 7, (220, 248, 255, 255))
    cv.r(56, 48, 10, 10, glass)
    cv.ln(60, 56, 74, 40, acc, 1); cv.ln(58, 60, 76, 52, acc, 1)
    for lx in (34, 44, 54): cv.ln(lx, 70, lx-6, 82, (110, 190, 210, 255), 2)
    cv.r(58, 51, 3, 3, (20, 30, 40, 255)); cv.p(59, 52, (255,255,255,255))
    return _pet_fin(cv)
def pet_golem():  # golem filhote
    cv = CV(96); b = ramp((110, 116, 132)); acc = (110, 240, 216, 255)
    cv.r(30, 40, 34, 34, b[2]); cv.r(36, 28, 22, 16, b[3])
    cv.r(22, 46, 8, 20, b[1]); cv.r(64, 46, 8, 20, b[1])
    cv.r(32, 72, 12, 10, b[1]); cv.r(50, 72, 12, 10, b[1])
    cv.r(40, 34, 4, 4, (16, 12, 22, 255)); cv.r(50, 34, 4, 4, (16, 12, 22, 255))
    cv.p(41, 35, acc, 2); cv.p(51, 35, acc, 2)
    cv.ln(36, 50, 44, 56, (70, 60, 80, 255), 1); cv.p(44, 56, acc)
    return _pet_fin(cv)
def pet_serpent(): # serpente de brasas
    cv = CV(96); b = ramp((150, 84, 48)); acc = (244, 158, 76, 255)
    pts = [(16, 70), (30, 60), (46, 66), (60, 56), (72, 60)]
    for i in range(len(pts)-1): cv.ln(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], b[2], 9)
    cv.ell(74, 56, 9, 8, b[3])
    cv.p(76, 52, (255, 220, 120, 255), 2)
    cv.tri(80, 58, 5, 4, (255, 240, 200, 255), flip=True)
    for i in range(4): cv.p(22+i*14, 62+(i%2)*4, acc, 2)
    return _pet_fin(cv)
def pet_fairy():  # fada do alvorecer
    cv = CV(96); b = ramp((226, 178, 142)); acc = (250, 200, 110, 255)
    cv.ell(34, 40, 14, 16, (200, 240, 255, 150)); cv.ell(58, 40, 14, 16, (200, 240, 255, 150))
    cv.ell(34, 40, 9, 10, (240, 252, 255, 190)); cv.ell(58, 40, 9, 10, (240, 252, 255, 190))
    cv.r(38, 42, 18, 22, b[1])
    cv.ell(47, 34, 9, 9, b[2])
    cv.r(44, 32, 2, 2, (60, 40, 60, 255)); cv.r(49, 32, 2, 2, (60, 40, 60, 255))
    cv.p(40, 26, acc, 3); cv.p(55, 27, acc, 2)
    cv.poly([(40, 64), (47, 74), (54, 64), (47, 60)], acc)
    return _pet_fin(cv)
def pet_knight(): # cavaleiro caído
    cv = CV(96); b = ramp((98, 92, 118)); acc = (196, 130, 250, 255)
    cv.r(36, 40, 24, 26, b[2]); cv.r(38, 66, 8, 16, b[1]); cv.r(50, 66, 8, 16, b[1])
    cv.r(40, 26, 16, 14, b[3]); cv.r(43, 32, 10, 4, (12, 8, 18, 255))
    cv.p(45, 33, acc, 2); cv.p(51, 33, acc, 2)
    cv.r(30, 44, 7, 16, b[1]); cv.r(59, 44, 7, 16, b[1])
    cv.r(66, 30, 3, 34, (210, 214, 226, 255)); cv.r(63, 62, 9, 3, (90, 60, 110, 255))
    cv.poly([(34, 40), (62, 40), (58, 26), (38, 26)], (120, 40, 56, 255))
    return _pet_fin(cv)
def pet_archivist(): # arquivista
    cv = CV(96); b = ramp((90, 76, 120)); acc = (235, 222, 190, 255)
    cv.poly([(32, 66), (64, 66), (60, 34), (36, 34)], b[1])
    cv.ell(48, 30, 12, 11, (230, 214, 186, 255))
    cv.r(36, 20, 24, 10, b[2])
    cv.p(44, 31, (30, 22, 40, 255), 2); cv.p(52, 31, (30, 22, 40, 255), 2)
    cv.r(60, 46, 14, 10, (222, 206, 168, 255)); cv.ln(67, 46, 67, 56, (120, 100, 70, 255), 1)
    cv.r(30, 48, 7, 18, b[2])
    return _pet_fin(cv)
def pet_sorceress(): # feiticeira do vazio
    cv = CV(96); b = ramp((72, 56, 116)); acc = (196, 130, 250, 255)
    cv.poly([(34, 70), (62, 70), (58, 36), (38, 36)], b[1])
    cv.ell(48, 30, 11, 10, (226, 210, 230, 255))
    cv.poly([(36, 28), (48, 8), (60, 28)], b[2])
    cv.p(44, 30, acc, 2); cv.p(52, 30, acc, 2)
    cv.ell(70, 44, 5, 5, acc); cv.p(70, 44, (255, 240, 255, 255), 2)
    cv.r(26, 44, 6, 16, b[2]); cv.ln(29, 40, 29, 46, (110, 84, 60, 255), 2)
    return _pet_fin(cv)
def pet_smith():  # ferreiro
    cv = CV(96); b = ramp((130, 92, 64)); acc = (244, 158, 76, 255)
    cv.r(36, 38, 26, 28, b[1]); cv.r(38, 68, 9, 14, (70, 50, 40, 255)); cv.r(50, 68, 9, 14, (70, 50, 40, 255))
    cv.r(40, 26, 18, 14, (222, 182, 146, 255))
    cv.r(38, 22, 22, 6, (90, 64, 48, 255))
    cv.p(45, 32, (20, 14, 18, 255), 2); cv.p(53, 32, (20, 14, 18, 255), 2)
    cv.r(28, 42, 8, 18, b[2]); cv.ln(32, 36, 32, 48, (90, 64, 48, 255), 3)
    cv.r(24, 32, 16, 12, (110, 116, 132, 255))
    cv.r(60, 42, 10, 10, (110, 116, 132, 255))
    cv.p(66, 38, acc, 3)
    return _pet_fin(cv)

def _pet_fin(cv):
    cv.outline((12, 9, 20, 255))
    cv.light_pass(1.2, 1.1, 0.8, 0.72)
    cv.rim_light((255, 236, 200, 255), 0.3)
    return cv

PETS = {
    'pet_lobo': pet_wolf, 'pet_corvo': pet_raven, 'pet_grilo': pet_cricket,
    'pet_golem': pet_golem, 'pet_serpente': pet_serpent, 'pet_fada': pet_fairy,
    'cmp_cavaleiro': pet_knight, 'cmp_arquivista': pet_archivist,
    'cmp_feiticeira': pet_sorceress, 'cmp_ferreiro': pet_smith,
}

def main():
    import os
    # herói
    draw_hero(False).save(f'{ROOT}/hero/hero.png', 64)
    draw_hero(True).save(f'{ROOT}/hero/hero_attack.png', 64)
    print('hero ok')
    # inimigos + chefes
    for reg in REG:
        os.makedirs(f'{ROOT}/enemies', exist_ok=True)
        for i in range(5):
            ecv = draw_enemy(reg, i, '')
            ecv.brighten(1.07, 4)
            ecv.save(f'{ROOT}/enemies/enemy_{reg}_{i}.png', 64)
        boss_cv = BOSS_FN[reg]()
        boss_cv.brighten(1.22, 8)
        boss_cv.save(f'{ROOT}/enemies/boss_{reg}.png', 96)
    # genérico: bruto do abismo recolorido
    g = draw_enemy('abismo', 0, '')
    g.save(f'{ROOT}/enemies/enemy_generic.png', 64)
    print('enemies ok')
    # pets
    for key, fn in PETS.items():
        fn().save(f'{ROOT}/pets/{key}.png', 64)
    print('pets ok')
    # contact sheet p/ inspeção
    from PIL import Image as I
    sheet = I.new('RGBA', (9*100, 6*100), (22, 16, 32, 255))
    names = [f'{ROOT}/hero/hero.png', f'{ROOT}/hero/hero_attack.png']
    for reg in REG:
        names += [f'{ROOT}/enemies/enemy_{reg}_{i}.png' for i in range(5)] + [f'{ROOT}/enemies/boss_{reg}.png']
    names += [f'{ROOT}/pets/{k}.png' for k in PETS]
    for i, n in enumerate(names):
        im = I.open(n).convert('RGBA')
        im.thumbnail((96, 96))
        x, y = (i % 9)*100+2, (i // 9)*100+2
        sheet.paste(im, (x, y), im)
    sheet.save('/home/z/my-project/scripts/eidryn_html/sheet_sprites.png')
    print('sheet ok')

if __name__ == '__main__':
    main()
