'use strict';
/* =====================================================================
   p02_managers_a.js — Economy, Character, Inventory, Skill
   Porta 1:1 de economy_manager.gd / character_manager.gd /
   inventory_manager.gd / skill_manager.gd
   ===================================================================== */

/* ---------- ECONOMY (as 7 moedas) ---------- */
E.Eco = {
  currencies: {}, premium_until: 0, gold_earned_total: 0, spent_log: {},
  reset_to_starting: function(){
    this.currencies = {};
    var s = E.DM.cfg_currencies.starting;
    for(var k in s) this.currencies[k] = Number(s[k]);
  },
  is_premium: function(){ return E.TimeM.now() < this.premium_until; },
  event_mult: function(kind){
    var mult = 1;
    var evts = (E.DM.cfg_events&&E.DM.cfg_events.events)||[];
    for(var i=0;i<evts.length;i++){
      var e=evts[i];
      if(!e.enabled) continue;
      if(!this._event_live(e)) continue; // [C2] janelas de data/dia-da-semana agora respeitadas
      var b=e.bonus||{};
      if(b[kind]!=null) mult *= Number(b[kind]);
    }
    return mult;
  },
  /* [C2] evento "ao vivo": respeita date_start/date_end (ISO, fim do dia inclusivo)
     e days (dias da semana UTC 0=dom..6=sáb). Sem janelas = vale sempre. */
  _event_live: function(e){
    var now=E.TimeM.now();
    if(e.date_start!=null && now < this._iso(e.date_start)) return false;
    if(e.date_end!=null && now >= this._iso(e.date_end)+86400) return false;
    if(e.days && e.days.length){
      var dow=new Date(now*1000).getUTCDay(), hit=false;
      for(var i=0;i<e.days.length;i++) if(Number(e.days[i])===dow) hit=true;
      if(!hit) return false;
    }
    return true;
  },
  _iso: function(s){ return Math.floor(Date.parse(s+'T00:00:00Z')/1000); },
  /* [C2] eventos ativos agora (p/ toast de boot e HUD) */
  active_events: function(){
    var out=[], evts=(E.DM.cfg_events&&E.DM.cfg_events.events)||[];
    for(var i=0;i<evts.length;i++) if(evts[i].enabled && this._event_live(evts[i]) && evts[i].type==='multiplier') out.push(evts[i]);
    return out;
  },
  gold_mult: function(){ var m=this.event_mult('gold_mult'); if(this.is_premium()) m*=1.10; return m; },
  xp_mult: function(){ return this.event_mult('xp_mult'); },
  get_cur: function(id){ return Number(this.currencies[id]||0); },
  add: function(id, amount){
    if(!(amount>0)) return;
    var caps=E.DM.cfg_currencies.caps;
    var v=this.get_cur(id)+amount;
    if(caps[id]!=null) v=Math.min(v, Number(caps[id]));
    this.currencies[id]=v;
    if(id==='ouro'){ this.gold_earned_total+=amount; E.BUS.emit('gold_changed', v); }
    E.BUS.emit('currency_changed', id, v);
    E.Save.mark_dirty();
  },
  spend: function(id, amount){
    if(!this.can_spend(id, amount)){ E.BUS.toast_msg(E.DM.tr('not_enough'), '#d0455f'); return false; }
    this.currencies[id]=this.get_cur(id)-amount;
    this.spent_log[id]=(this.spent_log[id]||0)+amount;
    if(id==='ouro') E.BUS.emit('gold_changed', this.currencies[id]);
    E.BUS.emit('currency_changed', id, this.currencies[id]);
    E.Save.mark_dirty();
    return true;
  },
  can_spend: function(id, amount){ return this.get_cur(id) >= amount-0.0001; },
  add_dict: function(rewards){
    for(var id in rewards){
      var amt=rewards[id];
      if(typeof amt==='number') this.add(id, amt);
    }
  },
  save_state: function(){ return {currencies:JSON.parse(JSON.stringify(this.currencies)), premium_until:this.premium_until,
    gold_earned_total:this.gold_earned_total, spent_log:JSON.parse(JSON.stringify(this.spent_log))}; },
  load_state: function(d){
    if(!d) return;
    var cur=d.currencies||{};
    if(Object.keys(cur).length===0) return;
    this.currencies=cur; this.premium_until=d.premium_until||0;
    this.gold_earned_total=Number(d.gold_earned_total||0); this.spent_log=d.spent_log||{};
  }
};

