# Eidryn — O Ciclo do Eclipse

RPG idle dark fantasy em **um único arquivo HTML** — sem servidor, sem build, sem dependências. Abra e jogue, online ou offline.

**▶ Jogar agora:** https://arscuriosidadesmusicais-prog.github.io/eidryn/

## Recursos

- 500 fases + Abismo infinito em 6 regiões temáticas (Bosque de Vidro, Pântano, Picos Uivantes, Deserto de Cinzas, Coração do Eclipse, Cidadela Pálida)
- 7 raridades de loot (Comum → Divina), 10 slots, 7 sets, reforço com pity e fusão
- 13 pets/companheiros animados por posturas (incl. Míticos e Divinos)
- Gacha transparente com pity 10/50/100
- Herói com 7 posturas animadas (idle/ataque/crítico/conjuração/ferido/vitória/derrota)
- Mundo vivo: biomas sazonais, clima dinâmico (chuva/tempestade/neve) com relâmpagos, poças refletivas, neblina densa no Pântano e áudio ambiente sintetizado (chuva, vento, trovão)
- Eventos ao vivo: Fim de Semana Dourado, Eclipse de Sangue, Caçada Abissal
- 3 masmorras, Torre, World Boss e Arena
- Missões, 39 conquistas, passe de batalha e árvore de ascensão
- Save automático local (SHA-256 + backup) — 100% offline

## Arquivos

- `download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html` — build v1.8.0 "Vigília Estelar" (arquivo único, ~3,4 MB)
- `download/publish/itch_kit/` — kit pronto para itch.io (zip jogável, capa, banner, screenshots, textos da página)
- `download/publish/github_pages/` — copiar `index.html` para qualquer host estático
- `eidryn/` — projeto Godot 4.4 original (fonte da verdade de dados e regras)
- `scripts/eidryn_html/` — pipeline de build do HTML (p00–p07) + suíte de testes (`test_node.js`, 214 asserções)
- `download/eidryn-o-ciclo-do-eclipse_v1.0.0_godot44.zip` — pacote-fonte Godot completo e validado

## Desenvolvimento

```bash
# rebuild do HTML a partir dos módulos
python3 scripts/eidryn_html/build.py

# suíte de testes (214 asserções)
node scripts/eidryn_html/test_node.js

# empacota e valida o projeto-fonte Godot
python3 scripts/package_godot.py
python3 scripts/test_package_godot.py

# publish no GitHub Pages (requer GH_TOKEN e GH_USER)
GH_TOKEN=... GH_USER=arscuriosidadesmusicais-prog GH_REPO=eidryn \
  bash scripts/eidryn_html/publish_github.sh
```

Regra de ouro do projeto: a camada audiovisual só assina eventos existentes do jogo — fórmulas, balanceamento e formato de save são intocados.
