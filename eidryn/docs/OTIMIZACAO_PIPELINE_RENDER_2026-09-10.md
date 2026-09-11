# Otimização do pipeline visual — 2026-09-10

## Escopo e resultado

O renderer HTML preserva o canvas lógico **540×960**, a API de gameplay e o formato de save (`SAVE_VERSION = 1`). A entrega atuou somente em apresentação, composição, cache, instrumentação, responsividade e empacotamento de assets.

| Prioridade | Categoria | Implementação | Métrica objetiva de sucesso | Estado |
|---|---|---|---|---|
| Crítica | Viewport | `object-fit:contain`, letterbox centralizado e banda lógica integral | 0 uso de `cover` no canvas; 540×960 sempre integral | Concluído |
| Crítica | Reflexos | Cena das entidades pré-composta em buffer e reutilizada nas 9 poças | 54→9 `drawImage` no canvas principal; 27→9 clips | Concluído |
| Crítica | Low-FX | Poças batched sem reflexos/clips; menos névoa, spotlight, vinheta e partículas | reflexos 54→0; clips 27→0 | Concluído |
| Alta | Chuva/clima | Paths agrupados por cor e plano | 132→4 strokes na tempestade máxima | Concluído |
| Alta | Partículas | Faíscas agrupadas por cor/espessura; atmosfera por cor | 100→2 strokes; 42→1 fill; 30→3 fills | Concluído |
| Alta | Overdraw | Wash de estação, clima anterior/atual e dia/noite composto em CPU | 4→1 fullscreen fill | Concluído |
| Alta | Alocações | Cache de `Image`, silhuetas brancas, gradientes e sprites procedurais | 2→0 gradientes/frame nas barras após warm-up | Concluído |
| Média | Fundo estático | Céu pré-escalado e chão/spotlight/vinheta pré-renderizados | chão: 1 gradiente→0 e 3→1 comandos no frame estável | Concluído |
| Média | HUD/safe areas | CSS vars do retângulo real do canvas, insets do SO e compactação estreita/baixa | overlays dentro do 9:16 em viewport 1920×600 no teste | Concluído |
| Média | Assets | Validador PNG stdlib, manifesto completo e aliases base64 no build | 269/269 válidos; 0 referência ausente; 13 grupos deduplicados | Concluído |
| Baixa | Observabilidade | Instrumentação Canvas opt-in via `?renderStats=1` | contadores por frame/média sem Proxy em produção | Concluído |

## Métricas de comandos Canvas

Os números abaixo são reproduzidos por `node scripts/eidryn_html/benchmark_render.js`. O lado “depois” é observado nas funções reais com um contexto Canvas instrumentado. O baseline representa exatamente os loops do renderer anterior. Isso **não é uma medição física de GPU ou FPS**.

| Cenário | Métrica | Antes | Depois | Redução medida |
|---|---:|---:|---:|---:|
| Tempestade, 132 gotas | `stroke` | 132 | 4 | **97,0%** |
| Combate, 100 faíscas | `stroke` | 100 | 2 | **98,0%** |
| Bioma, 42 motas | `fill` | 42 | 1 | **97,6%** |
| Estação, 30 partículas | `fill` | 30 | 3 | **90,0%** |
| High-FX, 9 poças | `drawImage` de reflexo no canvas principal | 54 | 9 | **83,3%** |
| High-FX, 9 poças | `clip` | 27 | 9 | **66,7%** |
| Low-FX, 9 poças | `drawImage` de reflexo | 54 | 0 | **100%** |
| Low-FX, 9 poças | `clip` | 27 | 0 | **100%** |
| Estação + 2 climas + noite | fullscreen fill | 4 | 1 | **75,0%** |
| 2 barras, após warm-up | `createGradient` | 2 | 0 | **100%** |
| Chão, após warm-up | `createGradient` | 1 | 0 | **100%** |
| Chão, canvas principal | comandos de composição | 3 | 1 | **66,7%** |

Manifesto legível por máquina: `eidryn/docs/RENDER_PIPELINE_METRICS.json`.

## Memória e estimativa de FPS

| Item | Valor | Natureza |
|---|---:|---|
| Buffers novos em estado estável, com todos os sprites de aura/orbe materializados | aprox. **3,71 MiB** | cálculo RGBA (`largura×altura×4`) |
| Pico adicional durante crossfade entre dois céus | aprox. **5,69 MiB** no total de caches novos | cálculo; o céu antigo é liberado após o fade |
| Duplicatas base64 no HTML standalone | **13 aliases**, 2.065 bytes removidos no build atual | medido no arquivo gerado |
| Ganho de FPS em cenas High-FX limitadas pela CPU/Canvas | **estimativa de 10–25%** | inferido da redução de comandos; sem browser/GPU físico disponível |
| Ganho de FPS em tempestade + poças no Low-FX | **estimativa de 25–50%** | inferido de 97% menos strokes e remoção total dos reflexos |

