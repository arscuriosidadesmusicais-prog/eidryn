# Eidryn — O Ciclo do Eclipse (v1.8.0 "Vigília Estelar")

RPG idle dark fantasy em **um único arquivo HTML** — sem servidor, sem build, sem dependências.
Abra o `index.html` em qualquer navegador (desktop ou celular). Funciona offline.

- 500 fases + Abismo infinito (6 regiões temáticas + Abismo de Velun)
- 7 raridades de loot (Comum → Divina) com sets e reforço
- 8 pets + 5 companheiros animados (incl. Míticos/Divinos)
- Gacha com pity transparente (10/50/100)
- Clima dinâmico (chuva/tempestade/neve) com poças reflexivas, neblina e áudio sintetizado
- Eventos ao vivo (Fim de Semana Dourado, Eclipse de Sangue, Caçada Abissal)
- Save automático local (SHA-256 + backup) — 100% offline

## Deploy no GitHub Pages (opção A — Pages pela branch)

```bash
# 1) Crie um token em github.com/settings/tokens (escopo "repo" + "workflow")
export GH_TOKEN=ghp_SEU_TOKEN
export GH_USER=arscuriosidadesmusicais-prog
export GH_REPO=eidryn

# 2) Rode o script de publish (a partir da raiz do projeto):
bash scripts/eidryn_html/publish_github.sh
```

O script cria/atualiza o repositório, envia o jogo como `index.html` na branch
`gh-pages` e ativa o Pages via API. O jogo fica em:
`https://<GH_USER>.github.io/<GH_REPO>/`

## Deploy no GitHub Pages (opção B — manual, sem script)

1. Crie o repositório no GitHub (Settings → Pages → Source: `gh-pages` branch).
2. `git clone` seu repo, copie `index.html` para a raiz, faça push na branch `gh-pages`:

```bash
git checkout --orphan gh-pages
cp /caminho/para/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html index.html
git add index.html && git commit -m "Eidryn v1.8.0" && git push origin gh-pages
```

## itch.io

Use o kit em `publish/itch_kit/` — instruções completas em `COMO_PUBLICAR.md`.
