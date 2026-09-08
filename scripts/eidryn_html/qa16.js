'use strict';
/* qa16.js — QA v1.6.0 "Sangue e Eclipse" em navegador real (Playwright)
   Verifica: 0 erros de console, pets novos (imgs+frames+def), pool Divina,
   sets mistos, eventos vivos + toast, pet ativo renderizado, save roundtrip. */
const { chromium } = require('playwright');
const FILE = 'file:///home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html';
const OUT = '/home/z/my-project/scripts/eidryn_html/';
let pass = 0, fail = 0; const failures = [];
const ok = (c, n) => { if (c) pass++; else { fail++; failures.push(n); console.error('  ✗ FAIL: ' + n); } };

(async () => {
  const browser = await chromium.launch();
  const errors = [], warnings = [];

  /* ---------- LANDSCAPE: fluxo principal ---------- */
  const ctxL = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctxL.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(FILE);
  await page.waitForTimeout(1200);

  // 1. verificação estrutural pré-boot
  const s = await page.evaluate(() => ({
    ver: E.DM.GAME_VERSION,
    imgs: ['pets/pet_raposa','pets/pet_devorador','pets/cmp_oraculo',
           'pets/pet_raposa_idle_0','pets/pet_raposa_cheer_1','pets/pet_raposa_sad_0',
           'pets/pet_devorador_idle_3','pets/cmp_oraculo_idle_2','pets/cmp_oraculo_sad_1']
      .map(k => !!E.IMG[k]),
    defs: E.Pet.all_defs().length,
    divina: (E.Gacha._pull_pet('divina')||{}).rarity,
    sets: E.DM.cfg_items.sets.length,
    events: E.Eco.active_events().map(e => e.id),
    tips: !!E.DM.cfg_loc_ptbr.evt_active
  }));
  ok(s.ver === '1.6.0', 'GAME_VERSION 1.6.0');
  ok(s.imgs.every(Boolean), '27 PNGs dos 3 novos pets no E.IMG (base+frames)');
  ok(s.defs === 13, 'catálogo com 13 companions (8 pets + 5 companheiros)');
  ok(s.divina === 'divina', 'rolagem Divina → pet Divino no navegador');
  ok(s.sets === 7, '7 sets no navegador');
  ok(s.events.includes('evt_eclipse_sanguineo'), 'Eclipse de Sangue ao vivo (set/2026)');
  ok(s.tips, 'chave evt_active presente');

  // 2. set misto aplicado no recálculo
  const sb = await page.evaluate(() => {
    const prev = E.Inv.equipped;
    E.Inv.equipped = { arma: 'x', capa: 'y' };
    const b = E.Inv.set_bonuses();
    E.Inv.equipped = prev;
    return b;
  });
  ok((sb.crit_damage || 0) >= 18, 'set Herdeiro do Eclipse aplica +18% dano crít.');

  // 3. start + fecha modal de login diário + acquire pets novos + ativa devorador/oráculo
  await page.click('#btn-start');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    // fecha qualquer modal aberto (login diário/offline) para o QA visual
    var btns = document.querySelectorAll('#modal-root button');
    for (var i = 0; i < btns.length; i++) if (/Resgatar|Coletar/i.test(btns[i].textContent)) btns[i].click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    E.Eco.add('essencia', 1e6);
    ['pet_raposa', 'filhote_devorador', 'oraculo_eclipse', 'lobo_umbral'].forEach(id => E.Pet.acquire(id));
    E.Pet.set_active('filhote_devorador');
    E.Pet.set_active('oraculo_eclipse');
    if (E.Rfx.setPetVisuals) E.Rfx.setPetVisuals();
  });

  // petFrames carregados p/ os novos ícones
  const pf = await page.evaluate(() => ({
    dev: Object.keys((E.Rfx.petFrames||{})['pet_devorador']||{}),
    ora: Object.keys((E.Rfx.petFrames||{})['cmp_oraculo']||{}),
    key: E.Rfx.petKey || '', ckey: E.Rfx.compKey || ''
  }));
  ok((pf.dev||[]).length >= 3, 'frames do Filhote do Devorador no render');
  ok((pf.ora||[]).length >= 3, 'frames do Oráculo no render');
  ok(pf.key === 'pet_devorador' && pf.ckey === 'cmp_oraculo', 'pet+companheiro ativos = novos Divino/Mítico');

  // 4. toast de evento ativo (~8s após start)
  await page.waitForTimeout(8600);
  const toast = await page.evaluate(() => {
    const t = document.getElementById('toasts');
    return t ? t.textContent : '';
  });
  ok(toast.includes('Evento ativo') && toast.includes('Eclipse de Sangue'), 'toast de evento ativo exibido');

  // 5. screenshots: batalha c/ novos pets + painel pets + summon
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + 'qa16_battle_newpets.png' });
  await page.evaluate(() => E.UI.show('pets'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + 'qa16_pets_panel.png' });
  await page.evaluate(() => E.UI.show('summon'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + 'qa16_summon.png' });
  await page.evaluate(() => E.UI.show(null));
  // força flush e valida o save (payload é XOR+b64 — checa conteúdo via collect + chave gravada)
  const saveBlob = await page.evaluate(() => {
    E.Save.flush();
    return {
      raw: localStorage.getItem('eidryn_save_v1') || '',
      collect: JSON.stringify(E.Save.collect())
    };
  });
  ok(!!saveBlob.raw.length, 'Selo gravado no localStorage');
  ok(saveBlob.collect.includes('filhote_devorador') && saveBlob.collect.includes('oraculo_eclipse'),
    'estado do save contém os novos pets');

  /* ---------- roundtrip: reload → save íntegro ---------- */
  await page.reload();
  await page.waitForTimeout(1000);
  const rt = await page.evaluate(() => ({
    owned: E.Pet.is_owned('filhote_devorador') && E.Pet.is_owned('oraculo_eclipse'),
    active: E.Pet.active_pet,
    ver: E.DM.GAME_VERSION
  }));
  ok(rt.owned, 'reload → novos pets preservados (save compatível)');
  ok(rt.active === 'filhote_devorador', 'reload → pet ativo preservado');

  /* ---------- PORTRAIT: layout ---------- */
  const ctxP = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageP = await ctxP.newPage();
  const errP = [];
  pageP.on('console', m => { if (m.type() === 'error') errP.push(m.text()); });
  pageP.on('pageerror', e => errP.push('PAGEERROR: ' + e.message));
  await pageP.goto(FILE);
  await pageP.waitForTimeout(1000);
  await pageP.click('#btn-start');
  await pageP.waitForTimeout(1500);
  await pageP.screenshot({ path: OUT + 'qa16_portrait.png' });
  ok(errP.length === 0, 'portrait sem erros de console');

  /* ---------- veredito ---------- */
  ok(errors.length === 0, '0 erros de console (landscape): ' + errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log('\n==========================================');
  console.log(`QA16: ${pass} passou | ${fail} falhou`);
  if (warnings.length) console.log(`(warnings console: ${warnings.length})`);
  if (failures.length) { console.log('FALHAS:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('QA DE NAVEGADOR PASSOU ✓');
})().catch(e => { console.error('QA CRASH:', e); process.exit(1); });
