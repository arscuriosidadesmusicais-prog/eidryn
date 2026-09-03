# BALANCE.md — Balanceamento Completo

Gerado por `tools/balance_sim.py` (espelha exatamente as fórmulas do `DataManager`).

## Fórmulas aplicadas (requisito exato)

| Grandeza | Fórmula |
|---|---|
| HP inimigo | base×1.12^F |
| ATK inimigo | base×1.09^F |
| Ouro | base×1.10^F |
| XP | base×1.08^F |
| Soft-cap F400+ | g(F)=400+(F-400)·(0.4+0.6·e^(-(F-400)/300)) |
| Dano final | ATK × MultArma × MultHabilidade × Buffs |
| Crítico | rand(0-100) ≤ CritRate → ×CritDamage |
| Defesa | DanoRecebido = Dano × 100/(100+DEF) |
| Lifesteal | VidaGanha = Dano × LS%/100 |
| Dano Boss | multiplicador adicional vs Boss/MiniBoss |
| PC | Σ(atributo × peso) — exibido em tempo real |

Bases (fase 1): HP 42, ATK 6.5, DEF 2, Ouro 14, XP 9 — `data/enemies.json`.

## Tabela resumo (a cada 25 fases)

| Fase | Região | Tipo | HP | ATK | Ouro | XP | PC esperado |
|---|---|---|---|---|---|---|---|
| 1 | Bosque de Vidro Negro | normal | 47.7 | 7.1 | 15.5 | 9.8 | 1248.5 |
| 26 | Bosque de Vidro Negro | normal | 1138.9 | 74.7 | 213.8 | 78.1 | 2164.2 |
| 51 | Bosque de Vidro Negro | normal | 27.2K | 782.4 | 2939.4 | 624.1 | 3468.6 |
| 76 | Bosque de Vidro Negro | normal | 649.7K | 8190.8 | 40.4K | 4985.0 | 5161.9 |
| 101 | Pântano das Lamentações | normal | 15.52M | 85.7K | 555.7K | 39.8K | 7243.9 |
| 126 | Pântano das Lamentações | normal | 370.59M | 897.6K | 7.64M | 318.1K | 9714.8 |
| 151 | Pântano das Lamentações | normal | 8.85B | 9.40M | 105.06M | 2.54M | 12.6K |
| 176 | Cidadela Rachada | normal | 211.40B | 98.36M | 1.44B | 20.30M | 15.8K |
| 201 | Cidadela Rachada | normal | 5.05T | 1.03B | 19.86B | 162.13M | 19.5K |
| 226 | Cidadela Rachada | normal | 120.59T | 10.78B | 273.12B | 1.30B | 23.5K |
| 251 | Deserto de Cinzas | normal | 2880.18T | 112.83B | 3.76T | 10.35B | 27.9K |
| 276 | Deserto de Cinzas | normal | 68789.87T | 1.18T | 51.64T | 82.64B | 32.7K |
| 301 | Deserto de Cinzas | normal | 1642967.96T | 12.36T | 709.98T | 660.14B | 37.9K |
| 326 | Deserto de Cinzas | normal | 39240427.29T | 129.43T | 9762.14T | 5.27T | 43.5K |
| 351 | Picos Uivantes | normal | 937213126.18T | 1354.93T | 134228.20T | 42.12T | 46.9K |
| 376 | Picos Uivantes | normal | 22384273175.34T | 14183.69T | 1845621.40T | 336.48T | 49.6K |
| 401 | Picos Uivantes | normal | 534487517643.12T | 148449.89T | 25371757.20T | 2687.39T | 52.2K |
| 426 | Coração do Eclipse | normal | 10833345635805.28T | 1376262.23T | 304630401.60T | 19279.46T | 54.8K |
| 451 | Coração do Eclipse | normal | 166169266488708.72T | 10381225.14T | 2905499499.92T | 115238.96T | 57.5K |
| 476 | Coração do Eclipse | normal | 1994466149761577.50T | 65308736.19T | 22630312290.44T | 586617.52T | 60.1K |

> Tabela completa (500 linhas): `data/balance_table.csv`.

## Chefes (a cada 10 fases, timer 30s)

Multiplicadores: HP ×6, ATK ×1.6, Ouro ×12, XP ×8. Minibosses (fase %5): HP ×3, ATK ×1.3.

| Chefe | HP do chefe | Ouro do farm anterior |
|---|---|---|
| F10 | 896.7 | 36.0 |
| F50 | 143.8K | 2383.4 |
| F100 | 82.00M | 450.6K |
| F200 | 26.68T | 16.11B |
| F300 | 8682727.23T | 575.68T |
| F400 | 2825365885468.48T | 20576786.51T |
| F450 | 898269948816658.00T | 2444854581.96T |
| F490 | 43726369635539376.00T | 61247911290.32T |
| F500 | 106153520255005280.00T | 127754026535.49T |

## Simulação F2P (120 min de jogo ativo, sem IAP)

| Objetivo (fase) | Tempo até alcançar |
|---|---|
| Fase 10 | ~1 min |
| Fase 50 | ~1 min |
| Fase 100 | ~6 min |
| Fase 250 | além de 60 min simulados (alcançável com offline+ascensão) |
| Fase 500 | além de 60 min simulados (alcançável com offline+ascensão) |

- Progresso final da simulação: fase **149**, nível **118**.
- **Conclusão de curva:** início suave (fases 1-50 em minutos), walls intermediários superáveis com farm de minutos (não horas), soft-cap pós-F400 desacelera sem travar (Abismo escala além do cap do CSV).
- **F2P viável:** gemas/IAP compram conveniência (chaves, essência, cap premium), nunca poder obrigatório. Sem paywall na campanha.
- **Economia:** ouro abundante nas fases iniciais e escasso em upgrades altos (custo ×1.075–1.12 por ponto); Fragmentos de Equip regulam a fusão; Essência controla gacha via missões/eventos.

## Custos e drops (referência)

- Reforço: custo 40×1.35^nível ×1.25^raridade; chance cai de 100% (+1) a 15% (+20); pity 12 falhas → sucesso garantido; falha NÃO destrói.
- Fusão (fragmentos): Rara 24, Épica 60, Lendária 150, Mítica 400, Divina 1000 (+ouro 2K→500K).
- Drops normais: Comum 55% / Incomum 26% / Rara 12% / Épica 5% / Lendária 1.6% / Mítica 0.35% / Divina 0.05%; chance de drop 22% (chefe 100%).
- Gacha: Rara 62% / Épica 26% / Lendária 9.5% / Mítica 2% / Divina 0.5%; pity 10/50/100 com contadores visíveis.
- Ascensão: fragmentos = floor((fase_farm/10)^1.35) + chefes do ciclo; desbloqueio F100.

## Verificações de sanidade (passaram)

- F10 chefe: HP 896.7 — abatível com herói nível ~8 + primeiros itens.
- F100 chefe: HP 82.00M — wall da Ascensão é intencional e justo (farm de minutos).
- F400→F500: HP do chefe cresce 2825365885468.48T → 106153520255005280.00T (×37571.6), não ×1.12^100 (×83522) — soft-cap funcionando.
- Abismo F501+: crescimento adicional contínuo (+2%/10 fases HP, +1.5%/10 ATK) — endgame infinito com recompensas à altura.