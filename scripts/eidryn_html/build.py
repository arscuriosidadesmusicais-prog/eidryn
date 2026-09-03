#!/usr/bin/env python3
# build.py — monta o Eidryn HTML single-file (dados JSON + sprites PNG + áudio WAV em base64)
import json, base64, pathlib

ROOT = pathlib.Path('/home/z/my-project/eidryn')
PARTS = pathlib.Path('/home/z/my-project/scripts/eidryn_html')
OUT = pathlib.Path('/home/z/my-project/download/Eidryn_O_Ciclo_do_Eclipse_v1.0.0.html')

def load_data():
    d = {}
    mapping = {
        'enemies':'enemies', 'regions':'regions', 'currencies':'currencies',
        'attributes':'attributes', 'skills':'skills', 'items':'items',
        'pets':'pets', 'ascension':'ascension_tree', 'dungeons':'dungeons',
        'gacha':'gacha', 'missions':'missions', 'achievements':'achievements',
        'shop':'shop', 'battlepass':'battlepass', 'events':'events',
        'loc_ptbr':'loc_ptbr', 'loc_en':'loc_en',
    }
    for key, fname in mapping.items():
        with open(ROOT/'data'/f'{fname}.json', encoding='utf-8') as f:
            d[key] = json.load(f)
    return d

def load_imgs():
    imgs = {}
    base = ROOT/'assets'/'sprites'
    for sub in ['hero','enemies','ui','pets']:
        for f in sorted((base/sub).glob('*.png')):
            key = f'{sub}/{f.stem}'
            imgs[key] = 'data:image/png;base64,' + base64.b64encode(f.read_bytes()).decode()
    return imgs

def load_wavs():
    wavs = {}
    base = ROOT/'assets'/'audio'
    for sub in ['music','sfx']:
        for f in sorted((base/sub).glob('*.wav')):
            wavs[f.stem] = base64.b64encode(f.read_bytes()).decode()
    return wavs

def part(name):
    return (PARTS/name).read_text(encoding='utf-8')

def main():
    fonts = (PARTS/'fonts_css.txt').read_text(encoding='utf-8')
    data = load_data()
    imgs = load_imgs()
    wavs = load_wavs()
    inject  = 'var E = (globalThis.E = globalThis.E || {});\n'
    inject += 'E.DATA=' + json.dumps(data, ensure_ascii=False, separators=(',',':')) + ';\n'
    inject += 'E.IMG=' + json.dumps(imgs, separators=(',',':')) + ';\n'
    inject += 'E.WAV=' + json.dumps(wavs, separators=(',',':')) + ';\n'
    html = part('p00_head.html').replace('/*__FONTS__*/', fonts)
    html += '\n' + inject
    for p in ['p01_core.js','p02_managers_a.js','p03_managers_b.js',
              'p04_combat.js','p05_render.js','p06_ui.js','p06b_ui2.js','p07_main.js']:
        html += '\n' + part(p) + '\n'
    html += part('p99_tail.html')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f'OK: {OUT} ({OUT.stat().st_size/1024/1024:.2f} MB | {len(imgs)} sprites | {len(wavs)} audios)')

if __name__ == '__main__':
    main()
