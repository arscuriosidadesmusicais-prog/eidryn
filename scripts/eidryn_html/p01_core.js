'use strict';
/* =====================================================================
   p01_core.js — Utils, EventBus, DataManager, TimeManager, Platform
   Porta 1:1 de data_manager.gd / time_manager.gd / platform_stub.gd / event_bus.gd
   ===================================================================== */
var E = (globalThis.E = globalThis.E || {});

/* ---------- UTILS ---------- */
E.U = (function(){
  var SUF = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
  function fmt(v){
    v = Number(v)||0;
    var neg = v<0; v = Math.abs(v);
    if (v < 1000) { var s = (v<10 && v%1!==0)? v.toFixed(1) : String(Math.floor(v)); return (neg?'-':'')+s; }
    var i = Math.min(Math.floor(Math.log10(v)/3), SUF.length-1);
    var n = v/Math.pow(1000,i);
    if (i >= SUF.length-1 && n >= 1000) return (neg?'-':'')+v.toExponential(2).replace('e+','e');
    var d = n>=100?1:2;
    return (neg?'-':'')+n.toFixed(d).replace(/\.0+$|(\.\d*[1-9])0+$/,'$1')+SUF[i];
  }
  function fmtTime(s){
    s = Math.max(0, Math.floor(s));
    var h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60;
    if(h>0) return h+'h '+m+'m';
    if(m>0) return m+'m '+ss+'s';
    return ss+'s';
  }
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function deep(o){ return JSON.parse(JSON.stringify(o)); }
  function uid(){ return 'x'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36); }
  function dayKey(nowSec, resetHour){
    var d = new Date((nowSec - (resetHour||0)*3600)*1000);
    function p(n){ return (n<10?'0':'')+n; }
    return d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate());
  }
  function weekKey(nowSec){
    var d = new Date(nowSec*1000);
    var daysSinceMonday = (d.getUTCDay()+6)%7;
    var d0 = new Date((nowSec - daysSinceMonday*86400)*1000);
    function p(n){ return (n<10?'0':'')+n; }
    return d0.getUTCFullYear()+'-W'+p(d0.getUTCMonth()+1);
  }
  /* RNG determinístico (paridade de stage_rng do Godot: seed = stage*7919+104729) */
  function mulberry32(seed){
    var t = seed>>>0;
    return function(){
      t += 0x6D2B79F5;
      var r = t;
      r = Math.imul(r ^ (r>>>15), r|1);
      r ^= r + Math.imul(r ^ (r>>>7), r|61);
      return ((r ^ (r>>>14))>>>0)/4294967296;
    };
  }
  function rng(seed){
    var f = mulberry32(seed);
    return {
      randf: function(){ return f(); },
      randf_range: function(a,b){ return a + f()*(b-a); },
      randi_range: function(a,b){ return a + Math.floor(f()*(b-a+1)); }
    };
  }
  /* SHA-256 síncrono (paridade do checksum sha256_text do SaveManager) */
  var _k = null;
  function sha256(ascii){
    function rr(v,a){ return (v>>>a)|(v<<(32-a)); }
    if(!_k){
      _k=[];
      var primes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311];
      for(var j=0;j<64;j++){
        var cb = Math.cbrt(primes[j]);
        var s = Math.floor((cb - Math.floor(cb)) * 4294967296);
        _k[j] = s;
      }
    }
    var K=_k, H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var bytes=[];
    for(var c=0;c<ascii.length;c++){
      var cc=ascii.charCodeAt(c);
      if(cc<128) bytes.push(cc);
      else if(cc<2048){ bytes.push(192|(cc>>6), 128|(cc&63)); }
      else { bytes.push(224|(cc>>12), 128|((cc>>6)&63), 128|(cc&63)); }
    }
    var bitLen = bytes.length*8;
    bytes.push(0x80);
    while(bytes.length%64!==56) bytes.push(0);
    for(var q=7;q>=0;q--) bytes.push(Math.floor(bitLen/Math.pow(2,q*8))&255);
    var w=new Array(64);
    for(var off=0; off<bytes.length; off+=64){
      for(var t=0;t<16;t++) w[t]=(bytes[off+t*4]<<24)|(bytes[off+t*4+1]<<16)|(bytes[off+t*4+2]<<8)|bytes[off+t*4+3];
      for(var t2=16;t2<64;t2++){
        var s0=rr(w[t2-15],7)^rr(w[t2-15],18)^(w[t2-15]>>>3);
        var s1=rr(w[t2-2],17)^rr(w[t2-2],19)^(w[t2-2]>>>10);
        w[t2]=(w[t2-16]+s0+w[t2-7]+s1)|0;
      }
      var a=H[0],b=H[1],c2=H[2],d=H[3],e=H[4],f2=H[5],g=H[6],h=H[7];
      for(var t3=0;t3<64;t3++){
        var S1=rr(e,6)^rr(e,11)^rr(e,25), ch=(e&f2)^(~e&g);
        var temp1=(h+S1+ch+K[t3]+w[t3])|0;
        var S0=rr(a,2)^rr(a,13)^rr(a,22), maj=(a&b)^(a&c2)^(b&c2);
        var temp2=(S0+maj)|0;
        h=g;g=f2;f2=e;e=(d+temp1)|0;d=c2;c2=b;b=a;a=(temp1+temp2)|0;
      }
      H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c2)|0;H[3]=(H[3]+d)|0;
      H[4]=(H[4]+e)|0;H[5]=(H[5]+f2)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
    }
    var hex='';
    for(var i2=0;i2<8;i2++){ hex += ('00000000'+((H[i2]>>>0).toString(16))).slice(-8); }
    return hex;
  }
  return {fmt:fmt, fmtTime:fmtTime, clamp:clamp, lerp:lerp, deep:deep, uid:uid,
    dayKey:dayKey, weekKey:weekKey, rng:rng, sha256:sha256};
})();

