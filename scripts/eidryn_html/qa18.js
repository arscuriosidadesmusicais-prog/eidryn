'use strict';
/* qa18.js — QA v1.8.0 "Vigília Estelar" em navegador real (Playwright)
   Verifica: 0 erros de console, ciclo dia/noite (override+interpolação), estrelas,
   estrela cadente, vagalumes/almas, pilar de level-up, revelação do gacha (CSS),
   seletor de Período em Ajustes, FPS, save intacto após mutações de QA. */
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

  // 1. estrutura v1.8.0
  const s = await page.evaluate(() => ({
    ver: E.DM.GAME_VERSION,
    dn: [E.DM.cfg_loc_ptbr.daynight, E.DM.cfg_loc_en.daynight, E.DM.cfg_loc_ptbr.dn_dusk, E.DM.cfg_loc_en.dn_night],
    phases: Object.keys(E.Rfx.DN_PHASES),
    stars: E.Rfx.stars.length, flies: E.Rfx.flies.length,
    pref: E.Rfx.dnPref, pillar: E.Rfx.pillarT, night: E.Rfx._dn.stars
  }));
  ok(s.ver === '1.8.0', 'GAME_VERSION 1.8.0 no navegador');
  ok(s.dn[0] === 'Período do dia' && s.dn[1] === 'Time of day' && s.dn[2] === 'Entardecer' && s.dn[3] === 'Night', 'i18n daynight/dn_* ptbr/en');
  ok(s.phases.join(',') === 'amanhecer,dia,entardecer,noite', 'DN_PHASES com as 4 fases');
  ok(s.stars === 0 || s.night > 0.02, 'estrelas só semeadas com fator noturno ativo (invariante lazy)');
  ok(s.pref === 'auto' && s.pillar === 0, 'dnPref=auto e pilar zerado no boot');

  // 2. start + modais fora + snapshot do save
  await page.click('#btn-start');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    var btns = document.querySelectorAll('#modal-root button');
    for (var i = 0; i < btns.length; i++) if (/Resgatar|Coletar/i.test(btns[i].textContent)) btns[i].click();
  });
  await page.waitForTimeout(400);
  const snap = await page.evaluate(() => ({
    save: JSON.stringify(E.Save.collect()), region: E.Rfx.regionId, active: E.Combat.active
  }));

  // 3. [V8] override NOITE: interpolação chega no alvo (~3s)
  await page.evaluate(() => { E.Combat.active = false; E.Rfx.setDnPref('noite'); });
  await page.waitForTimeout(3600);
  const dn1 = await page.evaluate(() => ({ phase: E.Rfx._dnPhaseNow(), stars: E.Rfx._dn.stars, dark: E.Rfx._dn.dark, seeded: E.Rfx.stars.length }));
  ok(dn1.phase === 'noite', 'override noite ativo (_dnPhaseNow)');
  ok(dn1.stars > 0.9 && dn1.dark > 0.12, 'wash noturnal convergiu (stars=' + dn1.stars.toFixed(2) + ', dark=' + dn1.dark.toFixed(2) + ')');
  ok(dn1.seeded === 90, '90 estrelas semeadas no céu noturno');
  await page.evaluate(() => { E.Rfx._shootNext = 0.001; }); // força cadente já
  await page.waitForTimeout(350);
  const shoot = await page.evaluate(() => !!E.Rfx.shoot);
  ok(shoot, '[V10] estrela cadente em voo após agendamento');
  await page.screenshot({ path: OUT + 'qa18_noite_bosque.png' });

  // 4. [V9] vagalumes no bosque à noite
  const ff = await page.evaluate(() => ({ pool: E.Rfx.flies.length, ffA: (E.Rfx._dn.stars - 0.25) / 0.75 }));
  ok(ff.pool === 26, 'pool de 26 crítters preenchido sob demanda');
  ok(ff.ffA > 0.85, 'fator de vagalumes ~1.0 na noite plena');
  await page.waitForTimeout(250);
  await page.screenshot({ path: OUT + 'qa18_vagalumes.png' });

  // 5. [V11] pilar de luz no level-up
  await page.evaluate(() => { E.BUS.emit('level_up', 42); });
  await page.waitForTimeout(120);
  const pil = await page.evaluate(() => ({ t: E.Rfx.pillarT, pose: E.Rfx.heroAnim.pose }));
  ok(pil.t > 1.0 && pil.t <= 1.5, 'pilar de luz armado (1.5s)');
  ok(pil.pose === 'victory', 'herói em vitória no level-up');
  await page.waitForTimeout(320);
  await page.screenshot({ path: OUT + 'qa18_pilar.png' });

  // 6. [V9] almas no Abismo + [V2] coroa à noite (aguarda banner do level-up sair)
  await page.waitForTimeout(1400);
  await page.evaluate(() => { E.Rfx.pillarT = 0; E.Rfx.setRegion('abismo'); });
  await page.waitForTimeout(600);
  const ab = await page.evaluate(() => ({ rid: E.Rfx.regionId, ph: E.Rfx._eclipsePhase() }));
  ok(ab.rid === 'abismo' && ab.ph === 1, 'Abismo: eclipse total + almas presentes');
  await page.screenshot({ path: OUT + 'qa18_abismo_almas.png' });

  // 7. [V8] entardecer na cidadela (brilho de horizonte)
  await page.evaluate(() => { E.Rfx.setRegion('cidadela'); E.Rfx.setDnPref('entardecer'); });
  await page.waitForTimeout(3200);
  const du = await page.evaluate(() => ({ glow: E.Rfx._dn.glow, stars: E.Rfx._dn.stars }));
  ok(du.glow > 0.25 && du.stars > 0.2 && du.stars < 0.45, 'entardecer: horizonte aceso + poucas estrelas (glow=' + du.glow.toFixed(2) + ')');
  await page.screenshot({ path: OUT + 'qa18_entardecer.png' });

  // 8. Ajustes: seletor Período do dia presente, funcional e persistido
  await page.evaluate(() => { E.Rfx.setDnPref('noite'); E.UI2.openSettings(); });
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => {
    const sel = document.getElementById('st-dn');
    if (!sel) return null;
    sel.value = 'dia'; sel.onchange.call(sel);
    return { existed: true, after: E.Rfx.dnPref, persisted: JSON.parse(localStorage.getItem(E.Rfx.PREF_KEY)).dn };
  });
  ok(!!st && st.after === 'dia' && st.persisted === 'dia', 'Ajustes: Período do dia selecionável e persistido (chave própria)');
  await page.evaluate(() => { E.UI.closeModal(); E.Rfx.setDnPref('auto'); });
  await page.waitForTimeout(700);

  // 9. [V12] revelação do gacha: cards com entrada encadeada + brilho por raridade
  await page.evaluate(() => {
    E.UI2._gachaModal([
      { kind: 'item', rarity: 'comum', name: 'QA Espada' },
      { kind: 'item', rarity: 'rara', name: 'QA Arco' },
      { kind: 'item', rarity: 'lendaria', name: 'QA Cajado' },
      { kind: 'pet', rarity: 'mitica', id: 'raposa_vidro', name: 'Raposa de Vidro Lunar' },
      { kind: 'item', rarity: 'divina', name: 'QA Coroa' }
    ]);
  });
  await page.waitForTimeout(500);
  const gacha = await page.evaluate(() => {
    const res = document.querySelector('.gacha-res');
    if (!res) return null;
    const cards = res.querySelectorAll('.gr');
    const divina = res.querySelector('.gr.b-divina');
    const mitica = res.querySelector('.gr.b-mitica');
    return { n: cards.length, divina: !!divina, mitica: !!mitica,
      anim: getComputedStyle(cards[0]).animationName, sweep: divina ? getComputedStyle(divina, '::after').content !== 'none' : false };
  });
  ok(!!gacha && gacha.n === 5, 'modal do gacha com 5 cards');
  ok(!!gacha && gacha.divina && gacha.mitica, 'classes de raridade aplicadas (mitica/divina)');
  ok(!!gacha && gacha.anim === 'grReveal', 'entrada encadeada grReveal ativa');
  ok(!!gacha && gacha.sweep, 'varredura de brilho no card Divina (::after)');
  await page.screenshot({ path: OUT + 'qa18_gacha.png' });
  await page.evaluate(() => { E.UI.closeModal(); });
  await page.waitForTimeout(250);

  // 10. restauração EXATA do estado (regra de ouro) + save idêntico
  await page.evaluate(rid => {
    E.Rfx.setRegion(rid);
    E.Rfx.pillarT = 0; E.Rfx._pillarRing = false;
    E.Rfx.shoot = null; E.Rfx._shootNext = 6;
    E.Rfx.dnPref = 'auto'; E.Rfx._dn.stars = 0; E.Rfx._dn.dark = 0; E.Rfx._dn.glow = 0;
    E.Rfx.stars.length = 0; E.Rfx._starsSeeded = false; E.Rfx.flies.length = 0;
    E.Rfx.savePrefs();
  }, snap.region);
  await page.waitForTimeout(300);
  const diff = await page.evaluate(snap2 => {
    const now = JSON.parse(JSON.stringify(E.Save.collect()));
    const before = JSON.parse(snap2);
    const keys = new Set([...Object.keys(now), ...Object.keys(before)]);
    keys.delete('time'); // relógio de sessão avança por design (não é escrita do QA)
    const out = [];
    for (const k of keys) if (JSON.stringify(now[k]) !== JSON.stringify(before[k])) out.push(k);
    return out;
  }, snap.save);
  ok(diff.length === 0, 'save byte-idêntico após mutações de QA (zero escrita no jogo)' + (diff.length ? ' — chaves alteradas: ' + diff.join(',') : ''));

  // 11. FPS (média de 90 frames)
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0, t0 = performance.now();
    const tick = () => { n++; if (n < 90) requestAnimationFrame(tick); else res(90000 / (performance.now() - t0)); };
    requestAnimationFrame(tick);
  }));
  ok(fps >= 50, 'FPS ≥ 50 headless (medido: ' + fps.toFixed(1) + ')');

  // 12. reload → save carrega íntegro
  await page.reload(); await page.waitForTimeout(1200);
  await page.click('#btn-start'); await page.waitForTimeout(700);
  const rl = await page.evaluate(() => ({ stage: E.Prog.current_stage, ver: E.DM.GAME_VERSION }));
  ok(rl.ver === '1.8.0' && rl.stage >= 1, 'reload → save carregado (fase ' + rl.stage + ')');
  await ctxL.close();

  /* ---------- PORTRAIT 390×844: smoke noturno ---------- */
  const ctxP = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pp = await ctxP.newPage();
  pp.on('pageerror', e => errors.push('PORTRAIT PAGEERROR: ' + e.message));
  await pp.goto(FILE); await pp.waitForTimeout(1100);
  await pp.click('#btn-start'); await pp.waitForTimeout(900);
  await pp.evaluate(() => {
    var btns = document.querySelectorAll('#modal-root button');
    for (var i = 0; i < btns.length; i++) if (/Resgatar|Coletar/i.test(btns[i].textContent)) btns[i].click();
    E.Combat.active = false;
    E.Rfx.setDnPref('noite');
  });
  await pp.waitForTimeout(3400);
  const pst = await pp.evaluate(() => ({ stars: E.Rfx._dn.stars, seeded: E.Rfx.stars.length }));
  ok(pst.stars > 0.9 && pst.seeded === 90, 'portrait: noite com estrelas na banda visível');
  await pp.screenshot({ path: OUT + 'qa18_portrait_noite.png' });
  await ctxP.close();

  await browser.close();
  console.log('\n==========================================');
  console.log(`QA18: ${pass} passou | ${fail} falhou | erros console: ${errors.length}`);
  if (errors.length) console.log('ERROS:\n - ' + errors.join('\n - '));
  if (failures.length) console.log('FALHAS:\n - ' + failures.join('\n - '));
  process.exit(fail || errors.length ? 1 : 0);
})();
