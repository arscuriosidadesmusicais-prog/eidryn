# Auditoria 360° de Otimização e Qualidade — Eidryn

**Data da auditoria inicial:** 10/09/2026<br>
**Revisão pós-hotfix P0:** 10/09/2026, commit `00a5eda`<br>
**Branch/commit-base auditado:** `arena/01a08bec-eidryn` / `67ab960` → `00a5eda`<br>
**Escopo:** projeto Godot, porta HTML/JavaScript, pipeline de build, artefatos de distribuição, documentação e testes<br>
**Tipo de auditoria:** revisão estática + execução local disponível; sem profiling em hardware físico nesta rodada<br>
**Leitura dos status:** itens marcados **CORRIGIDO** mantêm sua prioridade como severidade de regressão; não significam defeito ainda aberto.

---

## 0. Contexto identificado no repositório

Os campos genéricos da solicitação foram inferidos diretamente do projeto:

| Campo | Identificação real |
|---|---|
| **Engine** | Há duas implementações: **Godot 4.4/GDScript, GL Compatibility** em `eidryn/` e a versão atualmente publicada, uma **engine própria HTML5 Canvas 2D + DOM/CSS + Web Audio/JavaScript** em `scripts/eidryn_html/`. |
| **Plataforma atual** | **Web desktop/mobile e execução offline por arquivo HTML**. Há presets Godot para Web, Android arm64, Windows e Linux, mas eles não foram revalidados nesta auditoria. |
| **Gênero/estilo** | **RPG idle/incremental 2D dark fantasy**, mobile-first, orientação retrato, com modo paisagem para Web. |
| **Render entregue** | Canvas lógico fixo de **540×960**, escalado por CSS com `object-fit: cover`; pixel art, parallax, clima, partículas, reflexos, neblina e UI DOM. |
| **Artefato principal** | HTML v1.8.0 pós-hotfix de **3.394.929 bytes (3,24 MiB)**; gzip nível 9 de **2.027.320 bytes (1,93 MiB)**. |
| **Carga embutida** | Dados: ~44 KB; PNGs em base64: ~417 KB; WAVs em base64: ~2,49 MB. O áudio representa aproximadamente **73% do HTML bruto**. |
| **Assets-fonte** | 269 PNGs, ~0,29 MiB comprimidos e ~16,1 MiB se todos forem decodificados em RGBA; 24 WAVs mono/22,05 kHz/16-bit, ~1,78 MiB em disco e ~3,56 MiB em buffers float32. |

### Escala de prioridade

- **Crítica:** risco de perda de progresso, habilidade/sistema quebrado, build não reproduzível ou artefato inválido.
- **Alta:** impacto forte em FPS, stutter, bateria, acessibilidade, compatibilidade ou risco elevado de regressão.
- **Média:** melhoria relevante, mas sem bloquear uma release corretiva.
- **Baixa:** polimento, manutenção preventiva ou item não aplicável diretamente ao perfil 2D atual.

---

## 0.1 Resumo executivo

### Pontos fortes já presentes

1. Canvas interno limitado a 540×960, evitando render nativo desnecessário em telas 4K.
2. Pools fixos para dano, partículas, chuva, anéis, splashes e orbes (`p05_render.js:49-70,199-216`).
3. Estatísticas do herói cacheadas; `E.Char.stats()` não recalcula tudo a cada frame (`p02_managers_a.js:128,215-216`).
4. Qualidade adaptativa já reduz parte da precipitação e de alguns VFX (`p05_render.js:1404-1416`).
5. Render via `requestAnimationFrame`, naturalmente sincronizado ao refresh do navegador e com baixo risco de tearing (`p07_main.js:106-120`).
6. Áudio mono a 22,05 kHz, adequado ao estilo e econômico em memória.
7. Build e testes principais agora resolvem caminhos pelo próprio script e funcionam a partir de outro CWD; os três HTMLs pós-hotfix têm o mesmo SHA-256.
8. A suíte lógica HTML foi ampliada com regressões para escudo, save e lifecycle e passou **214/214**. O pacote Godot passou **6/6** verificações de manifesto/conteúdo.

### Bloqueadores iniciais e estado pós-hotfix

| ID | Achado original / atual | Estado atual | Evidência pós-correção | Risco residual / próximo gate |
|---|---|---|---|---|
| **P0-01** | Escudo era consumido sem absorver HP. | **CORRIGIDO** em HTML e Godot; reflexão agora usa somente o dano absorvido. | `p04_combat.js:133-152,196-212`; `combat_manager.gd:189-209,264-280`; regressões total/parcial/reflect em Node e GDScript. | Rodar a suíte Godot e integração visual em engine/dispositivo. |
| **P0-02** | `localStorage.setItem` falhava silenciosamente e ainda confirmava o save. | **CORRIGIDO** no Web: escrita retorna bool, preserva dirty/backup, valida read-back e só então emite `save_flushed`. | `p04_combat.js:308-375`; teste de quota em `test_node.js`. | Falta aviso persistente ao jogador e teste Safari private/file:// em browser real. |
| **P0-03** | Resume chamava `mark_seen()` antes de calcular ausência. | **CORRIGIDO** nas duas runtimes via `prepare_resume()`. | `p03_managers_b.js:529-546`, `p07_main.js`; `offline_manager.gd:16-32`, `game_manager.gd`; teste de 120 s. | O reward pendente ainda não é persistido; fechar/recarregar antes de coletar pode perdê-lo. |
| **P0-04** | Pipeline principal dependia de `/home/z/my-project`. | **CORRIGIDO** em `build.py` e `test_node.js`; ambos executados com sucesso a partir de `/tmp`. | Paths derivados de `__file__`/`__dirname`; 214/214 e build determinístico. | Geradores, QA visual, simulador e publisher auxiliares ainda contêm paths absolutos; tratar como Alta. |
| **P0-05** | Godot acumulava `_layers` liberados e criava ~23,7 MiB de RGBA por região. | **CORRIGIDO EM CÓDIGO**: usa PNGs importados, duas cópias com textura compartilhada e mantém root + 3 layers. | `combat_screen.gd:270-363`; regressão percorre as sete regiões. | Validação runtime/VRAM continua bloqueada pela ausência do Godot. |
| **P0-06** | ZIP Godot não tinha `project.godot` nem 172 PNGs novos. | **CORRIGIDO**: pacote determinístico com 517 arquivos, 269 PNGs e conteúdo sincronizado byte a byte. | `scripts/package_godot.py`, `scripts/test_package_godot.py`: **6/6**. | Ainda falta smoke de abertura no editor Godot 4.4.1. |
| **P0-07 NOVO** | DOT de `sedenta` passa dano absoluto como `skill_mult`, recalculando `ATK × tick`, com crítico/lifesteal genéricos indevidos. | **ABERTO — confirmado nas duas runtimes**. | HTML `p04_combat.js:91-96,164-193,233-237`; Godot `combat_manager.gd:139-146,224-261,305-310`. | Dano escala aproximadamente com ATK² e invalida balanceamento. Criar caminho de dano direto para DOT e regressão por integral temporal. |
| **P0-08 NOVO** | Save Godot limpa `_dirty` e emite sucesso mesmo se `open_encrypted_with_pass` falhar. | **ABERTO — confirmado**. | `save_manager.gd:55-78`: linhas 76–78 ficam fora do `if f`. | Perda silenciosa possível nas builds nativas; aplicar transação/arquivo temporário/read-back. |
| **P1-01** | Não existe medição de performance por percentis em dispositivos reais. | **ABERTO**. | `qa18.js` mede só 90 frames; Playwright não está declarado/instalado. | Meta de 60 FPS continua não demonstrada. |
| **P1-02** | Godot e HTML duplicam regras manualmente e divergem em versão/visual. | **ABERTO**. | Godot v1.0.0 versus HTML v1.8.0; sem differential test. | Correções podem entrar em uma runtime e não na outra. |
| **P1-03** | ZIP itch tem `index.html` em subpasta e instruções citam v1.7.0. | **ABERTO**. | Manifesto do ZIP e `COMO_PUBLICAR.md`. | Risco de upload incorreto/não inicializável. |

**Conclusão executiva revisada:** P0-01 a P0-06 foram implementados e validados no limite das ferramentas disponíveis, mas a reauditoria encontrou dois defeitos críticos ainda abertos: DOT de `sedenta` calculado como multiplicador e falso sucesso do save nativo Godot. Além disso, recompensa offline não coletada não é persistida. A carga gráfica permanece moderada e a arquitetura Canvas tem boas bases; o maior ganho de download continua sendo compressão de áudio, e os maiores ganhos de frame time continuam em batching, cache de gradientes, redução de overdraw/reflexos e trabalho DOM. Nenhuma meta de FPS/VRAM deve ser tratada como resultado medido antes do profiling em hardware real.

---

# 1. Otimização de Renderização e Gráficos — foco principal

## 1.1 Draw calls, batching e composição