/* ---------- EVENT BUS (paridade de event_bus.gd) ---------- */
E.BUS = (function(){
  var map = {};
  return {
    on: function(ev, fn){ (map[ev]=map[ev]||[]).push(fn); return fn; },
    off: function(ev, fn){ var a=map[ev]; if(a){ var i=a.indexOf(fn); if(i>=0) a.splice(i,1); } },
    emit: function(ev){ var a=map[ev]; if(!a) return; var args=Array.prototype.slice.call(arguments,1);
      for(var i=0;i<a.length;i++){ try{ a[i].apply(null,args); }catch(e){ console.error('[BUS '+ev+']',e); } } },
    toast_msg: function(msg, colorHex){ this.emit('toast', msg, colorHex||'#e8e0d0'); }
  };
})();

/* ---------- DATA MANAGER (fonte única de fórmulas — paridade total) ---------- */
E.DM = {
  GAME_VERSION: '1.6.0',
  SAVE_VERSION: 1,
  language: 'ptbr',
  load: function(data){ for(var k in data) this['cfg_'+k] = data[k]; },
  /* ---------- LOCALIZAÇÃO ---------- */
  tr: function(key){
    var base = this.language==='ptbr' ? this.cfg_loc_ptbr : this.cfg_loc_en;
    var alt  = this.language==='ptbr' ? this.cfg_loc_en : this.cfg_loc_ptbr;
    if(base && base[key]!=null) return base[key];
    if(alt && alt[key]!=null) return alt[key];
    return key;
  },
  /* ---------- FÓRMULAS OBRIGATÓRIAS (data_manager.gd) ---------- */
  _f_exp: function(stage, exp_base){
    if(stage<=400) return exp_base*stage;
    var sc = this.cfg_enemies.softcap || {stage:400, floor:0.4, decay:300};
    var over = stage - sc.stage;
    var factor = sc.floor + (1-sc.floor)*Math.exp(-over/sc.decay);
    return exp_base*(sc.stage + over*factor);
  },
  enemy_stats_for_stage: function(stage){
    var base=this.cfg_enemies.base_stage_1, sc=this.cfg_enemies.scaling;
    var hp = base.hp * Math.pow(sc.hp_exp, this._f_exp(stage, sc.hp_exp)/sc.hp_exp);
    var atk = base.atk * Math.pow(sc.atk_exp, this._f_exp(stage, sc.atk_exp)/sc.atk_exp);
    var gold = base.gold * Math.pow(sc.gold_exp, this._f_exp(stage, sc.gold_exp)/sc.gold_exp);
    var xp = base.xp * Math.pow(sc.xp_exp, this._f_exp(stage, sc.xp_exp)/sc.xp_exp);
    var def = (base.def!=null?base.def:2) * Math.pow(1.08, this._f_exp(stage,1.08)/1.08);
    if(stage>500){
      var ab = stage-500;
      hp *= Math.pow(1+this.cfg_enemies.abismo_extra_exp.hp*10, ab/10);
      atk *= Math.pow(1+this.cfg_enemies.abismo_extra_exp.atk*10, ab/10);
    }
    return {hp:hp, atk:atk, def:def, gold:gold, xp:xp};
  },
  is_boss_stage: function(s){ return s%10===0; },
  is_miniboss_stage: function(s){ return s%5===0 && s%10!==0; },
  region_for_stage: function(stage){
    var rs=this.cfg_regions.regions;
    for(var i=0;i<rs.length;i++){ if(stage>=rs[i].stages[0] && stage<=rs[i].stages[1]) return rs[i]; }
    return rs[rs.length-1];
  },
  stage_rng: function(stage){ return E.U.rng(stage*7919+104729); },
  enemy_for_stage: function(stage){
    var region=this.region_for_stage(stage), rng=this.stage_rng(stage);
    var regions=this.cfg_regions.regions, region_index=0;
    for(var i=0;i<regions.length;i++) if(regions[i].id===region.id) region_index=i;
    var stats=this.enemy_stats_for_stage(stage);
    var enemies=region.enemies;
    var name_txt = enemies[rng.randi_range(0,enemies.length-1)];
    var is_boss=this.is_boss_stage(stage), is_mini=this.is_miniboss_stage(stage);
    var mults = is_mini?this.cfg_enemies.miniboss_multiplier : is_boss?this.cfg_enemies.boss_multiplier : {hp:1,atk:1,gold:1,xp:1};
    if(is_boss) name_txt=region.boss; else if(is_mini) name_txt=region.miniboss;
    var mods=this._roll_modifiers(stage, rng, is_boss);
    var sprite = is_boss ? ('boss_'+region.id) : ('enemy_'+region.id+'_'+rng.randi_range(0,4));
    return {
      name:name_txt, stage:stage, region:region.id, boss:is_boss, miniboss:is_mini,
      hp:stats.hp*mults.hp, atk:stats.atk*mults.atk, def:stats.def*(is_boss?2:1),
      gold:stats.gold*mults.gold, xp:stats.xp*mults.xp,
      modifiers:mods, sprite:sprite
    };
  },
  _roll_modifiers: function(stage, rng, is_boss){
    if(stage<15 && !is_boss) return [];
    var count=1;
    if(stage>=150) count++;
    if(stage>=300) count++;
    var pool=this.cfg_enemies.modifiers, picked=[], total=0;
    for(var i=0;i<pool.length;i++) if(pool[i].min_stage<=stage) total+=pool[i].weight;
    for(var n=0;n<count;n++){
      var roll=rng.randf()*total, acc=0;
      for(var j=0;j<pool.length;j++){
        if(pool[j].min_stage>stage) continue;
        acc+=pool[j].weight;
        if(roll<=acc){ if(picked.indexOf(pool[j].id)<0) picked.push(pool[j].id); break; }
      }
    }
    if(is_boss && picked.length===0) picked.push('reforçado');
    return picked;
  },
  /* Dano final = ATK × MultArma × MultHabilidade × Buffs */
  damage_final: function(atk, mult_weapon, mult_skill, mult_buffs){ return atk*mult_weapon*mult_skill*mult_buffs; },
  /* DanoRecebido = DanoInimigo × (100/(100+DEF)) */
  damage_taken: function(raw, defense){ return raw*(100/(100+Math.max(defense,0))); },
  /* VidaGanha = DanoCausado × LS%/100 */
  lifesteal_heal: function(damage, ls_pct){ return damage*ls_pct/100; },
  /* Crítico: rand(0-100) <= CritRate */
  roll_crit: function(rng, crit_rate){ return rng.randf_range(0,100) <= crit_rate; },
  attribute_cost: function(attr, current_level){ return attr.base_cost*Math.pow(attr.cost_exp, current_level); },
  level_xp_cost: function(level){
    var lv=this.cfg_attributes.level;
    return lv.xp_base*Math.pow(lv.xp_exp, level-1);
  }
};

