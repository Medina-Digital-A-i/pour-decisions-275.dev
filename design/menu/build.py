import json, html

M = json.load(open('../../menu.json'))
C = {c['key']: c for c in M['categories']}
S = M['sizes']

def money(n):
    return f"${n:.2f}".replace('.00', '')

def esc(s): return html.escape(s)

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Manrope:wght@500;600;700;800&display=swap">'

CSS = """
:root{--cream:#FAF7F0;--paper:#FFFFFF;--ink:#14615D;--text:#2B2B26;--muted:#7C776A;--teal:#29B7AF;--teal-soft:#E4F6F4;--gold:#EF8A00;--gold-soft:#FFF1DC;--line:#E3D7C2;--sand:#F3EEE2}
body{margin:0;background:var(--cream);color:var(--text);font-family:"Manrope","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--ink)} a:hover{color:var(--teal)}
.cat{font-family:"Bebas Neue","Oswald","Impact",sans-serif;color:var(--ink);letter-spacing:.04em;line-height:.95;margin:0}
.catnote{font-weight:700;color:var(--gold);letter-spacing:.02em}
.it{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:.9em;align-items:baseline;border-bottom:1px solid var(--line)}
.it:last-child{border-bottom:0}
.nm{font-family:"Fraunces","Georgia",serif;font-weight:700;color:var(--text);line-height:1.1;display:flex;align-items:center;gap:.5em;flex-wrap:wrap}
.tag{font-family:"Manrope",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--ink);background:var(--teal-soft);border-radius:999px;white-space:nowrap}
.tag.house{color:var(--gold);background:var(--gold-soft)}
.ing{color:var(--muted);font-weight:500;line-height:1.35}
.pr{font-weight:800;color:var(--gold);white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums;line-height:1.2}
.pr small{font-weight:700;color:var(--muted)}
.box{background:var(--paper);border:1px solid var(--line);border-radius:.6em}
.box h4{font-family:"Manrope",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--teal);margin:0}
.box p{margin:0;font-weight:600;line-height:1.5}
.box b{color:var(--gold)}
.band{background:var(--ink);color:#fff;display:flex;align-items:center}
.band .tg{font-family:"Fraunces","Georgia",serif;font-style:italic;font-weight:500;color:#DDF3F1}
.sz{display:inline-flex;align-items:center;gap:.4em;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);border-radius:999px;font-weight:700;color:#fff;white-space:nowrap}
.sz b{color:#FFBE66}
.shots{margin-top:1.1em}
"""

def item(it, show_size=True, food=False):
    tag = f'<span class="tag {"house" if it.get("tag")=="house" else ""}">{esc(it["tag"])}</span>' if it.get('tag') else ''
    ing = esc(' · '.join(it.get('ingredients', [])))
    if it.get('addons'):
        ing += ' · ' + esc(' · '.join(f"+{a['name']} {money(a['price'])}" for a in it['addons']))
    if it.get('size'):
        sz = S[it['size']]
        if it['size'] == 'smoothie_protein':
            pr = f'<div class="pr">+$1</div>'
        elif it['size'] == 'shot':
            pr = f'<div class="pr">{money(sz[0]["price"])}</div>'
        else:
            pr = ''
    elif it.get('prices'):
        pr = '<div class="pr">' + ' &nbsp;'.join(f'{money(p)}<small> {esc(k)}</small>' for k, p in it['prices'].items()) + '</div>'
    else:
        pr = f'<div class="pr">{money(it["price"])}</div>'
    return f'<div class="it"><div><div class="nm">{esc(it["name"])}{tag}</div><div class="ing">{ing}</div></div>{pr}</div>'

def section(cat, items=None, note=None, cls=''):
    items = items if items is not None else cat['items']
    note = note if note is not None else cat.get('note', '')
    return (f'<div class="sec {cls}"><div class="sech"><h2 class="cat">{esc(cat["title"])}</h2>'
            f'<div class="catnote">{esc(note)}</div></div>' + ''.join(item(i) for i in items) + '</div>')

def box(title, body):
    return f'<div class="box"><h4>{esc(title)}</h4><p>{body}</p></div>'

sm, ju, sh, sa, wp, bb = C['smoothies'], C['juices'], C['shots'], C['salads'], C['wraps-paninis'], C['bowls-breakfast']
addons_body = ' · '.join(f'{esc(a["name"])} <b>+{money(a["price"])}</b>' for a in sm['addons']) + f'<br>{esc(sm["byo"]["name"])} — {esc(sm["byo"]["note"])}'
cleanse_body = ' &nbsp;·&nbsp; '.join(f'{esc(c["name"])} <b>{money(c["price"])}</b> <span style="color:var(--muted)">{esc(c["note"])}</span>' for c in ju['cleanses'])
prot_body = ' · '.join(f'{esc(p["name"])} <b>+{money(p["price"])}</b>' for p in sa['proteins'])
pass_body = '<br>'.join(f'{esc(m["name"])} <b>{money(m["price"])}</b>/{m["per"]} — {esc(m["note"])}' for m in M['memberships'])
shots_body = '<br>'.join(f'<span style="color:var(--text)">{esc(i["name"])}</span> <span style="color:var(--muted)">— {esc(", ".join(i["ingredients"]))}</span>' for i in sh['items'])
biz = M['business']
smoothie_note = f'16 oz {money(S["smoothie"][0]["price"])} · 24 oz {money(S["smoothie"][1]["price"])} · protein blends +$1'
juice_note = f'16 oz {money(S["juice"][0]["price"])} · 24 oz {money(S["juice"][1]["price"])} · pressed fresh daily'
shot_note = f'2 oz {money(S["shot"][0]["price"])} · two for $8'

