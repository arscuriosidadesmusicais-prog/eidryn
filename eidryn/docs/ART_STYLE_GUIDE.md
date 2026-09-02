# ART_STYLE_GUIDE — Eidryn: O Ciclo do Eclipse
Pixel Art Dark Fantasy | Sprites 96×96 | Portrait 1080×1920

## 1. Princípios
1. **Silhueta primeiro**: cada criatura é reconhecível em preto sólido.
2. **Luz do eclipse**: toda cena tem uma fonte de luz âmbar/fria indireta — nunca sol pleno.
3. **Paleta restrita por região**: 3 tons (sombra/base/luz) + 1 accent + olhos brilhantes.
4. **Contraste funcional**: herói quente (âmbar #E8833A) vs inimigos frios/pálidos.

## 2. Paleta global
| Uso | Hex |
|---|---|
| Fundo profundo | `#0D0A14` |
| Painéis UI | `#1A1526` / `#241D3A` |
| Borda UI | `#3A2F55` |
| Texto principal | `#E8E0D0` |
| Texto secundário | `#9A92B0` |
| Accent (eclipse) | `#E8833A` |
| Accent secundário | `#3A9E8F` |
| Perigo/chefe | `#D0455F` |
| Divino | `#F5E6C8` |

## 3. Cores de raridade (glow + texto)
Comum `#9AA0A6` · Incomum `#58C46A` · Rara `#3A7BD5` · Épica `#9B59D0` · Lendária `#E8A33A` · Mítica `#D0455F` · Divina `#F5E6C8`.
Itens raros+ recebem pulso de brilho (modulate ±8% a 2 Hz) e toast/sfx dedicados.

## 4. Paletas por região (usadas no parallax e sprites)
| Região | sombra | base | luz | accent |
|---|---|---|---|---|
| Bosque de Vidro Negro | `#081410` | `#0F2019` | `#13291F` | `#3A9E8F` |
| Pântano das Lamentações | `#0C1207` | `#141C0B` | `#1A2410` | `#8FAE3A` |
| Cidadela Rachada | `#100B18` | `#1A1226` | `#221832` | `#9B59D0` |
| Deserto de Cinzas | `#16100A` | `#241A10` | `#2E2116` | `#E8833A` |
| Picos Uivantes | `#0A0E16` | `#101722` | `#161E2C` | `#3A7BD5` |
| Coração do Eclipse | `#130813` | `#1F0C1B` | `#2A1024` | `#D0455F` |
| Abismo de Velun | `#060509` | `#0B0912` | `#100C18` | `#F5E6C8` |

## 5. Sprite hero (96×96)
- Armadura `#464A60`, aço `#969EB2`, capa `#3A2C50`, pele `#D6B28C`.
- **Núcleo do eclipse** âmbar no peito + olhos âmbar — o Selo do Crepúsculo.
- Espada com gradiente de luz; 1px de outline escuro `#241E30`.

## 6. Inimigos
- 5 arquétipos por região (quadrúpede, voador, humanoide, golem, serpente) recoloridos pela paleta regional + aura de ruído 2px.
- Chefe = paleta clareada ×1.1 + coroa de 3 pontas `#F5E6C8` + olhos âmbar.
- Modificadores recebem tag textual `[escudo]` etc. no nome (UI) até existirem ícones próprios.

## 7. UI
- Cartões: `PanelContainer` com `StyleBoxFlat` radius 12–16, bg `#1D1730`.
- Botões grandes ≥76px de altura (mobile-first); radius 14; hover = clarear 20%.
- Ícones 96×96 pixel art gerados (moedas, skills, slots, atributos) — substituição 1:1 por arte final.
- Fonte: padrão Godot; títulos 40–52px; corpo 22–28px; toasts centralizados.

## 8. Áudio-visual
- Crit: dano âmbar maior + screenshake 0.3.
- Drop lendário/divino: toast dourado + sfx de sino ascendente + pulso no ícone.
- Level up: banner central 56px `#E8A33A`.

## 9. Placeholders gerados
`tools/gen_assets.py` gera TODOS os sprites/ícones atuais (originais, programáticos). Para arte final: manter nomes/paths e dimensionar 96×96 — zero mudança de código.
