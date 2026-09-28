// Shop knowledge for Piña — built from menu.json (the single source of truth) plus the event-space
// details that live in index.html (VENUE_PKGS / VENUE_FAQ). Keep the venue block below in sync with
// index.html if packages change. Internal notes (costs, margins) are never included.

const money = (n) => '$' + (Number.isInteger(+n) ? String(+n) : (+n).toFixed(2));
const INTERNAL = /cogs|margin|assumed/i;

export const VENUE = `EVENT SPACE — "Book the space" (the whole bar, open concept, no back room)
- Up to 30 guests. Whole floor is theirs, tables + chairs + setup, free wifi + bluetooth sound, free parking, outside cake welcome.
- Time blocks: Morning 9am–12pm · Afternoon 1pm–5pm · Evening 6pm–9pm · or flexible.
- Event types: birthdays / parties (kids, sweet 16s, grown folks), business meetings & offsites, baby/bridal showers & graduations, community / wellness (yoga, networking, pop-ups).
- Packages (all priced by quote — never invent a price; the owners reply with a straight number):
  • The Sip (2 hours) — exclusive use of the full floor, tables/chairs/setup, wifi + sound, fridge & prep counter. Bring your own decor, cake and food.
  • The Squeeze (2 hours, MOST POPULAR) — everything in The Sip + a live juice & smoothie bar for guests, choice of four blends, cups/straws/full service.
  • The Full Pour (3 hours) — everything in The Squeeze + light bites & smoothie bowls, decor setup & takedown, a dedicated host.
  • The Boardroom (3 hours, weekdays) — weekday buyout, wifi + screen for presenting, coffee/tea/juice service, notepads & water.
- Add-ons: custom juice flight bar, smoothie bowl station, bottled party favors, decor & balloon setup, extra hours, panini & salad catering spread.
- Book two weeks ahead if possible; same-week sometimes works — ask. Cancel with 7 days' notice = full credit toward a future booking.
- Outside cake on every package; full outside catering on The Sip, can be arranged on the others.
- Also: "Meeting Bar" for offices — from $8.50/person (10+ people), space included.`;

function sizeLine(sizes, key) {
  const s = (sizes || {})[key];
  if (!Array.isArray(s)) return '';
  return s.map((x) => `${x.oz} oz ${money(x.price)}`).join(' / ');
}

function itemLine(it, cat, sizes) {
  const bits = [`${it.name} [id:${it.id}]`];
  if (Array.isArray(it.ingredients) && it.ingredients.length) bits.push(it.ingredients.join(', '));
  if (it.tag) bits.push(`good for: ${it.tag}`);
  if (it.size) bits.push(sizeLine(sizes, it.size));
  else if (it.prices) bits.push(Object.entries(it.prices).map(([k, v]) => `${k} ${money(v)}`).join(' · '));
  else if (it.price != null) bits.push(money(it.price));
  if (it.desc) bits.push(it.desc);
  if (it.note && !INTERNAL.test(it.note)) bits.push(it.note);
  return '  - ' + bits.filter(Boolean).join(' — ');
}