/* ---------- TIME MANAGER (time_manager.gd) ---------- */
E.TimeM = {
  last_seen: 0,
  time_travel_detected: false,
  tt_log: [],
  now: function(){ return Math.floor(Date.now()/1000); },
  mark_seen: function(){ this.last_seen = this.now(); },
  check_time_travel: function(){
    this.time_travel_detected = false;
    if(this.last_seen>0 && this.now() < this.last_seen-60){
      this.time_travel_detected = true;
      this.tt_log.push({at:this.now(), last_seen:this.last_seen, delta:this.now()-this.last_seen});
      E.BUS.toast_msg(E.DM.tr('time_travel'), '#d0455f');
    }
    return this.time_travel_detected;
  },
  offline_seconds: function(cap_s){
    if(this.time_travel_detected) return 0;
    var delta = this.now()-this.last_seen;
    if(delta<0) return 0;
    return Math.min(delta, cap_s);
  },
  day_key: function(){ return E.U.dayKey(this.now(), E.DM.cfg_missions.reset_hour_utc||0); },
  week_key: function(){ return E.U.weekKey(this.now()); },
  save_state: function(){ return {last_seen:this.last_seen, tt_log:this.tt_log.slice(Math.max(0,this.tt_log.length-20))}; },
  load_state: function(d){
    if(!d) return;
    /* [HTML-4] save novo (sem bloco time) preserva o mark_seen do boot —
       evita conceder 8h de offline no primeiro boot */
    if(d.last_seen!=null) this.last_seen=d.last_seen;
    this.tt_log=d.tt_log||[];
  }
};

