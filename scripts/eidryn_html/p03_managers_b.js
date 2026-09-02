'use strict';
/* =====================================================================
   p03_managers_b.js — Pet, Gacha, Progression, Ascension, Modes, Offline, Retention
   Porta 1:1 de pet_manager.gd / gacha_manager.gd / progression_manager.gd /
   ascension_manager.gd / modes_manager.gd / offline_manager.gd / retention_manager.gd
   Fixes: [HTML-1] pity Rara+ em 10 · [HTML-2] World Boss fecha ciclo · [HTML-3] XP do Passe
   ===================================================================== */

/* ---------- PET (6 pets + 4 companheiros, estrelas) ---------- */
E.Pet = {
  owned: {}, fragments: {}, active_pet: '', active_companion: '',
  all_defs: function(){ return E.DM.cfg_pets.pets.concat(E.DM.cfg_pets.companions); },
  def: function(id){
    var all=this.all_defs();
    for(var i=0;i<all.length;i++) if(all[i].id===id) return all[i];
    return {};
  },
  is_owned: function(id){ return id in this.owned; },
  stars: function(id){ return this.owned[id]||0; },
  acquire: function(id){
    if(id in this.owned){
      var qty=E.DM.cfg_gacha.pet_duplicate.frag_qty;
      this.fragments[id]=(this.fragments[id]||0)+qty;
      E.BUS.toast_msg(this.def(id).name+' → +'+qty+' fragmentos', '#3a9e8f');
      E.Save.mark_dirty();
      return 'duplicate';
    }
    this.owned[id]=1;
    if(!(id in this.fragments)) this.fragments[id]=0;
    var d=this.def(id);
    if(d.type==='pet' && this.active_pet==='') this.active_pet=id;
    if(d.type==='companheiro' && this.active_companion==='') this.active_companion=id;
    E.Char.recalc();
    E.BUS.emit('pet_changed');
    E.Save.mark_dirty();
    return 'new';
  },
  set_active: function(id){
    var d=this.def(id);
    if(!d.id || !this.is_owned(id)) return;
    if(d.type==='pet') this.active_pet=id; else this.active_companion=id;
    E.Char.recalc();
    E.BUS.emit('pet_changed');
    E.Save.mark_dirty();
  },
  pet_bonus: function(id){
    var b={}, d=this.def(id);
    if(!d.id || !this.is_owned(id)) return b;
    var st=this.stars(id);
    for(var k in d.bonus) b[k]=d.bonus[k]+d.per_star[k]*(st-1);
    return b;
  },
  all_bonuses: function(){
    var b={};
    if(this.active_pet && this.is_owned(this.active_pet)) this._merge(this.pet_bonus(this.active_pet), b);
    if(this.active_companion && this.is_owned(this.active_companion)) this._merge(this.pet_bonus(this.active_companion), b);
    return b;
  },
  _merge: function(src, dst){ for(var k in src) dst[k]=(dst[k]||0)+src[k]; },
  bonus_value: function(key){ return this.all_bonuses()[key]||0; },
  evolve_cost_frags: function(id){
    var next=this.stars(id)+1, c=E.DM.cfg_pets.star_costs;
    if(next>E.DM.cfg_pets.max_stars || c[String(next)]==null) return 0;
    return c[String(next)];
  },
  evolve_cost_gold: function(id){
    var next=this.stars(id)+1, c=E.DM.cfg_pets.star_gold;
    if(next>E.DM.cfg_pets.max_stars || c[String(next)]==null) return 0;
    return c[String(next)];
  },
  evolve: function(id){
    if(!this.is_owned(id)) return false;
    var need_f=this.evolve_cost_frags(id);
    if(need_f<=0){ E.BUS.toast_msg(E.DM.tr('already_max'), '#9aa0a6'); return false; }
    var need_g=this.evolve_cost_gold(id);
    if((this.fragments[id]||0)<need_f || !E.Eco.can_spend('ouro', need_g)){
      E.BUS.toast_msg(E.DM.tr('not_enough'), '#d0455f');
      return false;
    }
    this.fragments[id]-=need_f;
    E.Eco.spend('ouro', need_g);
    this.owned[id]=this.stars(id)+1;
    E.Char.recalc();
    E.BUS.emit('pet_star_up', id, this.owned[id]);
    E.Save.mark_dirty();
    return true;
  },
  add_fragments: function(id, qty){ this.fragments[id]=(this.fragments[id]||0)+qty; E.Save.mark_dirty(); },
  owned_count: function(){ return Object.keys(this.owned).length; },
  max_stars_any: function(){ var m=0; for(var id in this.owned) m=Math.max(m,this.owned[id]); return m; },
  save_state: function(){ return {owned:this.owned, fragments:this.fragments, active_pet:this.active_pet, active_companion:this.active_companion}; },
  load_state: function(d){
    if(!d) return;
    this.owned=d.owned||{}; this.fragments=d.fragments||{};
    this.active_pet=d.active_pet||''; this.active_companion=d.active_companion||'';
  }
};

