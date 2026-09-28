// Clover <-> Pour Pass bridge. Off until CLOVER_API_TOKEN + CLOVER_MERCHANT_ID are set (Netlify env vars).
//  - pushMember(): every site member becomes a Clover customer (same email + phone), so the register can
//    find them by phone and attach them to the sale.
//  - syncOrders(): paid Clover orders (register, Clover Online, Uber Eats/DoorDash through Clover) that carry a
//    customer who is a member get recorded on that member and settled -> points + Pour Pass stamps.
//    A site "pay at pickup" order from the last 24h with the same total is settled instead of adding a duplicate.
//    Refunded orders take the points back.
// Clover API: https://docs.clover.com/dev/reference (orders: total/price in cents, paymentState PAID/REFUNDED/...).
import { store, saveMember, loadMenu, rewardRules, settleOrder } from '../members.mjs';

const BASE = () => (process.env.CLOVER_API_BASE || 'https://api.clover.com').replace(/\/$/, '');
const MID = () => process.env.CLOVER_MERCHANT_ID || '';
export const cloverReady = () => !!(process.env.CLOVER_API_TOKEN && MID());
const TAX = +process.env.SALES_TAX_RATE || 0.08; // site orders carry the subtotal; Clover totals include tax
const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);

async function cfetch(path, opt = {}) {
  const r = await fetch(`${BASE()}/v3/merchants/${MID()}${path}`, {
    ...opt,
    headers: { authorization: 'Bearer ' + process.env.CLOVER_API_TOKEN, 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'pour-decisions-site', ...(opt.headers || {}) },
  });
  const t = await r.text();
  let j = {}; try { j = t ? JSON.parse(t) : {}; } catch { j = { raw: t.slice(0, 200) }; }
  if (!r.ok) throw Object.assign(new Error(`Clover ${r.status}: ${j.message || j.raw || ''}`.trim()), { status: r.status });
  return j;
}
async function pages(path, max = 20) {
  const out = [];
  for (let off = 0, i = 0; i < max; i++, off += 100) {
    const j = await cfetch(`${path}${path.includes('?') ? '&' : '?'}limit=100&offset=${off}`);
    const els = j.elements || [];
    out.push(...els);
    if (els.length < 100) break;
  }
  return out;
}

// Create (or find) the Clover customer for a member and remember the link both ways.
export async function pushMember(m, st = store()) {
  if (!cloverReady() || !m || !m.email) return { skipped: true };
  if (m.cloverId) return { id: m.cloverId, existing: true };
  const found = await cfetch(`/customers?filter=${encodeURIComponent('emailAddress=' + m.email)}`).catch(() => ({ elements: [] }));
  let id = (found.elements || [])[0]?.id;
  if (!id) {
    const [first, ...rest] = String(m.name || '').trim().split(/\s+/);
    const c = await cfetch('/customers', { method: 'POST', body: JSON.stringify({
      firstName: (first || 'Pour Pass').slice(0, 64), lastName: (rest.join(' ') || 'Member').slice(0, 64), marketingAllowed: !!m.marketing,
      emailAddresses: [{ emailAddress: m.email, primaryEmail: true }],
      ...(digits(m.phone).length === 10 ? { phoneNumbers: [{ phoneNumber: m.phone }] } : {}),
    }) });
    id = c.id;
  }
  if (!id) return { error: 'no id' };
  m.cloverId = id;
  await saveMember(st, m);
  await st.setJSON('clover:cust:' + id, { email: m.email });
  return { id };
}

const DRINK = /(juice|smoothie|shot|\b(16|24|2)\s?oz\b|protein & oats|pour pass)/i;
function drinkNames(menu) {
  const names = new Set();
  for (const c of menu.categories || []) for (const it of c.items || []) if (it.size) names.add(String(it.name).toLowerCase());
  return names;
}

