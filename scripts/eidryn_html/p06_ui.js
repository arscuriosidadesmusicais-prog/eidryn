'use strict';
/* =====================================================================
   p06_ui.js — UI parte 1: HUD, navegação (8 abas), Herói, Equipar,
   Habilidades, Pets, modais e toasts (pt-BR via loc_ptbr.json)
   ===================================================================== */
E.UI = {
  current: null, _panelDirty: false, _throttle: 0,
  CUR_ICON: {ouro:'currency_ouro', gemas:'currency_gemas', fragmentos_alma:'currency_fragmentos_alma',
    fragmentos_equip:'currency_fragmentos_equip', chaves:'currency_chaves', essencia:'currency_essencia', gloria:'currency_gloria'},
  LKEY: {heroi:'hero', equip:'equipment', skills:'skills', pets:'pets', map:'map', dungeons:'dungeons', summon:'summon', shop:'shop'},
  STAT_LABELS: {
    atk:{ptbr:'ATK',en:'ATK'}, hp:{ptbr:'HP',en:'HP'}, def:{ptbr:'DEF',en:'DEF'},
    crit:{ptbr:'Crítico %',en:'Crit %'}, critdmg:{ptbr:'Dano Crít. %',en:'Crit Dmg %'},
    atkspd:{ptbr:'Vel. Atq',en:'Atk Speed'}, lifesteal:{ptbr:'Roubo Vida %',en:'Lifesteal %'},
    dodge:{ptbr:'Esquiva %',en:'Dodge %'}, regen:{ptbr:'Regen HP/s',en:'HP Regen/s'},
    gold_find:{ptbr:'Ouro %',en:'Gold %'}, xp_gain:{ptbr:'XP %',en:'XP %'},
    boss_damage:{ptbr:'Dano Boss %',en:'Boss Dmg %'}, drop_bonus:{ptbr:'Drop %',en:'Drop %'}, luck:{ptbr:'Sorte',en:'Luck'}
  },
  sl: function(k){ var d=this.STAT_LABELS[k]; return d? d[E.DM.language]||d.ptbr : k; },
  NAV: [
    {id:'heroi', ic:'🗡'}, {id:'equip', ic:'🛡'}, {id:'skills', ic:'✨'}, {id:'pets', ic:'🐾'},
    {id:'map', ic:'🗺'}, {id:'dungeons', ic:'🕳'}, {id:'summon', ic:'🔮'}, {id:'shop', ic:'🛒'}
  ],
  init: function(){
    var self=this;
    this._buildNav();
    this._buildSkillbar();
    this._buildCurChips();
    document.getElementById('btn-back').onclick=function(){ self.show(null); };
    document.getElementById('btn-missions').onclick=function(){ self.show('missions'); };
    document.getElementById('btn-config').onclick=function(){ self.openSettings(); };
    document.getElementById('btn-auto').onclick=function(){
      E.Prog.set_auto_advance(!E.Prog.auto_advance);
      this.classList.toggle('on', E.Prog.auto_advance);
      E.Audio.play_sfx('click');
    };
    E.BUS.on('toast', function(msg, color){ self.toast(msg, color); });
    /* [AUDIT-A2] moedas: update LEVE por referência — o ouro muda a cada kill,
       reconstruir os 7 chips (innerHTML + 7 imgs base64) em cada um era desperdício */
    E.BUS.on('currency_changed', function(id){ self._panelDirty=true; self._updateCurChip(id); });
    E.BUS.on('stats_recalculated', function(){ self._panelDirty=true; });
    E.BUS.on('stage_changed', function(st, isBoss, isMini){
      var el=document.getElementById('hud-stage');
      var prefix = isBoss? '☠ '+E.DM.tr('boss')+' — ' : isMini? '⚔ '+E.DM.tr('miniboss')+' — ' : '';
      el.textContent=prefix+E.DM.tr('stage')+' '+st;
      var reg=E.DM.region_for_stage(st);
      document.getElementById('hud-region').textContent=reg.name;
    });
    E.BUS.on('missions_updated', function(){ self._updateBadge(); self._panelDirty=true; });
    E.BUS.on('item_dropped', function(it){
      if(it.rarity==='divina'){ E.Audio.play_sfx('loot_legend'); E.UI.banner(E.DM.tr('loot_divine'), '#f5e6c8'); }
      else if(it.rarity==='lendaria'){ E.Audio.play_sfx('loot_legend'); E.UI.banner(E.DM.tr('loot_legendary'), '#e8a33a'); }
      else if(it.rarity==='mitica') E.Audio.play_sfx('loot_legend');
      else if(it.rarity==='epica') E.Audio.play_sfx('loot_epic');
      else E.Audio.play_sfx('loot_rare');
      self._panelDirty=true;
    });
    E.BUS.on('item_reinforced', function(item, success, pityLeft){
      E.Audio.play_sfx(success?'reinforce':'fail');
      self.toast(item.base+' +'+item.reinforce+(success?' ✓':' ✗')+'  (pity: '+pityLeft+')', success?'#58c46a':'#d0455f');
      self._panelDirty=true;
    });
    E.BUS.on('inventory_full', function(){ E.UI.toast(E.DM.tr('inventory_full'), '#d0455f'); });
    E.BUS.on('combat_ended', function(result){
      if(result==='win') E.Audio.play_sfx('coin');
      else E.Audio.play_sfx('fail');
      if(result==='fail' && E.Combat.mode==='campaign') E.UI.banner(E.DM.tr('combat_fail'), '#d0455f');
    });
    E.BUS.on('combat_started', function(st, isBoss){ if(isBoss) E.Audio.play_sfx('boss_roar'); });
    E.BUS.on('level_up', function(lv){
      E.Audio.play_sfx('levelup');
      E.UI.banner(E.DM.tr('level_up')+' '+lv, '#e8a33a');
    });
    E.BUS.on('boss_timer', function(secs){
      var bb=document.getElementById('bossbar');
      if(!E.Combat.active || !E.Combat.enemy.boss){ bb.classList.add('hidden'); return; }
      bb.classList.remove('hidden');
      var max=E.DM.cfg_enemies.boss_timer_s;
      document.getElementById('bossbar-fill').style.width=Math.max(0,secs/max*100)+'%';
      document.getElementById('bossbar-label').textContent=E.DM.tr('boss_timer')+': '+Math.max(0,secs).toFixed(1)+'s';
    });
    E.BUS.on('ascension_performed', function(){ E.Audio.play_sfx('ascend'); self._panelDirty=true; });
    E.BUS.on('pet_star_up', function(){ E.Audio.play_sfx('evolve'); self._panelDirty=true; });
    E.BUS.on('dungeon_completed', function(mode_id, rewards){
      E.Audio.play_sfx('win');
      self._panelDirty=true;
      var lines='', r;
      if(rewards.ouro!=null) lines=E.U.fmt(rewards.ouro)+' de ouro';
      else if(rewards.xp!=null) lines=E.U.fmt(rewards.xp)+' de XP';
      else if(rewards.items){ for(var i=0;i<rewards.items.length;i++){ r=rewards.items[i]; lines+='<span class="tx-'+r.rarity+'">'+r.base+'</span><br>'; } }
      self.modal(E.DM.tr('rewards'), '<div style="text-align:center;font-size:15px">'+lines+'</div>',
        [{label:E.DM.tr('ok'), cls:'p'}]);
    });
    E.BUS.on('world_boss_result', function(dmg, rank){
      self.modal(E.DM.tr('world_boss'),
        '<div style="text-align:center"><div style="font-size:22px;color:var(--gold)">'+E.DM.tr('rank')+' #'+rank+'</div>'+
        '<div class="muted">Dano: '+E.U.fmt(dmg)+'</div></div>', [{label:E.DM.tr('ok'), cls:'p'}]);
    });
    E.BUS.on('arena_result', function(win, rw){
      E.Audio.play_sfx(win?'win':'fail');
      self.modal(E.DM.tr('arena'), '<div style="text-align:center;font-size:16px">'+(win?'VITÓRIA':'DERROTA')+'</div>'+
        '<div class="tiny" style="text-align:center">+'+rw.gloria+' glória · '+rw.pontos+' pontos</div>',
        [{label:E.DM.tr('ok'), cls:'p'}]);
    });
    E.BUS.on('tower_floor_reached', function(){ self._panelDirty=true; });
    // [AUDIT-B2] o evento skill_ready JÁ existia no BUS e ninguém escutava —
    // agora o slot pisca quando a habilidade recarrega (leitura instantânea de "pronto")
    E.BUS.on('skill_ready', function(id){
      var idx=['lamina_eclipse','guarda_sombras','sedenta','rumo_vazio','cataclismo'].indexOf(id);
      var bar=document.getElementById('skillbar');
      if(idx<0||!bar) return;
      var slot=bar.querySelectorAll('.sk-slot')[idx];
      if(!slot) return;
      slot.classList.remove('flash');
      void slot.offsetWidth; // reinicia a animação
      slot.classList.add('flash');
      setTimeout(function(){ slot.classList.remove('flash'); }, 700);
    });
    // [AUDIT-B3] troca de fase pulsa no HUD (feedback de progresso)
    E.BUS.on('stage_changed', function(){
      var el=document.getElementById('hud-stage');
      if(!el) return;
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    });
    // [AUDIT-D3] autosave visível: ⚙ pulsa em verde quando o Selo é gravado
    E.BUS.on('save_flushed', function(){
      var c=document.getElementById('btn-config');
      if(!c) return;
      c.classList.remove('save-pulse');
      void c.offsetWidth;
      c.classList.add('save-pulse');
    });
    // refresh loop (200ms)
    setInterval(function(){
      document.getElementById('hud-pc').textContent=E.DM.tr('pc')+' '+E.U.fmt(E.Char.pc());
      self._updateBadge();
      if(self.current && self._panelDirty){
        self._panelDirty=false;
        self.render(self.current);
      }
    }, 200);
    this._updateSkillbarLoop();
  },
  /* ---------- HELPERS ---------- */
  h: function(tag, cls, html){
    var e=document.createElement(tag);
    if(cls) e.className=cls;
    if(html!=null) e.innerHTML=html;
    return e;
  },
  img: function(key, cls){
    var im=document.createElement('img');
    im.src=E.IMG[key]||'';
    if(cls) im.className=cls;
    return im;
  },
  slotIcon: function(slotId){
    var slots=E.DM.cfg_items.slots;
    for(var i=0;i<slots.length;i++) if(slots[i].id===slotId) return 'ui/'+slots[i].icon;
    return 'ui/sl_arma';
  },
  bar: function(frac, cls){
    var b=this.h('div','bar','<i class="'+(cls||'')+'" style="width:'+(E.U.clamp(frac,0,1)*100)+'%"></i>');
    return b;
  },
  toast: function(msg, color){
    var t=this.h('div','toast',msg);
    if(color) t.style.borderColor=color;
    var box=document.getElementById('toasts');
    box.appendChild(t);
    setTimeout(function(){ t.style.opacity='0'; t.style.transition='opacity .3s'; }, 2200);
    setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 2600);
    while(box.children.length>4) box.removeChild(box.firstChild);
  },
  banner: function(txt, color){ E.Rfx.banner(txt, color); },
  modal: function(title, bodyHTML, buttons){
    var root=document.getElementById('modal-root');
    root.innerHTML='';
    var m=this.h('div','modal');
    var mh=this.h('div','mh',title);
    var mb=this.h('div','mb'); mb.innerHTML=bodyHTML;
    var mf=this.h('div','mf');
    var self=this;
    (buttons||[{label:E.DM.tr('close'), cls:'p'}]).forEach(function(b){
      var btn=self.h('button','btn '+(b.cls||''),b.label);
      btn.onclick=function(){
        if(b.fn && b.fn()===false) return;
        if(!b.keep) self.closeModal();
      };
      mf.appendChild(btn);
    });
    m.appendChild(mh); m.appendChild(mb); m.appendChild(mf);
    root.appendChild(m);
    root.classList.add('show');
  },
  confirm: function(title, body, onYes){
    this.modal(title, '<div style="font-size:13px;line-height:1.5">'+body+'</div>',
      [{label:E.DM.tr('cancel')},{label:E.DM.tr('confirm'), cls:'p', fn:onYes}]);
  },
  closeModal: function(){
    var root=document.getElementById('modal-root');
    root.classList.remove('show');
    root.innerHTML='';
  },
  /* ---------- NAVEGAÇÃO ---------- */
  show: function(panelId){
    this.current=panelId;
    var vp=document.getElementById('view-panel');
    var nav=document.getElementById('nav');
    if(panelId){
      vp.classList.remove('hidden');
      document.getElementById('panel-title').textContent=this._title(panelId);
      this.render(panelId);
      // destacar aba ativa
      var btns=nav.querySelectorAll('[data-panel]');
      for(var i=0;i<btns.length;i++){
        var on=btns[i].getAttribute('data-panel')===panelId;
        btns[i].style.color=on?'var(--gold2)':'';
        btns[i].classList.toggle('nav-on', on);
      }
    } else {
      vp.classList.add('hidden');
      var btns2=nav.querySelectorAll('[data-panel]');
      for(var j=0;j<btns2.length;j++){ btns2[j].style.color=''; btns2[j].classList.remove('nav-on'); }
    }
    E.Audio.play_sfx('click');
  },
  _title: function(id){
    if(id==='missions') return '📜 '+E.DM.tr('daily_missions')+' · '+E.DM.tr('achievements');
    var nav=this.NAV;
    for(var i=0;i<nav.length;i++) if(nav[i].id===id) return nav[i].ic+' '+E.DM.tr(this.LKEY[id]);
    return id;
  },
  _buildNav: function(){
    var nav=document.getElementById('nav'), self=this;
    this.NAV.forEach(function(n){
      var b=self.h('button','btn g');
      b.style.cssText='flex:1;flex-direction:column;gap:2px;font-size:10px;border-radius:0;padding:5px 0 5px;border:none;border-right:1px solid rgba(58,42,85,.6);font-weight:700;letter-spacing:.3px';
      var ic=E.IMG['ui/tab_'+n.id];
      b.innerHTML=(ic?('<img src="'+ic+'" style="width:22px;height:22px;image-rendering:pixelated" alt="">')
        :('<span style="font-size:17px">'+n.ic+'</span>'))+'<span>'+E.DM.tr(self.LKEY[n.id])+'</span>';
      b.setAttribute('data-panel', n.id);
      b.onclick=function(){ self.show(self.current===n.id?null:n.id); };
      nav.appendChild(b);
    });
  },
  _buildCurChips: function(){
    var box=document.getElementById('hud-cur');
    box.innerHTML='';
    var order=['ouro','gemas','essencia','chaves','fragmentos_equip','fragmentos_alma','gloria'];
    var self=this;
    this._curRefs={};
    order.forEach(function(id){
      var c=self.h('div','chip');
      var ic=self.img('ui/'+self.CUR_ICON[id]);
      ic.title=E.DM.tr('details');
      var txt=document.createTextNode(E.U.fmt(E.Eco.get_cur(id)));
      c.appendChild(ic); c.appendChild(txt);
      box.appendChild(c);
      self._curRefs[id]={chip:c, txt:txt};
    });
  },
  /* [AUDIT-A2] refresh barato de UM chip (textContent apenas — zero reflow de imagens) */
  _updateCurChip: function(id){
    var r=id && this._curRefs && this._curRefs[id];
    if(!r){ this._buildCurChips(); return; }
    var v=E.U.fmt(E.Eco.get_cur(id));
    if(r.txt.textContent!==v) r.txt.textContent=v;
  },
  _updateBadge: function(){
    var n=0, list=E.DM.cfg_missions.daily, i;
    for(i=0;i<list.length;i++) if(E.Ret.mission_done(list[i],'daily')&&!E.Ret.mission_claimed(list[i],'daily')) n++;
    list=E.DM.cfg_missions.weekly;
    for(i=0;i<list.length;i++) if(E.Ret.mission_done(list[i],'weekly')&&!E.Ret.mission_claimed(list[i],'weekly')) n++;
    list=E.Ret.achievements_list();
    for(i=0;i<list.length;i++) if(E.Ret.achievement_progress(list[i])>=list[i].goal && !E.Ret.achievements_claimed[list[i].id]) n++;
    if(!E.Ret.login_claimed_today()) n++;
    var b=document.getElementById('mis-badge');
    if(n>0){ b.textContent=n>9?'9+':n; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
  },
  /* ---------- SKILLBAR ---------- */
  _buildSkillbar: function(){
    var bar=document.getElementById('skillbar'), self=this;
    bar.innerHTML='';
    var ids=['lamina_eclipse','guarda_sombras','sedenta','rumo_vazio','cataclismo'];
    ids.forEach(function(id, idx){
      var s=E.Skill.skill_def(id);
      var slot=self.h('button','sk-slot'+(id==='cataclismo'?' sup':''));
      slot.innerHTML='<img src="'+(E.IMG['ui/'+s.icon]||'')+'">';
      slot.onclick=function(){ E.Combat.cast_skill(id); };
      slot.title=s.name;
      bar.appendChild(slot);
    });
    var auto=this.h('button','','A');
    auto.id='btn-sk-auto';
    auto.title=E.DM.tr('skills_auto');
    auto.onclick=function(){
      var anyOn=false, sections=['active','supreme'];
      for(var s=0;s<sections.length;s++){
        var list=E.DM.cfg_skills[sections[s]];
        for(var i=0;i<list.length;i++) if(E.Skill.auto_cast[list[i].id]) anyOn=true;
      }
      var setTo=!anyOn;
      for(var s2=0;s2<sections.length;s2++){
        var list2=E.DM.cfg_skills[sections[s2]];
        for(var i2=0;i2<list2.length;i2++) E.Skill.auto_cast[list2[i2].id]=setTo;
      }
      E.Save.mark_dirty();
      E.Audio.play_sfx('click');
    };
    bar.appendChild(auto);
  },
  _updateSkillbarLoop: function(){
    var self=this;
    setInterval(function(){
      var bar=document.getElementById('skillbar');
      var slots=bar.querySelectorAll('.sk-slot');
      var ids=['lamina_eclipse','guarda_sombras','sedenta','rumo_vazio','cataclismo'];
      for(var i=0;i<ids.length && i<slots.length;i++){
        var id=ids[i], s=slots[i], def=E.Skill.skill_def(id);
        var unlocked=!!E.Skill.unlocked[id];
        var cd=E.Skill.cooldown_left(id);
        var ov=s.querySelector('.cd')||s.querySelector('.lockl');
        if(!unlocked){
          if(!s.querySelector('.lockl')){
            var l=self.h('div','lockl','Nv '+def.unlock_level);
            s.appendChild(l);
          }
          s.classList.remove('ready');
          continue;
        }
        var l2=s.querySelector('.lockl'); if(l2) l2.remove();
        if(cd>0){
          if(!ov||ov.className!=='cd'){ if(ov) ov.remove(); ov=self.h('div','cd',''); s.appendChild(ov); }
          ov.textContent=cd>=1?Math.ceil(cd):cd.toFixed(1);
          s.classList.remove('ready');
        } else {
          if(ov) ov.remove();
          s.classList.add('ready');
        }
      }
      var auto=document.getElementById('btn-sk-auto');
      if(auto) auto.classList.toggle('on', !!E.Skill.auto_cast['lamina_eclipse']);
    }, 120);
  },
  /* ================= PAINEL: HERÓI ================= */
  render_hero: function(body){
    var stats=E.Char.stats(), self=this;
    // nível + PC
    var c1=this.h('div','card');
    var xpCost=E.DM.level_xp_cost(E.Char.level);
    c1.innerHTML='<div class="row"><div class="grow"><b style="font-size:16px">'+E.DM.tr('level')+' '+E.Char.level+'</b>'+
      '<div class="tiny">'+E.DM.tr('pc')+': <b style="color:var(--gold)">'+E.U.fmt(E.Char.pc())+'</b></div></div>'+
      '<div class="tiny" style="text-align:right">'+E.U.fmt(E.Char.xp)+' / '+E.U.fmt(xpCost)+' XP</div></div>';
    c1.appendChild(this.bar(E.Char.xp/xpCost));
    body.appendChild(c1);
    // stats
    var c2=this.h('div','card');
    var rows=[['atk',E.U.fmt(stats.atk)],['hp',E.U.fmt(stats.hp)],['def',E.U.fmt(stats.def)],
      ['crit',stats.crit_rate.toFixed(1)+'%'],['critdmg',stats.crit_damage.toFixed(0)+'%'],['atkspd','x'+(1/stats.atk_interval).toFixed(2)],
      ['lifesteal',stats.lifesteal.toFixed(1)+'%'],['dodge',stats.dodge.toFixed(1)+'%'],['regen',stats.regen.toFixed(1)+'/s'],
      ['gold_find','+'+stats.gold_find.toFixed(0)+'%'],['xp_gain','+'+stats.xp_gain.toFixed(0)+'%'],['boss_damage','+'+stats.boss_damage.toFixed(0)+'%']];
    var html='<div class="grid2">';
    rows.forEach(function(r){ html+='<div class="stat-line"><span>'+E.UI.sl(r[0])+'</span><b>'+r[1]+'</b></div>'; });
    html+='</div>';
    c2.innerHTML=html;
    body.appendChild(c2);
    // 12 atributos
    var sec=this.h('div','sec','<h3>'+E.DM.tr('stats')+'</h3>');
    var list=E.DM.cfg_attributes.attributes;
    list.forEach(function(a){
      var lv=E.Char.attr_level(a.id);
      var cost=E.Char.attr_cost(a.id);
      var row=self.h('div','mis');
      var im=self.img('ui/attr_'+a.icon); im.style.width='26px'; im.style.height='26px';
      row.appendChild(im);
      var mid=self.h('div','grow');
      mid.innerHTML='<div style="font-size:12px"><b>'+a.name+'</b> <span class="tiny">Nv '+lv+'</span></div>'+
        '<div class="tiny">'+a.desc+'</div>';
      row.appendChild(mid);
      var btn=self.h('button','btn sm p', E.U.fmt(cost)+' 🪙');
      btn.onclick=function(){ if(E.Char.upgrade_attribute(a.id)) E.Audio.play_sfx('click'); self._panelDirty=true; };
      row.appendChild(btn);
      sec.appendChild(row);
    });
    body.appendChild(sec);
    this._render_ascension(body);
  },
  _render_ascension: function(body){
    var self=this;
    var sec=this.h('div','sec','<h3>☾ '+E.DM.tr('ascension')+'</h3>');
    if(!E.Asc.is_unlocked()){
      sec.appendChild(this.h('div','card','<span class="muted">🔒 '+E.DM.tr('asc_locked')+'</span>'));
      body.appendChild(sec);
      return;
    }
    var pending=E.Asc.pending_fragments();
    var c=this.h('div','card');
    c.innerHTML='<div class="row"><div class="grow"><div style="font-size:13px">'+E.DM.tr('ascend')+
      ' → <b style="color:var(--r6)">+'+E.U.fmt(pending)+' Fragmentos de Alma</b></div>'+
      '<div class="tiny">'+E.DM.tr('ascend_confirm').split('.')[0]+'.</div></div>'+
      '<button class="btn d" id="btn-ascend">☾ '+E.DM.tr('ascend')+'</button></div>';
    sec.appendChild(c);
    // árvore
    var frag=E.Eco.get_cur('fragmentos_alma');
    sec.appendChild(this.h('div','tiny','Fragmentos disponíveis: <b style="color:var(--r6)">'+E.U.fmt(frag)+'</b>'));
    var branches={ofensiva:[], defensiva:[], utilidade:[]};
    E.Asc.nodes().forEach(function(n){
      if(branches[n.branch]) branches[n.branch].push(n);
    });
    Object.keys(branches).forEach(function(br){
      sec.appendChild(self.h('div','tiny','— '+br+' —'));
      branches[br].forEach(function(n){
        var lv=E.Asc.node_level(n.id);
        var can=E.Asc.node_requirements_met(n) && lv<n.max && E.Eco.can_spend('fragmentos_alma', E.Asc.node_cost(n));
        var cls='node'+(lv>=n.max?' max':can?' can':'');
        var d=self.h('div',cls);
        d.innerHTML='<div class="row"><div class="grow"><div class="br">'+n.branch+' · tier '+n.tier+'</div>'+
          '<div style="font-size:12px"><b>'+n.name+'</b> '+(lv>0?'<span class="stars">'+lv+'/'+n.max+'</span>':'')+'</div>'+
          '<div class="tiny">'+n.desc+'</div></div>'+
          (lv<n.max? '<button class="btn sm p">'+E.Asc.node_cost(n)+' ✦</button>' : '<span class="tiny">MAX</span>')+'</div>';
        if(lv<n.max){
          var btn=d.querySelector('button');
          btn.onclick=function(){ if(E.Asc.buy_node(n.id)) E.Audio.play_sfx('equip'); self._panelDirty=true; };
        }
        sec.appendChild(d);
      });
    });
    body.appendChild(sec);
    var btnAsc=sec.querySelector('#btn-ascend');
    if(btnAsc) btnAsc.onclick=function(){
      self.confirm('☾ '+E.DM.tr('ascend'), E.DM.tr('ascend_confirm'), function(){
        E.Asc.ascend();
        return true;
      });
    };
  },
  /* ================= PAINEL: EQUIPAR ================= */
  render_equip: function(body){
    var self=this;
    var sec=this.h('div','sec','<h3>'+E.DM.tr('equipment')+'</h3>');
    // paper doll
    var grid=this.h('div','sl-grid');
    E.DM.cfg_items.slots.forEach(function(s){
      var it=E.Inv.equipped[s.id];
      var cell=self.h('div','sl-cell'+(it? ' b-'+it.rarity:' empty'));
      cell.appendChild(self.img(self.slotIcon(s.id)));
      if(it){
        if(it.reinforce>0){ var rf=self.h('span','rf','+'+it.reinforce); cell.appendChild(rf); }
        if(it.locked){ var lk=self.h('span','lk','🔒'); cell.appendChild(lk); }
        var click=function(){ self.itemModal(it, false); };
        cell.onclick=click;
        cell.title=it.base;
      } else {
        cell.title=s.name;
      }
      grid.appendChild(cell);
    });
    sec.appendChild(grid);
    // botões
    var row=this.h('div','row');
    row.style.marginTop='8px';
    var b1=this.h('button','btn p grow',E.DM.tr('auto_equip'));
    b1.onclick=function(){
      var n=E.Inv.auto_equip();
      E.Audio.play_sfx(n>0?'equip':'fail');
      self.toast(E.DM.tr('auto_equip')+': '+n, '#3a9e8f');
      self._panelDirty=true;
    };
    var sel=this.h('select');
    ['comum','incomum','rara'].forEach(function(r){
      var o=self.h('option','',E.DM.tr('auto_dismantle')+' < '+E.DM.tr('rarity')+': '+r);
      o.value=r;
      if(r==='rara') o.selected=true;
      sel.appendChild(o);
    });
    var b2=this.h('button','btn sm',E.DM.tr('auto_dismantle'));
    b2.onclick=function(){
      var n=E.Inv.auto_dismantle(sel.value);
      E.Audio.play_sfx(n>0?'coin':'fail');
      self.toast('−'+n+' itens', '#e8a33a');
      self._panelDirty=true;
    };
    row.appendChild(b1); row.appendChild(sel); row.appendChild(b2);
    sec.appendChild(row);
    sec.appendChild(this.h('div','tiny',E.DM.tr('inventory')+': '+E.Inv.inventory.length+'/'+E.Inv.INV_CAP));
    body.appendChild(sec);
    // sets
    var st=E.Inv.set_bonuses(), setHtml='';
    E.DM.cfg_items.sets.forEach(function(s){
      var worn=0;
      s.pieces.forEach(function(p){ if(E.Inv.equipped[p]) worn++; });
      var on=worn>=2;
      setHtml+='<div class="stat-line'+(on?'':' muted')+'"><span>'+(on?'✦ ':'✧ ')+s.name+'</span><b class="tiny">'+s.desc+'</b></div>';
    });
    var cset=this.h('div','card','<h3 style="font-size:11px;color:var(--teal)">'+E.DM.tr('details')+' — Sets</h3>'+setHtml);
    body.appendChild(cset);
    // fusão
    var fsec=this.h('div','sec','<h3>'+E.DM.tr('fuse')+' (fragmentos: '+E.U.fmt(E.Eco.get_cur('fragmentos_equip'))+')</h3>');
    var frow=this.h('div','row');
    var fsel=this.h('select');
    ['rara','epica','lendaria','mitica','divina'].forEach(function(r){
      var o=self.h('option','',E.DM.tr('rarity')+': '+r+' ('+E.DM.cfg_items.fusion.fragments_cost[r]+'◈ '+E.U.fmt(E.DM.cfg_items.fusion.gold_cost[r])+'🪙)');
      o.value=r;
      fsel.appendChild(o);
    });
    var fb=this.h('button','btn p',E.DM.tr('fuse'));
    fb.onclick=function(){
      var it=E.Inv.fuse_item(fsel.value);
      if(it.id){ E.Audio.play_sfx('loot_epic'); self.itemModal(it, false); }
      self._panelDirty=true;
    };
    frow.appendChild(fsel); frow.appendChild(fb);
    fsec.appendChild(frow);
    body.appendChild(fsec);
    // inventário
    var isec=this.h('div','sec','<h3>'+E.DM.tr('inventory')+' ('+E.Inv.inventory.length+')</h3>');
    var filt=this.h('div','row');
    var sSel=this.h('select');
    var oAll=this.h('option','',E.DM.tr('slot')+': '+E.DM.tr('all')); oAll.value='all'; sSel.appendChild(oAll);
    E.DM.cfg_items.slots.forEach(function(s){
      var o=self.h('option','',s.name); o.value=s.id; sSel.appendChild(o);
    });
    var rSel=this.h('select');
    var oR=this.h('option','',E.DM.tr('rarity')+': '+E.DM.tr('all')); oR.value='all'; rSel.appendChild(oR);
    E.Inv.ORDER.forEach(function(r){
      var o=self.h('option','',r); o.value=r; rSel.appendChild(o);
    });
    filt.appendChild(sSel); filt.appendChild(rSel);
    isec.appendChild(filt);
    var igrid=this.h('div','inv-grid');
    igrid.style.marginTop='8px';
    var items=E.Inv.filtered(sSel.value, rSel.value);
    items.slice(0,120).forEach(function(it){
      var cell=self.h('div','inv-it b-'+it.rarity);
      cell.appendChild(self.img(self.slotIcon(it.slot)));
      if(it.reinforce>0) cell.appendChild(self.h('span','rf','+'+it.reinforce));
      if(it.locked) cell.appendChild(self.h('span','lk','🔒'));
      if(it.favorite) cell.appendChild(self.h('span','fav','⭐'));
      cell.onclick=function(){ self.itemModal(it, true); };
      igrid.appendChild(cell);
    });
    if(items.length===0) isec.appendChild(this.h('div','tiny','—'));
    isec.appendChild(igrid);
    sSel.onchange=rSel.onchange=function(){ this.render('equip'); }.bind(this);
    body.appendChild(isec);
  },
  /* modal de item (inventário ou equipado) */
  itemModal: function(item, inInventory){
    var self=this;
    var rd=E.Inv.rarity_data(item.rarity);
    var html='<div class="row"><div class="grow">'+
      '<div class="tx-'+item.rarity+'" style="font-size:14px;font-weight:700">'+item.base+(item.reinforce>0?' +'+item.reinforce:'')+'</div>'+
      '<div class="tiny">'+E.DM.tr('rarity')+': '+item.rarity+' · iLvl '+item.ilvl+' · '+E.DM.tr('pc')+': '+E.U.fmt(item.pc)+'</div></div></div><hr style="border-color:var(--line);margin:8px 0">'+
      '<div class="stat-line"><span><b>'+E.DM.cfg_items.primary_stats[item.primary_id].name+'</b></span><b>'+
        (item.primary*(1+0.08*(item.reinforce||0))).toFixed(1)+'</b></div>';
    var sec=item.secondaries||{};
    for(var k in sec){
      var nm=k; var pstats=E.DM.cfg_items.secondary_pool;
      for(var i=0;i<pstats.length;i++) if(pstats[i].id===k) nm=pstats[i].name;
      html+='<div class="stat-line"><span>'+nm+'</span><b>'+sec[k]+'</b></div>';
    }
    var lvl=item.reinforce||0;
    if(lvl<E.DM.cfg_items.reinforce.max){
      var cost=E.Inv.reinforce_cost(item);
      var chance=Math.min(E.DM.cfg_items.reinforce.chances[lvl]+E.Pet.bonus_value('reinforce_luck')/100, 1)*100;
      html+='<hr style="border-color:var(--line);margin:8px 0">'+
        '<div class="tiny">'+E.DM.tr('success_rate')+': <b style="color:var(--gold)">'+chance.toFixed(0)+'%</b> · '+
        E.DM.tr('pity')+': '+E.Inv.reinforce_pity_left()+'</div>';
    } else html+='<hr style="border-color:var(--line);margin:8px 0"><div class="tiny">+20 '+E.DM.tr('max')+'</div>';
    var btns=[];
    if(inInventory){
      btns.push({label:E.DM.tr('equip'), cls:'p', fn:function(){
        E.Inv.equip_item(item.id);
        E.Audio.play_sfx('equip');
      }});
      btns.push({label:E.DM.tr('reinforce')+' ('+E.U.fmt(cost)+'🪙)', cls:'', fn:function(){
        E.Inv.reinforce(item.id);
        return false; // mantém modal aberto para re-render
      }, keep:true});
      btns.push({label:item.favorite?'⭐':'☆', fn:function(){ E.Inv.toggle_favorite(item.id); return false; }, keep:true});
      btns.push({label:item.locked?'🔓':'🔒', fn:function(){ E.Inv.toggle_lock(item.id); return false; }, keep:true});
      var dismLabel={ptbr:'♻ Desmontar', en:'♻ Dismantle'}[E.DM.language]||'♻ Desmontar';
      if(!item.locked && !item.favorite){
        btns.push({label:dismLabel, cls:'d', fn:function(){
          var r=E.Inv.dismantle_item(item.id);
          if(r.fragments) E.Audio.play_sfx('coin');
        }});
      }
    } else {
      btns.push({label:E.DM.tr('unequip'), cls:'d', fn:function(){ E.Inv.unequip_slot(item.slot); E.Audio.play_sfx('equip'); }});
    }
    // re-render do modal após ações keep
    var origButtons=btns.filter(function(b){ return !b.hide; });
    origButtons.forEach(function(b){
      var oldFn=b.fn;
      b.fn=function(){
        var r=oldFn();
        setTimeout(function(){
          if(inInventory && E.Inv.get_item(item.id).id) self.itemModal(E.Inv.get_item(item.id), true);
          else if(!inInventory && E.Inv.equipped[item.slot]) self.itemModal(E.Inv.equipped[item.slot], false);
          else self.closeModal();
          self._panelDirty=true;
        }, 30);
        return r;
      };
    });
    this.modal(item.base, html, origButtons);
  },
  /* ================= PAINEL: HABILIDADES ================= */
  render_skills: function(body){
    var self=this;
    var sections=[['active',E.DM.tr('skills')+' — '+E.DM.tr('current')],['passive',E.DM.tr('stats')+' passivas'],['supreme',E.DM.tr('supreme')]];
    sections.forEach(function(secDef){
      var sec=self.h('div','sec','<h3>'+secDef[1]+'</h3>');
      E.DM.cfg_skills[secDef[0]].forEach(function(s){
        var lv=E.Skill.levels[s.id]||0;
        var unlocked=!!E.Skill.unlocked[s.id];
        var card=self.h('div','card');
        var row=self.h('div','row');
        var im=self.img('ui/'+s.icon); im.style.width='42px'; im.style.height='42px';
        row.appendChild(im);
        var mid=self.h('div','grow');
        var desc=s.desc;
        ['dmg','dur','def','crit','gold','as','ls'].forEach(function(k){
          var v=E.Skill.scaled_value(s.id, k);
          desc=desc.replace('{'+k+'}', v>0? E.U.fmt(v):'{'+k+'}');
        });
        var evoTxt=s.evolve? (' · '+s.evolve.desc_evo.replace('Evolution: ','Evo: ')) : '';
        mid.innerHTML='<div style="font-size:13px"><b>'+s.name+'</b> <span class="stars">'+lv+'/'+s.max_level+'</span>'+
          (E.Skill.evolved[s.id]?' <span style="color:var(--r6)">✦</span>':'')+'</div>'+
          '<div class="tiny">'+desc+(s.cooldown?' · '+E.DM.tr('cooldown')+' '+s.cooldown+'s':'')+evoTxt+'</div>';
        row.appendChild(mid);
        if(unlocked){
          if(lv<s.max_level){
            var cost=E.Skill.upgrade_cost(s.id);
            var btn=self.h('button','btn sm p',E.DM.tr('upgrade')+'<br><span style="font-size:9px">'+E.U.fmt(cost)+'🪙</span>');
            btn.onclick=function(){ if(E.Skill.upgrade_skill(s.id)) E.Audio.play_sfx('equip'); self._panelDirty=true; };
            row.appendChild(btn);
          } else row.appendChild(self.h('span','tiny','MAX'));
          if(secDef[0]!=='passive'){
            var ab=self.h('button','btn sm'+(E.Skill.auto_cast[s.id]?' p':''),'A');
            ab.title=E.DM.tr('skills_auto');
            ab.onclick=function(){ E.Skill.toggle_auto(s.id); self._panelDirty=true; };
            row.appendChild(ab);
          }
        } else {
          row.appendChild(self.h('span','muted','🔒 '+E.DM.tr('level')+' '+s.unlock_level));
        }
        card.appendChild(row);
        sec.appendChild(card);
      });
      body.appendChild(sec);
    });
  },
  /* ================= PAINEL: PETS ================= */
  render_pets: function(body){
    var self=this;
    if(E.Rfx) E.Rfx.resetPetCards(); // cards são recriados a cada render
    [['pets',E.DM.cfg_pets.pets,E.DM.tr('pets')],['companions',E.DM.cfg_pets.companions,'Companheiros']].forEach(function(grp){
      var sec=self.h('div','sec','<h3>'+grp[2]+'</h3>');
      var grid=self.h('div','pet-grid');
      grp[1].forEach(function(p){
        var owned=E.Pet.is_owned(p.id);
        var stars=E.Pet.stars(p.id);
        var act=(E.Pet.active_pet===p.id||E.Pet.active_companion===p.id);
        var card=self.h('div','pet-card'+(act?' act':'')+(owned?'':' muted'));
        var im=self.img('pets/'+p.icon); im.style.opacity=owned?'1':'.35';
        if(E.Rfx) E.Rfx.registerPetCard(im, 'pets/'+p.icon); // idle animado no card
        card.appendChild(im);
        var st='';
        for(var i=1;i<=E.DM.cfg_pets.max_stars;i++) st+= i<=stars? '★':'<span class="off">★</span>';
        var btxt='';
        for(var k in p.bonus) btxt+='+'+p.bonus[k]+'% '+k;
        card.appendChild(self.h('div','', '<div style="font-size:11px;font-weight:700">'+p.name+'</div>'+
          '<div class="tiny tx-'+p.rarity+'">'+p.rarity+'</div>'+
          '<div class="stars">'+st+'</div>'+
          '<div class="tiny">'+btxt+'</div>'+
          (owned? '<div class="tiny">◈ '+ (E.Pet.fragments[p.id]||0) +'</div>':'')));
        if(owned){
          var row=self.h('div','row');
          row.style.justifyContent='center';
          if(!act){
            var b1=self.h('button','btn sm p',E.DM.tr('activate'));
            b1.onclick=function(){ E.Pet.set_active(p.id); E.Audio.play_sfx('equip'); self._panelDirty=true; };
            row.appendChild(b1);
          }
          var needF=E.Pet.evolve_cost_frags(p.id);
          if(needF>0){
            var b2=self.h('button','btn sm',E.DM.tr('evolve')+' '+needF+'◈');
            b2.onclick=function(){ E.Pet.evolve(p.id); self._panelDirty=true; };
            row.appendChild(b2);
          }
          card.appendChild(row);
        }
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      body.appendChild(sec);
    });
  }
};