> Em Canvas 2D não há “draw calls” expostas como em Unity/Unreal. O equivalente auditável é a quantidade de comandos `drawImage`, paths, strokes, fills, trocas de estado e layers compostas por frame.

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Batch de chuva/neve/cinzas | Alta | Tempestade pode processar até 132 gotas; cada linha abre e fecha path individualmente nas camadas traseira e frontal (`p05_render.js:1088-1105,1116-1131`). Aumenta custo de CPU e raster. | Agrupar por camada/cor em um único `beginPath()`/`stroke()`; usar `fillRect` agrupado para neve/cinzas. Medir tempestade nas 7 regiões. | Reduzir em **≥70%** os strokes de precipitação; p95 do render **≤16,7 ms** no tier médio. |
| Cache de gradientes estáticos | Alta | Gradientes de chão, spotlight, barras e aura são recriados a cada frame (`p05_render.js:1465,1482,1560-1561,2009,2167`). Isso pressiona GC e CPU. | Pré-criar gradientes quando região, tamanho, cor ou qualidade mudar. Manter dinâmico somente o alpha/posição realmente variável. | **Zero criação de gradiente** no frame estável; alocações JS por frame próximas de zero. |
| Cache de composição estática | Alta | Céu, washes e partes do solo recebem múltiplos fills de tela cheia por frame. | Separar canvas estático e dinâmico, ou pré-compor céu+tint+solo por região/estação em `OffscreenCanvas`; invalidar apenas em região/estação/dia. | Reduzir comandos Canvas/frame em **≥30%**; GPU raster p95 **≤8 ms** no cenário-base. |
| Overdraw de layers e washes | Alta | Clima, estação, dia/noite, perigo, eclipse, vignette CSS, névoa e flash podem cobrir a tela repetidamente (`p05_render.js:1507-1557`; CSS `p00_head.html:242-243`). | Montar matriz de overdraw por cenário e fundir washes compatíveis em uma única cor/alpha; no modo leve eliminar reflexo, segunda névoa e washes redundantes. | Reduzir fullscreen passes no pior caso em **≥40%**; sem alteração visual perceptível em golden images. |
| Reflexos em poças | Alta | Cada poça recorta e redesenha herói, pets e inimigo, com passes aditivos (`p05_render.js:897-972`). É um multiplicador de draw commands. | Qualidade alta: manter; média: refletir apenas herói/inimigo em uma poça; baixa: sheen/ripples sem entidades. | Modo baixo com **≥25% menos frame time** em chuva e nenhuma queda abaixo de 30 FPS no tier de entrada. |
| Sprite atlas | Média | 269 data URIs e muitos objetos `Image`; não é crítico pelo tamanho, mas aumenta parse, objetos e trocas de fonte. | Gerar atlas para herói, pets, inimigos e ícones, com manifesto de retângulos; desenhar por source rect. Preservar nearest-neighbor e padding contra bleeding. | Reduzir objetos `Image` carregados em **≥70%** e manter pixel-perfect em escala inteira/fracionária. |
| DOM + Canvas híbrido | Média | Canvas, filtros CSS, `backdrop-filter`, animações e UI DOM competem pela mesma main thread/compositor. | Registrar layers no Chrome Performance/Layers; remover `backdrop-filter` no modo baixo e limitar animações CSS fora da tela. | Sem long task >50 ms durante 10 min; Layout+Style **<2 ms p95/frame de UI**. |
| Instanciamento estático/dinâmico | Baixa | Instancing 3D não se aplica; há apenas uma unidade ativa de herói/inimigo e pools 2D. | Manter pools; tratar cada pool como instancing lógico. Não migrar para WebGL apenas por instancing sem evidência de gargalo. | Nenhuma nova alocação por partícula; pool nunca expande em runtime. |
| Contador de comandos de render | Média | Não há telemetria de quantos draws/paths ocorrem por cenário. | Instrumentar wrapper de contexto em build QA para contar `drawImage`, `fill`, `stroke`, gradientes e pixels preenchidos. | Dashboard por cenário com orçamento: **≤250 comandos/frame médio** e regressão bloqueada em >10%. |

## 1.2 Geometria, LOD e culling

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| LOD de VFX 2D | Alta | O `lowFx` reduz parte das partículas, mas não todos os efeitos caros. | Criar tiers explícitos Alto/Médio/Baixo/Eco para chuva, névoa, poças, estrelas, reflexos, auras e FPS. Usar histerese e cooldown para evitar alternância. | Mudança de tier no máximo 1 vez/10 s; tier baixo reduz frame time **≥30%**. |
| Culling por visibilidade | Alta | Render continua sendo solicitado no splash; timers de UI continuam ativos; em aba oculta depende apenas do throttling do browser. | Pausar render, intervalos e áudio em `document.hidden`; no splash renderizar apenas splash CSS. Retomar com relógio monotônico e cálculo offline correto. | CPU da aba oculta **<1%**; zero avanço visual/intervalos desnecessários. |
| Frustum/distance/occlusion culling | Baixa | Não há mundo 3D, câmera livre ou entidades fora de tela. | Marcar formalmente como **não aplicável**. Aplicar apenas culling de partículas fora de `[0,W]×[0,H]` e painéis DOM ocultos. | 100% das partículas fora de tela recicladas no mesmo frame. |
| “Geometria” de paths | Média | Raios, auras, círculos e linhas são reconstruídos repetidamente. | Pré-calcular `Path2D` para glifos, coroa, arcos e shapes invariantes; transformar o contexto em runtime. | Reduzir construção de paths invariantes em **≥80%**. |
| **CORRIGIDO** — Godot: silhuetas procedurais | Crítica | O hotfix removeu três imagens 1080×1920 geradas em runtime e passou a reutilizar PNGs importados; elimina o risco estrutural, mas falta profiling. | Executar a regressão das sete regiões no Godot, 100 trocas e monitorar CPU/VRAM/object count. | Troca de região **<50 ms**, pico adicional de VRAM **<8 MiB**, zero referência liberada. |
| Godot: LOD mobile | Média | Não existem perfis Godot por tier de hardware. | Configurar quality preset e reduzir animações/processamento em Android low-end; usar assets importados e não imagens runtime. | 60 FPS tier médio; 30 FPS estáveis tier baixo; sem pico térmico após 30 min. |

## 1.3 Shaders, iluminação, sombras, reflexos e pós-processamento

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Complexidade de shaders | Baixa | A versão publicada usa Canvas 2D, sem shader WebGL customizado. | Não introduzir shader/GPU pipeline sem profiling. Se Canvas 2D exceder orçamento, prototipar WebGL/Pixi em branch de benchmark, não como reescrita imediata. | Migração só aprovada se entregar **≥40%** de ganho no pior caso sem regressão visual. |
| Iluminação dinâmica vs baked | Média | “Luz” é simulada por gradientes, passes aditivos e sprites; vários são recriados por frame. | Pré-renderizar auras/halos estáticos em sprites pequenos ou canvases cacheados; manter apenas intensidade/animação dinâmica. | Gradientes dinâmicos reduzidos em **≥60%**. |
| Sombras de entidades | Baixa | Elipses simples têm custo baixo e boa leitura (`p05_render.js:1707-1714`). | Manter; reduzir/ocultar apenas no modo Eco se profiling justificar. | Custo combinado das sombras **<0,2 ms/frame**. |
| Reflexos | Alta | Reflexos são o efeito individual com maior multiplicação de draws. | Aplicar tier de reflexo e render target reduzido; testar tempestade + boss + pets. | Reflexos **<2 ms p95** no tier médio. |
| Pós-processamento full-screen | Alta | Washes, eclipse, perigo e flash acumulam overdraw. | Compor em um passe lógico, restringir pelo `lowFx` e respeitar reduced motion/flash. | No máximo **2 fullscreen fills adicionais** no modo baixo. |
| Vignette CSS | Média | `#cv-wrap::after` adiciona layer composto em toda a batalha. | Comparar custo com vignette baked no último passe Canvas; escolher a opção com menor Composite/Raster. | Composite **<2 ms p95** e nenhuma layer promovida desnecessariamente. |
| Godot GL Compatibility | Baixa | É uma escolha adequada a 2D e Web/mobile. | Manter até haver medição que justifique Mobile renderer; validar em GPUs integradas e WebGL. | Zero shader compilation hitch >50 ms durante gameplay. |

