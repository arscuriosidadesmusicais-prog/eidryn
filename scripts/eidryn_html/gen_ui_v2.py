#!/usr/bin/env python3
"""gen_ui_v2.py — Edição do Eclipse: 44 ícones UI + 8 ícones de aba + 5 texturas
de painel + 28 camadas de parallax (7 regiões × céu/far/mid/near)."""
import sys, random
sys.path.insert(0, '/home/z/my-project/scripts/eidryn_html')
from pxkit import CV, M, ramp, shade, mix, dither_rect, vgrad, star_field
from PIL import Image, ImageDraw

ROOT = '/home/z/my-project/eidryn/assets/sprites'
rng = random.Random(20777)

STEEL = ramp((122, 130, 152)); GOLD = ramp((232, 163, 58)); DARK = ramp((30, 24, 44))
BLOOD = ramp((176, 54, 78)); TEAL = (70, 200, 178, 255); ARC = (155, 89, 208, 255)

def icon_base(cv):
    """moldura sutil de ícone (diamante escuro de fundo)"""
    d = cv.d
    d.polygon([(48, 4), (92, 48), (48, 92), (4, 48)], fill=(30, 22, 44, 210))
    d.polygon([(48, 10), (86, 48), (48, 86), (10, 48)], fill=(44, 32, 64, 190))

def fin_icon(cv, path, colors=64):
    cv.outline((12, 8, 20, 255))
    cv.light_pass(1.22, 1.12, 0.78, 0.68)
    cv.rim_light((255, 232, 180, 255), 0.30)
    cv.save(path, colors)

# ============ SLOTS DE EQUIPAMENTO (9) ============
def ic_arma(cv):
    icon_base(cv)
    for i in range(56):
        c = mix((255, 246, 214, 255), (150, 158, 182, 255), min(1, i/40))
        cv.r(46, 8 + i, 5, 1, c)
    cv.r(42, 10, 2, 50, (255, 252, 235, 160))
    cv.r(36, 62, 24, 5, GOLD[2]); cv.r(44, 64, 8, 12, DARK[1]); cv.p(46, 74, GOLD[3], 4)

def ic_elmo(cv):
    icon_base(cv)
    bright = ramp((150, 158, 182))
    cv.r(28, 24, 40, 34, bright[3]); cv.r(29, 25, 10, 30, bright[4] if len(bright) > 4 else shade(bright[3], 1.2))
    cv.r(32, 42, 32, 10, (12, 8, 18, 255))
    cv.r(34, 44, 8, 5, (110, 240, 216, 255)); cv.r(54, 44, 8, 5, (110, 240, 216, 255))
    cv.r(26, 34, 6, 16, bright[2]); cv.r(64, 34, 6, 16, bright[2])
    cv.r(27, 34, 4, 3, bright[4] if len(bright) > 4 else shade(bright[2], 1.3))
    cv.r(38, 14, 20, 8, GOLD[2]); cv.tri(42, 2, 10, 14, GOLD[3])
    cv.r(30, 56, 36, 4, GOLD[1])

def ic_peito(cv):
    icon_base(cv)
    cv.poly([(26, 22), (70, 22), (74, 44), (48, 78), (22, 44)], STEEL[3])
    cv.poly([(30, 26), (66, 26), (68, 42), (48, 68), (28, 42)], STEEL[2])
    cv.ln(48, 26, 48, 66, STEEL[1], 2)
    cv.r(24, 20, 14, 8, STEEL[4] if len(STEEL) > 4 else shade(STEEL[3], 1.25))
    cv.r(58, 20, 14, 8, STEEL[4] if len(STEEL) > 4 else shade(STEEL[3], 1.25))
    cv.ell(48, 44, 4, 4, (16, 12, 22, 255)); cv.p(47, 43, (110, 240, 216, 255), 2)

def ic_calca(cv):
    icon_base(cv)
    cloth = ramp((96, 104, 132))
    cv.r(32, 18, 32, 28, cloth[2])
    cv.r(32, 18, 32, 4, cloth[3])
    cv.r(32, 44, 13, 32, cloth[2]); cv.r(51, 44, 13, 32, cloth[1])
    cv.r(33, 45, 4, 28, cloth[3]); cv.r(52, 45, 4, 28, cloth[3])
    cv.r(31, 72, 15, 6, cloth[0]); cv.r(50, 72, 15, 6, cloth[0])
    cv.r(31, 42, 34, 3, GOLD[2])

def ic_botas(cv):
    icon_base(cv)
    leather = ramp((140, 100, 64))
    for dx in (4, 26):
        cv.r(28 + dx, 24, 16, 36, leather[2])
        cv.r(29 + dx, 25, 5, 33, leather[3])
        cv.r(26 + dx, 56, 32, 12, leather[1])
        cv.r(26 + dx, 64, 32, 4, GOLD[1])
        cv.r(28 + dx, 30, 14, 3, GOLD[0])

