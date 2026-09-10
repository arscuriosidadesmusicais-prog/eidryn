'use strict';
/* Benchmark determinístico de comandos Canvas. Não mede GPU/FPS: compara o
   modelo exato do renderer anterior com chamadas observadas nas rotinas atuais. */
const fs = require('fs');
const path = require('path');

globalThis.E = { U: { clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) } };
eval(fs.readFileSync(path.join(__dirname, 'p05_render.js'), 'utf8'));

function makeContext() {
  const calls = {};
  const count = name => { calls[name] = (calls[name] || 0) + 1; };
  const gradient = () => ({ addColorStop() {} });
  const ctx = { calls, globalAlpha: 1 };
  for (const name of ['save','restore','beginPath','stroke','fill','fillRect','strokeRect','drawImage',
    'clearRect','clip','rect','moveTo','lineTo','ellipse','arc','translate','rotate','scale',
    'fillText','strokeText']) ctx[name] = () => count(name);
  ctx.measureText = text => ({ width: String(text).length * 7 });
  ctx.createLinearGradient = () => { count('createLinearGradient'); return gradient(); };
  ctx.createRadialGradient = () => { count('createRadialGradient'); return gradient(); };
  ctx.reset = () => { for (const key of Object.keys(calls)) delete calls[key]; };
  return ctx;
}

function makeCanvas() {
  const ctx = makeContext();
  return { width: 0, height: 0, getContext: () => ctx, _ctx: ctx };
}
globalThis.document = { createElement: tag => {
  if (tag !== 'canvas') throw new Error('benchmark só cria canvas');
  return makeCanvas();
}};