## 1.4 Texturas, memória gráfica e streaming

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Orçamento de VRAM/decoded images | Alta | Os PNGs representam ~16,1 MiB RGBA se todos decodificados; cópias tintadas, flashes brancos e canvases elevam o total. | Medir `performance.measureUserAgentSpecificMemory` onde suportado e heap snapshots; contabilizar canvases offscreen e cache sazonal. | Imagens+canvas **<32 MiB** e memória total **<128 MiB** após 30 min no mobile. |
| Tint sazonal síncrono | Alta | `_tintImg()` usa `getImageData`/loop de pixels na main thread quando uma layer é usada (`p05_render.js:635-658,1627-1631`). | Pré-gerar variantes no build ou mover para worker/OffscreenCanvas com fallback; aquecer durante splash sem bloquear input. | Nenhuma long task >50 ms na primeira entrada/troca de região. |
| Flash branco de sprites | Média | Cópias brancas são criadas por canvas; herói fica cacheado, inimigo é recriado a cada spawn (`p05_render.js:328-337,371-377,1750-1753`). | Cache por chave de sprite de inimigo com LRU limitado, ou usar composição aditiva sem cópia quando mais barato. | Máximo **1 criação por sprite/sessão** e cache **<4 MiB**. |
| PNG/WebP lossless | Média | PNGs já são muito pequenos (~0,29 MiB), então o ganho absoluto é limitado. | Benchmark WebP lossless/AVIF somente para backgrounds; manter PNG para pixel art se qualidade/tamanho forem melhores. | Troca só se reduzir payload visual **≥15%** sem blur/artefato. |
| Mipmapping | Baixa | Pixel art usa nearest e escala; mipmaps podem borrar. | Manter desativado para sprites pixel art. Para backgrounds suavizados, testar mip/asset reduzido separado apenas no Godot. | Zero shimmer e zero perda de nitidez em 0,75×–3×. |
| Compressão VRAM Godot | Média | `project.godot` habilita ETC2/ASTC, mas 172 PNGs não têm metadata `.import` versionada e os presets não foram revalidados. | Reimportar em Godot 4.4.1 limpo, definir presets por Android/Desktop e verificar tamanho/qualidade. | 100% dos assets importam sem warning; VRAM Android reduzida **≥25%** frente a RGBA. |
| Carregamento de todos os assets | Alta | O single-file injeta todos os sprites e áudios; não há streaming progressivo. | Manter um build “single-file offline”, mas oferecer build hospedado com assets separados, cache imutável e preload só do primeiro bioma. | First playable **≤3 s** em mobile médio/4G; update não baixa assets imutáveis novamente. |
| Cache do navegador | Média | Qualquer alteração no HTML invalida o pacote completo, inclusive 2,49 MB de áudio. | Build hospedado com hashes de conteúdo, `Cache-Control: immutable` e Service Worker/PWA; manter HTML single-file como download alternativo. | Retorno quente **<1 s** e bytes transferidos em update pequeno **<300 KB**. |
| Atlas e bleeding | Média | Atlas pode melhorar objetos/cache, mas pixel art sofre bleeding. | Adicionar 2–4 px de extrusão, coordenadas inteiras e testes em DPR 1/2/3. | Zero bleeding em screenshots automatizados. |

## 1.5 FPS, frame pacing, tearing e escala de resolução

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Baseline real de FPS | Crítica | “60 FPS” é hoje uma meta analítica, não uma evidência em hardware. | Medir 10 min por cenário: limpo, tempestade, Pântano, boss, gacha e painel de pets; coletar mediana, 1% low, p95/p99 e long tasks. | Tier médio: mediana **≥60 FPS**, 1% low **≥50**; p99 **≤33,3 ms**. |
| Dynamic resolution | Alta | Canvas fixo 540×960 já limita custo, mas não escala para aparelhos fracos. | Adicionar tiers internos 540×960, 432×768 e 360×640; alterar somente após janela de 5–10 s e preservar coordenadas lógicas. | Tier baixo recupera **≥25%** de frame time; texto DOM permanece nítido. |
| DLSS/FSR | Baixa | Não aplicável ao Canvas 2D/pixel art. | Não integrar. A alternativa correta é dynamic canvas resolution + nearest scaling. | Item documentado como N/A; sem dependência desnecessária. |
| VSync/tearing | Baixa | `requestAnimationFrame` já acompanha o compositor. | Manter rAF; testar 60/90/120/144 Hz e não assumir 60 no cálculo de simulação. | Zero tearing visível; animações independentes do refresh rate. |
| Frame cap/Eco | Alta | Idle game rodando sempre a 60/120 Hz consome bateria e aquece. | Opções 30/60/Auto; em 120 Hz desenhar a 60 ou 30, mantendo simulação fixa. Em bateria baixa/thermal, ativar Eco com consentimento. | 30 FPS Eco reduz CPU/energia **≥30%** sem alterar DPS/recompensas. |
| Histerese do auto-quality | Média | Limiar atual liga em >27 ms e desliga em <19 ms, sem cooldown explícito (`p05_render.js:1404-1416`). | Usar p95 em janela de 5 s, 2 janelas ruins para cair e 4 boas para subir; mostrar tier atual apenas em diagnóstico. | Zero oscilação >1 vez/30 s. |
| Delta clamp e stutter | Alta | O loop descarta tempo acima de 50 ms (`p07_main.js:108-110`), fazendo DPS/progresso depender da performance. | Separar render de simulação: acumulador fixed-step de 50 ms ou scheduler por timestamps, com máximo de catch-up e reconciliação. | Mesmo resultado de combate em 30/60/120 Hz e com stalls; desvio **<0,1%** em 30 min. |
| Primeira frame e parse | Alta | HTML único precisa parsear strings base64 e inicializar sistemas antes de interação. | Medir Navigation Timing/Long Tasks; adiar criação/decode de sprites não iniciais e painéis; preload mínimo antes de habilitar “Jogar”. | TTI/first playable **≤3 s** em mobile médio e **≤5 s** em Fast 3G simulado. |
| Teste de jank | Alta | O QA atual só calcula média de 90 rAF, ocultando piores frames. | Injetar stalls de 50/100/500 ms, abrir modais e alternar região durante tempestade; medir p95/p99 e correção da simulação. | Nenhuma perda de save/DPS; recuperação em **≤2 frames** após stall. |

---

# 2. Performance de Código, Memória, Física e Carregamento

## 2.1 Código e memória

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| **CORRIGIDO** — absorção do escudo | Crítica | HTML passou a validar absorção total/parcial e reflexão; implementação equivalente foi aplicada no Godot. A prioridade permanece Crítica como severidade de regressão. | Manter testes total/parcial/reflect; executar a suíte Godot e validar feedback visual azul/vermelho. | Com escudo ≥ dano: **HP não muda**; shield cai pelo dano; testes Web 100% verdes e Godot verde antes da release. |
| **CORRIGIDO PARCIALMENTE** — save Web com quota/erro | Crítica | Persistência Web agora mantém dirty, preserva save anterior, verifica read-back e não emite sucesso; ainda falta feedback persistente e browser matrix. | Adicionar banner “não salvo” e export; testar QuotaExceeded/SecurityError/private/file:// em browsers reais. Avaliar IndexedDB. | Em falha, `_dirty=true`, zero `save_flushed`, alerta visível; **0 perda** após reload. |
| **CORRIGIDO** — ordem do resume/offline | Crítica | `prepare_resume()` agora executa `check_time_travel` → `compute_pending` → `mark_seen` nas duas runtimes. | Manter teste de 120 s e adicionar browser/mobile para 30/59/60/3.600 s, relógio regressivo e múltiplos resumes. | Background de 120 s produz **120±2 s** pendentes; relógio regressivo produz zero e log. |
| DOT de `sedenta` tratado como multiplicador | Crítica | `tick` já é dano absoluto, mas entra em `_apply_damage_to_enemy` como multiplicador; o resultado escala com ATK², pode critar e aplica lifesteal genérico além da cura própria. | Usar o caminho de dano direto com regra explícita para defesa/escudo e sem crítico; testar integral de 6 s em 20/30/60/120 Hz nas duas runtimes. | Dano total = valor documentado **±0,1%**, independente de FPS, sem dupla cura. |
| Save nativo Godot sob falha de arquivo | Crítica | `SaveManager.flush()` limpa dirty e emite `save_flushed` mesmo se o arquivo criptografado não abrir. | Escrever em arquivo temporário, fechar, reler/checksum, rotacionar backup atomicamente e só então confirmar. Simular permissão/espaço insuficiente. | Em qualquer falha, dirty permanece; **zero `save_flushed`** e save anterior continua carregável. |
| Reward offline pendente não persistido | Crítica | Após `prepare_resume`, `last_seen` avança, mas `pending` não faz parte do save; autosave/reload antes da coleta pode apagar a recompensa calculada. | Persistir `pending` com ID/timestamp idempotente ou pausar autosave/combate até coletar; criar teste resume → autosave → reload → collect. | Recompensa pendente sobrevive a 100% dos reloads e só pode ser coletada uma vez. |
| Duração do escudo divergente | Alta | A descrição promete 6 s, mas não existe timer de expiração; o escudo dura até ser consumido ou o combate reiniciar. | Implementar `_shield_time` em tick/fixed-step ou alterar texto/design; mostrar duração na UI e salvar apenas se a regra exigir. | Escudo expira em **6,0±0,1 s** em 30/60/120 Hz. |
| Fixed-step de gameplay | Alta | Stalls descartam tempo; aparelhos fracos progridem menos. | Simulação a 20 Hz com acumulador monotônico; render interpolado; máximo de steps e compensação por evento/tempo para idle. | Resultado determinístico entre refresh rates, desvio **<0,1%**. |
| Array de skills por frame | Alta | `ready_skills()` cria array em todo frame de combate; EventBus também cria array de argumentos por emissão (`p01_core.js:121-122`). | Iterar skills diretamente ou manter lista de auto-cast; evitar `slice` em eventos quentes; profile de allocation. | **Zero array temporário** no loop estável. |
| Boss timer/HP events por frame | Alta | Timer e inimigo curandeiro disparam eventos/DOM a até 60 Hz (`p04_combat.js:112-120`; `p06_ui.js:74-80`). | Atualizar apresentação a 10 Hz ou apenas quando o décimo muda; gameplay continua fixed-step. | No máximo **10 updates DOM/s** para timer/HP contínuo. |
| Loops UI por polling | Média | Existem intervalos de 200 ms e 120 ms (`p06_ui.js:135-144,316-347`) além de rAF. | Consolidar em scheduler de UI, pausar quando oculto e atualizar por evento; cooldown visual pode usar rAF apenas quando há cooldown ativo. | Zero intervalos ativos na aba oculta; redução de CPU idle **≥20%**. |
| Rebuild de painéis | Alta | Painel aberto pode ser reconstruído por `innerHTML` após `_panelDirty`, causando layout, GC e perda de foco. | Diff/update por componente; virtualizar inventário; preservar scroll/foco. | Atualização de painel **<4 ms p95**, scroll/foco preservados. |
| Crescimento de histórico diário/semanal | Média | Dicionários de missões, dungeons e tentativas acumulam chaves por data indefinidamente. | Retenção limitada (ex.: 14 dias e 8 semanas) no load/save; migrar save. | Save permanece **<200 KB** após simulação de 3 anos; crescimento mensal <2 KB. |
| Pools existentes | Baixa | É uma boa prática já aplicada; evita churn de partículas. | Adicionar contadores de saturação e overwrite para saber se 28 floats/150 particles bastam. | Saturação <1% dos eventos e nenhuma expansão dinâmica. |
| Cache de áudio concorrente | Média | Chamadas simultâneas antes do primeiro decode podem decodificar o mesmo asset mais de uma vez. | Cachear a `Promise` de decode, não só o buffer final; limpar em falha. | Exatamente **1 decode por asset/sessão**. |
| SFX “pool” não reutilizado | Média | O slot cria um GainNode inicial, mas `play_sfx` cria outro GainNode a cada som e não usa `slot.gain` (`p04_combat.js:459-462,514-529`). | Conectar novos BufferSources ao gain persistente do slot; usar `onended`; aplicar limite/prioridade de voz. | GainNodes estáveis em **10**; sem crescimento do AudioGraph após 1 h. |
| Godot UI por frame | Média | `main_ui.gd:343-345` reatribui texto de ouro todo frame, mesmo sem mudança. | Atualizar somente por `currency_changed` e comparar valor formatado. | Zero alteração de propriedade no frame estável. |
| Godot tweens de dano | Média | Há pool de labels, mas um tween novo é criado a cada hit. | Interromper tween anterior do slot; comparar AnimationPlayer/manual update se ataques intensos saturarem. | Sem tween órfão e frame p99 dentro do orçamento com ataque mínimo 0,25 s. |
| Memory leaks de event listeners | Média | BUS mantém closures por toda sessão e não oferece escopo/owner; hoje os módulos são singletons, mas futuros painéis podem vazar. | Retornar função de unsubscribe; teste abrir/fechar painel 10.000 vezes; monitorar tamanho do mapa de listeners. | Listener count constante após ciclos; heap cresce **<5%** em 2 h. |

