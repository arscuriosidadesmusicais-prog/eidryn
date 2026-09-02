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
