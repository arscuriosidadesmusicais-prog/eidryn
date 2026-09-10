'use strict';
/* =====================================================================
   p04_combat.js — CombatManager + SaveManager + AudioManager
   Porta 1:1 de combat_manager.gd / save_manager.gd / audio_manager.gd
   ===================================================================== */

/* ---------- COMBAT (loop automático, skills, modificadores, recompensas) ---------- */
E.Combat = {
  ENEMY_INTERVAL: 2.0,
  RESPAWN_DELAY: 0.7,
  active: false,
  mode: 'campaign',
  stage: 1,
  enemy: {}, enemy_hp: 0, enemy_shield: 0, enemy_berserk: false,
  hero_hp: 0, hero_shield: 0, revive_used: false,
  _hero_t: 0, _enemy_t: 0, _spawn_t: 0, _boss_t: 0,
  _buff_atk_pct: 0, _buff_time: 0,
  _dot_dmg: 0, _dot_time: 0, _dot_per_s: 0, _dot_lifesteal: false,
  _enemy_atk_shred: 0, _enemy_def_shred: 0, _stun_t: 0, _reflect_pct: 0,
  _mode_callback: '', _restart_pending: false,

  start_campaign: function(stage){
    this.mode='campaign'; this.stage=stage; this._begin();
  },
  start_custom: function(ctx){
    this.mode=ctx.mode||'tower';
    this.stage=ctx.stage||1;
    this.enemy=ctx.enemy||{};
    this._mode_callback=ctx.callback||'';
    this._begin_with_enemy();
  },
  stop: function(){ this.active=false; },
  _begin: function(){
    this.enemy=E.DM.enemy_for_stage(this.stage);
    this._begin_with_enemy();
  },
  _begin_with_enemy: function(){
    var stats=E.Char.stats();
    this.hero_hp=stats.hp; this.hero_shield=0; this.revive_used=false;
    this._reset_effects();
    this.active=true;
    this._spawn_t=0; this._hero_t=0; this._enemy_t=0; this._restart_pending=false;
    this.enemy_hp=this._enemy_max_hp();
    if(this.enemy.boss) this._boss_t=E.DM.cfg_enemies.boss_timer_s;
    else this._boss_t=0;
    this._apply_spawn_modifiers();
    E.BUS.emit('combat_started', this.stage, !!this.enemy.boss);
    E.BUS.emit('enemy_spawned', this.enemy);
    E.BUS.emit('enemy_hp_changed', this.enemy_hp+this.enemy_shield, this._enemy_max_hp());
    E.BUS.emit('hero_hp_changed', this.hero_hp, stats.hp);
  },
  _reset_effects: function(){
    this._buff_atk_pct=0; this._buff_time=0;
    this._dot_dmg=0; this._dot_time=0; this._dot_per_s=0; this._dot_lifesteal=false;
    this._enemy_atk_shred=0; this._enemy_def_shred=0;
    this._stun_t=0; this._reflect_pct=0;
  },
  _apply_spawn_modifiers: function(){
    this.enemy_shield=0; this.enemy_berserk=false;
    var mods=this.enemy.modifiers||[];
    if(mods.indexOf('escudo')>=0) this.enemy_shield=this._enemy_max_hp()*0.25;
    if(mods.indexOf('reforçado')>=0) this.enemy.def=this.enemy.def*1.2;
  },
  _enemy_max_hp: function(){ return this.enemy.hp||1; },
  _enemy_atk: function(){
    var a=this.enemy.atk||1;
    if(this.enemy_berserk) a*=1.5;
    if(this._enemy_atk_shred>0) a*=1-this._enemy_atk_shred/100;
    return a;
  },
  /* ---------- LOOP ---------- */
  process: function(delta){
    if(!this.active) return;
    var stats=E.Char.stats();
    if(this._spawn_t>0){
      this._spawn_t-=delta;
      if(this._spawn_t<=0){
        if(this._restart_pending){ this.stage=E.Prog.current_stage; this._begin(); } // [HTML-5]
        else this._next_after_win();
      }
      return;
    }
    if(!this._alive()) return;
    this._auto_cast();
    E.Skill.tick_cooldowns(delta);
    if(stats.regen>0) this.hero_hp=Math.min(this.hero_hp+stats.regen*delta, stats.hp);
    if(this._buff_time>0){
      this._buff_time-=delta;
      if(this._buff_time<=0) this._buff_atk_pct=0;
    }
    if(this._dot_time>0){
      this._dot_time-=delta;
      var tick=this._dot_per_s*delta;
      this._apply_damage_to_enemy(tick, false, '#9b59d0', true);
      if(this._dot_lifesteal) this._heal_hero(tick*0.5);
      if(this._dot_time<=0) this._enemy_atk_shred=0;
    }
    if(this._stun_t>0) this._stun_t-=delta;
    this._hero_t+=delta;
    var interval=stats.atk_interval;
    if(this._hero_t>=interval){
      this._hero_t-=interval;
      this._hero_attack();
    }
    if(this._stun_t<=0){
      this._enemy_t+=delta;
      if(this._enemy_t>=this.ENEMY_INTERVAL){
        this._enemy_t-=this.ENEMY_INTERVAL;
        this._enemy_attack(stats);
      }
    }
    if(this._boss_t>0){
      this._boss_t-=delta;
      E.BUS.emit('boss_timer', this._boss_t);
      if(this._boss_t<=0 && this._alive()) this._fail('timeout');
    }
    if(this._alive() && (this.enemy.modifiers||[]).indexOf('curandeiro')>=0){
      this.enemy_hp=Math.min(this.enemy_hp+this._enemy_max_hp()*0.02*delta, this._enemy_max_hp());
      E.BUS.emit('enemy_hp_changed', this.enemy_hp+this.enemy_shield, this._enemy_max_hp());
    }
  },
  enemy_interval: function(){ return this.ENEMY_INTERVAL; },
  _alive: function(){ return this.active && this.enemy_hp>0 && this.hero_hp>0; },
  /* ---------- ATAQUES ---------- */
  _hero_attack: function(){ this._apply_damage_to_enemy(0, false, '#e8e0d0', false); },
  _enemy_attack: function(stats){
    var mods=this.enemy.modifiers||[];
    var dodge=stats.dodge||0;
    if(Math.random()*100<=dodge){
      E.BUS.emit('floating_damage', 0, false, 'hero', '#9aa0a6');
      return;
    }
    var raw=this._enemy_atk();
    var incoming=E.DM.damage_taken(raw, stats.def);
    var absorbed=0;
    if(this.hero_shield>0){
      absorbed=Math.min(this.hero_shield, incoming);
      this.hero_shield-=absorbed;
    }
    var hp_damage=incoming-absorbed;
    this.hero_hp-=hp_damage;
    E.BUS.emit('hero_damaged', incoming);
    if(hp_damage>0) E.BUS.emit('floating_damage', -hp_damage, false, 'hero', '#d0455f');
    else if(absorbed>0) E.BUS.emit('floating_damage', -absorbed, false, 'hero', '#3a7bd5');
    E.BUS.emit('screenshake', this.enemy.boss?0.25:0.1);
    if(absorbed>0 && this._reflect_pct>0){
      this._apply_direct_damage_to_enemy(absorbed*this._reflect_pct/100, '#3a7bd5');
    }
    E.BUS.emit('hero_hp_changed', Math.max(this.hero_hp,0), stats.hp);
    if(mods.indexOf('berserk')>=0 && !this.enemy_berserk && this.enemy_hp<this._enemy_max_hp()*0.3){
      this.enemy_berserk=true;
      E.BUS.toast_msg((this.enemy.name||'?')+' ficou Enfurecido!', '#d0455f');
    }
    if(this.hero_hp<=0) this._hero_down();
  },
  _hero_down: function(){
    if(!this.revive_used && E.Asc.has_revive()){
      this.revive_used=true;
      this.hero_hp=E.Char.stats().hp*0.5;
      E.BUS.emit('hero_hp_changed', this.hero_hp, E.Char.stats().hp);
      E.BUS.toast_msg('Sombra Guardiã — renasceu!', '#3a9e8f');
      return;
    }
    this._fail('death');
  },
  _apply_damage_to_enemy: function(skill_mult, _is_skill, color_hex, no_effects){
    if(!this._alive()) return;
    var stats=E.Char.stats();
    var mods=this.enemy.modifiers||[];
    if(!no_effects && mods.indexOf('elusivo')>=0 && Math.random()*100<=10){
      E.BUS.emit('floating_damage', 0, false, 'enemy', '#9aa0a6');
      return;
    }
    var crit=E.DM.roll_crit({randf_range:function(a,b){return a+Math.random()*(b-a);}}, stats.crit_rate);
    var buffs=1+this._buff_atk_pct/100;
    var skill_m=skill_mult<=0?1:skill_mult;
    var dmg=E.DM.damage_final(stats.atk, 1, skill_m, buffs);
    if(this.enemy.boss||this.enemy.miniboss) dmg*=1+(stats.boss_damage||0)/100;
    if(crit) dmg*=stats.crit_damage/100;
    var edef=(this.enemy.def||0)*(1-this._enemy_def_shred/100);
    dmg=E.DM.damage_taken(dmg, edef);
    if(this.enemy_shield>0){
      var absorbed=Math.min(this.enemy_shield, dmg);
      this.enemy_shield-=absorbed;
      dmg-=absorbed;
    }
    this.enemy_hp-=dmg;
    E.BUS.emit('floating_damage', dmg, crit, 'enemy', crit?'#e8833a':color_hex);
    if(crit) E.BUS.emit('screenshake', 0.3);
    E.BUS.emit('enemy_damaged', dmg, crit);
    E.BUS.emit('enemy_hp_changed', Math.max(this.enemy_hp,0)+this.enemy_shield, this._enemy_max_hp());
    var heal=E.DM.lifesteal_heal(dmg, stats.lifesteal);
    if(heal>0) this._heal_hero(heal);
    if(this.enemy_hp<=0) this._kill_enemy();
  },
  /* Dano já calculado (ex.: reflexão): não reaplica ATK, crítico, DEF ou lifesteal. */
  _apply_direct_damage_to_enemy: function(amount, color_hex){
    if(!this.active || this.enemy_hp<=0 || !(amount>0)) return 0;
    var dmg=amount;
    if(this.enemy_shield>0){
      var absorbed=Math.min(this.enemy_shield, dmg);
      this.enemy_shield-=absorbed;
      dmg-=absorbed;
    }
    this.enemy_hp-=dmg;
    E.BUS.emit('floating_damage', dmg, false, 'enemy', color_hex);
    E.BUS.emit('enemy_damaged', dmg, false);
    E.BUS.emit('enemy_hp_changed', Math.max(this.enemy_hp,0)+this.enemy_shield, this._enemy_max_hp());
    if(this.enemy_hp<=0) this._kill_enemy();
    return dmg;
  },
  _heal_hero: function(amount){
    var max_hp=E.Char.stats().hp;
    var before=this.hero_hp;
    this.hero_hp=Math.min(this.hero_hp+amount, max_hp);
    if(this.hero_hp-before>0.5) E.BUS.emit('hero_hp_changed', this.hero_hp, max_hp);
  },
  /* ---------- SKILLS ---------- */
  cast_skill: function(id){
    var stats=E.Char.stats();
    var s=E.Skill.skill_def(id);
    if(!s.id) return false;
    if(!E.Skill.cast(id)) return false;
    var mult=E.Skill.active_mult(id)/100;
    var evolved=!!E.Skill.evolved[id];
    if(id==='lamina_eclipse'){
      this._apply_damage_to_enemy(mult, true, '#e8833a', false);
      if(evolved) this._stun_t=s.evolve.extra_stun;
    } else if(id==='guarda_sombras'){
      this.hero_shield=stats.hp*mult;
      this._reflect_pct=evolved?s.evolve.reflect:0;
      E.BUS.toast_msg(s.name+'!', '#3a7bd5');
    } else if(id==='sedenta'){
      this._dot_per_s=stats.atk*mult/s.base.dur;
      this._dot_time=s.base.dur;
      this._dot_lifesteal=true;
      if(evolved) this._enemy_atk_shred=s.evolve.atk_shred;
      E.BUS.toast_msg(s.name+'!', '#9b59d0');
    } else if(id==='rumo_vazio'){
      this._enemy_def_shred=evolved?s.evolve.def_shred:0;
      this._apply_damage_to_enemy(mult, true, '#3a9e8f', false);
    } else if(id==='cataclismo'){
      this._apply_damage_to_enemy(mult, true, '#f5e6c8', false);
      this._buff_atk_pct=E.Skill.scaled_value(id,'buff_pct');
      this._buff_time=s.base.buff_dur;
      E.BUS.emit('screenshake', 0.8);
      E.BUS.toast_msg('☾ '+s.name+' ☽', '#f5e6c8');
    }
    return true;
  },
  _auto_cast: function(){
    var ready=E.Skill.ready_skills(true);
    for(var i=0;i<ready.length;i++) this.cast_skill(ready[i].id);
  },
  /* ---------- MORTE / RECOMPENSAS ---------- */
  _kill_enemy: function(){
    this.enemy_hp=0;
    var stats=E.Char.stats();
    if((this.enemy.modifiers||[]).indexOf('explosivo')>=0){
      var boom=(this.enemy.atk||0)*0.15;
      this.hero_hp-=E.DM.damage_taken(boom, stats.def);
      E.BUS.emit('floating_damage', -boom, false, 'hero', '#d0455f');
      E.BUS.emit('hero_hp_changed', Math.max(this.hero_hp,0), stats.hp);
      if(this.hero_hp<=0){ this._hero_down(); return; }
    }
    var gold=(this.enemy.gold||0)*(1+(stats.gold_find||0)/100)*E.Eco.gold_mult();
    var xp=(this.enemy.xp||0)*(1+(stats.xp_gain||0)/100);
    if(this.mode==='campaign' && this.stage>500){ // [C2] evt Caçada Abissal: recompensas do Abismo multiplicadas
      var am=E.Eco.event_mult('abismo_extra_mult'); gold*=am; xp*=am;
    }
    E.Eco.add('ouro', gold);
    E.Char.gain_xp(xp);
    E.Inv.try_drop(this.stage, !!this.enemy.boss, stats);
    E.Ret.track('kills', 1);
    E.Ret.bp_add_xp(E.DM.cfg_battlepass.xp_sources.kills); // [HTML-3]
    if(this.enemy.boss||this.enemy.miniboss){
      E.Ret.track('boss_kills', 1);
      E.Ret.bp_add_xp(E.DM.cfg_battlepass.xp_sources.boss_kills); // [HTML-3]
    }
    E.BUS.emit('enemy_killed', this.enemy);
    E.BUS.emit('combat_ended', 'win', this.stage);
    this._spawn_t=this.RESPAWN_DELAY;
    if(this._mode_callback!=='') E.Modes.on_mode_combat_end(this._mode_callback, 'win', this.stage);
  },
  _fail: function(reason){
    E.BUS.emit('combat_ended', 'fail', this.stage);
    if(this._mode_callback!=='') E.Modes.on_mode_combat_end(this._mode_callback, 'fail', this.stage);
    if(this.mode==='campaign'){
      this._restart_pending=true;
      this._spawn_t=this.RESPAWN_DELAY;
    } else {
      this.active=false;
    }
  },
  _next_after_win: function(){
    if(this.mode==='campaign'){ this.stage=E.Prog.current_stage; this._begin(); } // [HTML-5]
    else { this.active=false; E.Modes.request_next(this.mode); }
  }
};