## 2.2 Física e colisões

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Rigid bodies/collision matrix | Baixa | Não há `RigidBody`, `CharacterBody`, `Area`, CollisionShape ou física espacial no projeto atual. | Marcar formalmente como **não aplicável** e não adicionar engine física a um combate numérico. | Zero custo de physics server e documentação atualizada. |
| Raycasts | Baixa | Não existem raycasts. | Manter N/A; VFX usa coordenadas determinísticas. | Zero raycast/frame. |
| Fixed timestep | Alta | Embora não haja física, a simulação de combate precisa de passo fixo para independência de FPS. | Implementar tick determinístico descrito em 2.1 e testes com sequências de delta. | Mesmos HP, cooldowns, loot e resultado para deltas equivalentes. |
| Out-of-bounds/fora do mapa | Baixa | Não há movimentação livre; o edge case clássico não se aplica. | Testar, em vez disso, coordenadas Canvas, cropping ultrawide e partículas recicladas fora da tela. | Nenhum elemento interativo inacessível em 320×568 a 3440×1440. |

## 2.3 CPU, assíncrono e multithreading

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Main thread única | Alta | Render, simulação, DOM, decode orchestration e tint de imagens compartilham a thread principal. | Mover tint/preprocessamento e, se suportado, render para OffscreenCanvas Worker; manter fallback Safari. Começar pelo tint por ser isolado. | Long Tasks totais **<1 s em 10 min** e nenhuma >100 ms. |
| Render sempre ativo | Alta | rAF inicia no DOMContentLoaded, inclusive na tela de título (`p07_main.js:125-159`). | Só iniciar render do mundo após “Jogar”; splash usa CSS. Parar ao ocultar e ao abrir painéis se cena não estiver visível em portrait. | CPU no splash/aba oculta reduzida **≥50%**. |
| Música contextual por frame | Média | `_update_context_music()` é chamado todo frame; o early return reduz custo, mas a checagem é desnecessária. | Trocar música em eventos de spawn/modo/estado. | Zero chamada por frame; apenas em transições. |
| Funções lineares repetidas | Média | `skill_def`, rarity/region lookups e alguns catálogos percorrem arrays repetidamente. | Indexar dados por `id` no `DataManager` durante load; manter arrays para ordenação de UI. | Lookups O(1); reduzir CPU de UI/simulação sem mudar dados. |
| Retention por kill | Média | Cada tracking percorre missões e conquistas; volume atual é baixo, mas cresce com conteúdo. | Índice `trackKey -> listeners/missões/conquistas`; atualização incremental. | Tempo de track **<0,2 ms p95** com 1.000 conquistas sintéticas. |
| Concorrência de comandos | Alta | JavaScript é single-thread, mas double-tap, múltiplas abas e callbacks assíncronos podem duplicar ações ou sobrescrever save. | Desabilitar botão durante transação, usar idempotency token para grants, Web Locks/BroadcastChannel para um writer de save e teste multi-tab. | Zero double-spend/double-grant em 1.000 tentativas concorrentes. |

## 2.4 Carregamento, streaming e tamanho de build

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| **CORRIGIDO NO CORE** — caminhos absolutos | Crítica | `build.py` e `test_node.js` funcionam fora do root; ferramentas auxiliares ainda possuem `/home/z/my-project`. | Aplicar o mesmo padrão a simulador, geradores, QA16–18 e publisher; aceitar `--root/--out`. | Zero path de usuário em scripts; clone limpo executa tudo com **exit 0** em Linux/macOS/Windows CI. |
| Compressão de música | Alta | WAV base64 domina 73% do HTML. | Converter músicas para Opus/Ogg a 48–64 kbps; SFX curtos podem ficar WAV ou Opus conforme benchmark. Injetar bytes genéricos, não assumir `WAV`. | HTML bruto **≤1,5 MiB** ou redução de áudio **≥70%**, sem gap audível. |
| Lazy decode de áudio | Média | Decode já é sob demanda, o que é positivo, mas a string base64 inteira é parseada no boot. | No build hospedado, carregar faixas por contexto; no single-file, manter strings mas decodificar só a necessária e cachear promise. | First input não bloqueado por decode; troca de faixa sem hitch >20 ms. |
| PWA/Service Worker | Alta | “Offline” é garantido pelo arquivo local, não por instalação/cache controlado no site. | Gerar manifest, SW versionado e estratégia cache-first para build hospedado; testar atualização e rollback. | Lighthouse PWA instalável; segundo boot offline **100% funcional**. |
| Export Godot all_resources | Média | Pode incluir recursos não usados; dynamic loads exigem cuidado. | Criar manifesto explícito de assets usados por Godot e exportar só necessários; comparar PCK. | Build Godot reduzido **≥20%** sem recurso ausente. |
| **CORRIGIDO** — ZIP-fonte Godot | Crítica | O pacote agora contém 517 arquivos, `project.godot` e todos os 269 PNGs, com geração determinística e comparação byte a byte. | Manter `package_godot.py`/`test_package_godot.py` no gate e adicionar smoke headless no Godot 4.4.1. | **6/6** manifesto/conteúdo; ZIP abre no editor e suíte Godot passa. |
| ZIP itch com pasta raiz | Alta | `index.html` não está na raiz do ZIP. | Empacotar `index.html` na raiz e criar smoke test que falha se não houver exatamente um entrypoint. | O manifesto contém exatamente um `index.html` na raiz; jogo abre no itch sandbox. |
| Versionamento de artefatos | Alta | Nome principal contém v1.0.0, conteúdo é v1.8.0; docs itch citam v1.7.0. | Fonte única de versão; nomear outputs automaticamente; falhar build se versões divergem. | 100% dos nomes, splash, metadata e docs usam **1.8.0** (ou próxima versão). |
| Higiene do repositório | Média | Repo tem ~38 MiB, com muitos screenshots QA, tool-results, HTMLs e ZIPs gerados versionados. | Mover artefatos para GitHub Releases/CI artifacts; manter baselines necessários em pasta clara; ampliar `.gitignore`. | Clone reduzido **≥40%** e nenhum cache/output acidental no Git. |