/* ---------- GACHA (Portal do Crepúsculo, pity transparente 10/50/100) ---------- */
E.Gacha = {
  pulls_total: 0, pulls_since_rare: 0, pulls_since_epic: 0, pulls_since_legend: 0,
  pity_state: function(){ return {total:this.pulls_total, since_rare:this.pulls_since_rare,
    since_epic:this.pulls_since_epic, since_legend:this.pulls_since_legend}; },
  pull: function(n){
    var cost_per=E.DM.cfg_gacha.pull_cost, cost10=E.DM.cfg_gacha.pull10_cost;
    var total_cost=(n===10)?cost10:cost_per*n;
    if(!E.Eco.spend('essencia', total_cost)) return [];
    var results=[], bonus=(n===10 && E.DM.cfg_gacha.pull10_bonus)?1:0;
    for(var i=0;i<n+bonus;i++) results.push(this._single_pull());
    E.Ret.track('gacha', n);
    E.Save.mark_dirty();
    return results;
  },
  _single_pull: function(){
    this.pulls_total++; this.pulls_since_rare++; this.pulls_since_epic++; this.pulls_since_legend++;
    /* Pity (D10 + HTML-1): 10 → Rara+, 50 → Épica+, 100 → Lendária+ */
    var min_rarity='';
    if(this.pulls_since_legend>=100) min_rarity='lendaria';
    else if(this.pulls_since_epic>=50) min_rarity='epica';
    else if(this.pulls_since_rare>=10) min_rarity='rara'; // [HTML-1]
    var rarity=this._roll_rarity(min_rarity);
    if(['rara','epica','lendaria','mitica','divina'].indexOf(rarity)>=0) this.pulls_since_rare=0;
    if(['epica','lendaria','mitica','divina'].indexOf(rarity)>=0) this.pulls_since_epic=0;
    if(['lendaria','mitica','divina'].indexOf(rarity)>=0) this.pulls_since_legend=0;
    var type_roll=Math.random()*100, types=E.DM.cfg_gacha.types;
    var pet_w=types.pet, comp_w=types.companheiro;
    if(type_roll<pet_w) return this._pull_pet(rarity);
    else if(type_roll<pet_w+comp_w) return this._pull_companion(rarity);
    else return this._pull_item(rarity);
  },
  _roll_rarity: function(min_rarity){
    var rates=E.DM.cfg_gacha.rates, order=['rara','epica','lendaria','mitica','divina'];
    var min_idx=order.indexOf(min_rarity); if(min_idx<0) min_idx=0;
    var weights=[], total=0;
    for(var i=0;i<order.length;i++){
      var w=Number(rates[order[i]]);
      if(i<min_idx) w=0;
      weights.push(w); total+=w;
    }
    var roll=Math.random()*total, acc=0;
    for(var j=0;j<weights.length;j++){ acc+=weights[j]; if(roll<=acc) return order[j]; }
    return order[min_idx];
  },
  _pull_pet: function(rarity){
    var pool=[], pets=E.DM.cfg_pets.pets;
    for(var i=0;i<pets.length;i++) if(E.Inv.rarity_order(pets[i].rarity)>=E.Inv.rarity_order(rarity)) pool.push(pets[i]);
    if(pool.length===0) pool=pets.slice();
    var p=pool[Math.floor(Math.random()*pool.length)];
    var res=E.Pet.acquire(p.id);
    return {kind:'pet', id:p.id, name:p.name, rarity:p.rarity, detail:res};
  },
  _pull_companion: function(rarity){
    var pool=[], comps=E.DM.cfg_pets.companions;
    for(var i=0;i<comps.length;i++) if(E.Inv.rarity_order(comps[i].rarity)>=E.Inv.rarity_order(rarity)) pool.push(comps[i]);
    if(pool.length===0) pool=comps.slice();
    var c=pool[Math.floor(Math.random()*pool.length)];
    var res=E.Pet.acquire(c.id);
    return {kind:'companheiro', id:c.id, name:c.name, rarity:c.rarity, detail:res};
  },
  _pull_item: function(rarity){
    var item_rates=E.DM.cfg_gacha.item_pull_rates;
    var order=['rara','epica','lendaria','mitica','divina'];
    var min_idx=order.indexOf(rarity); if(min_idx<0) min_idx=0;
    /* [HTML-1] pity aplica-se também a pulls de item: pesos abaixo do piso são zerados */
    var weights=[], total=0;
    for(var i=0;i<order.length;i++){
      var w= i<min_idx? 0 : Number(item_rates[order[i]]);
      weights.push(w); total+=w;
    }
    var roll=Math.random()*total, acc=0, chosen=order[min_idx];
    for(var j=0;j<weights.length;j++){ acc+=weights[j]; if(roll<=acc){ chosen=order[j]; break; } }
    var it=E.Inv.generate_item(E.Prog.farm_stage()+5, chosen);
    E.Inv.add_item(it);
    return {kind:'item', id:it.id, name:it.base, rarity:chosen, detail:it};
  },
  save_state: function(){ return {pulls_total:this.pulls_total, pulls_since_rare:this.pulls_since_rare,
    pulls_since_epic:this.pulls_since_epic, pulls_since_legend:this.pulls_since_legend}; },
  load_state: function(d){
    if(!d) return;
    this.pulls_total=d.pulls_total||0; this.pulls_since_rare=d.pulls_since_rare||0;
    this.pulls_since_epic=d.pulls_since_epic||0; this.pulls_since_legend=d.pulls_since_legend||0;
  }
};

