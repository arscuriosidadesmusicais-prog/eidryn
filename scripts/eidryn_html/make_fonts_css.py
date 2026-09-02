#!/usr/bin/env python3
"""make_fonts_css.py — embute Cinzel (variável) + Alegreya Sans em base64."""
import base64, pathlib

FDIR = pathlib.Path('/home/z/my-project/scripts/eidryn_html/fonts')
OUT = pathlib.Path('/home/z/my-project/scripts/eidryn_html/fonts_css.txt')

def b64(p):
    return base64.b64encode((FDIR/p).read_bytes()).decode()

css = f"""/* ---- Fontes embutidas (offline-first) ---- */
@font-face {{
  font-family: 'Cinzel';
  font-style: normal;
  font-weight: 400 900;
  font-display: swap;
  src: url(data:font/woff2;base64,{b64('cinzel-400-900.woff2')}) format('woff2');
}}
@font-face {{
  font-family: 'Alegreya Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url(data:font/woff2;base64,{b64('alegreya-500.woff2')}) format('woff2');
}}
@font-face {{
  font-family: 'Alegreya Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(data:font/woff2;base64,{b64('alegreya-700.woff2')}) format('woff2');
}}
@font-face {{
  font-family: 'Alegreya Sans';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url(data:font/woff2;base64,{b64('alegreya-800.woff2')}) format('woff2');
}}
"""
OUT.write_text(css, encoding='utf-8')
print(f'fonts_css.txt: {OUT.stat().st_size/1024:.0f} KB')