---

# 3. Game Design, UX/UI e Acessibilidade

## 3.1 Interface e UX

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Legibilidade de fonte | Alta | Há textos de 9–13 px e bottom nav de 10 px (`p00_head.html`, vários estilos inline), pequenos em mobile. | Definir escala tipográfica por tokens e opção 100/125/150%; testar 320×568 e baixa visão. | Texto essencial **≥14 CSS px** por padrão; 200% zoom sem perda de conteúdo/ação. |
| Zoom bloqueado | Alta | Viewport usa `maximum-scale=1,user-scalable=no` (`p00_head.html:5`). | Remover bloqueio de zoom e corrigir layout para zoom/reflow. | Passar WCAG 1.4.4; zoom 200% funcional. |
| Safe areas | Alta | `viewport-fit=cover` é declarado, mas não há `env(safe-area-inset-*)`. | Aplicar padding no HUD/nav/modais e testar notch/home indicator. | Nenhum controle encoberto em iPhone/Android com recorte. |
| Targets de toque | Alta | Ícones do HUD usam padding pequeno e controles compactos. | Garantir hitbox mínima 44×44 CSS px, separação ≥8 px e feedback pressed/disabled. | 100% dos controles primários **≥44×44 px**. |
| Ícones sem nome acessível | Alta | Botões `📜`, `⚙`, `»`, `A` não têm `aria-label` consistente (`p00_head.html:499-501`; `p06_ui.js:297-300`). | Adicionar labels localizados, `aria-pressed` e tooltips sem depender de hover. | Axe: zero botão sem accessible name. |
| Modal sem semântica/foco | Alta | Modal não declara `role=dialog`, `aria-modal`, focus trap, Escape ou restauração de foco. | Implementar Dialog Controller acessível; foco inicial, Tab trap, Escape, retorno ao acionador. | 100% dos modais navegáveis apenas por teclado/screen reader. |
| Canvas sem alternativa | Alta | Canvas não tem label/fallback; HP e estado visual não são anunciados. | `aria-label` no canvas, região live opcional para eventos essenciais e DOM semântico para barras (`role=progressbar`). | Fluxo principal compreensível com NVDA/VoiceOver sem depender de pixels. |
| Rebuild perde estado | Média | Recriar painel pode mudar scroll/foco e causar flicker. | Atualização incremental; manter `scrollTop`, foco e seleção de filtros. | Zero salto de scroll em 100 atualizações. |
| **CORRIGIDO PARCIALMENTE** — feedback de save | Crítica | A confirmação verde depende de `save_flushed`, que não é mais emitido em falha; contudo não existe aviso persistente de “não salvo”. | Exibir status de erro usando `_last_error`, com retry/export e sem toast descartável. | Nunca mostrar “salvo” em falha; erro fica visível até persistência confirmada. |
| Responsividade ultrawide | Alta | Em ≥900 px usa split 58/42; canvas usa cover e cropping vertical. Há cálculo de banda, mas não teste 21:9. | Testar 320×568, 390×844, 768×1024, 1280×720, 1920×1080, 3440×1440, foldables e orientação dinâmica. | Zero clipping de CTA; CLS **<0,1**; screenshots aprovadas. |
| i18n parcial/hardcodes | Média | Há muitos textos PT-BR hardcoded em managers/UI; `tr('essencia')` não existe e cai para a chave. | Extrair todo texto de UI/toast; teste de chave ausente e pseudo-localização expansiva. | Zero chave faltante; 100% dos textos de usuário em catálogo. |
| Estado disabled/loading | Média | Vários botões executam ação sem estado transitório ou mensagem detalhada. | Padronizar disabled, cooldown, custo insuficiente e feedback sonoro/visual; impedir double-tap. | Resposta visual ao toque **<100 ms**; zero ação duplicada. |

## 3.2 Game loop, pacing e onboarding

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Onboarding por toasts temporizados | Alta | Três dicas em 4/16/28 s não confirmam compreensão e podem conflitar com popups (`p07_main.js:53-63`). | Tutorial contextual por ação: observar combate → upgrade → equipamento → chefe → offline; permitir pular/rever. | ≥80% concluem 3 passos sem ajuda; abandono nos primeiros 5 min reduzido. |
| **CORRIGIDO EM LÓGICA** — clareza de `guarda_sombras` | Crítica | A absorção e a reflexão estão corretas em código, mas valor restante e duração não aparecem claramente; a duração de 6 s descrita ainda não é implementada. | Adicionar timer de 6 s ou corrigir a descrição, mostrar shield restante e validar integração visual. | Regra e duração 100% cobertas; jogador identifica proteção em teste de percepção. |
| Velocidade de progressão | Alta | Simulação atual chega aproximadamente à fase 149/nível 118 em 120 min; docs citam F100 em ~6 min. | Playtest humano com novatos e veteranos; medir tempo até primeiro upgrade, skill, boss, wall e ascensão. | Metas explícitas validadas em ≥20 sessões; sem wall inesperado >10 min no early game. |
| Sobrecarga de sistemas | Alta | O jogo expõe oito abas, missões, gacha, passe, eventos e modos. | Progressive disclosure por nível/fase; “próximo objetivo” único e badges priorizados. | Novato encontra próxima ação em **<5 s** em 90% dos testes. |
| Feedback de falha de boss | Média | Há fallback automático, mas precisa explicar por que perdeu e qual upgrade ajuda. | Tela curta com causa (DPS, sobrevivência, timer) e recomendações baseadas em stats. | ≥80% dos jogadores escolhem melhoria relevante após falha. |
| Balanceamento por FPS | Crítica | Delta clamp pode reduzir progresso em hardware lento. | Fixed-step e teste diferencial por refresh/stall. | DPS/recompensa idênticos com desvio **<0,1%**. |
| Monetização stub/fallback | Alta | Ad fallback concede dobro sem anúncio; aceitável em dev, mas altera economia de produção. | Perfis `development`, `offline-free` e `production`; comunicar claramente e impedir stub acidental em release monetizada. | Build production falha se provider real ausente ou fallback dev ativo. |
| Telemetria de funil | Média | Não há evidência de funil real de onboarding/pacing. | Eventos locais/opt-in: start, primeiro upgrade, primeira morte, boss, ascensão, abandono. | Dashboard com D1/D7, tempo por marco e taxa de conclusão; consentimento e anonimização. |

## 3.3 Acessibilidade

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Teclado e remapeamento | Alta | Não há mapa de input, shortcuts, gamepad ou remapeamento. | Implementar navegação por teclado, Enter/Espaço, Escape, atalhos opcionais e tela de remapeamento; evitar conflito com browser. | 100% do jogo operável sem mouse; zero keyboard trap. |
| Foco visível | Alta | CSS não define `:focus-visible`; reset visual pode deixar foco pouco claro. | Ring de foco de alto contraste em todos os interativos. | Contraste do indicador ≥3:1 e foco sempre visível. |
| Daltonismo/raridade | Alta | Raridades dependem fortemente de cor/glow. | Adicionar ícone, moldura/padrão e texto abreviado por raridade; presets protan/deutan/tritan apenas como complemento. | Identificação de raridade ≥95% sem cor em teste grayscale. |
| Tamanho de fonte | Alta | Não há ajuste de fonte. | Escala 100/125/150/200 com reflow; salvar preferência separada. | Sem clipping a 200% em todos os painéis. |
| Reduced motion/flash | Alta | Toggle atual reduz parte de flashes/tremores, mas não desativa animações CSS, parallax, gacha e todos os fullscreen flashes. | Respeitar `prefers-reduced-motion`; modo “reduzido” e “sem flashes”; parar shake, shooting stars, pulses e sweeps CSS. | Nenhum flash >3 Hz; auditoria fotossensível aprovada; animações não essenciais removidas. |
| Controle de áudio | Média | Já há música/SFX/ambiente, um ponto positivo. Faltam master, mute e preview. | Adicionar master/mute, valores numéricos, preview por canal e persistência robusta. | Cada canal vai a silêncio real; preferências persistem 100%. |
| Legendas/indicadores sonoros | Média | Eventos relevantes têm visual, mas trovão/sons não têm alternativa configurável específica. | Legendas opcionais de SFX importantes e indicador visual não-flash para áudio ambiente. | Informação necessária nunca depende só de áudio. |
| Screen readers | Alta | Sem landmarks/labels completos e canvas inacessível. | Semântica HTML, `aria-live` moderado para loot/level, progressbars e headings; evitar anunciar dano a cada hit. | Axe/Lighthouse accessibility **≥95** e fluxo validado em NVDA/VoiceOver/TalkBack. |
| Contraste | Alta | Textos pequenos em `--txt2`/muted e raridades precisam medição. | Automatizar contraste e ajustar tokens; mínimo 4,5:1 normal, 3:1 grande/UI. | Zero violação AA nos estados normal/disabled/raridade. |
| Ultrawide/foldables/orientação | Média | Suporte é parcial e baseado em media query única. | Layout por container query/aspect ratio; preservar painel e batalha sem crop crítico. | 320 px a ultrawide sem ação inacessível. |
| Controle de animação em idle | Média | Cena permanece movimentada continuamente, podendo causar desconforto. | Opção “cenário estático”; congelar parallax/clima mantendo feedback de combate mínimo. | Modo estático reduz movimento e CPU **≥30%**. |