/* ---------- PLATFORM STUB (platform_stub.gd — IAP/Ads/Cloud) ---------- */
E.Platform = {
  enabled_iap: false, enabled_ads: false, enabled_cloud: false, _ad_log: [],
  purchase: function(product_id){
    var list=(E.DM.cfg_shop&&E.DM.cfg_shop.iap_stubs)||[];
    for(var i=0;i<list.length;i++){
      var p=list[i];
      if(p.product===product_id||p.id===product_id){
        if(!this.enabled_iap) return {ok:false, reason:'IAP stub desativado'};
        return {ok:true, grant:p.grant};
      }
    }
    return {ok:false, reason:'produto desconhecido'};
  },
  apply_grant: function(grant){
    if(grant.premium_days!=null) E.Eco.premium_until = E.TimeM.now()+grant.premium_days*86400;
    if(grant.battlepass_premium!=null) E.Ret.bp_premium_unlocked = true;
    E.Eco.add_dict(grant);
  },
  show_rewarded_ad: function(ad_id){
    var list=(E.DM.cfg_shop&&E.DM.cfg_shop.ad_stubs)||[];
    for(var i=0;i<list.length;i++){
      var a=list[i];
      if(a.id===ad_id){
        this._ad_log.push({id:ad_id, at:E.TimeM.now()});
        if(this.enabled_ads) return true;
        return !!a.fallback;
      }
    }
    return false;
  },
  rewarded_available: function(ad_id){
    var list=(E.DM.cfg_shop&&E.DM.cfg_shop.ad_stubs)||[];
    for(var i=0;i<list.length;i++) if(list[i].id===ad_id) return true;
    return false;
  },
  cloud_push: function(){ /* hook Firebase/PlayFab */ },
  cloud_pull: function(){ return ''; }
};
