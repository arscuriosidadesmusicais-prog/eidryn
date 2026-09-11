# Publicar o Eidryn no itch.io — passo a passo (5 minutos)

O jogo é **um único HTML** — no itch.io ele roda nativamente no navegador
(upload tipo "HTML", jogável direto na página, desktop e mobile).

## 1. Criar o projeto
1. Acesse `itch.io` → login → **Dashboard → Create new project**.
2. **Title**: `Eidryn — O Ciclo do Eclipse`
3. **URL**: `seu-user.itch.io/eidryn` (sugestão)
4. **Kind of project**: `HTML` (playable in the browser).

## 2. Upload
1. Em **Version files**, envie o arquivo `Eidryn_O_Ciclo_do_Eclipse_v1.8.0.zip`
   (este kit; contém o `index.html` na raiz do zip — exigência do itch).
2. Marque **This file will be played in the browser**.
3. **Viewport**: `960×640` (o jogo é responsivo; essa é uma boa moldura).
   ✅ Marque **Mobile friendly** e **Automatically go fullscreen** (fullscreen on launch).
4. **Save** → o jogo já está jogável na página do projeto.

## 3. Página da loja (copie de PAGINA_itch.md)
- **Cover** (630×500): `cover_630x500.png`
- **Banner** (460×215): `banner_460x215.png`
- **Screenshots**: pasta `screenshots/` (5 imagens)
- **Description**: copie o HTML/Markdown de `PAGINA_itch.md` (PT-BR + EN).
- **Classification**: Games · **Genre**: Idle / RPG · **Audience**: 12+
- **Tags**: `idle`, `idle-game`, `dark-fantasy`, `rpg`, `gacha`, `pixel-art`, `incremental`, `single-file`
- **Price**: Free (com **Donate** opcional — recomendado para F2P consciente).

## 4. Publicar
**View page** → confira → **Publish** (canto inferior). Pronto: o jogo está no ar
com comentários e métricas nativas do itch.

---
### Checklist de qualidade (validado na v1.8.0)
- [x] Sintaxe JavaScript e build standalone validados
- [x] Save automático local protegido e formato retrocompatível (`SAVE_VERSION = 1`)
- [x] Funciona offline (sem CDN/requests externos — todos os assets embutidos)
- [x] Testes automatizados: 240/240 + 12/12 métricas Canvas + 269/269 assets
- [x] Canvas 9:16 com `contain`/letterbox, sem corte em portrait, landscape ou ultrawide