def band(logo, size_pills=True, h=''):
    pills = (f'<span class="sz">Smoothies <b>{money(S["smoothie"][0]["price"])}</b> 16 oz <b>{money(S["smoothie"][1]["price"])}</b> 24 oz</span>'
             f'<span class="sz">Juices <b>{money(S["juice"][0]["price"])}</b> 16 oz <b>{money(S["juice"][1]["price"])}</b> 24 oz</span>') if size_pills else ''
    return (f'<div class="band" {h}><img src="{logo}" alt="Pour Decisions" class="logo">'
            f'<div class="tg">{esc(biz["tagline"])}</div><div class="pills">{pills}</div></div>')

def footer():
    return (f'<div class="foot"><span>{esc(biz["address"])}</span><span>@{esc(biz["instagram"])}</span><span>pourdecisionsjuicebar.com</span></div>')

def doc(title, body_css, body):
    return f'''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  {FONTS}
  <style>{CSS}{body_css}</style>
</helmet>
{body}
</x-dc>
</body>
</html>
'''

# ---------- PRINT: Letter 816x1056 ----------
PRINT_CSS = """
.page{width:816px;height:1056px;background:var(--cream);display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden}
.band{padding:22px 40px;gap:22px}
.logo{height:64px}
.band .tg{font-size:17px;flex:1}
.pills{display:flex;flex-direction:column;gap:6px;font-size:12px}
.sz{padding:4px 12px}
.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 34px;padding:22px 40px 0;flex:1}
.cat{font-size:34px}
.sech{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}
.catnote{font-size:11px}
.it{padding:7px 0}
.nm{font-size:16px}
.tag{font-size:8.5px;padding:2px 7px}
.ing{font-size:11.5px;margin-top:2px}
.pr{font-size:15px}.pr small{font-size:10px}
.box{padding:10px 14px;margin-top:12px}
.box h4{font-size:9.5px;margin-bottom:4px}
.box p{font-size:11.5px}
.shots .cat{font-size:24px}.shots .sech{margin-top:4px}
.foot{display:flex;justify-content:space-between;padding:14px 40px;background:var(--sand);font-size:11px;font-weight:700;color:var(--ink);letter-spacing:.02em}
.stack{display:flex;flex-direction:column;gap:0}
"""
print_drinks = doc('drinks', PRINT_CSS, f'''
<div class="page">
  {band('logo-white.png')}
  <div class="cols">
    <div class="stack">{section(sm, note=smoothie_note)}{box('Add-ons', addons_body)}</div>
    <div class="stack">{section(ju, note=juice_note)}{box('Cleanses', cleanse_body)}{section(sh, note=shot_note, cls='shots')}</div>
  </div>
  {footer()}
</div>''')

PRINT_FOOD_CSS = PRINT_CSS + """
.cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 26px;padding:22px 40px 0;flex:1}
.cols3 .nm{font-size:15px}.cols3 .ing{font-size:11px}.cols3 .pr{font-size:13px}
.cols3 .cat{font-size:30px}
.cols3 .it{padding:5px 0}.cols3 .ing{font-size:10.5px}.cols3 .box{padding:8px 12px;margin-top:8px}
"""
print_food = doc('food', PRINT_FOOD_CSS, f'''
<div class="page">
  {band('logo-white.png', size_pills=False)}
  <div class="cols3">
    <div class="stack">{section(sa, note='Meat-free by design')}{box('Add protein', prot_body)}</div>
    <div class="stack">{section(wp)}</div>
    <div class="stack">{section(bb, note='')}{box('Pour Pass', pass_body)}</div>
  </div>
  {footer()}
</div>''')