def ic_luvas(cv):
    icon_base(cv)
    bright = ramp((146, 154, 178))
    cv.r(30, 24, 34, 36, bright[3])
    cv.r(31, 25, 8, 33, bright[4] if len(bright) > 4 else shade(bright[3], 1.2))
    for i in range(4):
        cv.r(31 + i*8, 12, 7, 14, bright[3])
        cv.r(32 + i*8, 13, 3, 11, bright[2])
    cv.r(30, 52, 34, 8, (52, 44, 70, 255))
    cv.r(32, 54, 30, 3, GOLD[2])
    cv.r(30, 24, 34, 3, GOLD[0])

def ic_capa(cv):
    icon_base(cv)
    cv.poly([(48, 12), (78, 24), (70, 80), (48, 70), (26, 80), (18, 24)], BLOOD[1])
    cv.poly([(48, 18), (70, 27), (62, 70), (48, 62), (34, 70), (26, 27)], BLOOD[0])
    cv.r(42, 10, 12, 6, GOLD[2])

def ic_anel(cv):
    icon_base(cv)
    cv.d.ellipse([30, 38, 66, 74], outline=GOLD[2], width=6)
    cv.d.ellipse([36, 44, 60, 68], outline=(140, 100, 40, 255), width=2)
    cv.p(44, 22, (110, 240, 216, 255), 8)
    cv.p(46, 24, (220, 255, 246, 255), 3)
    cv.r(40, 30, 16, 4, GOLD[3])

def ic_amuleto(cv):
    icon_base(cv)
    cv.d.arc([22, 14, 74, 60], 200, 340, fill=GOLD[2], width=3)
    cv.poly([(48, 44), (66, 58), (48, 86), (30, 58)], (60, 40, 90, 255))
    cv.poly([(48, 50), (60, 60), (48, 78), (36, 60)], (110, 240, 216, 220))
    cv.p(46, 58, (230, 255, 248, 255), 2)

SLOTS = {'sl_arma': ic_arma, 'sl_elmo': ic_elmo, 'sl_peito': ic_peito, 'sl_calca': ic_calca,
    'sl_botas': ic_botas, 'sl_luvas': ic_luvas, 'sl_capa': ic_capa, 'sl_anel': ic_anel,
    'sl_amuleto': ic_amuleto}

# ============ ATRIBUTOS (12) ============
def at_forca(cv):
    icon_base(cv)
    cv.r(38, 14, 20, 44, STEEL[2]); cv.r(42, 8, 12, 10, (230, 236, 248, 255))
    cv.r(30, 52, 36, 10, DARK[2]); cv.r(26, 62, 44, 8, GOLD[1])
    cv.tri(48, 4, 4, 8, (255, 240, 200, 255), flip=True)

def at_vitalidade(cv):
    icon_base(cv)
    cv.poly([(48, 78), (20, 50), (20, 34), (34, 26), (48, 38), (62, 26), (76, 34), (76, 50)], BLOOD[2])
    cv.poly([(48, 70), (28, 48), (30, 36), (42, 34), (48, 44)], shade(BLOOD[3], 1.25))
    cv.r(44, 40, 8, 18, (255, 200, 210, 130))

