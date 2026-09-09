'use strict';
/* =====================================================================
   p06b_ui2.js — UI parte 2: Mapa, Masmorras, Invocar, Loja, Missões,
   Ajustes + dispatcher render()
   ===================================================================== */
E.UI2 = {
  missionsTab: 'daily',
  init: function(){
    var self=this;
    E.UI.render = function(panelId){ self.render(panelId); };
  },
  render: function(panelId){
    var body=document.getElementById('panel-body');
    body.innerHTML='';
    if(panelId==='heroi') E.UI.render_hero(body);
    else if(panelId==='equip') E.UI.render_equip(body);
    else if(panelId==='skills') E.UI.render_skills(body);
    else if(panelId==='pets') E.UI.render_pets(body);
    else if(panelId==='map') this.render_map(body);
    else if(panelId==='dungeons') this.render_dungeons(body);
    else if(panelId==='summon') this.render_summon(body);
    else if(panelId==='shop') this.render_shop(body);
    else if(panelId==='missions') this.render_missions(body);
  },
  /* ================= MAPA ================= */
  render_map: function(body){
    var self=this;
    var sec=E.UI.h('div','sec','<h3>'+E.DM.tr('map')+'</h3>');
    var c=E.UI.h('div','card');
    var fs=E.Prog.farm_stage();
    c.innerHTML='<div class="row"><div class="grow">'+
      '<div style="font-size:15px"><b>'+E.DM.tr('stage')+' '+E.Prog.current_stage+'</b>'+(E.Prog.current_stage>500?' ☾':'')+'</div>'+
      '<div class="tiny">'+E.DM.region_for_stage(E.Prog.current_stage).name+' · '+E.DM.tr('farming')+': '+fs+'</div>'+
      '<div class="tiny">'+E.DM.tr('farming_desc')+'</div></div>'+
      '<span class="tiny">★ '+E.Prog.max_stage+'</span></div>';
    var row=E.UI.h('div','row');
    row.style.marginTop='8px';
    [[-10,'−10'],[-1,'−1'],[1,'+1'],[10,'+10']].forEach(function(st){
      var b=E.UI.h('button','btn sm', st[1]);
      b.onclick=function(){ E.Prog.jump_to_stage(E.Prog.current_stage+st[0]); E.Audio.play_sfx('click'); self.render('map'); };
      row.appendChild(b);
    });
    var bf=E.UI.h('button','btn sm p',E.DM.tr('quick_farm'));
    bf.onclick=function(){ E.Prog.jump_to_stage(fs); E.Audio.play_sfx('click'); self.render('map'); };
    row.appendChild(bf);
    c.appendChild(row);
    sec.appendChild(c);
    // rendimento estimado
    var inc=E.UI.h('div','card');
    inc.innerHTML='<div class="stat-line"><span>'+E.DM.tr('quick_farm')+' ('+E.DM.tr('per_hour')+')</span><b>🪙 '+E.U.fmt(E.Prog.gold_per_second(fs)*3600)+'</b></div>'+
      '<div class="stat-line"><span>XP '+E.DM.tr('per_hour')+'</span><b>✦ '+E.U.fmt(E.Prog.xp_per_second(fs)*3600)+'</b></div>';
    sec.appendChild(inc);
    // regiões
    sec.appendChild(E.UI.h('div','tiny',E.DM.tr('regions')));
    E.DM.cfg_regions.regions.forEach(function(r){
      var locked=E.Prog.max_stage<r.stages[0] && E.Prog.current_stage<r.stages[0];
      var card=E.UI.h('div','card'+(locked?' muted':''));
      var prog=E.U.clamp((E.Prog.max_stage-r.stages[0]+1)/Math.max(1,Math.min(r.stages[1],500)-r.stages[0]+1),0,1);
      card.innerHTML='<div class="row"><div class="grow">'+
        '<div style="font-size:13px;font-weight:700;color:'+r.palette.accent+'">'+r.name+'</div>'+
        '<div class="tiny">'+E.DM.tr('stage')+' '+r.stages[0]+'–'+(r.stages[1]>999?'∞':r.stages[1])+(locked?' · 🔒':'')+'</div>'+
        '<div class="tiny" style="font-style:italic">'+r.desc+'</div></div></div>';
      if(!locked){
        card.appendChild(E.UI.bar(prog, 'gold'));
        var b=E.UI.h('button','btn sm','→');
        b.style.marginTop='5px';
        b.onclick=function(){
          E.Prog.jump_to_stage(Math.max(r.stages[0], 1));
          E.Audio.play_sfx('click');
          E.UI.show(null);
        };
        card.appendChild(b);
      }
      sec.appendChild(card);
    });
    body.appendChild(sec);
  },
  /* ================= MASMORRAS ================= */
  render_dungeons: function(body){
    var self=this;
    var sec=E.UI.h('div','sec','<h3>'+E.DM.tr('dungeons')+' — 🔑 '+E.Eco.get_cur('chaves')+'</h3>');
    ['masmorra_ouro','masmorra_xp','masmorra_equip'].forEach(function(id){
      var d=E.DM.cfg_dungeons[id];
      var chk=E.Modes.can_enter(id);
      var card=E.UI.h('div','card');
      var info='';
      if(id==='masmorra_equip') info='🔑 '+d.key_cost+' · '+d.desc;
      else{
        var freeLeft=d.free_daily-((E.Modes.dungeon_daily[E.TimeM.day_key()]||{})['free_'+id]||0);
        info=E.DM.tr('free')+': '+Math.max(0,freeLeft)+' · '+d.desc;
      }
      card.innerHTML='<div style="font-size:13px"><b>'+d.name+'</b> <span class="tiny">'+d.duration_s+'s</span></div>'+
        '<div class="tiny">'+info+'</div>';
      var b=E.UI.h('button','btn sm p',E.DM.tr('enter'));
      b.disabled=!chk.ok || E.Modes._active_mode!=='';
      if(!chk.ok) b.textContent=chk.reason||'—';
      b.onclick=function(){
        if(E.Modes.enter(id)){ E.Audio.play_sfx('skill'); self.render('dungeons'); }
      };
      card.appendChild(b);
      if(E.Modes._active_mode===id){
        var p=E.UI.bar(E.Modes._active_t/E.Modes._active_dur,'arc');
        p.style.marginTop='6px';
        card.appendChild(p);
      }
      sec.appendChild(card);
    });
    // Torre
    var td=E.DM.cfg_dungeons.torre_infinita;
    var ct=E.UI.h('div','card');
    ct.innerHTML='<div style="font-size:13px"><b>'+E.DM.tr('tower')+'</b></div>'+
      '<div class="tiny">'+td.desc+'</div>'+
      '<div class="tiny">'+E.DM.tr('floor')+': '+E.Modes.tower_floor+' · '+E.DM.tr('new_record').replace('!','')+': '+E.Modes.tower_record+'</div>';
    var bt=E.UI.h('button','btn sm p',E.DM.tr('enter'));
    bt.disabled=E.Modes._active_mode!=='';
    bt.onclick=function(){ if(E.Modes.enter('torre_infinita')){ E.Audio.play_sfx('skill'); E.UI.show(null); } };
    ct.appendChild(bt);
    sec.appendChild(ct);
    // World Boss
    var wd=E.DM.cfg_dungeons.world_boss;
    var cw=E.UI.h('div','card');
    cw.innerHTML='<div style="font-size:13px"><b>'+wd.name+'</b> <span class="tiny">'+wd.period+'</span></div>'+
      '<div class="tiny">'+wd.desc+'</div>'+(E.Modes.wb_last_rank? '<div class="tiny">'+E.DM.tr('rank')+': #'+E.Modes.wb_last_rank+' · '+E.U.fmt(E.Modes.wb_damage)+' dano</div>':'');
    var bw=E.UI.h('button','btn sm p',E.DM.tr('fight')+' 30s');
    bw.disabled=E.Modes._active_mode!=='' || E.Modes._wb_active;
    bw.onclick=function(){ if(E.Modes.enter('world_boss')){ E.Audio.play_sfx('boss_roar'); E.UI.show(null); } };
    cw.appendChild(bw);
    sec.appendChild(cw);
    // Arena
    var ad=E.DM.cfg_dungeons.arena;
    var used=E.Modes.arena_attempts_today[E.TimeM.day_key()]||0;
    var ca=E.UI.h('div','card');
    ca.innerHTML='<div style="font-size:13px"><b>'+ad.name+'</b> <span class="tiny">'+E.DM.tr('premium')+': '+E.Modes.arena_points+' pts</span></div>'+
      '<div class="tiny">'+E.DM.tr('vs_bots')+' · '+E.DM.tr('current')+': '+(ad.attempts_free-used)+'/'+ad.attempts_free+'</div>'+
      '<div class="tiny">'+E.DM.tr('kills')+': '+E.Modes.arena_wins_total+' · 🏅 '+E.U.fmt(E.Eco.get_cur('gloria'))+'</div>';
    var ba=E.UI.h('button','btn sm p',E.DM.tr('fight'));
    ba.disabled=E.Modes._active_mode!=='';
    ba.onclick=function(){ E.Modes.enter('arena'); };
    ca.appendChild(ba);
    // loja da glória
    ca.appendChild(E.UI.h('div','tiny','— '+E.DM.tr('gloria_shop')+' —'));
    ad.shop.forEach(function(o){
      var row=E.UI.h('div','row');
      row.style.marginBottom='3px';
      row.appendChild(E.UI.h('div','grow','<span style="font-size:11px">'+o.name+'</span><span class="tiny"> — '+o.cost+' 🏅</span>'));
      var bb=E.UI.h('button','btn sm',E.DM.tr('buy'));
      bb.onclick=function(){ if(E.Modes.buy_gloria(o.id)){ E.Audio.play_sfx('coin'); self.render('dungeons'); } };
      row.appendChild(bb);
      ca.appendChild(row);
    });
    sec.appendChild(ca);
    body.appendChild(sec);
  },
  /* ================= INVOCAR ================= */
  render_summon: function(body){
    var self=this;
    var g=E.DM.cfg_gacha, ps=E.Gacha.pity_state();
    var sec=E.UI.h('div','sec','<h3>🔮 '+g.banner+'</h3>');
    var c=E.UI.h('div','card');
    c.innerHTML='<div class="tiny">'+g.featured_desc+'</div>'+
      '<div style="margin-top:6px;font-size:13px">'+E.DM.tr('essencia').split(' ')[0]+': <b style="color:var(--arc)">'+E.U.fmt(E.Eco.get_cur('essencia'))+'</b></div>';
    // pity visível
    var pityDefs=[['rara',ps.since_rare,10,'#3a7bd5'],['epica',ps.since_epic,50,'#9b59d0'],['lendaria',ps.since_legend,100,'#e8a33a']];
    pityDefs.forEach(function(p){
      var row=E.UI.h('div','pity-row');
      row.innerHTML='<span style="width:64px" class="tiny">'+E.DM.tr('pity')+' '+p[2]+'</span>';
      var b=E.UI.bar(p[1]/p[2], p[0]==='lendaria'?'gold':p[0]==='epica'?'arc':'');
      row.appendChild(b);
      row.appendChild(E.UI.h('span','tiny',p[1]+'/'+p[2]));
      c.appendChild(row);
    });
    sec.appendChild(c);
    var row=E.UI.h('div','row');
    var b1=E.UI.h('button','btn p grow',E.DM.tr('pull1')+' (10)');
    b1.onclick=function(){
      var r=E.Gacha.pull(1);
      if(r.length) self._gachaModal(r);
      self.render('summon');
    };
    var b10=E.UI.h('button','btn p grow',E.DM.tr('pull10')+' (90)');
    b10.onclick=function(){
      var r=E.Gacha.pull(10);
      if(r.length) self._gachaModal(r);
      self.render('summon');
    };
    row.appendChild(b1); row.appendChild(b10);
    sec.appendChild(row);
    // taxas
    var rates=E.UI.h('div','card');
    var html='<div class="tiny">Rates:</div>';
    for(var k in g.rates) html+='<div class="stat-line"><span class="tx-'+k+'">'+k+'</span><b>'+g.rates[k]+'%</b></div>';
    html+='<div class="tiny">Pets '+g.types.pet+'% · Companheiros '+g.types.companheiro+'% · Itens '+g.types.item+'%</div>';
    rates.innerHTML=html;
    sec.appendChild(rates);
    // coleção
    var coll=E.UI.h('div','sec','<h3>'+E.DM.tr('owned')+' ('+E.Pet.owned_count()+'/'+E.Pet.all_defs().length+')</h3>');
    var grid=E.UI.h('div','pet-grid');
    E.Pet.all_defs().forEach(function(p){
      var owned=E.Pet.is_owned(p.id);
      var card=E.UI.h('div','pet-card'+(owned?'':' muted'));
      var im=E.UI.img('pets/'+p.icon); im.style.opacity=owned?'1':'.3';
      card.appendChild(im);
      card.appendChild(E.UI.h('div','tiny', owned? p.name : '？？？'));
      grid.appendChild(card);
    });
    coll.appendChild(grid);
    sec.appendChild(coll);
    body.appendChild(sec);
  },
  _gachaModal: function(results){
    var html='<div class="gacha-res">';
    results.forEach(function(r){
      var icon='';
      if(r.kind==='item'){
        var it=r.detail||{};
        icon=E.IMG[E.UI.slotIcon(it.slot)]||'';
      } else {
        var d=E.Pet.def(r.id);
        icon=E.IMG['pets/'+d.icon]||'';
      }
      html+='<div class="gr b-'+r.rarity+'"><img src="'+icon+'"><div class="tx-'+r.rarity+'">'+r.name+'</div>'+
        (r.detail==='duplicate'?'<div class="tiny">+8◈</div>':'')+'</div>';
    });
    html+='</div>';
    E.Audio.play_sfx('gacha');
    E.UI.modal(E.DM.tr('rewards'), html, [{label:E.DM.tr('ok'), cls:'p'}]);
  },
  /* ================= LOJA ================= */
  render_shop: function(body){
    var self=this;
    var s=E.DM.cfg_shop;
    var sec=E.UI.h('div','sec','<h3>🛒 '+E.DM.tr('shop')+'</h3>');
    // gemas
    sec.appendChild(E.UI.h('div','tiny','💎 '+E.U.fmt(E.Eco.get_cur('gemas'))));
    s.gem_shop.forEach(function(o){
      var card=E.UI.h('div','card');
      var row=E.UI.h('div','row');
      row.appendChild(E.UI.h('div','grow','<span style="font-size:12px"><b>'+o.name+'</b></span><br><span class="tiny">'+(o.desc||'')+'</span>'));
      var b=E.UI.h('button','btn sm p','💎 '+o.cost.gemas);
      b.onclick=function(){
        if(E.Eco.spend('gemas', o.cost.gemas)){
          if(o.grant.ouro_from_farm_min){
            E.Eco.add('ouro', E.Prog.gold_per_second(E.Prog.farm_stage())*60*o.grant.ouro_from_farm_min);
          } else E.Eco.add_dict(o.grant);
          E.Audio.play_sfx('coin');
          self._panelDirty=true;
        }
      };
      row.appendChild(b);
      card.appendChild(row);
      sec.appendChild(card);
    });
    // IAP stubs
    sec.appendChild(E.UI.h('div','tiny','— '+E.DM.tr('iap_note')+' —'));
    s.iap_stubs.forEach(function(p){
      var card=E.UI.h('div','card muted');
      var row=E.UI.h('div','row');
      row.appendChild(E.UI.h('div','grow','<span style="font-size:12px">'+p.name+'</span><br><span class="tiny">'+p.desc+'</span>'));
      var b=E.UI.h('button','btn sm', p.price_label+' 🔒');
      b.disabled=true;
      row.appendChild(b);
      card.appendChild(row);
      sec.appendChild(card);
    });
    // ad stubs
    sec.appendChild(E.UI.h('div','tiny','— '+E.DM.tr('watch_ad')+' —'));
    s.ad_stubs.forEach(function(a){
      var card=E.UI.h('div','card');
      var row=E.UI.h('div','row');
      row.appendChild(E.UI.h('div','grow','<span style="font-size:12px">'+a.name+'</span><br><span class="tiny">'+
        (a.enabled? E.DM.tr('watch_ad') : 'stub')+'</span>'));
      sec.appendChild(card);
      card.appendChild(row);
    });
    if(E.Eco.is_premium()){
      sec.appendChild(E.UI.h('div','card','<span style="color:var(--gold)">✦ '+E.DM.tr('premium')+' — '+Math.ceil((E.Eco.premium_until-E.TimeM.now())/86400)+' '+E.DM.tr('premium_days')+'</span>'));
    }
    body.appendChild(sec);
  },
  /* ================= MISSÕES ================= */
  render_missions: function(body){
    var self=this;
    var tabs=[['daily',E.DM.tr('daily_missions')],['weekly',E.DM.tr('weekly_missions')],
      ['ach',E.DM.tr('achievements')],['login',E.DM.tr('daily_login')],['bp',E.DM.tr('battle_pass')]];
    var trow=E.UI.h('div','tabs');
    tabs.forEach(function(t){
      var b=E.UI.h('button','tab'+(self.missionsTab===t[0]?' on':''), t[1]);
      b.onclick=function(){ self.missionsTab=t[0]; self.render('missions'); };
      trow.appendChild(b);
    });
    body.appendChild(trow);
    if(this.missionsTab==='daily'||this.missionsTab==='weekly'){
      var period=this.missionsTab;
      var list=E.DM.cfg_missions[period];
      list.forEach(function(m){
        var prog=E.Ret.mission_progress(m, period), done=E.Ret.mission_done(m, period), claimed=E.Ret.mission_claimed(m, period);
        var row=E.UI.h('div','mis');
        var mid=E.UI.h('div','grow');
        mid.innerHTML='<div style="font-size:12px">'+m.name+'</div><div class="tiny">'+
          E.U.fmt(Math.min(prog, m.goal))+'/'+E.U.fmt(m.goal)+' '+m.progress_label+'</div>';
        row.appendChild(mid);
        var pb=E.UI.bar(prog/m.goal, 'gold');
        pb.className='prog';
        row.appendChild(pb);
        var rwt='';
        for(var k2 in m.reward) rwt+=E.U.fmt(m.reward[k2])+' '+k2+' ';
        var btn=E.UI.h('button','btn sm'+(done&&!claimed?' p':''), claimed? E.DM.tr('claimed') : E.DM.tr('claim'));
        btn.disabled=!done||claimed;
        btn.onclick=function(){ if(E.Ret.claim_mission(m, period)){ E.Audio.play_sfx('coin'); self.render('missions'); } };
        row.appendChild(btn);
        row.title=rwt;
        body.appendChild(row);
      });
    } else if(this.missionsTab==='ach'){
      var list2=E.Ret.achievements_list();
      list2.forEach(function(a){
        var prog=E.Ret.achievement_progress(a), claimed=!!E.Ret.achievements_claimed[a.id];
        var done=prog>=a.goal;
        var row=E.UI.h('div','mis'+(claimed?' ach-done':''));
        var mid=E.UI.h('div','grow');
        mid.innerHTML='<div style="font-size:12px">'+(claimed?'🏆 ':'')+a.name+'</div><div class="tiny">'+a.desc+'</div>'+
          '<div class="tiny">'+E.U.fmt(Math.min(prog,a.goal))+'/'+E.U.fmt(a.goal)+'</div>';
        row.appendChild(mid);
        var btn=E.UI.h('button','btn sm'+(done&&!claimed?' p':''), claimed? E.DM.tr('claimed') : E.DM.tr('claim'));
        btn.disabled=!done||claimed;
        btn.onclick=function(){ if(E.Ret.achievement_claim(a)){ E.Audio.play_sfx('coin'); self.render('missions'); } };
        row.appendChild(btn);
        body.appendChild(row);
      });
    } else if(this.missionsTab==='login'){
      var list3=E.DM.cfg_missions.daily_login;
      var grid=E.UI.h('div','grid3');
      list3.forEach(function(d){
        var cur=d.day===E.Ret.login_cycle_day;
        var past=d.day<E.Ret.login_cycle_day;
        var card=E.UI.h('div','card'+(cur?' act':''));
        card.style.textAlign='center';
        var rw='';
        for(var k in d.reward) rw+=E.U.fmt(d.reward[k])+' '+k;
        card.innerHTML='<div class="tiny">'+(d.big?'🎁 ':'')+'D'+d.day+'</div><div style="font-size:11px">'+rw+'</div>'+
          (past||E.Ret.login_claimed_today()&&cur? '<div class="tiny">✓</div>':'');
        if(cur) card.style.borderColor='var(--gold)';
        grid.appendChild(card);
      });
      body.appendChild(grid);
      var bl=E.UI.h('button','btn p',E.DM.tr('claim'));
      bl.style.marginTop='8px';
      bl.disabled=E.Ret.login_claimed_today();
      bl.onclick=function(){ if(E.Ret.claim_login()){ E.Audio.play_sfx('coin'); self.render('missions'); } };
      body.appendChild(bl);
    } else if(this.missionsTab==='bp'){
      var bp=E.DM.cfg_battlepass;
      var c=E.UI.h('div','card');
      c.innerHTML='<div style="font-size:13px"><b>'+bp.season.name+'</b></div>'+
        '<div class="tiny">'+E.DM.tr('current')+': Tier '+E.Ret.bp_tier()+'/'+bp.tiers+' · '+E.U.fmt(E.Ret.bp_xp%bp.season.xp_per_level)+'/'+bp.season.xp_per_level+' XP</div>';
      c.appendChild(E.UI.bar((E.Ret.bp_xp%bp.season.xp_per_level)/bp.season.xp_per_level, 'arc'));
      body.appendChild(c);
      if(!E.Ret.bp_premium_unlocked){
        var pn=E.UI.h('div','card muted','<span class="tiny">🔒 '+bp.season.name+' '+E.DM.tr('premium')+' — '+E.DM.tr('iap_note')+'</span>');
        body.appendChild(pn);
      }
      var grid2=E.UI.h('div','grid2');
      for(var t=1;t<=bp.tiers;t++){
        var freeR=null, premR=null;
        bp.free_track.forEach(function(e){ if(e.tier===t) freeR=e; });
        bp.premium_track.forEach(function(e){ if(e.tier===t) premR=e; });
        if(!freeR&&!premR) continue;
        var col=E.UI.h('div','card'+(t<=E.Ret.bp_tier()?'':' muted'));
        var fmtR=function(r){
          if(!r) return '—';
          var parts=[];
          if(r.reward.ouro) parts.push(E.U.fmt(r.reward.ouro)+'🪙');
          if(r.reward.essencia) parts.push(E.U.fmt(r.reward.essencia)+'✦');
          if(r.reward.gemas) parts.push(E.U.fmt(r.reward.gemas)+'💎');
          if(r.reward.fragmentos_equip) parts.push(E.U.fmt(r.reward.fragmentos_equip)+'◈');
          if(r.reward.chaves) parts.push(E.U.fmt(r.reward.chaves)+'🔑');
          if(r.reward.item_epico) parts.push('Épica '+r.reward.item_epico);
          if(r.reward.item_lendario) parts.push('Lendária '+r.reward.item_lendario);
          if(r.reward.pet_frag) parts.push(E.U.fmt(r.reward.pet_frag)+' pet◈');
          return parts.join(' ');
        };
        var unlocked=t<=E.Ret.bp_tier();
        var fClaimed=E.Ret.bp_claimed_free.indexOf(t)>=0;
        var html='<div class="tiny">Tier '+t+'</div><div style="font-size:11px">'+E.DM.tr('free')+': '+fmtR(freeR)+'</div>';
        var pClaimed=E.Ret.bp_claimed_premium.indexOf(t)>=0;
        html+='<div style="font-size:11px">'+E.DM.tr('premium')+': '+fmtR(premR)+'</div>';
        col.innerHTML=html;
        if(unlocked&&freeR&&!fClaimed){
          var bf3=E.UI.h('button','btn sm p',E.DM.tr('claim'));
          (function(tt){ bf3.onclick=function(){ if(E.Ret.bp_claim(tt,false)){ E.Audio.play_sfx('coin'); self.render('missions'); } }; })(t);
          col.appendChild(bf3);
        }
        if(unlocked&&premR&&E.Ret.bp_premium_unlocked&&E.Ret.bp_claimed_premium.indexOf(t)<0){
          var bp3=E.UI.h('button','btn sm p',E.DM.tr('claim')+' ★');
          (function(tt){ bp3.onclick=function(){ if(E.Ret.bp_claim(tt,true)){ E.Audio.play_sfx('coin'); self.render('missions'); } }; })(t);
          col.appendChild(bp3);
        }
        grid2.appendChild(col);
      }
      body.appendChild(grid2);
    }
  },
  /* ================= AJUSTES ================= */
  openSettings: function(){
    var self=this;
    var html='<div class="stat-line"><span>'+E.DM.tr('music')+'</span><input type="range" id="st-mus" min="0" max="100" value="'+Math.round(E.Audio.music_vol*100)+'"></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('sfx')+'</span><input type="range" id="st-sfx" min="0" max="100" value="'+Math.round(E.Audio.sfx_vol*100)+'"></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('amb')+'</span><input type="range" id="st-amb" min="0" max="100" value="'+Math.round((E.Audio.amb_vol||0)*100)+'"></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('reduced_fx')+'</span><input type="checkbox" id="st-rfx" '+(E.Rfx.reducedFx?'checked':'')+' style="accent-color:var(--gold);width:16px;height:16px"></div>'+ // [AUDIT-C1]
      '<div class="stat-line"><span>'+E.DM.tr('quality')+'</span><select id="st-perf">'+ // [AUDIT-C2]
        '<option value="auto">'+E.DM.tr('q_auto')+'</option>'+
        '<option value="high">'+E.DM.tr('q_high')+'</option>'+
        '<option value="low">'+E.DM.tr('q_low')+'</option></select></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('language')+'</span><select id="st-lang"><option value="ptbr">Português (BR)</option><option value="en">English</option></select></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('season')+'</span><select id="st-season">'+
        '<option value="auto">'+E.DM.tr('season_auto')+'</option>'+
        '<option value="primavera">🌸 '+E.DM.tr('season_spring')+'</option>'+
        '<option value="verao">☀ '+E.DM.tr('season_summer')+'</option>'+
        '<option value="outono">🍂 '+E.DM.tr('season_autumn')+'</option>'+
        '<option value="inverno">❄ '+E.DM.tr('season_winter')+'</option></select></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('weather')+'</span><select id="st-weather">'+
        '<option value="auto">'+E.DM.tr('weather_auto')+'</option>'+
        '<option value="limpo">🌤 '+E.DM.tr('w_clear')+'</option>'+
        '<option value="nublado">☁ '+E.DM.tr('w_cloudy')+'</option>'+
        '<option value="chuva">🌧 '+E.DM.tr('w_rain')+'</option>'+
        '<option value="tempestade">⚡ '+E.DM.tr('w_storm')+'</option>'+
        '<option value="neve">🌨 '+E.DM.tr('w_snow')+'</option></select></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('daynight')+'</span><select id="st-dn">'+ // [V8]
        '<option value="auto">'+E.DM.tr('dn_auto')+'</option>'+
        '<option value="amanhecer">🌅 '+E.DM.tr('dn_dawn')+'</option>'+
        '<option value="dia">☀ '+E.DM.tr('dn_day')+'</option>'+
        '<option value="entardecer">🌇 '+E.DM.tr('dn_dusk')+'</option>'+
        '<option value="noite">🌙 '+E.DM.tr('dn_night')+'</option></select></div>'+
      '<hr style="border-color:var(--line);margin:8px 0">'+
      '<div class="stat-line"><span>'+E.DM.tr('kills')+'</span><b>'+E.U.fmt(E.Ret.counters.kills||0)+'</b></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('gold_total')+'</span><b>'+E.U.fmt(E.Eco.gold_earned_total)+'</b></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('drops')+'</span><b>'+E.U.fmt(E.Inv.equips_total)+'</b></div>'+
      '<div class="stat-line"><span>'+E.DM.tr('save_version')+'</span><b>'+E.Save.SAVE_VERSION+' · v'+E.DM.GAME_VERSION+' HTML</b></div>'+
      '<hr style="border-color:var(--line);margin:8px 0">'+
      '<div class="tiny">'+E.DM.tr('details')+': export/import do Selo</div>'+
      '<textarea id="st-export" readonly placeholder="Exportar…"></textarea>'+
      '<div class="row"><button class="btn sm" id="st-exp">'+E.DM.tr('confirm')+' export</button>'+
      '<button class="btn sm" id="st-copy">'+E.DM.tr('copy')+'</button>'+ // [AUDIT-D2]
      '<button class="btn sm" id="st-imp">'+E.DM.tr('confirm')+' import</button></div>'+
      '<textarea id="st-import" placeholder="Cole o save aqui…"></textarea>'+
      '<hr style="border-color:var(--line);margin:8px 0">'+
      '<button class="btn d" id="st-reset">'+E.DM.tr('reset_save')+'</button>';
    E.UI.modal('⚙ '+E.DM.tr('settings'), html, [{label:E.DM.tr('close'), cls:'p'}]);
    var lang=document.getElementById('st-lang');
    lang.value=E.DM.language;
    var seas=document.getElementById('st-season');
    seas.value=E.Rfx.seasonPref;
    seas.onchange=function(){
      E.Rfx.setSeasonPref(this.value);
      var k=E.Rfx._seasonLocKey(E.Rfx.season);
      E.UI.toast(E.DM.tr('season')+': '+E.DM.tr(k), '#3a9e8f');
      E.Audio.play_sfx('click');
    };
    var wx=document.getElementById('st-weather');
    wx.value=E.Rfx.weatherPref;
    wx.onchange=function(){
      E.Rfx.setWeatherPref(this.value);
      var k2=E.Rfx._weatherLocKey(E.Rfx.weather);
      E.UI.toast(E.DM.tr('weather')+': '+E.DM.tr(k2), '#5a8fd0');
      E.Audio.play_sfx('click');
    };
    var dn=document.getElementById('st-dn'); // [V8] override do período do dia
    dn.value=E.Rfx.dnPref;
    dn.onchange=function(){
      E.Rfx.setDnPref(this.value);
      var k3=E.Rfx._dnLocKey(E.Rfx._dnPhaseNow());
      E.UI.toast(E.DM.tr('daynight')+': '+E.DM.tr(k3), '#8a7fd0');
      E.Audio.play_sfx('click');
    };
    document.getElementById('st-mus').oninput=function(){ E.Audio.set_music_vol(this.value/100); };
    document.getElementById('st-sfx').onchange=function(){ E.Audio.set_sfx_vol(this.value/100); E.Audio.play_sfx('click'); };
    document.getElementById('st-amb').oninput=function(){ E.Audio.set_amb_vol(this.value/100); }; // [ART-10]
    // [AUDIT-C1] acessibilidade: reduzir flashes/tremores
    var rfx=document.getElementById('st-rfx');
    rfx.checked=E.Rfx.reducedFx;
    rfx.onchange=function(){ E.Rfx.setReducedFx(this.checked); E.Audio.play_sfx('click'); };
    // [AUDIT-C2] desempenho visual
    var perf=document.getElementById('st-perf');
    perf.value=E.Rfx.perfMode;
    perf.onchange=function(){ E.Rfx.setPerfMode(this.value); E.Audio.play_sfx('click'); };
    lang.onchange=function(){
      E.DM.language=this.value;
      E.Save.mark_dirty();
      E.UI._buildNav(); E.UI._buildCurChips();
      E.UI.closeModal();
      E.UI.toast(E.DM.tr('saved'), '#3a9e8f');
    };
    document.getElementById('st-exp').onclick=function(){
      document.getElementById('st-export').value=E.Save.export_save();
    };
    // [AUDIT-D2] copiar o Selo (clipboard API + fallback select/execCommand p/ browsers antigos)
    document.getElementById('st-copy').onclick=function(){
      var ta=document.getElementById('st-export'), txt=ta.value;
      var done=function(){ E.UI.toast(E.DM.tr('copied'), '#58c46a'); E.Audio.play_sfx('click'); };
      if(!txt){ ta.focus(); return; }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(done).catch(function(){
          ta.select(); try{ document.execCommand('copy'); done(); }catch(e){}
        });
      } else { ta.select(); try{ document.execCommand('copy'); done(); }catch(e){} }
    };
    document.getElementById('st-imp').onclick=function(){
      var ok=E.Save.import_save(document.getElementById('st-import').value);
      E.UI.toast(ok? E.DM.tr('load_ok') : E.DM.tr('save_corrupt'), ok?'#58c46a':'#d0455f');
      if(ok) E.UI.closeModal();
    };
    document.getElementById('st-reset').onclick=function(){
      E.UI.confirm(E.DM.tr('reset_save'), E.DM.tr('reset_confirm'), function(){
        E.Save.wipe();
        globalThis.location.reload();
        return true;
      });
    };
  }
};
