# Tri-fold brochure menu (Letter landscape, 11 x 8.5 in). Run after build.py from this folder.
import re, html
exec(open('build.py').read().split("# ---------- PRINT: Letter 816x1056")[0])   # reuse data + helpers

TRI_CSS = """
.sheet{width:1056px;height:816px;background:var(--cream);display:grid;grid-template-columns:repeat(3,352px);box-sizing:border-box;overflow:hidden;position:relative}
.panel{padding:26px 24px 22px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;border-right:1px dashed #cfd6d3}
.panel:last-child{border-right:0}
.cat{font-size:26px}.sech{display:flex;flex-direction:column;gap:2px;margin-bottom:6px;--ico:26px}
.catnote{font-size:9.5px}
.it{padding:3.5px 0}.nm{font-size:12.5px}.tag{display:none}.ing{font-size:9.3px;margin-top:1px}.al{display:none}
.pr{font-size:12.5px}.pr small{font-size:8.5px}
.box{padding:8px 11px;margin-top:8px}.box h4{font-size:8.5px;margin-bottom:3px}.box p{font-size:9.5px;line-height:1.45}
.shots .cat{font-size:20px}
.cover{background:linear-gradient(160deg,#14B8AC 0%,#0F7A73 55%,#0B5C57 100%);color:#fff;align-items:center;justify-content:center;text-align:center;gap:18px;border-right:0}
.cover img{width:250px}
.cover .tg{font-family:"Fraunces","Georgia",serif;font-style:italic;font-weight:900;font-size:19px;line-height:1.25}
.cover .qrw{background:#fff;border-radius:14px;padding:10px;display:inline-flex;flex-direction:column;align-items:center;gap:6px;color:var(--ink)}
.cover .qrw svg{width:96px;height:96px}.cover .qrw b{font-size:11px}
.cover .addr{font-size:11px;font-weight:700;line-height:1.7;opacity:.95}
.back{background:var(--sand)}
.back .h{font-family:"Bebas Neue","Oswald",sans-serif;font-size:26px;color:var(--ink);letter-spacing:.04em;margin:0 0 6px}
.back p{font-size:10.5px;line-height:1.55;margin:0 0 10px;font-weight:600;color:var(--text)}
.back .box{margin-top:0;margin-bottom:8px}
.hours{margin-top:auto;font-size:10.5px;font-weight:800;color:var(--ink);line-height:1.7}
"""
inside = doc('trifold-inside', TRI_CSS, f'''
<div class="sheet">
  <div class="panel stack">{section(sm, note=smoothie_note)}{box('Build your own', 'Pick up to 4 — same price as the menu')}</div>
  <div class="panel stack">{section(ju, note=juice_note)}{section(sh, note=shot_note, cls='shots')}</div>
  <div class="panel stack">{section(sa, note='Every salad comes meat-free')}{box('Add a protein', prot_body)}{section(wp)}</div>
</div>''')
outside = doc('trifold-outside', TRI_CSS, f'''
<div class="sheet">
  <div class="panel back">
    <h3 class="h">Juice Packs</h3>
    {box(pk['title'], pack_body)}
    {box('Pour Pass', pass_body)}
    <h3 class="h" style="margin-top:8px">Event space</h3>
    <p>Meetings, parties, pop-ups and workshops — call or email to book.</p>
    <div class="hours">{esc(biz["hours"])}<br>{esc(biz["phone"])}<br>{esc(biz["email"])}</div>
  </div>
  <div class="panel stack">{section(mo, cls='shots')}{box('Smoothie add-ins', addons_body)}{box('Juice add-ins', juice_add)}</div>
  <div class="panel cover">
    <img src="logo-white.png" alt="Pour Decisions">
    <div class="tg">{esc(biz["tagline"])}</div>
    <div class="qrw">{QR}<b>Scan for the menu</b></div>
    <div class="addr">{esc(biz["address"])}<br>{esc(biz["phone"])} · @{esc(biz["instagram"])}<br>pourdecisionsjuicebar.com</div>
  </div>
</div>''')
for name, s in [('TrifoldInside', inside), ('TrifoldOutside', outside)]:
    open(f'./{name}.dc.html', 'w').write(s)
    helmet = re.search(r'<helmet>(.*?)</helmet>', s, re.S).group(1)
    body = s[s.index('</helmet>')+9:s.index('</x-dc>')]
    out = '../../boards/print-trifold-' + ('inside' if 'Inside' in name else 'outside') + '.html'
    open(out, 'w').write(f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Pour Decisions — Tri-fold {name}</title>\n<meta name="robots" content="noindex">\n{helmet}\n<style>@page{{size:11in 8.5in;margin:0}} html,body{{margin:0;background:#ddd}} .sheet{{margin:0 auto}} @media print{{html,body{{background:#fff}}}}</style>\n</head>\n<body>\n{body}\n</body>\n</html>\n')
print('trifold built')