A memória de buffers é uma troca deliberada por menos gradientes, escalas e composições repetidas. O cache de `Image` e o `WeakMap` de silhuetas evitam decodificações/canvases duplicados em respawns; a economia depende do histórico de inimigos e não foi convertida em número fictício.

## Viewports e safe areas

| Caso | Estratégia | Resultado esperado/testado |
|---|---|---|
| Mobile portrait | escala proporcional por largura ou altura | canvas integral, sem corte |
| Landscape curto | `contain` + letterbox; compactação por `max-height:600px` | HUD/skillbar/nav permanecem visíveis |
| Desktop com painel | classe `#main.panel-open`, grid 58/42 | batalha e painel coexistem sem sobreposição |
| Desktop sem painel | flex em largura total | não sobra coluna vazia de 42% |
| Ultrawide 1920×600 | conteúdo 337,5×600 centralizado | pillarbox de 791,25 px por lado; banda lógica 0–960 integral |
| Notch/home indicator | `env(safe-area-inset-*)` no body/splash | controles fora das áreas inseguras |

`Rfx._syncViewport()` publica `--canvas-left`, `--canvas-top`, `--canvas-right`, `--canvas-width`, `--canvas-height`, `--canvas-boss-inset` e `--canvas-banner-top`; chips, nome, bossbar e banner seguem o conteúdo e não o letterbox.

## Inventário visual

| Verificação | Resultado |
|---|---:|
| PNGs encontrados / válidos | **269 / 269** |
| Arquivos vazios | **0** |
| Sprites totalmente transparentes | **0** |
| Dimensões inesperadas | **0** |
| Referências orientadas por dados verificadas / ausentes | **78 / 0** |
| Referências literais verificadas / ausentes | **3 / 0** |
| Grupos byte a byte duplicados | **13** (intencionais: fallback/frames/ícones) |
| Assets tocando as quatro bordas | **14**, todos fundos/texturas destinados a preencher a área |

Distribuição: 233× `96×96`, 7× `192×192`, 1× `240×240`, 7× cada camada de fundo `270×110`, `270×150`, `270×190` e `270×480`.

Não foi gerado sprite substituto: o inventário não encontrou ausência, transparência total, corrupção ou dimensão inválida. Gerar arte nova sem um defeito objetivo aumentaria peso e risco visual. As duplicatas foram preservadas como chaves semânticas, mas serializadas por aliases pelo build para evitar repetição base64.

Manifesto completo: `eidryn/docs/ASSET_INVENTORY_VISUAL.json`. Regeneração:

```bash
python3 scripts/audit_visual_assets.py --strict --output eidryn/docs/ASSET_INVENTORY_VISUAL.json
```

## Arquivos e funções alterados

| Arquivo | Funções/seletores principais |
|---|---|
| `scripts/eidryn_html/p05_render.js` | `init`, `_img`, `_makeCanvas`, `_buffer`, `_syncViewport`, `_setLowFx`, `enableMetrics`, `_composeWashes`, `_drawMoodWash`, `_drawPrecipBatch`, `_drawPuddles`, `_drawPuddlesLite`, `_buildReflectionScene`, `_drawAtmo`, `_drawSeasonAtmo`, `_drawParts`, `_drawGround`, `_drawSpotlight`, `_drawVignette`, `_drawHeroAura`, `_drawLootOrbs`, `_bar`, `render` |
| `scripts/eidryn_html/p00_head.html` | `body`, `#app`, `#cv`, overlays do canvas, media queries estreitas/baixas/desktop, `.low-fx` |
| `scripts/eidryn_html/p06_ui.js` | `show` (`panel-open`) |
| `scripts/eidryn_html/build.py` | `img_inject`, `main` |
| `scripts/eidryn_html/test_node.js` | grupo 19: pipeline/viewport/assets/save |
| `scripts/eidryn_html/benchmark_render.js` | benchmark determinístico de 12 métricas |
| `scripts/audit_visual_assets.py` | parser/decoder PNG, bbox/alpha/dimensões/referências/duplicatas |

## Critérios de regressão

- O canvas principal não pode voltar para `object-fit:cover`.
- Tempestade máxima não pode exceder 4 strokes de precipitação.
- Low-FX não pode executar `drawImage` ou `clip` de reflexo de poça.
- High-FX deve usar uma composição de reflexo por poça.
- O frame estável das barras não pode recriar gradientes.
- Todo PNG referenciado deve existir, ser estruturalmente válido, visível e ter dimensão esperada.
- `SAVE_VERSION` deve continuar em `1`.
