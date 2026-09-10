#!/usr/bin/env python3
"""Static, Canva-importable version of the neon menu boards: one <div data-document-role="page"> per board page,
background plate (rendered by capture-canva.js) + live text so prices/names stay editable inside Canva.
usage: THEME=brand BASE=https://dev--pour-decisions-juicebar.netlify.app python3 build-canva.py  -> canva/neon-<theme>.html"""
import json, html, os
THEME = os.environ.get('THEME', 'brand')
BASE = os.environ.get('BASE', 'https://dev--pour-decisions-juicebar.netlify.app').rstrip('/')
HERE = os.path.dirname(os.path.abspath(__file__))
M = json.load(open(os.path.join(HERE, '..', 'menu.json')))
C = {c['key']: c for c in M['categories']}; S = M['sizes']; esc = html.escape
def money(n): return f"${n:.2f}".replace('.00', '')
def price_for(it):
    if it.get('size'):
        sz = S[it['size']]
        return money(sz[0]['price']) if len(sz) == 1 else f"{money(sz[0]['price'])} / {money(sz[1]['price'])}"
    if it.get('prices'): return '  '.join(f"{money(v)} {esc(k)}" for k, v in it['prices'].items())
    return money(it['price'])

DARK = THEME == 'dark'
mango = '#FFB800' if DARK else '#FFD24D'
ing_c = 'rgba(255,255,255,.72)' if DARK else 'rgba(255,255,255,.88)'
note_c = '#FFB800' if DARK else '#FFE7A8'
tag_css = 'background:var(--accent);color:#06141A' if DARK else 'background:#FF8A00;color:#fff'
CSS = f'''
*{{box-sizing:border-box}} body{{margin:0;background:#222;font-family:Manrope,Helvetica,Arial,sans-serif;color:#fff}}
.pg{{position:relative;width:1920px;height:1080px;overflow:hidden;margin:0 0 24px}}
.pg>img.bg{{position:absolute;left:0;top:0;width:1920px;height:1080px;display:block}}
.tg{{position:absolute;left:300px;top:88px;width:600px;font-family:'Playfair Display',Georgia,serif;font-style:italic;font-weight:900;font-size:34px;line-height:1.1;color:#fff}}
.hdrR{{position:absolute;right:70px;top:66px;width:760px;text-align:right;font-family:'Bebas Neue',Impact,sans-serif;font-size:34px;letter-spacing:.14em;color:#fff;line-height:1.25}}
.hdrR b{{color:{mango}}}
.cat{{position:absolute;left:70px;top:190px;width:1110px;font-family:'Bebas Neue',Impact,sans-serif;font-size:118px;line-height:1;letter-spacing:.03em;color:#fff;text-shadow:0 0 18px var(--accent),0 0 60px var(--accent)}}
.note{{position:absolute;left:70px;top:316px;width:1110px;font-family:'Bebas Neue',Impact,sans-serif;font-size:30px;line-height:1.2;letter-spacing:.14em;color:{note_c}}}
.row{{position:absolute;left:70px;width:1110px;height:104px}}
.nm{{position:absolute;left:0;top:0;width:560px;font-family:'Playfair Display',Georgia,serif;font-style:italic;font-weight:900;font-size:44px;line-height:1.1;letter-spacing:-.01em;color:#fff;white-space:nowrap}}
.tag{{position:absolute;left:580px;top:16px;width:250px;font-family:Manrope,Helvetica,sans-serif;font-weight:800;font-size:18px;line-height:1.2;letter-spacing:.12em;text-transform:uppercase;color:{mango};white-space:nowrap}}
.ing{{position:absolute;left:0;top:58px;width:830px;font-size:24px;line-height:1.2;font-weight:500;color:{ing_c};white-space:nowrap}}
.pr{{position:absolute;right:0;top:0;width:300px;text-align:right;font-family:'Bebas Neue',Impact,sans-serif;font-size:50px;line-height:1;color:{mango};white-space:nowrap}}
.pr small{{font-size:32px;color:rgba(255,255,255,.85);margin-left:6px}}
.hr{{position:absolute;left:0;bottom:0;width:1110px;height:1px;background:rgba(255,255,255,.22)}}
.foot1{{position:absolute;left:70px;bottom:36px;width:900px;font-family:'Bebas Neue',Impact,sans-serif;font-size:30px;line-height:1.2;letter-spacing:.14em;color:#fff}}
.foot2{{position:absolute;right:70px;bottom:36px;width:900px;text-align:right;font-family:'Bebas Neue',Impact,sans-serif;font-size:30px;line-height:1.2;letter-spacing:.14em;color:rgba(255,255,255,.85)}}
'''
hdr = f"Smoothies {money(S['smoothie'][0]['price'])} 16 oz · {money(S['smoothie'][1]['price'])} 24 oz<br>Juices {money(S['juice'][0]['price'])} 16 oz · {money(S['juice'][1]['price'])} 24 oz"
foot = '<div class="foot1">Cold-pressed · blended fresh · 8 AM – 5 PM</div><div class="foot2">pourdecisionsjuicebar.com · 359 Northern Blvd, Albany</div>'

