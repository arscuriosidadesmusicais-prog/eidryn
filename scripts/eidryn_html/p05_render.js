'use strict';
/* =====================================================================
   p05_render.js — RENDER ENGINE v5 "Eco da Tempestade" (só apresentação)
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
   - [ART-10] ÁUDIO DO CLIMA (em E.Audio): chuva/vento sintetizados em loop
     + trovão sob demanda — hooks em _applyWeather e nos relâmpagos
   - [ART-11] POÇAS REFLETIVAS: na chuva, poças determinísticas por região
     refletem as entidades (clip elíptico + flip + squash + tremulação),
     ondulações de gota, cintilância, menisco e brilho de relâmpago na água
   - [ART-12] NEBLINA DO PÂNTANO: bancos de névoa em deriva (blob pré-
     renderizado), bruma de solo e densidade que reage ao clima
   - Partículas: faíscas, sangue, poeira, motas de ouro (pools fixos)
   - Dano flutuante em arco com pop-in (fonte Cinzel, cor por tipo)
   - Screenshake por trauma (com micro-rotação), barras ornamentadas
   - [V8] CICLO DIA/NOITE: relógio real local (amanhecer/dia/entardecer/noite),
     wash interpolado + brilho de horizonte; estrelas com cintilação e cruz de
     brilho posicionadas pela banda visível (landscape); override em Ajustes
   - [V9] VAGALUMES & ALMAS: crítters ambientais — vagalumes surgem com a
     noite (bosque/pântano/cidadela); almas espectrais no abismo/coração
   - [V10] ESTRELAS CADENTES: riscos ocasionais no céu noturno (com trilha)
   - [V11] PILAR DE LUZ no level-up (celebração com anel e motes radiantes)
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
  /* ---------- [ART-11] POÇAS + [ART-12] NEBLINA (só render) ---------- */
  puddles: [], puddleT: 0, ripples: [], rippleIdx: 0, RIPPLE_POOL: 14,
  fogBanks: [], fogDens: 1, _fogBlobA: null, _fogBlobB: null,
  boltT: 0, boltNext: 5, boltPts: null, flashA: 0,
  /* ---------- [V1-V6] v1.7.0 "Herdeiro do Eclipse" (só apresentação) ----------
     V1 intro de chefe · V2 eclipse progressivo · V3 hit-stop + arco de corte
     V4 aura de raridade · V5 placa de região · V6 orbe de loot — todos leem
     estado/eventos existentes; NADA escreve no jogo. */
  bossIntroT: 0, bossIntroName: '', bossIntroSub: '',
  hitStopT: 0,
  _band: null,
  slashes: [], slashIdx: 0, SLASH_POOL: 4,
  orbs: [], orbIdx: 0, ORBS_POOL: 6,
  _auraOrder: -1, _coronaDisc: null, _coronaRays: null,
  RARITY_AURA: { 3: '#a86ae8', 4: '#e8a33a', 5: '#ff5a7a', 6: '#7af0dc' },
  RARITY_ORB: { rara: '#4aa3ff', epica: '#a86ae8', lendaria: '#e8a33a', mitica: '#ff5a7a', divina: '#7af0dc' },
  /* ---------- [V8-V10] v1.8.0 "Vigília Estelar" (só apresentação) ----------
     V8 ciclo dia/noite (relógio real local) · V9 vagalumes/almas por bioma
     V10 estrelas cadentes — todos leem estado/hora; NADA escreve no jogo. */
  dnPref: 'auto',
  _dn: { dark: 0, darkCol: '7,10,32', stars: 0, glow: 0, glowCol: '255,164,92' },
  DN_PHASES: {
    amanhecer:  { dark: 0.06, darkCol: '26,18,40', stars: 0.10, glow: 0.26, glowCol: '255,164,92' },
    dia:        { dark: 0,    darkCol: '7,10,32',  stars: 0,    glow: 0,    glowCol: '255,164,92' },
    entardecer: { dark: 0.11, darkCol: '22,14,38', stars: 0.32, glow: 0.30, glowCol: '255,120,80' },
    noite:      { dark: 0.15, darkCol: '7,10,32',  stars: 1,    glow: 0,    glowCol: '255,120,80' }
  },
  stars: [], _starsSeeded: false,
  shoot: null, _shootNext: 6,
  flies: [],
  pillarT: 0, _pillarRing: false,
  /* ---------- [AUDIT-C1/C2] ACESSIBILIDADE + DESEMPENHO (só apresentação) ----------
     reducedFx: usuário pede MENOS flashes/tremores (fotossensibilidade).
     perfMode auto: média de frame real decide lowFx (menos partículas/overdraw). */
  reducedFx: false, perfMode: 'auto', lowFx: false,
  _perfAvg: 0.0167, _perfT: 0, _rawDelta: 0,
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
    for (var r3 = 0; r3 < this.RIPPLE_POOL; r3++)
      this.ripples.push({ on:false, x:0, y:0, t:0, life:1 });
    // [V3/V6] pools do arco de corte e dos orbes de loot
    for (var s3 = 0; s3 < this.SLASH_POOL; s3++)
      this.slashes.push({ on:false, x:0, y:0, t:0, life:0.24, flip:false });
    for (var o3 = 0; o3 < this.ORBS_POOL; o3++)
      this.orbs.push({ on:false, x0:0, y0:0, t:0, life:0.95, color:'#e8a33a' });
    // [ART-12] blobs de névoa pré-renderizados (2 tons — ar/solo)
    this._fogBlobA = this._fogBlob('170,200,165');
    this._fogBlobB = this._fogBlob('196,212,192');
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
      if (self.enemyBoss) {
        self._ring(385, 640, 30, 190, 'rgba(232,163,58,0.8)', 4, 0.9); self.addShake(0.35);
        // [V1] intro cinematográfica do chefe (placa + escurecimento)
        self.bossIntroT = 2.3; self.bossIntroName = e.name || '';
        self.bossIntroSub = (self._regionName() || '').toUpperCase();
        self._ring(385, 640, 12, 262, 'rgba(232,163,58,0.5)', 2.5, 1.15);
      }
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
      if (crit) {
        self._ring(385, 640, 6, 84, 'rgba(255,190,90,0.9)', 4, 0.5); self.addShake(0.22);
        // [V3] hit-stop visual + arco de corte (a simulação não pausa)
        self.hitStopT = self.reducedFx ? 0.04 : 0.085;
        self._spawnSlash();
      }
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
      if (result === 'win') {
        self.cheerUntil = self.time + 3.4;
        // [V7] celebração: brasas douradas pelo campo
        self._motes(200, 640, 10); self._motes(330, 620, 10);
        self._ring(240, 700, 20, 190, 'rgba(232,163,58,0.5)', 2.5, 0.9);
      }
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
      // [V11] celebração ampliada: pilar de luz sobre o herói
      self.pillarT = 1.5; self._pillarRing = false;
    });
    E.BUS.on('pet_changed', function(){ self.setPetVisuals(); });
    E.BUS.on('region_changed', function(rid){ self.setRegion(rid); });
    // [V4] aura de raridade: recalcula quando o equipamento muda
    E.BUS.on('item_equipped', function(){ self._auraOrder = -1; });
    E.BUS.on('item_unequipped', function(){ self._auraOrder = -1; });
    // [V6] orbe de loot voando ao HUD em drops Rara+ durante o combate
    E.BUS.on('loot_rare', function(it){
      if (!(E.Combat && E.Combat.active) || !self.hasEnemy || self.lowFx) return;
      self._spawnLootOrb(it && it.rarity ? it.rarity : 'rara');
      self._motes(385, 600, 5, self.RARITY_ORB[it && it.rarity ? it.rarity : 'rara']);
    });
    this.setRegion('bosque_vidro');
    this._applySeason();
    this._applyWeather(true);
    this.setPetVisuals();
    this._auraOrder = -1;
    this._bakeCorona(); // [V2] sprite do eclipse pré-renderizado
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
        if (p && p.amb_vol != null && E.Audio) E.Audio.amb_vol = E.U.clamp(Number(p.amb_vol) || 0, 0, 1); // [ART-10]
        if (p && p.reduced_fx != null) this.reducedFx = !!p.reduced_fx;   // [AUDIT-C1]
        if (p && p.perf && ['auto','high','low'].indexOf(p.perf) >= 0) this.perfMode = p.perf; // [AUDIT-C2]
        if (p && p.dn && (p.dn === 'auto' || this.DN_PHASES[p.dn])) this.dnPref = p.dn; // [V8]
        this._tipsDone = !!(p && p.tips_done); // [AUDIT-D2]
      }
    } catch (e) {}
  },
  savePrefs: function(){
    var p = { season: this.seasonPref, weather: this.weatherPref, dn: this.dnPref,
      reduced_fx: this.reducedFx, perf: this.perfMode, tips_done: !!this._tipsDone }; // [AUDIT-C1/C2/D2]
    if (E.Audio && E.Audio.amb_vol != null) p.amb_vol = E.Audio.amb_vol; // [ART-10] volume do ambiente
    try { globalThis.localStorage.setItem(this.PREF_KEY, JSON.stringify(p)); } catch (e) {}
  },
  /* multiplicadores de quantidade de partículas por acessibilidade/desempenho */
  _fxMul: function(){ return (this.reducedFx ? 0.55 : 1) * (this.lowFx ? 0.5 : 1); },
  _flashMul: function(){ return this.reducedFx ? 0.3 : 1; },
  setReducedFx: function(v){ this.reducedFx = !!v; this.savePrefs(); },
  setPerfMode: function(v){
    this.perfMode = (v === 'high' || v === 'low') ? v : 'auto';
    if (this.perfMode === 'low') this.lowFx = true;
    else if (this.perfMode === 'high') this.lowFx = false;
    this.savePrefs();
  },
  /* ================= [V8] CICLO DIA/NOITE (só render; relógio real local) =================
     Fases: amanhecer 5–7h · dia 7–17h · entardecer 17–19h · noite 19–5h.
     Os alvos de cada fase são interpolados (~3s) — nada muda com salto seco.
     Override em Ajustes (pref em chave própria — save do jogo intacto). */
  _dnPhaseNow: function(h){
    if (this.dnPref !== 'auto') return this.dnPref;
    if (h == null) h = new Date().getHours();
    if (h >= 5 && h < 7) return 'amanhecer';
    if (h >= 7 && h < 17) return 'dia';
    if (h >= 17 && h < 19) return 'entardecer';
    return 'noite';
  },
  setDnPref: function(v){
    this.dnPref = (v === 'auto' || this.DN_PHASES[v]) ? v : 'auto';
    this.savePrefs();
  },
  _dnLocKey: function(p){
    return { amanhecer: 'dn_dawn', dia: 'dn_day', entardecer: 'dn_dusk', noite: 'dn_night' }[p] || 'dn_auto';
  },
  _dnTick: function(delta){
    var tgt = this.DN_PHASES[this._dnPhaseNow()] || this.DN_PHASES.dia;
    var k = 1 - Math.exp(-delta * 1.1); // transição completa em ~3s
    var d = this._dn;
    d.dark += (tgt.dark - d.dark) * k;
    d.stars += (tgt.stars - d.stars) * k;
    d.glow += (tgt.glow - d.glow) * k;
    d.glowCol = tgt.glowCol; d.darkCol = tgt.darkCol;
  },
  /* ================= [V10] ESTRELAS + ESTRELAS CADENTES (céu noturno) ================= */
  _seedStars: function(){
    if (this._starsSeeded) return;
    for (var i = 0; i < 90; i++) {
      this.stars.push({ fx: Math.random(), fy: Math.random(),
        s: 0.6 + Math.random() * 1.3, ph: Math.random() * 6.2832,
        sp: 0.8 + Math.random() * 2.2, bright: Math.random() < 0.09 });
    }
    this._starsSeeded = true;
  },
  _drawStars: function(delta){
    var st = this._dn.stars;
    if (st < 0.02) { this.shoot = null; return; }
    this._seedStars();
    var ctx = this.ctx, band = this._viewBand(), t = this.time;
    var hBand = (band.bot - band.top);
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      var x = s.fx * this.W, y = band.top + s.fy * hBand * 0.62;
      var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      var a = st * tw * (s.bright ? 1 : 0.72) * this._flashMul();
      if (a < 0.02) continue;
      ctx.globalAlpha = a; ctx.fillStyle = '#e8f0ff';
      ctx.fillRect(x, y, s.s, s.s);
      if (s.bright && !this.lowFx) { // cruz de brilho nas estrelas maiores
        ctx.globalAlpha = a * 0.45;
        ctx.fillRect(x - 2.5, y + s.s / 2 - 0.5, s.s + 5, 1);
        ctx.fillRect(x + s.s / 2 - 0.5, y - 2.5, 1, s.s + 5);
      }
    }
    // [V10] estrela cadente ocasional (entra/sai com fade senoidal)
    this._shootNext -= delta;
    if (!this.shoot && this._shootNext <= 0 && !this.lowFx && !this.reducedFx) {
      var dir = Math.random() < 0.5 ? -1 : 1;
      this.shoot = { x: this.W * (0.2 + Math.random() * 0.6),
        y: band.top + hBand * (0.05 + Math.random() * 0.22),
        vx: dir * (200 + Math.random() * 140), vy: 90 + Math.random() * 60, t: 0, life: 0.85 };
      this._shootNext = 8 + Math.random() * 9;
    }
    if (this.shoot) {
      var sh = this.shoot; sh.t += delta;
      if (sh.t >= sh.life) { this.shoot = null; }
      else {
        var pr = sh.t / sh.life;
        var fade = Math.sin(Math.PI * pr);
        sh.x += sh.vx * delta; sh.y += sh.vy * delta;
        var tx = sh.x - sh.vx * 0.16, ty = sh.y - sh.vy * 0.16;
        var g2 = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
        g2.addColorStop(0, 'rgba(240,248,255,' + (0.95 * fade * st).toFixed(3) + ')');
        g2.addColorStop(1, 'rgba(240,248,255,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = g2; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.globalAlpha = fade * st; ctx.fillStyle = '#fff';
        ctx.fillRect(sh.x - 1, sh.y - 1, 2.4, 2.4);
      }
    }
    ctx.globalAlpha = 1;
  },
  /* ================= [V9] VAGALUMES & ALMAS (crítters ambientais) =================
     Vagalumes: bosque/pântano/cidadela, surgem com a noite (fator _dn.stars).
     Almas: abismo/coração — flutuam sempre (regiões mortas), tom espectral. */
  _drawFlies: function(delta){
    var rid = this.regionId;
    var wantWisps = (rid === 'abismo' || rid === 'coracao');
    var wantFF = (rid === 'bosque_vidro' || rid === 'pantano' || rid === 'cidadela');
    if (!wantWisps && !wantFF) return;
    if (!this.flies.length) {
      for (var i = 0; i < 26; i++) this.flies.push({ fx: Math.random(), fy: Math.random(),
        ph: Math.random() * 6.28, sp: 0.7 + Math.random() * 1.6, drift: 6 + Math.random() * 14,
        wisp: Math.random() < 0.5, s: 1.4 + Math.random() * 1.2 });
    }
    var ctx = this.ctx, band = this._viewBand(), t = this.time;
    var ffA = E.U.clamp((this._dn.stars - 0.25) / 0.75, 0, 1);
    var total = this.lowFx ? 10 : 26;
    for (var j = 0; j < total; j++) {
      var f = this.flies[j];
      var x = f.fx * this.W + Math.sin(t * f.sp * 0.6 + f.ph) * f.drift;
      var y = (band.bot - 150) + f.fy * 120 + Math.cos(t * f.sp + f.ph) * 9;
      if (wantWisps && f.wisp) {
        var wa = (0.38 + 0.27 * Math.sin(t * 1.8 + f.ph)) * this._fxMul();
        ctx.globalAlpha = wa; ctx.fillStyle = '#8df0e0';
        ctx.fillRect(x, y, f.s, f.s);
        if (!this.lowFx) {
          ctx.globalAlpha = wa * 0.4; ctx.fillStyle = '#4ad8c4';
          ctx.beginPath(); ctx.arc(x + f.s / 2, y + f.s / 2, 5, 0, 6.2832); ctx.fill();
        }
      } else if (wantFF && ffA > 0.03) {
        var fa = ffA * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.6 + f.ph))) * this._fxMul();
        ctx.globalAlpha = fa; ctx.fillStyle = '#e4ffa0';
        ctx.fillRect(x, y, f.s * 0.8, f.s * 0.8);
        if (!this.lowFx) {
          ctx.globalAlpha = fa * 0.4; ctx.fillStyle = '#b8e86a';
          ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 6.2832); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  },
  /* ================= [V11] PILAR DE LUZ DO LEVEL-UP (celebração visual) ================= */
  _drawPillar: function(delta){
    if (this.pillarT <= 0) return;
    this.pillarT -= delta;
    var T = 1.5, t = T - this.pillarT; // 0→1.5
    var ein = Math.min(1, t / 0.28), eout = Math.min(1, Math.max(0, this.pillarT) / 0.4);
    var ea = E.U.clamp(Math.min(ein, eout), 0, 1);
    if (ea <= 0.01) return;
    var ctx = this.ctx, cx = 165;
    var band = this._viewBand();
    var gy = Math.min(762, band.bot + 130); // base do pilar: visível mesmo com corte landscape
    var top = band.top + (band.bot - band.top) * 0.06;
    var w = 96;
    var g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, 'rgba(232,163,58,0)');
    g.addColorStop(0.32, 'rgba(232,180,90,' + (0.34 * ea).toFixed(3) + ')');
    g.addColorStop(0.5, 'rgba(255,244,214,' + (0.50 * ea).toFixed(3) + ')');
    g.addColorStop(0.68, 'rgba(232,180,90,' + (0.34 * ea).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(232,163,58,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - w / 2, top, w, gy - top);
    var g2 = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
    g2.addColorStop(0, 'rgba(255,250,230,0)');
    g2.addColorStop(0.5, 'rgba(255,252,240,' + (0.55 * ea).toFixed(3) + ')');
    g2.addColorStop(1, 'rgba(255,250,230,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(cx - 14, top + 20, 28, gy - top - 10);
    // anel de impacto no chão quando o pilar acende (ancorado no horizonte visível)
    if (!this._pillarRing && t > 0.26) {
      this._pillarRing = true;
      this._ring(cx, gy - 8, 8, 120, 'rgba(255,224,150,0.85)', 4, 0.7);
      this.addShake(0.12);
    }
    // motes radiantes subindo pela coluna
    if (!this.lowFx && Math.random() < 0.5) {
      this._part(3, cx + (Math.random() * 2 - 1) * 34, gy - Math.random() * 30,
        (Math.random() * 2 - 1) * 6, -(40 + Math.random() * 70),
        1.1, 1.6 + Math.random() * 1.4, '#ffe9b0', -20);
    }
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
    // [ART-10] o áudio ambiente acompanha o clima (crossfade suave no AudioContext)
    if (E.Audio && E.Audio.set_ambient) E.Audio.set_ambient(wk);
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
          if (E.Audio && E.Audio.thunder) E.Audio.thunder(true); // [ART-10] trovão próximo
        } else {
          this.boltPts = null;
          this.flashA = 0.20;
          this.addShake(0.08);
          if (E.Audio && E.Audio.thunder) E.Audio.thunder(false); // [ART-10] trovão distante
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
    var target = def ? Math.round(def.n * (0.35 + 0.65 * this.weatherBlend) * (this.lowFx ? 0.55 : 1)) : 0; // [AUDIT-C2]
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
          if (p.front && Math.random() < 0.34) {
            this._splash(p.x, this.GROUND_Y + 2 + p.gy);
            this._puddleRippleAt(p.x, this.GROUND_Y + 2 + p.gy); // [ART-11] ondulação na poça
          }
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
  /* ================= [ART-11] POÇAS REFLETIVAS (só render) ================= */
  _seedPuddles: function(){
    this.puddles.length = 0;
    // determinísticas por região (hash): o mesmo bioma sempre tem as mesmas poças
    for (var i = 0; i < 9; i++) {
      var h = this._hashStr(this.regionId + ':pd:' + i);
      var fx = (h % 1000) / 1000, fy = ((h >>> 10) % 1000) / 1000, fr = ((h >>> 20) % 1000) / 1000; // >>> sem sinal (h é uint32)
      var rx = 30 + fr * 64;
      if (rx < 8) rx = 8; // defesa extra: raio jamais negativo
      this.puddles.push({
        x: 26 + fx * (this.W - 52),
        y: this.GROUND_Y + 16 + fy * (this.H - this.GROUND_Y - 62),
        rx: rx, ry: rx * 0.34, ph: (h % 628) / 100, _gf: null, _sky: null
      });
    }
  },
  _puddleActive: function(){
    var W = this.WEATHERS[this.weather];
    return !!(W && W.rain) && this._rainStyle().mode !== 'ash'; // cinzas não empoçam
  },
  _puddleTick: function(delta){
    var tgt = this._puddleActive() ? 1 : 0;
    var rate = tgt ? (this.weather === 'tempestade' ? 0.20 : 0.11) : -0.045;
    this.puddleT = E.U.clamp(this.puddleT + rate * delta, 0, 1);
    for (var i = 0; i < this.ripples.length; i++) {
      var r = this.ripples[i];
      if (!r.on) continue;
      r.t += delta;
      if (r.t >= r.life) r.on = false;
    }
  },
  _puddleRippleAt: function(x, y){
    for (var i = 0; i < this.puddles.length; i++) {
      var p = this.puddles[i], dx = (x - p.x) / p.rx, dy = (y - p.y) / p.ry;
      if (dx * dx + dy * dy <= 1) { this._ripple(x, y); return; }
    }
  },
  _ripple: function(x, y){
    var r = this.ripples[this.rippleIdx];
    this.rippleIdx = (this.rippleIdx + 1) % this.RIPPLE_POOL;
    r.on = true; r.x = x; r.y = y; r.t = 0; r.life = 0.45 + Math.random() * 0.3;
  },
  _drawPuddles: function(){
    if (this.puddleT < 0.015) return;
    var ctx = this.ctx, t = this.time, P = this.puddleT;
    var col = this._rainStyle().cols[0]; // água toma a cor da chuva da região
    var heroX = 45 - this.heroLunge * 14;
    var enCX = this.enemyBoss ? 372 : 390;
    var evis = (1 - this.enemyFade) * (this.enemySpawn < 1 ? 0.4 + 0.6 * this.enemySpawn : 1);
    for (var i = 0; i < this.puddles.length; i++) {
      var p = this.puddles[i];
      var a = P * (0.86 + 0.14 * Math.sin(t * 0.7 + p.ph));
      // água (tinta do clima + fundo escuro + brilho de céu no espelho d'água)
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(' + col + ',' + (0.16 * a).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(6,9,18,' + (0.20 * a).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx * 0.92, p.ry * 0.9, 0, 0, 6.2832); ctx.fill();
      if (!p._sky) {
        p._sky = ctx.createLinearGradient(0, p.y - p.ry, 0, p.y + p.ry * 0.3);
        p._sky.addColorStop(0, 'rgba(190,215,245,0.5)');
        p._sky.addColorStop(1, 'rgba(190,215,245,0)');
      }
      ctx.save();
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.2832); ctx.clip();
      ctx.globalAlpha = 0.4 * a;
      ctx.fillStyle = p._sky;
      ctx.fillRect(p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 1.35);
      ctx.restore();
      // reflexos: clip na elipse + flip vertical + squash 0.62 + tremulação da água
      var wy = p.y + p.ry * 0.12, wob = Math.sin(t * 2.1 + p.ph) * 1.8;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.2832); ctx.clip();
      ctx.globalAlpha = 0.34 * a;
      ctx.translate(0, wy); ctx.scale(1, -0.62);
      var cf = this._petFrame(this.compKey, this.petAnim.pose);
      if (cf && cf.complete && cf.naturalWidth) ctx.drawImage(cf, 6 + wob, -176, 176, 176);
      var fr = this.heroFrames[this.heroAnim.pose] || [];
      var hImg = fr[this.heroAnim.f] || this.heroImg;
      if (hImg && hImg.complete && hImg.naturalWidth) ctx.drawImage(hImg, heroX + wob * 0.7, -240, 240, 240);
      var pf = this._petFrame(this.petKey, this.petAnim.pose);
      if (pf && pf.complete && pf.naturalWidth) ctx.drawImage(pf, 196 + wob, -76, 76, 76);
      if (evis > 0.02 && this.hasEnemy && this.enemyImg && this.enemyImg.complete && this.enemyImg.naturalWidth) {
        var sz = 240 * (this.enemyBoss ? 1.38 : (this.enemyMini ? 1.12 : 1));
        ctx.globalAlpha = 0.34 * a * evis;
        ctx.drawImage(this.enemyImg, enCX - 120 - (sz - 240) / 2 - wob * 0.7, -sz, sz, sz);
        // sheen aditivo: o reflexo das grandes figuras brilha na água
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.12 * a * evis;
        ctx.drawImage(this.enemyImg, enCX - 120 - (sz - 240) / 2 - wob * 0.7, -sz, sz, sz);
      }
      if (hImg && hImg.complete && hImg.naturalWidth) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.12 * a;
        ctx.drawImage(hImg, heroX + wob * 0.7, -240, 240, 240);
      }
      ctx.restore();
      // profundidade do reflexo + brilho de relâmpago + cintilância
      ctx.save();
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.2832); ctx.clip();
      if (!p._gf) {
        p._gf = ctx.createLinearGradient(0, wy + p.ry * 0.55, 0, wy + p.ry * 2.4);
        p._gf.addColorStop(0, 'rgba(0,0,0,0)');
        p._gf.addColorStop(1, 'rgba(4,6,12,0.42)');
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = p._gf;
      ctx.fillRect(p.x - p.rx, wy, p.rx * 2, p.ry * 2.4);
      if (this.flashA > 0.01) { // trovão espelhado na água
        ctx.globalAlpha = Math.min(0.55, this.flashA * 0.85) * a;
        ctx.fillStyle = 'rgba(215,228,255,1)';
        ctx.fillRect(p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
      }
      ctx.globalAlpha = 0.09 * a;
      ctx.fillStyle = 'rgba(220,235,255,1)';
      for (var sh = 0; sh < 3; sh++) {
        var sy2 = p.y - p.ry * 0.6 + ((t * 14 + p.ph * 9 + sh * 7) % (p.ry * 1.9));
        ctx.fillRect(p.x - p.rx * 0.55 + sh * p.rx * 0.3, sy2, p.rx * 0.5, 1);
      }
      ctx.restore();
      // menisco (borda superior iluminada)
      ctx.globalAlpha = 0.35 * a;
      ctx.strokeStyle = 'rgba(200,220,250,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    }
    // ondulações de impacto das gotas (sobre todas as poças)
    ctx.strokeStyle = 'rgba(200,220,250,0.55)';
    ctx.lineWidth = 1;
    for (var r2 = 0; r2 < this.ripples.length; r2++) {
      var rp = this.ripples[r2];
      if (!rp.on) continue;
      var pr = rp.t / rp.life;
      ctx.globalAlpha = (1 - pr) * 0.5 * P;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, 2 + pr * 11, (2 + pr * 11) * 0.34, 0, 0, 6.2832);
      ctx.stroke();
    }
    // solo encharcado (sheen sutil na faixa do chão)
    ctx.fillStyle = 'rgba(165,195,235,' + (0.045 * P).toFixed(3) + ')';
    ctx.fillRect(0, this.GROUND_Y, this.W, this.H - this.GROUND_Y);
    ctx.globalAlpha = 1;
  },
  /* ================= [ART-12] NEBLINA DENSA — PÂNTANO (só render) ================= */
  _fogBlob: function(rgb){
    var c = document.createElement('canvas'); c.width = 256; c.height = 128;
    var cx = c.getContext('2d');
    cx.translate(128, 64); cx.scale(1, 0.5);
    var g = cx.createRadialGradient(0, 0, 8, 0, 0, 122);
    g.addColorStop(0, 'rgba(' + rgb + ',0.85)');
    g.addColorStop(0.55, 'rgba(' + rgb + ',0.38)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    cx.fillStyle = g;
    cx.fillRect(-128, -128, 256, 256);
    return c;
  },
  _seedFog: function(rid){
    this.fogBanks.length = 0;
    this.fogDens = 1;
    if (rid !== 'pantano') return; // só o Pântano tem a neblina própria densa
    for (var i = 0; i < 12; i++) {
      var front = i >= 8;
      var w = 230 + Math.random() * 240;
      this.fogBanks.push({
        x: Math.random() * (this.W + 300) - 150,
        y: this.GROUND_Y - 175 + Math.random() * 215,
        w: w, h: w * (0.26 + Math.random() * 0.10),
        sp: (5 + Math.random() * 12) * (front ? 1.5 : 1),
        ph: Math.random() * 6.28,
        a: (front ? 0.13 : 0.10) + Math.random() * 0.09,
        front: front
      });
    }
  },
  _fogTick: function(delta){
    if (!this.fogBanks.length) return;
    // o clima engrossa a névoa (chuva +35%, tempestade +60%, nublado +18%)
    var tgt = 1;
    if (this.weather === 'chuva') tgt = 1.35;
    else if (this.weather === 'tempestade') tgt = 1.6;
    else if (this.weather === 'nublado') tgt = 1.18;
    this.fogDens += (tgt - this.fogDens) * Math.min(1, delta * 0.6);
    for (var i = 0; i < this.fogBanks.length; i++) {
      var f = this.fogBanks[i];
      f.x += f.sp * (0.5 + this.wind) * delta * 5; // deriva com o vento
      if (f.x - f.w / 2 > this.W + 40) f.x = -f.w / 2 - 30 - Math.random() * 60;
    }
  },
  _drawFog: function(front){
    if (!this.fogBanks.length) return;
    var ctx = this.ctx, t = this.time;
    var dens = this.fogDens * (0.85 + 0.15 * Math.sin(t * 0.23)); // respira
    for (var i = 0; i < this.fogBanks.length; i++) {
      var f = this.fogBanks[i];
      if (f.front !== front) continue;
      var blob = f.y < this.GROUND_Y - 45 ? this._fogBlobA : this._fogBlobB;
      ctx.globalAlpha = Math.min(0.5, f.a * dens * (0.8 + 0.2 * Math.sin(t * 0.5 + f.ph)) * (front ? 0.85 : 1));
      ctx.drawImage(blob, f.x - f.w / 2, f.y - f.h / 2, f.w, f.h);
    }
    ctx.globalAlpha = 1;
  },
  _drawGroundMist: function(){
    if (!this.fogBanks.length) return;
    var ctx = this.ctx;
    var g = ctx.createLinearGradient(0, this.GROUND_Y - 110, 0, this.GROUND_Y + 80);
    g.addColorStop(0, 'rgba(150,180,150,0)');
    g.addColorStop(0.55, 'rgba(150,180,150,' + (0.15 * this.fogDens).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(120,150,125,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, this.GROUND_Y - 110, this.W, 190);
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
    // relâmpago (ramificado; lowFx: traço único — [AUDIT-C2]) + flash de tela
    if (this.boltT > 0 && this.boltPts) {
      var bt = this.boltT / 0.26;
      var boltCol = this.regionId === 'deserto_cinzas' ? '255,190,110' :
        this.regionId === 'coracao' ? '255,120,150' : '215,228,255';
      ctx.save();
      ctx.globalAlpha = bt;
      if (this.lowFx) {
        ctx.strokeStyle = 'rgba(' + boltCol + ',0.95)';
        ctx.lineWidth = 2.4;
        this._strokeBolt(ctx);
      } else {
        ctx.strokeStyle = 'rgba(' + boltCol + ',0.32)';
        ctx.lineWidth = 6;
        this._strokeBolt(ctx);
        ctx.strokeStyle = 'rgba(' + boltCol + ',0.95)';
        ctx.lineWidth = 2;
        this._strokeBolt(ctx);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 0.8;
        this._strokeBolt(ctx);
      }
      ctx.restore();
    }
    if (this.flashA > 0.004) {
      ctx.fillStyle = 'rgba(210,222,255,' + Math.min(0.5, this.flashA * this._flashMul()).toFixed(3) + ')'; // [AUDIT-C1]
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
    this._seedFog(regionId);   // [ART-12] neblina do Pântano
    this._seedPuddles();       // [ART-11] poças determinísticas da região
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
    n = Math.max(1, Math.round(n * this._fxMul())); // [AUDIT-C2]
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, sp = 60 + Math.random() * 160;
      this._part(0, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, 0.3 + Math.random() * 0.25,
        1.5 + Math.random() * 2, Math.random() < 0.5 ? '#ffd27a' : '#fff3d0', 300);
    }
  },
  _blood: function(x, y, n, color){
    n = Math.max(1, Math.round(n * this._fxMul())); // [AUDIT-C2]
    for (var i = 0; i < n; i++) {
      var a = -1.2 + Math.random() * 2.4, sp = 50 + Math.random() * 130;
      this._part(1, x, y - 10, Math.sin(a) * sp * 0.6, -Math.abs(Math.cos(a)) * sp - 30,
        0.5 + Math.random() * 0.3, 1.5 + Math.random() * 2.2, color || '#c22e4a', 420);
    }
  },
  _dust: function(x, y, n){
    n = Math.max(1, Math.round(n * this._fxMul())); // [AUDIT-C2]
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, sp = 20 + Math.random() * 70;
      this._part(2, x + (Math.random() * 90 - 45), y - Math.random() * 40,
        Math.cos(a) * sp, -10 - Math.random() * 30, 0.55 + Math.random() * 0.45,
        4 + Math.random() * 7, 'rgba(150,140,160,0.5)', -30);
    }
  },
  _motes: function(x, y, n, color){
    n = Math.max(1, Math.round(n * this._fxMul())); // [AUDIT-C2]
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
  addShake: function(i){
    // [AUDIT-C1] fotossensibilidade: tremor amenizado (não remove o feedback, reduz a amplitude)
    this.shake = Math.min(1.2, Math.max(this.shake, i * (this.reducedFx ? 0.3 : 1)));
  },
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
    /* [AUDIT-C2] medição de frame real (delta cru do rAF, pré-clamp) —
       média móvel decide o modo leve a cada 2s quando perfMode=auto */
    var raw = this._rawDelta > 0 && this._rawDelta < 1 ? this._rawDelta : delta;
    this._perfAvg += (raw - this._perfAvg) * 0.04;
    this._perfT += delta;
    if (this._perfT > 2) {
      this._perfT = 0;
      if (this.perfMode === 'low') this.lowFx = true;
      else if (this.perfMode === 'high') this.lowFx = false;
      else {
        if (this._perfAvg > 0.027) this.lowFx = true;
        else if (this._perfAvg < 0.019) this.lowFx = false;
      }
    }
    // [V3] HIT-STOP: no crítico, a camada VISUAL quase congela por ~85ms
    // (relógio de animação/partículas); a simulação do combate segue intacta.
    if (this.hitStopT > 0) { this.hitStopT -= delta; delta = delta * 0.06; }
    this._weatherTick(delta);          // clima: vento/relâmpagos/precipitação
    this._puddleTick(delta);           // [ART-11] poças encharcando/secando
    this._fogTick(delta);              // [ART-12] deriva e densidade da névoa
    this._dnTick(delta);               // [V8] ciclo dia/noite (interpolação suave)
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
    // ---- 1.1) [V8/V10] estrelas da noite (atrás da coroa do eclipse) ----
    this._drawStars(delta);
    // ---- 1.2) [V2] eclipse progressivo — o céu consome-se conforme o ciclo avança
    this._drawEclipseCorona();
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
    // ---- 4.5) [ART-12] névoa densa (camada de trás + bruma do solo) ----
    this._drawFog(false);
    this._drawGroundMist();
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
    // ---- 6.2) [V3] arco de corte do crítico
    this._drawSlashes(delta);
    // ---- 6.1) [AUDIT-B1] VFX de estado (escudo/DOT/buff/stun — leitura do Combat) ----
    this._drawStatusFx(delta);
    // ---- 6.4) [ART-11] poças refletivas (reflexo das entidades na chuva) ----
    this._drawPuddles();
    // ---- 6.5) [V11] pilar de luz do level-up (celebração) ----
    this._drawPillar(delta);
    // ---- 7) partículas de combate + estação em primeiro plano ----
    this._drawParts(delta);
    this._drawSeasonAtmo(delta, true);
    // ---- 7.2) clima à frente: precipitação grossa + splash + relâmpago ----
    this._drawWeatherFront(delta);
    // ---- 7.25) [V9] vagalumes da noite / almas do abismo ----
    this._drawFlies(delta);
    // ---- 7.3) [ART-12] névoa de frente (vela a chuva junto à câmera) ----
    this._drawFog(true);
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
    // ---- 7.6) [V8] wash do ciclo dia/noite + brilho de horizonte ----
    var D8 = this._dn;
    if (D8.dark > 0.004) {
      ctx.fillStyle = 'rgba(' + D8.darkCol + ',' + (D8.dark * this._fxMul()).toFixed(3) + ')';
      ctx.fillRect(-30, -30, W + 60, H + 60);
    }
    if (D8.glow > 0.004) { // amanhecer/entardecer: brilho quente junto ao horizonte
      // horizonte VISÍVEL: em landscape o cover corta abaixo do GROUND_Y — ancora na banda
      var hz = Math.min(this.GROUND_Y, this._viewBand().bot);
      var gH = ctx.createLinearGradient(0, hz - 260, 0, hz + 12);
      gH.addColorStop(0, 'rgba(' + D8.glowCol + ',0)');
      gH.addColorStop(0.62, 'rgba(' + D8.glowCol + ',' + (D8.glow * 0.42 * this._fxMul()).toFixed(3) + ')');
      gH.addColorStop(1, 'rgba(' + D8.glowCol + ',' + (D8.glow * this._fxMul()).toFixed(3) + ')');
      ctx.fillStyle = gH;
      ctx.fillRect(0, hz - 260, W, 272);
      // faixa quente e fina rente à linha do solo (leitura garantida do período)
      var gH2 = ctx.createLinearGradient(0, hz - 26, 0, hz + 2);
      gH2.addColorStop(0, 'rgba(' + D8.glowCol + ',0)');
      gH2.addColorStop(1, 'rgba(' + D8.glowCol + ',' + (D8.glow * 1.15 * this._fxMul()).toFixed(3) + ')');
      ctx.fillStyle = gH2;
      ctx.fillRect(0, hz - 26, W, 28);
    }
    // ---- 7.7) [AUDIT-B3] vinheta de perigo — herói < 30% de vida pulsa vermelho nas bordas ----
    if (this.heroHpShown < 0.3 && this.heroHpShown > 0.001) {
      var hp = this.heroHpShown / 0.3;
      var pulse = 0.5 + 0.5 * Math.sin(this.time * 5.2);
      var vA = (0.34 - 0.2 * hp) * (0.55 + 0.45 * pulse) * this._flashMul() * 1.2;
      if (vA > 0.004) {
        var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.62);
        vg.addColorStop(0, 'rgba(120,10,24,0)');
        vg.addColorStop(1, 'rgba(150,14,28,' + vA.toFixed(3) + ')');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }
    }
    // ---- 8) barras de vida ----
    this._bar(ctx, 20, 470, 230, 30, this.heroHpShown, this.heroGhost, '#3a9e5f', '#7a3030', this.heroHpLabel, '#58e07a');
    this._bar(ctx, 290, 470, 230, 30, this.enemyHpShown, this.enemyGhost, '#d0455f', '#7a3030', this.enemyHpLabel, '#ff7a8a');
    this.heroGhost = this._ghost(this.heroGhost, this.heroHpShown, delta);
    this.enemyGhost = this._ghost(this.enemyGhost, this.enemyHpShown, delta);
    // ---- 9) dano flutuante ----
    this._drawFloats(delta);
    // ---- 9.5) [V6] orbes de loot voando ao HUD
    this._drawLootOrbs(delta);
    // ---- 10) título da região ([V5] placa do ciclo: numeral + filetes + glifo de eclipse) ----
    if (this.regionTitleT > 0) {
      this.regionTitleT -= delta;
      var tIn = 2.4 - this.regionTitleT;
      var a = Math.min(1, Math.min(this.regionTitleT, tIn) * 2);
      var ea2 = E.U.clamp(a, 0, 1);
      var slide2 = (1 - Math.min(1, tIn * 2.4)) * 14;
      var name2 = (this._regionName() || '').toUpperCase();
      var rom2 = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][this._regionIndex()] || '';
      var band2 = this._viewBand();
      var yC = band2.top + (band2.bot - band2.top) * 0.10 + slide2;
      var acc2 = this.pal ? this.pal.accent : '#e8a33a';
      ctx.textAlign = 'center';
      ctx.font = '700 26px ' + (this.fontReady ? 'Cinzel,' : '') + ' "Courier New",monospace';
      ctx.globalAlpha = ea2 * 0.92;
      ctx.fillStyle = '#000';
      ctx.fillText(name2, W / 2 + 2, yC + 2);
      ctx.fillStyle = acc2;
      ctx.fillText(name2, W / 2, yC);
      var tw2 = ctx.measureText(name2).width;
      // filetes com losango + numeral da região no ciclo
      ctx.strokeStyle = acc2; ctx.lineWidth = 1;
      ctx.globalAlpha = ea2 * 0.55;
      ctx.beginPath();
      ctx.moveTo(W / 2 - tw2 / 2 - 76, yC - 9); ctx.lineTo(W / 2 - tw2 / 2 - 18, yC - 9);
      ctx.moveTo(W / 2 + tw2 / 2 + 18, yC - 9); ctx.lineTo(W / 2 + tw2 / 2 + 76, yC - 9);
      ctx.stroke();
      ctx.globalAlpha = ea2 * 0.8;
      ctx.fillStyle = acc2;
      ctx.font = '700 11px ' + (this.fontReady ? 'Cinzel,' : '') + ' "Courier New",monospace';
      ctx.fillText(E.DM.tr('region_word') + ' ' + rom2, W / 2, yC + 22);
      // glifo de eclipse (mini lua/sol) à esquerda do filete
      var gx = W / 2 - tw2 / 2 - 86;
      ctx.beginPath(); ctx.arc(gx, yC - 12, 5, 0, 6.2832);
      ctx.fillStyle = '#0a0614'; ctx.fill();
      ctx.strokeStyle = acc2; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // ---- 10.5) [V1] intro cinematográfica do chefe (escurecimento + placa) ----
    this._drawBossIntro(delta);
    // ---- chip da estação/clima (refresh barato p/ troca de idioma) ----
    this._chipT += delta;
    if (this._chipT > 2) { this._chipT = 0; this._band = null; this._updateChip(); this._updateWeatherChip(); }
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
    // ---- [V4] aura de raridade do equipamento sob o herói (leitura de E.Inv) ----
    this._drawHeroAura(t, heroX, heroY);
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
  /* ================= [AUDIT-B1] VFX DE ESTADO (só leitura de E.Combat) =================
     As 4 habilidades tinham efeitos "invisíveis" — a cena agora REAGUE:
     · guarda_sombras → bolha arcânica girando ao redor do herói (hero_shield>0)
     · cataclismo     → brasas douradas em órbita no herói (_buff_time>0)
     · sedenta        → miasma roxa subindo do inimigo (_dot_time>0)
     · lâmina evoluída→ estrelas de atordoamento sobre o inimigo (_stun_t>0) */
  _drawStatusFx: function(delta){
    var C = E.Combat;
    if (!C || !C.active) return;
    var ctx = this.ctx, t = this.time;
    var hl = this.heroLunge;
    var heroX = 45 - hl * 14, heroY = 525 + Math.sin(t / 240) * 2.5;
    var hcx = heroX + 120, hcy = heroY + 120;
    var bossScale = this.enemyBoss ? 1.38 : (this.enemyMini ? 1.12 : 1);
    var enCX = this.enemyBoss ? 372 : 390;
    var enY = 525 + Math.sin(t / 200 + 2) * 2.5;
    var ecy = enY + 108;
    // 1) escudo arcano (guarda_sombras)
    if (C.hero_shield > 0.5) {
      var sp = 0.5 + 0.5 * Math.sin(t * 3.1);
      ctx.save();
      // brilho interno suave (leitura imediata: "estou protegido")
      var sg = ctx.createRadialGradient(hcx, hcy, 40, hcx, hcy, 120);
      sg.addColorStop(0, 'rgba(111,179,255,0)');
      sg.addColorStop(0.8, 'rgba(111,179,255,' + (0.10 + 0.06 * sp).toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(140,200,255,0.02)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(hcx, hcy, 120, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.42 + 0.2 * sp;
      ctx.strokeStyle = '#8ec4ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hcx, hcy, 108 + sp * 4, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = 0.5 + 0.2 * sp;
      ctx.strokeStyle = '#b7dcff';
      ctx.lineWidth = 1.4;
      for (var i = 0; i < 3; i++) { // arcos de runa girando
        var a0 = t * 1.4 + i * 2.094;
        ctx.beginPath(); ctx.arc(hcx, hcy, 116, a0, a0 + 1.05); ctx.stroke();
      }
      ctx.restore();
    }
    // 2) buff ofensivo (cataclismo): brasas douradas em órbita
    if (C._buff_time > 0) {
      var n = this.lowFx ? 4 : 7;
      ctx.save();
      for (var oi = 0; oi < n; oi++) {
        var ang = t * 2.1 + oi * 6.2832 / n;
        var ox = hcx + Math.cos(ang) * 86;
        var oy = hcy + Math.sin(ang * 1.7) * 60;
        ctx.globalAlpha = 0.45 + 0.3 * Math.sin(t * 4 + oi);
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(ox, oy, 3, 3);
      }
      ctx.restore();
    }
    if (!this.hasEnemy || this.enemyFade > 0) return;
    var evis = this.enemySpawn < 1 ? 0.4 + 0.6 * this.enemySpawn : 1;
    // 3) DOT (sedenta): miasma roxa subindo do inimigo
    if (C._dot_time > 0) {
      var dn = this.lowFx ? 2 : 4;
      ctx.save();
      for (var di = 0; di < dn; di++) {
        var ph = (t * 0.65 + di * 0.41) % 1;      // 0→1 ciclo contínuo
        var dx2 = Math.sin(t * 4.1 + di * 1.7) * 26;
        ctx.globalAlpha = (1 - ph) * 0.5 * evis;
        ctx.fillStyle = '#9b59d0';
        ctx.beginPath();
        ctx.arc(enCX + dx2, ecy - ph * 130, 5 + ph * 9, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
    }
    // 4) stun (lâmina do eclipse evoluída): estrelas girando sobre a cabeça
    if (C._stun_t > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, C._stun_t * 2) * evis;
      ctx.fillStyle = '#ffe9a8';
      ctx.strokeStyle = 'rgba(255,233,168,0.7)';
      ctx.lineWidth = 1;
      for (var si = 0; si < 3; si++) {
        var sa = t * 3.4 + si * 2.094;
        var sx3 = enCX + Math.cos(sa) * 40 * bossScale;
        var sy3 = enY - 24 * bossScale + Math.sin(sa) * 10;
        ctx.beginPath(); ctx.arc(sx3, sy3, 2.4, 0, 6.2832); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx3 - 5, sy3); ctx.lineTo(sx3 + 5, sy3);
        ctx.moveTo(sx3, sy3 - 5); ctx.lineTo(sx3, sy3 + 5);
        ctx.stroke();
      }
      ctx.restore();
    }
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
  /* ================= [V1-V7] v1.7.0 "Herdeiro do Eclipse" (só render) ================= */
  _hexA: function(hex, a){
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  },
  _regionIndex: function(){
    var rs = E.DM.cfg_regions.regions;
    for (var i = 0; i < rs.length; i++) if (rs[i].id === this.regionId) return i;
    return 0;
  },
  /* banda VISÍVEL do canvas em coordenadas lógicas — o CSS usa object-fit:cover
     (object-position 50% 42%), então em landscape o corte vertical esconde o topo.
     Elementos do céu (coroa/placas) se posicionam pela banda p/ aparecer sempre. */
  _viewBand: function(){
    if (this._band) return this._band;
    var b = { top: 0, bot: this.H };
    try {
      var r = this.cv.getBoundingClientRect();
      if (r.width > 2 && r.height > 2) {
        var sc = Math.max(r.width / this.W, r.height / this.H); // cover
        var cropY = (this.H * sc - r.height) / sc;
        if (cropY > 0) { b.top = cropY * 0.42; b.bot = this.H - cropY * 0.58; }
      }
    } catch (e) {}
    this._band = b;
    return b;
  },
  _eclipsePhase: function(){ // 0 (Bosque) → 1 (Abismo: eclipse total)
    var rs = E.DM.cfg_regions.regions;
    return rs.length > 1 ? this._regionIndex() / (rs.length - 1) : 0;
  },
  _bakeCorona: function(){ // sprites do eclipse pré-renderizados (1× por sessão)
    try {
      var S = 240;
      var c1 = document.createElement('canvas'); c1.width = c1.height = S;
      var x1 = c1.getContext('2d');
      var g = x1.createRadialGradient(S/2, S/2, S*0.16, S/2, S/2, S*0.30);
      g.addColorStop(0, 'rgba(8,5,16,1)'); g.addColorStop(0.78, 'rgba(8,5,16,0.97)');
      g.addColorStop(1, 'rgba(8,5,16,0)');
      x1.fillStyle = g; x1.beginPath(); x1.arc(S/2, S/2, S*0.30, 0, 6.2832); x1.fill();
      x1.strokeStyle = 'rgba(255,214,140,0.95)'; x1.lineWidth = 2.2;
      x1.beginPath(); x1.arc(S/2, S/2, S*0.265, 0, 6.2832); x1.stroke();
      x1.strokeStyle = 'rgba(255,180,80,0.35)'; x1.lineWidth = 6;
      x1.beginPath(); x1.arc(S/2, S/2, S*0.285, 0, 6.2832); x1.stroke();
      this._coronaDisc = c1;
      var c2 = document.createElement('canvas'); c2.width = c2.height = S;
      var x2 = c2.getContext('2d'); x2.translate(S/2, S/2);
      x2.strokeStyle = 'rgba(255,200,120,0.8)'; x2.lineCap = 'round';
      for (var i = 0; i < 12; i++) {
        var a2 = i * 6.2832 / 12;
        var r0 = S*0.30 + (i % 2 ? 5 : 13), r1 = r0 + (i % 2 ? 13 : 28);
        x2.globalAlpha = i % 2 ? 0.32 : 0.65; x2.lineWidth = i % 2 ? 1.4 : 2.2;
        x2.beginPath();
        x2.moveTo(Math.cos(a2) * r0, Math.sin(a2) * r0);
        x2.lineTo(Math.cos(a2 + 0.05) * r1, Math.sin(a2 + 0.05) * r1);
        x2.stroke();
      }
      this._coronaRays = c2;
    } catch (e) { this._coronaDisc = this._coronaRays = null; }
  },
  _drawEclipseCorona: function(){
    if (!this._coronaDisc) this._bakeCorona();
    if (!this._coronaDisc) return;
    var ph = this._eclipsePhase();
    if (ph <= 0.001) return;
    var band = this._viewBand();
    var ctx = this.ctx, cx = this.W * 0.72, cy = band.top + (band.bot - band.top) * 0.16, R = 92;
    ctx.save();
    // [V2] céu afundando na escuridão conforme o ciclo avança (Abismo = total)
    if (ph > 0.55) {
      ctx.globalAlpha = (ph - 0.55) * 0.24;
      ctx.fillStyle = '#06040c';
      ctx.fillRect(-30, -30, this.W + 60, this.H + 60);
    }
    // raios da coroa girando devagar
    ctx.globalAlpha = Math.min(0.8, 0.10 + 0.5 * ph) * this._flashMul();
    ctx.translate(cx, cy); ctx.rotate(this.time * 0.11);
    ctx.drawImage(this._coronaRays, -R * 1.35, -R * 1.35, R * 2.7, R * 2.7);
    ctx.restore();
    // disco do eclipse
    ctx.save();
    ctx.globalAlpha = Math.min(0.9, 0.16 + 0.55 * ph);
    ctx.drawImage(this._coronaDisc, cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
  },
  _spawnSlash: function(){
    var s = this.slashes[this.slashIdx];
    this.slashIdx = (this.slashIdx + 1) % this.SLASH_POOL;
    s.on = true; s.x = this.enemyBoss ? 372 : 390; s.y = 645;
    s.t = 0; s.life = 0.24; s.flip = Math.random() < 0.5;
  },
  _drawSlashes: function(delta){
    var ctx = this.ctx;
    for (var i = 0; i < this.slashes.length; i++) {
      var s = this.slashes[i]; if (!s.on) continue;
      s.t += delta; var pr = s.t / s.life;
      if (pr >= 1) { s.on = false; continue; }
      var ease = 1 - Math.pow(1 - pr, 2.2);
      var r = 64 + ease * 58, a0 = (s.flip ? 2.6 : -2.3) + ease * 0.5;
      ctx.save();
      ctx.translate(s.x, s.y); if (s.flip) ctx.scale(-1, 1);
      ctx.globalAlpha = (1 - pr) * 0.95;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 7 * (1 - pr * 0.55);
      ctx.beginPath(); ctx.arc(0, 0, r, a0 - 2.1, a0 + 0.35); ctx.stroke();
      ctx.strokeStyle = '#fff8e0'; ctx.lineWidth = 3 * (1 - pr * 0.6);
      ctx.beginPath(); ctx.arc(0, 0, r - 7, a0 - 1.9, a0 + 0.3); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,160,60,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + 10, a0 - 1.7, a0 + 0.25); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
  _heroAuraOrder: function(){ // maior raridade equipada (cacheado; inválido = -1)
    if (this._auraOrder >= 0) return this._auraOrder;
    var best = 0, eq = E.Inv ? E.Inv.equipped : null;
    if (eq) for (var s in eq) {
      var it = eq[s]; if (!it) continue;
      var ro = E.Inv.rarity_order(it.rarity || 'comum');
      if (ro > best) best = ro;
    }
    this._auraOrder = best;
    return best;
  },
  _drawHeroAura: function(t, heroX, heroY){
    var ord = this._heroAuraOrder();
    var col = this.RARITY_AURA[ord];
    if (!col) return;
    var ctx = this.ctx, cx = heroX + 120, cy = 762;
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.3);
    ctx.save();
    ctx.globalAlpha = (0.40 + 0.14 * pulse) * (this.lowFx ? 0.6 : 1);
    ctx.translate(cx, cy); ctx.scale(1, 0.29);
    var g = ctx.createRadialGradient(0, 0, 8, 0, 0, 130);
    g.addColorStop(0, this._hexA(col, 0.85)); g.addColorStop(1, this._hexA(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 118, 0, 6.2832); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.46 + 0.2 * pulse;
    ctx.strokeStyle = col; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(cx, cy, 98, 27, 0, 0, 6.2832); ctx.stroke();
    ctx.restore();
  },
  _spawnLootOrb: function(rar){
    var o = this.orbs[this.orbIdx];
    this.orbIdx = (this.orbIdx + 1) % this.ORBS_POOL;
    o.on = true; o.x0 = 385; o.y0 = 600; o.t = 0; o.life = 0.95;
    o.color = this.RARITY_ORB[rar] || '#e8a33a';
  },
  _drawLootOrbs: function(delta){
    var ctx = this.ctx, W = this.W;
    for (var i = 0; i < this.orbs.length; i++) {
      var o = this.orbs[i]; if (!o.on) continue;
      o.t += delta; var pr = o.t / o.life;
      if (pr >= 1) {
        o.on = false;
        this._ring(W - 58, 34, 4, 26, this._hexA(o.color, 0.8), 2, 0.35);
        continue;
      }
      var e = pr * pr * (3 - 2 * pr); // smoothstep
      var x1 = W - 58, y1 = 30, cxp = 470, cyp = 260;
      var mx = (1-e)*(1-e)*o.x0 + 2*(1-e)*e*cxp + e*e*x1;
      var my = (1-e)*(1-e)*o.y0 + 2*(1-e)*e*cyp + e*e*y1;
      ctx.save();
      ctx.globalAlpha = pr > 0.75 ? 1 - (pr - 0.75) / 0.25 * 0.7 : 1;
      var g = ctx.createRadialGradient(mx, my, 0, mx, my, 14);
      g.addColorStop(0, this._hexA(o.color, 0.95)); g.addColorStop(1, this._hexA(o.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, 14, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.globalAlpha *= 0.9;
      ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      var e2 = Math.max(0, e - 0.08); // rastro
      var tx = (1-e2)*(1-e2)*o.x0 + 2*(1-e2)*e2*cxp + e2*e2*x1;
      var ty = (1-e2)*(1-e2)*o.y0 + 2*(1-e2)*e2*cyp + e2*e2*y1;
      ctx.strokeStyle = this._hexA(o.color, 0.5); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(mx, my); ctx.stroke();
      ctx.restore();
    }
  },
  _drawBossIntro: function(delta){
    if (this.bossIntroT <= 0) return;
    this.bossIntroT -= delta;
    var T = 2.3, t = T - this.bossIntroT;          // 0→2.3
    var inA = Math.min(1, t / 0.35);               // entrada rápida
    var outA = Math.min(1, Math.max(0, this.bossIntroT) / 0.45); // saída suave
    var ea = E.U.clamp(Math.min(inA, outA), 0, 1);
    if (ea <= 0) return;
    var ctx = this.ctx, W = this.W;
    // escurecimento do mundo (fotossensibilidade reduz)
    var dim = (this.reducedFx ? 0.16 : 0.40) * ea;
    ctx.fillStyle = 'rgba(4,2,8,' + dim.toFixed(3) + ')';
    ctx.fillRect(-30, -30, W + 60, this.H + 60);
    // placa desce e assenta (posição ciente da banda visível p/ landscape)
    var band = this._viewBand();
    var py = band.top + (band.bot - band.top) * 0.32 - 26 * (1 - Math.pow(1 - inA, 3));
    var name = (this.bossIntroName || '').toUpperCase();
    ctx.textAlign = 'center';
    ctx.globalAlpha = ea;
    ctx.fillStyle = 'rgba(10,6,16,0.82)';
    ctx.fillRect(W / 2 - 210, py - 44, 420, 88);
    ctx.strokeStyle = 'rgba(232,163,58,0.85)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(W / 2 - 210, py - 44, 420, 88);
    // cantos dourados internos
    ctx.fillStyle = 'rgba(232,163,58,0.9)';
    ctx.fillRect(W / 2 - 210, py - 44, 14, 2); ctx.fillRect(W / 2 - 210, py - 44, 2, 14);
    ctx.fillRect(W / 2 + 196, py - 44, 14, 2); ctx.fillRect(W / 2 + 208, py - 44, 2, 14);
    ctx.fillRect(W / 2 - 210, py + 42, 14, 2); ctx.fillRect(W / 2 - 210, py + 30, 2, 14);
    ctx.fillRect(W / 2 + 196, py + 42, 14, 2); ctx.fillRect(W / 2 + 208, py + 30, 2, 14);
    // tag + nome (auto-ajusta p/ nomes longos) + subtítulo da região
    var fnt = this.fontReady ? 'Cinzel,' : '';
    ctx.fillStyle = '#e8a33a';
    ctx.font = '700 11px ' + fnt + ' "Courier New",monospace';
    ctx.fillText(E.DM.tr('boss_tag'), W / 2, py - 20);
    var fs = 24;
    ctx.font = '900 ' + fs + 'px ' + fnt + ' "Courier New",monospace';
    while (fs > 15 && ctx.measureText(name).width > 380) {
      fs -= 2; ctx.font = '900 ' + fs + 'px ' + fnt + ' "Courier New",monospace';
    }
    ctx.fillStyle = '#000'; ctx.fillText(name, W / 2 + 1, py + 9);
    ctx.fillStyle = '#fff2d8'; ctx.fillText(name, W / 2, py + 8);
    ctx.font = '700 10px ' + fnt + ' "Courier New",monospace';
    ctx.fillStyle = 'rgba(232,163,58,0.8)';
    ctx.fillText(this.bossIntroSub || '', W / 2, py + 30);
    ctx.globalAlpha = 1;
  },
  _regionName: function(){
    var rs = E.DM.cfg_regions.regions;
    for (var i = 0; i < rs.length; i++) if (rs[i].id === this.regionId) return rs[i].name;
    return '';
  }
};
