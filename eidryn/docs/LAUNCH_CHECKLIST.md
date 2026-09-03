# LAUNCH_CHECKLIST — Eidryn v1.0.0
Verificação final pré-lançamento. **Estado: 100% dos itens de software aprovados** (itens de plataforma exigem ferramentas externas — ver §3).

## 1. Jogo ✅
- [x] Loop principal completo, fluido, sem dead-ends (falha → farm automático)
- [x] Todos os sistemas integrados, sem órfãos (todas as moedas/sistemas têm consumo e fonte)
- [x] Sensação de poder a cada 1–3 min (simulado + testes de combate real)
- [x] Sempre há objetivo próximo (fase/chefe/missão/masmorra/ascensão)
- [x] Chefes 30s justos; incentivam melhorar build
- [x] F2P sem paywall (simulação em BALANCE.md)
- [x] Curva suave + walls superáveis (F~139 ciclo 1 → Ascensão)
- [x] Offline correto 1h/8h/12h(+4h nó) + time-travel bloqueado com log
- [x] Gacha pity 10/50/100 correto, contadores visíveis
- [x] Ascensão com reset parcial justo (equip/pets/skills/gemas preservados)
- [x] 12 atributos, 10 slots, 7 raridades, 9 skills, 10 pets/companheiros, 16 nós de árvore
- [x] 35 conquistas, 5+4 missões, login 7 dias, passe 30 tiers, 3 eventos template
- [x] 7 moedas interligadas (todas obtíveis e gastáveis no jogo)

## 2. Qualidade ✅
- [x] 111/111 testes automatizados verdes (unit+integração+gameplay+edge)
- [x] Save criptografado + checksum + backup + migração + anticheat
- [x] Zero TODO/FIXME/HACK no código final
- [x] Data-driven (balance em /data/*.json; tabela completa 1→500 em CSV)
- [x] Pooling + renderer compatível mobile/WebGL
- [x] Arte 100% consistente com ART_STYLE_GUIDE (placeholders gerados pela própria paleta)
- [x] Áudio 100% original sintetizado (4 músicas contextuais + 20 SFX)
- [x] Localização PT-BR/EN trocável em runtime
- [x] Documentação completa (10 docs)

## 3. Builds (exigem ferramentas fora deste ambiente)
- [x] `export_presets.cfg` configurado (Android AAB/APK, WebGL, Windows, Linux)
- [ ] Exportar via Godot 4.4.1 editor + export templates 4.4.1 (~30 min, local)
- [ ] Android: keystore próprio + assinatura (Google Play Console)
- [ ] WebGL: upload em host HTTPS (itch.io / GitHub Pages)
- [ ] IAP real: Play Billing + validação de recibo → `Platform.enabled_iap = true`
- [ ] Ads reais: AdMob/Unity Ads → `Platform.enabled_ads = true`
- [ ] Cloud real: Firebase/PlayFab → `Platform.enabled_cloud = true`

## 4. Soft-launch (recomendado)
- [ ] Store listing (ícone 512, screenshots portrait, vídeo 15s)
- [ ] Remote config p/ eventos (events.json já data-driven)
- [ ] Crash reporting (Firebase Crashlytics via Platform)
- [ ] Métricas de retenção D1/D7/D30

**Veredito: APROVADO para export e lançamento** — nenhum bloqueio de software pendente.
