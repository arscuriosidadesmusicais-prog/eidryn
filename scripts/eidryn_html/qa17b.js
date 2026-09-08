'use strict';
/* qa17b.js — shots de avaliação visual dedicados (coroa do eclipse limpa,
   placa de região, aura reforçada) sem sobreposição da intro de chefe. */
const { chromium } = require('playwright');
const FILE = 'file:///home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html';
const OUT = '/home/z/my-project/scripts/eidryn_html/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(FILE); await page.waitForTimeout(1100);
  await page.click('#btn-start'); await page.waitForTimeout(800);
  await page.evaluate(() => {
    var btns = document.querySelectorAll('#modal-root button');
    for (var i = 0; i < btns.length; i++) if (/Resgatar|Coletar/i.test(btns[i].textContent)) btns[i].click();
    E.Rfx.perfMode = 'high'; E.Rfx.lowFx = false;
  });
  await page.waitForTimeout(300);

  // 1) Abismo: coroa total + placa de região (sem intro de chefe)
  await page.evaluate(() => { E.Rfx.setRegion('abismo'); E.Rfx.bossIntroT = 0; });
  await page.waitForTimeout(420); // placa ainda visível (~2s restantes), coroa no céu
  await page.screenshot({ path: OUT + 'qa17b_abismo_placa.png' });

  // 2) Coroa em fase média (Coração do Eclipse, ph=5/6) sem placa
  await page.evaluate(() => { E.Rfx.setRegion('coracao'); E.Rfx.regionTitleT = 0; });
  await page.waitForTimeout(900); // placa expira; coroa fase 0.83
  await page.screenshot({ path: OUT + 'qa17b_coracao_corona.png' });

  // 3) Aura Divina reforçada no Bosque
  await page.evaluate(() => {
    E.Rfx.setRegion('bosque_vidro'); E.Rfx.regionTitleT = 0;
    E.Rfx._prevEq = E.Inv.equipped;
    E.Inv.equipped = { arma: { id: 'qa', rarity: 'divina' }, capa: { id: 'qa2', rarity: 'lendaria' } };
    E.Rfx._auraOrder = -1;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + 'qa17b_aura_divina.png' });

  // restauração
  await page.evaluate(() => {
    E.Inv.equipped = E.Rfx._prevEq; delete E.Rfx._prevEq; E.Rfx._auraOrder = -1;
  });
  await browser.close();
  console.log('qa17b shots ok');
})();