/* ---------- SAVE (checksum SHA-256, backup, migração, anticheat) ---------- */
E.Save = {
  SAVE_VERSION: 1,
  SALT: 'EIDRYN_VELUN_CICLO_DO_ECLIPSE_SALT',
  PASS: 'EIDRYN_SeloDoCrepusculo_EIDRYN_VELUN_CICLO_DO_ECLIPSE_SALT',
  FLUSH_DEBOUNCE_S: 3,
  KEY: 'eidryn_save_v1',
  BAK_KEY: 'eidryn_save_bak_v1',
  _dirty: false, _timer: 0, _boot_done: false, _violations: [], _last_error: '',
  _store: {
    get: function(k){ try{ return globalThis.localStorage.getItem(k); }catch(e){ return null; } },
    set: function(k,v){
      try{ globalThis.localStorage.setItem(k,v); return true; }
      catch(e){ console.error('[Save] localStorage indisponível:', e); return false; }
    },
    del: function(k){ try{ globalThis.localStorage.removeItem(k); }catch(e){} }
  },
  /* obfuscação leve (paridade do AES do Godot — camada de ofuscação local) */
  _xor: function(text){
    var out='';
    for(var i=0;i<text.length;i++) out+=String.fromCharCode(text.charCodeAt(i) ^ this.PASS.charCodeAt(i%this.PASS.length));
    return out;
  },
  boot_load: function(){
    var d=this._read(this.KEY);
    if(!d){
      var bak=this._read(this.BAK_KEY);
      if(bak){ d=bak; E.BUS.toast_msg(E.DM.tr('save_corrupt'), '#e8a33a'); }
    }
    if(!d) d={};
    this._apply_migrations(d);
    this._distribute(d);
    this._boot_done=true;
    this._validate_all();
    E.BUS.emit('save_flushed');
  },
  _read: function(key){
    var raw=this._store.get(key);
    if(!raw) return null;
    try{
      var text=this._xor(atob_compat(raw));
      var payload=JSON.parse(text);
      var data_json=payload.data_json||'';
      if(data_json==='' || payload.checksum!==E.U.sha256(data_json)) return null;
      return JSON.parse(data_json);
    }catch(e){ return null; }
  },
  /* Flush transacional: falhas de serialização/storage não escapam para o rAF,
     mas também nunca limpam dirty nem anunciam um save que não foi persistido. */
  flush: function(){
    if(!this._boot_done) return false;
    try{
      var save_seen=E.TimeM.now();
      var data=this.collect();
      // Persiste o instante desta tentativa sem apagar last_seen em memória antes da confirmação.
      data.time=data.time||{};
      data.time.last_seen=save_seen;
      var data_json=JSON.stringify(data);
      var payload={version:this.SAVE_VERSION, checksum:E.U.sha256(data_json), data_json:data_json};
      var text=JSON.stringify(payload);
      var encoded=btoa_compat(this._xor(text));
      var prev=this._store.get(this.KEY);
      if(prev && !this._store.set(this.BAK_KEY, prev)) throw new Error('falha ao gravar backup');
      if(!this._store.set(this.KEY, encoded)) throw new Error('falha ao gravar save principal');
      if(this._store.get(this.KEY)!==encoded) throw new Error('falha na verificação do save principal');
      this._dirty=false;
      this._last_error='';
      E.TimeM.last_seen=save_seen;
      E.BUS.emit('save_flushed');
      return true;
    }catch(e){
      this._dirty=true;
      this._last_error=String(e && e.message || e);
      console.warn('[Save] flush adiado:', this._last_error);
      return false;
    }
  },
  collect: function(){
    return {
      version:this.SAVE_VERSION,
      time:E.TimeM.save_state(),
      economy:E.Eco.save_state(),
      character:E.Char.save_state(),
      inventory:E.Inv.save_state(),
      skills:E.Skill.save_state(),
      pets:E.Pet.save_state(),
      progression:E.Prog.save_state(),
      modes:E.Modes.save_state(),
      ascension:E.Asc.save_state(),
      gacha:E.Gacha.save_state(),
      retention:E.Ret.save_state(),
      audio:E.Audio.save_state(),
      system:{language:E.DM.language, game_version:E.DM.GAME_VERSION}
    };
  },
  _distribute: function(d){
    E.DM.language=((d.system||{}).language)||'ptbr';
    E.TimeM.load_state(d.time||{});
    E.Eco.load_state(d.economy||{});
    E.Char.load_state(d.character||{});
    E.Inv.load_state(d.inventory||{});
    E.Skill.load_state(d.skills||{});
    E.Pet.load_state(d.pets||{});
    E.Prog.load_state(d.progression||{});
    E.Modes.load_state(d.modes||{});
    E.Asc.load_state(d.ascension||{});
    E.Gacha.load_state(d.gacha||{});
    E.Ret.load_state(d.retention||{});
    E.Audio.load_state(d.audio||{});
  },
  _apply_migrations: function(d){
    var v=d.version||0;
    while(v<this.SAVE_VERSION){ v++; } // v0 → v1: estrutura idêntica
    d.version=this.SAVE_VERSION;
  },
  mark_dirty: function(){ this._dirty=true; },
  process: function(delta){
    if(!this._boot_done) return;
    if(this._dirty){
      this._timer+=delta;
      if(this._timer>=this.FLUSH_DEBOUNCE_S){ this._timer=0; this.flush(); }
    } else this._timer=0;
  },
  export_save: function(){
    var data=this.collect();
    var data_json=JSON.stringify(data);
    return btoa_compat(unescape(encodeURIComponent(JSON.stringify({version:this.SAVE_VERSION, checksum:E.U.sha256(data_json), data_json:data_json}))));
  },
  import_save: function(b64){
    try{
      var text=decodeURIComponent(escape(atob_compat(b64.trim())));
      var payload=JSON.parse(text);
      if(payload.checksum!==E.U.sha256(payload.data_json)) return false;
      var d=JSON.parse(payload.data_json);
      this._apply_migrations(d);
      this._distribute(d);
      this._validate_all();
      E.Char.recalc();
      return this.flush();
    }catch(e){ return false; }
  },
  _validate_all: function(){
    this._violations=[];
    var cur=E.Eco.currencies, caps=E.DM.cfg_currencies.caps;
    for(var id in cur){
      if(Number(cur[id])<0){ cur[id]=0; this._violations.push('moeda negativa: '+id); }
      if(caps[id]!=null && Number(cur[id])>Number(caps[id])){ cur[id]=Number(caps[id]); this._violations.push('moeda acima do cap: '+id); }
    }
    var cap=E.DM.cfg_attributes.level.cap;
    if(E.Char.level>cap){ E.Char.level=cap; this._violations.push('nível acima do cap'); }
    if(E.Char.level<1){ E.Char.level=1; this._violations.push('nível inválido'); }
    if(E.Prog.current_stage<1){ E.Prog.current_stage=1; this._violations.push('fase inválida'); }
    if(this._violations.length>0){
      E.BUS.toast_msg(E.DM.tr('anticheat'), '#d0455f');
      E.BUS.emit('currency_changed', 'all', 0);
      this.mark_dirty();
    }
  },
  violation_count: function(){ return this._violations.length; },
  wipe: function(){ this._store.del(this.KEY); this._store.del(this.BAK_KEY); }
};
function btoa_compat(s){ return typeof btoa!=='undefined'? btoa(s) : Buffer.from(s,'binary').toString('base64'); }
function atob_compat(s){ return typeof atob!=='undefined'? atob(s) : Buffer.from(s,'base64').toString('binary'); }
E.Util_atob_compat = atob_compat;