---

# 4. Polimento de Áudio e Efeitos Visuais

## 4.1 VFX e partículas

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Cenário VFX extremo | Crítica | Nunca foi demonstrado em dispositivo real: Pântano + tempestade + noite + boss + shield + DOT + pets + loot. | Criar preset QA que força todos os efeitos e roda 10 min em cada tier. | Tier médio: p95 **≤20 ms**, p99 **≤33,3 ms**; zero erro/queda acumulativa. |
| Qualidade adaptativa incompleta | Alta | `lowFx` reduz chuva e alguns VFX, mas mantém reflexos, névoa, vários washes e paths. | Tabela de custo por efeito e tiers completos; desligar por ordem de custo/valor visual. | Tier baixo ≥30 FPS com 20% de margem. |
| Overdraw de transparências | Alta | Muitas camadas alpha fullscreen e fog blobs; custo cresce no mobile. | Heatmap/contagem de pixels cobertos; fundir passes e limitar fog banks front/back. | Overdraw médio **<3×**, máximo **<6×** no pior cenário. |
| Partículas individuais | Alta | Precipitação usa operação individual; partículas de combate já usam pool. | Batch de paths/fills e atualização vetorizada simples; reciclar imediatamente fora da tela. | CPU de partículas **<2 ms p95**. |
| Luzes vinculadas a partículas | Baixa | Não há luz dinâmica real, apenas glow 2D. | Manter; evitar `shadowBlur` por partícula. Pré-renderizar brilho no sprite ou segundo fill agrupado. | Zero light/shadow object por partícula. |
| Reflexo + transparência | Alta | Poças fazem clip e passes aditivos por entidade. | Reduzir render target/tier conforme seção 1.1. | Reflexo **<2 ms p95**. |
| Saturação dos pools | Média | Overwrite silencioso pode esconder dano/loot quando saturado. | Contador de colisão por pool e política de prioridade (crit > dano comum; divina > rara). | Perda de evento prioritário **0%**. |
| Hit-stop visual | Média | Simulação continua enquanto visual quase para; pode acumular eventos visuais. | Testar ataques/casts durante hit-stop e comprimir eventos redundantes. | Nenhum burst >33 ms ao sair do hit-stop. |
| Fotossensibilidade | Alta | Relâmpago, pulse, sweep e flashes precisam limite global. | Flash governor global, luminance delta limitada e preset sem flash. | Conformidade WCAG 2.3; ≤3 flashes/s. |
| Golden images | Média | Há muitos screenshots, mas sem diff automatizado ou tolerância documentada. | Baselines canônicos por região/clima/aspect; pixelmatch com máscara para partículas aleatórias. | Diff fora de máscara **<0,5%** ou revisão obrigatória. |

## 4.2 Áudio

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Compressão por contexto | Alta | Quatro músicas WAV consomem ~1,26 MiB fonte e a maior parte do HTML; SFX são curtos. | Música Opus 48–64 kbps; SFX críticos WAV ou Opus conforme latência; comparar ABX e suporte de browser. | Áudio embutido reduzido **≥70%**; latência SFX **<50 ms**. |
| Crossfade quebrado no HTML | Alta | A fonte antiga é parada antes do fade-in da nova (`p04_combat.js:498-509`), portanto não há crossfade real. | Iniciar nova faixa em ganho 0, ramp up e ramp down da antiga; parar antiga apenas no final. Tratar corrida de troca de contexto. | Transição sem silêncio/clique; overlap controlado em 1,2 s. |
| Limite/prioridade de vozes | Alta | Há round-robin de 10 SFX e até 3 trovões, mas sem prioridade/ducking. | Voice manager com categorias e prioridade: UI/crit/boss > hit/coin; cooldown de sons repetitivos; `onended`. | Máximo configurado de vozes; zero corte de feedback crítico em stress. |
| Pool de GainNodes | Média | GainNode é alocado por reprodução e o gain persistente do slot não é usado. | Reutilizar ganho do canal; só BufferSource precisa ser novo. | AudioGraph não cresce após 10.000 SFX. |
| Música contextual por evento | Média | Checagem ocorre todo frame. | Trocar via eventos e debounce de contexto para evitar boss/respawn thrash. | Uma transição por mudança real; zero decode duplicado. |
| Normalização/loudness | Média | Não há análise LUFS/true peak. | Normalizar música e SFX por categoria; limiter master leve. | Música ~-16 LUFS, SFX consistentes; true peak ≤-1 dBTP. |
| Loop points | Média | WAVs de 6–8 s são loopados integralmente, sem validação de seam. | Teste espectral/auditivo; editar loop points ou crossfade interno. | Nenhum clique/gap audível em 100 loops. |
| Espacialização 3D | Baixa | Não necessária para tela 2D fixa e assets mono. | Manter N/A; opcional pan sutil herói/inimigo apenas se melhorar leitura e acessibilidade permitir mono. | Mix permanece inteligível em mono. |
| Suspensão/retorno | Alta | Áudio é parado ao ocultar e retomado, mas precisa combinar com correção offline e política autoplay. | Testar 100 ciclos hide/show em Chrome/Safari/iOS/Android; tratar `AudioContext.state`. | 100/100 retornos com áudio correto, sem duplicação de ambience. |
| Canais configuráveis | Média | Música/SFX/ambiente existem; falta master/mute. | Implementar melhorias de 3.3 e salvar somente após write confirmado. | Persistência 100%; silêncio real por canal. |

---

# 5. Plano Geral de Testes e Qualidade — QA Suite

## 5.1 Estado atual da validação pós-hotfix

| Verificação executada nesta auditoria | Resultado | Observação |
|---|---|---|
| `node scripts/eidryn_html/test_node.js` conforme README, a partir do repo | **214 passou / 0 falhou** | Inclui regressões de shield total/parcial/reflect, quota e resume de 120 s. |
| A mesma suíte executada com CWD `/tmp` | **PASS** | Confirma portabilidade de `test_node.js`; nenhum `/home/z` nos paths principais. |
| `python3 scripts/eidryn_html/build.py` com CWD `/tmp` | **PASS** | Build principal portável e determinístico. |
| Hash dos três HTMLs pós-hotfix | **PASS** | SHA-256 idêntico: `a001393012669fb251c78b6aa0ae77dfff45208bd8503f0aa83d2aa8b72e5565`. |
| `python3 scripts/test_package_godot.py` | **6 passou / 0 falhou** | 517 arquivos, 269 PNGs, `project.godot`, sem traversal e conteúdo byte a byte. |
| Determinismo do ZIP Godot | **PASS** | Duas gerações produziram SHA-256 `4e6208ac724547e6659ab9c819b92b0f3c2aa1201087826e5435a0b1cd5066ad`. |
| Syntax check de JS runtime/testes | **PASS** | `node --check`, zero erro. |
| Compile check de Python | **PASS** | `py_compile`, zero erro; caches removidos após validação. |
| Simulador de balance da auditoria inicial | **PASS COM WORKAROUND** | Fase 149/nível 118 em 120 min; o simulador ainda tem path absoluto. |
| Godot headless e regressões P0 adicionadas | **NÃO EXECUTADO** | Binário Godot não disponível. Código/testes foram atualizados, mas resultado runtime é desconhecido. |
| QA navegador real/Playwright | **NÃO EXECUTADO** | Playwright não está instalado/declarado e scripts QA auxiliares continuam não portáveis. |
| Profiling em hardware físico/térmico | **NÃO EXECUTADO** | Metas de FPS, frame time, RAM, VRAM e energia são critérios, não resultados comprovados. |

