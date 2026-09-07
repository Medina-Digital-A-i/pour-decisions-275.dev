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
        return money(sz[0]['price']) if len(sz) == 1 else f"{money(sz[0]['price'])}<small>/{money(sz[1]['price'])}</small>"
    if it.get('prices'): return ' '.join(f"{money(v)}<small>{esc(k)}</small>" for k, v in it['prices'].items())
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
.tg{{position:absolute;left:{70+150+26}px;top:86px;font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:900;font-size:34px;color:#fff;opacity:.9}}
.hdrR{{position:absolute;right:70px;top:66px;text-align:right;font-family:'Bebas Neue',Impact,sans-serif;font-size:34px;letter-spacing:.14em;color:#fff;line-height:1.2}}
.hdrR b{{color:{mango}}}
.left{{position:absolute;left:70px;top:190px;width:1110px}}
.cat{{font-family:'Bebas Neue',Impact,sans-serif;font-size:118px;line-height:.9;letter-spacing:.03em;color:#fff;text-shadow:0 0 18px var(--accent),0 0 60px var(--accent)}}
.note{{font-family:'Bebas Neue',Impact,sans-serif;font-size:30px;letter-spacing:.14em;color:{note_c};margin:8px 0 22px}}
.row{{display:grid;grid-template-columns:1fr auto;gap:30px;align-items:baseline;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.2)}}
.row:last-child{{border-bottom:0}}
.nm{{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:900;font-size:46px;line-height:1;letter-spacing:-.02em}}
.tag{{font-family:Manrope,sans-serif;font-style:normal;font-weight:800;font-size:15px;letter-spacing:.1em;text-transform:uppercase;{tag_css};padding:6px 12px;border-radius:99px;margin-left:16px;vertical-align:middle}}
.ing{{font-size:24px;font-weight:500;color:{ing_c};margin-top:6px}}
.pr{{font-family:'Bebas Neue',Impact,sans-serif;font-size:60px;line-height:1;color:{mango};white-space:nowrap}}
.pr small{{font-size:32px;color:rgba(255,255,255,.8);margin-left:8px}}
.foot{{position:absolute;left:70px;right:70px;bottom:36px;display:flex;justify-content:space-between;font-family:'Bebas Neue',Impact,sans-serif;font-size:30px;letter-spacing:.14em;color:rgba(255,255,255,.85)}}
.foot b{{color:#fff}}
'''
hdr = f"Smoothies <b>{money(S['smoothie'][0]['price'])}</b> 16 oz · <b>{money(S['smoothie'][1]['price'])}</b> 24 oz<br>Juices <b>{money(S['juice'][0]['price'])}</b> 16 oz · <b>{money(S['juice'][1]['price'])}</b> 24 oz"
foot = '<div class="foot"><span><b>Cold-pressed · blended fresh · 7:30 AM – 5 PM</b></span><span>pourdecisionsjuicebar.com · 359 Northern Blvd, Albany</span></div>'

def page(board, idx, title, note, items, accent, subtitle):
    def row(i):
        tag = (' <span class="tag">' + esc(i['tag']) + '</span>') if i.get('tag') else ''
        return ('<div class="row"><div><div class="nm">' + esc(i['name']) + tag + '</div><div class="ing">' + esc(' · '.join(i['ingredients'])) + '</div></div><div class="pr">' + price_for(i) + '</div></div>')
    rows = ''.join(row(i) for i in items)
    return f'''<div class="pg" data-document-role="page" data-label="{esc(title)} {idx}" style="--accent:{accent}">
  <img class="bg" src="{BASE}/tv-signage/canva/bg-{THEME}-{board}{idx}.jpg" alt="">
  <div class="tg">{esc(subtitle)}</div>
  <div class="hdrR">{hdr}</div>
  <div class="left"><div class="cat">{esc(title)}</div><div class="note">{esc(note)}</div>{rows}</div>
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:ital,opsz,wght@1,9..144,900&family=Manrope:wght@500;700;800&display=swap">
<style>{CSS}</style></head><body>
{''.join(pages)}
</body></html>'''
out = os.path.join(HERE, 'canva', f'neon-{THEME}.html'); os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(doc); print('built', out, len(pages), 'pages')
