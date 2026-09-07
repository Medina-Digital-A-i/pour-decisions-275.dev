#!/usr/bin/env python3
"""Builds the animated neon menu-board pages (1920x1080) from ../menu.json.
Each page exposes window.drawFrame(i, N) so capture-neon.js can render deterministic frames."""
import json, html, os, base64
HERE = os.path.dirname(os.path.abspath(__file__))
M = json.load(open(os.path.join(HERE, '..', 'menu.json')))
C = {c['key']: c for c in M['categories']}
S = M['sizes']
esc = html.escape
def money(n): return f"${n:.2f}".replace('.00', '')

COLORS = {'the-regular':'#F25C7A','happy-hour':'#FF9A3C','green-light':'#4CB96B','nightcap':'#6B4FBB','designated-driver':'#FFE08A','last-call':'#FF4FA3','malibu':'#FFB347','liquid-courage':'#8B5A2B','open-tab':'#B8336A','morning-shift':'#5C4033','heavy-pour':'#7A4A1E','early-bird':'#F47C8C','green-room':'#3E9E5E','carrot-cake':'#F28C28','innerg-elevator':'#F28C28','sober-up':'#5CB85C','ase':'#F2C230','red-eye':'#C2185B','hair-of-the-dog':'#B03060','skinny-dip':'#A8D8B9','sunday-brunch':'#FF5C7A','watermelon-lemon':'#FF6B6B','on-the-rocks':'#7FD6C2','clean-slate':'#8BC34A','flu-shot':'#F5A623','double-shot':'#F7D774','the-bouncer':'#6A4C93','golden-hour':'#E9A23B'}
LOGO_B64 = base64.b64encode(open(os.path.join(HERE, '..', 'assets', 'logo-clean-512.png'), 'rb').read()).decode()
LOGO = 'data:image/png;base64,' + LOGO_B64

def cup(color, kind):
    lab = f'<rect class="label" x="29" y="104" width="62" height="46" rx="10"/><image href="{LOGO}" x="33" y="109" width="54" height="36" preserveAspectRatio="xMidYMid meet"/>'
    if kind == 'bottle':
        return f'''<svg class="pa" viewBox="0 0 120 210" preserveAspectRatio="xMidYMax meet"><rect class="cap" x="41" y="4" width="38" height="24" rx="6"/><path fill="{color}" d="M46 28 L74 28 L84 56 L84 190 Q84 204 70 204 L50 204 Q36 204 36 190 L36 56 Z"/><path class="shade" d="M64 28 L74 28 L84 56 L84 190 Q84 204 70 204 L64 204 Z"/><path class="sheen" d="M41 60 L48 60 L48 190 L43 190 Z"/><path class="glass" d="M46 28 L74 28 L84 56 L84 190 Q84 204 70 204 L50 204 Q36 204 36 190 L36 56 Z"/><rect class="label" x="39" y="92" width="42" height="58" rx="8"/><image href="{LOGO}" x="41" y="103" width="38" height="36" preserveAspectRatio="xMidYMid meet"/></svg>'''
    if kind == 'shot':
        return f'''<svg class="pa" viewBox="0 0 120 210" preserveAspectRatio="xMidYMax meet"><rect class="cap" x="45" y="52" width="30" height="20" rx="5"/><path fill="{color}" d="M48 72 L72 72 L80 92 L80 184 Q80 196 68 196 L52 196 Q40 196 40 184 L40 92 Z"/><path class="shade" d="M62 72 L72 72 L80 92 L80 184 Q80 196 68 196 L62 196 Z"/><path class="sheen" d="M44 96 L50 96 L50 182 L46 182 Z"/><path class="glass" d="M48 72 L72 72 L80 92 L80 184 Q80 196 68 196 L52 196 Q40 196 40 184 L40 92 Z"/><rect class="label" x="44" y="116" width="32" height="42" rx="6"/><image href="{LOGO}" x="45" y="124" width="30" height="26" preserveAspectRatio="xMidYMid meet"/></svg>'''
    return f'''<svg class="pa" viewBox="0 0 120 210" preserveAspectRatio="xMidYMax meet"><rect class="straw" x="72" y="2" width="9" height="66" rx="4.5" transform="rotate(14 76 34)"/><rect class="strawStripe" x="72" y="22" width="9" height="8" transform="rotate(14 76 34)"/><path class="lid" d="M20 66 Q60 14 100 66 Z"/><rect class="rim" x="13" y="63" width="94" height="11" rx="5.5"/><path fill="{color}" d="M18 74 L102 74 L93 196 Q60 207 27 196 Z"/><path class="shade" d="M70 74 L102 74 L93 196 Q77 203 62 203 Z"/><path class="sheen" d="M22 80 L34 80 L31 190 L27 190 Z"/><ellipse cx="60" cy="76" rx="42" ry="4" fill="#fff" fill-opacity=".4"/><path class="glass" d="M18 74 L102 74 L93 196 Q60 207 27 196 Z"/>{lab}</svg>'''