/* ---------- PROGRESSION (500 fases, 6 regiões + Abismo, farm fallback) ---------- */
E.Prog = {
  current_stage: 1, max_stage: 1, auto_advance: true, bosses_killed_total: 0, _region_id: '',
  init: function(){
    var self=this;
    E.BUS.on('combat_ended', function(result, stage){ self._on_combat_ended(result, stage); });
  },
  current_region: function(){ return E.DM.region_for_stage(this.current_stage); },
  farm_stage: function(){
    if(this.max_stage%10===0) return Math.max(1, this.max_stage-1);
    return this.max_stage;
  },
  set_auto_advance: function(on){
    this.auto_advance=on;
    E.BUS.emit('auto_advance_toggled', on);
    E.Save.mark_dirty();
  },
  jump_to_stage: function(stage){
    this.current_stage=E.U.clamp(stage, 1, Math.max(this.max_stage, this.current_stage));
    this._notify_stage();
  },
  _on_combat_ended: function(result, stage){
    if(E.Combat.mode!=='campaign') return;
    if(result==='win'){
      if(stage>this.max_stage) this.max_stage=stage;
      if(E.DM.is_boss_stage(stage)) this.bosses_killed_total++;
      if(this.auto_advance) this.current_stage=stage+1;
      this._notify_stage();
    } else {
      this.current_stage=this.farm_stage();
      E.BUS.emit('farming_fallback', this.current_stage);
      this._notify_stage();
    }
  },
  _notify_stage: function(){
    var is_boss=E.DM.is_boss_stage(this.current_stage), is_mini=E.DM.is_miniboss_stage(this.current_stage);
    E.BUS.emit('stage_changed', this.current_stage, is_boss, is_mini);
    var reg=this.current_region();
    if(reg.id!==this._region_id){ this._region_id=reg.id; E.BUS.emit('region_changed', reg.id); }
    E.Save.mark_dirty();
  },
  /* Rendimento/segundo na fase de farm (usado por Offline e Masmorras) */
  gold_per_second: function(stage){
    var e=E.DM.enemy_stats_for_stage(stage);
    var interval=E.Char.stats().atk_interval||1;
    var kill_time=interval*4+0.6;
    return e.gold/Math.max(kill_time,0.5)*E.Eco.gold_mult();
  },
  xp_per_second: function(stage){
    var e=E.DM.enemy_stats_for_stage(stage);
    var interval=E.Char.stats().atk_interval||1;
    var kill_time=interval*4+0.6;
    return e.xp/Math.max(kill_time,0.5);
  },
  save_state: function(){ return {current_stage:this.current_stage, max_stage:this.max_stage,
    auto_advance:this.auto_advance, bosses_killed_total:this.bosses_killed_total}; },
  load_state: function(d){
    if(!d) return;
    this.current_stage=d.current_stage||1; this.max_stage=d.max_stage||1;
    this.auto_advance=d.auto_advance!==false; this.bosses_killed_total=d.bosses_killed_total||0;
    this._region_id=this.current_region().id;
  }
};