export function shopKnowledge(menu = {}) {
  const b = menu.business || {};
  const sizes = menu.sizes || {};
  const out = [];
  out.push(`SHOP
- ${b.name || 'Pour Decisions'} — ${b.tagline || ''}. Cold-pressed juice & smoothie bar with real food.
- Address: ${b.address || '359 Northern Blvd, Albany NY 12204'} (Loudon Plaza). Free parking on site.
- Hours: ${b.hours || '8 AM – 5 PM'}, ${b.days || 'Mon–Sat · Closed Sunday'}.
- Phone / text: ${b.phone || '(838) 261-9233'} · Email: ${b.email || 'pourdecisionsalb@gmail.com'} · Instagram @${b.instagram || 'pourdecisions_juicebar'}
- Ways to order: (1) right here in the app/site — add to cart, then check out (needs a free account; checkout finishes with secure payment on Clover Online Ordering, then pick up; use the same email or phone so it earns points + Pour Pass stamps); (2) Clover online ordering: ${b.order_url || 'https://pourdecisionsjuicebar.cloveronline.com'}; (3) delivery on Uber Eats and DoorDash (links on the home page); (4) walk in.`);

  out.push('MENU (prices are exact — quote them exactly)');
  for (const c of menu.categories || []) {
    out.push(`${c.title}${c.note ? ' — ' + c.note : ''}`);
    for (const it of c.items || []) out.push(itemLine(it, c, sizes));
    if (Array.isArray(c.proteins) && c.proteins.length) out.push('  Proteins: ' + c.proteins.map((p) => `${p.name} +${money(p.price)}`).join(', '));
    if (Array.isArray(c.addons) && c.addons.length) out.push('  Add-ons: ' + c.addons.map((a) => `${a.name} +${money(a.price)}`).join(', '));
    if (c.byo) out.push(`  ${c.byo.name || 'Build your own'}: ${c.byo.note || ''}`);
    if (Array.isArray(c.cleanses) && c.cleanses.length) out.push('  Cleanses: ' + c.cleanses.map((x) => `${x.name} ${money(x.price)} (${x.note})`).join(', '));
  }

  const p = menu.packages || {};
  if (p.items) {
    out.push(`DEALS — ${p.title || 'Juice Packs'}${p.note ? ': ' + p.note : ''}`);
    for (const it of p.items) out.push(`  - ${it.name}: ${it.desc} — ${money(it.price)}${it.save ? ' (' + it.save + ')' : ''}`);
  }
  if (p.byo && Array.isArray(p.byo.tiers)) {
    out.push(`  Build-a-pack (min ${p.byo.min}, juices and shots): ` + p.byo.tiers.map((t) => `${t.min}+ items ${t.pct}% off`).join(', '));
  }
  if (p.office) {
    const o = p.office;
    out.push(`DEALS — ${o.title}${o.note ? ': ' + o.note : ''}`);
    for (const x of o.boxes || []) out.push(`  - ${x.name} ${money(x.price)}: ${x.desc}`);
    if (o.box_min) out.push(`  Lunch boxes: minimum ${o.box_min}.`);
    if (o.upgrades) out.push(`  Upgrades: ${o.upgrades}`);
    for (const x of o.items || []) out.push(`  - ${x.name} ${money(x.price)}${x.per ? '/' + x.per : ''}: ${x.desc}`);
    for (const [k, v] of Object.entries(o)) {
      if (['title', 'note', 'boxes', 'box_min', 'upgrades', 'items'].includes(k)) continue;
      if (typeof v === 'string' && !INTERNAL.test(v)) out.push(`  ${k}: ${v}`);
      else if (Array.isArray(v)) out.push(`  ${k}: ` + v.map((x) => (typeof x === 'string' ? x : [x.name || x.title, x.desc || x.note, x.price != null ? money(x.price) : ''].filter(Boolean).join(' — '))).join('; '));
    }
  }
  if (Array.isArray(menu.memberships) && menu.memberships.length) {
    out.push('MEMBERSHIPS');
    for (const m of menu.memberships) out.push(`  - ${m.name}: ${money(m.price)}/${m.per} — ${m.note}`);
  }
  const r = menu.rewards || {};
  out.push(`REWARDS (free account required)
- Pour Pass: 1 stamp per drink; ${r.pours_for_free || 9} stamps = ${r.free_pour_label || 'a free 16 oz juice or smoothie'}.
- Points: ${r.points_per_dollar || 10} points per $1 on paid orders. Spend them on: ${(r.catalog || []).map((c) => `${c.title} (${c.cost} pts)`).join(', ') || 'rewards in the app'}.
- One free prize-wheel spin every month (Spin on the home screen). Prizes: ${(menu.wheel || []).filter((w) => w.id !== 'try-again' && !/not this time/i.test(w.label || '')).map((w) => w.label).join(', ')}.
- Points and stamps land once the order is paid.`);

  if (Array.isArray(menu.ingredients) && menu.ingredients.length) {
    out.push('INGREDIENT BENEFITS (general wellness info, not medical advice)');
    for (const g of menu.ingredients) if (g && g.name && g.benefit) out.push(`  - ${g.name}: ${g.benefit}`);
  }
  out.push(VENUE);
  return out.join('\n');
}

// The orderable catalogue, for validating add_to_cart calls. Mirrors buildMenu() in index.html.
export function catalogue(menu = {}) {
  const sizes = menu.sizes || {};
  const map = new Map();
  for (const c of menu.categories || []) {
    for (const it of c.items || []) {
      const sz = it.size && Array.isArray(sizes[it.size]) ? sizes[it.size].map((s) => String(s.oz)) : [];
      const variants = it.prices ? Object.keys(it.prices) : [];
      map.set(it.id, { id: it.id, name: it.name, cat: c.key, sizes: sz, variants });
    }
  }
  return map;
}
