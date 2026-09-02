# DECISIONS.md — Registro de Decisões de Projeto
Projeto: **Eidryn — O Ciclo do Eclipse** | Estúdio autônomo | SAVE_VERSION: 1 | GAME_VERSION: 1.0.0

## Lore Original (resumo)
Eidryn é um mundo onde o Sol foi devorado pelo Devorador Velun, iniciando o **Ciclo do Eclipse**: a cada mil anos, a luz morre e o mundo é consumido pelas Sombras. Heróis marcados pelo **Selo do Crepúsculo** retornam ciclo após ciclo — cada "Ascensão" do jogo é, na lore, o herói encerrando um ciclo e renascendo mais forte no próximo. As 6 regiões são os reinos remanescentes de Eidryn; o **Abismo de Velun** é a fenda infinita de onde as Sombras emergem. Nenhum nome, texto ou arte é derivado de obra terceira.

## Decisões de Arquitetura
| # | Decisão | Justificativa |
|---|---------|---------------|
| D01 | Godot 4.4 (GDScript), renderer `gl_compatibility` | Compatível com WebGL/Android/desktop; idle games não precisam de features Forward+ |
| D02 | Data-driven: todo balance em `/data/*.json`; código nunca hardcode valores de jogo | Balanceamento iterável sem recompilar; validado por simulação |
| D03 | UI construída programaticamente (Control +anchors) em vez de .tscn grandes | Menor risco de corrupção de cena, versionamento limpo, responsividade por código |
| D04 | Singletons/autoload na ordem de dependência (EventBus → dados → lógica → apresentação) | Ordem de inicialização determinística |
| D05 | Save: JSON → checksum SHA256 → compressão → `open_encrypted_with_pass` (AES-256 CFB via FileCrypto do Godot) | Integridade + criptografia leve; migração por `SAVE_VERSION` |
| D06 | Anticheat básico: validação de limites (moedas ≥0, nível ≤ cap, PC coerente com fase) + checksum | Bloqueia edits casuais de save; server-authoritative fica para a camada cloud (stub) |
| D07 | Object pooling para inimigos, números de dano e partículas | Alvo 60 FPS em mobile médio |
| D08 | Soft-cap: expoente efetivo g(F)=F até F≤400; depois 400+(F-400)·(0.4+0.6·e^(-(F-400)/300)) | Crescimento suaviza gradualmente pós-F400 sem "parede" abrupta |
| D09 | Poder de Combate PC = Σ(atributo × peso) com pesos em `data/attributes.json` | PC visível, auditável e alinhado ao dano simulado |
| D10 | Gacha pity 10/50/100 com contadores persistentes e visíveis | Transparência F2P ética |
| D11 | Reforço +1→+20: chance de falha crescente, pity garante sucesso no limite; falha NÃO destrói | F2P ético |
| D12 | Offline: rendimento = rendimento/seg da fase de farm × tempo (cap 8h; 12h com premium stub); time-travel → 0 recompensa + log | Padrão de mercado, proteção de exploit |
| D13 | Arena/World Boss assíncronos: snapshots (build do herói) vs bots gerados por PC-alvo | Sem backend em tempo real |
| D14 | IAP/Ads/Cloud = `Stubs/` com interface pronta (`PlatformProvider`) e flag `ENABLED=false` | Integração futura sem refatoração |
| D15 | Localização: `Loc.tr("chave")` sobre dicionário PT-BR/EN em `data/loc_ptbr.json`, `data/loc_en.json` | i18n pronto sem custo agora |
| D16 | Áudio 100% sintetizado (ondas/noise) — original, sem copyright | Sem assets de terceiros |
| D17 | Arte: placeholders pixel art 96×96 gerados por script com paleta do ART_STYLE_GUIDE | Consistência visual imediata; substituível por arte final |
| D18 | Escalonamento exato: HP=base×1.12^F, ATK=base×1.09^F, Ouro=base×1.10^F, XP=base×1.08^F (com D08 pós-400) | Requisito do design doc |
| D19 | Chefes: timer 30s; falha → volta a farmar a fase-1 da região sem perder progresso máximo | Loop sem dead-end |
| D20 | Regiões (500 fases): Bosque de Vidro Negro 1–83, Pântano das Lamentações 84–166, Cidadela Rachada 167–249, Deserto de Cinzas 250–332, Picos Uivantes 333–416, Coração do Eclipse 417–500; Abismo de Velun 501+ | Distribuição uniforme + modo infinito |
| D21 | Atributos do herói com efeitos **multiplicativos** (Força +7% ATK/pt, Vitalidade +6% HP/+2.5% DEF/pt, Defesa +2.5% DEF/pt) e custo exponencial 1.065/pt | Simulação provou que stats flat não acompanham 1.12^F (walls impossíveis pós-F50). Multiplicativos: herói cresce ~1.11^F — walls naturais superáveis (wall do ciclo 1 em F~139, exatamente a era da Ascensão F100+). Validado em BALANCE.md |
| D22 | Checksum do save calculado sobre a string `data_json` bruta (não sobre JSON re-serializado) | Godot reformata floats no roundtrip JSON → falso-negativo de integridade; string bruta é imune |
| D23 | Backup do save copiado em binário (`get_buffer`), nunca como texto | Leitura UTF-8 de bytes criptografados corrompia o backup |