def at_destreza(cv):
    icon_base(cv)
    for dx in (0, 18):
        for i in range(34):
            c = mix((255, 250, 230, 255), (160, 168, 190, 255), min(1, i/28))
            cv.r(30 + dx + i//4, 22 + i, 4, 1, c)
    cv.r(26, 56, 14, 4, GOLD[2]); cv.r(46, 56, 14, 4, GOLD[2])

def at_energia(cv):
    icon_base(cv)
    cv.poly([(54, 8), (30, 50), (46, 50), (38, 86), (68, 40), (50, 40)], (255, 224, 110, 255))
    cv.poly([(52, 16), (36, 48), (46, 48), (42, 74), (62, 42), (50, 42)], (255, 246, 190, 255))

def at_sorte(cv):
    icon_base(cv)
    cv.p(36, 34, (90, 220, 120, 255), 12); cv.p(58, 34, (90, 220, 120, 255), 12)
    cv.p(36, 52, (90, 220, 120, 255), 12); cv.p(58, 52, (90, 220, 120, 255), 12)
    cv.p(47, 44, (150, 245, 170, 255), 10)
    cv.ln(48, 54, 58, 80, (60, 160, 90, 255), 3)

def at_precisao(cv):
    icon_base(cv)
    cv.d.ellipse([24, 24, 72, 72], outline=(220, 226, 240, 255), width=3)
    cv.d.ellipse([38, 38, 58, 58], outline=(220, 226, 240, 255), width=2)
    cv.r(46, 10, 4, 14, (255, 240, 180, 255)); cv.r(46, 72, 4, 14, (255, 240, 180, 255))
    cv.r(10, 46, 14, 4, (255, 240, 180, 255)); cv.r(72, 46, 14, 4, (255, 240, 180, 255))
    cv.p(46, 46, (255, 120, 130, 255), 4)

def at_crit(cv):
    icon_base(cv)
    cv.poly([(48, 10), (58, 38), (86, 48), (58, 58), (48, 86), (38, 58), (10, 48), (38, 38)], (255, 190, 80, 255))
    cv.poly([(48, 22), (54, 42), (74, 48), (54, 54), (48, 74), (42, 54), (22, 48), (42, 42)], (255, 240, 190, 255))

def at_critdmg(cv):
    icon_base(cv)
    cv.r(34, 20, 28, 22, (222, 214, 192, 255)); cv.r(38, 42, 20, 8, (222, 214, 192, 255))
    cv.r(38, 26, 6, 6, (30, 20, 30, 255)); cv.r(52, 26, 6, 6, (30, 20, 30, 255))
    cv.ln(42, 42, 54, 42, (30, 20, 30, 255), 2)
    cv.poly([(66, 54), (74, 70), (90, 74), (78, 84), (80, 96), (66, 88), (56, 94)], (255, 150, 70, 255))

def at_velocidade(cv):
    icon_base(cv)
    for i in range(3):
        y = 22 + i * 18
        cv.poly([(14, y), (60, y), (78, y + 9), (60, y + 18), (14, y + 18), (30, y + 9)], (90 + i*30, 220 - i*10, 250, 235))
        cv.poly([(20, y + 4), (56, y + 4), (66, y + 9), (56, y + 14), (20, y + 14)], (230, 244, 255, 200))

def at_lifesteal(cv):
    icon_base(cv)
    cv.poly([(48, 12), (66, 44), (58, 78), (38, 78), (30, 44)], BLOOD[2])
    cv.poly([(48, 22), (58, 44), (52, 68), (44, 68), (38, 44)], (240, 120, 140, 255))
    cv.tri(40, 40, 6, 10, (255, 240, 240, 255), flip=True)
    cv.tri(50, 40, 6, 10, (255, 240, 240, 255), flip=True)

def at_defesa(cv):
    icon_base(cv)
    cv.poly([(24, 18), (72, 18), (72, 52), (48, 82), (24, 52)], STEEL[3])
    cv.poly([(28, 23), (68, 23), (68, 50), (48, 74), (28, 50)], STEEL[2])
    cv.ln(48, 24, 48, 72, GOLD[1], 2)
    cv.ln(30, 40, 66, 40, GOLD[0], 2)

def at_regen(cv):
    icon_base(cv)
    cv.d.ellipse([26, 26, 70, 70], outline=(110, 220, 160, 255), width=3)
    cv.r(44, 34, 8, 28, (150, 240, 180, 255)); cv.r(34, 44, 28, 8, (150, 240, 180, 255))

ATTRS = {'attr_forca': at_forca, 'attr_vitalidade': at_vitalidade, 'attr_destreza': at_destreza,
    'attr_energia': at_energia, 'attr_sorte': at_sorte, 'attr_precisao': at_precisao,
    'attr_crit': at_crit, 'attr_critdmg': at_critdmg, 'attr_velocidade': at_velocidade,
    'attr_lifesteal': at_lifesteal, 'attr_defesa': at_defesa, 'attr_regen': at_regen}

# ============ MOEDAS (7) ============
def cur_ouro(cv):
    cv.ell(48, 58, 26, 16, (150, 100, 40, 255)); cv.ell(48, 54, 26, 16, GOLD[2])
    cv.ell(48, 54, 18, 10, GOLD[3]); cv.ell(48, 54, 8, 4, (255, 230, 160, 255))
    cv.ell(28, 40, 16, 10, GOLD[1]); cv.ell(28, 38, 16, 10, GOLD[2])
    cv.ell(28, 38, 9, 5, GOLD[3])

def cur_gemas(cv):
    cv.poly([(48, 10), (72, 36), (48, 86), (24, 36)], (70, 200, 178, 255))
    cv.poly([(48, 18), (64, 38), (48, 70), (32, 38)], (140, 240, 220, 255))
    cv.poly([(48, 26), (56, 40), (48, 58), (40, 40)], (230, 255, 250, 255))

def cur_essencia(cv):
    cv.r(40, 10, 16, 10, (150, 158, 178, 255))
    cv.poly([(38, 20), (58, 20), (70, 50), (58, 82), (38, 82), (26, 50)], (190, 200, 220, 90))
    cv.poly([(40, 36), (56, 36), (64, 52), (56, 76), (40, 76), (32, 52)], (120, 220, 200, 220))
    cv.ell(48, 58, 8, 10, (200, 255, 245, 255))

def cur_chaves(cv):
    cv.d.ellipse([30, 14, 66, 50], outline=GOLD[2], width=6)
    cv.d.ellipse([40, 24, 56, 40], outline=(150, 100, 40, 255), width=3)
    cv.r(45, 48, 8, 34, GOLD[2])
    cv.r(53, 62, 10, 6, GOLD[3]); cv.r(53, 74, 10, 6, GOLD[3])

def cur_frag_equip(cv):
    cv.poly([(30, 16), (52, 10), (58, 34), (44, 84), (26, 52)], STEEL[3])
    cv.poly([(34, 22), (48, 18), (52, 34), (42, 66), (32, 48)], STEEL[2])
    cv.ln(38, 26, 44, 60, (240, 246, 255, 160), 1)

def cur_frag_alma(cv):
    cv.poly([(48, 8), (62, 34), (58, 62), (48, 86), (38, 62), (34, 34)], (235, 222, 190, 255))
    cv.poly([(48, 18), (56, 36), (52, 58), (48, 72), (44, 58), (40, 36)], (255, 248, 226, 255))
    cv.p(46, 40, (255, 255, 240, 255), 2)

def cur_gloria(cv):
    for side in (0, 1):
        bx = 16 if side == 0 else 58
        for i in range(5):
            ang = -60 + i * 30
            import math
            x = 48 + (34 if side else -34) * math.cos(math.radians(ang)) * 0.9
            y = 52 + 30 * math.sin(math.radians(ang))
            cv.ell(x, y, 7, 4, GOLD[2])
    cv.ell(48, 48, 12, 14, (255, 230, 150, 255)); cv.p(46, 44, (255, 250, 220, 255), 2)

CURRENCIES = {'currency_ouro': cur_ouro, 'currency_gemas': cur_gemas, 'currency_essencia': cur_essencia,
    'currency_chaves': cur_chaves, 'currency_fragmentos_equip': cur_frag_equip,
    'currency_fragmentos_alma': cur_frag_alma, 'currency_gloria': cur_gloria}

# ============ SKILLS (sk1-5) + PASSIVAS (pk1-4) ============
def sk1(cv):  # lâmina do eclipse — crescente
    icon_base(cv)
    cv.d.ellipse([18, 14, 84, 80], outline=GOLD[3], width=7)
    cv.d.ellipse([30, 26, 72, 68], outline=(60, 44, 20, 255), width=8)
    cv.d.ellipse([34, 30, 68, 64], outline=(250, 234, 190, 255), width=2)
    cv.p(48, 8, (255, 248, 220, 255), 3)

def sk2(cv):  # guarda sombras
    icon_base(cv)
    cv.poly([(24, 20), (72, 20), (72, 54), (48, 80), (24, 54)], (40, 30, 64, 255))
    cv.poly([(28, 24), (68, 24), (68, 52), (48, 72), (28, 52)], (70, 52, 110, 255))
    cv.d.ellipse([38, 34, 58, 54], outline=(110, 240, 216, 255), width=3)

def sk3(cv):  # sedenta — presas
    icon_base(cv)
    cv.poly([(22, 22), (74, 22), (66, 46), (48, 84), (30, 46)], (110, 26, 44, 255))
    cv.tri(30, 40, 10, 18, (245, 238, 220, 255), flip=True)
    cv.tri(44, 46, 10, 24, (245, 238, 220, 255), flip=True)
    cv.tri(58, 40, 10, 18, (245, 238, 220, 255), flip=True)
    cv.r(22, 20, 52, 6, (180, 50, 70, 255))

def sk4(cv):  # rumo ao vazio
    icon_base(cv)
    cv.poly([(14, 48), (54, 30), (54, 42), (82, 42), (82, 54), (54, 54), (54, 66)], (110, 240, 216, 255))
    cv.poly([(20, 48), (52, 36), (52, 44), (76, 44), (76, 52), (52, 52), (52, 60)], (210, 255, 246, 255))
    cv.p(84, 30, (110, 240, 216, 200), 3); cv.p(80, 66, (110, 240, 216, 140), 2)

def sk5(cv):  # cataclismo — eclipse total
    icon_base(cv)
    cv.d.ellipse([14, 14, 82, 82], outline=GOLD[2], width=5)
    cv.d.ellipse([28, 28, 68, 68], fill=(10, 6, 14, 255))
    for a in range(8):
        import math
        ang = a * math.pi / 4
        x1 = 48 + math.cos(ang) * 18; y1 = 48 + math.sin(ang) * 18
        x2 = 48 + math.cos(ang) * 24; y2 = 48 + math.sin(ang) * 24
        cv.ln(x1, y1, x2, y2, (255, 220, 140, 255), 2)

def pk1(cv):  # fúria do eclipse
    icon_base(cv)
    cv.poly([(30, 16), (40, 34), (56, 24), (54, 44), (72, 40), (60, 58), (74, 62), (48, 84), (28, 66), (36, 52), (20, 48), (32, 34)], (255, 140, 60, 255))
    cv.poly([(42, 34), (50, 44), (58, 40), (52, 56), (58, 58), (46, 72), (36, 60), (42, 50), (32, 46)], (255, 220, 140, 255))

def pk2(cv):  # pele de obsidiana
    icon_base(cv)
    cv.poly([(24, 18), (72, 18), (72, 52), (48, 82), (24, 52)], (30, 24, 44, 255))
    cv.poly([(28, 23), (68, 23), (68, 50), (48, 74), (28, 50)], (52, 44, 76, 255))
    cv.ln(36, 28, 42, 60, (90, 80, 120, 255), 1); cv.ln(58, 26, 54, 58, (90, 80, 120, 255), 1)
    cv.r(46, 36, 6, 6, (110, 240, 216, 200))

def pk3(cv):  # sorte do crepúsculo
    icon_base(cv)
    cv.p(36, 32, (90, 220, 120, 255), 12); cv.p(56, 32, (90, 220, 120, 255), 12)
    cv.p(36, 48, (90, 220, 120, 255), 12); cv.p(56, 48, (90, 220, 120, 255), 12)
    cv.p(46, 40, (160, 245, 180, 255), 9)
    cv.ln(48, 52, 56, 80, (60, 160, 90, 255), 3)
    cv.d.arc([20, 12, 76, 68], 300, 60, fill=(232, 163, 58, 200), width=2)

def pk4(cv):  # eco do vazio
    icon_base(cv)
    for r, a in ((30, 255), (22, 190), (14, 130)):
        cv.d.ellipse([48-r, 48-r, 48+r, 48+r], outline=(110, 240, 216, a), width=3)
    cv.p(44, 44, (230, 255, 250, 255), 6)

SKILLS = {'sk1': sk1, 'sk2': sk2, 'sk3': sk3, 'sk4': sk4, 'sk5': sk5,
    'pk1': pk1, 'pk2': pk2, 'pk3': pk3, 'pk4': pk4}

# ============ PETICONS (6) ============
PET_ACC = {'peticon_1': (110, 240, 216), 'peticon_2': (232, 163, 58), 'peticon_3': (150, 220, 235),
    'peticon_4': (130, 138, 158), 'peticon_5': (244, 158, 76), 'peticon_6': (250, 200, 110)}
def peticon(cv, acc):
    cv.d.ellipse([14, 14, 82, 82], fill=(36, 26, 54, 230))
    cv.d.ellipse([14, 14, 82, 82], outline=acc + (255,), width=2)
    cv.ell(48, 58, 11, 9, acc + (255,))
    for (dx, dy) in ((-14, -12), (0, -18), (14, -12)):
        cv.ell(48 + dx, 58 + dy, 4, 5, acc + (255,))

# ============ ABAS DE NAVEGAÇÃO (8) ============
def tab_heroi(cv):
    icon_base(cv)
    cv.r(40, 14, 16, 12, STEEL[3]); cv.r(42, 26, 12, 4, (12, 8, 18, 255))
    cv.r(34, 38, 28, 22, STEEL[2]); cv.r(34, 56, 28, 3, GOLD[1])
    cv.r(30, 40, 7, 16, STEEL[3]); cv.r(59, 40, 7, 16, STEEL[3])
    cv.ell(48, 46, 4, 4, (110, 240, 216, 255))
def tab_equip(cv):
    at_defesa(cv)
def tab_skills(cv):
    sk1(cv)
def tab_pets(cv):
    peticon(cv, (110, 240, 216))
def tab_map(cv):
    icon_base(cv)
    cv.r(16, 24, 64, 48, (196, 176, 138, 255))
    cv.poly([(16, 24), (36, 30), (36, 72), (16, 72)], (168, 148, 112, 255))
    cv.poly([(60, 30), (80, 24), (80, 72), (60, 72)], (168, 148, 112, 255))
    cv.ln(24, 40, 34, 52, (120, 90, 60, 255), 2); cv.ln(44, 34, 40, 56, (120, 90, 60, 255), 2)
    cv.ln(52, 44, 66, 36, (120, 90, 60, 255), 2)
    cv.p(62, 52, (200, 60, 70, 255), 4)
def tab_dungeons(cv):
    icon_base(cv)
    cv.r(20, 20, 56, 56, (36, 28, 52, 255))
    cv.poly([(34, 76), (34, 44), (48, 28), (62, 44), (62, 76)], (12, 8, 18, 255))
    cv.r(30, 74, 36, 5, (60, 46, 84, 255))
    cv.p(48, 52, (110, 240, 216, 180), 2)
def tab_summon(cv):
    icon_base(cv)
    cv.poly([(48, 10), (72, 40), (62, 86), (34, 86), (24, 40)], (90, 60, 140, 255))
    cv.poly([(48, 20), (64, 42), (56, 76), (40, 76), (32, 42)], (140, 96, 200, 255))
    cv.ell(48, 48, 7, 9, (220, 180, 255, 255)); cv.p(46, 44, (255, 250, 255, 255), 2)
def tab_shop(cv):
    icon_base(cv)
    cv.poly([(20, 30), (76, 30), (70, 44), (26, 44)], (150, 90, 60, 255))
    cv.r(26, 44, 44, 32, (120, 76, 50, 255))
    cv.r(40, 52, 16, 24, (80, 52, 36, 255))
    cv.d.arc([36, 16, 60, 34], 180, 360, fill=(222, 196, 150, 255), width=3)

TABS = {'tab_heroi': tab_heroi, 'tab_equip': tab_equip, 'tab_skills': tab_skills,
    'tab_pets': tab_pets, 'tab_map': tab_map, 'tab_dungeons': tab_dungeons,
    'tab_summon': tab_summon, 'tab_shop': tab_shop}

# ============ TEXTURAS DE PAINEL ============
def tex_stone():
    im = Image.new('RGB', (96, 96)); d = ImageDraw.Draw(im)
    rng2 = random.Random(5)
    base = (26, 20, 38)
    d.rectangle([0, 0, 95, 95], fill=base)
    bh = 16
    for row in range(96 // bh):
        y = row * bh
        off = (row % 2) * 24
        bx = -off
        while bx < 96:
            w = rng2.randint(36, 52)
            c = mix(base, (12, 8, 20, 255), rng2.uniform(0.15, 0.5))
            c = (c[0], c[1], c[2])
            x0, x1 = bx, bx + w
            d.rectangle([x0, y, x1 - 2, y + bh - 2], fill=c)
            d.line([(x0, y), (x1 - 2, y)], fill=mix(c, (255, 255, 255, 255), 0.10))
            d.line([(x0, y), (x0, y + bh - 2)], fill=mix(c, (255, 255, 255, 255), 0.06))
            d.line([(x0, y + bh - 2), (x1 - 2, y + bh - 2)], fill=(10, 7, 16))
            bx += w
    for i in range(26):
        d.point((rng2.randrange(96), rng2.randrange(96)), fill=(42, 34, 58))
    im.save(f'{ROOT}/ui/tex_stone.png', optimize=True)

def tex_metal():
    im = Image.new('RGB', (96, 96)); d = ImageDraw.Draw(im)
    rng2 = random.Random(9)
    for y in range(96):
        f = 0.9 + 0.1 * ((y * 7) % 13) / 12
        c = (int(30 * f), int(26 * f), int(40 * f))
        d.line([(0, y), (95, y)], fill=c)
    for (x, y) in ((8, 8), (88, 8), (8, 88), (88, 88)):
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(52, 46, 66))
        d.point((x - 1, y - 1), fill=(120, 110, 140))
    im.save(f'{ROOT}/ui/tex_metal.png', optimize=True)

def tex_parch():
    im = Image.new('RGB', (96, 96)); d = ImageDraw.Draw(im)
    rng2 = random.Random(3)
    d.rectangle([0, 0, 95, 95], fill=(206, 186, 148))
    for i in range(700):
        x, y = rng2.randrange(96), rng2.randrange(96)
        c = mix((206, 186, 148), (170, 146, 108, 255), rng2.uniform(0.1, 0.4))
        d.point((x, y), fill=c)
    for i in range(5):
        x, y = rng2.randrange(80), rng2.randrange(80)
        d.ellipse([x, y, x + rng2.randint(6, 14), y + rng2.randint(4, 9)], outline=(176, 152, 112), width=1)
    im.save(f'{ROOT}/ui/tex_parch.png', optimize=True)

def tex_frame():
    """moldura 9-slice 96x96: obsidiana + filete dourado + gema nos cantos"""
    im = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    T = 18
    d.rectangle([0, 0, 95, 95], outline=(58, 46, 82, 255), width=2)
    d.rectangle([2, 2, 93, 93], outline=(20, 14, 32, 255), width=2)
    d.rectangle([4, 4, 91, 91], outline=(232, 163, 58, 255), width=2)
    d.rectangle([7, 7, 88, 88], outline=(140, 96, 34, 255), width=1)
    for (cx, cy) in ((T//2, T//2), (95-T//2, T//2), (T//2, 95-T//2), (95-T//2, 95-T//2)):
        d.polygon([(cx, cy-6), (cx+6, cy), (cx, cy+6), (cx-6, cy)], fill=(232, 163, 58, 255))
        d.polygon([(cx, cy-3), (cx+3, cy), (cx, cy+3), (cx-3, cy)], fill=(255, 232, 170, 255))
    for i in range(0, 96, 24):
        d.point((i + 12, 5), fill=(232, 163, 58, 140))
        d.point((i + 12, 90), fill=(232, 163, 58, 140))
    im.save(f'{ROOT}/ui/tex_frame.png', optimize=True)

def tex_vignette():
    size = 240
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    steps = 40
    for i in range(steps):
        a = int(150 * (i / steps) ** 1.6)
        inset = int((size // 2) * (1 - i / steps))
        d.ellipse([inset, inset, size - inset, size - inset], outline=max(0, a))
    im = im.filter(__import__('PIL.ImageFilter', fromlist=['GaussianBlur']).GaussianBlur(8))
    alpha = im
    rgba = Image.new('RGBA', (size, size), (6, 3, 10, 255))
    rgba.putalpha(alpha)
    rgba.save(f'{ROOT}/ui/tex_vignette.png', optimize=True)

# ============ PARALLAX 7 REGIÕES × 4 CAMADAS ============
SKY = {
    'bosque_vidro': ((11, 20, 16), (18, 38, 28)), 'pantano': ((16, 20, 8), (28, 36, 16)),
    'cidadela': ((20, 15, 28), (36, 26, 51)), 'deserto_cinzas': ((28, 20, 16), (51, 38, 26)),
    'picos': ((12, 16, 24), (24, 32, 46)), 'coracao': ((22, 10, 20), (46, 18, 40)),
    'abismo': ((8, 7, 12), (18, 14, 28)),
}

def gen_sky(rid):
    top, bot = SKY[rid]
    W, H = 270, 480
    im = vgrad(W, H, top, bot).convert('RGBA')
    d = ImageDraw.Draw(im)
    r2 = random.Random(hash(rid) & 0xffff)
    star_field(d, W, H, r2, n=110 if rid in ('picos', 'abismo', 'coracao') else 60)
    # astro por região
    if rid == 'coracao':
        # eclipse vermelho dominante
        d.ellipse([135 - 52, 90 - 52, 135 + 52, 90 + 52], fill=(10, 4, 8, 255))
        d.ellipse([135 - 52, 90 - 52, 135 + 52, 90 + 52], outline=(232, 90, 70, 255), width=4)
        d.ellipse([135 - 44, 90 - 44, 135 + 44, 90 + 44], outline=(120, 30, 40, 200), width=2)
    elif rid == 'abismo':
        d.ellipse([135 - 46, 80 - 46, 135 + 46, 80 + 46], fill=(6, 4, 10, 255))
        for rr, aa in ((52, 255), (58, 120), (64, 60)):
            d.ellipse([135 - rr, 80 - rr, 135 + rr, 80 + rr], outline=(245, 230, 200, aa), width=3)
        d.ellipse([135 - 40, 80 - 40, 135 + 40, 80 + 40], outline=(250, 244, 226, 255), width=1)
    elif rid == 'deserto_cinzas':
        d.ellipse([135 - 34, 84 - 34, 135 + 34, 84 + 34], fill=(60, 36, 20, 255))
        d.ellipse([135 - 34, 84 - 34, 135 + 34, 84 + 34], outline=(240, 140, 60, 255), width=5)
    elif rid == 'cidadela':
        d.ellipse([190, 60, 226, 96], fill=(220, 200, 255, 200))
        d.ellipse([70, 40, 96, 66], fill=(190, 170, 230, 160))
    elif rid == 'picos':
        # aurora
        for i in range(3):
            x0 = 30 + i * 80
            for t in range(60):
                y = 40 + t + int(12 * math_sin(t * 0.2 + i))
                d.line([(x0 + t, y), (x0 + t + 2, y)], fill=(80 + i * 20, 160 + i * 20, 200, 40))
    elif rid == 'bosque_vidro':
        # lua estilhaçada
        d.ellipse([180, 46, 236, 102], fill=(200, 236, 226, 220))
        for (fx, fy) in ((196, 60), (214, 84), (226, 66), (204, 92)):
            d.polygon([(fx, fy), (fx + 6, fy + 4), (fx, fy + 9)], fill=(16, 30, 26, 255))
    dither_rect(d, 0, H - 90, W, 90, (0, 0, 0, 0), (0, 0, 0, 70), 0.35, r2)
    im.save(f'{ROOT}/ui/bg_{rid}_sky.png', optimize=True)

import math
def math_sin(x): return math.sin(x)

def gen_layer(rid, kind, H, drawer):
    W = 270
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    drawer(d, W, H)
    # garante tileabilidade: copia bordas cruzadas
    im.save(f'{ROOT}/ui/bg_{rid}_{kind}.png', optimize=True)

def silhouette_tree(d, x, base, h, c, w=10):
    d.polygon([(x - w//2, base), (x, base - h), (x + w//2, base)], fill=c)
    for i, (tw, th) in enumerate(((w*2, h*0.5), (w*1.5, h*0.72), (w, h*0.9))):
        yy = base - h*0.4 - i*h*0.22
        d.polygon([(x - tw//2, yy), (x, yy - th), (x + tw//2, yy)], fill=c)

def wrapped(d, W, fn):
    """desenha elementos com repetição para tileabilidade"""
    fn(W); fn(W + W); fn(W - W)

def wrapped3(d, W, draw_at):
    """desenha o conteúdo em x, x±W para tileabilidade perfeita"""
    for off in (-W, 0, W):
        draw_at(off)

REG_LAYERS = {
    'bosque_vidro': {
        'far': lambda d, W, H: wrapped3(d, W, lambda off: [silhouette_tree(d, 40 + (i * 52) % W + off, H + 8, 120 + (i * 37) % 60, (18, 42, 34, 255), 26) for i in range(6)]),
        'mid': lambda d, W, H: wrapped3(d, W, lambda off: [silhouette_tree(d, 20 + (i * 61) % W + off, H + 6, 88 + (i * 29) % 40, (12, 32, 26, 255), 20) for i in range(5)]),
        'near': lambda d, W, H: (
            wrapped3(d, W, lambda off: [d.polygon([(20 + (i * 90) % W + off, H), (20 + (i * 90) % W + off + 12, H - 34), (20 + (i * 90) % W + off + 24, H)], fill=(8, 20, 16, 255)) for i in range(4)]),
            wrapped3(d, W, lambda off: [d.ellipse((14 + (i * 90) % W + off, H - 14, 28 + (i * 90) % W + off, H), fill=(20, 60, 52, 255)) for i in range(4)]),
            wrapped3(d, W, lambda off: [d.point((10 + (i * 57) % W + off, H - 30 - (i * 13) % 20), fill=(110, 240, 216, 200)) for i in range(6)]),
        ),
    },
}

def generic_layers(rid):
    """camadas genéricas refinadas por região (fallback rico)"""
    c = {
        'bosque_vidro': ((18, 42, 34), (12, 32, 26), (8, 20, 16), (110, 240, 216)),
        'pantano': ((34, 44, 18), (26, 34, 12), (16, 22, 7), (150, 178, 62)),
        'cidadela': ((44, 32, 64), (34, 24, 50), (20, 14, 30), (155, 89, 208)),
        'deserto_cinzas': ((64, 46, 30), (48, 34, 22), (28, 20, 13), (232, 131, 58)),
        'picos': ((40, 56, 84), (30, 42, 66), (18, 26, 42), (150, 214, 250)),
        'coracao': ((64, 24, 44), (48, 18, 34), (28, 10, 22), (214, 76, 102)),
        'abismo': ((28, 22, 44), (20, 16, 34), (10, 8, 20), (245, 230, 200)),
    }[rid]
    far, mid, near, acc = c
    r2 = random.Random(hash(rid) & 0xffff)

    def far_fn(d, W, H):
        for i in range(5):
            x = (i * 58 + (hash(rid) % 20)) % W
            h = H * 0.7 + (i * 31) % 30
            d.polygon([(x - 30, H), (x, H - h), (x + 34, H)], fill=far + (255,))
            d.polygon([(x - 12, H - h + 18), (x, H - h - 6), (x + 12, H - h + 18)], fill=far + (255,))

    def mid_fn(d, W, H):
        for i in range(4):
            x = (i * 72 + (hash(rid) % 30)) % W
            if rid in ('cidadela', 'coracao', 'abismo'):
                # torres
                tw = 22
                th = H * 0.8 + (i * 23) % 20
                d.rectangle([x, H - th, x + tw, H], fill=mid + (255,))
                d.polygon([(x - 4, H - th), (x + tw // 2, H - th - 16), (x + tw + 4, H - th)], fill=mid + (255,))
                for wy in range(3):
                    d.rectangle([x + 6, H - th + 14 + wy * 14, x + tw - 6, H - th + 20 + wy * 14], fill=acc + (170,))
            elif rid in ('bosque_vidro', 'picos'):
                silhouette_tree(d, x, H + 4, H * 0.75, mid + (255,), 22)
            else:
                d.polygon([(x - 26, H), (x, H - H * 0.7 - (i * 17) % 20), (x + 30, H)], fill=mid + (255,))

    def near_fn(d, W, H):
        for i in range(5):
            x = (i * 64 + (hash(rid) % 40)) % W
            d.polygon([(x - 24, H), (x, H - 34 - (i * 11) % 16), (x + 26, H)], fill=near + (255,))
            if i % 2 == 0:
                d.point((x, H - 40 - (i * 7) % 12), fill=acc + (220,))
                d.point((x + 2, H - 44 - (i * 5) % 12), fill=acc + (140,))

    gen_layer(rid, 'far', 190, far_fn)
    gen_layer(rid, 'mid', 150, mid_fn)
    gen_layer(rid, 'near', 110, near_fn)

def main():
    for name, fn in {**SLOTS, **ATTRS, **CURRENCIES, **SKILLS}.items():
        cv = CV(96); fn(cv); fin_icon(cv, f'{ROOT}/ui/{name}.png')
    for i in range(1, 7):
        cv = CV(96)
        key = f'peticon_{i}'
        peticon(cv, PET_ACC[key])
        fin_icon(cv, f'{ROOT}/ui/{key}.png')
    for name, fn in TABS.items():
        cv = CV(96); fn(cv); fin_icon(cv, f'{ROOT}/ui/{name}.png')
    print('icons ok')
    tex_stone(); tex_metal(); tex_parch(); tex_frame(); tex_vignette()
    print('textures ok')
    for rid in SKY:
        gen_sky(rid)
        if rid == 'bosque_vidro':
            # usa camadas dedicadas do bosque
            for kind, H in (('far', 190), ('mid', 150), ('near', 110)):
                pass  # já geradas por REG_LAYERS abaixo
        generic_layers(rid)
    # aplica camadas dedicadas do bosque (substitui genéricas)
    spec = REG_LAYERS['bosque_vidro']
    for kind, fn in spec.items():
        H = {'far': 190, 'mid': 150, 'near': 110}[kind]
        gen_layer('bosque_vidro', kind, H, fn)
    print('parallax ok')
    # contact sheet de ícones
    import glob
    names = sorted(glob.glob(f'{ROOT}/ui/*.png'))
    names = [n for n in names if not n.split('/')[-1].startswith(('tex_', 'bg_'))]
    cols = 10
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * 100, rows * 100), (22, 16, 32, 255))
    for i, n in enumerate(names):
        im = Image.open(n).convert('RGBA')
        sheet.paste(im, ((i % cols) * 100 + 2, (i // cols) * 100 + 2), im)
    sheet.save('/home/z/my-project/scripts/eidryn_html/sheet_icons.png')
    # sheet de fundos
    names2 = sorted(glob.glob(f'{ROOT}/ui/bg_*.png'))
    sheet2 = Image.new('RGBA', (280 * 4, 500 * 7), (10, 8, 14, 255))
    for i, n in enumerate(names2):
        im = Image.open(n).convert('RGBA')
        rid = n.split('bg_')[1]
        row = ['bosque_vidro', 'pantano', 'cidadela', 'deserto_cinzas', 'picos', 'coracao', 'abismo'].index(rid.split('_sky')[0].split('_far')[0].split('_mid')[0].split('_near')[0])
        col = 0 if 'sky' in rid else (1 if 'far' in rid else (2 if 'mid' in rid else 3))
        y = 500 - im.height
        sheet2.alpha_composite(im, (col * 280 + 5, row * 500 + y))
    sheet2.save('/home/z/my-project/scripts/eidryn_html/sheet_bg.png')
    print('sheets ok')

if __name__ == '__main__':
    main()