/* ---------- AUDIO (música contextual crossfade + SFX pool — WAVs embutidos) ---------- */
E.Audio = {
  music_vol: 0.7, sfx_vol: 0.8,
  MUSIC: {menu:'menu_theme', combat:'combat_theme', boss:'boss_theme', dungeon:'dungeon_theme'},
  SFX: {hit:'hit', crit:'crit', levelup:'levelup', coin:'coin', loot_common:'loot_common',
    loot_rare:'loot_rare', loot_epic:'loot_epic', loot_legend:'loot_legend', click:'click',
    equip:'equip', fail:'fail', win:'win', boss_roar:'boss_roar', skill:'skill',
    supreme:'supreme', gacha:'gacha', ascend:'ascend', offline:'offline',
    reinforce:'reinforce', evolve:'evolve'},
  SFX_POOL_SIZE: 10,
  _ctx: null, _musicA: null, _musicB: null, _useA: true, _current_music: '',
  _sfx_pool: [], _sfx_idx: 0, _cache: {}, _ready: false,
  init: function(){
    if(this._ready) return;
    var AC=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AC || !E.WAV) return;
    try{
      this._ctx=new AC();
      this._musicA=this._makeChannel(); this._musicB=this._makeChannel();
      for(var i=0;i<this.SFX_POOL_SIZE;i++) this._sfx_pool.push(this._makeChannel());
      this._ready=true;
      this.apply_volumes();
      // [ART-10] ambiente do clima começa junto (o render já escolheu um clima no boot)
      this.set_ambient(this._ambWant||'limpo');
    }catch(e){ console.error('Audio init', e); }
  },
  _makeChannel: function(){
    var src=this._ctx.createGain();
    src.connect(this._master());
    return {gain:src, source:null};
  },
  _master: function(){
    if(!this._masterGain) { this._masterGain=this._ctx.createGain(); this._masterGain.connect(this._ctx.destination); }
    return this._masterGain;
  },
  _decode: function(name){
    if(this._cache[name]) return Promise.resolve(this._cache[name]);
    if(!E.WAV || !E.WAV[name]) return Promise.resolve(null);
    var self=this;
    var b64=E.WAV[name];
    var bin=atob_compat(b64);
    var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i)&0xff;
    return new Promise(function(resolve){
      self._ctx.decodeAudioData(bytes.buffer, function(buf){ self._cache[name]=buf; resolve(buf); },
        function(){ resolve(null); });
    });
  },
  apply_volumes: function(){
    if(!this._ready) return;
    this._masterGain.gain.value=1;
    if(this._musicA) this._musicA.gain.gain.value=this.music_vol;
    if(this._musicB) this._musicB.gain.gain.value=this.music_vol;
  },
  set_music_vol: function(v){ this.music_vol=E.U.clamp(v,0,1); this.apply_volumes(); E.Save.mark_dirty(); },
  set_sfx_vol: function(v){ this.sfx_vol=E.U.clamp(v,0,1); E.Save.mark_dirty(); },
  play_music: function(context){
    if(this._current_music===context) return;
    if(!this.MUSIC[context]) return;
    this._current_music=context;
    if(!this._ready) return;
    var self=this;
    var slot=this._useA?this._musicA:this._musicB;
    var old=this._useA?this._musicB:this._musicA;
    this._useA=!this._useA;
    this._decode(this.MUSIC[context]).then(function(buf){
      if(!buf) return;
      if(old.source){ try{ old.source.stop(); }catch(e){} old.source=null; }
      if(slot.source){ try{ slot.source.stop(); }catch(e){} }
      var src=self._ctx.createBufferSource();
      src.buffer=buf; src.loop=true;
      src.connect(slot.gain);
      src.start();
      slot.source=src;
      slot.gain.gain.setValueAtTime(0.0001, self._ctx.currentTime);
      slot.gain.gain.linearRampToValueAtTime(self.music_vol, self._ctx.currentTime+1.2);
    });
  },
  stop_music: function(){ this._current_music=''; if(!this._ready) return;
    if(this._musicA&&this._musicA.source){ try{this._musicA.source.stop();}catch(e){} this._musicA.source=null; }
    if(this._musicB&&this._musicB.source){ try{this._musicB.source.stop();}catch(e){} this._musicB.source=null; } },
  play_sfx: function(name){
    if(!this.SFX[name] || !this._ready) return;
    var self=this;
    this._decode(this.SFX[name]).then(function(buf){
      if(!buf) return;
      var slot=self._sfx_pool[self._sfx_idx];
      self._sfx_idx=(self._sfx_idx+1)%self.SFX_POOL_SIZE;
      if(slot.source){ try{ slot.source.stop(); }catch(e){} }
      var src=self._ctx.createBufferSource();
      src.buffer=buf;
      var g=self._ctx.createGain();
      g.gain.value=self.sfx_vol;
      src.connect(g); g.connect(self._master());
      src.start();
      slot.source=src;
    });
  },
  /* ---------- [ART-10] AMBIENTE POR CLIMA (síntese procedural — chuva/vento/trovão) ----------
     Camada 100% de apresentação: ruído filtrado em loop para chuva/vento + trovão
     sintetizado sob demanda (gatilhado pelo relâmpago do render). Volume próprio
     (amb_vol) guardado nas prefs de FX do render (eidryn_fx_prefs_v1) — SAVE DO JOGO
     INTACTO. Sem amostras externas: tudo gerado pelo AudioContext. */
  amb_vol: 0.5, _amb: null, _ambWant: 'limpo', _thunderN: 0, _nbCache: null,
  AMB_PRESET: {
    limpo:      { rain: 0.00, wind: 0.050 },
    nublado:    { rain: 0.00, wind: 0.140 },
    chuva:      { rain: 0.34, wind: 0.160 },
    tempestade: { rain: 0.52, wind: 0.270 },
    neve:       { rain: 0.00, wind: 0.100 }
  },
  _noiseBuf: function(secs){
    var key='n'+secs;
    if(this._nbCache && this._nbCache[key]) return this._nbCache[key];
    if(!this._nbCache) this._nbCache={};
    var len=Math.floor(this._ctx.sampleRate*secs);
    var buf=this._ctx.createBuffer(1,len,this._ctx.sampleRate);
    var d=buf.getChannelData(0), last=0;
    for(var i=0;i<len;i++){ var w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=w*0.55+last*2.1; }
    this._nbCache[key]=buf; return buf;
  },
  _ensureAmb: function(){
    if(this._amb) return this._amb;
    var c=this._ctx;
    var master=c.createGain(); master.gain.value=this.amb_vol; master.connect(this._master());
    // chuva: corpo (ruído grave filtrado) + chiado (ruído agudo fino)
    var rainBody=c.createBufferSource(); rainBody.buffer=this._noiseBuf(2.7); rainBody.loop=true;
    var rHP=c.createBiquadFilter(); rHP.type='highpass'; rHP.frequency.value=380;
    var rLP=c.createBiquadFilter(); rLP.type='lowpass'; rLP.frequency.value=950; rLP.Q.value=0.4;
    var rainHi=c.createBufferSource(); rainHi.buffer=this._noiseBuf(2.7); rainHi.loop=true;
    rainHi.playbackRate.value=1.13;
    var hHP=c.createBiquadFilter(); hHP.type='highpass'; hHP.frequency.value=2600; hHP.Q.value=0.5;
    var gRainB=c.createGain(); gRainB.gain.value=0;
    var gRainH=c.createGain(); gRainH.gain.value=0;
    rainBody.connect(rHP); rHP.connect(rLP); rLP.connect(gRainB); gRainB.connect(master);
    rainHi.connect(hHP); hHP.connect(gRainH); gRainH.connect(master);
    // vento: ruído grave com LFO no corte do filtro (assobio lento,rajadas)
    var wind=c.createBufferSource(); wind.buffer=this._noiseBuf(3.1); wind.loop=true;
    var wLP=c.createBiquadFilter(); wLP.type='lowpass'; wLP.frequency.value=300; wLP.Q.value=1.1;
    var lfo=c.createOscillator(); lfo.frequency.value=0.09;
    var lfoG=c.createGain(); lfoG.gain.value=150;
    lfo.connect(lfoG); lfoG.connect(wLP.frequency);
    var gWind=c.createGain(); gWind.gain.value=0;
    wind.connect(wLP); wLP.connect(gWind); gWind.connect(master);
    rainBody.start(); rainHi.start(); wind.start(); lfo.start();
    this._amb={master:master,gRainB:gRainB,gRainH:gRainH,gWind:gWind};
    return this._amb;
  },
  set_ambient: function(wk){
    this._ambWant=this.AMB_PRESET[wk]?wk:'limpo';
    if(!this._ready) return;
    var A=this._ensureAmb(), P=this.AMB_PRESET[this._ambWant], t=this._ctx.currentTime;
    A.gRainB.gain.setTargetAtTime(P.rain, t, 1.4);
    A.gRainH.gain.setTargetAtTime(P.rain*0.55, t, 1.4);
    A.gWind.gain.setTargetAtTime(P.wind, t, 1.8);
  },
  set_amb_vol: function(v){
    this.amb_vol=E.U.clamp(v,0,1);
    if(this._ready&&this._amb) this._amb.master.gain.setTargetAtTime(this.amb_vol, this._ctx.currentTime, 0.15);
    if(E.Rfx&&E.Rfx.savePrefs) E.Rfx.savePrefs();
  },
  pause_ambient: function(){
    if(this._ready&&this._amb) this._amb.master.gain.setTargetAtTime(0, this._ctx.currentTime, 0.3);
  },
  resume_ambient: function(){
    if(this._ready&&this._amb) this._amb.master.gain.setTargetAtTime(this.amb_vol, this._ctx.currentTime, 0.6);
  },
  thunder: function(near){
    if(!this._ready||this._thunderN>=3) return;
    var c=this._ctx, self=this;
    var t0=c.currentTime+(near?0.04+Math.random()*0.08:0.18+Math.random()*0.42);
    this._thunderN++;
    setTimeout(function(){ self._thunderN--; }, 4200);
    var dest=this._ensureAmb().master;
    // rumble: ruído com filtro que fecha (400→60Hz) e envelope exponencial
    var src=c.createBufferSource(); src.buffer=this._noiseBuf(3.4); src.loop=true;
    src.playbackRate.value=0.72+Math.random()*0.4;
    var lp=c.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(near?420:300, t0);
    lp.frequency.exponentialRampToValueAtTime(near?58:75, t0+2.3);
    var g=c.createGain(); g.gain.setValueAtTime(0.0001, t0);
    var peak=(near?0.85:0.30)*(0.75+Math.random()*0.35);
    g.gain.exponentialRampToValueAtTime(Math.max(0.002,peak), t0+(near?0.05:0.22));
    g.gain.exponentialRampToValueAtTime(0.0008, t0+(near?2.9:2.2));
    src.connect(lp); lp.connect(g); g.connect(dest);
    if(near){ // sub grave dá o "peso" do trovão próximo
      var o=c.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(52, t0);
      o.frequency.exponentialRampToValueAtTime(34, t0+1.7);
      var og=c.createGain(); og.gain.setValueAtTime(0.0001, t0);
      og.gain.exponentialRampToValueAtTime(0.5, t0+0.06);
      og.gain.exponentialRampToValueAtTime(0.0008, t0+1.9);
      o.connect(og); og.connect(dest);
      o.start(t0); o.stop(t0+2.1);
    }
    src.start(t0); src.stop(t0+3.6);
  },
  save_state: function(){ return {music_vol:this.music_vol, sfx_vol:this.sfx_vol}; },
  load_state: function(d){
    if(!d) return;
    this.music_vol=(d.music_vol!=null)?Number(d.music_vol):0.7;
    this.sfx_vol=(d.sfx_vol!=null)?Number(d.sfx_vol):0.8;
  }
};
