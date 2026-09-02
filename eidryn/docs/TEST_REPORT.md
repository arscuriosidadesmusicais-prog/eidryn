# TEST_REPORT — Eidryn: O Ciclo do Eclipse
Execução: Godot 4.4.1 headless | Suíte: `tests/test_runner.tscn` | **Resultado final: 111 PASS / 0 FAIL (exit 0)**

## 1. Resumo por grupo (14 grupos, 111 asserções)
| Grupo | Asserções | Status |
|---|---|---|
| Fórmulas obrigatórias | 9 | ✅ |
| Escalonamento + soft-cap | 11 | ✅ |
| Personagem (12 atributos, PC) | 6 | ✅ |
| Combate (loop real simulado) | 4 | ✅ |
| Itens/Loot | 11 | ✅ |
| Reforço pity | 2 | ✅ |
| Habilidades | 7 | ✅ |
| Pets | 8 | ✅ |
| Gacha pity 10/50/100 | 5 | ✅ |
| Offline + time-travel | 8 | ✅ |
| Save/Load + anticheat | 7 | ✅ |
| Ascensão | 9 | ✅ |
| Modos | 6 | ✅ |
| Retenção | 8 | ✅ |

## 2. Cobertura por requisito (Seção 9 do GDD)
- **Unit**: dano final (composição exata 237.6), DEF 100→50%, lifesteal 15%, crit 100%/0%, custos exponenciais, XP, PC — ✅
- **Escalonamento**: HP=base×1.12^F exato em F1/F10; ATK=×1.09^50 exato; soft-cap F400+ (F500 = 14.55% da exponencial pura; nunca regride; crescimento pós-400 < pré-400) — ✅
- **Integration**: inventário+equip, combate+skills, loot+desmonte, ascensão+árvore — ✅
- **Gameplay (loop MVP)**: farmar → loot → auto-equipar → ficar forte → salvar → reabrir → offline pendente → coletar — ✅
- **Balance simulation**: `tools/balance_sim.py` — F2P 120 min: F10 ~1min, F50 ~1min, F100 ~6min, wall ciclo-1 em F~139-149 superável por farm (PC cresce 2.7T→24T parado no wall) e Ascensão; soft-cap F400+ validado — ✅
- **Offline**: 1h = 3600s corretos; cap 8h respeitado; premium/12h (código) + nó n15 (+4h); time-travel → 0 recompensa + registro em `tt_log` — ✅
- **Save/Load**: roundtrip nível/ouro/fase idênticos; backup em corrupção; checksum detecta payload alterado; migração v1 — ✅
- **Anticheat**: moeda negativa → revertida a 0 com toast — ✅
- **Edge cases**: chefe no fim do timer → fail → retorno ao farm (D19); reforço com pity (sucesso garantido ≤12 falhas; item nunca destruído); inventário com filtro; chefe morto dentro do tempo → win priorizado — ✅
- **Performance**: renderer GL Compatibility; pooling de labels/SFX/texturas; 1 inimigo ativo + UI leve → alvo 60 FPS em mobile médio (arquitetura verificada; FPS real depende do device) — ✅ (analítico)

## 3. Playtest simulado (15–30 min equivalentes)
Simulação densa de 120 min (`balance_sim.py`) + 60s de combate real executado no engine (testes COMBATE/MVP):
- Progressão sentida a cada 1–3 min ✅ (F1→F100 nos primeiros ~6 min ativos, depois farm com crescimento de PC contínuo)
- Sempre há objetivo próximo ✅ (próxima fase / chefe / missão / masmorra / ascensão)
- Chefes de 30s justos ✅ (farm de minutos quebra cada wall; falha não pune progresso máximo)

## 4. Defeitos encontrados e corrigidos durante o desenvolvimento
1. Linha de fórmula corrompida em `enemy_stats_for_stage` → reescrita e validada exatamente contra `base×1.12^F`.
2. `enemy_hp` não inicializado no spawn → inimigos imortais; corrigido (`enemy_hp = _enemy_max_hp()`).
3. `_auto_cast()` nunca chamado no loop → auto-cast inerte; conectado ao `_process`.
4. Duplo evento (win+fail) em morte explosiva → guard `return` após `_hero_down()`.
5. ProgressionManager reagia a vitórias de modos custom → guard por `mode == "campaign"`.
6. Falha de chefe não reiniciava combate → `_restart_pending` + respawn automático no farm (D19).
7. **Checksum de save quebrado**: `JSON.stringify` reformata floats no roundtrip → falso-negativo → save "corrompido". Fix: checksum sobre `data_json` bruto (string), imune a reformatação.
8. Backup do save lido como UTF-8 (mangle de bytes criptografados) → cópia binária (`get_buffer`).
9. `Texture2` (tipo do Godot 3) → `Texture2D`; inferências `:=` sobre Variant → tipagem explícita.
10. Atributos flat não acompanhavam 1.12^F (walls impossíveis) → **D21**: efeitos multiplicativos + custos recalibrados (1.065) — validado por simulação.

## 5. Verificação de placeholders
`grep -r "TODO\|FIXME\|HACK\|XXX" scripts/` → **0 ocorrências**. Stubs IAP/Ads/Cloud são intencionais (D14) e documentados.
