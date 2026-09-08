#!/usr/bin/env bash
# publish_github.sh — publica o Eidryn no GitHub Pages em um comando.
# Requisitos: GH_TOKEN (fine-grained com permissão de repo), git, curl.
# Uso: GH_TOKEN=ghp_xxx GH_USER=seu-user GH_REPO=eidryn bash publish_github.sh
set -euo pipefail

GH_TOKEN="${GH_TOKEN:?Defina GH_TOKEN}"
GH_USER="${GH_USER:?Defina GH_USER}"
GH_REPO="${GH_REPO:-eidryn}"
GAME="${GAME:-/home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html}"
API="https://api.github.com"
AUTH="Authorization: Bearer ${GH_TOKEN}"

echo "▶ 1/4 — garantindo repositório ${GH_USER}/${GH_REPO}..."
CODE=$(curl -s -o /tmp/gh_repo.json -w '%{http_code}' -H "$AUTH" "${API}/repos/${GH_USER}/${GH_REPO}")
if [ "$CODE" != "200" ]; then
  curl -s -X POST -H "$AUTH" -H "Accept: application/vnd.github+json" \
    -d "{\"name\":\"${GH_REPO}\",\"description\":\"Eidryn — O Ciclo do Eclipse: RPG idle dark fantasy em 1 arquivo HTML\",\"private\":false,\"has_wiki\":false}" \
    "${API}/user/repos" > /dev/null
  echo "  repo criado."
else
  echo "  repo já existe."
fi

WORK=$(mktemp -d)
cd "$WORK"
git init -q -b gh-pages
cp "${GAME}" index.html
git add index.html
git -c user.name="${GH_USER}" -c user.email="${GH_USER}@users.noreply.github.com" \
  commit -q -m "Eidryn v1.7.0 'Herdeiro do Eclipse' — intro de chefe, eclipse progressivo, hit-stop, aura de raridade"
echo "▶ 2/4 — enviando gh-pages..."
git push -q -u "https://x-access-token:${GH_TOKEN}@github.com/${GH_USER}/${GH_REPO}.git" gh-pages --force

echo "▶ 3/4 — ativando GitHub Pages (branch gh-pages, raiz)..."
curl -s -X POST -H "$AUTH" -H "Accept: application/vnd.github+json" \
  -d '{"source":{"branch":"gh-pages","path":"/"}}' \
  "${API}/repos/${GH_USER}/${GH_REPO}/pages" > /dev/null || true
# se já existia, apenas garante a fonte
curl -s -X PUT -H "$AUTH" -H "Accept: application/vnd.github+json" \
  -d '{"source":{"branch":"gh-pages","path":"/"}}' \
  "${API}/repos/${GH_USER}/${GH_REPO}/pages" > /dev/null || true

echo "▶ 4/4 — pronto! Aguarde ~1 min e acesse:"
echo "    https://${GH_USER}.github.io/${GH_REPO}/"