## 5.2 Testes de desempenho e carga

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Benchmark de cenários | Crítica | Sem baseline reproduzível não há como comprovar otimização. | Harness que força região/clima/hora/boss/VFX e registra 10 min por cenário. | Mediana, 1% low, p95/p99, long tasks, heap e draws publicados por build. |
| Máximo de entidades/VFX | Alta | Uma entidade de combate, mas centenas de elementos VFX e cards DOM. | Saturar todos os pools, 120 itens, 13 pets/cards, 10 resultados gacha e boss. | Sem crash; p99 ≤33,3 ms; pool prioritário sem perda. |
| Sessão prolongada | Crítica | Risco de caches, AudioNodes, histories e listeners crescerem. | Soak 2 h automatizado + 8 h nightly, alternando painel/região/clima/save. | Heap após warm-up cresce **<5%/2 h**; listeners/nodes estáveis; zero erro. |
| Stress de save | Crítica | Save é um P0. | 10.000 mutações/flush, quota, storage bloqueado, corrupção principal/backup, kill no momento de write e reload. | 100% recuperação da última transação confirmada; nenhum falso “salvo”. |
| Stress térmico/bateria | Alta | Idle contínuo pode aquecer, especialmente a 120 Hz. | 30/60 min em Android low/mid e iPhone; 30/60/Auto FPS, brilho fixo. | Sem thermal severe; bateria/CPU reduz ≥30% no Eco; frame time estável. |
| Startup/rede | Alta | Single HTML ~1,93 MiB gzip. | Cold/warm cache em Fast 3G/4G/Wi-Fi, CPU 4× slowdown e file://. | First playable ≤3 s mid/4G; ≤5 s Fast 3G; warm ≤1 s. |
| Frame pacing sob stall | Alta | Delta clamp altera gameplay. | Injetar long tasks e comparar estado final ao controle. | Desvio de simulação <0,1%; recuperação ≤2 frames. |
| **CORRIGIDO EM CÓDIGO** — troca de região Godot | Crítica | Array e geração procedural foram corrigidos; ainda não há medição em engine. | Rodar 1→501 e 100 ciclos, monitorando object count, VRAM e tempo. | Zero referência inválida; memória volta ao baseline ±5%; troca <50 ms. |
| DOM stress | Média | Rebuild de inventário/pets pode causar layout. | Abrir/filtrar/scrollar painéis 1.000 vezes com 120 itens. | Ação-to-paint <100 ms; sem crescimento de DOM/heap. |

## 5.3 Testes funcionais e edge cases

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| **CORRIGIDO** — escudo absorvendo dano | Crítica | Regressões total/parcial/reflect passam no Node; testes equivalentes foram adicionados ao Godot. | Executar integração para shield igual ao dano, expiração, morte/revive e explosivo. | Matriz 100% verde nas duas implementações. |
| **CORRIGIDO EM UNIT** — resume/Alt+Tab | Crítica | Ordem de lifecycle foi corrigida e o caso 120 s passa; browser/mobile e pending não coletado permanecem sem cobertura. | Ocultar por 30/59/60/120/3.600 s, clock forward/back, com/sem save e fechar antes de coletar. | Offline correto ±2 s; sem recompensa perdida ou duplicada. |
| **CORRIGIDO EM UNIT WEB** — quota/storage indisponível | Crítica | O core Web preserva dirty/save anterior e não confirma falha; alerta, Safari/private/file:// e save nativo continuam pendentes. | Executar Safari private mode, quota, `SecurityError`, file:// e falha FileAccess Godot. | Alerta correto; dirty preservado; export disponível; zero falso sucesso. |
| Save/load/migração | Crítica | Só há migração v0→v1 vazia; versão futura não está exercitada. | Fixtures v0/v1/corrupt/truncated/NaN/Infinity/huge arrays; roundtrip e rollback. | 100% dos fixtures válidos migram; inválidos falham de modo seguro. |
| Multi-tab | Alta | Last-write-wins pode duplicar ou perder progresso. | Duas abas combatendo/comprando/salvando; BroadcastChannel/Web Locks; fechar writer. | Um writer ativo; zero rollback/double reward. |
| Comandos concorrentes/double-tap | Alta | Compra, gacha, ascensão, claim e dismantle são sensíveis. | 10–100 clicks no mesmo tick, touch+keyboard simultâneo, callbacks repetidos. | Exatamente uma transação por intenção; saldos invariantes. |
| Limites numéricos | Alta | Idle escala exponencial e pode chegar a `Infinity`, quebrando JSON/UI. | Fases 500/501/1.000/10.000, stats extremos, caps, `Number.MAX_VALUE`, save. | Nenhum NaN/Infinity serializado; notação científica controlada. |
| Inventário cheio | Alta | Loot pode ser perdido; comportamento precisa ser explícito. | Drop divina com 120/120, troca de equipado, gacha e recompensa de passe. | Item prioritário não some silenciosamente; usuário recebe ação recuperável. |
| Morte explosiva/revive | Alta | Fluxo tem early returns e callbacks de modo. | Morte simultânea, boss timer zero no mesmo tick, explosão + revive + reflect. | Exatamente um resultado de combate/recompensa. |
| Datas/reset/DST | Alta | Dia/semana, eventos, estações e relógio local usam múltiplas regras. | UTC±14, DST, 29/02, virada ano/semana, clock manual, timezone durante sessão. | Reset/evento ocorre uma vez e no instante especificado. |
| Perda de foco/áudio | Alta | Pode duplicar contexto/ambience. | 100 ciclos focus/blur, ligação recebida, lock screen e autoplay suspenso. | Zero AudioNode duplicado, áudio retoma corretamente. |
| Queda de conexão | Baixa | Runtime principal é offline e não usa rede. | Marcar N/A hoje; quando cloud/IAP existir, testar retry/idempotência/offline queue. | Sem bloqueio do loop local; transação remota idempotente. |
| Colisão/fora do mapa | Baixa | Não há física ou mapa navegável. | Substituir por testes de crop/coordinate bounds e reciclagem de partículas. | Zero controle/entidade essencial fora da banda visível. |
| Import/export de save | Alta | Base64 grande, clipboard e inputs podem falhar. | Unicode, whitespace, truncado, payload enorme, clipboard negado e mobile share. | Import inválido nunca altera estado; export validado e copiável. |
| Segurança de HTML dinâmico | Média | UI usa muito `innerHTML`; dados atuais são locais, mas save/import pode carregar nomes/campos. | Sanitizar/usar `textContent`; fixture com markup em campos importados. | Zero execução/injeção HTML via save ou dados. |

## 5.4 Compatibilidade

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| Browsers desktop | Alta | Canvas/Web Audio/storage variam. | Últimos 2 Chrome, Edge, Firefox e Safari; Windows/macOS/Linux onde aplicável. | Smoke, save, áudio e 30 min sem erro em 100% da matriz suportada. |
| Mobile browsers | Crítica | Plataforma principal mobile-first. | Chrome Android low/mid/high; Safari iOS atual/anterior; Samsung Internet; PWA e browser tab. | Tier médio 60 FPS alvo; tier baixo 30 FPS; save/resume 100%. |
| GPU integrada vs dedicada | Alta | Canvas 2D/compositor varia por driver. | Intel UHD, AMD iGPU, Apple Silicon, NVIDIA/AMD dedicadas; aceleração ligada/desligada. | Sem artefato; p99 dentro do tier definido. |
| CPU/RAM | Alta | Main thread e parse são mais sensíveis a CPU fraca. | 2–4 cores de entrada, 2/4/8 GB RAM, CPU throttling 4×/6×. | First playable e FPS dentro do orçamento; sem OOM. |
| Refresh rate | Alta | 60/90/120/144 Hz afeta rAF e consumo. | Comparar estado de gameplay e FPS cap em todos os rates. | Estado final idêntico; Eco respeita cap. |
| Resolução/aspect/DPR | Alta | CSS cover pode recortar. | 320×568 até 3440×1440; DPR 1/2/3; zoom 200%; portrait/landscape/fold. | Zero clipping/bleeding; targets e texto aprovados. |
| file:// vs HTTPS/itch/PWA | Crítica | Persistência e políticas de áudio/storage diferem por origem. | Smoke dedicado para download local, GitHub Pages, itch iframe/fullscreen e PWA offline. | Save persiste após reload/upgrade em cada canal suportado. |
| Godot Android/Desktop | Alta | Presets existem, mas não foram executados. | Export limpo 4.4.1, instalação, assinatura, pause/resume, storage e teste em arm64/Win/Linux. | Build/instalação exit 0; suíte Godot atual + smoke por plataforma. |

### Matriz mínima de hardware proposta

| Tier | Exemplo de perfil | Meta |
|---|---|---|
| **Web/Mobile baixo** | Android 4 GB, GPU integrada de entrada, Chrome, 720p, thermal moderado | 30 FPS estáveis; p95 ≤33,3 ms; memória <128 MiB; Eco automático disponível. |
| **Web/Mobile médio** | Android/iPhone intermediário recente, 6 GB | 60 FPS mediana; 1% low ≥50; p99 ≤33,3 ms. |
| **Desktop integrado** | Intel UHD/AMD iGPU, 8 GB, 1080p | 60 FPS; first playable ≤2 s em cache quente. |
| **Desktop dedicado** | GPU dedicada, 1440p/144 Hz | Render cap configurável; gameplay independente de refresh; sem gasto a 144 FPS por padrão. |
| **Acessibilidade** | Teclado, NVDA/VoiceOver/TalkBack, zoom 200%, reduced motion | Fluxo integral e WCAG AA. |

## 5.5 Telemetria, crashes e automação

