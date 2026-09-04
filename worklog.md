# Worklog — Eidryn: O Ciclo do Eclipse

---
Task ID: 0
Agent: main (Super Z)
Task: FASE 0 — Setup do estúdio autônomo: estrutura de pastas Godot 4, worklog, decisões

Work Log:
- Recebida missão: RPG Idle 2D dark fantasy original "Eidryn - O Ciclo do Eclipse" (Godot 4.x, portrait 1080x1920 + landscape)
- Criado plano de 14 fases (TODO list)
- Iniciado download do Godot 4.4.1 headless para validação real dos scripts
- Estrutura de pastas criada

Stage Summary:
- Ambiente em preparação; estratégia: MVP jogável primeiro, depois expansão completa

---
Task ID: 1
Agent: main (Super Z)
Task: FASES 0-15 — Produção completa do jogo

Work Log:
- project.godot (gl_compatibility, portrait 1080x1920, 20 autoloads) + DECISIONS.md (23 decisões D01-D23)
- 15 arquivos JSON data-driven: regiões, inimigos, moedas, atributos, skills, itens, pets, ascensão, masmorras, gacha, missões, 35 conquistas, loja/IAP stubs, passe, eventos, localização PT-BR/EN
- 19 singletons core: EventBus(40 signals), DataManager(fórmulas+soft-cap+RNG determinístico), TimeManager(time-travel), SaveManager(AES+SHA256+backup+migração+anticheat), Economy(7 moedas), Character(12 atributos multiplicativos D21), Inventory(10 slots/7 raridades/sets/pity reforço/fusão/filtros/auto-equip), Skill(4A+4P+1S), Pet(6+4, estrelas), Progression(500 fases+Abismo, farm fallback), Combat(loop completo, 6 modificadores, DOT/escudo/buff/stun/revive), Modes(3 masmorras, Torre, World Boss, Arena), Ascension(árvore 16 nós), Gacha(pity 10/50/100), Retention(missões+conquistas+login+passe), Offline(8h/12h+dobro stub), Platform(IAP/ads/cloud stubs), Audio(crossfade+buses), UIManager(10 painéis), GameManager(boot+ciclo de vida)
- UI completa: MainUI(top bar/bottom bar 8 botões/toasts/popups), CombatScreen(parallax por região, ghost trails, dano flutuante pool 14, screenshake), PanelBase + 10 painéis
- Assets 100% originais: 46 sprites/ícones 96x96 pixel art (PIL) + 24 WAV sintetizados (4 músicas + 20 SFX, numpy)
- Ciclos de auto-refinamento: 10 defeitos reais encontrados e corrigidos (ver TEST_REPORT §4) — destaque: checksum de save imune a reformatação de floats (D22), backup binário (D23), atributos multiplicativos por análise de escala (D21)
- QA: tests/test_runner.tscn — 111 asserções / 14 grupos / 0 falhas (Godot 4.4.1 headless, exit 0)
- Balance: tools/balance_sim.py → BALANCE.md + balance_table.csv (500 linhas); F2P 120min: F10 ~1min, F100 ~6min, wall ciclo-1 F~139 superável
- Docs: GDD_FINAL, BALANCE, TECHNICAL_DOC, ART_STYLE_GUIDE, TEST_REPORT, LAUNCH_CHECKLIST, TODO_MASTER, CHANGELOG, DECISIONS, README + export_presets.cfg (Android/Web/Win/Linux)
- Validação final: import 0 erros, 111/111 PASS exit 0, boot 240 frames limpo
- Zip: /home/z/my-project/download/eidryn-o-ciclo-do-eclipse_v1.0.0_godot44.zip (1.8MB, 362 arquivos)
- Push GitHub: token do usuário NÃO tem permissão Administration (criar repo via API falhou) — entregue instruções de 2 caminhos para publicar

