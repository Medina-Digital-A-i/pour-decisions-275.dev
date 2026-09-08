#!/usr/bin/env python3
"""Pop TV boards (the cream/pastel card design) -> pop-left.html / pop-right.html, menu baked in.
Soft opening: food screens removed, 'Food menu coming soon' leads the ticker."""
import io, json, re
tpl = io.open('board-pop.html', encoding='utf-8').read()
menu = json.dumps(json.load(io.open('../menu.json', encoding='utf-8')))
anchor = "const cfg=BOARDS[BOARD]||BOARDS.left;"
assert tpl.count(anchor) == 1
soft = (anchor + "\n// soft opening: drinks only\n"
        "cfg.screens = cfg.screens.filter(s => (s.pills||cfg.pills) !== 'food');\n"
        "cfg.ticker = ['<b>Food menu coming soon</b> — drinks only during our soft opening'].concat(cfg.ticker.filter(t => !/protein to any salad|wrap or panini/i.test(t)));")
for board in ('left', 'right'):
    html = tpl.replace('MENUJSON', menu).replace('LOGO', 'logo.png').replace('BOARDDEFAULT', board).replace(anchor, soft)
    # persistent 'Food menu · coming soon' pill beside the size prices
    m = re.search(r"p\.innerHTML=z\.map\([^;]*\.join\(''\)", html); assert m, 'pills anchor'
    html = html.replace(m.group(0), m.group(0) + " + '<span style=\"background:#EF8A00\">Food menu · <b>coming soon</b></span>'")
    io.open(f'pop-{board}.html', 'w', encoding='utf-8').write(html)
    print('wrote pop-%s.html (%d KB)' % (board, len(html)//1024))
