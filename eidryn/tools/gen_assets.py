#!/usr/bin/env python3
"""Gerador de assets pixel art — Eidryn: O Ciclo do Eclipse.
Sprites 96x96 originais, placeholders consistentes com a paleta do ART_STYLE_GUIDE."""
import os, math, random
from PIL import Image, ImageDraw

ROOT = "/home/z/my-project/eidryn/assets/sprites"
random.seed(20777)

def img(size=96):
    return Image.new("RGBA", (size, size), (0, 0, 0, 0))

def px(d, x, y, c, s=1):
    d.rectangle([x, y, x + s - 1, y + s - 1], fill=c)

def shade(c, f):
    return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))), max(0, min(255, int(c[2] * f))), c[3] if len(c) > 3 else 255)

# ---------- HERÓI ----------
def gen_hero():
    im = img(); d = ImageDraw.Draw(im)
    armor = (70, 74, 96, 255); cape = (58, 44, 80, 255); skin = (214, 178, 140, 255)
    steel = (150, 158, 178, 255); glow = (232, 131, 58, 255); dark = (36, 30, 48, 255)
    # capa
    for i in range(30):
        px(d, 34 + i // 6, 30 + i, shade(cape, 1.0 - i * 0.012), 28 - i // 5)
    # pernas
    px(d, 36, 74, shade(armor, 0.8), 8); px(d, 52, 74, shade(armor, 0.8), 8)
    px(d, 34, 86, dark, 10); px(d, 52, 86, dark, 10)
    # tronco
    px(d, 34, 44, armor, 28); px(d, 38, 48, steel, 6)
    px(d, 46, 50, glow, 4)  # núcleo do eclipse
    # ombreiras
    px(d, 26, 42, shade(steel, 1.1), 10); px(d, 60, 42, shade(steel, 1.1), 10)
    # cabeça + elmo
    px(d, 40, 22, skin, 16); px(d, 38, 16, steel, 20)
    px(d, 40, 26, glow, 3); px(d, 54, 26, glow, 3)  # olhos brilhando
    px(d, 44, 12, glow, 8)  # cristal do elmo
    # espada com brilho
    px(d, 76, 20, glow, 4)
    for i in range(46):
        px(d, 76, 26 + i, shade(steel, 1.25 - i * 0.01), 4)
    px(d, 72, 70, dark, 12, ) if False else px(d, 72, 70, dark, 12)
    im.save(f"{ROOT}/hero/hero.png")

# ---------- INIMIGOS ----------
REGION_PALETTES = {
    "bosque_vidro": [(40, 90, 74), (58, 158, 143), (20, 60, 50)],
    "pantano": [(110, 130, 40), (140, 170, 60), (70, 88, 28)],
    "cidadela": [(120, 80, 160), (155, 89, 208), (86, 56, 116)],
    "deserto_cinzas": [(190, 120, 60), (232, 131, 58), (130, 84, 44)],
    "picos": [(70, 110, 190), (58, 123, 213), (44, 70, 130)],
    "coracao": [(190, 60, 84), (208, 69, 95), (130, 40, 56)],
    "abismo": [(230, 220, 190), (245, 230, 200), (150, 140, 120)],
}

def gen_enemy(region, idx, kind):
    im = img(); d = ImageDraw.Draw(im)
    pal = REGION_PALETTES[region]
    body = pal[idx % len(pal)]; dark = shade(body, 0.55); lit = shade(body, 1.35)
    eye = (255, 240, 200, 255)
    rng = random.Random(f"{region}{idx}")
    if kind == 0:  # quadrúpede / lobo
        px(d, 18, 48, body, 44); px(d, 60, 40, body, 30)
        px(d, 74, 34, dark, 20); px(d, 76, 26, lit, 6)
        px(d, 80, 38, eye, 4); px(d, 84, 30, lit, 12, )
        px(d, 16, 88, dark, 10); px(d, 40, 88, dark, 10); px(d, 56, 88, dark, 10)
        px(d, 20, 44, lit, 8)
    elif kind == 1:  # voador / corvo
        px(d, 30, 44, body, 34)
        px(d, 8, 34, dark, 26, ); px(d, 62, 34, dark, 26)
        px(d, 40, 30, lit, 18); px(d, 44, 36, eye, 4); px(d, 56, 36, eye, 4)
        px(d, 40, 72, dark, 14); px(d, 44, 80, dark, 8)
    elif kind == 2:  # humanoide
        px(d, 36, 40, body, 24); px(d, 40, 18, dark, 16)
        px(d, 44, 24, eye, 3)
        px(d, 26, 42, dark, 10); px(d, 60, 42, dark, 10)
        px(d, 36, 64, dark, 22); px(d, 34, 86, dark, 10); px(d, 52, 86, dark, 10)
        px(d, 70, 30, lit, 4)
    elif kind == 3:  # golem / gordo
        px(d, 22, 34, body, 52); px(d, 30, 26, lit, 12)
        px(d, 36, 50, eye, 6); px(d, 58, 50, eye, 6)
        px(d, 14, 70, dark, 16); px(d, 64, 70, dark, 16)
        px(d, 40, 44, dark, 14)
    else:  # serpente/aberração
        pts = [(14 + i * 10, 40 + int(14 * math.sin(i * 0.9))) for i in range(8)]
        for (x, y) in pts:
            px(d, x, y, body, 12)
        px(d, 78, pts[-1][1] - 4, lit, 16)
        px(d, 82, pts[-1][1] - 2, eye, 4)
        px(d, 82, pts[-1][1] + 4, eye, 4)
    # aura sutil da região
    aura = lit
    for a in range(8):
        x, y = rng.randint(4, 88), rng.randint(4, 88)
        px(d, x, y, shade(aura, 1.2), 2)
    im.save(f"{ROOT}/enemies/enemy_{region}_{idx}.png")

def gen_generic_enemy():
    im = img(); d = ImageDraw.Draw(im)
    body = (90, 80, 110, 255)
    px(d, 24, 36, body, 48); px(d, 38, 52, (255, 240, 200, 255), 5)
    px(d, 58, 52, (255, 240, 200, 255), 5); px(d, 30, 84, shade(body, 0.6), 36)
    im.save(f"{ROOT}/enemies/enemy_generic.png")

# ---------- BOSSES (versões maiores/dramáticas = mesmo arquivo 96x96 com coroa) ----------
def gen_boss(region):
    im = img(); d = ImageDraw.Draw(im)
    pal = REGION_PALETTES[region]
    body = shade(pal[1], 1.1)
    px(d, 20, 40, body, 56); px(d, 32, 16, (245, 230, 200, 255), 8)
    px(d, 24, 22, (245, 230, 200, 255), 4); px(d, 44, 22, (245, 230, 200, 255), 4)
    px(d, 64, 22, (245, 230, 200, 255), 4)
    px(d, 38, 56, (232, 131, 58, 255), 6); px(d, 56, 56, (232, 131, 58, 255), 6)
    px(d, 30, 88, shade(body, 0.5), 14); px(d, 52, 88, shade(body, 0.5), 14)
    im.save(f"{ROOT}/enemies/boss_{region}.png")

# ---------- PETS ----------
def gen_pet(pid, base, accent):
    im = img(); d = ImageDraw.Draw(im)
    px(d, 26, 52, base, 40)
    px(d, 62, 42, base, 24); px(d, 70, 36, accent, 8)
    px(d, 68, 48, (255, 255, 255, 255), 3)
    px(d, 20, 88, shade(base, 0.6), 12); px(d, 44, 88, shade(base, 0.6), 12)
    px(d, 60, 66, accent, 6)
    im.save(f"{ROOT}/pets/{pid}.png")

# ---------- ÍCONES UI ----------
def gen_icon(name, painter):
    im = img(); d = ImageDraw.Draw(im)
    painter(d)
    im.save(f"{ROOT}/ui/{name}.png")

def coin(d):
    for i in range(10):
        px(d, 20 + i, 48 - i // 2, (240, 200, 90, 255), 56 + i)
    px(d, 30, 30, (250, 225, 140, 255), 40)
    px(d, 40, 44, (160, 120, 40, 255), 16)

def gem(d):
    for i in range(16):
        w = 56 - abs(8 - i) * 4
        px(d, 20 + i, 20 + i, (120, 220, 230, 255), max(4, w))
    px(d, 36, 34, (220, 255, 255, 255), 10)

def essencia(d):
    px(d, 44, 16, (200, 180, 255, 255), 8)
    for i in range(8):
        px(d, 30 + i * 3, 30 + i * 6, (180, 160, 255, 255), 6)
    px(d, 40, 40, (245, 230, 200, 255), 16)

def chave(d):
    px(d, 24, 30, (220, 180, 90, 255), 36)
    px(d, 56, 44, (220, 180, 90, 255), 32)
    px(d, 72, 40, (220, 180, 90, 255), 8)
    px(d, 72, 52, (220, 180, 90, 255), 8)

def frag(d):
    px(d, 30, 40, (120, 200, 190, 255), 30)
    px(d, 50, 26, (150, 220, 210, 255), 20)
    px(d, 52, 52, (90, 160, 150, 255), 18)

def alma(d):
    px(d, 40, 20, (245, 230, 200, 255), 16)
    for i in range(10):
        px(d, 28 + i * 4, 40 + i * 4, (230, 210, 170, 255), 8 - i // 3)

def gloria(d):
    px(d, 30, 60, (240, 190, 70, 255), 36)
    px(d, 42, 16, (250, 210, 90, 255), 12)
    px(d, 24, 24, (250, 210, 90, 255), 12)
    px(d, 60, 24, (250, 210, 90, 255), 12)

def rune(color):
    def p(d):
        px(d, 34, 20, color, 28)
        px(d, 24, 44, shade(color, 1.3), 48)
        px(d, 40, 60, (245, 230, 200, 255), 16)
    return p

def slot_icon(color):
    def p(d):
        px(d, 26, 26, color, 44)
        px(d, 34, 34, shade(color, 1.4), 28)
    return p

def attr_icon(color):
    def p(d):
        px(d, 40, 20, color, 16)
        px(d, 28, 40, color, 40)
        px(d, 40, 64, shade(color, 1.25), 16)
    return p

def pet_icon(color):
    def p(d):
        px(d, 28, 44, color, 40); px(d, 60, 40, color, 24)
        px(d, 66, 34, shade(color, 1.4), 8)
    return p

def main():
    os.makedirs(f"{ROOT}/hero", exist_ok=True)
    os.makedirs(f"{ROOT}/enemies", exist_ok=True)
    os.makedirs(f"{ROOT}/pets", exist_ok=True)
    os.makedirs(f"{ROOT}/ui", exist_ok=True)
    gen_hero()
    gen_generic_enemy()
    regions = ["bosque_vidro", "pantano", "cidadela", "deserto_cinzas", "picos", "coracao", "abismo"]
    for r in regions:
        for i in range(5):
            gen_enemy(r, i, i % 5)
        gen_boss(r)
    pets = [
        ("pet_lobo", (70, 74, 96, 255), (232, 131, 58, 255)),
        ("pet_corvo", (40, 40, 56, 255), (120, 160, 220, 255)),
        ("pet_grilo", (110, 160, 60, 255), (200, 240, 120, 255)),
        ("pet_golem", (120, 110, 130, 255), (180, 170, 200, 255)),
        ("pet_serpente", (190, 100, 50, 255), (255, 190, 90, 255)),
        ("pet_fada", (200, 180, 255, 255), (255, 240, 200, 255)),
        ("cmp_cavaleiro", (100, 100, 120, 255), (200, 200, 220, 255)),
        ("cmp_arquivista", (140, 110, 80, 255), (230, 200, 150, 255)),
        ("cmp_feiticeira", (120, 60, 140, 255), (220, 140, 255, 255)),
        ("cmp_ferreiro", (150, 80, 50, 255), (255, 160, 90, 255)),
    ]
    for pid, b, a in pets:
        gen_pet(pid, b, a)
    gen_icon("currency_ouro", coin)
    gen_icon("currency_gemas", gem)
    gen_icon("currency_essencia", essencia)
    gen_icon("currency_chaves", chave)
    gen_icon("currency_fragmentos_equip", frag)
    gen_icon("currency_fragmentos_alma", alma)
    gen_icon("currency_gloria", gloria)
    gen_icon("sk1", rune((232, 131, 58, 255)))
    gen_icon("sk2", rune((58, 123, 213, 255)))
    gen_icon("sk3", rune((155, 89, 208, 255)))
    gen_icon("sk4", rune((58, 158, 143, 255)))
    gen_icon("sk5", rune((245, 230, 200, 255)))
    for i in range(4):
        gen_icon(f"pk{i+1}", rune((140 + i * 20, 100, 180, 255)))
    slot_colors = {"sl_arma": (200, 90, 70), "sl_elmo": (90, 130, 200), "sl_peito": (80, 170, 120),
                   "sl_calca": (140, 110, 80), "sl_botas": (110, 90, 150), "sl_luvas": (170, 140, 60),
                   "sl_capa": (60, 140, 150), "sl_anel": (200, 160, 60), "sl_amuleto": (180, 80, 140)}
    for name, c in slot_colors.items():
        gen_icon(name, slot_icon(c + (255,)))
    attr_colors = {"forca": (210, 90, 70), "vitalidade": (90, 190, 120), "destreza": (90, 150, 210),
                   "energia": (220, 180, 70), "sorte": (180, 140, 230), "precisao": (120, 200, 200),
                   "crit": (230, 120, 90), "critdmg": (220, 90, 130), "velocidade": (140, 200, 120),
                   "lifesteal": (200, 70, 90), "defesa": (150, 150, 170), "regen": (120, 210, 160)}
    for name, c in attr_colors.items():
        gen_icon(f"attr_{name}", attr_icon(c + (255,)))
    for i in range(1, 7):
        gen_icon(f"peticon_{i}", pet_icon((100 + i * 20, 120, 160 + i * 10, 255)))
    print("Assets OK:", sum(len(f) for _, _, f in os.walk(ROOT)), "arquivos")

if __name__ == "__main__":
    main()