Stage Summary:
- JOGO COMPLETO E VALIDADO. Definição de Conclusão (Seção 8) atingida em todos os itens de software; itens de plataforma (export com templates, keystore Android) exigem ferramentas locais do usuário, documentados em LAUNCH_CHECKLIST §3.

---
Task ID: 2
Agent: main (Super Z)
Task: Porta HTML/Web do Eidryn — O Ciclo do Eclipse (versão única em HTML, fiel à build Godot)

Work Log:
- Lida fonte de verdade completa: 17 JSONs de data/ + 16 managers GDScript core + combat_screen.gd
- Estratégia: single-file HTML com dados JSON, 97 sprites PNG e 24 áudios WAV embutidos em base64 (paridade visual/auditiva total)
- Porta 1:1 dos managers: DataManager (fórmulas exatas + soft-cap + RNG determinístico), Economy (7 moedas), Character (12 atributos D21), Inventory (10 slots/7 raridades/pity reforço/fusão/sets), Skill (4A+4P+1S com evolução), Pet (6+4 estrelas), Gacha (pity 10/50/100), Progression (500 fases + Abismo + farm fallback D19), Ascension (16 nós), Modes (3 masmorras/Torre/World Boss/Arena), Offline (8h/12h), Retention (missões/35 conquistas/login/passe), Save (SHA-256 + backup + migração + anticheat), Audio (4 músicas crossfade + 20 SFX), Platform (IAP/ads/cloud stubs)
- UI: splash eclipse, HUD (7 moedas + PC + auto-avançar), skillbar com cooldowns, 8 abas + Missões/Ajustes, modais (offline/login/item/gacha/rewards), toasts, PT-BR + EN
- Fix de build: declaração de E antes da injeção DATA/IMG/WAV (bloco inteiro morria com ReferenceError)
- Fix: sprites precisavam de prefixo data:image/png;base64 (naturalWidth=0)
- Fix: save não carregava no browser (caminho Buffer inexistente → atob_compat)
- Fix [HTML-4]: novo jogo herdava last_seen=0 → 8h offline fantasma no primeiro boot
- Fix: cache de áudio retornava AudioBuffer em vez de Promise (segunda reprodução crashava)
- Fix: helpers de UI2 referenciavam this.h (cross-module → E.UI.h)
- Fix: labels brutos (heroi/critdmg/gold_find) → mapas LKEY/STAT_LABELS pt-BR/EN
- Fixes de paridade vs Godot documentados no cabeçalho do HTML: [HTML-1] pity Rara+10 forçado + vale para itens; [HTML-2] World Boss paga ao fim dos 30s; [HTML-3] XP do Passe injetado
- QA Node: test_node.js — 137 asserções / 14 grupos / 0 falhas (fórmulas, combate+timeout boss, inventário+cap+pity, skills+evolução, pets+duplicados, gacha+pity 10/50/100, progressão+fallback, ascensão+árvore, modos+arena+glória, offline+time-travel, save+checksum+backup+anticheat+export/import, missões+conquistas+login+passe, economia+caps, localização)
- QA navegador (agent-browser): splash → start → combate renderizado (parallax/sprites/barras/dano flutuante) → 8 abas → gacha → arena VITÓRIA → 0 erros de console em sessão limpa; screenshots portrait 540×960 e landscape 1280×720 validados
- Entregue: /home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html (2,63 MB, autossuficiente, abre offline em qualquer navegador)

Stage Summary:
- VERSÃO HTML COMPLETA E VALIDADA. Mesma simulação, mesmos dados, mesmos assets, mesmo formato de save da build Godot; 4 correções de paridade documentadas. 137/137 testes + smoke test real com 0 erros.

---
Task ID: 3
Agent: main (Super Z) — Direção de Arte & UI/UX
Task: REVOLUÇÃO VISUAL "Edição do Eclipse" v1.1.0 — substituir os 97 placeholders por arte profissional, polir UI e adicionar juice (escopo estritamente visual; lógica/fórmulas/save intactos)