def price_for(it, cat):
    if it.get('size'):
        sz = S[it['size']]
        return money(sz[0]['price']) if len(sz) == 1 else f"{money(sz[0]['price'])}<small>/{money(sz[1]['price'])}</small>"
    if it.get('prices'): return ' '.join(f"{money(v)}<small>{esc(k)}</small>" for k, v in it['prices'].items())
    return money(it['price'])

def page(cat_key, items, title, note, kind, accent):
    rows = ''.join(f'''<div class="row"><div class="rl"><div class="nm">{esc(i["name"])}{(' <span class="tag">'+esc(i["tag"])+'</span>') if i.get("tag") else ''}</div><div class="ing">{esc(" · ".join(i["ingredients"]))}</div></div><div class="pr">{price_for(i, cat_key)}</div></div>''' for i in items)
    cups = ''.join(f'<div class="cupwrap c{k}">{cup(COLORS.get(i["id"], "#14B8AC"), kind)}</div>' for k, i in enumerate(items[:3]))
    return f'''<section class="page" style="--accent:{accent}">
      <div class="left"><div class="cat">{esc(title)}</div><div class="note">{esc(note)}</div><div class="rows">{rows}</div></div>
      <div class="right">{cups}</div>
    </section>'''

def board(name, pages_spec, subtitle):
    pages = ''.join(page(*p) for p in pages_spec)
    n = len(pages_spec)
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:ital,opsz,wght@1,9..144,900&family=Manrope:wght@500;700;800&display=swap">
<style>
:root{{--bg:#06141A;--pink:#FF3D6E;--teal:#14B8AC;--orange:#FF8A00;--mango:#FFB800;--lime:#8BE000}}
html,body{{margin:0;width:1920px;height:1080px;overflow:hidden;background:var(--bg);font-family:Manrope,Helvetica,Arial,sans-serif;color:#fff}}
.glow{{position:absolute;border-radius:50%;filter:blur(90px);opacity:.55}}
.g1{{width:900px;height:900px;left:-250px;top:-300px;background:var(--teal)}}
.g2{{width:800px;height:800px;right:-200px;bottom:-350px;background:var(--pink)}}
.g3{{width:600px;height:600px;right:500px;top:-250px;background:var(--orange);opacity:.35}}
.grid{{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:80px 80px;mask-image:radial-gradient(circle at 50% 50%,#000 30%,transparent 80%)}}
.mist{{position:absolute;border-radius:50%;background:#fff;filter:blur(2px)}}
.brand{{position:absolute;left:70px;top:44px;display:flex;align-items:center;gap:26px}}
.brand img{{height:118px;filter:drop-shadow(0 10px 30px rgba(0,0,0,.5))}}
.brand .tg{{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:900;font-size:34px;color:#fff;opacity:.9;letter-spacing:-.01em}}
.hdrR{{position:absolute;right:70px;top:66px;text-align:right;font-family:'Bebas Neue',Impact,sans-serif;font-size:34px;letter-spacing:.14em;color:#fff;opacity:.85}}
.hdrR b{{color:var(--mango)}}
.page{{position:absolute;left:0;top:190px;width:1920px;height:800px;display:grid;grid-template-columns:1180px 1fr;opacity:0}}
.left{{padding:0 0 0 70px}}
.cat{{font-family:'Bebas Neue',Impact,sans-serif;font-size:118px;line-height:.9;letter-spacing:.03em;color:#fff;text-shadow:0 0 18px var(--accent),0 0 60px var(--accent)}}
.note{{font-family:'Bebas Neue',Impact,sans-serif;font-size:30px;letter-spacing:.14em;color:var(--mango);margin:8px 0 22px}}
.rows{{display:flex;flex-direction:column}}
.row{{display:grid;grid-template-columns:1fr auto;gap:30px;align-items:baseline;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.12)}}
.row:last-child{{border-bottom:0}}
.nm{{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:900;font-size:46px;line-height:1;letter-spacing:-.02em;display:flex;align-items:center;gap:16px}}
.tag{{font-family:Manrope,sans-serif;font-style:normal;font-weight:800;font-size:15px;letter-spacing:.1em;text-transform:uppercase;background:var(--accent);color:#06141A;padding:6px 12px;border-radius:99px;opacity:.95}}
.ing{{font-size:24px;font-weight:500;color:rgba(255,255,255,.72);margin-top:6px}}
.pr{{font-family:'Bebas Neue',Impact,sans-serif;font-size:60px;line-height:1;color:var(--mango);text-shadow:0 0 22px rgba(255,184,0,.55);white-space:nowrap}}
.pr small{{font-size:32px;color:rgba(255,255,255,.75);margin-left:8px;text-shadow:none}}
.right{{position:relative}}
.cupwrap{{position:absolute;bottom:40px;width:300px;height:520px;filter:drop-shadow(0 40px 50px rgba(0,0,0,.55))}}
.c0{{left:40px}}.c1{{left:250px;bottom:110px;width:340px;height:580px}}.c2{{left:430px}}
.pa{{width:100%;height:100%;overflow:visible}}
.pa .glass{{fill:#fff;fill-opacity:.2;stroke:#fff;stroke-opacity:.8;stroke-width:2}}.pa .sheen{{fill:#fff;fill-opacity:.3}}.pa .shade{{fill:#000;fill-opacity:.12}}.pa .lid{{fill:#fff;fill-opacity:.94}}.pa .rim,.pa .straw{{fill:#fff}}.pa .strawStripe{{fill:#FF8A00}}.pa .label{{fill:#fff;fill-opacity:.97}}.pa .cap{{fill:#0B5C57}}
.foot{{position:absolute;left:70px;right:70px;bottom:36px;display:flex;justify-content:space-between;align-items:center;font-family:'Bebas Neue',Impact,sans-serif;font-size:30px;letter-spacing:.14em;color:rgba(255,255,255,.75)}}
.foot b{{color:#fff}}
.dots{{position:absolute;left:50%;bottom:44px;transform:translateX(-50%);display:flex;gap:12px}}
.dots i{{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.25);display:block}}
.dots i.on{{background:var(--mango);box-shadow:0 0 14px var(--mango)}}
</style></head><body>
<div class="glow g1"></div><div class="glow g2"></div><div class="glow g3"></div><div class="grid"></div>
<div id="mist"></div>
<div class="brand"><img src="{LOGO}" alt="Pour Decisions"><div class="tg">{esc(subtitle)}</div></div>
<div class="hdrR">Smoothies <b>{money(S['smoothie'][0]['price'])}</b> 16 oz · <b>{money(S['smoothie'][1]['price'])}</b> 24 oz<br>Juices <b>{money(S['juice'][0]['price'])}</b> 16 oz · <b>{money(S['juice'][1]['price'])}</b> 24 oz</div>
{pages}
<div class="dots">{''.join('<i></i>' for _ in range(n))}</div>
<div class="foot"><span><b>Cold-pressed · blended fresh · 7:30 AM – 5 PM</b></span><span>pourdecisionsjuicebar.com · 359 Northern Blvd, Albany</span></div>
<script>
const TAU=Math.PI*2, N_PAGES={n};
const pages=[...document.querySelectorAll('.page')], dots=[...document.querySelectorAll('.dots i')];
const mistEl=document.getElementById('mist'); const MIST=[];
for(let k=0;k<28;k++){{const d=document.createElement('div');d.className='mist';const s=6+((k*37)%18);d.style.width=d.style.height=s+'px';mistEl.appendChild(d);MIST.push({{el:d,x:(k*233%1920),sp:.6+((k*13)%10)/10,ph:(k*0.37)%1,s}});}}
const glows=[...document.querySelectorAll('.glow')];
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
window.drawFrame=function(i,N){{
  const p=(i%N)/N; const seg=1/N_PAGES; const pg=Math.min(N_PAGES-1,Math.floor(p/seg)); const t=(p-pg*seg)/seg;
  const fadeIn=Math.min(1,t/0.1), fadeOut=Math.min(1,(1-t)/0.1); const a=ease(Math.min(fadeIn,fadeOut));
  pages.forEach((el,k)=>{{ const on=k===pg; el.style.opacity=on?a:0; el.style.transform=on?`translateY(${{(1-a)*24}}px)`:'none'; }});
  dots.forEach((d,k)=>d.classList.toggle('on',k===pg));
  // cups bob + tilt, per page
  const pageEl=pages[pg]; pageEl.querySelectorAll('.cupwrap').forEach((c,k)=>{{ const ph=k*2.1; c.style.transform=`translateY(${{Math.sin(TAU*p*3+ph)*14}}px) rotate(${{Math.sin(TAU*p*2+ph)*3}}deg)`; }});
  // glows breathe
  glows.forEach((g,k)=>{{ g.style.opacity=(0.42+0.18*Math.sin(TAU*p*2+k*2.1)).toFixed(3); g.style.transform=`translate(${{Math.sin(TAU*p+k)*40}}px,${{Math.cos(TAU*p+k)*30}}px)`; }});
  // rising mist (loops: y wraps with p*sp)
  MIST.forEach(m=>{{ const y=((1-((p*m.sp+m.ph)%1))*1240)-80; const x=m.x+Math.sin(TAU*p*2+m.ph*6)*30; m.el.style.transform=`translate(${{x}}px,${{y}}px)`; m.el.style.opacity=(0.05+0.18*Math.sin(Math.PI*((p*m.sp+m.ph)%1))).toFixed(3); }});
  return true;
}};
window.__ready=()=>document.fonts.status==='loaded';
document.fonts.ready.then(()=>{{window.__fontsReady=true;}});
drawFrame(0,900);
</script></body></html>'''

sm, mo, ju, sh = C['smoothies'], C['protein-oats'], C['juices'], C['shots']
smoothie_note = f"16 oz {money(S['smoothie'][0]['price'])} · 24 oz {money(S['smoothie'][1]['price'])} · protein blends +$1"
juice_note = f"16 oz {money(S['juice'][0]['price'])} · 24 oz {money(S['juice'][1]['price'])} · pressed fresh daily"
A = board('A', [
    ('smoothies', sm['items'][:5], 'Smoothies', smoothie_note, 'cup', '#FF3D6E'),
    ('smoothies', sm['items'][5:10], 'Smoothies', smoothie_note, 'cup', '#FF3D6E'),
    ('protein-oats', mo['items'], 'Protein & Oats', mo.get('note', ''), 'cup', '#FF8A00'),
], 'Smoothies & protein')
B = board('B', [
    ('juices', ju['items'][:5], 'Cold-Pressed Juices', juice_note, 'bottle', '#14B8AC'),
    ('juices', ju['items'][5:10], 'Cold-Pressed Juices', juice_note, 'bottle', '#14B8AC'),
    ('shots', sh['items'], 'Wellness Shots', sh.get('note', ''), 'shot', '#FFB800'),
], 'Juices & shots')
open(os.path.join(HERE, 'board-neon-A.html'), 'w', encoding='utf-8').write(A)
open(os.path.join(HERE, 'board-neon-B.html'), 'w', encoding='utf-8').write(B)
print('built board-neon-A.html, board-neon-B.html')
