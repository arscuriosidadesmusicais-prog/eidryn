# ☾ Eidryn — O Ciclo do Eclipse ☽
RPG Idle 2D Dark Fantasy original — Godot 4.4 — Mobile-first (portrait 1080×1920) + Web.

O Sol foi devorado por Velun. Você é um Marcado pelo Selo do Crepúsculo: lute, ascenda, renasça — cada ciclo te deixa mais forte.

## Como rodar
1. Instale [Godot 4.4.1](https://godotengine.org/download) (standard, sem .NET).
2. Abra o Godot → **Import** → selecione a pasta deste projeto (`project.godot`).
3. Pressione **F5** (ou o botão Play).

## Como testar (QA headless)
```bash
godot --headless --path . res://tests/test_runner.tscn   # 111 testes — exit 0 = verde
python3 tools/balance_sim.py                              # regenera docs/BALANCE.md
```

## Como exportar
`Project → Export…` — presets prontos: **Android (AAB/APK)**, **Web (WebGL)**, **Windows**, **Linux**. Requer export templates 4.4.1.

## Estrutura
```
data/       ← TODO o balanceamento (JSON) + localização PT/EN + tabela 1→500
scripts/core/  ← 19 singletons (dados/lógica)
scripts/ui/    ← apresentação (MainUI, CombatScreen, 10 painéis)
assets/     ← sprites 96×96 + músicas/SFX 100% originais sintetizados
docs/       ← GDD, BALANCE, TECHNICAL_DOC, ART_STYLE_GUIDE, TEST_REPORT,
              LAUNCH_CHECKLIST, DECISIONS, TODO_MASTER, CHANGELOG
tests/      ← suíte de QA automatizada
tools/      ← geradores (assets, áudio, balance)
```

## Destaques
- **500 fases + Abismo infinito**, 6 regiões, chefes de 30s a cada 10 fases
- **12 atributos** · **10 slots** × **7 raridades** · sets, reforço com pity, fusão
- **9 habilidades** (4 ativas + 4 passivas + Suprema) com auto-cast
- **10 pets/companheiros** com evolução por estrelas
- **Ascensão** com árvore permanente de 16 nós (reset parcial justo)
- **6 modos**: 3 masmorras, Torre Infinita, World Boss e Arena assíncronos
- **Gacha com pity transparente** 10/50/100 · 35 conquistas · passe · eventos
- **Offline 8h/12h** com proteção contra time-travel
- **F2P ético**: IAP/anúncios são stubs prontos para integração — nunca paywall
- Save **criptografado** com checksum, backup, migração e anticheat
- 111 testes automatizados verdes — veja `docs/TEST_REPORT.md`

## Licenças
Código, lore, arte e áudio: 100% originais deste projeto. Engine: Godot (MIT).