Work Log:
- FASE A (sprites): novo kit de pixel art (pxkit.py: rampas 5 tons, contorno automático, luz direcional, rim light, brighten, quantização); 97 sprites refeitos + 42 novos = 139 no build
  - Herói com 2 posturas (idle + ataque com arco de golpe), 35 inimigos em 9 arquétipos temáticos por região, 7 chefes únicos 192×192 (stag cristal, afogado c/ tridente, rei c/ coroa, sultão djinn, jarl do gelo, herdeiro c/ halo do eclipse, avatar do devorador), 10 pets, 44 ícones (9 slots/12 atributos/7 moedas/9 skills/6 pets+aba), 8 ícones de navegação, 5 texturas (pedra/metal/pergaminho/moldura 9-slice/vinheta), 28 camadas de parallax (7 regiões × céu/longe/médio/perto com eclipses/luas/auroras autorais)
  - Ciclos de autocrítica: 4 rodadas (espada do herói reconectada, ícones escuros clareados, capas dos chefes legíveis, boss centralizado em 1.38× para não cortar)
- FASE B (UI): fontes Cinzel (variável 400-900) + Alegreya Sans (500/700/800) embutidas base64 (offline); CSS reescrito: painéis com textura pedra/metal + moldura 9-slice nos modais, botões com bevel/hover/active, glow animado por raridade (épica→divina) + shine sweep, transições (panelIn/modalIn/toast), splash cinematográfico (eclipse c/ coroas rotativas, embers, título gradiente Cinzel), HUD/nav/skillbar ornamentados
- FASE C (VFX): render engine reescrita — parallax 4 camadas por região + crossfade, partículas atmosféricas por bioma (vagalumes/esporos/runas/brasas/neve/cinzas/motas), partículas de combate (faíscas/sangue/poeira/motas de ouro), screenshake por trauma com micro-rotação, dano flutuante em arco com pop-in (Cinzel, cores por tipo), aura orbital + disco pulsante em chefes, flash branco de impacto, barras de vida ornamentadas c/ ghost trail, spotlight de separação entidade/fundo, anel de level-up
- [HTML-5] ÚNICO toque em lógica (bugfix de paridade, documentado): combate ressincroniza stage com Prog.current_stage ao avançar/reiniciar — antes chefes de fase 10 nunca apareciam (1 linha × 2 pontos)
- FASE D/E (QA): build 2,97MB/139 sprites; test_node 137/137 ✓; navegador real: splash→combate→8 abas→chefe F10→chefe F170 (Régente Morvain imponente)→gacha→modal item lendário→inventário com glows; 60,5 FPS portrait e 60,2 FPS landscape; 0 erros de console; save persistente validado (reload manteve fase/itens/ouro); portrait 390×844 e landscape 1280×720 validados

Stage Summary:
- v1.1.0 "Edição do Eclipse" entregue: /home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html (3,0MB, autossuficiente offline). Visual de produto comercial; fórmulas/balance/save 100% preservados (137/137 testes); único fix lógico [HTML-5] documentado no cabeçalho do HTML.

---
Task ID: 4
Agent: main (Super Z) — Direção de Arte & UI/UX
Task: v1.2.0 "Ciclo das Estações" — animar mais posturas do herói + biomas sazonais (escopo estritamente visual; lógica/fórmulas/save intactos)

Work Log:
- [ART-6] HERÓI ANIMADO: novo rig paramétrico (gen_hero_anim.py, espada/capa/braços/orbes/arcos/impacto em pxkit) → 7 posturas × 23 frames 96×96:
  idle 4f (respiração + capa 4 variantes + glint), atk 4f (preparação→golpe→follow→recuperação, arco de corte),
  crit 4f (agachamento→salto duas mãos→impacto c/ estrela+poeira→recuperação), cast 4f (braço ergue orbe eclipse
  teal/roxo→liberação), hurt 2f (recuo), victory 3f (espada ao céu + motas), down 2f (ajoelhado c/ espada plantada).
  Compat: hero.png/hero_attack.png regenerados (idle f0 / atk f1). 3 defeitos autocorrigidos (mão flutuante no salto,
  punho desconectado no impacto, vão no joelho).
