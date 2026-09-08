'use strict';
/* qa16_probe.js — probe de pixels: novos pets cênicos visíveis no canvas? */
const { chromium } = require('playwright');
const FILE = 'file:///home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(FILE);
  await page.waitForTimeout(900);
  await page.click('#btn-start');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    var btns = document.querySelectorAll('#modal-root button');
    for (var i = 0; i < btns.length; i++) if (/Resgatar|Coletar/i.test(btns[i].textContent)) btns[i].click();
    E.Eco.add('essencia', 1e6);
    ['pet_raposa', 'filhote_devorador', 'oraculo_eclipse'].forEach(id => E.Pet.acquire(id));
    E.Pet.set_active('filhote_devorador');
    E.Pet.set_active('oraculo_eclipse');
    if (E.Rfx.setPetVisuals) E.Rfx.setPetVisuals();
    // garante estado visível: pose idle, sem fade
    if (E.Rfx.petAnim) { E.Rfx.petAnim.pose = 'idle'; E.Rfx.petAnim.f = 0; }
  });
  await page.waitForTimeout(1200);
  const probe = await page.evaluate(() => {
    var cv = document.getElementById('game-canvas') || document.querySelector('canvas');
    var ctx = cv.getContext('2d');
    var w = cv.width, h = cv.height;
    function region(x, y, rw, rh) {
      var d = ctx.getImageData(x, y, rw, rh).data;
      var lit = 0, gold = 0, total = rw * rh;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 8 && (d[i] + d[i + 1] + d[i + 2]) > 60) lit++;
        if (d[i] > 190 && d[i + 1] > 160 && d[i + 2] < 200 && d[i + 2] > 90) gold++; // ouro pálido
      }
      return { lit: lit / total, gold: gold };
    }
    // pet aos pés: ret (196,694,76,76); companheiro: ret (6,589,176,176) — mas o herói cobre parte
    return {
      canvas: w + 'x' + h,
      petFoot: region(196, 694, 76, 76),
      comp: region(6, 589, 176, 176),
      petKey: E.Rfx.petKey, compKey: E.Rfx.compKey
    };
  });
  console.log('canvas:', probe.canvas, '| petKey:', probe.petKey, '| compKey:', probe.compKey);
  console.log('pet aos pés  (lit %, px dourados):', (probe.petFoot.lit * 100).toFixed(1) + '%', probe.petFoot.gold);
  console.log('companheiro  (lit %, px dourados):', (probe.comp.lit * 100).toFixed(1) + '%', probe.comp.gold);
  const okPet = probe.petFoot.lit > 0.10 && probe.petFoot.gold > 3;   // corona/olho dourado do devorador
  const okComp = probe.comp.lit > 0.10;                                // oráculo roxo atrás do herói
  console.log(okPet ? 'FILHOTE DO DEVORADOR VISÍVEL ✓' : '✗ devorador não detectado');
  console.log(okComp ? 'ORÁCULO VISÍVEL ✓' : '✗ oráculo não detectado');
  if (errors.length) console.log('PAGEERRORS:', errors);
  await browser.close();
  process.exit(okPet && okComp && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
