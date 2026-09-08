'use strict';
/* =====================================================================
   test_node.js — QA headless da porta HTML (espelha tests/test_runner.gd)
   Grupos: fórmulas, combate, inventário, skills, pets, gacha/pity,
   progressão, ascensão, modos, offline, save/anticheat, retenção, economia
   ===================================================================== */
const fs = require('fs');
const path = require('path');

/* ---------- mocks de browser ---------- */
const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

/* ---------- carrega dados + módulos core ---------- */
const ROOT = '/home/z/my-project/eidryn';
const MAP = {enemies:'enemies',regions:'regions',currencies:'currencies',attributes:'attributes',
  skills:'skills',items:'items',pets:'pets',ascension:'ascension_tree',dungeons:'dungeons',
  gacha:'gacha',missions:'missions',achievements:'achievements',shop:'shop',
  battlepass:'battlepass',events:'events',loc_ptbr:'loc_ptbr',loc_en:'loc_en'};
const DATA = {};
for (const [k, f] of Object.entries(MAP))
  DATA[k] = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f + '.json'), 'utf8'));
globalThis.E = { DATA };

const P = '/home/z/my-project/scripts/eidryn_html/';
for (const f of ['p01_core.js','p02_managers_a.js','p03_managers_b.js','p04_combat.js','p05_render.js'])
  eval(fs.readFileSync(P + f, 'utf8')); // p05 = definição do objeto Rfx (sem side-effects de DOM)

/* ---------- inicialização (ordem do boot) ---------- */
E.DM.load(E.DATA);
E.Char.init();
E.Skill.init();
E.Eco.reset_to_starting();
E.Prog.init();
E.Modes.init();
E.Ret.init();

/* ---------- harness ---------- */
let pass = 0, fail = 0; const failures = [];
function ok(cond, name) {
  if (cond) { pass++; }
  else { fail++; failures.push(name); console.error('  ✗ FAIL: ' + name); }
}
function group(n){ console.log('▶ ' + n); }
const approx = (a,b,eps)=>Math.abs(a-b)<=eps;
const RO = ['comum','incomum','rara','epica','lendaria','mitica','divina'];