/* ---------- CHARACTER (12 atributos, XP/nível, PC em tempo real) ---------- */
E.Char = {
  level: 1, xp: 0, attributes: {}, _cached: {},
  init: function(){
    var list=E.DM.cfg_attributes.attributes;
    for(var i=0;i<list.length;i++) this.attributes[list[i].id]=0;
    this.recalc();
  },
  attr_level: function(id){ return this.attributes[id]||0; },
  attr_cost: function(id){
    var list=E.DM.cfg_attributes.attributes;
    for(var i=0;i<list.length;i++) if(list[i].id===id) return E.DM.attribute_cost(list[i], this.attr_level(id));
    return Infinity;
  },
  upgrade_attribute: function(id){
    var cost=this.attr_cost(id);
    if(cost===Infinity) return false;
    if(!E.Eco.spend('ouro', cost)) return false;
    this.attributes[id]=this.attr_level(id)+1;
    this.recalc();
    E.BUS.emit('attribute_upgraded', id, this.attributes[id]);
    E.Save.mark_dirty();
    return true;
  },
  gain_xp: function(amount){
    var cap=E.DM.cfg_attributes.level.cap;
    if(this.level>=cap) return;
    this.xp += amount*E.Eco.xp_mult();
    E.BUS.emit('xp_gained', amount);
    var leveled=false;
    while(this.level<cap && this.xp>=E.DM.level_xp_cost(this.level)){
      this.xp-=E.DM.level_xp_cost(this.level);
      this.level++; leveled=true;
      E.BUS.emit('level_up', this.level);
    }
    if(leveled) this.recalc();
    E.Skill.check_unlocks();
    E.Save.mark_dirty();
  },
  recalc: function(){ this._cached=this.compute_stats(); E.BUS.emit('stats_recalculated', this._cached); },
  /* Stats finais: base + nível + atributos (D21 multiplicativo) + passivas + equip + sets + pets + ascensão */
  compute_stats: function(){
    var hb=E.DM.cfg_attributes.hero_base, lv=this.level-1;
    var hp=hb.hp+lv*hb.per_level_hp, atk=hb.atk+lv*hb.per_level_atk, def=hb.def+lv*hb.per_level_def;
    var crit_rate=hb.crit_rate, crit_damage=hb.crit_damage, lifesteal=hb.lifesteal, dodge=hb.dodge;
    var regen=0, gold_find=0, xp_gain=0, boss_damage=0, drop_bonus=0, luck=0;
    // Atributos investidos
    var list=E.DM.cfg_attributes.attributes;
    for(var i=0;i<list.length;i++){
      var pts=this.attr_level(list[i].id);
      switch(list[i].id){
        case 'forca': atk*=1+pts*0.07; break;
        case 'vitalidade': hp*=1+pts*0.06; def*=1+pts*0.025; break;
        case 'sorte': crit_rate+=pts*0.1; luck+=pts*0.05; drop_bonus+=pts*0.05; break;
        case 'crit_rate': crit_rate+=pts*0.5; break;
        case 'crit_damage': crit_damage+=pts*1.0; break;
        case 'lifesteal': lifesteal+=pts*0.3; break;
        case 'defesa': def*=1+pts*0.025; break;
        case 'regeneracao': regen+=pts*0.5; break;
      }
    }
    // Vel. ataque: AtkSpeed + Destreza reduzem o intervalo (cap +300%)
    var atk_interval = hb.atk_interval/(1+Math.min(this.attr_level('atk_speed')*0.01+this.attr_level('destreza')*0.003, 3.0));
    crit_rate=Math.min(crit_rate,75); lifesteal=Math.min(lifesteal,30);
    // Passivas
    var sk=E.Skill.passive_bonuses();
    atk*=1+(sk.atk_pct||0)/100; hp*=1+(sk.hp_pct||0)/100; def*=1+(sk.def_pct||0)/100;
    crit_rate+=(sk.crit||0); gold_find+=(sk.gold||0);
    atk_interval/=1+(sk.as||0)/100; lifesteal+=(sk.ls||0);
    // Equipamentos
    var eq=E.Inv.equip_bonuses();
    atk*=1+(eq.atk_pct||0)/100; hp*=1+(eq.hp_pct||0)/100; def*=1+(eq.def_pct||0)/100;
    crit_rate+=(eq.crit_rate||0); crit_damage+=(eq.crit_damage||0);
    atk_interval/=1+(eq.atk_speed||0)/100; lifesteal+=(eq.lifesteal||0);
    gold_find+=(eq.gold_find||0); boss_damage+=(eq.boss_damage||0); regen+=(eq.regen||0);
    atk+=(eq.atk_flat||0); hp+=(eq.hp_flat||0); def+=(eq.def_flat||0);
    // Sets
    var st=E.Inv.set_bonuses();
    for(var k in st){
      switch(k){
        case 'atk_pct': atk*=1+st[k]/100; break;
        case 'hp_pct': hp*=1+st[k]/100; break;
        case 'def_pct': def*=1+st[k]/100; break;
        case 'crit_rate': crit_rate+=st[k]; break;
        case 'atk_speed': atk_interval/=1+st[k]/100; break;
        case 'lifesteal': lifesteal+=st[k]; break;
      }
    }
    // Pets + companheiros
    var pb=E.Pet.all_bonuses();
    for(var k2 in pb){
      switch(k2){
        case 'atk_pct': atk*=1+pb[k2]/100; break;
        case 'hp_pct': hp*=1+pb[k2]/100; break;
        case 'def_pct': def*=1+pb[k2]/100; break;
        case 'crit_rate': crit_rate+=pb[k2]; break;
        case 'crit_damage': crit_damage+=pb[k2]; break;
        case 'atk_speed': atk_interval/=1+pb[k2]/100; break;
        case 'lifesteal': lifesteal+=pb[k2]; break;
        case 'gold_find': gold_find+=pb[k2]; break;
        case 'xp_gain': xp_gain+=pb[k2]; break;
      }
    }
    // Árvore de Ascensão
    var ab=E.Asc.tree_bonuses();
    var a_atk=(ab.atk_pct||0)+(ab.all_pct||0), a_hp=(ab.hp_pct||0)+(ab.all_pct||0), a_def=(ab.def_pct||0)+(ab.all_pct||0);
    atk*=1+a_atk/100; hp*=1+a_hp/100; def*=1+a_def/100;
    crit_rate+=(ab.crit_rate||0); crit_damage+=(ab.crit_damage||0);
    boss_damage+=(ab.boss_damage||0); atk_interval/=1+(ab.atk_speed||0)/100;
    regen+=(ab.regen||0); dodge+=(ab.dodge||0); gold_find+=(ab.gold_find||0);
    xp_gain+=(ab.xp_gain||0); drop_bonus+=(ab.drop_bonus_pct||0);
    crit_rate=Math.min(crit_rate,90); lifesteal=Math.min(lifesteal,45);
    return {hp:hp, atk:atk, def:def, crit_rate:crit_rate, crit_damage:crit_damage,
      atk_interval:Math.max(atk_interval,0.25), lifesteal:lifesteal, dodge:dodge,
      regen:regen, gold_find:gold_find, xp_gain:xp_gain, boss_damage:boss_damage,
      drop_bonus:drop_bonus, luck:luck};
  },
  /* Poder de Combate (D09) */
  compute_pc: function(stats){
    var s = stats||this._cached;
    if(!s || Object.keys(s).length===0) s=this.compute_stats();
    var pc=0;
    pc+=s.atk*6; pc+=s.hp*0.6; pc+=s.def*8; pc+=s.crit_rate*12; pc+=s.crit_damage*4;
    pc+=(1/s.atk_interval)*150; pc+=s.lifesteal*20; pc+=s.boss_damage*6;
    return pc;
  },
  pc: function(){ return this.compute_pc(); },
  stats: function(){ return this._cached; },
  save_state: function(){ return {level:this.level, xp:this.xp, attributes:JSON.parse(JSON.stringify(this.attributes))}; },
  load_state: function(d){
    if(!d) return;
    this.level=Math.max(1, d.level||1); this.xp=Number(d.xp||0);
    var attrs=d.attributes||{};
    for(var k in attrs) if(k in this.attributes) this.attributes[k]=attrs[k]|0;
    this.recalc();
  }
};

