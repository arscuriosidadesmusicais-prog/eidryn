'use strict';
/* =====================================================================
   p05_render.js — RENDER ENGINE v4 "Tempestade Viva" (só apresentação)
   - Parallax de 4 camadas por região (céu/longe/médio/perto, PNGs autorais)
   - Crossfade entre regiões + partículas atmosféricas por bioma
   - HERÓI ANIMADO: FSM com 7 posturas (idle/ataque/crítico/cast/dano/
     vitória/derrota) × 23 frames — dirigida SÓ por eventos do BUS
   - BIOMAS SAZONAIS: grade de cor por camada (cache), partículas sazonais
     (pétalas/motas/folhas/neve), wash de humor, solo/acento deslocados;
     estação detectada pela data real (hemisfério sul) com override em Ajustes
   - CLIMA DINÂMICO: limpo/nublado/chuva/tempestade/neve — muda sozinho por
     região+tempo (determinístico), com vento, relâmpagos ramificados, splash
     no solo e variantes temáticas por bioma (cinzas/sangue/ácido/nevasca);
     override manual em Ajustes (pref em chave própria — save intacto)
   - PETS CENICOS: pet + companheiro ativos acompanhando o herói com FSM de
     posturas (idle/cheer/sad) reagindo aos mesmos eventos do BUS
   - Partículas: faíscas, sangue, poeira, motas de ouro (pools fixos)
   - Dano flutuante em arco com pop-in (fonte Cinzel, cor por tipo)
   - Screenshake por trauma (com micro-rotação), barras ornamentadas
   Nenhuma lógica de gameplay aqui — apenas consumo de eventos do BUS.
   ===================================================================== */
