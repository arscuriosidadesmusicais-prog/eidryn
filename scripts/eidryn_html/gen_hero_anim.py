#!/usr/bin/env python3
"""gen_hero_anim.py — Herói "Marcado por Eidryn" com RIG PARAMÉTRICO (v1.2.0).
7 posturas × múltiplos frames = 23 frames novos (pixel art 96×96, identidade visual
da Edição do Eclipse preservada: placa obsidiana + ouro + núcleo eclipse + capa sangue).

Posturas: idle(4) · atk(4) · crit(4) · cast(4) · hurt(2) · victory(3) · down(2)
Compatibilidade: hero.png (idle f0) e hero_attack.png (atk f1) regenerados.
Escopo: apenas arte — nenhuma lógica de jogo é afetada."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pxkit import CV, ramp, mix, shade, clamp8
from PIL import Image, ImageDraw

ROOT = '/home/z/my-project/eidryn/assets/sprites/hero'

# ---------------- materiais ----------------
steel = ramp((126, 134, 158))
obs   = ramp((46, 40, 66))
gold  = ramp((232, 163, 58))
blood = ramp((136, 44, 66))
dk    = ramp((26, 22, 38))
EYE       = (120, 245, 220, 255)
EYE_DIM   = (58, 120, 110, 255)
CORE_T    = (70, 200, 178, 255)
CORE_BRT  = (190, 255, 244, 255)
ARC_C     = (255, 240, 190, 255)
ORB_C     = (86, 232, 206, 255)
ORB_C2    = (155, 89, 208, 255)

# ---------------- utilitários de FX ----------------
def sword(cv, gx, gy, tx, ty, edge_bright=1.0):
    """espada paramétrica: punho(gx,gy) → ponta(tx,ty); lâmina com gradiente."""
    dx, dy = tx - gx, ty - gy
    ln = max(1, math.hypot(dx, dy))
    ux, uy = dx / ln, dy / ln
    px_, py_ = -uy, ux
    # cabo (atrás da guarda)
    for i in range(5):
        bx, by = gx - ux * (2 + i), gy - uy * (2 + i)
        cv.p(int(round(bx)), int(round(by)), dk[1], 2)
    # guarda perpendicular
    for i in range(-5, 6):
        bx, by = gx + ux * 2 + px_ * i, gy + uy * 2 + py_ * i
        cv.p(int(round(bx)), int(round(by)), gold[2], 1)
        if abs(i) == 5:
            cv.p(int(round(bx + px_)), int(round(by + py_)), gold[1], 1)
    # lâmina (3px de espessura, gradiente aço→brilho)
    n = int(ln) - 4
    for i in range(n):
        t = i / max(1, n - 1)
        bx, by = gx + ux * (5 + i), gy + uy * (5 + i)
        c = mix((255, 246, 214, 255), (168, 176, 198, 255), min(1, t * 1.15))
        cx_, cy_ = int(round(bx)), int(round(by))
        cv.r(cx_, cy_, 2, 2, c)
        # aresta brilhante no lado superior
        cv.p(cx_ + int(round(px_)), cy_ + int(round(py_)),
             (255, 252, 236, int(255 * edge_bright)), 1)
        if i % 7 == 0:
            cv.p(cx_, cy_, (255, 250, 230, 210), 1)

def arc_slash(cv, cx, cy, r, a0, a1, col=ARC_C, alpha0=200, w_streak=True):
    """arco de golpe em pixels (com cauda de alpha decrescente)."""
    steps = max(6, int(abs(a1 - a0) * r / 1.6))
    for i in range(steps + 1):
        t = i / steps
        a = a0 + (a1 - a0) * t
        x = cx + math.cos(a) * r
        y = cy + math.sin(a) * r * 0.92
        al = int(alpha0 * (1 - t * 0.75))
        c = (col[0], col[1], col[2], clamp8(al))
        cv.p(int(x), int(y), c, 2)
        if w_streak and i % 2 == 0:
            x2 = cx + math.cos(a) * (r - 3)
            y2 = cy + math.sin(a) * (r - 3) * 0.92
            cv.p(int(x2), int(y2), (col[0], col[1], col[2], clamp8(al * 0.5)), 1)

def orb(cv, x, y, r, col=ORB_C):
    """orbe mágico com núcleo claro e halo."""
    for ry in range(-r, r + 1):
        for rx in range(-r, r + 1):
            d = math.hypot(rx, ry)
            if d <= r * 0.45:
                cv.p(x + rx, y + ry, (240, 255, 250, 255), 1)
            elif d <= r:
                t = (d - r * 0.45) / (r * 0.55)
                cv.p(x + rx, y + ry, mix(col, shade(col, 0.45), t), 1)
    # halo de 4 pontas
    for (ox, oy) in ((-r - 2, 0), (r + 2, 0), (0, -r - 2), (0, r + 2)):
        cv.p(x + ox, y + oy, (col[0], col[1], col[2], 130), 1)

def glint(cv, x, y):
    """cintilância de 4 pontas (lâmina)."""
    cv.p(x, y - 2, (255, 255, 245, 230))
    cv.p(x, y + 2, (255, 255, 245, 200))
    cv.p(x - 2, y, (255, 255, 245, 230))
    cv.p(x + 2, y, (255, 255, 245, 200))
    cv.p(x, y, (255, 255, 250, 255), 2)

def impact_star(cv, x, y, r=9):
    """estrela de impacto (crítico)."""
    for k in range(8):
        a = k * math.pi / 4
        ln = r if k % 2 == 0 else r * 0.55
        for j in range(int(ln)):
            xx, yy = x + math.cos(a) * j, y + math.sin(a) * j
            c = (255, 250, 235, clamp8(235 - j * 14))
            cv.p(int(xx), int(yy), c, 2 if j < ln * 0.4 else 1)

def dust_px(cv, x, y, n=6):
    for i in range(n):
        cv.p(x + (i * 5 % 18) - 9, y - (i * 3 % 6), (170, 158, 175, 120 + (i * 13) % 60), 1)

# ---------------- capa (variantes) ----------------
def cape_variant(cv, variant):
    """desenha a capa atrás do corpo; variantes de balanço/ação."""
    cape = CV(96)
    if variant == 0:      # repouso
        cape.poly([(26, 30), (62, 30), (70, 60), (64, 84), (54, 66), (48, 88), (38, 66), (20, 70)], blood[1])
        cape.poly([(30, 32), (60, 32), (66, 58), (50, 56), (34, 60)], blood[0])
    elif variant == 1:    # balança p/ esquerda
        cape.poly([(24, 30), (62, 30), (68, 60), (60, 82), (50, 64), (42, 86), (32, 64), (14, 66)], blood[1])
        cape.poly([(28, 32), (60, 32), (64, 58), (48, 56), (30, 58)], blood[0])
    elif variant == 2:    # balança p/ direita
        cape.poly([(28, 30), (64, 30), (74, 62), (66, 84), (56, 66), (50, 86), (42, 66), (26, 70)], blood[1])
        cape.poly([(32, 32), (62, 32), (70, 60), (52, 56), (36, 60)], blood[0])
    elif variant == 3:    # recolhe (respiração)
        cape.poly([(27, 30), (62, 30), (69, 58), (62, 80), (53, 64), (47, 84), (38, 64), (22, 68)], blood[1])
        cape.poly([(31, 32), (60, 32), (65, 56), (49, 55), (33, 58)], blood[0])
    elif variant == 4:    # impulso p/ trás (ataque)
        cape.poly([(24, 28), (60, 30), (66, 58), (56, 80), (46, 62), (36, 80), (26, 60), (10, 62)], blood[1])
        cape.poly([(28, 30), (58, 32), (62, 56), (46, 54), (26, 56)], blood[0])
    elif variant == 5:    # esvoaçante (vitória)
        cape.poly([(26, 28), (64, 30), (78, 58), (72, 82), (60, 64), (52, 86), (42, 64), (22, 68)], blood[1])
        cape.poly([(30, 30), (62, 32), (72, 58), (54, 56), (34, 58)], blood[0])
    elif variant == 6:    # caída (derrota)
        cape.poly([(28, 34), (62, 34), (70, 64), (64, 88), (52, 78), (44, 90), (36, 74), (24, 76)], blood[0])
        cape.poly([(32, 36), (60, 36), (66, 62), (50, 62), (36, 64)], shade(blood[0], 0.7))
    cape.outline((18, 8, 16, 255))
    cape.light_pass(1.14, 1.08, 0.8, 0.72)
    cv.paste_under(cape, 0, 0)

# ---------------- corpo ----------------
def body(cv, dy=0, dx=0, crouch=0, kneel=False, eye=EYE, core=True):
    """tronco+ombros+cabeça (+braços base). Aplica dy/dx de grupo."""
    oy, ox = dy, dx
    if kneel:
        # pernas dobradas (joelhos no chão)
        cv.r(34, 74, 14, 7, dk[2]); cv.r(48, 74, 14, 7, dk[2])
        cv.r(32, 80, 16, 6, dk[1]); cv.r(48, 80, 16, 6, dk[1])
        cv.r(32, 85, 16, 2, gold[0]); cv.r(48, 85, 16, 2, gold[0])
    else:
        # pernas + botas (plantadas, com agachamento leve)
        ly = 62 + crouch
        lh = 24 - crouch
        cv.r(38, ly, 9, lh, dk[2]); cv.r(49, ly, 9, lh, dk[2])
        cv.r(37, ly + 4, 11, 2, gold[1]); cv.r(48, ly + 4, 11, 2, gold[1])
        cv.r(35, 79, 13, 7, dk[1]); cv.r(48, 79, 13, 7, dk[1])
        cv.r(35, 84, 13, 2, gold[0]); cv.r(48, 84, 13, 2, gold[0])
    # tasset
    cv.r(34 + ox, 56 + oy, 28, 7, obs[2])
    cv.r(34 + ox, 62 + oy, 28, 2, gold[1])
    cv.tri(40 + ox, 62 + oy, 6, 6, obs[1]); cv.tri(50 + ox, 62 + oy, 6, 6, obs[1])
    # tronco
    cv.r(33 + ox, 36 + oy, 30, 22, obs[3])
    cv.r(34 + ox, 37 + oy, 28, 3, obs[4] if len(obs) > 4 else shade(obs[3], 1.2))
    cv.r(33 + ox, 36 + oy, 2, 22, gold[1]); cv.r(61 + ox, 36 + oy, 2, 22, gold[1])
    cv.ln(36 + ox, 46 + oy, 60 + ox, 46 + oy, gold[0], 1)
    cv.ln(47 + ox, 38 + oy, 47 + ox, 45 + oy, obs[0], 1)
    if core:
        cv.ell(48 + ox, 50 + oy, 5, 5, (14, 10, 20, 255))
        cv.ell(48 + ox, 50 + oy, 3, 3, CORE_T)
        cv.p(47 + ox, 49 + oy, CORE_BRT)
    # ombreiras
    for px_ in (24, 62):
        cv.r(px_ + ox, 30 + oy, 12, 9, steel[3])
        cv.r(px_ + ox, 30 + oy, 12, 2, steel[4] if len(steel) > 4 else shade(steel[3], 1.25))
        cv.r(px_ + ox, 38 + oy, 12, 2, gold[2])
        cv.r(px_ + 4 + ox, 34 + oy, 4, 3, steel[2])
    # cabeça/elmo
    cv.r(38 + ox, 14 + oy, 20, 18, steel[3])
    cv.r(38 + ox, 14 + oy, 20, 3, shade(steel[3], 1.3))
    cv.r(40 + ox, 24 + oy, 16, 5, (10, 8, 16, 255))
    cv.r(42 + ox, 25 + oy, 4, 3, eye); cv.r(50 + ox, 25 + oy, 4, 3, eye)
    cv.r(38 + ox, 12 + oy, 20, 3, gold[2])
    cv.r(36 + ox, 18 + oy, 2, 9, steel[2]); cv.r(58 + ox, 18 + oy, 2, 9, steel[2])
    cv.tri(44 + ox, 2 + oy, 4, 11, gold[3]); cv.tri(48 + ox, 2 + oy, 4, 11, gold[2])

def arm_back(cv, dx=0, dy=0):
    """braço esquerdo (fundo) — segurando abaixo."""
    cv.r(28 + dx, 40 + dy, 8, 16, steel[3])
    cv.r(27 + dx, 54 + dy, 10, 6, dk[2])

def arm_up_right(cv, dx=0, dy=0):
    """braço direito erguido (mão alta)."""
    cv.r(58 + dx, 24 + dy, 9, 12, steel[3])
    cv.r(56 + dx, 18 + dy, 9, 8, steel[3])
    cv.r(55 + dx, 24 + dy, 3, 6, dk[2])

def arm_rest_right(cv, dx=0, dy=0):
    """braço direito em repouso (segura a espada baixa)."""
    cv.r(60 + dx, 40 + dy, 8, 12, steel[3])
    cv.r(59 + dx, 50 + dy, 10, 6, dk[2])

def arm_fwd_right(cv, dx=0, dy=0):
    """braço direito estendido à frente (golpe)."""
    cv.r(62 + dx, 36 + dy, 10, 8, steel[3])
    cv.r(70 + dx, 35 + dy, 6, 8, steel[3])
    cv.r(74 + dx, 36 + dy, 6, 6, dk[2])

def arm_low_right(cv, dx=0, dy=0):
    """braço direito baixo (follow-through)."""
    cv.r(60 + dx, 44 + dy, 8, 12, steel[3])
    cv.r(59 + dx, 54 + dy, 10, 6, dk[2])

def arm_cast_left(cv, hx, hy):
    """braço esquerdo apontando para (hx,hy) — 2 segmentos pixelados."""
    sx, sy = 30, 42
    for i in range(6):
        x = sx + (hx - sx) * i / 6
        y = sy + (hy - sy) * i / 6
        cv.r(int(x), int(y), 6, 5, steel[3])
    cv.r(int(hx) - 2, int(hy) - 2, 7, 6, dk[2])

# ---------------- frames por postura ----------------
def hero_frame(pose, f):
    cv = CV(96)
    bob = [0, 1, 2, 1][f % 4]
    eye = EYE

    if pose == 'idle':
        cape_variant(cv, f % 4)
        eye = EYE if f % 2 == 0 else mix(EYE, EYE_DIM, 0.35)
        body(cv, dy=bob, eye=eye)
        arm_back(cv, dy=bob)
        arm_rest_right(cv, dy=bob)
        sword(cv, 74, 48 + bob, 82, 10 + bob)
        if f == 2: glint(cv, 79, 28)

    elif pose == 'atk':
        cape_variant(cv, 4)
        if f == 0:      # preparação: espada erguida atrás
            body(cv, dy=1, eye=EYE)
            arm_back(cv, dy=1)
            arm_up_right(cv, dy=1)
            sword(cv, 61, 22, 90, 2)
        elif f == 1:    # golpe: lâmina diagonal à frente + arco forte
            body(cv, dy=0, eye=EYE)
            arm_back(cv)
            arm_fwd_right(cv)
            sword(cv, 62, 39, 93, 26)
            arc_slash(cv, 54, 34, 40, -0.5, 1.1, alpha0=220)
        elif f == 2:    # follow-through: lâmina baixa + arco esvaindo
            body(cv, dy=1, eye=EYE)
            arm_back(cv, dy=1)
            arm_low_right(cv, dy=1)
            sword(cv, 60, 50, 88, 66)
            arc_slash(cv, 50, 38, 40, 0.6, 1.6, alpha0=110)
            dust_px(cv, 66, 84, 4)
        else:           # recuperação
            body(cv, dy=bob, eye=EYE)
            arm_back(cv, dy=bob)
            arm_rest_right(cv, dy=bob)
            sword(cv, 70, 49, 84, 18)

    elif pose == 'crit':
        if f == 0:      # agachamento antecipando (mãos na espada, baixa)
            cape_variant(cv, 3)
            body(cv, dy=4, crouch=4, eye=EYE)
            arm_back(cv, dy=4)
            cv.r(56, 44, 8, 10, steel[3]); cv.r(55, 52, 10, 6, dk[2])
            sword(cv, 62, 50, 90, 70)
        elif f == 1:    # salto: espada vertical sobre a cabeça
            cape_variant(cv, 4)
            body(cv, dy=-6, eye=mix(EYE, (255,255,255,255), 0.2))
            arm_back(cv, dy=-6)
            arm_up_right(cv, dy=-8)
            cv.r(45, 15, 8, 7, dk[2])      # segunda mão aderida ao punho
            sword(cv, 51, 18, 54, 1)
        elif f == 2:    # impacto: lâmina vertical à frente + estrela + poeira
            cape_variant(cv, 4)
            body(cv, dy=2, crouch=2, eye=EYE)
            arm_back(cv, dy=2)
            arm_low_right(cv, dx=2, dy=0)
            sword(cv, 63, 50, 70, 84)
            arc_slash(cv, 58, 40, 34, 1.35, 1.85, alpha0=210)
            arc_slash(cv, 58, 40, 42, 1.45, 1.75, alpha0=130)
            impact_star(cv, 76, 82, 10)
            dust_px(cv, 48, 85, 8)
        else:           # recuperação
            cape_variant(cv, 0)
            body(cv, dy=1, crouch=1, eye=EYE)
            arm_back(cv, dy=1)
            arm_rest_right(cv, dy=1)
            sword(cv, 68, 50, 80, 20)

    elif pose == 'cast':
        cape_variant(cv, f % 2 + 1)
        body(cv, dy=bob, eye=mix(EYE, CORE_T, 0.25 + f * 0.12))
        arm_rest_right(cv, dy=bob)          # espada continua na mão direita
        sword(cv, 74, 48 + bob, 82, 10 + bob)
        if f == 0:
            arm_cast_left(cv, 30, 34)
        elif f == 1:
            arm_cast_left(cv, 28, 26)
            orb(cv, 27, 20, 3)
        elif f == 2:
            arm_cast_left(cv, 28, 22)
            orb(cv, 27, 16, 5)
            cv.p(18, 14, (ORB_C2[0], ORB_C2[1], ORB_C2[2], 150), 2)
            cv.p(36, 12, (ORB_C2[0], ORB_C2[1], ORB_C2[2], 150), 2)
        else:
            arm_cast_left(cv, 34, 28)
            orb(cv, 40, 26, 3, ORB_C2)
            cv.p(46, 24, (240, 255, 250, 190), 2)
            cv.p(50, 27, (ORB_C[0], ORB_C[1], ORB_C[2], 140), 1)

    elif pose == 'hurt':
        cape_variant(cv, 2 if f == 0 else 0)
        k = 3 if f == 0 else 1
        eye = EYE_DIM
        body(cv, dy=1 + f, dx=-k, eye=eye)
        arm_back(cv, dx=-k, dy=1 + f)
        arm_rest_right(cv, dx=-k, dy=1 + f)
        sword(cv, 74 - k, 48, 82 - k, 10)

    elif pose == 'victory':
        cape_variant(cv, 5 if f == 0 else 0)
        body(cv, dy=bob, eye=EYE)
        arm_back(cv, dy=bob)
        arm_up_right(cv, dy=bob)
        sword(cv, 61, 20 + bob, 63, 2 + bob, edge_bright=1.0)
        glint(cv, 63, 4 + bob)
        if f >= 1:
            cv.p(20, 40 + f * 4, (255, 215, 130, 200), 2)
            cv.p(74, 30 + f * 6, (255, 215, 130, 160), 1)

    elif pose == 'down':
        cape_variant(cv, 6)
        body(cv, dy=12, kneel=True, eye=EYE_DIM)
        arm_back(cv, dy=12)
        # mão apoiada no punho da espada plantada
        cv.r(42, 62, 8, 6, dk[2])
        sword(cv, 45, 64, 45, 26, edge_bright=0.6)
    return cv

# ---------------- saída ----------------
POSES = {
    'idle':    ('hero_idle', 4),
    'atk':     ('hero_atk', 4),
    'crit':    ('hero_crit', 4),
    'cast':    ('hero_cast', 4),
    'hurt':    ('hero_hurt', 2),
    'victory': ('hero_victory', 3),
    'down':    ('hero_down', 2),
}

def main():
    os.makedirs(ROOT, exist_ok=True)
    total = 0
    for pose, (prefix, n) in POSES.items():
        for f in range(n):
            cv = hero_frame(pose, f)
            cv.save(f'{ROOT}/{prefix}_{f}.png', 64)
            total += 1
    # compatibilidade: hero.png = idle f0 | hero_attack.png = atk f1
    hero_frame('idle', 0).save(f'{ROOT}/hero.png', 64)
    hero_frame('atk', 1).save(f'{ROOT}/hero_attack.png', 64)
    total += 2
    print(f'hero anim ok — {total} PNGs')
    # contact sheet 6 colunas para inspeção
    cols = 6
    names = []
    for pose, (prefix, n) in POSES.items():
        names += [(pose, f, f'{ROOT}/{prefix}_{f}.png') for f in range(n)]
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * 100, rows * 116), (22, 16, 32, 255))
    d = ImageDraw.Draw(sheet)
    for i, (pose, f, n) in enumerate(names):
        im = Image.open(n).convert('RGBA')
        x, y = (i % cols) * 100 + 2, (i // cols) * 116 + 2
        sheet.paste(im, (x, y), im)
        d.text((x + 2, y + 98), f'{pose} f{f}', fill=(232, 224, 208, 255))
    sheet.save('/home/z/my-project/scripts/eidryn_html/sheet_hero_anim.png')
    print('sheet ok')

if __name__ == '__main__':
    main()
