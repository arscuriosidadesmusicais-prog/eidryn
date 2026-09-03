# CHANGELOG — Eidryn: O Ciclo do Eclipse

## [1.0.0] — Lançamento inicial
### Adicionado
- Combate idle automático completo: crítico, defesa, lifesteal, esquiva, dano flutuante com pool, barras com ghost trail, screenshake, parallax por região.
- 500 fases + Abismo de Velun infinito; 6 regiões originais; chefe a cada 10 fases (timer 30s); miniboss a cada 5; modificadores de inimigo (escudo, cura, berserk <30%, explosão, elusivo, reforçado).
- Soft-cap oficial a partir da F400 (expoente efetivo decrescente).
- Personagem: 12 atributos multiplicativos, nível ≤300, PC ponderado em tempo real.
- Equipamentos: 10 slots, 7 raridades, primário + 0–4 secundários, 4 sets, reforço +1→+20 com pity 12 (falha não destrói), fusão por fragmentos, inventário com filtros/auto-equipar/auto-desmontar/favoritar/bloquear.
- Habilidades: 4 ativas + 4 passivas + 1 Suprema (Cataclismo de Eidryn), auto-cast, evolução no nível 10, tooltips Atual→Próximo.
- Pets: 6 pets + 4 companheiros, ativos 1+1, evolução 1–5★ por fragmentos, duplicados convertidos.
- Offline: 8h grátis / 12h premium / +4h nó; coleta com dobrar (anúncio stub); time-travel → 0 recompensa + log.
- Ascensão: desbloqueio F100, Fragmentos de Alma, Árvore do Ciclo (16 nós, 3 ramos), reset parcial.
- Modos: Masmorra de Ouro/XP/Equipamentos, Torre Infinita, World Boss assíncrono (rank vs bots), Arena dos Ecos (espelho vs bots) + loja da Glória.
- Retenção: 5 missões diárias + 4 semanais, 35 conquistas, login 7 dias, gacha com pity 10/50/100 visível, passe de batalha 30 tiers, 3 eventos template.
- Economia: 7 moedas (Ouro, Gemas, Fragmentos de Alma, Fragmentos de Equipamento, Chaves, Essência, Glória).
- Save: JSON criptografado AES + SHA256 sobre payload bruto + backup binário + migração + anticheat.
- UI: portrait 1080×1920, menu inferior com 8 telas + missões/ajustes, toasts, popups (offline/login/gacha), localização PT-BR/EN runtime.
- Áudio 100% original sintetizado: 4 músicas contextuais (menu/combate/chefe/masmorra) + 20 SFX; buses Music/SFX com volumes salvos.
- Assets: sprites/ícones 96×96 gerados programaticamente na paleta do ART_STYLE_GUIDE (100% originais).
- QA: suíte de 111 testes (14 grupos) rodando headless; simulador de balance com tabela 1→500 (CSV) e análise F2P.
- Stubs prontos: IAP, anúncios recompensados, cloud (Platform autoload).

### Corrigido (durante o desenvolvimento — ver TEST_REPORT §4)
- Checksum de save imune à reformatação de floats do JSON.
- Backup de save em cópia binária (sem mangle UTF-8).
- Inimigo com HP inicial; auto-cast integrado ao loop; duplo evento em morte explosiva; reinício automático após falha de chefe; guard de modo no ProgressionManager; tipo Texture2D; atributos multiplicativos (D21) para walls superáveis.