- FSM no render (só eventos BUS existentes — ZERO mudança de lógica): prioridade down>victory>crit>cast/hurt>atk>idle;
  hooks: enemy_damaged→atk/crit, skill_casted→cast, hero_damaged→hurt, combat_ended→victory/down, enemy_spawned→reset,
  level_up→victory. Flash branco cacheado por frame (_whiteFor). Validadas as 7 posturas em navegador real.
- [ART-7] BIOMAS SAZONAIS (só render): 4 estações por data real (hemisfério sul: verão 21/12, outono 21/3, inverno 21/6,
  primavera 21/9) + override em Ajustes ⚙ (select, pref em localStorage PRÓPRIO eidryn_fx_prefs_v1 — save intacto).
  Grade de cor por camada de parallax c/ cache (saturação+brilho+tinte por luminância), pétalas/motas douradas/
  folhas/neve atrás E à frente das entidades, wash de humor, solo/névoa/acento deslocados (_seasonPal), chip HUD
  (#season-chip, emoji+nome localizado). 1ª crítica: grade sutil → amplificada (amt .16–.25, +partículas, wash+50%).
- i18n: +6 chaves aditivas loc_ptbr/loc_en (season, season_auto/spring/summer/autumn/winter). GAME_VERSION 1.2.0.
- QA: build 3,08MB / 162 sprites (+23) / 24 áudios; test_node 137/137 ✓; navegador real (portrait 390×844 +
  landscape 1280×720): 4 estações capturadas e comparadas, posturas em combate real (FSM reagiu a golpes/crits/
  skills), FPS 61, console 0 erros/0 warnings, boss F10 com bossbar e aura intactos; reload → save F10 preservado +
  pref de estação restaurada; landscape sem regressão vs v1.1.

Stage Summary:
- v1.2.0 entregue em /home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html: herói vivo com 7 posturas
  animadas dirigidas por eventos, mundo com 4 biomas sazonais perceptíveis (auto por calendário + seletor manual).
  Regra de ouro mantida: nenhum arquivo de gameplay/save tocado; 137/137 testes; zero erros de console.

---
Task ID: 5
Agent: main (Super Z) — Direção de Arte & UI/UX
Task: v1.3.0 "Tempestade Viva" — clima dinâmico (chuva/tempestade) + posturas para os pets (escopo estritamente visual; lógica/fórmulas/save intactos)

Work Log:
- [ART-9] POSTURAS DOS PETS: gen_pet_anim.py — engine de transformações paramétricas
  (shift/squash/band_shear/dim/lift_region) sobre a arte base autoral de gen_sprites_v2 +
  FX por espécie (faíscas, lágrima, poeira, brilho, suspiro). 10 pets × 8 frames = 80 PNGs
  96×96: idle 4f (respiração/flutuação/rastejo/hop por espécie), cheer 2f (agacha→salto com
  burst de faíscas na cor de cada pet; cavaleiro ergue a espada), sad 2f (abatido, escurecido,
  lágrima + suspiro). Contact sheet sheet_pet_anim.png.
  Autocrítica 1: lift do cavaleiro apagava o braço direito (box invadia x≤65) → dividido em
  2 lifts (lâmina+guarda) sem tocar o braço; grilo idle nervoso demais → pulo -5→-3, squash
  suavizado. Reaprovado com zoom nas frames corrigidas.
- [ART-8] CLIMA DINÂMICO no render (p05_render.js v4): 5 estados (limpo/nublado/chuva/
  tempestade/neve) com escolha automática DETERMINÍSTICA por região+janela de 2,5min
  (hash regionId:wx:slot, pesos por bioma — Pântano chuvoso, Cidadela seca, Abismo sem
  clima) + coerência sazonal (inverno: chuva→neve). Vento com rajadas (inclina os riscos
  de chuva, arrasta neve/cinzas/pétalas/motas). Pool fixo 150 gotas c/ camadas trás/frente,
  repovoamento gradual (sem pop), splash em elipse no solo, relâmpagos ramificados c/
  glow triplo + flash de tela + screenshake (0,34 próximo / 0,08 distante), escurecimento
  do céu + wash com crossfade entre climas. Variantes temáticas por bioma: chuva ácida
  (Pântano), chuva de sangue (Coração), cinzas/tempestade de brasas c/ raio laranja
  (Deserto), flocos (Picos). Chip #weather-chip no HUD ao lado do chip de estação
  (container #fx-chips flex). Override manual em Ajustes (auto/limpo/nublado/chuva/
  tempestade/neve) — prefs em eidryn_fx_prefs_v1 (chave própria; save intacto) e
  persistindo entre sessões (validado).
- [ART-9 cont.] PETS CÊNICOS NO COMBATE: pet + companheiro ativos desenhados na cena
  (companheiro atrás do herói 176px c/ sombra, pet aos pés 76px c/ sombra), FSM de
  posturas (idle 6fps loop / cheer 6fps loop c/ salto senoidal / sad 3,2fps) dirigida
  SOMENTE por eventos existentes: combat_ended win→cheer 3,4s, lose→sad, level_up→cheer
  2,6s, enemy_spawned→idle, pet_changed→setPetVisuals (também após boot_load). Cards do
  painel de Pets animam o idle via ticker 0,22s (registerPetCard/resetPetCards — validado
  "ANIMANDO ✓" comparando src).
- i18n: +7 chaves aditivas (weather, weather_auto, w_clear/cloudy/rain/storm/snow) em
  loc_ptbr/loc_en. GAME_VERSION 1.3.0. Splash + cabeçalho do HTML documentados ([ART-8/9]).
- QA: build 3,12MB / 242 sprites (+80) / 24 áudios; test_node 137/137 ✓; navegador real
  (portrait 390×844 + landscape 1280×720): chuva c/ vento ✓, tempestade c/ relâmpago
  capturado em frame congelado ✓, neve ✓, chips ✓, pets idle/cheer/sad em combate real ✓
  (win→cheer→idle verificado por listener), painel animado ✓, 61 FPS ✓, 0 erros de
  console ✓, prefs persistindo ✓, save novo íntegro ✓. Incidente "Fase NAN" investigado:
  artefato de evento sintético fora de banda no teste (estado real stage:10 íntegro);
  não alcançável em jogo real. localStorage de teste limpo antes da entrega.

Stage Summary:
- v1.3.0 entregue em /home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html:
  mundo vivo com 5 climas dinâmicos (auto por bioma+tempo, manual em Ajustes) e pets/
  companheiros animados por posturas que reagem a vitória/derrota/level. Regra de ouro
  mantida: nenhum arquivo de gameplay/save tocado; 137/137 testes; zero erros de console.

---
Task ID: 6
Agent: main (Super Z) — Direção de Arte & UI/UX
Task: v1.4.0 "Eco da Tempestade" — áudio ambiente por clima (chuva/trovão sintetizados) + poças refletivas na chuva + neblina densa dinâmica no Pântano (escopo estritamente visual/sonoro; lógica/fórmulas/save intactos)

Work Log:
- [ART-10] ÁUDIO AMBIENTE PROCEDURAL (E.Audio, aditivo): chuva em 2 camadas de ruído
  filtrado (corpo grave lowpass 950Hz + chiado highpass 2600Hz), vento com LFO 0.09Hz
  no corte do filtro (rajadas lentas), presets por clima (limpo .05/nublado .14/chuva
  .34/tempestade .52/neve .10) com crossfade setTargetAtTime (τ 1.4–1.8s); TROVÃO
  sintetizado sob demanda (ruído c/ filtro 400→60Hz + envelope exponencial + sub
  grave 52→34Hz; próximo=peso imediato, distante=atraso 0.18–0.6s e vol menor, cap
  3 simultâneos), gatilhado pelos relâmpagos do Rfx; pause/resume no visibilitychange
  + resume defensivo do AudioContext; volume "Ambiente" (amb_vol default 0.5) com
  slider em Ajustes, persistido nas prefs de FX (eidryn_fx_prefs_v1) — SAVE INTACTO.
- [ART-11] POÇAS REFLETIVAS (Rfx): 9 poças DETERMINÍSTICAS por região (hash), emergem
  gradualmente na chuva (0.11/s; tempestade 0.20/s) e secam ao parar (−0.045/s);
  água tingida pela cor da chuva do bioma, brilho de céu (gradiente clipado), REFLEXO
  real de companheiro/herói/pet/inimigo (clip elíptico + flip + squash 0.62 + tremulação
  senoidal ±1.8px + sheen aditivo 'lighter' 0.12), ondulações elípticas onde gotas caem
  dentro da poça (pool 14), cintilância, menisco iluminado, brilho do relâmpago na água
  e sheen de solo encharcado; biomas de cinzas não empoçam.
- [ART-12] NEBLINA DENSA DO PÂNTANO (Rfx): 12 bancos em deriva contínua (blob radial
  pré-renderizado 2 tons ar/solo), 8 atrás + 4 na frente das entidades, velocidade
  responde ao vento, "respiração" de opacidade, densidade reage ao clima (chuva +35%,
  tempestade +60%, nublado +18%), bruma gradiente no solo.
- Ciclos de autocrítica: 3 defeitos reais encontrados e corrigidos —
  (1) IndexSizeError: (h>>20)%1000 negativo p/ h≥2³¹ → raio −25.04 matava o loop rAF
      → shifts unsigned (>>>) + defesa rx≥8;
  (2) reflexo ilegível (fundo 0.30+gradiente 0.62+alpha 0.20+squash 0.5) → água mais
      clara c/ brilho de céu, alpha 0.34, squash 0.62, sheen 'lighter', gradiente suave;
  (3) brilho de céu vazava fora da elipse (fillRect sem clip) → clip aplicado.
- QA: build 3,14MB/242 sprites/24 áudios; test_node 137/137 ✓; navegador real: chuva
  (puddleT 0→1, água c/ reflexos+menisco+shimmer), tempestade (trovão executa limpo,
  flash/relâmpago), Pântano (12 bancos, dens 1.35 na chuva), FPS 60.5 com tudo ativo,
  0 erros de console; portrait+landscape idênticos ao aprovado; reload → Fase 10/Nível 8
  preservados + prefs (weather/amb_vol) persistidas; modal Ajustes c/ slider Ambiente ✓.
  Áudio inaudível no headless (AudioContext suspenso por autoplay policy — clique
  programático não dá user activation); grafo validado estruturalmente, mesma arquitetura
  da música já validada com interação real.

Stage Summary:
- v1.4.0 entregue em /home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html:
  a tempestade agora tem VOZ (chuva/vento em loop sintetizado + trovão nos relâmpagos),
  o solo tem MEMÓRIA da chuva (poças que refletem herói, pets e inimigos) e o Pântano
  tem RESPIRAÇÃO própria (neblina densa que engole o bioma e engrossa com o clima).
  Regra de ouro mantida: nenhum arquivo de gameplay/save tocado; 137/137 testes;
  zero erros de console; 60.5 FPS.

---
Task ID: 7
Agent: main (Super Z) — Engenharia & Direção de Arte
Task: v1.5.0 "Edição Profissional" — AUDITORIA 360° (código + visual + UX + perf + a11y; escopo estritamente visual/sonoro/QoL — lógica/fórmulas/save intactos)

Work Log:
- AUDITORIA: código-fonte integral relido (p00_head/p01–p07, build.py, test_node.js, CSS) + QA de base
  (137/137 ✓, 60 FPS). Achados classificados em A(robustez) B(juice) C(a11y/perf) D(pro/UX).
- [AUDIT-A1] ROBUSTEZ: E.Save.flush blindado com try/catch — quota/btoa falhando não congela mais o
  loop rAF (flush roda dentro do Game.loop a cada 3s). Formato do save INTACTO (compat total).
- [AUDIT-A2] PERF: chips de moeda deixaram de reconstruir DOM+7 imgs base64 a cada kill
  (currency_changed) → update leve por referência (_curRefs/_updateCurChip, textContent apenas).
- [AUDIT-B1] JUICE: VFX DE ESTADO lidos de E.Combat (só leitura) — bolha arcânica c/ glow+runas
  (guarda_sombras/hero_shield), brasas douradas em órbita (cataclismo/_buff_time), miasma roxa
  subindo (sedenta/_dot_time), estrelas de stun (lâmina evoluída/_stun_t). As 4 habilidades
  tinham efeitos "invisíveis"; a cena agora reage a todas.
- [AUDIT-B2] skill_ready já existia no BUS e ninguém escutava → slot pisca (keyframe skFlash).
- [AUDIT-B3] feedback de progresso: #hud-stage.bump ao trocar de fase (span agora inline-block —
  defecto autocriticado: transform não afeta inline) + VINHETA DE PERIGO pulsante <30% HP.
