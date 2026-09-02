# TODO_MASTER — Eidryn: O Ciclo do Eclipse
Estado das 15 fases do plano de produção. **Todas concluídas** (QA 111/111).

| Fase | Escopo | Estado | Notas |
|---|---|---|---|
| 0 | Setup & decisões | ✅ | Estrutura, DECISIONS.md (21 decisões), Godot 4.4.1 validado |
| 1 | Fundação | ✅ | 19 autoloads, EventBus (~40 signals), save criptografado+migração+anticheat |
| 2 | Combate automático | ✅ | Crítico/def/lifesteal/esquiva, 6 modificadores, DOT/escudo/buff, dano flutuante, parallax |
| 3 | Fases/Progressão | ✅ | 500 fases, 6 regiões + Abismo, chefes 30s, soft-cap F400, balance_table.csv (500 linhas) |
| 4 | Personagem | ✅ | 12 atributos multiplicativos (D21), nível/XP, PC em tempo real |
| 5 | Equipamentos/Loot | ✅ | 10 slots, 7 raridades, affixes, 4 sets, reforço +20 pity 12, fusão, filtros, auto-equip/desmonte |
| 6 | Habilidades | ✅ | 4 ativas + 4 passivas + 1 suprema, auto-cast, tooltips Atual/Próximo, evolução |
| 7 | Pets/Companheiros | ✅ | 6 pets + 4 companheiros, 1+1 ativos, evolução 1–5★ |
| 8 | Offline | ✅ | 8h/12h(+4h), coleta + dobro (stub), time-travel bloqueado com log |
| 9 | Ascensão | ✅ | F100, árvore 16 nós (3 ramos), reset parcial |
| 10 | Modos | ✅ | 3 masmorras, Torre Infinita, World Boss assíncrono, Arena assíncrona + loja da Glória |
| 11 | Retenção | ✅ | Missões D/W, 35 conquistas, login 7d, gacha pity 10/50/100, passe 30 tiers, 3 eventos |
| 12 | Economia | ✅ | 7 moedas, F2P viável (simulado), sem paywall |
| 13 | UI/UX + Juice | ✅ | 8 painéis + missões/ajustes, tooltips, loot feedback, screenshake, glow por raridade |
| 14 | Áudio | ✅ | 4 músicas contextuais + 20 SFX sintetizados, volumes salvos |
| 15 | Polish/Builds | ✅ | Pooling, localização PT/EN, export_presets (Android/Web/Win/Linux), stubs IAP/ads/cloud |

## Pós-v1.0 (backlog não bloqueante)
- [ ] Arte final substituindo placeholders (mesmos paths, 96×96)
- [ ] Trilha musical expandida (variações por região)
- [ ] Mais 2 regiões do Abismo (F501+ já escala infinitamente)
- [ ] Ranking global real (após backend cloud)
- [ ] Integração IAP/Ads/Cloud real (Platform stub pronto)