def page(board, idx, title, note, items, accent, subtitle):
    def row(k, i):
        tag = ('<div class="tag">' + esc(i['tag']) + '</div>') if i.get('tag') else ''
        top = 372 + k * 108
        return ('<div class="row" style="top:%dpx">' % top + '<div class="nm">' + esc(i['name']) + tag + '</div><div class="ing">' + esc(' · '.join(i['ingredients'])) + '</div><div class="pr">' + price_for(i) + '</div>' + ('<div class="hr"></div>' if k < len(items) - 1 else '') + '</div>')
    rows = ''.join(row(k, i) for k, i in enumerate(items))
    return f'''<div class="pg" data-document-role="page" data-label="{esc(title)} {idx}" style="--accent:{accent}">
  <img class="bg" src="{BASE}/tv-signage/canva/bg-{THEME}-{board}{idx}.jpg" alt="">
  <div class="tg">{esc(subtitle)}</div>
  <div class="hdrR">{hdr}</div>
  <div class="cat">{esc(title)}</div><div class="note">{esc(note)}</div>{rows}
  {foot}
</div>'''

sm, mo, ju, sh = C['smoothies'], C['protein-oats'], C['juices'], C['shots']
smoothie_note = f"16 oz {money(S['smoothie'][0]['price'])} · 24 oz {money(S['smoothie'][1]['price'])} · protein blends +$1"
juice_note = f"16 oz {money(S['juice'][0]['price'])} · 24 oz {money(S['juice'][1]['price'])} · pressed fresh daily"
pages = [
    page('A', 1, 'Smoothies', smoothie_note, sm['items'][:5], '#FF3D6E', 'Smoothies & protein'),
    page('A', 2, 'Smoothies', smoothie_note, sm['items'][5:10], '#FF3D6E', 'Smoothies & protein'),
    page('A', 3, 'Protein & Oats', mo.get('note', ''), mo['items'], '#FF8A00', 'Smoothies & protein'),
    page('B', 1, 'Cold-Pressed Juices', juice_note, ju['items'][:5], '#14B8AC', 'Juices & shots'),
    page('B', 2, 'Cold-Pressed Juices', juice_note, ju['items'][5:10], '#14B8AC', 'Juices & shots'),
    page('B', 3, 'Wellness Shots', sh.get('note', ''), sh['items'], '#FFB800', 'Juices & shots'),
]
doc = f'''<!doctype html><html><head><meta charset="utf-8"><title>Pour Decisions — Neon Menu Board ({THEME})</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@1,900&family=Manrope:wght@500;700;800&display=swap">
<style>{CSS}</style></head><body>
{''.join(pages)}
</body></html>'''
out = os.path.join(HERE, 'canva', f'neon-{THEME}.html'); os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(doc); print('built', out, len(pages), 'pages')