/* ---------- ASCENSION (reinício do ciclo com árvore permanente) ---------- */
E.Asc = {
  ascensions: 0, node_levels: {},
  unlock_stage: function(){ return E.DM.cfg_ascension.unlock_stage; },
  is_unlocked: function(){ return E.Prog.max_stage>=this.unlock_stage(); },
  pending_fragments: function(){
    if(!this.is_unlocked()) return 0;
    var fs=Math.max(E.Prog.farm_stage(),1);
    return Math.floor(Math.pow(fs/10, 1.35))+E.Prog.bosses_killed_total;
  },
  can_ascend: function(){ return this.is_unlocked() && this.pending_fragments()>0; },
  ascend: function(){
    if(!this.can_ascend()) return false;
    var gained=this.pending_fragments();
    E.Eco.add('fragmentos_alma', gained);
    E.Prog.current_stage=1; E.Prog.max_stage=1; E.Prog.bosses_killed_total=0;
    E.Char.level=1; E.Char.xp=0;
    for(var a in E.Char.attributes) E.Char.attributes[a]=0;
    E.Eco.currencies.ouro=E.DM.cfg_currencies.starting.ouro;
    this.ascensions++;
    E.Char.recalc();
    E.Combat.stop();
    E.Combat.start_campaign(1);
    E.BUS.emit('ascension_performed', gained);
    E.BUS.toast_msg('☾ CICLO ENCERRADO — +'+Math.floor(gained)+' Fragmentos de Alma ☽', '#f5e6c8');
    E.Save.flush();
    return true;
  },
  nodes: function(){ return E.DM.cfg_ascension.nodes; },
  node_level: function(id){ return this.node_levels[id]||0; },
  node_cost: function(n){ return n.cost*(this.node_level(n.id)+1); },
  node_requirements_met: function(n){
    var req=n.requires||[];
    for(var i=0;i<req.length;i++) if(this.node_level(req[i])<=0) return false;
    return true;
  },
  buy_node: function(id){
    var n=null, list=this.nodes();
    for(var i=0;i<list.length;i++) if(list[i].id===id){ n=list[i]; break; }
    if(!n) return false;
    var lv=this.node_level(id);
    if(lv>=n.max){ E.BUS.toast_msg(E.DM.tr('already_max'), '#9aa0a6'); return false; }
    if(!this.node_requirements_met(n)){ E.BUS.toast_msg('Requisitos não atendidos', '#d0455f'); return false; }
    if(!E.Eco.spend('fragmentos_alma', this.node_cost(n))) return false;
    this.node_levels[id]=lv+1;
    E.Char.recalc();
    E.BUS.emit('node_bought', id);
    E.Save.mark_dirty();
    return true;
  },
  tree_bonuses: function(){
    var b={}, list=this.nodes();
    for(var i=0;i<list.length;i++){
      var lv=this.node_level(list[i].id);
      if(lv<=0) continue;
      for(var k in list[i].bonus) b[k]=(b[k]||0)+list[i].bonus[k]*lv;
    }
    return b;
  },
  has_revive: function(){ return this.node_level('n10')>0; },
  offline_cap_bonus_hours: function(){ return this.tree_bonuses().offline_hours||0; },
  save_state: function(){ return {ascensions:this.ascensions, node_levels:this.node_levels}; },
  load_state: function(d){
    if(!d) return;
    this.ascensions=d.ascensions||0; this.node_levels=d.node_levels||{};
  }
};