/* ---------- INVENTORY (10 slots, 7 raridades, sets, reforço com pity, fusão) ---------- */
E.Inv = {
  INV_CAP: 120,
  STAT_PC_WEIGHTS: {atk_pct:8, hp_pct:4, def_pct:6, atk_speed:10, crit_rate:15, crit_damage:5,
    lifesteal:20, gold_find:2, boss_damage:8, regen:5, atk_flat:0.6, hp_flat:0.05, def_flat:1},
  ORDER: ['comum','incomum','rara','epica','lendaria','mitica','divina'],
  inventory: [], equipped: {}, item_seq: 1, rein_fail_streak: 0,
  legendaries_found: 0, divines_found: 0, equips_total: 0,
  rarity_data: function(rid){
    var rs=E.DM.cfg_items.rarities;
    for(var i=0;i<rs.length;i++) if(rs[i].id===rid) return rs[i];
    return {dismantle:1, sell:10};
  },
  rarity_order: function(rid){ return this.ORDER.indexOf(rid); },
  rarity_roll: function(weights_key, luck_bonus){
    var rates=E.DM.cfg_items[weights_key];
    var names=this.ORDER;
    var luck_shift=1+Math.min(luck_bonus, E.DM.cfg_items.drop_scale.cap_bonus_pct)/100;
    var weights=[], total=0;
    for(var i=0;i<names.length;i++){
      var w=Number(rates[names[i]]);
      if(i>=2) w*=luck_shift;
      weights.push(w); total+=w;
    }
    var roll=Math.random()*total, acc=0;
    for(var j=0;j<weights.length;j++){ acc+=weights[j]; if(roll<=acc) return names[j]; }
    return 'comum';
  },
  generate_item: function(stage, rarity, rng){
    rng = rng || null;
    var rr = rng || {randi_range:function(a,b){return a+Math.floor(Math.random()*(b-a+1));}};
    var slots=E.DM.cfg_items.slots;
    var slot=slots[rr.randi_range(0,slots.length-1)];
    var rdata=this.rarity_data(rarity);
    var bases=E.DM.cfg_items.bases;
    var pool=bases[slot.id];
    var base_name=pool[rr.randi_range(0,pool.length-1)];
    var ilvl=Math.min(stage,500);
    var pstats=E.DM.cfg_items.primary_stats;
    var pid=slot.primary, pconf=pstats[pid];
    var wsum=0, wdict=slot.weight||{};
    for(var k in wdict) wsum+=Number(wdict[k]);
    var wshare=Number(wdict[pid]!=null?wdict[pid]:1)/Math.max(wsum,0.0001);
    var pv=(pconf.base+pconf.per_level*ilvl)*rdata.stat_mult*wshare;
    var secondaries={};
    var spool=E.DM.cfg_items.secondary_pool;
    var n_aff=rdata.affixes, chosen=[], guard=0;
    while(Object.keys(secondaries).length<n_aff && guard<50){
      guard++;
      var cand=spool[rr.randi_range(0,spool.length-1)];
      if(cand.id===pid || chosen.indexOf(cand.id)>=0) continue;
      chosen.push(cand.id);
      var v=(cand.base+cand.per_level*ilvl*0.5)*rdata.stat_mult*(rng?rng.randf_range(0.8,1.2):(0.8+Math.random()*0.4));
      secondaries[cand.id]=Math.round(v*100)/100;
    }
    var item={id:'i_'+this.item_seq, slot:slot.id, base:base_name, rarity:rarity, ilvl:Math.floor(ilvl),
      reinforce:0, primary_id:pid, primary:Math.round(pv*100)/100, secondaries:secondaries,
      favorite:false, locked:false};
    item.pc=this.item_pc(item);
    this.item_seq++;
    return item;
  },
  item_pc: function(item){
    var pc=Number(item.primary||0)*Number(this.STAT_PC_WEIGHTS[item.primary_id]||1);
    var sec=item.secondaries||{};
    for(var sid in sec) pc+=Number(sec[sid])*Number(this.STAT_PC_WEIGHTS[sid]||1);
    pc*=1+0.08*Number(item.reinforce||0);
    return Math.round(pc*100)/100;
  },
  try_drop: function(stage, is_boss, stats){
    var base_chance = is_boss? E.DM.cfg_items.drop_chance_boss : E.DM.cfg_items.drop_chance_normal;
    var chance=base_chance*(1+(stats.drop_bonus||0)/100)*E.Eco.event_mult('drop_mult'); // [C2] drop_mult agora é lido
    if(chance>1) chance=1;
    if(Math.random()>chance) return;
    var luck=(stats.luck||0)+(is_boss?2:0);
    var rarity=this.rarity_roll(is_boss?'drop_rates_boss':'drop_rates_normal', luck);
    var item=this.generate_item(stage, rarity);
    this.add_item(item);
  },
  add_item: function(item){
    if(item.rarity==='divina') this.divines_found++;
    else if(item.rarity==='lendaria'||item.rarity==='mitica') this.legendaries_found++;
    if(this.inventory.length>=this.INV_CAP){ E.BUS.emit('inventory_full'); return; }
    this.inventory.push(item);
    this.equips_total++;
    E.BUS.emit('item_dropped', item);
    if(this.ORDER.indexOf(item.rarity)>=2) E.BUS.emit('loot_rare', item);
    E.Save.mark_dirty();
  },
  equip_item: function(item_id){
    var idx=this._find_index(item_id);
    if(idx<0) return false;
    var item=this.inventory[idx], slot=item.slot;
    this.inventory.splice(idx,1);
    if(this.equipped[slot]){ this.inventory.push(this.equipped[slot]); E.BUS.emit('item_unequipped', slot); }
    this.equipped[slot]=item;
    this.equips_total++;
    E.Char.recalc();
    E.BUS.emit('item_equipped', item);
    E.Save.mark_dirty();
    return true;
  },
  unequip_slot: function(slot){
    if(!this.equipped[slot]) return false;
    if(this.inventory.length>=this.INV_CAP){ E.BUS.emit('inventory_full'); return false; }
    this.inventory.push(this.equipped[slot]);
    delete this.equipped[slot];
    E.Char.recalc();
    E.BUS.emit('item_unequipped', slot);
    E.Save.mark_dirty();
    return true;
  },
  auto_equip: function(){
    var count=0, slots=E.DM.cfg_items.slots;
    for(var i=0;i<slots.length;i++){
      var sid=slots[i].id, best=null, best_pc=-1, cur_pc=-1;
      if(this.equipped[sid]) cur_pc=this.item_pc(this.equipped[sid]);
      for(var j=0;j<this.inventory.length;j++){
        var it=this.inventory[j];
        if(it.slot!==sid||it.locked) continue;
        var p=this.item_pc(it);
        if(p>best_pc){ best_pc=p; best=it; }
      }
      if(best && best_pc>cur_pc && this.equip_item(best.id)) count++;
    }
    return count;
  },
  dismantle_item: function(item_id){
    var idx=this._find_index(item_id);
    if(idx<0) return {};
    return this._dismantle_at(idx);
  },
  _dismantle_at: function(idx){
    var item=this.inventory[idx];
    if(item.locked||item.favorite) return {};
    var rd=this.rarity_data(item.rarity);
    var frags=rd.dismantle*(1+(item.reinforce||0));
    var gold=rd.sell*(1+(item.reinforce||0));
    this.inventory.splice(idx,1);
    E.Eco.add('fragmentos_equip', frags);
    E.Eco.add('ouro', gold);
    E.BUS.emit('item_dismantled', item);
    E.Save.mark_dirty();
    return {fragments:frags, gold:gold};
  },
  auto_dismantle: function(min_rarity){
    min_rarity=min_rarity||'rara';
    var cut=this.ORDER.indexOf(min_rarity), count=0;
    for(var i=this.inventory.length-1;i>=0;i--){
      var it=this.inventory[i];
      if(this.ORDER.indexOf(it.rarity)<cut){ if(this._dismantle_at(i)) count++; }
    }
    return count;
  },
  /* Reforço (+1→+20) com pity de falhas (falha NUNCA destrói) */
  reinforce: function(item_id){
    var idx=this._find_index(item_id);
    if(idx<0) return false;
    var item=this.inventory[idx];
    var lvl=item.reinforce||0;
    if(lvl>=E.DM.cfg_items.reinforce.max){ E.BUS.toast_msg(E.DM.tr('already_max'), '#9aa0a6'); return false; }
    var cost=this.reinforce_cost(item);
    if(!E.Eco.spend('ouro', cost)) return false;
    var chance=E.DM.cfg_items.reinforce.chances[lvl];
    chance=Math.min(chance + E.Pet.bonus_value('reinforce_luck')/100, 1);
    var success=Math.random()<=chance;
    if(!success){
      this.rein_fail_streak++;
      if(this.rein_fail_streak>=E.DM.cfg_items.reinforce.pity) success=true;
    }
    if(success){
      this.rein_fail_streak=0;
      item.reinforce=lvl+1;
      item.pc=this.item_pc(item);
      E.Char.recalc();
    }
    E.BUS.emit('item_reinforced', item, success, E.DM.cfg_items.reinforce.pity-this.rein_fail_streak);
    E.Save.mark_dirty();
    return success;
  },
  reinforce_cost: function(item){
    var rc=E.DM.cfg_items.reinforce, lvl=item.reinforce||0;
    return rc.cost_base*Math.pow(rc.cost_exp, lvl)*Math.pow(rc.cost_rarity_mult, this.rarity_order(item.rarity));
  },
  reinforce_pity_left: function(){ return E.DM.cfg_items.reinforce.pity-this.rein_fail_streak; },
  /* Fusão por fragmentos */
  fuse_item: function(rarity){
    var fc=E.DM.cfg_items.fusion.fragments_cost, gc=E.DM.cfg_items.fusion.gold_cost;
    if(fc[rarity]==null) return {};
    var fr=fc[rarity], go=gc[rarity];
    if(!E.Eco.can_spend('fragmentos_equip', fr)||!E.Eco.can_spend('ouro', go)){
      E.BUS.toast_msg(E.DM.tr('not_enough'), '#d0455f');
      return {};
    }
    E.Eco.spend('fragmentos_equip', fr);
    E.Eco.spend('ouro', go);
    var item=this.generate_item(E.Prog.farm_stage(), rarity);
    this.add_item(item);
    return item;
  },
  equip_bonuses: function(){
    var b={};
    for(var slot in this.equipped){
      var it=this.equipped[slot];
      this._add(b, it.primary_id, it.primary*(1+0.08*(it.reinforce||0)));
      var sec=it.secondaries||{};
      for(var sid in sec) this._add(b, sid, sec[sid]);
    }
    return b;
  },
  set_bonuses: function(){
    var b={}, worn=[];
    for(var slot in this.equipped) worn.push(slot);
    var sets=E.DM.cfg_items.sets;
    for(var i=0;i<sets.length;i++){
      var pieces=sets[i].pieces, wc=0;
      for(var j=0;j<pieces.length;j++) if(worn.indexOf(pieces[j])>=0) wc++;
      if(wc>=2 && sets[i].bonus_2) for(var k in sets[i].bonus_2) this._add(b,k,sets[i].bonus_2[k]);
      if(wc>=3 && sets[i].bonus_3) for(var k2 in sets[i].bonus_3) this._add(b,k2,sets[i].bonus_3[k2]);
    }
    return b;
  },
  _add: function(b, key, val){ b[key]=(b[key]||0)+val; },
  _find_index: function(item_id){
    for(var i=0;i<this.inventory.length;i++) if(this.inventory[i].id===item_id) return i;
    return -1;
  },
  get_item: function(item_id){
    var i=this._find_index(item_id);
    return i>=0? this.inventory[i] : {};
  },
  toggle_favorite: function(item_id){
    var it=this.get_item(item_id);
    if(it.id){ it.favorite=!it.favorite; E.Save.mark_dirty(); }
  },
  toggle_lock: function(item_id){
    var it=this.get_item(item_id);
    if(it.id){ it.locked=!it.locked; E.Save.mark_dirty(); }
  },
  filtered: function(slot_filter, rarity_filter){
    var out=[];
    for(var i=0;i<this.inventory.length;i++){
      var it=this.inventory[i];
      if(slot_filter!=='all' && it.slot!==slot_filter) continue;
      if(rarity_filter!=='all' && it.rarity!==rarity_filter) continue;
      out.push(it);
    }
    out.sort(function(a,b){ return E.Inv.item_pc(b)-E.Inv.item_pc(a); });
    return out;
  },
  save_state: function(){ return {inventory:this.inventory, equipped:this.equipped, item_seq:this.item_seq,
    rein_fail_streak:this.rein_fail_streak, legendaries_found:this.legendaries_found,
    divines_found:this.divines_found, equips_total:this.equips_total}; },
  load_state: function(d){
    if(!d) return;
    this.inventory=d.inventory||[]; this.equipped=d.equipped||{};
    this.item_seq=d.item_seq||1; this.rein_fail_streak=d.rein_fail_streak||0;
    this.legendaries_found=d.legendaries_found||0; this.divines_found=d.divines_found||0;
    this.equips_total=d.equips_total||0;
  }
};