function pct(before, after) { return +((1 - after / Math.max(1, before)) * 100).toFixed(1); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function row(name, metric, before, after, note) {
  return { scenario: name, metric, before, after, reduction_pct: pct(before, after), note };
}

const R = E.Rfx;
R.ctx = makeContext();
R._buffers = {}; R._gradientCache = {}; R._orbSprites = {}; R._auraSprites = {};
R._washColorCache = {}; R.lowFx = false; R.wind = 0.8;
const results = [];

// 1) Tempestade máxima: renderer anterior fazia beginPath+stroke por gota.
R.rain = Array.from({ length: 132 }, (_, i) => ({
  on: true, front: i % 3 === 0, c: ((i * 37) % 100) / 100, x: i * 4, y: i * 5, ph: i * 0.31
}));
const storm = R.WEATHERS.tempestade, rainStyle = R.RAIN_STYLE.default;
R._drawPrecipBatch(false, storm, rainStyle, 1);
R._drawPrecipBatch(true, storm, rainStyle, 1);
const weatherStrokes = R.ctx.calls.stroke || 0;
results.push(row('tempestade_132_gotas', 'stroke', 132, weatherStrokes,
  'observado na rotina atual; baseline = 1 stroke por gota do código anterior'));
assert(weatherStrokes <= 4, 'batch de chuva excedeu 4 strokes');

// 2) Cem faíscas: agora agrupadas por duas cores e duas faixas de espessura.
R.ctx.reset();
R.parts = Array.from({ length: 100 }, (_, i) => ({
  on: true, type: 0, x: i, y: i, vx: 80, vy: -30, t: 0.1, life: 1,
  size: i % 2 ? 3 : 2, color: i % 2 ? '#fff3d0' : '#ffd27a', grav: 0
}));
R._drawParts(0);
const sparkStrokes = R.ctx.calls.stroke || 0;
results.push(row('combate_100_faiscas', 'stroke', 100, sparkStrokes,
  'observado na rotina atual; baseline = 1 stroke por faísca do código anterior'));
assert(sparkStrokes <= 4, 'batch de faíscas excedeu 4 strokes');

// 3) Atmosfera e estação usam paths de retângulos em vez de um fill por mota.
R.ctx.reset(); R.lowFx = false; R.time = 1; R.wind = .3;
R.atmo = Array.from({length:42},(_,i)=>({x:i*9,y:300+i,s:1.5,ph:i*.2,sp:10,kind:0,acc:'#8af0c8'}));
R._drawAtmo(0);
results.push(row('bioma_42_motas', 'fill', 42, R.ctx.calls.fill || 0,
  '42 fillRect anteriores consolidados em um path'));
assert((R.ctx.calls.fill || 0) === 1, 'atmosfera não consolidou em 1 fill');
R.ctx.reset(); R.season='inverno';
const winter=R.SEASONS.inverno;
R.seasonAtmo=Array.from({length:30},(_,i)=>({x:i*8,y:200+i,sp:25,ph:i*.2,sz:2.5,col:winter.cols[i%winter.cols.length],front:false}));
R._drawSeasonAtmo(0,false);
results.push(row('estacao_30_particulas', 'fill', 30, R.ctx.calls.fill || 0,
  'um path por cor sazonal'));
assert((R.ctx.calls.fill || 0) <= winter.cols.length, 'estação excedeu um fill por cor');

// 4) Poças High: reflexos de todas as entidades são pré-compostos uma vez.
R.ctx.reset(); R.lowFx = false; R.puddleT = 1; R._buffers = {}; R.flashA = 0;
R._rainStyle = () => R.RAIN_STYLE.default;
R.puddles = Array.from({ length: 9 }, (_, i) => ({ x: 35 + i * 55, y: 790, rx: 44, ry: 15,
  ph:i, _sky:{}, _gf:{} }));
R.ripples = [];
const fakeImage={complete:true,naturalWidth:96,naturalHeight:96};
R.heroAnim={pose:'idle',f:0}; R.heroFrames={idle:[fakeImage]}; R.heroImg=fakeImage;
R.petAnim={pose:'idle',f:0}; R.petKey='pet'; R.compKey='comp';
R.petFrames={pet:{idle:[fakeImage]},comp:{idle:[fakeImage]}};
R.hasEnemy=true; R.enemyImg=fakeImage; R.enemyBoss=false; R.enemyMini=false; R.enemyFade=0; R.enemySpawn=1;
R._drawPuddles();
results.push(row('highfx_9_pocas', 'drawImage_reflexo_main', 54, R.ctx.calls.drawImage || 0,
  'cena de reflexo pré-composta; um drawImage por poça'));
results.push(row('highfx_9_pocas', 'clip', 27, R.ctx.calls.clip || 0,
  'sky/reflexo/profundidade compartilham um único clip por poça'));
assert((R.ctx.calls.drawImage || 0) === 9 && (R.ctx.calls.clip || 0) === 9, 'poças High não reutilizaram a composição');

// 5) Low-FX de poças: mantém água/ondas sem clips nem reflexos de entidades.
R.ctx.reset(); R.lowFx = true;
R.ripples = Array.from({ length: 8 }, (_, i) => ({ on: true, x: 60 + i * 40, y: 790, t: .2, life: .6 }));
R._drawPuddlesLite();
results.push(row('lowfx_9_pocas', 'drawImage_reflexo', 54, R.ctx.calls.drawImage || 0,
  'baseline máximo = 6 reflexos × 9 poças; Low-FX usa formas batched'));
results.push(row('lowfx_9_pocas', 'clip', 27, R.ctx.calls.clip || 0,
  'baseline = 3 clips elípticos × 9 poças'));
assert(!(R.ctx.calls.drawImage || R.ctx.calls.clip), 'Low-FX ainda usa reflexo/clip');

// 4) Quatro washes ativos viram um único fill source-over.
R.ctx.reset(); R.lowFx = false; R.season = 'primavera'; R.weather = 'tempestade';
R.weatherPrev = 'chuva'; R.weatherBlend = .5; R._dn = { dark:.15, darkCol:'7,10,32' };
R._drawMoodWash();
const washFills = R.ctx.calls.fillRect || 0;
results.push(row('wash_estacao_clima_dia_noite', 'fullscreen_fill', 4, washFills,
  'quatro camadas ativas compostas em CPU com source-over'));
assert(washFills === 1, 'wash unificado não gerou exatamente 1 fill');

// 5) Gradientes das duas barras: warm-up cria; frame estável reutiliza.
R.ctx.reset(); R._gradientCache = {}; R.fontReady = false;
R._bar(R.ctx, 20, 470, 230, 30, .8, .9, '#3a9e5f', '#7a3030', 'HP', '#58e07a');
R._bar(R.ctx, 290, 470, 230, 30, .8, .9, '#d0455f', '#7a3030', 'HP', '#ff7a8a');
R.ctx.reset();
R._bar(R.ctx, 20, 470, 230, 30, .8, .9, '#3a9e5f', '#7a3030', 'HP', '#58e07a');
R._bar(R.ctx, 290, 470, 230, 30, .8, .9, '#d0455f', '#7a3030', 'HP', '#ff7a8a');
const steadyGradients = (R.ctx.calls.createLinearGradient || 0) + (R.ctx.calls.createRadialGradient || 0);
results.push(row('barras_frame_estavel', 'createGradient', 2, steadyGradients,
  'observado após warm-up do cache'));
assert(steadyGradients === 0, 'barras recriaram gradiente após warm-up');

// 6) Chão: no frame estável, o buffer substitui 1 gradiente + 3 fills por 1 drawImage.
R.ctx.reset(); R._buffers = {};
const pal = { ground:'#161020', accent:'#9b59d0' };
R._drawGround(pal); // bake
R.ctx.reset();
R._drawGround(pal); // steady state
results.push(row('chao_frame_estavel', 'createGradient', 1, R.ctx.calls.createLinearGradient || 0,
  'gradiente foi criado no buffer durante warm-up'));
results.push(row('chao_frame_estavel', 'main_canvas_commands', 3, R.ctx.calls.drawImage || 0,
  '3 fills anteriores substituídos por 1 composição do buffer'));
assert((R.ctx.calls.drawImage || 0) === 1, 'chão cacheado não usou um drawImage');

const aggregate = {
  schema: 1,
  kind: 'canvas_command_benchmark',
  caveat: 'Mede comandos Canvas determinísticos; não é medição física de FPS/GPU.',
  results
};
const outArg = process.argv.indexOf('--output');
if (outArg >= 0 && process.argv[outArg + 1])
  fs.writeFileSync(process.argv[outArg + 1], JSON.stringify(aggregate, null, 2) + '\n');

console.log('| Cenário | Métrica | Antes | Depois | Redução |');
console.log('|---|---:|---:|---:|---:|');
for (const r of results)
  console.log(`| ${r.scenario} | ${r.metric} | ${r.before} | ${r.after} | ${r.reduction_pct}% |`);
console.log(`\n${results.length} métricas validadas.`);