E.Rfx = {
  W: 540, H: 960, GROUND_Y: 760, BG_W: 540,
  cv: null, ctx: null, time: 0, fontReady: false,
  regionId: '', regionCache: {}, layers: [], oldLayers: null, oldAlpha: 0,
  pal: null, palSeason: null, regionTitleT: 0,
  heroImg: null, heroAtkImg: null, heroFrames: {}, heroWhiteCache: {},
  heroAnim: { pose: 'idle', f: 0, t: 0 },
  enemyImg: null, enemyWhite: null, enemySpriteKey: '',
  hasEnemy: false, enemyBoss: false, enemyMini: false, enemyBerserk: false,
  heroHpShown: 1, enemyHpShown: 1, heroGhost: 1, enemyGhost: 1,
  heroHpLabel: '', enemyHpLabel: '',
  heroLunge: 0, enemyLunge: 0, enemyFade: 0, enemySpawn: 1,
  heroFlash: 0, enemyFlash: 0,
  floats: [], floatIdx: 0, FLOAT_POOL: 28,
  parts: [], partIdx: 0, PART_POOL: 150,
  rings: [], ringIdx: 0, RING_POOL: 8,
  atmo: [], seasonAtmo: [], shake: 0,
  /* ---------- CLIMA DINÂMICO (apenas render) ---------- */
  weather: 'limpo', weatherPrev: 'limpo', weatherPref: 'auto', weatherBlend: 1,
  weatherT: 0, weatherNext: 40, wind: 0,
  rain: [], rainIdx: 0, RAIN_POOL: 150, rainOn: 0,
  splashes: [], splashIdx: 0, SPLASH_POOL: 22,
  boltT: 0, boltNext: 5, boltPts: null, flashA: 0,
  WEATHERS: {
    limpo:      { chip: '\ud83c\udf24\ufe0f', dim: 0,    wind: 0.12, wash: null },
    nublado:    { chip: '\u2601\ufe0f',      dim: 0.10, wind: 0.30, wash: 'rgba(64,68,84,0.10)' },
    chuva:      { chip: '\ud83c\udf27\ufe0f', dim: 0.15, wind: 0.55, wash: 'rgba(38,56,92,0.11)',
      rain: { n: 92, sp: [430, 600], len: [7, 11], al: 0.50 } },
    tempestade: { chip: '\u26a1',           dim: 0.21, wind: 1.0,  wash: 'rgba(16,24,50,0.15)',
      rain: { n: 132, sp: [560, 790], len: [9, 14], al: 0.62 }, bolt: true },
    neve:       { chip: '\ud83c\udf28\ufe0f', dim: 0.07, wind: 0.40, wash: 'rgba(178,198,235,0.08)',
      snow: { n: 72 } }
  },
  // pesos automáticos por região (abismo não tem clima — vazio não chove)
  REGION_WEATHER: {
    bosque_vidro:   { limpo: .30, nublado: .25, chuva: .30, tempestade: .15 },
    pantano:        { limpo: .08, nublado: .30, chuva: .42, tempestade: .20 },
    cidadela:       { limpo: .45, nublado: .35, chuva: .15, tempestade: .05 },
    deserto_cinzas: { limpo: .52, nublado: .26, chuva: .18, tempestade: .04 },
    picos:          { limpo: .24, nublado: .24, chuva: .06, tempestade: .10, neve: .36 },
    coracao:        { limpo: .14, nublado: .24, chuva: .32, tempestade: .30 },
    abismo:         { limpo: .55, nublado: .45 }
  },
  // variante temática da precipitação por região (só paleta/forma)
  RAIN_STYLE: {
    default:        { mode: 'line', cols: ['170,195,235', '150,178,220'] },
    pantano:        { mode: 'line', cols: ['168,208,120', '140,190,100'] },
    coracao:        { mode: 'line', cols: ['230,90,110', '205,70,95'] },
    deserto_cinzas: { mode: 'ash',  cols: ['150,142,150', '120,112,122'] },
    abismo:         { mode: 'ash',  cols: ['90,80,120', '70,62,100'] },
    picos:          { mode: 'dot',  cols: ['226,238,252', '206,226,248'] }
  },
  /* ---------- PETS CENICOS (só render; bônus já aplicados em Char) ---------- */
  PET_POSES: {
    idle:  { fps: 6,   loop: true },
    cheer: { fps: 6,   loop: true },
    sad:   { fps: 3.2, loop: true }
  },
  petFrames: {}, petAnim: { pose: 'idle', f: 0, t: 0 },
  petKey: '', compKey: '', petCards: [], _cardT: 0, cheerUntil: 0,
  /* ---------- BIOMAS SAZONAIS (apenas render; detecta pela data real) ---------- */
  PREF_KEY: 'eidryn_fx_prefs_v1',
  seasonPref: 'auto', season: 'primavera', _chipT: 0,
  SEASONS: {
    primavera: { chip: '\ud83c\udf38', tint: [150, 235, 170], amt: 0.16, sat: 1.16, bright: 1.07,
      wash: 'rgba(150,235,170,0.06)', mode: 'fall', n: 22, sp: [16, 32], sz: [2.2, 3.2],
      cols: ['#f2b8cf', '#f8dce8', '#e0c2e8', '#d8f0c0'], flutter: true, sway: 1.5, swayA: 24, alpha: 0.78 },
    verao:     { chip: '\u2600\ufe0f', tint: [255, 190, 100], amt: 0.18, sat: 1.10, bright: 1.10,
      wash: 'rgba(255,190,100,0.065)', mode: 'rise', n: 18, sp: [10, 24], sz: [1.8, 3],
      cols: ['#ffd27a', '#ffb860', '#fff0c0'], flutter: false, sway: 1.1, swayA: 14, alpha: 0.62 },
    outono:    { chip: '\ud83c\udf42', tint: [230, 122, 52], amt: 0.23, sat: 0.96, bright: 0.99,
      wash: 'rgba(230,122,52,0.07)', mode: 'fall', n: 26, sp: [24, 46], sz: [2.4, 3.6],
      cols: ['#d08030', '#b05a28', '#e0a040', '#8a4a20'], flutter: true, sway: 1.2, swayA: 30, alpha: 0.82 },
    inverno:   { chip: '\u2744\ufe0f', tint: [168, 208, 255], amt: 0.25, sat: 0.78, bright: 1.05,
      wash: 'rgba(168,208,255,0.075)', mode: 'fall', n: 30, sp: [20, 40], sz: [2, 3.4],
      cols: ['#e8f2fc', '#d0e4f8', '#ffffff'], flutter: false, sway: 0.8, swayA: 14, alpha: 0.8 }
  },
  /* ---------- FSM DO HERÓI (prioridade: down > victory > crit > cast/hurt > atk > idle) ---------- */
  POSES: {
    idle:    { fps: 5.5, loop: true,  prio: 0 },
    atk:     { fps: 14,  loop: false, prio: 1, next: 'idle' },
    hurt:    { fps: 8,   loop: false, prio: 2, next: 'idle' },
    cast:    { fps: 9,   loop: false, prio: 2, next: 'idle' },
    crit:    { fps: 12,  loop: false, prio: 3, next: 'idle' },
    victory: { fps: 5,   loop: false, prio: 4, next: 'idle', hold: true },
    down:    { fps: 3.5, loop: false, prio: 5, next: 'down', hold: true }
  },

  init: function(){
    this.cv = document.getElementById('cv');
    this.ctx = this.cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    var self = this;
    // texturas de UI → variáveis CSS (painéis pedra/metal/pergaminho + moldura 9-slice)
    var rootStyle = document.documentElement.style;
    var texMap = { '--tex-stone': 'ui/tex_stone', '--tex-metal': 'ui/tex_metal',
      '--tex-parch': 'ui/tex_parch', '--tex-frame': 'ui/tex_frame' };
    for (var tv in texMap) {
      if (E.IMG[texMap[tv]]) rootStyle.setProperty(tv, 'url("' + E.IMG[texMap[tv]] + '")');
    }
    // fonte Cinzel para o canvas (dano flutuante / títulos)
    if (document.fonts && document.fonts.load) {
      document.fonts.load('900 24px Cinzel').then(function(){ self.fontReady = true; })
        .catch(function(){ self.fontReady = false; });
    }
    this.heroImg = this._img(E.IMG['hero/hero']);
    this.heroAtkImg = this._img(E.IMG['hero/hero_attack']) || this.heroImg;
    // ---- frames do herói (7 posturas × N frames; fallback p/ 2 posturas antigas) ----
    var frameSets = { idle: 'hero_idle', atk: 'hero_atk', crit: 'hero_crit',
      cast: 'hero_cast', hurt: 'hero_hurt', victory: 'hero_victory', down: 'hero_down' };
    for (var fs in frameSets) {
      var arr = [];
      for (var fi = 0; fi < 8; fi++) {
        var uri = E.IMG['hero/' + frameSets[fs] + '_' + fi];
        if (!uri) break;
        arr.push(this._img(uri));
      }
      if (arr.length) this.heroFrames[fs] = arr;
    }
    if (!this.heroFrames.idle) this.heroFrames.idle = [this.heroImg];
    if (!this.heroFrames.atk) this.heroFrames.atk = [this.heroAtkImg];
    // prefs visuais (chave PRÓPRIA — save do jogo permanece intacto)
    this.loadPrefs();
    this.season = this.seasonKey();
    this.weather = this.weatherKey();
    // frames dos pets cênicos (idle/cheer/sad por espécie; fallback: base estática)
    this.loadPetFrames();
    // flash de impacto: versões brancas geradas/cachedas por frame em _whiteFor()
    for (var i = 0; i < this.FLOAT_POOL; i++)
      this.floats.push({ on:false, x:0, y:0, vx:0, vy:0, text:'', color:'#fff', size:20, t:0, crit:false });
    for (var j = 0; j < this.PART_POOL; j++)
      this.parts.push({ on:false, type:0, x:0, y:0, vx:0, vy:0, t:0, life:1, size:2, color:'#fff', grav:0 });
    for (var k = 0; k < this.RING_POOL; k++)
      this.rings.push({ on:false, x:0, y:0, t:0, life:1, r0:10, r1:80, color:'#fff', width:3 });
    // pools de clima (precipitação + splash no solo)
    for (var r2 = 0; r2 < this.RAIN_POOL; r2++)
      this.rain.push({ on:false, x:0, y:0, sp:0, ph:0, front:false, gy:0, c:0 });
    for (var s2 = 0; s2 < this.SPLASH_POOL; s2++)
      this.splashes.push({ on:false, x:0, y:0, t:0, life:1 });
    // ---------- EVENTOS ----------
    E.BUS.on('enemy_spawned', function(e){
      var key = e.sprite || 'enemy_bosque_vidro_0';
      self.enemySpriteKey = key;
      self.enemyImg = self._img(E.IMG['enemies/' + key]) || self._img(E.IMG['enemies/enemy_generic']);
      self.enemyWhite = null;
      self.hasEnemy = true; self.enemyFade = 0; self.enemySpawn = 0;
      self.enemyBoss = !!e.boss; self.enemyMini = !!e.miniboss;
      self.enemyBerserk = false;
      self.enemyHpShown = 0; self.heroHpShown = 0;
      self._heroPose('idle', true); // nova luta → herói volta à guarda
      self._petPose('idle'); self.cheerUntil = 0; // pets também
      var el = document.getElementById('enemy-name');
      var em = document.getElementById('enemy-mods');
      if (el) el.textContent = e.name || '';
      if (em) {
        var tags = '', mods = e.modifiers || [];
        for (var i = 0; i < mods.length; i++) tags += '[' + mods[i] + '] ';
        em.textContent = tags;
      }
      if (self.enemyBoss) { self._ring(385, 640, 30, 190, 'rgba(232,163,58,0.8)', 4, 0.9); self.addShake(0.35); }
    });
    E.BUS.on('enemy_hp_changed', function(hp, max_hp){
      self.enemyHpShown = E.U.clamp(hp / Math.max(max_hp, 1), 0, 1);
      self.enemyHpLabel = E.U.fmt(Math.max(hp, 0)) + ' / ' + E.U.fmt(max_hp);
    });
    E.BUS.on('hero_hp_changed', function(hp, max_hp){
      self.heroHpShown = E.U.clamp(hp / Math.max(max_hp, 1), 0, 1);
      self.heroHpLabel = E.U.fmt(Math.max(hp, 0)) + ' / ' + E.U.fmt(max_hp);
    });
    E.BUS.on('floating_damage', function(amount, crit, side, color){
      self._float(amount, crit, side, color);
    });
    E.BUS.on('screenshake', function(i){ self.addShake(i); });
    E.BUS.on('enemy_damaged', function(dmg, crit){
      self.heroLunge = 1; self.enemyFlash = crit ? 0.9 : 0.55;
      self._heroPose(crit ? 'crit' : 'atk');
      self._sparks(385, 620, crit ? 14 : 7);
      self._blood(385, 640, crit ? 9 : 4);
      if (crit) { self._ring(385, 640, 6, 84, 'rgba(255,190,90,0.9)', 4, 0.5); self.addShake(0.22); }
    });
    E.BUS.on('hero_damaged', function(){
      self.enemyLunge = 1; self.heroFlash = 0.6;
      self._heroPose('hurt');
      self._blood(155, 640, 6, '#d0455f');
    });
    E.BUS.on('skill_casted', function(){ self._heroPose('cast'); });
    E.BUS.on('combat_ended', function(result){
      self._heroPose(result === 'win' ? 'victory' : 'down');
      self._petPose(result === 'win' ? 'cheer' : 'sad');
      if (result === 'win') self.cheerUntil = self.time + 3.4;
    });
    E.BUS.on('enemy_killed', function(enemy){
      self.enemyFade = 0.0001;
      var boss = !!(enemy && enemy.boss);
      self._dust(385, 700, boss ? 22 : 12);
      self._motes(385, 600, boss ? 14 : 6);
      if (boss) { self._explosion(385, 620); self.addShake(1.0); }
      else self.addShake(0.18);
    });
    E.BUS.on('level_up', function(){
      self._heroPose('victory');
      self._ring(165, 640, 10, 150, 'rgba(120,240,180,0.9)', 5, 0.9);
      self._motes(165, 620, 12, '#8af0b0');
      self._petPose('cheer'); self.cheerUntil = self.time + 2.6;
    });
    E.BUS.on('pet_changed', function(){ self.setPetVisuals(); });
    E.BUS.on('region_changed', function(rid){ self.setRegion(rid); });
    this.setRegion('bosque_vidro');
    this._applySeason();
    this._applyWeather(true);
    this.setPetVisuals();
  },
  _img: function(dataUri){
    if (!dataUri) return null;
    var im = new Image();
    im.src = dataUri;
    return im;
  },
  _makeWhite: function(img){
    if (!img || !img.complete || !img.naturalWidth) return null;
    var c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    var cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, c.width, c.height);
    return c;
  },
  _hashStr: function(s){
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  },
  /* ================= FSM DO HERÓI ================= */
  _heroPose: function(p, force){
    var def = this.POSES[p], frames = this.heroFrames[p];
    if (!def || !frames || !frames.length) return;
    var curP = this.heroAnim.pose, cur = this.POSES[curP];
    if (!force && cur && def.prio < cur.prio) {
      var curFr = this.heroFrames[curP] || [];
      var curDone = cur.loop ? false : (this.heroAnim.t * cur.fps >= curFr.length);
      if (!curDone) return; // não interrompe postura mais prioritária
    }
    if (!force && p === curP && this.heroAnim.t < 0.05) return;
    this.heroAnim.pose = p; this.heroAnim.f = 0; this.heroAnim.t = 0;
  },
  _heroTick: function(delta){
    var a = this.heroAnim, def = this.POSES[a.pose], fr = this.heroFrames[a.pose];
    if (!def || !fr || !fr.length) { a.pose = 'idle'; a.f = 0; a.t = 0; return; }
    a.t += delta;
    var idx = Math.floor(a.t * def.fps);
    if (def.loop) { a.f = idx % fr.length; }
    else if (idx >= fr.length) {
      if (def.hold) { a.f = fr.length - 1; } // segura até evento (spawn/respawn)
      else {
        var nx = def.next && this.heroFrames[def.next] ? def.next : 'idle';
        a.pose = nx; a.t = 0; a.f = 0;
      }
    } else a.f = idx;
  },
  _whiteFor: function(img, key){
    var w = this.heroWhiteCache[key];
    if (w) return w;
    if (!img || !img.complete || !img.naturalWidth) return null;
    w = this._makeWhite(img);
    if (w) this.heroWhiteCache[key] = w;
    return w;
  },
  /* ================= ESTAÇÕES (só render) ================= */
  loadPrefs: function(){
    try {
      var raw = globalThis.localStorage.getItem(this.PREF_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.season && (p.season === 'auto' || this.SEASONS[p.season])) this.seasonPref = p.season;
        if (p && p.weather && (p.weather === 'auto' || this.WEATHERS[p.weather])) this.weatherPref = p.weather;
      }
    } catch (e) {}
  },
  savePrefs: function(){
    try { globalThis.localStorage.setItem(this.PREF_KEY, JSON.stringify({ season: this.seasonPref, weather: this.weatherPref })); } catch (e) {}
  },
  seasonNow: function(){
    // hemisfério sul (PT-BR): verão 21/12–20/3 · outono 21/3–20/6 · inverno 21/6–20/9 · primavera 21/9–20/12
    var d = new Date(), md = (d.getMonth() + 1) * 100 + d.getDate();
    if (md >= 1221 || md < 321) return 'verao';
    if (md >= 921) return 'primavera';
    if (md >= 621) return 'inverno';
    return 'outono';
  },
  seasonKey: function(){
    if (this.seasonPref !== 'auto') return this.SEASONS[this.seasonPref] ? this.seasonPref : this.seasonNow();
    return this.seasonNow();
  },
  setSeasonPref: function(v){
    this.seasonPref = (v === 'auto' || this.SEASONS[v]) ? v : 'auto';
    this.savePrefs();
    this._applySeason();
  },
  _applySeason: function(){
    var sk = this.seasonKey();
    var changed = sk !== this.season;
    this.season = sk;
    if (changed) {
      for (var rid in this.regionCache) {
        var ls = this.regionCache[rid];
        for (var i = 0; i < ls.length; i++) ls[i].tinted = {};
      }
      this.palSeason = this.pal ? this._seasonPal(this.pal, this.SEASONS[sk]) : null;
      this._seedSeasonAtmo();
    }
    this._updateChip();
  },
  _seasonLocKey: function(s){
    return s === 'primavera' ? 'season_spring' : s === 'verao' ? 'season_summer' :
      s === 'outono' ? 'season_autumn' : 'season_winter';
  },
  _updateChip: function(){
    var el = document.getElementById('season-chip');
    if (!el) return;
    var S = this.SEASONS[this.season];
    var name = (E.DM && E.DM.tr) ? E.DM.tr(this._seasonLocKey(this.season)) : this.season;
    var ico = el.querySelector('.ico'), nm = el.querySelector('.nm');
    if (ico) ico.textContent = S ? S.chip : '';
    if (nm) nm.textContent = name;
  },
  _seasonPal: function(pal, S){
    if (!S) return pal;
    return { sky_top: pal.sky_top, sky_bot: pal.sky_bot, far: pal.far, mid: pal.mid, near: pal.near,
      ground: this._shiftHex(pal.ground, S, 1.05, 1.03), accent: this._shiftHex(pal.accent, S, 0.5, 1.08) };
  },
  _shiftHex: function(hex, S, k, br){
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    var lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
    var t = S.tint, w = S.amt * k;
    r = (r * br) * (1 - w * 0.7) + t[0] * w * 0.7 * (0.35 + lum * 0.65);
    g = (g * br) * (1 - w * 0.7) + t[1] * w * 0.7 * (0.35 + lum * 0.65);
    b = (b * br) * (1 - w * 0.7) + t[2] * w * 0.7 * (0.35 + lum * 0.65);
    return 'rgb(' + (r > 255 ? 255 : r | 0) + ',' + (g > 255 ? 255 : g | 0) + ',' + (b > 255 ? 255 : b | 0) + ')';
  },
  _tintImg: function(img, S){
    if (!img || !img.complete || !img.naturalWidth || !S) return null;
    var c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    var cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    try {
      var id = cx.getImageData(0, 0, c.width, c.height), px = id.data;
      var t = S.tint, sat = S.sat, br = S.bright, amt = S.amt;
      for (var i = 0; i < px.length; i += 4) {
        if (!px[i + 3]) continue;
        var r = px[i], g = px[i + 1], b = px[i + 2];
        var lum = r * 0.3 + g * 0.59 + b * 0.11;
        r = lum + (r - lum) * sat; g = lum + (g - lum) * sat; b = lum + (b - lum) * sat;
        r *= br; g *= br; b *= br;
        var w = amt * (0.3 + lum / 255 * 0.7);
        r = r * (1 - w) + t[0] * w * 1.06;
        g = g * (1 - w) + t[1] * w * 1.06;
        b = b * (1 - w) + t[2] * w * 1.06;
        px[i] = r > 255 ? 255 : r | 0; px[i + 1] = g > 255 ? 255 : g | 0; px[i + 2] = b > 255 ? 255 : b | 0;
      }
      cx.putImageData(id, 0, 0);
    } catch (e) { return c; }
    return c;
  },
  _seedSeasonAtmo: function(){
    this.seasonAtmo.length = 0;
    var S = this.SEASONS[this.season];
    if (!S) return;
    for (var i = 0; i < S.n; i++) {
      this.seasonAtmo.push({
        x: Math.random() * this.W, y: Math.random() * this.GROUND_Y,
        ph: Math.random() * 6.28, sp: S.sp[0] + Math.random() * (S.sp[1] - S.sp[0]),
        sz: S.sz[0] + Math.random() * (S.sz[1] - S.sz[0]),
        col: S.cols[(Math.random() * S.cols.length) | 0],
        front: i >= S.n * 0.62
      });
    }
  },
  _drawSeasonAtmo: function(delta, front){
    var S = this.SEASONS[this.season];
    if (!S || !this.seasonAtmo.length) return;
    var ctx = this.ctx, t = this.time;
    for (var i = 0; i < this.seasonAtmo.length; i++) {
      var p = this.seasonAtmo[i];
      if (!!p.front !== front) continue;
      if (S.mode === 'rise') { // verão: motas douradas sobem
        p.y -= p.sp * delta * 0.7;
        p.x += (Math.sin(t * 1.1 + p.ph) * 12 + this.wind * 30) * delta;
        if (p.y < -6) { p.y = this.GROUND_Y + Math.random() * 40; p.x = Math.random() * this.W; }
        ctx.globalAlpha = (0.22 + 0.34 * (0.5 + 0.5 * Math.sin(t * 2.4 + p.ph))) * (front ? 1.3 : 1);
      } else {                 // queda: pétalas / folhas / neve
        p.y += p.sp * delta;
        p.x += (Math.sin(t * S.sway + p.ph) * S.swayA * (1 + this.wind * 1.1) + this.wind * 36) * delta;
        if (p.y > this.GROUND_Y + 8) { p.y = -8; p.x = Math.random() * this.W; }
        ctx.globalAlpha = S.alpha * (front ? 1.25 : 1);
      }
      ctx.fillStyle = p.col;
      if (S.flutter && (Math.floor(t * 3 + p.ph * 3) % 2 === 0))
        ctx.fillRect(p.x, p.y, p.sz, p.sz * 0.55);
      else
        ctx.fillRect(p.x, p.y, p.sz * 0.55, p.sz);
    }
    ctx.globalAlpha = 1;
  },
  /* ================= CLIMA DINÂMICO (só render) ================= */
  weatherNow: function(){
    // escolha determinística por região + janela de 2,5min → o mundo respira sozinho
    var slot = Math.floor(Date.now() / 150000);
    var h = this._hashStr(this.regionId + ':wx:' + slot);
    var W = this.REGION_WEATHER[this.regionId] || this.REGION_WEATHER.bosque_vidro;
    var total = 0, k;
    for (k in W) total += W[k];
    var r = (h % 10000) / 10000 * total, acc = 0;
    var wk = 'limpo';
    for (k in W) { acc += W[k]; if (r < acc) { wk = k; break; } }
    // coerência sazonal: no inverno, chuva vira neve (tempestade permanece — gelo)
    if (wk === 'chuva' && this.seasonKey() === 'inverno') wk = 'neve';
    return wk;
  },
  weatherKey: function(){
    if (this.weatherPref !== 'auto') return this.WEATHERS[this.weatherPref] ? this.weatherPref : this.weatherNow();
    return this.weatherNow();
  },
  setWeatherPref: function(v){
    this.weatherPref = (v === 'auto' || this.WEATHERS[v]) ? v : 'auto';
    this.savePrefs();
    this._applyWeather(true);
  },
  _weatherLocKey: function(w){
    return w === 'limpo' ? 'w_clear' : w === 'nublado' ? 'w_cloudy' :
      w === 'chuva' ? 'w_rain' : w === 'tempestade' ? 'w_storm' : 'w_snow';
  },
  _applyWeather: function(force){
    var wk = this.weatherKey();
    if (force || wk !== this.weather) {
      if (wk !== this.weather || force) {
        this.weatherPrev = force ? wk : this.weather;
        this.weather = wk;
        this.weatherBlend = force ? 1 : 0;
        this.rainOn = 0; // repovoamento gradual do pool
        this.boltNext = 2 + Math.random() * 4;
      }
    }
    this._updateWeatherChip();
  },
  _weatherTick: function(delta){
    this.weatherT += delta;
    if (this.weatherPref === 'auto' && this.weatherT >= 40) {
      this.weatherT = 0;
      var wk = this.weatherNow();
      if (wk !== this.weather) this._applyWeather(false);
    }
    this.weatherBlend = Math.min(1, this.weatherBlend + delta * 0.8);
    var W = this.WEATHERS[this.weather] || this.WEATHERS.limpo;
    // vento com rajadas (afeta chuva, neve e partículas sazonais)
    var gust = this.weather === 'tempestade' ? Math.sin(this.time * 2.3) * 0.25 : Math.sin(this.time * 0.6) * 0.1;
    this.wind = W.wind * (0.75 + 0.25 * Math.sin(this.time * 0.6)) + Math.max(0, gust);
    // relâmpagos
    if (W.bolt) {
      this.boltNext -= delta;
      if (this.boltNext <= 0) {
        this.boltNext = 2.6 + Math.random() * 5.4;
        var near = Math.random() < 0.45;
        if (near) {
          this.boltPts = this._boltPath();
          this.boltT = 0.26;
          this.flashA = 0.55;
          this.addShake(0.34);
        } else {
          this.boltPts = null;
          this.flashA = 0.20;
          this.addShake(0.08);
        }
      }
    }
    if (this.boltT > 0) this.boltT -= delta;
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - delta * 2.6);
    this._rainTick(delta);
  },
  _rainStyle: function(){
    return this.RAIN_STYLE[this.regionId] || this.RAIN_STYLE.default;
  },
  _rainTick: function(delta){
    var W = this.WEATHERS[this.weather] || this.WEATHERS.limpo;
    var def = W.rain || W.snow;
    var target = def ? Math.round(def.n * (0.35 + 0.65 * this.weatherBlend)) : 0;
    // repovoamento/esvaziamento gradual (sem pop)
    if (this.rainOn < target) this.rainOn = Math.min(target, this.rainOn + 5);
    else if (this.rainOn > target) this.rainOn = Math.max(target, this.rainOn - 8);
    var isSnow = !!W.snow, isAsh = this._rainStyle().mode === 'ash';
    var alive = 0;
    for (var i = 0; i < this.rain.length; i++) {
      var p = this.rain[i];
      if (!p.on) {
        if (alive < this.rainOn) { this._resetDrop(p, true); alive++; }
        continue;
      }
      var wrapped = false;
      if (isSnow || isAsh) {
        // neve / cinzas: deriva suave com vento
        p.y += p.sp * delta * (isAsh ? 0.35 : 0.45);
        p.x += (Math.sin(this.time * 1.2 + p.ph) * 16 + this.wind * 46) * delta;
        if (p.y > this.GROUND_Y + 6) wrapped = true;
        if (p.x > this.W + 8) { p.x = -8; }
      } else {
        p.y += p.sp * delta;
        p.x += this.wind * 175 * delta;
        if (p.y > this.GROUND_Y - 4 + p.gy) {
          if (p.front && Math.random() < 0.34) this._splash(p.x, this.GROUND_Y + 2 + p.gy);
          wrapped = true;
        }
        if (p.x > this.W + 12) p.x = -10;
      }
      if (wrapped) {
        alive++;
        if (alive > this.rainOn) { p.on = false; continue; }
        this._resetDrop(p, true);
      } else alive++;
    }
    // splashes do solo
    for (var s = 0; s < this.splashes.length; s++) {
      var sp = this.splashes[s];
      if (!sp.on) continue;
      sp.t += delta;
      if (sp.t >= sp.life) { sp.on = false; continue; }
    }
  },
  _resetDrop: function(p, keepOn){
    var W = this.WEATHERS[this.weather] || this.WEATHERS.limpo;
    var def = W.rain || W.snow || {};
    var sp = def.sp || [430, 600];
    p.on = keepOn !== false;
    p.x = Math.random() * (this.W + 90) - 45;
    p.y = -12 - Math.random() * 60;
    p.sp = sp[0] + Math.random() * (sp[1] - sp[0]);
    p.ph = Math.random() * 6.28;
    p.front = Math.random() < 0.32;
    p.gy = Math.random() * 26;
    p.c = Math.random();
  },
  _splash: function(x, y){
    var sp = this.splashes[this.splashIdx];
    this.splashIdx = (this.splashIdx + 1) % this.SPLASH_POOL;
    sp.on = true; sp.x = x; sp.y = y; sp.t = 0; sp.life = 0.22 + Math.random() * 0.12;
  },
  _boltPath: function(){
    // relâmpago ramificado do céu até o horizonte
    var x = 60 + Math.random() * (this.W - 160), y = 0;
    var pts = [[x, y]];
    var endY = 250 + Math.random() * 160;
    while (y < endY) {
      y += 24 + Math.random() * 34;
      x += (Math.random() * 2 - 1) * 34;
      pts.push([x, y]);
    }
    return pts;
  },
  _drawWeatherBack: function(delta){
    // camada de trás: precipitação ao fundo + escurecimento do céu
    var ctx = this.ctx, W = this.WEATHERS[this.weather] || this.WEATHERS.limpo;
    var prevW = this.WEATHERS[this.weatherPrev] || this.WEATHERS.limpo;
    var b = this.weatherBlend;
    if (W.dim > 0 || (b < 1 && prevW.dim > 0)) {
      var dim = W.dim * b + prevW.dim * (1 - b);
      if (dim > 0.004) {
        ctx.fillStyle = 'rgba(10,14,30,' + Math.min(0.5, dim) + ')';
        ctx.fillRect(0, 0, this.W, this.H);
      }
    }
    var def = W.rain || W.snow;
    if (!def || this.rainOn < 1) return;
    var st = this._rainStyle();
    var isSnow = !!W.snow, isAsh = st.mode === 'ash';
    ctx.save();
    for (var i = 0; i < this.rain.length; i++) {
      var p = this.rain[i];
      if (!p.on || p.front) continue;
      var col = st.cols[(p.c * st.cols.length) | 0];
      var al = (W.rain ? W.rain.al * 0.62 : 0.5) * b;
      if (isSnow || isAsh) {
        ctx.fillStyle = 'rgba(' + col + ',' + (al * 0.8).toFixed(3) + ')';
        var sz = isAsh ? 2 : 1.6 + (p.ph % 1);
        ctx.fillRect(p.x, p.y, sz, sz);
      } else {
        ctx.strokeStyle = 'rgba(' + col + ',' + al.toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - this.wind * 4.4, p.y - 7 - p.c * 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  },
  _drawWeatherFront: function(delta){
    // camada da frente: precipitação grossa + splashes + relâmpago + flash
    var ctx = this.ctx, W = this.WEATHERS[this.weather] || this.WEATHERS.limpo;
    var def = W.rain || W.snow;
    var b = this.weatherBlend;
    if (def && this.rainOn > 0) {
      var st = this._rainStyle();
      var isSnow = !!W.snow, isAsh = st.mode === 'ash';
      for (var i = 0; i < this.rain.length; i++) {
        var p = this.rain[i];
        if (!p.on || !p.front) continue;
        var col = st.cols[(p.c * st.cols.length) | 0];
        if (isSnow || isAsh) {
          ctx.fillStyle = 'rgba(' + col + ',' + (0.75 * b).toFixed(3) + ')';
          ctx.fillRect(p.x, p.y, isAsh ? 2.4 : 2.2, isAsh ? 2.4 : 2.2);
        } else {
          ctx.strokeStyle = 'rgba(' + col + ',' + ((W.rain ? W.rain.al : 0.5) * b).toFixed(3) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - this.wind * 5.4, p.y - (W.rain ? W.rain.len[1] : 10));
          ctx.stroke();
        }
      }
      // splashes no solo (só chuva)
      if (W.rain && !isAsh) {
        ctx.strokeStyle = 'rgba(190,210,240,' + (0.4 * b).toFixed(3) + ')';
        ctx.lineWidth = 1;
        for (var s = 0; s < this.splashes.length; s++) {
          var sp = this.splashes[s];
          if (!sp.on) continue;
          var pr = sp.t / sp.life;
          ctx.globalAlpha = (1 - pr) * 0.7;
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y, 1.5 + pr * 7, (1.5 + pr * 7) * 0.32, 0, 0, 6.2832);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    // relâmpago (ramificado, com brilho duplo) + flash de tela
    if (this.boltT > 0 && this.boltPts) {
      var bt = this.boltT / 0.26;
      var boltCol = this.regionId === 'deserto_cinzas' ? '255,190,110' :
        this.regionId === 'coracao' ? '255,120,150' : '215,228,255';
      ctx.save();
      ctx.globalAlpha = bt;
      ctx.strokeStyle = 'rgba(' + boltCol + ',0.32)';
      ctx.lineWidth = 6;
      this._strokeBolt(ctx);
      ctx.strokeStyle = 'rgba(' + boltCol + ',0.95)';
      ctx.lineWidth = 2;
      this._strokeBolt(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.8;
      this._strokeBolt(ctx);
      ctx.restore();
    }
    if (this.flashA > 0.004) {
      ctx.fillStyle = 'rgba(210,222,255,' + Math.min(0.5, this.flashA).toFixed(3) + ')';
      ctx.fillRect(0, 0, this.W, this.H);
    }
  },
  _strokeBolt: function(ctx){
    ctx.beginPath();
    ctx.moveTo(this.boltPts[0][0], this.boltPts[0][1]);
    for (var i = 1; i < this.boltPts.length; i++) ctx.lineTo(this.boltPts[i][0], this.boltPts[i][1]);
    ctx.stroke();
  },
  _updateWeatherChip: function(){
    var el = document.getElementById('weather-chip');
    if (!el) return;
    var W = this.WEATHERS[this.weather];
    var name = (E.DM && E.DM.tr) ? E.DM.tr(this._weatherLocKey(this.weather)) : this.weather;
    var ico = el.querySelector('.ico'), nm = el.querySelector('.nm');
    if (ico) ico.textContent = W ? W.chip : '';
    if (nm) nm.textContent = name;
  },
  /* ================= PETS CENICOS (só render) ================= */
  loadPetFrames: function(){
    this.petFrames = {};
    var re = /^pets\/((?:pet|cmp)_[a-z]+)_(idle|cheer|sad)_(\d+)$/;
    for (var key in E.IMG) {
      var m = re.exec(key);
      if (!m) continue;
      var base = m[1], pose = m[2], idx = m[3] | 0;
      if (!this.petFrames[base]) this.petFrames[base] = {};
      if (!this.petFrames[base][pose]) this.petFrames[base][pose] = [];
      this.petFrames[base][pose][idx] = this._img(E.IMG[key]);
    }
    // compacta (remove buracos)
    for (var b2 in this.petFrames) {
      for (var p2 in this.petFrames[b2]) {
        var arr = [];
        for (var i2 = 0; i2 < this.petFrames[b2][p2].length; i2++)
          if (this.petFrames[b2][p2][i2]) arr.push(this.petFrames[b2][p2][i2]);
        if (arr.length) this.petFrames[b2][p2] = arr;
        else delete this.petFrames[b2][p2];
      }
    }
  },
  setPetVisuals: function(){
    var pk = '', ck = '';
    if (E.Pet) {
      if (E.Pet.active_pet && E.Pet.is_owned(E.Pet.active_pet)) {
        var d1 = E.Pet.def(E.Pet.active_pet);
        if (d1.icon && this.petFrames[d1.icon]) pk = d1.icon;
      }
      if (E.Pet.active_companion && E.Pet.is_owned(E.Pet.active_companion)) {
        var d2 = E.Pet.def(E.Pet.active_companion);
        if (d2.icon && this.petFrames[d2.icon]) ck = d2.icon;
      }
    }
    this.petKey = pk; this.compKey = ck;
    if (this.petAnim.pose !== 'idle') { this.petAnim.pose = 'idle'; this.petAnim.f = 0; this.petAnim.t = 0; }
  },
  _petPose: function(p){
    if (!this.petFrames[this.petKey] && !this.petFrames[this.compKey]) return;
    if (!this.PET_POSES[p]) return;
    this.petAnim.pose = p; this.petAnim.f = 0; this.petAnim.t = 0;
  },
  _petTick: function(delta){
    var a = this.petAnim, def = this.PET_POSES[a.pose];
    var fr = (this.petFrames[this.petKey] || {})[a.pose] || (this.petFrames[this.compKey] || {})[a.pose];
    if (!def || !fr || !fr.length) { a.pose = 'idle'; a.f = 0; a.t = 0; return; }
    if (a.pose === 'cheer' && this.time > this.cheerUntil) { a.pose = 'idle'; a.f = 0; a.t = 0; return; }
    a.t += delta;
    a.f = Math.floor(a.t * def.fps) % fr.length;
  },
  _petFrame: function(key, pose){
    var fr = (this.petFrames[key] || {})[pose];
    if (!fr || !fr.length) return null;
    return fr[this.petAnim.f % fr.length];
  },
  registerPetCard: function(el, key){
    if (!el || !key) return;
    this.petCards.push({ el: el, key: key, i: 0 });
  },
  resetPetCards: function(){ this.petCards.length = 0; },
  _petCardsTick: function(delta){
    this._cardT += delta;
    if (this._cardT < 0.22 || !this.petCards.length) return;
    this._cardT = 0;
    for (var i = 0; i < this.petCards.length; i++) {
      var c = this.petCards[i];
      var frames = (this.petFrames[c.key.replace('pets/', '')] || {}).idle;
      if (!frames || frames.length < 2) continue;
      c.i = (c.i + 1) % frames.length;
      var uri = frames[c.i] && frames[c.i].src ? frames[c.i].src : E.IMG[c.key];
      if (uri && c.el.getAttribute('src') !== uri) c.el.src = uri;
    }
  },
  /* ================= REGIÃO / PARALLAX ================= */
  setRegion: function(regionId){
    if (this.regionId === regionId) return;
    if (this.regionId && this.layers.length) { this.oldLayers = this.layers; this.oldAlpha = 1; }
    this.regionId = regionId;
    var region = null, rs = E.DM.cfg_regions.regions;
    for (var i = 0; i < rs.length; i++) if (rs[i].id === regionId) region = rs[i];
    if (!region) return;
    this.pal = region.palette;
    this.palSeason = this._seasonPal(this.pal, this.SEASONS[this.season] || null);
    if (!this.regionCache[regionId]) this.regionCache[regionId] = this._buildRegion(regionId);
    this.layers = this.regionCache[regionId];
    this._seedAtmo(regionId);
    this._seedSeasonAtmo();
    this._applyWeather(false); // clima muda suave ao entrar no bioma
    this._updateChip();
    this.regionTitleT = 2.4;
  },
  _buildRegion: function(rid){
    var out = [];
    var sky = this._img(E.IMG['ui/bg_' + rid + '_sky']);
    out.push({ img: sky, speed: 0, x: 0, scale: 2, y: 0, isSky: true });
    var defs = [['far', 6, 380], ['mid', 14, 300], ['near', 30, 220]];
    for (var i = 0; i < defs.length; i++) {
      var img = this._img(E.IMG['ui/bg_' + rid + '_' + defs[i][0]]);
      out.push({ img: img, speed: defs[i][1], x: 0, scale: 2, w: 270 * 2, y: this.GROUND_Y - defs[i][2] });
    }
    return out;
  },
  _seedAtmo: function(rid){
    this.atmo.length = 0;
    var N = 42, kind = 0;
    if (rid === 'bosque_vidro') kind = 0;       // vagalumes
    else if (rid === 'pantano') kind = 1;       // esporos
    else if (rid === 'cidadela') kind = 2;      // runas
    else if (rid === 'deserto_cinzas') kind = 3;// brasas
    else if (rid === 'picos') kind = 4;         // neve
    else if (rid === 'coracao') kind = 5;       // cinza vermelha
    else kind = 6;                              // motas do vazio
    var acc = this.pal ? this.pal.accent : '#9b59d0';
    for (var i = 0; i < N; i++) {
      this.atmo.push({
        x: Math.random() * this.W, y: Math.random() * this.H,
        s: 0.6 + Math.random() * 1.8, ph: Math.random() * 6.28,
        sp: 6 + Math.random() * 14, kind: kind, acc: acc
      });
    }
  },
  /* ================= POOLS ================= */
  _float: function(amount, crit, side, color){
    var f = this.floats[this.floatIdx];
    this.floatIdx = (this.floatIdx + 1) % this.FLOAT_POOL;
    var base_x = side === 'hero' ? 148 : 385;
    f.on = true;
    f.x = base_x + (Math.random() * 70 - 35);
    f.y = 545 - (crit ? 18 : 0);
    f.vx = Math.random() * 46 - 23;
    f.vy = -(70 + Math.random() * 40 + (crit ? 30 : 0));
    f.text = amount === 0 ? 'MISS' : (amount < 0 ? '-' + E.U.fmt(-amount) : E.U.fmt(amount));
    f.color = color || '#fff';
    f.size = crit ? 30 : 19;
    f.crit = crit;
    f.t = 0;
  },
  _part: function(type, x, y, vx, vy, life, size, color, grav){
    var p = this.parts[this.partIdx];
    this.partIdx = (this.partIdx + 1) % this.PART_POOL;
    p.on = true; p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.t = 0; p.life = life; p.size = size; p.color = color; p.grav = grav || 0;
  },
  _sparks: function(x, y, n){
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, sp = 60 + Math.random() * 160;
      this._part(0, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, 0.3 + Math.random() * 0.25,
        1.5 + Math.random() * 2, Math.random() < 0.5 ? '#ffd27a' : '#fff3d0', 300);
    }
  },
  _blood: function(x, y, n, color){
    for (var i = 0; i < n; i++) {
      var a = -1.2 + Math.random() * 2.4, sp = 50 + Math.random() * 130;
      this._part(1, x, y - 10, Math.sin(a) * sp * 0.6, -Math.abs(Math.cos(a)) * sp - 30,
        0.5 + Math.random() * 0.3, 1.5 + Math.random() * 2.2, color || '#c22e4a', 420);
    }
  },
  _dust: function(x, y, n){
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, sp = 20 + Math.random() * 70;
      this._part(2, x + (Math.random() * 90 - 45), y - Math.random() * 40,
        Math.cos(a) * sp, -10 - Math.random() * 30, 0.55 + Math.random() * 0.45,
        4 + Math.random() * 7, 'rgba(150,140,160,0.5)', -30);
    }
  },
  _motes: function(x, y, n, color){
    for (var i = 0; i < n; i++)
      this._part(3, x + (Math.random() * 120 - 60), y + (Math.random() * 60 - 30),
        Math.random() * 30 - 15, -40 - Math.random() * 60, 0.8 + Math.random() * 0.6,
        1.5 + Math.random() * 2, color || '#ffd700', -20);
  },
  _explosion: function(x, y){
    this._ring(x, y, 8, 210, 'rgba(232,163,58,0.95)', 6, 0.8);
    this._ring(x, y, 4, 150, 'rgba(255,240,200,0.9)', 3, 0.55);
    this._sparks(x, y, 26);
    this._dust(x, y + 40, 16);
    this._motes(x, y, 12);
  },
  _ring: function(x, y, r0, r1, color, width, life){
    var r = this.rings[this.ringIdx];
    this.ringIdx = (this.ringIdx + 1) % this.RING_POOL;
    r.on = true; r.x = x; r.y = y; r.r0 = r0; r.r1 = r1; r.color = color;
    r.width = width || 3; r.life = life || 0.7; r.t = 0;
  },
  addShake: function(i){ this.shake = Math.min(1.2, Math.max(this.shake, i)); },
  banner: function(txt, color){
    var el = document.getElementById('banner');
    if (!el) return;
    el.textContent = txt;
    el.style.color = color || '#e8a33a';
    el.classList.add('show');
    el.style.opacity = '1';
    clearTimeout(this._bannerTo);
    this._bannerTo = setTimeout(function(){
      el.classList.remove('show');
      el.style.opacity = '0';
    }, 1150);
  },
  /* ================= FRAME ================= */
  render: function(delta){
    var ctx = this.ctx, W = this.W, H = this.H;
    this.time += delta;
    this._weatherTick(delta);          // clima: vento/relâmpagos/precipitação
    this._petTick(delta);              // FSM cênica dos pets
    this._petCardsTick(delta);         // cards animados no painel de Pets
    ctx.save();
    // ---- screenshake por trauma (offset + micro-rotação) ----
    if (this.shake > 0.001) {
      var tr2 = this.shake * this.shake;
      var sx = (Math.random() * 2 - 1) * tr2 * 11;
      var sy = (Math.random() * 2 - 1) * tr2 * 9;
      var rot = Math.sin(this.time * 57) * tr2 * 0.013;
      ctx.translate(W / 2 + sx, H / 2 + sy);
      ctx.rotate(rot);
      ctx.translate(-W / 2, -H / 2);
      this.shake = Math.max(0, this.shake - delta * 1.7);
    }
    ctx.clearRect(-30, -30, W + 60, H + 60);
    // ---- 1) céu ----
    this._drawLayers(delta);
    // ---- 1.5) clima atrás: escurecimento + precipitação de fundo ----
    this._drawWeatherBack(delta);
    // ---- 2) névoa oscilante (paleta da estação) ----
    var palDraw = this.palSeason || this.pal;
    if (palDraw) {
      var fogY1 = this.GROUND_Y - 130 + Math.sin(this.time * 0.5) * 12;
      var fogY2 = this.GROUND_Y - 60 + Math.cos(this.time * 0.4) * 10;
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = palDraw.accent;
      ctx.fillRect(0, fogY1, W, 70);
      ctx.globalAlpha = 0.05;
      ctx.fillRect(0, fogY2, W, 90);
      ctx.globalAlpha = 1;
    }
    // ---- 3) partículas atmosféricas (bioma + estação, atrás das entidades) ----
    this._drawAtmo(delta);
    this._drawSeasonAtmo(delta, false);
    // ---- 4) chão ----
    if (palDraw) {
      var g = ctx.createLinearGradient(0, this.GROUND_Y, 0, H);
      g.addColorStop(0, palDraw.ground);
      g.addColorStop(1, '#040208');
      ctx.fillStyle = g;
      ctx.fillRect(0, this.GROUND_Y, W, H - this.GROUND_Y);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, this.GROUND_Y, W, 2);
      ctx.globalAlpha = 0.10; ctx.fillStyle = palDraw.accent;
      ctx.fillRect(0, this.GROUND_Y, W, 4);
      ctx.globalAlpha = 1;
    }
    // ---- 5) anéis de efeito (atrás das entidades) ----
    this._drawRings(delta);
    // ---- 5.5) spotlight (separação entidade/fundo) ----
    var spot = ctx.createRadialGradient(300, 650, 40, 300, 650, 330);
    spot.addColorStop(0, 'rgba(0,0,0,0.42)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 330, W, 470);
    // ---- 6) entidades ----
    this._heroTick(delta);
    this._drawEntities(delta);
    // ---- 7) partículas de combate + estação em primeiro plano ----
    this._drawParts(delta);
    this._drawSeasonAtmo(delta, true);
    // ---- 7.2) clima à frente: precipitação grossa + splash + relâmpago ----
    this._drawWeatherFront(delta);
    // ---- 7.5) wash de humor (estação + clima) ----
    var Sw = this.SEASONS[this.season];
    if (Sw && Sw.wash) { ctx.fillStyle = Sw.wash; ctx.fillRect(-30, -30, W + 60, H + 60); }
    var Wx = this.WEATHERS[this.weather];
    if (Wx && Wx.wash) {
      var prevX = this.WEATHERS[this.weatherPrev];
      var wa = this.weatherBlend;
      ctx.globalAlpha = wa;
      ctx.fillStyle = Wx.wash;
      ctx.fillRect(-30, -30, W + 60, H + 60);
      if (prevX && prevX.wash && wa < 1) {
        ctx.globalAlpha = 1 - wa;
        ctx.fillStyle = prevX.wash;
        ctx.fillRect(-30, -30, W + 60, H + 60);
      }
      ctx.globalAlpha = 1;
    }
    // ---- 8) barras de vida ----
    this._bar(ctx, 20, 470, 230, 30, this.heroHpShown, this.heroGhost, '#3a9e5f', '#7a3030', this.heroHpLabel, '#58e07a');
    this._bar(ctx, 290, 470, 230, 30, this.enemyHpShown, this.enemyGhost, '#d0455f', '#7a3030', this.enemyHpLabel, '#ff7a8a');
    this.heroGhost = this._ghost(this.heroGhost, this.heroHpShown, delta);
    this.enemyGhost = this._ghost(this.enemyGhost, this.enemyHpShown, delta);
    // ---- 9) dano flutuante ----
    this._drawFloats(delta);
    // ---- 10) título da região ----
    if (this.regionTitleT > 0) {
      this.regionTitleT -= delta;
      var a = Math.min(1, Math.min(this.regionTitleT, 2.4 - this.regionTitleT) * 2);
      ctx.globalAlpha = E.U.clamp(a, 0, 1) * 0.9;
      ctx.font = '700 26px ' + (this.fontReady ? 'Cinzel,' : '') + ' "Courier New",monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.fillText((this._regionName() || '').toUpperCase(), W / 2 + 2, 128 + 2);
      ctx.fillStyle = this.pal ? this.pal.accent : '#e8a33a';
      ctx.fillText((this._regionName() || '').toUpperCase(), W / 2, 128);
      ctx.globalAlpha = 1;
    }
    // ---- chip da estação/clima (refresh barato p/ troca de idioma) ----
    this._chipT += delta;
    if (this._chipT > 2) { this._chipT = 0; this._updateChip(); this._updateWeatherChip(); }
    ctx.restore();
  },
  _drawLayers: function(delta){
    var W = this.W, S = this.SEASONS[this.season];
    for (var pass = 0; pass < 2; pass++) {
      var layers = pass === 0 ? this.layers : this.oldLayers;
      if (!layers) continue;
      if (pass === 1) {
        this.oldAlpha = Math.max(0, this.oldAlpha - delta * 1.8);
        if (this.oldAlpha <= 0) { this.oldLayers = null; continue; }
        this.ctx.globalAlpha = this.oldAlpha;
      }
      for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        if (!L.img || !L.img.complete || !L.img.naturalWidth) continue;
        var img = L.img;
        if (S) { // variante sazonal (cache por camada; re-tenta até a img carregar)
          if (!L.tinted) L.tinted = {};
          var tv = L.tinted[this.season];
          if (!tv) { tv = this._tintImg(L.img, S); if (tv) L.tinted[this.season] = tv; }
          img = tv || L.img;
        }
        if (L.isSky) {
          this.ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, W, this.H);
        } else {
          L.x -= L.speed * delta;
          if (L.x <= -L.w) L.x += L.w;
          var x = L.x;
          while (x < W) {
            this.ctx.drawImage(img, x, L.y, L.w, img.naturalHeight * 2);
            x += L.w;
          }
        }
      }
      this.ctx.globalAlpha = 1;
    }
  },
  _drawAtmo: function(delta){
    var ctx = this.ctx, W = this.W, H = this.H, t = this.time;
    for (var i = 0; i < this.atmo.length; i++) {
      var p = this.atmo[i];
      if (p.kind === 4) { // neve caindo
        p.y += p.sp * delta * 2.2;
        p.x += (Math.sin(t * 1.4 + p.ph) * 14 + this.wind * 30) * delta;
        if (p.y > this.GROUND_Y) { p.y = -6; p.x = Math.random() * W; }
        ctx.globalAlpha = 0.5 + Math.sin(t + p.ph) * 0.2;
        ctx.fillStyle = '#dceafc';
        ctx.fillRect(p.x, p.y, p.s + 0.6, p.s + 0.6);
      } else {           // motas flutuantes
        p.y -= p.sp * delta * 0.55;
        p.x += (Math.sin(t * 0.9 + p.ph) * 10 + this.wind * 18) * delta;
        if (p.y < -8) { p.y = this.GROUND_Y + Math.random() * 60; p.x = Math.random() * W; }
        var tw = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.2 + p.ph));
        ctx.globalAlpha = tw;
        ctx.fillStyle = p.kind === 0 ? '#8af0c8' : p.kind === 3 ? '#ffb060' :
          p.kind === 5 ? '#e87080' : p.kind === 6 ? '#f5e6c8' : p.acc;
        var sz = p.s + (p.kind === 0 ? Math.sin(t * 3 + p.ph) * 0.5 : 0);
        ctx.fillRect(p.x, p.y, Math.max(0.8, sz), Math.max(0.8, sz));
      }
    }
    ctx.globalAlpha = 1;
  },
  _drawRings: function(delta){
    var ctx = this.ctx;
    for (var i = 0; i < this.rings.length; i++) {
      var r = this.rings[i];
      if (!r.on) continue;
      r.t += delta;
      var pr = r.t / r.life;
      if (pr >= 1) { r.on = false; continue; }
      var rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - pr, 2.4));
      ctx.globalAlpha = (1 - pr);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - pr * 0.6);
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * 0.62, 0, 0, 6.2832);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  _drawEntities: function(delta){
    var ctx = this.ctx, t = this.time;
    var hl = this.heroLunge, el2 = this.enemyLunge;
    var heroX = 45 - hl * 14, heroY = 525 + Math.sin(t / 240) * 2.5;
    var bossScale = this.enemyBoss ? 1.38 : (this.enemyMini ? 1.12 : 1);
    var enCX = this.enemyBoss ? 372 : 390;               // centro do inimigo (chefe centralizado p/ caber)
    var enX = enCX - 120 + el2 * 12, enY = 525 + Math.sin(t / 200 + 2) * 2.5;
    var alpha = 1;
    if (this.enemyFade > 0) {
      this.enemyFade = Math.min(1, this.enemyFade + delta * 2.6);
      alpha = 1 - this.enemyFade;
    }
    if (this.enemySpawn < 1 && this.hasEnemy) {
      this.enemySpawn = Math.min(1, this.enemySpawn + delta * 3.2);
    }
    var spawnE = this.enemySpawn < 1 ? (1 - Math.pow(1 - this.enemySpawn, 3)) : 1;
    // sombras
    ctx.globalAlpha = 0.38; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(heroX + 120, 768, 92 - hl * 8, 13, 0, 0, 6.2832); ctx.fill();
    if (this.hasEnemy) {
      var esc = this.enemyBoss ? 1.62 : (this.enemyMini ? 1.18 : 1);
      ctx.globalAlpha = 0.38 * alpha;
      ctx.beginPath(); ctx.ellipse(enCX, 770, 100 * bossScale * spawnE, 15 * bossScale, 0, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // ---- pets cênicos: companheiro atrás do herói ----
    var hopY = this.petAnim.pose === 'cheer' ? -Math.abs(Math.sin(t * 7)) * 6 : 0;
    var cf = this._petFrame(this.compKey, this.petAnim.pose);
    if (cf && cf.complete && cf.naturalWidth) {
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(94, 771, 54, 10, 0, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.drawImage(cf, 6, 589 + hopY, 176, 176);
    }
    // ---- herói (FSM: frame da postura corrente + flash por frame) ----
    var fr = this.heroFrames[this.heroAnim.pose] || [];
    var hImg = fr[this.heroAnim.f] || this.heroImg;
    var frKey = this.heroAnim.pose + this.heroAnim.f;
    if (hImg && hImg.complete && hImg.naturalWidth > 0) {
      var hWhite = this._whiteFor(hImg, frKey);
      ctx.drawImage(hImg, heroX, heroY, 240, 240);
      if (this.heroFlash > 0.01 && hWhite) {
        ctx.globalAlpha = Math.min(0.85, this.heroFlash);
        ctx.drawImage(hWhite, heroX, heroY, 240, 240);
        ctx.globalAlpha = 1;
        this.heroFlash = Math.max(0, this.heroFlash - delta * 3.4);
      }
    }
    // ---- pet aos pés do herói (à frente, próximo do inimigo) ----
    var pf = this._petFrame(this.petKey, this.petAnim.pose);
    if (pf && pf.complete && pf.naturalWidth) {
      ctx.globalAlpha = 0.34; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(234, 772, 38, 8, 0, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.drawImage(pf, 196, 694 + hopY, 76, 76);
    }
    // inimigo (aura de chefe + spawn + fade)
    if (this.hasEnemy && this.enemyImg && this.enemyImg.complete && this.enemyImg.naturalWidth > 0) {
      if (!this.enemyWhite) this.enemyWhite = this._makeWhite(this.enemyImg);
      var scale = bossScale;
      var sz = 240 * scale * (0.4 + 0.6 * spawnE);
      var ex = enX - (sz - 240) / 2, ey = enY - (sz - 240);
      // aura orbital do chefe
      if ((this.enemyBoss || this.enemyMini) && alpha > 0.9 && this.enemyFade === 0) {
        var n = this.enemyBoss ? 7 : 4, orbit = 96 * scale;
        for (var oi = 0; oi < n; oi++) {
          var ang = t * (this.enemyBoss ? 1.5 : 1.1) + oi * 6.2832 / n;
          var ox = enCX + Math.cos(ang) * orbit;
          var oy = enY + 108 + Math.sin(ang) * orbit * 0.36;
          var oa = 0.35 + 0.3 * Math.sin(t * 3 + oi);
          ctx.globalAlpha = oa;
          ctx.fillStyle = this.enemyBoss ? '#ffd27a' : '#c88adf';
          ctx.fillRect(ox, oy, 3, 3);
          ctx.fillRect(ox - 1, oy - 1, 5, 5);
        }
        // disco pulsante sob o chefe
        var pu = 0.5 + 0.5 * Math.sin(t * 2.6);
        ctx.globalAlpha = (this.enemyBoss ? 0.30 : 0.16) * (0.6 + pu * 0.4) * spawnE;
        ctx.fillStyle = this.enemyBoss ? 'rgba(232,163,58,1)' : 'rgba(155,89,208,1)';
        ctx.beginPath();
        ctx.ellipse(enCX, 768, 70 * scale * (0.9 + pu * 0.14), 11 * scale, 0, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // enfurecido: aura vermelha pulsante (leitura de estado, sem escrita)
      var berserkNow = !!(E.Combat.enemy && E.Combat.enemy_berserk);
      if (berserkNow && alpha > 0.9) {
        var pu2 = 0.5 + 0.5 * Math.sin(t * 6);
        ctx.globalAlpha = 0.35 + pu2 * 0.3;
        ctx.strokeStyle = 'rgba(255,70,90,1)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ex + sz / 2, ey + sz / 2, sz * 0.52, 0, 6.2832);
        ctx.stroke();
        ctx.globalAlpha = alpha;
      }
      ctx.globalAlpha = alpha;
      ctx.drawImage(this.enemyImg, ex, ey, sz, sz);
      if (this.enemyFlash > 0.01 && this.enemyWhite) {
        ctx.globalAlpha = alpha * Math.min(0.9, this.enemyFlash);
        ctx.drawImage(this.enemyWhite, ex, ey, sz, sz);
        this.enemyFlash = Math.max(0, this.enemyFlash - delta * 3.2);
      }
      ctx.globalAlpha = 1;
    }
    // flashes de golpe (crescente no alvo)
    if (hl > 0.55) {
      ctx.globalAlpha = (hl - 0.55) * 1.4;
      ctx.strokeStyle = 'rgba(255,232,170,1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enCX, enY + 120, 96, -2.4, 0.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (el2 > 0.55) {
      ctx.globalAlpha = (el2 - 0.55) * 1.3;
      ctx.strokeStyle = 'rgba(255,110,130,1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(heroX + 120, heroY + 120, 92, 0.8, 3.6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    this.heroLunge = Math.max(0, this.heroLunge - delta * 3.6);
    this.enemyLunge = Math.max(0, this.enemyLunge - delta * 3.6);
  },
  _drawParts: function(delta){
    var ctx = this.ctx;
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      if (!p.on) continue;
      p.t += delta;
      if (p.t >= p.life) { p.on = false; continue; }
      p.vy += p.grav * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      var pr = p.t / p.life;
      ctx.globalAlpha = pr < 0.2 ? pr / 0.2 : 1 - (pr - 0.2) / 0.8;
      if (p.type === 2) { // poeira: círculo expandindo
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + pr * 1.6), 0, 6.2832);
        ctx.fill();
      } else if (p.type === 3) { // mota de ouro: brilho subindo
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha *= 0.4;
        ctx.fillRect(p.x - 1, p.y - 1, p.size + 2, p.size + 2);
      } else if (p.type === 0) { // faísca: streak
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
      } else { // sangue: gota
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - pr * 0.4), 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },
  _drawFloats: function(delta){
    var ctx = this.ctx;
    ctx.textAlign = 'center';
    for (var i = 0; i < this.floats.length; i++) {
      var f = this.floats[i];
      if (!f.on) continue;
      f.t += delta;
      var pr = f.t / 0.95;
      if (pr >= 1) { f.on = false; continue; }
      // física de arco
      f.vy += 150 * delta;
      f.x += f.vx * delta;
      f.y += f.vy * delta;
      // pop-in (overshoot) + fade final
      var pop = f.t < 0.14 ? 1 + Math.sin(pr * 10.9) * 0.25 * (1 - f.t / 0.14) : 1;
      var size = f.size * pop;
      var a = pr < 0.62 ? 1 : 1 - (pr - 0.62) / 0.38;
      ctx.globalAlpha = a;
      ctx.font = '900 ' + size.toFixed(1) + 'px ' + (this.fontReady ? 'Cinzel,' : '') + ' "Courier New",monospace';
      var fy = f.y;
      if (f.crit) {
        // crit: contorno pesado + brilho duplo
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(20,8,10,0.95)';
        ctx.strokeText(f.text, f.x, fy);
        ctx.fillStyle = '#fff0d0';
        ctx.fillText(f.text, f.x, fy - 1.5);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, fy);
      } else {
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(10,6,14,0.9)';
        ctx.strokeText(f.text, f.x, fy);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, fy);
      }
      ctx.globalAlpha = 1;
    }
  },
  _bar: function(ctx, x, y, w, h, frac, ghost, color, ghostColor, label, glow){
    frac = E.U.clamp(frac, 0, 1);
    // painel ornado
    ctx.fillStyle = 'rgba(12,7,20,0.92)';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.strokeStyle = 'rgba(232,163,58,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
    // cantos dourados
    ctx.fillStyle = 'rgba(232,163,58,0.9)';
    var c = 4;
    ctx.fillRect(x - 3, y - 3, c, 2); ctx.fillRect(x - 3, y - 3, 2, c);
    ctx.fillRect(x + w + 3 - c, y - 3, c, 2); ctx.fillRect(x + w + 1, y - 3, 2, c);
    ctx.fillRect(x - 3, y + h + 1, c, 2); ctx.fillRect(x - 3, y + h + 3 - c, 2, c);
    ctx.fillRect(x + w + 3 - c, y + h + 1, c, 2); ctx.fillRect(x + w + 1, y + h + 3 - c, 2, c);
    // ghost trail
    ctx.fillStyle = ghostColor;
    ctx.fillRect(x, y, w * E.U.clamp(ghost, 0, 1), h);
    // preenchimento gradiente
    if (frac > 0) {
      var g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, color);
      g.addColorStop(1, glow);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w * frac, h);
      // brilho superior
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x, y, w * frac, h * 0.35);
    }
    // ticks de 10%
    ctx.fillStyle = 'rgba(8,5,14,0.55)';
    for (var i = 1; i < 10; i++) ctx.fillRect(x + w * i / 10 - 0.5, y, 1, h);
    // moldura interna
    ctx.strokeStyle = '#3a2a55'; ctx.lineWidth = 1;
    ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
    // rótulo
    ctx.font = '700 10px ' + (this.fontReady ? 'Cinzel,' : '') + ' "Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(label || '', x + w / 2, y + h / 2 + 4);
  },
  _ghost: function(g, target, delta){
    if (target < g) return Math.max(target, g - delta * 0.35);
    return target;
  },
  _regionName: function(){
    var rs = E.DM.cfg_regions.regions;
    for (var i = 0; i < rs.length; i++) if (rs[i].id === this.regionId) return rs[i].name;
    return '';
  }
};