/* ---------- MODES (Masmorras, Torre, World Boss, Arena) ---------- */
E.Modes = {
  tower_floor: 1, tower_record: 0, wb_damage: 0, wb_week: '', wb_last_rank: 0,
  arena_points: 0, arena_wins_total: 0,
  dungeon_daily: {}, cooldowns: {}, arena_attempts_today: {},
  _active_mode: '', _active_t: 0, _active_dur: 0, _wb_active: false,
  init: function(){
    var self=this;
    E.BUS.on('enemy_damaged', function(amount){ if(self._wb_active) self.wb_damage+=amount; });
  },
  can_enter: function(mode_id){
    var d=E.DM.cfg_dungeons[mode_id];
    if(!d) return {ok:false, reason:'modo desconhecido'};
    if(mode_id==='arena'){
      var used=(this.arena_attempts_today[E.TimeM.day_key()]||0);
      if(used>=d.attempts_free) return {ok:false, reason:'sem tentativas hoje', extra_gems:d.extra_attempt_gems};
      return {ok:true};
    }
    var free_key='free_'+mode_id;
    var used_free=((this.dungeon_daily[E.TimeM.day_key()]||{})[free_key]||0);
    var free_daily=d.free_daily||0;
    if((mode_id==='masmorra_ouro'||mode_id==='masmorra_xp') && used_free<free_daily) return {ok:true, free:true};
    if((d.key_cost||0)>0 && E.Eco.get_cur('chaves')<d.key_cost) return {ok:false, reason:'sem chaves'};
    var cd=this.cooldowns[mode_id]||0;
    if(E.TimeM.now()<cd) return {ok:false, reason:'em recarga', ready_at:cd};
    return {ok:true, free:false};
  },
  enter: function(mode_id){
    var check=this.can_enter(mode_id);
    if(!check.ok){ E.BUS.toast_msg(check.reason||'', '#d0455f'); return false; }
    var d=E.DM.cfg_dungeons[mode_id];
    if(mode_id==='arena'){
      var k=E.TimeM.day_key();
      this.arena_attempts_today[k]=(this.arena_attempts_today[k]||0)+1;
      return this._resolve_arena();
    }
    if(mode_id==='masmorra_ouro'||mode_id==='masmorra_xp'){
      var free=!!check.free;
      if(!free && (d.key_cost||0)>0){ if(!E.Eco.spend('chaves', d.key_cost)) return false; }
      else this._track_daily('free_'+mode_id);
    } else if(mode_id==='masmorra_equip'){
      if(!E.Eco.spend('chaves', d.key_cost!=null?d.key_cost:1)) return false;
    }
    if(mode_id==='masmorra_ouro'||mode_id==='masmorra_xp'||mode_id==='masmorra_equip'){
      this._active_mode=mode_id; this._active_t=0; this._active_dur=d.duration_s;
      E.BUS.emit('dungeon_started', mode_id, d);
      return true;
    }
    if(mode_id==='torre_infinita'){ this.tower_floor=1; this._start_tower_floor(); return true; }
    if(mode_id==='world_boss'){ this._start_world_boss(); return true; }
    return false;
  },
  _track_daily: function(key){
    var k=E.TimeM.day_key();
    if(!this.dungeon_daily[k]) this.dungeon_daily[k]={};
    this.dungeon_daily[k][key]=(this.dungeon_daily[k][key]||0)+1;
  },
  process: function(delta){
    if(this._active_mode==='') return;
    this._active_t+=delta;
    E.BUS.emit('dungeon_progress', this._active_mode, this._active_t, this._active_dur);
    if(this._active_t>=this._active_dur) this._finish_dungeon();
  },
  _finish_dungeon: function(){
    var mode_id=this._active_mode;
    this._active_mode='';
    var d=E.DM.cfg_dungeons[mode_id], fs=E.Prog.farm_stage(), rewards={};
    if(mode_id==='masmorra_ouro'){
      var g=E.Prog.gold_per_second(fs)*this._active_dur*d.reward.mult;
      E.Eco.add('ouro', g); rewards={ouro:g};
    } else if(mode_id==='masmorra_xp'){
      var x=E.Prog.xp_per_second(fs)*this._active_dur*d.reward.mult;
      E.Char.gain_xp(x); rewards={xp:x};
    } else if(mode_id==='masmorra_equip'){
      var items=[];
      for(var i=0;i<d.reward.count;i++){
        var r=E.Inv.rarity_roll('drop_rates_boss', 5);
        if(r==='comum'||r==='incomum') r='rara';
        var it=E.Inv.generate_item(fs+20, r);
        E.Inv.add_item(it);
        items.push(it);
      }
      rewards={items:items};
    }
    this.cooldowns[mode_id]=E.TimeM.now()+Math.floor((d.cooldown_h||1)*3600);
    E.Ret.track('dungeons', 1);
    E.Ret.bp_add_xp(E.DM.cfg_battlepass.xp_sources.dungeons); // [HTML-3]
    E.BUS.emit('dungeon_completed', mode_id, rewards);
  },
  /* ---------- TORRE INFINITA ---------- */
  _start_tower_floor: function(){
    var stats=E.DM.enemy_stats_for_stage(Math.max(1, E.Prog.farm_stage()));
    var fl=this.tower_floor;
    var td=E.DM.cfg_dungeons.torre_infinita;
    var hp=stats.hp*Math.pow(td.floor_scale_exp, fl);
    var atk=stats.atk*Math.pow(1.10, fl);
    var e={name:'Andar '+fl+' — Eco do Abismo', stage:fl, region:'abismo',
      boss: fl%td.boss_every===0, miniboss:false, hp:hp, atk:atk,
      def:stats.def*(1+fl*0.01), gold:stats.gold*td.reward_floor.ouro_mult,
      xp:stats.xp*td.reward_floor.xp_mult, modifiers:[], sprite:'enemy_abismo_'+(fl%5)};
    E.Combat.start_custom({mode:'tower', stage:fl, enemy:e, callback:'tower'});
  },
  on_mode_combat_end: function(cb, result, stage){
    if(cb==='tower'){
      if(result==='win'){
        E.BUS.emit('tower_floor_reached', this.tower_floor);
        this.tower_floor++;
        if(this.tower_floor>this.tower_record){
          this.tower_record=this.tower_floor;
          E.Ret.track('tower_floor', this.tower_record-1);
          E.BUS.toast_msg(E.DM.tr('new_record')+' '+this.tower_record, '#e8a33a');
        }
        this._start_tower_floor();
      } else {
        E.BUS.toast_msg('Torre: andar '+(this.tower_floor-1)+' alcançado', '#e8a33a');
      }
    } else if(cb==='world_boss'){
      this._finish_world_boss(); // [HTML-2]
    }
  },
  request_next: function(mode){ if(mode==='tower') this._start_tower_floor(); },
  /* ---------- WORLD BOSS (assíncrono, 30s de dano) ---------- */
  _start_world_boss: function(){
    this._wb_active=true; this.wb_damage=0;
    var pc_expected=30000*Math.pow(1.09, E.Prog.farm_stage());
    var hp=pc_expected*4;
    var e={name:'Devorador Menor', stage:999, region:'abismo', boss:true, miniboss:false,
      hp:hp, atk:E.DM.enemy_stats_for_stage(Math.max(1,E.Prog.farm_stage())).atk*1.4,
      def:20, gold:0, xp:0, modifiers:[], sprite:'enemy_abismo_2'};
    E.Combat.start_custom({mode:'world_boss', stage:999, enemy:e, callback:'world_boss'});
  },
  _finish_world_boss: function(){
    this._wb_active=false;
    var bots=this._gen_bots(5, E.DM.cfg_dungeons.world_boss.bots_pc_range[0], E.DM.cfg_dungeons.world_boss.bots_pc_range[1]);
    var my_score=this.wb_damage, rank=1;
    for(var i=0;i<bots.length;i++) if(bots[i]>my_score) rank++;
    var rw=E.DM.cfg_dungeons.world_boss.reward;
    var gloria=rw.gloria_base*(6-Math.min(rank,6))/5;
    var ess=rw.essencia_base*(6-Math.min(rank,6))/5;
    E.Eco.add('gloria', gloria);
    E.Eco.add('essencia', ess);
    if(rank===1) E.Eco.add('gemas', rw.gemas_top);
    this.wb_week=E.TimeM.week_key();
    this.wb_last_rank=rank;
    E.Ret.track('world_boss', 1);
    E.BUS.emit('world_boss_result', this.wb_damage, rank);
  },
  _gen_bots: function(n, lo, hi){
    var out=[], base=E.Char.pc();
    for(var i=0;i<n;i++) out.push(base*(lo+Math.random()*(hi-lo)));
    out.sort(function(a,b){return a-b;});
    out.reverse();
    return out;
  },
  /* ---------- ARENA (assíncrona — resolução automática) ---------- */
  _resolve_arena: function(){
    var my_pc=E.Char.pc();
    var range=E.DM.cfg_dungeons.arena.bots_pc_range;
    var bot_pc=my_pc*(range[0]+Math.random()*(range[1]-range[0]));
    var win_chance=my_pc/(my_pc+bot_pc);
    var win=Math.random()<=win_chance;
    var rw=E.DM.cfg_dungeons.arena[win?'reward_win':'reward_lose'];
    E.Eco.add('gloria', rw.gloria);
    if(win){ this.arena_points+=rw.pontos; this.arena_wins_total++; E.Ret.track('arena_wins', 1); }
    else this.arena_points=Math.max(0, this.arena_points+rw.pontos);
    E.BUS.emit('arena_result', win, rw);
    return true;
  },
  buy_gloria: function(offer_id){
    var shop=E.DM.cfg_dungeons.arena.shop;
    for(var i=0;i<shop.length;i++){
      var o=shop[i];
      if(o.id===offer_id){
        if(!E.Eco.spend('gloria', o.cost)) return false;
        if(o.type==='item'){
          var it=E.Inv.generate_item(E.Prog.farm_stage()+10, o.rarity);
          it.slot=o.slot;
          it.pc=E.Inv.item_pc(it);
          E.Inv.add_item(it);
        } else if(o.type==='pet_frag'){
          E.Pet.add_fragments(o.pet_id||E.Pet.all_defs()[0].id, o.qty);
        } else if(o.type==='currency'){
          E.Eco.add(o.currency, o.qty);
        }
        return true;
      }
    }
    return false;
  },
  save_state: function(){ return {tower_floor:this.tower_floor, tower_record:this.tower_record,
    wb_damage:this.wb_damage, wb_week:this.wb_week, arena_points:this.arena_points,
    arena_wins_total:this.arena_wins_total, dungeon_daily:this.dungeon_daily,
    cooldowns:this.cooldowns, arena_attempts_today:this.arena_attempts_today}; },
  load_state: function(d){
    if(!d) return;
    this.tower_floor=d.tower_floor||1; this.tower_record=d.tower_record||0;
    this.wb_damage=Number(d.wb_damage||0); this.wb_week=d.wb_week||'';
    this.arena_points=d.arena_points||0; this.arena_wins_total=d.arena_wins_total||0;
    this.dungeon_daily=d.dungeon_daily||{}; this.cooldowns=d.cooldowns||{};
    this.arena_attempts_today=d.arena_attempts_today||{};
  }
};

