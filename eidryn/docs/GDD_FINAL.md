# GDD_FINAL — Eidryn: O Ciclo do Eclipse
RPG Idle 2D Dark Fantasy | Godot 4.4 | Portrait 1080×1920 (+ Landscape Web) | v1.0.0

## 1. Visão
Em Eidryn, o Sol foi devorado por **Velun, o Devorador**, e o mundo vive o **Ciclo do Eclipse**: a cada mil anos, as Sombras consomem os reinos remanescentes. O jogador é um **Marcado pelo Selo do Crepúsculo** — um herói que renasce ciclo após ciclo, mais forte a cada reinício. A Ascensão é a mecânica central transformada em narrativa: encerrar o ciclo é renascer.

**Pilares de design:**
1. **Progresso sempre visível** — dano flutuante, barras animadas, PC em tempo real, sensação de poder a cada 1–3 min.
2. **Nunca há dead-end** — falha no chefe = farm com recompensas; sempre há um objetivo próximo.
3. **F2P ético** — IAP/anúncios compram conveniência, nunca poder obrigatório.
4. **100% original** — lore, nomes, arte, áudio próprios.

## 2. Loop principal
```
Combate automático (fase F) → ouro + XP + drops →
  upgrades (12 atributos) + equipamentos (10 slots) + skills →
    fase F+1 … chefe a cada 10 (timer 30s) →
      falha → farm na fase anterior → wall (≈F140 ciclo 1) →
        ASCENSÃO (F100+) → Fragmentos de Alma → Árvore do Ciclo →
          próximo ciclo mais forte → Abismo infinito (F501+)
```
Modos paralelos: Masmorras (Ouro/XP/Equipamentos), Torre Infinita, World Boss semanal (assíncrono), Arena diária (assíncrona), Portal (gacha), Missões/Conquistas/Passe.

## 3. Sistemas
| Sistema | Regras resumidas | Detalhes |
|---|---|---|
| Combate | Automático; crítico, DEF, lifesteal, esquiva, modificadores de inimigo | FASE 2; fórmulas exatas em BALANCE.md |
| Progressão | 500 fases + Abismo infinito; 6 regiões; chefe F%10==0 (30s); miniboss F%5 | FASE 3; soft-cap F400 |
| Personagem | 12 atributos multiplicativos; nível ≤300; PC ponderado em tempo real | FASE 4 |
| Equipamentos | 10 slots; 7 raridades (Comum→Divina); primário + 0–4 secundários; 4 sets; reforço +1→+20 com pity 12 (falha não destrói); fusão por fragmentos | FASE 5 |
| Habilidades | 4 ativas + 4 passivas + 1 Suprema; nível ≤20; evolução no nível 10; auto-cast | FASE 6 |
| Pets | 6 pets + 4 companheiros; 1+1 ativos; evolução 1–5★ por fragmentos | FASE 7 |
| Offline | 8h grátis / 12h premium (+4h nó n15); rendimento da fase de farm; time-travel = 0 recompensa + log | FASE 8 |
| Ascensão | Desbloqueio F100; fragmentos = floor((farm/10)^1.35)+chefes; árvore de 16 nós em 3 ramos; reset parcial | FASE 9 |
| Modos | 3 masmorras, Torre (×1.15/andar), World Boss (dano 30s, rank vs bots), Arena (espelho vs bots) | FASE 10 |
| Retenção | 5 diárias + 4 semanais; 35 conquistas; login 7 dias; gacha pity 10/50/100 visível; passe 30 tiers; 3 eventos template | FASE 11 |
| Economia | 7 moedas interligadas; ouro abundante cedo/escasso no alto; F2P viável sem paywall | FASE 12 |

## 4. Regiões de Eidryn
1. **Bosque de Vidro Negro** (F1–83) — árvores que sussurram o primeiro eclipse.
2. **Pântano das Lamentações** (F84–166) — onde as almas afundam lembrando seus nomes.
3. **Cidadela Rachada** (F167–249) — a capital que resistiu ao segundo eclipse. E perdeu.
4. **Deserto de Cinzas** (F250–332) — cinzas de tudo que queimou no terceiro eclipse.
5. **Picos Uivantes** (F333–416) — montanhas que uivam com almas presas na neve.
6. **Coração do Eclipse** (F417–500) — onde o Sol tocou o Devorador.
7. **Abismo de Velun** (F501+) — infinito, sem fim, com recompensas à altura.

## 5. Monetização (stubs prontos)
- **IAP**: gemas (100/605/1440), Premium mensal (+4h offline, +10% ouro, selo), Passe premium.
- **Anúncios recompensados**: dobrar offline, gemas diárias, segunda chance no chefe (fallback dev = concede sem anúncio).
- Tudo via `Platform` (autoload stub) — trocar `enabled_iap/ads` e plugar Play Billing/AdMob/Firebase.
- Nada compra poder obrigatório: a campanha é 100% jogável F2P (simulado em BALANCE.md).

## 6. Público e sessão
- Público: fãs de idle/RPG mobile, sessões curtas.
- Sessão alvo: 3–10 min ativos; progresso offline contínuo.
- Sensação de poder: a cada 1–3 min (validado por simulação + playtest).

## 7. Definição de experiência
Abre o jogo → combate acontece sozinho e é bonito de assistir → números crescem → loot raro brilha → um botão sempre oferece o próximo passo → fecha o jogo sabendo que o Selo continua lutando.
