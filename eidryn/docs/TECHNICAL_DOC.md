# TECHNICAL_DOC — Eidryn: O Ciclo do Eclipse
Godot 4.4.1 (GL Compatibility) | GDScript | SAVE_VERSION 1 | GAME_VERSION 1.0.0

## 1. Arquitetura
**Separação Dados/Lógica/Apresentação**, event-driven:

```
data/*.json  →  DataManager (fonte única de fórmulas e conteúdo)
                    ↓
19 autoloads (ordem de dependência):
  EventBus → DataManager → TimeManager → SaveManager →
  Economy → Character → Inventory → Skill → Pet → Progression →
  Combat → Modes → Ascension → Gacha → Retention → Offline →
  Platform → Audio → UIManager → GameManager
                    ↓
scripts/ui/* (MainUI, CombatScreen, Panels) — apresentação pura
```

- **EventBus**: ~40 signals; sistemas nunca se chamam diretamente entre camadas.
- **Apresentação**: escuta EventBus; nunca altera estado (exceto via métodos públicos dos managers).
- **Scenes**: apenas `main.tscn` e `tests/*.tscn` — UI construída por código (D03) para versionamento limpo e responsividade por anchors.

## 2. Módulos (arquivos)
| Caminho | Responsabilidade |
|---|---|
| `core/data_manager.gd` | JSONs, localização PT-BR/EN, fórmulas exatas (dano/def/lifesteal/crit/soft-cap/escalada), RNG determinístico por fase |
| `core/save_manager.gd` | JSON→SHA256→AES (open_encrypted_with_pass); checksum sobre `data_json` bruto (imune a reformatação de floats); backup binário; migração por versão; anticheat |
| `core/time_manager.gd` | Unix time, day/week keys, detecção de time-travel (tolerância 60s) + log |
| `core/economy_manager.gd` | 7 moedas, caps, multiplicadores de evento/premium |
| `core/character_manager.gd` | 12 atributos multiplicativos (D21), XP/nível, stats agregados (gear+skills+pets+sets+árvore), PC |
| `core/inventory_manager.gd` | Geração de loot, 10 slots, 7 raridades, affixes, sets, reforço com pity, fusão, filtros, auto-equip/auto-desmonte, favoritar/bloquear |
| `core/skill_manager.gd` | 9 skills, cooldowns, auto-cast, tooltips Atual/Próximo, evolução |
| `core/pet_manager.gd` | 10 companheiros, estrelas, fragmentos, duplicados |
| `core/progression_manager.gd` | Fases, auto-avançar, fallback de farm, regiões, rendimento/seg |
| `core/combat_manager.gd` | Loop de combate, modificadores (escudo/cura/berserk/explosivo/elusivo/reforçado), DOT, escudo do herói, buffs, boss timer, recompensas |
| `core/modes_manager.gd` | Masmorras temporizadas, Torre, World Boss, Arena, loja da Glória |
| `core/ascension_manager.gd` | Reset parcial, árvore de 16 nós com requisitos |
| `core/gacha_manager.gd` | Pity 10/50/100, pool pet/companheiro/item |
| `core/retention_manager.gd` | Missões, 35 conquistas, login 7 dias, passe, rastreadores |
| `core/offline_manager.gd` | Cap 8/12h(+4h), cálculo por farm, coleta dobro via ad stub |
| `core/platform_stub.gd` | IAP/Ads/Cloud prontos para integração |
| `core/audio_manager.gd` | Buses Music/SFX, crossfade, pool de 10 players |
| `core/ui_manager.gd` | Roteamento de 10 painéis, popups globais |
| `ui/main_ui.gd` | Top bar (moedas/PC/fase), bottom bar 8 botões, toasts, popups |
| `ui/combat_screen.gd` | Parallax por região, sprites, barras com ghost trail, dano flutuante (pool 14), screenshake, boss timer |

## 3. Save (D05)
```
collect() → {"version":1,"checksum":sha256(data_json),"data_json":"..."}
→ JSON.stringify → open_encrypted_with_pass (AES-256)
→ user://save.dat (+ user://save.bak binário)
```
- Autosave com debounce 3s + flush em pause/exit.
- Migração: `while v < SAVE_VERSION: match v: ...` — pronto para v2.
- Anticheat: moedas negativas/caps, nível ≤ cap, fase ≥ 1; violações → clamp + toast + contagem.
- Corrupt/legado: checksum inválido → backup; ambos inválidos → novo jogo.

## 4. Performance (D07, FASE 15)
- Pooling: labels de dano flutuante (14), players de SFX (10), texturas cacheadas.
- Partículas: aura via sprites estáticos (sem GPUParticles em mobile low).
- Parallax: 3 camadas de silhueta geradas 1× por região (ImageTexture), movimento por posição.
- Renderer GL Compatibility → WebGL/Android sem pipeline pesado.
- Alvo 60 FPS: combate processa 1 inimigo ativo + ~40 nós de UI ativos.

## 5. Localização (D15)
`DataManager.tr_key("chave")` sobre `data/loc_ptbr.json` / `loc_en.json`; troca em runtime (Ajustes).

## 6. Testes
`tests/test_runner.tscn` — 111 asserções em 14 grupos (fórmulas, escalonamento, combate real simulado, itens/pity, gacha, offline/time-travel, save/load+anticheat, ascensão, modos, retenção, loop MVP). Execução:
```bash
godot --headless --path . res://tests/test_runner.tscn   # exit 0 = verde
```

## 7. Builds
`export_presets.cfg` inclui Android (AAB/APK), WebGL, Windows e Linux. Exportar pelo editor Godot 4.4.1 (export templates 4.4.1 necessários). WebGL: portrait ou landscape (stretch canvas_items + aspect keep).

## 8. Extensibilidade
- Conteúdo novo = editar JSON (regiões, inimigos, skills, itens, pets, eventos) — zero código.
- Sistema novo = novo autoload + signals no EventBus; UI = herdar PanelBase e registrar em UIManager.PANEL_CLASSES.
- Backend real = implementar `Platform` (cloud_push/cloud_pull, purchase, ads).
