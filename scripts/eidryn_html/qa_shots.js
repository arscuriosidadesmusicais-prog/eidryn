'use strict';
/* qa_shots.js — screenshots de vitrine para itch.io/GitHub Pages (v1.6.0) */
const { chromium } = require('playwright');
const FILE = 'file:///home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html';
const OUT = '/home/z/my-project/download/publish/itch_kit/screenshots/';
const dismiss = () => {
  var btns = document.querySelectorAll('#modal-root button');
  for (var i = 0; i < btns.length; i++) if (/Resgatar|Coletar/i.test(btns[i].textContent)) btns[i].click();
};

(async () => {
  const browser = await chromium.launch();

  /* ---------- PORTRAIT: batalha na tempestade (look clássico mobile) ---------- */
  const p1 = await browser.newContext({ viewport: { width: 390, height: 844 } }).then(c => c.newPage());
  await p1.goto(FILE); await p1.waitForTimeout(900);
  await p1.click('#btn-start'); await p1.waitForTimeout(700);
  await p1.evaluate(dismiss);
  await p1.evaluate(() => {
    E.Eco.add('essencia', 1e6);
    ['pet_raposa', 'filhote_devorador', 'oraculo_eclipse'].forEach(id => E.Pet.acquire(id));
    E.Pet.set_active('filhote_devorador'); E.Pet.set_active('oraculo_eclipse');
    if (E.Rfx.setPetVisuals) E.Rfx.setPetVisuals();
    E.Rfx.setWeatherPref('tempestade');
    E.Prog.jump_to_stage(3);
  });
  await p1.waitForTimeout(6500); // chuva estabelecida + poças crescendo
  await p1.screenshot({ path: OUT + '01_batalha_tempestade_portrait.png' });

  /* ---------- LANDSCAPE: painéis ---------- */
  const p2 = await browser.newContext({ viewport: { width: 1280, height: 720 } }).then(c => c.newPage());
  await p2.goto(FILE); await p2.waitForTimeout(900);
  await p2.click('#btn-start'); await p2.waitForTimeout(700);
  await p2.evaluate(dismiss);
  await p2.evaluate(() => {
    E.Eco.add('essencia', 1e6);
    ['pet_raposa', 'filhote_devorador', 'oraculo_eclipse', 'lobo_umbral', 'corvo_eclipse',
     'grilo_cristal', 'golem_filhote', 'serpente_brasas', 'fada_alvorecer',
     'cavaleiro_caido', 'arquivista', 'feiticeira_vazio', 'ferreiro'].forEach(id => E.Pet.acquire(id));
    E.Pet.set_active('filhote_devorador'); E.Pet.set_active('oraculo_eclipse');
    if (E.Rfx.setPetVisuals) E.Rfx.setPetVisuals();
    E.Rfx.setWeatherPref('chuva');
  });
  await p2.waitForTimeout(2500);
  // pets: ancora o scroll no card da Raposa (mostra os 3 novos + seção companheiros)
  await p2.evaluate(() => { E.UI.show('pets'); });
  await p2.waitForTimeout(400);
  await p2.evaluate(() => {
    window.__pin = setInterval(() => {
      var all = document.querySelectorAll('#panel-body h3, #panel-body div, #panel-body b, #panel-body span');
      var target = null;
      for (var i = 0; i < all.length; i++) {
        if (all[i].childElementCount === 0 && /Raposa de Vidro/.test(all[i].textContent)) { target = all[i]; break; }
      }
      if (target) target.scrollIntoView({ block: 'center' });
    }, 16);
  });
  await p2.waitForTimeout(120);
  await p2.screenshot({ path: OUT + '02_pets_novos_landscape.png' });
  await p2.evaluate(() => clearInterval(window.__pin));
  // summon
  await p2.evaluate(() => { E.UI.show('summon'); });
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: OUT + '03_portal_invocacao.png' });
  // masmorras
  await p2.evaluate(() => { E.UI.show('dungeons'); });
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: OUT + '04_masmorras.png' });
  // batalha landscape na chuva
  await p2.evaluate(() => { E.UI.show(null); });
  await p2.waitForTimeout(2500);
  await p2.screenshot({ path: OUT + '05_batalha_chuva_landscape.png' });

  await browser.close();
  // recorte da batalha landscape p/ a área do canvas (sem coluna vazia do painel)
  const { execSync } = require('child_process');
  execSync(`python3 -c "from PIL import Image; im=Image.open('${OUT}05_batalha_chuva_landscape.png'); im.crop((0,0,740,676)).save('${OUT}05_batalha_chuva_landscape.png')"`);
  console.log('screenshots ok');
})().catch(e => { console.error('CRASH', e); process.exit(1); });