| Item / Ponto de Otimização | Nível de Prioridade (Crítica, Alta, Média, Baixa) | Impacto na Experiência / Performance | Ação Recomendada / Teste a Executar | Métrica de Sucesso para Validação |
|---|---|---|---|---|
| CI inexistente | Crítica | Regressões e artefatos inválidos podem ser publicados. | GitHub Actions: syntax/lint, 214 HTML, suíte Godot, build, artifact hash, ZIP manifest, browser smoke e budgets. | Todo PR executa gates; branch protegida; release apenas com **100% verde**. |
| Dependências QA não declaradas | Alta | `qa18.js` requer Playwright, mas não há `package.json`/lock. | Adicionar pacote/lock e script `npm test`; fixar browser/version; ou container oficial. | Setup reproduzível em clone limpo em **≤10 min**. |
| Paths QA absolutos | Crítica | Impedem CI e execução local. | Resolver paths relativos/CLI e usar diretório temporário para screenshots. | Zero ocorrência funcional de `/home/z/my-project` nos scripts. |
| Smoke tests | Crítica | Precisa cobrir o que o jogador baixa. | Abrir HTML e ZIP final, clicar Jogar, fechar popups, lutar, abrir painel, salvar, reload e validar console. | Smoke **<5 min**, zero console/page error, estado restaurado. |
| Crash/error reporting | Alta | Só há `console.error`; BUS captura exceções e pode ocultar falhas (`p01_core.js:121-123`). | `window.onerror`, `unhandledrejection`, ring buffer local e envio opt-in quando online; anexar versão/cenário sem PII. | 100% de crashes sintéticos capturados; relatório acionável. |
| Performance telemetry | Alta | FPS médio curto não detecta regressão. | PerformanceObserver para long tasks, frame histogram, heap onde disponível e counters de render/pool; coleta QA e opt-in. | Alertar regressão >10% em p95/p99/build size. |
| Cobertura de testes | Alta | 214 assertions não equivalem a cobertura; DOT, duração de shield e pending offline continuam sem regressão. | Istanbul/c8 para core JS, cobertura de branch; GDScript com harness equivalente; mutation tests em fórmulas críticas. | Core ≥90% lines e ≥85% branches; shield/resume/save obrigatórios. |
| Isolamento/determinismo | Alta | Suíte HTML compartilha estado global e usa `Math.random`, podendo ser order-dependent/flaky. | Fixture reset por teste, RNG injetável/seed, testes independentes e shuffle order. | 1.000 execuções com **0 flake**; qualquer ordem produz mesmo resultado. |
| Differential test Godot×HTML | Crítica | Regras estão duplicadas. | Fixtures JSON de ações e RNG; executar nas duas runtimes e comparar estado normalizado após cada passo. | 100% de paridade em fórmulas, combate, loot, save e progression. |
| Visual regression | Média | Screenshots existem, mas não são gate. | Playwright por cenário/aspect, seeds fixos, masks e threshold; aprovar baseline explicitamente. | Diff <0,5% fora das regiões dinâmicas. |
| Release manifest/SBOM | Média | Não há manifest de versão, hashes, licença nem dependências. | Gerar checksums, changelog, licença, SBOM simples e provenance do build. | Cada release contém versão única, SHA-256 e origem reproduzível. |
| Privacidade | Média | Telemetria futura não pode contrariar experiência offline. | Opt-in, dados mínimos, retenção e política clara; modo 100% offline continua funcional. | Zero request de rede sem consentimento no build offline. |

---

# 6. Plano de execução priorizado

## Fase 0 — Hotfix e integridade (**implementada parcialmente em `00a5eda`**)

| Ordem | Entrega | Estado / gate residual |
|---|---|---|
| 1 | Absorção e reflexão do escudo em HTML e Godot. | **Implementado**; 4 regressões Node passam, suíte Godot ainda precisa rodar. |
| 2 | Save Web propaga falha, preserva dirty e não confirma escrita inválida. | **Implementado em unit**; faltam alerta e matriz Safari/private/file://. |
| 3 | Resume calcula offline antes de `mark_seen`. | **Implementado**; caso 120 s passa, falta persistir pending não coletado. |
| 4 | Portabilidade de `build.py` e `test_node.js`. | **Implementado** e validado de `/tmp`; auxiliares continuam pendentes. |
| 5 | ZIP Godot completo/determinístico. | **Implementado**, 6/6; ZIP itch na raiz permanece pendente. |
| 6 | `_layers` e texturas procedurais Godot. | **Implementado em código/teste**; falta profiling/execução Godot. |
| 7 | DOT de `sedenta`, save nativo e pending offline idempotente. | **Novo gate crítico** da reauditoria; deve anteceder otimização gráfica. |

## Fase 1 — Observabilidade e reprodução (3–5 dias)

1. Criar `package.json`/lock para Playwright e scripts únicos de teste.
2. Adicionar CI com unit, browser smoke, build/hash e validação de ZIP.
3. Instrumentar frame percentiles, long tasks, heap, render commands e pool saturation.
4. Criar presets determinísticos de cenário extremo.
5. Unificar versão dos outputs e documentação.

**Gate:** PR só entra com 214 HTML + suíte Godot atual + smoke Web + budgets de tamanho; os números de performance passam a ser baseline, não estimativa.

## Fase 2 — Render e tamanho (1–2 semanas)

1. Batch da precipitação.
2. Cache de gradientes/paths e pré-composição de background.
3. Tiers de reflexo/névoa/fullscreen passes.
4. Dynamic canvas resolution e 30/60/Auto FPS.
5. Opus para música; build hosted/PWA separado do single-file.
6. Fixed-step de gameplay independente do render.

**Gate:** ganho ≥30% no p95 do cenário extremo do tier baixo; áudio reduzido ≥70%; nenhuma divergência de gameplay.

## Fase 3 — UX, acessibilidade e áudio (1–2 semanas)

1. Escala de fonte, safe area, foco/teclado, labels ARIA e modal acessível.
2. Reduced motion/sem flashes global e raridade não dependente de cor.
3. Onboarding contextual/progressive disclosure.
4. Crossfade real, voice priority, master/mute e loudness.
5. Testes com usuários e tecnologias assistivas.

**Gate:** Axe/Lighthouse ≥95, fluxo completo por teclado/screen reader, zero clipping a 200%, testes de usuário atingindo as metas definidas.

## Fase 4 — Certificação de release (3–5 dias por release)

1. Matriz browser/hardware/aspect/file:///HTTPS/itch/PWA.
2. Soak de 2 h por PR candidata e 8 h nightly.
3. Stress térmico de 30–60 min.
4. Migração/corrupção/quota/multi-tab.
5. Checklist de versão, hashes, ZIP root, licença e rollback.

---

# 7. Definition of Done recomendada

Uma release só deve ser marcada como pronta quando:

- [x] P0-01 a P0-06 foram implementados; validação runtime Godot ainda é necessária.
- [x] Build/testes principais rodam fora do CWD do repo; ferramentas auxiliares ainda precisam de portabilidade.
- [x] HTML unit: **214/214** e pacote Godot: **6/6**.
- [ ] P0-07/P0-08, pending offline idempotente e duração do shield estão corrigidos.
- [ ] Suíte Godot atual e differential suite passam com 100% de paridade.
- [ ] Browser smoke final roda no **artefato empacotado**, não apenas nos módulos-fonte.
- [ ] Tier médio atinge mediana ≥60 FPS, 1% low ≥50; tier baixo mantém ≥30 FPS.
- [ ] p99 ≤33,3 ms no cenário extremo e nenhuma long task >100 ms em gameplay estável.
- [ ] Memória cresce <5% após warm-up em 2 h; AudioGraph/listeners/DOM permanecem estáveis.
- [ ] Save sobrevive a quota, corrupção, interrupção, multi-tab e reload sem confirmação falsa.
- [ ] First playable ≤3 s em mobile médio/4G e build respeita o orçamento definido.
- [ ] Acessibilidade: teclado completo, foco, modal, zoom 200%, reduced motion e contraste AA.
- [ ] ZIP itch contém `index.html` na raiz; ZIP Godot contém `project.godot` e abre em 4.4.1.
- [ ] Versão é única e consistente em código, splash, nomes, presets, documentação e release.
- [ ] Crash/performance logs de QA incluem versão e cenário, sem coleta de PII.

---

# 8. Parecer final

**Classificação pós-hotfix:** **P0-01 a P0-06 implementados, mas release multiplataforma ainda não aprovada**. A versão Web é compacta e visualmente ambiciosa para Canvas 2D, com resolução interna fixa, pools, stats cacheados e qualidade adaptativa. A reauditoria confirmou dois novos bloqueadores de lógica: DOT de `sedenta` calculado como multiplicador e falso sucesso do save nativo Godot. Também é necessário tornar a recompensa offline pendente idempotente/persistente e validar toda a camada Godot em engine real.

Após fechar esses gates de integridade, o foco deve ser medir antes de reescrever. Para este jogo 2D, **LODs 3D, occlusion culling, DLSS/FSR, raycasts e iluminação física não são investimentos adequados**. Os ganhos concretos estão em batching de Canvas, cache de gradientes/paths, redução de overdraw/reflexos, fixed-step, pausa em background, compressão Opus, UI incremental e QA por percentis em hardware real.