# ---------- TV: 1920x1080 ----------
TV_CSS = """
.page{width:1920px;height:1080px;background:var(--cream);display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden}
.band{padding:28px 70px;gap:44px}
.logo{height:120px}
.band .tg{font-size:32px;flex:1}
.pills{display:flex;gap:14px;font-size:24px}
.sz{padding:10px 24px}
.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 70px;padding:34px 70px 0;flex:1}
.cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 56px;padding:34px 70px 0;flex:1}
.cat{font-size:66px}
.sech{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;min-height:96px}
.catnote{font-size:22px}
.it{padding:12px 0}
.nm{font-size:36px}
.tag{font-size:15px;padding:5px 12px}
.ing{font-size:21px;margin-top:4px}
.pr{font-size:30px}.pr small{font-size:18px}
.box{padding:18px 26px;margin-top:22px}
.box h4{font-size:17px;margin-bottom:8px}
.box p{font-size:22px}
.shots .cat{font-size:44px}.shots .it{padding:7px 0}.shots .nm{font-size:29px}.shots .ing{font-size:18px}.shots .pr{font-size:26px}.shots .sech{min-height:0;margin-bottom:8px}
.stack{display:flex;flex-direction:column}
.cols3 .nm{font-size:26px}.cols3 .ing{font-size:16px}.cols3 .pr{font-size:23px}.cols3 .cat{font-size:54px}.cols3 .it{padding:7px 0}.cols3 .box{padding:14px 20px;margin-top:16px}.cols3 .box p{font-size:19px}.cols3 .sech{min-height:80px}
"""
tv1 = doc('tv1', TV_CSS, f'''
<div class="page">
  {band('logo-white.png')}
  <div class="cols">
    <div class="stack">{section(sm, sm['items'][:5], note=smoothie_note)}</div>
    <div class="stack"><div class="sech"></div>{''.join(item(i) for i in sm['items'][5:])}{box('Add-ons', addons_body)}{box('Pour Pass', pass_body)}</div>
  </div>
</div>''')
tv2 = doc('tv2', TV_CSS, f'''
<div class="page">
  {band('logo-white.png')}
  <div class="cols">
    <div class="stack">{section(ju, ju['items'][:5], note=juice_note)}{box('Cleanses', cleanse_body)}</div>
    <div class="stack"><div class="sech"></div>{''.join(item(i) for i in ju['items'][5:])}{section(sh, note=shot_note, cls='shots')}</div>
  </div>
</div>''')
tv3 = doc('tv3', TV_CSS, f'''
<div class="page">
  {band('logo-white.png', size_pills=False)}
  <div class="cols3">
    <div class="stack">{section(sa, note='Meat-free by design')}{box('Add protein', prot_body)}</div>
    <div class="stack">{section(wp)}</div>
    <div class="stack">{section(bb, note='')}</div>
  </div>
</div>''')

# ---------- PHONE: 390 wide ----------
PHONE_CSS = """
.page{width:390px;background:var(--cream);box-sizing:border-box}
.band{padding:22px 22px;gap:14px;flex-direction:column;align-items:flex-start}
.logo{height:70px}
.band .tg{font-size:16px}
.pills{display:flex;flex-wrap:wrap;gap:8px;font-size:12px}
.sz{padding:5px 12px}
.wrap{padding:22px 22px 10px;display:flex;flex-direction:column;gap:26px}
.cat{font-size:38px}
.sech{display:flex;flex-direction:column;gap:3px;margin-bottom:8px}
.catnote{font-size:12px}
.it{padding:10px 0}
.nm{font-size:18px}
.tag{font-size:9px;padding:2px 8px}
.ing{font-size:13px;margin-top:3px}
.pr{font-size:16px}.pr small{font-size:11px}
.box{padding:12px 16px;margin-top:12px}
.box h4{font-size:10px;margin-bottom:5px}
.box p{font-size:13px}
.shots .cat{font-size:28px}
.foot{display:flex;flex-direction:column;gap:4px;padding:18px 22px 28px;background:var(--sand);font-size:12px;font-weight:700;color:var(--ink)}
.stack{display:flex;flex-direction:column}
"""
phone = doc('phone', PHONE_CSS, f'''
<div class="page">
  {band('logo-white.png')}
  <div class="wrap">
    <div class="stack">{section(sm, note=smoothie_note)}{box('Add-ons', addons_body)}</div>
    <div class="stack">{section(ju, note=juice_note)}{box('Cleanses', cleanse_body)}</div>
    <div class="stack">{section(sh, note=shot_note)}</div>
    <div class="stack">{section(sa, note='Meat-free by design')}{box('Add protein', prot_body)}</div>
    <div class="stack">{section(wp)}</div>
    <div class="stack">{section(bb, note='')}{box('Pour Pass', pass_body)}</div>
  </div>
  {footer()}
</div>''')

for name, s in [('Main', print_drinks), ('PrintFood', print_food), ('TV1Smoothies', tv1), ('TV2Juices', tv2), ('TV3Food', tv3), ('Phone', phone)]:
    open(f'./{name}.dc.html', 'w').write(s)

canvas = {
  "artboards": [
    {"file": "Main.dc.html", "title": "Print · Drinks (Letter)", "x": 0, "y": 0, "w": 816, "h": 1056, "print": "fixed"},
    {"file": "PrintFood.dc.html", "title": "Print · Food (Letter)", "x": 900, "y": 0, "w": 816, "h": 1056, "print": "fixed"},
    {"file": "Phone.dc.html", "title": "Phone · Full menu", "x": 1800, "y": 0, "w": 390, "h": 4400, "print": "flow"}
  ],
  "launch": {"view": "canvas"}
}
json.dump(canvas, open('./canvas.json', 'w'), indent=2)
print('built')
