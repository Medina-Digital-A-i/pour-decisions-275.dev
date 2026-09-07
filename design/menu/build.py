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
.it.multi{grid-template-columns:minmax(0,1fr)}.it.multi .pr{text-align:left;margin-top:.15em;font-size:.85em;white-space:normal}
.nm{font-family:"Fraunces","Georgia",serif;font-weight:700;color:var(--text);line-height:1.1;display:flex;align-items:center;gap:.5em;flex-wrap:wrap}
.tag{font-family:"Manrope",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--ink);background:var(--teal-soft);border-radius:999px;white-space:nowrap}
.tag.house{color:var(--gold);background:var(--gold-soft)}
.ing{color:var(--muted);font-weight:500;line-height:1.35}
.al{color:#B8741A;font-weight:700;font-size:.86em;white-space:nowrap}
.pr{font-weight:800;color:var(--gold);white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums;line-height:1.2}
.pr small{font-weight:700;color:var(--muted)}
.box{background:var(--paper);border:1px solid var(--line);border-radius:.6em}
.box h4{font-family:"Manrope",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--teal);margin:0}
.box p{margin:0;font-weight:600;line-height:1.5}
.box b{color:var(--gold)}
.band{background:var(--ink);color:#fff;display:flex;align-items:center}
.bqr{display:flex;align-items:center;gap:8px;background:#fff;border-radius:10px;padding:5px 10px 5px 5px;color:var(--ink);line-height:1.15}.bqr svg{display:block;width:44px;height:44px}.bqr b{font-size:10px;font-family:"Manrope",sans-serif;font-weight:800}
.band .tg{font-family:"Fraunces","Georgia",serif;font-style:italic;font-weight:500;color:#DDF3F1}
.sz{display:inline-flex;align-items:center;gap:.4em;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);border-radius:999px;font-weight:700;color:#fff;white-space:nowrap}
.sz b{color:#FFBE66}
.shots{margin-top:1.1em}
"""

ING_FLAGS = {g['name']: g.get('flags', []) for g in M.get('ingredients', [])}
SHOW_FLAGS = {'gluten':'gluten','dairy':'dairy','nuts':'tree nuts','peanut':'peanuts','egg':'egg','fish':'fish','shellfish':'shellfish','sesame':'sesame','caffeine':'caffeine'}
import re as _re
def _norm(s):
    s = s.lower().strip()
    s = _re.sub(r'^(fresh|smashed|grilled|crispy|rolled|cherry|english|dried|roasted|smoked|mixed|or all|extra|plain)\s+', '', s)
    return s
def ing_flags(name):
    raw = name.lower().strip()
    if raw in ING_FLAGS: return ING_FLAGS[raw]
    L = _norm(name)
    if L in ING_FLAGS: return ING_FLAGS[L]
    sing = _re.sub(r'ies$', 'y', L); sing = _re.sub(r's$', '', sing)
    if sing in ING_FLAGS: return ING_FLAGS[sing]
    hits = [k for k in ING_FLAGS if _re.search(r'(^|\b)' + _re.escape(k) + r'(s|es)?(\b|$)', L)]
    hits.sort(key=len, reverse=True)
    return ING_FLAGS[hits[0]] if hits else []
def allergens(it):
    out = []
    for n in it.get('ingredients', []):
        for f in ing_flags(n):
            if f in SHOW_FLAGS and SHOW_FLAGS[f] not in out: out.append(SHOW_FLAGS[f])
    return out

def item(it, show_size=True, food=False):
    tag = f'<span class="tag {"house" if it.get("tag")=="house" else ""}">{esc(it["tag"])}</span>' if it.get('tag') else ''
    ing = esc(' · '.join(it.get('ingredients', [])))
    if it.get('addons'):
        ing += ' · ' + esc(' · '.join(f"+{a['name']} {money(a['price'])}" for a in it['addons']))
    al = allergens(it)
    if al: ing += f' <span class="al">contains {esc(", ".join(al))}</span>'
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
    cls = ' multi' if it.get('prices') else ''
    return f'<div class="it{cls}"><div><div class="nm">{esc(it["name"])}{tag}</div><div class="ing">{ing}</div></div>{pr}</div>'

def section(cat, items=None, note=None, cls=''):
    items = items if items is not None else cat['items']
    note = note if note is not None else cat.get('note', '')
    return (f'<div class="sec {cls}"><div class="sech"><h2 class="cat">{esc(cat["title"])}</h2>'
            f'<div class="catnote">{esc(note)}</div></div>' + ''.join(item(i) for i in items) + '</div>')

def box(title, body):
    return f'<div class="box"><h4>{esc(title)}</h4><p>{body}</p></div>'

sm, mo, ju, sh, sa, wp, bb = C['smoothies'], C['protein-oats'], C['juices'], C['shots'], C['salads'], C['wraps-paninis'], C['bowls-breakfast']
addons_body = ' · '.join(f'{esc(a["name"])} <b>+{money(a["price"])}</b>' for a in sm['addons']) + f'<br>{esc(sm["byo"]["name"])} — {esc(sm["byo"]["note"])}'
pk = M['packages']
pack_body = '<br>'.join(f'<b style="color:var(--text)">{esc(c["name"])}</b> <span style="color:var(--muted)">{esc(c["desc"])}</span> <b>{money(c["price"])}</b>' + (f' <span style="color:var(--muted)">· {esc(c["save"])}</span>' if c.get('save') else '') for c in pk['items'])
juice_add = ' · '.join(f'{esc(a["name"])} <b>+{money(a["price"])}</b>' for a in ju['addons'])
prot_body = ' · '.join(f'{esc(p["name"])} <b>+{money(p["price"])}</b>' for p in sa['proteins'])
pass_body = '<br>'.join(f'{esc(m["name"])} <b>{money(m["price"])}</b>/{m["per"]} — {esc(m["note"])}' for m in M['memberships'])
shots_body = '<br>'.join(f'<span style="color:var(--text)">{esc(i["name"])}</span> <span style="color:var(--muted)">— {esc(", ".join(i["ingredients"]))}</span>' for i in sh['items'])
biz = M['business']
ING = M.get('ingredients', [])
ING_GROUPS = M.get('ingredient_groups', [])
def ing_group_html(gk, glabel):
    rows = sorted([g for g in ING if g['group'] == gk], key=lambda g: g['name'])
    if not rows: return ''
    return (f'<div class="igg"><h3 class="igh">{esc(glabel)}</h3>' +
            ''.join(f'<p class="igr"><b>{esc(g["name"].capitalize())}</b> {esc(g["benefit"])}</p>' for g in rows) + '</div>')
ING_ALL = ''.join(ing_group_html(g['key'], g['label']) for g in ING_GROUPS)
def ing_cols(n):
    # flow rows across n columns (a group may continue into the next column)
    items = []
    for g in ING_GROUPS:
        rows = sorted([x for x in ING if x['group'] == g['key']], key=lambda x: x['name'])
        if not rows: continue
        items.append(('h', g['label']))
        for x in rows: items.append(('r', x))
    weight = lambda it: 1.15 if it[0] == 'h' else (1.0 if len(it[1]['benefit']) < 52 else 1.55)
    total = sum(weight(i) for i in items); per = total / n
    cols, cur, acc, last = [], [], 0.0, None
    for it in items:
        if len(cols) < n - 1 and acc + weight(it) > per + 0.6:
            cols.append(cur); cur, acc = [], 0.0
            if it[0] == 'r' and last: cur.append(('h', last + ' (cont.)'))
        if it[0] == 'h': last = it[1]
        cur.append(it); acc += weight(it)
    cols.append(cur)
    def render(col):
        out = ''
        for k, v in col:
            if k == 'h': out += f'<h3 class="igh">{esc(v)}</h3>'
            else: out += f'<p class="igr"><b>{esc(v["name"].capitalize())}</b> {esc(v["benefit"])}</p>'
        return out
    return ''.join(f'<div class="stack">{render(c)}</div>' for c in cols)
smoothie_note = f'16 oz {money(S["smoothie"][0]["price"])} · 24 oz {money(S["smoothie"][1]["price"])} · protein blends +$1'
juice_note = f'16 oz {money(S["juice"][0]["price"])} · 24 oz {money(S["juice"][1]["price"])} · pressed fresh daily'
shot_note = f'2 oz {money(S["shot"][0]["price"])} · two for $8'

QR=open('qr-menu.svg').read()
def band(logo, size_pills=True, h='', qr=True):
    qrblk = ('<div class="bqr">'+QR+'<b>Scan for<br>the menu</b></div>') if qr else ''
    pills = (f'<span class="sz">Smoothies <b>{money(S["smoothie"][0]["price"])}</b> 16 oz <b>{money(S["smoothie"][1]["price"])}</b> 24 oz</span>'
             f'<span class="sz">Juices <b>{money(S["juice"][0]["price"])}</b> 16 oz <b>{money(S["juice"][1]["price"])}</b> 24 oz</span>') if size_pills else ''
    return (f'<div class="band" {h}><img src="{logo}" alt="Pour Decisions" class="logo">'
            f'<div class="tg">{esc(biz["tagline"])}</div>{qrblk}<div class="pills">{pills}</div></div>')

def footer():
    return (f'<div class="foot"><div class="qr">{QR}<div><b>Scan for the menu</b><br>pourdecisionsjuicebar.com</div></div><span>{esc(biz["address"])}</span><span>{esc(biz.get("phone",""))}</span><span>@{esc(biz["instagram"])}</span></div>')

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
.it{padding:5px 0}
.nm{font-size:15px}
.tag{font-size:8.5px;padding:2px 7px}
.ing{font-size:11.5px;margin-top:2px}
.pr{font-size:15px}.pr small{font-size:10px}
.box{padding:9px 14px;margin-top:10px}
.box h4{font-size:9.5px;margin-bottom:4px}
.box p{font-size:11.5px}
.shots .cat{font-size:24px}.shots .sech{margin-top:4px}
.foot{display:flex;justify-content:space-between;align-items:center;padding:7px 40px;background:var(--sand);font-size:11px;font-weight:700;color:var(--ink);letter-spacing:.02em}
.qr{display:flex;align-items:center;gap:10px;line-height:1.35}.qr svg{width:50px;height:50px;background:#fff;border-radius:6px;padding:3px;box-sizing:border-box}.qr b{color:var(--ink);font-size:12px}
.stack{display:flex;flex-direction:column;gap:0}
"""
print_drinks = doc('drinks', PRINT_CSS, f'''
<div class="page">
  {band('logo-white.png')}
  <div class="cols">
    <div class="stack">{section(sm, note=smoothie_note)}{section(mo, cls='shots')}</div>
    <div class="stack">{section(ju, note=juice_note)}{section(sh, note=shot_note, cls='shots')}{box('Juice add-ins', juice_add)}</div>
  </div>
  {footer()}
</div>''')

PRINT_FOOD_CSS = PRINT_CSS + """
.cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 26px;padding:22px 40px 0;flex:1}
.cols3 .nm{font-size:15px}.cols3 .ing{font-size:11px}.cols3 .pr{font-size:13px}
.cols3 .cat{font-size:30px}
.cols3 .it{padding:3px 0}.cols3 .ing{font-size:9.6px}.cols3 .nm{font-size:13.5px}.cols3 .box{padding:6px 10px;margin-top:6px}.cols3 .box p{font-size:9.8px;line-height:1.35}.cols3 .box h4{font-size:8.5px}.cols3 .sech{margin-bottom:5px}
"""
print_food = doc('food', PRINT_FOOD_CSS, f'''
<div class="page">
  {band('logo-white.png', size_pills=False)}
  <div class="cols3">
    <div class="stack">{section(sa, note='Meat-free by design')}{box('Add protein', prot_body)}</div>
    <div class="stack">{section(wp)}</div>
    <div class="stack">{section(bb, note='')}{box('Smoothie add-ins', addons_body)}{box(pk['title'] + ' · ' + pk['note'], pack_body)}{box('Pour Pass', pass_body)}</div>
  </div>
  {footer()}
</div>''')

# ---------- TV: 1920x1080 ----------
TV_CSS = """
.page{width:1920px;height:1080px;background:var(--cream);display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden}
.band{padding:22px 70px;gap:44px}
.logo{height:104px}
.band .tg{font-size:32px;flex:1}
.pills{display:flex;gap:14px;font-size:24px}
.sz{padding:10px 24px}
.cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 70px;padding:34px 70px 0;flex:1}
.cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 56px;padding:34px 70px 0;flex:1}
.cat{font-size:64px}
.sech{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;min-height:96px}
.catnote{font-size:22px}
.it{padding:8px 0}
.nm{font-size:33px}
.tag{font-size:15px;padding:5px 12px}
.ing{font-size:20px;margin-top:3px}
.pr{font-size:28px}.pr small{font-size:18px}
.box{padding:14px 22px;margin-top:16px}
.box h4{font-size:16px;margin-bottom:6px}
.box p{font-size:20px;line-height:1.45}
.shots .cat{font-size:46px}.shots .it{padding:8px 0}.shots .nm{font-size:30px}.shots .ing{font-size:19px}.shots .pr{font-size:26px}.shots .sech{min-height:0;margin-bottom:8px}.shots{margin-top:0}
.stack{display:flex;flex-direction:column}
.cols3 .nm{font-size:26px}.cols3 .ing{font-size:16px}.cols3 .pr{font-size:23px}.cols3 .cat{font-size:54px}.cols3 .it{padding:7px 0}.cols3 .box{padding:14px 20px;margin-top:16px}.cols3 .box p{font-size:19px}.cols3 .sech{min-height:80px}
"""
tv1 = doc('tv1', TV_CSS, f'''
<div class="page">
  {band('logo-white.png')}
  <div class="cols">
    <div class="stack">{section(sm, note=smoothie_note)}</div>
    <div class="stack"><div class="sech"></div>{section(mo, cls='shots')}{box('Add-ins', addons_body)}</div>
  </div>
</div>''')
tv2 = doc('tv2', TV_CSS + '.page.tv2 .cols>.stack:first-child .it{padding:6px 0}.page.tv2 .cols>.stack:first-child .nm{font-size:31px}.page.tv2 .cols>.stack:first-child .ing{font-size:19px}', f'''
<div class="page tv2">
  {band('logo-white.png')}
  <div class="cols">
    <div class="stack">{section(ju, note=juice_note)}</div>
    <div class="stack"><div class="sech"></div>{section(sh, note=shot_note, cls='shots')}{box(pk['title'], pack_body + '<br><span style="color:var(--muted)">' + juice_add + '</span>')}</div>
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
.qr{display:flex;align-items:center;gap:12px;line-height:1.35;margin-bottom:8px}.qr svg{width:72px;height:72px;background:#fff;border-radius:8px;padding:4px;box-sizing:border-box}
.foot{display:flex;flex-direction:column;gap:4px;padding:18px 22px 28px;background:var(--sand);font-size:12px;font-weight:700;color:var(--ink)}
.stack{display:flex;flex-direction:column}
.igh{font-family:"Bebas Neue","Oswald","Impact",sans-serif;color:var(--gold);letter-spacing:.06em;font-size:20px;margin:14px 0 4px;line-height:1}
.igr{margin:0;font-size:12.5px;line-height:1.4;color:var(--muted);font-weight:500;padding:6px 0;border-bottom:1px solid var(--line)}
.igr b{color:var(--text);font-family:"Fraunces","Georgia",serif;font-weight:700;font-size:14px}
"""
phone = doc('phone', PHONE_CSS, f'''
<div class="page">
  {band('logo-white.png', qr=False)}
  <div class="wrap">
    <div class="stack">{section(sm, note=smoothie_note)}{box('Add-ins', addons_body)}</div>
    <div class="stack">{section(mo)}</div>
    <div class="stack">{section(ju, note=juice_note)}{box('Juice add-ins', juice_add)}{box(pk['title'], pack_body)}</div>
    <div class="stack">{section(sh, note=shot_note)}</div>
    <div class="stack">{section(sa, note='Meat-free by design')}{box('Add protein', prot_body)}</div>
    <div class="stack">{section(wp)}</div>
    <div class="stack">{section(bb, note='')}{box('Smoothie add-ins', addons_body)}{box(pk['title'] + ' · ' + pk['note'], pack_body)}{box('Pour Pass', pass_body)}</div>
    <div class="stack"><div class="sec"><div class="sech"><h2 class="cat">What's in it</h2><div class="catnote">Every ingredient we pour, and what it does for you</div></div>{ING_ALL}</div></div>
  </div>
  {footer()}
</div>''')

PRINT_ING_CSS = PRINT_CSS + """
.cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 22px;padding:16px 36px 0;flex:1;align-content:start}
.igh{font-family:"Bebas Neue","Oswald","Impact",sans-serif;color:var(--gold);letter-spacing:.06em;font-size:15px;margin:7px 0 2px;line-height:1}
.igg:first-child .igh{margin-top:0}
.igr{margin:0;font-size:8.3px;line-height:1.25;color:var(--muted);font-weight:500;padding:1.4px 0;border-bottom:1px solid var(--line)}
.igr b{color:var(--text);font-family:"Fraunces","Georgia",serif;font-weight:700;font-size:9.2px}
.ttl{padding:12px 36px 0;display:flex;align-items:baseline;gap:14px}
.ttl .cat{font-size:30px}.ttl .catnote{font-size:10.5px}
.disc{padding:6px 36px 4px;font-size:8.5px;color:var(--muted);font-weight:600}
"""
print_ing = doc('ingredients', PRINT_ING_CSS, f'''
<div class="page">
  {band('logo-white.png', size_pills=False)}
  <div class="ttl"><h2 class="cat">What's in it</h2><div class="catnote">Every ingredient we pour, and what it does for you</div></div>
  <div class="cols3">{ing_cols(3)}</div>
  <div class="disc">General wellness info, not medical advice. Ask us about allergies before you order — we prep nuts, dairy, gluten, egg, fish and shellfish in the same kitchen.</div>
  {footer()}
</div>''')

for name, s in [('Main', print_drinks), ('PrintFood', print_food), ('PrintIngredients', print_ing), ('TV1Smoothies', tv1), ('TV2Juices', tv2), ('TV3Food', tv3), ('Phone', phone)]:
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
