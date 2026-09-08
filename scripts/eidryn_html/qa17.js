'use strict';
/* qa17.js — QA v1.7.0 "Herdeiro do Eclipse" em navegador real (Playwright)
   Verifica: 0 erros de console, intro de chefe, hit-stop+arco, aura de raridade,
   orbe de loot, eclipse progressivo (coroa/Abismo), placa de região, FPS,
   save intacto após mutações de QA (regra de ouro). */
const { chromium } = require('playwright');
const FILE = 'file:///home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html';
const OUT = '/home/z/my-project/scripts/eidryn_html/';
let pass = 0, fail = 0; const failures = [];
const ok = (c, n) => { if (c) pass++; else { fail++; failures.push(n); console.error('  ✗ FAIL: ' + n); } };

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  /* ---------- LANDSCAPE 1280×720 ---------- */
  const ctxL = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctxL.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(FILE);
  await page.waitForTimeout(1200);

  // 1. estrutura v1.7.0
  const s = await page.evaluate(() => ({
    ver: E.DM.GAME_VERSION,
    boss_tag: [E.DM.cfg_loc_ptbr.boss_tag, E.DM.cfg_loc_en.boss_tag],
    region_word: [E.DM.cfg_loc_ptbr.region_word, E.DM.cfg_loc_en.region_word],
    pools: [E.Rfx.SLASH_POOL, E.Rfx.ORBS_POOL, E.Rfx.slashes.length, E.Rfx.orbs.length],
    corona: !!E.Rfx._coronaDisc && !!E.Rfx._coronaRays
  }));
  ok(s.ver === '1.7.0', 'GAME_VERSION 1.7.0 no navegador');
  ok(s.boss_tag[0] === 'CHEFE' && s.boss_tag[1] === 'BOSS', 'boss_tag i18n ptbr/en');
  ok(s.region_word[0] === 'Região' && s.region_word[1] === 'Region', 'region_word i18n ptbr/en');
  ok(s.pools[0] === 4 && s.pools[1] === 6 && s.pools[2] === 4 && s.pools[3] === 6, 'pools de slash/orb inicializados');
  ok(s.corona, 'coroa do eclipse pré-renderizada no boot');

  // 2. start + modais fora + snapshot do save
  await page.click('#btn-start');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    var btns = document.querySelectorAll('#modal-root button');
    for (var i = 0; i < btns.length; i++) if (/Resgatar|Coletar/i.test(btns[i].textContent)) btns[i].click();
  });
  await page.waitForTimeout(400);
  const snap = await page.evaluate(() => ({
    save: JSON.stringify(E.Save.collect()),
    region: E.Rfx.regionId, active: E.Combat.active
  }));

  // 3. [V1] intro cinematográfica de chefe
  await page.evaluate(() => {
    E.Combat.active = false; // congela spawn automático p/ QA determinístico
    E.BUS.emit('enemy_spawned', { sprite: 'boss_cidadela', name: 'Régente Morvain', boss: true, modifiers: [] });
  });
  await page.waitForTimeout(500);
  const bi = await page.evaluate(() => ({ t: E.Rfx.bossIntroT, n: E.Rfx.bossIntroName, sub: E.Rfx.bossIntroSub }));
  ok(bi.t > 1.2 && bi.t <= 2.3, 'bossIntroT armado (~2.3s) e decrescendo');
  ok(bi.n === 'Régente Morvain' && bi.sub.length > 0, 'placa com nome + subtítulo da região (' + bi.sub + ')');
  await page.screenshot({ path: OUT + 'qa17_bossintro.png' });

  // 4. [V3] hit-stop + arco de corte no crítico (checagem síncrona: hit-stop dura 85ms)
  const hs = await page.evaluate(() => {
    E.BUS.emit('enemy_damaged', 1234, true);
    return { stop: E.Rfx.hitStopT, slash: E.Rfx.slashes.some(x => x.on), pose: E.Rfx.heroAnim.pose };
  });
  ok(hs.stop > 0, 'hit-stop armado no crítico (visual: ' + hs.stop.toFixed(3) + 's)');
  ok(hs.slash, 'arco de corte desenhado');
  ok(hs.pose === 'crit', 'herói na postura de crítico');
  await page.waitForTimeout(60);
  await page.screenshot({ path: OUT + 'qa17_slash.png' });

  // 5. [V4] aura de raridade (Divina equipada)
  await page.evaluate(() => {
    E.Rfx._prevEq = E.Inv.equipped;
    E.Inv.equipped = { arma: { id: 'qa', rarity: 'divina' }, capa: { id: 'qa2', rarity: 'epica' } };
    E.Rfx._auraOrder = -1;
  });
  await page.waitForTimeout(250);
  const au = await page.evaluate(() => ({ ord: E.Rfx._heroAuraOrder(), col: E.Rfx.RARITY_AURA[E.Rfx._heroAuraOrder()] }));
  ok(au.ord === 6 && au.col === '#7af0dc', 'aura Divina (#7af0dc) com equipamento de maior raridade');
  await page.screenshot({ path: OUT + 'qa17_aura.png' });

  // 6. [V6] orbe de loot voando ao HUD (headless: força modo alta p/ não suprimir ornamentos)
  await page.evaluate(() => { E.Rfx.perfMode = 'high'; E.Rfx.lowFx = false; E.Combat.active = true;
    E.BUS.emit('loot_rare', { rarity: 'divina', name: 'QA' }); });
  await page.waitForTimeout(120);
  const orb = await page.evaluate(() => E.Rfx.orbs.filter(o => o.on).length);
  ok(orb >= 1, 'orbe de loot Divina em voo');
  await page.screenshot({ path: OUT + 'qa17_orb.png' });

  // 7. [V2+V5] eclipse total no Abismo + placa de região
  await page.evaluate(() => { E.Rfx.setRegion('abismo'); E.Combat.active = false; });
  await page.waitForTimeout(600);
  const ec = await page.evaluate(() => ({ ph: E.Rfx._eclipsePhase(), title: E.Rfx.regionTitleT, rid: E.Rfx.regionId }));
  ok(ec.ph === 1, 'fase do eclipse = 1.0 no Abismo (total)');
  ok(ec.title > 0 && ec.title <= 2.4, 'placa de região armada');
  await page.screenshot({ path: OUT + 'qa17_abismo.png' });

  // 8. restauração EXATA do estado (regra de ouro) + save idêntico
  await page.evaluate(rid => {
    E.Inv.equipped = E.Rfx._prevEq; delete E.Rfx._prevEq;
    E.Rfx._auraOrder = -1;
    E.Rfx.setRegion(rid);
    E.Rfx.bossIntroT = 0; E.Rfx.hitStopT = 0;
    E.Rfx.slashes.forEach(x => x.on = false); E.Rfx.orbs.forEach(x => x.on = false);
  }, snap.region);
  await page.waitForTimeout(300);
  const diff = await page.evaluate(snap2 => {
    const now = JSON.parse(JSON.stringify(E.Save.collect()));
    const before = JSON.parse(snap2);
    const keys = new Set([...Object.keys(now), ...Object.keys(before)]);
    keys.delete('time'); // relógio de sessão avança por design do jogo (não é escrita do QA)
    const out = [];
    for (const k of keys) if (JSON.stringify(now[k]) !== JSON.stringify(before[k])) out.push(k);
    return out;
  }, snap.save);
  ok(diff.length === 0, 'save byte-idêntico após mutações de QA (zero escrita no jogo)' + (diff.length ? ' — chaves alteradas: ' + diff.join(',') : ''));

  // 9. FPS (média de 90 frames)
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0, t0 = performance.now();
    const tick = () => { n++; if (n < 90) requestAnimationFrame(tick); else res(90000 / (performance.now() - t0)); };
    requestAnimationFrame(tick);
  }));
  ok(fps >= 50, 'FPS ≥ 50 headless (medido: ' + fps.toFixed(1) + ')');

  // 10. reload → save carrega íntegro
  await page.reload(); await page.waitForTimeout(1200);
  await page.click('#btn-start'); await page.waitForTimeout(700);
  const rl = await page.evaluate(() => ({ stage: E.Prog.current_stage, ver: E.DM.GAME_VERSION }));
  ok(rl.ver === '1.7.0' && rl.stage >= 1, 'reload → save carregado (fase ' + rl.stage + ')');
  await ctxL.close();

  /* ---------- PORTRAIT 390×844: smoke ---------- */
  const ctxP = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pp = await ctxP.newPage();
  pp.on('pageerror', e => errors.push('PORTRAIT PAGEERROR: ' + e.message));
  await pp.goto(FILE); await pp.waitForTimeout(1100);
  await pp.click('#btn-start'); await pp.waitForTimeout(900);
  await pp.evaluate(() => {
    var btns = document.querySelectorAll('#modal-root button');
    for (var i = 0; i < btns.length; i++) if (/Resgatar|Coletar/i.test(btns[i].textContent)) btns[i].click();
    E.BUS.emit('enemy_spawned', { sprite: 'boss_abismo', name: 'Avatar do Devorador', boss: true, modifiers: [] });
  });
  await pp.waitForTimeout(450);
  await pp.screenshot({ path: OUT + 'qa17_portrait.png' });
  const pfps = await pp.evaluate(() => new Promise(res => {
    let n = 0, t0 = performance.now();
    const tick = () => { n++; if (n < 60) requestAnimationFrame(tick); else res(60000 / (performance.now() - t0)); };
    requestAnimationFrame(tick);
  }));
  ok(pfps >= 45, 'portrait FPS ≥ 45 headless (medido: ' + pfps.toFixed(1) + ')');
  await ctxP.close();

  await browser.close();
  console.log('\n==========================================');
  console.log(`QA17: ${pass} passou | ${fail} falhou | erros console: ${errors.length}`);
  if (errors.length) console.log('ERROS:\n - ' + errors.join('\n - '));
  if (failures.length) console.log('FALHAS:\n - ' + failures.join('\n - '));
  process.exit(fail || errors.length ? 1 : 0);
})();
