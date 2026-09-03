'use strict';
/* =====================================================================
   p07_main.js — GameManager (boot, estados, música contextual), loop
   principal rAF, autosave em visibilitychange e ligação UI↔sistemas
   ===================================================================== */
E.Game = {
  State: {BOOT:0, TITLE:1, PLAYING:2},
  state: 0,
  playtime_s: 0,
  session_kills: 0,
  _lastT: 0,

  boot: function(){
    var self=this;
    E.TimeM.mark_seen();
    E.Save.boot_load();
    E.TimeM.check_time_travel();
    E.Offline.compute_pending();
    E.Ret.check_login_day();
    E.Char.recalc();
    E.Prog._notify_stage();
    this.state=this.State.TITLE;
    document.getElementById('btn-start').textContent=E.DM.tr('tap_to_start');
    document.getElementById('splash-ver').textContent='v'+E.DM.GAME_VERSION+' — HTML · '+E.DM.tr('app_title');
    document.getElementById('btn-start').onclick=function(){
      self.start_game();
    };
    document.getElementById('splash-lang').onchange=function(){
      E.DM.language=this.value;
      document.getElementById('btn-start').textContent=E.DM.tr('tap_to_start');
      E.Save.mark_dirty();
    };
    E.Audio.play_music('menu');
    E.BUS.emit('game_booted');
  },
  start_game: function(){
    if(this.state!==this.State.TITLE) return;
    E.Audio.init(); // precisa de gesto do usuário (política de autoplay)
    E.Audio.play_music('menu');
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    this.state=this.State.PLAYING;
    E.Combat.start_campaign(E.Prog.current_stage);
    E.Audio.play_music('combat');
    E.BUS.toast_msg('☾ '+E.DM.tr('app_title'), '#e8833a');
    // recompensas offline
    if(E.Offline.has_pending()) this._showOffline();
    // login diário
    else if(!E.Ret.login_claimed_today()) this._showLogin();
  },
  _showOffline: function(){
    var p=E.Offline.pending;
    var html='<div style="text-align:center">'+
      '<div style="font-size:34px">☾</div>'+
      '<div style="font-size:13px;margin:6px 0">'+E.DM.tr('offline_desc')+' <b>'+E.U.fmtTime(p.seconds)+'</b> ('+
        E.DM.tr('stage')+' '+p.stage+')</div>'+
      '<div class="stat-line"><span>🪙 '+E.DM.tr('rewards')+'</span><b>'+E.U.fmt(p.gold)+'</b></div>'+
      '<div class="stat-line"><span>✦ XP</span><b>'+E.U.fmt(p.xp)+'</b></div></div>';
    E.UI.modal(E.DM.tr('offline_title'), html, [
      {label:E.DM.tr('collect'), cls:'p', fn:function(){ E.Offline.collect(false); E.Audio.play_sfx('offline'); }},
      {label:E.DM.tr('collect_double'), cls:'d', fn:function(){
        var r=E.Offline.collect(true);
        E.Audio.play_sfx('offline');
        if(r.doubled) E.UI.toast('×2 ✓', '#e8a33a');
        else E.UI.toast(E.DM.tr('watch_ad')+' — stub', '#9aa0a6');
      }}
    ]);
  },
  _showLogin: function(){
    var d=E.Ret.login_day_info();
    if(!d.day) return;
    var rw='';
    for(var k in d.reward) rw+=E.U.fmt(d.reward[k])+' '+k;
    var html='<div style="text-align:center"><div style="font-size:30px">📅</div>'+
      '<div style="font-size:14px;margin:6px 0">'+E.DM.tr('daily_login')+' — D'+d.day+'</div>'+
      '<div style="font-size:13px;color:var(--gold)">'+rw+'</div></div>';
    E.UI.modal(E.DM.tr('daily_login'), html, [
      {label:E.DM.tr('claim'), cls:'p', fn:function(){ E.Ret.claim_login(); E.Audio.play_sfx('coin'); }}
    ]);
  },
  /* Música muda conforme contexto (game_manager.gd) */
  _update_context_music: function(){
    if(this.state!==this.State.PLAYING){ E.Audio.play_music('menu'); return; }
    if(E.Combat.active && E.Combat.enemy && E.Combat.enemy.boss) E.Audio.play_music('boss');
    else if(E.Combat.mode!=='campaign') E.Audio.play_music('dungeon');
    else E.Audio.play_music('combat');
  },
  reset_all: function(){
    E.Save.flush();
    E.Save.wipe();
  },
  loop: function(t){
    var self=E.Game;
    var delta=Math.min((t-self._lastT)/1000 || 0, 0.05);
    self._lastT=t;
    if(self.state===self.State.PLAYING){
      self.playtime_s+=delta;
      E.Combat.process(delta);
      E.Modes.process(delta);
      self._update_context_music();
    }
    E.Save.process(delta);
    E.Rfx.render(delta);
    requestAnimationFrame(self.loop);
  }
};

/* ---------- BOOT ---------- */
(function(){
  function start(){
    E.DM.load(E.DATA);
    E.DM.language='ptbr';
    E.Char.init();
    E.Skill.init();
    E.Eco.reset_to_starting();
    E.Prog.init();
    E.Modes.init();
    E.Ret.init();
    E.Rfx.init();
    E.UI.init();
    E.UI2.init();
    E.Game.boot();
    requestAnimationFrame(E.Game.loop);
  }
  // salva ao pausar/fechar (paridade NOTIFICATION_APPLICATION_PAUSED)
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState==='hidden'){ E.Save.flush(); E.Audio.stop_music(); }
    else if(E.Game.state===E.Game.State.PLAYING){
      E.TimeM.mark_seen();
      E.TimeM.check_time_travel();
      E.Offline.compute_pending();
      if(E.Offline.has_pending()) E.Game._showOffline();
      E.BUS.toast_msg('Bem-vindo de volta, Marcado.', '#3a9e8f');
    }
  });
  globalThis.addEventListener('pagehide', function(){ E.Save.flush(); });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