- [AUDIT-C1] ACESSIBILIDADE: pref reduzida_fx (eidryn_fx_prefs_v1) — shake×0.3, flash de tela×0.3,
  vinheta atenuada; checkbox em Ajustes. Fotossensibilidade respeitada.
- [AUDIT-C2] PERF ADAPTATIVA: _rawDelta cru medido no Game.loop → média móvel no Rfx; perfMode
  auto decide lowFx a cada 2s (>27ms entra, <19ms sai): chuva −45%, partículas ×0.5 (_fxMul),
  relâmpago em traço único. Select Auto/Alta/Leve em Ajustes.
- [AUDIT-D] PRO: favicon eclipse embutido (SVG data URI) + meta description; botão COPIAR no
  export do Selo (clipboard API + fallback execCommand); 3 dicas da 1ª sessão (tips_done nas
  prefs de FX — não repetem); pulso verde no ⚙ a cada save_flushed (autosave visível).
- i18n: +10 chaves aditivas ptbr/en (tip1..3, copy, copied, reduced_fx, quality, q_auto/high/low).
- GAME_VERSION 1.5.0; changelog no header do HTML; splash .ver estático corrigido (v1.5.0).
- Ciclo de autocrítica: 3 defeitos achados e corrigidos — (1) teste Node referenciava E.UI
  (inexistente headless) → guard; (2) #hud-stage inline não sofria transform → inline-block;
  (3) bolha de escudo ilegível no fundo escuro → glow radial interno + runas mais claras.
- QA: test_node 141/141 ✓ (novo grupo 15 Robustez: flush c/ storage estourado não lança,
  flush saudável limpa dirty, chaves i18n nos 2 idiomas). Navegador real (portrait 390×844 +
  landscape 1280×720): flash/bump/pulse classes ✓, 4 VFX de estado capturados ✓, vinheta ✓,
  Ajustes c/ 2 novos controles ✓, copiar/export ✓, prefs persistindo ✓, dica 1 exibida ✓,
  boss F10 c/ bossbar ✓, 60 FPS estado limpo (58 sob VFX forçados, headless software) ✓,
  0 erros/0 warnings de console ✓, reload → save F10 íntegro + tips_done ✓.
- Build: 3,16 MB | 242 sprites | 24 áudios — /home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html

Stage Summary:
- v1.5.0 "Edição Profissional" entregue: auditoria 360° executada (robustez, juice de combate,
  acessibilidade, desempenho adaptativo, Web polish). Regra de ouro mantida — fórmulas, balance,
  save e gameplay 100% intocados; 141/141 testes; zero erros de console; 60 FPS.