/* ---------- SKILL (4 ativas + 4 passivas + 1 suprema, auto-cast, evolução) ---------- */
E.Skill = {
  levels: {}, unlocked: {}, evolved: {}, auto_cast: {}, cooldowns: {},
  init: function(){
    var i, list;
    list=E.DM.cfg_skills.active;
    for(i=0;i<list.length;i++){ this.levels[list[i].id]=0; this.auto_cast[list[i].id]=!!E.DM.cfg_skills.auto_cast_default; }
    list=E.DM.cfg_skills.passive;
    for(i=0;i<list.length;i++) this.levels[list[i].id]=0;
    list=E.DM.cfg_skills.supreme;
    for(i=0;i<list.length;i++){ this.levels[list[i].id]=0; this.auto_cast[list[i].id]=false; }
  },
  check_unlocks: function(){
    var changed=false, sections=['active','passive','supreme'];
    for(var s=0;s<sections.length;s++){
      var list=E.DM.cfg_skills[sections[s]];
      for(var i=0;i<list.length;i++){
        var sk=list[i];
        if(!this.unlocked[sk.id] && E.Char.level>=sk.unlock_level){
          this.unlocked[sk.id]=true; this.levels[sk.id]=1; changed=true;
          E.BUS.toast_msg(E.DM.tr('skills')+': '+sk.name+'!', '#e8a33a');
        }
      }
    }
    if(changed){ E.Char.recalc(); E.Save.mark_dirty(); }
  },
  all_skills: function(){
    var out=[], sections=['active','passive','supreme'];
    for(var s=0;s<sections.length;s++){
      var list=E.DM.cfg_skills[sections[s]];
      for(var i=0;i<list.length;i++){
        var d=JSON.parse(JSON.stringify(list[i]));
        d.level=this.levels[list[i].id]||0;
        d.unlocked=!!this.unlocked[list[i].id];
        d.evolved=!!this.evolved[list[i].id];
        d.auto=!!this.auto_cast[list[i].id];
        out.push(d);
      }
    }
    return out;
  },
  skill_def: function(id){
    var sections=['active','passive','supreme'];
    for(var s=0;s<sections.length;s++){
      var list=E.DM.cfg_skills[sections[s]];
      for(var i=0;i<list.length;i++) if(list[i].id===id) return list[i];
    }
    return {};
  },
  scaled_value: function(id, key){
    var s=this.skill_def(id);
    if(!s.id) return 0;
    var lv=this.levels[id]||0;
    if(lv<=0) return 0;
    var base=(s.base&&s.base[key])||0, per=(s.per_level&&s.per_level[key])||0;
    return base+per*(lv-1);
  },
  tooltip_pair: function(id, key){
    return {current:this.scaled_value(id,key), next:this.scaled_value(id,key)+((this.skill_def(id).per_level||{})[key]||0)};
  },
  upgrade_skill: function(id){
    var s=this.skill_def(id);
    if(!s.id||!this.unlocked[id]) return false;
    var lv=this.levels[id]||0;
    if(lv>=s.max_level){ E.BUS.toast_msg(E.DM.tr('already_max'), '#9aa0a6'); return false; }
    var cost=E.DM.cfg_skills.upgrade_cost_base*Math.pow(E.DM.cfg_skills.upgrade_cost_exp, Math.max(0,lv-1));
    if(!E.Eco.spend('ouro', cost)) return false;
    this.levels[id]=lv+1;
    if(this.levels[id]>=((s.evolve_at!=null)?s.evolve_at:999) && s.evolve) this.evolved[id]=true;
    E.Char.recalc();
    E.BUS.emit('skill_leveled', id, this.levels[id]);
    E.Save.mark_dirty();
    return true;
  },
  upgrade_cost: function(id){
    var lv=this.levels[id]||0;
    if(lv<=0) return E.DM.cfg_skills.upgrade_cost_base;
    return E.DM.cfg_skills.upgrade_cost_base*Math.pow(E.DM.cfg_skills.upgrade_cost_exp, lv-1);
  },
  toggle_auto: function(id){ this.auto_cast[id]=!this.auto_cast[id]; E.Save.mark_dirty(); },
  tick_cooldowns: function(delta){
    for(var id in this.cooldowns){
      if(this.cooldowns[id]>0){
        this.cooldowns[id]=Math.max(0, this.cooldowns[id]-delta);
        if(this.cooldowns[id]===0) E.BUS.emit('skill_ready', id);
      }
    }
  },
  cast: function(id){
    var s=this.skill_def(id);
    if(!s.id||(this.levels[id]||0)<=0) return false;
    if((this.cooldowns[id]||0)>0) return false;
    this.cooldowns[id]=s.cooldown;
    E.BUS.emit('skill_casted', s);
    return true;
  },
  ready_skills: function(auto_only){
    var ready=[], sections=['active','supreme'];
    for(var s=0;s<sections.length;s++){
      var list=E.DM.cfg_skills[sections[s]];
      for(var i=0;i<list.length;i++){
        var sk=list[i];
        if((this.levels[sk.id]||0)<=0) continue;
        if(auto_only && !this.auto_cast[sk.id]) continue;
        if((this.cooldowns[sk.id]||0)<=0) ready.push(sk);
      }
    }
    return ready;
  },
  passive_bonuses: function(){
    var b={}, list=E.DM.cfg_skills.passive;
    for(var i=0;i<list.length;i++){
      var id=list[i].id;
      if((this.levels[id]||0)<=0) continue;
      for(var key in list[i].per_level) b[key]=(b[key]||0)+this.scaled_value(id, key);
    }
    return b;
  },
  /* Multiplicador de dano da ativa (inclui Energia do herói) */
  active_mult: function(id){
    var mult=this.scaled_value(id,'mult');
    mult*=1+E.Char.attr_level('energia')*0.004;
    if(this.evolved[id]) mult*=1.10;
    return mult;
  },
  cooldown_left: function(id){ return this.cooldowns[id]||0; },
  total_levels: function(){ var t=0; for(var id in this.levels) t+=this.levels[id]; return t; },
  save_state: function(){ return {levels:this.levels, unlocked:this.unlocked, evolved:this.evolved, auto_cast:this.auto_cast}; },
  load_state: function(d){
    if(!d) return;
    var i;
    for(i in d.levels||{}) if(i in this.levels) this.levels[i]=d.levels[i]|0;
    for(i in d.unlocked||{}) this.unlocked[i]=!!d.unlocked[i];
    for(i in d.evolved||{}) this.evolved[i]=!!d.evolved[i];
    for(i in d.auto_cast||{}) this.auto_cast[i]=!!d.auto_cast[i];
  }
};