/* ---------- OFFLINE (cap 8h/12h, dobro via anúncio stub) ---------- */
E.Offline = {
  pending: {}, collected_count: 0,
  cap_seconds: function(){
    var h=8;
    if(E.Eco.is_premium()) h=12;
    h+=E.Asc.offline_cap_bonus_hours();
    return Math.floor(h*3600);
  },
  compute_pending: function(){
    var secs=E.TimeM.offline_seconds(this.cap_seconds());
    this.pending={};
    if(secs<60) return this.pending;
    var fs=E.Prog.farm_stage();
    var gold=E.Prog.gold_per_second(fs)*secs;
    var xp=E.Prog.xp_per_second(fs)*secs;
    this.pending={seconds:secs, gold:gold, xp:xp, stage:fs};
    return this.pending;
  },
  has_pending: function(){ return Object.keys(this.pending).length>0 && (this.pending.gold||0)>0; },
  collect: function(doubled){
    if(Object.keys(this.pending).length===0) return {};
    var mult=doubled?2:1;
    if(doubled){
      var ad=E.Platform.show_rewarded_ad('ad_offline_double');
      if(!ad) mult=1;
    }
    var gold=(this.pending.gold||0)*mult, xp=(this.pending.xp||0)*mult;
    E.Eco.add('ouro', gold);
    E.Char.gain_xp(xp);
    this.collected_count++;
    E.Ret.track('offline_collects', 1);
    var out={gold:gold, xp:xp, doubled:mult>1, seconds:this.pending.seconds||0};
    this.pending={};
    E.BUS.emit('offline_collected', out, mult>1);
    E.Save.flush();
    return out;
  },
  save_state: function(){ return {collected_count:this.collected_count}; },
  load_state: function(d){ if(!d) return; this.collected_count=d.collected_count||0; }
};

