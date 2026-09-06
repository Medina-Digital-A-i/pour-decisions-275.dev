#!/usr/bin/env node
// Guardrail: validates menu.json before Netlify publishes. If this fails, the deploy
// fails and the LIVE SITE KEEPS THE PREVIOUS VERSION. Run locally: node scripts/check-menu.js
const fs = require('fs');
const errs = [];
const E = (m) => errs.push(m);
let raw;
try { raw = fs.readFileSync('menu.json', 'utf8'); } catch (e) { console.error('menu.json not found'); process.exit(1); }
let m;
try { m = JSON.parse(raw); }
catch (e) {
  const pos = /position (\d+)/.exec(e.message); let where = '';
  if (pos) { const i = +pos[1]; const line = raw.slice(0, i).split('\n').length; where = ` (around line ${line})`; }
  console.error(`✖ menu.json is not valid JSON${where}: ${e.message}\n  Common causes: a trailing comma after the last item, a missing quote, or a missing bracket.`);
  process.exit(1);
}
const isNum = (v) => typeof v === 'number' && isFinite(v) && v >= 0;
if (!m.business || typeof m.business !== 'object') E('business block missing');
else {
  for (const k of ['name', 'address']) if (!m.business[k]) E(`business.${k} missing`);
  const u = m.business.order_url;
  if (u !== undefined && u !== '' && !/^https:\/\/[^\s]+$/.test(u)) E(`business.order_url must be empty or an https:// URL (got "${u}")`);
}
if (!m.sizes || typeof m.sizes !== 'object') E('sizes block missing');
else for (const [k, arr] of Object.entries(m.sizes)) {
  if (!Array.isArray(arr) || !arr.length) E(`sizes.${k} must be a non-empty list`);
  else arr.forEach((s, i) => { if (!isNum(s.oz)) E(`sizes.${k}[${i}].oz must be a number`); if (!isNum(s.price)) E(`sizes.${k}[${i}].price must be a number`); });
}
if (!Array.isArray(m.categories) || !m.categories.length) E('categories must be a non-empty list');
else {
  const ids = new Set(), keys = new Set();
  m.categories.forEach((c, ci) => {
    const where = `categories[${ci}] (${c.title || c.key || '?'})`;
    if (!c.key) E(`${where}: key missing`); else if (keys.has(c.key)) E(`${where}: duplicate category key "${c.key}"`); else keys.add(c.key);
    if (!c.title) E(`${where}: title missing`);
    if (!Array.isArray(c.items)) { E(`${where}: items must be a list`); return; }
    c.items.forEach((it, ii) => {
      const w = `${where} › item ${ii + 1} (${it.name || it.id || '?'})`;
      if (!it.id) E(`${w}: id missing`); else if (ids.has(it.id)) E(`${w}: duplicate item id "${it.id}"`); else ids.add(it.id);
      if (!it.name) E(`${w}: name missing`);
      if (it.ingredients !== undefined && !Array.isArray(it.ingredients)) E(`${w}: ingredients must be a list`);
      const hasSize = it.size && m.sizes && m.sizes[it.size];
      const hasPrice = isNum(it.price);
      const hasPrices = it.prices && typeof it.prices === 'object' && Object.values(it.prices).every(isNum) && Object.keys(it.prices).length;
      if (it.size && !hasSize) E(`${w}: size "${it.size}" is not defined in sizes`);
      if (!hasSize && !hasPrice && !hasPrices) E(`${w}: needs a size (e.g. "smoothie"), a price, or a prices map`);
    });
    for (const list of ['addons', 'proteins']) if (c[list]) c[list].forEach((a, i) => { if (!a.name || !isNum(a.price)) E(`${where}.${list}[${i}]: needs name + numeric price`); });
  });
}
if (m.wheel !== undefined) {
  if (!Array.isArray(m.wheel) || m.wheel.length !== 10) E('wheel must be a list of exactly 10 slices (the wheel graphic has 10 segments)');
  else m.wheel.forEach((w, i) => { if (!w.id || !w.label) E(`wheel[${i}]: needs id + label`); if (!isNum(w.weight)) E(`wheel[${i}]: weight must be a number (odds)`); if (w.itemId && !m.categories.some((c) => c.items.some((it) => it.id === w.itemId))) E(`wheel[${i}]: itemId "${w.itemId}" is not a menu item`); });
}
if (errs.length) { console.error('✖ menu.json has ' + errs.length + ' problem(s):\n  - ' + errs.join('\n  - ')); process.exit(1); }
const n = m.categories.reduce((a, c) => a + c.items.length, 0);
console.log(`✔ menu.json OK — ${m.categories.length} categories, ${n} items${m.business.order_url ? ', online ordering → ' + m.business.order_url : ', online ordering not set (pay at pickup)'}`);
