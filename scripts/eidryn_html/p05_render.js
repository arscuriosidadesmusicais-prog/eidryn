'use strict';
/* =====================================================================
   p05_render.js — Renderizador canvas do combate (apresentação pura)
   Porta dos conceitos de combat_screen.gd: parallax 3 camadas por região,
   sprites, barras com ghost trail, dano flutuante (pool 14), screenshake.
   Espaço de desenho 540×960 (equivalente ½ do 1080×1920 do Godot).
   ===================================================================== */
E.Rfx = {
  W: 540, H: 960, BG_W: 540,
  cv: null, ctx: null,
  layers: [], regionCache: {}, regionId: '',
  heroImg: null, enemyImg: null, enemySpriteKey: '',
  heroHpShown: 1, enemyHpShown: 1, heroGhost: 1, enemyGhost: 1,
  heroHpLabel: '', enemyHpLabel: '',
  heroLunge: 0, enemyLunge: 0, enemyFade: 0,
  floats: [], floatIdx: 0, shake: 0, hasEnemy: false,
  FLOAT_POOL: 14,

  init: function(){
    this.cv=document.getElementById('cv');
    this.ctx=this.cv.getContext('2d');
    this.ctx.imageSmoothingEnabled=false;
    var self=this;
    this.heroImg=this._img(E.IMG['hero/hero']);
    for(var i=0;i<this.FLOAT_POOL;i++) this.floats.push({on:false,x:0,y:0,text:'',color:'#fff',size:20,t:0});
    E.BUS.on('enemy_spawned', function(e){
      var key=e.sprite||'enemy_bosque_vidro_0';
      self.enemySpriteKey=key;
      self.enemyImg=self._img(E.IMG['enemies/'+key])||self._img(E.IMG['enemies/enemy_generic']);
      self.hasEnemy=true; self.enemyFade=0;
      self.enemyHpShown=0; self.heroHpShown=0;
      var el=document.getElementById('enemy-name');
      var em=document.getElementById('enemy-mods');
      if(el) el.textContent=e.name||'';
      if(em){
        var tags='';
        var mods=e.modifiers||[];
        for(var i=0;i<mods.length;i++) tags+='['+mods[i]+'] ';
        em.textContent=tags;
      }
    });
    E.BUS.on('enemy_hp_changed', function(hp, max_hp){
      self.enemyHpShown=E.U.clamp(hp/Math.max(max_hp,1),0,1);
      self.enemyHpLabel=E.U.fmt(Math.max(hp,0))+' / '+E.U.fmt(max_hp);
    });
    E.BUS.on('hero_hp_changed', function(hp, max_hp){
      self.heroHpShown=E.U.clamp(hp/Math.max(max_hp,1),0,1);
      self.heroHpLabel=E.U.fmt(Math.max(hp,0))+' / '+E.U.fmt(max_hp);
    });
    E.BUS.on('floating_damage', function(amount, crit, side, color){
      self._float(amount, crit, side, color);
    });
    E.BUS.on('screenshake', function(i){ self.shake=Math.max(self.shake, i); });
    E.BUS.on('enemy_damaged', function(){ self.heroLunge=1; });
    E.BUS.on('hero_damaged', function(){ self.enemyLunge=1; });
    E.BUS.on('enemy_killed', function(){ self.enemyFade=0.0001; });
    E.BUS.on('region_changed', function(rid){ self.setRegion(rid); });
    this.setRegion('bosque_vidro');
  },
  _img: function(dataUri){
    if(!dataUri) return null;
    var im=new Image();
    im.src=dataUri;
    return im;
  },
  _hashStr: function(s){
    var h=5381;
    for(var i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))>>>0;
    return h;
  },
  /* ---------- REGIÃO / PARALLAX (cache por região) ---------- */
  setRegion: function(regionId){
    if(this.regionId===regionId) return;
    this.regionId=regionId;
    var region=null, rs=E.DM.cfg_regions.regions;
    for(var i=0;i<rs.length;i++) if(rs[i].id===regionId) region=rs[i];
    if(!region) return;
    if(!this.regionCache[regionId]) this.regionCache[regionId]=this._buildRegion(region);
    this.layers=this.regionCache[regionId];
  },
  _buildRegion: function(region){
    var pal=region.palette, out=[];
    var self=this;
    // céu (gradiente) — camada 0, speed 0
    var sky=document.createElement('canvas');
    sky.width=8; sky.height=this.H;
    var sctx=sky.getContext('2d');
    var grad=sctx.createLinearGradient(0,0,0,this.H);
    grad.addColorStop(0,pal.sky_top); grad.addColorStop(1,pal.sky_bot);
    sctx.fillStyle=grad; sctx.fillRect(0,0,8,this.H);
    out.push({canvas:null, sky:sky, speed:0, x:0});
    // silhuetas far/mid/near
    var keys=['far','mid','near'], heights=[180,260,360], speeds=[4,10,21];
    for(var i=0;i<3;i++){
      var c=document.createElement('canvas');
      c.width=this.BG_W*2; c.height=heights[i];
      var cx=c.getContext('2d');
      var rng=E.U.rng(this._hashStr(region.id+'_'+keys[i]));
      var y=heights[i];
      while(y>0){
        var seg_h=rng.randi_range(20,70), seg_w=rng.randi_range(30,100);
        cx.fillStyle=pal[keys[i]];
        var yy=Math.max(0, y-seg_h);
        cx.fillRect(0, yy, this.BG_W*2, y-yy);
        // pixels claros no topo (faíscas de vidro/neve)
        cx.fillStyle='rgba(255,255,255,0.10)';
        for(var x=0;x<this.BG_W*2;x+=48){
          if(rng.randf()<0.35) cx.fillRect(x+rng.randi_range(0,40), yy, 2, 2);
        }
        y=yy;
        if(y<=0) break;
      }
      out.push({canvas:c, speed:speeds[i], x:0});
    }
    return out;
  },
  /* ---------- DANO FLUTUANTE (pool 14) ---------- */
  _float: function(amount, crit, side, color){
    var f=this.floats[this.floatIdx];
    this.floatIdx=(this.floatIdx+1)%this.FLOAT_POOL;
    var base_x= side==='hero'?125:390;
    f.on=true; f.x=base_x+(Math.random()*60-30); f.y=515;
    f.text= amount===0? 'MISS' : E.U.fmt(amount);
    f.color=color||'#fff';
    f.size=crit?32:20;
    f.rise=crit?80:50;
    f.t=0;
  },
  banner: function(txt, color){
    var el=document.getElementById('banner');
    if(!el) return;
    el.textContent=txt;
    el.style.color=color||'#e8a33a';
    el.style.opacity='1';
    clearTimeout(this._bannerTo);
    this._bannerTo=setTimeout(function(){ el.style.opacity='0'; }, 1100);
  },
  /* ---------- FRAME ---------- */
  render: function(delta){
    var ctx=this.ctx, W=this.W, H=this.H;
    ctx.save();
    // screenshake
    if(this.shake>0.001){
      ctx.translate((Math.random()*2-1)*this.shake*7, (Math.random()*2-1)*this.shake*7);
      this.shake=Math.max(0, this.shake-delta*2);
    }
    ctx.clearRect(-20,-20,W+40,H+40);
    // 1) céu
    if(this.layers.length>0){
      var sky=this.layers[0].sky;
      ctx.drawImage(sky, 0, 0, 8, sky.height, 0, 0, W, H);
    }
    // 2) silhuetas com parallax
    for(var i=1;i<this.layers.length;i++){
      var L=this.layers[i];
      if(!L.canvas) continue;
      L.x-=L.speed*delta;
      if(L.x<=-this.BG_W) L.x+=this.BG_W;
      var y=H-L.canvas.height;
      ctx.drawImage(L.canvas, L.x, y);
      ctx.drawImage(L.canvas, L.x+this.BG_W, y);
    }
    // 3) chão + névoa accent
    var pal=this._pal();
    if(pal){
      ctx.fillStyle=pal.ground; ctx.fillRect(0,760,W,H-760);
      ctx.globalAlpha=0.08; ctx.fillStyle=pal.accent; ctx.fillRect(0,700,W,60);
      ctx.globalAlpha=1;
      // linha de horizonte
      ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(0,760,W,2);
    }
    // 4) entidades
    var hl=this.heroLunge, el2=this.enemyLunge;
    var heroX=45-hl*10, heroY=525+Math.sin(Date.now()/240)*2;
    var enX=270+el2*10, enY=525+Math.sin(Date.now()/200+2)*2;
    var alpha=1;
    if(this.enemyFade>0){ this.enemyFade=Math.min(1, this.enemyFade+delta*3); alpha=1-this.enemyFade; }
    // sombras
    ctx.globalAlpha=0.35; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(heroX+120,768,95,14,0,0,Math.PI*2); ctx.fill();
    if(this.hasEnemy){ ctx.beginPath(); ctx.ellipse(enX+120,768,105,16,0,0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha=1;
    if(this.heroImg && this.heroImg.complete && this.heroImg.naturalWidth>0)
      ctx.drawImage(this.heroImg, heroX, heroY, 240, 240);
    if(this.hasEnemy && this.enemyImg && this.enemyImg.complete && this.enemyImg.naturalWidth>0){
      ctx.globalAlpha=alpha;
      var scale=(E.Combat.enemy&&E.Combat.enemy.boss)?1.25:(E.Combat.enemy&&E.Combat.enemy.miniboss)?1.1:1;
      var sz=240*scale;
      ctx.drawImage(this.enemyImg, enX-(sz-240)/2, enY-(sz-240), sz, sz);
      ctx.globalAlpha=1;
    }
    // flashes de golpe
    if(hl>0.55){ ctx.fillStyle='rgba(232,163,58,'+((hl-0.55)*1.2)+')'; ctx.fillRect(enX+40,enY+40,160,160); }
    if(el2>0.55){ ctx.fillStyle='rgba(208,69,95,'+((el2-0.55)*1.2)+')'; ctx.fillRect(heroX+40,heroY+40,160,160); }
    this.heroLunge=Math.max(0, this.heroLunge-delta*4);
    this.enemyLunge=Math.max(0, this.enemyLunge-delta*4);
    // 5) barras de vida
    this._bar(ctx, 20, 475, 230, 30, this.heroHpShown, this.heroGhost, '#3a9e5f', '#7a3030', this.heroHpLabel);
    this._bar(ctx, 290, 475, 230, 30, this.enemyHpShown, this.enemyGhost, '#d0455f', '#7a3030', this.enemyHpLabel);
    this.heroGhost=this._ghost(this.heroGhost, this.heroHpShown, delta);
    this.enemyGhost=this._ghost(this.enemyGhost, this.enemyHpShown, delta);
    // 6) dano flutuante
    ctx.textAlign='center';
    for(var j=0;j<this.floats.length;j++){
      var f=this.floats[j];
      if(!f.on) continue;
      f.t+=delta;
      var p=f.t/0.8;
      if(p>=1){ f.on=false; continue; }
      var fy=f.y-f.rise*p;
      ctx.globalAlpha=p<0.31?1:1-(p-0.31)/0.69;
      ctx.font='bold '+f.size+'px "Courier New",monospace';
      ctx.fillStyle='rgba(0,0,0,0.8)';
      ctx.fillText(f.text, f.x+1, fy+1);
      ctx.fillStyle=f.color;
      ctx.fillText(f.text, f.x, fy);
      ctx.globalAlpha=1;
    }
    ctx.restore();
  },
  _pal: function(){
    var rs=E.DM.cfg_regions.regions;
    for(var i=0;i<rs.length;i++) if(rs[i].id===this.regionId) return rs[i].palette;
    return null;
  },
  _bar: function(ctx, x, y, w, h, frac, ghost, color, ghostColor, label){
    ctx.fillStyle='rgba(26,21,38,0.92)';
    ctx.fillRect(x-2,y-2,w+4,h+4);
    ctx.fillStyle=ghostColor;
    ctx.fillRect(x, y, w*Math.max(ghost,0), h);
    ctx.fillStyle=color;
    ctx.fillRect(x, y, w*Math.max(frac,0), h);
    ctx.strokeStyle='#3a2a55'; ctx.lineWidth=1;
    ctx.strokeRect(x-1.5, y-1.5, w+3, h+3);
    ctx.font='bold 10px "Courier New",monospace';
    ctx.textAlign='center';
    ctx.fillStyle='#fff';
    ctx.fillText(label||'', x+w/2, y+h/2+4);
  },
  _ghost: function(g, target, delta){
    if(target<g) return Math.max(target, g-delta*0.35);
    return target;
  }
};