/* ---------- RETENTION (missões, conquistas, login, passe, contadores) ---------- */
E.Ret = {
  counters: {}, daily_state: {}, daily_claimed: {}, weekly_state: {}, weekly_claimed: {},
  achievements_state: {}, achievements_claimed: {},
  login_cycle_day: 0, login_last_day: '', _login_claimed_day: 0,
  bp_xp: 0, bp_claimed_free: [], bp_claimed_premium: [], bp_premium_unlocked: false,
  MAX_TRACKS: ['max_stage','level','reinforce_max','pet_max_stars','tower_floor','gold_total'],
  init: function(){
    var self=this;
    E.BUS.on('combat_ended', function(result, stage){
      if(result==='win' && E.DM.is_boss_stage(stage) && E.Combat.mode==='campaign') self.track('stages', 1);
    });
  },
  track: function(key, amount){
    this.counters[key]=(this.counters[key]||0)+amount;
    this._update_missions(key, amount);
    this._update_achievements(key, amount);
  },
  /* [HTML-3] XP do Passe de Batalha */
  bp_add_xp: function(amount){
    if(!(amount>0)) return;
    this.bp_xp+=amount;
    E.BUS.emit('bp_xp_changed', this.bp_xp, this.bp_tier());
    E.Save.mark_dirty();
  },
  bp_tier: function(){
    return Math.min(Math.floor(this.bp_xp/E.DM.cfg_battlepass.season.xp_per_level), E.DM.cfg_battlepass.tiers);
  },
  bp_claim: function(tier, premium){
    if(tier<=0 || tier>this.bp_tier()) return false;
    var arr=premium?this.bp_claimed_premium:this.bp_claimed_free;
    if(premium && !this.bp_premium_unlocked) return false;
    if(arr.indexOf(tier)>=0) return false;
    var list=premium?E.DM.cfg_battlepass.premium_track:E.DM.cfg_battlepass.free_track;
    for(var i=0;i<list.length;i++){
      var entry=list[i];
      if(entry.tier===tier){
        arr.push(tier);
        E.Eco.add_dict(entry.reward);
        if(entry.reward.item_epico) E.Inv.add_item(E.Inv.generate_item(E.Prog.farm_stage()+10, 'epica'));
        if(entry.reward.item_lendario) E.Inv.add_item(E.Inv.generate_item(E.Prog.farm_stage()+10, 'lendaria'));
        if(entry.reward.pet_frag) E.Pet.add_fragments(E.Pet.all_defs()[0].id, entry.reward.pet_frag);
        return true;
      }
    }
    return false;
  },
  _update_missions: function(key, amount){
    var changed=false, dk=E.TimeM.day_key(), wk=E.TimeM.week_key();
    if(!this.daily_state[dk]) this.daily_state[dk]={};
    if(!this.weekly_state[wk]) this.weekly_state[wk]={};
    var list=E.DM.cfg_missions.daily;
    for(var i=0;i<list.length;i++){
      if(list[i].track===key){ this.daily_state[dk][list[i].id]=(this.daily_state[dk][list[i].id]||0)+amount; changed=true; }
    }
    list=E.DM.cfg_missions.weekly;
    for(var j=0;j<list.length;j++){
      if(list[j].track===key){ this.weekly_state[wk][list[j].id]=(this.weekly_state[wk][list[j].id]||0)+amount; changed=true; }
    }
    if(changed) E.BUS.emit('missions_updated');
  },
  _update_achievements: function(key, amount){
    var list=E.DM.cfg_achievements.achievements;
    for(var i=0;i<list.length;i++){
      var a=list[i];
      if(a.track!==key) continue;
      if(this.achievements_claimed[a.id]) continue;
      var cur=this.achievements_state[a.id]||0;
      if(this.MAX_TRACKS.indexOf(key)>=0) this.achievements_state[a.id]=Math.max(cur, amount);
      else this.achievements_state[a.id]=cur+amount;
      if(this.achievements_state[a.id]>=a.goal) E.BUS.toast_msg('🏆 '+a.name, '#e8a33a');
    }
    E.BUS.emit('missions_updated');
  },
  /* achievement trackers alimentados por outros managers */
  sync_derived: function(){
    var it=E.Inv, i;
    this.track('max_stage', E.Prog.max_stage);
    this.track('level', E.Char.level);
    this.track('gold_total', E.Eco.gold_earned_total);
    this.track('pets_owned', E.Pet.owned_count());
    var comps=0; for(var id in E.Pet.owned){ if(E.Pet.def(id).type==='companheiro') comps++; }
    this.track('companions_owned', comps);
    this.track('pet_max_stars', E.Pet.max_stars_any());
    var mx=0; for(i=0;i<it.inventory.length;i++) mx=Math.max(mx, it.inventory[i].reinforce||0);
    for(var s in it.equipped) mx=Math.max(mx, it.equipped[s].reinforce||0);
    this.track('reinforce_max', mx);
    this.track('tower_floor', E.Modes.tower_record);
    this.track('legendaries', it.legendaries_found);
    this.track('divines', it.divines_found);
    this.track('equips', it.equips_total);
  },
  mission_progress: function(m, period){
    var store=period==='daily'?this.daily_state:this.weekly_state;
    var k=period==='daily'?E.TimeM.day_key():E.TimeM.week_key();
    return (store[k]||{})[m.id]||0;
  },
  mission_done: function(m, period){ return this.mission_progress(m, period)>=m.goal; },
  mission_claimed: function(m, period){
    var claimed=period==='daily'?this.daily_claimed:this.weekly_claimed;
    var k=period==='daily'?E.TimeM.day_key():E.TimeM.week_key();
    return (claimed[k]||[]).indexOf(m.id)>=0;
  },
  claim_mission: function(m, period){
    if(!this.mission_done(m, period)||this.mission_claimed(m, period)) return false;
    var k=period==='daily'?E.TimeM.day_key():E.TimeM.week_key();
    if(period==='daily'){
      if(!this.daily_claimed[k]) this.daily_claimed[k]=[];
      this.daily_claimed[k].push(m.id);
    } else {
      if(!this.weekly_claimed[k]) this.weekly_claimed[k]=[];
      this.weekly_claimed[k].push(m.id);
    }
    E.Eco.add_dict(m.reward);
    this.track('missions_done', 1);
    this.bp_add_xp(E.DM.cfg_battlepass.xp_sources.missions); // [HTML-3]
    E.BUS.emit('missions_updated');
    return true;
  },
  check_login_day: function(){
    var dk=E.TimeM.day_key();
    if(this.login_last_day===dk) return;
    this.login_last_day=dk;
    this.login_cycle_day=(this.login_cycle_day%7)+1;
    this.track('login_days', 1);
    E.Save.mark_dirty();
  },
  login_claimed_today: function(){ return this._login_claimed_day===this.login_cycle_day; },
  claim_login: function(){
    if(this.login_claimed_today()) return {};
    var dd={};
    var list=E.DM.cfg_missions.daily_login;
    for(var i=0;i<list.length;i++) if(list[i].day===this.login_cycle_day){ dd=list[i]; break; }
    if(!dd.day) return {};
    this._login_claimed_day=this.login_cycle_day;
    E.Eco.add_dict(dd.reward);
    E.BUS.emit('login_claimed', this.login_cycle_day);
    return dd;
  },
  login_day_info: function(){
    var list=E.DM.cfg_missions.daily_login;
    for(var i=0;i<list.length;i++) if(list[i].day===this.login_cycle_day) return list[i];
    return {};
  },
  achievements_list: function(){ return E.DM.cfg_achievements.achievements; },
  achievement_progress: function(a){ return Math.min(this.achievements_state[a.id]||0, a.goal); },
  achievement_claim: function(a){
    if(this.achievements_claimed[a.id]) return false;
    if(this.achievement_progress(a)<a.goal) return false;
    this.achievements_claimed[a.id]=true;
    E.Eco.add_dict(a.reward);
    E.BUS.emit('achievement_unlocked', a);
    return true;
  },
  achievements_done_count: function(){
    var c=0, list=this.achievements_list();
    for(var i=0;i<list.length;i++) if(this.achievements_claimed[list[i].id]) c++;
    return c;
  },
  save_state: function(){
    return {counters:this.counters, daily_state:this.daily_state, daily_claimed:this.daily_claimed,
      weekly_state:this.weekly_state, weekly_claimed:this.weekly_claimed,
      achievements_state:this.achievements_state, achievements_claimed:this.achievements_claimed,
      login_cycle_day:this.login_cycle_day, login_last_day:this.login_last_day,
      login_claimed_day:this._login_claimed_day, bp_xp:this.bp_xp,
      bp_claimed_free:this.bp_claimed_free, bp_claimed_premium:this.bp_claimed_premium,
      bp_premium_unlocked:this.bp_premium_unlocked};
  },
  load_state: function(d){
    if(!d) return;
    this.counters=d.counters||{}; this.daily_state=d.daily_state||{}; this.daily_claimed=d.daily_claimed||{};
    this.weekly_state=d.weekly_state||{}; this.weekly_claimed=d.weekly_claimed||{};
    this.achievements_state=d.achievements_state||{}; this.achievements_claimed=d.achievements_claimed||{};
    this.login_cycle_day=d.login_cycle_day||0; this.login_last_day=d.login_last_day||'';
    this._login_claimed_day=d.login_claimed_day||0;
    this.bp_xp=Number(d.bp_xp||0); this.bp_claimed_free=d.bp_claimed_free||[];
    this.bp_claimed_premium=d.bp_claimed_premium||[]; this.bp_premium_unlocked=!!d.bp_premium_unlocked;
  }
};