// Pull Clover orders modified since the last run and settle them onto members. Safe to run repeatedly.
export async function syncOrders(req, { sinceMs } = {}) {
  if (!cloverReady()) return { skipped: true, reason: 'Clover not connected' };
  const st = store();
  const cursor = (await st.get('clover:cursor', { type: 'json' })) || {};
  const since = sinceMs || Math.max((cursor.t || Date.now() - 2 * 864e5) - 10 * 60e3, Date.now() - 89 * 864e5);
  const started = Date.now();
  const orders = await pages(`/orders?filter=${encodeURIComponent('modifiedTime>=' + since)}&expand=customers,lineItems`);
  const menu = await loadMenu(req), rules = rewardRules(menu), drinks = drinkNames(menu);

  // phone -> email index for customers created at the register (not through the site)
  let byPhone = null;
  const memberFor = async (cust) => {
    const link = await st.get('clover:cust:' + cust.id, { type: 'json' });
    if (link && link.email) return st.get('member:' + link.email, { type: 'json' });
    const c = await cfetch(`/customers/${cust.id}?expand=emailAddresses,phoneNumbers`).catch(() => null);
    if (!c) return null;
    for (const e of c.emailAddresses?.elements || []) {
      const m = await st.get('member:' + String(e.emailAddress || '').toLowerCase(), { type: 'json' });
      if (m) { await st.setJSON('clover:cust:' + cust.id, { email: m.email }); return m; }
    }
    if (!byPhone) {
      byPhone = new Map();
      let cur; do { const p = await st.list({ prefix: 'list:', cursor: cur }); for (const b of p.blobs) { const l = await st.get(b.key, { type: 'json' }); if (l && digits(l.phone).length === 10) byPhone.set(digits(l.phone), l.email); } cur = p.cursor; } while (cur);
    }
    for (const p of c.phoneNumbers?.elements || []) {
      const email = byPhone.get(digits(p.phoneNumber));
      if (email) { await st.setJSON('clover:cust:' + cust.id, { email }); return st.get('member:' + email, { type: 'json' }); }
    }
    return null;
  };

  const res = { seen: orders.length, matched: 0, settled: 0, refunded: 0, unmatched: 0 };
  for (const o of orders) {
    const cust = (o.customers?.elements || [])[0];
    const paid = o.paymentState === 'PAID', refunded = o.paymentState === 'REFUNDED' || o.paymentState === 'CREDITED';
    if (!cust || !(paid || refunded)) { if (paid) res.unmatched++; continue; }
    let m = await memberFor(cust);
    if (!m) { res.unmatched++; continue; }
    res.matched++;
    m.orders = m.orders || [];
    const total = Math.round(o.total || 0) / 100;
    let ord = m.orders.find((x) => x.cloverId === o.id);
    if (refunded) {
      if (ord && ord.status === 'paid') { settleOrder(m, ord, rules, 'cancelled'); ord.refunded = true; await saveMember(st, m); res.refunded++; }
      continue;
    }
    if (ord && ord.status === 'paid') continue; // already counted
    if (!ord) {
      const when = o.clientCreatedTime || o.createdTime || Date.now();
      // a site order waiting for payment at the counter with the same total -> this is that order
      ord = m.orders.find((x) => !x.cloverId && (x.status || 'unpaid') === 'unpaid' && Math.abs(x.id - when) < 864e5 && (Math.abs((x.total || 0) - total) <= 1 || Math.abs((x.total || 0) * (1 + TAX) - total) <= 1));
      if (ord) ord.cloverId = o.id;
      else {
        const items = (o.lineItems?.elements || []).map((li) => ({ name: String(li.name || 'Item').slice(0, 80), qty: 1, drink: drinks.has(String(li.name || '').toLowerCase()) || DRINK.test(li.name || '') }));
        ord = { id: when, date: new Date(when).toISOString().slice(0, 10), items, total, pours: items.filter((i) => i.drink).length, points: 0, status: 'unpaid', source: 'clover', cloverId: o.id };
        m.orders = [ord, ...m.orders].slice(0, 100);
      }
    }
    settleOrder(m, ord, rules, 'paid');
    await saveMember(st, m);
    res.settled++;
  }
  await st.setJSON('clover:cursor', { t: started, last: new Date(started).toISOString(), ...res });
  return res;
}