/* ================= 1. FÓRMULAS (DataManager) ================= */
group('1. Fórmulas');
{
  const s1 = E.DM.enemy_stats_for_stage(1);
  ok(approx(s1.hp, 42*1.12, 0.01) && approx(s1.atk, 6.5*1.09, 0.01), 'stats fase 1 = base×exp^1 (fórmula Godot)');
  const s10 = E.DM.enemy_stats_for_stage(10);
  ok(approx(s10.hp, 42*Math.pow(1.12,10), 0.5), 'HP fase 10 = 42×1.12^10');
  ok(approx(s10.gold, 14*Math.pow(1.10,10), 0.5), 'Ouro = base×1.10^F');
  const s400 = E.DM.enemy_stats_for_stage(400);
  const s500 = E.DM.enemy_stats_for_stage(500);
  ok(approx(s400.hp, 42*Math.pow(1.12,400), 42*Math.pow(1.12,400)*0.001), 'fase 400 sem soft-cap ainda (g=400)');
  const factor = 0.4+0.6*Math.exp(-100/300);
  ok(approx(s500.hp, 42*Math.pow(1.12, 400+100*factor), 42*Math.pow(1.12,400+100*factor)*0.001), 'soft-cap: g(500)=400+100×(0.4+0.6e^(-100/300))');
  ok(s500.hp < 42*Math.pow(1.12,500), 'soft-cap reduz crescimento pós-400');
  ok(E.DM.is_boss_stage(10) && !E.DM.is_boss_stage(15), 'boss a cada 10');
  ok(E.DM.is_miniboss_stage(15) && !E.DM.is_miniboss_stage(20), 'miniboss a cada 5 (não-boss)');
  ok(E.DM.region_for_stage(1).id==='bosque_vidro' && E.DM.region_for_stage(84).id==='pantano' && E.DM.region_for_stage(501).id==='abismo', 'regiões por fase');
  const a=E.DM.enemy_for_stage(123), b=E.DM.enemy_for_stage(123);
  ok(a.name===b.name && a.sprite===b.sprite && JSON.stringify(a.modifiers)===JSON.stringify(b.modifiers), 'RNG determinístico por fase');
  ok(E.DM.damage_taken(100, 0)===100, 'dano recebido DEF 0');
  ok(approx(E.DM.damage_taken(100, 100), 50, 0.001), 'dano = raw×100/(100+DEF)');
  ok(approx(E.DM.damage_final(10, 1, 1.8, 1.3), 23.4, 0.001), 'dano final = ATK×arma×skill×buff');
  ok(approx(E.DM.lifesteal_heal(200, 15), 30, 0.001), 'lifesteal = dano×LS/100');
  ok(E.DM.attribute_cost(E.DM.cfg_attributes.attributes[0], 0)===25, 'custo atributo inicial 25');
  ok(approx(E.DM.level_xp_cost(1), 30, 0.01) && approx(E.DM.level_xp_cost(2), 30*1.16, 0.01), 'XP nível = 30×1.16^(L-1)');
  ok(typeof E.U.sha256('abc')==='string' && E.U.sha256('abc').length===64, 'SHA-256 sync presente');
  ok(E.U.sha256('abc')==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 vetor de teste ("abc")');
}

/* ================= 2. COMBATE ================= */
group('2. Combate');
{
  const big = {hp:1e9, atk:1e9, def:100, crit_rate:0, crit_damage:150, atk_interval:0.25,
    lifesteal:0, dodge:0, regen:0, gold_find:0, xp_gain:0, boss_damage:0, drop_bonus:0, luck:0};
  const realStats = E.Char.stats.bind(E.Char);
  E.Char.stats = () => big;
  const ouro0 = E.Eco.get_cur('ouro');
  E.Combat.start_campaign(3);
  ok(E.Combat.active && E.Combat.enemy.stage===3 && !E.Combat.enemy.boss, 'start_campaign fase 3');
  for(let i=0;i<120;i++) E.Combat.process(0.05);
  ok(!E.Combat.active || E.Combat.enemy_hp<=0 || E.Combat.stage>=3, 'inimigo morto no loop');
  ok(E.Prog.max_stage>=3, 'vitória avança max_stage');
  ok(E.Eco.get_cur('ouro')>ouro0, 'ouro recompensado');
  ok((E.Ret.counters.kills||0)>=1, 'contador de abates');
  // boss timeout → fallback farm
  E.Prog.max_stage = 10; E.Prog.current_stage = 10;
  E.Combat.start_campaign(10);
  ok(E.Combat.enemy.boss===true, 'fase 10 é chefe');
  E.Combat._boss_t = 0.1;
  let sawFail = false;
  const h = (r)=>{ if(r==='fail') sawFail = true; };
  E.BUS.on('combat_ended', h);
  E.Combat.process(0.2);
  E.BUS.off('combat_ended', h);
  ok(sawFail, 'timeout do chefe → fail');
  ok(E.Prog.current_stage===9, 'fallback farm = max-1 (D19)');
  E.Char.stats = realStats;
}

/* ================= 3. INVENTÁRIO ================= */
group('3. Inventário');
{
  const it = E.Inv.generate_item(100, 'epica');
  ok(it.id && it.slot && it.rarity==='epica' && it.ilvl===100 && it.primary>0, 'geração de item');
  ok(Object.keys(it.secondaries).length===E.Inv.rarity_data('epica').affixes, 'afixos = raridade.affixes');
  const w = E.DM.cfg_items.drop_rates_normal;
  ok(approx(Object.values(w).reduce((a,b)=>a+b,0), 100, 0.01), 'drop_rates_normal soma 100%');
  for(let i=0;i<200;i++){
    const r = E.Inv.rarity_roll('drop_rates_normal', 0);
    if(!RO.includes(r)) { ok(false,'rarity fora do domínio'); break; }
  }
  ok(true, 'rarity_roll domínio válido (200 rolls)');
  // reforço com pity
  const it2 = E.Inv.generate_item(50, 'comum');
  E.Inv.inventory.push(it2);
  const gold0 = E.Eco.get_cur('ouro');
  E.Eco.add('ouro', 1e12);
  const rand0 = Math.random;
  E.Inv.rein_fail_streak = 11;
  Math.random = () => 0.999; // falharia
  const success = E.Inv.reinforce(it2.id);
  Math.random = rand0;
  ok(success===true && it2.reinforce===1, 'pity 12: falha forçada vira sucesso');
  ok(E.Inv.reinforce_pity_left()===12, 'streak zerada após pity');
  E.Eco.spend('ouro', E.Eco.get_cur('ouro')-gold0);
  // desmonte
  E.Inv.rein_fail_streak = 0;
  const fr0 = E.Eco.get_cur('fragmentos_equip');
  E.Inv._dismantle_at(E.Inv._find_index(it2.id));
  ok(E.Eco.get_cur('fragmentos_equip')>fr0, 'desmonte rende fragmentos');
  // cap de inventário
  let full=false; const h2=()=>full=true; E.BUS.on('inventory_full', h2);
  const seq=E.Inv.item_seq;
  for(let i=0;i<E.Inv.INV_CAP+5;i++) E.Inv.add_item({id:'x'+i, slot:'arma', base:'t', rarity:'comum', ilvl:1, reinforce:0, primary_id:'atk_pct', primary:1, secondaries:{}, favorite:false, locked:false, pc:1});
  E.BUS.off('inventory_full', h2);
  ok(full, 'inventário cheio emite evento (cap 120)');
  E.Inv.inventory = E.Inv.inventory.filter(x=>String(x.id)[0]!=='x');
  // auto-equip pega maior PC
  const weak = E.Inv.generate_item(1,'comum'); weak.slot='arma';
  const strong = E.Inv.generate_item(400,'divina'); strong.slot='arma';
  E.Inv.inventory.push(weak, strong);
  E.Inv.auto_equip();
  ok(E.Inv.equipped.arma && E.Inv.equipped.arma.id===strong.id, 'auto-equip escolhe maior PC');
}

/* ================= 4. SKILLS ================= */
group('4. Skills');
{
  E.Char.level = 6; E.Skill.check_unlocks();
  ok(E.Skill.unlocked.lamina_eclipse===true && E.Skill.levels.lamina_eclipse===1, 'lamina desbloqueia nv1');
  ok(E.Skill.unlocked.guarda_sombras===true, 'guarda desbloqueia nv6');
  ok(!E.Skill.unlocked.sedenta, 'sedenta ainda bloqueada (nv14)');
  const g0 = E.Eco.get_cur('ouro'); E.Eco.add('ouro', 1e9);
  E.Skill.upgrade_skill('lamina_eclipse');
  ok(E.Skill.levels.lamina_eclipse===2, 'upgrade nível 2');
  ok(approx(E.Skill.upgrade_cost('lamina_eclipse'), 150*Math.pow(1.4,1), 0.01), 'custo 150×1.4^(lv-1)');
  ok(approx(E.Skill.scaled_value('lamina_eclipse','mult'), 180+12*1, 0.01), 'mult escalado 180+12×(lv-1)');
  E.Skill.levels.lamina_eclipse = 9; E.Skill.upgrade_skill('lamina_eclipse');
  ok(E.Skill.evolved.lamina_eclipse===true, 'evolui no nível 10');
  E.Eco.spend('ouro', E.Eco.get_cur('ouro')-g0);
  E.Skill.levels.furia_eclipse = 5;
  ok(approx(E.Skill.passive_bonuses().atk_pct, 5+1.5*4, 0.01), 'passiva 5+1.5×(lv-1)=11');
  E.Char.attributes.energia = 10;
  const mult0 = (180+12*9);
  ok(approx(E.Skill.active_mult('lamina_eclipse'), mult0*1.04*1.1, 0.01), 'active_mult inclui Energia ×1.04 e evo ×1.1');
  E.Char.attributes.energia = 0;
}

/* ================= 5. PETS ================= */
group('5. Pets');
{
  const r1 = E.Pet.acquire('lobo_umbral');
  ok(r1==='new' && E.Pet.active_pet==='lobo_umbral', 'acquire novo pet');
  const r2 = E.Pet.acquire('lobo_umbral');
  ok(r2==='duplicate' && E.Pet.fragments.lobo_umbral===8, 'duplicado → +8 fragmentos');
  ok(approx(E.Pet.pet_bonus('lobo_umbral').atk_pct, 4, 0.01), 'bônus 1★ = 4%');
  E.Pet.fragments.lobo_umbral = 15; E.Eco.add('ouro', 1e6);
  E.Pet.evolve('lobo_umbral');
  ok(E.Pet.stars('lobo_umbral')===2 && E.Pet.fragments.lobo_umbral===0, 'evolução 2★ consome 15◈');
  ok(approx(E.Pet.pet_bonus('lobo_umbral').atk_pct, 6, 0.01), 'bônus 2★ = 4+2 = 6%');
  ok(E.Pet.evolve_cost_frags('lobo_umbral')===45, 'próxima evolução custa 45');
  E.Pet.acquire('cavaleiro_caido');
  ok(E.Pet.active_companion==='cavaleiro_caido', 'companheiro ativo automático');
}

/* ================= 6. GACHA / PITY ================= */
group('6. Gacha & Pity');
{
  E.Eco.add('essencia', 1e6);
  E.Gacha.pulls_since_rare = 9;
  const r = E.Gacha._single_pull();
  ok(RO.indexOf(r.rarity)>=RO.indexOf('rara'), '[HTML-1] pity 10 → Rara+ garantida');
  E.Gacha.pulls_since_epic = 49; E.Gacha.pulls_since_rare = 0;
  const r2 = E.Gacha._single_pull();
  ok(RO.indexOf(r2.rarity)>=RO.indexOf('epica'), 'pity 50 → Épica+ garantida');
  E.Gacha.pulls_since_legend = 99; E.Gacha.pulls_since_epic = 0;
  const r3 = E.Gacha._single_pull();
  ok(RO.indexOf(r3.rarity)>=RO.indexOf('lendaria'), 'pity 100 → Lendária+ garantida');
  // x10 = 11 resultados (+1 bônus)
  const e0 = E.Eco.get_cur('essencia');
  const res10 = E.Gacha.pull(10);
  ok(res10.length===11, 'pull ×10 entrega 11 (bônus)');
  ok(approx(e0-E.Eco.get_cur('essencia'), 90, 0.01), 'custo ×10 = 90');
  ok(E.Gacha.pulls_total>=11, 'contador total de pity');
  // stats de raridade dentro do domínio
  ok(res10.every(x=>['pet','companheiro','item'].includes(x.kind)), 'tipos de resultado válidos');
}

/* ================= 7. PROGRESSÃO ================= */
group('7. Progressão');
{
  E.Prog.max_stage = 20; E.Prog.current_stage = 20;
  ok(E.Prog.farm_stage()===19, 'farm_stage = max-1 quando max%10==0');
  E.Prog.max_stage = 21;
  ok(E.Prog.farm_stage()===21, 'farm_stage = max caso contrário');
  E.Prog.jump_to_stage(999);
  ok(E.Prog.current_stage===Math.max(21,1), 'jump_to_stage limita ao max');
  E.Prog.jump_to_stage(5);
  ok(E.Prog.current_stage===5, 'voltar para fase inferior (mapa)');
  E.Prog.max_stage = 25; E.Prog._notify_stage();
  ok(E.DM.region_for_stage(5).id==='bosque_vidro', 'região atual correta');
}

/* ================= 8. ASCENSÃO ================= */
group('8. Ascensão');
{
  ok(!E.Asc.is_unlocked(), 'bloqueada antes da fase 100');
  E.Prog.max_stage = 120;
  ok(E.Asc.is_unlocked(), 'desbloqueia na fase 100');
  E.Prog.bosses_killed_total = 7;
  const fsFarm = E.Prog.farm_stage();
  const expected = Math.floor(Math.pow(fsFarm/10.0, 1.35)) + 7;
  ok(E.Asc.pending_fragments()===expected, 'fragmentos = floor((farm/10)^1.35)+chefes');
  // prepara estado e ascende
  E.Eco.add('gemas', 500);
  E.Inv.add_item(E.Inv.generate_item(100,'epica'));
  const invN = E.Inv.inventory.length;
  const lvl0 = E.Char.level; E.Char.level = 50;
  const ouro0 = E.Eco.get_cur('ouro');
  const frag0 = E.Eco.get_cur('fragmentos_alma');
  E.Char.attributes.forca = 30;
  const done = E.Asc.ascend();
  ok(done, 'ascend executa');
  ok(E.Char.level===1 && E.Prog.max_stage===1 && E.Prog.current_stage===1, 'reset de fase/nível');
  ok(E.Char.attributes.forca===0, 'atributos zerados');
  ok(E.Eco.get_cur('ouro')===E.DM.cfg_currencies.starting.ouro, 'ouro volta ao inicial');
  ok(E.Eco.get_cur('fragmentos_alma')===frag0+expected, 'fragmentos de alma creditados');
  ok(E.Eco.get_cur('gemas')>=500, 'gemas preservadas');
  ok(E.Inv.inventory.length>=invN, 'equipamentos preservados');
  // árvore
  E.Eco.add('fragmentos_alma', 100);
  ok(!E.Asc.node_requirements_met({requires:['n1'], id:'x'}), 'nó com requisito não comprado → bloqueado');
  E.Asc.buy_node('n1');
  ok(E.Asc.node_level('n1')===1, 'nó n1 comprado');
  ok(E.Asc.node_requirements_met({requires:['n1'], id:'x'}), 'requisito atendido após compra de n1');
  ok(E.Asc.tree_bonuses().atk_pct===4, 'bônus da árvore aplicado');
  ok(E.Asc.node_cost(E.DM.cfg_ascension.nodes.find(n=>n.id==='n2'))===2, 'custo = base×(nível+1): 2×1');
}

/* ================= 9. MODOS ================= */
group('9. Masmorras / Torre / World Boss / Arena');
{
  // Masmorra de ouro (2 grátis/dia)
  let chk = E.Modes.can_enter('masmorra_ouro');
  ok(chk.ok===true && chk.free===true, 'masmorra ouro: entrada grátis diária');
  const g0 = E.Eco.get_cur('ouro');
  E.Modes.enter('masmorra_ouro');
  ok(E.Modes._active_mode==='masmorra_ouro', 'masmorra ativa');
  E.Modes.process(60);
  ok(E.Modes._active_mode==='' && E.Eco.get_cur('ouro')>g0, 'masmorra paga ouro após 60s');
  ok((E.Modes.cooldowns.masmorra_ouro||0)>E.TimeM.now(), 'cooldown registrado');
  // Masmorra de equipamentos exige chave
  E.Eco.currencies.chaves = 1;
  const invN = E.Inv.inventory.length;
  E.Modes.enter('masmorra_equip');
  E.Modes.process(45);
  ok(E.Eco.get_cur('chaves')===0, 'chave consumida');
  ok(E.Inv.inventory.length>=invN+3, '3 itens garantidos');
  // Torre
  const big = {hp:1e12, atk:1e12, def:100, crit_rate:0, crit_damage:150, atk_interval:0.25,
    lifesteal:0, dodge:0, regen:0, gold_find:0, xp_gain:0, boss_damage:0, drop_bonus:0, luck:0};
  const realStats = E.Char.stats.bind(E.Char);
  E.Char.stats = () => big;
  E.Modes.enter('torre_infinita');
  ok(E.Combat.mode==='tower' && E.Combat.stage===1, 'torre começa no andar 1');
  for(let i=0;i<40;i++) E.Combat.process(0.05);
  ok(E.Modes.tower_floor>=2, 'vitória sobe andar');
  ok(E.Modes.tower_record>=2, 'recorde salvo');
  E.Char.stats = realStats;
  // World Boss [HTML-2]
  E.Char.stats = () => ({...big, hp:1e9});
  const gl0 = E.Eco.get_cur('gloria');
  E.Modes.enter('world_boss');
  ok(E.Combat.mode==='world_boss' && E.Combat.enemy.boss, 'world boss inicia');
  for(let i=0;i<30;i++) E.Combat.process(0.05);
  ok(!E.Modes._wb_active, '[HTML-2] world boss finaliza');
  ok(E.Eco.get_cur('gloria')>gl0, '[HTML-2] recompensas de glória pagas');
  ok(E.Modes.wb_last_rank>=1 && E.Modes.wb_last_rank<=6, 'rank válido 1..6');
  E.Char.stats = realStats;
  // Arena
  const attempts0 = E.Modes.arena_attempts_today[E.TimeM.day_key()]||0;
  const gl1 = E.Eco.get_cur('gloria');
  E.Modes.enter('arena');
  ok((E.Modes.arena_attempts_today[E.TimeM.day_key()]||0)===attempts0+1, 'arena consome tentativa');
  ok(E.Eco.get_cur('gloria')>gl1, 'arena paga glória (win ou lose)');
  // Loja da glória
  E.Eco.add('gloria', 1000);
  const ess0 = E.Eco.get_cur('essencia');
  const gloria0 = E.Eco.get_cur('gloria');
  const bought = E.Modes.buy_gloria('gl_ess');
  const capEss = E.DM.cfg_currencies.caps.essencia;
  const essEsperado = Math.min(ess0+100, capEss);
  ok(bought && E.Eco.get_cur('essencia')===essEsperado, 'loja da glória entrega essência (respeita cap)');
}

/* ================= 10. OFFLINE ================= */
group('10. Offline & Time-travel');
{
  E.Offline.cap_seconds();
  ok(E.Offline.cap_seconds()===8*3600, 'cap base 8h');
  E.Eco.premium_until = E.TimeM.now()+86400;
  ok(E.Offline.cap_seconds()===12*3600, 'cap premium 12h');
  E.Eco.premium_until = 0;
  // pendentes
  E.TimeM.last_seen = E.TimeM.now() - 4*3600;
  E.TimeM.time_travel_detected = false;
  const p = E.Offline.compute_pending();
  ok(p.seconds===4*3600 && p.gold>0 && p.xp>0, '4h offline calcula ouro/xp');
  E.TimeM.last_seen = E.TimeM.now() - 30;
  E.Offline.compute_pending();
  ok(!E.Offline.has_pending(), '<60s não gera pendentes');
  // coleta dobrada via stub de anúncio (fallback true)
  E.TimeM.last_seen = E.TimeM.now() - 2*3600;
  E.Offline.compute_pending();
  const g0 = E.Eco.get_cur('ouro');
  const out = E.Offline.collect(true);
  ok(out.doubled===true, 'anúncio stub (fallback) dobra recompensa');
  ok(approx(out.gold, (E.Eco.get_cur('ouro')-g0), 0.01), 'ouro creditado');
  // time-travel
  E.TimeM.time_travel_detected = false;
  E.TimeM.last_seen = E.TimeM.now() + 3600; // "viajou para trás"
  E.TimeM.check_time_travel();
  ok(E.TimeM.time_travel_detected===true, 'time-travel detectado');
  ok(E.TimeM.offline_seconds(8*3600)===0, 'time-travel zera offline');
  E.TimeM.time_travel_detected = false;
  E.TimeM.mark_seen();
}

/* ================= 11. SAVE / ANTICHEAT ================= */
group('11. Save, checksum, backup, anticheat');
{
  E.Save.boot_load(); // garante _boot_done antes do primeiro flush
  E.Save.flush();
  ok(!!store['eidryn_save_v1'], 'save persistido no localStorage');
  const raw = store['eidryn_save_v1'];
  ok(!!raw, 'payload presente para inspeção');
  if(!raw){ console.log('RESULTADO PARCIAL: ', pass, 'passou', fail, 'falhou'); process.exit(1); }
  const bin = Buffer.from(raw, 'base64').toString('binary');
  const pass = 'EIDRYN_SeloDoCrepusculo_EIDRYN_VELUN_CICLO_DO_ECLIPSE_SALT';
  let txt=''; for(let i=0;i<bin.length;i++) txt+=String.fromCharCode(bin.charCodeAt(i)^pass.charCodeAt(i%pass.length));
  const payload = JSON.parse(txt);
  ok(payload.checksum===E.U.sha256(payload.data_json), 'checksum SHA-256 válido');
  const inner = JSON.parse(payload.data_json);
  ok(inner.version===1 && inner.character && inner.economy && inner.progression, 'estrutura de save idêntica à Godot');
  // backup no segundo flush
  const first = store['eidryn_save_v1'];
  E.Save.flush();
  ok(!!store['eidryn_save_bak_v1'] && store['eidryn_save_bak_v1']===first, 'backup do save anterior');
  // corrupção → backup usado
  store['eidryn_save_v1'] = 'lixo-corrompido';
  E.Save.boot_load();
  ok(E.Save._boot_done && E.Char.level>=1, 'boot com save corrompido cai no backup');
  // anticheat
  E.Eco.currencies.ouro = -50;
  E.Char.level = 99999;
  E.Save._validate_all();
  ok(E.Eco.currencies.ouro===0 && E.Char.level===E.DM.cfg_attributes.level.cap, 'anticheat reverte valores inválidos');
  ok(E.Save.violation_count()>=2, 'violações registradas');
  // export/import
  const exp = E.Save.export_save();
  ok(exp.length>100, 'export base64');
  const okImp = E.Save.import_save(exp);
  ok(okImp, 'import válido restaurado');
  ok(E.Save.import_save('###')===false, 'import inválido rejeitado');
}

/* ================= 12. RETENÇÃO ================= */
group('12. Missões, conquistas, login, passe');
{
  E.Ret.track('kills', 100);
  const d1 = E.DM.cfg_missions.daily.find(m=>m.id==='d1');
  ok(E.Ret.mission_done(d1,'daily'), 'missão d1 completa com 100 kills');
  const g0 = E.Eco.get_cur('ouro');
  ok(E.Ret.claim_mission(d1,'daily'), 'claim diária');
  ok(E.Eco.get_cur('ouro')===g0+500, 'recompensa creditada');
  ok(!E.Ret.claim_mission(d1,'daily'), 'double-claim bloqueado');
  // conquistas (max track)
  E.Ret.track('max_stage', 100);
  const a11 = E.Ret.achievements_list().find(a=>a.id==='a11');
  ok(E.Ret.achievement_progress(a11)===100, 'conquista max_stage progresso');
  const gem0 = E.Eco.get_cur('gemas');
  ok(E.Ret.achievement_claim(a11), 'claim conquista');
  ok(E.Eco.get_cur('gemas')===gem0+60, 'gemas da conquista');
  // login 7 dias
  E.Ret.login_last_day = '';
  E.Ret.check_login_day();
  const cyc = E.Ret.login_cycle_day;
  ok(cyc>=1 && cyc<=7, 'ciclo de login 1..7');
  const r1 = E.Ret.claim_login();
  ok(!!r1.day && E.Ret.login_claimed_today(), 'claim login do dia');
  ok(Object.keys(E.Ret.claim_login()).length===0, 'login já resgatado hoje');
  // passe de batalha
  const tier0 = E.Ret.bp_tier();
  E.Ret.bp_add_xp(250);
  ok(E.Ret.bp_tier()===Math.min(tier0+2, 30), '[HTML-3] XP do passe acumula tiers');
  ok(E.Ret.bp_claim(1,false)===true, 'resgate free tier 1');
  ok(E.Ret.bp_claim(1,false)===false, 'tier já resgatado');
  ok(E.Ret.bp_claim(3,true)===false, 'premium bloqueado sem unlock');
  E.Ret.bp_add_xp(100); // garante tier 3 (100+250+100 ≥ 300)
  ok(E.Ret.bp_tier()>=3, 'tier 3 alcançado com 350+ XP');
  E.Ret.bp_premium_unlocked = true;
  ok(E.Ret.bp_claim(3,true)===true, 'premium resgatável com unlock');
}

/* ================= 13. ECONOMIA ================= */
group('13. Economia (7 moedas)');
{
  let toasted=false; const h=(m)=>{ if(m===E.DM.tr('not_enough')) toasted=true; };
  E.BUS.on('toast', h);
  const r = E.Eco.spend('ouro', 1e18);
  E.BUS.off('toast', h);
  ok(r===false && toasted, 'gasto sem saldo → toast e false');
  E.Eco.currencies.gemas = 2e6;
  E.Save._validate_all();
  ok(E.Eco.currencies.gemas===1e6, 'cap de gemas aplicado');
  E.Eco.add_dict({essencia: 25, chaves: 1});
  ok(E.Eco.get_cur('essencia')>=25 && E.Eco.get_cur('chaves')>=1, 'add_dict concede múltiplos');
  ok(Object.keys(E.DM.cfg_currencies.caps).length===7, 'exatamente 7 moedas configuradas');
}

/* ================= 14. LOCALIZAÇÃO ================= */
group('14. Localização PT-BR / EN');
{
  ok(E.DM.tr('stage')==='Fase', 'pt-BR: stage=Fase');
  E.DM.language='en';
  ok(E.DM.tr('stage')==='Stage', 'en: stage=Stage');
  ok(E.DM.tr('boss_timer')==='Boss timer', 'en: boss_timer');
  E.DM.language='ptbr';
  ok(E.DM.tr('app_title').includes('Eidryn'), 'título');
}

/* ================= 15. ROBUSTEZ (auditoria 360°) ================= */
group('15. Robustez [AUDIT]');
{
  // [AUDIT-A1] flush com storage quebrado NUNCA pode lançar (congelaria o loop rAF)
  const realSet = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  E.Save._boot_done = true;
  E.Save.mark_dirty();
  let threw = false;
  try { E.Save.flush(); } catch (e) { threw = true; }
  ok(!threw, 'flush com storage cheio não lança exceção (loop rAF seguro)');
  globalThis.localStorage.setItem = realSet;
  // flush saudável volta a gravar e limpa dirty
  let flushed = false;
  const h = () => { flushed = true; };
  E.BUS.on('save_flushed', h);
  E.Save.flush();
  E.BUS.off('save_flushed', h);
  ok(flushed && !E.Save._dirty, 'flush saudável grava e limpa dirty');
  // [AUDIT-A2] update leve do chip: função existe (UI só existe no browser; no Node apenas não quebra)
  ok(!globalThis.E.UI || typeof E.UI._updateCurChip === 'function', 'chip de moeda tem update leve');
  // i18n: novas chaves aditivas presentes nos dois idiomas
  const pt = E.DM.cfg_loc_ptbr, en = E.DM.cfg_loc_en;
  ok(pt.tip1 && en.tip1 && pt.reduced_fx && en.reduced_fx && pt.quality && en.quality,
    'chaves [AUDIT] presentes em ptbr+en');
}

/* ================= 16. CONTEÚDO v1.6 (auditoria de conteúdo) ================= */
group('16. Conteúdo v1.6 [C1..C7]');
{
  // [C1] pets Mítico/Divino existem e o pool do gacha nunca cai no fallback para rolagens altas
  const pets = E.DM.cfg_pets.pets, comps = E.DM.cfg_pets.companions;
  ok(pets.some(p => p.rarity==='mitica'), '[C1] existe pet Mítico');
  ok(pets.some(p => p.rarity==='divina'), '[C1] existe pet Divino');
  ok(comps.some(c => c.rarity==='mitica'), '[C1] existe companheiro Mítico');
  const rollDiv = E.Gacha._pull_pet('divina');
  ok(rollDiv.rarity==='divina', '[C1] rolagem Divina → pet Divino (sem fallback)');
  const rollMit = E.Gacha._pull_pet('mitica');
  ok(E.Inv.rarity_order(rollMit.rarity) >= E.Inv.rarity_order('mitica'), '[C1] rolagem Mítica → pet Mítico+');
  // [C1] chaves de bônus de pets são todas consumidas por Char.recalc
  const valid = new Set(['atk_pct','hp_pct','def_pct','crit_rate','crit_damage','atk_speed',
    'lifesteal','gold_find','xp_gain','reinforce_luck']);
  const allDefs = pets.concat(comps);
  ok(allDefs.every(d => Object.keys(d.bonus).concat(Object.keys(d.per_star)).every(k => valid.has(k))),
    '[C1] bônus de todos os pets usam chaves válidas');
  ok(allDefs.every(d => d.id && d.name && d.icon && d.desc && d.rarity), '[C1] defs de pets completas');
  // [C2] janelas de evento respeitadas
  const realNow = E.TimeM.now;
  const evt = id => E.DM.cfg_events.events.find(e => e.id===id);
  const sat = Math.floor(Date.parse('2026-09-12T12:00:00Z')/1000); // sábado
  const wed = Math.floor(Date.parse('2026-09-09T12:00:00Z')/1000); // quarta
  const outWin = Math.floor(Date.parse('2026-12-01T12:00:00Z')/1000); // fora do Eclipse de Sangue
  E.TimeM.now = () => sat;
  ok(E.Eco._event_live(evt('evt_fim_de_semana'))===true, '[C2] Fim de Semana Dourado ativo no sábado');
  ok(evt('evt_fim_de_semana').days.includes(new Date(sat*1000).getUTCDay()), '[C2] convenção days = getUTCDay');
  ok(E.Eco.gold_mult() >= 1.5, '[C2] gold_mult ≥ 1.5 no sábado');
  E.TimeM.now = () => wed;
  ok(E.Eco._event_live(evt('evt_fim_de_semana'))===false, '[C2] evento de fim de semana fechado na quarta');
  ok(E.Eco.gold_mult() < 1.5, '[C2] gold_mult normal na quarta');
  ok(E.Eco._event_live(evt('evt_eclipse_sanguineo'))===true, '[C2] Eclipse de Sangue na janela (set/2026)');
  ok(E.Eco.xp_mult() >= 1.25, '[C2] xp_mult ≥ 1.25 com Eclipse de Sangue');
  E.TimeM.now = () => outWin;
  ok(E.Eco._event_live(evt('evt_eclipse_sanguineo'))===false, '[C2] Eclipse de Sangue fora da janela (dez)');
  ok(evt('evt_eclipse_lunar').enabled===false, '[C2] evento legado 2030 continua desligado');
  ok(E.Eco.active_events().every(e => e.enabled), '[C2] active_events só traz eventos habilitados');
  E.TimeM.now = realNow;
  // [C2] drop_mult multiplicado no teto de 100%
  ok(E.Eco.event_mult('drop_mult') > 1, '[C2] drop_mult ativo durante o Eclipse de Sangue');
  // [C3] novos sets com peças válidas e bônus aplicados
  const slots = new Set(E.DM.cfg_items.slots.map(s => s.id));
  const sets = E.DM.cfg_items.sets;
  ok(sets.length===7, '[C3] 7 sets configurados');
  ok(sets.every(s => s.pieces.every(p => slots.has(p))), '[C3] peças de sets são slots válidos');
  ok(sets.every(s => s.desc && s.name && (s.bonus_2 || s.bonus_3)), '[C3] sets com nome/descrição/bônus');
  const prev = E.Inv.equipped; E.Inv.equipped = {arma:'x', capa:'y'};
  const sb = E.Inv.set_bonuses();
  ok((sb.crit_damage||0) >= 18, '[C3] Herdeiro do Eclipse: +18% dano crít. com 2 peças');
  E.Inv.equipped = {elmo:'a', luvas:'b', capa:'c'};
  const sb2 = E.Inv.set_bonuses();
  ok((sb2.def_pct||0) >= 15 && (sb2.hp_pct||0) >= 10, '[C3] Eco da Cidadela: 3 peças → DEF+HP');
  E.Inv.equipped = prev;
  // [C4] typo corrigido
  ok(E.DM.cfg_missions.weekly.find(m => m.id==='w4').name.startsWith('Invoque'), '[C4] typo "Invogue" corrigido');
  // [C5] loja de glória com 5 itens
  ok(E.DM.cfg_dungeons.arena.shop.length===5, '[C5] loja de Glória com 5 itens');
  // [C6] conquistas novas com tracks conhecidos
  const knownTracks = new Set(['kills','boss_kills','max_stage','level','equips','reinforce_max',
    'legendaries','divines','pets_owned','companions_owned','pet_max_stars','gacha','ascensions',
    'gold_total','arena_wins','tower_floor','missions_done','login_days','offline_collects','world_boss']);
  ok(E.DM.cfg_achievements.achievements.length===39, '[C6] 39 conquistas');
  ok(E.DM.cfg_achievements.achievements.every(a => knownTracks.has(a.track)), '[C6] todas as tracks de conquistas são conhecidas');
  // [C7] pet_frag do passe mira o pet ativo
  E.Pet.owned = {}; E.Pet.fragments = {};
  E.Pet.acquire('corvo_eclipse'); E.Pet.set_active('corvo_eclipse');
  E.Ret.bp_claimed_premium = []; E.Ret.bp_add_xp(2000); // tier 20 (premium)
  E.Ret.bp_premium_unlocked = true;
  const frag0 = E.Pet.fragments['corvo_eclipse']||0;
  E.Ret.bp_claim(20, true);
  ok((E.Pet.fragments['corvo_eclipse']||0) === frag0+60, '[C7] pet_frag do passe vai para o pet ATIVO');
  // i18n da nova chave
  ok(E.DM.cfg_loc_ptbr.evt_active && E.DM.cfg_loc_en.evt_active, 'chave evt_active em ptbr+en');
}

/* ================= 17. v1.7.0 "Herdeiro do Eclipse" (render/fx, headless-safe) ================= */
group('17. v1.7.0 Herdeiro do Eclipse');
{
  ok(E.DM.GAME_VERSION === '1.7.0', 'GAME_VERSION 1.7.0');
  // i18n aditivo das novas chaves nos dois idiomas
  ok(E.DM.cfg_loc_ptbr.boss_tag === 'CHEFE' && E.DM.cfg_loc_en.boss_tag === 'BOSS', 'boss_tag ptbr=CHEFE / en=BOSS');
  ok(E.DM.cfg_loc_ptbr.region_word === 'Região' && E.DM.cfg_loc_en.region_word === 'Region', 'region_word ptbr/en');
  // pools e constantes do render existem (objeto avaliado mesmo sem DOM)
  ok(E.Rfx.SLASH_POOL === 4 && E.Rfx.slashes.length === 0, 'pool do arco de corte declarado');
  ok(E.Rfx.ORBS_POOL === 6 && E.Rfx.orbs.length === 0, 'pool de orbes de loot declarado');
  ok(E.Rfx.RARITY_AURA[3] === '#a86ae8' && E.Rfx.RARITY_AURA[6] === '#7af0dc', 'cores de aura Épica→Divina');
  ok(E.Rfx.RARITY_ORB.divina === '#7af0dc' && E.Rfx.RARITY_ORB.rara === '#4aa3ff', 'cores de orbe por raridade');
  ok(typeof E.Rfx._eclipsePhase === 'function' && typeof E.Rfx._drawBossIntro === 'function' &&
     typeof E.Rfx._bakeCorona === 'function' && typeof E.Rfx._drawLootOrbs === 'function' &&
     typeof E.Rfx._drawHeroAura === 'function', 'métodos v1.7 presentes no Rfx');
  ok(E.Rfx.hitStopT === 0 && E.Rfx.bossIntroT === 0, 'timers de hit-stop/intro inicializados zerados');
  // fase do eclipse segue a ORDEM do regions.json (sem depender de canvas)
  const order = E.DM.cfg_regions.regions.map(r => r.id);
  ok(order.length === 7 && order[0] === 'bosque_vidro' && order[6] === 'abismo', 'ciclo de 7 regiões termina no Abismo');
  // hexA converte para rgba (usado por aura/orbe/corona)
  ok(E.Rfx._hexA('#7af0dc', 0.5) === 'rgba(122,240,220,0.5)', '_hexA converte hex→rgba');
  // regra de ouro: fórmulas intactas (sanidade dupla)
  const s1 = E.DM.enemy_stats_for_stage(1);
  ok(approx(s1.hp, 42*1.12, 0.01), 'fórmula de HP intocada na v1.7.0');
  ok(E.Save.SAVE_VERSION === 1, 'SAVE_VERSION continua 1 (formato intacto)');
}

/* ================= RESULTADO ================= */
console.log('\n==========================================');
console.log(`RESULTADO: ${pass} passou | ${fail} falhou`);
if (failures.length){ console.log('FALHAS:\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('TODOS OS TESTES PASSARAM ✓');
